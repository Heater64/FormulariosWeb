// ============================================================
// UTILIDADES - Funciones generales
// ============================================================

(function() {
    'use strict';
    
    // ============================================================
    // GENERADORES
    // ============================================================
    
    window.generateId = function() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
    };
    
    window.generateSlug = function(title) {
        if (!title) return 'sin-titulo';
        return title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 50) || 'sin-titulo';
    };
    
    // ============================================================
    // TEXTO
    // ============================================================
    
    window.escapeHtml = function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    window.truncateText = function(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };
    
    // ============================================================
    // FECHAS
    // ============================================================
    
    window.formatDate = function(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    window.formatDateShort = function(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };
    
    // ============================================================
    // NOTIFICACIONES
    // ============================================================
    
    const NOTIFICATION_ICONS = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };
    
    window.showNotification = function(message, type = 'info', duration = 4000) {
        if (type === 'success' && document.documentElement.getAttribute('data-sonidos') === 'true') {
            if (window.reproducirSonido) window.reproducirSonido();
        }
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon"><i data-lucide="${NOTIFICATION_ICONS[type] || 'info'}"></i></span>
                <span class="notification-message">${window.escapeHtml(message)}</span>
                <button class="notification-close"><i data-lucide="x"></i></button>
            </div>
        `;
        
        container.appendChild(notification);
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });
        
        const removeNotification = () => {
            if (!notification.parentElement) return;
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(50px)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        };
        
        const timeout = setTimeout(removeNotification, duration);
        notification._timeout = timeout;
        
        notification.querySelector('.notification-close').addEventListener('click', (e) => {
            e.stopPropagation();
            clearTimeout(timeout);
            removeNotification();
        });
        
        notification.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-close')) {
                clearTimeout(timeout);
                removeNotification();
            }
        });
        
        notification.addEventListener('mouseenter', () => clearTimeout(timeout));
        notification.addEventListener('mouseleave', () => {
            notification._timeout = setTimeout(removeNotification, duration);
        });
        
        return notification;
    };
    
    // ============================================================
    // CONFIRMACIÓN
    // ============================================================
    
    window.showConfirmDialog = function(title, message, confirmText, cancelText, onConfirm, onCancel) {
        const existing = document.querySelector('.confirm-dialog-overlay');
        if (existing) existing.remove();
        
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog-overlay';
        overlay.innerHTML = `
            <div class="confirm-dialog">
                <div class="confirm-dialog-icon"><i data-lucide="alert-triangle"></i></div>
                <h3 class="confirm-dialog-title">${window.escapeHtml(title)}</h3>
                <p class="confirm-dialog-message">${message}</p>
                <div class="confirm-dialog-actions">
                    <button class="btn-secondary confirm-dialog-cancel">${window.escapeHtml(cancelText || 'Cancelar')}</button>
                    <button class="btn-danger confirm-dialog-confirm">${window.escapeHtml(confirmText || 'Confirmar')}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        setTimeout(() => overlay.classList.add('active'), 10);
        
        const close = (callback) => {
            overlay.classList.remove('active');
            overlay.classList.add('closing');
            setTimeout(() => {
                overlay.remove();
                if (typeof callback === 'function') callback();
            }, 300);
        };
        
        overlay.querySelector('.confirm-dialog-confirm').addEventListener('click', () => close(onConfirm));
        overlay.querySelector('.confirm-dialog-cancel').addEventListener('click', () => close(onCancel));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(onCancel); });
        
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                close(onCancel);
                document.removeEventListener('keydown', escHandler);
            }
        });
        
        return overlay;
    };
    
    // ============================================================
    // CLIPBOARD
    // ============================================================
    
    window.copyToClipboard = function(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => window.showNotification('Copiado al portapapeles', 'success'))
                .catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    };
    
    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = 'position:fixed;opacity:0;left:-9999px;';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            window.showNotification('Copiado al portapapeles', 'success');
        } catch (e) {
            window.showNotification('No se pudo copiar', 'error');
        }
        document.body.removeChild(textarea);
    }
    
    // ============================================================
    // URL
    // ============================================================
    
    window.getCurrentURL = function() {
        return window.location.origin + window.location.pathname;
    };
    
    // ============================================================
    // NOTIFICACIONES PERSISTENTES (desde Supabase)
    // ============================================================

    window.cargarNotificacionesPendientes = async function() {
        const user = window.getCurrentUser();
        if (!user) return;
        const sb = window.supabaseClient;
        if (!sb) return;
        try {
            const { data, error } = await sb
                .from('notificaciones')
                .select('*')
                .eq('destinatario', user.username)
                .eq('leida', false)
                .order('created_at', { ascending: false });
            if (error || !data || data.length === 0) return;
            data.forEach(n => {
                window.showNotification(
                    (n.titulo ? n.titulo + ' — ' : '') + n.mensaje,
                    n.tipo || 'info',
                    6000
                );
                sb.from('notificaciones').update({ leida: true }).eq('id', n.id).then(() => {});
            });
        } catch (e) {
            // Silencioso: las notificaciones son secundarias
        }
    };

    // ============================================================
    // DEBOUNCE
    // ============================================================
    
    window.debounce = function(func, wait = 300) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };
    
    console.log('✅ Utils cargadas correctamente');
    
})();