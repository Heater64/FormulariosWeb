// ============================================================
// RESPONSES - Manejo de respuestas
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
                const { error } = await this.supabase
                    .from('responses')
                    .insert([response]);
                    
                if (error) {
                    console.error('❌ Supabase error:', error);
                    throw error;
                }
            } else {
                this.saveToLocalStorage(response);
            }
            
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
            responses.push(response);
            localStorage.setItem(key, JSON.stringify(responses));
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
                const { data: supabaseData, error } = await this.supabase
                    .from('responses')
                    .select('id, form_id, answers, created_at')
                    .eq('form_id', formId)
                    .order('created_at', { ascending: false });
                
                if (error) {
                    console.error('❌ Supabase error:', error);
                    throw error;
                }
                data = supabaseData || [];
            } else {
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
                
                // Cargar corrección desde localStorage (no desde Supabase)
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
    // CORREGIR RESPUESTA - Guarda en localStorage separado
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
            
            // Guardar corrección en localStorage (Supabase no tiene columna correction)
            this.saveCorrectionToStorage(responseId, correctionData);
            
            // Actualizar cache
            const index = this.cache.findIndex(r => r.id === responseId);
            if (index !== -1) {
                this.cache[index].correction = correctionData;
            }
            
            // Si hay Supabase, también guardar la corrección en una tabla separada o en un campo JSON
            if (this.supabase) {
                try {
                    // Opción 1: Actualizar la respuesta con un campo correction (si existe en la tabla)
                    // Si no existe, usamos la opción 2
                    
                    // Opción 2: Guardar en una tabla separada 'corrections'
                    const { error } = await this.supabase
                        .from('corrections')
                        .upsert({
                            response_id: responseId,
                            correction_data: correctionData,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'response_id' });
                    
                    if (error) {
                        console.warn('⚠️ No se pudo guardar en tabla corrections:', error);
                        // Si falla, intentamos actualizar la respuesta directamente
                        try {
                            const { error: updateError } = await this.supabase
                                .from('responses')
                                .update({ 
                                    correction: correctionData 
                                })
                                .eq('id', responseId);
                            
                            if (updateError) {
                                console.warn('⚠️ No se pudo actualizar correction en responses:', updateError);
                            }
                        } catch (e2) {
                            console.warn('⚠️ Error en fallback:', e2);
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Error guardando en Supabase:', e);
                }
            }
            
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
                const { error } = await this.supabase
                    .from('responses')
                    .delete()
                    .eq('form_id', formId);
                    
                if (error) {
                    console.error('❌ Supabase error:', error);
                    throw error;
                }
            } else {
                const key = 'formpro_responses_offline';
                let responses = JSON.parse(localStorage.getItem(key) || '[]');
                responses = responses.filter(r => r.form_id !== formId);
                localStorage.setItem(key, JSON.stringify(responses));
            }
            
            this.cache = this.cache.filter(r => r.form_id !== formId);
            
        } catch (error) {
            console.error('❌ Error deleting responses:', error);
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