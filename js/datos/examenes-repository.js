(function() {
  'use strict';
  const sb = () => window.supabaseClient;
  window.examenesRepository = {
    async listar(usuario) {
      if (!usuario || !sb()) return [];
      const { data } = await sb().from('examenes_personalizados').select('*').eq('grupo_id', usuario.grupo_id).order('creado_en', { ascending: false });
      return data || [];
    },
    async obtener(id) {
      if (!sb()) return null;
      const { data } = await sb().from('examenes_personalizados').select('*').eq('id', id).single();
      return data || null;
    },
    async guardar(examen) {
      if (!sb()) throw new Error('Sin conexión');
      const { data, error } = await sb().from('examenes_personalizados').upsert(examen, { onConflict: 'id' }).select().single();
      if (error) throw error;
      return data;
    },
    async eliminar(id) {
      if (!sb()) throw new Error('Sin conexión');
      await sb().from('examenes_personalizados').delete().eq('id', id);
    },
    async publicar(id) {
      if (!sb()) return;
      await sb().from('examenes_personalizados').update({ publicado: true, estado: 'publicado' }).eq('id', id);
    },
    async obtenerIntentos(examenId) {
      if (!sb()) return [];
      const { data } = await sb().from('intentos_examen_personalizado').select('*, perfiles!alumno_id(*)').eq('examen_id', examenId).order('fecha_inicio', { ascending: false });
      return data || [];
    },
    async guardarIntento(intento) {
      if (!sb()) throw new Error('Sin conexión');
      const { data, error } = await sb().from('intentos_examen_personalizado').upsert(intento, { onConflict: 'id' }).select().single();
      if (error) throw error;
      return data;
    },
    async misIntentos(usuarioId) {
      if (!sb()) return [];
      const { data } = await sb().from('intentos_examen_personalizado').select('*, examenes_personalizados!examen_id(*)').eq('alumno_id', usuarioId).order('fecha_inicio', { ascending: false });
      return data || [];
    },
    async calificar(intentoId, nota, observaciones, corregidoPor) {
      if (!sb()) return;
      await sb().from('intentos_examen_personalizado').update({
        nota, observaciones, corregido: true, corregido_por: corregidoPor,
        estado: 'calificado', fecha_corregido: new Date().toISOString()
      }).eq('id', intentoId);
    }
  };
})();
