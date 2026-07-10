// ============================================================
// RESPONSES - Manejo de respuestas en Supabase
// ============================================================

class ResponsesManager {
    constructor(supabase) {
        this.supabase = supabase;
        this.cache = [];
        this.isLoading = false;
    }

    // ============================================================
    // GENERAR ID DE TEXTO
    // ============================================================

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
            
            console.log('📝 Guardando respuesta:', response);
            
            const { data, error } = await this.supabase
                .from('responses')
                .insert([response])
                .select('*');
            
            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }
            
            const savedResponse = data?.[0] || response;
            savedResponse.correction = null;
            
            this.cache.push(savedResponse);
            return savedResponse;
            
        } catch (error) {
            console.error('❌ Error saving response:', error);
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
            const { data, error } = await this.supabase
                .from('responses')
                .select('*')
                .eq('form_id', formId)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
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
            console.error('❌ Error fetching responses:', error);
            return this.cache.filter(r => r.form_id === formId);
        } finally {
            this.isLoading = false;
        }
    }

    // ============================================================
    // OBTENER UNA RESPUESTA POR ID
    // ============================================================

    async getById(responseId) {
        if (!responseId) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('responses')
                .select('*')
                .eq('id', responseId)
                .single();
            
            if (error) {
                console.error('❌ Supabase error:', error);
                return null;
            }
            
            if (data) {
                let answers = data.answers;
                if (typeof answers === 'string') {
                    try {
                        answers = JSON.parse(answers);
                    } catch (e) {
                        answers = [];
                    }
                }
                if (!Array.isArray(answers)) answers = [];
                
                let correction = data.correction;
                if (typeof correction === 'string') {
                    try {
                        correction = JSON.parse(correction);
                    } catch (e) {
                        correction = null;
                    }
                }
                
                data.answers = answers;
                data.correction = correction || null;
            }
            
            return data;
        } catch (error) {
            console.error('Error fetching response:', error);
            return null;
        }
    }

    // ============================================================
    // CORREGIR RESPUESTA - Guarda en columna correction de responses
    // ============================================================

    async correct(responseId, correction) {
        if (!responseId) throw new Error('ID de respuesta requerido');
        if (!correction) throw new Error('Datos de corrección requeridos');
        
        try {
            // Asegurar que todos los valores sean válidos para JSON
            const answers = correction.answers || [];
            const scores = correction.scores || [];
            const details = correction.details || [];
            
            // Convertir valores null a false para evitar problemas con JSON
            const cleanAnswers = answers.map(a => a === null ? false : a);
            
            const correctionData = {
                answers: cleanAnswers,
                scores: scores.map(s => parseFloat(s) || 0),
                details: details.map(d => String(d || '')),
                score: parseFloat(correction.score) || 0,
                total: parseInt(correction.total) || 0,
                comment: String(correction.comment || '').trim(),
                completed: true,
                correctedAt: correction.correctedAt || new Date().toISOString()
            };
            
            console.log('📝 Guardando corrección en columna correction:', responseId);
            console.log('📝 Datos:', JSON.stringify(correctionData, null, 2));
            
            // Verificar que el objeto sea válido para JSON
            const testJson = JSON.stringify(correctionData);
            if (!testJson) {
                throw new Error('Datos de corrección inválidos');
            }
            
            const { data, error } = await this.supabase
                .from('responses')
                .update({ correction: correctionData })
                .eq('id', responseId)
                .select('*');
            
            if (error) {
                console.error('❌ Supabase error al guardar corrección:', error);
                console.error('❌ Error details:', error.message, error.details, error.hint);
                throw error;
            }
            
            // Actualizar cache
            const index = this.cache.findIndex(r => r.id === responseId);
            if (index !== -1) {
                this.cache[index].correction = correctionData;
            }
            
            console.log('✅ Corrección guardada correctamente en responses.correction:', responseId);
            return true;
            
        } catch (error) {
            console.error('❌ Error correcting response:', error);
            throw error;
        }
    }

    // ============================================================
    // ELIMINAR CORRECCIÓN DE UNA RESPUESTA
    // ============================================================

    async removeCorrection(responseId) {
        if (!responseId) throw new Error('ID de respuesta requerido');
        
        try {
            const { error } = await this.supabase
                .from('responses')
                .update({ correction: null })
                .eq('id', responseId);
            
            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }
            
            // Actualizar cache
            const index = this.cache.findIndex(r => r.id === responseId);
            if (index !== -1) {
                this.cache[index].correction = null;
            }
            
            console.log('✅ Corrección eliminada:', responseId);
            return true;
            
        } catch (error) {
            console.error('❌ Error removing correction:', error);
            throw error;
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
            const { error } = await this.supabase
                .from('responses')
                .delete()
                .eq('form_id', formId);
            
            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }
            
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
            const { error } = await this.supabase
                .from('responses')
                .delete()
                .eq('id', responseId);
            
            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }
            
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
console.log('✅ ResponsesManager cargado - Usando columna correction en responses');