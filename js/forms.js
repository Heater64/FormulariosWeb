// ============================================================
// FORMS - CRUD de formularios usando SOLO tabla forms
// ============================================================

class FormsManager {
    constructor(supabase) {
        this.supabase = supabase;
        this.cache = [];
        this.isLoading = false;
    }

    // ============================================================
    // GENERAR ID DE TEXTO
    // ============================================================

    generateId() {
        // Generar un ID único de texto: timestamp + random
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `form_${timestamp}_${random}`;
    }

    // ============================================================
    // OBTENER TODOS LOS FORMULARIOS
    // ============================================================

    async getAll() {
        if (this.isLoading) return this.cache;
        this.isLoading = true;
        
        try {
            const { data, error } = await this.supabase
                .from('forms')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            
            this.cache = (data || []).map(form => {
                let questions = form.questions;
                if (typeof questions === 'string') {
                    try {
                        questions = JSON.parse(questions);
                    } catch (e) {
                        questions = [];
                    }
                }
                if (!Array.isArray(questions)) questions = [];
                
                let config = form.config;
                if (typeof config === 'string') {
                    try {
                        config = JSON.parse(config);
                    } catch (e) {
                        config = {};
                    }
                }
                if (!config || typeof config !== 'object') config = {};
                
                return {
                    ...form,
                    questions: questions,
                    config: config,
                    allowmultiple: form.allowmultiple === true || form.allowmultiple === 'true',
                    showanswers: form.showanswers === true || form.showanswers === 'true'
                };
            });
            
            return this.cache;
        } catch (error) {
            console.error('Error fetching forms:', error);
            if (typeof Utils !== 'undefined') {
                Utils.showNotification('Error al cargar formularios: ' + (error.message || 'Error desconocido'), 'error');
            }
            return this.cache;
        } finally {
            this.isLoading = false;
        }
    }

    // ============================================================
    // OBTENER FORMULARIO POR ID
    // ============================================================

    async getById(id) {
        if (!id) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('forms')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            
            if (data) {
                let questions = data.questions;
                if (typeof questions === 'string') {
                    try {
                        questions = JSON.parse(questions);
                    } catch (e) {
                        questions = [];
                    }
                }
                if (!Array.isArray(questions)) questions = [];
                
                let config = data.config;
                if (typeof config === 'string') {
                    try {
                        config = JSON.parse(config);
                    } catch (e) {
                        config = {};
                    }
                }
                if (!config || typeof config !== 'object') config = {};
                
                data.questions = questions;
                data.config = config;
                data.allowmultiple = data.allowmultiple === true || data.allowmultiple === 'true';
                data.showanswers = data.showanswers === true || data.showanswers === 'true';
            }
            
            return data;
        } catch (error) {
            console.error('Error fetching form:', error);
            return null;
        }
    }

    // ============================================================
    // OBTENER FORMULARIO POR SLUG
    // ============================================================

    async getBySlug(slug) {
        if (!slug) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('forms')
                .select('*')
                .eq('slug', slug)
                .single();
            
            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            
            if (data) {
                let questions = data.questions;
                if (typeof questions === 'string') {
                    try {
                        questions = JSON.parse(questions);
                    } catch (e) {
                        questions = [];
                    }
                }
                if (!Array.isArray(questions)) questions = [];
                
                let config = data.config;
                if (typeof config === 'string') {
                    try {
                        config = JSON.parse(config);
                    } catch (e) {
                        config = {};
                    }
                }
                if (!config || typeof config !== 'object') config = {};
                
                data.questions = questions;
                data.config = config;
                data.allowmultiple = data.allowmultiple === true || data.allowmultiple === 'true';
                data.showanswers = data.showanswers === true || data.showanswers === 'true';
            }
            
            return data;
        } catch (error) {
            console.error('Error fetching form by slug:', error);
            return null;
        }
    }

    // ============================================================
    // GUARDAR FORMULARIO (CREAR O ACTUALIZAR)
    // ============================================================

    async save(id, title, questions, slug, config = {}) {
        if (!title?.trim()) {
            throw new Error('El título es obligatorio');
        }
        
        if (!questions || questions.length === 0) {
            throw new Error('Debes añadir al menos una pregunta');
        }
        
        const invalidQuestions = questions.filter(q => !q.title?.trim());
        if (invalidQuestions.length > 0) {
            throw new Error('Todas las preguntas deben tener título');
        }
        
        try {
            let baseSlug = slug || Utils.generateSlug(title);
            let finalSlug = baseSlug;
            let counter = 1;
            
            const slugExists = (slugToCheck) => {
                return this.cache.some(f => f.slug === slugToCheck && f.id !== id);
            };
            
            if (slugExists(baseSlug)) {
                while (slugExists(finalSlug)) {
                    finalSlug = `${baseSlug}-${counter}`;
                    counter++;
                }
            }
            
            // Limpiar preguntas para guardar
            const cleanQuestions = questions.map(q => {
                const clean = {
                    id: q.id || this.generateId(),
                    type: q.type || 'text',
                    title: q.title || '',
                    required: q.required === true
                };
                
                if (q.options && q.options.length > 0) clean.options = q.options;
                if (q.correctAnswer !== undefined && q.correctAnswer !== '') clean.correctAnswer = q.correctAnswer;
                if (q.correctAnswers !== undefined && q.correctAnswers !== '') clean.correctAnswers = q.correctAnswers;
                if (q.leftItems && q.leftItems.length > 0) clean.leftItems = q.leftItems;
                if (q.rightItems && q.rightItems.length > 0) clean.rightItems = q.rightItems;
                if (q.matchPairs) clean.matchPairs = q.matchPairs;
                if (q.orderItems && q.orderItems.length > 0) clean.orderItems = q.orderItems;
                if (q.correctOrder) clean.correctOrder = q.correctOrder;
                if (q.clues) clean.clues = q.clues;
                if (q.imageUrl) clean.imageUrl = q.imageUrl;
                if (q.placeholder) clean.placeholder = q.placeholder;
                
                return clean;
            });
            
            // Preparar config para guardar
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
            
            let result;
            
            if (id) {
                // ACTUALIZAR
                console.log('📝 Actualizando formulario:', id);
                const { data, error } = await this.supabase
                    .from('forms')
                    .update({
                        title: title.trim(),
                        questions: cleanQuestions,
                        slug: finalSlug,
                        config: cleanConfig
                    })
                    .eq('id', id)
                    .select('*');
                
                if (error) {
                    console.error('Update error:', error);
                    throw error;
                }
                result = data?.[0];
                
                if (!result) {
                    // Si no se encontró el registro, crear uno nuevo
                    const newId = this.generateId();
                    console.log('🆕 Formulario no encontrado, creando nuevo con ID:', newId);
                    const { data: insertData, error: insertError } = await this.supabase
                        .from('forms')
                        .insert([{
                            id: newId,
                            title: title.trim(),
                            questions: cleanQuestions,
                            slug: finalSlug,
                            config: cleanConfig
                        }])
                        .select('*');
                    
                    if (insertError) {
                        console.error('Insert error after update fail:', insertError);
                        throw insertError;
                    }
                    result = insertData?.[0];
                }
            } else {
                // CREAR NUEVO - generar ID de texto
                const newId = this.generateId();
                console.log('🆕 Creando nuevo formulario con ID:', newId);
                
                const { data, error } = await this.supabase
                    .from('forms')
                    .insert([{
                        id: newId,
                        title: title.trim(),
                        questions: cleanQuestions,
                        slug: finalSlug,
                        config: cleanConfig
                    }])
                    .select('*');
                
                if (error) {
                    console.error('Insert error:', error);
                    console.error('Error details:', error.message, error.details, error.hint);
                    throw error;
                }
                result = data?.[0];
            }
            
            if (!result) {
                throw new Error('No se pudo guardar el formulario');
            }
            
            // Procesar resultado
            let questionsResult = result.questions;
            if (typeof questionsResult === 'string') {
                try {
                    questionsResult = JSON.parse(questionsResult);
                } catch (e) {
                    questionsResult = [];
                }
            }
            if (!Array.isArray(questionsResult)) questionsResult = [];
            
            let configResult = result.config;
            if (typeof configResult === 'string') {
                try {
                    configResult = JSON.parse(configResult);
                } catch (e) {
                    configResult = {};
                }
            }
            if (!configResult || typeof configResult !== 'object') configResult = {};
            
            result.questions = questionsResult;
            result.config = configResult;
            result.allowmultiple = result.allowmultiple === true || result.allowmultiple === 'true';
            result.showanswers = result.showanswers === true || result.showanswers === 'true';
            
            // Actualizar cache
            const index = this.cache.findIndex(f => f.id === result.id);
            if (index !== -1) {
                this.cache[index] = { ...this.cache[index], ...result };
            } else {
                this.cache.push(result);
            }
            
            console.log('✅ Formulario guardado:', result.id, result.title);
            return result;
        } catch (error) {
            console.error('Error saving form:', error);
            throw error;
        }
    }

    // ============================================================
    // ACTUALIZAR METADATOS
    // ============================================================

    async updateMeta(id, meta) {
        if (!id) throw new Error('ID de formulario requerido');
        
        try {
            const updateData = {};
            if (meta.description !== undefined) updateData.description = meta.description;
            if (meta.allowMultiple !== undefined) updateData.allowmultiple = !!meta.allowMultiple;
            if (meta.showAnswers !== undefined) updateData.showanswers = !!meta.showAnswers;
            
            if (Object.keys(updateData).length === 0) return true;
            
            const { error } = await this.supabase
                .from('forms')
                .update(updateData)
                .eq('id', id);
            
            if (error) {
                console.error('Update meta error:', error);
                throw error;
            }
            
            // Actualizar cache
            const formIndex = this.cache.findIndex(f => f.id === id);
            if (formIndex !== -1) {
                this.cache[formIndex] = { 
                    ...this.cache[formIndex], 
                    ...updateData,
                    allowmultiple: updateData.allowmultiple !== undefined ? updateData.allowmultiple : this.cache[formIndex].allowmultiple,
                    showanswers: updateData.showanswers !== undefined ? updateData.showanswers : this.cache[formIndex].showanswers
                };
            }
            
            return true;
        } catch (error) {
            console.error('Error updating meta:', error);
            throw error;
        }
    }

    // ============================================================
    // ACTUALIZAR CONFIGURACIÓN
    // ============================================================

    async updateConfig(id, config) {
        if (!id) throw new Error('ID de formulario requerido');
        if (!config || typeof config !== 'object') return true;
        
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
            
            const { error } = await this.supabase
                .from('forms')
                .update({ config: cleanConfig })
                .eq('id', id);
            
            if (error) {
                console.error('Update config error:', error);
                throw error;
            }
            
            // Actualizar cache
            const formIndex = this.cache.findIndex(f => f.id === id);
            if (formIndex !== -1) {
                this.cache[formIndex].config = cleanConfig;
            }
            
            return true;
        } catch (error) {
            console.error('Error updating config:', error);
            throw error;
        }
    }

    // ============================================================
    // ELIMINAR FORMULARIO
    // ============================================================

    async delete(id) {
        if (!id) throw new Error('ID de formulario requerido');
        
        try {
            // Eliminar respuestas asociadas
            try {
                await this.supabase
                    .from('responses')
                    .delete()
                    .eq('form_id', id);
            } catch (e) {
                console.warn('Error deleting responses:', e);
            }
            
            // Eliminar el formulario
            const { error } = await this.supabase
                .from('forms')
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error('Delete error:', error);
                throw error;
            }
            
            this.cache = this.cache.filter(f => f.id !== id);
            return true;
        } catch (error) {
            console.error('Error deleting form:', error);
            throw error;
        }
    }

    // ============================================================
    // DUPLICAR FORMULARIO
    // ============================================================

    async duplicate(formId, newTitle) {
        const original = this.cache.find(f => f.id === formId);
        if (!original) {
            throw new Error('Formulario no encontrado');
        }
        
        const title = newTitle || `${original.title} (copia)`;
        const slug = Utils.generateSlug(title);
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
    // LIMPIAR CACHÉ
    // ============================================================

    clearCache() {
        this.cache = [];
        this.isLoading = false;
    }

    // ============================================================
    // RECARGAR DATOS
    // ============================================================

    async refresh() {
        this.clearCache();
        return await this.getAll();
    }
}

window.FormsManager = FormsManager;
console.log('✅ FormsManager cargado - Usando tabla forms con columna config');