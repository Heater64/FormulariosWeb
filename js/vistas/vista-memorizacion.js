(function () {
  'use strict';

  /* ─── Persistencia de pestaña ─── */
  const LS_TAB = 'fb_mem_pestana';
  const getPestana = () => { try { return localStorage.getItem(LS_TAB) || 'repasar'; } catch { return 'repasar'; } };
  const setPestana = (v) => { try { localStorage.setItem(LS_TAB, v); } catch { /* */ } };

  /* ─── Helpers internos ─── */
  const E = (h) => window.helpers.escapeHtml(h);
  const I = (n) => window.Iconos.render(n);
  const $ = (c, s) => c.querySelector(s);
  const $$ = (c, s) => c.querySelectorAll(s);

  function agruparPorLibro(tarjetas) {
    const mapa = {};
    tarjetas.forEach((t) => {
      const partes = (t.referencia || '').split(' ');
      const libro = partes[0] || 'Sin libro';
      const cap = partes[1] ? partes[1].replace(':', '').split(':')[0] : '0';
      if (!mapa[libro]) mapa[libro] = {};
      if (!mapa[libro][cap]) mapa[libro][cap] = [];
      mapa[libro][cap].push(t);
    });
    return mapa;
  }

  /* ─── Template HTML de flashcard ─── */
  function _htmlFlashcard(t, opts) {
    const ref = E(t.referencia || 'Versículo');
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
      if (window.vistaMemorizacion._flashcard && d._historialRepaso && d._historialRepaso.length > 0) {
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
          if (window.vistaMemorizacion._flashcard) window.vistaMemorizacion._flashcard(slot, pendientes, idx + 1, d);
        });
      });
    });
  }


  /* ════════════════════════════════════════════════════════════
     VISTA PRINCIPAL
     ════════════════════════════════════════════════════════════ */
  window.vistaMemorizacion = {

    /* ── Montaje ──────────────────────────────────────────── */
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      raiz.innerHTML = window.skeleton ? window.skeleton.memorizacion() : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';

      try {
        const [tarjetas, pendientes, total, repasos, libros] = await Promise.all([
          window.memorizacionRepository.listarTarjetas(usuario.id),
          window.memorizacionRepository.tarjetasPendientes(usuario.id),
          window.memorizacionRepository.contarTarjetas(usuario.id),
          window.memorizacionRepository.totalRepasos(usuario.id),
          window.supabaseClient.from('libros_biblicos').select('id, nombre').order('id'),
        ]);
        this._pintar(raiz, {
          tarjetas,
          pendientes,
          total,
          repasos,
          libros: libros.data || [],
          usuario,
          pestana: getPestana(),
        });
      } catch {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p class="u-color-error">Error al cargar</p></div>';
      }

    },

    desmontar() {},

    /* ── Pintado principal (stats + pestañas + contenido) ── */
    _pintar(raiz, d) {
      const { pendientes, total, repasos, pestana } = d;

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <h2>${I('brain')} Memorización <button class="info-ayuda" data-guia="memorizacion" aria-label="Guía de Memorización">i</button></h2>

          <div class="mem-grid-tarjetas">
            <div class="tarjeta-capitulo mem-stat" title="Versículos programados para repaso hoy según el sistema de repetición espaciada">
              <p class="u-fs-xs u-color-texto-terciario">Pendientes hoy</p>
              <p class="u-texto-2xl u-fw-700">${pendientes.length}</p>
            </div>
            <div class="tarjeta-capitulo mem-stat" title="Total de versículos que has añadido a tu biblioteca de memorización">
              <p class="u-fs-xs u-color-texto-terciario">Total versículos</p>
              <p class="u-texto-2xl u-fw-700">${total}</p>
            </div>
            <div class="tarjeta-capitulo mem-stat" title="Número total de sesiones de repaso que has completado exitosamente">
              <p class="u-fs-xs u-color-texto-terciario">Repasos realizados</p>
              <p class="u-texto-2xl u-fw-700">${repasos}</p>
            </div>
          </div>

          <div class="mem-tabs" role="tablist">
            <button class="mem-tab ${pestana === 'repasar' ? 'mem-tab--activo' : ''}" data-tab="repasar" role="tab" aria-selected="${pestana === 'repasar'}" title="Práctica diaria basada en repetición espaciada">${I('clock')} Repasar</button>
            <button class="mem-tab ${pestana === 'versiculos' ? 'mem-tab--activo' : ''}" data-tab="versiculos" role="tab" aria-selected="${pestana === 'versiculos'}" title="Gestionar tu colección de versículos">${I('book-open')} Mis versículos</button>
            <button class="mem-tab ${pestana === 'nuevo' ? 'mem-tab--activo' : ''}" data-tab="nuevo" role="tab" aria-selected="${pestana === 'nuevo'}" title="Añadir nuevos versículos para memorizar">${I('plus')} Nuevo</button>
          </div>

          <div id="memContent" class="o-pila"></div>
        </div>`;

      $$(raiz, '[data-tab]').forEach((btn) => {
        btn.onclick = () => {
          const t = btn.dataset.tab;
          if (d.pestana === t) return;
          setPestana(t);
          d.pestana = t;
          this._pintar(raiz, d);
          const cont = $('#memContent');
          if (cont && window.animaciones) window.animaciones.animar(cont, 'anim-tab', 180);
        };
      });

      const cont = $(raiz, '#memContent');
      if (pestana === 'repasar') this._repasar(cont, d);
      else if (pestana === 'versiculos') this._listaLibros(cont, d);
      else if (pestana === 'nuevo') this._nuevo(cont, d, raiz);

      window.Iconos.actualizar();
      window.helpers.registrarGuias(raiz, {
        memorizacion: ['Memorización', 'Esta sección te ayuda a guardar versículos y repasarlos con repetición espaciada. Las tarjetas pendientes aparecen según tu historial de repaso.', 'Usa "Nuevo" para guardar un versículo, "Mis versículos" para organizarlos y "Repasar" para practicar.']
      });
    },


    /* ══════════════════════════════════════════════════════════
       PESTAÑA: REPASAR
       ══════════════════════════════════════════════════════════ */

    _repasar(cont, d) {
      if (d.pendientes.length === 0) {
        cont.innerHTML = `
          <div class="u-texto-centrado o-pila u-mt-4" style="align-items:center">
            <p style="font-size:3rem;color:var(--color-exito);display:flex;justify-content:center">${I('party-popper')}</p>
            <p class="u-color-texto-secundario">No tienes tarjetas pendientes.</p>
            <p class="u-fs-xs u-color-texto-terciario">¡Has terminado todos los repasos de hoy!</p>
            ${d.tarjetas.length > 0 ? `<button class="btn-primario" id="btnRepasarTodo" style="margin-top:var(--espaciado-sm)">${I('rotate-ccw')} Repasar todos de nuevo</button>` : ''}
          </div>`;
        const btnRT = $(cont, '#btnRepasarTodo');
        if (btnRT) btnRT.onclick = () => {
          cont.innerHTML = '<div id="slot" class="o-pila" style="min-height:300px"></div>';
          d._historialRepaso = [];
          this._flashcard($(cont, '#slot'), d.tarjetas, 0, d);
        };
        return;
      }

      cont.innerHTML = '<div id="slot" class="o-pila" style="min-height:300px"></div>';
      d._historialRepaso = [];
      this._flashcard($(cont, '#slot'), d.pendientes, 0, d);
    },

    /* ── Flashcard (Repasar) ── */
    _flashcard(slot, pendientes, idx, d) {
      if (d._modo === 'completar' && idx < pendientes.length) {
        _renderCompletar(slot, pendientes[idx], pendientes, idx, d);
        return;
      }
      if (idx >= pendientes.length) {
        slot.innerHTML = `
          <div class="u-texto-centrado o-pila" style="align-items:center;padding:var(--espaciado-xl) 0">
            <p style="font-size:3rem;color:var(--color-exito);display:flex;justify-content:center">${I('party-popper')}</p>
            <p class="u-texto-lg u-fw-600">¡Has terminado todos los repasos de hoy!</p>
            <button class="btn-primario" id="btnRepasarTodo" style="margin-top:var(--espaciado-sm)">${I('rotate-ccw')} Repasar todos de nuevo</button>
          </div>`;
        const btnRT = $(slot, '#btnRepasarTodo');
        if (btnRT) btnRT.onclick = () => {
          this._historialRepaso = [];
          this._flashcard(slot, pendientes, 0, d);
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
          ${_htmlFlashcard(t, { volteado: false })}
        </div>`;

      window.Iconos.actualizar();

      const fcEl = $(slot, '#fc');
      let volteado = false;

      /* Pista */
      const bp = $(slot, '#btnPista');
      if (bp) bp.onclick = () => { const b = $(slot, '#pistaBox'); if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none'; };

      /* Anterior */
      const ba = $(slot, '#btnAnt');
      if (ba) ba.onclick = () => {
        if (d._historialRepaso && d._historialRepaso.length > 0) this._flashcard(slot, pendientes, d._historialRepaso.pop(), d);
      };

      /* Completar mode toggle */
      $(slot, `#btnCom${idx}`)?.addEventListener('click', () => {
        d._modo = 'completar';
        this._flashcard(slot, pendientes, idx, d);
      });

      /* Gestos */
      _initGestos(
        fcEl,
        () => volteado,
        () => { volteado = true; fcEl.classList.add('flashcard-container--volteado'); },
        async (q) => {
          if (d._historialRepaso) d._historialRepaso.push(idx);
          try {
            const res = window.repeticionEspaciada.calcularProximoRepaso(t, q);
            await window.memorizacionRepository.actualizarTarjeta({ ...t, ...res });
            await window.memorizacionRepository.registrarRepaso(t.id, q);
          } catch { /* offline */ }
          if (window.haptica) { q === 0 ? window.haptica.fallo() : window.haptica.logro(); }
          if (q === 0) pendientes.push({ ...t });
          this._flashcard(slot, pendientes, idx + 1, d);
        }
      );

      /* Botones de calidad (fallback desktop) */
      $$(slot, '[data-q]').forEach((btn) => {
        btn.onclick = async () => {
          const q = parseInt(btn.dataset.q, 10);
          if (d._historialRepaso) d._historialRepaso.push(idx);
          try {
            const res = window.repeticionEspaciada.calcularProximoRepaso(t, q);
            await window.memorizacionRepository.actualizarTarjeta({ ...t, ...res });
            await window.memorizacionRepository.registrarRepaso(t.id, q);
          } catch { /* offline */ }
          if (window.haptica) { q === 0 ? window.haptica.fallo() : window.haptica.logro(); }
          if (q === 0) pendientes.push({ ...t });
          this._flashcard(slot, pendientes, idx + 1, d);
        };
      });
    },


    /* ══════════════════════════════════════════════════════════
       PESTAÑA: MIS VERSÍCULOS
       ══════════════════════════════════════════════════════════ */

    /* ── Lista de libros ── */
    _listaLibros(cont, d) {
      if (d.tarjetas.length === 0) {
        cont.innerHTML = '<p class="u-color-texto-secundario u-texto-centrado u-mt-3">Aún no has guardado versículos. Pulsa "Nuevo" para añadir uno.</p>';
        return;
      }

      const _renderLibros = (buscar) => {
        const filtro = (buscar || '').toLowerCase().trim();
        const filtradas = filtro ? d.tarjetas.filter(t => (t.referencia || '').toLowerCase().includes(filtro) || (t.texto || '').toLowerCase().includes(filtro)) : d.tarjetas;
        const porLibro = agruparPorLibro(filtradas);
        const librosHtml = Object.entries(porLibro).map(([libro, caps]) => {
          const totalV = Object.values(caps).reduce((s, a) => s + a.length, 0);
          const numC = Object.keys(caps).length;
          return `
            <div class="tarjeta-capitulo mem-libro-grupo" data-libro="${E(libro)}" style="cursor:pointer">
              <div class="o-pila" style="gap:2px">
                <span class="u-fw-600">${I('book-open')} ${E(libro)}</span>
                <span class="u-fs-xs u-color-texto-terciario">${totalV} versículo${totalV === 1 ? '' : 's'}</span>
                <span class="u-fs-xs u-color-texto-terciario">${numC} capítulo${numC === 1 ? '' : 's'}</span>
              </div>
            </div>`;
        }).join('');
        const lista = cont.querySelector('#memListaLibros');
        if (lista) {
          lista.innerHTML = librosHtml || '<p class="u-color-texto-secundario u-fs-sm u-mt-2">Sin resultados.</p>';
          lista.querySelectorAll('.mem-libro-grupo').forEach(el => {
            el.onclick = () => this._listaCapitulos(cont, el.dataset.libro, d);
          });
          window.Iconos?.actualizar();
        }
      };

      cont.innerHTML = `
        <div class="o-pila" style="gap:var(--espaciado-sm)">
          <div class="o-flecha" style="gap:var(--espaciado-xs);align-items:center;background:var(--color-fondo-alt);border:1px solid var(--color-borde);border-radius:var(--radio-md);padding:var(--espaciado-xxs) var(--espaciado-xs)">
            <span style="color:var(--color-texto-terciario);display:flex">${I('search')}</span>
            <input type="search" id="memBuscar" placeholder="Buscar por referencia o texto…" style="border:none;background:transparent;flex:1;outline:none;font-size:var(--texto-sm)">
          </div>
          <div id="memListaLibros"></div>
        </div>`;

      _renderLibros('');
      const inpBuscar = cont.querySelector('#memBuscar');
      if (inpBuscar) {
        let timer;
        inpBuscar.addEventListener('input', () => {
          clearTimeout(timer);
          timer = setTimeout(() => _renderLibros(inpBuscar.value), 200);
        });
      }
    },

    /* ── Lista de capítulos ── */
    _listaCapitulos(cont, libro, d) {
      const porLibro = agruparPorLibro(d.tarjetas);
      const caps = porLibro[libro] || {};
      const orden = Object.keys(caps).sort((a, b) => parseInt(a) - parseInt(b));

      cont.innerHTML = `
        <button class="btn-secundario" id="btnV" style="align-self:flex-start">← Volver</button>
        <h3>${I('book-open')} ${E(libro)}</h3>
        ${orden.map((c) => `
          <div class="tarjeta-capitulo mem-cap-grupo" data-cap="${c}" style="cursor:pointer">
            <div class="o-pila" style="gap:2px">
              <span class="u-fw-600">Capítulo ${c}</span>
              <span class="u-fs-xs u-color-texto-terciario">(${caps[c].length} versículo${caps[c].length === 1 ? '' : 's'})</span>
            </div>
          </div>`).join('')}`;

      $(cont, '#btnV').onclick = () => this._listaLibros(cont, d);
      $$(cont, '.mem-cap-grupo').forEach((el) => {
        el.onclick = () => this._listaVersiculos(cont, libro, parseInt(el.dataset.cap, 10), d);
      });
    },

    /* ── Lista de versículos ── */
    _listaVersiculos(cont, libro, capitulo, d) {
      const porLibro = agruparPorLibro(d.tarjetas);
      const versiculos = (porLibro[libro] || {})[String(capitulo)] || [];

      cont.innerHTML = `
        <button class="btn-secundario" id="btnV" style="align-self:flex-start">← Volver</button>
        <h3>${E(libro)} ${capitulo}</h3>
        ${versiculos.map((t) => {
          const versoNum = (t.referencia || '').split(' ')[1]?.split(':')[1] || '';
          const corto = (t.texto || '').substring(0, 80) + ((t.texto || '').length > 80 ? '...' : '');
          const nivel = window.repeticionEspaciada.calcularNivel(t.intervalo || 0);
          const estado = window.repeticionEspaciada.estadoAprendizaje(t.racha_actual || 0, t.intervalo || 0);
          const diasRest = t.proximo_repaso ? Math.ceil((new Date(t.proximo_repaso) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
          const etqEstado = { nuevo: 'Nuevo', repasando: 'Repasando', aprendido: 'Aprendido', consolidado: 'Consolidado' }[estado] || '';
          const colorEstado = { nuevo: 'var(--color-aviso)', repasando: 'var(--color-acento)', aprendido: 'var(--color-exito)', consolidado: 'var(--color-exito)' }[estado] || 'var(--color-texto-terciario)';
          return `
            <div class="tarjeta-capitulo mem-versiculo-item" data-id="${t.id}" style="cursor:pointer">
              <div class="o-flecha o-flecha--between">
                <div class="o-flecha" style="gap:var(--espaciado-xs);align-items:center;flex:1">
                  <span class="u-fw-600 u-fs-sm">${E(versoNum || t.referencia)}</span>
                  ${nivel > 0 ? `<span class="mem-nivel-badge" title="Nivel ${nivel}">${nivel}</span>` : ''}
                  ${etqEstado ? `<span class="mem-estado-badge" style="background:${colorEstado}20;color:${colorEstado};border-color:${colorEstado}40">${etqEstado}</span>` : ''}
                </div>
                <div class="o-flecha" style="gap:4px">
                  ${diasRest > 0 && diasRest <= 30 ? `<span class="u-fs-xs u-color-texto-terciario" title="Próximo repaso">${I('calendar')} ${diasRest}d</span>` : ''}
                  <button class="mem-btn-edit" data-id="${t.id}" title="Editar" style="background:none;border:none;cursor:pointer;color:var(--color-acento)">${I('edit-3')}</button>
                  <button class="mem-btn-del" data-id="${t.id}" title="Eliminar" style="background:none;border:none;cursor:pointer;color:var(--color-error)">${I('trash-2')}</button>
                </div>
              </div>
              <p class="u-fs-xs u-color-texto-secundario u-mt-1">${E(corto)}</p>
            </div>`;
        }).join('')}`;

      $(cont, '#btnV').onclick = () => this._listaCapitulos(cont, libro, d);

      $$(cont, '.mem-versiculo-item').forEach((el) => {
        el.onclick = (e) => {
          if (e.target.closest('.mem-btn-edit') || e.target.closest('.mem-btn-del')) return;
          this._practicar(cont, el.dataset.id, d, versiculos);
        };
      });

      $$(cont, '.mem-btn-edit').forEach((btn) => {
        btn.onclick = (e) => { e.stopPropagation(); this._editar(cont, btn.dataset.id, d); };
      });

      $$(cont, '.mem-btn-del').forEach((btn) => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const ok = await window.helpers.confirmar('¿Eliminar este versículo?', { titulo: 'Eliminar versículo', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          try {
            await window.memorizacionRepository.desactivarTarjeta(btn.dataset.id);
            window.helpers.mostrarAlerta('Versículo eliminado.', 'exito');
            d.tarjetas = d.tarjetas.filter((t) => t.id !== btn.dataset.id);
            this._listaVersiculos(cont, libro, capitulo, d);
          } catch {
            window.helpers.mostrarAlerta('Error al eliminar', 'error');
          }
        };
      });
    },

    /* ── Practicar ── */
    _practicar(cont, tarjetaId, d, versiculos) {
      const t = d.tarjetas.find((x) => x.id === tarjetaId);
      if (!t) return;

      const renderFlashcard = () => {
        cont.innerHTML = `
          <div class="o-pila o-pila--lg">
            <div class="o-flecha o-flecha--between" style="align-items:center">
              <button class="btn-secundario" id="btnV" style="align-self:flex-start">← Volver</button>
              <button class="btn-secundario" id="btnModoCompletar" style="font-size:var(--texto-xs);padding:4px 8px">${I('edit-3')} Completar huecos</button>
            </div>
            <div class="tarjeta-memorizacion">
              ${_htmlFlashcard(t, { volteado: false })}
            </div>
          </div>`;

        window.Iconos.actualizar();

        const fcEl = $(cont, '#fc');
        let volteado = false;

        $(cont, '#btnV').onclick = () => {
          const partes = (t.referencia || '').split(' ');
          const libro = partes[0] || '';
          const cap = parseInt(partes[1]?.replace(':', '').split(':')[0] || '0', 10);
          this._listaVersiculos(cont, libro, cap, d);
        };

        $(cont, '#btnModoCompletar')?.addEventListener('click', () => renderCompletar());

        const avanzar = async (q) => {
          try {
            const res = window.repeticionEspaciada.calcularProximoRepaso(t, q);
            await window.memorizacionRepository.actualizarTarjeta({ ...t, ...res });
            await window.memorizacionRepository.registrarRepaso(t.id, q);
          } catch { /* offline */ }

          if (window.haptica) { q === 0 ? window.haptica.fallo() : window.haptica.logro(); }
          window.helpers.mostrarAlerta('Repaso registrado.', 'exito');

          const curIdx = versiculos.findIndex((v) => v.id === tarjetaId);
          const nextIdx = curIdx + 1;

          if (nextIdx < versiculos.length) {
            this._practicar(cont, versiculos[nextIdx].id, d, versiculos);
          } else {
            const partes = (t.referencia || '').split(' ');
            const libro = partes[0] || '';
            const cap = parseInt(partes[1]?.replace(':', '').split(':')[0] || '0', 10);
            this._listaVersiculos(cont, libro, cap, d);
          }
        };

        _initGestos(
          fcEl,
          () => volteado,
          () => { volteado = true; fcEl.classList.add('flashcard-container--volteado'); },
          (q) => avanzar(q)
        );

        $$(cont, '[data-q]').forEach((btn) => {
          btn.onclick = () => avanzar(parseInt(btn.dataset.q, 10));
        });
      };

      const renderCompletar = () => {
        const tokens = _generarHuecos(t.texto || '');
        const respCorrectas = tokens.filter(x => x.hueco).map(x => x.palabra.replace(/^[\s.,;:!?¿¡()"'«»]+|[\s.,;:!?¿¡()"'«»]+$/g, ''));
        let respuestas = [];
        let mostrandoRespuesta = false;

        const dibujar = () => {
          cont.innerHTML = `
            <div class="o-pila o-pila--lg">
              <div class="o-flecha o-flecha--between" style="align-items:center">
                <button class="btn-secundario" id="btnV" style="align-self:flex-start">← Volver</button>
                <button class="btn-secundario" id="btnModoFlip" style="font-size:var(--texto-xs);padding:4px 8px">${I('copy')} Flashcard</button>
              </div>
              <div class="tarjeta-memorizacion">
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
                    <button class="btn-primario" id="btnRevisar" style="align-self:center;margin-top:var(--espaciado-sm);justify-content:center">Revisar respuestas</button>`}
                </div>
              </div>
            </div>`;
        };

        dibujar();
        window.Iconos.actualizar();

        $(cont, '#btnV').onclick = () => {
          const partes = (t.referencia || '').split(' ');
          const libro = partes[0] || '';
          const cap = parseInt(partes[1]?.replace(':', '').split(':')[0] || '0', 10);
          this._listaVersiculos(cont, libro, cap, d);
        };

        $(cont, '#btnModoFlip')?.addEventListener('click', () => renderFlashcard());

        const btnRev = $(cont, '#btnRevisar');
        if (btnRev) btnRev.onclick = () => {
          cont.querySelectorAll('.mem-completar-input').forEach(inp => {
            respuestas[parseInt(inp.dataset.hidx)] = inp.value;
          });
          mostrandoRespuesta = true;
          dibujar();
          window.Iconos.actualizar();

          $$(cont, '[data-q]').forEach(btn => {
            btn.onclick = async () => {
              const q = parseInt(btn.dataset.q, 10);
              try {
                const res = window.repeticionEspaciada.calcularProximoRepaso(t, q);
                await window.memorizacionRepository.actualizarTarjeta({ ...t, ...res });
                await window.memorizacionRepository.registrarRepaso(t.id, q);
              } catch { /* offline */ }
              if (window.haptica) { q === 0 ? window.haptica.fallo() : window.haptica.logro(); }
              window.helpers.mostrarAlerta('Repaso registrado.', 'exito');

              const curIdx = versiculos.findIndex((v) => v.id === tarjetaId);
              const nextIdx = curIdx + 1;
              if (nextIdx < versiculos.length) {
                this._practicar(cont, versiculos[nextIdx].id, d, versiculos);
              } else {
                const partes = (t.referencia || '').split(' ');
                const libro = partes[0] || '';
                const cap = parseInt(partes[1]?.replace(':', '').split(':')[0] || '0', 10);
                this._listaVersiculos(cont, libro, cap, d);
              }
            };
          });
        };
      };

      renderFlashcard();

      const avanzar = async (q) => {
        try {
          const res = window.repeticionEspaciada.calcularProximoRepaso(t, q);
          await window.memorizacionRepository.actualizarTarjeta({ ...t, ...res });
          await window.memorizacionRepository.registrarRepaso(t.id, q);
        } catch { /* offline */ }

        if (window.haptica) { q === 0 ? window.haptica.fallo() : window.haptica.logro(); }
        window.helpers.mostrarAlerta('Repaso registrado.', 'exito');

        const curIdx = versiculos.findIndex((v) => v.id === tarjetaId);
        const nextIdx = curIdx + 1;

        if (nextIdx < versiculos.length) {
          this._practicar(cont, versiculos[nextIdx].id, d, versiculos);
        } else {
          const partes = (t.referencia || '').split(' ');
          const libro = partes[0] || '';
          const cap = parseInt(partes[1]?.replace(':', '').split(':')[0] || '0', 10);
          this._listaVersiculos(cont, libro, cap, d);
        }
      };

      _initGestos(
        fcEl,
        () => volteado,
        () => { volteado = true; fcEl.classList.add('flashcard-container--volteado'); },
        (q) => avanzar(q)
      );

      $$(cont, '[data-q]').forEach((btn) => {
        btn.onclick = () => avanzar(parseInt(btn.dataset.q, 10));
      });
    },

    /* ── Editar ── */
    _editar(cont, tarjetaId, d) {
      const t = d.tarjetas.find((x) => x.id === tarjetaId);
      if (!t) return;

      const partes = (t.referencia || '').split(' ');
      const libro = partes[0] || '';
      const cap = partes[1] ? partes[1].split(':')[0] : '';
      const ves = partes[1] ? partes[1].split(':')[1] || '' : '';
      const opts = (d.libros || []).map((l) => l.nombre);

      cont.innerHTML = `
        <div class="o-pila o-pila--lg">
          <button class="btn-secundario" id="btnV" style="align-self:flex-start">← Volver</button>
          <h3>Editar versículo</h3>
          <div class="o-pila" style="gap:var(--espaciado-sm)">
            <label class="u-fs-sm u-fw-600">Libro</label>
            <select id="fLibro" style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto)">
              <option value="">Seleccionar libro...</option>
              ${opts.map((l) => `<option value="${E(l)}" ${l === libro ? 'selected' : ''}>${E(l)}</option>`).join('')}
            </select>
            <label class="u-fs-sm u-fw-600">Capítulo</label>
            <input type="number" id="fCap" min="1" value="${E(cap)}" style="width:100%">
            <label class="u-fs-sm u-fw-600">Versículo</label>
            <input type="number" id="fVes" min="1" value="${E(ves)}" style="width:100%">
            <label class="u-fs-sm u-fw-600">Contenido del versículo *</label>
            <textarea id="fTexto" rows="4" style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto);font:inherit">${E(t.texto || '')}</textarea>
            <label class="u-fs-sm u-fw-600">Pista (opcional)</label>
            <input type="text" id="fPista" value="${E(t.pista || '')}" placeholder="Una pista para ayudarte a recordar..." style="width:100%">
          </div>
          <button class="btn-primario" id="btnGuardar" style="width:100%;justify-content:center">Guardar cambios</button>
        </div>`;

      $(cont, '#btnV').onclick = () => this._listaVersiculos(cont, libro, parseInt(cap, 10), d);

      $(cont, '#btnGuardar').onclick = async () => {
        const nLibro = $(cont, '#fLibro').value.trim();
        const nCap = $(cont, '#fCap').value.trim();
        const nVes = $(cont, '#fVes').value.trim();
        const nTexto = $(cont, '#fTexto').value.trim();
        const nPista = $(cont, '#fPista').value.trim();

        if (!nLibro || !nCap || !nTexto) {
          window.helpers.mostrarAlerta('Libro, capítulo y contenido son obligatorios.', 'advertencia');
          return;
        }

        const nRef = nVes ? `${nLibro} ${nCap}:${nVes}` : `${nLibro} ${nCap}`;

        try {
          await window.memorizacionRepository.actualizarContenido(tarjetaId, { referencia: nRef, texto: nTexto, pista: nPista });
          t.referencia = nRef;
          t.texto = nTexto;
          t.pista = nPista;
          window.helpers.mostrarAlerta('Versículo actualizado.', 'exito');
        } catch {
          window.helpers.mostrarAlerta('Error al guardar.', 'error');
          return;
        }

        const caps = (d.tarjetas.filter((x) => (x.referencia || '').split(' ')[0] === nLibro) || [])
          .reduce((m, x) => {
            const c = (x.referencia || '').split(' ')[1]?.replace(':', '').split(':')[0] || '0';
            (m[c] = m[c] || []).push(x);
            return m;
          }, {});

        if (caps[nCap]) this._listaVersiculos(cont, nLibro, parseInt(nCap, 10), d);
        else this._listaCapitulos(cont, nLibro, d);
      };
    },


    /* ══════════════════════════════════════════════════════════
       PESTAÑA: NUEVO
       ══════════════════════════════════════════════════════════ */

    _nuevo(cont, d, raiz) {
      const opts = (d.libros || []).map((l) => l.nombre);

      cont.innerHTML = `
        <div class="o-pila o-pila--lg">
          <h3>Nuevo versículo</h3>
          <div class="o-pila" style="gap:var(--espaciado-sm)">
            <label class="u-fs-sm u-fw-600">Libro</label>
            <select id="fLibro" style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto)">
              <option value="">Seleccionar libro...</option>
              ${opts.map((l) => `<option value="${E(l)}">${E(l)}</option>`).join('')}
            </select>
            <label class="u-fs-sm u-fw-600">Capítulo</label>
            <input type="number" id="fCap" min="1" placeholder="Ej: 3" style="width:100%">
            <label class="u-fs-sm u-fw-600">Versículo</label>
            <input type="number" id="fVes" min="1" placeholder="Ej: 16" style="width:100%">
            <p class="u-fs-xs u-color-texto-terciario">Se guardará como "Juan 3:16"</p>
            <label class="u-fs-sm u-fw-600">Contenido del versículo *</label>
            <textarea id="fTexto" rows="4" placeholder="Escribe el texto completo del versículo..." style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto);font:inherit"></textarea>
            <label class="u-fs-sm u-fw-600">Pista (opcional)</label>
            <input type="text" id="fPista" placeholder="Una pista para ayudarte a recordar..." style="width:100%">
          </div>
          <button class="btn-primario" id="btnGuardar" style="width:100%;justify-content:center">Guardar</button>
        </div>`;

      $(cont, '#btnGuardar').onclick = async () => {
        const libro = $(cont, '#fLibro').value;
        const cap = $(cont, '#fCap').value.trim();
        const ves = $(cont, '#fVes').value.trim();
        const texto = $(cont, '#fTexto').value.trim();
        const pista = $(cont, '#fPista').value.trim();

        if (!libro) { window.helpers.mostrarAlerta('Selecciona un libro.', 'advertencia'); return; }
        if (!cap) { window.helpers.mostrarAlerta('Escribe el capítulo.', 'advertencia'); return; }
        if (!texto) { window.helpers.mostrarAlerta('El contenido del versículo es obligatorio.', 'advertencia'); return; }

        const ref = ves ? `${libro} ${cap}:${ves}` : `${libro} ${cap}`;

        try {
          await window.memorizacionRepository.agregarTarjetaManual(d.usuario.id, { referencia: ref, texto, pista });
          window.helpers.mostrarAlerta('Versículo guardado correctamente.', 'exito');
        } catch {
          window.helpers.mostrarAlerta('Error al guardar.', 'error');
          return;
        }

        d.tarjetas = await window.memorizacionRepository.listarTarjetas(d.usuario.id);
        d.total = await window.memorizacionRepository.contarTarjetas(d.usuario.id);
        d.pendientes = await window.memorizacionRepository.tarjetasPendientes(d.usuario.id);
        d.pestana = 'versiculos';
        setPestana('versiculos');
        this._pintar(raiz, d);
      };
    },
  };
})();
