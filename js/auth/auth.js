// ------------------ AUTH MANAGEMENT ------------------
import { auth, db } from '../config/firebase.js';
import { setCurrentUser } from '../config/constants.js';
import { cleanupRealtimeSubscriptions } from '../services/realtime.js';
import { deleteAllUserData, checkUserHasData } from '../services/firestore.js';

// 🔥 AGREGAR ESTOS IMPORTS
import {
    showAdminView,
    showDirectorView,
    showAssistantView,
    showTeacherView,
    hideAllViews
} from '../views/view-manager.js';

let loginModal, registerModal;
let authInitialized = false;

// Inicializar modales
export function initModals() {
    loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
    return { loginModal, registerModal };
}

// 🔥 NUEVA FUNCIÓN: Verificar si email existe
export async function checkEmailExists(email) {
    try {
        // Intentar crear usuario temporalmente (solo para verificar)
        // Esto lanzará error si el email ya existe
        const tempAuth = firebase.auth();
        const result = await tempAuth.createUserWithEmailAndPassword(email, 'TempPassword123!');
        
        // Si llegamos aquí, el email NO existe, así que eliminamos el usuario temporal
        await result.user.delete();
        
        return {
            exists: false
        };
        
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            return {
                exists: true
            };
        }
        return {
            exists: false,
            error: error.code
        };
    }
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
        console.log("📝 Intentando registro con:", userData.email);

        // 🔥 VERIFICAR SI EL EMAIL YA EXISTE ANTES DE CREAR
        const emailCheck = await checkEmailExists(userData.email);
        if (emailCheck.exists) {
            throw new Error('auth/email-already-in-use');
        }

        const cred = await auth.createUserWithEmailAndPassword(userData.email, userData.password);

        await db.collection('users').doc(cred.user.uid).set({
            name: userData.name,
            email: userData.email,
            role: userData.role || 'profesor',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            registeredBy: getCurrentUser()?.uid || 'self'
        });

        console.log("✅ Registro exitoso:", userData.email, "- Rol:", userData.role || 'profesor');

        return {
            success: true,
            user: cred.user
        };

    } catch (error) {
        console.error("❌ Error en registro:", error);

        return {
            success: false,
            error: error.code || error.message
        };
    }
}

// 🔥 FUNCIÓN: Eliminar usuario completamente
export async function deleteUserCompletely(userId, email) {
    try {
        console.log("🗑️ Eliminando usuario completamente:", email, "UID:", userId);
        
        // 1. Verificar si el usuario tiene datos asociados
        const dataCheck = await checkUserHasData(userId);
        if (dataCheck.hasData) {
            console.log("📋 Usuario tiene datos asociados que se eliminarán");
        }
        
        // 2. Eliminar todos los datos de Firestore
        const firestoreResult = await deleteAllUserData(userId);
        if (!firestoreResult.success) {
            throw new Error(firestoreResult.error);
        }
        
        // 3. Registrar en deleted_users para tracking
        await db.collection('deleted_users').doc(userId).set({
            email: email,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            deletedBy: getCurrentUser()?.uid || 'admin',
            hadAssociatedData: dataCheck.hasData
        });
        
        console.log("✅ Usuario eliminado completamente del sistema");
        
        return {
            success: true,
            message: "Usuario y todos sus datos eliminados correctamente",
            hadAssociatedData: dataCheck.hasData
        };
        
    } catch (error) {
        console.error("❌ Error eliminando usuario completamente:", error);
        return {
            success: false,
            error: error.message
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
    
    authInitialized = true;
    
    if (user) {
        try {
            console.log("🔍 Verificando usuario en Firestore... UID:", user.uid);
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
            
            setCurrentUser(userInfo);
            
            console.log("✅ Usuario autenticado:", userInfo.name, "- Rol:", userInfo.role);
            
            // Marcar como online
            const { setPresenceOnline } = await import('./session.js');
            setPresenceOnline(user.uid);
            
            updateUserInterface(userInfo);
            showViewByRole(userInfo.role);
            
        } catch (error) {
            console.error("❌ Error en autenticación:", error);
            await auth.signOut();
        }
    } else {
        // 🔥 USUARIO NO AUTENTICADO - MOSTRAR LOGIN
        setCurrentUser(null);
        
        console.log("👤 Usuario desconectado - Mostrando login");
        
        // Actualizar interfaz para usuario no autenticado
        updateUserInterface(null);
        
        // Limpiar suscripciones
        cleanupRealtimeSubscriptions();
        hideAllViews();
        
        // Mostrar login
        setTimeout(() => {
            if (!auth.currentUser && loginModal) {
                console.log("🚪 Mostrando modal de login...");
                loginModal.show();
            }
        }, 500);
    }
}

// 🔥 FUNCIÓN: Mostrar vista según rol
function showViewByRole(role) {
    console.log("🎯 Mostrando vista para rol:", role);

    if (role === 'admin') {
        showAdminView();
    } else if (role === 'director') {
        showDirectorView();
    } else if (role === 'asistente') {
        showAssistantView();
    } else {
        showTeacherView();
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

            throw error;
        });
}

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

export function checkExistingSession() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });

        setTimeout(() => {
            unsubscribe();
            resolve(null);
        }, 3000);
    });
}

function getCurrentUser() {
    if (typeof window.getCurrentUser === 'function') {
        return window.getCurrentUser();
    }
    return null;
}

// Exportar función de limpieza de modales para uso global
window.cleanupModals = cleanupModals;
window.logout = logout;