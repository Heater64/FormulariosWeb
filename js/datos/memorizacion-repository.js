(function() {
  'use strict';
  const sb = () => window.supabaseClient;
  window.memorizacionRepository = {
    async listarTarjetas(usuarioId) {
      if (!sb()) return [];
      try {
        const { data } = await sb().from('tarjetas_memorizacion')
          .select('*')
          .eq('usuario_id', usuarioId)
          .eq('activa', true)
          .order('creado_en', { ascending: false });
        return data || [];
      } catch (e) { return []; }
    },
    async tarjetasPendientes(usuarioId) {
      if (!sb()) return [];
      try {
        const ahora = new Date().toISOString();
        const { data } = await sb().from('tarjetas_memorizacion')
          .select('*')
          .eq('usuario_id', usuarioId)
          .eq('activa', true)
          .lte('proximo_repaso', ahora)
          .order('proximo_repaso');
        return data || [];
      } catch (e) { return []; }
    },
    async agregarTarjetaManual(usuarioId, { referencia, texto, pista }) {
      const datos = { usuario_id: usuarioId, referencia: referencia || '', texto: texto || '', pista: pista || '', activa: true };
      if (!sb() || !navigator.onLine) {
        window.colaSync.encolar('insert', 'tarjetas_memorizacion', datos);
        return { referencia, texto, pista, pendiente: true };
      }
      try {
        const { data, error } = await sb().from('tarjetas_memorizacion').insert(datos).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        window.colaSync.encolar('insert', 'tarjetas_memorizacion', datos);
        return { referencia, texto, pista, pendiente: true };
      }
    },
    async actualizarTarjeta(tarjeta) {
      if (!sb()) throw new Error('Sin conexión');
      await sb().from('tarjetas_memorizacion').update({
        repeticiones: tarjeta.repeticiones,
        intervalo: tarjeta.intervalo,
        proximo_repaso: tarjeta.proximo_repaso,
        ultimo_repaso: tarjeta.ultimo_repaso,
        mejor_racha: tarjeta.mejor_racha,
        veces_olvidado: tarjeta.veces_olvidado,
        ultima_calificacion: tarjeta.ultima_calificacion,
        racha_actual: tarjeta.racha_actual
      }).eq('id', tarjeta.id);
    },
    async actualizarContenido(id, { referencia, texto, pista }) {
      if (!sb()) throw new Error('Sin conexión');
      const updates = {};
      if (referencia !== undefined) updates.referencia = referencia;
      if (texto !== undefined) updates.texto = texto;
      if (pista !== undefined) updates.pista = pista;
      await sb().from('tarjetas_memorizacion').update(updates).eq('id', id);
    },
    async registrarRepaso(tarjetaId, calidad) {
      if (!sb()) throw new Error('Sin conexión');
      await sb().from('repasos_memorizacion').insert({ tarjeta_id: tarjetaId, calidad });
    },
    async contarTarjetas(usuarioId) {
      if (!sb()) return 0;
      try {
        const { count } = await sb().from('tarjetas_memorizacion').select('id', { count: 'exact', head: true }).eq('usuario_id', usuarioId).eq('activa', true);
        return count || 0;
      } catch (e) { return 0; }
    },
    async desactivarTarjeta(id) {
      if (!sb()) throw new Error('Sin conexión');
      await sb().from('tarjetas_memorizacion').update({ activa: false }).eq('id', id);
    },
    async totalRepasos(usuarioId) {
      if (!sb()) return 0;
      try {
        const { count } = await sb().from('repasos_memorizacion').select('id, tarjetas_memorizacion!inner(usuario_id)', { count: 'exact', head: true }).eq('tarjetas_memorizacion.usuario_id', usuarioId);
        return count || 0;
      } catch (e) { return 0; }
    }
  };
})();
