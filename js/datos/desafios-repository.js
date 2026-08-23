(function() {
  'use strict';
  const sb = () => window.supabaseClient;
  const J = () => window.ejerciciosMemorizacion;

  // Segundos de cuenta atrás cuando todos aceptan la invitación
  const CUENTA_ATRAS_SEG = 5;
  // Margen extra (s) para auto-abandonar a quien no termina a tiempo
  const MARGEN_ABANDONO_SEG = 30;
  // Expiración de la invitación (min)
  const EXPIRA_MIN = 15;

  window.desafiosRepository = {

    /**
     * Barre y cierra desafíos vencidos/abandonados para que ninguno quede
     * abierto con el reloj contando para siempre. Se llama desde el poller de
     * notificaciones (~cada minuto, con la app abierta) y desde el cierre de
     * otros desafíos.
     *
     * Con la migración 038 aplicada: una sola RPC global (SECURITY DEFINER)
     * cierra invitaciones expiradas, participantes vencidos (límite +30s),
     * sin-límite abiertos hace >24h, y finaliza los que quedaron sin activos.
     * Sin la migración (fallback): barre los desafíos en_curso del usuario
     * con la RPC antigua y finaliza vía obtenerDesafio.
     */
    async sweepVencidos() {
      if (!sb()) return 0;
      let total = 0;
      try {
        const usuario = window.store && window.store.obtener ? window.store.obtener('usuario') : null;
        if (!usuario || !usuario.id) return 0;
        const { data: ps } = await sb().from('desafio_participantes')
          .select('desafio_id')
          .eq('usuario_id', usuario.id)
          .in('estado', ['invitado', 'aceptado', 'en_juego']);
        const ids = [...new Set((ps || []).map(p => p.desafio_id))];
        for (const id of ids) {
          const { data: afectados, error } = await sb().rpc('desafio_cerrar_vencido', { p_desafio_id: id });
          if (!error && Number(afectados) > 0) {
            total += Number(afectados);
          }
        }
      } catch (e) { /* best-effort */ }
      return total;
    },

    // Mazos disponibles para desafiar: solo mazos globales (visibles para todos)
    async listarMazosDesafio() {
      if (!sb()) return [];
      try {
        const mazos = await window.memorizacionRepository.listarMazos(null);
        return (mazos || []).filter(m => m.es_global === true);
      } catch (e) { console.warn('[Desafíos] No se pudieron listar mazos:', e.message); return []; }
    },

    /**
     * Crea un desafío con una sesión IDÉNTICA para todos los participantes
     * (snapshot serializado en `desafios.sesion`). Notifica a los invitados.
     */
    async crearDesafio({ creador, participantes, mazo, sesion, tiempoLimiteSeg = 120, iniciarInmediato = false, finalizaPrimerTerminado = false }) {
      if (!sb()) throw new Error('Sin conexión');
      // null = desafío SIN límite de tiempo (solo termina al responder todo o
      // si el servidor cierra el desafío). Cualquier valor con límite no baja
      // de 1 minuto (requisito del producto). El modo carrera ("el primero
      // que acabe") es por definición sin límite de tiempo: se cierra cuando
      // el primer participante termina.
      const limiteSeg = finalizaPrimerTerminado ? null : (tiempoLimiteSeg == null ? null : Math.max(60, Math.round(tiempoLimiteSeg)));
      const sesionSerializada = J().serializarSesion(sesion);
      const ids = [...new Set((participantes || []).map(p => p.usuario_id || p.id).filter(Boolean))]
        .filter(uid => uid !== creador.id);
      const { data: desafioRpc, error } = await sb().rpc('crear_desafio_seguro', {
        p_mazo_id: mazo.id,
        p_mazo_nombre: mazo.nombre,
        p_sesion: sesionSerializada,
        p_participantes: ids,
        p_tiempo_limite_seg: limiteSeg,
        p_expira_en: new Date(Date.now() + EXPIRA_MIN * 60000).toISOString(),
        p_iniciar_inmediato: !!iniciarInmediato,
        p_finaliza_primer_terminado: !!finalizaPrimerTerminado
      });
      if (error) throw error;
      // PostgREST puede devolver un compuesto como objeto o como lista de una
      // fila según la versión/configuración del endpoint RPC.
      const desafio = Array.isArray(desafioRpc) ? desafioRpc[0] : desafioRpc;
      if (!desafio || !desafio.id) throw new Error('El servidor no devolvió el desafío creado.');
      const filas = [{ usuario_id: creador.id, estado: 'aceptado' },
        ...ids.map(uid => ({ usuario_id: uid, estado: iniciarInmediato ? 'aceptado' : 'invitado' }))];
      // Notificar a los invitados a través del Notification Service
      // (persiste en BD + banner/nativa según preferencias)
      const invitados = filas.filter(f => f.estado === 'invitado').map(f => f.usuario_id);
      if (invitados.length && window.notificationService) {
        window.notificationService.emitir('desafio.creado', {
          desafioId: desafio.id,
          creador: creador.nombre_completo || creador.username || 'Alguien',
          mazo: mazo.nombre,
          destinatarios: invitados,
          datos: { desafio_id: desafio.id, mazo_id: mazo.id, mazo_nombre: mazo.nombre }
        }).catch(e => console.warn('[Desafíos] Notificación:', e.message));
      }

      return desafio;
    },

    // Invitaciones pendientes del usuario (con datos del creador y del mazo)
    async misInvitaciones(usuarioId) {
      if (!sb() || !usuarioId) return [];
      try {
        const { data } = await sb().from('desafio_participantes')
          .select('*, desafios(*, perfiles!creador_id(nombre_completo, username, foto_perfil))')
          .eq('usuario_id', usuarioId)
          .eq('estado', 'invitado')
          .order('creado_en', { ascending: false });
        const lista = (data || []).map(d => d.desafios).filter(Boolean);
        // Marcar expirados
        for (const d of lista) {
          if (d.estado === 'invitacion' && d.expira_en && new Date(d.expira_en).getTime() < Date.now()) {
            d.estado = 'expirado';
            try { await sb().rpc('desafio_cerrar_vencido', { p_desafio_id: d.id }); } catch (e) {}
          }
        }
        // Enlazar con la notificación del centro (tipo nuevo 'desafio.creado')
        // para poder marcarla como completada al responder desde Grupos.
        try {
          const ids = lista.filter(d => d.estado === 'invitacion').map(d => d.id);
          if (ids.length) {
            const { data: notifs } = await sb().from('notificaciones')
              .select('id, datos')
              .eq('usuario_id', usuarioId)
              .in('tipo', ['desafio', 'desafio.creado'])
              .in('estado', ['nueva', 'vista'])
              .limit(50);
            const porDesafio = {};
            (notifs || []).forEach(n => {
              const dId = (n.datos && (n.datos.desafio_id || n.datos.desafioId));
              if (dId) porDesafio[dId] = n.id;
            });
            lista.forEach(d => { if (porDesafio[d.id]) d._notifId = porDesafio[d.id]; });
          }
        } catch (e) { /* enlazar notificación es opcional */ }
        return lista.filter(d => d.estado === 'invitacion');
      } catch (e) { console.warn('[Desafíos] Invitaciones:', e.message); return []; }
    },

    // Notificaciones no leídas de tipo desafío (para el badge/banner global).
    // El servicio emite tipos nuevos ('desafio.creado', 'desafio.aceptado', ...)
    // y tipos legacy ('desafio'); se consultan todos.
    async notificacionesPendientes(usuarioId) {
      if (!sb() || !usuarioId) return [];
      try {
        const { data } = await sb().from('notificaciones')
          .select('*')
          .eq('usuario_id', usuarioId)
          .eq('leida', false)
          .in('tipo', ['desafio', 'desafio.creado', 'desafio.aceptado', 'desafio.rechazado', 'desafio.iniciado', 'desafio.finalizado'])
          .order('creado_en', { ascending: false })
          .limit(10);
        return data || [];
      } catch { return []; }
    },

    async marcarNotificacionLeida(notifId) {
      if (!sb() || !notifId) return;
      try { await sb().from('notificaciones').update({ leida: true }).eq('id', notifId); } catch (e) {}
    },

    /**
     * Detalle completo de un desafío. Hidrata la sesión (re-engancha los
     * verificadores) y auto-abandona participantes que no terminaron a tiempo
     * para que los resultados siempre lleguen a mostrarse.
     */
    async obtenerDesafio(desafioId) {
      if (!sb()) return null;
      const [dRes, pRes] = await Promise.all([
        // Incluir el creador (join to-one) para mostrar "<creador> te ha desafiado"
        sb().from('desafios').select('*, perfiles!creador_id(nombre_completo, username, foto_perfil)').eq('id', desafioId).limit(1),
        sb().from('desafio_participantes')
          .select('*, perfiles(id, nombre_completo, username, foto_perfil, rol, creado_en, biografia)')
          .eq('desafio_id', desafioId)
          .order('orden')
      ]);
      const desafio = dRes.data && dRes.data[0];
      if (!desafio) return null;

      // Invitación expirada
      if (desafio.estado === 'invitacion' && desafio.expira_en && new Date(desafio.expira_en).getTime() < Date.now()) {
        try { await sb().rpc('desafio_cerrar_vencido', { p_desafio_id: desafio.id }); } catch (e) {}
        desafio.estado = 'expirado';
      }

      const participantes = (pRes.data || []).map(p => ({ ...p, perfil: p.perfiles || null }));

      // Auto-abandonar a quien no terminó dentro del límite + margen. Con el
      // RLS cerrado (028-C) cada cliente NO puede actualizar filas ajenas;
      // el abandono de vencidos se hace en el servidor vía RPC SECURITY
      // DEFINER (migración 030). Si la RPC marcó a alguien, se re-lee la
      // lista para que la comprobación de finalización vea el estado nuevo.
      if (desafio.estado === 'en_curso' && desafio.iniciado_en) {
        const hayCandidatos = participantes.some(p => ['aceptado', 'en_juego'].includes(p.estado));
        if (hayCandidatos) {
          try {
            const { data: afectados } = await sb().rpc('desafio_cerrar_vencido', { p_desafio_id: desafioId });
            if (Number(afectados) > 0) {
              const { data: pRes2 } = await sb().from('desafio_participantes')
                .select('*, perfiles(id, nombre_completo, username, foto_perfil, rol, creado_en, biografia)')
                .eq('desafio_id', desafioId)
                .order('orden');
              participantes.length = 0;
              participantes.push(...(pRes2 || []).map(p => ({ ...p, perfil: p.perfiles || null })));
            }
          } catch (e) { /* la RPC es best-effort */ }
        }
        if (desafio.estado === 'en_curso' && !participantes.some(p => ['aceptado', 'en_juego'].includes(p.estado))) {
        desafio.estado = 'finalizado';
      }
      }

      // Hidratar solo los verificadores locales de presentación. Las claves
      // ya no llegan desde Supabase; la comprobación real ocurre por RPC.
      if (desafio.sesion && Array.isArray(desafio.sesion)) {
        desafio.sesion = J().hidratarSesion(desafio.sesion);
      }

      return { ...desafio, participantes };
    },      // Acepta/rechaza una invitación. El servidor cambia el estado y decide
      // de forma atómica si todos están listos para iniciar.
    async responderInvitacion(desafioId, usuarioId, aceptar) {
      if (!sb()) return { empezado: false };
      const { data: resultadoRpc, error } = await sb().rpc('desafio_responder_invitacion', {
        p_desafio_id: desafioId,
        p_aceptar: !!aceptar
      });
      if (error) throw error;
      const resultado = (resultadoRpc && typeof resultadoRpc === 'object')
        ? resultadoRpc
        : { empezado: resultadoRpc === true, iniciado_ahora: resultadoRpc === true };
      const empezado = resultado.empezado === true;

      if (!aceptar) {
        // La RPC ya ha cancelado el desafío; solo avisamos al creador.
        const { data: d } = await sb().from('desafios').select('creador_id, mazo_nombre').eq('id', desafioId).single();
        if (d && d.creador_id && window.notificationService) {
          let jugador = 'Un participante';
          try {
            const { data: pj } = await sb().from('perfiles').select('nombre_completo, username').eq('id', usuarioId).limit(1);
            if (pj && pj[0]) jugador = pj[0].nombre_completo || pj[0].username;
          } catch (e) {}
          window.notificationService.emitir('desafio.rechazado', {
            desafioId, mazo: d.mazo_nombre, jugador,
            destinatarios: [d.creador_id]
          }).catch(() => {});
        }
        return { empezado: false };
      }

      // Avisar al creador que alguien aceptó (se agrupa automáticamente:
      // "4 jugadores aceptaron tu desafío")
      if (window.notificationService) {
        const { data: dInfo } = await sb().from('desafios').select('creador_id, mazo_nombre').eq('id', desafioId).single();
        let jugador = 'Un participante';
        try {
          const { data: pj } = await sb().from('perfiles').select('nombre_completo, username').eq('id', usuarioId).limit(1);
          if (pj && pj[0]) jugador = pj[0].nombre_completo || pj[0].username;
        } catch (e) {}
        if (dInfo) {
          window.notificationService.emitir('desafio.aceptado', {
            desafioId, mazo: dInfo.mazo_nombre, jugador,
            destinatarios: [dInfo.creador_id],
            // `miembro` alimenta la agrupación (nombres acumulados en datos.miembros)
            datos: { desafio_id: desafioId, miembro: jugador }
          }).catch(() => {});
        }
      }

      if (empezado && resultado.iniciado_ahora !== false) {
        // La RPC informa si esta aceptación fue la que inició la partida; solo
        // entonces se emite la notificación para evitar duplicados.
        // ancla iniciado_en al reloj del SERVIDOR y es idempotente (un doble
        // clic o una aceptación concurrente no re-fija el inicio). Si la RPC
        // no existe (BD sin 031), cae al flujo antiguo: comprobar estado y,
        // si aún es 'invitacion', fijar el inicio local.
        //
        // La notificación de inicio se emite SOLO si este flujo fue quien
        // inició (el desafío aún estaba 'invitacion' al entrar): evita
        // duplicarla en dobles clics y en aceptaciones concurrentes.
        if (window.notificationService) {
          const { data: dMazo } = await sb().from('desafios').select('mazo_nombre').eq('id', desafioId).single();
          const { data: ps } = await sb().from('desafio_participantes').select('estado, usuario_id').eq('desafio_id', desafioId);
          window.notificationService.emitir('desafio.iniciado', {
            desafioId,
            mazo: (dMazo && dMazo.mazo_nombre) || 'Memorización',
            destinatarios: (ps || []).map(p => p.usuario_id).filter(id => id !== usuarioId)
          }).catch(() => {});
        }
        return { empezado: true };
      }
      return { empezado: false };
    },

    async marcarEnJuego(desafioId) {
      if (!sb()) return false;
      const { data, error } = await sb().rpc('desafio_marcar_en_juego', { p_desafio_id: desafioId });
      if (error) throw error;
      return !!data;
    },

    // Guarda el progreso del participante (persistencia al recargar/cerrar
    // la app a mitad de desafío). Idempotente: solo se sobrescribe.
    async guardarProgreso(desafioId, usuarioId, progreso) {
      if (!sb()) return false;
      const { data, error } = await sb().rpc('desafio_guardar_progreso', {
        p_desafio_id: desafioId,
        p_progreso: progreso || {}
      });
      if (error) throw error;
      return !!data;
    },

    async comprobarRespuesta(desafioId, ejercicioId, respuesta) {
      if (!sb()) throw new Error('Sin conexión');
      const { data, error } = await sb().rpc('desafio_comprobar_respuesta', {
        p_desafio_id: desafioId,
        p_ejercicio_id: String(ejercicioId),
        p_respuesta: respuesta == null ? null : respuesta
      });
      if (error) throw error;
      return !!(data && data.correcta);
    },

    // Termina el turno del jugador y, si todos terminaron, cierra el desafío.
    async terminarJugador(desafioId, usuarioId, { respuestas, tiempoMs }) {
      if (!sb()) throw new Error('Sin conexión');
      const { data, error } = await sb().rpc('desafio_terminar_jugador', {
        p_desafio_id: desafioId,
        p_respuestas: respuestas || {},
        p_tiempo_ms: Math.max(0, Math.round(Number(tiempoMs) || 0))
      });
      if (error) throw error;
      return data || null;
    },

    // Abandona (Salir durante el juego): el desafío termina para el resto
    async abandonar(desafioId, usuarioId) {
      if (!sb()) return;
      await sb().rpc('desafio_abandonar_jugador', { p_desafio_id: desafioId });
      const desafio = await this.obtenerDesafio(desafioId);
      // Avisar al rival con un toast cuando se abandona a mitad de partida
      // (solo en 'en_curso'; salir de la pantalla de espera/invitación no
      // notifica: el desafío aún no ha empezado).
      if (desafio && desafio.estado === 'en_curso' && window.notificationService) {
        const rivales = (desafio.participantes || [])
          .map(p => p.usuario_id).filter(id => id && id !== usuarioId);
        if (rivales.length) {
          let jugador = 'Un participante';
          try {
            const { data: pj } = await sb().from('perfiles').select('nombre_completo, username').eq('id', usuarioId).limit(1);
            if (pj && pj[0]) jugador = pj[0].nombre_completo || pj[0].username;
          } catch (e) {}
          window.notificationService.emitir('desafio.abandonado', {
            desafioId, mazo: desafio.mazo_nombre, jugador,
            destinatarios: rivales
          }).catch(() => {});
        }
      }
    },

    // Revancha: nuevo desafío con el mismo mazo y los mismos participantes
    async revancha({ creador, mazo, sesion, participantes, tiempoLimiteSeg = 120, finalizaPrimerTerminado = false }) {
      return this.crearDesafio({ creador, participantes, mazo, sesion, tiempoLimiteSeg, finalizaPrimerTerminado });
    },

    /**
     * El creador elimina a un invitado que NO ha respondido, para poder
     * empezar con los que estén listos (estado 'eliminado', no se borra la
     * fila: el invitado ve un aviso y no rompe la finalización del desafío).
     * Solo desde 'invitado' (pantalla de espera, antes de arrancar) y solo
     * si quedan al menos 2 participantes activos tras la eliminación — si
     * solo queda 1, no se puede jugar: mejor salir del desafío.
     */
    async eliminarInvitado(desafioId, invitadoId) {
      if (!sb()) return;
      // Estado 'eliminado' (migración 037 aplicada): el expulsado ve un aviso
      // amable. Si la BD aún no tiene esa migración (CHECK sin 'eliminado' →
      // error 23514), cae al DELETE: la política RLS desafio_participantes_delete
      // ya permite al creador borrar la fila, y el expulsado verá el aviso
      // genérico "No participas en este desafío".
      const { error: errorEliminado } = await sb().rpc('desafio_eliminar_invitado', {
        p_desafio_id: desafioId,
        p_usuario_id: invitadoId
      });
      if (errorEliminado) throw errorEliminado;

      // Su notificación pendiente deja de ser accionable (no puede aceptar un
      // reto del que ya fue expulsado).
      try {
        const { data: notifs } = await sb().from('notificaciones')
          .select('id')
          .eq('desafio_id', desafioId).eq('usuario_id', invitadoId)
          .eq('tipo', 'desafio.creado').eq('estado', 'nueva')
          .limit(1);
        if (notifs && notifs[0]) {
          await sb().from('notificaciones').update({ estado: 'completada' }).eq('id', notifs[0].id);
        }
      } catch (e) { /* best-effort */ }

      // La RPC solo elimina al invitado. El siguiente refresco reflejará si
      // el servidor pudo iniciar con los participantes restantes.
    },

    // La finalización y los resultados se calculan únicamente en las RPC
    // server-side de la migración 049. No hay un fallback de UPDATE desde el
    // navegador: si la migración no está desplegada, la operación falla de
    // forma visible y no deja datos manipulables.
  };
})();
