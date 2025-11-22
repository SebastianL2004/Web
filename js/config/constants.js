// js/config/constants.js - VERSIÓN COMPLETA

// Colecciones de Firestore
export const COLLECTIONS = {
    USERS: 'users',
    PROJECTS: 'projects',
    PIE_REQUESTS: 'pie_requests',
    COLLABORATIVE_PROJECTS: 'collaborative_projects',
    COMMENTS: 'comments',
    ONLINE_USERS: 'online_users'
};

// Roles de usuario
export const ROLES = {
    DIRECTOR: 'director',
    TEACHER: 'profesor',
    ASSISTANT: 'asistente'
};

// Estados de solicitudes
export const REQUEST_STATUS = {
    PENDING: 'pendiente',
    APPROVED: 'aprobado',
    REJECTED: 'rechazado',
    COMPLETED: 'completado'
};

// Estados de proyectos
export const PROJECT_STATUS = {
    ACTIVE: 'activo',
    COMPLETED: 'completado',
    PENDING: 'pendiente'
};

// Niveles de urgencia
export const URGENCY_LEVELS = {
    LOW: 'Baja',
    MEDIUM: 'Media',
    HIGH: 'Alta'
};

// Estrategias DUA predefinidas
export const DUA_STRATEGIES = [
    "Múltiples medios de representación",
    "Múltiples medios de acción y expresión",
    "Múltiples medios de compromiso",
    "Diferenciación de contenido",
    "Andamiaje educativo",
    "Flexibilidad en la evaluación",
    "Aprendizaje cooperativo",
    "Tutoría entre pares",
    "Instrucción diferenciada",
    "Personalización del aprendizaje"
];

// Asignaturas
export const SUBJECTS = [
    "Lenguaje y Comunicación",
    "Matemáticas",
    "Historia",
    "Ciencias",
    "Inglés",
    "Arte",
    "Música",
    "Educación Física",
    "Tecnología",
    "Otra"
];

// Tipos de atención PIE
export const ATTENTION_TYPES = [
    "Refuerzo académico",
    "Evaluación psicopedagógica",
    "Seguimiento personalizado",
    "Adecuación curricular",
    "Orientación",
    "Otro"
];

// Variables para suscripciones en tiempo real
export let realtimeSubscriptions = {
    onlineUsers: null,
    projects: null,
    pieRequests: null,
    collaborativeProjects: null
};

// Variables para estrategias seleccionadas
export let selectedStrategies = [];

// Usuario actual
export let currentUser = null;

// Configuración de Cloudinary (si la usas)
export const CLOUDINARY_CONFIG = {
    cloudName: 'tu-cloud-name',
    uploadPreset: 'tu-upload-preset'
};

// Configuración de notificaciones
export const NOTIFICATION_TYPES = {
    NEW_PROJECT: 'new_project',
    NEW_PIE_REQUEST: 'new_pie_request',
    NEW_COMMENT: 'new_comment',
    STATUS_UPDATE: 'status_update'
};

// Estados de vista para teacher.js
export let teacherViewState = {
    currentView: 'projects', // 'projects', 'pie-requests', 'collaborative-projects'
    currentProjectId: null,
    currentPieRequestId: null,
    currentCollaborativeProjectId: null,
    filter: 'all', // 'all', 'pending', 'completed'
    sortBy: 'date', // 'date', 'title', 'subject'
    searchTerm: ''
};

// Estados de vista para director.js
export let directorViewState = {
    currentView: 'overview',
    currentProjectId: null,
    filter: 'all',
    sortBy: 'date'
};

// Estados de vista para assistant.js
export let assistantViewState = {
    currentView: 'pie-requests',
    currentRequestId: null,
    filter: 'pending',
    sortBy: 'date'
};

export let loginModal = null;
export let registerModal = null;

// Función para actualizar currentUser de forma controlada
export function setCurrentUser(user) {
    currentUser = user;
    console.log("👤 currentUser actualizado en constants:", user ? user.name : 'null');
}

export function setSelectedStrategies(strategies) {
    selectedStrategies = strategies;
}

// Función para obtener currentUser de forma segura
export function getCurrentUser() {
    return currentUser;
}