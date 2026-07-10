// ============================================================
// FORMS - CRUD de formularios
// ============================================================

class FormsManager {
    constructor(supabase) {
        this.supabase = supabase;
        this.cache = [];
    }

    // Obtener todos los formularios
    async getAll() {
        try {
            const { data, error } = await this.supabase
                .from('forms')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            this.cache = data || [];
            return data;
        } catch (error) {
            console.error('Error fetching forms:', error);
            Utils.showToast('Error al cargar formularios', 'error');
            return [];
        }
    }

    // Obtener un formulario por ID
    async getById(id) {
        try {
            const { data, error } = await this.supabase
                .from('forms')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching form:', error);
            return null;
        }
    }

    // Guardar formulario (crear o actualizar)
    async save(id, title, questions, slug) {
        try {
            const formData = {
                id: id || Utils.generateId(),
                title: title,
                questions: questions,
                slug: slug || Utils.generateSlug(title)
            };

            if (id) {
                // Actualizar
                const { error } = await this.supabase
                    .from('forms')
                    .update(formData)
                    .eq('id', id);
                if (error) throw error;
            } else {
                // Crear
                const { error } = await this.supabase
                    .from('forms')
                    .insert([formData]);
                if (error) throw error;
            }
            
            return formData;
        } catch (error) {
            console.error('Error saving form:', error);
            throw error;
        }
    }

    // Eliminar formulario
    async delete(id) {
        try {
            const { error } = await this.supabase
                .from('forms')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting form:', error);
            throw error;
        }
    }

    // Obtener formulario por slug
    async getBySlug(slug) {
        try {
            const { data, error } = await this.supabase
                .from('forms')
                .select('*')
                .eq('slug', slug)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching form by slug:', error);
            return null;
        }
    }
}

// Exportar
window.FormsManager = FormsManager;