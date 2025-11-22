// ------------------ SECURITY FUNCTIONS ------------------
export function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/[&<>"'`=\/]/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' }[c])
    );
}

export function sanitizeInput(input) {
    if (!input) return "";
    return input.trim().replace(/[<>&"']/g, '');
}

export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validatePhone(phone) {
    const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)]{8,}$/;
    return phoneRegex.test(phone);
}

export function sanitizeFileName(filename) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}