// ------------------ MAIN APPLICATION FILE ------------------
import { auth } from './config/firebase.js';
import { onAuthStateChanged, initModals, checkAuth } from './auth/auth.js';
import { setupLoginForm, setupRegisterForm } from './forms/login.js';
import { setupContentUploadForm } from './forms/content.js';
import { setupPieRequestForm } from './forms/pie-request.js';
import { setupCollaborativeProjectForm } from './forms/collaborative.js';
import { initializeRealtimeIndicator } from './services/realtime.js';
import { setupDefaultAdmin } from './config/admin-setup.js';

// Variables de modales
let loginModal, registerModal;

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("🚀 Inicializando aplicación...");

        // 🔥 PRIMERO: Asegurar que no hay usuario autenticado
        console.log("🔒 Verificando estado de autenticación inicial...");
        if (auth.currentUser) {
            console.log("⚠️  Hay usuario autenticado, cerrando sesión...");
            await auth.signOut();
        }

        // Inicializar modales
        const modals = initModals();
        loginModal = modals.loginModal;
        registerModal = modals.registerModal;
        
        // Ocultar todas las vistas inicialmente
        document.getElementById("mainContent").style.display = "none";
        document.getElementById("directorView").style.display = "none";
        document.getElementById("teacherView").style.display = "none";
        document.getElementById("assistantView").style.display = "none";
        document.getElementById("adminView").style.display = "none";

        // Configurar listeners de formularios
        setupFormListeners();
        
        // 🔥 CONFIGURAR ADMINISTRADOR (NO INICIARÁ SESIÓN)
        console.log("🔧 Configurando administrador por defecto...");
        await setupDefaultAdmin();
        console.log("✅ Setup de administrador completado");
        
        // Configurar observador de autenticación
        auth.onAuthStateChanged(onAuthStateChanged);
        
        // Inicializar indicador de tiempo real
        initializeRealtimeIndicator();

        // 🔥 MOSTRAR LOGIN SIEMPRE AL INICIAR
        console.log("🚪 Mostrando modal de login...");
        setTimeout(() => {
            if (!auth.currentUser) {
                showLoginModal();
            }
        }, 1000);

    } catch (error) {
        console.error("❌ Error inicializando la aplicación:", error);
        // Aún así mostrar login si hay error
        showLoginModal();
    }
});

function setupFormListeners() {
    setupLoginForm();
    setupRegisterForm();
    setupContentUploadForm();
    setupPieRequestForm();
    setupCollaborativeProjectForm();
}

// Función para mostrar el modal de login
function showLoginModal() {
    console.log('🚪 Mostrando modal de login...');
    const modalElement = document.getElementById('loginModal');
    if (modalElement) {
        const modalInstance = new bootstrap.Modal(modalElement, {
            backdrop: 'static',
            keyboard: false
        });
        modalInstance.show();
        
        // Forzar el focus en el primer campo
        setTimeout(() => {
            const emailInput = document.getElementById('loginEmail');
            if (emailInput) emailInput.focus();
        }, 500);
    }
}

// Exportar los modales si otros archivos los necesitan
export { loginModal, registerModal };

// Hacer checkAuth disponible globalmente para otros módulos
window.checkAuth = checkAuth;

// El resto de tus funciones window permanecen igual...
window.logout = () => {
    import('./auth/auth.js').then(module => {
        module.logout();
    });
};

window.viewProject = (id) => {
    import('./utils/ui.js').then(module => {
        module.viewProject(id);
    });
};

window.goBackToProjects = () => {
    import('./utils/ui.js').then(module => {
        module.goBackToProjects();
    });
};

window.addComment = (id) => {
    import('./services/firestore.js').then(module => {
        module.addComment(id);
    });
};

window.loadComments = (id) => {
    import('./services/firestore.js').then(module => {
        module.loadComments(id);
    });
};

window.deleteProject = (id) => {
    import('./services/firestore.js').then(module => {
        module.deleteProject(id);
    });
};

window.editProject = (id) => {
    import('./services/firestore.js').then(module => {
        module.editProject(id);
    });
};

window.updatePieRequestStatus = (requestId, status) => {
    import('./services/firestore.js').then(module => {
        module.updatePieRequestStatus(requestId, status);
    });
};

window.updateProjectStatus = (projectId, status) => {
    import('./services/firestore.js').then(module => {
        module.updateProjectStatus(projectId, status);
    });
};

window.deletePieRequest = (requestId) => {
    import('./services/firestore.js').then(module => {
        module.deletePieRequest(requestId);
    });
};

window.deleteCollaborativeProject = (projectId) => {
    import('./services/firestore.js').then(module => {
        module.deleteCollaborativeProject(projectId);
    });
};

window.addSelectedStrategy = () => {
    import('./forms/collaborative.js').then(module => {
        module.addSelectedStrategy();
    });
};

window.addCustomStrategy = () => {
    import('./forms/collaborative.js').then(module => {
        module.addCustomStrategy();
    });
};

window.removeStrategy = (index) => {
    import('./forms/collaborative.js').then(module => {
        module.removeStrategy(index);
    });
};

window.updateSelectedStrategiesList = () => {
    import('./forms/collaborative.js').then(module => {
        module.updateSelectedStrategiesList();
    });
};

window.showPieRequestDetail = (requestId) => {
    import('./views/teacher-details.js').then(module => {
        module.showPieRequestDetail(requestId);
    });
};

window.showCollaborativeProjectDetail = (projectId) => {
    import('./views/teacher-details.js').then(module => {
        module.showCollaborativeProjectDetail(projectId);
    });
};

window.addDirectorComment = (projectId) => {
    import('./views/director-comments.js').then(module => {
        module.addDirectorComment(projectId);
    });
};

window.deleteDirectorComment = (projectId, commentTimestamp) => {
    import('./views/director-comments.js').then(module => {
        module.deleteDirectorComment(projectId, commentTimestamp);
    });
};

window.loadDirectorComments = (projectId) => {
    import('./views/director-comments.js').then(module => {
        module.loadDirectorComments(projectId);
    });
};

window.deleteUser = (userId, userName) => {
    import('./views/admin.js').then(module => {
        module.deleteUser(userId, userName);
    });
};