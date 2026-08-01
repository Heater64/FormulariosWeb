(function() {
  'use strict';
  const sb = () => window.supabaseClient;

  function claveLista(usuarioId) { return `memorizacion:lista:${usuarioId}`; }
  function clavePendientes(usuarioId) { return `memorizacion:pendientes:${usuarioId}`; }

  window.memorizacionRepository = {
    /* ===== Mazos (mazos_memorizacion) ===== */
    async listarMazos(usuarioId) {
      if (!sb()) return [];
      try {
        const { data } = await sb()
          .from('mazos_memorizacion')
          .select('*')
          .eq('usuario_id', usuarioId)
          .order('creado_en', { ascending: true });
        return data || [];
      } catch (e) { return []; }
    },
    async crearMazo(usuarioId, { nombre, descripcion, color }) {
      const datos = { usuario_id: usuarioId, nombre: nombre || '', descripcion: descripcion || '', color: color || '#3B82F6' };
      if (!sb() || !navigator.onLine) {
        window.colaSync.encolar('insert', 'mazos_memorizacion', datos);
        return { id: null, ...datos, pendiente: true };
      }
      try {
        const { data, error } = await sb().from('mazos_memorizacion').insert(datos).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        window.colaSync.encolar('insert', 'mazos_memorizacion', datos);
        return { id: null, ...datos, pendiente: true };
      }
    },
    async actualizarMazo(id, { nombre, descripcion, color }) {
      if (!id) return;
      const cambios = {};
      if (nombre !== undefined) cambios.nombre = nombre;
      if (descripcion !== undefined) cambios.descripcion = descripcion;
      if (color !== undefined) cambios.color = color;
      if (!sb() || !navigator.onLine) {
        window.colaSync.encolar('update', 'mazos_memorizacion', cambios, { id });
        return;
      }
      await sb().from('mazos_memorizacion').update(cambios).eq('id', id);
    },
    async eliminarMazo(id) {
      if (!id) return;
      if (!sb() || !navigator.onLine) {
        window.colaSync.encolar('delete', 'mazos_memorizacion', {}, { id });
        return;
      }
      await sb().from('mazos_memorizacion').delete().eq('id', id);
    },

    async listarTarjetas(usuarioId, mazoId) {
      const fnRed = async () => {
        let q = sb().from('tarjetas_memorizacion')
          .select('*')
          .eq('usuario_id', usuarioId)
          .eq('activa', true);
        if (mazoId) q = q.eq('mazo_id', mazoId);
        const { data } = await q.order('creado_en', { ascending: false });
        return data || [];
      };
      return await window.cacheDatos.leerOCachear(claveLista(usuarioId) + (mazoId ? ':' + mazoId : ''), fnRed);
    },
    async tarjetasPendientes(usuarioId, mazoId) {
      const fnRed = async () => {
        const ahora = new Date().toISOString();
        let q = sb().from('tarjetas_memorizacion')
          .select('*')
          .eq('usuario_id', usuarioId)
          .eq('activa', true)
          .lte('proximo_repaso', ahora);
        if (mazoId) q = q.eq('mazo_id', mazoId);
        const { data } = await q.order('proximo_repaso');
        return data || [];
      };
      return await window.cacheDatos.leerOCachear(clavePendientes(usuarioId) + (mazoId ? ':' + mazoId : ''), fnRed);
    },
    async agregarTarjetaManual(usuarioId, { referencia, texto, pista, mazo_id, tipo }) {
      const datos = {
        usuario_id: usuarioId,
        referencia: referencia || '',
        texto: texto || '',
        pista: pista || '',
        mazo_id: mazo_id || null,
        tipo: tipo || 'versiculo',
        activa: true
      };
      if (!sb() || !navigator.onLine) {
        window.colaSync.encolar('insert', 'tarjetas_memorizacion', datos);
        return { referencia, texto, pista, mazo_id, tipo, pendiente: true };
      }
      try {
        const { data, error } = await sb().from('tarjetas_memorizacion').insert(datos).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        window.colaSync.encolar('insert', 'tarjetas_memorizacion', datos);
        return { referencia, texto, pista, mazo_id, tipo, pendiente: true };
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
    async actualizarContenido(id, { referencia, texto, pista, mazo_id, tipo }) {
      const updates = {};
      if (referencia !== undefined) updates.referencia = referencia;
      if (texto !== undefined) updates.texto = texto;
      if (pista !== undefined) updates.pista = pista;
      if (mazo_id !== undefined) updates.mazo_id = mazo_id || null;
      if (tipo !== undefined) updates.tipo = tipo;
      if (!sb() || !navigator.onLine) {
        window.colaSync.encolar('update', 'tarjetas_memorizacion', updates, { id });
        return;
      }
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
