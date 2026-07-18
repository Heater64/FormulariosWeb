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
            <div class="tarjeta-capitulo mem-stat">
              <p class="u-fs-xs u-color-texto-terciario">Pendientes hoy</p>
              <p class="u-texto-2xl u-fw-700">${pendientes.length}</p>
            </div>
            <div class="tarjeta-capitulo mem-stat">
              <p class="u-fs-xs u-color-texto-terciario">Total versículos</p>
              <p class="u-texto-2xl u-fw-700">${total}</p>
            </div>
            <div class="tarjeta-capitulo mem-stat">
              <p class="u-fs-xs u-color-texto-terciario">Repasos realizados</p>
              <p class="u-texto-2xl u-fw-700">${repasos}</p>
            </div>
          </div>

          <div class="mem-tabs">
            <button class="mem-tab ${pestana === 'repasar' ? 'mem-tab--activo' : ''}" data-tab="repasar">${I('clock')} Repasar</button>
            <button class="mem-tab ${pestana === 'versiculos' ? 'mem-tab--activo' : ''}" data-tab="versiculos">${I('book-open')} Mis versículos</button>
            <button class="mem-tab ${pestana === 'nuevo' ? 'mem-tab--activo' : ''}" data-tab="nuevo">${I('plus')} Nuevo</button>
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
          this._historialRepaso = [];
          this._flashcard($(cont, '#slot'), d.tarjetas, 0, d);
        };
        return;
      }

      cont.innerHTML = '<div id="slot" class="o-pila" style="min-height:300px"></div>';
      this._historialRepaso = [];
      this._flashcard($(cont, '#slot'), d.pendientes, 0, d);
    },

    /* ── Flashcard (Repasar) ── */
    _flashcard(slot, pendientes, idx, d) {
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
        if (this._historialRepaso.length > 0) this._flashcard(slot, pendientes, this._historialRepaso.pop(), d);
      };

      /* Gestos */
      _initGestos(
        fcEl,
        () => volteado,
        () => { volteado = true; fcEl.classList.add('flashcard-container--volteado'); },
        async (q) => {
          this._historialRepaso.push(idx);
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
          this._historialRepaso.push(idx);
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

      const porLibro = agruparPorLibro(d.tarjetas);

      cont.innerHTML = Object.entries(porLibro).map(([libro, caps]) => {
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

      window.Iconos.actualizar();
      $$(cont, '.mem-libro-grupo').forEach((el) => {
        el.onclick = () => this._listaCapitulos(cont, el.dataset.libro, d);
      });
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
          return `
            <div class="tarjeta-capitulo mem-versiculo-item" data-id="${t.id}" style="cursor:pointer">
              <div class="o-flecha o-flecha--between">
                <span class="u-fw-600 u-fs-sm">${E(versoNum || t.referencia)}</span>
                <div class="o-flecha" style="gap:4px">
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

      cont.innerHTML = `
        <div class="o-pila o-pila--lg">
          <button class="btn-secundario" id="btnV" style="align-self:flex-start">← Volver</button>
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
