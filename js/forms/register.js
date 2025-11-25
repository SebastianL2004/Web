// js/forms/register.js - SIN SELECCIÓN DE ROL
import { registerUser } from '../auth/auth.js';

export const setupRegisterForm = () => {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) {
        console.error('❌ Formulario de registro no encontrado');
        return;
    }

    // Remover event listeners anteriores para evitar duplicados
    registerForm.replaceWith(registerForm.cloneNode(true));
    const newRegisterForm = document.getElementById('registerForm');

    // 🔥 ELIMINAR el campo de rol del HTML o hacerlo oculto
    hideRoleField();

    // Generar email automáticamente desde el nombre
    const nameInput = document.getElementById('regName');
    if (nameInput) {
        nameInput.addEventListener('input', generateEmailFromNameRegister);
    }

    newRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userData = {
            name: document.getElementById('regName').value.trim(),
            email: document.getElementById('regEmail').value.trim(),
            password: document.getElementById('regPassword').value,
            role: 'profesor' // 🔥 ASIGNAR ROL POR DEFECTO
        };

        // Validación
        if (!userData.name || !userData.email || !userData.password) {
            showAlert('Por favor, completa todos los campos', 'error');
            return;
        }

        if (userData.password.length < 6) {
            showAlert('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        // Mostrar loading
        const submitBtn = newRegisterForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        submitBtn.disabled = true;
        
        try {
            console.log("🔄 Iniciando proceso de registro...");
            const result = await registerUser(userData);
            
            if (result.success) {
                console.log('✅ Registro exitoso');
                showAlert('¡Usuario registrado exitosamente! Serás asignado como Docente.', 'success');
                
                // Cerrar modal de registro después de un tiempo
                setTimeout(() => {
                    const registerModalElement = document.getElementById('registerModal');
                    if (registerModalElement) {
                        const modalInstance = bootstrap.Modal.getInstance(registerModalElement);
                        if (modalInstance) modalInstance.hide();
                    }
                    
                    // Limpiar formulario
                    newRegisterForm.reset();
                    
                    // Mostrar modal de login
                    setTimeout(() => {
                        const loginModalElement = document.getElementById('loginModal');
                        if (loginModalElement) {
                            const loginModal = new bootstrap.Modal(loginModalElement);
                            loginModal.show();
                        }
                    }, 500);
                    
                }, 2000);
            } else {
                console.error('❌ Error en registro:', result.error);
                
                // Manejar errores específicos
                if (result.error === 'auth/email-already-in-use') {
                    showAlert('Este email ya está registrado. Usa otro email o inicia sesión.', 'error');
                } else if (result.error === 'auth/weak-password') {
                    showAlert('La contraseña es muy débil. Usa al menos 6 caracteres.', 'error');
                } else if (result.error === 'auth/invalid-email') {
                    showAlert('El formato del email no es válido.', 'error');
                } else {
                    showAlert('Error al registrar: ' + result.error, 'error');
                }
            }
        } catch (error) {
            console.error('❌ Error inesperado en registro:', error);
            showAlert('Error inesperado al registrar usuario', 'error');
        } finally {
            // Restaurar botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    console.log('✅ Formulario de registro configurado (sin selección de rol)');
};

// 🔥 FUNCIÓN PARA OCULTAR EL CAMPO DE ROL
function hideRoleField() {
    const roleField = document.getElementById('regRole');
    const roleLabel = document.querySelector('label[for="regRole"]');
    
    if (roleField) {
        roleField.style.display = 'none';
        roleField.value = 'profesor';
    }
    
    if (roleLabel) {
        roleLabel.style.display = 'none';
    }
}

// Generar email a partir del nombre para registro
function generateEmailFromNameRegister() {
    const nameInput = document.getElementById('regName');
    const emailInput = document.getElementById('regEmail');
    
    if (!nameInput || !emailInput) return;
    
    if (nameInput.value.trim()) {
        const fullName = nameInput.value.trim().toLowerCase();
        const nameParts = fullName.split(' ').filter(part => part.length > 1);
        
        let email = '';
        
        if (nameParts.length >= 2) {
            // Primera letra del primer nombre + punto + apellido (c.soto)
            const firstName = nameParts[0];
            const lastName = nameParts[nameParts.length - 1];
            email = firstName.charAt(0) + '.' + lastName;
        } else if (nameParts.length === 1) {
            email = nameParts[0];
        }
        
        if (email) {
            email = email
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9.]/g, "")
                .substring(0, 30);
            
            emailInput.value = email + '@carica.cl';
        }
    }
}

// Función para mostrar alertas
function showAlert(message, type = 'info') {
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) existingAlert.remove();

    const alert = document.createElement('div');
    alert.className = `custom-alert alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} alert-dismissible fade show`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
    `;
    
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) alert.remove();
    }, 5000);
}