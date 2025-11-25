// ------------------ BASE VIEW FUNCTIONS ------------------
import { currentUser } from '../config/constants.js';
import { loadOnlineTeachersForDirector, loadPieRequestsForDirector, loadCollaborativeProjectsForDirector, loadAllProjectsForDirector } from './director.js';
import { loadMyProjects, loadMyPieRequests, loadMyCollaborativeProjects } from './teacher.js';
import { loadOnlineTeachersForAssistant, loadPieRequestsForAssistant, loadCollaborativeProjectsForAssistant, loadAllContentForAssistant } from './assistant.js';

export function hideAllViews() {
    document.getElementById("mainContent").style.display = "none";
    document.getElementById("directorView").style.display = "none";
    document.getElementById("teacherView").style.display = "none";
    document.getElementById("assistantView").style.display = "none";
}

export function showDirectorView() {
    hideAllViews();
    document.getElementById("mainContent").style.display = "block";
    document.getElementById("directorView").style.display = "block";

    console.log("🎯 Mostrando vista del director");

    // Cargar datos del director
    if (typeof loadOnlineTeachersForDirector === 'function') loadOnlineTeachersForDirector();
    if (typeof loadPieRequestsForDirector === 'function') loadPieRequestsForDirector();
    if (typeof loadCollaborativeProjectsForDirector === 'function') loadCollaborativeProjectsForDirector();
    if (typeof loadAllProjectsForDirector === 'function') loadAllProjectsForDirector();
    
    // 🔥 NUEVO: Cargar dashboard
    setTimeout(() => {
        if (typeof loadDirectorDashboard === 'function') {
            loadDirectorDashboard();
        } else {
            console.error("❌ loadDirectorDashboard no está disponible");
        }
    }, 1000);
}

export function showTeacherView() {
    hideAllViews();
    document.getElementById("mainContent").style.display = "block";
    document.getElementById("teacherView").style.display = "block";
    
    loadMyProjects();
    loadMyPieRequests();
    loadMyCollaborativeProjects();
}

export function showAssistantView() {
    hideAllViews();
    document.getElementById("mainContent").style.display = "block";
    document.getElementById("assistantView").style.display = "block";
    
    loadOnlineTeachersForAssistant();
    loadPieRequestsForAssistant();
    loadCollaborativeProjectsForAssistant();
    loadAllContentForAssistant();
}