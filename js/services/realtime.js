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
}