(function () {
  'use strict';
  const E = (h) => window.helpers.escapeHtml(h);
  const I = (n) => window.Iconos.render(n);
  const $ = (c, s) => (s === undefined ? document.querySelector(c) : c.querySelector(s));
  const $$ = (c, s) => (s === undefined ? document.querySelectorAll(c) : c.querySelectorAll(s));
  const J = () => window.ejerciciosMemorizacion;

  const TIPOS_NOMBRE = {
    completar: 'Completar palabras',
    ordenar: 'Ordenar palabras',
    elegir_versiculo: 'Elegir el versículo',
    verdadero_falso: 'Verdadero o falso',
    relacionar: 'Relacionar',
    escrita: 'Respuesta escrita'
  };
  const TIPOS_ICONO = {
    completar: 'edit-3',
    ordenar: 'list-ordered',
    elegir_versiculo: 'book-open',
    verdadero_falso: 'check-circle',
    relacionar: 'link-2',
    escrita: 'pen-line'
  };

  function avatarHtml(m) {
    if (m && m.foto_perfil) return `<img src="${E(m.foto_perfil)}" alt="" loading="lazy">`;
    const letra = ((m && (m.nombre_completo || m.username)) || '?').charAt(0).toUpperCase();
    return `<span>${E(letra)}</span>`;
  }

  function tiempoBonito(ms) {
    if (ms == null) return '—';
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`;
  }

  window.vistaDesafio = {
    _pollTimer: null,
    _juegoTimer: null,
    _enJuego: false,

    async montar(raiz, params) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      this._usuario = usuario;
      this._raiz = raiz;
      this._desafioId = params && params.id;
      if (!this._desafioId) { router.navegar('/grupos'); return; }
      this._detenerLoops();
      this._desmontado = false;
      raiz.innerHTML = `<div class="o-contenedor u-mt-3">${window.skeleton ? window.skeleton.tarjetas(3) : '<p class="u-color-texto-terciario">Cargando desafío...</p>'}</div>`;
      await this._loop();
    },

    // Al desmontar, además de parar los timers, se marca _desmontado: si un
    // _loop ya estaba EN VUELO (await de obtenerDesafio) al navegar, su
    // continuación NO debe re-renderizar el desafío sobre la vista nueva
    // (el router reutiliza #app-root; un render tardío pisaba la vista
    // actual — bug de "vista pegajosa" al salir de un desafío).
    desmontar() { this._desmontado = true; this._detenerLoops(); },

    _detenerLoops() {
      if (this._pollTimer) clearTimeout(this._pollTimer);
      if (this._juegoTimer) clearInterval(this._juegoTimer);
      // La cuenta atrás también crea timers propios que deben morir al
      // desmontar/navegar (si no, el intervalo sigue vivo y puede llamar
      // _empezarJuego con la vista ya desmontada).
      if (this._cuentaTimer) { clearInterval(this._cuentaTimer); this._cuentaTimer = null; }
      if (this._cuentaTimeout) { clearTimeout(this._cuentaTimeout); this._cuentaTimeout = null; }
      this._pollTimer = null;
      this._juegoTimer = null;
    },

    /* ── Bucle de sincronización (polling) ── */
    async _loop() {
      if (this._enJuego) return;
      let desafio;
      try { desafio = await window.desafiosRepository.obtenerDesafio(this._desafioId); }
      catch (e) { if (this._desmontado) return; this._renderError(e.message); return; }
      if (this._desmontado || !this._raiz || !this._raiz.isConnected) return;
      if (!desafio) { this._renderError('El desafío no existe.'); return; }
      this._desafio = desafio;
      const yo = (desafio.participantes || []).find(p => p.usuario_id === this._usuario.id);
      // Acceso: solo participantes/creador/owner (el RLS ya lo bloquea en la
      // consulta; este guard es defensa en profundidad para que un no
      // participante nunca entre al juego ni vea resultados ajenos).
      if (!yo && desafio.estado !== 'finalizado') {
        this._renderMensaje('Sin acceso', 'No participas en este desafío.', 'lock');
        return;
      }
      const ahora = Date.now();

      if (desafio.estado === 'finalizado') { this._renderResultados(desafio); return; }
      if (desafio.estado === 'expirado') { this._renderMensaje('Invitación expirada', 'El desafío no se aceptó a tiempo. Puedes crear uno nuevo desde Grupos.', 'timer'); return; }
      if (desafio.estado === 'cancelado') { this._renderMensaje('Desafío cancelado', 'Uno de los participantes lo rechazó.', 'x-circle'); return; }

      if (desafio.estado === 'invitacion') {
        if (yo && yo.estado === 'invitado') this._renderInvitacion(desafio);
        else this._renderEsperando(desafio, 'Esperando a que todos acepten la invitación...');
        this._pollTimer = setTimeout(() => this._loop(), 2500);
        return;
      }

      if (desafio.estado === 'en_curso') {
        if (yo && yo.estado === 'terminado') {
          this._renderEsperando(desafio, 'Has terminado tu desafío. Estamos esperando a que los demás finalicen.');
          this._pollTimer = setTimeout(() => this._loop(), 2500);
          return;
        }
        if (yo && ['abandonado', 'rechazado'].includes(yo.estado)) {
          this._renderEsperando(desafio, 'Has salido de este desafío.');
          this._pollTimer = setTimeout(() => this._loop(), 2500);
          return;
        }
        // Invitado que nunca respondió pero el desafío ya arrancó (revancha
        // inmediata): sin este branch la pantalla quedaría con el skeleton
        // para siempre (ningún render + polling infinito).
        if (yo && yo.estado === 'invitado') {
          this._renderEsperando(desafio, 'El desafío ya ha comenzado. Puedes ver los resultados al finalizar.');
          this._pollTimer = setTimeout(() => this._loop(), 2500);
          return;
        }
        const inicio = new Date(desafio.iniciado_en).getTime();
        if (!inicio || ahora < inicio) {
          this._renderCuentaAtras(desafio, inicio);
          this._pollTimer = setTimeout(() => this._loop(), 400);
          return;
        }
        if (yo && ['aceptado', 'en_juego'].includes(yo.estado)) {
          // Si el tiempo del desafío ya se agotó pero este participante sigue
          // marcado como activo (carrera entre marcarEnJuego y terminarJugador,
          // o reconexión tras agotarse el tiempo), NO se re-entra al juego:
          // reiniciaría _estado (idx 0, correctas 0) y machacaría los aciertos
          // ya guardados. Se espera a que el servidor cierre el desafío.
          const limiteMs = (desafio.tiempo_limite_seg || 120) * 1000;
          if (ahora - inicio >= limiteMs) {
            this._renderEsperando(desafio, 'Se acabó el tiempo. Has terminado tu desafío — esperando a los demás.');
            this._pollTimer = setTimeout(() => this._loop(), 2500);
            return;
          }
          this._empezarJuego(desafio);
          return;
        }
        this._pollTimer = setTimeout(() => this._loop(), 2500);
        return;
      }

      this._pollTimer = setTimeout(() => this._loop(), 2500);
    },

    /* ── INVITACIÓN ── */
    _renderInvitacion(desafio) {
      const creador = (desafio.perfiles || {}).nombre_completo || 'Alguien';
      this._raiz.innerHTML = `
        <div class="o-contenedor desafio-pantalla">
          <div class="desafio-invitacion">
            <span class="desafio-invitacion__icono">${I('sword')}</span>
            <h2>¡Te han desafiado!</h2>
            <p class="desafio-invitacion__texto">${E(creador)} te ha desafiado al mazo <strong>${E(desafio.mazo_nombre || 'Memorización')}</strong>.</p>
            <p class="u-fs-xs u-color-texto-terciario">Todos responderéis las mismas preguntas, en el mismo orden y con el mismo tiempo.</p>
            <div class="desafio-invitacion__acciones">
              <button class="btn-primario" id="btnAceptar" style="justify-content:center">${I('check')} Aceptar</button>
              <button class="btn-secundario" id="btnRechazar" style="justify-content:center">${I('x')} Rechazar</button>
            </div>
          </div>
        </div>`;
      window.Iconos.actualizar();
      const btnAceptar = $('#btnAceptar');
      const btnRechazar = $('#btnRechazar');
      // Deshabilitar ambos botones tras el primer clic: evita que un doble
      // clic en "Aceptar" llame a responderInvitacion dos veces (que re-fijaría
      // iniciado_en y duplicaría la notificación de inicio).
      btnAceptar.onclick = async () => {
        btnAceptar.disabled = true;
        btnRechazar.disabled = true;
        try {
          const r = await window.desafiosRepository.responderInvitacion(desafio.id, this._usuario.id, true);
          if (r.empezado) { this._loop(); }
          else { window.helpers.mostrarAlerta('Has aceptado. Esperando a los demás...', 'exito'); this._loop(); }
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); btnAceptar.disabled = false; btnRechazar.disabled = false; }
      };
      btnRechazar.onclick = async () => {
        btnAceptar.disabled = true;
        btnRechazar.disabled = true;
        try {
          await window.desafiosRepository.responderInvitacion(desafio.id, this._usuario.id, false);
          window.helpers.mostrarAlerta('Has rechazado el desafío.', 'info');
          router.navegar('/grupos');
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); btnAceptar.disabled = false; btnRechazar.disabled = false; }
      };
    },

    /* ── ESPERANDO ── */
    _renderEsperando(desafio, mensaje) {
      const yoId = this._usuario.id;
      const estados = (desafio.participantes || []).map(p => {
        const clase = p.estado === 'terminado' ? '--ok' : p.estado === 'aceptado' || p.estado === 'en_juego' ? '--activo' : '--espera';
        return `
          <div class="desafio-espera__jugador">
            <span class="desafio-espera__avatar">${avatarHtml(p.perfil || {})}</span>
            <span class="desafio-espera__nombre">${E((p.perfil && (p.perfil.nombre_completo || p.perfil.username)) || 'Jugador')}${p.usuario_id === yoId ? ' (tú)' : ''}</span>
            <span class="desafio-estado desafio-estado${clase}">
              ${p.estado === 'terminado' ? I('check') + ' Terminado' : p.estado === 'aceptado' ? I('user-check') + ' Listo' : p.estado === 'en_juego' ? I('activity') + ' Jugando' : I('clock') + ' Pendiente'}
            </span>
          </div>`;
      }).join('');

      this._raiz.innerHTML = `
        <div class="o-contenedor desafio-pantalla">
          <div class="desafio-espera">
            <div class="desafio-espera__anim">
              <span class="desafio-espera__punto"></span><span class="desafio-espera__punto"></span><span class="desafio-espera__punto"></span>
            </div>
            <h2>${I('sword')} ${E(desafio.mazo_nombre || 'Desafío')}</h2>
            <p class="desafio-espera__msg">${E(mensaje)}</p>
            <div class="desafio-espera__jugadores">${estados}</div>
            <button class="btn-secundario" id="btnSalirDesafio" style="justify-content:center">${I('log-out')} Salir</button>
          </div>
        </div>`;
      window.Iconos.actualizar();
      $('#btnSalirDesafio').onclick = async () => {
        const ok = await window.helpers.confirmar('¿Salir del desafío?', { titulo: 'Salir', textoConfirmar: 'Salir' });
        if (!ok) return;
        await window.desafiosRepository.abandonar(desafio.id, this._usuario.id).catch(() => {});
        router.navegar('/grupos');
      };
    },

    /* ── CUENTA ATRÁS sincronizada ── */
    _renderCuentaAtras(desafio, inicio) {
      this._raiz.innerHTML = `
        <div class="o-contenedor desafio-pantalla">
          <div class="desafio-cuenta">
            <p class="desafio-cuenta__mazo">${I('layers')} ${E(desafio.mazo_nombre || 'Desafío')}</p>
            <p class="desafio-cuenta__label">Empieza en</p>
            <div class="desafio-cuenta__numero" id="cuentaNumero">3</div>
            <p class="desafio-cuenta__sub" id="cuentaSub">Prepara tu mente...</p>
          </div>
        </div>`;
      window.Iconos.actualizar();

      const num = $('#cuentaNumero');
      const sub = $('#cuentaSub');
      // Datos legacy pueden llegar con iniciado_en NULL/NaN (desafío en_curso
      // sin timestamp): sin esta guarda el contador nunca llegaría a 0.
      if (!Number.isFinite(inicio)) inicio = Date.now();
      const tick = () => {
        if (this._enJuego) { clearInterval(this._cuentaTimer); this._cuentaTimer = null; return; }
        const restante = inicio - Date.now();
        if (restante <= 0) {
          clearInterval(this._cuentaTimer);
          this._cuentaTimer = null;
          num.textContent = '¡Ya!';
          sub.textContent = 'Comienza...';
          this._cuentaTimeout = setTimeout(() => { this._cuentaTimeout = null; if (!this._enJuego) this._empezarJuego(this._desafio); }, 400);
          return;
        }
        const seg = Math.ceil(restante / 1000);
        num.textContent = String(Math.min(3, seg));
        if (seg <= 1) sub.textContent = '¡Prepárate!';
      };
      tick();
      // Guardar la referencia para poder limpiarla en _detenerLoops/desmontar:
      // si el usuario navega durante la cuenta atrás, el intervalo no debe
      // quedar vivo llamando a _empezarJuego sobre una vista desmontada.
      this._cuentaTimer = setInterval(tick, 200);
    },

    /* ── JUEGO ── */
    _empezarJuego(desafio) {
      if (this._enJuego) return;
      this._enJuego = true;
      this._detenerLoops();
      window.desafiosRepository.marcarEnJuego(desafio.id, this._usuario.id).catch(() => {});
      const inicioReal = new Date(desafio.iniciado_en).getTime();
      this._estado = {
        desafio,
        ejercicios: desafio.sesion || [],
        idx: 0,
        correctas: 0,
        incorrectas: 0,
        inicioMs: inicioReal,
        tiempoLimiteMs: (desafio.tiempo_limite_seg || 120) * 1000
      };
      // Restaurar progreso guardado (recarga o cierre a mitad de desafío):
      // se retoma en el ejercicio siguiente sin perder respuestas válidas.
      const miFila = (desafio.participantes || []).find(p => p.usuario_id === this._usuario.id);
      const guardado = miFila && miFila.progreso;
      if (guardado && Number.isInteger(guardado.idx) && guardado.idx > 0 && guardado.idx <= this._estado.ejercicios.length) {
        this._estado.idx = guardado.idx;
        this._estado.correctas = Math.min(Number(guardado.correctas) || 0, this._estado.ejercicios.length);
        this._estado.incorrectas = Math.min(Number(guardado.incorrectas) || 0, this._estado.ejercicios.length);
      }
      this._pintarJuego();
    },

    _pintarJuego() {
      const e = this._estado;
      this._raiz.innerHTML = `
        <div class="o-contenedor mem-juego-sesion desafio-juego">
          <div class="mem-juego-sesion__barra desafio-juego__barra">
            <span class="desafio-timer" id="desafioTimer">${tiempoBonito(Math.max(0, e.tiempoLimiteMs - (Date.now() - e.inicioMs)))}</span>
            <div class="mem-juego-sesion__track" aria-hidden="true"><div class="mem-juego-sesion__fill" id="fill" style="width:${e.ejercicios.length ? Math.round((1 / e.ejercicios.length) * 100) : 0}%"></div></div>
            <span class="desafio-progreso" id="desafioProgreso">1/${e.ejercicios.length}</span>
          </div>
          <p class="desafio-juego__vs">${I('sword')} Contra ${E(e.desafio.participantes.filter(p => p.usuario_id !== this._usuario.id).map(p => (p.perfil && (p.perfil.nombre_completo || p.perfil.username)) || 'Jugador').join(', '))}</p>
          <div id="slot" class="o-pila" style="flex:1;min-height:300px"></div>
          <button class="btn-secundario desafio-juego__salir" id="btnSalirJuego" style="justify-content:center">${I('log-out')} Salir del desafío</button>
        </div>`;
      window.Iconos.actualizar();
      $('#btnSalirJuego').onclick = async () => {
        const ok = await window.helpers.confirmar('¿Salir del desafío? Se contará como abandono.', { titulo: 'Salir', textoConfirmar: 'Salir' });
        if (!ok) return;
        this._detenerLoops();
        await window.desafiosRepository.abandonar(e.desafio.id, this._usuario.id).catch(() => {});
        router.navegar('/grupos');
      };

      // Cronómetro del desafío (mismo límite para todos)
      this._juegoTimer = setInterval(() => {
        const restante = e.tiempoLimiteMs - (Date.now() - e.inicioMs);
        const timer = $('#desafioTimer');
        if (timer) {
          timer.textContent = tiempoBonito(restante);
          timer.classList.toggle('desafio-timer--peligro', restante < 15000);
        }
        if (restante <= 0) this._finJuego(true);
      }, 250);

      this._ejercicio();
    },

    _ejercicio() {
      const e = this._estado;
      const slot = $('#slot');
      if (!slot) return;
      const ejercicio = e.ejercicios[e.idx];
      if (!ejercicio) { this._finJuego(false); return; }
      const fill = $('#fill');
      if (fill) fill.style.width = Math.round(((e.idx + 1) / e.ejercicios.length) * 100) + '%';
      const prog = $('#desafioProgreso');
      if (prog) prog.textContent = `${e.idx + 1}/${e.ejercicios.length}`;
      const renderer = this._renderers[ejercicio.tipo];
      if (renderer) renderer.call(this, slot, ejercicio);
      else { e.idx++; this._ejercicio(); }
    },

    /* ── Feedback (sin corazones: solo acierto/fallo) ── */
    _feedback(slot, ej, bien) {
      const e = this._estado;
      if (bien) e.correctas++; else e.incorrectas++;
      this._guardarProgreso();
      if (window.haptica) bien ? window.haptica.logro() : window.haptica.fallo();
      const respuestaTexto = ej.respuestaCorrecta || (ej.tipo === 'verdadero_falso' ? (ej.esVerdadero ? 'Verdadero' : 'Falso') : '');

      const fb = document.createElement('div');
      fb.className = `mem-juego-feedback mem-juego-feedback--${bien ? 'ok' : 'ko'}`;
      fb.innerHTML = `
        <p class="mem-juego-feedback__titulo">${bien ? I('check-circle') + ' ¡Correcto!' : I('x-circle') + ' Casi...'}</p>
        <p class="mem-juego-feedback__respuesta"><strong>${bien ? '' : 'Respuesta: '}</strong>${bien ? '' : E(String(respuestaTexto || ''))}</p>
        ${ej.referencia ? `<p class="mem-juego-feedback__ref">${I('book-open')} ${E(ej.referencia)}</p>` : ''}
        ${ej.explicacion ? `<p class="mem-juego-feedback__expl">${E(ej.explicacion)}</p>` : ''}`;
      window.Iconos.actualizar();

      const btn = document.createElement('button');
      btn.className = 'mem-juego-continuar';
      btn.innerHTML = `${I('arrow-right')} Continuar`;
      btn.onclick = () => { e.idx++; this._ejercicio(); };
      slot.appendChild(fb);
      slot.appendChild(btn);
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    // Persistencia del progreso (migración 030: columna progreso JSONB).
    // Se guarda tras cada respuesta; si la app se recarga o se cierra,
    // al volver se retoma el ejercicio siguiente.
    _guardarProgreso() {
      const e = this._estado;
      if (!e) return;
      const siguiente = Math.min(e.idx + 1, e.ejercicios.length);
      window.desafiosRepository.guardarProgreso(e.desafio.id, this._usuario.id, {
        idx: siguiente,
        correctas: e.correctas,
        incorrectas: e.incorrectas
      }).catch(() => {});
    },

    /* ── Fin del turno ── */
    _finJuego(porTiempo) {
      if (!this._enJuego) return;
      this._enJuego = false;
      this._detenerLoops();
      const e = this._estado;
      const total = e.ejercicios.length;
      const correctas = e.correctas;
      const tiempoMs = Date.now() - e.inicioMs;
      this._renderEsperando(this._desafio, porTiempo
        ? 'Se acabó el tiempo. Has terminado tu desafío — esperando a los demás.'
        : 'Has terminado tu desafío. Estamos esperando a que los demás finalicen.');
      window.desafiosRepository.terminarJugador(e.desafio.id, this._usuario.id, { correctas, total, tiempoMs })
        .then(() => { this._pollTimer = setTimeout(() => this._loop(), 1500); })
        .catch(() => { this._pollTimer = setTimeout(() => this._loop(), 1500); });
    },

    /* ── RESULTADOS ── */
    _renderResultados(desafio) {
      const participantes = (desafio.participantes || [])
        .map(p => ({
          ...p,
          perfil: p.perfil || {},
          abandonado: p.estado === 'abandonado' || p.estado === 'rechazado'
        }));
      const jugadores = participantes.filter(p => !p.abandonado);
      const ordenados = [...jugadores].sort((a, b) => {
        if ((b.correctas || 0) !== (a.correctas || 0)) return (b.correctas || 0) - (a.correctas || 0);
        return (a.tiempo_ms || Infinity) - (b.tiempo_ms || Infinity);
      });
      const ganador = ordenados.length ? ordenados[0] : null;
      const yo = participantes.find(p => p.usuario_id === this._usuario.id);

      const filas = participantes.map(p => {
        const pos = ordenados.indexOf(p);
        const medalla = pos === 0 && !p.abandonado ? '<span class="desafio-medalla">🥇</span>' : '';
        return `
          <div class="desafio-resultado__fila${p.abandonado ? ' desafio-resultado__fila--abandonado' : ''}">
            <span class="desafio-resultado__avatar">${avatarHtml(p.perfil)}</span>
            <span class="desafio-resultado__nombre">${E((p.perfil.nombre_completo || p.perfil.username) || 'Jugador')}${p.usuario_id === this._usuario.id ? ' <span class="grupos-miembro__tu">(tú)</span>' : ''} ${medalla}</span>
            <span class="desafio-resultado__puntos">${p.abandonado ? 'Abandonó' : `${p.correctas || 0}/${p.total || 0}`}</span>
            <span class="desafio-resultado__tiempo">${p.abandonado ? '—' : tiempoBonito(p.tiempo_ms)}</span>
          </div>`;
      }).join('');

      this._raiz.innerHTML = `
        <div class="o-contenedor desafio-pantalla">
          <div class="desafio-resultado">
            <span class="desafio-resultado__trofeo">${I('trophy')}</span>
            <h2>Resultado</h2>
            <p class="desafio-resultado__mazo">${E(desafio.mazo_nombre || 'Desafío')}</p>

            ${ganador ? `
            <div class="desafio-resultado__ganador">
              <span class="desafio-resultado__ganador-avatar">${avatarHtml(ganador.perfil)}</span>
              <p class="desafio-resultado__ganador-nombre">Ganador · ${E((ganador.perfil.nombre_completo || ganador.perfil.username) || 'Jugador')}</p>
              <p class="desafio-resultado__ganador-meta">${ganador.correctas || 0}/${ganador.total || 0} · ${tiempoBonito(ganador.tiempo_ms)}</p>
            </div>` : ''}

            <div class="desafio-resultado__tabla">${filas}</div>

            <div class="desafio-resultado__acciones">
              <button class="btn-primario" id="btnVolverJugar" style="justify-content:center">${I('rotate-ccw')} Volver a jugar</button>
              <button class="btn-secundario" id="btnRevancha" style="justify-content:center">${I('sword')} Revancha</button>
              <button class="btn-secundario" id="btnOtroMazo" style="justify-content:center">${I('layers')} Elegir otro mazo</button>
              <button class="btn-secundario" id="btnSalirResultado" style="justify-content:center">${I('log-out')} Salir</button>
            </div>
          </div>
        </div>`;
      window.Iconos.actualizar();

      const rivales = participantes.filter(p => p.usuario_id !== this._usuario.id && !p.abandonado);
      const crearNuevo = async (inmediato) => {
        try {
          if (!rivales.length) {
            window.helpers.mostrarAlerta('No hay rivales disponibles para volver a jugar.', 'advertencia');
            return;
          }
          const mazos = await window.desafiosRepository.listarMazosDesafio();
          const mazo = mazos.find(m => m.id === desafio.mazo_id) || mazos[0];
          if (!mazo) { window.helpers.mostrarAlerta('El mazo ya no está disponible.', 'advertencia'); return; }
          const tarjetas = await window.memorizacionRepository.listarTarjetas(null, mazo.id);
          const sesion = J().construirSesion(tarjetas, tarjetas, { maxTarjetas: 10 });
          const nuevo = await window.desafiosRepository.crearDesafio({
            creador: this._usuario,
            participantes: rivales,
            mazo, sesion, iniciarInmediato: inmediato
          });
          window.helpers.mostrarAlerta(inmediato ? '¡Nuevo desafío en marcha!' : 'Revancha enviada. Esperando aceptación...', 'exito');
          this._desafioId = nuevo.id;
          this._detenerLoops();
          await this._loop();
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      };

      $('#btnVolverJugar').onclick = () => crearNuevo(true);
      $('#btnRevancha').onclick = () => crearNuevo(false);
      $('#btnOtroMazo').onclick = () => router.navegar('/grupos');
      $('#btnSalirResultado').onclick = () => router.navegar('/grupos');
      void yo;
    },

    _renderMensaje(titulo, texto, icono) {
      this._raiz.innerHTML = `
        <div class="o-contenedor desafio-pantalla">
          <div class="desafio-mensaje">
            <span class="desafio-mensaje__icono">${I(icono || 'info')}</span>
            <h2>${E(titulo)}</h2>
            <p>${E(texto)}</p>
            <button class="btn-primario" id="btnIrGrupos" style="justify-content:center">${I('users')} Ir a Grupos</button>
          </div>
        </div>`;
      window.Iconos.actualizar();
      $('#btnIrGrupos').onclick = () => router.navegar('/grupos');
    },

    _renderError(msg) {
      this._raiz.innerHTML = `
        <div class="o-contenedor desafio-pantalla">
          <div class="desafio-mensaje">
            <span class="desafio-mensaje__icono">${I('alert-triangle')}</span>
            <h2>No se pudo cargar el desafío</h2>
            <p>${E(msg)}</p>
            <button class="btn-primario" id="btnReintentar" style="justify-content:center">Reintentar</button>
          </div>
        </div>`;
      window.Iconos.actualizar();
      $('#btnReintentar').onclick = () => this._loop();
    },

    /* ── Renderers por tipo de ejercicio (adaptados del modo juego) ── */
    _renderers: {
      completar(slot, ej) {
        const v = this._estado;
        const valores = {};
        const render = () => {
          slot.innerHTML = `
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
              ${ej.referencia ? `<p class="mem-juego-tarjeta__ref">${E(ej.referencia)}</p>` : ''}
              <div class="mem-juego-completar">
                ${ej.enunciado.split(' ').map((palabra, i) => {
                  if (palabra !== '_____') return `<span>${E(palabra)}</span>`;
                  const n = Object.keys(valores).length;
                  return `<input type="text" class="mem-juego-hueco" data-hueco="${n}" placeholder="..." value="${E(valores[n] || '')}" autocomplete="off">`;
                }).join(' ')}
              </div>
              ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp">Comprobar</button>
            </div>`;
          window.Iconos.actualizar();
          $$(slot, '.mem-juego-hueco').forEach(inp => {
            inp.addEventListener('input', () => { valores[inp.dataset.hueco] = inp.value; });
          });
          $(slot, '[data-pista]')?.addEventListener('click', () => {
            const b = $(slot, '[data-pista-box]');
            if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
          });
          $(slot, '#btnResp').onclick = () => {
            const vals = [...$$(slot, '.mem-juego-hueco')].map(inp => inp.value || '');
            const aciertos = ej.verificar(vals);
            const todasBien = aciertos.every(Boolean);
            $$(slot, '.mem-juego-hueco').forEach((inp, i) => {
              inp.classList.add(aciertos[i] ? 'mem-juego-hueco--ok' : 'mem-juego-hueco--ko');
              if (!aciertos[i]) inp.value = ej.respuestas[i] || '';
              inp.disabled = true;
            });
            $(slot, '#btnResp').remove();
            this._feedback(slot, ej, todasBien);
          };
        };
        render();
        void v;
      },

      ordenar(slot, ej) {
        const restantes = [...ej.palabras];
        const elegidas = [];
        const render = () => {
          slot.innerHTML = `
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
              ${ej.referencia ? `<p class="mem-juego-tarjeta__ref">${E(ej.referencia)}</p>` : ''}
              <div class="mem-juego-ordenar">
                <div class="mem-juego-frase" id="frase"></div>
                <div class="mem-juego-palabras" id="palabras">
                  ${restantes.map((p, i) => `<button class="mem-juego-palabra" data-idx="${i}">${E(p)}</button>`).join('')}
                </div>
              </div>
              ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp" ${elegidas.length === 0 ? 'disabled' : ''}>Comprobar</button>
            </div>`;
          window.Iconos.actualizar();
          const frase = $(slot, '#frase');
          frase.innerHTML = elegidas.map((p, i) => `<span class="mem-juego-frase__palabra" data-pos="${i}">${E(p)}</span>`).join('') + (elegidas.length === 0 ? '<span class="mem-juego-sub">Toca las palabras aquí...</span>' : '');
          $$(slot, '.mem-juego-palabra').forEach(btn => {
            btn.onclick = () => {
              const idx = parseInt(btn.dataset.idx, 10);
              const palabra = restantes.splice(idx, 1)[0];
              elegidas.push(palabra);
              render();
            };
          });
          $$(slot, '.mem-juego-frase__palabra').forEach(el => {
            el.onclick = () => {
              const pos = parseInt(el.dataset.pos, 10);
              const palabra = elegidas.splice(pos, 1)[0];
              restantes.push(palabra);
              render();
            };
          });
          $(slot, '[data-pista]')?.addEventListener('click', () => {
            const b = $(slot, '[data-pista-box]');
            if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
          });
          $(slot, '#btnResp').onclick = () => {
            const bien = ej.verificar(elegidas);
            frase.innerHTML = ej.palabras.map((p, i) => `<span class="mem-juego-frase__palabra mem-juego-frase__palabra--${bien ? 'ok' : 'ko'}">${E(p)}</span>`).join('');
            $(slot, '#btnResp').remove();
            this._feedback(slot, ej, bien);
          };
        };
        render();
      },

      elegir_versiculo(slot, ej) {
        let sel = null;
        const render = () => {
          slot.innerHTML = `
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
              <p class="mem-juego-tarjeta__enunciado">${E(ej.enunciado)}</p>
              <div class="mem-juego-opciones">
                ${ej.opciones.map((o, i) => `
                  <button class="mem-juego-opcion ${sel === i ? 'mem-juego-opcion--sel' : ''}" data-opt="${i}">
                    <span class="mem-juego-opcion__letra">${String.fromCharCode(65 + i)}</span>
                    <span>${E(o)}</span>
                  </button>`).join('')}
              </div>
              ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp" ${sel === null ? 'disabled' : ''}>Comprobar</button>
            </div>`;
          window.Iconos.actualizar();
          $$(slot, '.mem-juego-opcion').forEach(btn => {
            btn.onclick = () => { sel = parseInt(btn.dataset.opt, 10); render(); };
          });
          $(slot, '[data-pista]')?.addEventListener('click', () => {
            const b = $(slot, '[data-pista-box]');
            if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
          });
          $(slot, '#btnResp').onclick = () => {
            const bien = ej.verificar(ej.opciones[sel]);
            $$(slot, '.mem-juego-opcion').forEach((btn, i) => {
              btn.disabled = true;
              if (ej.opciones[i] === ej.respuestaCorrecta) btn.classList.add('mem-juego-opcion--ok');
              else if (i === sel && !bien) btn.classList.add('mem-juego-opcion--ko');
            });
            $(slot, '#btnResp').remove();
            this._feedback(slot, ej, bien);
          };
        };
        render();
      },

      verdadero_falso(slot, ej) {
        let sel = null;
        const opciones = ['Verdadero', 'Falso'];
        const render = () => {
          slot.innerHTML = `
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
              <p class="mem-juego-tarjeta__enunciado">${E(ej.enunciado)}</p>
              ${ej.referencia ? `<p class="mem-juego-tarjeta__ref">${E(ej.referencia)}</p>` : ''}
              <div class="mem-juego-opciones">
                ${opciones.map((o, i) => `
                  <button class="mem-juego-opcion ${sel === i ? 'mem-juego-opcion--sel' : ''}" data-opt="${i}">
                    <span class="mem-juego-opcion__letra">${i === 0 ? I('check') : I('x')}</span>
                    <span>${o}</span>
                  </button>`).join('')}
              </div>
              ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp" ${sel === null ? 'disabled' : ''}>Comprobar</button>
            </div>`;
          window.Iconos.actualizar();
          $$(slot, '.mem-juego-opcion').forEach(btn => {
            btn.onclick = () => { sel = parseInt(btn.dataset.opt, 10); render(); };
          });
          $(slot, '[data-pista]')?.addEventListener('click', () => {
            const b = $(slot, '[data-pista-box]');
            if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
          });
          $(slot, '#btnResp').onclick = () => {
            const bien = ej.verificar(opciones[sel]);
            $$(slot, '.mem-juego-opcion').forEach((btn, i) => {
              btn.disabled = true;
              if (ej.verificar(opciones[i])) btn.classList.add('mem-juego-opcion--ok');
              else if (i === sel) btn.classList.add('mem-juego-opcion--ko');
            });
            $(slot, '#btnResp').remove();
            this._feedback(slot, ej, bien);
          };
        };
        render();
      },

      relacionar(slot, ej) {
        const asociaciones = {};
        let selIzq = null;
        const render = () => {
          slot.innerHTML = `
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
              <div class="mem-juego-relacionar">
                <div class="mem-juego-rel-col">
                  ${ej.izquierda.map((item, i) => {
                    const clave = J().limpiar(item);
                    const yaAsignada = asociaciones[clave];
                    return `<button class="mem-juego-rel-item ${selIzq === i ? 'mem-juego-rel-item--sel' : ''}${yaAsignada ? ' mem-juego-rel-item--disabled' : ''}" data-izq="${i}">${E(item)}</button>`;
                  }).join('')}
                </div>
                <div class="mem-juego-rel-col">
                  ${ej.derecha.map((item, i) => {
                    const usado = Object.keys(asociaciones).some(k => asociaciones[k] === item);
                    return `<button class="mem-juego-rel-item ${usado ? 'mem-juego-rel-item--disabled' : ''}" data-der="${i}">${E(item)}</button>`;
                  }).join('')}
                </div>
              </div>
              ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp">Comprobar</button>
            </div>`;
          window.Iconos.actualizar();
          $$(slot, '.mem-juego-rel-item[data-izq]').forEach(btn => {
            btn.onclick = () => {
              const i = parseInt(btn.dataset.izq, 10);
              if (asociaciones[J().limpiar(ej.izquierda[i])]) return;
              selIzq = selIzq === i ? null : i;
              render();
            };
          });
          $$(slot, '.mem-juego-rel-item[data-der]').forEach(btn => {
            btn.onclick = () => {
              const i = parseInt(btn.dataset.der, 10);
              if (selIzq === null) return;
              const clave = J().limpiar(ej.izquierda[selIzq]);
              if (asociaciones[clave]) return;
              asociaciones[clave] = ej.derecha[i];
              selIzq = null;
              render();
            };
          });
          $(slot, '[data-pista]')?.addEventListener('click', () => {
            const b = $(slot, '[data-pista-box]');
            if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
          });
          $(slot, '#btnResp').onclick = () => {
            const bien = ej.verificar(asociaciones);
            $$(slot, '.mem-juego-rel-item').forEach(btn => {
              btn.disabled = true;
              if (btn.dataset.izq !== undefined) {
                const item = ej.izquierda[parseInt(btn.dataset.izq, 10)];
                if (asociaciones[J().limpiar(item)]) btn.classList.add('mem-juego-rel-item--ok');
              } else {
                const der = ej.derecha[parseInt(btn.dataset.der, 10)];
                if (Object.values(asociaciones).includes(der)) btn.classList.add('mem-juego-rel-item--ok');
              }
            });
            $(slot, '#btnResp').remove();
            this._feedback(slot, ej, bien);
          };
        };
        render();
      },

      escrita(slot, ej) {
        let valor = '';
        // Render inicial: pinta la tarjeta completa una sola vez.
        // Las actualizaciones posteriores (tecleo) solo modifican el botón,
        // sin destruir el input ni perder el foco.
        const _actualizarBoton = () => {
          const btn = $(slot, '#btnResp');
          if (!btn) return;
          const hayTexto = valor.trim().length > 0;
          btn.disabled = !hayTexto;
          if (hayTexto) btn.classList.remove('btn-desactivado');
          else btn.classList.add('btn-desactivado');
        };

        slot.innerHTML = `
          <div class="mem-juego-tarjeta">
            <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
            <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
            <p class="mem-juego-tarjeta__enunciado">${E(ej.enunciado)}</p>
            <div class="mem-juego-escrita">
              <input type="text" class="mem-juego-input" id="txtResp" value="" placeholder="Escribe aquí..." autocomplete="off">
            </div>
            ${ej.referencia ? `<p class="mem-juego-tarjeta__ref">${E(ej.referencia)}</p>` : ''}
            ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
            <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
            <button class="mem-juego-continuar btn-desactivado" id="btnResp" disabled>Comprobar</button>
          </div>`;
        window.Iconos.actualizar();

        $(slot, '#txtResp').addEventListener('input', (e) => {
          valor = e.target.value;
          _actualizarBoton();
        });
        $(slot, '[data-pista]')?.addEventListener('click', () => {
          const b = $(slot, '[data-pista-box]');
          if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
        });
        $(slot, '#btnResp').onclick = () => {
          const bien = ej.verificar(valor);
          const inp = $(slot, '#txtResp');
          inp.disabled = true;
          inp.classList.add(bien ? 'mem-juego-input--ok' : 'mem-juego-input--ko');
          if (!bien) inp.value = ej.respuestaCorrecta;
          $(slot, '#btnResp').remove();
          this._feedback(slot, ej, bien);
        };
      }
    }
  };
})();
