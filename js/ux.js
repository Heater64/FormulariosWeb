// ============================================================
// UX - Experiencia de usuario moderna
// ============================================================

(function() {
    'use strict';
    
    // ============================================================
    // HISTORIAL PARA DESHACER/REHACER
    // ============================================================
    
    class HistoryManager {
        constructor(maxHistory = 50) {
            this.history = [];
            this.currentIndex = -1;
            this.maxHistory = maxHistory;
            this.isRestoring = false;
        }
        
        push(state) {
            if (this.isRestoring) return;
            
            // Eliminar estados futuros si estamos en medio del historial
            if (this.currentIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.currentIndex + 1);
            }
            
            // Añadir nuevo estado
            this.history.push(JSON.stringify(state));
            
            // Limitar historial
            if (this.history.length > this.maxHistory) {
                this.history.shift();
            }
            
            this.currentIndex = this.history.length - 1;
            this.updateButtons();
        }
        
        undo() {
            if (this.currentIndex <= 0) return null;
            this.currentIndex--;
            this.isRestoring = true;
            const state = JSON.parse(this.history[this.currentIndex]);
            this.isRestoring = false;
            this.updateButtons();
            return state;
        }
        
        redo() {
            if (this.currentIndex >= this.history.length - 1) return null;
            this.currentIndex++;
            this.isRestoring = true;
            const state = JSON.parse(this.history[this.currentIndex]);
            this.isRestoring = false;
            this.updateButtons();
            return state;
        }
        
        updateButtons() {
            const undoBtn = document.getElementById('undoBtn');
            const redoBtn = document.getElementById('redoBtn');
            if (undoBtn) {
                undoBtn.style.opacity = this.currentIndex > 0 ? '1' : '0.3';
                undoBtn.disabled = this.currentIndex <= 0;
            }
            if (redoBtn) {
                redoBtn.style.opacity = this.currentIndex < this.history.length - 1 ? '1' : '0.3';
                redoBtn.disabled = this.currentIndex >= this.history.length - 1;
            }
        }
        
        getCurrentState() {
            if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
                return JSON.parse(this.history[this.currentIndex]);
            }
            return null;
        }
    }
    
    // Inicializar historial
    const historyManager = new HistoryManager();
    window.historyManager = historyManager;
    
    // ============================================================
    // AUTOGUARDADO
    // ============================================================
    
    let autoSaveTimer = null;
    let isFormChanged = false;
    let lastSaveTime = null;
    let autoSaveInterval = 30000; // 30 segundos
    
    window.onFormChange = function() {
        isFormChanged = true;
        updateAutoSaveIndicator('⏳ Sin guardar', '#F59E0B');
        document.getElementById('saveButton').classList.add('btn-warning');
        
        // Guardar estado para historial
        saveStateToHistory();
        
        // Programar autoguardado
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            if (isFormChanged) {
                autoSave();
            }
        }, autoSaveInterval);
    };
    
    function saveStateToHistory() {
        const state = {
            title: document.getElementById('formTitle')?.value || '',
            questions: JSON.parse(JSON.stringify(window.tempQuestions || [])),
            allowMultiple: document.getElementById('allowMultiple')?.checked || false,
            showAnswers: document.getElementById('showAnswers')?.checked || false
        };
        historyManager.push(state);
    }
    
    window.restoreState = function(state) {
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
        
        updateAutoSaveIndicator('⏳ Sin guardar', '#F59E0B');
    };
    
    window.undoAction = function() {
        const state = historyManager.undo();
        if (state) {
            window.restoreState(state);
            Utils.showNotification('↩️ Deshecho', 'info', 1500);
        }
    };
    
    window.redoAction = function() {
        const state = historyManager.redo();
        if (state) {
            window.restoreState(state);
            Utils.showNotification('↪️ Rehecho', 'info', 1500);
        }
    };
    
    function updateAutoSaveIndicator(text, color = '#94A3B8') {
        const indicator = document.getElementById('autoSaveIndicator');
        if (indicator) {
            indicator.textContent = text;
            indicator.style.color = color;
        }
    }
    
    async function autoSave() {
        if (!isFormChanged) return;
        
        try {
            await window.saveForm(false); // false = no mostrar notificación
            isFormChanged = false;
            lastSaveTime = new Date();
            updateAutoSaveIndicator('✅ Guardado hace unos segundos', '#10B981');
            document.getElementById('saveButton')?.classList.remove('btn-warning');
        } catch (error) {
            console.error('Error en autoguardado:', error);
            updateAutoSaveIndicator('⚠️ Error al guardar', '#EF4444');
        }
    }
    
    // ============================================================
    // CONFIRMACIÓN ANTES DE SALIR
    // ============================================================
    
    window.handleBackNavigation = function() {
        if (isFormChanged && window.tempQuestions?.length > 0) {
            if (confirm('⚠️ Tienes cambios sin guardar. ¿Seguro que quieres salir?')) {
                // Resetear estado
                isFormChanged = false;
                window.tempQuestions = [];
                window.editingId = null;
                window.showView('dashboard');
            }
        } else {
            window.tempQuestions = [];
            window.editingId = null;
            window.showView('dashboard');
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
        // Ctrl+Z = Deshacer
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            window.undoAction();
            return;
        }
        
        // Ctrl+Y = Rehacer
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            window.redoAction();
            return;
        }
        
        // Ctrl+S = Guardar
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (window.saveForm) window.saveForm();
            return;
        }
        
        // Atajos para añadir preguntas
        if (e.ctrlKey && !e.shiftKey) {
            const shortcuts = {
                't': 'text',
                'a': 'textarea',
                'o': 'radio',
                'm': 'checkbox',
                'v': 'truefalse',
                'r': 'match',
                'e': 'order',
                'i': 'identify',
                'n': 'number',
                'g': 'image'
            };
            if (shortcuts[e.key] && typeof window.addQuestion === 'function') {
                e.preventDefault();
                window.addQuestion(shortcuts[e.key]);
                Utils.showNotification(`⌨️ Añadida: ${shortcuts[e.key]}`, 'info', 1000);
            }
        }
    });
    
    // ============================================================
    // DRAG & DROP CON SORTABLEJS
    // ============================================================
    
    let sortableInstance = null;
    
    window.initDragDrop = function() {
        const container = document.getElementById('questionsContainer');
        if (!container || typeof Sortable === 'undefined') return;
        
        // Destruir instancia anterior si existe
        if (sortableInstance) {
            sortableInstance.destroy();
        }
        
        sortableInstance = new Sortable(container, {
            animation: 300,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            handle: '.question-drag-handle',
            ghostClass: 'question-ghost',
            dragClass: 'question-dragging',
            onStart: function() {
                document.body.style.cursor = 'grabbing';
            },
            onEnd: function(evt) {
                document.body.style.cursor = '';
                // Reordenar array tempQuestions
                const from = evt.oldIndex;
                const to = evt.newIndex;
                if (from !== to && window.tempQuestions) {
                    const [removed] = window.tempQuestions.splice(from, 1);
                    window.tempQuestions.splice(to, 0, removed);
                    window.onFormChange();
                    // Re-renderizar para actualizar números
                    if (typeof window.renderQuestions === 'function') {
                        window.renderQuestions();
                    }
                    Utils.showNotification('🔄 Pregunta reordenada', 'info', 1000);
                }
            }
        });
    };
    
    // ============================================================
    // DUPLICAR PREGUNTA
    // ============================================================
    
    window.duplicateQuestion = function(index) {
        if (!window.tempQuestions || !window.tempQuestions[index]) return;
        
        const original = window.tempQuestions[index];
        const copy = JSON.parse(JSON.stringify(original));
        copy.id = Utils.generateId();
        copy.title = original.title + ' (copia)';
        
        window.tempQuestions.splice(index + 1, 0, copy);
        window.onFormChange();
        if (typeof window.renderQuestions === 'function') {
            window.renderQuestions();
        }
        Utils.showNotification('📋 Pregunta duplicada', 'success', 1500);
    };
    
    // ============================================================
    // COPIAR Y PEGAR PREGUNTA
    // ============================================================
    
    let copiedQuestion = null;
    
    window.copyQuestion = function(index) {
        if (!window.tempQuestions || !window.tempQuestions[index]) return;
        copiedQuestion = JSON.parse(JSON.stringify(window.tempQuestions[index]));
        Utils.showNotification('📋 Pregunta copiada', 'info', 1500);
    };
    
    window.pasteQuestion = function(index) {
        if (!copiedQuestion) {
            Utils.showNotification('⚠️ No hay pregunta copiada', 'warning');
            return;
        }
        
        const paste = JSON.parse(JSON.stringify(copiedQuestion));
        paste.id = Utils.generateId();
        paste.title = paste.title + ' (pegado)';
        
        window.tempQuestions.splice(index + 1, 0, paste);
        window.onFormChange();
        if (typeof window.renderQuestions === 'function') {
            window.renderQuestions();
        }
        Utils.showNotification('📋 Pregunta pegada', 'success', 1500);
    };
    
    // ============================================================
    // INDICADOR DE GUARDADO EN NAVBAR
    // ============================================================
    
    window.showSaveIndicator = function() {
        const indicator = document.getElementById('saveIndicator');
        if (indicator) {
            indicator.classList.remove('hidden');
            setTimeout(() => {
                indicator.classList.add('hidden');
            }, 3000);
        }
    };
    
    // ============================================================
    // ANIMACIONES - AÑADIR CLASES CSS
    // ============================================================
    
    // Inyectar estilos de animación adicionales
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        /* Animaciones suaves */
        .question-card {
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .question-card-enter {
            animation: slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        .question-card-exit {
            animation: slideUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        
        @keyframes slideUp {
            from {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
            to {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
            }
        }
        
        /* Drag & Drop */
        .question-ghost {
            opacity: 0.4;
            background: var(--primary-light);
            border: 2px dashed var(--primary);
        }
        
        .question-dragging {
            opacity: 0.8;
            transform: rotate(2deg) scale(1.02);
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        
        .question-drag-handle {
            cursor: grab;
            color: var(--gray-400);
            padding: 4px 8px;
            border-radius: 4px;
            transition: var(--transition);
            user-select: none;
        }
        
        .question-drag-handle:hover {
            background: var(--gray-100);
            color: var(--gray-600);
        }
        
        .question-drag-handle:active {
            cursor: grabbing;
        }
        
        /* Auto-save indicator */
        .auto-save-indicator {
            font-size: 12px;
            font-weight: 500;
            color: var(--gray-400);
            transition: var(--transition);
            padding: 4px 12px;
            border-radius: 20px;
            background: var(--gray-50);
        }
        
        .save-indicator {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #10B981;
            font-weight: 500;
            animation: fadeInOut 3s ease;
        }
        
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(-10px); }
            20% { opacity: 1; transform: translateX(0); }
            80% { opacity: 1; transform: translateX(0); }
            100% { opacity: 0; transform: translateX(10px); }
        }
        
        /* Botón de guardado con advertencia */
        .btn-warning {
            background: #F59E0B !important;
        }
        .btn-warning:hover {
            background: #D97706 !important;
        }
        
        /* Editor header actions */
        .editor-header-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: auto;
        }
        
        .btn-sm {
            padding: 4px 8px;
            font-size: 12px;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .editor-header {
                flex-wrap: wrap;
            }
            .editor-header-actions {
                width: 100%;
                justify-content: flex-end;
                margin-top: 8px;
            }
            .auto-save-indicator {
                font-size: 10px;
                padding: 2px 8px;
            }
        }
    `;
    document.head.appendChild(styleSheet);
    
    console.log('✅ UX System cargado correctamente');
    
})();