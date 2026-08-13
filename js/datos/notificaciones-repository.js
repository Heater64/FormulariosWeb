(function() {
  'use strict';
  // ============================================================
  // js/datos/notificaciones-repository.js
  // Única capa que lee/escribe la tabla `notificaciones`.
  // Compatible con el esquema legacy (024: tipo/leida) y el v2
  // (027: categoria/prioridad/estado/agrupacion_clave/contador/
  // acciones/emisor_id). Si las columnas v2 no existen, degrada
  // automáticamente sin romper nada.
  // ============================================================
  const sb = () => window.supabaseClient;

  // Capacidades detectadas en runtime (evita reintentar fallbacks).
  const caps = { v2: null };

  // Mapeo de tipos legacy → categoría/prioridad v2 (para filas antiguas).
  const MAPA_TIPO = {
    desafio:            { categoria: 'desafios', prioridad: 'alta' },
    desafio_aceptado:   { categoria: 'desafios', prioridad: 'media' },
    grupo:              { categoria: 'grupos',   prioridad: 'media' },
    info:               { categoria: 'sistema',  prioridad: 'baja' },
    examen_publicado:   { categoria: 'examenes', prioridad: 'alta' },
    examen_entregado:   { categoria: 'examenes', prioridad: 'alta' },
    examen_corregido:   { categoria: 'examenes', prioridad: 'alta' },
    mazo_nuevo:         { categoria: 'estudio',  prioridad: 'media' },
    recordatorio:       { categoria: 'estudio',  prioridad: 'media' },
    anuncio:            { categoria: 'anuncios', prioridad: 'critica' }
  };

  // Estado derivado de `leida` cuando la columna `estado` no existe.
  function _estadoLegacy(fila) {
    return fila.leida ? 'vista' : 'nueva';
  }

  // Normaliza una fila cruda de BD a la forma canónica que consumen
  // la vista y el servicio (rellena campos v2 desde legacy).
  function normalizar(fila) {
    if (!fila) return fila;
    const m = MAPA_TIPO[fila.tipo] || {};
    const f = { ...fila };
    f.categoria = f.categoria || m.categoria || 'sistema';
    f.prioridad = f.prioridad || m.prioridad || 'media';
    if (!f.estado) f.estado = _estadoLegacy(f);
    if (f.contador == null) f.contador = 1;
    if (typeof f.datos === 'string') { try { f.datos = JSON.parse(f.datos); } catch (e) { f.datos = {}; } }
    if (typeof f.acciones === 'string') { try { f.acciones = JSON.parse(f.acciones); } catch (e) { f.acciones = null; } }
    return f;
  }

  // Detecta si la BD tiene las columnas v2 (una sola vez por sesión).
  async function _tieneV2() {
    if (caps.v2 !== null) return caps.v2;
    caps.v2 = true;
    if (!sb()) return caps.v2;
    try {
      const { error } = await sb().from('notificaciones').select('categoria, prioridad, estado, agrupacion_clave, contador, acciones, emisor_id').limit(1);
      if (error && /column .* does not exist/i.test(error.message || '')) caps.v2 = false;
    } catch (e) { caps.v2 = true; }
    return caps.v2;
  }

  async function _v2() {
    try { return await _tieneV2(); } catch (e) { return true; }
  }

  // ---- Consultas ----

  async function listar(usuarioId, { limite = 100, categoria = null, estado = null, soloNuevas = false } = {}) {
    if (!sb() || !usuarioId) return [];
    try {
      let q = sb().from('notificaciones').select('*').eq('usuario_id', usuarioId);
      // El recordatorio diario de repaso se retiró: no se genera ni se muestra.
      q = q.neq('tipo', 'recordatorio.repasos');
      if (soloNuevas && await _v2()) q = q.eq('estado', 'nueva');
      else if (soloNuevas) q = q.eq('leida', false);
      if (categoria) q = q.eq('categoria', categoria);
      if (estado) q = q.eq('estado', estado);
      const { data } = await q.order('creado_en', { ascending: false }).limit(limite);
      return (data || []).map(normalizar);
    } catch (e) { console.warn('[NotifRepo] listar:', e.message); return []; }
  }

  async function noLeidas(usuarioId) {
    if (!sb() || !usuarioId) return 0;
    try {
      const { count } = await sb().from('notificaciones')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', usuarioId)
        .eq('leida', false)
        .neq('tipo', 'recordatorio.repasos');
      return count || 0;
    } catch (e) { return 0; }
  }

  async function contarPorCategoria(usuarioId) {
    const mapa = { desafios: 0, examenes: 0, estudio: 0, grupos: 0, logros: 0, sistema: 0, anuncios: 0 };
    if (!sb() || !usuarioId) return mapa;
    try {
      // Cuenta cada categoría con count exacto (head:true) — no descarga filas.
      const categorias = Object.keys(mapa);
      const resultados = await Promise.all(categorias.map(async (c) => {
        try {
          const { count } = await sb().from('notificaciones')
            .select('id', { count: 'exact', head: true })
            .eq('usuario_id', usuarioId)
            .eq('leida', false)
            .eq('categoria', c)
            .neq('tipo', 'recordatorio.repasos');
          return [c, count || 0];
        } catch (e) { return [c, 0]; }
      }));
      resultados.forEach(([c, n]) => { mapa[c] = n; });
      return mapa;
    } catch (e) { return mapa; }
  }

  // ---- Escritura ----

  // Inserta una o varias filas. Si `agrupacionClave` coincide con una
  // fila abierta (nueva/vista) reciente, incrementa `contador` y fusiona
  // `datos.miembros` en lugar de insertar (agrupación inteligente).
  async function insertarFilas(filas, { ventanaMs = 24 * 3600 * 1000 } = {}) {
    if (!sb() || !Array.isArray(filas) || !filas.length) return [];
    const v2 = await _v2();
    const resultado = [];
    // Las filas SIN agrupación (p.ej. anuncio masivo a N usuarios) pueden
    // insertarse en un solo lote: evita N round-trips secuenciales a Supabase.
    const sinAgrupar = v2 ? filas.filter(f => f && f.usuario_id && !f.agrupacion_clave) : filas.filter(f => f && f.usuario_id);
    const agrupables = v2 ? filas.filter(f => f && f.usuario_id && f.agrupacion_clave) : [];
    if (sinAgrupar.length) {
      try {
        const campo = v2 ? CAMPOS_V2 : CAMPOS_LEGACY;
        const lote = sinAgrupar.map(f => {
          const limpia = _limpiarFila(f, campo);
          if (v2) limpia.leida = f.estado === 'nueva' ? false : true;
          else limpia.leida = f.estado === 'nueva' ? false : true;
          return limpia;
        });
        const { data } = await sb().from('notificaciones').insert(lote).select();
        (data || []).forEach(f => resultado.push(normalizar(f)));
      } catch (e) {
        // Si el lote falla (p.ej. columna v2 inexistente), degradar a insertos individuales.
        for (const fila of sinAgrupar) {
          const guardada = await _insertarUna(fila, v2);
          if (guardada) resultado.push(guardada);
        }
      }
    }
    for (const fila of agrupables) {
      const existente = await _buscarAbierta(fila.usuario_id, fila.agrupacion_clave, ventanaMs);
      if (existente) {
        const actualizada = await _agrupar(existente, fila);
        if (actualizada) resultado.push(actualizada);
        continue;
      }
      const guardada = await _insertarUna(fila, v2);
      if (guardada) resultado.push(guardada);
    }
    return resultado;
  }

  async function _buscarAbierta(usuarioId, clave, ventanaMs) {
    try {
      const desde = new Date(Date.now() - ventanaMs).toISOString();
      const { data } = await sb().from('notificaciones')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('agrupacion_clave', clave)
        .in('estado', ['nueva', 'vista'])
        .gte('creado_en', desde)
        .order('creado_en', { ascending: false })
        .limit(1);
      return (data && data[0]) || null;
    } catch (e) { return null; }
  }

  async function _agrupar(existente, fila) {
    const datos = { ...(existente.datos || {}), ...(fila.datos || {}) };
    const miembros = new Set([...(datos.miembros || [])]);
    if (fila.datos && fila.datos.miembro) miembros.add(fila.datos.miembro);
    const nuevoMiembros = Array.from(miembros).slice(-30);
    const contador = (existente.contador || 1) + 1;
    const update = { contador, datos: { ...datos, miembros: nuevoMiembros } };
    // El título agrupado llega como plantilla "{n} jugadores aceptaron..."
    // con marcador {n}; se sustituye por el contador REAL de la fusión.
    if (fila.tituloAgrupado && String(fila.tituloAgrupado).includes('{n}')) {
      update.titulo = String(fila.tituloAgrupado).replace('{n}', contador);
    } else if (fila.tituloAgrupado) {
      update.titulo = fila.tituloAgrupado;
    }
    try {
      await sb().from('notificaciones').update(update).eq('id', existente.id);
      return normalizar({ ...existente, ...update, contador });
    } catch (e) { return null; }
  }

  // Columnas permitidas para el INSERT. Evita errores del tipo
  // "column does not exist" si la migración 027 no está aplicada.
  const CAMPOS_V2 = ['usuario_id', 'tipo', 'categoria', 'prioridad', 'estado', 'titulo', 'cuerpo', 'datos', 'agrupacion_clave', 'contador', 'acciones', 'emisor_id'];
  const CAMPOS_LEGACY = ['usuario_id', 'tipo', 'titulo', 'cuerpo', 'datos', 'leida'];

  function _limpiarFila(fila, campos) {
    const limpia = {};
    for (const k of campos) {
      if (fila[k] !== undefined && fila[k] !== null) limpia[k] = fila[k];
    }
    return limpia;
  }

  async function _insertarUna(fila, v2) {
    try {
      // ponytail (FASE 2, 028): con el RLS cerrado, insertar notificaciones de
      // OTROS usuarios solo es posible vía la RPC enviar_notificacion (pierde
      // categoria/prioridad/agrupacion/acciones/emisor). La agrupación
      // inteligente queda solo para notificaciones propias; las ajenas se
      // insertan tal cual.
      const usuarioActual = store.obtener('usuario');
      const esAjena = usuarioActual && fila.usuario_id && fila.usuario_id !== usuarioActual.id;
      if (esAjena) {
        const { data, error } = await sb().rpc('enviar_notificacion', {
          p_usuario_id: fila.usuario_id,
          p_tipo: fila.tipo || 'generica',
          p_titulo: fila.titulo || '',
          p_cuerpo: fila.cuerpo || '',
          p_datos: fila.datos || {},
          // Migración 030: la RPC conserva la categoría/prioridad/estado
          // (antes las notificaciones ajenas caían en 'sistema').
          p_categoria: fila.categoria || 'sistema',
          p_prioridad: fila.prioridad || 'media',
          p_estado: fila.estado || 'nueva'
        });
        if (error) return null;
        return normalizar({
          id: data, usuario_id: fila.usuario_id, tipo: fila.tipo, titulo: fila.titulo,
          cuerpo: fila.cuerpo, datos: fila.datos, estado: 'nueva', leida: false
        });
      }
      if (v2) {
        const limpia = _limpiarFila(fila, CAMPOS_V2);
        // Mantener `leida` en sincronía: las consultas legacy (noLeidas,
        // listar con soloNuevas sin v2) dependen de ella.
        limpia.leida = fila.estado === 'nueva' ? false : true;
        const { data } = await sb().from('notificaciones').insert(limpia).select().single();
        if (data) return normalizar(data);
        return normalizar(fila);
      }
      const limpiaLegacy = _limpiarFila(fila, CAMPOS_LEGACY);
      limpiaLegacy.leida = fila.estado === 'nueva' ? false : true;
      const { data } = await sb().from('notificaciones').insert(limpiaLegacy).select().single();
      return normalizar(data || fila);
    } catch (e) {
      // Fallback: si v2 falló por columnas inexistentes, reintentar legacy.
      if (v2) {
        try {
          const limpiaLegacy = _limpiarFila(fila, CAMPOS_LEGACY);
          limpiaLegacy.leida = fila.estado === 'nueva' ? false : true;
          const { data } = await sb().from('notificaciones').insert(limpiaLegacy).select().single();
          caps.v2 = false;
          return normalizar(data || fila);
        } catch (e2) { return null; }
      }
      return null;
    }
  }

  // ---- Ciclo de vida ----

  // Transiciones de estado. Mantiene `leida` en sincronía para que las
  // consultas legacy (y el conteo de no leídas) sigan funcionando.
  async function actualizarEstado(id, estado) {
    if (!sb() || !id) return;
    try {
      const v2 = await _v2();
      const leida = estado !== 'nueva';
      if (v2) {
        await sb().from('notificaciones').update({ estado, leida }).eq('id', id);
      } else {
        await sb().from('notificaciones').update({ leida }).eq('id', id);
      }
    } catch (e) { /* silencioso */ }
  }

  async function marcarVistas(ids) {
    if (!sb() || !Array.isArray(ids) || !ids.length) return;
    try {
      const v2 = await _v2();
      if (v2) {
        await sb().from('notificaciones').update({ estado: 'vista', leida: true }).in('id', ids).eq('estado', 'nueva');
      } else {
        await sb().from('notificaciones').update({ leida: true }).in('id', ids).eq('leida', false);
      }
    } catch (e) { /* silencioso */ }
  }

  async function marcarTodasVistas(usuarioId) {
    if (!sb() || !usuarioId) return;
    try {
      const v2 = await _v2();
      if (v2) {
        await sb().from('notificaciones').update({ estado: 'vista', leida: true }).eq('usuario_id', usuarioId).eq('estado', 'nueva');
      } else {
        await sb().from('notificaciones').update({ leida: true }).eq('usuario_id', usuarioId).eq('leida', false);
      }
    } catch (e) { /* silencioso */ }
  }

  async function eliminar(id) {
    if (!sb() || !id) return;
    try { await sb().from('notificaciones').delete().eq('id', id); } catch (e) { /* silencioso */ }
  }

  // ---- Realtime (Supabase) ----
  // Cuando esté disponible, las notificaciones llegan al instante y la
  // lectura en un dispositivo se propaga al resto (UPDATE/DELETE).

  function suscribirRealtime(usuarioId, onCambio) {
    if (!sb() || !usuarioId) return null;
    try {
      const canal = sb().channel('notificaciones-realtime-' + usuarioId);
      const filtro = `usuario_id=eq.${usuarioId}`;
      canal
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: filtro },
          (payload) => onCambio && onCambio('insert', normalizar(payload.new)))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notificaciones', filter: filtro },
          () => onCambio && onCambio('update', null))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notificaciones', filter: filtro },
          () => onCambio && onCambio('delete', null));
      canal.subscribe();
      return canal;
    } catch (e) { console.warn('[NotifRepo] Realtime no disponible:', e.message); return null; }
  }

  function cancelarRealtime(canal) {
    try { if (canal) window.supabaseClient.removeChannel(canal); } catch (e) {}
  }

  window.notificacionesRepository = {
    MAPA_TIPO,
    normalizar,
    listar,
    noLeidas,
    contarPorCategoria,
    insertarFilas,
    actualizarEstado,
    marcarVistas,
    marcarTodasVistas,
    eliminar,
    suscribirRealtime,
    cancelarRealtime
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { normalizar, MAPA_TIPO };
  }
})();
