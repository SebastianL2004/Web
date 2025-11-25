// ------------------ ADMIN VIEW FUNCTIONS ------------------
import { db, auth } from '../config/firebase.js';
import { currentUser, realtimeSubscriptions } from '../config/constants.js';
import { escapeHtml } from '../utils/security.js';
import { showRealtimeNotification } from '../services/notifications.js';
import { registerUser, deleteUserCompletely } from '../auth/auth.js';


let selectedRole = null;

// Inicializar vista de administración
export function initAdminView() {
    console.log("🛠️ Inicializando vista de administración");

    setupRoleSelectors();
    setupAdminForm();
    loadExistingUsers();
    addNuclearButton();
}

// Configurar selectores de rol
function setupRoleSelectors() {
    const roleSelectors = document.querySelectorAll('.role-selector');

    roleSelectors.forEach(selector => {
        selector.addEventListener('click', function () {
            // Remover clase active de todos los botones
            roleSelectors.forEach(btn => btn.classList.remove('active'));

            // Agregar clase active al botón seleccionado
            this.classList.add('active');

            // Obtener el rol seleccionado
            selectedRole = this.getAttribute('data-role');

            // Actualizar la interfaz
            updateRoleSelectionUI(selectedRole);
        });
    });
}

// Actualizar interfaz cuando se selecciona un rol
function updateRoleSelectionUI(role) {
    const roleIndicator = document.getElementById('roleIndicator');
    const selectedRoleText = document.getElementById('selectedRoleText');
    const assignedRole = document.getElementById('assignedRole');
    const submitBtn = document.getElementById('submitAdminBtn');

    // Mostrar indicador de rol
    roleIndicator.style.display = 'block';

    // Actualizar textos según el rol
    let roleName = '';
    let alertClass = '';

    switch (role) {
        case 'director':
            roleName = 'Director';
            alertClass = 'alert-primary';
            break;
        case 'profesor':
            roleName = 'Docente';
            alertClass = 'alert-info';
            break;
        case 'asistente':
            roleName = 'Asistente PIE';
            alertClass = 'alert-warning';
            break;
    }

    roleIndicator.className = `alert ${alertClass}`;
    selectedRoleText.textContent = `Creando usuario como: ${roleName}`;
    assignedRole.value = roleName;

    // Habilitar botón de envío
    submitBtn.disabled = false;

    // Generar correo automáticamente si hay nombre
    generateEmailFromName();
}

// Configurar formulario de administración
function setupAdminForm() {
    const form = document.getElementById('adminRegisterForm');
    const nameInput = document.getElementById('adminUserName');
    const emailInput = document.getElementById('emailPrefix');

    // Generar email cuando se escribe el nombre
    nameInput.addEventListener('input', generateEmailFromName);
    
    // 🔥 PERMITIR EDICIÓN MANUAL DEL EMAIL
    if (emailInput) {
        emailInput.readOnly = false;
        emailInput.placeholder = "nombre.apellido o personalizado";
    }

    // Manejar envío del formulario
    form.addEventListener('submit', handleAdminRegistration);
}

// Generar email a partir del nombre - VERSIÓN MEJORADA
function generateEmailFromName() {
    const nameInput = document.getElementById('adminUserName');
    const emailPrefix = document.getElementById('emailPrefix');
    
    if (!nameInput || !emailPrefix) {
        console.error("❌ Elementos del formulario no encontrados");
        return;
    }
    
    if (nameInput.value.trim()) {
        const fullName = nameInput.value.trim().toLowerCase();
        const nameParts = fullName.split(' ').filter(part => part.length > 1);
        
        console.log("📝 Partes del nombre:", nameParts);
        
        let email = '';
        
        if (nameParts.length >= 2) {
            // Primera letra del primer nombre + punto + apellido (c.perez)
            const firstName = nameParts[0];
            const lastName = nameParts[nameParts.length - 1];
            email = firstName.charAt(0) + '.' + lastName;

             // 🔥 AGREGAR TIMESTAMP PARA HACERLO ÚNICO
            const timestamp = Date.now().toString().slice(-4);
            email = firstName.charAt(0) + '.' + lastName + timestamp;
            
        } else if (nameParts.length === 1) {
            // Si solo hay un nombre, usarlo completo
            email = nameParts[0];
        }
        
        if (email) {
            // Limpiar y formatear el email
            email = email
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9.]/g, "")
                .substring(0, 30);
            
            emailPrefix.value = email;
            console.log("📧 Email generado:", email);
        }
        
    } else {
        emailPrefix.value = '';
    }
}

// Generar contraseña automática - VERSIÓN CORREGIDA
window.generatePassword = function() {
    console.log("🔑 Función generatePassword ejecutándose...");
    
    const passwordInput = document.getElementById('adminPassword');
    if (!passwordInput) {
        console.error("❌ No se encontró el campo de contraseña");
        showRealtimeNotification('Error: Campo de contraseña no encontrado', 'danger');
        return;
    }
    
    // Palabras relacionadas al colegio
    const schoolWords = [
        'Arica', 'Colegio', 'Estudio', 'Alumno', 'Profesor', 'Clase', 
        'Libro', 'Escuela', 'Aprender', 'Enseñar', 'Educar', 'Saber',
        'Conocimiento', 'Estudiante', 'Maestro', 'Aula', 'Pizarra'
    ];
    
    const schoolNumbers = ['2024', '2025', '123', '456', '789', '100', '500'];
    
    // Seleccionar palabra y número aleatorios
    const randomWord = schoolWords[Math.floor(Math.random() * schoolWords.length)];
    const randomNumber = schoolNumbers[Math.floor(Math.random() * schoolNumbers.length)];
    
    // Crear contraseña (palabra + número)
    const password = randomWord + randomNumber;
    
    passwordInput.value = password;
    passwordInput.type = 'text'; // Mostrar la contraseña
    
    console.log("✅ Contraseña generada:", password);
    
    // Mostrar notificación
    showRealtimeNotification(`Contraseña generada: ${password}`, 'success');
};

// Manejar registro desde administración
async function handleAdminRegistration(e) {
    e.preventDefault();

    if (!selectedRole) {
        showRealtimeNotification('Por favor selecciona un rol primero', 'warning');
        return;
    }

    const name = document.getElementById('adminUserName').value.trim();
    const emailPrefix = document.getElementById('emailPrefix').value.trim();
    const password = document.getElementById('adminPassword').value;

    if (!name) {
        showRealtimeNotification('Por favor ingresa el nombre completo', 'warning');
        return;
    }

    if (!emailPrefix) {
        showRealtimeNotification('El nombre no es válido para generar email', 'warning');
        return;
    }

    if (!password) {
        showRealtimeNotification('Por favor genera una contraseña', 'warning');
        const passwordInput = document.getElementById('adminPassword');
        if (passwordInput) {
            passwordInput.focus();
            passwordInput.style.borderColor = '#dc3545';
        }
        return;
    }

    const email = `${emailPrefix}@carica.cl`;

    try {
        // Mostrar loading
        const submitBtn = document.getElementById('submitAdminBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Creando...';
        submitBtn.disabled = true;

        // 🔥 USAR registerUser DE auth.js EN LUGAR DE CREAR DIRECTAMENTE
        const result = await registerUser({
            name: name,
            email: email,
            password: password,
            role: selectedRole
        });

        if (result.success) {
            // Mostrar éxito
            showRealtimeNotification(`Usuario ${name} creado exitosamente como ${selectedRole}`, 'success');

            // Resetear formulario
            resetAdminForm();

            // Recargar lista de usuarios
            loadExistingUsers();
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('❌ Error creando usuario:', error);

        let errorMessage = 'Error creando usuario';
        if (error.message === 'auth/email-already-in-use') {
            errorMessage = 'El correo electrónico ya está en uso por otro usuario';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'La contraseña es muy débil';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'El correo electrónico no es válido';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Error de conexión. Verifica tu internet';
        }

        showRealtimeNotification(errorMessage, 'danger');
    } finally {
        // Restaurar botón
        const submitBtn = document.getElementById('submitAdminBtn');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save me-2"></i> Crear Usuario';
            submitBtn.disabled = false;
        }
    }
}

// Resetear formulario
function resetAdminForm() {
    const form = document.getElementById('adminRegisterForm');
    const roleIndicator = document.getElementById('roleIndicator');
    const submitBtn = document.getElementById('submitAdminBtn');
    
    if (form) form.reset();
    if (roleIndicator) roleIndicator.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;

    // Remover active de botones de rol
    document.querySelectorAll('.role-selector').forEach(btn => {
        btn.classList.remove('active');
    });

    selectedRole = null;
}

// Cargar usuarios existentes
export function loadExistingUsers() {
    const el = document.getElementById('usersListAdmin');
    
    if (!el) {
        console.error('❌ Elemento usersListAdmin no encontrado');
        return;
    }

    // Cancelar suscripción anterior si existe
    if (realtimeSubscriptions.adminUsers) {
        realtimeSubscriptions.adminUsers();
    }

    realtimeSubscriptions.adminUsers = db.collection('users')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snap => {
            el.innerHTML = '';

            if (snap.empty) {
                el.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users-slash"></i>
                        <p>No hay usuarios registrados</p>
                    </div>
                `;
                return;
            }

            snap.forEach(doc => {
                const user = { id: doc.id, ...doc.data() };
                const createdDate = user.createdAt ?
                    new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'Fecha no disponible';

                el.innerHTML += `
                    <div class="user-item d-flex justify-content-between align-items-center p-3 border-bottom">
                        <div class="user-info">
                            <h6 class="mb-1">${escapeHtml(user.name)}</h6>
                            <small class="text-muted">
                                <strong>Email:</strong> ${escapeHtml(user.email)} | 
                                <strong>Rol:</strong> <span class="badge bg-${getRoleBadgeColor(user.role)}">${escapeHtml(getRoleDisplayName(user.role))}</span> | 
                                <strong>Creado:</strong> ${createdDate}
                            </small>
                        </div>
                        <div class="user-actions">
                            ${user.role !== 'admin' ? `
                                <button class="btn btn-sm btn-outline-danger" onclick="adminDeleteUser('${user.id}', '${escapeHtml(user.name)}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : `
                                <span class="badge bg-dark">Sistema</span>
                            `}
                        </div>
                    </div>
                `;
            });
        }, error => {
            console.error('Error cargando usuarios:', error);
            el.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar usuarios</p>
                </div>
            `;
        });
}

// Helper functions
function getRoleDisplayName(role) {
    const roles = {
        'admin': 'Administrador',
        'director': 'Director',
        'profesor': 'Docente',
        'asistente': 'Asistente PIE'
    };
    return roles[role] || role;
}

function getRoleBadgeColor(role) {
    const colors = {
        'admin': 'dark',
        'director': 'primary',
        'profesor': 'info',
        'asistente': 'warning'
    };
    return colors[role] || 'secondary';
}

// Función para eliminar usuario (renombrada para evitar conflictos)
window.adminDeleteUser = async (userId, userName) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario "${userName}"?\n\nEsta acción NO se puede deshacer.`)) {
        return;
    }

    try {
        // 🔥 USAR deleteUserCompletely EN LUGAR DE SOLO ELIMINAR DE FIRESTORE
        const result = await deleteUserCompletely(userId, userName);
        
        if (result.success) {
            showRealtimeNotification(`Usuario ${userName} eliminado exitosamente`, 'success');
            // La lista se actualizará automáticamente por la suscripción de onSnapshot
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Error eliminando usuario:', error);
        
        let errorMessage = 'Error eliminando usuario';
        if (error.message.includes('permisos')) {
            errorMessage = 'No tienes permisos para eliminar este usuario';
        } else if (error.message.includes('no encontrado')) {
            errorMessage = 'Usuario no encontrado';
        }
        
        showRealtimeNotification(errorMessage, 'danger');
    }
};

// Asegurar que la función esté disponible globalmente
if (typeof window.generatePassword === 'undefined') {
    window.generatePassword = function() {
        console.log("🔑 Función de respaldo ejecutándose...");
        const passwordInput = document.getElementById('adminPassword');
        if (passwordInput) {
            const password = 'Colegio2024';
            passwordInput.value = password;
            passwordInput.type = 'text';
            showRealtimeNotification(`Contraseña generada: ${password}`, 'success');
        }
    };
}

// 🔥 OPCIÓN ESPECÍFICA: Después de la lista de usuarios
async function addNuclearButton() {
    console.log("🔍 EJECUTANDO addNuclearButton()");
    
    // 🔥 OBTENER USUARIO ACTUAL DE FIREBASE AUTH
    let currentUser = null;
    
    try {
        // Método 1: Intentar con la función global
        if (typeof window.getCurrentUser === 'function') {
            currentUser = window.getCurrentUser();
            console.log("✅ Usuario obtenido de window.getCurrentUser:", currentUser);
        }
        
        // Método 2: Si no funciona, usar Firebase Auth directamente
        if (!currentUser) {
            const auth = firebase.auth();
            const authUser = auth.currentUser;
            
            if (authUser) {
                console.log("✅ Usuario de Firebase Auth:", authUser.uid);
                // Obtener datos adicionales de Firestore
                const userDoc = await firebase.firestore().collection('users').doc(authUser.uid).get();
                if (userDoc.exists) {
                    currentUser = {
                        uid: authUser.uid,
                        email: authUser.email,
                        ...userDoc.data()
                    };
                    console.log("✅ Datos completos del usuario:", currentUser);
                } else {
                    console.log("⚠️ Usuario de Auth existe pero no en Firestore");
                }
            }
        }
        
        if (!currentUser) {
            console.error("❌ No se pudo obtener usuario actual de ninguna fuente");
            return;
        }
        
        // 🔥 VERIFICAR SI ES ADMIN
        if (currentUser.role !== 'admin') {
            console.log("❌ Usuario no es administrador. Rol:", currentUser.role);
            return;
        }
        
        console.log("✅ Usuario confirmado como admin:", currentUser.email);

        const adminView = document.getElementById('adminView');
        if (!adminView) {
            console.error("❌ NO se encontró adminView");
            return;
        }

        // Buscar si ya existe el botón nuclear
        if (document.getElementById('nuclearButtonContainer')) {
            console.log("ℹ️ Botón nuclear ya existe");
            return;
        }

        console.log("🎯 Insertando botón nuclear...");

        const nuclearButtonHTML = `
            <div class="row mt-4" id="nuclearButtonContainer">
                <div class="col-12">
                    <div class="card border-danger nuclear-section">
                        <div class="card-header bg-danger text-white">
                            <i class="fas fa-radiation me-2"></i>
                            Zona Peligrosa - Eliminación Total
                        </div>
                        <div class="card-body">
                            <p class="card-text nuclear-warning-text">
                                <strong>⚠️ ADVERTENCIA CRÍTICA:</strong> Esta acción eliminará <strong>TODOS</strong> los datos del sistema.
                            </p>
                            
                            <ul class="nuclear-warning-list">
                                <li>Todos los usuarios (excepto administrador actual)</li>
                                <li>Todos los proyectos y archivos</li>
                                <li>Todas las solicitudes PIE</li>
                                <li>Todos los proyectos colaborativos</li>
                                <li>Todos los comentarios y registros</li>
                            </ul>
                            
                            <p class="card-text text-muted mb-3">
                                <small>
                                    <strong>🚨 ESTA ACCIÓN ES IRREVERSIBLE:</strong> 
                                    Una vez ejecutada, no podrás recuperar los datos eliminados. 
                                </small>
                            </p>
                            
                            <button 
                                class="btn btn-nuclear w-100 py-3"
                                onclick="showNuclearConfirmation()"
                                id="nuclearButton"
                            >
                                <i class="fas fa-bomb me-2"></i>
                                ELIMINAR TODOS LOS DATOS DE LA BASE DE DATOS
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        adminView.insertAdjacentHTML('beforeend', nuclearButtonHTML);
        console.log("✅ Botón nuclear insertado para admin:", currentUser.email);

    } catch (error) {
        console.error("❌ Error en addNuclearButton:", error);
    }
}
// 🔥 FUNCIÓN PARA MOSTRAR CONFIRMACIÓN
window.showNuclearConfirmation = function() {
    const confirmationHTML = `
        <div class="modal fade" id="nuclearModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-radiation me-2"></i>
                            Confirmación de Eliminación Total
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-danger">
                            <h6>🚨 ACCIÓN IRREVERSIBLE</h6>
                            <p class="mb-2">Estás a punto de eliminar <strong>TODOS</strong> los datos del sistema:</p>
                            <ul>
                                <li>✅ Todos los usuarios (excepto admin)</li>
                                <li>✅ Todos los proyectos</li>
                                <li>✅ Todas las solicitudes PIE</li>
                                <li>✅ Todos los proyectos colaborativos</li>
                                <li>✅ Todos los comentarios</li>
                            </ul>
                            <p class="mb-0"><strong>Esta acción NO se puede deshacer.</strong></p>
                        </div>
                        <div class="mb-3">
                            <label for="confirmationText" class="form-label">
                                Escribe <strong>"ELIMINAR TODO"</strong> para confirmar:
                            </label>
                            <input type="text" class="form-control" id="confirmationText" 
                                   placeholder="ELIMINAR TODO">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Cancelar
                        </button>
                        <button type="button" class="btn btn-danger" id="confirmNuclearButton" disabled>
                            <i class="fas fa-bomb me-2"></i>Eliminar Todo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Agregar modal al DOM si no existe
    if (!document.getElementById('nuclearModal')) {
        document.body.insertAdjacentHTML('beforeend', confirmationHTML);
    }

    // Mostrar modal
    const nuclearModal = new bootstrap.Modal(document.getElementById('nuclearModal'));
    nuclearModal.show();

    // Configurar validación de texto
    const confirmationInput = document.getElementById('confirmationText');
    const confirmButton = document.getElementById('confirmNuclearButton');

    confirmationInput.addEventListener('input', function() {
        confirmButton.disabled = this.value !== 'ELIMINAR TODO';
    });

    // Configurar acción del botón confirmar
    confirmButton.onclick = async function() {
        await executeNuclearOption();
        nuclearModal.hide();
    };
};

// 🔥 EJECUTAR ELIMINACIÓN TOTAL
async function executeNuclearOption() {
    // 🔥 VERIFICACIÓN SIMPLIFICADA
    const auth = firebase.auth();
    const authUser = auth.currentUser;
    
    if (!authUser) {
        showRealtimeNotification('❌ No hay usuario autenticado', 'danger');
        return;
    }

    const submitBtn = document.getElementById('confirmNuclearButton');
    const originalText = submitBtn.innerHTML;
    
    try {
        // Mostrar loading
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Eliminando...';
        submitBtn.disabled = true;

        // Importar y ejecutar la función nuclear
        const { nuclearDeleteAllData } = await import('../services/firestore.js');
        const result = await nuclearDeleteAllData();

        if (result.success) {
            showRealtimeNotification('✅ Todos los datos han sido eliminados correctamente', 'success');
            
            // Recargar la lista de usuarios
            setTimeout(() => {
                loadExistingUsers();
            }, 2000);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('❌ Error en eliminación total:', error);
        showRealtimeNotification('❌ Error eliminando datos: ' + error.message, 'danger');
    } finally {
        // Restaurar botón
        submitBtn.innerHTML = '<i class="fas fa-bomb me-2"></i>Eliminar Todo';
        submitBtn.disabled = false;
    }
}

// 🔥 FUNCIÓN NUCLEAR - ELIMINAR TODOS LOS DATOS
export async function nuclearDeleteAllData() {
    try {
        console.log("💥 Iniciando eliminación nuclear de todos los datos...");
        
        // Obtener usuario actual
        let currentUser;
        if (typeof window.getCurrentUser === 'function') {
            currentUser = window.getCurrentUser();
        }
        
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

async function deleteAllUsersExceptCurrent(currentUserId) {
    try {
        const usersSnapshot = await db.collection('users').get();
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
