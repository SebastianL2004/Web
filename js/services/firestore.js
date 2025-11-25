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

export async function deleteAllUserData(userId) {
    try {
        console.log("🗑️ Eliminando todos los datos del usuario:", userId);
        
        // 1. Eliminar el documento principal del usuario
        await db.collection('users').doc(userId).delete();
        console.log("✅ Documento de usuario eliminado");
        
        // 2. Eliminar proyectos creados por el usuario (si existen)
        await deleteUserProjects(userId);
        
        // 3. Eliminar comentarios del usuario en proyectos (si existen)
        await deleteUserComments(userId);
        
        // 4. Eliminar solicitudes PIE del usuario (si existen)
        await deleteUserPieRequests(userId);
        
        // 5. Eliminar proyectos colaborativos del usuario (si existen)
        await deleteUserCollaborativeProjects(userId);
        
        console.log("✅ Todos los datos del usuario eliminados de Firestore");
        
        return {
            success: true,
            message: "Todos los datos del usuario eliminados correctamente"
        };
        
    } catch (error) {
        console.error("❌ Error eliminando datos del usuario:", error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Elimina proyectos creados por el usuario
 */
async function deleteUserProjects(userId) {
    try {
        const projectsSnapshot = await db.collection('projects')
            .where('createdBy', '==', userId)
            .get();
            
        const deletePromises = [];
        projectsSnapshot.forEach(doc => {
            deletePromises.push(doc.ref.delete());
        });
        
        await Promise.all(deletePromises);
        
        if (projectsSnapshot.size > 0) {
            console.log(`✅ ${projectsSnapshot.size} proyectos eliminados`);
        }
        
    } catch (error) {
        console.error("Error eliminando proyectos del usuario:", error);
        // No lanzamos error para continuar con otras eliminaciones
    }
}

/**
 * Elimina comentarios del usuario en todos los proyectos
 */
async function deleteUserComments(userId) {
    try {
        const projectsSnapshot = await db.collection('projects').get();
        
        const updatePromises = [];
        projectsSnapshot.forEach(doc => {
            const project = doc.data();
            if (project.comments && Array.isArray(project.comments)) {
                const filteredComments = project.comments.filter(comment => 
                    comment.author !== userId
                );
                
                if (filteredComments.length !== project.comments.length) {
                    updatePromises.push(
                        doc.ref.update({ comments: filteredComments })
                    );
                }
            }
        });
        
        await Promise.all(updatePromises);
        
        if (updatePromises.length > 0) {
            console.log(`✅ Comentarios del usuario eliminados de ${updatePromises.length} proyectos`);
        }
        
    } catch (error) {
        console.error("Error eliminando comentarios del usuario:", error);
    }
}

/**
 * Elimina solicitudes PIE del usuario
 */
async function deleteUserPieRequests(userId) {
    try {
        const requestsSnapshot = await db.collection('pieRequests')
            .where('createdBy', '==', userId)
            .get();
            
        const deletePromises = [];
        requestsSnapshot.forEach(doc => {
            deletePromises.push(doc.ref.delete());
        });
        
        await Promise.all(deletePromises);
        
        if (requestsSnapshot.size > 0) {
            console.log(`✅ ${requestsSnapshot.size} solicitudes PIE eliminadas`);
        }
        
    } catch (error) {
        console.error("Error eliminando solicitudes PIE del usuario:", error);
    }
}

/**
 * Elimina proyectos colaborativos del usuario
 */
async function deleteUserCollaborativeProjects(userId) {
    try {
        const projectsSnapshot = await db.collection('collaborativeProjects')
            .where('createdBy', '==', userId)
            .get();
            
        const deletePromises = [];
        projectsSnapshot.forEach(doc => {
            deletePromises.push(doc.ref.delete());
        });
        
        await Promise.all(deletePromises);
        
        if (projectsSnapshot.size > 0) {
            console.log(`✅ ${projectsSnapshot.size} proyectos colaborativos eliminados`);
        }
        
    } catch (error) {
        console.error("Error eliminando proyectos colaborativos del usuario:", error);
    }
}

/**
 * Verifica si un usuario tiene datos asociados antes de eliminar
 */
export async function checkUserHasData(userId) {
    try {
        const checks = [
            // Verificar proyectos
            db.collection('projects').where('createdBy', '==', userId).limit(1).get(),
            // Verificar solicitudes PIE
            db.collection('pieRequests').where('createdBy', '==', userId).limit(1).get(),
            // Verificar proyectos colaborativos
            db.collection('collaborativeProjects').where('createdBy', '==', userId).limit(1).get()
        ];
        
        const results = await Promise.all(checks);
        const hasData = results.some(result => !result.empty);
        
        return {
            hasData,
            message: hasData ? 
                "El usuario tiene datos asociados que también serán eliminados" :
                "El usuario no tiene datos asociados"
        };
        
    } catch (error) {
        console.error("Error verificando datos del usuario:", error);
        return {
            hasData: false,
            error: error.message
        };
    }
}

// 🔥 FUNCIÓN NUCLEAR - ELIMINAR TODOS LOS DATOS
export async function nuclearDeleteAllData() {
    try {
        console.log("💥 Iniciando eliminación nuclear de todos los datos...");
        
        const currentUser = await getCurrentUserInfo();
        if (!currentUser || currentUser.role !== 'admin') {
            throw new Error('Solo los administradores pueden ejecutar esta acción');
        }

        let totalDeleted = 0;

        // 1. Eliminar todos los usuarios (excepto admin actual)
        const usersResult = await deleteAllUsersExceptCurrent(currentUser.uid);
        totalDeleted += usersResult.deleted;

        // 2. Eliminar todos los proyectos
        const projectsResult = await deleteAllProjects();
        totalDeleted += projectsResult.deleted;

        // 3. Eliminar todas las solicitudes PIE
        const pieRequestsResult = await deleteAllPieRequests();
        totalDeleted += pieRequestsResult.deleted;

        // 4. Eliminar todos los proyectos colaborativos
        const collaborativeResult = await deleteAllCollaborativeProjects();
        totalDeleted += collaborativeResult.deleted;

        // 5. Eliminar todos los registros de deleted_users
        const deletedUsersResult = await deleteAllDeletedUsers();
        totalDeleted += deletedUsersResult.deleted;

        // 6. Registrar la acción
        await db.collection('system_logs').doc().set({
            action: 'nuclear_delete',
            executedBy: currentUser.uid,
            executedByName: currentUser.name,
            deletedCount: totalDeleted,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Eliminación nuclear completada. Total eliminado: ${totalDeleted} registros`);
        
        return {
            success: true,
            message: `Se eliminaron ${totalDeleted} registros correctamente`,
            deletedCount: totalDeleted
        };

    } catch (error) {
        console.error('❌ Error en eliminación nuclear:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 🔥 FUNCIONES AUXILIARES PARA ELIMINACIÓN NUCLEAR

// 🔥 CORREGIR: Función para obtener usuario actual
async function getCurrentUserInfo() {
    try {
        console.log("🔍 Buscando usuario actual...");
        
        // Opción 1: Usar la función global si existe
        if (typeof window.getCurrentUser === 'function') {
            const user = window.getCurrentUser();
            console.log("✅ Usuario obtenido de window.getCurrentUser:", user);
            return user;
        }
        
        // Opción 2: Usar Firebase Auth directamente
        const auth = firebase.auth();
        const currentUser = auth.currentUser;
        
        if (currentUser) {
            console.log("✅ Usuario de Firebase Auth:", currentUser.uid);
            
            // Obtener datos adicionales de Firestore
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const userInfo = {
                    uid: currentUser.uid,
                    ...userData
                };
                console.log("✅ Datos de usuario de Firestore:", userInfo);
                return userInfo;
            }
        }
        
        console.error("❌ No se pudo obtener información del usuario");
        return null;
        
    } catch (error) {
        console.error("❌ Error obteniendo usuario actual:", error);
        return null;
    }
}

async function deleteAllUsersExceptCurrent(currentUserId) {
    try {
        const usersSnapshot = await db.collection('users')
            .where('role', '!=', 'admin')
            .get();

        const deletePromises = [];
        usersSnapshot.forEach(doc => {
            if (doc.id !== currentUserId) {
                deletePromises.push(doc.ref.delete());
            }
        });

        await Promise.all(deletePromises);
        console.log(`✅ ${deletePromises.length} usuarios eliminados`);

        return {
            deleted: deletePromises.length
        };

    } catch (error) {
        console.error('Error eliminando usuarios:', error);
        return { deleted: 0 };
    }
}

async function deleteAllProjects() {
    try {
        const projectsSnapshot = await db.collection('projects').get();
        const deletePromises = [];
        
        projectsSnapshot.forEach(doc => {
            deletePromises.push(doc.ref.delete());
        });

        await Promise.all(deletePromises);
        console.log(`✅ ${deletePromises.length} proyectos eliminados`);

        return {
            deleted: deletePromises.length
        };

    } catch (error) {
        console.error('Error eliminando proyectos:', error);
        return { deleted: 0 };
    }
}

async function deleteAllPieRequests() {
    try {
        const requestsSnapshot = await db.collection('pieRequests').get();
        const deletePromises = [];
        
        requestsSnapshot.forEach(doc => {
            deletePromises.push(doc.ref.delete());
        });

        await Promise.all(deletePromises);
        console.log(`✅ ${deletePromises.length} solicitudes PIE eliminadas`);

        return {
            deleted: deletePromises.length
        };

    } catch (error) {
        console.error('Error eliminando solicitudes PIE:', error);
        return { deleted: 0 };
    }
}

async function deleteAllCollaborativeProjects() {
    try {
        const projectsSnapshot = await db.collection('collaborativeProjects').get();
        const deletePromises = [];
        
        projectsSnapshot.forEach(doc => {
            deletePromises.push(doc.ref.delete());
        });

        await Promise.all(deletePromises);
        console.log(`✅ ${deletePromises.length} proyectos colaborativos eliminados`);

        return {
            deleted: deletePromises.length
        };

    } catch (error) {
        console.error('Error eliminando proyectos colaborativos:', error);
        return { deleted: 0 };
    }
}

async function deleteAllDeletedUsers() {
    try {
        const deletedSnapshot = await db.collection('deleted_users').get();
        const deletePromises = [];
        
        deletedSnapshot.forEach(doc => {
            deletePromises.push(doc.ref.delete());
        });

        await Promise.all(deletePromises);
        console.log(`✅ ${deletePromises.length} registros de deleted_users eliminados`);

        return {
            deleted: deletePromises.length
        };

    } catch (error) {
        console.error('Error eliminando deleted_users:', error);
        return { deleted: 0 };
    }
}