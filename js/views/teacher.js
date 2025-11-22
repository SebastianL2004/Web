// ------------------ TEACHER VIEW FUNCTIONS ------------------
import { db, rdb } from '../config/firebase.js';
import { currentUser, teacherViewState, realtimeSubscriptions } from '../config/constants.js';
import { getUrgencyBadgeClass } from '../utils/helpers.js';
import { escapeHtml } from '../utils/security.js';
import { showRealtimeNotification } from '../services/notifications.js';

// 🔥 CONFIGURACIÓN SIMPLIFICADA DEL MODAL COLABORATIVO
export function setupCollaborativeProjectModal() {
  console.log("🔧 Teacher: Configurando botón para modal colaborativo...");
  
  const modalElement = document.getElementById('collaborativeProjectModal');
  if (!modalElement) {
    console.error("❌ No se encontró el modal colaborativo");
    return;
  }
  
  // Solo configurar evento básico de apertura
  modalElement.addEventListener('show.bs.modal', function () {
    console.log("📋 Modal abierto desde teacher view");
    
    // Comunicarse con el módulo collaborative si está disponible
    if (window.collaborativeModule && currentUser) {
      console.log("👤 Pasando usuario a módulo collaborative:", currentUser.name);
      window.collaborativeModule.setCurrentUser(currentUser);
      
      // El módulo collaborative manejará su propia inicialización
      setTimeout(() => {
        if (typeof window.collaborativeModule.initializeCollaborativeProjectForm === 'function') {
          window.collaborativeModule.initializeCollaborativeProjectForm();
        }
      }, 100);
    }
  });
}

export function loadMyProjects() {
  const el = document.getElementById("projectsList");
  if (!el) return;
  
  el.innerHTML = `
    <div class="loading-container">
      <div class="loading"></div>
      <p>Cargando proyectos...</p>
    </div>
  `;
  
  // Limpiar suscripción anterior
  if (realtimeSubscriptions.projects) {
    realtimeSubscriptions.projects();
  }

  const loadTimeout = setTimeout(() => {
    if (el.innerHTML.includes('loading-container')) {
      el.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error al cargar proyectos</p>
          <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.loadMyProjects()">
            Reintentar
          </button>
        </div>
      `;
    }
  }, 10000);

  try {
    realtimeSubscriptions.projects = db.collection("projects")
      .where("uploadedBy", "==", currentUser.uid)
      .orderBy("createdAt", "desc")
      .onSnapshot(snap => {
        clearTimeout(loadTimeout);
        
        el.innerHTML = "";
        
        if (snap.empty) {
          el.innerHTML = `
            <div class="empty-state">
              <i class="fas fa-folder-open"></i>
              <p>No has subido contenido aún</p>
            </div>
          `;
          return;
        }
        
        snap.forEach(doc => {
          const p = { id: doc.id, ...doc.data() };
          const uploadDate = p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : "Fecha no disponible";
          
          el.innerHTML += `
            <div class="project-item" onclick="viewProject('${p.id}')">
              <div class="d-flex justify-content-between align-items-start">
                <h6>${escapeHtml(p.title)}</h6>
                <small class="text-muted">${uploadDate}</small>
              </div>
              <small class="text-muted">${escapeHtml(p.subject)}</small>
              <p class="mt-2 small">${escapeHtml(p.description.substring(0, 100))}${p.description.length > 100 ? '...' : ''}</p>
            </div>`;
        });
      }, error => {
        clearTimeout(loadTimeout);
        console.error("❌ Error cargando proyectos:", error);
        handleFirestoreError(error, el, "proyectos", loadMyProjects);
      });
  } catch (error) {
    clearTimeout(loadTimeout);
    console.error("❌ Error en loadMyProjects:", error);
    handleFirestoreError(error, el, "proyectos", loadMyProjects);
  }
}

export function loadMyPieRequests() {
  const el = document.getElementById("myPieRequests");
  if (!el) return;
  
  el.innerHTML = `
    <div class="loading-container">
      <div class="loading"></div>
      <p>Cargando solicitudes PIE...</p>
    </div>
  `;
  
  if (realtimeSubscriptions.pieRequests) {
    realtimeSubscriptions.pieRequests();
  }

  const loadTimeout = setTimeout(() => {
    if (el.innerHTML.includes('loading-container')) {
      el.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error al cargar solicitudes</p>
          <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.loadMyPieRequests()">
            Reintentar
          </button>
        </div>
      `;
    }
  }, 10000);

  try {
    const query = db.collection("pieRequests")
      .where("requestedBy", "==", currentUser.uid);
    
    const queryWithOrder = query.orderBy("createdAt", "desc");
    
    realtimeSubscriptions.pieRequests = queryWithOrder.onSnapshot(snap => {
      clearTimeout(loadTimeout);
      
      el.innerHTML = "";
      
      if (snap.empty) {
        el.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-calendar-times"></i>
            <p>No has realizado solicitudes PIE</p>
          </div>
        `;
        return;
      }
      
      const requests = [];
      snap.forEach(doc => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      
      requests.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      
      requests.forEach(request => {
        const requestDate = request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : "Fecha no disponible";
        
        el.innerHTML += `
          <div class="pie-request-item-clickable" onclick="showPieRequestDetail('${request.id}')">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <strong>${escapeHtml(request.studentName)}</strong>
                <small class="d-block text-muted">${escapeHtml(request.studentGrade)}</small>
              </div>
              <span class="pie-request-status status-${request.status}">${request.status}</span>
            </div>
            <div class="small">
              <strong>Asignatura:</strong> ${escapeHtml(request.subjectRequest)}<br>
              <strong>Fecha:</strong> ${request.formattedDate || 'No especificada'}
            </div>
          </div>
        `;
      });
    }, error => {
      clearTimeout(loadTimeout);
      console.error("❌ Error cargando solicitudes PIE:", error);
      
      if (error.code === 'failed-precondition') {
        console.log("🔄 Usando query alternativa para solicitudes PIE...");
        realtimeSubscriptions.pieRequests = query.onSnapshot(snap => {
          el.innerHTML = "";
          
          if (snap.empty) {
            el.innerHTML = `
              <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>No has realizado solicitudes PIE</p>
              </div>
            `;
            return;
          }
          
          const requests = [];
          snap.forEach(doc => {
            requests.push({ id: doc.id, ...doc.data() });
          });
          
          requests.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
          
          requests.forEach(request => {
            const requestDate = request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : "Fecha no disponible";
            
            el.innerHTML += `
              <div class="pie-request-item-clickable" onclick="showPieRequestDetail('${request.id}')">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <strong>${escapeHtml(request.studentName)}</strong>
                    <small class="d-block text-muted">${escapeHtml(request.studentGrade)}</small>
                  </div>
                  <span class="pie-request-status status-${request.status}">${request.status}</span>
                </div>
                <div class="small">
                  <strong>Asignatura:</strong> ${escapeHtml(request.subjectRequest)}<br>
                  <strong>Fecha:</strong> ${request.formattedDate || 'No especificada'}
                </div>
              </div>
            `;
          });
        });
      } else {
        handleFirestoreError(error, el, "solicitudes PIE", loadMyPieRequests);
      }
    });
  } catch (error) {
    clearTimeout(loadTimeout);
    console.error("❌ Error en loadMyPieRequests:", error);
    handleFirestoreError(error, el, "solicitudes PIE", loadMyPieRequests);
  }
}

export function loadMyCollaborativeProjects() {
  const el = document.getElementById("myCollaborativeProjects");
  if (!el) return;
  
  el.innerHTML = `
    <div class="loading-container">
      <div class="loading"></div>
      <p>Cargando proyectos colaborativos...</p>
    </div>
  `;
  
  if (realtimeSubscriptions.collaborativeProjects) {
    realtimeSubscriptions.collaborativeProjects();
  }

  const loadTimeout = setTimeout(() => {
    if (el.innerHTML.includes('loading-container')) {
      el.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error al cargar proyectos colaborativos</p>
          <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.loadMyCollaborativeProjects()">
            Reintentar
          </button>
        </div>
      `;
    }
  }, 10000);

  try {
    const query = db.collection("collaborativeProjects")
      .where("createdBy", "==", currentUser.uid);
    
    const queryWithOrder = query.orderBy("createdAt", "desc");
    
    realtimeSubscriptions.collaborativeProjects = queryWithOrder.onSnapshot(snap => {
      clearTimeout(loadTimeout);
      
      el.innerHTML = "";
      
      if (snap.empty) {
        el.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-users"></i>
            <p>No has creado proyectos colaborativos aún</p>
          </div>
        `;
        return;
      }
      
      let hasNewItems = false;
      const projects = [];
      
      snap.forEach(doc => {
        projects.push({ id: doc.id, ...doc.data() });
        if (doc.metadata.hasPendingWrites) {
          hasNewItems = true;
        }
      });
      
      projects.forEach(project => {
        const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : "Fecha no disponible";
        const directorCommentsCount = project.directorComments ? project.directorComments.length : 0;
        
        el.innerHTML += `
          <div class="collaborative-project-item-clickable ${directorCommentsCount > 0 ? 'has-director-comments' : ''}" 
               onclick="showCollaborativeProjectDetail('${project.id}')">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <strong>${escapeHtml(project.name)}</strong>
                <small class="d-block text-muted">${escapeHtml(project.teacher)} - ${escapeHtml(project.subject)}</small>
              </div>
              <span class="badge bg-warning">Proyecto</span>
            </div>
            <div class="small">
              <strong>Inicio:</strong> ${startDate}<br>
              <strong>Duración:</strong> ${project.duration} semanas<br>
              <strong>Docente:</strong> ${escapeHtml(project.teacher)}<br>
              <strong>Objetivo:</strong> ${escapeHtml(project.objective.substring(0, 80))}${project.objective.length > 80 ? '...' : ''}
            </div>
            ${directorCommentsCount > 0 ? `
              <div class="mt-2">
                <small class="text-info"><i class="fas fa-comment"></i> ${directorCommentsCount} comentario(s) del director</small>
              </div>
            ` : ''}
          </div>
        `;
      });
      
      if (hasNewItems) {
        showRealtimeNotification('Tu proyecto colaborativo se creó correctamente', 'success', 'creaste');
      }
    }, error => {
      clearTimeout(loadTimeout);
      console.error("❌ Error en tiempo real de proyectos colaborativos:", error);
      
      if (error.code === 'failed-precondition') {
        console.log("🔄 Usando query alternativa para proyectos colaborativos...");
        realtimeSubscriptions.collaborativeProjects = query.onSnapshot(snap => {
          el.innerHTML = "";
          
          if (snap.empty) {
            el.innerHTML = `
              <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>No has creado proyectos colaborativos aún</p>
              </div>
            `;
            return;
          }
          
          const projects = [];
          snap.forEach(doc => {
            projects.push({ id: doc.id, ...doc.data() });
          });
          
          projects.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
          
          projects.forEach(project => {
            const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : "Fecha no disponible";
            const directorCommentsCount = project.directorComments ? project.directorComments.length : 0;
            
            el.innerHTML += `
              <div class="collaborative-project-item-clickable ${directorCommentsCount > 0 ? 'has-director-comments' : ''}" 
                   onclick="showCollaborativeProjectDetail('${project.id}')">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <strong>${escapeHtml(project.name)}</strong>
                    <small class="d-block text-muted">${escapeHtml(project.teacher)} - ${escapeHtml(project.subject)}</small>
                  </div>
                  <span class="badge bg-warning">Proyecto</span>
                </div>
                <div class="small">
                  <strong>Inicio:</strong> ${startDate}<br>
                  <strong>Duración:</strong> ${project.duration} semanas<br>
                  <strong>Docente:</strong> ${escapeHtml(project.teacher)}<br>
                  <strong>Objetivo:</strong> ${escapeHtml(project.objective.substring(0, 80))}${project.objective.length > 80 ? '...' : ''}
                </div>
                ${directorCommentsCount > 0 ? `
                  <div class="mt-2">
                    <small class="text-info"><i class="fas fa-comment"></i> ${directorCommentsCount} comentario(s) del director</small>
                  </div>
                ` : ''}
              </div>
            `;
          });
        });
      } else {
        handleFirestoreError(error, el, "proyectos colaborativos", loadMyCollaborativeProjects);
      }
    });
  } catch (error) {
    clearTimeout(loadTimeout);
    console.error("❌ Error en loadMyCollaborativeProjects:", error);
    handleFirestoreError(error, el, "proyectos colaborativos", loadMyCollaborativeProjects);
  }
}

// Función auxiliar para manejar errores de Firestore
function handleFirestoreError(error, element, resourceName, retryFunction) {
  let errorMessage = `Error al cargar ${resourceName}`;
  let showRetryButton = true;
  
  if (error.code === 'failed-precondition') {
    errorMessage = `Configuración necesaria para ${resourceName}. El sistema se configurará automáticamente.`;
    showNotification('⚠️ Configurando sistema... por favor espera', 'warning');
    
    setTimeout(() => {
      if (retryFunction && typeof retryFunction === 'function') {
        retryFunction();
      }
    }, 10000);
  } else if (error.code === 'unavailable') {
    errorMessage = `Error de conexión al cargar ${resourceName}`;
  } else if (error.code === 'permission-denied') {
    errorMessage = `No tienes permisos para acceder a ${resourceName}`;
    showRetryButton = false;
  }
  
  element.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <p>${errorMessage}</p>
      <small class="text-muted">${error.message}</small>
      ${showRetryButton ? `
        <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.${retryFunction.name}()">
          Reintentar
        </button>
      ` : ''}
    </div>
  `;
}

// Hacer las funciones disponibles globalmente
window.loadMyProjects = loadMyProjects;
window.loadMyPieRequests = loadMyPieRequests;
window.loadMyCollaborativeProjects = loadMyCollaborativeProjects;
window.setupCollaborativeProjectModal = setupCollaborativeProjectModal;

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    setupCollaborativeProjectModal();
  }, 1000);
});

export function loadOnlineTeachersForTeacher() {
    const el = document.getElementById("onlineTeachersTeacher");
    if (!el) return;
    
    el.innerHTML = "<div class='loading-container'><div class='loading'></div></div>";

    if (realtimeSubscriptions.onlineTeachers) {
        realtimeSubscriptions.onlineTeachers();
    }

    realtimeSubscriptions.onlineTeachers = db.collection("users")
        .where("role", "==", "profesor")
        .onSnapshot(snap => {
            el.innerHTML = "";
            
            if (snap.empty) {
                el.innerHTML = `<div class="empty-state">No hay docentes registrados</div>`;
                return;
            }
            
            const onlinePromises = [];
            
            snap.forEach(doc => {
                const u = { uid: doc.id, ...doc.data() };
                // No mostrar al usuario actual
                if (u.uid === currentUser.uid) return;
                
                const promise = new Promise((resolve) => {
                    rdb.ref("presence/" + u.uid).on("value", p => {
                        const online = p.exists() && p.val();
                        if (online) {
                            resolve(`
                                <div class="teacher-status-item">
                                    <div class="d-flex align-items-center">
                                        <span class="dot dot-online me-3"></span>
                                        <div class="teacher-info">
                                            <span class="teacher-name d-block">${escapeHtml(u.name)}</span>
                                            <span class="teacher-role small text-muted">Conectado</span>
                                        </div>
                                    </div>
                                </div>
                            `);
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
                    el.innerHTML = `<div class="empty-state">No hay otros docentes conectados</div>`;
                }
            });
        });
}