// ------------------ SESSION MANAGEMENT ------------------
import { rdb } from '../config/firebase.js';
import { currentUser } from '../config/constants.js';

import {
    ref,
    onDisconnect,
    onValue,
    set
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Marcar usuario como online
export function setPresenceOnline(uid) {
    const userRef = ref(rdb, `presence/${uid}`);
    const connectedRef = ref(rdb, ".info/connected");

    // Detectar si está conectado al servidor de RTDB
    onValue(connectedRef, snap => {
        if (snap.val() === false) return;

        // Si está conectado → marcar online
        set(userRef, true);

        // Cuando se desconecte → set(false)
        onDisconnect(userRef).set(false);
    });
}

// Escuchar cambios en la presencia de todos los usuarios
export function listenToPresenceChanges(callback) {
    const presenceRef = ref(rdb, 'presence');
    
    return onValue(presenceRef, (snapshot) => {
        const presenceData = snapshot.val() || {};
        console.log("👥 Cambios en presencia:", presenceData);
        
        // Filtrar solo los usuarios que están online (true)
        const onlineUsers = Object.keys(presenceData).filter(uid => presenceData[uid] === true);
        
        if (callback) {
            callback(onlineUsers, presenceData);
        }
    });
}

// Obtener información de usuarios conectados
export async function getOnlineUsersInfo(onlineUserIds) {
    // Aquí necesitarás importar Firestore para obtener los datos de los usuarios
    const { db } = await import('../config/firebase.js');
    const usersInfo = [];
    
    for (const uid of onlineUserIds) {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                usersInfo.push({
                    uid: uid,
                    ...userDoc.data()
                });
            }
        } catch (error) {
            console.error("Error obteniendo info del usuario:", uid, error);
        }
    }
    
    return usersInfo;
}

// Marcar usuario como offline manualmente
export function cleanupPresence() {
    if (!currentUser) return;

    const userRef = ref(rdb, `presence/${currentUser.uid}`);
    set(userRef, false).catch(() => {});
}