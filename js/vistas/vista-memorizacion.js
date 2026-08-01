(function () {
  'use strict';

  /* ─── Helpers internos ─── */
  const E = (h) => window.helpers.escapeHtml(h);
  const I = (n) => window.Iconos.render(n);
  const $ = (c, s) => c.querySelector(s);
  const $$ = (c, s) => c.querySelectorAll(s);

  /* Paleta de colores para mazos */
  const COLORES = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#84CC16'];
  function colorMazo(color, idx) {
    if (color && /^#[0-9a-fA-F]{6}$/.test(color)) return color;
    return COLORES[(idx >= 0 ? idx : 0) % COLORES.length];
  }

  const ESTADOS = {
    nuevo: { texto: 'Nuevo', color: 'var(--color-aviso)' },
    repasando: { texto: 'Repasando', color: 'var(--color-acento)' },
    aprendido: { texto: 'Aprendido', color: 'var(--color-exito)' },
    consolidado: { texto: 'Consolidado', color: 'var(--color-exito)' }
  };

  /* ─── Template HTML de flashcard ─── */
  function _htmlFlashcard(t, opts) {
    const ref = E(t.referencia || 'Tarjeta');
    const texto = E(t.texto || '');
    const pista = t.pista || '';
    const clasesVolteado = opts.volteado ? ' flashcard-container--volteado' : '';

    return `
      <div class="flashcard-container${clasesVolteado}" id="fc">
        <div class="flashcard-inner">

          <div class="flashcard-cara">
            <p class="flashcard-referencia">${ref}</p>
            ${pista
              ? `<button class="btn-secundario flashcard-btn" id="btnPista" style="max-width:200px;font-size:var(--texto-xs)">💡 Ver pista</button>
                 <div id="pistaBox" class="flashcard-pista" style="display:none;font-style:italic">${E(pista)}</div>`
              : ''}
            <p class="flashcard-hint">Toca para revelar</p>
          </div>

          <div class="flashcard-cara flashcard-cara--atras">
            <p class="flashcard-referencia-chica">${ref}</p>
            <p class="flashcard-texto">${texto}</p>
            <p class="flashcard-swipe-hint">Desliza para calificar</p>
            <div class="flashcard-calidades">
              <button class="btn-calidad btn-calidad--no" data-q="0"><span class="btn-calidad__num">0</span><span class="btn-calidad__label">No lo recordé</span></button>
              <button class="btn-calidad btn-calidad--dificil" data-q="1"><span class="btn-calidad__num">1</span><span class="btn-calidad__label">Difícil</span></button>
              <button class="btn-calidad btn-calidad--medio" data-q="3"><span class="btn-calidad__num">3</span><span class="btn-calidad__label">Con esfuerzo</span></button>
              <button class="btn-calidad btn-calidad--facil" data-q="5"><span class="btn-calidad__num">5</span><span class="btn-calidad__label">Fácil</span></button>
            </div>
          </div>

        </div>
        <div class="flashcard-indicador flashcard-indicador--izq">← No lo recordé</div>
        <div class="flashcard-indicador flashcard-indicador--der">Fácil →</div>
        <div class="flashcard-indicador flashcard-indicador--arriba">↑ Difícil</div>
        <div class="flashcard-indicador flashcard-indicador--abajo">Con esfuerzo ↓</div>
      </div>`;
  }

  /* ─── Gestos táctiles/mouse para flashcard ─── */
  function _initGestos(fcEl, getVolteado, alVoltear, alCalificar) {
    let startX = 0, startY = 0, moviendo = false, swiping = false, lastSwipeEnd = 0;
    const UMBRAL = 80;

    const indicadores = {
      izq: fcEl.querySelector('.flashcard-indicador--izq'),
      der: fcEl.querySelector('.flashcard-indicador--der'),
      arriba: fcEl.querySelector('.flashcard-indicador--arriba'),
      abajo: fcEl.querySelector('.flashcard-indicador--abajo'),
    };
    const inner = fcEl.querySelector('.flashcard-inner');

    function limpiar() {
      moviendo = false;
      swiping = false;
      inner.style.transform = getVolteado() ? 'rotateY(180deg)' : '';
      fcEl.classList.remove('flashcard-container--moviendo');
      Object.values(indicadores).forEach((el) => el?.classList.remove('flashcard-indicador--visible'));
    }

    function onStart(x, y) {
      if (!getVolteado()) return;
      startX = x;
      startY = y;
      moviendo = true;
      swiping = false;
      fcEl.classList.add('flashcard-container--moviendo');
    }

    function onMove(x, y) {
      if (!moviendo) return;
      const dx = x - startX;
      const dy = y - startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < 10 && absDy < 10) return;
      swiping = true;

      Object.values(indicadores).forEach((el) => el?.classList.remove('flashcard-indicador--visible'));

      if (absDx > absDy) {
        inner.style.transform = `rotateY(180deg) translateX(${dx}px) rotate(${dx * 0.04}deg)`;
        if (dx < 0 && indicadores.izq) indicadores.izq.classList.add('flashcard-indicador--visible');
        if (dx > 0 && indicadores.der) indicadores.der.classList.add('flashcard-indicador--visible');
      } else {
        inner.style.transform = `rotateY(180deg) translateY(${dy}px) scale(${1 - Math.abs(dy) * 0.0008})`;
        if (dy < 0 && indicadores.arriba) indicadores.arriba.classList.add('flashcard-indicador--visible');
        if (dy > 0 && indicadores.abajo) indicadores.abajo.classList.add('flashcard-indicador--visible');
      }
    }

    function onEnd(x, y) {
      if (!moviendo) return;
      const dx = x - startX;
      const dy = y - startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (!swiping || (absDx < UMBRAL && absDy < UMBRAL)) {
        limpiar();
        return;
      }

      let calidad = -1;
      let dir = '';

      if (absDx > absDy) {
        if (dx < -UMBRAL) { calidad = 0; dir = 'left'; }
        else if (dx > UMBRAL) { calidad = 5; dir = 'right'; }
      } else {
        if (dy < -UMBRAL) { calidad = 1; dir = 'up'; }
        else if (dy > UMBRAL) { calidad = 3; dir = 'down'; }
      }

      if (calidad >= 0) {
        fcEl.classList.add(`flashcard-container--fly-${dir}`);
        lastSwipeEnd = Date.now();
        setTimeout(() => {
          fcEl.classList.remove(`flashcard-container--fly-${dir}`);
          limpiar();
          alCalificar(calidad);
        }, 350);
      } else {
        limpiar();
      }
    }

    /* Touch */
    fcEl.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    fcEl.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    fcEl.addEventListener('touchend', (e) => onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY));

    /* Mouse (solo en backface para evitar conflicto con click) */
    let mouseActivo = false;
    fcEl.addEventListener('mousedown', (e) => {
      if (!getVolteado()) return;
      mouseActivo = true;
      onStart(e.clientX, e.clientY);
      const moveH = (ev) => onMove(ev.clientX, ev.clientY);
      const upH = (ev) => {
        onEnd(ev.clientX, ev.clientY);
        document.removeEventListener('mousemove', moveH);
        document.removeEventListener('mouseup', upH);
        mouseActivo = false;
      };
      document.addEventListener('mousemove', moveH);
      document.addEventListener('mouseup', upH);
    });

    /* Tap para voltear */
    fcEl.addEventListener('click', () => {
      if (Date.now() - lastSwipeEnd < 300) return;
      if (mouseActivo) return;
      if (!getVolteado()) alVoltear();
    });
  }

  /* ─── Fill-in-the-blanks helpers ─── */
  function _generarHuecos(texto) {
    const tokens = texto.split(/(\s+)/).filter(Boolean);
    const candidatos = tokens.map((t, i) => ({ idx: i, len: t.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g, '').length })).filter(x => x.len > 2);
    const nHuecos = Math.max(1, Math.round(candidatos.length * 0.4));
    const seleccionados = new Set();
    const shuffled = [...candidatos].sort(() => Math.random() - 0.5);
    for (let i = 0; i < nHuecos && i < shuffled.length; i++) seleccionados.add(shuffled[i].idx);
    return tokens.map((t, i) => ({ palabra: t, hueco: seleccionados.has(i), idx: i }));
  }

  function _renderCompletar(slot, t, pendientes, idx, d) {
    const tokens = _generarHuecos(t.texto || '');
    const respCorrectas = tokens.filter(x => x.hueco).map(x => x.palabra.replace(/^[\s.,;:!?¿¡()"'«»]+|[\s.,;:!?¿¡()"'«»]+$/g, ''));
    let respuestas = [];
    let mostrandoRespuesta = false;

    const render = () => {
      slot.innerHTML = `
        <div class="tarjeta-memorizacion">
          <div class="tarjeta-memorizacion__progreso">
            <span>Tarjeta ${idx + 1} de ${pendientes.length}</span>
            ${idx > 0 ? '<button class="btn-secundario" id="btnAntC" style="margin-left:auto;font-size:var(--texto-xs);padding:4px 8px">← Anterior</button>' : ''}
            <button class="btn-secundario" id="btnFlip${idx}" style="font-size:var(--texto-xs);padding:4px 8px">${I('copy')} Flashcard</button>
          </div>
          <div class="mem-sesion-progreso-track" aria-hidden="true"><div class="mem-sesion-progreso" style="width:${Math.round(((idx + 1) / pendientes.length) * 100)}%"></div></div>
          <div class="mem-completar${mostrandoRespuesta ? ' mem-completar--revisado' : ''}">
            <p class="mem-completar-ref">${E(t.referencia || '')}</p>
            <div class="mem-completar-texto">
              ${tokens.map((token, i) => {
                if (!token.hueco) return `<span class="mem-completar-fijo">${E(token.palabra)}</span>`;
                const usr = respuestas[i] || '';
                const correcto = mostrandoRespuesta && usr.toLowerCase().trim() === respCorrectas[tokens.filter(x => x.hueco).indexOf(token)].toLowerCase();
                const incorrecto = mostrandoRespuesta && usr.trim() !== '' && !correcto;
                return `<span class="mem-completar-hueco-wrap">
                  <input type="text" class="mem-completar-input${correcto ? ' mem-completar-input--ok' : ''}${incorrecto ? ' mem-completar-input--ko' : ''}" data-hidx="${i}" value="${E(usr)}" autocomplete="off" ${mostrandoRespuesta ? 'readonly' : ''}>
                  ${mostrandoRespuesta && incorrecto ? `<span class="mem-completar-ok">${E(respCorrectas[tokens.filter(x => x.hueco).indexOf(token)])}</span>` : ''}
                </span>`;
              }).join('')}
            </div>
            ${mostrandoRespuesta ? `
              <div class="flashcard-calidades" style="margin-top:var(--espaciado-md)">
                <button class="btn-calidad btn-calidad--no" data-q="0"><span class="btn-calidad__num">0</span><span class="btn-calidad__label">No lo recordé</span></button>
                <button class="btn-calidad btn-calidad--dificil" data-q="1"><span class="btn-calidad__num">1</span><span class="btn-calidad__label">Difícil</span></button>
                <button class="btn-calidad btn-calidad--medio" data-q="3"><span class="btn-calidad__num">3</span><span class="btn-calidad__label">Con esfuerzo</span></button>
                <button class="btn-calidad btn-calidad--facil" data-q="5"><span class="btn-calidad__num">5</span><span class="btn-calidad__label">Fácil</span></button>
              </div>` : `
              <button class="btn-primario" id="btnRevisar${idx}" style="align-self:center;margin-top:var(--espaciado-sm);justify-content:center">Revisar respuestas</button>`}
          </div>
        </div>`;
    };

    render();
    window.Iconos.actualizar();

    $(slot, '#btnAntC')?.addEventListener('click', () => {
      if (d._historialRepaso && d._historialRepaso.length > 0) {
        const m = d._modo === 'completar';
        d._modo = 'completar';
        window.vistaMemorizacion._flashcard(slot, pendientes, d._historialRepaso.pop(), d);
        if (!m) d._modo = 'flashcard';
      }
    });

    $(slot, `#btnFlip${idx}`)?.addEventListener('click', () => {
      d._modo = 'flashcard';
      window.vistaMemorizacion._flashcard(slot, pendientes, idx, d);
    });

    const inpRevisar = $(slot, `#btnRevisar${idx}`);
    if (inpRevisar) inpRevisar.addEventListener('click', () => {
      slot.querySelectorAll('.mem-completar-input').forEach(inp => {
        respuestas[parseInt(inp.dataset.hidx)] = inp.value;
      });
      mostrandoRespuesta = true;
      render();
      window.Iconos.actualizar();

      $$(slot, '[data-q]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const q = parseInt(btn.dataset.q, 10);
          if (d._historialRepaso) d._historialRepaso.push(idx);
          try {
            const res = window.repeticionEspaciada.calcularProximoRepaso(t, q);
            await window.memorizacionRepository.actualizarTarjeta({ ...t, ...res });
            await window.memorizacionRepository.registrarRepaso(t.id, q);
          } catch { /* offline */ }
          if (window.haptica) { q === 0 ? window.haptica.fallo() : window.haptica.logro(); }
          if (q === 0 && Array.isArray(pendientes)) pendientes.push({ ...t });
          window.vistaMemorizacion._flashcard(slot, pendientes, idx + 1, d);
        });
      });
    });
  }


  /* ════════════════════════════════════════════════════════════
     VISTA PRINCIPAL — Sistema de mazos (flashcards tipo Anki)
     ════════════════════════════════════════════════════════════ */
  window.vistaMemorizacion = {

    /* ── Montaje ──────────────────────────────────────────── */
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      raiz.innerHTML = window.skeleton ? window.skeleton.memorizacion() : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';

      try {
        const [mazos, tarjetas, pendientes, total, repasos, libros] = await Promise.all([
          window.memorizacionRepository.listarMazos(usuario.id),
          window.memorizacionRepository.listarTarjetas(usuario.id),
          window.memorizacionRepository.tarjetasPendientes(usuario.id),
          window.memorizacionRepository.contarTarjetas(usuario.id),
          window.memorizacionRepository.totalRepasos(usuario.id),
          window.supabaseClient.from('libros_biblicos').select('id, nombre').order('id'),
        ]);
        this._datos = {
          mazos,
          tarjetas,
          pendientes,
          total,
          repasos,
          libros: libros.data || [],
          usuario,
        };
        this._pintar(raiz);
      } catch {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p class="u-color-error">Error al cargar</p></div>';
      }
    },

    desmontar() {},

    /* ══════════════════════════════════════════════════════════
       HOME: grid de mazos
       ══════════════════════════════════════════════════════════ */
    _pintar(raiz) {
      const d = this._datos;
      const pendientesHoy = d.pendientes.length;
      const sinMazo = d.tarjetas.filter(t => !t.mazo_id);

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <h2>${I('layers')} Memorización <button class="info-ayuda" data-guia="memorizacion" aria-label="Guía de Memorización">i</button></h2>

          <div class="mem-grid-tarjetas">
            <div class="tarjeta-capitulo mem-stat" title="Tarjetas programadas para repasar hoy según el sistema de repetición espaciada">
              <p class="u-fs-xs u-color-texto-terciario">Pendientes hoy</p>
              <p class="u-texto-2xl u-fw-700">${pendientesHoy}</p>
            </div>
            <div class="tarjeta-capitulo mem-stat" title="Total de tarjetas en tu biblioteca de memorización">
              <p class="u-fs-xs u-color-texto-terciario">Total tarjetas</p>
              <p class="u-texto-2xl u-fw-700">${d.total}</p>
            </div>
            <div class="tarjeta-capitulo mem-stat" title="Número de mazos que has creado">
              <p class="u-fs-xs u-color-texto-terciario">Mazos</p>
              <p class="u-texto-2xl u-fw-700">${d.mazos.length}</p>
            </div>
            <div class="tarjeta-capitulo mem-stat" title="Total de repasos realizados con tus tarjetas">
              <p class="u-fs-xs u-color-texto-terciario">Repasos</p>
              <p class="u-texto-2xl u-fw-700">${d.repasos}</p>
            </div>
          </div>

          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <h3>${I('layers')} Mis mazos</h3>
            <button class="btn-primario u-fs-sm" id="btnNuevoMazo" style="justify-content:center">${I('plus')} Nuevo mazo</button>
          </div>

          <div class="mem-mazos-grid">
            ${d.mazos.map((m, i) => this._tarjetaMazo(m, i, d)).join('')}
            ${sinMazo.length > 0 ? this._tarjetaMazo(null, -1, d, sinMazo) : ''}
            ${d.mazos.length === 0 && sinMazo.length === 0
              ? '<p class="u-color-texto-secundario u-fs-sm u-texto-centrado" style="grid-column:1/-1;padding:var(--espaciado-lg) 0">Aún no tienes mazos. Pulsa "Nuevo mazo" para empezar a organizar tus tarjetas.</p>'
              : ''}
          </div>
        </div>`;

      this._bindHome(raiz);
      window.Iconos.actualizar();
      window.helpers.registrarGuias(raiz, {
        memorizacion: ['Memorización', 'Organiza tus tarjetas en mazos como Anki. Cada mazo es un conjunto de tarjetas (versículos o pregunta/respuesta) que repasas con repetición espaciada.', 'Crea un mazo, añade tarjetas y pulsa "Repasar" para practicar con flashcards. Las tarjetas sin mazo aparecen en "Sin mazo".']
      });
    },

    /* ── Tarjeta de mazo en el home ── */
    _tarjetaMazo(m, idx, d, sinMazo) {
      const tarjetas = sinMazo ? sinMazo : d.tarjetas.filter(t => t.mazo_id === m.id);
      const pend = sinMazo
        ? d.pendientes.filter(t => !t.mazo_id)
        : d.pendientes.filter(t => t.mazo_id === m.id);
      const color = sinMazo ? 'var(--color-texto-terciario)' : colorMazo(m.color, idx);
      const pct = tarjetas.length > 0 ? Math.round(((tarjetas.length - pend.length) / tarjetas.length) * 100) : 100;
      return `
        <div class="mem-mazo-card" data-mazo="${m ? m.id : 'sin'}" style="--mazo-color:${color}">
          <div class="mem-mazo-card__top">
            <span class="mem-mazo-card__nombre">${m ? E(m.nombre) : 'Sin mazo'}</span>
            <span class="mem-mazo-card__cuenta">${tarjetas.length}</span>
          </div>
          ${m && m.descripcion ? `<p class="mem-mazo-card__desc">${E(m.descripcion)}</p>` : `<p class="mem-mazo-card__desc">${sinMazo ? 'Tarjetas sin mazo asignado' : 'Mazo de tarjetas'}</p>`}
          <div class="mem-mazo-card__progreso" title="${pct}% repasadas">
            <div class="mem-mazo-card__barra" style="width:${pct}%"></div>
          </div>
          <p class="mem-mazo-card__stats">
            ${pend.length > 0
              ? `<span class="mem-mazo-card__pend">${I('clock')} ${pend.length} pendiente${pend.length === 1 ? '' : 's'}</span>`
              : '<span class="u-color-texto-terciario">✓ Al día</span>'}
          </p>
        </div>`;
    },

    _bindHome(raiz) {
      const d = this._datos;

      $(raiz, '#btnNuevoMazo').onclick = () => this._formMazo(raiz);

      $$(raiz, '.mem-mazo-card').forEach(el => {
        el.onclick = () => {
          const id = el.dataset.mazo;
          this._verMazo(raiz, id === 'sin' ? null : id);
        };
      });
    },

    /* ══════════════════════════════════════════════════════════
       DETALLE DE MAZO: repasar + tarjetas del mazo
       ══════════════════════════════════════════════════════════ */
    _verMazo(raiz, mazoId) {
      const d = this._datos;
      const mazo = mazoId ? (d.mazos.find(m => m.id === mazoId) || null) : null;
      const nombre = mazo ? mazo.nombre : 'Sin mazo';
      const color = mazo ? colorMazo(mazo.color, d.mazos.indexOf(mazo)) : 'var(--color-texto-terciario)';
      const tarjetas = d.tarjetas.filter(t => (t.mazo_id || null) === (mazoId || null));
      const pend = d.pendientes.filter(t => (t.mazo_id || null) === (mazoId || null));

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <button class="btn-secundario" id="btnVolver">← Mazos</button>
            <div class="o-flecha" style="gap:var(--espaciado-xs)">
              ${mazo ? `<button class="btn-secundario u-fs-xs" id="btnEditarMazo">${I('edit-3')} Editar</button>` : ''}
              ${mazo ? `<button class="btn-secundario u-fs-xs" id="btnEliminarMazo" style="color:var(--color-error)">${I('trash-2')} Eliminar</button>` : ''}
            </div>
          </div>

          <div class="mem-mazo-detalle" style="--mazo-color:${color}">
            <h3>${I('layers')} ${E(nombre)}</h3>
            ${mazo && mazo.descripcion ? `<p class="u-fs-xs u-color-texto-secundario u-mt-1">${E(mazo.descripcion)}</p>` : ''}
            <p class="u-fs-xs u-color-texto-terciario u-mt-1">${tarjetas.length} tarjeta${tarjetas.length === 1 ? '' : 's'} · ${pend.length} pendiente${pend.length === 1 ? '' : 's'}</p>
          </div>

          <button class="btn-primario" id="btnRepasarMazo" style="justify-content:center;${pend.length === 0 ? 'opacity:0.5;' : ''}" ${pend.length === 0 ? 'disabled' : ''}>
            ${I('play')} Repasar ${pend.length} tarjeta${pend.length === 1 ? '' : 's'}
          </button>
          <button class="btn-secundario" id="btnNuevaTarjeta" style="justify-content:center">${I('plus')} Nueva tarjeta</button>

          <h3 class="u-mt-3">Tarjetas (${tarjetas.length})</h3>
          <div class="o-pila" id="memListaTarjetas">
            ${tarjetas.length === 0
              ? '<p class="u-color-texto-secundario u-fs-sm u-texto-centrado">Aún no hay tarjetas en este mazo. Pulsa "Nueva tarjeta" para añadir una.</p>'
              : tarjetas.map(t => this._itemTarjeta(t)).join('')}
          </div>
        </div>`;

      this._bindMazo(raiz, mazoId, tarjetas);
      window.Iconos.actualizar();
    },

    /* ── Item de tarjeta dentro de un mazo ── */
    _itemTarjeta(t) {
      const tipo = t.tipo === 'libre' ? 'libre' : 'versiculo';
      const frente = tipo === 'libre' ? (t.referencia || 'Pregunta') : (t.referencia || 'Versículo');
      const estado = window.repeticionEspaciada.estadoAprendizaje(t.racha_actual || 0, t.intervalo || 0);
      const est = ESTADOS[estado];
      const diasRest = t.proximo_repaso ? Math.ceil((new Date(t.proximo_repaso) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
      const corto = (t.texto || '').substring(0, 90) + ((t.texto || '').length > 90 ? '…' : '');
      return `
        <div class="tarjeta-capitulo mem-versiculo-item" data-id="${t.id}">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <div class="o-flecha" style="gap:var(--espaciado-xs);align-items:center;flex:1;min-width:0">
              <span class="mem-tipo-badge ${tipo === 'libre' ? 'mem-tipo-badge--libre' : ''}">${tipo === 'libre' ? 'Q' : 'V'}</span>
              <span class="u-fw-600 u-fs-sm" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${E(frente)}</span>
              ${est ? `<span class="mem-estado-badge mem-estado-badge--${estado}">${est.texto}</span>` : ''}
            </div>
            <div class="o-flecha" style="gap:4px">
              ${diasRest > 0 && diasRest <= 30 ? `<span class="u-fs-xs u-color-texto-terciario" title="Próximo repaso">${I('calendar')} ${diasRest}d</span>` : ''}
              <button class="mem-btn-edit" data-id="${t.id}" title="Editar" style="background:none;border:none;cursor:pointer;color:var(--color-acento)">${I('edit-3')}</button>
              <button class="mem-btn-del" data-id="${t.id}" title="Eliminar" style="background:none;border:none;cursor:pointer;color:var(--color-error)">${I('trash-2')}</button>
            </div>
          </div>
          ${corto ? `<p class="u-fs-xs u-color-texto-secundario u-mt-1">${E(corto)}</p>` : ''}
        </div>`;
    },

    _bindMazo(raiz, mazoId, tarjetas) {
      const d = this._datos;

      $(raiz, '#btnVolver').onclick = () => this._pintar(raiz);
      $(raiz, '#btnEditarMazo')?.addEventListener('click', () => this._formMazo(raiz, mazoId));

      $(raiz, '#btnEliminarMazo')?.addEventListener('click', async () => {
        const ok = await window.helpers.confirmar('¿Eliminar este mazo? Las tarjetas se moverán a "Sin mazo" y no se perderán.', {
          titulo: 'Eliminar mazo', textoConfirmar: 'Eliminar'
        });
        if (!ok) return;
        try {
          await window.memorizacionRepository.eliminarMazo(mazoId);
          window.helpers.mostrarAlerta('Mazo eliminado. Las tarjetas se movieron a "Sin mazo".', 'exito');
          await this._recargar(raiz);
          this._pintar(raiz);
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      });

      $(raiz, '#btnRepasarMazo').onclick = () => {
        if (d.pendientes.filter(t => (t.mazo_id || null) === (mazoId || null)).length === 0) return;
        this._sesion(raiz, mazoId);
      };

      $(raiz, '#btnNuevaTarjeta').onclick = () => this._formTarjeta(raiz, mazoId);

      $$(raiz, '.mem-versiculo-item').forEach(el => {
        el.onclick = (e) => {
          if (e.target.closest('.mem-btn-edit') || e.target.closest('.mem-btn-del')) return;
          this._formTarjeta(raiz, mazoId, el.dataset.id);
        };
      });

      $$(raiz, '.mem-btn-edit').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); this._formTarjeta(raiz, mazoId, btn.dataset.id); };
      });

      $$(raiz, '.mem-btn-del').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const ok = await window.helpers.confirmar('¿Eliminar esta tarjeta?', { titulo: 'Eliminar tarjeta', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          try {
            await window.memorizacionRepository.desactivarTarjeta(btn.dataset.id);
            window.helpers.mostrarAlerta('Tarjeta eliminada.', 'exito');
            await this._recargar(raiz);
            this._verMazo(raiz, mazoId);
          } catch { window.helpers.mostrarAlerta('Error al eliminar', 'error'); }
        };
      });
    },

    /* ══════════════════════════════════════════════════════════
       SESIÓN DE REPASO (flashcards del mazo)
       ══════════════════════════════════════════════════════════ */
    _sesion(raiz, mazoId) {
      const d = this._datos;
      const mazo = mazoId ? (d.mazos.find(m => m.id === mazoId) || null) : null;
      const nombre = mazo ? mazo.nombre : 'Sin mazo';
      const lista = d.pendientes.filter(t => (t.mazo_id || null) === (mazoId || null));

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="o-flecha o-flecha--between" style="align-items:center">
            <button class="btn-secundario" id="btnSalir">← ${E(nombre)}</button>
            <span class="u-fs-xs u-color-texto-terciario">${lista.length} pendientes</span>
          </div>
          <div id="slot" class="o-pila" style="min-height:300px"></div>
        </div>`;

      const volverAMazo = async () => {
        try { await this._recargar(raiz); } catch (e) {}
        this._verMazo(raiz, mazoId);
      };
      $(raiz, '#btnSalir').onclick = volverAMazo;
      d._historialRepaso = [];
      d._modo = 'flashcard';
      this._flashcard($(raiz, '#slot'), lista, 0, d, volverAMazo);
    },

    /* ── Flashcard (sesión de repaso) ── */
    _flashcard(slot, pendientes, idx, d, alTerminar) {
      if (alTerminar) d._alTerminar = alTerminar;
      if (d._modo === 'completar' && idx < pendientes.length) {
        _renderCompletar(slot, pendientes[idx], pendientes, idx, d);
        return;
      }
      if (idx >= pendientes.length) {
        const volver = alTerminar || d._alTerminar;
        slot.innerHTML = `
          <div class="u-texto-centrado o-pila" style="align-items:center;padding:var(--espaciado-xl) 0">
            <p style="font-size:3rem;color:var(--color-exito);display:flex;justify-content:center">${I('party-popper')}</p>
            <p class="u-texto-lg u-fw-600">¡Has terminado todos los repasos!</p>
            <p class="u-fs-xs u-color-texto-terciario">Vuelve mañana para consolidar lo aprendido.</p>
            <div class="o-flecha" style="flex-wrap:wrap;justify-content:center;gap:var(--espaciado-xs)">
              <button class="btn-secundario" id="btnVolverMazo">← Volver</button>
              <button class="btn-primario" id="btnRepasarTodo">${I('rotate-ccw')} Repasar de nuevo</button>
            </div>
          </div>`;
        $(slot, '#btnVolverMazo').onclick = () => { if (volver) volver(); };
        $(slot, '#btnRepasarTodo').onclick = () => {
          d._historialRepaso = [];
          this._flashcard(slot, pendientes, 0, d, volver);
        };
        return;
      }

      const t = pendientes[idx];

      slot.innerHTML = `
        <div class="tarjeta-memorizacion">
          <div class="tarjeta-memorizacion__progreso">
            <span>Tarjeta ${idx + 1} de ${pendientes.length}</span>
            ${idx > 0 ? '<button class="btn-secundario" id="btnAnt" style="margin-left:auto;font-size:var(--texto-xs);padding:4px 8px">← Anterior</button>' : ''}
            <button class="btn-secundario" id="btnCom${idx}" style="font-size:var(--texto-xs);padding:4px 8px">${I('edit-3')} Completar</button>
          </div>
          <div class="mem-sesion-progreso-track" aria-hidden="true"><div class="mem-sesion-progreso" style="width:${Math.round(((idx + 1) / pendientes.length) * 100)}%"></div></div>
          ${_htmlFlashcard(t, { volteado: false })}
        </div>`;

      window.Iconos.actualizar();

      const fcEl = $(slot, '#fc');
      let volteado = false;

      /* Pista (no debe voltear la tarjeta) */
      const bp = $(slot, '#btnPista');
      if (bp) bp.onclick = (ev) => { ev.stopPropagation(); const b = $(slot, '#pistaBox'); if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none'; };

      /* Anterior */
      const ba = $(slot, '#btnAnt');
      if (ba) ba.onclick = () => {
        if (d._historialRepaso && d._historialRepaso.length > 0) this._flashcard(slot, pendientes, d._historialRepaso.pop(), d, alTerminar);
      };

      /* Completar mode toggle */
      $(slot, `#btnCom${idx}`)?.addEventListener('click', () => {
        d._modo = 'completar';
        this._flashcard(slot, pendientes, idx, d, alTerminar);
      });

      const calificar = async (q) => {
        if (d._historialRepaso) d._historialRepaso.push(idx);
        try {
          const res = window.repeticionEspaciada.calcularProximoRepaso(t, q);
          await window.memorizacionRepository.actualizarTarjeta({ ...t, ...res });
          await window.memorizacionRepository.registrarRepaso(t.id, q);
        } catch { /* offline */ }
        if (window.haptica) { q === 0 ? window.haptica.fallo() : window.haptica.logro(); }
        if (q === 0) pendientes.push({ ...t });
        this._flashcard(slot, pendientes, idx + 1, d, alTerminar);
      };

      /* Gestos */
      _initGestos(
        fcEl,
        () => volteado,
        () => { volteado = true; fcEl.classList.add('flashcard-container--volteado'); },
        (q) => calificar(q)
      );

      /* Botones de calidad (fallback desktop) */
      $$(slot, '[data-q]').forEach((btn) => {
        btn.onclick = () => calificar(parseInt(btn.dataset.q, 10));
      });
    },

    /* ══════════════════════════════════════════════════════════
       FORMULARIO DE MAZO (crear / editar)
       ══════════════════════════════════════════════════════════ */
    _formMazo(raiz, mazoId) {
      const d = this._datos;
      const mazo = mazoId ? (d.mazos.find(m => m.id === mazoId) || null) : null;
      const colorSel = mazo ? colorMazo(mazo.color, d.mazos.indexOf(mazo)) : COLORES[0];

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <button class="btn-secundario" id="btnVolver" style="align-self:flex-start">← ${mazo ? 'Mazo' : 'Mazos'}</button>
          <h3>${mazo ? 'Editar mazo' : 'Nuevo mazo'}</h3>
          <div class="o-pila" style="gap:var(--espaciado-sm)">
            <label class="u-fs-sm u-fw-600">Nombre del mazo *</label>
            <input type="text" id="fNombre" value="${E(mazo ? mazo.nombre : '')}" placeholder="Ej: Versículos de consuelo" style="width:100%">
            <label class="u-fs-sm u-fw-600">Descripción (opcional)</label>
            <textarea id="fDesc" rows="2" placeholder="Para qué sirve este mazo..." style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto);font:inherit">${E(mazo ? (mazo.descripcion || '') : '')}</textarea>
            <label class="u-fs-sm u-fw-600">Color</label>
            <div class="mem-color-picker">
              ${COLORES.map(c => `
                <button type="button" class="mem-color-dot${c === colorSel ? ' mem-color-dot--activo' : ''}" data-color="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join('')}
            </div>
          </div>
          <button class="btn-primario" id="btnGuardar" style="width:100%;justify-content:center">${mazo ? 'Guardar cambios' : 'Crear mazo'}</button>
        </div>`;

      $(raiz, '#btnVolver').onclick = () => mazo ? this._verMazo(raiz, mazoId) : this._pintar(raiz);

      let colorElegido = colorSel;
      $$(raiz, '.mem-color-dot').forEach(dot => {
        dot.onclick = () => {
          colorElegido = dot.dataset.color;
          $$(raiz, '.mem-color-dot').forEach(x => x.classList.toggle('mem-color-dot--activo', x === dot));
        };
      });

      $(raiz, '#btnGuardar').onclick = async () => {
        const nombre = $(raiz, '#fNombre').value.trim();
        const descripcion = $(raiz, '#fDesc').value.trim();
        if (!nombre) { window.helpers.mostrarAlerta('El nombre del mazo es obligatorio.', 'advertencia'); return; }
        try {
          if (mazo) {
            await window.memorizacionRepository.actualizarMazo(mazo.id, { nombre, descripcion, color: colorElegido });
            window.helpers.mostrarAlerta('Mazo actualizado.', 'exito');
          } else {
            const nuevo = await window.memorizacionRepository.crearMazo(d.usuario.id, { nombre, descripcion, color: colorElegido });
            window.helpers.mostrarAlerta('Mazo creado.', 'exito');
            await this._recargar(raiz);
            this._verMazo(raiz, nuevo.id || null);
            return;
          }
          await this._recargar(raiz);
          this._verMazo(raiz, mazoId);
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      };
    },

    /* ══════════════════════════════════════════════════════════
       FORMULARIO DE TARJETA (crear / editar)
       ══════════════════════════════════════════════════════════ */
    _formTarjeta(raiz, mazoId, tarjetaId) {
      const d = this._datos;
      const t = tarjetaId ? (d.tarjetas.find(x => x.id === tarjetaId) || null) : null;
      const est = { tipo: t ? (t.tipo === 'libre' ? 'libre' : 'versiculo') : 'versiculo' };
      const mazoElegido = t ? (t.mazo_id || '') : (mazoId || '');

      const partes = (t ? (t.referencia || '') : '').split(' ');
      const libroIni = t && t.tipo !== 'libre' ? (partes[0] || '') : '';
      const capIni = t && t.tipo !== 'libre' ? (partes[1] ? partes[1].split(':')[0] : '') : '';
      const vesIni = t && t.tipo !== 'libre' ? (partes[1] ? partes[1].split(':')[1] || '' : '') : '';
      const frenteIni = t && t.tipo === 'libre' ? (t.referencia || '') : '';
      const textoIni = t ? (t.texto || '') : '';
      const pistaIni = t ? (t.pista || '') : '';

      const optsMazo = [{ valor: '', texto: 'Sin mazo' }].concat(d.mazos.map(m => ({ valor: m.id, texto: m.nombre })));

      const render = () => {
        const esVersiculo = est.tipo === 'versiculo';
        const campos = esVersiculo ? `
          <label class="u-fs-sm u-fw-600">Libro</label>
          <select id="fLibro" style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto)">
            <option value="">Seleccionar libro...</option>
            ${d.libros.map(l => `<option value="${E(l.nombre)}" ${l.nombre === libroIni ? 'selected' : ''}>${E(l.nombre)}</option>`).join('')}
          </select>
          <div class="o-grid" style="grid-template-columns:1fr 1fr;gap:var(--espaciado-sm)">
            <div class="o-pila" style="gap:4px">
              <label class="u-fs-sm u-fw-600">Capítulo</label>
              <input type="number" id="fCap" min="1" value="${E(capIni)}" placeholder="Ej: 3" style="width:100%">
            </div>
            <div class="o-pila" style="gap:4px">
              <label class="u-fs-sm u-fw-600">Versículo</label>
              <input type="number" id="fVes" min="1" value="${E(vesIni)}" placeholder="Ej: 16" style="width:100%">
            </div>
          </div>
          <p class="u-fs-xs u-color-texto-terciario">Se guardará como "Juan 3:16"</p>
          <label class="u-fs-sm u-fw-600">Contenido del versículo *</label>
          <textarea id="fTexto" rows="4" placeholder="Escribe el texto completo del versículo..." style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto);font:inherit">${E(textoIni)}</textarea>
        ` : `
          <label class="u-fs-sm u-fw-600">Frente (pregunta) *</label>
          <input type="text" id="fFrente" value="${E(frenteIni)}" placeholder="Ej: ¿Cuál es el versículo de oro?" style="width:100%">
          <label class="u-fs-sm u-fw-600">Dorso (respuesta) *</label>
          <textarea id="fTexto" rows="4" placeholder="La respuesta a la pregunta..." style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto);font:inherit">${E(textoIni)}</textarea>
        `;

        raiz.innerHTML = `
          <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
            <button class="btn-secundario" id="btnVolver" style="align-self:flex-start">← ${mazoId ? 'Mazo' : 'Tarjetas'}</button>
            <h3>${t ? 'Editar tarjeta' : 'Nueva tarjeta'}</h3>

            <div class="mem-tipo-toggle" role="tablist">
              <button class="mem-tipo-btn ${esVersiculo ? 'mem-tipo-btn--activo' : ''}" data-tipo="versiculo" role="tab">${I('book-open')} Versículo</button>
              <button class="mem-tipo-btn ${!esVersiculo ? 'mem-tipo-btn--activo' : ''}" data-tipo="libre" role="tab">${I('edit-3')} Tarjeta libre</button>
            </div>

            <div class="o-pila" style="gap:var(--espaciado-sm)">${campos}
              <label class="u-fs-sm u-fw-600">Pista (opcional)</label>
              <input type="text" id="fPista" value="${E(pistaIni)}" placeholder="Una pista para ayudarte a recordar..." style="width:100%">
              <label class="u-fs-sm u-fw-600">Mazo</label>
              <select id="fMazo" style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto)">
                ${optsMazo.map(o => `<option value="${E(o.valor)}" ${String(o.valor) === String(mazoElegido) ? 'selected' : ''}>${E(o.texto)}</option>`).join('')}
              </select>
            </div>
            <button class="btn-primario" id="btnGuardar" style="width:100%;justify-content:center">${t ? 'Guardar cambios' : 'Guardar tarjeta'}</button>
          </div>`;

        window.Iconos.actualizar();
        this._bindFormTarjeta(raiz, t, est, mazoId, () => render());
      };

      render();
    },

    _bindFormTarjeta(raiz, t, est, mazoId, reRender) {
      const d = this._datos;

      $(raiz, '#btnVolver').onclick = () => this._verMazo(raiz, mazoId);

      $$(raiz, '.mem-tipo-btn').forEach(btn => {
        btn.onclick = () => {
          if (est.tipo === btn.dataset.tipo) return;
          est.tipo = btn.dataset.tipo;
          reRender();
        };
      });

      $(raiz, '#btnGuardar').onclick = async () => {
        const esVersiculo = est.tipo === 'versiculo';
        const mazoSel = $(raiz, '#fMazo').value || null;
        const pista = $(raiz, '#fPista').value.trim();

        let referencia, texto;
        if (esVersiculo) {
          const libro = $(raiz, '#fLibro').value;
          const cap = $(raiz, '#fCap').value.trim();
          const ves = $(raiz, '#fVes').value.trim();
          texto = $(raiz, '#fTexto').value.trim();
          if (!libro) { window.helpers.mostrarAlerta('Selecciona un libro.', 'advertencia'); return; }
          if (!cap) { window.helpers.mostrarAlerta('Escribe el capítulo.', 'advertencia'); return; }
          if (!texto) { window.helpers.mostrarAlerta('El contenido es obligatorio.', 'advertencia'); return; }
          referencia = ves ? `${libro} ${cap}:${ves}` : `${libro} ${cap}`;
        } else {
          referencia = $(raiz, '#fFrente').value.trim();
          texto = $(raiz, '#fTexto').value.trim();
          if (!referencia) { window.helpers.mostrarAlerta('Escribe la pregunta del frente.', 'advertencia'); return; }
          if (!texto) { window.helpers.mostrarAlerta('Escribe la respuesta del dorso.', 'advertencia'); return; }
        }

        try {
          if (t) {
            await window.memorizacionRepository.actualizarContenido(t.id, {
              referencia, texto, pista, mazo_id: mazoSel, tipo: est.tipo
            });
            window.helpers.mostrarAlerta('Tarjeta actualizada.', 'exito');
          } else {
            await window.memorizacionRepository.agregarTarjetaManual(d.usuario.id, {
              referencia, texto, pista, mazo_id: mazoSel, tipo: est.tipo
            });
            window.helpers.mostrarAlerta('Tarjeta guardada.', 'exito');
          }
          await this._recargar(raiz);
          this._verMazo(raiz, mazoSel || null);
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      };
    },

    /* ── Recargar datos desde Supabase ── */
    async _recargar(raiz) {
      const d = this._datos;
      const [mazos, tarjetas, pendientes, total, repasos] = await Promise.all([
        window.memorizacionRepository.listarMazos(d.usuario.id),
        window.memorizacionRepository.listarTarjetas(d.usuario.id),
        window.memorizacionRepository.tarjetasPendientes(d.usuario.id),
        window.memorizacionRepository.contarTarjetas(d.usuario.id),
        window.memorizacionRepository.totalRepasos(d.usuario.id),
      ]);
      d.mazos = mazos;
      d.tarjetas = tarjetas;
      d.pendientes = pendientes;
      d.total = total;
      d.repasos = repasos;
    },
  };
})();
