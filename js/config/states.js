// js/config/states.js - VERSIÓN ACTUALIZADA

// Variables individuales (mantener compatibilidad)
export let loginModal = null;
export let registerModal = null;
export let currentUser = null;
export let authState = {
    isAuthenticated: false,
    isLoading: true
};
export let realtimeSubscriptions = {
    onlineUsers: null,
    projects: null,
    pieRequests: null,
    collaborativeProjects: null
};
export let selectedStrategies = [];
export let formState = {
    isSubmitting: false,
    lastSubmission: null,
    errors: {}
};
export let teacherViewState = {
    currentView: 'projects',
    currentProjectId: null,
    currentPieRequestId: null,
    currentCollaborativeProjectId: null,
    filter: 'all',
    sortBy: 'date',
    searchTerm: ''
};
export let directorViewState = {
    currentView: 'overview',
    currentProjectId: null,
    filter: 'all',
    sortBy: 'date'
};
export let assistantViewState = {
    currentView: 'pie-requests',
    currentRequestId: null,
    filter: 'pending',
    sortBy: 'date'
};

// Objeto appState para compatibilidad (AGREGAR ESTO)
export const appState = {
    loginModal,
    registerModal,
    currentUser,
    authState,
    realtimeSubscriptions,
    selectedStrategies,
    formState,
    teacherViewState,
    directorViewState,
    assistantViewState
};

// Funciones setter para mantener sincronizado (AGREGAR ESTO)
export const setCurrentUser = (user) => {
    currentUser = user;
    authState.isAuthenticated = !!user;
    authState.isLoading = false;
    // Actualizar también appState
    appState.currentUser = user;
    appState.authState.isAuthenticated = !!user;
    appState.authState.isLoading = false;
};

export const setLoginModal = (modal) => {
    loginModal = modal;
    appState.loginModal = modal;
};

export const setRegisterModal = (modal) => {
    registerModal = modal;
    appState.registerModal = modal;
};

// Función para sincronizar appState (AGREGAR ESTO)
const syncAppState = () => {
    appState.loginModal = loginModal;
    appState.registerModal = registerModal;
    appState.currentUser = currentUser;
    appState.authState = authState;
    appState.realtimeSubscriptions = realtimeSubscriptions;
    appState.selectedStrategies = selectedStrategies;
    appState.formState = formState;
    appState.teacherViewState = teacherViewState;
    appState.directorViewState = directorViewState;
    appState.assistantViewState = assistantViewState;
};

// Actualizar resetAppState para sincronizar
export const resetAppState = () => {
    currentUser = null;
    authState = { isAuthenticated: false, isLoading: true };
    selectedStrategies = [];
    formState = { isSubmitting: false, lastSubmission: null, errors: {} };
    
    // Cancelar suscripciones si existen
    if (realtimeSubscriptions.onlineUsers) {
        realtimeSubscriptions.onlineUsers();
    }
    if (realtimeSubscriptions.projects) {
        realtimeSubscriptions.projects();
    }
    if (realtimeSubscriptions.pieRequests) {
        realtimeSubscriptions.pieRequests();
    }
    if (realtimeSubscriptions.collaborativeProjects) {
        realtimeSubscriptions.collaborativeProjects();
    }
    
    realtimeSubscriptions = {
        onlineUsers: null,
        projects: null,
        pieRequests: null,
        collaborativeProjects: null
    };
    
    // Sincronizar appState
    syncAppState();
};

// Sincronizar inicialmente
syncAppState();