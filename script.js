// ------------------ FIREBASE CONFIG ------------------
const firebaseConfig = {
  apiKey: "AIzaSyAeAQ5jxjH-dCkYsJHjNCbfpT8oGO7LqJ8",
  authDomain: "bancoweb-1ed7a.firebaseapp.com",
  projectId: "bancoweb-1ed7a",
  messagingSenderId: "242150606441",
  appId: "1:242150606441:web:5d645ace83710c4ead84f8",
  measurementId: "G-PBVQT05MXN"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const rdb = firebase.database();

// Mantener sesión
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

// ------------------ GLOBAL ------------------
let currentUser = null;
let loginModal, registerModal;

// Estado global para gestión de vistas y suscripciones en tiempo real
let teacherViewState = {
    currentDetailView: null,
    currentDetailId: null,
    unsubscribeDetail: null
};

// Array global para almacenar estrategias seleccionadas en proyectos colaborativos
let selectedStrategies = [];

// Sistema de suscripciones en tiempo real
let realtimeSubscriptions = {
    projects: null,
    pieRequests: null,
    collaborativeProjects: null,
    onlineTeachers: null
};

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar modales después de que el DOM esté listo
  loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
  registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
  
  document.getElementById("mainContent").style.display = "none";
  document.getElementById("directorView").style.display = "none";
  document.getElementById("teacherView").style.display = "none";
  document.getElementById("assistantView").style.display = "none";

  // Mostrar modal de login después de un breve delay
  setTimeout(() => {
    loginModal.show();
  }, 500);
  
  setupFormListeners();
  auth.onAuthStateChanged(onAuthStateChanged);
  
  // Inicializar indicador de tiempo real
  initializeRealtimeIndicator();
});

// ------------------ SISTEMA DE TIEMPO REAL MEJORADO ------------------

function initializeRealtimeIndicator() {
    // Crear indicador de actividad en tiempo real
    const indicator = document.createElement('div');
    indicator.className = 'realtime-indicator';
    indicator.innerHTML = `
        <div class="pulse"></div>
        <span>Conectado en tiempo real</span>
    `;
    document.body.appendChild(indicator);
}

// Función para mostrar notificaciones en tiempo real
function showRealtimeNotification(message, type = 'info', action = 'creó') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} realtime-notification`;
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-bell me-2"></i>
            <div class="flex-grow-1">
                <strong>Nueva actividad:</strong><br>
                ${message}
            </div>
            <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('hide');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

// Limpiar todas las suscripciones en tiempo real
function cleanupRealtimeSubscriptions() {
    Object.values(realtimeSubscriptions).forEach(unsubscribe => {
        if (unsubscribe && typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    
    // Limpiar estado
    realtimeSubscriptions = {
        projects: null,
        pieRequests: null,
        collaborativeProjects: null,
        onlineTeachers: null
    };
}

// ------------------ FORM LISTENERS ------------------
function setupFormListeners() {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      alert('Error al iniciar sesión: ' + err.message);
    }
  });

  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;

    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await db.collection('users').doc(cred.user.uid).set({
        name, email, role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert('✅ Usuario registrado correctamente. Ya puedes iniciar sesión.');
      registerModal.hide();
      setTimeout(() => loginModal.show(), 300);
    } catch (err) {
      alert('❌ Error al registrar: ' + err.message);
    }
  });

  document.getElementById('uploadContentForm').addEventListener('submit', handleContentUpload);
  document.getElementById('schedulePieForm').addEventListener('submit', handlePieScheduleRequest);
  document.getElementById('collaborativeProjectForm').addEventListener('submit', handleCollaborativeProject);
  
  // Inicializar el formulario cuando se muestre el modal de proyectos colaborativos
  document.getElementById('collaborativeProjectModal').addEventListener('show.bs.modal', function () {
    initializeCollaborativeProjectForm();
  });
}

// ------------------ AUTH CORREGIDO ------------------
async function onAuthStateChanged(user) {
  if (user) {
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      alert('Perfil no encontrado.');
      auth.signOut();
      return;
    }

    currentUser = { uid: user.uid, ...(userDoc.data()) };
    document.getElementById('username').textContent = `Bienvenido, ${currentUser.name}`;
    document.getElementById('logoutBtn').style.display = 'inline';

    // Cerrar modal de login y limpiar backdrop
    if (loginModal) {
      loginModal.hide();
      
      // Remover el backdrop manualmente
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => {
        backdrop.remove();
      });
      
      // Habilitar el scroll del body
      document.body.classList.remove('modal-open');
      document.body.style.overflow = 'auto';
      document.body.style.paddingRight = '0';
    }

    setPresenceOnline(user.uid);

    // Limpiar suscripciones anteriores
    cleanupRealtimeSubscriptions();

    // Asignar vista según rol
    if (currentUser.role === 'director') showDirectorView();
    else if (currentUser.role === 'asistente') showAssistantView();
    else showTeacherView();

  } else {
    currentUser = null;
    document.getElementById('username').textContent = 'No autenticado';
    document.getElementById('logoutBtn').style.display = 'none';
    
    // Limpiar suscripciones
    cleanupRealtimeSubscriptions();
    
    // Mostrar modal de login
    hideAllViews();
    
    // Limpiar cualquier backdrop residual
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
      backdrop.remove();
    });
    
    document.body.classList.remove('modal-open');
    document.body.style.overflow = 'auto';
    
    setTimeout(() => {
      if (loginModal) {
        loginModal.show();
      }
    }, 300);
  }
}

function logout() {
  if (!currentUser) return;
  rdb.ref('presence/' + currentUser.uid).set(false).catch(() => {});
  cleanupRealtimeSubscriptions();
  auth.signOut();
}

function setPresenceOnline(uid) {
  const ref = rdb.ref('presence/' + uid);
  rdb.ref('.info/connected').on('value', snap => {
    if (!snap.val()) return;
    ref.set(true);
    ref.onDisconnect().set(false);
  });
}

// ------------------ DIRECTOR VIEW MEJORADA CON TIEMPO REAL ------------------
function showDirectorView() {
  hideAllViews();
  document.getElementById("mainContent").style.display = "block";
  document.getElementById("directorView").style.display = "block";
  
  // Cargar datos con suscripciones en tiempo real
  loadOnlineTeachersForDirector();
  loadPieRequestsForDirector();
  loadCollaborativeProjectsForDirector();
  loadAllProjectsForDirector();
}

function loadOnlineTeachersForDirector() {
  const el = document.getElementById("onlineTeachersDirector");
  el.innerHTML = "<div class='loading-container'><div class='loading'></div></div>";

  // Limpiar suscripción anterior
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

function loadPieRequestsForDirector() {
  const el = document.getElementById("pieRequestsListDirector");
  
  // Limpiar suscripción anterior
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
      
      // Mostrar notificación para nuevas solicitudes
      if (hasNewItems && currentUser.role === 'director') {
        showRealtimeNotification('Nueva solicitud PIE recibida', 'info', 'solicitó');
      }
    }, error => {
      console.error("Error en tiempo real de solicitudes PIE (director):", error);
    });
}

// NUEVA FUNCIÓN: Cargar todos los proyectos para el director
function loadAllProjectsForDirector() {
  // Suscripción a nuevos proyectos de profesores
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

  // Suscripción a nuevos proyectos colaborativos
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

  // Suscripción a nuevas solicitudes PIE
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

// ------------------ TEACHER VIEW MEJORADA CON TIEMPO REAL ------------------
function showTeacherView() {
  hideAllViews();
  document.getElementById("mainContent").style.display = "block";
  document.getElementById("teacherView").style.display = "block";
  
  // Limpiar suscripción anterior si existe
  if (teacherViewState.unsubscribeDetail) {
    teacherViewState.unsubscribeDetail();
  }
  
  // Resetear estado de vista
  teacherViewState.currentDetailView = null;
  teacherViewState.currentDetailId = null;
  teacherViewState.unsubscribeDetail = null;
  
  // Cargar datos con nuevo sistema en tiempo real - CORREGIDO: Sin delay
  loadMyProjects();
  loadMyPieRequests();
  loadMyCollaborativeProjects();
  setupTeacherViewInteractions();
}

function setupTeacherViewInteractions() {
  // Las interacciones se manejan directamente en los onclick de los elementos
}

function hideAllViews() {
  document.getElementById("mainContent").style.display = "none";
  document.getElementById("directorView").style.display = "none";
  document.getElementById("teacherView").style.display = "none";
  document.getElementById("assistantView").style.display = "none";
}

function loadMyProjects() {
  const el = document.getElementById("projectsList");
  
  // Limpiar suscripción anterior
  if (realtimeSubscriptions.projects) {
    realtimeSubscriptions.projects();
  }

  realtimeSubscriptions.projects = db.collection("projects").where("uploadedBy", "==", currentUser.uid)
    .orderBy("createdAt", "desc")
    .onSnapshot(snap => {
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
      console.error("Error en tiempo real de proyectos:", error);
      // MOSTRAR ERROR AL USUARIO
      el.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error al cargar proyectos</p>
          <small class="text-muted">${error.message}</small>
        </div>
      `;
    });
}

function loadMyPieRequests() {
  const el = document.getElementById("myPieRequests");
  
  // Limpiar suscripción anterior
  if (realtimeSubscriptions.pieRequests) {
    realtimeSubscriptions.pieRequests();
  }

  // Usar onSnapshot para actualización en tiempo real
  realtimeSubscriptions.pieRequests = db.collection("pieRequests")
    .where("requestedBy", "==", currentUser.uid)
    .orderBy("createdAt", "desc")
    .onSnapshot(snap => {
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
      
      let hasNewItems = false;
      
      snap.docChanges().forEach(change => {
        if (change.type === 'added' && change.doc.metadata.hasPendingWrites) {
          hasNewItems = true;
        }
      });
      
      snap.forEach(doc => {
        const request = { id: doc.id, ...doc.data() };
        const requestDate = request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : "Fecha no disponible";
        const isNew = hasNewItems && doc.metadata.hasPendingWrites;
        
        // Determinar si tiene comentarios del director
        const hasDirectorComments = request.directorComments && request.directorComments.length > 0;
        
        el.innerHTML += `
          <div class="pie-request-item-clickable ${hasDirectorComments ? 'has-director-comments' : ''} ${isNew ? 'realtime-update' : ''}" 
               onclick="showPieRequestDetail('${request.id}')">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <strong>${escapeHtml(request.studentName)} ${isNew ? '<span class="badge bg-success ms-2">Nuevo</span>' : ''}</strong>
                <small class="d-block text-muted">${escapeHtml(request.studentGrade)}</small>
              </div>
              <span class="pie-request-status status-${request.status}">${request.status}</span>
            </div>
            <div class="small">
              <strong>Asignatura:</strong> ${escapeHtml(request.subjectRequest)}<br>
              <strong>Fecha:</strong> ${request.formattedDate || 'No especificada'}<br>
              <strong>Estado:</strong> 
              ${request.status === 'pendiente' ? '🟡 Pendiente' : 
                request.status === 'aprobada' ? '🟢 Aprobada' : 
                request.status === 'rechazada' ? '🔴 Rechazada' : 
                request.status === 'completada' ? '✅ Completada' : '⚪ ' + request.status}
            </div>
            ${hasDirectorComments ? `
              <div class="mt-2">
                <small class="text-info"><i class="fas fa-comment"></i> Tiene comentarios del director</small>
              </div>
            ` : ''}
          </div>
        `;
      });
      
      // Mostrar notificación para nuevas solicitudes
      if (hasNewItems) {
        showRealtimeNotification('Tu solicitud PIE se envió correctamente', 'success', 'solicitaste');
      }
    }, error => {
      console.error("Error en tiempo real de solicitudes PIE:", error);
    });
}

// ===== FUNCIONES MEJORADAS PARA VISTAS DETALLADAS =====

function showPieRequestDetail(requestId) {
  const el = document.getElementById("myPieRequests");
  
  // Limpiar suscripción anterior si existe
  if (teacherViewState.unsubscribeDetail) {
    teacherViewState.unsubscribeDetail();
  }
  
  // Usar onSnapshot para actualización en tiempo real
  const unsubscribe = db.collection("pieRequests").doc(requestId).onSnapshot(doc => {
    if (!doc.exists) return;
    
    const request = { id: doc.id, ...doc.data() };
    const requestDate = request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : "Fecha no disponible";
    
    el.innerHTML = `
      <div class="pie-request-detail-view">
        <div class="pie-request-detail-header">
          <h5>Solicitud PIE - ${escapeHtml(request.studentName)}</h5>
          <button class="btn btn-secondary back-button" onclick="loadMyPieRequests()">
            <i class="fas fa-arrow-left"></i> Volver
          </button>
        </div>
        
        <div class="pie-request-info">
          <div class="row">
            <div class="col-md-6">
              <p><strong>Estudiante:</strong> ${escapeHtml(request.studentName)}</p>
              <p><strong>Curso:</strong> ${escapeHtml(request.studentGrade)}</p>
              <p><strong>Asignatura:</strong> ${escapeHtml(request.subjectRequest)}</p>
            </div>
            <div class="col-md-6">
              <p><strong>Estado:</strong> <span class="pie-request-status status-${request.status}">${request.status}</span></p>
              <p><strong>Fecha solicitada:</strong> ${request.formattedDate || 'No especificada'}</p>
              <p><strong>Hora:</strong> ${request.formattedTime || 'No especificada'}</p>
            </div>
          </div>
        </div>
        
        <div class="pie-request-info">
          <h6>Datos del Apoderado</h6>
          <p><strong>Nombre:</strong> ${escapeHtml(request.parentName)}</p>
          <p><strong>Teléfono:</strong> ${escapeHtml(request.parentPhone)}</p>
          <p><strong>Email:</strong> ${escapeHtml(request.parentEmail)}</p>
        </div>
        
        <div class="pie-request-info">
          <h6>Detalles de la Solicitud</h6>
          <p><strong>Tipo de atención:</strong> ${escapeHtml(request.attentionType || 'No especificado')}</p>
          <p><strong>Nivel de urgencia:</strong> <span class="badge ${getUrgencyBadgeClass(request.urgencyLevel)}">${escapeHtml(request.urgencyLevel || 'Media')}</span></p>
          <p><strong>Días alternativos:</strong> ${request.preferredDays && request.preferredDays.length > 0 ? request.preferredDays.join(', ') : 'No especificados'}</p>
          <p><strong>Descripción:</strong></p>
          <div class="alert alert-light">${escapeHtml(request.caseDescription)}</div>
        </div>
        
        <div class="pie-request-info">
          <p><strong>Fecha de solicitud:</strong> ${requestDate}</p>
          <p><strong>Solicitado por:</strong> ${escapeHtml(request.requestedByName)}</p>
        </div>
        
        <!-- Comentarios del Director -->
        ${request.directorComments && request.directorComments.length > 0 ? `
          <div class="director-comments-section mt-4">
            <div class="card border-primary">
              <div class="card-header bg-primary text-white">
                <h6 class="mb-0">
                  <i class="fas fa-comment-dots"></i> Comentarios del Director
                  <span class="badge bg-light text-primary ms-2">${request.directorComments.length}</span>
                </h6>
              </div>
              <div class="card-body">
                ${request.directorComments.sort((a, b) => b.date.seconds - a.date.seconds)
                  .map(comment => `
                    <div class="director-comment-teacher-view mb-3">
                      <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <strong class="comment-author">${escapeHtml(comment.authorName)}</strong>
                          <small class="text-muted ms-2">(Director)</small>
                        </div>
                        <small class="comment-date">${new Date(comment.date.seconds * 1000).toLocaleString('es-CL')}</small>
                      </div>
                      <div class="comment-text bg-light p-3 rounded border-start border-primary border-3">
                        ${escapeHtml(comment.text)}
                      </div>
                    </div>
                  `).join('')}
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
    
    teacherViewState.currentDetailView = 'pie-request';
    teacherViewState.currentDetailId = requestId;
    
    // Guardar la función unsubscribe para limpiar cuando se salga de la vista
    teacherViewState.unsubscribeDetail = unsubscribe;
  }, error => {
    console.error("Error en tiempo real de detalle de solicitud:", error);
  });
}

// ===== PROYECTOS COLABORATIVOS MEJORADOS CON TIEMPO REAL =====

function loadMyCollaborativeProjects() {
  const el = document.getElementById("myCollaborativeProjects");
  
  // Limpiar suscripción anterior
  if (realtimeSubscriptions.collaborativeProjects) {
    realtimeSubscriptions.collaborativeProjects();
  }

  // Usar onSnapshot para actualización en tiempo real
  realtimeSubscriptions.collaborativeProjects = db.collection("collaborativeProjects")
    .where("createdBy", "==", currentUser.uid)
    .orderBy("createdAt", "desc")
    .onSnapshot(snap => {
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
      
      snap.docChanges().forEach(change => {
        if (change.type === 'added' && change.doc.metadata.hasPendingWrites) {
          hasNewItems = true;
        }
      });
      
      snap.forEach(doc => {
        const project = { id: doc.id, ...doc.data() };
        const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : "Fecha no disponible";
        const isNew = hasNewItems && doc.metadata.hasPendingWrites;
        
        // Contar comentarios del director
        const directorCommentsCount = project.directorComments ? project.directorComments.length : 0;
        
        el.innerHTML += `
          <div class="collaborative-project-item-clickable ${directorCommentsCount > 0 ? 'has-director-comments' : ''} ${isNew ? 'realtime-update' : ''}" 
               onclick="showCollaborativeProjectDetail('${project.id}')">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <strong>${escapeHtml(project.name)} ${isNew ? '<span class="badge bg-success ms-2">Nuevo</span>' : ''}</strong>
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
      
      // Mostrar notificación para nuevos proyectos
      if (hasNewItems) {
        showRealtimeNotification('Tu proyecto colaborativo se creó correctamente', 'success', 'creaste');
      }
    }, error => {
      console.error("Error en tiempo real de proyectos colaborativos:", error);
    });
}

function showCollaborativeProjectDetail(projectId) {
  const el = document.getElementById("myCollaborativeProjects");
  
  // Limpiar suscripción anterior si existe
  if (teacherViewState.unsubscribeDetail) {
    teacherViewState.unsubscribeDetail();
  }
  
  // Usar onSnapshot para actualización en tiempo real
  const unsubscribe = db.collection("collaborativeProjects").doc(projectId).onSnapshot(doc => {
    if (!doc.exists) return;
    
    const project = { id: doc.id, ...doc.data() };
    const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : "Fecha no disponible";
    const endDate = project.startDate && project.duration ? 
      new Date(new Date(project.startDate).getTime() + project.duration * 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : "No calculada";
    
    el.innerHTML = `
      <div class="project-collaborative-detail-view">
        <div class="project-collaborative-header">
          <h5>${escapeHtml(project.name)}</h5>
          <button class="btn btn-secondary back-button" onclick="loadMyCollaborativeProjects()">
            <i class="fas fa-arrow-left"></i> Volver
          </button>
        </div>
        
        <div class="project-collaborative-info">
          <div class="row">
            <div class="col-md-6">
              <p><strong>Docente Colaborador:</strong> ${escapeHtml(project.teacher)}</p>
              <p><strong>Asignatura:</strong> ${escapeHtml(project.subject)}</p>
              <p><strong>Fecha de inicio:</strong> ${startDate}</p>
            </div>
            <div class="col-md-6">
              <p><strong>Duración:</strong> ${project.duration} semanas</p>
              <p><strong>Fecha fin estimada:</strong> ${endDate}</p>
              <p><strong>Creado por:</strong> ${escapeHtml(project.createdByName)}</p>
            </div>
          </div>
        </div>
        
        <div class="project-collaborative-info">
          <h6>Objetivo del Proyecto</h6>
          <div class="alert alert-light">${escapeHtml(project.objective)}</div>
        </div>
        
        ${project.strategies && project.strategies.length > 0 ? `
          <div class="project-collaborative-info">
            <h6>Estrategias Implementadas</h6>
            <div class="strategies-container">
              ${project.strategies.map(strategy => `
                <span class="strategy-tag">${escapeHtml(strategy)}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <!-- Comentarios del Director -->
        ${project.directorComments && project.directorComments.length > 0 ? `
          <div class="director-comments-section mt-4">
            <div class="card border-success">
              <div class="card-header bg-success text-white">
                <h6 class="mb-0">
                  <i class="fas fa-comment-check"></i> Comentarios del Director
                  <span class="badge bg-light text-success ms-2">${project.directorComments.length}</span>
                </h6>
              </div>
              <div class="card-body">
                ${project.directorComments.sort((a, b) => b.date.seconds - a.date.seconds)
                  .map(comment => `
                    <div class="director-comment-teacher-view mb-3">
                      <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <strong class="comment-author">${escapeHtml(comment.authorName)}</strong>
                          <small class="text-muted ms-2">(Director)</small>
                        </div>
                        <small class="comment-date">${new Date(comment.date.seconds * 1000).toLocaleString('es-CL')}</small>
                      </div>
                      <div class="comment-text bg-light p-3 rounded border-start border-success border-3">
                        ${escapeHtml(comment.text)}
                      </div>
                    </div>
                  `).join('')}
              </div>
            </div>
          </div>
        ` : `
          <div class="text-center text-muted mt-4 py-3">
            <i class="fas fa-comment-slash fa-2x mb-2"></i>
            <p>El director aún no ha comentado este proyecto</p>
          </div>
        `}
      </div>
    `;
    
    teacherViewState.currentDetailView = 'collaborative-project';
    teacherViewState.currentDetailId = projectId;
    
    // Guardar la función unsubscribe para limpiar cuando se salga de la vista
    teacherViewState.unsubscribeDetail = unsubscribe;
  }, error => {
    console.error("Error en tiempo real de detalle de proyecto:", error);
  });
}

// ------------------ MEJORAS PARA PROYECTO COLABORATIVO ------------------

// Función para cargar docentes en el desplegable
function loadTeachersForCollaborativeProject() {
  const teacherSelect = document.getElementById("projectTeacher");
  
  // Limpiar opciones existentes excepto la primera
  while (teacherSelect.children.length > 1) {
    teacherSelect.removeChild(teacherSelect.lastChild);
  }
  
  // Obtener docentes de la base de datos
  db.collection("users").where("role", "==", "profesor").get().then(snap => {
    if (!snap.empty) {
      snap.forEach(doc => {
        const teacher = doc.data();
        // No mostrar al usuario actual en la lista
        if (doc.id !== currentUser.uid) {
          const option = document.createElement("option");
          option.value = teacher.name;
          option.textContent = teacher.name;
          teacherSelect.appendChild(option);
        }
      });
    }
  }).catch(error => {
    console.error("Error cargando docentes:", error);
  });
}
// Función para configurar la fecha mínima (hoy)
function setupDateValidation() {
  const dateInput = document.getElementById("projectStartDate");
  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;
  
  // Validar fecha al cambiar
  dateInput.addEventListener('change', function() {
    const selectedDate = new Date(this.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Establecer a medianoche para comparar solo fechas
    
    if (selectedDate < today) {
      this.classList.add('is-invalid');
      document.getElementById('dateError').style.display = 'block';
    } else {
      this.classList.remove('is-invalid');
      document.getElementById('dateError').style.display = 'none';
    }
  });
}

// Función para agregar estrategia desde el desplegable
function addSelectedStrategy() {
  const strategySelect = document.getElementById("strategySelect");
  const selectedStrategy = strategySelect.value;
  
  if (selectedStrategy && !selectedStrategies.includes(selectedStrategy)) {
    selectedStrategies.push(selectedStrategy);
    updateSelectedStrategiesList();
    strategySelect.value = ""; // Resetear selección
  }
}

// Función para agregar estrategia personalizada
function addCustomStrategy() {
  const newStrategyInput = document.getElementById("newStrategyInput");
  const customStrategy = newStrategyInput.value.trim();
  
  if (customStrategy && !selectedStrategies.includes(customStrategy)) {
    selectedStrategies.push(customStrategy);
    updateSelectedStrategiesList();
    newStrategyInput.value = ""; // Limpiar input
  }
}

// Función para actualizar la lista de estrategias seleccionadas
function updateSelectedStrategiesList() {
  const strategiesList = document.getElementById("selectedStrategiesList");
  strategiesList.innerHTML = "";
  
  if (selectedStrategies.length === 0) {
    strategiesList.innerHTML = '<div class="text-muted">No hay estrategias seleccionadas</div>';
    return;
  }
  
  selectedStrategies.forEach((strategy, index) => {
    const strategyElement = document.createElement("div");
    strategyElement.className = "d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded";
    strategyElement.innerHTML = `
      <span>${escapeHtml(strategy)}</span>
      <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeStrategy(${index})">
        <i class="fas fa-times"></i>
      </button>
    `;
    strategiesList.appendChild(strategyElement);
  });
}

// Función para eliminar estrategia
function removeStrategy(index) {
  selectedStrategies.splice(index, 1);
  updateSelectedStrategiesList();
}

// Función para inicializar las mejoras del formulario
function initializeCollaborativeProjectForm() {
  loadTeachersForCollaborativeProject();
  setupDateValidation();
  updateSelectedStrategiesList(); // Inicializar lista vacía
}

// ------------------ ASISTENTE VIEW MEJORADA CON TIEMPO REAL ------------------
function showAssistantView() {
  hideAllViews();
  document.getElementById("mainContent").style.display = "block";
  document.getElementById("assistantView").style.display = "block";
  
  // Cargar datos con suscripciones en tiempo real
  loadOnlineTeachersForAssistant();
  loadPieRequestsForAssistant();
  loadCollaborativeProjectsForAssistant();
  loadAllContentForAssistant();
}

function loadOnlineTeachersForAssistant() {
  const el = document.getElementById("onlineTeachersAssistant");
  el.innerHTML = "<div class='loading-container'><div class='loading'></div></div>";

  // Limpiar suscripción anterior
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

function loadPieRequestsForAssistant() {
  const el = document.getElementById("pieRequestsListAssistant");
  
  // Limpiar suscripción anterior
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
      
      // Mostrar notificación para nuevas solicitudes
      if (hasNewItems && currentUser.role === 'asistente') {
        showRealtimeNotification('Nueva solicitud PIE recibida', 'info', 'solicitó');
      }
    }, error => {
      console.error("Error en tiempo real de solicitudes PIE (asistente):", error);
    });
}

function loadCollaborativeProjectsForAssistant() {
  const el = document.getElementById("collaborativeProjectsAssistant");
  
  // Limpiar suscripción anterior
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
        const isNew = hasNewItems && doc.metadata.hasPendingWrites;
        
        // Determinar si está completado
        const isCompleted = project.status === 'completada';
        
        el.innerHTML += `
          <div class="collaborative-project-item ${isCompleted ? 'completed' : ''} ${isNew ? 'realtime-update' : ''}">
            <div class="collaborative-project-header">
              <div class="collaborative-project-title">
                ${escapeHtml(project.name)}
                ${isNew ? '<span class="badge bg-success ms-2">Nuevo</span>' : ''}
              </div>
              <span class="badge badge-${project.status || 'pendiente'}">${project.status || 'pendiente'}</span>
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
      
      // Mostrar notificación para nuevos proyectos
      if (hasNewItems && currentUser.role === 'asistente') {
        showRealtimeNotification('Nuevo proyecto colaborativo creado', 'warning', 'creó');
      }
    }, error => {
      console.error("Error en tiempo real de proyectos colaborativos (asistente):", error);
    });
}

// NUEVA FUNCIÓN: Cargar todo el contenido para el asistente
function loadAllContentForAssistant() {
  // Suscripción a nuevos proyectos de profesores
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
}

// ------------------ CLOUDINARY UPLOAD ------------------
async function handleContentUpload(e) {
  e.preventDefault();

  if (!currentUser) {
    alert("Tu sesión expiró.");
    auth.signOut();
    return;
  }

  const title = document.getElementById("contentTitle").value.trim();
  const subject = document.getElementById("contentSubject").value.trim();
  const description = document.getElementById("contentDescription").value.trim();
  const file = document.getElementById("contentFile").files[0];

  if (!title || !subject || !description || !file) {
    alert("Completa todos los campos.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "recursos_pie");
  formData.append("folder", currentUser.uid);
  formData.append("resource_type", "auto");

  const CLOUD_NAME = "dqnzla4mx";

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    if (!data.secure_url) throw new Error("Error subiendo archivo");

    await db.collection("projects").add({
      title,
      subject,
      description,
      filename: file.name,
      uploadedBy: currentUser.uid,
      uploadedByName: currentUser.name, // Agregar nombre del usuario
      fileURL: data.secure_url,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      comments: []
    });

    document.getElementById("uploadContentForm").reset();
    bootstrap.Modal.getInstance(document.getElementById("uploadContentModal")).hide();
    
    // NO es necesario forzar actualización - se hace automáticamente en tiempo real
    
    showNotification('✅ Archivo subido correctamente', 'success');

  } catch (err) {
    console.error(err);
    showNotification('❌ Error al subir archivo: ' + err.message, 'error');
  }
}

// ------------------ PIE SCHEDULE REQUEST ------------------
async function handlePieScheduleRequest(e) {
  e.preventDefault();

  if (!currentUser) {
    alert("Tu sesión expiró.");
    auth.signOut();
    return;
  }

  const studentName = document.getElementById("studentName").value.trim();
  const studentGrade = document.getElementById("studentGrade").value.trim();
  const parentName = document.getElementById("parentName").value.trim();
  const parentPhone = document.getElementById("parentPhone").value.trim();
  const parentEmail = document.getElementById("parentEmail").value.trim();
  const subjectRequest = document.getElementById("subjectRequest").value.trim();
  const preferredDate = document.getElementById("preferredDate").value;
  const preferredTime = document.getElementById("preferredTime").value;
  const preferredDays = Array.from(document.getElementById("preferredDays").selectedOptions)
    .map(option => option.value);
  const caseDescription = document.getElementById("caseDescription").value.trim();
  const attentionType = document.getElementById("attentionType").value;
  const urgencyLevel = document.getElementById("urgencyLevel").value;

  // Validación básica
  if (!studentName || !studentGrade || !parentName || !parentPhone || !parentEmail || 
      !subjectRequest || !preferredDate || !preferredTime || !caseDescription) {
    alert("Por favor, completa todos los campos obligatorios (marcados con *).");
    return;
  }

  // Formatear fecha y hora
  const formattedDateTime = `${preferredDate} ${preferredTime}`;
  const dateObj = new Date(`${preferredDate}T${preferredTime}`);
  const formattedDate = dateObj.toLocaleDateString('es-CL');
  const formattedTime = dateObj.toLocaleTimeString('es-CL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  try {
    await db.collection("pieRequests").add({
      studentName,
      studentGrade,
      parentName,
      parentPhone,
      parentEmail,
      subjectRequest,
      preferredDate: preferredDate,
      preferredTime: preferredTime,
      preferredDateTime: formattedDateTime,
      formattedDate: formattedDate,
      formattedTime: formattedTime,
      preferredDays,
      caseDescription,
      attentionType: attentionType || 'No especificado',
      urgencyLevel: urgencyLevel || 'Media',
      requestedBy: currentUser.uid,
      requestedByName: currentUser.name,
      status: "pendiente",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById("schedulePieForm").reset();
    bootstrap.Modal.getInstance(document.getElementById("schedulePieModal")).hide();
    
    // NO es necesario forzar actualización - se hace automáticamente en tiempo real
    
    showNotification('✅ Solicitud enviada correctamente. Será revisada por el equipo PIE.', 'success');

  } catch (err) {
    console.error(err);
    showNotification('❌ Error al enviar la solicitud: ' + err.message, 'error');
  }
}

// ------------------ COLLABORATIVE PROJECT MEJORADO ------------------
async function handleCollaborativeProject(e) {
  e.preventDefault();

  if (!currentUser) {
    alert("Tu sesión expiró.");
    auth.signOut();
    return;
  }

  const projectName = document.getElementById("projectName").value.trim();
  const projectStartDate = document.getElementById("projectStartDate").value;
  const projectDuration = document.getElementById("projectDuration").value;
  const projectTeacher = document.getElementById("projectTeacher").value.trim();
  const projectSubject = document.getElementById("projectSubject").value;
  const projectObjective = document.getElementById("projectObjective").value.trim();
  const projectFile = document.getElementById("projectFile").files[0];
  const projectFileDescription = document.getElementById("projectFileDescription").value.trim();

  // Validar fecha
  const selectedDate = new Date(projectStartDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (selectedDate < today) {
    alert("La fecha de inicio debe ser igual o posterior a la fecha actual.");
    document.getElementById("projectStartDate").classList.add('is-invalid');
    document.getElementById('dateError').style.display = 'block';
    return;
  }

  // Validación básica
  if (!projectName || !projectStartDate || !projectDuration || !projectTeacher || !projectSubject || !projectObjective) {
    alert("Por favor, completa todos los campos obligatorios (marcados con *).");
    return;
  }

  try {
    let fileURL = null;
    let fileName = null;

    // Subir archivo si existe
    if (projectFile) {
      const formData = new FormData();
      formData.append("file", projectFile);
      formData.append("upload_preset", "recursos_pie");
      formData.append("folder", `proyectos/${currentUser.uid}`);
      formData.append("resource_type", "auto");

      const CLOUD_NAME = "dqnzla4mx";
      
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (data.secure_url) {
        fileURL = data.secure_url;
        fileName = projectFile.name;
      }
    }

    // Crear proyecto en Firestore
    const projectData = {
      name: projectName,
      startDate: projectStartDate,
      duration: parseInt(projectDuration),
      teacher: projectTeacher,
      subject: projectSubject,
      objective: projectObjective,
      strategies: selectedStrategies, // Usar las estrategias seleccionadas
      createdBy: currentUser.uid,
      createdByName: currentUser.name,
      status: "pendiente", // Estado inicial
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Agregar datos del archivo si se subió
    if (fileURL) {
      projectData.projectFile = {
        url: fileURL,
        name: fileName,
        description: projectFileDescription,
        uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
    }

    await db.collection("collaborativeProjects").add(projectData);

    // Limpiar formulario y resetear estado
    document.getElementById("collaborativeProjectForm").reset();
    selectedStrategies = []; // Limpiar estrategias seleccionadas
    updateSelectedStrategiesList(); // Actualizar lista
    
    bootstrap.Modal.getInstance(document.getElementById("collaborativeProjectModal")).hide();
    
    // NO es necesario forzar actualización - se hace automáticamente en tiempo real
    
    // Mostrar mensaje de éxito
    const message = fileURL ? 
      "✅ Proyecto colaborativo creado correctamente con archivo adjunto." :
      "✅ Proyecto colaborativo creado correctamente.";
    
    showNotification(message, 'success');

  } catch (err) {
    console.error(err);
    showNotification('❌ Error al crear el proyecto: ' + err.message, 'error');
  }
}

// ------------------ UPDATE PIE REQUEST STATUS ------------------
async function updatePieRequestStatus(requestId, status) {
  // Verificar que solo los asistentes puedan cambiar estados
  if (currentUser.role !== 'asistente') {
    alert("Solo los asistentes PIE pueden modificar el estado de las solicitudes");
    return;
  }
  
  try {
    await db.collection("pieRequests").doc(requestId).update({
      status: status
    });
    showNotification(`✅ Solicitud ${status} correctamente`, 'success');
  } catch (err) {
    showNotification('❌ Error al actualizar la solicitud: ' + err.message, 'error');
  }
}

// ------------------ UPDATE PROJECT STATUS ------------------
async function updateProjectStatus(projectId, status) {
  // Verificar que solo los asistentes puedan cambiar estados
  if (currentUser.role !== 'asistente') {
    alert("Solo los asistentes PIE pueden modificar el estado de los proyectos");
    return;
  }
  
  try {
    await db.collection("collaborativeProjects").doc(projectId).update({
      status: status
    });
    showNotification(`✅ Proyecto ${status} correctamente`, 'success');
  } catch (err) {
    showNotification('❌ Error al actualizar el proyecto: ' + err.message, 'error');
  }
}

// ------------------ DELETE PIE REQUEST ------------------
async function deletePieRequest(requestId) {
  // Verificar que solo los asistentes puedan eliminar
  if (currentUser.role !== 'asistente') {
    alert("Solo los asistentes PIE pueden eliminar solicitudes");
    return;
  }
  
  if (!confirm("¿Estás seguro de que quieres eliminar esta solicitud? Esta acción no se puede deshacer.")) return;
  
  try {
    await db.collection("pieRequests").doc(requestId).delete();
    showNotification('✅ Solicitud eliminada correctamente', 'success');
  } catch (err) {
    showNotification('❌ Error al eliminar la solicitud: ' + err.message, 'error');
  }
}

// ------------------ DELETE COLLABORATIVE PROJECT ------------------
async function deleteCollaborativeProject(projectId) {
  // Verificar que solo los asistentes puedan eliminar
  if (currentUser.role !== 'asistente') {
    alert("Solo los asistentes PIE pueden eliminar proyectos colaborativos");
    return;
  }
  
  if (!confirm("¿Estás seguro de que quieres eliminar este proyecto colaborativo? Esta acción no se puede deshacer.")) return;
  
  try {
    await db.collection("collaborativeProjects").doc(projectId).delete();
    showNotification('✅ Proyecto colaborativo eliminado correctamente', 'success');
  } catch (err) {
    showNotification('❌ Error al eliminar el proyecto: ' + err.message, 'error');
  }
}

// ------------------ VIEW PROJECT ------------------
async function viewProject(id) {
  const doc = await db.collection("projects").doc(id).get();
  if (!doc.exists) return;

  const p = doc.data();

  // Determinar dónde mostrar el contenido según la vista actual
  let contentContainer;
  if (document.getElementById("teacherView").style.display !== "none") {
    // Estamos en la vista del profesor - mostrar en projectsList
    contentContainer = document.getElementById("projectsList");
  } else if (document.getElementById("directorView").style.display !== "none") {
    // Estamos en la vista del director - mostrar en selectedUserFiles
    contentContainer = document.getElementById("selectedUserFiles");
  } else {
    // Vista por defecto
    contentContainer = document.getElementById("selectedUserFiles");
  }

  contentContainer.innerHTML = `
    <div class="project-detail-view">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4>${escapeHtml(p.title)}</h4>
        <button class="btn btn-secondary btn-sm" onclick="goBackToProjects()">
          <i class="fas fa-arrow-left"></i> Volver
        </button>
      </div>
      
      <div class="project-info mb-4">
        <p><strong>Asignatura:</strong> ${escapeHtml(p.subject)}</p>
        <p><strong>Descripción:</strong> ${escapeHtml(p.description)}</p>
        <p><strong>Archivo:</strong> ${escapeHtml(p.filename)}</p>
        <p><strong>Subido:</strong> ${p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : 'Fecha no disponible'}</p>
      </div>

      <div class="file-preview mb-4">
        <h5>Vista Previa:</h5>
        ${(() => {
          const file = p.fileURL.toLowerCase();

          if (file.endsWith(".pdf")) {
            return `
              <div class="preview-container">
                <iframe src="${p.fileURL}" width="100%" height="500px" style="border: 1px solid #ddd; border-radius: 8px;"></iframe>
                <div class="text-center mt-2">
                  <a class="btn btn-primary" target="_blank" href="${p.fileURL}">
                    <i class="fas fa-download"></i> Descargar PDF
                  </a>
                </div>
              </div>`;
          }

          if (file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png") || file.endsWith(".gif")) {
            return `
              <div class="preview-container text-center">
                <img src="${p.fileURL}" class="img-fluid rounded shadow-sm mb-3" style="max-height: 500px;" />
                <br>
                <a class="btn btn-primary" target="_blank" href="${p.fileURL}">
                  <i class="fas fa-download"></i> Descargar Imagen
                </a>
              </div>`;
          }

          if (file.endsWith(".doc") || file.endsWith(".docx")) {
            return `
              <div class="preview-container">
                <div class="alert alert-info text-center">
                  <i class="fas fa-file-word fa-3x text-primary mb-2"></i>
                  <p>Documento de Word</p>
                  <a class="btn btn-primary" target="_blank" href="${p.fileURL}">
                    <i class="fas fa-download"></i> Descargar Documento
                  </a>
                </div>
              </div>`;
          }

          if (file.endsWith(".xls") || file.endsWith(".xlsx")) {
            return `
              <div class="preview-container">
                <div class="alert alert-info text-center">
                  <i class="fas fa-file-excel fa-3x text-success mb-2"></i>
                  <p>Hoja de Cálculo Excel</p>
                  <a class="btn btn-primary" target="_blank" href="${p.fileURL}">
                    <i class="fas fa-download"></i> Descargar Excel
                  </a>
                </div>
              </div>`;
          }

          if (file.endsWith(".ppt") || file.endsWith(".pptx")) {
            return `
              <div class="preview-container">
                <div class="alert alert-info text-center">
                  <i class="fas fa-file-powerpoint fa-3x text-danger mb-2"></i>
                  <p>Presentación PowerPoint</p>
                  <a class="btn btn-primary" target="_blank" href="${p.fileURL}">
                    <i class="fas fa-download"></i> Descargar Presentación
                  </a>
                </div>
              </div>`;
          }

          if (file.endsWith(".mp4") || file.endsWith(".webm") || file.endsWith(".ogg")) {
            return `
              <div class="preview-container">
                <video controls style="width:100%; max-height: 500px;" class="rounded shadow-sm">
                  <source src="${p.fileURL}">
                  Tu navegador no soporta el elemento de video.
                </video>
                <div class="text-center mt-2">
                  <a class="btn btn-primary" target="_blank" href="${p.fileURL}">
                    <i class="fas fa-download"></i> Descargar Video
                  </a>
                </div>
              </div>`;
          }

          if (file.endsWith(".mp3") || file.endsWith(".wav") || file.endsWith(".ogg")) {
            return `
              <div class="preview-container">
                <div class="alert alert-info text-center">
                  <i class="fas fa-file-audio fa-3x text-warning mb-2"></i>
                  <p>Archivo de Audio</p>
                  <audio controls class="mb-3" style="width:100%">
                    <source src="${p.fileURL}">
                  </audio>
                  <br>
                  <a class="btn btn-primary" target="_blank" href="${p.fileURL}">
                    <i class="fas fa-download"></i> Descargar Audio
                  </a>
                </div>
              </div>`;
          }

          // Para cualquier otro tipo de archivo
          return `
            <div class="preview-container">
              <div class="alert alert-secondary text-center">
                <i class="fas fa-file fa-3x text-muted mb-2"></i>
                <p>Archivo: ${escapeHtml(p.filename)}</p>
                <a class="btn btn-primary" target="_blank" href="${p.fileURL}">
                  <i class="fas fa-download"></i> Descargar Archivo
                </a>
              </div>
            </div>`;
        })()}
      </div>

      ${p.uploadedBy === currentUser.uid ? `
        <div class="project-actions mb-4">
          <button class="btn btn-warning btn-sm" onclick="editProject('${id}')">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="btn btn-danger btn-sm ms-2" onclick="deleteProject('${id}')">
            <i class="fas fa-trash"></i> Eliminar
          </button>
        </div>
      ` : ""}

      <div class="comments-section">
        <h5>Comentarios</h5>
        <div id="commentList-${id}"></div>
        <textarea id="newCommentText-${id}" class="form-control mt-2" placeholder="Escribe tu comentario..."></textarea>
        <button class="btn btn-success btn-sm mt-2" onclick="addComment('${id}')">
          <i class="fas fa-comment"></i> Comentar
        </button>
      </div>
    </div>
  `;

  loadComments(id);
}

function loadComments(id) {
  db.collection("projects").doc(id).onSnapshot(doc => {
    const comments = doc.data().comments || [];
    const box = document.getElementById(`commentList-${id}`);

    if (!box) return; // Si no existe el contenedor, salir

    if (!comments.length) {
      box.innerHTML = "<p class='text-muted'>No hay comentarios aún.</p>";
      return;
    }

    box.innerHTML = comments.sort((a, b) => b.date.seconds - a.date.seconds)
      .map(c => `
        <div class="comment-item">
          <div class="d-flex justify-content-between align-items-start">
            <strong class="comment-author">${escapeHtml(c.authorName)}</strong>
            <small class="comment-date">${new Date(c.date.seconds * 1000).toLocaleString()}</small>
          </div>
          <div class="comment-text">${escapeHtml(c.text)}</div>
        </div>
      `).join("");
  });
}

async function addComment(id) {
  const textElement = document.getElementById(`newCommentText-${id}`);
  const text = textElement.value.trim();
  
  if (!text) return alert("Por favor, escribe un comentario.");

  await db.collection("projects").doc(id).update({
    comments: firebase.firestore.FieldValue.arrayUnion({
      author: currentUser.uid,
      authorName: currentUser.name,
      text,
      date: firebase.firestore.Timestamp.now()
    })
  });

  textElement.value = "";
}

// ------------------ DELETE / EDIT ------------------
async function deleteProject(id) {
  if (!confirm("¿Eliminar?")) return;
  await db.collection("projects").doc(id).delete();
  showNotification('✅ Proyecto eliminado correctamente', 'success');
}

async function editProject(id) {
  const doc = await db.collection("projects").doc(id).get();
  const p = doc.data();

  const t = prompt("Nuevo título", p.title);
  const s = prompt("Nueva asignatura", p.subject);
  const d = prompt("Nueva descripción", p.description);

  if (t && s && d) {
    await db.collection("projects").doc(id).update({
      title: t,
      subject: s,
      description: d
    });
    showNotification('✅ Proyecto actualizado correctamente', 'success');
  }
}

// ------------------ NAVIGATION ------------------
function goBackToProjects() {
  // Limpiar suscripción de vista detallada
  if (teacherViewState.unsubscribeDetail) {
    teacherViewState.unsubscribeDetail();
    teacherViewState.unsubscribeDetail = null;
  }
  
  if (document.getElementById("teacherView").style.display !== "none") {
    // Recargar la lista de proyectos del profesor
    loadMyProjects();
    loadMyPieRequests();
    loadMyCollaborativeProjects();
  } else if (document.getElementById("directorView").style.display !== "none") {
    // Volver a la vista de selección de usuario
    document.getElementById("selectedUserTitle").textContent = "Seleccione un trabajador";
    document.getElementById("selectedUserFiles").innerHTML = "Aquí aparecerán los archivos del trabajador seleccionado.";
  }
}

// ------------------ SISTEMA DE COMENTARIOS DIRECTOR → PROFESOR ------------------

// Función para cargar proyectos colaborativos del DIRECTOR con opción de comentar
function loadCollaborativeProjectsForDirector() {
    const el = document.getElementById("collaborativeProjectsDirector");
    
    // Limpiar suscripción anterior
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
                        <div class="collaborative-project-objective">
                            <strong>Objetivo:</strong> ${escapeHtml(project.objective)}
                        </div>
                        ${project.strategies && project.strategies.length > 0 ? `
                            <div class="collaborative-project-strategies">
                                <strong>Estrategias:</strong>
                                ${project.strategies.map(strategy => `<span class="strategy-tag">${escapeHtml(strategy)}</span>`).join('')}
                            </div>
                        ` : ''}
                        
                        <!-- SECCIÓN DE COMENTARIOS DEL DIRECTOR -->
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
                                    
                                    <!-- Formulario para nuevo comentario (solo visible para director) -->
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

                // Cargar comentarios después de crear el elemento
                setTimeout(() => loadDirectorComments(project.id), 100);
            });
            
            // Mostrar notificación para nuevos proyectos
            if (hasNewItems && currentUser.role === 'director') {
                showRealtimeNotification('Nuevo proyecto colaborativo creado', 'warning', 'creó');
            }
        }, error => {
            console.error("Error en tiempo real de proyectos colaborativos (director):", error);
        });
}

// Función para cargar comentarios del director
function loadDirectorComments(projectId) {
  const commentsBox = document.getElementById(`directorComments-${projectId}`);
  if (!commentsBox) return;

  db.collection("collaborativeProjects").doc(projectId).onSnapshot(doc => {
    const project = doc.data();
    const comments = project.directorComments || [];

    // Actualizar contador
    const commentCount = document.getElementById(`commentCount-${projectId}`);
    if (commentCount) {
      commentCount.textContent = comments.length;
    }

    if (!comments.length) {
      commentsBox.innerHTML = `
        <div class="text-center text-muted py-3">
          <i class="fas fa-comments fa-2x mb-2"></i>
          <p>No hay comentarios aún.<br>Se el primero en comentar este proyecto.</p>
        </div>
      `;
      return;
    }

    commentsBox.innerHTML = comments.sort((a, b) => b.date.seconds - a.date.seconds)
      .map(comment => `
        <div class="director-comment-item">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <strong class="comment-author">${escapeHtml(comment.authorName)}</strong>
              <small class="text-muted ms-2">(Director)</small>
            </div>
            <small class="comment-date">${new Date(comment.date.seconds * 1000).toLocaleString('es-CL')}</small>
          </div>
          <div class="comment-text bg-light p-3 rounded">${escapeHtml(comment.text)}</div>
          ${comment.author === currentUser.uid ? `
            <div class="text-end mt-2">
              <button class="btn btn-sm btn-outline-danger" onclick="deleteDirectorComment('${projectId}', '${comment.date.seconds}')">
                <i class="fas fa-trash"></i> Eliminar
              </button>
            </div>
          ` : ''}
        </div>
      `).join("");
  });
}

async function addDirectorComment(projectId) {
  if (currentUser.role !== 'director') {
    alert('Solo el director puede agregar comentarios en los proyectos colaborativos.');
    return;
  }

  const textElement = document.getElementById(`newDirectorComment-${projectId}`);
  if (!textElement) return;
  
  const text = textElement.value.trim();
  
  if (!text) {
    alert("Por favor, escribe un comentario antes de enviar.");
    return;
  }

  try {
    const comment = {
      author: currentUser.uid,
      authorName: currentUser.name,
      text: text,
      date: firebase.firestore.Timestamp.now(),
      role: 'director'
    };

    await db.collection("collaborativeProjects").doc(projectId).update({
      directorComments: firebase.firestore.FieldValue.arrayUnion(comment)
    });

    textElement.value = "";
    showNotification('✅ Comentario agregado correctamente', 'success');
    
  } catch (err) {
    console.error(err);
    showNotification('❌ Error al agregar comentario: ' + err.message, 'error');
  }
}

async function deleteDirectorComment(projectId, commentTimestamp) {
  if (!confirm("¿Estás seguro de que quieres eliminar este comentario?")) return;

  try {
    const doc = await db.collection("collaborativeProjects").doc(projectId).get();
    const project = doc.data();
    const comments = project.directorComments || [];
    
    const commentToDelete = comments.find(comment => 
      comment.date.seconds.toString() === commentTimestamp
    );

    if (!commentToDelete) {
      alert("Comentario no encontrado.");
      return;
    }

    if (commentToDelete.author !== currentUser.uid) {
      alert("Solo puedes eliminar tus propios comentarios.");
      return;
    }

    await db.collection("collaborativeProjects").doc(projectId).update({
      directorComments: firebase.firestore.FieldValue.arrayRemove(commentToDelete)
    });

    showNotification('✅ Comentario eliminado correctamente', 'success');
    
  } catch (err) {
    console.error(err);
    showNotification('❌ Error al eliminar comentario: ' + err.message, 'error');
  }
}


// ------------------ UTILITY FUNCTIONS ------------------
function getUrgencyBadgeClass(urgencyLevel) {
  switch(urgencyLevel) {
    case 'Alta':
      return 'bg-danger';
    case 'Media':
      return 'bg-warning';
    case 'Baja':
      return 'bg-success';
    default:
      return 'bg-secondary';
  }
}

function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/[&<>"'`=\/]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' }[c])
  );
}

// Función auxiliar para notificaciones
function showNotification(message, type = 'info') {
  const alertClass = type === 'success' ? 'alert-success' : 
                    type === 'error' ? 'alert-danger' : 'alert-info';
  const icon = type === 'success' ? 'fa-check-circle' : 
              type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
  
  const notification = document.createElement('div');
  notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
  notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
  notification.innerHTML = `
    <i class="fas ${icon} me-2"></i>${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remover después de 4 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 4000);
}

// Función auxiliar para formatear fechas
function formatFirebaseTimestamp(timestamp) {
    if (!timestamp || !timestamp.seconds) return "Fecha no disponible";
    return new Date(timestamp.seconds * 1000).toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
