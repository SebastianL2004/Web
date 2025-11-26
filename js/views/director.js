// ------------------ DIRECTOR VIEW FUNCTIONS ------------------
import { db, rdb } from '../config/firebase.js';
import { currentUser, realtimeSubscriptions } from '../config/constants.js';
import { escapeHtml } from '../utils/security.js';
import { showRealtimeNotification } from '../services/notifications.js';

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

                    console.log(`👤 Director: ${teacher.name} - ${isOnline ? 'CONECTADO' : 'DESCONECTADO'}`);

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
    if (!el) {
        console.error("❌ No se encontró collaborativeProjectsDirector");
        return;
    }
    
    if (realtimeSubscriptions.directorCollaborativeProjects) {
        console.log("🔄 Limpiando suscripción anterior de proyectos colaborativos (director)");
        realtimeSubscriptions.directorCollaborativeProjects();
    }

    console.log("🎯 Director: Iniciando escucha de proyectos colaborativos...");

    realtimeSubscriptions.directorCollaborativeProjects = db.collection("collaborativeProjects")
        .orderBy("createdAt", "desc")
        .onSnapshot(snap => {
            console.log("📊 Director: Datos de proyectos recibidos", snap.size);
            
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
                
                // 🔥 DETECTAR PROYECTO COMPLETADO - MÚLTIPLES FORMAS
                const isCompleted = project.status === 'completada' || 
                                  project.status === 'completado' || 
                                  project.status === 'completed' ||
                                  project.isCompleted === true;
                
                if (isCompleted) {
                    completedProjectsCount++;
                    console.log("✅ Director: Proyecto completado detectado:", project.name, "Estado:", project.status);
                }
                
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
                            <strong>Docente:</strong> ${escapeHtml(project.teacher)} | 
                            <strong>Asignatura:</strong> ${escapeHtml(project.subject)}
                        </div>
                        <div class="collaborative-project-meta">
                            <strong>Inicio:</strong> ${startDate} | 
                            <strong>Duración:</strong> ${project.duration} semanas | 
                            <strong>Estado:</strong> ${project.status || 'pendiente'}
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
                        
                        ${isCompleted ? `
                            <div class="mt-3 p-3 bg-success text-white rounded">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-check-circle fa-2x me-3"></i>
                                    <div>
                                        <strong>PROYECTO COMPLETADO</strong><br>
                                        <small>Marcado como finalizado por el asistente PIE</small>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="director-comments-section mt-3">
                            <h6><i class="fas fa-comments me-2"></i>Comentarios del Director</h6>
                            <div class="new-director-comment mb-3">
                                <textarea class="form-control" id="directorComment-${project.id}" 
                                          placeholder="Agregar un comentario para el docente..." 
                                          rows="2"></textarea>
                                <button class="btn btn-sm btn-primary mt-2" 
                                        onclick="addDirectorComment('${project.id}')">
                                    <i class="fas fa-paper-plane me-1"></i>Enviar Comentario
                                </button>
                            </div>
                            <div id="directorCommentList-${project.id}">
                                <!-- Los comentarios se cargarán aquí -->
                            </div>
                        </div>
                    </div>
                `;
                
                loadDirectorComments(project.id);
            });
            
            // 🔥 ACTUALIZAR CONTADORES EN TIEMPO REAL
            updateCompletedProjectsCounter(completedProjectsCount, totalProjectsCount);
            updateDashboardMetrics(); // Actualizar dashboard completo
            
        }, error => {
            console.error("❌ Error cargando proyectos colaborativos (director):", error);
            el.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar proyectos</p>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadCollaborativeProjectsForDirector()">
                        Reintentar
                    </button>
                </div>
            `;
        });
}

// 🔥 FUNCIÓN MEJORADA: Actualizar contador de proyectos completados
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
    
    // Actualizar dashboard si está visible
    if (document.getElementById('metricsDashboard')) {
        setTimeout(() => {
            loadDirectorDashboard();
        }, 500);
    }
}

// 🔥 NUEVA FUNCIÓN: Actualizar métricas del dashboard rápidamente
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
                
                // 🔥 DETECTAR CUANDO UN PROYECTO SE MARCA COMO COMPLETADO
                if (change.type === 'modified') {
                    const project = { id: change.doc.id, ...change.doc.data() };
                    const wasCompleted = project.status === 'completada' || 
                                       project.status === 'completado' || 
                                       project.status === 'completed';
                    
                    if (wasCompleted) {
                        console.log("🎉 Director: Proyecto marcado como completado:", project.name);
                        showRealtimeNotification(
                            `Proyecto completado: "${escapeHtml(project.name)}"`,
                            'success',
                            'completó'
                        );
                        
                        // Forzar actualización del dashboard
                        setTimeout(() => {
                            loadDirectorDashboard();
                            loadCollaborativeProjectsForDirector();
                        }, 1000);
                    }
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

// ------------------ DASHBOARD FUNCTIONS ------------------
export async function loadDirectorDashboard() {
    console.log("📊 Cargando dashboard del director...");
    
    const dashboardEl = document.getElementById('metricsDashboard');
    if (!dashboardEl) {
        console.error("❌ No se encontró el elemento metricsDashboard");
        return;
    }
    
    try {
        console.log("🔄 Iniciando cálculo de métricas...");
        const metrics = await calculateDashboardMetrics();
        console.log("✅ Métricas calculadas:", metrics);
        renderDashboardMetrics(metrics);
        
    } catch (error) {
        console.error("❌ Error cargando dashboard:", error);
        dashboardEl.innerHTML = `
            <div class="col-12 text-center text-danger">
                <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                <p>Error al cargar las métricas</p>
                <small>${error.message}</small>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadDirectorDashboard()">
                    Reintentar
                </button>
            </div>
        `;
    }
}

async function calculateDashboardMetrics() {
    console.log("📈 Calculando métricas del dashboard...");

    const [teachers, projects, pieRequests, collaborativeProjects] = await Promise.all([
        db.collection("users").where("role", "==", "profesor").get(),
        db.collection("projects").get(),
        db.collection("pieRequests").get(),
        db.collection("collaborativeProjects").get()
    ]);

    console.log("✅ Datos obtenidos:", {
        teachers: teachers.size,
        projects: projects.size,
        pieRequests: pieRequests.size,
        collaborativeProjects: collaborativeProjects.size
    });

    const totalTeachers = teachers.size;
    const totalProjects = projects.size;
    const totalPieRequests = pieRequests.size;
    const totalCollaborativeProjects = collaborativeProjects.size;

    // Docentes conectados
    let onlineTeachers = 0;
    const presencePromises = [];

    teachers.forEach(doc => {
        const presencePromise = rdb.ref(`presence/${doc.id}`).once('value')
            .then(snapshot => {
                if (snapshot.exists() && snapshot.val() === true) {
                    onlineTeachers++;
                }
            });
        presencePromises.push(presencePromise);
    });

    await Promise.all(presencePromises);

    // Solicitudes PIE completadas
    const completedPieRequests = pieRequests.docs.filter(doc => {
        const data = doc.data();
        return data.status === 'completada' || data.status === 'completed';
    }).length;

    // 🔥 PROYECTOS COLABORATIVOS COMPLETADOS - DETECCIÓN MEJORADA
    const completedCollaborativeProjects = collaborativeProjects.docs.filter(doc => {
        const data = doc.data();
        return data.status === 'completada' || 
               data.status === 'completado' || 
               data.status === 'completed' ||
               data.isCompleted === true;
    }).length;

    console.log("🔥 Proyectos colaborativos completados:", completedCollaborativeProjects, "de", totalCollaborativeProjects);

    const estimatedHours = totalProjects * 2 + totalCollaborativeProjects * 5;

    return {
        totalTeachers,
        onlineTeachers,
        totalProjects,
        totalPieRequests,
        completedPieRequests,
        totalCollaborativeProjects,
        completedCollaborativeProjects,
        estimatedHours,
        onlinePercentage: totalTeachers > 0 ? Math.round((onlineTeachers / totalTeachers) * 100) : 0,
        pieCompletionRate: totalPieRequests > 0 ? Math.round((completedPieRequests / totalPieRequests) * 100) : 0,
        collaborativeCompletionRate: totalCollaborativeProjects > 0 ? Math.round((completedCollaborativeProjects / totalCollaborativeProjects) * 100) : 0
    };
}

function renderDashboardMetrics(metrics) {
    const dashboardEl = document.getElementById('metricsDashboard');

    dashboardEl.innerHTML = `
        <div class="col-md-3 mb-4">
            <div class="card metric-card bg-primary text-white">
                <div class="card-body text-center">
                    <i class="fas fa-users fa-2x mb-2"></i>
                    <h3>${metrics.onlineTeachers}/${metrics.totalTeachers}</h3>
                    <p class="mb-0">Docentes Conectados</p>
                    <small>${metrics.onlinePercentage}% en línea</small>
                </div>
            </div>
        </div>
        
        <div class="col-md-3 mb-4">
            <div class="card metric-card bg-success text-white">
                <div class="card-body text-center">
                    <i class="fas fa-project-diagram fa-2x mb-2"></i>
                    <h3>${metrics.completedCollaborativeProjects}/${metrics.totalCollaborativeProjects}</h3>
                    <p class="mb-0">Proyectos Colaborativos</p>
                    <small>${metrics.collaborativeCompletionRate}% completados</small>
                </div>
            </div>
        </div>
        
        <div class="col-md-3 mb-4">
            <div class="card metric-card bg-info text-white">
                <div class="card-body text-center">
                    <i class="fas fa-clock fa-2x mb-2"></i>
                    <h3>${metrics.estimatedHours}+</h3>
                    <p class="mb-0">Horas Trabajadas</p>
                    <small>Estimado total</small>
                </div>
            </div>
        </div>
        
        <div class="col-md-3 mb-4">
            <div class="card metric-card bg-warning text-white">
                <div class="card-body text-center">
                    <i class="fas fa-tasks fa-2x mb-2"></i>
                    <h3>${metrics.completedPieRequests}/${metrics.totalPieRequests}</h3>
                    <p class="mb-0">Solicitudes PIE</p>
                    <small>${metrics.pieCompletionRate}% completadas</small>
                </div>
            </div>
        </div>
        
        <div class="col-12">
            <div class="card">
                <div class="card-body">
                    <h6 class="card-title">Resumen General</h6>
                    <div class="row text-center">
                        <div class="col-md-4">
                            <div class="border-end">
                                <h4 class="text-primary">${metrics.totalProjects}</h4>
                                <small class="text-muted">Proyectos Totales</small>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="border-end">
                                <h4 class="text-success">${metrics.totalCollaborativeProjects}</h4>
                                <small class="text-muted">Proyectos Colaborativos</small>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div>
                                <h4 class="text-info">${metrics.totalPieRequests}</h4>
                                <small class="text-muted">Solicitudes PIE Totales</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.generateReport = async function () {
    console.log("📄 Generando reporte...");

    try {
        const metrics = await calculateDashboardMetrics();
        await generateReportImage(metrics);
    } catch (error) {
        console.error("❌ Error generando reporte:", error);
        alert("Error al generar el reporte. Intenta nuevamente.");
    }
};

async function generateReportImage(metrics) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Reporte de Métricas - Director', 50, 40);

    ctx.font = '14px Arial';
    ctx.fillText(`Generado: ${new Date().toLocaleDateString()}`, 50, 60);

    let yPosition = 150;
    const metricsData = [
        { label: 'Docentes Conectados', value: `${metrics.onlineTeachers}/${metrics.totalTeachers}`, color: '#3498db' },
        { label: 'Proyectos Colaborativos', value: `${metrics.completedCollaborativeProjects}/${metrics.totalCollaborativeProjects}`, color: '#27ae60' },
        { label: 'Horas Trabajadas', value: `${metrics.estimatedHours}+`, color: '#2980b9' },
        { label: 'Solicitudes PIE Completadas', value: `${metrics.completedPieRequests}/${metrics.totalPieRequests}`, color: '#f39c12' },
        { label: 'Tasa de Completitud PIE', value: `${metrics.pieCompletionRate}%`, color: '#e74c3c' },
        { label: 'Tasa de Completitud Proyectos', value: `${metrics.collaborativeCompletionRate}%`, color: '#9b59b6' }
    ];

    metricsData.forEach((metric, index) => {
        const xPosition = (index % 2 === 0) ? 100 : 450;
        if (index % 2 === 0 && index !== 0) yPosition += 100;

        ctx.fillStyle = metric.color;
        ctx.beginPath();
        ctx.arc(xPosition, yPosition, 30, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(metric.value, xPosition, yPosition + 5);

        ctx.fillStyle = '#2c3e50';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(metric.label, xPosition, yPosition + 50);
    });

    ctx.fillStyle = '#7f8c8d';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Colegio Arica - Plataforma Colaborativa', canvas.width / 2, canvas.height - 20);

    canvas.toBlob(function (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-director-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showRealtimeNotification('Reporte descargado exitosamente', 'success');
    });
}

function getUrgencyBadgeClass(urgencyLevel) {
    const classes = {
        'Baja': 'bg-success',
        'Media': 'bg-warning', 
        'Alta': 'bg-danger'
    };
    return classes[urgencyLevel] || 'bg-secondary';
}

window.loadDirectorDashboard = loadDirectorDashboard;
window.generateReport = generateReport;