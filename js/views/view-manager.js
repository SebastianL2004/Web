import { loadMyProjects, loadMyPieRequests, loadMyCollaborativeProjects } from '../views/teacher.js';
import { loadOnlineTeachersForDirector, loadPieRequestsForDirector, loadCollaborativeProjectsForDirector, loadAllProjectsForDirector } from '../views/director.js';
import { loadOnlineTeachersForAssistant, loadPieRequestsForAssistant, loadCollaborativeProjectsForAssistant, loadAllContentForAssistant } from '../views/assistant.js';

export function showTeacherView() {
    hideAllViews();
    document.getElementById("mainContent").style.display = "block";
    document.getElementById("teacherView").style.display = "block";

    console.log("🎯 Mostrando vista del profesor");

    // Cargar datos del profesor
    if (typeof loadMyProjects === 'function') loadMyProjects();
    if (typeof loadMyPieRequests === 'function') loadMyPieRequests();
    if (typeof loadMyCollaborativeProjects === 'function') loadMyCollaborativeProjects();
    if (typeof loadOnlineTeachersForTeacher === 'function') loadOnlineTeachersForTeacher()}

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
}

export function showAssistantView() {
    hideAllViews();
    document.getElementById("mainContent").style.display = "block";
    document.getElementById("assistantView").style.display = "block";

    console.log("🎯 Mostrando vista del asistente");

    // Cargar datos del asistente
    if (typeof loadOnlineTeachersForAssistant === 'function') loadOnlineTeachersForAssistant();
    if (typeof loadPieRequestsForAssistant === 'function') loadPieRequestsForAssistant();
    if (typeof loadCollaborativeProjectsForAssistant === 'function') loadCollaborativeProjectsForAssistant();
    if (typeof loadAllContentForAssistant === 'function') loadAllContentForAssistant();
}
export function hideAllViews() {
    document.getElementById("mainContent").style.display = "none";
    document.getElementById("directorView").style.display = "none";
    document.getElementById("teacherView").style.display = "none";
    document.getElementById("assistantView").style.display = "none";
}