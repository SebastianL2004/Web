// js/forms/login.js - VERSIÓN MEJORADA CON MEJOR MANEJO DE ERRORES
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
        
        const email = document.getElementById('loginEmail').value;
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
            const result = await loginUser(email, password);
            
            if (result.success) {
                console.log('✅ Login exitoso');
                showAlert('¡Bienvenido!', 'success');
                
                // El cierre del modal se maneja automáticamente en onAuthStateChanged
            } else {
                console.error('❌ Error en login:', result.error);
                
                // Manejar errores específicos de Firebase
                if (result.error === 'auth/invalid-credential' || result.error === 'auth/wrong-password') {
                    showAlert('Email o contraseña incorrectos. Verifica tus credenciales.', 'error');
                } else if (result.error === 'auth/user-not-found') {
                    showAlert('No existe una cuenta con este email.', 'error');
                } else if (result.error === 'auth/too-many-requests') {
                    showAlert('Demasiados intentos fallidos. Intenta más tarde.', 'error');
                } else if (result.error === 'auth/invalid-email') {
                    showAlert('El formato del email no es válido.', 'error');
                } else if (result.error === 'auth/user-disabled') {
                    showAlert('Esta cuenta ha sido deshabilitada.', 'error');
                } else {
                    showAlert('Error al iniciar sesión: ' + result.error, 'error');
                }
            }
        } catch (error) {
            console.error('❌ Error inesperado:', error);
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
            name: document.getElementById('regName').value,
            email: document.getElementById('regEmail').value,
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
                
                // Manejar errores específicos de Firebase
                if (result.error === 'auth/email-already-in-use') {
                    showAlert('Este email ya está registrado. Usa otro email o inicia sesión.', 'error');
                } else if (result.error === 'auth/weak-password') {
                    showAlert('La contraseña es muy débil. Usa al menos 6 caracteres.', 'error');
                } else if (result.error === 'auth/invalid-email') {
                    showAlert('El formato del email no es válido.', 'error');
                } else if (result.error === 'auth/operation-not-allowed') {
                    showAlert('El registro con email/contraseña no está habilitado.', 'error');
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

    console.log('✅ Formulario de registro configurado');
};

// Función para mostrar alertas
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