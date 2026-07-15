(function() {
  'use strict';
  const sb = () => window.supabaseClient;
  window.notasRepository = {
    async listar(usuarioId) {
      if (!sb()) return [];
      try {
        const { data } = await sb().from('notas_capitulo')
          .select('*')
          .eq('usuario_id', usuarioId)
          .order('creado_en', { ascending: false });
        return data || [];
      } catch (e) { return []; }
    },
    async guardar(usuarioId, libroNombre, capituloNumero, contenido) {
      if (!sb()) throw new Error('Sin conexión');
      const { data: existente } = await sb().from('notas_capitulo')
        .select('id')
        .eq('usuario_id', usuarioId)
        .eq('libro_nombre', libroNombre)
        .eq('capitulo_numero', capituloNumero)
        .limit(1)
        .maybeSingle();
      if (existente) {
        const { error } = await sb().from('notas_capitulo')
          .update({ contenido, actualizado_en: new Date().toISOString() })
          .eq('id', existente.id);
        if (error) throw error;
        return existente.id;
      } else {
        const { data, error } = await sb().from('notas_capitulo')
          .insert({ usuario_id: usuarioId, libro_nombre: libroNombre, capitulo_numero: capituloNumero, contenido })
          .select('id')
          .single();
        if (error) throw error;
        return data.id;
      }
    },
    async obtener(usuarioId, libroNombre, capituloNumero) {
      if (!sb()) return null;
      try {
        const { data } = await sb().from('notas_capitulo')
          .select('*')
          .eq('usuario_id', usuarioId)
          .eq('libro_nombre', libroNombre)
          .eq('capitulo_numero', capituloNumero)
          .limit(1)
          .maybeSingle();
        return data || null;
      } catch (e) { return null; }
    },
    async eliminar(id) {
      if (!sb()) throw new Error('Sin conexión');
      await sb().from('notas_capitulo').delete().eq('id', id);
    }
  };
})();
