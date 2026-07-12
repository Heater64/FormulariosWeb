// ============================================================
// UX - Experiencia de usuario (drag & drop, autoguardado)
// ============================================================

(function() {
    'use strict';
    
    console.log('📦 Inicializando UX System...');
    
    // ============================================================
    // AUTOGUARDADO
    // ============================================================
    
    let autoSaveTimer = null;
    let isFormChanged = false;
    let autoSaveInterval = 30000;
    
    window.onFormChange = function() {
        isFormChanged = true;
        updateAutoSaveIndicator('Sin guardar', '#F59E0B');
        const saveBtn = document.getElementById('saveDraftButton');
        if (saveBtn) saveBtn.classList.add('btn-warning');
        
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(function() {
            if (isFormChanged && typeof window.saveForm === 'function') {
                window.saveForm('borrador', false);
                updateAutoSaveIndicator('Guardado autom\u00e1ticamente', '#10B981');
            }
        }, autoSaveInterval);
    };
    
    function updateAutoSaveIndicator(text, color) {
        var indicator = document.getElementById('autoSaveIndicator');
        if (indicator) {
            indicator.textContent = text;
            if (color) indicator.style.color = color;
            indicator.className = 'auto-save-indicator';
            if (text.indexOf('Guardado') >= 0) indicator.classList.add('auto-save-saved');
            if (text.indexOf('Sin guardar') >= 0) indicator.classList.add('auto-save-unsaved');
        }
    }
    
    // Exponer updateAutoSaveIndicator globalmente
    window.updateAutoSaveIndicator = updateAutoSaveIndicator;
    
    window.handleBackNavigation = function() {
        if (isFormChanged && window.tempQuestions?.length > 0) {
            window.showConfirmDialog(
                'Cambios sin guardar',
                'Tienes cambios sin guardar. \u00bfSeguro que quieres salir?',
                'Salir sin guardar',
                'Cancelar',
                function() {
                    window.tempQuestions = [];
                    window.editingId = null;
                    window.location.href = 'dashboard.html';
                },
                function() {
                    // Cancelar - no hacer nada
                }
            );
        } else {
            window.tempQuestions = [];
            window.editingId = null;
            window.location.href = 'dashboard.html';
        }
    };
    
    // Prevenir cierre de página con cambios sin guardar
    window.addEventListener('beforeunload', function(e) {
        if (isFormChanged && window.tempQuestions?.length > 0) {
            e.preventDefault();
            e.returnValue = 'Tienes cambios sin guardar. ¿Seguro que quieres salir?';
            return e.returnValue;
        }
    });
    
    // ============================================================
    // ATALOS DE TECLADO
    // ============================================================
    
    document.addEventListener('keydown', function(e) {
        // Ctrl+S = Guardar
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (typeof window.saveForm === 'function') {
                window.saveForm();
            }
            return;
        }
        
        // Ctrl+Z = Deshacer (solo en editor)
        if (e.ctrlKey && e.key === 'z' && window.location.pathname.includes('editor.html')) {
            e.preventDefault();
            if (typeof window.undoAction === 'function') {
                window.undoAction();
            }
            return;
        }
        
        // Ctrl+Y = Rehacer (solo en editor)
        if (e.ctrlKey && e.key === 'y' && window.location.pathname.includes('editor.html')) {
            e.preventDefault();
            if (typeof window.redoAction === 'function') {
                window.redoAction();
            }
            return;
        }
    });
    
    // ============================================================
    // ESTADOS DEL EXAMEN (helpers centralizados)
    // ============================================================

    window.getExamStatusInfo = function(status) {
        var map = {
            borrador:  { label: 'Borrador',  icon: 'file-edit',        color: '#6B7280', badgeClass: 'badge-gray' },
            preparado: { label: 'Preparado', icon: 'clock',            color: '#F59E0B', badgeClass: 'badge-orange' },
            publicado: { label: 'Publicado', icon: 'globe',            color: '#10B981', badgeClass: 'badge-green' },
            cerrado:   { label: 'Cerrado',   icon: 'lock',             color: '#EF4444', badgeClass: 'badge-red' },
            archivado: { label: 'Archivado', icon: 'archive',          color: '#8B5CF6', badgeClass: 'badge-purple' }
        };
        return map[status] || map.borrador;
    };

    window.renderStatusBadge = function(status, opts) {
        opts = opts || {};
        var info = window.getExamStatusInfo(status);
        var extra = opts.className ? ' ' + opts.className : '';
        return '<span class="badge ' + info.badgeClass + extra + '">'
            + '<i data-lucide="' + info.icon + '" class="w-3 h-3"></i> '
            + info.label + '</span>';
    };

    // ============================================================
    // DRAG & DROP (para editor)
    // ============================================================
    
    window.initDragDrop = function() {
        const container = document.getElementById('questionsContainer');
        if (!container || typeof Sortable === 'undefined') return;
        
        if (window._sortableInstance) {
            window._sortableInstance.destroy();
        }
        
        window._sortableInstance = new Sortable(container, {
            animation: 300,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            handle: '.question-drag-handle',
            ghostClass: 'question-ghost',
            dragClass: 'question-dragging',
            onEnd: function(evt) {
                const from = evt.oldIndex;
                const to = evt.newIndex;
                if (from !== to && window.tempQuestions) {
                    const [removed] = window.tempQuestions.splice(from, 1);
                    window.tempQuestions.splice(to, 0, removed);
                    if (typeof window.onFormChange === 'function') {
                        window.onFormChange();
                    }
                    if (typeof window.renderQuestions === 'function') {
                        window.renderQuestions();
                    }
                }
            }
        });
    };
    
    // ============================================================
    // DESHACER/REHACER (para editor)
    // ============================================================
    
    let history = [];
    let historyIndex = -1;
    
    window.undoAction = function() {
        if (historyIndex > 0) {
            historyIndex--;
            restoreState(history[historyIndex]);
        }
    };
    
    window.redoAction = function() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            restoreState(history[historyIndex]);
        }
    };
    
    function saveStateToHistory() {
        const state = {
            title: document.getElementById('formTitle')?.value || '',
            questions: JSON.parse(JSON.stringify(window.tempQuestions || [])),
            allowMultiple: document.getElementById('allowMultiple')?.checked || false,
            showAnswers: document.getElementById('showAnswers')?.checked || false
        };
        
        // Eliminar estados futuros
        if (historyIndex < history.length - 1) {
            history = history.slice(0, historyIndex + 1);
        }
        
        history.push(state);
        historyIndex = history.length - 1;
        
        // Limitar historial a 50
        if (history.length > 50) {
            history.shift();
            historyIndex--;
        }
    }
    
    function restoreState(state) {
        if (!state) return;
        
        const titleInput = document.getElementById('formTitle');
        const allowMultiple = document.getElementById('allowMultiple');
        const showAnswers = document.getElementById('showAnswers');
        const toggleMultiple = document.getElementById('allowMultipleToggle');
        const toggleAnswers = document.getElementById('showAnswersToggle');
        
        if (titleInput) titleInput.value = state.title || '';
        if (allowMultiple) {
            allowMultiple.checked = state.allowMultiple || false;
            if (toggleMultiple) toggleMultiple.classList.toggle('active', state.allowMultiple);
        }
        if (showAnswers) {
            showAnswers.checked = state.showAnswers || false;
            if (toggleAnswers) toggleAnswers.classList.toggle('active', state.showAnswers);
        }
        
        window.tempQuestions = state.questions || [];
        if (typeof window.renderQuestions === 'function') {
            window.renderQuestions();
        }
        
        if (typeof window.onFormChange === 'function') {
            window.onFormChange();
        }
    }
    
    // Guardar estado al cambiar
    const originalOnFormChange = window.onFormChange;
    if (originalOnFormChange) {
        window.onFormChange = function() {
            saveStateToHistory();
            originalOnFormChange();
        };
    }
    
    console.log('✅ UX System cargado');
    
})();