// ------------------ UI UTILITY FUNCTIONS ------------------
import { db } from '../config/firebase.js';
import { currentUser, teacherViewState } from '../config/constants.js';
import { getUrgencyBadgeClass } from './helpers.js';
import { escapeHtml } from './security.js';
import { loadMyProjects, loadMyPieRequests, loadMyCollaborativeProjects } from '../views/teacher.js';

export async function viewProject(id) {
    const doc = await db.collection("projects").doc(id).get();
    if (!doc.exists) return;

    const p = doc.data();

    let contentContainer;
    if (document.getElementById("teacherView").style.display !== "none") {
        contentContainer = document.getElementById("projectsList");
    } else if (document.getElementById("directorView").style.display !== "none") {
        contentContainer = document.getElementById("selectedUserFiles");
    } else {
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
                ${getFilePreviewHTML(p)}
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

function getFilePreviewHTML(p) {
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
}

export function goBackToProjects() {
    if (teacherViewState.unsubscribeDetail) {
        teacherViewState.unsubscribeDetail();
        teacherViewState.unsubscribeDetail = null;
    }
    
    if (document.getElementById("teacherView").style.display !== "none") {
        loadMyProjects();
        loadMyPieRequests();
        loadMyCollaborativeProjects();
    } else if (document.getElementById("directorView").style.display !== "none") {
        document.getElementById("selectedUserTitle").textContent = "Seleccione un trabajador";
        document.getElementById("selectedUserFiles").innerHTML = "Aquí aparecerán los archivos del trabajador seleccionado.";
    }
}