// ------------------ DIRECTOR COMMENTS SYSTEM ------------------
import { db } from '../config/firebase.js';
import { currentUser } from '../config/constants.js';
import { escapeHtml } from '../utils/security.js';
import { showNotification } from '../services/notifications.js';

// Usar firebase global que ya está cargado desde tu HTML
const firebaseApp = window.firebase;

export function loadDirectorComments(projectId) {
    const commentsBox = document.getElementById(`directorComments-${projectId}`);
    if (!commentsBox) return;

    db.collection("collaborativeProjects").doc(projectId).onSnapshot(doc => {
        const project = doc.data();
        const comments = project?.directorComments || [];

        const commentCount = document.getElementById(`commentCount-${projectId}`);
        if (commentCount) {
            commentCount.textContent = comments.length;
        }

        if (!comments.length) {
            commentsBox.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="fas fa-comments fa-2x mb-2"></i>
                    <p>No hay comentarios aún.<br>Sé el primero en comentar este proyecto.</p>
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
                            <button class="btn btn-sm btn-outline-danger" onclick="window.deleteDirectorComment('${projectId}', '${comment.date.seconds}')">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    ` : ''}
                </div>
            `).join("");
    });
}

export async function addDirectorComment(projectId) {
    console.log("Intentando agregar comentario...");

    if (currentUser.role !== 'director') {
        alert('Solo el director puede agregar comentarios en los proyectos colaborativos.');
        return;
    }

    // 🔥 CAMBIAR: Buscar el ID correcto que está en tu director.js
    const textElement = document.getElementById(`directorComment-${projectId}`);
    if (!textElement) {
        console.error("No se encontró el input del comentario con ID:", `directorComment-${projectId}`);
        return;
    }
    
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
            date: firebaseApp.firestore.Timestamp.now(),
            role: 'director'
        };

        await db.collection("collaborativeProjects").doc(projectId).update({
            directorComments: firebaseApp.firestore.FieldValue.arrayUnion(comment)
        });

        textElement.value = "";
        showNotification('✅ Comentario agregado correctamente', 'success');
        
    } catch (err) {
        console.error(err);
        showNotification('❌ Error al agregar comentario: ' + err.message, 'error');
    }
}

export async function deleteDirectorComment(projectId, commentTimestamp) {
    if (!confirm("¿Estás seguro de que quieres eliminar este comentario?")) return;

    try {
        const doc = await db.collection("collaborativeProjects").doc(projectId).get();
        const project = doc.data();
        const comments = project.directorComments || [];
        
        const commentToDelete = comments.find(comment => 
            comment.date.seconds.toString() === commentTimestamp.toString()
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
            directorComments: firebaseApp.firestore.FieldValue.arrayRemove(commentToDelete)
        });

        showNotification('✅ Comentario eliminado correctamente', 'success');
        
    } catch (err) {
        console.error(err);
        showNotification('❌ Error al eliminar comentario: ' + err.message, 'error');
    }
}

// Exponer funciones globalmente
window.addDirectorComment = addDirectorComment;
window.deleteDirectorComment = deleteDirectorComment;
