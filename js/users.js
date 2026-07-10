// ============================================================
// USERS - Sistema de usuarios (solo Alumno y Admin)
// ============================================================

(function() {
    'use strict';
    
    const USERS_KEY = 'formpro_users';
    const SESSION_KEY = 'formpro_session';
    
    // Usuarios por defecto
    const DEFAULT_USERS = [
        { 
            id: 'admin', 
            username: 'admin',
            fullName: 'Administrador', 
            password: 'admin123', 
            role: 'admin', 
            active: true, 
            created_at: new Date().toISOString() 
        },
        { 
            id: 'darwin', 
            username: 'Darwin',
            fullName: 'DARWIN', 
            password: 'dnmr2009', 
            role: 'alumno', 
            active: true, 
            created_at: new Date().toISOString() 
        }
    ];
    
    let users = [];
    let currentUser = null;
    
    // ============================================================
    // CARGA Y GUARDADO
    // ============================================================
    
    function loadUsers() {
        try {
            const data = localStorage.getItem(USERS_KEY);
            if (data) {
                users = JSON.parse(data);
                users = users.map(u => {
                    if (u.role !== 'admin' && u.role !== 'alumno') {
                        u.role = 'alumno';
                    }
                    return u;
                });
                saveUsers();
            } else {
                users = JSON.parse(JSON.stringify(DEFAULT_USERS));
                saveUsers();
            }
        } catch (e) {
            users = JSON.parse(JSON.stringify(DEFAULT_USERS));
            saveUsers();
        }
        return users;
    }
    
    function saveUsers() {
        try {
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        } catch (e) {
            console.warn('Error saving users:', e);
        }
    }
    
    function loadSession() {
        try {
            const data = sessionStorage.getItem(SESSION_KEY);
            if (data) {
                const session = JSON.parse(data);
                const user = users.find(u => u.id === session.userId && u.active !== false);
                if (user) {
                    currentUser = user;
                    return user;
                }
            }
        } catch (e) {
            console.warn('Error loading session:', e);
        }
        return null;
    }
    
    function saveSession(user) {
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                userId: user.id,
                loginTime: Date.now()
            }));
        } catch (e) {
            console.warn('Error saving session:', e);
        }
    }
    
    function clearSession() {
        try {
            sessionStorage.removeItem(SESSION_KEY);
        } catch (e) {
            console.warn('Error clearing session:', e);
        }
    }
    
    // ============================================================
    // FUNCIONES PÚBLICAS
    // ============================================================
    
    window.loginUser = function(username, password) {
        const user = users.find(u => 
            (u.id === username || u.username === username) && 
            u.password === password && 
            u.active !== false
        );
        
        if (user) {
            currentUser = user;
            saveSession(user);
            return { ...user };
        }
        return null;
    };
    
    window.logoutUser = function() {
        currentUser = null;
        clearSession();
    };
    
    window.getCurrentUser = function() {
        if (currentUser) return { ...currentUser };
        return loadSession();
    };
    
    window.isLoggedIn = function() {
        return !!window.getCurrentUser();
    };
    
    window.getUserRole = function() {
        const user = window.getCurrentUser();
        return user ? user.role : null;
    };
    
    window.isAdmin = function() {
        return window.getUserRole() === 'admin';
    };
    
    window.isAlumno = function() {
        return window.getUserRole() === 'alumno';
    };
    
    // ============================================================
    // CRUD DE USUARIOS (SOLO ADMIN)
    // ============================================================
    
    window.getUsers = function() {
        if (!window.isAdmin()) {
            const user = window.getCurrentUser();
            return user ? [user] : [];
        }
        return users.map(u => ({ ...u }));
    };
    
    window.getUserById = function(id) {
        const user = users.find(u => u.id === id);
        return user ? { ...user } : null;
    };
    
    window.createUser = function(fullName, username, password, role) {
        if (!window.isAdmin()) {
            throw new Error('No tienes permisos para crear usuarios');
        }
        
        if (role !== 'admin' && role !== 'alumno') {
            role = 'alumno';
        }
        
        if (!fullName?.trim()) throw new Error('El nombre completo es obligatorio');
        if (!username?.trim()) throw new Error('El nombre de usuario es obligatorio');
        if (!password || password.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres');
        
        if (users.find(u => u.id === username || u.username === username)) {
            throw new Error('Ya existe un usuario con ese nombre');
        }
        
        const user = {
            id: username,
            username: username.trim(),
            fullName: fullName.trim(),
            password: password,
            role: role,
            active: true,
            created_at: new Date().toISOString()
        };
        
        users.push(user);
        saveUsers();
        return { ...user };
    };
    
    window.updateUser = function(id, updates) {
        const user = users.find(u => u.id === id);
        if (!user) throw new Error('Usuario no encontrado');
        
        const current = window.getCurrentUser();
        if (!current) throw new Error('No autenticado');
        if (current.role !== 'admin' && current.id !== id) {
            throw new Error('No tienes permisos para modificar este usuario');
        }
        
        // No permitir cambiar el ID
        delete updates.id;
        
        // Validar campos
        if (updates.fullName !== undefined) {
            updates.fullName = updates.fullName.trim();
            if (!updates.fullName) throw new Error('El nombre no puede estar vacío');
        }
        
        if (updates.username !== undefined) {
            updates.username = updates.username.trim();
            if (!updates.username) throw new Error('El nombre de usuario no puede estar vacío');
            if (updates.username !== user.username && users.find(u => u.username === updates.username && u.id !== id)) {
                throw new Error('Ya existe un usuario con ese nombre de usuario');
            }
            // Si cambia el username, actualizar también el ID
            updates.id = updates.username;
        }
        
        if (updates.password !== undefined) {
            if (!updates.password || updates.password.length < 4) {
                throw new Error('La contraseña debe tener al menos 4 caracteres');
            }
        }
        
        if (updates.role !== undefined) {
            if (updates.role !== 'admin' && updates.role !== 'alumno') {
                updates.role = 'alumno';
            }
        }
        
        // Aplicar cambios
        Object.assign(user, updates);
        saveUsers();
        
        // Actualizar sesión actual si es el mismo usuario
        if (current && current.id === id) {
            currentUser = user;
            saveSession(user);
        }
        
        return { ...user };
    };
    
    window.deleteUser = function(id) {
        if (!window.isAdmin()) {
            throw new Error('No tienes permisos para eliminar usuarios');
        }
        
        if (id === 'admin') {
            throw new Error('No se puede eliminar el usuario administrador');
        }
        
        const user = users.find(u => u.id === id);
        if (!user) throw new Error('Usuario no encontrado');
        
        users = users.filter(u => u.id !== id);
        saveUsers();
        
        // Si el usuario eliminado es el actual, cerrar sesión
        const current = window.getCurrentUser();
        if (current && current.id === id) {
            window.logoutUser();
        }
        
        return true;
    };
    
    // ============================================================
    // SINCRONIZAR CON SUPABASE (opcional)
    // ============================================================
    
    window.syncUserWithSupabase = async function(user) {
        if (typeof supabase === 'undefined') {
            console.warn('Supabase no disponible, saltando sincronización');
            return user;
        }
        
        try {
            const { data, error } = await supabase
                .from('users')
                .upsert({
                    id: user.id,
                    username: user.username,
                    full_name: user.fullName || user.username,
                    password_hash: user.password,
                    role: user.role || 'alumno',
                    active: user.active !== false
                })
                .select();
            
            if (error) {
                console.error('Error syncing user:', error);
                return user;
            }
            return data?.[0] || user;
        } catch (error) {
            console.error('Error syncing user with Supabase:', error);
            return user;
        }
    };
    
    // ============================================================
    // INICIALIZACIÓN
    // ============================================================
    
    loadUsers();
    loadSession();
    
    window.userSystem = {
        users: () => users.map(u => ({ ...u })),
        currentUser: () => currentUser ? { ...currentUser } : null,
        reload: loadUsers
    };
    
    console.log('✅ Users System cargado (Admin / Alumno)');
    console.log('👤 Usuarios:', users.map(u => u.username + ' (' + u.role + ')').join(', '));
    
})();