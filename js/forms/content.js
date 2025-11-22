// ------------------ CONTENT UPLOAD FORM HANDLING ------------------
import { handleContentUpload } from '../services/cloudinary.js';

export function setupContentUploadForm() {
    document.getElementById('uploadContentForm').addEventListener('submit', handleContentUpload);
}