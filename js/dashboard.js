// ============================================================
// DASHBOARD - Lista de formularios con organización
// ============================================================

(function() {
    'use strict';
    
    let currentFilter = 'all';
    
    // ============================================================
    // FILTRAR FORMULARIOS
    // ============================================================
    
    window.filterForms = function() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        const cards = document.querySelectorAll('.form-card');
        let visibleCount = 0;
        
        cards.forEach(card => {
            const title = card.dataset.title?.toLowerCase() || '';
            const slug = card.dataset.slug?.toLowerCase() || '';
            const matches = title.includes(searchTerm) || slug.includes(searchTerm);
            card.style.display = matches ? '' : 'none';
            if (matches) visibleCount++;
        });
        
        const container = document.getElementById('formList');
        let noResults = container.querySelector('.no-results');
        
        if (visibleCount === 0 && cards.length > 0) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.className = 'no-results empty-state';
                noResults.innerHTML = `
                    <div class="empty-state-icon">🔍</div>
                    <h3 class="empty-state-title">No se encontraron formularios</h3>
                    <p class="empty-state-subtitle">Prueba con otra búsqueda</p>
                `;
                container.appendChild(noResults);
            }
        } else if (noResults) {
            noResults.remove();
        }
    };
    
    // ============================================================
    // CAMBIAR FILTRO
    // ============================================================
    
    window.setFilter = function(filter) {
        currentFilter = filter;
        window.renderDashboard();
    };
    
    window.getCurrentFilter = function() {
        return currentFilter;
    };
    
    // ============================================================
    // RENDER DASHBOARD
    // ============================================================
    
    window.renderDashboard = async function() {
        const container = document.getElementById('formList');
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        const isAdmin = user?.role === 'admin';
        
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p class="text-gray-400">Cargando formularios...</p>
            </div>
        `;
        
        try {
            let forms = await window.formsManager.getAll();
            
            // Aplicar filtros
            switch(currentFilter) {
                case 'favorites':
                    forms = forms.filter(f => window.isFavorite && window.isFavorite(f.id));
                    break;
                case 'archived':
                    forms = forms.filter(f => window.isArchived && window.isArchived(f.id));
                    break;
                case 'trash':
                    forms = forms.filter(f => window.isInTrash && window.isInTrash(f.id));
                    break;
                default:
                    forms = forms.filter(f => {
                        const inTrash = window.isInTrash ? window.isInTrash(f.id) : false;
                        const archived = window.isArchived ? window.isArchived(f.id) : false;
                        return !inTrash && !archived;
                    });
                    break;
            }
            
            if (!forms || forms.length === 0) {
                const messages = {
                    'all': isAdmin ? 'No tienes formularios' : 'No hay formularios disponibles',
                    'favorites': 'No tienes formularios favoritos',
                    'archived': 'No hay formularios archivados',
                    'trash': 'La papelera está vacía'
                };
                const icons = {
                    'all': '📝',
                    'favorites': '⭐',
                    'archived': '📦',
                    'trash': '🗑️'
                };
                
                let extraButton = '';
                if (currentFilter === 'trash') {
                    extraButton = `
                        <button onclick="setFilter('all'); renderDashboard()" class="btn-secondary mt-4">
                            <i data-lucide="arrow-left" class="w-4 h-4"></i>
                            Volver al Dashboard
                        </button>
                    `;
                } else if (isAdmin && currentFilter === 'all') {
                    extraButton = `
                        <button onclick="showView('editor')" class="btn-primary mt-4">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            Crear formulario
                        </button>
                    `;
                }
                
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">${icons[currentFilter] || '📝'}</div>
                        <h3 class="empty-state-title">${messages[currentFilter] || 'No hay formularios'}</h3>
                        <p class="empty-state-subtitle">${currentFilter === 'trash' ? 'Los formularios eliminados aparecerán aquí' : isAdmin ? 'Comienza creando tu primer formulario' : 'No hay formularios disponibles para responder'}</p>
                        ${extraButton}
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }
            
            const formsWithStats = await Promise.all(forms.map(async (form) => {
                try {
                    const stats = await window.responsesManager.getStats(form.id);
                    return { ...form, ...stats };
                } catch (e) {
                    return { ...form, total: 0, pending: 0, corrected: 0 };
                }
            }));
            
            formsWithStats.sort((a, b) => {
                if (a.pending > 0 && b.pending === 0) return -1;
                if (a.pending === 0 && b.pending > 0) return 1;
                return new Date(b.created_at) - new Date(a.created_at);
            });
            
            let html = '';
            
            // Mostrar botón para volver si estamos en la papelera
            if (currentFilter === 'trash') {
                html += `
                    <div style="margin-bottom: 20px;">
                        <button onclick="setFilter('all'); renderDashboard()" class="btn-secondary">
                            <i data-lucide="arrow-left" class="w-4 h-4"></i>
                            Volver al Dashboard
                        </button>
                        <span class="text-sm text-gray-400 ml-4">🗑️ Papelera - ${forms.length} formulario(s)</span>
                    </div>
                `;
            }
            
            html += '<div class="forms-grid">';
            
            formsWithStats.forEach((form) => {
                const qCount = form.questions?.length || 0;
                const createdAt = form.created_at ? new Date(form.created_at).toLocaleDateString('es-ES', { 
                    day: '2-digit', month: 'short', year: 'numeric' 
                }) : 'Fecha desconocida';
                const hasResponses = form.total > 0;
                const hasPending = form.pending > 0;
                const allowMultiple = form.allowmultiple === true;
                const showAnswers = form.showanswers === true;
                const isFavorite = window.isFavorite ? window.isFavorite(form.id) : false;
                const isArchived = window.isArchived ? window.isArchived(form.id) : false;
                const isInTrash = window.isInTrash ? window.isInTrash(form.id) : false;
                const config = form.config || {};
                
                let cardClasses = 'form-card';
                if (hasPending) cardClasses += ' has-pending';
                if (isArchived) cardClasses += ' is-archived';
                if (isInTrash) cardClasses += ' is-trash';
                
                html += `
                    <div class="${cardClasses}" 
                         data-title="${Utils.escapeHtml(form.title || 'Sin título')}" 
                         data-slug="${form.slug || ''}">
                        <div class="form-card-header">
                            <h3 class="form-card-title">${Utils.escapeHtml(form.title || 'Sin título')}</h3>
                            <div class="form-card-badges">
                                ${isAdmin && currentFilter !== 'trash' ? `
                                <button onclick="toggleFavoriteCard('${form.id}', event)" 
                                        class="favorite-btn ${isFavorite ? 'active' : ''}"
                                        title="${isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}"
                                        style="background:none;border:none;cursor:pointer;color:${isFavorite ? '#F59E0B' : '#94A3B8'};">
                                    <i data-lucide="star" class="w-5 h-5"></i>
                                </button>
                                ` : ''}
                                ${isArchived ? '<span class="badge badge-orange">📦 Archivado</span>' : ''}
                                ${isInTrash ? '<span class="badge badge-red">🗑️ Papelera</span>' : ''}
                                <span class="badge badge-blue">${qCount} preguntas</span>
                            </div>
                        </div>
                        ${form.description ? `<p class="form-card-description">${Utils.escapeHtml(form.description)}</p>` : ''}
                        <div class="form-card-slug">${form.slug || ''}</div>
                        <div class="form-card-meta">
                            <span class="meta-item"><i data-lucide="calendar" class="w-3 h-3"></i> ${createdAt}</span>
                            ${allowMultiple ? '<span class="badge badge-orange">♻️ Múltiple</span>' : '<span class="badge badge-blue">🔒 Una vez</span>'}
                            ${showAnswers ? '<span class="badge badge-green">📖 Mostrar respuestas</span>' : ''}
                            ${config.timeLimit > 0 ? `<span class="badge badge-purple">⏱️ ${config.timeLimit}min</span>` : ''}
                            ${config.maxAttempts > 1 ? `<span class="badge badge-purple">🔄 ${config.maxAttempts} intentos</span>` : ''}
                            ${hasResponses ? `<span class="badge ${hasPending ? 'badge-orange' : 'badge-green'}">${form.total} respuestas ${hasPending ? `(${form.pending} pendientes)` : '✅'}</span>` : ''}
                        </div>
                        <div class="form-card-actions">
                            ${!isInTrash ? `
                                <!-- Ver - todos pueden ver -->
                                <button onclick="showView('form', '${form.id}')" class="action-btn action-btn-view" title="Ver formulario">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                    <span>Ver</span>
                                </button>
                                
                                <!-- Solo Admin puede editar -->
                                ${isAdmin ? `
                                <button onclick="editForm('${form.id}')" class="action-btn action-btn-edit" title="Editar formulario">
                                    <i data-lucide="edit-2" class="w-4 h-4"></i>
                                    <span>Editar</span>
                                </button>
                                ` : ''}
                                
                                <!-- Solo Admin puede ver respuestas -->
                                ${isAdmin ? `
                                <button onclick="showView('responses', '${form.id}')" 
                                        class="action-btn action-btn-responses ${hasPending ? 'has-pending' : ''}"
                                        title="Ver respuestas">
                                    <i data-lucide="bar-chart-2" class="w-4 h-4"></i>
                                    <span>Respuestas</span>
                                    ${hasResponses ? `<span class="response-badge ${hasPending ? 'pending' : ''}">${form.total}</span>` : ''}
                                </button>
                                ` : ''}
                                
                                <!-- Solo Admin puede compartir -->
                                ${isAdmin ? `
                                <button onclick="shareForm('${form.id}')" class="action-btn action-btn-share" title="Compartir">
                                    <i data-lucide="share-2" class="w-4 h-4"></i>
                                    <span>Compartir</span>
                                </button>
                                ` : ''}
                                
                                <!-- Solo Admin puede duplicar -->
                                ${isAdmin ? `
                                <button onclick="duplicateFormAction('${form.id}')" class="action-btn action-btn-duplicate" title="Duplicar">
                                    <i data-lucide="copy" class="w-4 h-4"></i>
                                    <span>Duplicar</span>
                                </button>
                                ` : ''}
                                
                                <!-- Solo Admin puede archivar/eliminar -->
                                ${isAdmin ? `
                                ${isArchived ? `
                                    <button onclick="unarchiveFormAction('${form.id}')" class="action-btn action-btn-restore" title="Restaurar">
                                        <i data-lucide="archive-restore" class="w-4 h-4"></i>
                                        <span>Restaurar</span>
                                    </button>
                                ` : `
                                    <button onclick="archiveFormAction('${form.id}')" class="action-btn action-btn-archive" title="Archivar">
                                        <i data-lucide="archive" class="w-4 h-4"></i>
                                        <span>Archivar</span>
                                    </button>
                                `}
                                <button onclick="deleteForm('${form.id}')" class="action-btn action-btn-delete" title="Eliminar">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                                ` : ''}
                            ` : `
                                <!-- En papelera - solo admin puede restaurar/eliminar -->
                                ${isAdmin ? `
                                <button onclick="restoreFromTrashAction('${form.id}')" class="action-btn action-btn-restore" title="Restaurar de papelera">
                                    <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                                    <span>Restaurar</span>
                                </button>
                                <button onclick="permanentDeleteForm('${form.id}')" class="action-btn action-btn-delete" title="Eliminar permanentemente">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    <span>Eliminar</span>
                                </button>
                                ` : ''}
                            `}
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;
            
            document.getElementById('searchInput').value = '';
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
        } catch (error) {
            console.error('Error en dashboard:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3 class="empty-state-title">Error de conexión</h3>
                    <p class="empty-state-subtitle">No se pudieron cargar los formularios</p>
                    <button onclick="renderDashboard()" class="btn-primary mt-4">
                        <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                        Reintentar
                    </button>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    };
    
    // ============================================================
    // FUNCIONES DE ORGANIZACIÓN (SOLO ADMIN)
    // ============================================================
    
    window.toggleFavoriteCard = function(formId, event) {
        if (!window.isAdmin || !window.isAdmin()) {
            Utils.showNotification('Solo el administrador puede gestionar favoritos', 'warning');
            return;
        }
        event.stopPropagation();
        const isFavorite = window.toggleFavorite ? window.toggleFavorite(formId) : false;
        
        const btn = event.currentTarget;
        if (isFavorite) {
            btn.style.color = '#F59E0B';
            btn.title = 'Quitar de favoritos';
            btn.classList.add('active');
        } else {
            btn.style.color = '';
            btn.title = 'Añadir a favoritos';
            btn.classList.remove('active');
        }
        
        Utils.showNotification(isFavorite ? '⭐ Añadido a favoritos' : '💔 Eliminado de favoritos', 'info', 1500);
    };
    
    window.archiveFormAction = function(formId) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (!confirm('📦 ¿Archivar este formulario?')) return;
        if (window.archiveForm) window.archiveForm(formId);
        Utils.showNotification('📦 Formulario archivado', 'info');
        window.renderDashboard();
    };
    
    window.unarchiveFormAction = function(formId) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (window.unarchiveForm) window.unarchiveForm(formId);
        Utils.showNotification('📦 Formulario restaurado', 'success');
        window.renderDashboard();
    };
    
    window.restoreFromTrashAction = function(formId) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (window.restoreFromTrash) window.restoreFromTrash(formId);
        Utils.showNotification('♻️ Formulario restaurado de la papelera', 'success');
        // Volver al dashboard después de restaurar
        window.setFilter('all');
        window.renderDashboard();
    };
    
    window.permanentDeleteForm = function(formId) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (!confirm('⚠️ ¿Estás seguro? Esta acción no se puede deshacer.')) return;
        if (window.permanentlyDelete) window.permanentlyDelete(formId);
        Utils.showNotification('🗑️ Formulario eliminado permanentemente', 'success');
        window.renderDashboard();
    };
    
    // ============================================================
    // DUPLICAR FORMULARIO (SOLO ADMIN)
    // ============================================================
    
    window.duplicateFormAction = async function(formId) {
        if (!window.isAdmin || !window.isAdmin()) {
            Utils.showNotification('Solo el administrador puede duplicar formularios', 'warning');
            return;
        }
        
        try {
            Utils.showNotification('Duplicando formulario...', 'info');
            
            const form = window.formsManager.cache.find(f => f.id === formId);
            if (!form) {
                Utils.showNotification('Formulario no encontrado', 'error');
                return;
            }
            
            const newTitle = prompt('Título para el formulario duplicado:', `${form.title} (copia)`);
            if (newTitle === null) return;
            if (!newTitle.trim()) {
                Utils.showNotification('El título es obligatorio', 'warning');
                return;
            }
            
            await window.formsManager.duplicate(formId, newTitle.trim());
            Utils.showNotification('✅ Formulario duplicado correctamente', 'success');
            window.renderDashboard();
            
        } catch (error) {
            console.error('Error al duplicar:', error);
            Utils.showNotification('❌ Error al duplicar: ' + error.message, 'error');
        }
    };
    
    // ============================================================
    // ELIMINAR FORMULARIO (SOLO ADMIN)
    // ============================================================
    
    window.deleteForm = async function(formId) {
        if (!window.isAdmin || !window.isAdmin()) {
            Utils.showNotification('Solo el administrador puede eliminar formularios', 'warning');
            return;
        }
        
        if (!confirm('⚠️ ¿Estás seguro de que quieres eliminar este formulario?\n\nSe moverá a la papelera.')) return;
        
        try {
            Utils.showNotification('Moviendo a papelera...', 'info');
            if (window.moveToTrash) window.moveToTrash(formId);
            Utils.showNotification('🗑️ Formulario movido a la papelera', 'success');
            window.renderDashboard();
        } catch (error) {
            Utils.showNotification('❌ Error al eliminar: ' + error.message, 'error');
        }
    };
    
    // ============================================================
    // COMPARTIR FORMULARIO (SOLO ADMIN)
    // ============================================================
    
    window.shareForm = function(formId) {
        if (!window.isAdmin || !window.isAdmin()) {
            Utils.showNotification('Solo el administrador puede compartir formularios', 'warning');
            return;
        }
        
        const form = window.formsManager.cache.find(f => f.id === formId);
        if (!form) {
            Utils.showNotification('Formulario no encontrado', 'error');
            return;
        }
        const url = `${Utils.getCurrentURL()}?form=${formId}`;
        const text = `📝 ${form.title}\n\nCompleta este formulario:\n${url}`;
        
        if (navigator.share) {
            navigator.share({ title: form.title, text: text, url: url }).catch(() => {
                Utils.copyToClipboard(url);
            });
        } else {
            Utils.copyToClipboard(url);
        }
    };
    
    // ============================================================
    // EDITAR FORMULARIO (SOLO ADMIN)
    // ============================================================
    
    window.editForm = function(formId) {
        if (!window.isAdmin || !window.isAdmin()) {
            Utils.showNotification('Solo el administrador puede editar formularios', 'warning');
            return;
        }
        window.editingId = formId;
        window.showView('editor');
    };
    
    // ============================================================
    // VER PAPELERA (SOLO ADMIN)
    // ============================================================
    
    window.showTrash = function() {
        if (!window.isAdmin || !window.isAdmin()) {
            Utils.showNotification('Solo el administrador puede acceder a la papelera', 'warning');
            return;
        }
        window.setFilter('trash');
    };
    
    // ============================================================
    // EXPORTAR FORMULARIO (SOLO ADMIN)
    // ============================================================
    
    window.exportForm = function(formId) {
        if (!window.isAdmin || !window.isAdmin()) {
            Utils.showNotification('Solo el administrador puede exportar formularios', 'warning');
            return;
        }
        
        const form = window.formsManager.cache.find(f => f.id === formId);
        if (!form) {
            Utils.showNotification('Formulario no encontrado', 'error');
            return;
        }
        
        const data = {
            title: form.title,
            description: form.description || '',
            questions: form.questions || [],
            config: form.config || {},
            allowmultiple: form.allowmultiple || false,
            showanswers: form.showanswers || false
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${form.slug || 'formulario'}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        Utils.showNotification('📄 Formulario exportado correctamente', 'success');
    };
    
    // ============================================================
    // IMPORTAR FORMULARIO (SOLO ADMIN)
    // ============================================================
    
    window.importForm = function() {
        if (!window.isAdmin || !window.isAdmin()) {
            Utils.showNotification('Solo el administrador puede importar formularios', 'warning');
            return;
        }
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (!data.title || !data.questions) {
                    Utils.showNotification('Archivo inválido', 'error');
                    return;
                }
                
                const title = prompt('Título para el formulario importado:', data.title);
                if (!title) return;
                
                const newForm = await window.formsManager.save(
                    null, title, data.questions, Utils.generateSlug(title)
                );
                
                if (data.config) {
                    await window.formsManager.updateConfig(newForm.id, data.config);
                }
                if (data.allowmultiple !== undefined || data.showanswers !== undefined) {
                    await window.formsManager.updateMeta(newForm.id, {
                        allowMultiple: data.allowmultiple || false,
                        showAnswers: data.showanswers || false,
                        description: data.description || ''
                    });
                }
                
                Utils.showNotification('✅ Formulario importado correctamente', 'success');
                window.renderDashboard();
                
            } catch (error) {
                Utils.showNotification('❌ Error al importar: ' + error.message, 'error');
            }
        };
        input.click();
    };
    
    // ============================================================
    // VOLVER AL DASHBOARD DESDE CUALQUIER FILTRO
    // ============================================================
    
    window.backToDashboard = function() {
        window.setFilter('all');
    };
    
    console.log('✅ Dashboard con permisos cargado');
    
})();