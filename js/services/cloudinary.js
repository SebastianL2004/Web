// ------------------ CLOUDINARY UPLOAD SERVICE ------------------
import { db } from '../config/firebase.js';
import { currentUser } from '../config/constants.js';
import { showNotification } from './notifications.js';

const CLOUD_NAME = "dqnzla4mx";

export async function uploadFileToCloudinary(file, folder) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "recursos_pie");
    formData.append("folder", folder);
    formData.append("resource_type", "auto");

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
        method: "POST",
        body: formData
    });

    const data = await res.json();
    if (!data.secure_url) throw new Error("Error subiendo archivo");
    
    return {
        url: data.secure_url,
        name: file.name
    };
}

export async function handleContentUpload(e) {
    e.preventDefault();

    // Verificación mejorada
    let safeUser = currentUser;
    if (!safeUser || !safeUser.uid) {
        const authUser = auth.currentUser;
        if (authUser) {
            try {
                const userDoc = await db.collection('users').doc(authUser.uid).get();
                if (userDoc.exists) {
                    safeUser = { uid: authUser.uid, ...userDoc.data() };
                }
            } catch (error) {
                console.error("Error obteniendo usuario:", error);
            }
        }
    }

    if (!safeUser || !safeUser.uid) {
        showNotification('❌ Error: Tu sesión ha expirado. Por favor, recarga la página.', 'error');
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

    try {
        const fileData = await uploadFileToCloudinary(file, currentUser.uid);

        await db.collection("projects").add({
            title,
            subject,
            description,
            filename: file.name,
            uploadedBy: currentUser.uid,
            uploadedByName: currentUser.name,
            fileURL: fileData.url,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            comments: []
        });

        document.getElementById("uploadContentForm").reset();
        bootstrap.Modal.getInstance(document.getElementById("uploadContentModal")).hide();
        
        showNotification('✅ Archivo subido correctamente', 'success');

    } catch (err) {
        console.error(err);
        showNotification('❌ Error al subir archivo: ' + err.message, 'error');
    }
}