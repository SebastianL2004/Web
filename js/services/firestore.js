// ------------------ FIRESTORE OPERATIONS ------------------
import { db } from '../config/firebase.js';
import { currentUser } from '../config/constants.js';
import { escapeHtml } from '../utils/security.js';
import { showNotification } from './notifications.js';

export async function updatePieRequestStatus(requestId, status) {
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

export async function updateProjectStatus(projectId, status) {
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

export async function deletePieRequest(requestId) {
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

export async function deleteCollaborativeProject(projectId) {
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

export async function deleteProject(id) {
    if (!confirm("¿Eliminar?")) return;
    await db.collection("projects").doc(id).delete();
    showNotification('✅ Proyecto eliminado correctamente', 'success');
}

export async function editProject(id) {
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

export async function addComment(id) {
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

export function loadComments(id) {
    db.collection("projects").doc(id).onSnapshot(doc => {
        const comments = doc.data().comments || [];
        const box = document.getElementById(`commentList-${id}`);

        if (!box) return;

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