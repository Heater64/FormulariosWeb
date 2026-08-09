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
    async crearDesafio({ creador, participantes, mazo, sesion, tiempoLimiteSeg = 120, iniciarInmediato = false }) {
      if (!sb()) throw new Error('Sin conexión');
      const sesionSerializada = J().serializarSesion(sesion);
      // Se inserta siempre como 'invitacion': si iniciarInmediato, el inicio
      // se fija DESPUÉS vía RPC desafio_iniciar (031) para anclarlo al reloj
      // del servidor (un reloj de cliente desviado desfasaría la cuenta atrás
      // de todos los participantes y el auto-abandono).
      const { data: desafio, error } = await sb().from('desafios').insert({
        creador_id: creador.id,
        mazo_id: mazo.id,
        mazo_nombre: mazo.nombre,
        estado: 'invitacion',
        sesion: sesionSerializada,
        tiempo_limite_seg: tiempoLimiteSeg,
        iniciado_en: null,
        expira_en: new Date(Date.now() + EXPIRA_MIN * 60000).toISOString()
      }).select().single();
      if (error) throw error;

      // Participantes: el creador entra directamente (aceptado)
      // Usamos p.usuario_id porque los participantes pueden venir de
      // desafio_participantes (donde .id es el row ID, no el user ID)
      const ids = new Set(participantes.map(p => p.usuario_id || p.id));
      ids.add(creador.id);
      const filas = [...ids].map((uid, i) => ({
        desafio_id: desafio.id,
        usuario_id: uid,
        estado: (iniciarInmediato || uid === creador.id) ? 'aceptado' : 'invitado',
        orden: i
      }));
      const { error: err2 } = await sb().from('desafio_participantes').insert(filas);
      if (err2) throw err2;

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

      // Revancha inmediata: arrancar en el servidor (idempotente; si la RPC
      // no existe, fallback al reloj local). El resto de participantes ya
      // entró como 'aceptado', así que solo falta fijar el inicio.
      if (iniciarInmediato) {
        try {
          await sb().rpc('desafio_iniciar', { p_desafio_id: desafio.id });
        } catch (e) {
          const iniciadoEn = new Date(Date.now() + CUENTA_ATRAS_SEG * 1000).toISOString();
          await sb().from('desafios').update({ estado: 'en_curso', iniciado_en: iniciadoEn }).eq('id', desafio.id).catch(() => {});
        }
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
            try { await sb().from('desafios').update({ estado: 'expirado' }).eq('id', d.id); } catch (e) {}
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
        desafio.estado = 'expirado';
        try { await sb().from('desafios').update({ estado: 'expirado' }).eq('id', desafioId); } catch (e) {}
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
            const { data: afectados } = await sb().rpc('desafio_abandonar_vencidos', { p_desafio_id: desafioId });
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
        if (await this._verificarFinalizado(desafio, participantes)) {
          // Reflejar la finalización en memoria para que la segunda llamada
          // (_verificarFinalizado desde terminarJugador/abandonar) sea no-op
          // y no genere notificaciones ni UPDATEs duplicados.
          desafio.estado = 'finalizado';
        }
      }

      // Hidratar la sesión idéntica
      if (desafio.sesion && Array.isArray(desafio.sesion)) {
        desafio.sesion = J().hidratarSesion(desafio.sesion);
      }

      return { ...desafio, participantes };
    },

    // Acepta/rechaza una invitación. Si TODOS aceptan → se fija iniciado_en
    // (cuenta atrás sincronizada para todos).
    async responderInvitacion(desafioId, usuarioId, aceptar) {
      if (!sb()) return { empezado: false };
      const estado = aceptar ? 'aceptado' : 'rechazado';
      await sb().from('desafio_participantes').update({ estado })
        .eq('desafio_id', desafioId).eq('usuario_id', usuarioId);

      if (!aceptar) {
        // Alguien rechazó → se cancela y se avisa al creador
        const { data: d } = await sb().from('desafios').select('creador_id, mazo_nombre').eq('id', desafioId).single();
        try { await sb().from('desafios').update({ estado: 'cancelado' }).eq('id', desafioId); } catch (e) {}
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

      const { data: ps } = await sb().from('desafio_participantes').select('estado, usuario_id').eq('desafio_id', desafioId);
      const todos = (ps || []).length >= 2 && (ps || []).every(p => p.estado === 'aceptado');
      if (todos) {
        // Iniciar UNA sola vez. Preferimos la RPC desafio_iniciar (031):
        // ancla iniciado_en al reloj del SERVIDOR y es idempotente (un doble
        // clic o una aceptación concurrente no re-fija el inicio). Si la RPC
        // no existe (BD sin 031), cae al flujo antiguo: comprobar estado y,
        // si aún es 'invitacion', fijar el inicio local.
        //
        // La notificación de inicio se emite SOLO si este flujo fue quien
        // inició (el desafío aún estaba 'invitacion' al entrar): evita
        // duplicarla en dobles clics y en aceptaciones concurrentes.
        let eraInvitacion = false;
        try {
          const { data: dEstado } = await sb().from('desafios').select('estado').eq('id', desafioId).limit(1);
          eraInvitacion = dEstado && dEstado[0] && dEstado[0].estado === 'invitacion';
        } catch (e) { /* best-effort */ }
        if (eraInvitacion) {
          try {
            await sb().rpc('desafio_iniciar', { p_desafio_id: desafioId });
          } catch (e) {
            // Fallback: BD sin 031 → fijar el inicio con el reloj local
            const iniciadoEn = new Date(Date.now() + CUENTA_ATRAS_SEG * 1000).toISOString();
            await sb().from('desafios').update({ estado: 'en_curso', iniciado_en: iniciadoEn }).eq('id', desafioId);
          }
          // Avisar al resto de participantes que el desafío arranca
          if (window.notificationService) {
            const { data: dMazo } = await sb().from('desafios').select('mazo_nombre').eq('id', desafioId).single();
            window.notificationService.emitir('desafio.iniciado', {
              desafioId,
              mazo: (dMazo && dMazo.mazo_nombre) || 'Memorización',
              destinatarios: (ps || []).map(p => p.usuario_id).filter(id => id !== usuarioId)
            }).catch(() => {});
          }
        }
        return { empezado: true };
      }
      return { empezado: false };
    },

    async marcarEnJuego(desafioId, usuarioId) {
      if (!sb()) return;
      try {
        // Solo desde 'aceptado' → 'en_juego'. Nunca sobrescribir un estado
        // terminal ('terminado'/'abandonado'/'rechazado'): una re-entrada
        // tardía de _empezarJuego (carrera con terminarJugador cuando el
        // tiempo expira) revertiría el resultado ya guardado y dejaría el
        // desafío sin cerrarse nunca (ambos jugadores a 0/10, tiempo 320s
        // en producción).
        await sb().from('desafio_participantes').update({ estado: 'en_juego' })
          .eq('desafio_id', desafioId).eq('usuario_id', usuarioId)
          .in('estado', ['aceptado']);
      } catch (e) {}
    },

    // Guarda el progreso del participante (persistencia al recargar/cerrar
    // la app a mitad de desafío). Idempotente: solo se sobrescribe.
    async guardarProgreso(desafioId, usuarioId, progreso) {
      if (!sb()) return;
      try {
        await sb().from('desafio_participantes').update({ progreso })
          .eq('desafio_id', desafioId).eq('usuario_id', usuarioId);
      } catch (e) { /* silencioso: el progreso es best-effort */ }
    },

    // Termina el turno del jugador y, si todos terminaron, cierra el desafío.
    async terminarJugador(desafioId, usuarioId, { correctas, total, tiempoMs }) {
      if (!sb()) return;
      await sb().from('desafio_participantes').update({
        estado: 'terminado', correctas, total, tiempo_ms: tiempoMs, progreso: null
      }).eq('desafio_id', desafioId).eq('usuario_id', usuarioId);
      const desafio = await this.obtenerDesafio(desafioId);
      if (desafio) await this._verificarFinalizado(desafio, desafio.participantes);
    },

    // Abandona (Salir durante el juego): el desafío termina para el resto
    async abandonar(desafioId, usuarioId) {
      if (!sb()) return;
      await sb().from('desafio_participantes').update({ estado: 'abandonado' })
        .eq('desafio_id', desafioId).eq('usuario_id', usuarioId);
      const desafio = await this.obtenerDesafio(desafioId);
      if (desafio) await this._verificarFinalizado(desafio, desafio.participantes);
    },

    // Revancha: nuevo desafío con el mismo mazo y los mismos participantes
    async revancha({ creador, mazo, sesion, participantes, tiempoLimiteSeg = 120 }) {
      return this.crearDesafio({ creador, participantes, mazo, sesion, tiempoLimiteSeg });
    },

    // Devuelve true si el desafío quedó finalizado (para que el llamador
    // pueda reflejarlo en memoria y evitar notificaciones/UPDATEs duplicados
    // cuando varios flujos verifican la finalización en la misma llamada).
    async _verificarFinalizado(desafio, participantes) {
      if (!desafio || desafio.estado !== 'en_curso') return false;
      const fin = (participantes || []).every(p =>
        ['terminado', 'abandonado', 'rechazado'].includes(p.estado));
      if (fin) {
        // Todos alcanzaron un estado terminal. Si nadie terminó (todos
        // abandonaron/rechazaron) el desafío también debe cerrarse: si no,
        // quedaría colgado en 'en_curso' para siempre sin resultados.
        const hayResultado = (participantes || []).some(p => p.estado === 'terminado');
        try {
          await sb().from('desafios').update({
            estado: 'finalizado', finalizado_en: new Date().toISOString()
          }).eq('id', desafio.id);
        } catch (e) {}
        // Avisar a los participantes con el resultado (si alguien jugó) o del
        // cierre (si todos abandonaron).
        if (window.notificationService) {
          const ids = (participantes || []).map(p => p.usuario_id).filter(Boolean);
          window.notificationService.emitir(hayResultado ? 'desafio.finalizado' : 'desafio.cancelado', {
            desafioId: desafio.id,
            mazo: desafio.mazo_nombre,
            destinatarios: ids
          }).catch(() => {});
        }
        return true;
      }
      return false;
    }
  };
})();
