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
    
    loadOnlineTeachersForDirector();
    loadPieRequestsForDirector();
    loadCollaborativeProjectsForDirector();
    loadAllProjectsForDirector();
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