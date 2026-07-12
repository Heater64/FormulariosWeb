// ============================================================
// AUTH - Autenticación y gestión de sesión
// ============================================================

(function() {
    'use strict';
    
    // ============================================================
    // LOGIN
    // ============================================================
    
    window.handleLogin = async function(event) {
        event.preventDefault();
        console.log('🔐 Intentando login...');
        
        const username = document.getElementById('loginUser').value.trim();
        const password = document.getElementById('loginPass').value.trim();
        
        if (!username || !password) {
            if (typeof window.showNotification === 'function') {
                window.showNotification('Por favor, introduce usuario y contraseña', 'warning');
            } else {
                alert('Por favor, introduce usuario y contraseña');
            }
            return;
        }
        
        console.log('👤 Intento de login para:', username);
        
        // Verificar que la función loginUser existe
        if (typeof window.loginUser !== 'function') {
            console.error('❌ loginUser no está definido');
            alert('Error: Sistema de usuarios no cargado');
            return;
        }
        
        const user = await window.loginUser(username, password);
        console.log('📦 Usuario encontrado:', user);
        
        if (user) {
            console.log('✅ Login exitoso para:', user.fullName, '(', user.role, ')');
            
            if (typeof window.showNotification === 'function') {
                window.showNotification(`Bienvenido, ${user.fullName}`, 'success', 1500);
            }
            
            // Redirigir después de un breve retraso para que se vea la notificación
            setTimeout(function() {
                console.log('🔀 Redirigiendo a dashboard...');
                window.location.href = (window.System ? window.System.page('dashboard.html') : 'pages/dashboard.html');
            }, 500);
            
        } else {
            console.warn('❌ Login fallido para:', username);
            if (typeof window.showNotification === 'function') {
                window.showNotification('Usuario o contraseña incorrectos', 'error');
            } else {
                alert('Usuario o contraseña incorrectos');
            }
            const pwd = document.getElementById('loginPass');
            if (pwd) pwd.value = '';
            if (pwd) pwd.focus();
        }
    };
    
    // ============================================================
    // LOGOUT
    // ============================================================
    
    window.logout = function() {
        const goLogin = function () {
            if (typeof window.logoutUser === 'function') window.logoutUser();
            window.location.href = (window.System ? window.System.loginUrl() : '../index.html');
        };
        if (typeof window.showConfirmDialog === 'function') {
            window.showConfirmDialog(
                'Cerrar sesión',
                '¿Seguro que quieres cerrar sesión?',
                'Sí, cerrar sesión',
                'Cancelar',
                goLogin
            );
        } else {
            if (confirm('¿Seguro que quieres cerrar sesión?')) goLogin();
        }
    };
    
    // ============================================================
    // CHECK AUTH - Para proteger páginas
    // ============================================================
    
    window.checkAuth = function() {
        console.log('🔍 Verificando autenticación...');
        
        if (typeof window.getCurrentUser !== 'function') {
            console.error('❌ getCurrentUser no está definido');
            window.location.href = (window.System ? window.System.loginUrl() : '../index.html');
            return false;
        }
        
        const user = window.getCurrentUser();
        console.log('👤 Usuario actual:', user);
        
        if (!user) {
            console.warn('⚠️ Usuario no autenticado, redirigiendo a login');
            window.location.href = (window.System ? window.System.loginUrl() : '../index.html');
            return false;
        }
        
        console.log('✅ Usuario autenticado:', user.username);
        return user;
    };
    
    // ============================================================
    // ROLES - Funciones globales
    // ============================================================
    
    window.isAdmin = function() {
        const user = window.getCurrentUser();
        return user && (user.role === 'admin' || user.role === 'owner');
    };
    
    window.isEditor = function() {
        const user = window.getCurrentUser();
        return user && (user.role === 'editor' || user.role === 'admin' || user.role === 'owner');
    };
    
    window.isOwner = function() {
        const user = window.getCurrentUser();
        return user && user.role === 'owner';
    };
    
    // ============================================================
    // ACTUALIZAR NAVBAR SEGÚN ROL
    // ============================================================
    
    // ============================================================
    // CARCASA (topbar + bottom nav + notificaciones)
    // ------------------------------------------------------------
    // Centralizada en js/core/system.js (System.renderShell).
    // Se mantiene updateNavbar como alias para no romper las
    // páginas existentes.
    // ============================================================

    window.updateNavbar = function () {
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        if (!user) {
            console.warn('⚠️ No hay usuario para la carcasa');
            return;
        }
        if (window.System) {
            window.System.renderShell(user);
        }
    };
    
    // ============================================================
    // AUTO-LOGIN PARA PRUEBAS (solo en index.html)
    // ============================================================
    
    // Detectar si estamos en la página de login
    const isLoginPage = window.location.pathname.endsWith('index.html') || 
                        window.location.pathname === '/' || 
                        window.location.pathname === '' ||
                        window.location.pathname.endsWith('/');
    
    if (isLoginPage) {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('📄 Página de login detectada');
        });
    }
    
    console.log('✅ Auth System cargado correctamente');
    
})();