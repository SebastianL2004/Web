// ------------------ DIRECTOR VIEW FUNCTIONS ------------------
import { db, rdb } from '../config/firebase.js';
import { currentUser, realtimeSubscriptions } from '../config/constants.js';
import { escapeHtml } from '../utils/security.js';
import { showRealtimeNotification } from '../services/notifications.js';

// 1. IMPORTAR LAS FUNCIONES DE COMENTARIOS (Ajusta la ruta si el archivo tiene otro nombre)
// Asumiré que el archivo anterior se llama 'directorComments.js'
import { 
    loadDirectorComments, 
    addDirectorComment, 
    deleteDirectorComment 
} from './director-comments.js'; // 🔥 CAMBIAR: directorComments.js → director-comments.js

// 2. HACER LAS FUNCIONES GLOBALES PARA QUE EL HTML (onclick) LAS VEA
window.addDirectorComment = addDirectorComment;
window.deleteDirectorComment = deleteDirectorComment;

export function loadOnlineTeachersForDirector() {
    const el = document.getElementById("onlineTeachersDirector");
    if (!el) {
        console.error("❌ No se encontró el elemento onlineTeachersDirector");
        return;
    }

    el.innerHTML = "<div class='loading-container'><div class='loading'></div><p>Cargando docentes...</p></div>";

    if (realtimeSubscriptions.onlineTeachers) {
        realtimeSubscriptions.onlineTeachers();
    }

    // Limpiar listeners de presencia anteriores
    if (realtimeSubscriptions.directorPresenceListeners) {
        realtimeSubscriptions.directorPresenceListeners.forEach(({ uid, listener }) => {
            rdb.ref("presence/" + uid).off("value", listener);
        });
    }

    console.log("🔍 Director: Iniciando escucha en tiempo real...");

    realtimeSubscriptions.onlineTeachers = db.collection("users")
        .where("role", "==", "profesor")
        .onSnapshot((snap) => {
            console.log("📊 Director: Datos de docentes recibidos", snap.size);

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

            const updateUI = () => {
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

            updateUI();

            const presenceListeners = [];

            teachers.forEach(teacher => {
                const presenceRef = rdb.ref(`presence/${teacher.uid}`);

                const presenceListener = presenceRef.on("value", (snapshot) => {
                    const isOnline = snapshot.exists() && snapshot.val() === true;
                    // console.log(`👤 Director: ${teacher.name} - ${isOnline ? 'CONECTADO' : 'DESCONECTADO'}`); // Comentado para limpiar consola
                    teacher.isOnline = isOnline;
                    updateUI();
                }, (error) => {
                    console.error(`❌ Error escuchando presencia de ${teacher.name}:`, error);
                });

                presenceListeners.push({
                    uid: teacher.uid,
                    listener: presenceListener
                });
            });

            realtimeSubscriptions.directorPresenceListeners = presenceListeners;

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

// Exportar globalmente por si se llama desde HTML
window.loadOnlineTeachersForDirector = loadOnlineTeachersForDirector;

export function loadPieRequestsForDirector() {
    const el = document.getElementById("pieRequestsListDirector");

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
                if (change.type === 'added') hasNewItems = true;
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
                            <span class="badge badge-${request.status}">${request.status}</span>
                        </div>
                        <div class="pie-request-meta">
                            <strong>Solicitado por:</strong> ${escapeHtml(request.requestedByName)} | 
                            <strong>Asignatura:</strong> ${escapeHtml(request.subjectRequest)} | 
                            <strong>Fecha:</strong> ${request.formattedDate || 'No especificada'}
                        </div>
                        <div class="pie-request-meta">
                            <strong>Urgencia:</strong> <span class="badge ${getUrgencyBadgeClass(request.urgencyLevel)}">${escapeHtml(request.urgencyLevel || 'Media')}</span>
                        </div>
                        <div class="pie-request-description">
                            <strong>Descripción:</strong> ${escapeHtml(request.caseDescription)}
                        </div>
                        <div class="pie-request-actions">
                            <small class="text-muted">Solo vista - Las ediciones las realiza el asistente PIE</small>
                        </div>
                    </div>
                `;
            });

            if (hasNewItems && currentUser.role === 'director') {
                showRealtimeNotification('Nueva solicitud PIE recibida', 'info', 'solicitó');
            }
        }, error => {
            console.error("Error en tiempo real de solicitudes PIE (director):", error);
        });
}

export function loadCollaborativeProjectsForDirector() {
    const el = document.getElementById("collaborativeProjectsDirector");
    if (!el) {
        console.error("❌ No se encontró collaborativeProjectsDirector");
        return;
    }
    
    if (realtimeSubscriptions.directorCollaborativeProjects) {
        realtimeSubscriptions.directorCollaborativeProjects();
    }

    console.log("🎯 Director: Iniciando escucha de proyectos colaborativos...");

    realtimeSubscriptions.directorCollaborativeProjects = db.collection("collaborativeProjects")
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
            
            let completedProjectsCount = 0;
            let totalProjectsCount = 0;
            
            snap.forEach(doc => {
                totalProjectsCount++;
                const project = { id: doc.id, ...doc.data() };
                const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : "Fecha no disponible";
                
                const isCompleted = project.status === 'completada' || 
                                    project.status === 'completado' || 
                                    project.status === 'completed' ||
                                    project.isCompleted === true;
                
                if (isCompleted) completedProjectsCount++;
                
                const statusBadge = isCompleted ? 
                    '<span class="badge bg-success ms-2"><i class="fas fa-check-circle me-1"></i>COMPLETADO</span>' : 
                    `<span class="badge bg-${project.status === 'aprobada' ? 'success' : 'warning'}">${project.status || 'pendiente'}</span>`;
                
                el.innerHTML += `
                    <div class="collaborative-project-item ${isCompleted ? 'completed' : ''}">
                        <div class="collaborative-project-header">
                            <div class="collaborative-project-title">
                                ${escapeHtml(project.name)}
                                ${statusBadge}
                            </div>
                        </div>
                        <div class="collaborative-project-meta">
                            <strong>Creado por:</strong> ${escapeHtml(project.createdByName)} | 
                            <strong>Docente:</strong> ${escapeHtml(project.teacher)}
                        </div>
                        <div class="collaborative-project-objective">
                            <strong>Objetivo:</strong> ${escapeHtml(project.objective)}
                        </div>
                        
                        <div class="director-comments-section mt-3">
                            <h6><i class="fas fa-comments me-2"></i>Comentarios del Director</h6>
                            <div class="new-director-comment mb-3">
                                <textarea class="form-control" id="newDirectorComment-${project.id}" 
                                          placeholder="Agregar un comentario para el docente..." 
                                          rows="2"></textarea>
                                <button class="btn btn-sm btn-primary mt-2" 
                                        onclick="window.addDirectorComment('${project.id}')">
                                    <i class="fas fa-paper-plane me-1"></i>Enviar Comentario
                                </button>
                            </div>
                            <div id="directorComments-${project.id}">
                                <div class="text-center"><div class="loading"></div></div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Cargar los comentarios usando la función importada
                loadDirectorComments(project.id);
            });
            
            updateCompletedProjectsCounter(completedProjectsCount, totalProjectsCount);
            updateDashboardMetrics(); 
            
        }, error => {
            console.error("❌ Error cargando proyectos colaborativos:", error);
        });
}

function updateCompletedProjectsCounter(completed, total) {
    const counterElement = document.getElementById('completedProjectsCounter');
    if (counterElement) {
        counterElement.innerHTML = `
            <small class="text-success">
                <i class="fas fa-check-circle me-1"></i>
                ${completed}/${total} proyectos completados
            </small>
        `;
    }
}

async function updateDashboardMetrics() {
    const dashboardEl = document.getElementById('metricsDashboard');
    if (!dashboardEl) return;
    try {
        const metrics = await calculateDashboardMetrics();
        renderDashboardMetrics(metrics);
    } catch (error) {
        console.error("❌ Error actualizando dashboard:", error);
    }
}

export function loadAllProjectsForDirector() {
    // Escucha proyectos generales
    db.collection("projects").orderBy("createdAt", "desc").onSnapshot(snap => {
        snap.docChanges().forEach(change => {
            if (change.type === 'added') {
                const project = change.doc.data();
                showRealtimeNotification(`Profesor subió: "${escapeHtml(project.title)}"`, 'success');
            }
        });
    });

    // Escucha proyectos colaborativos
    db.collection("collaborativeProjects").orderBy("createdAt", "desc").onSnapshot(snap => {
        snap.docChanges().forEach(change => {
            if (change.type === 'added') {
                const project = change.doc.data();
                showRealtimeNotification(`Nuevo proyecto colaborativo: "${escapeHtml(project.name)}"`, 'warning');
            }
        });
    });
}

// ------------------ DASHBOARD FUNCTIONS ------------------
export async function loadDirectorDashboard() {
    const dashboardEl = document.getElementById('metricsDashboard');
    if (!dashboardEl) return;
    
    try {
        const metrics = await calculateDashboardMetrics();
        renderDashboardMetrics(metrics);
    } catch (error) {
        console.error("❌ Error cargando dashboard:", error);
        dashboardEl.innerHTML = `<p class="text-danger">Error cargando métricas</p>`;
    }
}

async function calculateDashboardMetrics() {
    // Optimización: Promise.all para cargar en paralelo
    const [teachers, projects, pieRequests, collaborativeProjects] = await Promise.all([
        db.collection("users").where("role", "==", "profesor").get(),
        db.collection("projects").get(),
        db.collection("pieRequests").get(),
        db.collection("collaborativeProjects").get()
    ]);

    // Contar docentes online
    let onlineTeachers = 0;
    const presencePromises = teachers.docs.map(doc => 
        rdb.ref(`presence/${doc.id}`).once('value').then(snap => {
            if (snap.exists() && snap.val() === true) onlineTeachers++;
        })
    );
    await Promise.all(presencePromises);

    const completedCollaborative = collaborativeProjects.docs.filter(doc => {
        const d = doc.data();
        return d.status === 'completada' || d.status === 'completado' || d.status === 'completed' || d.isCompleted === true;
    }).length;

    const completedPie = pieRequests.docs.filter(d => d.data().status === 'completada').length;

    const totalTeachers = teachers.size;
    const totalColl = collaborativeProjects.size;
    const totalPie = pieRequests.size;

    return {
        totalTeachers,
        onlineTeachers,
        onlinePercentage: totalTeachers ? Math.round((onlineTeachers/totalTeachers)*100) : 0,
        totalCollaborativeProjects: totalColl,
        completedCollaborativeProjects: completedCollaborative,
        collaborativeCompletionRate: totalColl ? Math.round((completedCollaborative/totalColl)*100) : 0,
        totalPieRequests: totalPie,
        completedPieRequests: completedPie,
        pieCompletionRate: totalPie ? Math.round((completedPie/totalPie)*100) : 0,
        estimatedHours: (projects.size * 2) + (totalColl * 5),
        totalProjects: projects.size
    };
}

function renderDashboardMetrics(metrics) {
    const dashboardEl = document.getElementById('metricsDashboard');
    // ... (Tu código HTML del dashboard estaba bien, lo mantengo simplificado aquí por espacio, pero usa el tuyo original)
    dashboardEl.innerHTML = `
        <div class="col-md-3 mb-4">
            <div class="card metric-card bg-primary text-white">
                <div class="card-body text-center">
                    <h3>${metrics.onlineTeachers}/${metrics.totalTeachers}</h3>
                    <p>Docentes Conectados</p>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-4">
            <div class="card metric-card bg-success text-white">
                <div class="card-body text-center">
                    <h3>${metrics.completedCollaborativeProjects}/${metrics.totalCollaborativeProjects}</h3>
                    <p>Proyectos Colaborativos</p>
                </div>
            </div>
        </div>
        `;
}

// Helpers
function getUrgencyBadgeClass(urgencyLevel) {
    const classes = { 'Baja': 'bg-success', 'Media': 'bg-warning', 'Alta': 'bg-danger' };
    return classes[urgencyLevel] || 'bg-secondary';
}

// ------------------ EXPORTAR A WINDOW ------------------
// Esto permite que el HTML llame a estas funciones (ej: onclick="loadDirectorDashboard()")
window.loadDirectorDashboard = loadDirectorDashboard;
window.generateReport = async function() {
    // ... tu lógica de reporte ...
    alert("Generando reporte... (Asegúrate de importar generateReportImage si está en otro lado)");
};
