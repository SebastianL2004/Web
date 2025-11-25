// ------------------ ADMIN SETUP ------------------
import { auth, db } from './firebase.js';

// Credenciales del administrador por defecto
const ADMIN_CREDENTIALS = {
    email: 'admin@carica.cl',
    password: 'Colegio2024',
    name: 'Administrador Sistema',
    role: 'admin'
};

// Verificar y crear administrador por defecto
export async function setupDefaultAdmin() {
    try {
        console.log("🔧 Verificando administrador por defecto...");
        
        // 🔥 ELIMINAR: No iniciar sesión automáticamente
        // Solo verificar si el administrador existe, pero NO iniciar sesión
        
        // Verificar si el usuario administrador existe en Auth
        try {
            console.log("🔍 Verificando si el administrador existe...");
            
            // Intentar buscar el usuario sin iniciar sesión
            // Esto se hace intentando crear el usuario y manejando el error "email-already-in-use"
            await auth.createUserWithEmailAndPassword(
                ADMIN_CREDENTIALS.email, 
                ADMIN_CREDENTIALS.password
            );
            
            // Si llega aquí, el usuario no existía y se creó
            console.log("✅ Administrador creado en Auth");
            
            // Cerrar sesión inmediatamente después de crear
            await auth.signOut();
            console.log("🔒 Sesión cerrada después de crear administrador");
            
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                console.log("✅ Administrador ya existe en Auth");
            } else {
                console.error("❌ Error verificando administrador:", error);
            }
        }
        
        // 🔥 VERIFICAR Y CREAR EN FIRESTORE SI NO EXISTE
        await ensureAdminInFirestore();
        
        console.log("✅ Setup de administrador completado");
        return true;
        
    } catch (error) {
        console.error("❌ Error en setup de administrador:", error);
        return false;
    }
}

// Asegurar que el administrador exista en Firestore
async function ensureAdminInFirestore() {
    try {
        console.log("📁 Verificando administrador en Firestore...");
        
        // Buscar administrador por email
        const usersSnapshot = await db.collection('users')
            .where('email', '==', ADMIN_CREDENTIALS.email)
            .limit(1)
            .get();
            
        if (usersSnapshot.empty) {
            console.log("⚠️  Administrador no existe en Firestore, creando...");
            
            // Necesitamos el UID del administrador, pero sin iniciar sesión
            // Usamos una función temporal para obtener el UID
            await createAdminInFirestore();
        } else {
            console.log("✅ Administrador ya existe en Firestore");
        }
        
    } catch (error) {
        console.error("❌ Error verificando administrador en Firestore:", error);
    }
}

// Crear administrador en Firestore
async function createAdminInFirestore() {
    try {
        console.log("🔑 Obteniendo UID del administrador...");
        
        // Iniciar sesión temporalmente solo para obtener el UID
        const result = await auth.signInWithEmailAndPassword(
            ADMIN_CREDENTIALS.email,
            ADMIN_CREDENTIALS.password
        );
        
        const user = result.user;
        console.log("📝 Creando documento en Firestore para UID:", user.uid);
        
        await db.collection('users').doc(user.uid).set({
            name: ADMIN_CREDENTIALS.name,
            email: ADMIN_CREDENTIALS.email,
            role: ADMIN_CREDENTIALS.role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: 'system',
            isDefaultAdmin: true
        });
        
        console.log("✅ Documento de administrador creado en Firestore");
        
        // 🔥 IMPORTANTE: Cerrar sesión después de crear
        await auth.signOut();
        console.log("🔒 Sesión cerrada después de crear en Firestore");
        
    } catch (error) {
        console.error("❌ Error creando administrador en Firestore:", error);
        
        // Si hay error, asegurarse de cerrar sesión
        try {
            await auth.signOut();
        } catch (signOutError) {
            console.error("Error cerrando sesión:", signOutError);
        }
        
        throw error;
    }
}

// Función para verificar si el usuario actual es admin
export function isCurrentUserAdmin() {
    return auth.currentUser && auth.currentUser.email === ADMIN_CREDENTIALS.email;
}