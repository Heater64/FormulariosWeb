(function() {
    'use strict';

    console.log('Inicializando Profile System...');

    var avatarColors = [
        '#7A4A28', '#5E7A57', '#C06B3E', '#4A6FA5', '#9B6B9B',
        '#B0803B', '#5F8B8B', '#A84439', '#3D7A6B', '#7A5E4A'
    ];

    function getAvatarColor(name) {
        if (!name) return avatarColors[0];
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return avatarColors[Math.abs(hash) % avatarColors.length];
    }

    window.initProfile = function() {
        var container = document.getElementById('profileContent');
        if (!container) { return; }

        var user = window.getCurrentUser();
        if (!user) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i data-lucide="lock"></i></div><h3 class="empty-state-title">Debes iniciar sesión</h3><a href="../index.html" class="btn-primary mt-4">← Volver al login</a></div>';
            return;
        }

        var roleLabels = {
            owner: 'Propietario',
            admin: 'Administrador',
            editor: 'Editor',
            usuario: 'Alumno'
        };
        var displayName = user.fullName || user.username || 'Usuario';
        var initial = displayName.charAt(0).toUpperCase();
        var avatarColor = getAvatarColor(displayName);
        var joinedDate = window.formatDate ? window.formatDate(user.created_at) : (user.created_at ? new Date(user.created_at).toLocaleDateString() : '—');

        // Compute stats
        var forms = window.formsManager ? (window.formsManager.cache || []) : [];
        var responses = window.responsesManager ? (window.responsesManager.cache || []) : [];
        var totalExams = forms.length;
        var totalResponses = responses.length;
        var completed = responses.filter(function(r) { return r.correction && r.correction.completed; });
        var avgGrade = 0;
        if (completed.length > 0) {
            var sum = 0;
            completed.forEach(function(r) {
                var score = r.correction.score || 0;
                var total = r.correction.total || 0;
                sum += total > 0 ? (score / total) * 10 : score;
            });
            avgGrade = sum / completed.length;
        }

        // Progress data from user
        var p = user.progress || {};
        var studiedCaps = (p.studiedChapters && p.studiedChapters.length) || 0;
        var memorizedVerses = (p.memorizados && p.memorizados.length) || 0;

        container.innerHTML =
            '<div class="profile-container">' +
            '  <div class="profile-card">' +

            '    <div class="profile-top">' +
            '      <div class="profile-avatar-wrap" style="background:' + avatarColor + '">' +
            '        <span class="profile-avatar-letter">' + escapeHtml(initial) + '</span>' +
            '      </div>' +
            '      <div class="profile-top-info">' +
            '        <h2 class="profile-name">' + escapeHtml(displayName) + '</h2>' +
            '        <span class="role-badge role-' + user.role + '">' + (roleLabels[user.role] || 'Usuario') + '</span>' +
            '        <span class="profile-username">@' + escapeHtml(user.username || '') + '</span>' +
            '      </div>' +
            '      <button class="profile-edit-btn" onclick="window.abrirEditProfile()" title="Editar perfil">' +
            '        <i data-lucide="pencil" class="w-4 h-4"></i>' +
            '      </button>' +
            '    </div>' +

            '    <div class="profile-stats">' +
            '      <div class="profile-stat">' +
            '        <span class="profile-stat-num">' + studiedCaps + '</span>' +
            '        <span class="profile-stat-label">Capítulos</span>' +
            '      </div>' +
            '      <div class="profile-stat">' +
            '        <span class="profile-stat-num">' + memorizedVerses + '</span>' +
            '        <span class="profile-stat-label">Versículos</span>' +
            '      </div>' +
            '      <div class="profile-stat">' +
            '        <span class="profile-stat-num">' + totalExams + '</span>' +
            '        <span class="profile-stat-label">Exámenes</span>' +
            '      </div>' +
            '      <div class="profile-stat">' +
            '        <span class="profile-stat-num">' + avgGrade.toFixed(1) + '</span>' +
            '        <span class="profile-stat-label">Nota media</span>' +
            '      </div>' +
            '    </div>' +

            '    <div class="profile-section">' +
            '      <h3 class="profile-section-title"><i data-lucide="info"></i> Información personal</h3>' +
            '      <div class="profile-field"><span class="profile-field-label">Nombre completo</span><span class="profile-field-value">' + escapeHtml(displayName) + '</span></div>' +
            '      <div class="profile-field"><span class="profile-field-label">Usuario</span><span class="profile-field-value">@' + escapeHtml(user.username || '') + '</span></div>' +
            '      <div class="profile-field"><span class="profile-field-label">Rol</span><span class="profile-field-value">' + (roleLabels[user.role] || 'Usuario') + '</span></div>' +
            '      <div class="profile-field"><span class="profile-field-label">Miembro desde</span><span class="profile-field-value">' + escapeHtml(joinedDate) + '</span></div>' +
            '      <div class="profile-field"><span class="profile-field-label">Clase</span><span class="profile-field-value">' + escapeHtml(user.clase_id || 'Sin clase') + '</span></div>' +
            '    </div>' +

            '    <div class="profile-section">' +
            '      <h3 class="profile-section-title"><i data-lucide="bar-chart-3"></i> Actividad académica</h3>' +
            '      <div class="profile-academic">' +
            '        <div class="profile-academic-item"><i data-lucide="clipboard-list" style="color:var(--primary)"></i><div><strong>' + totalExams + '</strong> exámenes creados</div></div>' +
            '        <div class="profile-academic-item"><i data-lucide="pen-line" style="color:var(--accent)"></i><div><strong>' + totalResponses + '</strong> respuestas enviadas</div></div>' +
            '        <div class="profile-academic-item"><i data-lucide="check-circle" style="color:var(--secondary)"></i><div><strong>' + completed.length + '</strong> corregidos</div></div>' +
            '      </div>' +
            '    </div>' +

            '    <div class="profile-actions">' +
            '      <a href="ajustes.html" class="btn btn-secondary" style="flex:1"><i data-lucide="settings"></i> Ajustes</a>' +
            '      <a href="estadisticas.html" class="btn btn-secondary" style="flex:1"><i data-lucide="bar-chart-3"></i> Estadísticas</a>' +
            '    </div>' +
            '  </div>' +
            '</div>';

        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    // ---- Edit profile ----
    window.abrirEditProfile = function() {
        var user = window.getCurrentUser();
        if (!user) return;
        var modal = document.getElementById('editProfileModal');
        if (!modal) return;
        var input = document.getElementById('editNombreCompleto');
        if (input) input.value = user.fullName || '';
        modal.style.display = 'flex';
        requestAnimationFrame(function() { modal.classList.add('active'); });
        if (input) input.focus();
    };

    window.cerrarEditProfile = function() {
        var modal = document.getElementById('editProfileModal');
        if (modal) { modal.classList.remove('active'); modal.style.display = 'none'; }
    };

    window.guardarEditProfile = async function() {
        var user = window.getCurrentUser();
        if (!user) return;
        var name = document.getElementById('editNombreCompleto').value.trim();
        if (!name) { window.showNotification('El nombre no puede estar vacío', 'warning'); return; }
        try {
            await window.updateUser(user.id, { fullName: name });
            window.showNotification('Perfil actualizado', 'success');
            window.cerrarEditProfile();
            if (typeof window.initProfile === 'function') window.initProfile();
        } catch (e) {
            window.showNotification('No se pudo guardar' + (e.message ? ': ' + e.message : ''), 'error');
        }
    };

    function escapeHtml(t) {
        if (!t) return '';
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(t);
        var d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    console.log('Profile System cargado');

})();
