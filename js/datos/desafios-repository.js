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

      const notifs = filas
        .filter(f => f.estado === 'invitado')
        .map(f => ({
          usuario_id: f.usuario_id,
          tipo: 'desafio',
          titulo: `${creador.nombre_completo || creador.username} te ha desafiado`,
          cuerpo: `Mazo: ${mazo.nombre}`,
          datos: { desafio_id: desafio.id, mazo_id: mazo.id, mazo_nombre: mazo.nombre }
        }));
      if (notifs.length) {
        try {
          const { error: notifErr } = await sb().from('notificaciones').insert(notifs);
          if (notifErr) console.warn('[Desafíos] Error insertando notificaciones:', notifErr.message);
          else {
            // Forzar notificación nativa inmediata para los invitados
            // (el poller tarda hasta 6s, esto es instantáneo si hay permiso)
            notifs.forEach(n => {
              if (window.notifications) {
                window.notifications.notificarDesafio(
                  creador.nombre_completo || creador.username || 'Alguien',
                  mazo.nombre,
                  desafio.id
                );
              }
            });
          }
        } catch (e) {
          console.warn('[Desafíos] No se pudo insertar notificaciones (¿tabla inexistente?):', e.message);
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
        sb().from('desafios').select('*').eq('id', desafioId).limit(1),
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
        if (d && d.creador_id) {
          try {
            await sb().from('notificaciones').insert({
              usuario_id: d.creador_id, tipo: 'info',
              titulo: 'Desafío rechazado',
              cuerpo: `Un participante rechazó el desafío de ${d.mazo_nombre || 'memorización'}.`,
              datos: { desafio_id: desafioId }
            });
          } catch (e) {}
        }
        return { empezado: false };
      }

      const { data: ps } = await sb().from('desafio_participantes').select('estado').eq('desafio_id', desafioId);
      const todos = (ps || []).length >= 2 && (ps || []).every(p => p.estado === 'aceptado');
      if (todos) {
        const iniciadoEn = new Date(Date.now() + CUENTA_ATRAS_SEG * 1000).toISOString();
        await sb().from('desafios').update({ estado: 'en_curso', iniciado_en: iniciadoEn }).eq('id', desafioId);
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
      }
    }
  };
})();
