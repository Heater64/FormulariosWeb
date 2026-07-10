// ============================================================
// RESPONSES - Manejo de respuestas con localStorage
// ============================================================

class ResponsesManager {
    constructor(supabase) {
        this.supabase = supabase;
        this.cache = [];
        this.isLoading = false;
    }

    // ============================================================
    // GUARDAR RESPUESTA
    // ============================================================

    async save(formId, answers, metadata = {}) {
        if (!formId) throw new Error('ID de formulario requerido');
        if (!answers || answers.length === 0) throw new Error('Respuestas requeridas');
        
        try {
            const now = new Date().toISOString();
            
            const response = {
                id: Utils.generateId(),
                form_id: formId,
                answers: answers.map(a => ({
                    question: a.question,
                    value: a.value?.trim() || ''
                })).filter(a => a.value !== ''),
                created_at: now
            };
            
            console.log('📝 Guardando respuesta:', response);
            
            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('responses')
                    .insert([response])
                    .select('*');
                
                if (error) {
                    console.error('❌ Supabase error:', error);
                    // Si falla, intentar guardar localmente
                    this.saveToLocalStorage(response);
                } else {
                    const savedResponse = data?.[0] || response;
                    this.cache.push(savedResponse);
                    return savedResponse;
                }
            }
            
            // Fallback a localStorage
            this.saveToLocalStorage(response);
            this.cache.push(response);
            return response;
            
        } catch (error) {
            console.error('❌ Error saving response:', error);
            throw error;
        }
    }

    // ============================================================
    // GUARDAR EN LOCAL STORAGE (OFFLINE MODE)
    // ============================================================

    saveToLocalStorage(response) {
        try {
            const key = 'formpro_responses_offline';
            let responses = JSON.parse(localStorage.getItem(key) || '[]');
            // Evitar duplicados
            responses = responses.filter(r => r.id !== response.id);
            responses.push(response);
            localStorage.setItem(key, JSON.stringify(responses));
            console.log('📝 Respuesta guardada en localStorage');
        } catch (e) {
            console.warn('Error saving to localStorage:', e);
        }
    }

    // ============================================================
    // OBTENER RESPUESTAS POR FORMULARIO
    // ============================================================

    async getByForm(formId) {
        if (!formId) return [];
        if (this.isLoading) return this.cache.filter(r => r.form_id === formId);
        
        this.isLoading = true;
        
        try {
            let data = [];
            
            if (this.supabase) {
                try {
                    const { data: supabaseData, error } = await this.supabase
                        .from('responses')
                        .select('*')
                        .eq('form_id', formId)
                        .order('created_at', { ascending: false });
                    
                    if (error) {
                        console.error('❌ Supabase error:', error);
                    } else {
                        data = supabaseData || [];
                    }
                } catch (e) {
                    console.warn('⚠️ Error fetching from Supabase:', e);
                }
            }
            
            // Si no hay datos de Supabase, usar localStorage
            if (data.length === 0) {
                const key = 'formpro_responses_offline';
                const all = JSON.parse(localStorage.getItem(key) || '[]');
                data = all.filter(r => r.form_id === formId);
            }
            
            // Procesar datos - cargar corrección desde storage separado
            this.cache = data.map(r => {
                let answers = r.answers;
                if (typeof answers === 'string') {
                    try {
                        answers = JSON.parse(answers);
                    } catch (e) {
                        answers = [];
                    }
                }
                if (!Array.isArray(answers)) answers = [];
                
                // Cargar corrección desde localStorage
                let correction = this.getCorrectionFromStorage(r.id);
                
                return {
                    ...r,
                    answers: answers,
                    correction: correction
                };
            });
            
            return this.cache;
            
        } catch (error) {
            console.error('❌ Error fetching responses:', error);
            return this.cache.filter(r => r.form_id === formId);
        } finally {
            this.isLoading = false;
        }
    }

    // ============================================================
    // CORREGIR RESPUESTA - Guarda en localStorage
    // ============================================================

    async correct(responseId, correction) {
        if (!responseId) throw new Error('ID de respuesta requerido');
        if (!correction) throw new Error('Datos de corrección requeridos');
        
        try {
            const correctionData = {
                answers: correction.answers || [],
                scores: correction.scores || [],
                details: correction.details || [],
                score: parseFloat(correction.score) || 0,
                total: parseInt(correction.total) || 0,
                comment: correction.comment?.trim() || '',
                completed: true,
                correctedAt: correction.correctedAt || new Date().toISOString()
            };
            
            // Guardar corrección en localStorage
            this.saveCorrectionToStorage(responseId, correctionData);
            
            // Actualizar cache
            const index = this.cache.findIndex(r => r.id === responseId);
            if (index !== -1) {
                this.cache[index].correction = correctionData;
            }
            
            // Si hay Supabase, intentar guardar también allí
            if (this.supabase) {
                try {
                    // Intentar actualizar la respuesta con la corrección
                    const { error } = await this.supabase
                        .from('responses')
                        .update({ 
                            correction: correctionData 
                        })
                        .eq('id', responseId);
                    
                    if (error) {
                        console.warn('⚠️ No se pudo actualizar correction en Supabase:', error.message);
                    }
                } catch (e) {
                    console.warn('⚠️ Error guardando en Supabase:', e);
                }
            }
            
            console.log('✅ Corrección guardada:', responseId);
            return true;
            
        } catch (error) {
            console.error('❌ Error correcting response:', error);
            throw error;
        }
    }

    // ============================================================
    // GUARDAR CORRECCIÓN EN LOCAL STORAGE
    // ============================================================

    saveCorrectionToStorage(responseId, correctionData) {
        try {
            const key = 'formpro_corrections';
            let corrections = JSON.parse(localStorage.getItem(key) || '{}');
            corrections[responseId] = correctionData;
            localStorage.setItem(key, JSON.stringify(corrections));
            console.log('✅ Corrección guardada en localStorage:', responseId);
        } catch (e) {
            console.warn('Error saving correction to localStorage:', e);
        }
    }

    // ============================================================
    // OBTENER CORRECCIÓN DE LOCAL STORAGE
    // ============================================================

    getCorrectionFromStorage(responseId) {
        try {
            const key = 'formpro_corrections';
            const corrections = JSON.parse(localStorage.getItem(key) || '{}');
            return corrections[responseId] || null;
        } catch (e) {
            return null;
        }
    }

    // ============================================================
    // OBTENER ESTADÍSTICAS DE UN FORMULARIO
    // ============================================================

    async getStats(formId) {
        const responses = await this.getByForm(formId);
        const corrected = responses.filter(r => r.correction?.completed);
        const pending = responses.filter(r => !r.correction?.completed);
        
        let averageScore = 0;
        if (corrected.length > 0) {
            const scores = corrected.map(r => r.correction.score || 0);
            averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100;
        }
        
        return {
            total: responses.length,
            corrected: corrected.length,
            pending: pending.length,
            averageScore: averageScore,
            lastResponse: responses.length > 0 ? responses[0].created_at : null
        };
    }

    // ============================================================
    // ELIMINAR RESPUESTAS DE UN FORMULARIO
    // ============================================================

    async deleteByForm(formId) {
        if (!formId) return;
        
        try {
            if (this.supabase) {
                try {
                    const { error } = await this.supabase
                        .from('responses')
                        .delete()
                        .eq('form_id', formId);
                    
                    if (error) {
                        console.warn('Supabase delete error:', error);
                    }
                } catch (e) {
                    console.warn('Error deleting from Supabase:', e);
                }
            }
            
            // Eliminar de localStorage
            const key = 'formpro_responses_offline';
            let responses = JSON.parse(localStorage.getItem(key) || '[]');
            responses = responses.filter(r => r.form_id !== formId);
            localStorage.setItem(key, JSON.stringify(responses));
            
            // Eliminar correcciones
            const corrKey = 'formpro_corrections';
            let corrections = JSON.parse(localStorage.getItem(corrKey) || '{}');
            const responsesToDelete = this.cache.filter(r => r.form_id === formId);
            responsesToDelete.forEach(r => {
                delete corrections[r.id];
            });
            localStorage.setItem(corrKey, JSON.stringify(corrections));
            
            this.cache = this.cache.filter(r => r.form_id !== formId);
            
        } catch (error) {
            console.error('❌ Error deleting responses:', error);
            throw error;
        }
    }

    // ============================================================
    // ELIMINAR UNA RESPUESTA ESPECÍFICA
    // ============================================================

    async deleteResponse(responseId) {
        if (!responseId) return;
        
        try {
            if (this.supabase) {
                try {
                    const { error } = await this.supabase
                        .from('responses')
                        .delete()
                        .eq('id', responseId);
                    
                    if (error) {
                        console.warn('Supabase delete error:', error);
                    }
                } catch (e) {
                    console.warn('Error deleting from Supabase:', e);
                }
            }
            
            // Eliminar de localStorage
            const key = 'formpro_responses_offline';
            let responses = JSON.parse(localStorage.getItem(key) || '[]');
            responses = responses.filter(r => r.id !== responseId);
            localStorage.setItem(key, JSON.stringify(responses));
            
            // Eliminar corrección
            const corrKey = 'formpro_corrections';
            let corrections = JSON.parse(localStorage.getItem(corrKey) || '{}');
            delete corrections[responseId];
            localStorage.setItem(corrKey, JSON.stringify(corrections));
            
            this.cache = this.cache.filter(r => r.id !== responseId);
            
        } catch (error) {
            console.error('❌ Error deleting response:', error);
            throw error;
        }
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

    async refresh(formId) {
        this.clearCache();
        if (formId) {
            return await this.getByForm(formId);
        }
        return [];
    }
}

window.ResponsesManager = ResponsesManager;
console.log('✅ ResponsesManager cargado - Correcciones en localStorage');