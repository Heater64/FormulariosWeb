// ============================================================
// UTILIDADES
// ============================================================

function generateSlug(title) {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
        // Crear toast si no existe
        const newToast = document.createElement('div');
        newToast.id = 'toast';
        newToast.className = 'toast hidden';
        document.body.appendChild(newToast);
    }
    
    const toastEl = document.getElementById('toast');
    toastEl.textContent = message;
    toastEl.className = `toast toast-${type}`;
    toastEl.classList.remove('hidden');
    
    setTimeout(() => {
        toastEl.classList.add('hidden');
    }, 4000);
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('✅ Enlace copiado al portapapeles', 'success');
        });
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('✅ Enlace copiado al portapapeles', 'success');
    }
}

function getCurrentURL() {
    return window.location.origin + window.location.pathname;
}

function generateId() {
    return crypto.randomUUID();
}

window.Utils = {
    generateSlug,
    escapeHtml,
    showToast,
    copyToClipboard,
    getCurrentURL,
    generateId
};