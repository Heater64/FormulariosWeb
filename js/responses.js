// ============================================================
// RESPONSES - Manejo de respuestas
// ============================================================

class ResponsesManager {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // Guardar respuesta
    async save(formId, answers) {
        try {
            const { error } = await this.supabase
                .from('responses')
                .insert([{
                    id: Utils.generateId(),
                    form_id: formId,
                    answers: answers
                }]);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error saving response:', error);
            throw error;
        }
    }

    // Obtener respuestas de un formulario
    async getByForm(formId) {
        try {
            const { data, error } = await this.supabase
                .from('responses')
                .select('*')
                .eq('form_id', formId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching responses:', error);
            return [];
        }
    }

    // Obtener estadísticas de respuestas
    async getStats(formId) {
        const responses = await this.getByForm(formId);
        return {
            total: responses.length,
            lastResponse: responses.length > 0 ? responses[0].created_at : null,
            // Más estadísticas según necesites
        };
    }
}

// Exportar
window.ResponsesManager = ResponsesManager;