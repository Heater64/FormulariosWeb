// ============================================================
// USERS - Sistema completo de usuarios (100% Supabase)
// ============================================================

(function() {
    'use strict';
    
    console.log('📦 Cargando sistema de usuarios (Supabase)...');
    
    const SESSION_KEY = 'formpro_session';
    
    // Usuarios de demostración (se insertan en Supabase si la tabla está vacía)
    const DEFAULT_USERS = [
        { id: 'owner', username: 'owner', fullName: 'Propietario', password: 'owner123', role: 'owner', clase_id: null },
        { id: 'admin1', username: 'admin1', fullName: 'Admin Central', password: 'admin123', role: 'admin', clase_id: 'clase_central' },
        { id: 'alumno', username: 'alumno', fullName: 'Alumno Demo', password: 'alumno123', role: 'usuario', clase_id: 'clase_central' }
    ];
    
    let currentUser = null;
    
    function getSb() {
        return window.supabaseClient || null;
    }
    
    // ============================================================
    // HASH DE CONTRASEÑAS (ofuscación local, nunca en texto plano)
    // ============================================================
    
    function hashPassword(pwd) {
        const str = String(pwd || '');
        let h1 = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            h1 ^= str.charCodeAt(i);
            h1 = Math.imul(h1, 0x01000193);
        }
        let h2 = 5381;
        for (let i = 0; i < str.length; i++) {
            h2 = (Math.imul(h2, 33) + str.charCodeAt(i)) >>> 0;
        }
        return 'h:' + (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
    }
    
    function verifyPassword(input, stored) {
        if (!stored) return false;
        if (stored.startsWith('h:')) return hashPassword(input) === stored;
        return stored === input; // legado
    }
    
    function stripPassword(u) {
        if (!u) return u;
        const { password, ...safe } = u;
        return safe;
    }
    
    // ============================================================
    // SEMBRAR USUARIOS DEMO (solo si la tabla está vacía)
    // ============================================================
    
    async function seedDemoUsers() {
        const sb = getSb();
        if (!sb) return;
        try {
            const { count, error } = await sb
                .from('users')
                .select('*', { count: 'exact', head: true });
            if (error) {
                console.warn('⚠️ No se pudo verificar usuarios:', error.message);
                return;
            }
            if (count && count > 0) return;
            
            const toInsert = DEFAULT_USERS.map(u => ({
                id: u.id,
                username: u.username,
                full_name: u.fullName,
                password: hashPassword(u.password),
                role: u.role,
                clase_id: u.clase_id,
                active: true,
                configuracion: { tamano_texto: 'medio', alto_contraste: false }
            }));
            
            const { error: insErr } = await sb.from('users').insert(toInsert);
            if (insErr) {
                console.warn('⚠️ No se pudieron crear usuarios demo:', insErr.message);
            } else {
                console.log('✅ Usuarios demo creados en Supabase');
            }
        } catch (e) {
            console.warn('⚠️ Error sembrando usuarios:', e.message);
        }
    }
    
    // ============================================================
    // SESIÓN (sessionStorage, no localStorage)
    // ============================================================
    
    function saveSession(user) {
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(stripPassword(user)));
        } catch (e) {
            console.warn('⚠️ Error guardando sesión:', e);
        }
    }
    
    function loadSession() {
        try {
            const data = sessionStorage.getItem(SESSION_KEY);
            if (data) return JSON.parse(data);
        } catch (e) {
            console.warn('⚠️ Error cargando sesión:', e);
        }
        return null;
    }
    
    function clearSession() {
        try {
            sessionStorage.removeItem(SESSION_KEY);
        } catch (e) {
            console.warn('⚠️ Error limpiando sesión:', e);
        }
    }
    
    // ============================================================
    // LOGIN / LOGOUT
    // ============================================================
    
    window.loginUser = async function(username, password) {
        console.log('🔐 Intentando login para:', username);
        const sb = getSb();
        if (!sb) {
            console.error('❌ Supabase no disponible');
            return null;
        }
        
        const { data, error } = await sb
            .from('users')
            .select('*')
            .eq('username', username)
            .maybeSingle();
        
        if (error) {
            console.error('❌ Error en login:', error.message);
            return null;
        }
        if (!data) {
            console.warn('❌ Usuario no encontrado:', username);
            return null;
        }
        if (data.active === false) {
            console.warn('❌ Usuario inactivo:', username);
            return null;
        }
        if (!verifyPassword(password, data.password)) {
            console.warn('❌ Contraseña incorrecta para:', username);
            return null;
        }
        
        const user = stripPassword(data);
        currentUser = user;
        saveSession(user);
        
        // Actualizar último acceso
        try {
            await sb.from('users').update({ ultimo_acceso: new Date().toISOString() }).eq('id', data.id);
        } catch (e) {
            console.warn('⚠️ No se pudo actualizar último acceso:', e.message);
        }

        // Registrar inicio de sesión en auditoría
        try {
            await sb.from('audit_logs').insert({
                accion: 'Inicio de sesión',
                actor: user.username,
                clase: user.clase_id || null
            });
        } catch (e) {
            console.warn('⚠️ No se pudo registrar auditoría de login:', e.message);
        }
        
        console.log('✅ Login exitoso:', user.fullName, '(', user.role, ')');
        return user;
    };
    
    window.logoutUser = function() {
        currentUser = null;
        clearSession();
    };
    
    window.getCurrentUser = function() {
        if (currentUser) return { ...currentUser };
        const session = loadSession();
        if (session) {
            currentUser = session;
            return { ...currentUser };
        }
        return null;
    };
    
    window.isLoggedIn = function() {
        return !!window.getCurrentUser();
    };
    
    window.getUserRole = function() {
        const user = window.getCurrentUser();
        return user ? user.role : null;
    };
    
    // ============================================================
    // CRUD DE USUARIOS
    // ============================================================
    
    async function fetchAllUsers() {
        const sb = getSb();
        if (!sb) return [];
        const { data, error } = await sb.from('users').select('*').order('created_at', { ascending: true });
        if (error) {
            console.error('❌ Error obteniendo usuarios:', error.message);
            return [];
        }
        return (data || []).map(stripPassword);
    }
    
    window.getUsers = async function() {
        return await fetchAllUsers();
    };
    
    window.getUsersByClass = async function(claseId) {
        const users = await fetchAllUsers();
        return users.filter(u => u.clase_id === claseId);
    };
    
    window.getUserById = async function(id) {
        const sb = getSb();
        if (!sb) return null;
        const { data, error } = await sb.from('users').select('*').eq('id', id).maybeSingle();
        if (error || !data) return null;
        return stripPassword(data);
    };
    
    window.createUser = async function(fullName, username, password, role, claseId = null) {
        const current = window.getCurrentUser();
        if (!current) throw new Error('No autenticado');
        
        if (role === 'owner' && current.role !== 'owner') throw new Error('Solo el Owner puede crear Owners');
        if (role === 'admin' && current.role !== 'owner') throw new Error('Solo el Owner puede crear Admins');
        if (role === 'editor' && !window.isAdmin()) throw new Error('Solo Admin u Owner pueden crear Editores');
        
        if ((role === 'admin' || role === 'editor') && !claseId && current.clase_id) {
            claseId = current.clase_id;
        }
        
        if (!fullName?.trim()) throw new Error('El nombre es obligatorio');
        if (!username?.trim()) throw new Error('El nombre de usuario es obligatorio');
        if (!password || password.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres');
        if (!['owner', 'admin', 'editor', 'usuario'].includes(role)) throw new Error('Rol inválido');
        
        const sb = getSb();
        if (!sb) throw new Error('Supabase no disponible');
        
        const { data, error } = await sb.from('users').insert({
            id: username,
            username: username.trim(),
            full_name: fullName.trim(),
            password: hashPassword(password),
            role: role,
            clase_id: claseId,
            active: true,
            configuracion: { tamano_texto: 'medio', alto_contraste: false }
        }).select().single();
        
        if (error) throw new Error(error.message);
        return stripPassword(data);
    };
    
    window.updateUser = async function(id, updates) {
        const current = window.getCurrentUser();
        if (!current) throw new Error('No autenticado');
        if (current.role !== 'owner' && current.id !== id) throw new Error('No tienes permisos');
        
        const payload = {};
        if (updates.fullName !== undefined) {
            if (!updates.fullName?.trim()) throw new Error('El nombre no puede estar vacío');
            payload.full_name = updates.fullName.trim();
        }
        if (updates.username !== undefined) {
            if (!updates.username?.trim()) throw new Error('El nombre de usuario no puede estar vacío');
            payload.username = updates.username.trim();
            payload.id = updates.username;
        }
        if (updates.password !== undefined) {
            if (!updates.password || updates.password.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres');
            payload.password = hashPassword(updates.password);
        }
        if (updates.role !== undefined) {
            if (!['owner', 'admin', 'editor', 'usuario'].includes(updates.role)) throw new Error('Rol inválido');
            if (current.role !== 'owner') delete updates.role;
            else payload.role = updates.role;
        }
        if (updates.configuracion !== undefined) payload.configuracion = updates.configuracion;
        if (updates.clase_id !== undefined) payload.clase_id = updates.clase_id;
        if (updates.progress !== undefined) payload.progress = updates.progress;
        if (updates.active !== undefined) payload.active = updates.active;
        
        const sb = getSb();
        if (!sb) throw new Error('Supabase no disponible');
        
        const { data, error } = await sb.from('users').update(payload).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        
        const updated = stripPassword(data);
        if (current && current.id === id) {
            currentUser = updated;
            saveSession(updated);
        }
        return updated;
    };
    
    // ============================================================
    // CAMBIAR ROL (con permisos)
    // ============================================================

    window.setUserRole = async function(id, newRole) {
        const current = window.getCurrentUser();
        if (!current) throw new Error('No autenticado');
        if (!['owner', 'admin', 'editor', 'usuario'].includes(newRole)) throw new Error('Rol inválido');

        if (current.role === 'owner') {
            // El Owner puede asignar cualquier rol
        } else if (current.role === 'admin') {
            // El Admin solo puede promover a Editor, y solo en su clase
            if (newRole !== 'editor') throw new Error('Solo el Owner puede asignar ese rol');
            const target = await window.getUserById(id);
            if (!target || target.clase_id !== current.clase_id) {
                throw new Error('El usuario no pertenece a tu clase');
            }
        } else {
            throw new Error('No tienes permisos para cambiar roles');
        }

        const sb = getSb();
        if (!sb) throw new Error('Supabase no disponible');

        const { data, error } = await sb
            .from('users')
            .update({ role: newRole })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        const updated = stripPassword(data);
        if (current && current.id === id) {
            currentUser = updated;
            saveSession(updated);
        }
        return updated;
    };

    window.deleteUser = async function(id) {
        const current = window.getCurrentUser();
        if (!current) throw new Error('No autenticado');
        if (id === 'owner') throw new Error('No se puede eliminar el Owner');
        
        const target = await window.getUserById(id);
        if (!target) throw new Error('Usuario no encontrado');
        
        if (current.role !== 'owner') {
            if (target.clase_id !== current.clase_id) throw new Error('No puedes eliminar usuarios de otra clase');
            if (target.role === 'admin') throw new Error('Solo el Owner puede eliminar Admins');
        }
        
        const sb = getSb();
        if (!sb) throw new Error('Supabase no disponible');
        
        const { error } = await sb.from('users').delete().eq('id', id);
        if (error) throw new Error(error.message);
        
        if (current && current.id === id) window.logoutUser();
        return true;
    };
    
    // ============================================================
    // INICIALIZACIÓN
    // ============================================================
    
    // Sembrar usuarios demo y cargar sesión existente
    seedDemoUsers();
    loadSession();
    
    console.log('✅ Users System cargado (Supabase)');
    console.log('🔑 Credenciales de prueba: owner/owner123 · admin1/admin123 · alumno/alumno123');
    
})();
