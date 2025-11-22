// ------------------ DIRECTOR VIEW FUNCTIONS ------------------
import { db, rdb } from '../config/firebase.js';
import { currentUser, realtimeSubscriptions } from '../config/constants.js';
import { getUrgencyBadgeClass } from '../utils/helpers.js';
import { escapeHtml } from '../utils/security.js';
import { showRealtimeNotification } from '../services/notifications.js';

export function loadOnlineTeachersForDirector() {
    const el = document.getElementById("onlineTeachersDirector");
    el.innerHTML = "<div class='loading-container'><div class='loading'></div></div>";

    if (realtimeSubscriptions.onlineTeachers) {
        realtimeSubscriptions.onlineTeachers();
    }

    realtimeSubscriptions.onlineTeachers = db.collection("users").where("role", "==", "profesor").onSnapshot(snap => {
        el.innerHTML = "";
        let hasOnlineTeachers = false;
        
        if (snap.empty) {
            el.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <p>No hay docentes registrados</p>
                </div>
            `;
            return;
        }
        
        const onlinePromises = [];
        
        snap.forEach(doc => {
            const u = { uid: doc.id, ...doc.data() };
            const promise = new Promise((resolve) => {
                rdb.ref("presence/" + u.uid).on("value", p => {
                    const online = p.exists() && p.val();
                    if (online) {
                        hasOnlineTeachers = true;
                        resolve(`
                            <div class="teacher-status-item">
                                <div class="d-flex align-items-center">
                                    <span class="dot dot-online me-3"></span>
                                    <div class="teacher-info">
                                        <span class="teacher-name d-block">${escapeHtml(u.name)}</span>
                                        <span class="teacher-role small text-muted">Profesor conectado</span>
                                    </div>
                                </div>
                            </div>`);
                    } else {
                        resolve('');
                    }
                });
            });
            onlinePromises.push(promise);
        });
        
        Promise.all(onlinePromises).then(results => {
            const html = results.join('');
            if (html) {
                el.innerHTML = html;
            } else {
                el.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-wifi-slash"></i>
                        <p>No hay docentes conectados</p>
                    </div>
                `;
            }
        });
    });
}

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
                            <span class="badge badge-${request.status}">${request.status}</span>
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
                            <strong>Teléfono:</strong> ${escapeHtml(request.parentPhone)} | 
                            <strong>Email:</strong> ${escapeHtml(request.parentEmail)}
                        </div>
                        <div class="pie-request-meta">
                            <strong>Días alternativos:</strong> ${request.preferredDays && request.preferredDays.length > 0 ? request.preferredDays.join(', ') : 'No especificados'} | 
                            <strong>Fecha solicitud:</strong> ${requestDate}
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
                
                el.innerHTML += `
                    <div class="collaborative-project-item ${isNew ? 'realtime-update' : ''}">
                        <div class="collaborative-project-header">
                            <div class="collaborative-project-title">
                                ${escapeHtml(project.name)}
                                ${isNew ? '<span class="badge bg-success ms-2">Nuevo</span>' : ''}
                            </div>
                            <span class="badge bg-warning">Proyecto</span>
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
                        
                        <div class="director-comments-section mt-4">
                            <div class="card border-primary">
                                <div class="card-header bg-primary text-white">
                                    <h6 class="mb-0">
                                        <i class="fas fa-comment-dots"></i> Comentarios del Director
                                        <span class="badge bg-light text-primary ms-2" id="commentCount-${project.id}">
                                            ${project.directorComments ? project.directorComments.length : 0}
                                        </span>
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div id="directorComments-${project.id}" class="mb-3">
                                        <div class="loading"></div>
                                    </div>
                                    
                                    <div class="new-director-comment">
                                        <textarea class="form-control" id="newDirectorComment-${project.id}" 
                                                placeholder="Escribe tu comentario o retroalimentación para el profesor..." 
                                                rows="3"></textarea>
                                        <button class="btn btn-primary btn-sm mt-2" onclick="addDirectorComment('${project.id}')">
                                            <i class="fas fa-paper-plane"></i> Enviar Comentario
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                setTimeout(() => loadDirectorComments(project.id), 100);
            });
            
            if (hasNewItems && currentUser.role === 'director') {
                showRealtimeNotification('Nuevo proyecto colaborativo creado', 'warning', 'creó');
            }
        }, error => {
            console.error("Error en tiempo real de proyectos colaborativos (director):", error);
        });
}
export function loadAllProjectsForDirector() {
    db.collection("projects")
        .orderBy("createdAt", "desc")
        .onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const project = { id: change.doc.id, ...change.doc.data() };
                    showRealtimeNotification(
                        `El profesor ${escapeHtml(project.uploadedByName || 'Un profesor')} subió: "${escapeHtml(project.title)}"`,
                        'success',
                        'subió'
                    );
                }
            });
        });

    db.collection("collaborativeProjects")
        .orderBy("createdAt", "desc")
        .onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const project = { id: change.doc.id, ...change.doc.data() };
                    showRealtimeNotification(
                        `Nuevo proyecto colaborativo: "${escapeHtml(project.name)}" por ${escapeHtml(project.createdByName)}`,
                        'warning',
                        'creó'
                    );
                }
            });
        });

    db.collection("pieRequests")
        .orderBy("createdAt", "desc")
        .onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const request = { id: change.doc.id, ...change.doc.data() };
                    showRealtimeNotification(
                        `Nueva solicitud PIE para ${escapeHtml(request.studentName)} de ${escapeHtml(request.requestedByName)}`,
                        'info',
                        'solicitó'
                    );
                }
            });
        });
}