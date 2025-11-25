// ------------------ SESSION MANAGEMENT ------------------
import { rdb } from '../config/firebase.js';
import { currentUser } from '../config/constants.js';

// Marcar usuario como online - USANDO API LEGACY
export function setPresenceOnline(uid) {
    console.log("🟢 SESSION: Marcando como online - UID:", uid);
    
    const userRef = rdb.ref(`presence/${uid}`);
    const connectedRef = rdb.ref(".info/connected");

    // Detectar si está conectado al servidor de RTDB
    connectedRef.on("value", (snap) => {
        console.log("📡 Estado conexión RTDB:", snap.val());
        
        if (snap.val() === false) {
            console.log("❌ No conectado a RTDB");
            return;
        }

        // Si está conectado → marcar online
        console.log("✅ Conectado a RTDB, marcando como online...");
        userRef.set(true)
            .then(() => {
                console.log("🎉 ÉXITO: Usuario marcado como online en RTDB");
            })
            .catch((error) => {
                console.error("❌ ERROR marcando online:", error);
            });

        // Cuando se desconecte → set(false)
        userRef.onDisconnect().set(false)
            .then(() => {
                console.log("📝 Desconexión automática configurada");
            })
            .catch((error) => {
                console.error("❌ ERROR configurando desconexión:", error);
            });
    });
}

// Escuchar cambios en la presencia de todos los usuarios - API LEGACY
export function listenToPresenceChanges(callback) {
    const presenceRef = rdb.ref('presence');
    
    return presenceRef.on("value", (snapshot) => {
        const presenceData = snapshot.val() || {};
        console.log("👥 Cambios en presencia:", presenceData);
        
        if (callback) {
            callback(presenceData);
        }
    });
}

// Marcar usuario como offline manualmente
export function cleanupPresence() {
    if (!currentUser) return;

    const userRef = rdb.ref(`presence/${currentUser.uid}`);
    userRef.set(false).catch(() => {});
}