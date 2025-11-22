// js/forms/register.js - SI LO MANTIENES SEPARADO
import { registerUser } from '../auth/auth.js';
import { registerModal } from '../config/states.js';

export const setupRegisterForm = () => {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userData = {
            name: document.getElementById('regName').value,
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPassword').value,
            role: document.getElementById('regRole').value
        };
        
        const result = await registerUser(userData);
        
        if (result.success) {
            console.log('Registro exitoso');
            if (registerModal) registerModal.hide();
        } else {
            alert('Error en registro: ' + result.error);
        }
    });
};