// ============================================================
// DASHBOARD - Panel principal del usuario
// ============================================================

(function() {
    'use strict';
    
    // Capturar la implementación real de restoreFromTrash (organization.js)
    const _orgRestoreFromTrash = window.restoreFromTrash;
    
    let currentFilter = 'all';
    let isLoading = false;
    
    // ============================================================
    // FILTRAR
    // ============================================================
    
    window.filterForms = function() {
        const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase()?.trim() || '';
        const cards = document.querySelectorAll('.form-card');
        let visibleCount = 0;
        
        cards.forEach(card => {
            // Usar getAttribute en lugar de dataset para mayor compatibilidad
            const title = card.getAttribute('data-title')?.toLowerCase() || '';
            const slug = card.getAttribute('data-slug')?.toLowerCase() || '';
            const matches = title.includes(searchTerm) || slug.includes(searchTerm);
            card.style.display = matches ? '' : 'none';
            if (matches) visibleCount++;
        });
        
        const container = document.getElementById('formList');
        const noResults = container?.querySelector('.no-results');
        if (visibleCount === 0 && cards.length > 0) {
            if (!noResults) {
                const div = document.createElement('div');
                div.className = 'no-results empty-state';
                div.innerHTML = `
                    <div class="empty-state-icon"><i data-lucide="search"></i></div>
                    <h3 class="empty-state-title">No se encontraron formularios</h3>
                    <p class="empty-state-subtitle">Prueba con otra búsqueda</p>
                `;
                container?.appendChild(div);
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        } else if (noResults) {
            noResults.remove();
        }
    };
    
    // ============================================================
    // RENDER
    // ============================================================
    
    window.renderDashboard = async function(forceRefresh = false) {
        const container = document.getElementById('formList');
        if (!container) return;
        
        if (isLoading) {
            console.log('⏳ Dashboard ya está cargando...');
            return;
        }
        
        const user = window.getCurrentUser();
        if (!user) {
            window.location.href = '../index.html';
            return;
        }
        
        // Cargar organización (favoritos/papelera) del usuario desde Supabase
        if (typeof window.initUserOrganization === 'function') {
            await window.initUserOrganization();
        }
        
        isLoading = true;
        
        container.innerHTML = ''
            + '<div class="skeleton skeleton-card" style="height:140px"></div>'
            + '<div class="skeleton skeleton-card" style="height:140px"></div>'
            + '<div class="skeleton skeleton-card" style="height:140px"></div>';
        
        try {
            if (!window.formsManager) {
                throw new Error('FormsManager no disponible');
            }
            
            // Si forceRefresh, recargar desde Supabase
            let forms;
            if (forceRefresh && typeof window.formsManager.refresh === 'function') {
                console.log('🔄 Forzando recarga desde Supabase...');
                forms = await window.formsManager.refresh();
            } else {
                forms = await window.formsManager.getAll();
            }
            
            console.log('📦 Formularios obtenidos:', forms?.length || 0);
            
            if (!forms || forms.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i data-lucide="pen-line"></i></div>
                        <h3 class="empty-state-title">No hay formularios</h3>
                        <p class="empty-state-subtitle">${['editor', 'admin', 'owner'].includes(user.role) ? 'Crea tu primer formulario' : 'No hay formularios disponibles'}</p>
                        ${['editor', 'admin', 'owner'].includes(user.role) ? `<a href="editor.html" class="btn-primary mt-4">+ Crear formulario</a>` : ''}
                    </div>
                `;
                return;
            }
            
            // Aplicar filtros
            switch(currentFilter) {
                case 'favorites':
                    forms = forms.filter(f => window.isFavorite && window.isFavorite(f.id));
                    break;
                case 'trash':
                    forms = forms.filter(f => window.isInTrash && window.isInTrash(f.id));
                    break;
                default:
                    forms = forms.filter(f => {
                        const inTrash = window.isInTrash ? window.isInTrash(f.id) : false;
                        return !inTrash;
                    });
                    break;
            }
            
            if (forms.length === 0) {
                const messages = {
                    'all': 'No hay formularios',
                    'favorites': 'No tienes formularios favoritos',
                    'trash': 'La papelera está vacía'
                };
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">${currentFilter === 'trash' ? '<i data-lucide="trash-2"></i>' : '<i data-lucide="pen-line"></i>'}</div>
                        <h3 class="empty-state-title">${messages[currentFilter] || 'No hay formularios'}</h3>
                        ${currentFilter === 'trash' ? `<button onclick="window.setFilter('all')" class="btn-primary mt-4">← Volver</button>` : ''}
                    </div>
                `;
                return;
            }
            
            // Obtener estadísticas
            const formsWithStats = await Promise.all(forms.map(async (form) => {
                try {
                    const stats = await window.responsesManager.getStats(form.id);
                    return { ...form, ...stats };
                } catch (e) {
                    return { ...form, total: 0, pending: 0, corrected: 0 };
                }
            }));
            
            let html = '';
            
            if (currentFilter === 'trash') {
                html += `
                    <div class="trash-header-actions">
                        <button onclick="window.setFilter('all')" class="btn-primary">← Volver al Dashboard</button>
                        <span class="trash-count"><i data-lucide="trash-2"></i> Papelera - ${forms.length} formulario(s)</span>
                    </div>
                `;
            }
            
            html += '<div class="dash-grid">';
            
            formsWithStats.forEach((form) => {
                const qCount = form.questions?.length || 0;
                const createdAt = window.formatDateShort?.(form.created_at) || 'Fecha desconocida';
                const isFavorite = window.isFavorite ? window.isFavorite(form.id) : false;
                const isInTrash = window.isInTrash ? window.isInTrash(form.id) : false;
                const isAdmin = ['admin', 'owner'].includes(user.role);
                const isEditor = ['editor', 'admin', 'owner'].includes(user.role);
                var statusInfo = window.getExamStatusInfo ? window.getExamStatusInfo(form.status || 'borrador') : null;
                
                html += `
                    <div class="form-card" data-title="${window.escapeHtml(form.title || 'Sin título')}" data-slug="${form.slug || ''}">
                        <div class="form-card-header">
                            <h3 class="form-card-title">${window.escapeHtml(form.title || 'Sin título')}</h3>
                            <div class="form-card-badges">
                                ${statusInfo ? '<span class="badge ' + statusInfo.badgeClass + '"><i data-lucide="' + statusInfo.icon + '" class="w-3 h-3"></i> ' + statusInfo.label + '</span>' : ''}
                                ${isAdmin && currentFilter !== 'trash' ? `
                                <button onclick="window.toggleFavoriteCard('${form.id}', event)" 
                                        class="favorite-btn ${isFavorite ? 'active' : ''}"
                                        style="background:none;border:none;cursor:pointer;color:${isFavorite ? '#F59E0B' : '#94A3B8'};">
                                    <i data-lucide="star" class="w-5 h-5"></i>
                                </button>
                                ` : ''}
                                ${isInTrash ? '<span class="badge badge-red"><i data-lucide="trash-2"></i> Papelera</span>' : ''}
                                <span class="badge badge-blue">${qCount} preguntas</span>
                            </div>
                        </div>
                        ${form.description ? `<p class="form-card-description">${window.escapeHtml(form.description)}</p>` : ''}
                        <div class="form-card-meta">
                            <span class="meta-item"><i data-lucide="calendar" class="w-3 h-3"></i> ${createdAt}</span>
                                ${form.allowmultiple ? '<span class="badge badge-orange"><i data-lucide="recycle"></i> Múltiple</span>' : ''}
                            ${form.total > 0 ? `<span class="badge badge-green">${form.total} respuestas</span>` : ''}
                        </div>
                        <div class="form-card-actions">
                            <a href="form-view.html?id=${form.id}" class="action-btn action-btn-view">
                                <i data-lucide="eye" class="w-4 h-4"></i>
                                <span>Ver</span>
                            </a>
                            ${isEditor ? `<a href="editor.html?id=${form.id}" class="action-btn action-btn-edit"><i data-lucide="edit-2" class="w-4 h-4"></i><span>Editar</span></a>` : ''}
                            ${isAdmin ? `
                                <a href="responses.html?form=${form.id}" class="action-btn action-btn-responses">
                                    <i data-lucide="bar-chart-2" class="w-4 h-4"></i>
                                    <span>Respuestas</span>
                                </a>
                            ` : ''}
                            ${isAdmin && !isInTrash ? `
                                <button onclick="window.deleteForm('${form.id}')" class="action-btn action-btn-delete">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            ` : ''}
                            ${isAdmin && isInTrash ? `
                                <button onclick="window.restoreFromTrash('${form.id}')" class="action-btn action-btn-restore">
                                    <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                                    <span>Restaurar</span>
                                </button>
                                <button onclick="window.permanentDeleteForm('${form.id}')" class="action-btn action-btn-delete">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // Actualizar estadísticas del dashboard
            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }
            
        } catch (error) {
            console.error('Error en dashboard:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i data-lucide="alert-triangle"></i></div>
                    <h3 class="empty-state-title">Error al cargar</h3>
                    <p class="empty-state-subtitle">${error.message || 'Error desconocido'}</p>
                    <button onclick="window.renderDashboard(true)" class="btn-primary mt-4"><i data-lucide="refresh-cw"></i> Reintentar</button>
                </div>
            `;
        } finally {
            isLoading = false;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    };
    
    // ============================================================
    // ACCIONES
    // ============================================================
    
    window.setFilter = function(filter) {
        if ((filter === 'favorites' || filter === 'trash') && !window.isAdmin()) return;
        currentFilter = filter;
        document.querySelectorAll('.dash-filter-tab').forEach(function(t) {
            t.classList.toggle('active', t.getAttribute('data-filter') === filter);
        });
        window.renderDashboard();
    };
    
    window.toggleFavoriteCard = function(formId, event) {
        if (!window.isAdmin()) {
            window.showNotification('Solo administradores pueden gestionar favoritos', 'warning');
            return;
        }
        event.stopPropagation();
        const isFavorite = window.toggleFavorite ? window.toggleFavorite(formId) : false;
        const btn = event.currentTarget;
        btn.style.color = isFavorite ? '#F59E0B' : '#94A3B8';
        btn.classList.toggle('active', isFavorite);
        window.showNotification(isFavorite ? 'Añadido a favoritos' : 'Eliminado de favoritos', 'info', 1500);
    };
    
    window.deleteForm = function(formId) {
        if (!window.isAdmin()) {
            window.showNotification('Solo administradores pueden eliminar', 'warning');
            return;
        }
        window.showConfirmDialog(
            'Eliminar formulario',
            '¿Estás seguro de que quieres mover este formulario a la papelera?',
            'Eliminar',
            'Cancelar',
            function() {
                if (window.moveToTrash) window.moveToTrash(formId);
                window.showNotification('Formulario movido a la papelera', 'success');
                window.renderDashboard(true);
            }
        );
    };
    
    window.restoreFromTrash = function(formId) {
        if (typeof _orgRestoreFromTrash === 'function') _orgRestoreFromTrash(formId);
        window.showNotification('Formulario restaurado', 'success');
        window.renderDashboard(true);
    };
    
    window.permanentDeleteForm = function(formId) {
        window.showConfirmDialog(
            'Eliminar permanentemente',
            'Esta acción no se puede deshacer. ¿Estás seguro?',
            'Eliminar',
            'Cancelar',
            function() {
                if (window.permanentlyDelete) window.permanentlyDelete(formId);
                window.showNotification('Formulario eliminado permanentemente', 'success');
                window.renderDashboard(true);
            }
        );
    };
    
    window.updateDashboardStats = function() {
        const forms = window.formsManager?.cache || [];
        const responses = window.responsesManager?.cache || [];
        
        const totalExamenes = document.getElementById('statTotalExamenes');
        const totalPreguntas = document.getElementById('statTotalPreguntas');
        const totalRespuestas = document.getElementById('statTotalRespuestas');
        const statNotaMedia = document.getElementById('statNotaMedia');
        
        if (totalExamenes) totalExamenes.textContent = forms.length;
        if (totalPreguntas) {
            totalPreguntas.textContent = forms.reduce((acc, f) => acc + (f.questions?.length || 0), 0);
        }
        if (totalRespuestas) totalRespuestas.textContent = responses.length;
        
        const completadas = responses.filter(r => r.correction?.completed);
        let notaMedia = 0;
        completadas.forEach(r => {
            const score = r.correction?.score || 0;
            const total = r.correction?.total || 0;
            if (total > 0) {
                notaMedia += (score / total) * 10;
            } else {
                notaMedia += score;
            }
        });
        notaMedia = completadas.length > 0 ? notaMedia / completadas.length : 0;
        if (statNotaMedia) statNotaMedia.textContent = notaMedia.toFixed(2);
    };
    
    console.log('✅ Dashboard cargado');
    
})();