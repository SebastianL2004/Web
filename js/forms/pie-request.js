// ------------------ PIE REQUEST FORM HANDLING ------------------
import { db } from '../config/firebase.js';
import { currentUser } from '../config/constants.js';
import { showNotification } from '../services/notifications.js';

export function setupPieRequestForm() {
    document.getElementById('schedulePieForm').addEventListener('submit', handlePieScheduleRequest);
    
    // 🔥 CONFIGURAR EL SELECT MÚLTIPLE PARA DÍAS ALTERNATIVOS
    setupPreferredDaysSelect();
}

// 🔥 NUEVA FUNCIÓN: Configurar el select múltiple para días alternativos
function setupPreferredDaysSelect() {
    const preferredDaysSelect = document.getElementById("preferredDays");
    if (!preferredDaysSelect) return;
    
    // Configurar como múltiple
    preferredDaysSelect.multiple = true;
    preferredDaysSelect.size = 6; // Mostrar 6 opciones visible
    
    // Agregar evento para limitar selección a máximo 2 días
    preferredDaysSelect.addEventListener('change', function() {
        const selectedOptions = Array.from(this.selectedOptions);
        
        // Si se seleccionan más de 2, remover los últimos
        if (selectedOptions.length > 2) {
            // Mantener solo los primeros 2 seleccionados
            for (let i = 2; i < selectedOptions.length; i++) {
                selectedOptions[i].selected = false;
            }
            
            showNotification('⚠️ Solo puedes seleccionar máximo 2 días alternativos', 'warning');
        }
        
        // Actualizar contador visual
        updateDaysCounter(selectedOptions.length);
    });
    
    // Agregar contador visual
    addDaysCounter();
}

// 🔥 NUEVA FUNCIÓN: Agregar contador visual de días seleccionados
function addDaysCounter() {
    const preferredDaysContainer = document.getElementById("preferredDays").parentElement;
    const existingCounter = preferredDaysContainer.querySelector('.days-counter');
    
    if (existingCounter) {
        existingCounter.remove();
    }
    
    const counter = document.createElement('div');
    counter.className = 'days-counter small text-muted mt-1';
    counter.innerHTML = 'Días seleccionados: <span class="counter">0</span>/2';
    preferredDaysContainer.appendChild(counter);
}

// 🔥 NUEVA FUNCIÓN: Actualizar contador de días
function updateDaysCounter(selectedCount) {
    const counter = document.querySelector('.days-counter .counter');
    if (counter) {
        counter.textContent = selectedCount;
        
        // Cambiar color según la cantidad
        if (selectedCount === 2) {
            counter.className = 'counter text-success fw-bold';
        } else if (selectedCount === 1) {
            counter.className = 'counter text-warning';
        } else {
            counter.className = 'counter text-muted';
        }
    }
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
    
    // 🔥 CAMBIO: Obtener días seleccionados del select múltiple
    const preferredDays = Array.from(document.getElementById("preferredDays").selectedOptions)
        .map(option => option.value)
        .filter(day => day !== ""); // Filtrar días vacíos
    
    const caseDescription = document.getElementById("caseDescription").value.trim();
    const attentionType = document.getElementById("attentionType").value;
    const urgencyLevel = document.getElementById("urgencyLevel").value;

    if (!studentName || !studentGrade || !parentName || !parentPhone || !parentEmail || 
        !subjectRequest || !preferredDate || !preferredTime || !caseDescription) {
        alert("Por favor, completa todos los campos obligatorios (marcados con *).");
        return;
    }

    // 🔥 VALIDACIÓN OPCIONAL: Verificar si se seleccionaron días alternativos
    if (preferredDays.length === 0) {
        const proceed = confirm("No has seleccionado días alternativos. ¿Deseas continuar sin días alternativos?");
        if (!proceed) {
            return;
        }
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
        
        // 🔥 RESETEAR CONTADOR
        updateDaysCounter(0);
        
        bootstrap.Modal.getInstance(document.getElementById("schedulePieModal")).hide();
        
        showNotification('✅ Solicitud enviada correctamente. Será revisada por el equipo PIE.', 'success');

    } catch (err) {
        console.error(err);
        showNotification('❌ Error al enviar la solicitud: ' + err.message, 'error');
    }
}