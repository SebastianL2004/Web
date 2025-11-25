// ------------------ PIE REQUEST FORM HANDLING ------------------
import { db } from '../config/firebase.js';
import { currentUser } from '../config/constants.js';
import { showNotification } from '../services/notifications.js';

export function setupPieRequestForm() {
    document.getElementById('schedulePieForm').addEventListener('submit', handlePieScheduleRequest);
}

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

    if (!studentName || !studentGrade || !parentName || !parentPhone || !parentEmail || 
        !subjectRequest || !preferredDate || !preferredTime || !caseDescription) {
        alert("Por favor, completa todos los campos obligatorios (marcados con *).");
        return;
    }

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
        
        showNotification('✅ Solicitud enviada correctamente. Será revisada por el equipo PIE.', 'success');

    } catch (err) {
        console.error(err);
        showNotification('❌ Error al enviar la solicitud: ' + err.message, 'error');
    }
}