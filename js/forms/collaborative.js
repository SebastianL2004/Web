// ------------------ COLLABORATIVE PROJECT FORM HANDLING ------------------
import { db, auth } from '../config/firebase.js';
import { showNotification } from '../services/notifications.js';
import { escapeHtml } from '../utils/security.js';

// Variables locales
let currentUser = null;
let selectedStrategies = [];
let isSubmitting = false; // Bandera para prevenir envíos duplicados

// Función para obtener usuario de forma segura
async function getSafeUser() {
    // Primero intentar con currentUser local
    if (currentUser && currentUser.uid) {
        return currentUser;
    }
    
    // Luego intentar con checkAuth global
    if (typeof window.checkAuth === 'function') {
        return await window.checkAuth().catch(() => null);
    }
    
    // Finalmente intentar con auth directamente
    const authUser = auth.currentUser;
    if (authUser) {
        return { uid: authUser.uid, name: authUser.displayName || 'Usuario' };
    }
    
    return null;
}

export function setupCollaborativeProjectForm() {
    console.log("🔧 Configurando formulario colaborativo");
    
    const form = document.getElementById('collaborativeProjectForm');
    const modal = document.getElementById('collaborativeProjectModal');
    
    if (!form || !modal) {
        console.error("❌ No se encontró el formulario o modal colaborativo");
        return;
    }
    
    // Remover event listeners anteriores para evitar duplicados
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Agregar nuevo event listener
    newForm.addEventListener('submit', handleCollaborativeProject);
    
    // Configurar evento del modal
    modal.addEventListener('show.bs.modal', function () {
        console.log("📋 Modal de proyecto colaborativo abierto");
        isSubmitting = false; // Resetear bandera al abrir modal
        initializeCollaborativeProjectForm();
    });
    
    // Configurar evento de cierre del modal
    modal.addEventListener('hide.bs.modal', function () {
        console.log("📋 Modal de proyecto colaborativo cerrado");
        isSubmitting = false; // Resetear bandera al cerrar modal
    });
    
    console.log("✅ Formulario colaborativo configurado correctamente");
}

export function setCurrentUser(user) {
    currentUser = user;
    console.log("👤 currentUser actualizado en módulo collaborative:", user ? user.name : 'null');
}

export function setSelectedStrategies(strategies) {
    selectedStrategies = strategies;
}

// 🔥 HACER ESTA FUNCIÓN DISPONIBLE GLOBALMENTE
export function initializeCollaborativeProjectForm() {
    console.log("🚀 Inicializando formulario colaborativo DESDE collaborative.js");
    loadTeachersForCollaborativeProject();
    setupDateValidation();
    updateSelectedStrategiesList();
    
    // Resetear estado del formulario
    const submitBtn = document.querySelector('#collaborativeProjectForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Crear Proyecto Colaborativo';
    }
}

async function loadTeachersForCollaborativeProject() {
    const teacherSelect = document.getElementById("projectTeacher");
    if (!teacherSelect) {
        console.error("❌ Elemento projectTeacher no encontrado");
        return;
    }
    
    teacherSelect.innerHTML = '<option value="">Cargando docentes...</option>';
    
    try {
        // Obtener usuario seguro
        const safeUser = await getSafeUser();
        
        // 🔥 CAMBIO: Obtener tanto profesores como asistentes PIE
        const [teachersSnap, assistantsSnap] = await Promise.all([
            db.collection("users").where("role", "==", "profesor").get(),
            db.collection("users").where("role", "==", "asistente").get()
        ]);
        
        teacherSelect.innerHTML = '<option value="">Selecciona un colaborador</option>';
        
        let collaboratorsLoaded = 0;
        
        // 🔥 AGREGAR ASISTENTES PIE A LA LISTA
        if (!assistantsSnap.empty) {
            assistantsSnap.forEach(doc => {
                const assistant = doc.data();
                // No mostrar al usuario actual en la lista si está disponible
                if (!safeUser || doc.id !== safeUser.uid) {
                    const option = document.createElement("option");
                    option.value = assistant.name;
                    option.textContent = `${assistant.name} (Asistente PIE)`;
                    teacherSelect.appendChild(option);
                    collaboratorsLoaded++;
                }
            });
        }
        
        // 🔥 AGREGAR PROFESORES A LA LISTA
        if (!teachersSnap.empty) {
            teachersSnap.forEach(doc => {
                const teacher = doc.data();
                // No mostrar al usuario actual en la lista si está disponible
                if (!safeUser || doc.id !== safeUser.uid) {
                    const option = document.createElement("option");
                    option.value = teacher.name;
                    option.textContent = `${teacher.name} (Profesor)`;
                    teacherSelect.appendChild(option);
                    collaboratorsLoaded++;
                }
            });
        }
        
        console.log(`✅ ${collaboratorsLoaded} colaboradores cargados (profesores + asistentes PIE)`);
        
        if (collaboratorsLoaded === 0) {
            teacherSelect.innerHTML = '<option value="">No hay colaboradores disponibles</option>';
        }
    } catch (error) {
        console.error("❌ Error cargando colaboradores:", error);
        teacherSelect.innerHTML = '<option value="">Error al cargar colaboradores</option>';
    }
}

function setupDateValidation() {
    const dateInput = document.getElementById("projectStartDate");
    if (!dateInput) return;
    
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    
    dateInput.addEventListener('change', function() {
        const selectedDate = new Date(this.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            this.classList.add('is-invalid');
            const dateError = document.getElementById('dateError');
            if (dateError) dateError.style.display = 'block';
        } else {
            this.classList.remove('is-invalid');
            const dateError = document.getElementById('dateError');
            if (dateError) dateError.style.display = 'none';
        }
    });
}

export function addSelectedStrategy() {
    const strategySelect = document.getElementById("strategySelect");
    if (!strategySelect) return;
    
    const selectedStrategy = strategySelect.value;
    
    if (selectedStrategy && !selectedStrategies.includes(selectedStrategy)) {
        selectedStrategies.push(selectedStrategy);
        updateSelectedStrategiesList();
        strategySelect.value = "";
    }
}

export function addCustomStrategy() {
    const newStrategyInput = document.getElementById("newStrategyInput");
    if (!newStrategyInput) return;
    
    const customStrategy = newStrategyInput.value.trim();
    
    if (customStrategy && !selectedStrategies.includes(customStrategy)) {
        selectedStrategies.push(customStrategy);
        updateSelectedStrategiesList();
        newStrategyInput.value = "";
    }
}

export function removeStrategy(index) {
    if (index >= 0 && index < selectedStrategies.length) {
        selectedStrategies.splice(index, 1);
        updateSelectedStrategiesList();
    }
}

export function updateSelectedStrategiesList() {
    const strategiesList = document.getElementById("selectedStrategiesList");
    if (!strategiesList) return;
    
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
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.collaborativeModule.removeStrategy(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        strategiesList.appendChild(strategyElement);
    });
}

async function handleCollaborativeProject(e) {
    // 🔥 PREVENIR COMPORTAMIENTO POR DEFECTO CRÍTICO
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    console.log("🚀 Iniciando creación de proyecto colaborativo");
    
    // OBTENER REFERENCIA AL MODAL AL INICIO
    const modalElement = document.getElementById('collaborativeProjectModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    
    // Prevenir envíos duplicados
    if (isSubmitting) {
        console.log("⚠️ Envío duplicado prevenido");
        return;
    }
    
    isSubmitting = true;
    
    // Deshabilitar botón de envío
    const submitBtn = document.querySelector('#collaborativeProjectForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando Proyecto...';
    }

    try {
        // Verificación de autenticación usando checkAuth global
        let safeUser;
        if (typeof window.checkAuth === 'function') {
            safeUser = await window.checkAuth();
        } else {
            safeUser = await getSafeUser();
        }

        if (!safeUser || !safeUser.uid) {
            throw new Error("No hay usuario autenticado");
        }

        console.log("👤 Usuario confirmado:", safeUser.name);

        // Obtener datos del formulario
        const projectName = document.getElementById("projectName").value.trim();
        const projectStartDate = document.getElementById("projectStartDate").value;
        const projectDuration = document.getElementById("projectDuration").value;
        const projectTeacher = document.getElementById("projectTeacher").value.trim();
        const projectSubject = document.getElementById("projectSubject").value;
        const projectObjective = document.getElementById("projectObjective").value.trim();
        const projectFile = document.getElementById("projectFile").files[0];
        const projectFileDescription = document.getElementById("projectFileDescription").value.trim();

        // Validaciones
        if (!projectName || !projectStartDate || !projectDuration || !projectTeacher || !projectSubject || !projectObjective) {
            showNotification('❌ Completa todos los campos obligatorios', 'error');
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Crear Proyecto Colaborativo';
            }
            return; // NO cerrar modal si hay errores
        }

        // Validar fecha
        const selectedDate = new Date(projectStartDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            showNotification('❌ La fecha de inicio debe ser hoy o una fecha futura', 'error');
            document.getElementById("projectStartDate").classList.add('is-invalid');
            const dateError = document.getElementById('dateError');
            if (dateError) dateError.style.display = 'block';
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Crear Proyecto Colaborativo';
            }
            return; // NO cerrar modal si hay errores
        }

        let fileURL = null;
        let fileName = null;

        // Subir archivo si existe
        if (projectFile) {
            console.log("📤 Subiendo archivo...");
            const formData = new FormData();
            formData.append("file", projectFile);
            formData.append("upload_preset", "recursos_pie");
            formData.append("folder", `proyectos/${safeUser.uid}`);
            formData.append("resource_type", "auto");

            const CLOUD_NAME = "dqnzla4mx";
            
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error(`Error ${res.status} en Cloudinary`);
            
            const data = await res.json();
            if (data.secure_url) {
                fileURL = data.secure_url;
                fileName = projectFile.name;
                console.log("✅ Archivo subido correctamente");
            }
        }

        // Crear proyecto en Firestore - ✅ YA TIENES EL TIMESTAMP CORRECTO
        const projectData = {
            name: projectName,
            startDate: projectStartDate,
            duration: parseInt(projectDuration),
            teacher: projectTeacher,
            subject: projectSubject,
            objective: projectObjective,
            strategies: [...selectedStrategies],
            createdBy: safeUser.uid,
            createdByName: safeUser.name,
            status: "pendiente",
            createdAt: firebase.firestore.FieldValue.serverTimestamp() // ✅ CORRECTO
        };

        if (fileURL) {
            projectData.projectFile = {
                url: fileURL,
                name: fileName,
                description: projectFileDescription,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
        }

        console.log("💾 Guardando proyecto en Firestore...");
        await db.collection("collaborativeProjects").add(projectData);
        console.log("✅ Proyecto guardado correctamente");

        // ✅ ÉXITO - Limpiar formulario
        document.getElementById("collaborativeProjectForm").reset();
        selectedStrategies = [];
        updateSelectedStrategiesList();
        
        // Mostrar mensaje de éxito
        const message = fileURL ? 
            "✅ Proyecto colaborativo creado correctamente con archivo adjunto." :
            "✅ Proyecto colaborativo creado correctamente.";
        
        showNotification(message, 'success');
        
        // 🔥 CERRAR MODAL SOLO DESPUÉS DE ÉXITO Y CON RETRASO
        setTimeout(() => {
            if (modalInstance) {
                console.log("🔒 Cerrando modal después de éxito");
                modalInstance.hide();
            }
            
            // Resetear estado del botón
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Crear Proyecto Colaborativo';
            }
        }, 1500);

    } catch (error) {
        console.error("❌ Error al crear proyecto:", error);
        
        // Resetear estado de envío
        isSubmitting = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Crear Proyecto Colaborativo';
        }
        
        if (error.message.includes("autenticado") || error.message.includes("sesión")) {
            showNotification('❌ Error: Tu sesión ha expirado. Por favor, recarga la página.', 'error');
        } else {
            showNotification('❌ Error al crear el proyecto: ' + error.message, 'error');
        }
        
        // 🔥 NO cerrar modal en caso de error
    }
}

// Función auxiliar para obtener usuario actual (para compatibilidad)
function getCurrentUser() {
    return getSafeUser();
}

// 🔥 EXPORTAR PARA USO GLOBAL - INCLUYENDO initializeCollaborativeProjectForm
window.collaborativeModule = {
    addSelectedStrategy,
    addCustomStrategy,
    removeStrategy,
    updateSelectedStrategiesList,
    setCurrentUser,
    getCurrentUser,
    initializeCollaborativeProjectForm, // 🔥 AGREGAR ESTA LÍNEA
    handleCollaborativeProject
};

console.log("✅ Módulo collaborative projects cargado");