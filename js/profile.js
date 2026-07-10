// ============================================================
// PROFILE - Perfil de usuario (Admin / Alumno)
// ============================================================

(function() {
    'use strict';
    
    let currentUser = null;
    let allUsers = [];
    let currentTab = 'profile';
    
    // ============================================================
    // INICIALIZAR PERFIL
    // ============================================================
    
    window.initProfile = function() {
        currentUser = window.getCurrentUser ? window.getCurrentUser() : null;
        
        if (!currentUser) {
            Utils.showNotification('Debes iniciar sesión para acceder al perfil', 'warning');
            window.showView('dashboard');
            return;
        }
        
        renderProfile();
        renderSettingsTabs();
        
        if (currentUser.role === 'admin') {
            loadUsers();
        }
    };
    
    // ============================================================
    // RENDER PERFIL
    // ============================================================
    
    function renderProfile() {
        const container = document.getElementById('profileContent');
        if (!container) return;
        
        const isAdmin = currentUser.role === 'admin';
        const roleLabels = {
            'admin': '👑 Administrador',
            'alumno': '🎓 Alumno'
        };
        
        const roleColors = {
            'admin': 'role-admin',
            'alumno': 'role-student'
        };
        
        container.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <div class="profile-avatar">${currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : (currentUser.username ? currentUser.username.charAt(0).toUpperCase() : '?')}</div>
                    <div class="profile-info">
                        <h2>${Utils.escapeHtml(currentUser.fullName || currentUser.username)}</h2>
                        <span class="role-badge ${roleColors[currentUser.role] || 'role-student'}">${roleLabels[currentUser.role] || currentUser.role}</span>
                        <div class="profile-username">@${Utils.escapeHtml(currentUser.username)}</div>
                    </div>
                </div>
                
                <!-- SECCIÓN PERFIL - Admin puede cambiar nombre, usuario y contraseña -->
                <div id="profileTabContent" class="settings-tab-content active">
                    <div class="profile-section">
                        <h3 class="profile-section-title">👤 Información personal</h3>
                        ${isAdmin ? `
                        <div class="profile-field">
                            <span class="profile-field-label">Nombre completo</span>
                            <input type="text" id="profileFullName" class="profile-field-input" value="${Utils.escapeHtml(currentUser.fullName || currentUser.username)}" />
                        </div>
                        <div class="profile-field">
                            <span class="profile-field-label">Nombre de usuario</span>
                            <input type="text" id="profileUsername" class="profile-field-input" value="${Utils.escapeHtml(currentUser.username)}" />
                        </div>
                        <div class="profile-actions">
                            <button onclick="saveProfile()" class="btn-primary">
                                <i data-lucide="save" class="w-4 h-4"></i>
                                Guardar cambios
                            </button>
                        </div>
                        ` : `
                        <div class="profile-field">
                            <span class="profile-field-label">Nombre completo</span>
                            <span class="profile-field-value">${Utils.escapeHtml(currentUser.fullName || currentUser.username)}</span>
                        </div>
                        <div class="profile-field">
                            <span class="profile-field-label">Nombre de usuario</span>
                            <span class="profile-field-value">@${Utils.escapeHtml(currentUser.username)}</span>
                        </div>
                        <div class="profile-actions">
                            <span class="text-xs text-gray-400">💡 Los alumnos no pueden editar su perfil</span>
                        </div>
                        `}
                    </div>
                    
                    <!-- SECCIÓN CONTRASEÑA - Solo admin -->
                    ${isAdmin ? `
                    <div class="profile-section">
                        <h3 class="profile-section-title">🔒 Cambiar contraseña</h3>
                        <div class="profile-field">
                            <span class="profile-field-label">Nueva contraseña</span>
                            <input type="password" id="profilePassword" class="profile-field-input" placeholder="Nueva contraseña" />
                        </div>
                        <div class="profile-field">
                            <span class="profile-field-label">Confirmar</span>
                            <input type="password" id="profilePasswordConfirm" class="profile-field-input" placeholder="Confirmar contraseña" />
                        </div>
                        <div class="profile-actions">
                            <button onclick="changePassword()" class="btn-secondary">
                                <i data-lucide="key" class="w-4 h-4"></i>
                                Cambiar contraseña
                            </button>
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- ESTADÍSTICAS - Solo admin -->
                    ${isAdmin ? `
                    <div class="profile-section">
                        <h3 class="profile-section-title">📊 Estadísticas</h3>
                        <div class="profile-field">
                            <span class="profile-field-label">Rol</span>
                            <span class="profile-field-value">${roleLabels[currentUser.role] || currentUser.role}</span>
                        </div>
                        <div class="profile-field">
                            <span class="profile-field-label">Miembro desde</span>
                            <span class="profile-field-value">${currentUser.created_at ? Utils.formatDate(currentUser.created_at) : 'Fecha desconocida'}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <!-- GESTIÓN DE USUARIOS (SOLO ADMIN) -->
                ${isAdmin ? `
                <div id="usersTabContent" class="settings-tab-content">
                    <div class="users-management">
                        <div class="users-management-header">
                            <h3>👥 Gestión de Usuarios</h3>
                            <button onclick="showAddUserForm()" class="btn-primary btn-sm">
                                <i data-lucide="user-plus" class="w-4 h-4"></i>
                                Añadir usuario
                            </button>
                        </div>
                        
                        <div id="addUserFormContainer" style="display:none;">
                            <div class="add-user-form">
                                <input type="text" id="newFullName" class="form-input" placeholder="Nombre completo *" />
                                <input type="text" id="newUsername" class="form-input" placeholder="Usuario *" />
                                <input type="password" id="newPassword" class="form-input" placeholder="Contraseña *" />
                                <select id="newRole" class="form-input">
                                    <option value="alumno">🎓 Alumno</option>
                                    <option value="admin">👑 Admin</option>
                                </select>
                                <button onclick="addUser()" class="btn-primary">Añadir</button>
                                <button onclick="hideAddUserForm()" class="btn-secondary">Cancelar</button>
                            </div>
                        </div>
                        
                        <div class="users-table-wrapper">
                            <table class="users-table">
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Nombre</th>
                                        <th>Rol</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="usersTableBody">
                                    <tr><td colspan="4" class="text-center text-gray-400 py-8">Cargando usuarios...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons(), 100);
        }
        
        showSettingsTab(currentTab);
    };
    
    // ============================================================
    // PESTAÑAS DE AJUSTES
    // ============================================================
    
    function renderSettingsTabs() {
        const container = document.querySelector('.profile-card');
        if (!container) return;
        
        let tabsContainer = container.querySelector('.settings-tabs');
        if (tabsContainer) return;
        
        tabsContainer = document.createElement('div');
        tabsContainer.className = 'settings-tabs';
        
        const tabs = [
            { id: 'profile', label: '👤 Perfil' }
        ];
        
        if (currentUser.role === 'admin') {
            tabs.push({ id: 'users', label: '👥 Usuarios' });
        }
        
        tabs.forEach(tab => {
            const btn = document.createElement('button');
            btn.className = `settings-tab ${tab.id === currentTab ? 'active' : ''}`;
            btn.dataset.tab = tab.id;
            btn.textContent = tab.label;
            btn.onclick = () => showSettingsTab(tab.id);
            tabsContainer.appendChild(btn);
        });
        
        const header = container.querySelector('.profile-header');
        header.after(tabsContainer);
    }
    
    window.showSettingsTab = function(tabId) {
        currentTab = tabId;
        
        document.querySelectorAll('.settings-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const target = document.getElementById(tabId + 'TabContent');
        if (target) target.classList.add('active');
        
        if (tabId === 'users' && currentUser.role === 'admin') {
            loadUsers();
        }
    };
    
    // ============================================================
    // GUARDAR PERFIL (SOLO ADMIN)
    // ============================================================
    
    window.saveProfile = function() {
        if (!window.isAdmin()) {
            Utils.showNotification('Solo el administrador puede editar el perfil', 'warning');
            return;
        }
        
        const fullNameInput = document.getElementById('profileFullName');
        const usernameInput = document.getElementById('profileUsername');
        
        if (!fullNameInput || !usernameInput) return;
        
        const fullName = fullNameInput.value.trim();
        const username = usernameInput.value.trim();
        
        if (!fullName) {
            Utils.showNotification('El nombre completo no puede estar vacío', 'warning');
            fullNameInput.focus();
            return;
        }
        
        if (!username) {
            Utils.showNotification('El nombre de usuario no puede estar vacío', 'warning');
            usernameInput.focus();
            return;
        }
        
        const updates = { 
            fullName: fullName,
            username: username 
        };
        
        try {
            if (typeof window.updateUser === 'function') {
                window.updateUser(currentUser.id, updates);
                currentUser = window.getCurrentUser();
                Utils.showNotification('✅ Perfil actualizado correctamente', 'success');
                renderProfile();
            } else {
                const users = JSON.parse(localStorage.getItem('formpro_users') || '[]');
                const index = users.findIndex(u => u.id === currentUser.id);
                if (index !== -1) {
                    users[index] = { ...users[index], ...updates };
                    localStorage.setItem('formpro_users', JSON.stringify(users));
                    Utils.showNotification('✅ Perfil actualizado correctamente', 'success');
                    renderProfile();
                }
            }
        } catch (error) {
            Utils.showNotification('❌ Error al guardar: ' + error.message, 'error');
        }
    };
    
    // ============================================================
    // CAMBIAR CONTRASEÑA (SOLO ADMIN)
    // ============================================================
    
    window.changePassword = function() {
        if (!window.isAdmin()) {
            Utils.showNotification('Solo el administrador puede cambiar la contraseña', 'warning');
            return;
        }
        
        const password = document.getElementById('profilePassword').value.trim();
        const confirm = document.getElementById('profilePasswordConfirm').value.trim();
        
        if (!password) {
            Utils.showNotification('Introduce una nueva contraseña', 'warning');
            document.getElementById('profilePassword').focus();
            return;
        }
        
        if (password.length < 4) {
            Utils.showNotification('La contraseña debe tener al menos 4 caracteres', 'warning');
            return;
        }
        
        if (password !== confirm) {
            Utils.showNotification('Las contraseñas no coinciden', 'warning');
            document.getElementById('profilePasswordConfirm').focus();
            return;
        }
        
        try {
            if (typeof window.updateUser === 'function') {
                window.updateUser(currentUser.id, { password: password });
                Utils.showNotification('✅ Contraseña actualizada correctamente', 'success');
                document.getElementById('profilePassword').value = '';
                document.getElementById('profilePasswordConfirm').value = '';
            } else {
                const users = JSON.parse(localStorage.getItem('formpro_users') || '[]');
                const index = users.findIndex(u => u.id === currentUser.id);
                if (index !== -1) {
                    users[index].password = password;
                    localStorage.setItem('formpro_users', JSON.stringify(users));
                    Utils.showNotification('✅ Contraseña actualizada correctamente', 'success');
                    document.getElementById('profilePassword').value = '';
                    document.getElementById('profilePasswordConfirm').value = '';
                }
            }
        } catch (error) {
            Utils.showNotification('❌ Error al cambiar contraseña: ' + error.message, 'error');
        }
    };
    
    // ============================================================
    // GESTIÓN DE USUARIOS (SOLO ADMIN)
    // ============================================================
    
    function loadUsers() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        
        try {
            if (typeof window.getUsers === 'function') {
                allUsers = window.getUsers();
            } else {
                allUsers = JSON.parse(localStorage.getItem('formpro_users') || '[]');
            }
        } catch (e) {
            allUsers = [];
        }
        
        if (allUsers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-400 py-8">No hay usuarios registrados</td></tr>`;
            return;
        }
        
        const roleLabels = {
            'admin': '👑 Admin',
            'alumno': '🎓 Alumno'
        };
        
        const roleColors = {
            'admin': 'role-admin',
            'alumno': 'role-student'
        };
        
        tbody.innerHTML = allUsers.map(u => `
            <tr>
                <td><strong>@${Utils.escapeHtml(u.username)}</strong></td>
                <td>${Utils.escapeHtml(u.fullName || u.username)}</td>
                <td><span class="role-badge ${roleColors[u.role] || 'role-student'}">${roleLabels[u.role] || u.role}</span></td>
                <td>
                    <div class="user-actions">
                        ${u.id !== currentUser.id ? `
                            <button onclick="editUserModal('${u.id}')" class="btn-secondary btn-sm" title="Editar usuario">
                                <i data-lucide="edit-2" class="w-3 h-3"></i>
                            </button>
                            <button onclick="deleteUser('${u.id}')" class="btn-danger btn-sm" title="Eliminar">
                                <i data-lucide="trash-2" class="w-3 h-3"></i>
                            </button>
                        ` : `
                            <span class="text-xs text-gray-400">(tú)</span>
                        `}
                    </div>
                </td>
            </tr>
        `).join('');
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    // ============================================================
    // EDITAR USUARIO (MODAL)
    // ============================================================
    
    window.editUserModal = function(userId) {
        const user = allUsers.find(u => u.id === userId);
        if (!user) {
            Utils.showNotification('Usuario no encontrado', 'error');
            return;
        }
        
        // Crear modal simple
        const overlay = document.createElement('div');
        overlay.id = 'editUserModal';
        overlay.className = 'correction-modal-overlay';
        overlay.innerHTML = `
            <div class="correction-modal" style="max-width: 500px;">
                <div class="correction-modal-header">
                    <h2>✏️ Editar usuario</h2>
                    <button onclick="closeEditUserModal()" class="correction-modal-close">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>
                <div class="correction-modal-body">
                    <div class="form-group">
                        <label class="form-label">Nombre completo</label>
                        <input type="text" id="editFullName" class="form-input" value="${Utils.escapeHtml(user.fullName || user.username)}" />
                    </div>
                    <div class="form-group" style="margin-top:12px;">
                        <label class="form-label">Nombre de usuario</label>
                        <input type="text" id="editUsername" class="form-input" value="${Utils.escapeHtml(user.username)}" />
                    </div>
                    <div class="form-group" style="margin-top:12px;">
                        <label class="form-label">Nueva contraseña (dejar vacío para no cambiar)</label>
                        <input type="password" id="editPassword" class="form-input" placeholder="Nueva contraseña" />
                    </div>
                    <div class="form-group" style="margin-top:12px;">
                        <label class="form-label">Rol</label>
                        <select id="editRole" class="form-input">
                            <option value="alumno" ${user.role === 'alumno' ? 'selected' : ''}>🎓 Alumno</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>👑 Admin</option>
                        </select>
                    </div>
                    <div class="correction-actions" style="margin-top:16px;">
                        <button onclick="closeEditUserModal()" class="btn-secondary">Cancelar</button>
                        <button onclick="saveUserEdit('${userId}')" class="btn-primary">
                            <i data-lucide="save" class="w-4 h-4"></i>
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };
    
    window.closeEditUserModal = function() {
        const modal = document.getElementById('editUserModal');
        if (modal) {
            modal.classList.add('closing');
            setTimeout(() => modal.remove(), 300);
        }
    };
    
    window.saveUserEdit = function(userId) {
        const fullName = document.getElementById('editFullName').value.trim();
        const username = document.getElementById('editUsername').value.trim();
        const password = document.getElementById('editPassword').value.trim();
        const role = document.getElementById('editRole').value;
        
        if (!fullName) {
            Utils.showNotification('El nombre completo es obligatorio', 'warning');
            return;
        }
        if (!username) {
            Utils.showNotification('El nombre de usuario es obligatorio', 'warning');
            return;
        }
        
        const updates = { fullName, username, role };
        if (password) {
            if (password.length < 4) {
                Utils.showNotification('La contraseña debe tener al menos 4 caracteres', 'warning');
                return;
            }
            updates.password = password;
        }
        
        try {
            if (typeof window.updateUser === 'function') {
                window.updateUser(userId, updates);
                Utils.showNotification('✅ Usuario actualizado correctamente', 'success');
                closeEditUserModal();
                loadUsers();
            }
        } catch (error) {
            Utils.showNotification('❌ Error: ' + error.message, 'error');
        }
    };
    
    // ============================================================
    // CREAR USUARIO
    // ============================================================
    
    window.showAddUserForm = function() {
        const container = document.getElementById('addUserFormContainer');
        if (container) {
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
            if (container.style.display === 'block') {
                document.getElementById('newFullName')?.focus();
            }
        }
    };
    
    window.hideAddUserForm = function() {
        const container = document.getElementById('addUserFormContainer');
        if (container) container.style.display = 'none';
    };
    
    window.addUser = function() {
        const fullName = document.getElementById('newFullName').value.trim();
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value.trim();
        const role = document.getElementById('newRole').value;
        
        if (!fullName) {
            Utils.showNotification('El nombre completo es obligatorio', 'warning');
            document.getElementById('newFullName').focus();
            return;
        }
        
        if (!username) {
            Utils.showNotification('El nombre de usuario es obligatorio', 'warning');
            document.getElementById('newUsername').focus();
            return;
        }
        
        if (!password) {
            Utils.showNotification('La contraseña es obligatoria', 'warning');
            document.getElementById('newPassword').focus();
            return;
        }
        
        if (password.length < 4) {
            Utils.showNotification('La contraseña debe tener al menos 4 caracteres', 'warning');
            return;
        }
        
        try {
            if (typeof window.createUser === 'function') {
                window.createUser(fullName, username, password, role);
            }
            Utils.showNotification('✅ Usuario creado correctamente', 'success');
            document.getElementById('newFullName').value = '';
            document.getElementById('newUsername').value = '';
            document.getElementById('newPassword').value = '';
            hideAddUserForm();
            loadUsers();
        } catch (error) {
            Utils.showNotification('❌ Error al crear usuario: ' + error.message, 'error');
        }
    };
    
    // ============================================================
    // ELIMINAR USUARIO
    // ============================================================
    
    window.deleteUser = function(userId) {
        const user = allUsers.find(u => u.id === userId);
        if (!user) return;
        
        if (user.id === 'admin') {
            Utils.showNotification('No se puede eliminar el usuario administrador', 'warning');
            return;
        }
        
        if (!confirm(`⚠️ ¿Eliminar permanentemente al usuario "${user.fullName || user.username}"?`)) return;
        
        try {
            if (typeof window.deleteUser === 'function') {
                window.deleteUser(userId);
            }
            Utils.showNotification('Usuario eliminado', 'success');
            loadUsers();
        } catch (error) {
            Utils.showNotification('❌ Error: ' + error.message, 'error');
        }
    };
    
    // ============================================================
    // NAVEGACIÓN AL PERFIL
    // ============================================================
    
    window.showProfile = function() {
        window.showView('profile');
    };
    
    console.log('✅ Profile System cargado (Admin / Alumno)');
    
})();