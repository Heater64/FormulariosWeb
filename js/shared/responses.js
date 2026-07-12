// ============================================================
// RESPONSES - Manejo de respuestas
// ============================================================

(function() {
    'use strict';
    
    console.log('Inicializando ResponsesManager...');
    
    class ResponsesManager {
        constructor(supabase) {
            this.supabase = supabase;
            this.cache = [];
            this.isLoading = false;
            console.log('ResponsesManager instanciado');
        }

        generateId() {
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substring(2, 8);
            return `resp_${timestamp}_${random}`;
        }

        // ============================================================
        // GUARDAR RESPUESTA
        // ============================================================
        
        async save(formId, answers, metadata = {}) {
            if (!formId) throw new Error('ID de formulario requerido');
            if (!answers || answers.length === 0) throw new Error('Respuestas requeridas');
            
            try {
                const now = new Date().toISOString();
                const newId = this.generateId();
                
                const response = {
                    id: newId,
                    form_id: formId,
                    answers: answers.map(a => ({
                        question: a.question,
                        value: a.value?.trim() || ''
                    })).filter(a => a.value !== ''),
                    created_at: now,
                    correction: null
                };
                
                console.log('Guardando respuesta:', response);
                
                if (this.supabase) {
                    const { data, error } = await this.supabase
                        .from('responses')
                        .insert([response])
                        .select('*');
                    
                    if (error) {
                        console.error('Supabase error:', error);
                        throw error;
                    }
                    
                    const savedResponse = data?.[0] || response;
                    savedResponse.correction = null;
                    this.cache.push(savedResponse);
                    return savedResponse;
                }
                
                this.cache.push(response);
                return response;
                
            } catch (error) {
                console.error('Error saving response:', error);
                throw error;
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
                        .select('*')
                        .eq('form_id', formId)
                        .order('created_at', { ascending: false });
                    
                    if (error) {
                        console.error('Supabase error:', error);
                        throw error;
                    }
                    data = supabaseData || [];
                }
                
                this.cache = (data || []).map(r => {
                    let answers = r.answers;
                    if (typeof answers === 'string') {
                        try {
                            answers = JSON.parse(answers);
                        } catch (e) {
                            answers = [];
                        }
                    }
                    if (!Array.isArray(answers)) answers = [];
                    
                    let correction = r.correction;
                    if (typeof correction === 'string') {
                        try {
                            correction = JSON.parse(correction);
                        } catch (e) {
                            correction = null;
                        }
                    }
                    
                    return {
                        ...r,
                        answers: answers,
                        correction: correction || null
                    };
                });
                
                return this.cache;
                
            } catch (error) {
                console.error('Error fetching responses:', error);
                return this.cache.filter(r => r.form_id === formId);
            } finally {
                this.isLoading = false;
            }
        }

        // ============================================================
        // CORREGIR RESPUESTA
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
                
                console.log('Guardando corrección:', responseId);
                
                if (this.supabase) {
                    const { data, error } = await this.supabase
                        .from('responses')
                        .update({ correction: correctionData })
                        .eq('id', responseId)
                        .select('*');
                    
                    if (error) {
                        console.error('Supabase error:', error);
                        throw error;
                    }
                }
                
                const index = this.cache.findIndex(r => r.id === responseId);
                if (index !== -1) {
                    this.cache[index].correction = correctionData;
                }
                
                console.log('Corrección guardada:', responseId);
                return true;
                
            } catch (error) {
                console.error('Error correcting response:', error);
                throw error;
            }
        }

        // ============================================================
        // OBTENER ESTADÍSTICAS
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
        // ELIMINAR RESPUESTAS
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
                        console.error('Supabase error:', error);
                        throw error;
                    }
                }
                
                this.cache = this.cache.filter(r => r.form_id !== formId);
                
            } catch (error) {
                console.error('Error deleting responses:', error);
                throw error;
            }
        }

        async deleteResponse(responseId) {
            if (!responseId) return;
            
            try {
                if (this.supabase) {
                    const { error } = await this.supabase
                        .from('responses')
                        .delete()
                        .eq('id', responseId);
                    
                    if (error) {
                        console.error('Supabase error:', error);
                        throw error;
                    }
                }
                
                this.cache = this.cache.filter(r => r.id !== responseId);
                
            } catch (error) {
                console.error('Error deleting response:', error);
                throw error;
            }
        }

        clearCache() {
            this.cache = [];
            this.isLoading = false;
        }

        // Eliminar TODAS las respuestas (reinicio de progreso)
        async deleteAll() {
            try {
                if (this.supabase) {
                    const { error } = await this.supabase
                        .from('responses')
                        .delete()
                        .neq('id', '00000000-0000-0000-0000-000000000000');
                    if (error) {
                        console.error('Error eliminando respuestas:', error);
                        throw error;
                    }
                }
                this.cache = [];
            } catch (error) {
                console.error('Error en deleteAll:', error);
                throw error;
            }
        }

        async refresh(formId) {
            this.clearCache();
            if (formId) {
                return await this.getByForm(formId);
            }
            return [];
        }
    }

    window.ResponsesManager = ResponsesManager;
    console.log('ResponsesManager registrado globalmente');
    
})();