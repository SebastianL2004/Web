// js/forms/login.js - VERSIÓN MEJORADA
import { loginUser, registerUser } from '../auth/auth.js';

export const setupLoginForm = () => {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.error('❌ Formulario de login no encontrado');
        return;
    }

    // Remover event listeners anteriores para evitar duplicados
    loginForm.replaceWith(loginForm.cloneNode(true));
    const newLoginForm = document.getElementById('loginForm');

    newLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        // Validación básica
        if (!email || !password) {
            showAlert('Por favor, completa todos los campos', 'error');
            return;
        }

        // Mostrar loading
        const submitBtn = newLoginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        submitBtn.disabled = true;
        
        try {
            console.log("🔄 Iniciando proceso de login...");
            const result = await loginUser(email, password);
            
            if (result.success) {
                console.log('✅ Login exitoso - redirigiendo a vista correspondiente');
                showAlert('¡Bienvenido!', 'success');
                
                // El cierre del modal se maneja automáticamente en onAuthStateChanged
            } else {
                console.error('❌ Error en login:', result.error);
                
                // 🔥 USAR EL MENSAJE MEJORADO DE auth.js
                showAlert(result.errorMessage || 'Error al iniciar sesión', 'error');
                
                // Limpiar contraseña en caso de error
                document.getElementById('loginPassword').value = '';
            }
        } catch (error) {
            console.error('❌ Error inesperado en login:', error);
            showAlert('Error inesperado al iniciar sesión', 'error');
        } finally {
            // Restaurar botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    console.log('✅ Formulario de login configurado');
};

export const setupRegisterForm = () => {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) {
        console.error('❌ Formulario de registro no encontrado');
        return;
    }

    // Remover event listeners anteriores
    registerForm.replaceWith(registerForm.cloneNode(true));
    const newRegisterForm = document.getElementById('registerForm');

    newRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userData = {
            name: document.getElementById('regName').value.trim(),
            email: document.getElementById('regEmail').value.trim(),
            password: document.getElementById('regPassword').value,
            role: document.getElementById('regRole').value
        };

        // Validación
        if (!userData.name || !userData.email || !userData.password || !userData.role) {
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
                showAlert('¡Usuario registrado exitosamente!', 'success');
                
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
                    
                }, 1500);
            } else {
                console.error('❌ Error en registro:', result.error);
                
                // 🔥 USAR EL MENSAJE MEJORADO DE auth.js
                showAlert(result.errorMessage || 'Error al registrar usuario', 'error');
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

    console.log('✅ Formulario de registro configurado');
};

// Función para mostrar alertas (igual que antes)
function showAlert(message, type = 'info') {
    // Remover alertas anteriores
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) {
        existingAlert.remove();
    }

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
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}