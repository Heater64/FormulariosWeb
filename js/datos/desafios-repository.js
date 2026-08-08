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
      const { data: desafio, error } = await sb().from('desafios').insert({
        creador_id: creador.id,
        mazo_id: mazo.id,
        mazo_nombre: mazo.nombre,
        estado: iniciarInmediato ? 'en_curso' : 'invitacion',
        sesion: sesionSerializada,
        tiempo_limite_seg: tiempoLimiteSeg,
        iniciado_en: iniciarInmediato ? new Date(Date.now() + CUENTA_ATRAS_SEG * 1000).toISOString() : null,
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

    // Notificaciones no leídas de tipo desafío (para el badge/banner global)
    async notificacionesPendientes(usuarioId) {
      if (!sb() || !usuarioId) return [];
      try {
        const { data } = await sb().from('notificaciones')
          .select('*')
          .eq('usuario_id', usuarioId)
          .eq('leida', false)
          .eq('tipo', 'desafio')
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

      // Auto-abandonar a quien no terminó dentro del límite + margen
      if (desafio.estado === 'en_curso' && desafio.iniciado_en) {
        const tope = new Date(new Date(desafio.iniciado_en).getTime() + (desafio.tiempo_limite_seg + MARGEN_ABANDONO_SEG) * 1000);
        const vagos = participantes.filter(p =>
          ['aceptado', 'en_juego'].includes(p.estado) && new Date(tope) < new Date()
        );
        for (const v of vagos) {
          v.estado = 'abandonado';
          try { await sb().from('desafio_participantes').update({ estado: 'abandonado' })
            .eq('desafio_id', desafioId).eq('usuario_id', v.usuario_id); } catch (e) {}
        }
        await this._verificarFinalizado(desafio, participantes);
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
        const iniciadoEn = new Date(Date.now() + CUENTA_ATRAS_SEG * 1000).toISOString();
        await sb().from('desafios').update({ estado: 'en_curso', iniciado_en: iniciadoEn }).eq('id', desafioId);
        // Avisar al resto de participantes que el desafío arranca
        if (window.notificationService) {
          const { data: dMazo } = await sb().from('desafios').select('mazo_nombre').eq('id', desafioId).single();
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

    async marcarEnJuego(desafioId, usuarioId) {
      if (!sb()) return;
      try { await sb().from('desafio_participantes').update({ estado: 'en_juego' })
        .eq('desafio_id', desafioId).eq('usuario_id', usuarioId); } catch (e) {}
    },

    // Termina el turno del jugador y, si todos terminaron, cierra el desafío.
    async terminarJugador(desafioId, usuarioId, { correctas, total, tiempoMs }) {
      if (!sb()) return;
      await sb().from('desafio_participantes').update({
        estado: 'terminado', correctas, total, tiempo_ms: tiempoMs
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

    async _verificarFinalizado(desafio, participantes) {
      if (!desafio || desafio.estado !== 'en_curso') return;
      const fin = (participantes || []).every(p =>
        ['terminado', 'abandonado', 'rechazado'].includes(p.estado));
      if (fin && (participantes || []).some(p => p.estado === 'terminado')) {
        try {
          await sb().from('desafios').update({
            estado: 'finalizado', finalizado_en: new Date().toISOString()
          }).eq('id', desafio.id);
        } catch (e) {}
        // Avisar a los participantes con el resultado
        if (window.notificationService) {
          const ids = (participantes || []).map(p => p.usuario_id).filter(Boolean);
          window.notificationService.emitir('desafio.finalizado', {
            desafioId: desafio.id,
            mazo: desafio.mazo_nombre,
            destinatarios: ids
          }).catch(() => {});
        }
      }
    }
  };
})();
