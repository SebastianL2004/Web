// ------------------ ASSISTANT VIEW FUNCTIONS ------------------
import { db, rdb } from '../config/firebase.js';
import { currentUser, realtimeSubscriptions } from '../config/constants.js';
import { escapeHtml } from '../utils/security.js';

// 🔥 AGREGAR ESTOS IMPORTS FALTANTES
import { showRealtimeNotification } from '../services/notifications.js';
import { 
    updatePieRequestStatus, 
    deletePieRequest, 
    updateProjectStatus, 
    deleteCollaborativeProject 
} from '../services/firestore.js';

// 🔥 AGREGAR FUNCIONES FALTANTES
function getUrgencyBadgeClass(urgency) {
    const urgencyClasses = {
        'alta': 'bg-danger',
        'media': 'bg-warning text-dark',
        'baja': 'bg-success'
    };
    return urgencyClasses[urgency] || 'bg-secondary';
}

function getStatusBadgeClass(status) {
    const statusClasses = {
        'pendiente': 'bg-warning text-dark',
        'aprobada': 'bg-success',
        'rechazada': 'bg-danger',
        'completada': 'bg-info'
    };
    return statusClasses[status] || 'bg-secondary';
}

// 🔥 AGREGAR FUNCIÓN DE INICIALIZACIÓN
export function initAssistantView() {
    console.log("👨‍💼 Inicializando vista de asistente");
    loadOnlineTeachersForAssistant();
    loadPieRequestsForAssistant();
    loadCollaborativeProjectsForAssistant();
    loadAllContentForAssistant();
}

// 🔥 HACER FUNCIONES GLOBALES PARA LOS BOTONES
window.updatePieRequestStatus = updatePieRequestStatus;
window.deletePieRequest = deletePieRequest;
window.updateProjectStatus = updateProjectStatus;
window.deleteCollaborativeProject = deleteCollaborativeProject;

export function loadOnlineTeachersForAssistant() {
    const el = document.getElementById("onlineTeachersAssistant");
    if (!el) {
        console.error("❌ No se encontró el elemento onlineTeachersAssistant");
        return;
    }

    el.innerHTML = "<div class='loading-container'><div class='loading'></div><p>Cargando docentes...</p></div>";

    // Cancela listeners anteriores
    if (realtimeSubscriptions.onlineTeachers) {
        realtimeSubscriptions.onlineTeachers();
    }

    console.log("🔍 Asistente: Iniciando escucha de docentes en tiempo real...");

    realtimeSubscriptions.onlineTeachers = db.collection("users")
        .where("role", "==", "profesor")
        .onSnapshot((snap) => {
            console.log("📊 Asistente: Datos de docentes recibidos", snap.size);

            if (snap.empty) {
                el.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users-slash"></i>
                        <p>No hay docentes registrados</p>
                    </div>
                `;
                return;
            }

            const teachers = [];
            snap.forEach(doc => {
                teachers.push({
                    uid: doc.id,
                    name: doc.data().name,
                    isOnline: false
                });
            });

            // Función para renderizar docentes
            const renderTeachers = () => {
                const onlineTeachers = [];
                const offlineTeachers = [];

                teachers.forEach(teacher => {
                    const teacherHTML = `
                        <div class="teacher-status-item ${teacher.isOnline ? 'online' : 'offline'}">
                            <div class="d-flex align-items-center">
                                <span class="dot ${teacher.isOnline ? 'dot-online' : 'dot-offline'} me-3"></span>
                                <div class="teacher-info">
                                    <span class="teacher-name d-block">${escapeHtml(teacher.name)}</span>
                                    <span class="teacher-role small text-muted">
                                        ${teacher.isOnline ? '🟢 Conectado ahora' : '🔴 Desconectado'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;

                    if (teacher.isOnline) {
                        onlineTeachers.push(teacherHTML);
                    } else {
                        offlineTeachers.push(teacherHTML);
                    }
                });

                const allTeachers = [...onlineTeachers, ...offlineTeachers];
                el.innerHTML = allTeachers.join('');
            };

            // Renderizar inicialmente
            renderTeachers();

            // 🔥 ESCUCHAR CAMBIOS EN TIEMPO REAL - API LEGACY
            const presenceListeners = [];
            
            teachers.forEach(teacher => {
                const presenceRef = rdb.ref(`presence/${teacher.uid}`);
                
                const presenceListener = presenceRef.on("value", (snapshot) => {
                    const isOnline = snapshot.exists() && snapshot.val() === true;
                    
                    console.log(`👤 Asistente: ${teacher.name} - ${isOnline ? 'CONECTADO' : 'DESCONECTADO'}`);
                    
                    // Actualizar estado
                    teacher.isOnline = isOnline;
                    // Re-renderizar
                    renderTeachers();
                }, (error) => {
                    console.error(`Error escuchando presencia de ${teacher.name}:`, error);
                });
                
                presenceListeners.push({ 
                    uid: teacher.uid, 
                    listener: presenceListener 
                });
            });

            // Guardar para limpiar después
            realtimeSubscriptions.assistantPresenceListeners = presenceListeners;
            
        }, (error) => {
            console.error("❌ Error cargando docentes:", error);
            el.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar docentes</p>
                </div>
            `;
        });
}

export function loadPieRequestsForAssistant() {
    const el = document.getElementById("pieRequestsListAssistant");
    
    if (realtimeSubscriptions.pieRequests) {
        realtimeSubscriptions.pieRequests();
    }

    realtimeSubscriptions.pieRequests = db.collection("pieRequests")
        .orderBy("createdAt", "desc")
        .onSnapshot(snap => {
            el.innerHTML = "";
            
            if (snap.empty) {
                el.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-clock"></i>
                        <p>No hay solicitudes pendientes</p>
                    </div>
                `;
                return;
            }
            
            let hasNewItems = false;
            
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    hasNewItems = true;
                }
            });
            
            snap.forEach(doc => {
                const request = { id: doc.id, ...doc.data() };
                const requestDate = request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : "Fecha no disponible";
                const isCompleted = request.status === 'completada';
                const isNew = hasNewItems && doc.metadata.hasPendingWrites;
                
                el.innerHTML += `
                    <div class="pie-request-item ${isCompleted ? 'completed' : ''} ${isNew ? 'realtime-update' : ''}">
                        <div class="pie-request-header">
                            <div class="pie-request-student">
                                ${escapeHtml(request.studentName)} - ${escapeHtml(request.studentGrade)}
                                ${isNew ? '<span class="badge bg-success ms-2">Nuevo</span>' : ''}
                            </div>
                            <span class="badge ${getStatusBadgeClass(request.status)}">${request.status}</span>
                        </div>
                        <div class="pie-request-meta">
                            <strong>Solicitado por:</strong> ${escapeHtml(request.requestedByName)} | 
                            <strong>Asignatura:</strong> ${escapeHtml(request.subjectRequest)} | 
                            <strong>Fecha y Hora:</strong> ${request.formattedDate || 'No especificada'} ${request.formattedTime || ''}
                        </div>
                        <div class="pie-request-meta">
                            <strong>Tipo de atención:</strong> ${escapeHtml(request.attentionType || 'No especificado')} | 
                            <strong>Urgencia:</strong> <span class="badge ${getUrgencyBadgeClass(request.urgencyLevel)}">${escapeHtml(request.urgencyLevel || 'Media')}</span>
                        </div>
                        <div class="pie-request-description">
                            <strong>Descripción:</strong> ${escapeHtml(request.caseDescription)}
                        </div>
                        <div class="pie-request-meta">
                            <strong>Apoderado:</strong> ${escapeHtml(request.parentName)} | 
                            <strong>Teléfono:</strong> ${escapeHtml(request.parentPhone)}
                        </div>
                        <div class="pie-request-meta">
                            <strong>Días alternativos:</strong> ${request.preferredDays && request.preferredDays.length > 0 ? request.preferredDays.join(', ') : 'No especificados'} | 
                            <strong>Fecha solicitud:</strong> ${requestDate}
                        </div>
                        <div class="pie-request-actions">
                            ${!isCompleted ? `
                                <button class="btn btn-sm btn-success" onclick="updatePieRequestStatus('${request.id}', 'aprobada')">Aprobar</button>
                                <button class="btn btn-sm btn-warning" onclick="updatePieRequestStatus('${request.id}', 'pendiente')">Pendiente</button>
                                <button class="btn btn-sm btn-danger" onclick="updatePieRequestStatus('${request.id}', 'rechazada')">Rechazar</button>
                                <button class="btn btn-sm btn-info" onclick="updatePieRequestStatus('${request.id}', 'completada')">Marcar Completada</button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deletePieRequest('${request.id}')">Eliminar</button>
                            ` : `
                                <span class="text-success"><i class="fas fa-check-circle"></i> Hora completada</span>
                                <button class="btn btn-sm btn-outline-danger ms-2" onclick="deletePieRequest('${request.id}')">Eliminar</button>
                            `}
                        </div>
                    </div>
                `;
            });
            
            if (hasNewItems && currentUser && currentUser.role === 'asistente') {
                showRealtimeNotification('Nueva solicitud PIE recibida', 'info');
            }
        }, error => {
            console.error("Error en tiempo real de solicitudes PIE (asistente):", error);
        });
}

export function loadCollaborativeProjectsForAssistant() {
    const el = document.getElementById("collaborativeProjectsAssistant");
    
    if (realtimeSubscriptions.collaborativeProjects) {
        realtimeSubscriptions.collaborativeProjects();
    }

    realtimeSubscriptions.collaborativeProjects = db.collection("collaborativeProjects")
        .orderBy("createdAt", "desc")
        .onSnapshot(snap => {
            el.innerHTML = "";
            
            if (snap.empty) {
                el.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>No hay proyectos colaborativos</p>
                    </div>
                `;
                return;
            }
            
            let hasNewItems = false;
            
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    hasNewItems = true;
                }
            });
            
            snap.forEach(doc => {
                const project = { id: doc.id, ...doc.data() };
                const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : "Fecha no disponible";
                const endDate = project.startDate && project.duration ? 
                    new Date(new Date(project.startDate).getTime() + project.duration * 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : "No calculada";
                
                // NUEVO: Obtener fecha y hora de creación
                const createdAt = project.createdAt ? 
                    new Date(project.createdAt.seconds * 1000) : new Date();
                const creationDate = createdAt.toLocaleDateString();
                const creationTime = createdAt.toLocaleTimeString('es-CL', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                const isNew = hasNewItems && doc.metadata.hasPendingWrites;
                const isCompleted = project.status === 'completada';
                
                el.innerHTML += `
                    <div class="collaborative-project-item ${isCompleted ? 'completed' : ''} ${isNew ? 'realtime-update' : ''}">
                        <div class="collaborative-project-header">
                            <div class="collaborative-project-title">
                                ${escapeHtml(project.name)}
                                ${isNew ? '<span class="badge bg-success ms-2">Nuevo</span>' : ''}
                            </div>
                            <span class="badge ${getStatusBadgeClass(project.status)}">${project.status || 'pendiente'}</span>
                        </div>
                        <div class="collaborative-project-meta">
                            <strong>Creado por:</strong> ${escapeHtml(project.createdByName)} | 
                            <strong>Docente:</strong> ${escapeHtml(project.teacher)} | 
                            <strong>Asignatura:</strong> ${escapeHtml(project.subject)}
                        </div>
                        <div class="collaborative-project-meta">
                            <strong>Inicio:</strong> ${startDate} | 
                            <strong>Duración:</strong> ${project.duration} semanas | 
                            <strong>Fin estimado:</strong> ${endDate}
                        </div>
                        <!-- NUEVA LÍNEA: Mostrar fecha y hora de creación -->
                        <div class="collaborative-project-meta">
                            <strong>Creado el:</strong> ${creationDate} a las ${creationTime}
                        </div>
                        <div class="collaborative-project-objective">
                            <strong>Objetivo:</strong> ${escapeHtml(project.objective)}
                        </div>
                        ${project.strategies && project.strategies.length > 0 ? `
                            <div class="collaborative-project-strategies">
                                <strong>Estrategias:</strong>
                                ${project.strategies.map(strategy => `<span class="strategy-tag">${escapeHtml(strategy)}</span>`).join('')}
                            </div>
                        ` : ''}
                        <div class="pie-request-actions mt-3">
                            ${!isCompleted ? `
                                <button class="btn btn-sm btn-success" onclick="updateProjectStatus('${project.id}', 'aprobada')">Aprobar</button>
                                <button class="btn btn-sm btn-warning" onclick="updateProjectStatus('${project.id}', 'pendiente')">Pendiente</button>
                                <button class="btn btn-sm btn-danger" onclick="updateProjectStatus('${project.id}', 'rechazada')">Rechazar</button>
                                <button class="btn btn-sm btn-info" onclick="updateProjectStatus('${project.id}', 'completada')">Marcar Completada</button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteCollaborativeProject('${project.id}')">Eliminar</button>
                            ` : `
                                <span class="text-success"><i class="fas fa-check-circle"></i> Proyecto completado</span>
                                <button class="btn btn-sm btn-outline-warning ms-2" onclick="updateProjectStatus('${project.id}', 'pendiente')">Reabrir</button>
                                <button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteCollaborativeProject('${project.id}')">Eliminar</button>
                            `}
                        </div>
                    </div>
                `;
            });
            
            if (hasNewItems && currentUser && currentUser.role === 'asistente') {
                showRealtimeNotification('Nuevo proyecto colaborativo creado', 'warning');
            }
        }, error => {
            console.error("Error en tiempo real de proyectos colaborativos (asistente):", error);
        });
}

export function loadAllContentForAssistant() {
    db.collection("projects")
        .orderBy("createdAt", "desc")
        .onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const project = { id: change.doc.id, ...change.doc.data() };
                    showRealtimeNotification(
                        `El profesor ${escapeHtml(project.uploadedByName || 'Un profesor')} subió: "${escapeHtml(project.title)}"`,
                        'success'
                    );
                }
            });
        });
}