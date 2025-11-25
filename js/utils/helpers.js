// ------------------ UTILITY FUNCTIONS ------------------
export function getUrgencyBadgeClass(urgencyLevel) {
    switch(urgencyLevel) {
        case 'Alta':
            return 'bg-danger';
        case 'Media':
            return 'bg-warning';
        case 'Baja':
            return 'bg-success';
        default:
            return 'bg-secondary';
    }
}

export function formatFirebaseTimestamp(timestamp) {
    if (!timestamp || !timestamp.seconds) return "Fecha no disponible";
    return new Date(timestamp.seconds * 1000).toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}