(function() {
  'use strict';
  const sb = () => window.supabaseClient;
  window.memorizacionRepository = {
    async listarTarjetas(usuarioId) {
      if (!sb()) return [];
      const { data } = await sb().from('tarjetas_memorizacion').select('*, versiculos!versiculo_id(numero, texto, capitulo_id, capitulos!capitulo_id(libro_id, numero, libros_biblicos!libro_id(nombre)))').eq('usuario_id', usuarioId).eq('activa', true).order('proximo_repaso');
      return data || [];
    },
    async tarjetasPendientes(usuarioId) {
      if (!sb()) return [];
      const ahora = new Date().toISOString();
      const { data } = await sb().from('tarjetas_memorizacion').select('*, versiculos!versiculo_id(numero, texto, capitulo_id, capitulos!capitulo_id(libro_id, numero, libros_biblicos!libro_id(nombre)))').eq('usuario_id', usuarioId).eq('activa', true).lte('proximo_repaso', ahora).order('proximo_repaso');
      return data || [];
    },
    async agregarTarjeta(usuarioId, versiculoId) {
      const datos = { usuario_id: usuarioId, versiculo_id: versiculoId };
      if (!sb() || !navigator.onLine) {
        window.colaSync.encolar('upsert', 'tarjetas_memorizacion', datos, { onConflict: 'usuario_id,versiculo_id' });
        return { versiculo_id: versiculoId, pendiente: true };
      }
      try {
        const { data, error } = await sb().from('tarjetas_memorizacion').upsert(datos, { onConflict: 'usuario_id,versiculo_id' }).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        window.colaSync.encolar('upsert', 'tarjetas_memorizacion', datos, { onConflict: 'usuario_id,versiculo_id' });
        return { versiculo_id: versiculoId, pendiente: true };
      }
    },
    async versiculosDelCapitulo(capituloId) {
      if (!sb()) return [];
      const { data } = await sb().from('versiculos').select('id, numero, texto').eq('capitulo_id', capituloId).order('numero').limit(15);
      return data || [];
    },
    async agregarTarjetaManual(usuarioId, { referencia, texto }) {
      const datos = { usuario_id: usuarioId, referencia: referencia || '', texto: texto || '', activa: true };
      if (!sb() || !navigator.onLine) {
        window.colaSync.encolar('insert', 'tarjetas_memorizacion', datos);
        return { referencia, texto, pendiente: true };
      }
      try {
        const { data, error } = await sb().from('tarjetas_memorizacion').insert(datos).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        window.colaSync.encolar('insert', 'tarjetas_memorizacion', datos);
        return { referencia, texto, pendiente: true };
      }
    },
    async actualizarTarjeta(tarjeta) {
      if (!sb()) return;
      await sb().from('tarjetas_memorizacion').update({
        repeticiones: tarjeta.repeticiones, factor_facilidad: tarjeta.factor_facilidad,
        intervalo: tarjeta.intervalo, proximo_repaso: tarjeta.proximo_repaso
      }).eq('id', tarjeta.id);
    },
    async registrarRepaso(tarjetaId, calidad) {
      if (!sb()) return;
      await sb().from('repasos_memorizacion').insert({ tarjeta_id: tarjetaId, calidad });
    },
    async contarTarjetas(usuarioId) {
      if (!sb()) return 0;
      const { count } = await sb().from('tarjetas_memorizacion').select('id', { count: 'exact', head: true }).eq('usuario_id', usuarioId).eq('activa', true);
      return count || 0;
    },
    async desactivarTarjeta(id) {
      if (!sb()) return;
      await sb().from('tarjetas_memorizacion').update({ activa: false }).eq('id', id);
    },
    async totalRepasos(usuarioId) {
      if (!sb()) return 0;
      const { count } = await sb().from('repasos_memorizacion').select('id, tarjetas_memorizacion!inner(usuario_id)', { count: 'exact', head: true }).eq('tarjetas_memorizacion.usuario_id', usuarioId);
      return count || 0;
    }
  };
})();
