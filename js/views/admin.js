// ------------------ ADMIN VIEW FUNCTIONS ------------------
import { db, auth } from '../config/firebase.js';
import { currentUser, realtimeSubscriptions } from '../config/constants.js';
import { escapeHtml } from '../utils/security.js';
import { showRealtimeNotification } from '../services/notifications.js';

let selectedRole = null;

// Inicializar vista de administración
export function initAdminView() {
    console.log("🛠️ Inicializando vista de administración");

    setupRoleSelectors();
    setupAdminForm();
    loadExistingUsers();
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

    // Generar email cuando se escribe el nombre
    nameInput.addEventListener('input', generateEmailFromName);

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
        
        // Enfocar y resaltar el campo de contraseña
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

        // Crear usuario en Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Crear documento en Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            role: selectedRole,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid,
            createdByName: currentUser.name || 'Administrador'
        });

        // Cerrar sesión del usuario recién creado (volver a ser admin)
        await auth.signOut();
        await auth.signInWithEmailAndPassword(currentUser.email, 'Colegio2024');

        // Mostrar éxito
        showRealtimeNotification(`Usuario ${name} creado exitosamente como ${selectedRole}`, 'success');

        // Resetear formulario
        resetAdminForm();

        // Recargar lista de usuarios
        loadExistingUsers();

    } catch (error) {
        console.error('❌ Error creando usuario:', error);

        let errorMessage = 'Error creando usuario';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'El correo electrónico ya está en uso';
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
    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario "${userName}"?`)) {
        return;
    }

    try {
        // Eliminar de Firestore
        await db.collection('users').doc(userId).delete();
        showRealtimeNotification(`Usuario ${userName} eliminado exitosamente`, 'success');

    } catch (error) {
        console.error('Error eliminando usuario:', error);
        showRealtimeNotification('Error eliminando usuario', 'danger');
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