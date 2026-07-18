(function() {
  'use strict';
  const sb = () => window.supabaseClient;

  function claveLista(usuarioId) { return `memorizacion:lista:${usuarioId}`; }
  function clavePendientes(usuarioId) { return `memorizacion:pendientes:${usuarioId}`; }

  window.memorizacionRepository = {
    async listarTarjetas(usuarioId) {
      const fnRed = async () => {
        const { data } = await sb().from('tarjetas_memorizacion')
          .select('*')
          .eq('usuario_id', usuarioId)
          .eq('activa', true)
          .order('creado_en', { ascending: false });
        return data || [];
      };
      return await window.cacheDatos.leerOCachear(claveLista(usuarioId), fnRed);
    },
    async tarjetasPendientes(usuarioId) {
      const fnRed = async () => {
        const ahora = new Date().toISOString();
        const { data } = await sb().from('tarjetas_memorizacion')
          .select('*')
          .eq('usuario_id', usuarioId)
          .eq('activa', true)
          .lte('proximo_repaso', ahora)
          .order('proximo_repaso');
        return data || [];
      };
      return await window.cacheDatos.leerOCachear(clavePendientes(usuarioId), fnRed);
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
      // Normalize camelCase (from algoritmo SM-2) → snake_case (DB column names)
      const datos = {
        repeticiones: tarjeta.repeticiones,
        intervalo: tarjeta.intervalo,
        proximo_repaso: tarjeta.proximoRepaso !== undefined ? tarjeta.proximoRepaso : tarjeta.proximo_repaso,
        ultimo_repaso: tarjeta.ultimoRepaso !== undefined ? tarjeta.ultimoRepaso : tarjeta.ultimo_repaso,
        factor_facilidad: tarjeta.factorFacilidad !== undefined ? tarjeta.factorFacilidad : tarjeta.factor_facilidad,
        mejor_racha: tarjeta.mejorRacha !== undefined ? tarjeta.mejorRacha : tarjeta.mejor_racha,
        veces_olvidado: tarjeta.vecesOlvidado !== undefined ? tarjeta.vecesOlvidado : tarjeta.veces_olvidado,
        ultima_calificacion: tarjeta.ultimaCalificacion !== undefined ? tarjeta.ultimaCalificacion : tarjeta.ultima_calificacion,
        racha_actual: tarjeta.rachaActual !== undefined ? tarjeta.rachaActual : tarjeta.racha_actual
      };
      if (!sb() || !navigator.onLine) {
        window.colaSync.encolar('update', 'tarjetas_memorizacion', datos, { id: tarjeta.id });
        return;
      }
      await sb().from('tarjetas_memorizacion').update(datos).eq('id', tarjeta.id);
    },
    async actualizarContenido(id, { referencia, texto, pista }) {
      if (!sb() || !navigator.onLine) {
        const updates = {};
        if (referencia !== undefined) updates.referencia = referencia;
        if (texto !== undefined) updates.texto = texto;
        if (pista !== undefined) updates.pista = pista;
        window.colaSync.encolar('update', 'tarjetas_memorizacion', updates, { id });
        return;
      }
      const updates = {};
      if (referencia !== undefined) updates.referencia = referencia;
      if (texto !== undefined) updates.texto = texto;
      if (pista !== undefined) updates.pista = pista;
      await sb().from('tarjetas_memorizacion').update(updates).eq('id', id);
    },
    async registrarRepaso(tarjetaId, calidad) {
      if (!sb() || !navigator.onLine) {
        window.colaSync.encolar('insert', 'repasos_memorizacion', { tarjeta_id: tarjetaId, calidad });
        return;
      }
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
      if (!sb() || !navigator.onLine) {
        window.colaSync.encolar('update', 'tarjetas_memorizacion', { activa: false }, { id });
        return;
      }
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
