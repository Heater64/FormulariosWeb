// ============================================================
// AUTH - Login y autenticación (Admin / Alumno)
// ============================================================

(function() {
    'use strict';
    
    let authState = {
        isAuthenticated: false,
        username: null,
        role: null,
        userId: null
    };
    
    // ============================================================
    // LOGIN
    // ============================================================
    
    window.handleLogin = async function(event) {
        event.preventDefault();
        const username = document.getElementById('loginUser').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        
        if (!username || !password) {
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Por favor, introduce usuario y contraseña', 'warning');
            } else {
                alert('Por favor, introduce usuario y contraseña');
            }
            return;
        }
        
        let user = null;
        
        // Intentar login con el sistema de usuarios
        if (typeof window.loginUser === 'function') {
            user = window.loginUser(username, password);
        }
        
        // Fallback: usuarios por defecto
        if (!user) {
            const FALLBACK_USERS = {
                'admin': { password: 'admin123', role: 'admin', fullName: 'Administrador' },
                'alumno': { password: 'alumno123', role: 'alumno', fullName: 'Alumno Demo' }
            };
            
            if (FALLBACK_USERS[username] && FALLBACK_USERS[username].password === password) {
                user = {
                    id: username,
                    username: username,
                    fullName: FALLBACK_USERS[username].fullName,
                    role: FALLBACK_USERS[username].role,
                    password: password,
                    active: true
                };
                if (typeof window.createUser === 'function') {
                    try {
                        window.createUser(user.fullName, user.username, user.password, user.role);
                    } catch (e) {}
                }
            }
        }
        
        if (user) {
            // Sincronizar con Supabase
            if (typeof window.syncUserWithSupabase === 'function') {
                try {
                    await window.syncUserWithSupabase(user);
                } catch (e) {
                    console.warn('Error syncing user with Supabase:', e);
                }
            }
            
            authState.isAuthenticated = true;
            authState.username = user.fullName || user.username;
            authState.role = user.role || 'alumno';
            authState.userId = user.id;
            
            sessionStorage.setItem('formpro_user', user.id);
            sessionStorage.setItem('formpro_username', user.fullName || user.username);
            sessionStorage.setItem('formpro_auth', 'true');
            sessionStorage.setItem('formpro_role', user.role || 'alumno');
            sessionStorage.setItem('formpro_auth_time', Date.now().toString());
            
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('mainApp').classList.remove('hidden');
            
            updateNavbarForRole(user.role);
            
            if (typeof Utils !== 'undefined') {
                Utils.showNotification(`Bienvenido, ${user.fullName || user.username}! (${user.role === 'admin' ? '👑 Admin' : '🎓 Alumno'})`, 'success');
            }
            
            if (typeof initApp === 'function') {
                initApp();
            } else {
                location.reload();
            }
        } else {
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Usuario o contraseña incorrectos', 'error');
            } else {
                alert('Usuario o contraseña incorrectos');
            }
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginPassword').focus();
        }
    };
    
    // ============================================================
    // ACTUALIZAR NAVBAR POR ROL
    // ============================================================
    
    function updateNavbarForRole(role) {
        const navbarActions = document.querySelector('.navbar-actions');
        if (!navbarActions) return;
        
        // Eliminar badge existente
        const existingRole = navbarActions.querySelector('.role-badge');
        if (existingRole) existingRole.remove();
        
        // Añadir badge de rol
        const roleBadge = document.createElement('span');
        roleBadge.className = `role-badge role-${role}`;
        roleBadge.textContent = role === 'admin' ? '👑 Admin' : '🎓 Alumno';
        navbarActions.insertBefore(roleBadge, navbarActions.firstChild);
        
        // Mostrar/ocultar botones según rol
        const dashboardBtn = navbarActions.querySelector('[onclick*="showView(\'dashboard\')"]');
        const newBtn = navbarActions.querySelector('[onclick*="showView(\'editor\')"]');
        
        if (dashboardBtn) {
            dashboardBtn.style.display = (role === 'alumno') ? 'none' : '';
        }
        
        if (newBtn) {
            newBtn.style.display = (role === 'alumno') ? 'none' : '';
        }
    }
    
    // ============================================================
    // LOGOUT
    // ============================================================
    
    window.logout = function() {
        authState.isAuthenticated = false;
        authState.username = null;
        authState.role = null;
        authState.userId = null;
        
        if (typeof window.logoutUser === 'function') {
            window.logoutUser();
        }
        
        sessionStorage.removeItem('formpro_user');
        sessionStorage.removeItem('formpro_username');
        sessionStorage.removeItem('formpro_auth');
        sessionStorage.removeItem('formpro_role');
        sessionStorage.removeItem('formpro_auth_time');
        
        location.reload();
    };
    
    // ============================================================
    // CHECK AUTH
    // ============================================================
    
    window.checkAuth = function() {
        const isAuthenticated = sessionStorage.getItem('formpro_auth') === 'true';
        const userId = sessionStorage.getItem('formpro_user');
        const username = sessionStorage.getItem('formpro_username');
        const role = sessionStorage.getItem('formpro_role');
        const authTime = sessionStorage.getItem('formpro_auth_time');
        
        if (authTime) {
            const elapsed = Date.now() - parseInt(authTime);
            if (elapsed > 24 * 60 * 60 * 1000) {
                sessionStorage.removeItem('formpro_auth');
                sessionStorage.removeItem('formpro_user');
                sessionStorage.removeItem('formpro_username');
                sessionStorage.removeItem('formpro_role');
                sessionStorage.removeItem('formpro_auth_time');
                return false;
            }
        }
        
        const isValid = isAuthenticated && userId;
        if (isValid) {
            authState.isAuthenticated = true;
            authState.username = username || userId;
            authState.role = role || 'alumno';
            authState.userId = userId;
            setTimeout(() => updateNavbarForRole(authState.role), 50);
        }
        return isValid;
    };
    
    window.getCurrentUser = function() {
        if (authState.isAuthenticated && authState.userId) {
            return {
                id: authState.userId,
                username: authState.username,
                role: authState.role
            };
        }
        
        const userId = sessionStorage.getItem('formpro_user');
        const username = sessionStorage.getItem('formpro_username');
        const role = sessionStorage.getItem('formpro_role');
        
        if (userId) {
            return {
                id: userId,
                username: username || userId,
                role: role || 'alumno'
            };
        }
        return null;
    };
    
    window.getUserRole = function() {
        const user = window.getCurrentUser();
        return user ? user.role : null;
    };
    
    console.log('✅ Auth System cargado (Admin / Alumno)');
    
})();