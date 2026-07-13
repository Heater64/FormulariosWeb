(function() {
  'use strict';
  const sb = () => window.supabaseClient;
  window.progresoRepository = {
    async marcarLeido(usuarioId, capituloId) {
      if (!sb()) return;
      await sb().from('progreso_lectura').upsert({
        usuario_id: usuarioId, capitulo_id: capituloId,
        leido: true, completado: true, fecha_lectura: new Date().toISOString()
      }, { onConflict: 'usuario_id,capitulo_id' });
    },
    async obtenerProgreso(usuarioId) {
      if (!sb()) return [];
      const { data } = await sb().from('progreso_lectura').select('*').eq('usuario_id', usuarioId);
      return data || [];
    },
    async obtenerProgresoPorLibro(usuarioId) {
      if (!sb()) return {};
      const { data: progreso } = await sb().from('progreso_lectura').select('capitulo_id').eq('usuario_id', usuarioId).eq('completado', true);
      const { data: capitulos } = await sb().from('capitulos').select('id, libro_id');
      if (!progreso || !capitulos) return {};
      const progresoPorLibro = {};
      const completados = new Set(progreso.map(p => p.capitulo_id));
      capitulos.forEach(c => {
        if (!progresoPorLibro[c.libro_id]) progresoPorLibro[c.libro_id] = [];
        progresoPorLibro[c.libro_id].push(completados.has(c.id) ? 1 : 0);
      });
      return progresoPorLibro;
    },
    async obtenerRacha(usuarioId) {
      if (!sb()) return 0;
      const { data } = await sb().from('progreso_lectura').select('fecha_lectura').eq('usuario_id', usuarioId).not('fecha_lectura', 'is', null).order('fecha_lectura', { ascending: false });
      return window.progresoLectura.calcularRacha(data || []);
    },
    async marcarEstudioCompletado(usuarioId, capituloId) {
      if (!sb()) return;
      await sb().from('progreso_lectura').upsert({
        usuario_id: usuarioId, capitulo_id: capituloId,
        estudio_completado: true, completado: true, leido: true
      }, { onConflict: 'usuario_id,capitulo_id' });
    },
    async obtenerPreguntasSistema(capituloId) {
      if (!sb() || !capituloId) return [];
      const { data } = await sb().from('preguntas_sistema')
        .select('*').eq('capitulo_id', capituloId).eq('activa', true).order('orden');
      return data || [];
    }
  };
})();
