// ------------------ REALTIME DATABASE OPERATIONS ------------------
import { rdb } from '../config/firebase.js';
import { realtimeSubscriptions } from '../config/constants.js';
import { showRealtimeNotification } from '../services/notifications.js';

export function initializeRealtimeIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'realtime-indicator';
    indicator.innerHTML = `
        <div class="pulse"></div>
        <span>Conectado en tiempo real</span>
    `;
    document.body.appendChild(indicator);
}

export function setPresenceOnline(uid) {
    const ref = rdb.ref('presence/' + uid);
    rdb.ref('.info/connected').on('value', snap => {
        if (!snap.val()) return;
        ref.set(true);
        ref.onDisconnect().set(false);
    });
}

// 🔥 NUEVA FUNCIÓN: Escuchar cambios en proyectos colaborativos para el director
export function listenForCollaborativeProjectUpdates(callback) {
    if (realtimeSubscriptions.collaborativeProjectUpdates) {
        realtimeSubscriptions.collaborativeProjectUpdates();
    }

    realtimeSubscriptions.collaborativeProjectUpdates = rdb.ref('collaborativeProjects')
        .on('value', (snapshot) => {
            if (snapshot.exists()) {
                const projects = snapshot.val();
                console.log("🔥 Realtime: Cambio detectado en proyectos colaborativos");
                
                if (callback && typeof callback === 'function') {
                    callback(projects);
                }
            }
        }, (error) => {
            console.error("❌ Error en realtime projects:", error);
        });
}

// 🔥 NUEVA FUNCIÓN: Notificar cuando un proyecto se completa
export function notifyProjectCompletion(projectId, projectName) {
    const completionRef = rdb.ref(`projectCompletions/${projectId}`);
    completionRef.set({
        projectId: projectId,
        projectName: projectName,
        completedAt: new Date().toISOString(),
        completedBy: 'assistant',
        notified: false
    });
    
    // Limpiar después de 10 segundos
    setTimeout(() => {
        completionRef.remove();
    }, 10000);
}

// 🔥 NUEVA FUNCIÓN: Escuchar notificaciones de completado
export function listenForProjectCompletions(callback) {
    if (realtimeSubscriptions.projectCompletions) {
        realtimeSubscriptions.projectCompletions();
    }

    realtimeSubscriptions.projectCompletions = rdb.ref('projectCompletions')
        .on('child_added', (snapshot) => {
            const completion = snapshot.val();
            console.log("🎉 Realtime: Proyecto completado detectado:", completion);
            
            if (callback && typeof callback === 'function') {
                callback(completion);
            }
        });
}

export function cleanupRealtimeSubscriptions() {
    Object.values(realtimeSubscriptions).forEach(unsubscribe => {
        if (unsubscribe && typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    
    realtimeSubscriptions.projects = null;
    realtimeSubscriptions.pieRequests = null;
    realtimeSubscriptions.collaborativeProjects = null;
    realtimeSubscriptions.onlineTeachers = null;
    realtimeSubscriptions.collaborativeProjectUpdates = null;
    realtimeSubscriptions.projectCompletions = null;
}