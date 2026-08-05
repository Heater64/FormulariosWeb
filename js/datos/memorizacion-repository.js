(function () {
  'use strict';
  const sb = () => window.supabaseClient;

  /* ────────────────────────────────────────────────────────────
     REPOSITORIO DE MEMORIZACIÓN — modo juego
     - Mazos: globales (admin) + personales (usuario, legacy)
     - Tarjetas: contenido compartido (usuario_id NULL = global)
     - Progreso: individual en progreso_tarjetas_memorizacion
     ──────────────────────────────────────────────────────────── */

  function claveLista(usuarioId) { return `memorizacion:lista:${usuarioId}`; }
  function clavePendientes(usuarioId) { return `memorizacion:pendientes:${usuarioId}`; }

  /* Caché de capacidades de la BD: evita reintentar fallbacks que ya
     fallaron (p.ej. columnas que solo existen con la migración 023). */
  const caps = { orden: true, progreso: true, usuarioRepaso: true };

  /* ── Progreso (SM-2) de una tarjeta para un usuario ── */
  async function obtenerProgreso(usuarioId, tarjetaId) {
    if (!sb()) return null;
    try {
      const { data } = await sb()
        .from('progreso_tarjetas_memorizacion')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('tarjeta_id', tarjetaId)
        .limit(1);
      return (data && data[0]) || null;
    } catch (e) { return null; }
  }

  async function guardarProgreso(usuarioId, tarjetaId, campos) {
    if (!sb() || !usuarioId || !tarjetaId) return;
    const fila = {
      usuario_id: usuarioId,
      tarjeta_id: tarjetaId,
      repeticiones: campos.repeticiones,
      factor_facilidad: campos.factorFacilidad != null ? campos.factorFacilidad : campos.factor_facilidad,
      intervalo: campos.intervalo,
      proximo_repaso: campos.proximoRepaso != null ? campos.proximoRepaso : campos.proximo_repaso,
      ultimo_repaso: campos.ultimoRepaso != null ? campos.ultimoRepaso : campos.ultimo_repaso,
      racha_actual: campos.rachaActual != null ? campos.rachaActual : campos.racha_actual,
      mejor_racha: campos.mejorRacha != null ? campos.mejorRacha : campos.mejor_racha,
      veces_olvidado: campos.vecesOlvidado != null ? campos.vecesOlvidado : campos.veces_olvidado,
      ultima_calificacion: campos.ultimaCalificacion != null ? campos.ultimaCalificacion : campos.ultima_calificacion,
      nivel: campos.nivel || 'nueva'
    };
    if (!caps.progreso) {
      // Sin migración 023: degradar directo a la tarjeta legacy (SM-2 en la propia fila)
      await _guardarLegacy(tarjetaId, fila);
      return;
    }
    try {
      const { data, error } = await sb()
        .from('progreso_tarjetas_memorizacion')
        .select('id')
        .eq('usuario_id', usuarioId)
        .eq('tarjeta_id', tarjetaId)
        .limit(1);
      if (error) { caps.progreso = false; await _guardarLegacy(tarjetaId, fila); return; }
      if (data && data.length) {
        await sb().from('progreso_tarjetas_memorizacion').update(fila).eq('id', data[0].id);
      } else {
        await sb().from('progreso_tarjetas_memorizacion').insert(fila);
      }
    } catch (e) {
      caps.progreso = false;
      await _guardarLegacy(tarjetaId, fila);
    }
  }

  async function _guardarLegacy(tarjetaId, fila) {
    if (!sb() || !tarjetaId) return;
    try {
      await sb().from('tarjetas_memorizacion').update({
        repeticiones: fila.repeticiones,
        intervalo: fila.intervalo,
        proximo_repaso: fila.proximo_repaso,
        ultimo_repaso: fila.ultimo_repaso,
        factor_facilidad: fila.factor_facilidad,
        mejor_racha: fila.mejor_racha,
        veces_olvidado: fila.veces_olvidado,
        ultima_calificacion: fila.ultima_calificacion,
        racha_actual: fila.racha_actual
      }).eq('id', tarjetaId);
    } catch (e2) { /* silencioso */ }
  }

  /* Progreso de todas las tarjetas de un usuario (mapa id→progreso) */
  async function listarProgreso(usuarioId) {
    if (!sb() || !caps.progreso) return {};
    try {
      const { data, error } = await sb()
        .from('progreso_tarjetas_memorizacion')
        .select('*')
        .eq('usuario_id', usuarioId);
      if (error) { caps.progreso = false; return {}; }
      const mapa = {};
      (data || []).forEach(p => { mapa[p.tarjeta_id] = p; });
      return mapa;
    } catch (e) {
      // Sin migración 023: no hay progreso individual → todo pendiente (nuevo)
      caps.progreso = false;
      return {};
    }
  }

  /* ── Mazos ──
     Globales: es_global=true (usuario_id NULL).
     Personales: los del usuario (legacy).
     Si la BD no tiene la migración 023 (sin es_global), se
     degrada a la consulta antigua por usuario_id. */

  /* Inserta notificaciones en BD para los miembros del grupo del admin
     cuando se crea un mazo global. */
  async function _notificarMazoAGrupo(mazo, adminId) {
    if (!sb() || !adminId) return;
    try {
      const { data: admin } = await sb().from('perfiles').select('grupo_id, nombre_completo, username').eq('id', adminId).single();
      if (!admin || !admin.grupo_id) return;
      const { data: miembros } = await sb().from('perfiles').select('id').eq('grupo_id', admin.grupo_id).neq('id', adminId);
      if (!miembros || !miembros.length) return;
      const creador = admin.nombre_completo || admin.username || 'Un administrador';
      const notifs = miembros.map(m => ({
        usuario_id: m.id,
        tipo: 'mazo_nuevo',
        titulo: 'Nuevo mazo de memorización',
        cuerpo: `${creador} ha añadido el mazo «${mazo.nombre}».`,
        datos: { mazo_id: mazo.id, mazo_nombre: mazo.nombre }
      }));
      try { await sb().from('notificaciones').insert(notifs); } catch (e2) {}
    } catch (e) { /* no crítico */ }
  }

  async function listarMazos(usuarioId) {
    if (!sb()) return [];
    // Intento 1: consulta con es_global (migración 023 aplicada)
    try {
      let q = sb().from('mazos_memorizacion').select('*');
      if (usuarioId) {
        q = q.or(`es_global.eq.true,usuario_id.eq.${usuarioId}`);
      } else {
        q = q.eq('es_global', true);
      }
      const { data, error } = await q
        .order('orden', { ascending: true })
        .order('creado_en', { ascending: true });
      if (!error) return (data || []).filter(m => m.activo !== false);
    } catch (e) { /* cae al fallback */ }
    // Fallback: BD sin migración 023 → solo mazos personales
    try {
      if (!usuarioId) return [];
      const { data, error } = await sb()
        .from('mazos_memorizacion')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('creado_en', { ascending: true });
      if (error) return [];
      return data || [];
    } catch (e2) { return []; }
  }

  async function crearMazo(usuarioId, { nombre, descripcion, color, icono, es_global }) {
    const datos = {
      usuario_id: es_global ? null : (usuarioId || null),
      es_global: !!es_global,
      activo: true,
      nombre: nombre || '',
      descripcion: descripcion || '',
      color: color || '#3B82F6',
      icono: icono || 'layers',
      creado_por: es_global ? (usuarioId || null) : null
    };
    if (!sb() || !navigator.onLine) {
      window.colaSync.encolar('insert', 'mazos_memorizacion', datos);
      return { id: null, ...datos, pendiente: true };
    }
    try {
      const { data, error } = await sb().from('mazos_memorizacion').insert(datos).select().single();
      if (error) throw error;
      // Notificar a todos los usuarios de este mazo global
      if (es_global && window.notifications) {
        window.notifications.notificarMazoNuevo(data.nombre, data.id);
        // Insertar notificación en BD para que otros usuarios la vean
        if (usuarioId) {
          _notificarMazoAGrupo(data, usuarioId);
        }
      }
      return data;
    } catch (e) {
      // Sin migración 023 (no existe es_global/icono): reintentar con columnas legacy
      try {
        const datosLegacy = { usuario_id: usuarioId || null, nombre: datos.nombre, descripcion: datos.descripcion, color: datos.color };
        const { data, error } = await sb().from('mazos_memorizacion').insert(datosLegacy).select().single();
        if (error) throw error;
        return data;
      } catch (e2) {
        window.colaSync.encolar('insert', 'mazos_memorizacion', datos);
        return { id: null, ...datos, pendiente: true };
      }
    }
  }

  async function actualizarMazo(id, { nombre, descripcion, color, icono, orden, activo }) {
    if (!id) return;
    const cambios = {};
    if (nombre !== undefined) cambios.nombre = nombre;
    if (descripcion !== undefined) cambios.descripcion = descripcion;
    if (color !== undefined) cambios.color = color;
    if (icono !== undefined) cambios.icono = icono;
    if (orden !== undefined) cambios.orden = orden;
    if (activo !== undefined) cambios.activo = activo;
    if (!sb() || !navigator.onLine) {
      window.colaSync.encolar('update', 'mazos_memorizacion', cambios, { id });
      return;
    }
    await sb().from('mazos_memorizacion').update(cambios).eq('id', id);
  }

  async function eliminarMazo(id) {
    if (!id) return;
    if (!sb() || !navigator.onLine) {
      window.colaSync.encolar('delete', 'mazos_memorizacion', {}, { id });
      return;
    }
    await sb().from('mazos_memorizacion').delete().eq('id', id);
  }

  /* ── Tarjetas (contenido global) ── */
  async function listarTarjetas(usuarioId, mazoId) {
    const fnRed = async () => {
      let q = sb().from('tarjetas_memorizacion')
        .select('*')
        .eq('activa', true);
      if (mazoId) q = q.eq('mazo_id', mazoId);
      // Con 'orden' solo si la BD lo soporta (migración 023); si no, legacy
      if (caps.orden) {
        try {
          const { data, error } = await q.order('orden', { ascending: true }).order('creado_en', { ascending: true });
          if (!error) return data || [];
          caps.orden = false;
        } catch (e) { caps.orden = false; }
      }
      const { data, error } = await sb().from('tarjetas_memorizacion')
        .select('*')
        .eq('activa', true)
        .order('creado_en', { ascending: false });
      if (error) return [];
      let lista = data || [];
      if (mazoId) lista = lista.filter(t => t.mazo_id === mazoId);
      return lista;
    };
    return await window.cacheDatos.leerOCachear(claveLista(usuarioId) + (mazoId ? ':' + mazoId : ''), fnRed);
  }

  /* Tarjetas pendientes de repasar de un mazo para un usuario:
     sin progreso (nuevas) o con proximo_repaso <= ahora. */
  async function tarjetasPendientes(usuarioId, mazoId) {
    const tarjetas = await this.listarTarjetas(usuarioId, mazoId);
    const progreso = await this.listarProgreso(usuarioId);
    const ahora = Date.now();
    return tarjetas.filter(t => {
      const p = progreso[t.id];
      if (!p) return true; // nueva → pendiente
      if (!p.proximo_repaso) return true;
      return new Date(p.proximo_repaso).getTime() <= ahora;
    });
  }

  /* Crear una tarjeta global (admin) */
  async function crearTarjetaGlobal({ mazo_id, tipo, pregunta, respuesta, texto, referencia, explicacion, opciones, pista, libro, capitulo, versiculo, orden, creado_por }) {
    const datos = {
      usuario_id: null,
      mazo_id: mazo_id || null,
      tipo: tipo || 'versiculo',
      pregunta: pregunta || '',
      respuesta: respuesta || '',
      texto: texto || '',
      referencia: referencia || '',
      explicacion: explicacion || '',
      opciones: opciones || null,
      pista: pista || '',
      libro: libro || '',
      capitulo: capitulo || '',
      versiculo: versiculo || '',
      orden: orden != null ? orden : 0,
      activa: true,
      creado_por: creado_por || null
    };
    if (!sb() || !navigator.onLine) {
      window.colaSync.encolar('insert', 'tarjetas_memorizacion', datos);
      return { id: null, ...datos, pendiente: true };
    }
    try {
      const { data, error } = await sb().from('tarjetas_memorizacion').insert(datos).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      // Sin migración 023: reintentar con columnas legacy (versiculo/libre)
      try {
        const datosLegacy = {
          usuario_id: creado_por || null,
          mazo_id: datos.mazo_id,
          tipo: (tipo === 'libre' || tipo === 'escrita' || tipo === 'versiculo') ? (tipo === 'libre' ? 'libre' : 'versiculo') : 'versiculo',
          referencia: (tipo === 'libre' ? pregunta : referencia) || '',
          texto: texto || respuesta || '',
          pista: pista || '',
          activa: true
        };
        const { data, error } = await sb().from('tarjetas_memorizacion').insert(datosLegacy).select().single();
        if (error) throw error;
        return data;
      } catch (e2) {
        window.colaSync.encolar('insert', 'tarjetas_memorizacion', datos);
        return { id: null, ...datos, pendiente: true };
      }
    }
  }

  /* Legacy: tarjeta personal (versículos del estudio / libre) */
  async function agregarTarjetaManual(usuarioId, { referencia, texto, pista, mazo_id, tipo }) {
    return this.crearTarjetaGlobal({
      mazo_id: mazo_id || null,
      tipo: tipo || 'libre',
      pregunta: (tipo === 'libre' ? referencia : ''),
      respuesta: (tipo === 'libre' ? texto : ''),
      texto,
      referencia,
      pista,
      creado_por: usuarioId
    });
  }

  async function actualizarContenido(id, cambios) {
    if (!id) return;
    const updates = {};
    ['tipo', 'pregunta', 'respuesta', 'texto', 'referencia', 'explicacion', 'pista', 'libro', 'capitulo', 'versiculo', 'orden'].forEach(k => {
      if (cambios[k] !== undefined) updates[k] = cambios[k];
    });
    if (cambios.opciones !== undefined) updates.opciones = cambios.opciones;
    if (cambios.mazo_id !== undefined) updates.mazo_id = cambios.mazo_id || null;
    if (!sb() || !navigator.onLine) {
      window.colaSync.encolar('update', 'tarjetas_memorizacion', updates, { id });
      return;
    }
    await sb().from('tarjetas_memorizacion').update(updates).eq('id', id);
  }

  /* Aplicar resultado de un ejercicio: actualizar progreso + registrar repaso */
  async function registrarResultado(usuarioId, tarjetaId, correcto) {
    const t = await this.obtenerTarjeta(tarjetaId);
    const prog = await obtenerProgreso(usuarioId, tarjetaId);
    const base = prog
      ? {
          repeticiones: prog.repeticiones || 0,
          intervalo: prog.intervalo || 0,
          factorFacilidad: Number(prog.factor_facilidad) || 2.5,
          rachaActual: prog.racha_actual || 0,
          mejorRacha: prog.mejor_racha || 0,
          vecesOlvidado: prog.veces_olvidado || 0
        }
      : window.repeticionEspaciada.crearTarjeta();
    const calidad = correcto ? 4 : 0;
    const res = window.repeticionEspaciada.calcularProximoRepaso(base, calidad);
    const nivel = window.repeticionEspaciada.nivelJuego(res.rachaActual, res.intervalo);
    await guardarProgreso(usuarioId, tarjetaId, { ...res, nivel });

    // Registrar repaso (con fallback si la columna usuario_id no existe)
    if (sb() && navigator.onLine) {
      try {
        if (caps.usuarioRepaso) {
          const { error } = await sb().from('repasos_memorizacion').insert({ tarjeta_id: tarjetaId, calidad, usuario_id: usuarioId });
          if (error) caps.usuarioRepaso = false;
        }
        if (!caps.usuarioRepaso) {
          await sb().from('repasos_memorizacion').insert({ tarjeta_id: tarjetaId, calidad });
        }
      } catch (e) {
        try { await sb().from('repasos_memorizacion').insert({ tarjeta_id: tarjetaId, calidad }); } catch (e2) {}
      }
    } else {
      window.colaSync.encolar('insert', 'repasos_memorizacion', { tarjeta_id: tarjetaId, calidad, usuario_id: usuarioId });
    }
    return { progreso: { ...res, nivel }, correcto };
  }

  async function obtenerTarjeta(id) {
    if (!sb() || !id) return null;
    try {
      const { data } = await sb().from('tarjetas_memorizacion').select('*').eq('id', id).limit(1);
      return (data && data[0]) || null;
    } catch (e) { return null; }
  }

  /* Progreso SM-2 directo (legacy) para tarjetas personales antiguas */
  async function actualizarTarjeta(tarjeta) {
    // En el modo juego el progreso va a progreso_tarjetas_memorizacion.
    // Este método conserva compatibilidad: si la tarjeta tiene usuario_id propio, actualiza ahí.
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
    if (sb() && navigator.onLine && tarjeta.id) {
      await sb().from('tarjetas_memorizacion').update(datos).eq('id', tarjeta.id);
    }
  }

  async function registrarRepaso(tarjetaId, calidad) {
    if (!sb() || !navigator.onLine) return;
    try { await sb().from('repasos_memorizacion').insert({ tarjeta_id: tarjetaId, calidad }); } catch (e) {}
  }

  async function contarTarjetas(usuarioId, mazoId) {
    if (!sb()) return 0;
    try {
      let q = sb().from('tarjetas_memorizacion').select('id', { count: 'exact', head: true }).eq('activa', true);
      if (mazoId) q = q.eq('mazo_id', mazoId);
      const { count } = await q;
      return count || 0;
    } catch (e) { return 0; }
  }

  async function desactivarTarjeta(id) {
    if (!sb() || !navigator.onLine || !id) return;
    await sb().from('tarjetas_memorizacion').update({ activa: false }).eq('id', id);
  }

  async function duplicarTarjeta(id) {
    const t = await this.obtenerTarjeta(id);
    if (!t) return null;
    return this.crearTarjetaGlobal({
      mazo_id: t.mazo_id,
      tipo: t.tipo || 'versiculo',
      pregunta: t.pregunta || '',
      respuesta: t.respuesta || '',
      texto: t.texto || '',
      referencia: t.referencia || '',
      explicacion: t.explicacion || '',
      opciones: t.opciones || null,
      pista: t.pista || '',
      libro: t.libro || '',
      capitulo: t.capitulo || '',
      versiculo: t.versiculo || '',
      orden: (t.orden != null ? t.orden : 0) + 1000,
      creado_por: t.creado_por
    });
  }

  async function totalRepasos(usuarioId) {
    if (!sb()) return 0;
    try {
      const { count } = await sb().from('repasos_memorizacion').select('id', { count: 'exact', head: true }).eq('usuario_id', usuarioId);
      return count || 0;
    } catch (e) { return 0; }
  }

  /* ── Exportar / importar mazo (JSON) ── */
  async function exportarMazo(mazoId) {
    const tarjetas = await this.listarTarjetas(null, mazoId);
    const mazos = await this.listarMazos(null);
    const mazo = mazos.find(m => m.id === mazoId) || {};
    return JSON.stringify({
      nombre: mazo.nombre || '',
      descripcion: mazo.descripcion || '',
      color: mazo.color || '#3B82F6',
      icono: mazo.icono || 'layers',
      tarjetas: tarjetas.map(t => ({
        tipo: t.tipo, pregunta: t.pregunta, respuesta: t.respuesta,
        texto: t.texto, referencia: t.referencia, explicacion: t.explicacion,
        opciones: t.opciones, pista: t.pista, libro: t.libro,
        capitulo: t.capitulo, versiculo: t.versiculo
      }))
    }, null, 2);
  }

  async function importarMazo(adminId, json, { nombre } = {}) {
    let datos;
    try { datos = JSON.parse(json); } catch (e) { throw new Error('JSON inválido'); }
    const nombreMazo = (nombre || datos.nombre || 'Mazo importado').trim();
    const mazo = await this.crearMazo(adminId, {
      nombre: nombreMazo,
      descripcion: datos.descripcion || '',
      color: datos.color || '#3B82F6',
      icono: datos.icono || 'layers',
      es_global: true
    });
    const tarjetas = Array.isArray(datos.tarjetas) ? datos.tarjetas : [];
    for (const t of tarjetas) {
      await this.crearTarjetaGlobal({ ...t, mazo_id: mazo.id, creado_por: adminId });
    }
    return { mazo, tarjetas: tarjetas.length };
  }

  /* Sembrar mazos desde data/*.json */
  async function sembrarMazos(adminId) {
    if (!window.sembradorMemorizacion) throw new Error('Sembrador no disponible');
    return window.sembradorMemorizacion.sembrarTodo(adminId || null);
  }

  window.memorizacionRepository = {
    listarMazos,
    crearMazo,
    actualizarMazo,
    eliminarMazo,
    listarTarjetas,
    tarjetasPendientes,
    listarProgreso,
    obtenerProgreso,
    guardarProgreso,
    crearTarjetaGlobal,
    agregarTarjetaManual,
    actualizarContenido,
    actualizarTarjeta,
    registrarRepaso,
    registrarResultado,
    obtenerTarjeta,
    contarTarjetas,
    desactivarTarjeta,
    duplicarTarjeta,
    totalRepasos,
    exportarMazo,
    importarMazo,
    sembrarMazos
  };
})();
