// auth/auth.js
import { auth, db } from '../config/firebase.js';
import { setCurrentUser } from '../config/constants.js';
import { showTeacherView, showDirectorView, showAssistantView, hideAllViews } from '../views/view-manager.js';
import { cleanupRealtimeSubscriptions } from '../services/realtime.js';

let loginModal, registerModal;
let authInitialized = false;

// Inicializar modales
export function initModals() {
    loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
    return { loginModal, registerModal };
}

// Funciones de autenticación
export async function loginUser(email, password) {
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        console.log("✅ Login exitoso:", result.user.email);

        return {
            success: true,
            user: result.user
        };

    } catch (error) {
        console.error("❌ Error en login:", error);

        return {
            success: false,
            error: error.code || error.message
        };
    }
}

export async function registerUser(userData) {
    try {
        const cred = await auth.createUserWithEmailAndPassword(userData.email, userData.password);

        await db.collection('users').doc(cred.user.uid).set({
            name: userData.name,
            email: userData.email,
            role: userData.role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log("✅ Registro exitoso:", userData.email);

        return {
            success: true,
            user: cred.user
        };

    } catch (error) {
        console.error("❌ Error en registro:", error);

        if (auth.currentUser) {
            try {
                await auth.currentUser.delete();
            } catch (deleteError) {
                console.error("Error eliminando usuario:", deleteError);
            }
        }

        return {
            success: false,
            error: error.code || error.message
        };
    }
}

// Función para actualizar la interfaz de usuario
function updateUserInterface(userInfo) {
    console.log("🎨 Actualizando interfaz para:", userInfo ? userInfo.name : "Usuario no autenticado");

    const usernameElement = document.getElementById('username');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userInfo) {
        // Usuario autenticado
        if (usernameElement) {
            usernameElement.textContent = `Bienvenido, ${userInfo.name}`;
            usernameElement.style.display = 'inline';
        }

        if (logoutBtn) {
            logoutBtn.style.display = 'inline-block';
        }

        // Ocultar modal de login si está abierto
        if (loginModal) {
            loginModal.hide();
            cleanupModals();
        }

        // Mostrar contenido principal
        document.getElementById("mainContent").style.display = "block";

    } else {
        // Usuario no autenticado
        if (usernameElement) {
            usernameElement.textContent = 'No autenticado';
            usernameElement.style.display = 'inline';
        }

        if (logoutBtn) {
            logoutBtn.style.display = 'none';
        }

        // Ocultar contenido principal
        document.getElementById("mainContent").style.display = "none";
    }
}

// Función para limpiar modales
function cleanupModals() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
        backdrop.remove();
    });

    document.body.classList.remove('modal-open');
    document.body.style.overflow = 'auto';
    document.body.style.paddingRight = '0';

    // Cerrar todos los modales abiertos
    const modals = document.querySelectorAll('.modal.show');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });

    // También remover la clase 'show' de los modales
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(modal => {
        modal.classList.remove('show');
    });
}

export async function onAuthStateChanged(user) {
    console.log("🔐 Estado de autenticación cambiado:", user ? "Usuario conectado" : "Usuario desconectado");

    // Marcar que la autenticación se inicializó
    authInitialized = true;

    if (user) {
        try {
            console.log("🔍 Verificando usuario en Firestore...");
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                console.error("❌ Perfil no encontrado en Firestore");
                await auth.signOut();
                return;
            }

            const userData = userDoc.data();
            const userInfo = {
                uid: user.uid,
                ...userData
            };

            // Actualizar currentUser en constants
            setCurrentUser(userInfo);

            console.log("✅ Usuario autenticado:", userInfo.name, "- Rol:", userInfo.role);

            // 🔥 NUEVO: Marcar como online en tiempo real
            const { setPresenceOnline } = await import('./session.js');
            setPresenceOnline(user.uid);

            // Actualizar la interfaz de usuario
            updateUserInterface(userInfo);

            // Asignar vista según rol
            if (userInfo.role === 'director') {
                showDirectorView();
            } else if (userInfo.role === 'asistente') {
                showAssistantView();
            } else {
                showTeacherView();
            }

        } catch (error) {
            console.error("❌ Error en autenticación:", error);
            await auth.signOut();
        }
    } else {
        // Usuario no autenticado
        setCurrentUser(null);

        console.log("👤 Usuario desconectado");

        // Actualizar interfaz para usuario no autenticado
        updateUserInterface(null);

        // Limpiar suscripciones
        cleanupRealtimeSubscriptions();
        hideAllViews();

        // Mostrar login después de un tiempo si no hay sesión
        setTimeout(() => {
            if (!auth.currentUser && loginModal) {
                console.log("🚪 Mostrando modal de login...");
                loginModal.show();
            }
        }, 1000);
    }
}

export function logout() {
    console.log("👋 Iniciando proceso de cierre de sesión...");

    // Limpiar suscripciones primero
    cleanupRealtimeSubscriptions();

    // Limpiar presencia en Realtime Database
    if (typeof firebase !== 'undefined' && firebase.database) {
        const rdb = firebase.database();
        const user = getCurrentUser();
        if (user && user.uid) {
            rdb.ref('presence/' + user.uid).set(false).catch((error) => {
                console.error("Error actualizando presencia:", error);
            });
        }
    }

    // Cerrar sesión en Firebase Auth
    return auth.signOut()
        .then(() => {
            console.log("✅ Sesión cerrada exitosamente en Firebase Auth");

            // Limpiar interfaz inmediatamente
            updateUserInterface(null);
            hideAllViews();

            // Mostrar login después de un breve delay
            setTimeout(() => {
                const loginModalElement = document.getElementById('loginModal');
                if (loginModalElement) {
                    const loginModal = new bootstrap.Modal(loginModalElement);
                    loginModal.show();
                }
            }, 1000);

        })
        .catch((error) => {
            console.error("❌ Error al cerrar sesión:", error);

            // Forzar limpieza incluso si hay error
            updateUserInterface(null);
            hideAllViews();

            throw error; // Re-lanzar el error para manejarlo en el caller
        });
}

// Función para verificar autenticación antes de operaciones
export async function checkAuth() {
    let user = getCurrentUser();

    if (user && user.uid) {
        return user;
    }

    // Si currentUser no está disponible, verificar auth directamente
    const authUser = auth.currentUser;
    if (authUser) {
        try {
            const userDoc = await db.collection('users').doc(authUser.uid).get();
            if (userDoc.exists) {
                user = { uid: authUser.uid, ...userDoc.data() };
                setCurrentUser(user);

                // Actualizar interfaz también aquí por si acaso
                updateUserInterface(user);

                return user;
            }
        } catch (error) {
            console.error("Error verificando autenticación:", error);
        }
    }

    // Si no hay usuario autenticado
    console.error("❌ No hay usuario autenticado");
    throw new Error("Tu sesión ha expirado. Por favor, recarga la página.");
}

// Función para verificar si hay sesión activa al cargar la página
export function checkExistingSession() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe(); // Dejar de escuchar después de la primera verificación
            resolve(user);
        });

        // Timeout por si la verificación tarda demasiado
        setTimeout(() => {
            unsubscribe();
            resolve(null);
        }, 3000);
    });
}

// Función auxiliar para obtener currentUser
function getCurrentUser() {
    if (typeof window.getCurrentUser === 'function') {
        return window.getCurrentUser();
    }
    return null;
}

// Exportar función de limpieza de modales para uso global
window.cleanupModals = cleanupModals;
window.logout = logout;