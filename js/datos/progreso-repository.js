(function() {
  'use strict';
  const sb = () => window.supabaseClient;
  window.progresoRepository = {
    async marcarLeido(usuarioId, capituloId) {
      const datos = {
        usuario_id: usuarioId, capitulo_id: capituloId,
        leido: true, completado: true, fecha_lectura: new Date().toISOString()
      };
      if (!sb() || !navigator.onLine) {
        window.colaSync.encolar('upsert', 'progreso_lectura', datos, { onConflict: 'usuario_id,capitulo_id' });
        return;
      }
      try {
        await sb().from('progreso_lectura').upsert(datos, { onConflict: 'usuario_id,capitulo_id' });
      } catch (e) {
        window.colaSync.encolar('upsert', 'progreso_lectura', datos, { onConflict: 'usuario_id,capitulo_id' });
      }
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
    async marcarEstudioCompletado(usuarioId, capituloId) {
      const datos = {
        usuario_id: usuarioId, capitulo_id: capituloId,
        estudio_completado: true, completado: true, leido: true,
        fecha_lectura: new Date().toISOString()
      };
      if (!sb() || !navigator.onLine) {
        window.colaSync.encolar('upsert', 'progreso_lectura', datos, { onConflict: 'usuario_id,capitulo_id' });
        return;
      }
      try {
        await sb().from('progreso_lectura').upsert(datos, { onConflict: 'usuario_id,capitulo_id' });
      } catch (e) {
        window.colaSync.encolar('upsert', 'progreso_lectura', datos, { onConflict: 'usuario_id,capitulo_id' });
      }
    },
    async obtenerPreguntasSistema(capituloId) {
      if (!sb() || !capituloId) return [];
      const { data } = await sb().from('preguntas_sistema')
        .select('*').eq('capitulo_id', capituloId).eq('activa', true).order('orden');
      return data || [];
    }
  };
})();
