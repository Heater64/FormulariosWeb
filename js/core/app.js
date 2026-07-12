// ============================================================
// APP - Inicialización y configuración global
// ============================================================

(function() {
    'use strict';
    
    console.log('🚀 Iniciando App...');
    
    // ============================================================
    // INICIALIZAR SUPABASE
    // ============================================================
    
    let supabaseClient = null;
    try {
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            supabaseClient = supabase.createClient(
                window.SUPABASE_CONFIG?.url || 'https://josxcvncescqqlajahkh.supabase.co',
                window.SUPABASE_CONFIG?.anonKey || 'sb_publishable_UvqSGCMonC_9ncBmYV14tw_PLM6-9R8'
            );
            console.log('✅ Supabase cliente creado');
        } else {
            console.warn('⚠️ Supabase no disponible');
        }
    } catch (error) {
        console.warn('⚠️ Error creando cliente Supabase:', error.message);
    }
    
    window.supabaseClient = supabaseClient;
    
    // ============================================================
    // INICIALIZAR MANAGERS CON PLACEHOLDER COMPLETO
    // ============================================================
    
    let formsManager = null;
    let responsesManager = null;
    
    function createFormsManagerPlaceholder() {
        return {
            cache: [],
            isLoading: false,
            supabase: supabaseClient,
            
            getAll: async function() {
                console.log('⚠️ FormsManager placeholder - getAll');
                return this.cache;
            },
            getById: async function(id) {
                console.log('⚠️ FormsManager placeholder - getById:', id);
                return this.cache.find(f => f.id === id) || null;
            },
            save: async function(id, title, questions, slug, config) {
                console.log('⚠️ FormsManager placeholder - save');
                const newForm = {
                    id: id || 'form_' + Date.now(),
                    title: title,
                    questions: questions || [],
                    slug: slug || this.generateSlug(title),
                    config: config || {},
                    evaluation_id: config?.evaluationId || null,
                    exam_type: config?.examType || 'libre',
                    created_at: new Date().toISOString(),
                    allowmultiple: false,
                    showanswers: false
                };
                const index = this.cache.findIndex(f => f.id === newForm.id);
                if (index !== -1) {
                    this.cache[index] = { ...this.cache[index], ...newForm };
                } else {
                    this.cache.push(newForm);
                }
                return newForm;
            },
            updateMeta: async function(id, meta) {
                console.log('⚠️ FormsManager placeholder - updateMeta:', id, meta);
                const form = this.cache.find(f => f.id === id);
                if (form) {
                    if (meta.description !== undefined) form.description = meta.description;
                    if (meta.allowMultiple !== undefined) form.allowmultiple = meta.allowMultiple;
                    if (meta.showAnswers !== undefined) form.showanswers = meta.showAnswers;
                }
                return true;
            },
            updateConfig: async function(id, config) {
                console.log('⚠️ FormsManager placeholder - updateConfig:', id, config);
                const form = this.cache.find(f => f.id === id);
                if (form) {
                    form.config = { ...form.config, ...config };
                }
                return true;
            },
            delete: async function(id) {
                console.log('⚠️ FormsManager placeholder - delete:', id);
                this.cache = this.cache.filter(f => f.id !== id);
                return true;
            },
            duplicate: async function(formId, newTitle) {
                console.log('⚠️ FormsManager placeholder - duplicate:', formId);
                const original = this.cache.find(f => f.id === formId);
                if (!original) throw new Error('Formulario no encontrado');
                
                const title = newTitle || original.title + ' (copia)';
                const newForm = {
                    id: 'form_' + Date.now(),
                    title: title,
                    questions: JSON.parse(JSON.stringify(original.questions || [])),
                    slug: this.generateSlug(title),
                    config: JSON.parse(JSON.stringify(original.config || {})),
                    allowmultiple: original.allowmultiple || false,
                    showanswers: original.showanswers || false,
                    description: original.description || '',
                    created_at: new Date().toISOString()
                };
                this.cache.push(newForm);
                return newForm;
            },
            refresh: async function() {
                console.log('⚠️ FormsManager placeholder - refresh');
                // Intentar recargar desde Supabase si está disponible
                if (this.supabase) {
                    try {
                        const { data } = await this.supabase
                            .from('forms')
                            .select('*')
                            .order('created_at', { ascending: false });
                        if (data && data.length > 0) {
                            this.cache = data.map(f => ({
                                ...f,
                                questions: typeof f.questions === 'string' ? JSON.parse(f.questions) : f.questions || [],
                                config: typeof f.config === 'string' ? JSON.parse(f.config) : f.config || {}
                            }));
                            console.log('✅ Placeholder - Datos recargados de Supabase:', this.cache.length);
                        }
                    } catch (e) {
                        console.warn('⚠️ Placeholder - Error recargando:', e.message);
                    }
                }
                return this.cache;
            },
            generateSlug: function(title) {
                if (!title) return 'sin-titulo';
                return title
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')
                    .substring(0, 50) || 'sin-titulo';
            },
            clearCache: function() {
                this.cache = [];
                this.isLoading = false;
            }
        };
    }
    
    function createResponsesManagerPlaceholder() {
        return {
            cache: [],
            isLoading: false,
            supabase: supabaseClient,
            
            getByForm: async function(formId) {
                console.log('⚠️ ResponsesManager placeholder - getByForm:', formId);
                return this.cache.filter(r => r.form_id === formId);
            },
            save: async function(formId, answers) {
                console.log('⚠️ ResponsesManager placeholder - save');
                const newResp = {
                    id: 'resp_' + Date.now(),
                    form_id: formId,
                    answers: answers || [],
                    correction: null,
                    created_at: new Date().toISOString()
                };
                this.cache.push(newResp);
                return newResp;
            },
            correct: async function(responseId, correction) {
                console.log('⚠️ ResponsesManager placeholder - correct:', responseId);
                const r = this.cache.find(res => res.id === responseId);
                if (r) r.correction = correction;
                return true;
            },
            getStats: async function(formId) {
                console.log('⚠️ ResponsesManager placeholder - getStats:', formId);
                const responses = this.cache.filter(r => r.form_id === formId);
                return {
                    total: responses.length,
                    corrected: responses.filter(r => r.correction?.completed).length,
                    pending: responses.filter(r => !r.correction?.completed).length,
                    averageScore: 0,
                    lastResponse: responses.length > 0 ? responses[0].created_at : null
                };
            },
            deleteByForm: async function(formId) {
                console.log('⚠️ ResponsesManager placeholder - deleteByForm:', formId);
                this.cache = this.cache.filter(r => r.form_id !== formId);
                return true;
            },
            deleteResponse: async function(responseId) {
                console.log('⚠️ ResponsesManager placeholder - deleteResponse:', responseId);
                this.cache = this.cache.filter(r => r.id !== responseId);
                return true;
            },
            refresh: async function(formId) {
                console.log('⚠️ ResponsesManager placeholder - refresh');
                return this.cache;
            },
            clearCache: function() {
                this.cache = [];
                this.isLoading = false;
            }
        };
    }
    
    function initManagers() {
        console.log('🔧 Inicializando managers...');
        
        try {
            if (typeof FormsManager !== 'undefined') {
                formsManager = new FormsManager(supabaseClient);
                console.log('✅ FormsManager creado desde clase');
            } else {
                console.warn('⚠️ FormsManager no definido, creando placeholder');
                formsManager = createFormsManagerPlaceholder();
            }
            
            if (typeof ResponsesManager !== 'undefined') {
                responsesManager = new ResponsesManager(supabaseClient);
                console.log('✅ ResponsesManager creado desde clase');
            } else {
                console.warn('⚠️ ResponsesManager no definido, creando placeholder');
                responsesManager = createResponsesManagerPlaceholder();
            }
        } catch (error) {
            console.error('❌ Error al crear managers:', error);
            formsManager = createFormsManagerPlaceholder();
            responsesManager = createResponsesManagerPlaceholder();
        }
    }
    
    initManagers();
    
    window.formsManager = formsManager;
    window.responsesManager = responsesManager;
    
    console.log('📊 Estado de managers:');
    console.log('  formsManager:', !!window.formsManager);
    console.log('  formsManager.updateMeta:', typeof window.formsManager?.updateMeta === 'function');
    console.log('  responsesManager:', !!window.responsesManager);
    
    // ============================================================
    // FUNCIONES GLOBALES
    // ============================================================
    
    window.goBack = function() {
        window.history.back();
    };
    
    // ============================================================
    // INICIALIZAR APP
    // ============================================================
    
    window.initApp = async function() {
        console.log('🔄 Inicializando App...');
        
        try {
            if (window.formsManager) {
                await window.formsManager.getAll();
                console.log('✅ Formularios cargados:', window.formsManager.cache?.length || 0);
            }
            
            if (window.responsesManager) {
                await window.responsesManager.getByForm();
                console.log('✅ Respuestas cargadas:', window.responsesManager.cache?.length || 0);
            }
            
            console.log('✅ App inicializada correctamente');
            
        } catch (error) {
            console.error('❌ Error en initApp:', error);
        }
    };
    
    // ============================================================
    // AUTO-INIT
    // ------------------------------------------------------------
    // El arranque real (managers + carcasa + protección de página)
    // lo centraliza js/core/system.js, que se carga como último
    // script. Aquí solo dejamos los placeholders como red de
    // seguridad por si system.js no llega a cargar.
    // ============================================================

    console.log('🚀 App base cargada correctamente');
    
})();