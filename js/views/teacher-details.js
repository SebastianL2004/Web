// teacher-details.js
import { db } from '../config/firebase.js';
import { currentUser, teacherViewState } from '../config/constants.js';
import { escapeHtml } from '../utils/security.js'; // CORREGIR: usar escapeHtml, no escapeHtmlSec
import { getUrgencyBadgeClass } from '../utils/helpers.js';

export function showPieRequestDetail(requestId) {
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

export function showCollaborativeProjectDetail(projectId) {
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

// Hacer las funciones disponibles globalmente
window.showPieRequestDetail = showPieRequestDetail;
window.showCollaborativeProjectDetail = showCollaborativeProjectDetail;