// ============================================================
// UTILIDADES - Versión mejorada
// ============================================================

(function() {
    'use strict';
    
    // Asegurar que Utils esté definido
    if (typeof window.Utils === 'undefined') {
        window.Utils = {};
    }
    
    function generateSlug(title) {
        if (!title) return 'formulario-sin-titulo';
        return title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 50) || 'formulario-sin-titulo';
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function truncateText(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    // ============================================================
    // NOTIFICACIONES
    // ============================================================
    
    const NOTIFICATION_ICONS = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    function showNotification(message, type = 'info', duration = 4000) {
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
                <span class="notification-icon">${NOTIFICATION_ICONS[type] || 'ℹ️'}</span>
                <span class="notification-message">${escapeHtml(message)}</span>
                <button class="notification-close" aria-label="Cerrar notificación">✕</button>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Animación de entrada
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });
        
        const removeNotification = () => {
            if (!notification.parentElement) return;
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        };
        
        const timeout = setTimeout(removeNotification, duration);
        notification._timeout = timeout;
        
        // Clic en la notificación
        notification.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-close')) {
                clearTimeout(timeout);
                removeNotification();
            }
        });
        
        // Botón cerrar
        notification.querySelector('.notification-close').addEventListener('click', (e) => {
            e.stopPropagation();
            clearTimeout(timeout);
            removeNotification();
        });
        
        return notification;
    }
    
    // ============================================================
    // OTRAS UTILIDADES
    // ============================================================
    
    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => showNotification('Enlace copiado al portapapeles', 'success'))
                .catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }
    
    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showNotification('Enlace copiado al portapapeles', 'success');
        } catch (e) {
            showNotification('No se pudo copiar el enlace', 'error');
        }
        document.body.removeChild(textarea);
    }
    
    function getCurrentURL() {
        return window.location.origin + window.location.pathname;
    }
    
    function generateId() {
        // Usar crypto.randomUUID si está disponible
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
    }
    
    function formatDate(date) {
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
    }
    
    function debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    function getFormQuestions(form) {
        if (!form) return [];
        if (typeof form.questions === 'string') {
            try {
                return JSON.parse(form.questions);
            } catch (e) {
                return [];
            }
        }
        return form.questions || [];
    }
    
    // Asignar todas las funciones a Utils
    window.Utils = {
        generateSlug,
        escapeHtml,
        truncateText,
        showNotification,
        copyToClipboard,
        getCurrentURL,
        generateId,
        formatDate,
        debounce,
        getFormQuestions
    };
    
    // Exponer funciones globales para compatibilidad
    window.showNotification = showNotification;
    window.copyToClipboard = copyToClipboard;
    window.generateSlug = generateSlug;
    window.escapeHtml = escapeHtml;
    window.generateId = generateId;
    
    console.log('✅ Utils cargadas correctamente');
})();