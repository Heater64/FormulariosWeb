// ============================================================
// AJUSTES - Configuración de usuario
// ============================================================

    (function() {
    'use strict';
    
    const ROLES = {
        owner: 'Owner',
        admin: 'Admin',
        editor: 'Editor',
        usuario: 'Usuario'
    };

    console.log('Inicializando Ajustes System...');

    
    window.initAjustes = async function() {
        const container = document.getElementById('ajustesContent');
        if (!container) return;
        
        const user = window.getCurrentUser();
        if (!user) {
            container.innerHTML = '<p class="text-center text-gray-400">Debes iniciar sesión</p>';
            return;
        }
        
        // Usuarios de la clase (para la gestión)
        const users = (window.getUsers ? await window.getUsers() : []);
        const members = users.filter(u => u.clase_id === user.clase_id && u.id !== user.id);
        
        const config = user.configuracion || { tamano_texto: 'medio', alto_contraste: false };
        
        container.innerHTML = `
            <div class="ajustes-container">
                <!-- APARIENCIA -->
                <div class="ajustes-section">
                    <h3 class="ajustes-section-title"><i data-lucide="eye"></i> Apariencia</h3>
                    
                    <div class="ajustes-group">
                        <label class="ajustes-label">Tamaño de texto</label>
                        <div class="ajustes-tamano-texto">
                            <button class="btn-secondary ${config.tamano_texto === 'pequeno' ? 'active' : ''}" 
                                    onclick="window.cambiarTamanoTexto('pequeno')">
                                Pequeño
                            </button>
                            <button class="btn-secondary ${config.tamano_texto === 'medio' ? 'active' : ''}" 
                                    onclick="window.cambiarTamanoTexto('medio')">
                                Medio
                            </button>
                            <button class="btn-secondary ${config.tamano_texto === 'grande' ? 'active' : ''}" 
                                    onclick="window.cambiarTamanoTexto('grande')">
                                GRANDE
                            </button>
                        </div>
                    </div>
                    
                    <div class="ajustes-group">
                        <label class="ajustes-label">Modo alto contraste</label>
                        <div class="ajustes-toggle">
                            <label class="toggle-container ${config.alto_contraste ? 'active' : ''}">
                                <span class="toggle-switch ${config.alto_contraste ? 'active' : ''}"></span>
                                <span>${config.alto_contraste ? 'Activado' : 'Desactivado'}</span>
                                <input type="checkbox" ${config.alto_contraste ? 'checked' : ''} 
                                       onchange="window.toggleAltoContraste(this.checked)" style="display:none" />
                            </label>
                    </div>

                    <div class="ajustes-group">
                        <label class="ajustes-label">Sonidos (feedback auditivo)</label>
                        <div class="ajustes-toggle">
                            <label class="toggle-container ${config.sonidos ? 'active' : ''}">
                                <span class="toggle-switch ${config.sonidos ? 'active' : ''}"></span>
                                <span>${config.sonidos ? 'Activado' : 'Desactivado'}</span>
                                <input type="checkbox" ${config.sonidos ? 'checked' : ''} onchange="window.toggleSonidos(this.checked)" style="display:none" />
                            </label>
                        </div>
                    </div>

                    <div class="ajustes-group">
                        <label class="ajustes-label">Solo texto (sin ilustraciones)</label>
                        <div class="ajustes-toggle">
                            <label class="toggle-container ${config.solo_texto ? 'active' : ''}">
                                <span class="toggle-switch ${config.solo_texto ? 'active' : ''}"></span>
                                <span>${config.solo_texto ? 'Activado' : 'Desactivado'}</span>
                                <input type="checkbox" ${config.solo_texto ? 'checked' : ''} onchange="window.toggleSoloTexto(this.checked)" style="display:none" />
                            </label>
                        </div>
                    </div>
                    
                </div>
                
                <hr class="divider">
                
                <!-- CUENTA -->
                <div class="ajustes-section">
                    <h3 class="ajustes-section-title"><i data-lucide="user-round"></i> Cuenta</h3>
                    <div class="ajustes-group">
                        <div class="ajustes-cuenta">
                            <div><span class="ajustes-label">Nombre</span><div class="ajustes-valor">${window.escapeHtml(user.fullName || user.username)}</div></div>
                            <div><span class="ajustes-label">Usuario</span><div class="ajustes-valor">${window.escapeHtml(user.username)}</div></div>
                            <div><span class="ajustes-label">Rol</span><div class="ajustes-valor">${ROLES[user.role] || 'Usuario'}</div></div>
                        </div>
                        <a href="profile.html" class="btn btn-secondary btn-full" style="justify-content:space-between;margin-top:12px;">
                            <span>Ver perfil completo</span><i data-lucide="user"></i>
                        </a>
                    </div>
                </div>
                <hr class="divider">

                <!-- ACERCA DE -->
                <div class="ajustes-section">
                    <h3 class="ajustes-section-title">Acerca de</h3>
                    <div class="ajustes-group">
                        <p class="ajustes-hint">Estudio Bíblico — una plataforma calmada para leer, memorizar y crecer en las Escrituras.</p>
                        <p class="ajustes-hint">Versión 1.0 · Hecho con cuidado para tu paz.</p>
                    </div>
                </div>
                <hr class="divider">

                <!-- ZONA PELIGROSA -->
                <div class="ajustes-section ajustes-danger">
                    <h3 class="ajustes-section-title" style="color:var(--error-deep);"><i data-lucide="alert-triangle"></i> Zona Peligrosa</h3>

                    <div class="ajustes-group">
                        <button class="btn-danger btn-lg" onclick="window.reiniciarProgreso()"
                                style="width:100%;padding:16px;font-size:18px;">
                            <i data-lucide="trash-2"></i> REINICIAR TODO EL PROGRESO
                        </button>
                        <p class="ajustes-hint" style="color:var(--error-deep);">
                            Perderás todos tus datos de estudio. Esta acción no se puede deshacer.
                        </p>
                        <button class="btn-danger btn-lg" onclick="window.logout()"
                                style="width:100%;padding:16px;font-size:18px;margin-top:12px;">
                            <i data-lucide="log-out"></i> CERRAR SESIÓN
                        </button>
                    </div>
                </div>
                
                <hr class="divider">
                
                ${renderClaseSection(user, members)}

                <!-- PERMISOS -->
                <div class="ajustes-section">
                    <h3 class="ajustes-section-title"><i data-lucide="pen-line"></i> Permisos</h3>

                    ${user.role !== 'editor' && user.role !== 'admin' && user.role !== 'owner' ? `
                    <div class="ajustes-group">
                        <button class="btn-primary btn-lg" onclick="window.abrirSolicitudEditor()"
                                style="width:100%;padding:16px;font-size:18px;">
                            <i data-lucide="pen-line"></i> Solicitar ser Editor
                        </button>
                        <p class="ajustes-hint">Ayuda a crear exámenes para tu clase</p>
                    </div>
                    ` : `
                    <div class="ajustes-group">
                        <p class="text-green-500" style="font-size:16px;font-weight:600;">
                            Ya tienes permisos de Editor
                        </p>
                    </div>
                    `}
                </div>
            </div>
        `;
        
        aplicarTamanoTexto(config.tamano_texto);
        aplicarAltoContraste(config.alto_contraste);
        document.documentElement.setAttribute('data-solo-texto', config.solo_texto ? 'true' : 'false');
        document.documentElement.setAttribute('data-sonidos', config.sonidos ? 'true' : 'false');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    // ============================================================
    // SECCIÓN "MI CLASE" (admin)
    // ============================================================
    
    function renderClaseSection(user, members) {
        if (!window.isAdmin || !window.isAdmin()) return '';

        const c = user.configuracion || {};
        const clases = Array.isArray(c.clases) ? c.clases : [];
        const clase = clases.find(x => x.id === user.clase_id) || null;

        if (!clase) {
            return `
                <hr class="divider">
                <div class="ajustes-section">
                    <h3 class="ajustes-section-title"><i data-lucide="shield"></i> Mi clase</h3>
                    <div class="ajustes-group">
                        <p class="ajustes-hint">Aún no tienes una clase. Créala para empezar a añadir alumnos que podrán iniciar sesión.</p>
                        <button class="btn-primary btn-lg" onclick="window.abrirCrearClase()" style="width:100%;padding:16px;font-size:18px;">
                            <i data-lucide="plus"></i> Crear clase
                        </button>
                    </div>
                </div>`;
        }

        const lista = members.length === 0
            ? '<p class="ajustes-hint">Aún no hay usuarios en esta clase.</p>'
            : members.map(m => `
                <div class="admin-alumno-card">
                    <div class="admin-alumno-header">
                        <span class="admin-alumno-avatar">${(m.fullName || m.username || '?').charAt(0)}</span>
                        <div>
                            <div class="admin-alumno-nombre">${window.escapeHtml(m.fullName || m.username)}</div>
                            <div class="admin-alumno-username">@${window.escapeHtml(m.username)}</div>
                        </div>
                        <span class="role-badge role-${m.role}">${window.escapeHtml(m.role)}</span>
                    </div>
                    <div class="admin-alumno-actions" style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
                        <button class="btn-secondary btn-sm" onclick="window.abrirEditarUsuario('${m.id}')">
                            <i data-lucide="edit-2"></i> Editar
                        </button>
                        <button class="btn-danger btn-sm" onclick="window.eliminarUsuarioClase('${m.id}')">
                            <i data-lucide="trash-2"></i> Eliminar
                        </button>
                    </div>
                </div>`).join('');

        return `
            <hr class="divider">
            <div class="ajustes-section">
                <h3 class="ajustes-section-title"><i data-lucide="shield"></i> Mi clase</h3>
                <div class="ajustes-group">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                        <div>
                            <div class="ajustes-label">Nombre de la clase</div>
                            <div class="ajustes-valor" style="font-size:18px;font-weight:700;">${window.escapeHtml(clase.nombre)}</div>
                        </div>
                        <button class="btn-secondary" onclick="window.abrirCrearClase()">
                            <i data-lucide="edit-2"></i> Cambiar nombre
                        </button>
                    </div>
                </div>
                <div class="ajustes-group">
                        <button class="btn-primary btn-lg" onclick="window.abrirAnadirUsuario()" style="width:100%;padding:16px;font-size:18px;">
                            <i data-lucide="plus"></i> Añadir usuario
                        </button>
                    <p class="ajustes-hint">El usuario podrá iniciar sesión en cuanto lo crees.</p>
                </div>
                <div class="ajustes-group">
                    <div class="ajustes-label">Usuarios de la clase (${members.length})</div>
                    <div class="ajustes-usuarios-lista">${lista}</div>
                </div>
                <div class="ajustes-group">
                    <a href="admin.html" class="btn btn-secondary btn-full" style="justify-content:space-between;">
                        <span>Panel de la clase</span><i data-lucide="users"></i>
                    </a>
                    ${window.isOwner && window.isOwner() ? `
                    <a href="owner.html" class="btn btn-secondary btn-full mt-2" style="justify-content:space-between;">
                        <span>Panel global (Owner)</span><i data-lucide="crown"></i>
                    </a>` : ''}
                </div>
            </div>`;
    }

    // ---------- Crear / renombrar clase ----------
    window.abrirCrearClase = function() {
        const user = window.getCurrentUser();
        if (!user) return;
        const c = user.configuracion || {};
        const clases = Array.isArray(c.clases) ? c.clases : [];
        const clase = clases.find(x => x.id === user.clase_id) || null;
        const modal = document.getElementById('crearClaseModal');
        if (!modal) return;
        const input = document.getElementById('claseNombre');
        input.value = clase ? clase.nombre : '';
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('active'));
        input.focus();
    };

    window.cerrarCrearClase = function() {
        const modal = document.getElementById('crearClaseModal');
        if (modal) { modal.classList.remove('active'); modal.style.display = 'none'; }
    };

    window.guardarClase = async function() {
        const user = window.getCurrentUser();
        if (!user) return;
        const nombre = (document.getElementById('claseNombre').value || '').trim();
        if (!nombre) {
            window.showNotification('Escribe un nombre para la clase', 'warning');
            return;
        }
        const c = user.configuracion || {};
        const clases = Array.isArray(c.clases) ? c.clases.slice() : [];
        const existente = clases.find(x => x.id === user.clase_id) || null;
        let clase_id = user.clase_id;
        if (existente) {
            existente.nombre = nombre;
        } else {
            clase_id = 'clase_' + (window.generateId ? window.generateId() : Date.now().toString());
            clases.push({ id: clase_id, nombre: nombre });
        }
        try {
            const updates = { configuracion: { ...c, clases: clases } };
            if (!existente) updates.clase_id = clase_id;
            await window.updateUser(user.id, updates);
            window.showNotification('Clase guardada', 'success');
            window.cerrarCrearClase();
            if (typeof window.initAjustes === 'function') window.initAjustes();
        } catch (e) {
            window.showNotification('No se pudo guardar' + (e.message ? ': ' + e.message : ''), 'error');
        }
    };

    // ---------- Añadir usuario ----------
    window.abrirAnadirUsuario = function() {
        const user = window.getCurrentUser();
        if (!user || !user.clase_id) {
            window.showNotification('Primero crea una clase', 'warning');
            return;
        }
        const modal = document.getElementById('anadirUsuarioModal');
        if (!modal) return;
        document.getElementById('usuNombre').value = '';
        document.getElementById('usuUsuario').value = '';
        document.getElementById('usuPassword').value = '';
        document.getElementById('usuRol').value = 'usuario';
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('active'));
        document.getElementById('usuNombre').focus();
    };

    window.cerrarAnadirUsuario = function() {
        const modal = document.getElementById('anadirUsuarioModal');
        if (modal) { modal.classList.remove('active'); modal.style.display = 'none'; }
    };

    window.guardarUsuario = async function() {
        const admin = window.getCurrentUser();
        if (!admin || !admin.clase_id) return;
        const fullName = (document.getElementById('usuNombre').value || '').trim();
        const username = (document.getElementById('usuUsuario').value || '').trim();
        const password = (document.getElementById('usuPassword').value || '').trim();
        const role = document.getElementById('usuRol').value || 'usuario';
        if (!fullName || !username || !password) {
            window.showNotification('Completa nombre, usuario y contraseña', 'warning');
            return;
        }
        try {
            await window.createUser(fullName, username, password, role, admin.clase_id);
            window.showNotification('Usuario creado. Ya puede iniciar sesión.', 'success');
            window.cerrarAnadirUsuario();
            if (typeof window.initAjustes === 'function') window.initAjustes();
        } catch (e) {
            window.showNotification('No se pudo crear' + (e.message ? ': ' + e.message : ''), 'error');
        }
    };

    // ---------- Editar usuario (nombre / contraseña) ----------
    window.abrirEditarUsuario = async function(id) {
        const users = window.getUsers ? await window.getUsers() : [];
        const u = users.find(x => x.id === id);
        if (!u) return;
        const modal = document.getElementById('editarUsuarioModal');
        if (!modal) return;
        document.getElementById('editUserId').value = id;
        document.getElementById('editNombre').value = u.fullName || '';
        document.getElementById('editPassword').value = '';
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('active'));
        document.getElementById('editNombre').focus();
    };

    window.cerrarEditarUsuario = function() {
        const modal = document.getElementById('editarUsuarioModal');
        if (modal) { modal.classList.remove('active'); modal.style.display = 'none'; }
    };

    window.guardarEditarUsuario = async function() {
        const id = document.getElementById('editUserId').value;
        const fullName = (document.getElementById('editNombre').value || '').trim();
        const password = (document.getElementById('editPassword').value || '').trim();
        if (!fullName) {
            window.showNotification('El nombre no puede estar vacío', 'warning');
            return;
        }
        if (password && password.length < 4) {
            window.showNotification('La contraseña debe tener al menos 4 caracteres', 'warning');
            return;
        }
        try {
            const updates = { fullName: fullName };
            if (password) updates.password = password;
            await window.updateUser(id, updates);
            window.showNotification('Usuario actualizado', 'success');
            window.cerrarEditarUsuario();
            if (typeof window.initAjustes === 'function') window.initAjustes();
        } catch (e) {
            window.showNotification('No se pudo actualizar' + (e.message ? ': ' + e.message : ''), 'error');
        }
    };

    window.eliminarUsuarioClase = function(id) {
        window.showConfirmDialog(
            'Eliminar usuario',
            'Se eliminará este usuario y sus datos de la clase. Esta acción no se puede deshacer.',
            'Eliminar',
            'Cancelar',
            async function() {
                try {
                    await window.deleteUser(id);
                    window.showNotification('Usuario eliminado', 'success');
                    if (typeof window.initAjustes === 'function') window.initAjustes();
                } catch (e) {
                    window.showNotification('No se pudo eliminar' + (e.message ? ': ' + e.message : ''), 'error');
                }
            }
        );
    };
    
    window.cambiarTamanoTexto = function(tamano) {
        const user = window.getCurrentUser();
        if (!user) return;
        
        if (!user.configuracion) user.configuracion = {};
        user.configuracion.tamano_texto = tamano;
        window.updateUser(user.id, { configuracion: user.configuracion });
        
        aplicarTamanoTexto(tamano);
        document.documentElement.setAttribute('data-tamano-texto', tamano);
        
        window.showNotification(`Tamaño de texto: ${tamano}`, 'success', 1500);
    };
    
    function aplicarTamanoTexto(tamano) {
        const root = document.documentElement;
        const sizes = { pequeno: '14px', medio: '18px', grande: '24px' };
        root.style.fontSize = sizes[tamano] || '18px';
    }
    
    window.toggleAltoContraste = function(activado) {
        const user = window.getCurrentUser();
        if (!user) return;
        
        if (!user.configuracion) user.configuracion = {};
        user.configuracion.alto_contraste = activado;
        window.updateUser(user.id, { configuracion: user.configuracion });
        
        aplicarAltoContraste(activado);
        document.documentElement.setAttribute('data-alto-contraste', activado ? 'true' : 'false');
        
        window.showNotification(activado ? 'Alto contraste activado' : 'Alto contraste desactivado', 'success', 1500);
    };
    
    function aplicarAltoContraste(activado) {
        // El modo real lo controla el CSS vía [data-alto-contraste="true"]
        document.documentElement.setAttribute('data-alto-contraste', activado ? 'true' : 'false');
    }

    window.toggleSonidos = function(activado) {
        const user = window.getCurrentUser();
        if (!user) return;
        if (!user.configuracion) user.configuracion = {};
        user.configuracion.sonidos = activado;
        window.updateUser(user.id, { configuracion: user.configuracion });
        document.documentElement.setAttribute('data-sonidos', activado ? 'true' : 'false');
        if (activado && window.reproducirSonido) window.reproducirSonido();
        window.showNotification(activado ? 'Sonidos activados' : 'Sonidos desactivados', 'success', 1500);
    };

    window.toggleSoloTexto = function(activado) {
        const user = window.getCurrentUser();
        if (!user) return;
        if (!user.configuracion) user.configuracion = {};
        user.configuracion.solo_texto = activado;
        window.updateUser(user.id, { configuracion: user.configuracion });
        document.documentElement.setAttribute('data-solo-texto', activado ? 'true' : 'false');
        window.showNotification(activado ? 'Modo solo texto activado' : 'Modo solo texto desactivado', 'success', 1500);
    };

    window.reproducirSonido = function() {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = 440;
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
            o.connect(g);
            g.connect(ctx.destination);
            o.start();
            o.stop(ctx.currentTime + 0.26);
        } catch (e) {}
    };
    
    window.reiniciarProgreso = function() {
        const mensaje = 'Perderás:' +
            '<ul style="text-align:left;margin:10px 0;padding-left:18px;color:var(--gray-600);">' +
            '<li>Todos los capítulos completados</li>' +
            '<li>Todas tus notas</li>' +
            '<li>Todos los versículos memorizados</li>' +
            '<li>Todo tu progreso en exámenes</li>' +
            '</ul><strong>Esta acción NO se puede deshacer.</strong>';
        window.showConfirmDialog(
            '¿Seguro que quieres reiniciar todo tu progreso?',
            mensaje,
            'Sí, quiero continuar',
            'Cancelar',
            function() { window.abrirReiniciarTexto(); }
        );
    };

    window.abrirReiniciarTexto = function() {
        const modal = document.getElementById('reiniciarTextoModal');
        if (!modal) return;
        const input = document.getElementById('reiniciarInput');
        const btn = document.getElementById('reiniciarConfirmarBtn');
        input.value = '';
        btn.disabled = true;
        input.oninput = function() {
            btn.disabled = input.value.trim().toUpperCase() !== 'REINICIAR';
        };
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('active'));
        input.focus();
    };

    window.cerrarReiniciarTexto = function() {
        const modal = document.getElementById('reiniciarTextoModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    };

    window.reiniciarPaso3 = function() {
        const val = (document.getElementById('reiniciarInput').value || '').trim().toUpperCase();
        if (val !== 'REINICIAR') {
            window.showNotification('Debes escribir REINICIAR para confirmar', 'warning');
            return;
        }
        window.cerrarReiniciarTexto();
        window.showConfirmDialog(
            'CONFIRMACIÓN FINAL',
            'Todos tus datos serán eliminados permanentemente. ¿Confirmas?',
            'Sí, eliminar todo',
            'No, cancelar',
            function() { window.ejecutarReinicio(); }
        );
    };

    window.ejecutarReinicio = async function() {
        const user = window.getCurrentUser();
        if (!user) return;
        const progresoVacio = {
            studiedChapters: [],
            versiculos: [],
            librosMemorizados: [],
            autoresMemorizados: []
        };
        try {
            await window.updateUser(user.id, { progress: progresoVacio });
        } catch (e) {
            console.warn('No se pudo guardar el reinicio:', e.message);
        }
        if (window.responsesManager && typeof window.responsesManager.clearCache === 'function') {
            window.responsesManager.clearCache();
        }
        if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
        window.showNotification('Todos tus datos han sido eliminados', 'success');
        setTimeout(function() { window.location.href = 'dashboard.html'; }, 1300);
    };
    
    window.abrirSolicitudEditor = async function() {
        const user = window.getCurrentUser();
        if (!user || user.role !== 'usuario') {
            window.showNotification('Solo los usuarios pueden solicitar ser Editor', 'warning');
            return;
        }

        // Comprobar limitaciones (una vez por mes / 30 días tras rechazo)
        const sb = window.supabaseClient;
        if (sb) {
            try {
                const { data, error } = await sb
                    .from('editor_requests')
                    .select('*')
                    .eq('usuario_id', user.id)
                    .order('fecha', { ascending: false })
                    .limit(1);
                if (!error && data && data.length > 0) {
                    const ultima = data[0];
                    const dias = (Date.now() - new Date(ultima.fecha).getTime()) / (1000 * 60 * 60 * 24);
                    if (ultima.estado === 'pendiente') {
                        window.showNotification('Ya tienes una solicitud pendiente', 'warning');
                        return;
                    }
                    if (ultima.estado === 'rechazada' && dias < 30) {
                        const restan = Math.ceil(30 - dias);
                        window.showNotification(`Podrás volver a solicitarlo en ${restan} día(s)`, 'warning');
                        return;
                    }
                    if (dias < 30) {
                        const restan = Math.ceil(30 - dias);
                        window.showNotification(`Solo puedes solicitarlo una vez al mes (${restan} día(s) restantes)`, 'warning');
                        return;
                    }
                }
            } catch (e) { /* continuar */ }
        }

        const modal = document.getElementById('solicitudEditorModal');
        if (modal) {
            document.getElementById('solNombre').value = user.fullName || user.username || '';
            document.getElementById('solClase').value = user.clase_id || '—';
            document.getElementById('solMotivo').value = '';
            document.getElementById('solExperiencia').value = '';
            modal.style.display = 'flex';
            requestAnimationFrame(() => modal.classList.add('active'));
        }
    };

    window.cerrarSolicitudEditor = function() {
        const modal = document.getElementById('solicitudEditorModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    };

    window.enviarSolicitudEditor = async function() {
        const user = window.getCurrentUser();
        if (!user) return;

        const motivo = document.getElementById('solMotivo').value.trim();
        const experiencia = document.getElementById('solExperiencia').value.trim();

        if (!motivo || !experiencia) {
            window.showNotification('Completa el motivo y la experiencia', 'warning');
            return;
        }

        const sb = window.supabaseClient;
        if (!sb) {
            window.showNotification('❌ Sin conexión a la base de datos', 'error');
            return;
        }

        try {
            const { data: req, error } = await sb.from('editor_requests').insert({
                usuario_id: user.id,
                usuario_nombre: user.fullName || user.username,
                clase: user.clase_id || null,
                motivo,
                experiencia,
                estado: 'pendiente'
            }).select().single();

            if (error) throw new Error(error.message);

            // Notificar al admin de la clase
            if (user.clase_id) {
                const { data: admins } = await sb
                    .from('users')
                    .select('username')
                    .eq('clase_id', user.clase_id)
                    .eq('role', 'admin')
                    .limit(1);
                if (admins && admins.length > 0) {
                    await sb.from('notificaciones').insert({
                        destinatario: admins[0].username,
                        titulo: 'Nueva solicitud de Editor',
                        mensaje: `${user.fullName || user.username} quiere ser Editor en tu clase.`,
                        tipo: 'info'
                    });
                }
            }

            window.cerrarSolicitudEditor();
            window.showNotification('Solicitud enviada correctamente', 'success');
        } catch (err) {
            console.error(err);
            window.showNotification('No se pudo enviar' + (err.message ? ': ' + err.message : ''), 'error');
        }
    };
    
    console.log('Ajustes System cargado');
    
})();