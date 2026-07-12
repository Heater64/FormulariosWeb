// ============================================================
// FORMS - CRUD de formularios (100% Supabase)
// ============================================================

(function() {
    'use strict';
    
    console.log('📦 Inicializando FormsManager (Supabase)...');
    
    class FormsManager {
        constructor(supabase) {
            this.supabase = supabase;
            this.cache = [];
            this.isLoading = false;
            console.log('✅ FormsManager instanciado');
        }
        
        generateId() {
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substring(2, 8);
            return `form_${timestamp}_${random}`;
        }
        
        generateSlug(title) {
            if (!title) return 'sin-titulo';
            return title
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .substring(0, 50) || 'sin-titulo';
        }
        
        // Procesar filas de Supabase a objetos de la app
        _process(rows) {
            return (rows || []).map(form => {
                let questions = form.questions;
                if (typeof questions === 'string') {
                    try { questions = JSON.parse(questions); } catch (e) { questions = []; }
                }
                if (!Array.isArray(questions)) questions = [];
                
                let config = form.config;
                if (typeof config === 'string') {
                    try { config = JSON.parse(config); } catch (e) { config = {}; }
                }
                if (!config || typeof config !== 'object') config = {};
                
                return {
                    ...form,
                    questions,
                    config,
                    allowmultiple: form.allowmultiple === true || form.allowmultiple === 'true',
                    showanswers: form.showanswers === true || form.showanswers === 'true',
                    evaluation_id: form.evaluation_id || null,
                    exam_type: form.exam_type || 'libre',
                    status: form.status || 'borrador'
                };
            });
        }
        
        // ============================================================
        // OBTENER TODOS
        // ============================================================
        
        async getAll() {
            console.log('📊 Obteniendo todos los formularios...');
            if (this.isLoading) return this.cache;
            this.isLoading = true;
            
            try {
                if (!this.supabase) throw new Error('Supabase no disponible');
                
                const { data, error } = await this.supabase
                    .from('forms')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                
                let processed = this._process(data || []);
                // Eliminar exámenes de ejemplo que pudieran existir de versiones previas
                processed = await this._purgeDefaultForms(processed);
                this.cache = processed;
                
                console.log('✅ Formularios cargados:', this.cache.length);
                return this.cache;
            } catch (error) {
                console.warn('⚠️ No se pudieron cargar formularios desde Supabase:', error && error.message);
                this.cache = [];
                return this.cache;
            } finally {
                this.isLoading = false;
            }
        }
        
        // Elimina los exámenes de ejemplo por defecto (si existieran en Supabase).
        async _purgeDefaultForms(forms) {
            const DEFAULT_IDS = ['form_ejemplo_001', 'form_ejemplo_002'];
            const toDelete = forms.filter(f => DEFAULT_IDS.includes(f.id));
            if (toDelete.length === 0) return forms;
            for (const f of toDelete) {
                try {
                    if (this.supabase) await this.supabase.from('forms').delete().eq('id', f.id);
                    console.log('🗑️ Examen de ejemplo eliminado:', f.id);
                } catch (e) { /* secundario */ }
            }
            return forms.filter(f => !DEFAULT_IDS.includes(f.id));
        }
        
        // ============================================================
        // OBTENER POR ID
        // ============================================================
        
        async getById(id) {
            if (!id) return null;
            const cached = this.cache.find(f => f.id === id);
            if (cached) return { ...cached };
            
            try {
                if (!this.supabase) return null;
                const { data, error } = await this.supabase
                    .from('forms')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle();
                if (error) {
                    console.warn('⚠️ Error en Supabase:', error.message);
                    return null;
                }
                if (data) {
                    const processed = this._process([data])[0];
                    const index = this.cache.findIndex(f => f.id === processed.id);
                    if (index !== -1) this.cache[index] = { ...this.cache[index], ...processed };
                    else this.cache.push(processed);
                    return processed;
                }
            } catch (error) {
                console.error('❌ Error fetching form:', error);
            }
            return null;
        }
        
        // ============================================================
        // GUARDAR
        // ============================================================
        
        async save(id, title, questions, slug, config = {}) {
            console.log('💾 Guardando formulario...', { id, title });
            if (!title?.trim()) throw new Error('El título es obligatorio');
            if (!questions || questions.length === 0) throw new Error('Debes añadir al menos una pregunta');
            if (!this.supabase) throw new Error('Supabase no disponible');
            
            try {
                const baseSlug = slug || this.generateSlug(title);
                let finalSlug = baseSlug;
                let counter = 1;
                const slugExists = (s) => this.cache.some(f => f.slug === s && f.id !== id);
                if (slugExists(baseSlug)) {
                    while (slugExists(finalSlug)) finalSlug = `${baseSlug}-${counter++}`;
                }
                
                const cleanQuestions = questions.map(q => {
                    const clean = {
                        id: q.id || this.generateId(),
                        type: q.type || 'text',
                        title: q.title || '',
                        required: q.required === true
                    };
                    if (q.options && q.options.length) clean.options = q.options;
                    if (q.correctAnswer !== undefined && q.correctAnswer !== '') clean.correctAnswer = q.correctAnswer;
                    if (q.correctAnswers !== undefined && q.correctAnswers !== '') clean.correctAnswers = q.correctAnswers;
                    if (q.leftItems && q.leftItems.length) clean.leftItems = q.leftItems;
                    if (q.rightItems && q.rightItems.length) clean.rightItems = q.rightItems;
                    if (q.matchPairs) clean.matchPairs = q.matchPairs;
                    if (q.orderItems && q.orderItems.length) clean.orderItems = q.orderItems;
                    if (q.correctOrder) clean.correctOrder = q.correctOrder;
                    if (q.clues) clean.clues = q.clues;
                    if (q.imageUrl) clean.imageUrl = q.imageUrl;
                    return clean;
                });
                
                const cleanConfig = {
                    timeLimit: parseInt(config.timeLimit) || 0,
                    maxAttempts: parseInt(config.maxAttempts) || 1,
                    openDate: config.openDate || null,
                    closeDate: config.closeDate || null,
                    shuffleQuestions: !!config.shuffleQuestions,
                    shuffleOptions: !!config.shuffleOptions,
                    onePerPage: !!config.onePerPage,
                    showProgress: !!config.showProgress,
                    allowBack: !!config.allowBack,
                    showGradeAutomatically: !!config.showGradeAutomatically,
                    showAnswersOnFinish: !!config.showAnswersOnFinish,
                    showOnlyScore: !!config.showOnlyScore
                };
                
                const formData = {
                    title: title.trim(),
                    questions: cleanQuestions,
                    slug: finalSlug,
                    description: config.description || '',
                    allowmultiple: !!config.allowMultiple,
                    showanswers: !!config.showAnswers,
                    config: cleanConfig
                };

                // Estado del examen
                if (config.status) {
                    formData.status = config.status;
                }

                // Solo enviar evaluation_id y exam_type si hay evaluación asignada
                // (evita error de columna inexistente si el schema no se ha aplicado aún)
                if (config.evaluationId) {
                    formData.evaluation_id = config.evaluationId;
                    formData.exam_type = config.examType || 'libre';
                }
                
                let result;
                if (id) {
                    const { data, error } = await this.supabase
                        .from('forms')
                        .update(formData)
                        .eq('id', id)
                        .select('*');
                    if (error) throw error;
                    result = data && data[0] ? data[0] : { ...formData, id };
                } else {
                    formData.id = this.generateId();
                    const { data, error } = await this.supabase
                        .from('forms')
                        .insert([formData])
                        .select('*');
                    if (error) throw error;
                    result = data && data[0] ? data[0] : formData;
                }
                
                const processed = this._process([result])[0];
                const index = this.cache.findIndex(f => f.id === processed.id);
                if (index !== -1) this.cache[index] = { ...this.cache[index], ...processed };
                else this.cache.push(processed);
                
                console.log('✅ Formulario guardado:', processed.id, processed.title);
                return processed;
            } catch (error) {
                console.error('❌ Error saving form:', error);
                throw error;
            }
        }
        
        // ============================================================
        // METADATOS / CONFIG
        // ============================================================
        
        async updateMeta(id, meta) {
            if (!id) return false;
            console.log('📝 Actualizando metadatos:', { id, meta });
            try {
                const updateData = {};
                if (meta.description !== undefined) updateData.description = meta.description;
                if (meta.allowMultiple !== undefined) updateData.allowmultiple = !!meta.allowMultiple;
                if (meta.showAnswers !== undefined) updateData.showanswers = !!meta.showAnswers;
                
                if (Object.keys(updateData).length === 0) return true;
                
                const formIndex = this.cache.findIndex(f => f.id === id);
                if (formIndex !== -1) {
                    this.cache[formIndex] = { ...this.cache[formIndex], ...updateData };
                }
                if (this.supabase) {
                    const { error } = await this.supabase.from('forms').update(updateData).eq('id', id);
                    if (error) console.warn('⚠️ Error updateMeta:', error.message);
                }
                return true;
            } catch (error) {
                console.error('❌ Error en updateMeta:', error);
                return false;
            }
        }
        
        async updateConfig(id, config) {
            if (!id || !config) return false;
            console.log('📝 Actualizando configuración:', { id, config });
            try {
                const cleanConfig = {
                    timeLimit: parseInt(config.timeLimit) || 0,
                    maxAttempts: parseInt(config.maxAttempts) || 1,
                    openDate: config.openDate || null,
                    closeDate: config.closeDate || null,
                    shuffleQuestions: !!config.shuffleQuestions,
                    shuffleOptions: !!config.shuffleOptions,
                    onePerPage: !!config.onePerPage,
                    showProgress: !!config.showProgress,
                    allowBack: !!config.allowBack,
                    showGradeAutomatically: !!config.showGradeAutomatically,
                    showAnswersOnFinish: !!config.showAnswersOnFinish,
                    showOnlyScore: !!config.showOnlyScore
                };
                const formIndex = this.cache.findIndex(f => f.id === id);
                if (formIndex !== -1) this.cache[formIndex].config = cleanConfig;
                if (this.supabase) {
                    const { error } = await this.supabase.from('forms').update({ config: cleanConfig }).eq('id', id);
                    if (error) console.warn('⚠️ Error updateConfig:', error.message);
                }
                return true;
            } catch (error) {
                console.error('❌ Error en updateConfig:', error);
                return false;
            }
        }
        
        // ============================================================
        // ELIMINAR
        // ============================================================
        
        async delete(id) {
            if (!id) throw new Error('ID de formulario requerido');
            try {
                if (this.supabase) {
                    try {
                        await this.supabase.from('responses').delete().eq('form_id', id);
                    } catch (e) { console.warn('Error deleting responses:', e); }
                    const { error } = await this.supabase.from('forms').delete().eq('id', id);
                    if (error) console.warn('⚠️ Error en delete:', error.message);
                }
                this.cache = this.cache.filter(f => f.id !== id);
                return true;
            } catch (error) {
                console.error('Error deleting form:', error);
                return true;
            }
        }
        
        // ============================================================
        // DUPLICAR
        // ============================================================
        
        async duplicate(formId, newTitle) {
            const original = this.cache.find(f => f.id === formId);
            if (!original) throw new Error('Formulario no encontrado');
            const title = newTitle || `${original.title} (copia)`;
            const slug = this.generateSlug(title);
            const questionsCopy = JSON.parse(JSON.stringify(original.questions || []));
            const configCopy = JSON.parse(JSON.stringify(original.config || {}));
            const newForm = await this.save(null, title, questionsCopy, slug, configCopy);
            await this.updateMeta(newForm.id, {
                allowMultiple: original.allowmultiple || false,
                showAnswers: original.showanswers || false,
                description: original.description || ''
            });
            return newForm;
        }
        
        // ============================================================
        // REFRESCAR
        // ============================================================
        
        async refresh() {
            console.log('🔄 Refrescando datos...');
            if (!this.supabase) return this.cache;
            try {
                const { data, error } = await this.supabase
                    .from('forms')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                this.cache = this._process(data);
                console.log('✅ Cache refrescado desde Supabase:', this.cache.length);
                return this.cache;
            } catch (e) {
                console.warn('⚠️ Error en refresh:', e.message);
                return this.cache;
            }
        }
        
        // ============================================================
        // FORMULARIOS DE EJEMPLO
        // ------------------------------------------------------------
        // Ya no se siembran exámenes por defecto. El dashboard muestra
        // un estado vacío con un botón para crear el primero.
        // ============================================================
        
        clearCache() {
            this.cache = [];
            this.isLoading = false;
        }
    }
    
    window.FormsManager = FormsManager;
    console.log('✅ FormsManager registrado globalmente');
    
})();
