(function() {
  'use strict';
  const MARCADOR_RE = /\{\{HUECO_(\d+)\}\}/g;
  const TIENE_MARCADOR = /\{\{HUECO_\d+\}\}/;
  // Mezcla estable por pregunta: el mismo examen se muestra siempre en el
  // mismo orden (al retomar el borrador nada se mueve bajo el alumno), pero
  // distinto al orden de edición del profesor en «relacionar» y «ordenar».
  function mezclaEstable(id, n) {
    const orden = [];
    for (let i = 0; i < n; i++) orden.push(i);
    let semilla = 2166136261;
    const texto = String(id || '');
    for (let i = 0; i < texto.length; i++) {
      semilla ^= texto.charCodeAt(i);
      semilla = (semilla * 16777619) >>> 0;
    }
    for (let i = n - 1; i > 0; i--) {
      semilla = (semilla * 1664525 + 1013904223) >>> 0;
      const j = semilla % (i + 1);
      const tmp = orden[i]; orden[i] = orden[j]; orden[j] = tmp;
    }
    if (n > 1 && orden.every((v, k) => v === k)) orden.push(orden.shift());
    return orden;
  }
  // Para 'completar' con marcadores el título no debe repetir la frase (ya se
  // muestra con los huecos interactivos debajo) ni exponer {{HUECO_N}}. Sin
  // marcadores la frase SOLO está en el enunciado: hay que mostrarla.
  function textoPreguntaVisible(p) {
    if (p && p.tipo === 'completar' && p.huecos && p.huecos.length &&
        TIENE_MARCADOR.test(p.texto || '')) return 'Completa la frase:';
    return window.helpers.escapeHtml(p ? p.texto : '');
  }
  function renderizarTextoConHuecos(texto, huecos, respuestas, opciones) {
    if (!huecos || huecos.length === 0) return window.helpers.escapeHtml(texto);
    const pid = (opciones && opciones.pid) ? ` data-pid="${opciones.pid}"` : '';
    const partes = texto.split(MARCADOR_RE);
    return partes.map((parte, i) => {
      if (i % 2 === 0) return window.helpers.escapeHtml(parte);
      const hid = parseInt(parte);
      const hIdx = huecos.findIndex(h => h.id === hid);
      if (hIdx === -1) return window.helpers.escapeHtml('{{HUECO_' + hid + '}}');
      const valor = (respuestas && respuestas[hIdx]) || '';
      const attrs = opciones && opciones.soloLectura ? 'readonly' : '';
      const claseExtra = opciones && opciones.clases ? ' ' + opciones.clases : '';
      return `<span class="pregunta-examen__hueco-inline"><input type="text" class="pregunta-examen__hueco-input${claseExtra}" data-hidx="${hIdx}"${pid} value="${window.helpers.escapeHtml(valor)}" placeholder="…" ${attrs}></span>`;
    }).join('');
  }

  let _cleanup = null;

  window.vistaExamenTomar = {
    // Salida del examen a mitad (guardia + beforeunload, solo en _renderizar).
    _salidaAutorizada: false,
    _resolviendoSalida: false,
    _desregistrarGuardia: null,
    _antesDeDescargar: null,
    async montar(raiz, params) {
      if (_cleanup) { _cleanup(); _cleanup = null; }
      if (!params || !params.id) { raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Examen no encontrado</p></div>'; return; }
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      raiz.innerHTML = window.skeleton
        ? window.skeleton.examenAlumno()
        : '<div class="o-contenedor o-pila u-mt-3" role="status" aria-busy="true"></div>';
      try {
        let examen = await window.examenesRepository.obtener(params.id);
        if (!examen) { raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Examen no encontrado</p></div>'; return; }
        const esProfesor = ['admin', 'editor', 'owner'].includes(usuario.rol);
        if (!examen.publicado && !esProfesor) {
          raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p class="u-color-texto-secundario">Este examen aún no está publicado.</p></div>'; return;
        }
        let preguntas = typeof examen.preguntas === 'string' ? JSON.parse(examen.preguntas) : examen.preguntas;
        if (!Array.isArray(preguntas)) preguntas = [];
        preguntas.forEach(p => {
          if (p.tipo === 'completar' && !Array.isArray(p.huecos)) p.huecos = [];
        });
        const misIntentos = await window.examenesRepository.misIntentos(usuario.id);
        const config = this._configDe(examen);

        // Ventana de fechas de disponibilidad (solo alumnos) — usa esProfesor ya declarado arriba
        if (!esProfesor) {
          const ahora = Date.now();
          const tInicio = config.fecha_inicio ? new Date(config.fecha_inicio).getTime() : NaN;
          const tFin = config.fecha_fin ? new Date(config.fecha_fin).getTime() : NaN;
          // Fechas inválidas se ignoran (NaN) en lugar de romper o abrir el examen fuera de plazo
          if (!isNaN(tInicio) && ahora < tInicio) {
            raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p class="u-color-texto-secundario">Este examen aún no está disponible. Vuelve en la fecha de inicio indicada.</p></div>';
            return;
          }
          if (!isNaN(tFin) && ahora > tFin) {
            raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p class="u-color-texto-secundario">El plazo para realizar este examen ha finalizado.</p></div>';
            return;
          }
        }

        // Nº de intentos permitidos (config.intentos: '1', '2', '3', 'ilimitados')
        const permitidos = config.intentos === 'ilimitados' ? Infinity : (parseInt(config.intentos, 10) || 1);
        const completados = misIntentos.filter(i => i.examen_id === params.id && (i.estado === 'completado' || i.estado === 'calificado'));
        const terminado = completados.length >= permitidos ? completados[0] : null;
        if (terminado) {
          // Las respuestas correctas solo se solicitan con el RPC de resultado,
          // tras comprobar que este intento ya fue corregido por el servidor.
          if (terminado.corregido && window.examenesRepository.obtenerResultado) {
            try { examen = await window.examenesRepository.obtenerResultado(examen.id, terminado.id); } catch (e) { /* vista pendiente si no está publicado */ }
          }
          preguntas = typeof examen.preguntas === 'string' ? JSON.parse(examen.preguntas) : (examen.preguntas || preguntas);
          this._renderResultados(raiz, examen, preguntas, terminado, usuario); return;
        }
        let intento = misIntentos.find(i => i.examen_id === params.id && (i.estado === 'en_progreso' || i.estado === 'pendiente'));
        if (!intento) {
          // Guardar fecha_inicio para poder descontar el tiempo transcurrido si
          // el alumno recarga o navega: el temporizador no se reinicia al volver.
          intento = await window.examenesRepository.guardarIntento({ examen_id: params.id, alumno_id: usuario.id, respuestas: '{}', estado: 'en_progreso', fecha_inicio: new Date().toISOString() });
        }
        const respuestas = typeof intento.respuestas === 'string' ? JSON.parse(intento.respuestas || '{}') : (intento.respuestas || {});
        if (intento.estado === 'completado' || intento.estado === 'calificado') {
          this._renderResultados(raiz, examen, preguntas, intento, usuario);
        } else {
          // Lo que verá la barra de «modo examen»: intentos que le quedan.
          const infoIntento = {
            ilimitado: permitidos === Infinity,
            restantes: permitidos === Infinity ? Infinity : Math.max(0, permitidos - completados.length)
          };
          this._renderizar(raiz, examen, preguntas, intento, respuestas, usuario, infoIntento);
        }
      } catch (e) {
        console.error('Error cargando examen:', e.message || e);
        if (e.stack) console.error(e.stack);
        const volverError = this._volverDe(usuario);
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">No se pudo cargar el examen. Revisa tu conexión.</p><button class="btn-primario" id="btnErrorExamenVolver">← ${volverError.texto}</button></div>`;
        raiz.querySelector('#btnErrorExamenVolver')?.addEventListener('click', () => router.navegar(volverError.destino));
      }
    },

    // ── Salida a mitad del examen ───────────────────────────────────────
    /**
     * Volver atrás (gesto, flecha o botón del sistema) NO saca sin más: se
     * pregunta, y al aceptar se envían las respuestas completadas y el
     * intento queda consumido (ya no se puede continuar). Si la entrega
     * falla (p. ej. falta una obligatoria), se avisa y se sigue dentro.
     * `recoger` sincroniza la vista y devuelve las respuestas actuales.
     */
    _registrarGuardiaSalida(examen, intento, usuario, recoger) {
      this._quitarGuardiaSalida();
      this._salidaAutorizada = false;
      this._resolviendoSalida = false;
      if (typeof router === 'undefined' || typeof router.registrarGuardia !== 'function') return;
      const rutaExamen = '/tomar/' + examen.id;
      this._desregistrarGuardia = router.registrarGuardia(async (ruta) => {
        // Remontar la misma ruta (recargar la vista) no es salir.
        if (ruta === rutaExamen) return true;
        if (this._salidaAutorizada) return true;
        if (this._resolviendoSalida) {
          router.revertirNavegacion(rutaExamen);
          return false;
        }
        this._resolviendoSalida = true;
        try {
          const ok = await window.helpers.confirmar(
            'Si vuelves atrás, se enviarán las respuestas que hayas completado y ya no podrás continuar este examen. ¿Volver y entregar?',
            { titulo: '¿Volver y entregar el examen?', textoConfirmar: 'Volver y entregar', textoCancelar: 'Seguir en el examen', peligroso: false }
          );
          if (!ok) {
            router.revertirNavegacion(rutaExamen);
            return false;
          }
          try {
            const respuestas = recoger();
            await window.examenesRepository.entregarIntento(intento.id, respuestas);
            try { await window.adminRepository.registrarAuditoria('examen:entregar', `Examen "${examen.titulo}"`, usuario.id, usuario.grupo_id); } catch (e) { /* best-effort */ }
          } catch (e) {
            window.helpers.mostrarAlerta('No se pudo entregar: ' + e.message, 'error');
            router.revertirNavegacion(rutaExamen);
            return false;
          }
          this._salidaAutorizada = true;
          return true;
        } finally {
          this._resolviendoSalida = false;
        }
      });
    },

    _quitarGuardiaSalida() {
      if (typeof this._desregistrarGuardia === 'function') this._desregistrarGuardia();
      this._desregistrarGuardia = null;
    },

    // Aviso nativo al recargar o cerrar la pestaña a mitad del examen (el
    // texto lo pone el navegador; aquí solo se pide confirmación). No cubre
    // el botón atrás de la app: de eso se encarga la guardia de salida.
    _conectarAntesDeDescargar() {
      this._desconectarAntesDeDescargar();
      this._antesDeDescargar = (e) => { e.preventDefault(); };
      window.addEventListener('beforeunload', this._antesDeDescargar);
    },

    _desconectarAntesDeDescargar() {
      if (this._antesDeDescargar) {
        window.removeEventListener('beforeunload', this._antesDeDescargar);
        this._antesDeDescargar = null;
      }
    },

    _renderizar(raiz, examen, preguntas, intento, respuestas, usuario, info) {
      const config = this._configDe(examen);
      const duracionMinutos = this._minutosDesdeConfig(config);
      info = info || {};
      // Sin salidas hasta entregar (un solo intento): el alumno no tiene
      // barra de navegación ni botón de salir; solo «Entregar examen».
      const esAlumnoVista = (usuario.rol || '').toLowerCase() === 'usuario';
      // Aleatorizar el orden de las preguntas (las respuestas se guardan por id, seguro)
      const preguntasRender = config.aleatorizar_preguntas ? [...preguntas].sort(() => Math.random() - 0.5) : preguntas;
      if (preguntas.length === 0) {
        const volverVacio = this._volverDe(usuario);
        raiz.innerHTML = '<div class="o-contenedor o-pila o-pila--lg u-mt-4 u-texto-centrado"><p class="u-color-texto-secundario">Este examen no tiene preguntas todavía.</p><button class="btn-primario" id="btnExamenVacioVolver">← ' + volverVacio.texto + '</button></div>';
        raiz.querySelector('#btnExamenVacioVolver')?.addEventListener('click', () => router.navegar(volverVacio.destino));
        return;
      }
      // Si el intento ya empezó antes, descontar el tiempo transcurrido para que
      // recargar o navegar no reinicie el temporizador.
      let segundosIniciales = duracionMinutos * 60;
      if (duracionMinutos > 0 && intento && intento.fecha_inicio) {
        const transcurrido = Math.floor((Date.now() - new Date(intento.fecha_inicio).getTime()) / 1000);
        if (!isNaN(transcurrido) && transcurrido > 0) segundosIniciales = Math.max(0, segundosIniciales - transcurrido);
      }
      const respondidas = preguntasRender.filter(p => this._tieneRespuesta(respuestas, p)).length;
      const porcentaje = Math.round((respondidas / preguntas.length) * 100);

      // Barra de «modo examen» (solo alumno): a nombre de quién se registra,
      // cuántos intentos quedan y que no hay salidas hasta entregar.
      // Se muestra como línea fina bajo la cabecera para no romper el diseño.
      let barraModo = '';
      if (esAlumnoVista) {
        const quien = window.helpers.escapeHtml(usuario.nombre_completo || usuario.username || '');
        const insignia = info.ilimitado
          ? '<span class="adm-badge adm-badge--borrador">Intentos ilimitados</span>'
          : ((info.restantes || 1) <= 1
            ? '<span class="adm-badge adm-badge--aviso">Intento único</span>'
            : `<span class="adm-badge adm-badge--aviso">Te quedan ${info.restantes} intentos</span>`);
        barraModo = `<div class="examen-modo__linea">${insignia}<span>Lo realizas como <strong>${quien}</strong> · quedará registrado a tu nombre · sin salidas hasta entregar.</span></div>`;
      }
      const quienCorto = window.helpers.escapeHtml(usuario.nombre_completo || usuario.username || '');

      raiz.innerHTML = `
        <div class="examen-page examen-modo">
          <header class="examen-topbar">
            <div class="o-contenedor examen-topbar__inner">
              <span class="examen-topbar__icono" aria-hidden="true"><img src="assets/iconos/icono.svg" alt="" class="examen-topbar__icono-img"></span>
              <div class="examen-topbar__titulos">
                <strong class="examen-topbar__titulo">${window.helpers.escapeHtml(examen.titulo)}</strong>
                <span class="examen-topbar__alumno">${quienCorto}</span>
              </div>
              ${duracionMinutos > 0 ? `<span class="examen-timer" id="examenTimer">${window.Iconos.render('clock')} ${Math.floor(segundosIniciales / 60)}:${String(segundosIniciales % 60).padStart(2, '0')}</span>` : ''}
              <span class="examen-topbar__score" id="examenScoreTop">${respondidas}/${preguntas.length}</span>
            </div>
            ${barraModo}
          </header>
          <main class="o-contenedor examen-lista">
            <div id="preguntasExamen" class="examen-sin-paginar"></div>
          </main>
          <div class="examen-paginado" id="examenPaginado" hidden>
            <div class="examen-dots" id="examenDots"></div>
            <div id="preguntasPagina"></div>
            <div class="examen-nav">
              <button class="btn-secundario examen-nav__btn" id="btnAnterior">${window.Iconos.render('chevron-left')} Anterior</button>
              <span class="u-fs-xs u-color-texto-terciario" id="paginacionInfo">1/${preguntas.length}</span>
              <button class="btn-secundario examen-nav__btn" id="btnSiguiente">Siguiente ${window.Iconos.render('chevron-right')}</button>
            </div>
          </div>
          <footer class="examen-barra-envio">
            <div class="o-contenedor examen-barra-envio__inner">
              <p class="examen-barra-envio__info"><span class="examen-barra-envio__dot" aria-hidden="true"></span><span id="contadorProgreso">${respondidas} de ${preguntas.length} respondidas</span><span id="flagCount"></span></p>
              <button class="btn-primario examen-barra-envio__btn" id="btnEntregar">Entregar examen</button>
            </div>
          </footer>
        </div>`;

      const cont = raiz.querySelector('#preguntasExamen');
      cont.innerHTML = preguntasRender.map((p, i) => this._renderPregunta(p, respuestas[p.id], i)).join('');

      const paginaCont = raiz.querySelector('#preguntasPagina');
      const dotsCont = raiz.querySelector('#examenDots');
      let pagActual = 0;
      let _autoTimer = null;

      const _actualizarDots = () => {
        // Los dots se crean en el orden RENDERIZADO (preguntasRender), así que
        // hay que mirar preguntasRender[di] y no preguntas[di] cuando el orden
        // de preguntas está aleatorizado (si no, marcan la pregunta equivocada).
        dotsCont.querySelectorAll('.examen-dot').forEach((d, di) => {
          const p = preguntasRender[di] || preguntas[di];
          d.classList.toggle('examen-dot--respondida', this._tieneRespuesta(respuestas, p));
        });
      };

      // --- Sincronización robusta: fusiona la vista paginada (móvil) y la lista
      // completa oculta (escritorio) prefiriendo siempre el valor NO vacío, para
      // que ninguna vista sobreescriba las respuestas reales del alumno.
      const _esVacio = (v) =>
        v === undefined || v === null || v === '' ||
        (Array.isArray(v) && v.every(x => x === '' || x === undefined || x === null));

      const _leerContenedor = (contenedor, p) => {
        if (!contenedor) return undefined;
        const val = this._obtenerValorRespuesta(contenedor, p);
        return _esVacio(val) ? undefined : val;
      };

      const _sincronizarRespuestas = () => {
        preguntas.forEach(p => {
          const valPagina = _leerContenedor(paginaCont, p);
          const valLista = _leerContenedor(cont, p);
          const nuevo = valPagina !== undefined ? valPagina : valLista;
          if (nuevo !== undefined) respuestas[p.id] = nuevo;
        });
        _actualizarDots();
      };

      const actualizarBarra = () => {
        _sincronizarRespuestas();
        const count = preguntas.filter(p => this._tieneRespuesta(respuestas, p)).length;
        const barra = raiz.querySelector('#barraProgresoExamen');
        const texto = raiz.querySelector('#contadorProgreso');
        const score = raiz.querySelector('#examenScoreTop');
        if (barra) barra.style.transform = `scaleX(${preguntas.length ? count / preguntas.length : 0})`;
        if (texto) texto.textContent = `${count} de ${preguntas.length} respondidas`;
        if (score) score.textContent = `${count}/${preguntas.length}`;
        raiz.querySelectorAll('#preguntasExamen .pregunta-examen[data-pid]').forEach(el => {
          const p = preguntas.find(q => String(q.id) === el.dataset.pid);
          if (!p) return;
          const ok = this._tieneRespuesta(respuestas, p);
          el.classList.toggle('pregunta-examen--sin-responder', !ok);
          const badge = el.querySelector(`[data-estado-for="${p.id}"]`);
          if (badge) {
            badge.textContent = ok ? 'Respondida' : 'Sin responder';
            badge.classList.toggle('pregunta-examen__estado--ok', ok);
          }
        });
        _actualizarDots();
      };

      const guardarYActualizarBarra = () => {
        _sincronizarRespuestas();
        this._guardarRespuesta(respuestas, intento);
        actualizarBarra();
      };

      let renderPagina = (idx) => {
        pagActual = idx;
        const p = preguntasRender[idx];
        const rActual = respuestas[p.id] !== undefined ? respuestas[p.id] : '';
        paginaCont.innerHTML = `<div class="pregunta-examen" data-pid="${p.id}">${this._renderPreguntaInner(p, rActual, idx)}</div>`;
        const nuevaPreg = paginaCont.firstElementChild;
        if (nuevaPreg && window.animaciones) window.animaciones.animar(nuevaPreg, 'anim-pregunta-entrar', 200);
        if (_autoTimer) { clearTimeout(_autoTimer); _autoTimer = null; }
        paginaCont.querySelectorAll('input[type="radio"]').forEach(el => {
          el.addEventListener('change', () => {
            guardarYActualizarBarra();
            if (idx < preguntasRender.length - 1) {
              _autoTimer = setTimeout(() => { renderPagina(idx + 1); }, 1200);
            }
          });
        });
        paginaCont.querySelectorAll('input, select, textarea').forEach(el => {
          el.addEventListener('change', guardarYActualizarBarra);
          if (el.tagName === 'INPUT' && el.type !== 'hidden') el.addEventListener('input', actualizarBarra);
        });
        paginaCont.querySelectorAll('.btn-ordenar-up').forEach(btn => this._setupOrdenar(btn, paginaCont, guardarYActualizarBarra));
        paginaCont.querySelectorAll('.btn-ordenar-down').forEach(btn => this._setupOrdenar(btn, paginaCont, guardarYActualizarBarra));
        dotsCont.querySelectorAll('.examen-dot').forEach((d, di) => {
          d.classList.toggle('examen-dot--activa', di === idx);
        });
        raiz.querySelector('#btnAnterior').disabled = idx === 0;
        raiz.querySelector('#btnSiguiente').textContent = idx === preguntasRender.length - 1 ? 'Entregar' : 'Siguiente →';
        raiz.querySelector('#paginacionInfo').textContent = `${idx + 1}/${preguntasRender.length}`;
        window.Iconos?.actualizar?.();
      };

      preguntasRender.forEach((p, i) => {
        const dot = document.createElement('button');
        dot.className = 'examen-dot';
        dot.setAttribute('aria-label', `Pregunta ${i + 1}`);
        if (this._tieneRespuesta(respuestas, p)) dot.classList.add('examen-dot--respondida');
        dot.addEventListener('click', () => {
          _sincronizarRespuestas();
          renderPagina(i);
        });
        dotsCont.appendChild(dot);
      });

      raiz.querySelector('#btnAnterior').addEventListener('click', () => {
        if (pagActual > 0) { _sincronizarRespuestas(); renderPagina(pagActual - 1); }
      });
      raiz.querySelector('#btnSiguiente').addEventListener('click', () => {
        _sincronizarRespuestas();
        if (pagActual < preguntas.length - 1) {
          renderPagina(pagActual + 1);
        } else {
          raiz.querySelector('#btnEntregar').click();
        }
      });

      if (window.gestosNavegacion) {
        window.gestosNavegacion.initGestosNavegacion(raiz, {
          onIzquierda: () => {
            _sincronizarRespuestas();
            if (pagActual < preguntas.length - 1) renderPagina(pagActual + 1);
            else raiz.querySelector('#btnEntregar').click();
          },
          onDerecha: () => {
            if (pagActual > 0) { _sincronizarRespuestas(); renderPagina(pagActual - 1); }
          },
        });
      }

      renderPagina(0);

      // Flag system
      const flags = {};
      preguntas.forEach((p, i) => { flags[p.id] = false; });
      const actualizarFlagCount = () => {
        const count = Object.values(flags).filter(Boolean).length;
        const el = raiz.querySelector('#flagCount');
        if (el) el.textContent = count > 0 ? ` · ${count} marcadas` : '';
        window.Iconos?.actualizar?.();
      };

      // Keyboard shortcuts
      const tecladoHandler = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (e.key === 'ArrowLeft' && pagActual > 0) { _sincronizarRespuestas(); renderPagina(pagActual - 1); }
        if (e.key === 'ArrowRight' && pagActual < preguntas.length - 1) { _sincronizarRespuestas(); renderPagina(pagActual + 1); }
        if (e.key === 'f' || e.key === 'F') {
          // Con aleatorización, la pregunta visible es preguntasRender[pagActual]
          const pActual = preguntasRender[pagActual] || preguntas[pagActual];
          if (!pActual) return;
          const pid = pActual.id;
          flags[pid] = !flags[pid];
          dotsCont.querySelectorAll('.examen-dot')[pagActual]?.classList.toggle('examen-dot--flag', flags[pid]);
          actualizarFlagCount();
        }
      };
      document.addEventListener('keydown', tecladoHandler);

      // Timer
      let timerInterval = null;
      let _entregando = false;
      if (duracionMinutos > 0) {
        let segundosRestantes = segundosIniciales;
        const timerEl = raiz.querySelector('#examenTimer');
        timerInterval = setInterval(() => {
          segundosRestantes--;
          if (timerEl) {
            const mins = Math.floor(segundosRestantes / 60);
            const segs = segundosRestantes % 60;
            timerEl.innerHTML = `${window.Iconos.render('clock')} ${mins}:${String(segs).padStart(2, '0')}`;
            if (segundosRestantes <= 300) {
              timerEl.style.color = segundosRestantes <= 60 ? 'var(--color-error)' : 'var(--color-aviso)';
            }
          }
          if (segundosRestantes <= 0) {
            clearInterval(timerInterval);
            if (!_entregando) raiz.querySelector('#btnEntregar').click();
          }
        }, 1000);
      }

      // Also add flag button in each paginated question
      const addFlagBtnToPagina = () => {
        const pagina = raiz.querySelector('#preguntasPagina');
        if (!pagina) return;
        const pActual = preguntasRender[pagActual] || preguntas[pagActual];
        if (!pActual) return;
        const pid = pActual.id;
        let flagBtn = pagina.querySelector('.flag-btn');
        if (!flagBtn) {
          flagBtn = document.createElement('button');
          flagBtn.className = 'flag-btn';
          flagBtn.setAttribute('aria-label', 'Marcar/desmarcar pregunta');
          flagBtn.style.cssText = 'background:none;border:none;cursor:pointer;display:inline-flex;font-size:var(--texto-lg);padding:var(--espaciado-xxs);float:right';
          const textoPreg = pagina.querySelector('.pregunta-examen__texto');
          if (textoPreg) textoPreg.after(flagBtn);
        }
        flagBtn.innerHTML = window.Iconos.render('flag');
        flagBtn.style.color = flags[pid] ? 'var(--color-aviso)' : 'var(--color-texto-terciario)';
        flagBtn.onclick = () => {
          flags[pid] = !flags[pid];
          flagBtn.style.color = flags[pid] ? 'var(--color-aviso)' : 'var(--color-texto-terciario)';
          dotsCont.querySelectorAll('.examen-dot')[pagActual]?.classList.toggle('examen-dot--flag', flags[pid]);
          actualizarFlagCount();
        };
        window.Iconos?.actualizar?.();
      };
      const origRenderPagina = renderPagina;
      renderPagina = (idx) => {
        origRenderPagina(idx);
        addFlagBtnToPagina();
      };

      cont.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('change', guardarYActualizarBarra);
        if (el.tagName === 'INPUT' && el.type !== 'hidden') el.addEventListener('input', actualizarBarra);
      });
      cont.querySelectorAll('.btn-ordenar-up').forEach(btn => this._setupOrdenar(btn, cont, guardarYActualizarBarra));
      cont.querySelectorAll('.btn-ordenar-down').forEach(btn => this._setupOrdenar(btn, cont, guardarYActualizarBarra));

      raiz.querySelector('#btnEntregar').onclick = async () => {
        if (_entregando) return;
        _entregando = true;
        const preguntasFlaggeadas = Object.entries(flags).filter(([, v]) => v).length;
        let msg = '¿Estás seguro de entregar el examen? No podrás cambiar las respuestas después.';
        if (preguntasFlaggeadas > 0) {
          msg = `Tienes ${preguntasFlaggeadas} pregunta${preguntasFlaggeadas > 1 ? 's' : ''} marcada${preguntasFlaggeadas > 1 ? 's' : ''} para revisar. ¿Entregar de todas formas?`;
        }
        const ok = await window.helpers.confirmar(msg, { titulo: 'Entregar examen', textoConfirmar: 'Entregar' });
        if (!ok) {
          // Si el usuario cancela, liberar la guardia: el botón y el auto-envío
          // por temporizador deben seguir funcionando.
          _entregando = false;
          return;
        }
        if (timerInterval) clearInterval(timerInterval);
        document.removeEventListener('keydown', tecladoHandler);
        try {
          _sincronizarRespuestas();
          this._guardarRespuesta(respuestas, intento);
          raiz.querySelector('#btnEntregar').disabled = true;
          const respuestasFinales = respuestas;
          // La entrega y la puntuación pasan por una RPC SECURITY DEFINER:
          // el servidor filtra respuestas, valida obligatorias/temporizador y
          // calcula la puntuación sobre el snapshot inmutable del intento.
          await window.examenesRepository.entregarIntento(intento.id, respuestasFinales);
          try { await window.adminRepository.registrarAuditoria('examen:entregar', `Examen "${examen.titulo}"`, usuario.id, usuario.grupo_id); } catch (e) { console.warn('Auditoría no registrada:', e.message); }
          // Notificar al profesor vía Notification Service (persiste en BD + nativa)
          try {
            if (examen.creado_por && window.notificationService) {
              const alumnoNombre = usuario.nombre_completo || usuario.username;
              window.notificationService.emitir('examen.entregado', {
                examenId: examen.id,
                titulo: examen.titulo,
                alumno: alumnoNombre,
                destinatarios: [examen.creado_por],
                datos: { examen_id: examen.id, alumno_id: usuario.id, alumno_nombre: alumnoNombre }
              }).catch(e => console.warn('[Notif] entrega:', e.message));
            }
          } catch (e2) { /* no critico */ }
          if (window.haptica) window.haptica.logro();
          window.helpers.mostrarAlerta('Examen entregado correctamente.', 'exito');
          // Entregado: la guardia y el aviso de recarga ya no pintan nada.
          // El alumno vuelve a su inicio (no está en «Exámenes»).
          this._salidaAutorizada = true;
          this._desconectarAntesDeDescargar();
          router.navegar(this._volverDe(usuario).destino);
        } catch (e) {
          _entregando = false;
          raiz.querySelector('#btnEntregar').disabled = false;
          window.helpers.mostrarAlerta('Error al entregar: ' + e.message, 'error');
        }
      };

      _cleanup = () => {
        if (_autoTimer) { clearTimeout(_autoTimer); _autoTimer = null; }
        if (timerInterval) clearInterval(timerInterval);
        document.removeEventListener('keydown', tecladoHandler);
        // La raíz puede haber cambiado (resultados, error) desde el montaje.
        const btnEntregar = raiz.querySelector('#btnEntregar');
        if (btnEntregar) btnEntregar.onclick = null;
      };
      // Proteger la salida a mitad: guardia de atrás + aviso al recargar.
      // Se retiran al entregar (éxito) o al desmontar la vista.
      this._registrarGuardiaSalida(examen, intento, usuario, () => {
        _sincronizarRespuestas();
        return respuestas;
      });
      this._conectarAntesDeDescargar();
      actualizarFlagCount();
    },

    _renderPregunta(p, rActual, i) {
      const sinResp = !this._tieneRespuesta({ [p.id]: rActual }, p);
      return `<div class="pregunta-examen${sinResp ? ' pregunta-examen--sin-responder' : ''}" data-pid="${p.id}">
        ${this._renderPreguntaInner(p, rActual, i)}
      </div>`;
    },

    _renderPreguntaInner(p, rActual, i) {
      const respondida = this._tieneRespuesta({ [p.id]: rActual }, p);
      const estado = respondida ? 'Respondida' : 'Sin responder';
      const sub = p.obligatoria ? `Pregunta ${i + 1} (obligatoria)` : `Pregunta ${i + 1} (opcional)`;
      return `<div class="pregunta-examen__cabecera">
          <span class="pregunta-examen__numero">Pregunta ${i + 1}</span>
          <span class="pregunta-examen__puntos">${window.puntuacionExamen.puntosPregunta(p)} pt</span>
        </div>
        <p class="pregunta-examen__texto">${textoPreguntaVisible(p)}${p.obligatoria ? ' <span class="pregunta-examen__obligatoria">*</span>' : ''}</p>
        <span class="pregunta-examen__estado${respondida ? ' pregunta-examen__estado--ok' : ''}" data-estado-for="${p.id}">${estado}</span>
        <p class="pregunta-examen__sub">${sub}</p>
        <div class="pregunta-examen__opciones">${this._renderRespuesta(p, rActual, i)}</div>`;
    },

    _configDe(examen) {
      if (!examen || !examen.config) return {};
      if (typeof examen.config === 'string') {
        try { return JSON.parse(examen.config) || {}; } catch (e) { return {}; }
      }
      return examen.config || {};
    },

    _minutosDesdeConfig(config) {
      const g = config && config.temporizador_global;
      if (!g || g === 'sin_limite') return 0;
      if (g === 'personalizado') return parseInt(config.temporizador_personalizado, 10) || 0;
      return parseInt(g, 10) || 0;
    },

    _tieneRespuesta(respuestas, pregunta) {
      const r = respuestas[pregunta.id];
      if (r === undefined || r === '') return false;
      if (Array.isArray(r)) {
        const conValor = r.filter(v => v !== '' && v !== undefined);
        if (!conValor.length) return false;
        // Arrays numéricos (varias_opciones / ordenar): basta con que haya algo;
        // arrays de texto (huecos de completar): todos deben ir llenos.
        return r.every(v => typeof v === 'number') ? true : conValor.length === r.length;
      }
      return true;
    },

    // El botón «Volver» del resultado: el alumno vuelve a su inicio (no está
    // en «Exámenes», que es sección del profesor); el profesor sí vuelve allí.
    _volverDe(usuario) {
      const esProfesor = ['admin', 'editor', 'owner'].includes((usuario || {}).rol);
      return esProfesor
        ? { texto: 'Volver a exámenes', destino: '/examenes' }
        : { texto: 'Volver', destino: '/inicio' };
    },

    _renderResultados(raiz, examen, preguntas, intento, usuario) {
      const I = window.Iconos.render;
      const E = window.helpers.escapeHtml;
      const usuarioEsProfesor = ['admin', 'editor', 'owner'].includes(usuario.rol);
      if (!usuarioEsProfesor && intento.corregido) {
        try {
          const key = 'fb_examen_corregido_' + intento.id;
          if (!localStorage.getItem(key)) {
            localStorage.setItem(key, '1');
            if (window.notificationService) {
              window.notificationService.emitir('examen.corregido', {
                examenId: examen.id,
                titulo: examen.titulo,
                nota: intento.nota != null ? intento.nota : null,
                datos: { examen_id: examen.id }
              }).catch(() => {});
            }
          }
        } catch (e) {}
      }
      if (!usuarioEsProfesor && examen.publicado === false && intento.corregido === false) {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p class="u-color-texto-secundario">Este examen aún no está publicado.</p></div>'; return;
      }
      const respuestas = typeof intento.respuestas === 'string' ? JSON.parse(intento.respuestas || '{}') : (intento.respuestas || {});
      const correccionMap = (intento.correccion && typeof intento.correccion === 'string') ? JSON.parse(intento.correccion) : (intento.correccion || {});
      const config = this._configDe(examen);
      const visibilidad = config.resultados_visibles || 'al_publicar';
      const publicadoPorProfesor = intento.corregido && !!intento.corregido_por;
      const puedeVerResultados = usuarioEsProfesor || (publicadoPorProfesor && visibilidad !== 'nunca');
      const correccionVisible = puedeVerResultados;
      const calculo = window.puntuacionExamen.calcularConCorreccion(preguntas, respuestas, correccionMap);
      if (window.haptica && correccionVisible && calculo.aciertos < preguntas.length) {
        window.haptica.fallo();
      }

      // ── Calcular métricas ──
      const notaFinal = intento.corregido && intento.nota != null ? (parseFloat(intento.nota) || 0) : calculo.nota;
      const aciertos = calculo.aciertos;
      const pct = calculo.porcentaje;
      const corregido = intento.corregido && !!intento.corregido_por;
      const estadoTexto = corregido ? 'Corregido' : 'Pendiente de corrección';
      const estadoBadgeClase = corregido ? 'resultado-badge--corregido' : 'resultado-badge--pendiente';

      if (correccionVisible) {
        this._renderCorreccion(raiz, examen, preguntas, respuestas, correccionMap, intento, notaFinal, aciertos, pct, usuario);
        return;
      }

      // ── Color de nota ──
      const notaColor = notaFinal >= 9 ? 'var(--color-exito)' : notaFinal >= 7 ? 'var(--color-acento)' : notaFinal >= 5 ? 'var(--color-aviso)' : 'var(--color-error)';
      const notaBg = notaFinal >= 9 ? 'var(--color-exito-soft)' : notaFinal >= 7 ? 'var(--color-acento-soft)' : notaFinal >= 5 ? 'var(--color-aviso-soft)' : 'var(--color-error-soft)';

      // ── Hero score circle (SVG donut) ──
      const radio = 58;
      const circ = 2 * Math.PI * radio;
      const dashOffset = circ - (pct / 100) * circ;
      const scoreDonut = `
        <div class="resultado-hero">
          <div class="resultado-hero__score">
            <svg viewBox="0 0 140 140" class="resultado-hero__donut">
              <circle cx="70" cy="70" r="${radio}" fill="none" stroke="var(--color-fondo-alt)" stroke-width="10"/>
              <circle cx="70" cy="70" r="${radio}" fill="none" stroke="${notaColor}" stroke-width="10"
                stroke-dasharray="${circ}" stroke-dashoffset="${dashOffset}"
                stroke-linecap="round" transform="rotate(-90 70 70)"/>
            </svg>
            <div class="resultado-hero__nota" style="color:${notaColor}">${correccionVisible ? notaFinal.toFixed(1) : '—'}</div>
            <div class="resultado-hero__sobre">/10</div>
          </div>
          <div class="resultado-hero__info">
            <h2 class="resultado-hero__titulo">${E(examen.titulo)}</h2>
            <span class="resultado-badge ${estadoBadgeClase}">${I(corregido ? 'check-circle' : 'clock')} ${estadoTexto}</span>
            ${examen.descripcion ? `<p class="resultado-hero__desc">${E(examen.descripcion)}</p>` : ''}
          </div>
        </div>`;

      // ── Observaciones del profesor ──
      const obsHtml = intento.observaciones ? `
        <div class="resultado-obs">
          <div class="resultado-obs__cabecera">
            <span class="resultado-obs__icono">${I('message-square')}</span>
            <span class="resultado-obs__titulo">Comentarios del profesor</span>
          </div>
          <p class="resultado-obs__texto">${E(intento.observaciones)}</p>
        </div>` : '';

      // ── Construir HTML principal ──
      const volver = this._volverDe(usuario);
      raiz.innerHTML = `
        <div class="examen-page o-contenedor o-pila o-pila--lg anim-exito">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <button class="btn-secundario" id="btnVolver">${I('arrow-left')} ${volver.texto}</button>
          </div>
          ${scoreDonut}
          ${obsHtml}
          <div class="resultado-espera">
            <span class="resultado-espera__icono">${I('clock')}</span>
            <p class="resultado-espera__titulo">${visibilidad === 'nunca' ? 'Este examen no muestra las respuestas a los alumnos.' : 'Resultados pendientes de publicación'}</p>
            <p class="resultado-espera__texto">${visibilidad === 'nunca' ? 'El profesor ha configurado este examen sin visualización de resultados.' : 'Los resultados estarán disponibles cuando el profesor los publique.'}</p>
          </div>
        </div>`;

      raiz.querySelector('#btnVolver').onclick = () => router.navegar(volver.destino);
      window.Iconos.actualizar();
    },

    // Corrección visible para el alumno: mismo diseño que el enlace público de examen.
    _renderCorreccion(raiz, examen, preguntas, respuestas, correccionMap, intento, notaFinal, aciertos, pct, usuario) {
      const volverCorr = this._volverDe(usuario);
      const I = window.Iconos.render;
      const E = window.helpers.escapeHtml;
      const fmt = n => String(Math.round(Number(n) * 100) / 100).replace('.', ',');

      const preguntasHtml = preguntas.map((p, i) => {
        const corr = correccionMap[p.id];
        const esCorrecta = corr && corr.es_correcta !== undefined && corr.es_correcta !== null
          ? !!corr.es_correcta
          : window.puntuacionExamen.esCorrectaPregunta(respuestas[p.id], p);

        const completarConHuecos = p.tipo === 'completar' && Array.isArray(p.huecos) && p.huecos.length > 0 &&
          TIENE_MARCADOR.test(p.texto || '');

        let respuestaUsuarioHtml;
        if (completarConHuecos) {
          respuestaUsuarioHtml = this._renderResultadoCompletar(p, respuestas[p.id]);
        } else if (['multiple', 'verdadero_falso', 'varias_opciones', 'opcion_unica', 'relacionar', 'ordenar'].includes(p.tipo)) {
          respuestaUsuarioHtml = E(this._textoOpcion(p, respuestas[p.id] !== undefined ? respuestas[p.id] : '(sin respuesta)'));
        } else {
          // Respuesta libre (incluido completar sin marcadores): texto plano.
          respuestaUsuarioHtml = E(String(respuestas[p.id] !== undefined ? respuestas[p.id] : '(sin respuesta)'));
        }

        let correctaHtml = '';
        if (p.tipo === 'completar') correctaHtml = this._renderRespuestaCorrectaCompletar(p);
        else if (p.respuesta_correcta != null) correctaHtml = E(this._textoOpcion(p, p.respuesta_correcta));

        const ptsTotal = window.puntuacionExamen.puntosPregunta(p);
        const pts = corr && corr.puntos != null ? Number(corr.puntos) : (esCorrecta ? ptsTotal : 0);
        const puntosCompletos = pts >= ptsTotal;

        return `<article class="correccion-pregunta">
          <header class="correccion-pregunta__cabecera">
            <span class="correccion-pregunta__n">Pregunta ${i + 1}</span>
            ${p.obligatoria ? '<span class="correccion-pregunta__oblig">Obligatoria</span>' : ''}
            <span class="correccion-pregunta__marca ${esCorrecta ? 'correccion-pregunta__marca--ok' : 'correccion-pregunta__marca--mal'}">${esCorrecta ? I('check') : I('x')}</span>
            <span class="correccion-pregunta__pts">${fmt(ptsTotal)} pt</span>
          </header>
          <p class="correccion-pregunta__enunciado">${textoPreguntaVisible(p)}</p>
          <div class="correccion-pregunta__cuerpo">
            <div class="correccion-pregunta__fila">
              <span class="correccion-pregunta__etiqueta">Tu respuesta:</span>
              <span class="correccion-pregunta__valor">${respuestaUsuarioHtml || '<em>Sin respuesta</em>'}</span>
            </div>
            ${correctaHtml ? `<div class="correccion-pregunta__fila correccion-pregunta__fila--correcta">
              <span class="correccion-pregunta__etiqueta">Respuesta correcta:</span>
              <span class="correccion-pregunta__valor">${correctaHtml}</span>
            </div>` : ''}
            <div class="correccion-pregunta__puntos ${puntosCompletos ? 'correccion-pregunta__puntos--ok' : ''}">
              <span class="correccion-pregunta__etiqueta">Puntos:</span>
              <span class="correccion-pregunta__valor"><strong>${fmt(pts)}</strong><span class="correccion-pregunta__max"> / ${fmt(ptsTotal)}</span></span>
            </div>
          </div>
          ${corr && corr.comentario ? `<div class="correccion-pregunta__comentario"><strong>Comentario del profesor:</strong> ${E(corr.comentario)}</div>` : ''}
        </article>`;
      }).join('');

      raiz.innerHTML = `
        <div class="examen-page o-contenedor o-pila o-pila--lg anim-exito">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <button class="btn-secundario" id="btnVolver">${I('arrow-left')} ${volverCorr.texto}</button>
          </div>
          <section class="correccion-tarjeta">
            <span class="correccion-tarjeta__icono">${I('check')}</span>
            <h2 class="correccion-tarjeta__titulo">Resultado</h2>
            <p class="correccion-tarjeta__subtitulo">${E(examen.titulo)}</p>
            <div class="correccion-marca">
              <span class="correccion-marca__nota">${fmt(notaFinal)}</span>
              <span class="correccion-marca__sobre">sobre 10</span>
            </div>
            <ul class="correccion-detalle">
              <li class="correccion-detalle__item">
                <span class="correccion-detalle__key">Aciertos</span>
                <strong class="correccion-detalle__val">${pct} %</strong>
              </li>
            </ul>
            <div class="correccion-preguntas">
              <h3 class="correccion-preguntas__titulo">Tu resultado por pregunta</h3>
              ${preguntasHtml}
            </div>
            ${intento.observaciones ? `<div class="correccion-observaciones"><strong>Comentario del profesor:</strong> ${E(intento.observaciones)}</div>` : ''}
          </section>
        </div>`;

      raiz.querySelector('#btnVolver').onclick = () => router.navegar(volverCorr.destino);
      window.Iconos.actualizar();
    },

    _renderResultadoCompletar(pregunta, respuesta) {
      const detalle = window.puntuacionExamen.detalleCompletar(respuesta, pregunta);
      if (!detalle) return window.helpers.escapeHtml(String(respuesta || ''));
      const partes = pregunta.texto.split(MARCADOR_RE);
      return partes.map((parte, i) => {
        if (i % 2 === 0) return window.helpers.escapeHtml(parte);
        const hid = parseInt(parte);
        const hIdx = pregunta.huecos.findIndex(h => h.id === hid);
        if (hIdx === -1) return '';
        const d = detalle[hIdx];
        if (!d) return '';
        const clase = d.esCorrecta ? 'pregunta-examen__hueco-input--correcta' : 'pregunta-examen__hueco-input--incorrecta';
        return `<span class="pregunta-examen__hueco-inline"><input type="text" class="pregunta-examen__hueco-input ${clase}" value="${window.helpers.escapeHtml(d.respuestaUsuario)}" readonly></span>`;
      }).join('');
    },

    _renderRespuestaCorrectaCompletar(pregunta) {
      if (Array.isArray(pregunta.huecos) && pregunta.huecos.length > 0) {
        return pregunta.huecos.map((h, i) =>
          `<span class="u-fw-600">${window.helpers.escapeHtml(h.respuesta_correcta)}</span>${i < pregunta.huecos.length - 1 ? ', ' : ''}`
        ).join('');
      }
      // Sin marcadores, las palabras aceptadas son «a|b|c».
      return String(pregunta.respuesta_correcta || '').split('|').map(s => s.trim()).filter(Boolean)
        .map(a => `<span class="u-fw-600">${window.helpers.escapeHtml(a)}</span>`).join(' o ');
    },

    _textoOpcion(pregunta, valor) {
      if (pregunta.tipo === 'verdadero_falso') {
        const opciones = (Array.isArray(pregunta.opciones) && pregunta.opciones.length === 2)
          ? pregunta.opciones : ['Verdadero', 'Falso'];
        if (valor === '0' || valor === 0 || valor === 'true') return String(opciones[0]);
        if (valor === '1' || valor === 1 || valor === 'false') return String(opciones[1]);
        return valor == null ? '' : String(valor);
      }
      if (pregunta.tipo === 'completar') {
        if (Array.isArray(pregunta.huecos) && pregunta.huecos.length > 0) {
          return pregunta.huecos.map(h => h.respuesta_correcta).join(', ');
        }
        return String(valor == null ? '' : valor).split('|').map(s => s.trim()).filter(Boolean).join(' o ');
      }
      if (pregunta.tipo === 'varias_opciones' || pregunta.tipo === 'ordenar') {
        try {
          const arr = JSON.parse(valor);
          if (Array.isArray(arr)) {
            if (pregunta.tipo === 'ordenar') return arr.map(i => pregunta.opciones[i] || i).join(' → ');
            return arr.map(i => pregunta.opciones[i] || i).join(', ');
          }
        } catch (e) {}
        return valor;
      }
      if (pregunta.tipo === 'relacionar') {
        try {
          const rel = JSON.parse(valor);
          const izq = pregunta.opciones.slice(0, Math.ceil(pregunta.opciones.length / 2));
          const der = pregunta.opciones.slice(Math.ceil(pregunta.opciones.length / 2));
          return Object.entries(rel).map(([k, v]) => (izq[k] || k) + ' → ' + (der[v] || v)).join(' | ');
        } catch (e) {}
        return valor;
      }
      const idx = parseInt(valor, 10);
      if (!isNaN(idx) && pregunta.opciones && pregunta.opciones[idx] !== undefined) return pregunta.opciones[idx];
      return valor;
    },

    _renderRespuesta(pregunta, rActual, idx) {
      if (pregunta.tipo === 'multiple' || pregunta.tipo === 'opcion_unica') {
        return (pregunta.opciones || ['', '']).map((o, oi) => `
          <label class="examen-opcion${String(oi) === rActual ? ' examen-opcion--seleccionada' : ''}">
            <input type="radio" name="p_${pregunta.id}" value="${oi}" ${String(oi) === rActual ? 'checked' : ''}>
            <span class="u-fs-sm">${window.helpers.escapeHtml(o)}</span>
          </label>
        `).join('');
      }
      if (pregunta.tipo === 'varias_opciones') {
        const seleccionadas = rActual ? (() => { try { const arr = JSON.parse(rActual); return Array.isArray(arr) ? arr : []; } catch(e) { return []; } })() : [];
        return (pregunta.opciones || ['', '']).map((o, oi) => `
          <label class="examen-opcion${seleccionadas.includes(oi) ? ' examen-opcion--seleccionada' : ''}">
            <input type="checkbox" data-multi="${pregunta.id}" value="${oi}" ${seleccionadas.includes(oi) ? 'checked' : ''}>
            <span class="u-fs-sm">${window.helpers.escapeHtml(o)}</span>
          </label>
        `).join('');
      }
      if (pregunta.tipo === 'verdadero_falso') {
        // Respuesta por índice (0/1, opciones [Verdadero, Falso]); los intentos
        // antiguos guardaban 'true'/'false' y se siguen mostrando igual.
        const opciones = (Array.isArray(pregunta.opciones) && pregunta.opciones.length === 2)
          ? pregunta.opciones : ['Verdadero', 'Falso'];
        const actual = rActual === 'true' ? '0' : (rActual === 'false' ? '1' : String(rActual));
        return ['0', '1'].map((v, vi) => `
          <label class="examen-opcion${v === actual ? ' examen-opcion--seleccionada' : ''}">
            <input type="radio" name="p_${pregunta.id}" value="${v}" ${v === actual ? 'checked' : ''}>
            <span class="u-fs-sm">${window.helpers.escapeHtml(String(opciones[vi]))}</span>
          </label>
        `).join('');
      }
      if (pregunta.tipo === 'respuesta_corta') {
        return `<input type="text" data-pid="${pregunta.id}" value="${window.helpers.escapeHtml(rActual)}" placeholder="Escribe tu respuesta..." style="width:100%">`;
      }
      if (pregunta.tipo === 'texto_largo') {
        return `<textarea data-pid="${pregunta.id}" rows="4" placeholder="Escribe tu respuesta detallada..." style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto);font:inherit">${window.helpers.escapeHtml(rActual)}</textarea>`;
      }
      if (pregunta.tipo === 'completar') {
        if (TIENE_MARCADOR.test(pregunta.texto || '') && pregunta.huecos && Array.isArray(pregunta.huecos) && pregunta.huecos.length > 0) {
          const respArr = Array.isArray(rActual) ? rActual : [];
          return renderizarTextoConHuecos(pregunta.texto, pregunta.huecos, respArr, { pid: pregunta.id });
        }
        return `<input type="text" data-pid="${pregunta.id}" value="${window.helpers.escapeHtml(rActual)}" placeholder="Escribe la palabra que falta..." style="width:100%">`;
      }
      if (pregunta.tipo === 'relacionar') {
        const pares = pregunta.opciones || [];
        const mit = Math.ceil(pares.length / 2);
        const izq = pares.slice(0, mit);
        const der = pares.slice(mit);
        // La columna derecha se presenta en orden estable; los valores siguen
        // siendo los índices originales (la respuesta correcta es identidad).
        const ordenDer = mezclaEstable(pregunta.id, der.length);
        const relacion = rActual ? (() => { try { return JSON.parse(rActual); } catch(e) { return {}; } })() : {};
        return '<div class="o-pila"><p class="u-fs-xs u-color-texto-terciario u-mb-1">Relaciona cada elemento de la izquierda con su par de la derecha:</p>' +
          izq.map((item, ri) => `
            <div class="o-flecha u-mb-1" style="gap:var(--espaciado-xs)">
              <span style="flex:1;padding:var(--espaciado-xs);background:var(--color-fondo-alt);border-radius:var(--radio-sm)">${window.helpers.escapeHtml(item)}</span>
              <span class="u-color-texto-terciario">→</span>
              <select data-relacion="${pregunta.id}" data-idx="${ri}" style="flex:1">
                <option value="">— Seleccionar —</option>
                ${ordenDer.map(di => `<option value="${di}" ${relacion[ri] == di ? 'selected' : ''}>${window.helpers.escapeHtml(der[di])}</option>`).join('')}
              </select>
            </div>
          `).join('') + '</div>';
      }
      if (pregunta.tipo === 'ordenar') {
        const items = pregunta.opciones || [];
        // El alumno empieza en un orden estable desordenado (no en el correcto,
        // que sería responder sin hacer nada); con respuesta guardada se
        // respeta el orden que ya tenía.
        let orden = items.map((_, i) => i);
        if (rActual) {
          try { const arr = JSON.parse(rActual); if (Array.isArray(arr) && arr.length === items.length) orden = arr; } catch (e) { /* se reordena abajo */ }
        }
        if (!rActual) orden = mezclaEstable(pregunta.id, items.length);
        return '<div class="o-pila"><p class="u-fs-xs u-color-texto-terciario u-mb-1">Ordena los elementos (usa las flechas para mover):</p>' +
          orden.map((oi, pos) => `
            <div class="o-flecha u-mb-1" style="gap:var(--espaciado-xs);padding:var(--espaciado-xs);background:var(--color-fondo-alt);border-radius:var(--radio-sm)">
              <span style="min-width:24px;font-weight:600">${pos + 1}.</span>
              <span style="flex:1">${window.helpers.escapeHtml(items[oi] || '')}</span>
              <input type="hidden" data-orden="${pregunta.id}" data-pos="${pos}" value="${oi}">
              <button type="button" class="btn-ordenar-up examen-ordenar-btn" data-orden="${pregunta.id}" data-pos="${pos}">↑</button>
              <button type="button" class="btn-ordenar-down examen-ordenar-btn" data-orden="${pregunta.id}" data-pos="${pos}">↓</button>
            </div>
          `).join('') + '</div>';
      }
      return '';
    },

    _setupOrdenar(btn, cont, guardarYActualizarBarra) {
      btn.addEventListener('click', () => {
        const preguntaId = btn.dataset.orden;
        const fila = btn.closest('.o-flecha');
        if (!fila) return;
        const inputs = Array.from(cont.querySelectorAll(`input[data-orden="${preguntaId}"]`));
        // Posición real del input en el DOM (no confiar en data-pos, que puede
        // quedar obsoleto en los botones tras el primer movimiento).
        const pos = inputs.indexOf(fila.querySelector(`input[data-orden="${preguntaId}"]`));
        if (pos === -1) return;
        const isUp = btn.classList.contains('btn-ordenar-up');
        const newPos = isUp ? pos - 1 : pos + 1;
        if (newPos < 0 || newPos >= inputs.length) return;
        const temp = inputs[pos].value;
        inputs[pos].value = inputs[newPos].value;
        inputs[newPos].value = temp;
        // Hasta que el alumno no mueva nada, «ordenar» sigue sin responder.
        inputs.forEach(inp => { inp.dataset.tocado = '1'; });
        // Re-sincronizar data-pos de inputs y botones con el nuevo orden
        const filas = Array.from(cont.querySelectorAll('.o-flecha')).filter(f => f.querySelector(`input[data-orden="${preguntaId}"]`));
        filas.forEach((f, i) => {
          const inp = f.querySelector(`input[data-orden="${preguntaId}"]`);
          if (inp) inp.dataset.pos = i;
          f.querySelectorAll('button[data-orden]').forEach(b => { b.dataset.pos = i; });
        });
        guardarYActualizarBarra();
      });
    },

    _obtenerValorRespuesta(cont, pregunta) {
      if (pregunta.tipo === 'multiple' || pregunta.tipo === 'opcion_unica' || pregunta.tipo === 'verdadero_falso') {
        const sel = cont.querySelector(`input[name="p_${pregunta.id}"]:checked`);
        return sel ? sel.value : undefined;
      }
      if (pregunta.tipo === 'varias_opciones') {
        const checks = cont.querySelectorAll(`input[data-multi="${pregunta.id}"]:checked`);
        return checks.length > 0 ? JSON.stringify(Array.from(checks).map(c => parseInt(c.value))) : undefined;
      }
      if (pregunta.tipo === 'relacionar') {
        const selects = cont.querySelectorAll(`select[data-relacion="${pregunta.id}"]`);
        const rel = {};
        selects.forEach(s => { if (s.value) rel[parseInt(s.dataset.idx)] = parseInt(s.value); });
        return Object.keys(rel).length > 0 ? JSON.stringify(rel) : undefined;
      }
      if (pregunta.tipo === 'ordenar') {
        const hiddens = cont.querySelectorAll(`input[data-orden="${pregunta.id}"]`);
        if (hiddens.length === 0) return undefined;
        const tocado = Array.from(hiddens).some(h => h.dataset.tocado === '1');
        if (!tocado) return undefined;
        return JSON.stringify(Array.from(hiddens).sort((a, b) => parseInt(a.dataset.pos) - parseInt(b.dataset.pos)).map(h => parseInt(h.value)));
      }
      if (pregunta.tipo === 'completar' && pregunta.huecos && Array.isArray(pregunta.huecos) && pregunta.huecos.length > 0 && TIENE_MARCADOR.test(pregunta.texto || '')) {
        const inputs = cont.querySelectorAll(`.pregunta-examen__hueco-input[data-hidx][data-pid="${pregunta.id}"]`);
        if (inputs.length === 0) return undefined;
        const arr = new Array(pregunta.huecos.length).fill('');
        inputs.forEach(inp => {
          const hidx = parseInt(inp.dataset.hidx);
          if (!isNaN(hidx) && hidx < arr.length) arr[hidx] = inp.value;
        });
        return arr.some(v => v !== '') ? arr : undefined;
      }
      // El contenedor de la pregunta (.pregunta-examen) TAMBIÉN lleva data-pid,
      // así que hay que apuntar al campo concreto: si no, se lee el div y las
      // respuestas escritas (completar sin marcadores, respuesta_corta y
      // texto_largo) se pierden silenciosamente al sincronizar.
      const inp = cont.querySelector(`input[data-pid="${pregunta.id}"], textarea[data-pid="${pregunta.id}"]`);
      return inp ? inp.value : undefined;
    },

    _guardarRespuesta(respuestas, intento) {
      intento.respuestas = JSON.stringify(respuestas);
      // El borrador se valida y filtra en PostgreSQL; los errores de autosave no
      // convierten la respuesta en una entrega válida ni bloquean la edición.
      window.examenesRepository.guardarIntento({ id: intento.id, respuestas: intento.respuestas })
        .catch(e => console.warn('No se pudo guardar el borrador del examen:', e.message));
    },

    desmontar() {
      if (_cleanup) { _cleanup(); _cleanup = null; }
      this._quitarGuardiaSalida();
      this._desconectarAntesDeDescargar();
    }
  };
})();
