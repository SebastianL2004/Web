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
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById("mainContent").style.display = "none";
  document.getElementById("directorView").style.display = "none";
  document.getElementById("teacherView").style.display = "none";
  document.getElementById("assistantView").style.display = "none";

  loginModal.show();
  setupFormListeners();
  auth.onAuthStateChanged(onAuthStateChanged);
});

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

      alert('Usuario registrado. Inicia sesión.');
      registerModal.hide();
      loginModal.show();
    } catch (err) {
      alert('Error al registrar: ' + err.message);
    }
  });

  document.getElementById('uploadContentForm').addEventListener('submit', handleContentUpload);
  document.getElementById('schedulePieForm').addEventListener('submit', handlePieScheduleRequest);
  document.getElementById('collaborativeProjectForm').addEventListener('submit', handleCollaborativeProject);
}

// ------------------ AUTH ------------------
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

    loginModal.hide();
    setPresenceOnline(user.uid);

    // Asignar vista según rol
    if (currentUser.role === 'director') showDirectorView();
    else if (currentUser.role === 'asistente') showAssistantView();
    else showTeacherView(); // Para profesores y cualquier otro rol

  } else {
    currentUser = null;
    document.getElementById('username').textContent = 'No autenticado';
    document.getElementById('logoutBtn').style.display = 'none';
    loginModal.show();
    hideAllViews();
  }
}

function logout() {
  if (!currentUser) return;
  rdb.ref('presence/' + currentUser.uid).set(false).catch(() => {});
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

// ------------------ DIRECTOR VIEW ------------------
function showDirectorView() {
  hideAllViews();
  document.getElementById("mainContent").style.display = "block";
  document.getElementById("directorView").style.display = "block";
  loadOnlineTeachersForDirector();
  loadPieRequestsForDirector();
  loadCollaborativeProjectsForDirector();
}

function loadOnlineTeachersForDirector() {
  const el = document.getElementById("onlineTeachersDirector");
  el.innerHTML = "<div class='loading'></div>";

  // Obtener solo usuarios profesores
  db.collection("users").where("role", "==", "profesor").onSnapshot(snap => {
    el.innerHTML = "";
    let hasOnlineTeachers = false;
    
    snap.forEach(doc => {
      const u = { uid: doc.id, ...doc.data() };
      rdb.ref("presence/" + u.uid).on("value", p => {
        const online = p.exists() && p.val();
        if (online) {
          hasOnlineTeachers = true;
          el.innerHTML += `
            <div class="teacher-status-item">
              <span class="dot dot-online"></span>
              <div class="teacher-info">
                <span class="teacher-name">${escapeHtml(u.name)}</span>
                <span class="teacher-role">Profesor</span>
              </div>
            </div>`;
        }
        
        // Si no hay profesores online después de procesar todos
        if (!hasOnlineTeachers && el.innerHTML === "") {
          el.innerHTML = "<p>No hay docentes conectados</p>";
        }
      });
    });
    
    // Si no hay profesores en la base de datos
    if (snap.empty) {
      el.innerHTML = "<p>No hay docentes registrados</p>";
    }
  });
}

function loadPieRequestsForDirector() {
  const el = document.getElementById("pieRequestsListDirector");
  
  db.collection("pieRequests")
    .orderBy("createdAt", "desc")
    .onSnapshot(snap => {
      el.innerHTML = "";
      
      if (snap.empty) {
        el.innerHTML = "<p>No hay solicitudes pendientes</p>";
        return;
      }
      
      snap.forEach(doc => {
        const request = { id: doc.id, ...doc.data() };
        const requestDate = request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : "Fecha no disponible";
        const isCompleted = request.status === 'completada';
        
        el.innerHTML += `
          <div class="pie-request-item ${isCompleted ? 'completed' : ''}">
            <div class="pie-request-header">
              <div class="pie-request-student">
                ${escapeHtml(request.studentName)} - ${escapeHtml(request.studentGrade)}
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
    });
}

function loadCollaborativeProjectsForDirector() {
  const el = document.getElementById("collaborativeProjectsDirector");
  
  db.collection("collaborativeProjects")
    .orderBy("createdAt", "desc")
    .onSnapshot(snap => {
      el.innerHTML = "";
      
      if (snap.empty) {
        el.innerHTML = "<p>No hay proyectos colaborativos</p>";
        return;
      }
      
      snap.forEach(doc => {
        const project = { id: doc.id, ...doc.data() };
        const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : "Fecha no disponible";
        const endDate = project.startDate && project.duration ? 
          new Date(new Date(project.startDate).getTime() + project.duration * 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : "No calculada";
        
        el.innerHTML += `
          <div class="collaborative-project-item">
            <div class="collaborative-project-header">
              <div class="collaborative-project-title">
                ${escapeHtml(project.name)}
              </div>
              <span class="badge bg-warning">Proyecto</span>
            </div>
            <div class="collaborative-project-meta">
              <strong>Creado por:</strong> ${escapeHtml(project.createdByName)} | 
              <strong>Curso:</strong> ${escapeHtml(project.grade)} | 
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
          </div>
        `;
      });
    });
}

// ------------------ TEACHER VIEW ------------------
function showTeacherView() {
  hideAllViews();
  document.getElementById("mainContent").style.display = "block";
  document.getElementById("teacherView").style.display = "block";
  loadMyProjects();
  loadMyPieRequests();
}

function hideAllViews() {
  document.getElementById("mainContent").style.display = "none";
  document.getElementById("directorView").style.display = "none";
  document.getElementById("teacherView").style.display = "none";
  document.getElementById("assistantView").style.display = "none";
}

function loadMyProjects() {
  db.collection("projects").where("uploadedBy", "==", currentUser.uid)
    .orderBy("createdAt", "desc")
    .onSnapshot(snap => {
      const el = document.getElementById("projectsList");
      el.innerHTML = "";
      if (snap.empty) {
        el.innerHTML = "<p>No has subido contenido aún</p>";
        return;
      }
      snap.forEach(doc => {
        const p = { id: doc.id, ...doc.data() };
        el.innerHTML += `
          <div class="project-item" onclick="viewProject('${p.id}')">
            <h6>${escapeHtml(p.title)}</h6>
            <small>${escapeHtml(p.subject)}</small>
          </div>`;
      });
    });
}

function loadMyPieRequests() {
  const el = document.getElementById("myPieRequests");
  
  db.collection("pieRequests")
    .where("requestedBy", "==", currentUser.uid)
    .orderBy("createdAt", "desc")
    .onSnapshot(snap => {
      el.innerHTML = "";
      
      if (snap.empty) {
        el.innerHTML = "<p>No has realizado solicitudes de hora con PIE</p>";
        return;
      }
      
      snap.forEach(doc => {
        const request = { id: doc.id, ...doc.data() };
        const requestDate = request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : "Fecha no disponible";
        
        el.innerHTML += `
          <div class="pie-request-item">
            <div class="pie-request-header">
              <div class="pie-request-student">
                ${escapeHtml(request.studentName)} - ${escapeHtml(request.studentGrade)}
              </div>
              <span class="badge badge-${request.status}">${request.status}</span>
            </div>
            <div class="pie-request-meta">
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
              <strong>Días alternativos:</strong> ${request.preferredDays && request.preferredDays.length > 0 ? request.preferredDays.join(', ') : 'No especificados'} | 
              <strong>Fecha solicitud:</strong> ${requestDate}
            </div>
            <div class="pie-request-meta">
              <strong>Estado:</strong> 
              ${request.status === 'pendiente' ? '🟡 Pendiente de revisión' : 
                request.status === 'aprobada' ? '🟢 Aprobada - Esperando confirmación' : 
                request.status === 'rechazada' ? '🔴 Rechazada' : 
                request.status === 'completada' ? '✅ Completada' : '⚪ ' + request.status}
            </div>
          </div>
        `;
      });
    });
}

// ------------------ ASSISTANT VIEW ------------------
function showAssistantView() {
  hideAllViews();
  document.getElementById("mainContent").style.display = "block";
  document.getElementById("assistantView").style.display = "block";
  loadOnlineTeachersForAssistant();
  loadPieRequestsForAssistant();
  loadCollaborativeProjectsForAssistant();
}

function loadOnlineTeachersForAssistant() {
  const el = document.getElementById("onlineTeachersAssistant");
  el.innerHTML = "<div class='loading'></div>";

  // Obtener solo usuarios profesores
  db.collection("users").where("role", "==", "profesor").onSnapshot(snap => {
    el.innerHTML = "";
    let hasOnlineTeachers = false;
    
    snap.forEach(doc => {
      const u = { uid: doc.id, ...doc.data() };
      rdb.ref("presence/" + u.uid).on("value", p => {
        const online = p.exists() && p.val();
        if (online) {
          hasOnlineTeachers = true;
          el.innerHTML += `
            <div class="teacher-status-item">
              <span class="dot dot-online"></span>
              <div class="teacher-info">
                <span class="teacher-name">${escapeHtml(u.name)}</span>
                <span class="teacher-role">Profesor</span>
              </div>
            </div>`;
        }
        
        // Si no hay profesores online después de procesar todos
        if (!hasOnlineTeachers && el.innerHTML === "") {
          el.innerHTML = "<p>No hay docentes conectados</p>";
        }
      });
    });
    
    // Si no hay profesores en la base de datos
    if (snap.empty) {
      el.innerHTML = "<p>No hay docentes registrados</p>";
    }
  });
}

function loadPieRequestsForAssistant() {
  const el = document.getElementById("pieRequestsListAssistant");
  
  db.collection("pieRequests")
    .orderBy("createdAt", "desc")
    .onSnapshot(snap => {
      el.innerHTML = "";
      
      if (snap.empty) {
        el.innerHTML = "<p>No hay solicitudes pendientes</p>";
        return;
      }
      
      snap.forEach(doc => {
        const request = { id: doc.id, ...doc.data() };
        const requestDate = request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : "Fecha no disponible";
        const isCompleted = request.status === 'completada';
        
        el.innerHTML += `
          <div class="pie-request-item ${isCompleted ? 'completed' : ''}">
            <div class="pie-request-header">
              <div class="pie-request-student">
                ${escapeHtml(request.studentName)} - ${escapeHtml(request.studentGrade)}
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
    });
}

function loadCollaborativeProjectsForAssistant() {
  const el = document.getElementById("collaborativeProjectsAssistant");
  
  db.collection("collaborativeProjects")
    .orderBy("createdAt", "desc")
    .onSnapshot(snap => {
      el.innerHTML = "";
      
      if (snap.empty) {
        el.innerHTML = "<p>No hay proyectos colaborativos</p>";
        return;
      }
      
      snap.forEach(doc => {
        const project = { id: doc.id, ...doc.data() };
        const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : "Fecha no disponible";
        const endDate = project.startDate && project.duration ? 
          new Date(new Date(project.startDate).getTime() + project.duration * 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : "No calculada";
        
        el.innerHTML += `
          <div class="collaborative-project-item">
            <div class="collaborative-project-header">
              <div class="collaborative-project-title">
                ${escapeHtml(project.name)}
              </div>
              <span class="badge bg-warning">Proyecto</span>
            </div>
            <div class="collaborative-project-meta">
              <strong>Creado por:</strong> ${escapeHtml(project.createdByName)} | 
              <strong>Curso:</strong> ${escapeHtml(project.grade)} | 
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
          </div>
        `;
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
      fileURL: data.secure_url,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      comments: []
    });

    document.getElementById("uploadContentForm").reset();
    bootstrap.Modal.getInstance(document.getElementById("uploadContentModal")).hide();
    alert("✅ Archivo subido correctamente");

  } catch (err) {
    console.error(err);
    alert("❌ Error al subir archivo: " + err.message);
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
    alert("✅ Solicitud enviada correctamente. Será revisada por el equipo PIE.");

  } catch (err) {
    console.error(err);
    alert("❌ Error al enviar la solicitud: " + err.message);
  }
}

// ------------------ COLLABORATIVE PROJECT ------------------
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
  const projectGrade = document.getElementById("projectGrade").value.trim();
  const projectSubject = document.getElementById("projectSubject").value;
  const projectObjective = document.getElementById("projectObjective").value.trim();

  // Obtener estrategias seleccionadas
  const strategies = [];
  if (document.getElementById("strategyMultipleMeans").checked) {
    strategies.push("Múltiples medios de representación");
  }
  if (document.getElementById("strategyMultipleAction").checked) {
    strategies.push("Múltiples medios de acción y expresión");
  }
  if (document.getElementById("strategyMultipleEngagement").checked) {
    strategies.push("Múltiples medios de compromiso");
  }
  if (document.getElementById("strategyDifferentiation").checked) {
    strategies.push("Diferenciación de contenido");
  }
  if (document.getElementById("strategyScaffolding").checked) {
    strategies.push("Andamiaje educativo");
  }

  // Validación básica
  if (!projectName || !projectStartDate || !projectDuration || !projectGrade || !projectSubject || !projectObjective) {
    alert("Por favor, completa todos los campos obligatorios (marcados con *).");
    return;
  }

  try {
    await db.collection("collaborativeProjects").add({
      name: projectName,
      startDate: projectStartDate,
      duration: parseInt(projectDuration),
      grade: projectGrade,
      subject: projectSubject,
      objective: projectObjective,
      strategies: strategies,
      createdBy: currentUser.uid,
      createdByName: currentUser.name,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById("collaborativeProjectForm").reset();
    bootstrap.Modal.getInstance(document.getElementById("collaborativeProjectModal")).hide();
    alert("✅ Proyecto colaborativo creado correctamente.");

  } catch (err) {
    console.error(err);
    alert("❌ Error al crear el proyecto: " + err.message);
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
    alert(`✅ Solicitud ${status} correctamente`);
  } catch (err) {
    alert("❌ Error al actualizar la solicitud: " + err.message);
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
    alert("✅ Solicitud eliminada correctamente");
  } catch (err) {
    alert("❌ Error al eliminar la solicitud: " + err.message);
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
  alert("Eliminado");
}

async function editProject(id) {
  const doc = await db.collection("projects").doc(id).get();
  const p = doc.data();

  const t = prompt("Nuevo título", p.title);
  const s = prompt("Nueva asignatura", p.subject);
  const d = prompt("Nueva descripción", p.description);

  await db.collection("projects").doc(id).update({
    title: t,
    subject: s,
    description: d
  });

  alert("Actualizado");
}

// ------------------ NAVIGATION ------------------
function goBackToProjects() {
  if (document.getElementById("teacherView").style.display !== "none") {
    // Recargar la lista de proyectos del profesor
    loadMyProjects();
  } else if (document.getElementById("directorView").style.display !== "none") {
    // Volver a la vista de selección de usuario
    document.getElementById("selectedUserTitle").textContent = "Seleccione un trabajador";
    document.getElementById("selectedUserFiles").innerHTML = "Aquí aparecerán los archivos del trabajador seleccionado.";
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

// ------------------ SISTEMA DE COMENTARIOS DIRECTOR → PROFESOR ------------------

// Función para cargar proyectos colaborativos del DIRECTOR con opción de comentar
function loadCollaborativeProjectsForDirector() {
    const el = document.getElementById("collaborativeProjectsDirector");
    
    db.collection("collaborativeProjects")
        .orderBy("createdAt", "desc")
        .onSnapshot(snap => {
            el.innerHTML = "";
            
            if (snap.empty) {
                el.innerHTML = "<p>No hay proyectos colaborativos</p>";
                return;
            }
            
            snap.forEach(doc => {
                const project = { id: doc.id, ...doc.data() };
                const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : "Fecha no disponible";
                const endDate = project.startDate && project.duration ? 
                    new Date(new Date(project.startDate).getTime() + project.duration * 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : "No calculada";
                
                el.innerHTML += `
                    <div class="collaborative-project-item">
                        <div class="collaborative-project-header">
                            <div class="collaborative-project-title">
                                ${escapeHtml(project.name)}
                            </div>
                            <span class="badge bg-warning">Proyecto</span>
                        </div>
                        <div class="collaborative-project-meta">
                            <strong>Creado por:</strong> ${escapeHtml(project.createdByName)} | 
                            <strong>Curso:</strong> ${escapeHtml(project.grade)} | 
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

// Función para que el director agregue un comentario
async function addDirectorComment(projectId) {
    if (currentUser.role !== 'director') {
        alert('Solo el director puede agregar comentarios en los proyectos colaborativos.');
        return;
    }

    const textElement = document.getElementById(`newDirectorComment-${projectId}`);
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
        
        // Mostrar notificación de éxito
        showNotification('✅ Comentario agregado correctamente', 'success');
        
    } catch (err) {
        console.error(err);
        alert("❌ Error al agregar comentario: " + err.message);
    }
}

// Función para eliminar comentario del director
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
        alert("❌ Error al eliminar comentario: " + err.message);
    }
}

// Función para cargar proyectos colaborativos del PROFESOR (con comentarios del director)
function loadMyCollaborativeProjects() {
    const el = document.getElementById("myCollaborativeProjects");
    
    db.collection("collaborativeProjects")
        .where("createdBy", "==", currentUser.uid)
        .orderBy("createdAt", "desc")
        .onSnapshot(snap => {
            el.innerHTML = "";
            
            if (snap.empty) {
                el.innerHTML = "<p>No has creado proyectos colaborativos aún</p>";
                return;
            }
            
            snap.forEach(doc => {
                const project = { id: doc.id, ...doc.data() };
                const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : "Fecha no disponible";
                const endDate = project.startDate && project.duration ? 
                    new Date(new Date(project.startDate).getTime() + project.duration * 7 * 24 * 60 * 60 * 1000).toLocaleDateString() : "No calculada";
                
                // Contar comentarios del director
                const directorCommentsCount = project.directorComments ? project.directorComments.length : 0;
                
                el.innerHTML += `
                    <div class="collaborative-project-item">
                        <div class="collaborative-project-header">
                            <div class="collaborative-project-title">
                                ${escapeHtml(project.name)}
                            </div>
                            <span class="badge bg-warning">Mi Proyecto</span>
                        </div>
                        <div class="collaborative-project-meta">
                            <strong>Curso:</strong> ${escapeHtml(project.grade)} | 
                            <strong>Asignatura:</strong> ${escapeHtml(project.subject)}
                        </div>
                        <div class="collaborative-project-meta">
                            <strong>Inicio:</strong> ${startDate} | 
                            <strong>Duración:</strong> ${project.duration} semanas
                        </div>
                        
                        <!-- COMENTARIOS DEL DIRECTOR (SOLO VISUALIZACIÓN PARA PROFESOR) -->
                        ${directorCommentsCount > 0 ? `
                            <div class="director-feedback-section mt-3">
                                <div class="card border-success">
                                    <div class="card-header bg-success text-white">
                                        <h6 class="mb-0">
                                            <i class="fas fa-comment-check"></i> Comentarios del Director
                                            <span class="badge bg-light text-success ms-2">${directorCommentsCount}</span>
                                        </h6>
                                    </div>
                                    <div class="card-body">
                                        <div id="teacherViewDirectorComments-${project.id}">
                                            <div class="loading"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ` : `
                            <div class="text-center text-muted mt-3">
                                <i class="fas fa-comment-slash"></i>
                                <p>El director aún no ha comentado este proyecto</p>
                            </div>
                        `}
                    </div>
                `;

                // Cargar comentarios del director para vista del profesor
                if (directorCommentsCount > 0) {
                    setTimeout(() => loadTeacherViewDirectorComments(project.id), 100);
                }
            });
        });
}

// Función para cargar comentarios del director en la vista del PROFESOR
function loadTeacherViewDirectorComments(projectId) {
    const commentsBox = document.getElementById(`teacherViewDirectorComments-${projectId}`);
    if (!commentsBox) return;

    db.collection("collaborativeProjects").doc(projectId).onSnapshot(doc => {
        const project = doc.data();
        const comments = project.directorComments || [];

        if (!comments.length) {
            commentsBox.innerHTML = "<p class='text-muted'>No hay comentarios del director.</p>";
            return;
        }

        commentsBox.innerHTML = comments.sort((a, b) => b.date.seconds - a.date.seconds)
            .map(comment => `
                <div class="director-comment-teacher-view">
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
            `).join("");
    });
}

// Función auxiliar para notificaciones
function showNotification(message, type = 'info') {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-info';
    const notification = document.createElement('div');
    notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
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

// Actualizar la función showTeacherView para cargar proyectos colaborativos
function showTeacherView() {
    hideAllViews();
    document.getElementById("mainContent").style.display = "block";
    document.getElementById("teacherView").style.display = "block";
    loadMyProjects();
    loadMyPieRequests();
    loadMyCollaborativeProjects(); // ← AGREGAR ESTA LÍNEA
}