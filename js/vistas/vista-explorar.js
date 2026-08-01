(function() {
  'use strict';

  const I = (n) => { try { return window.Iconos.render(n); } catch(e) { return ''; } };

  const TABS = [
    { id: 'reyes', icono: 'crown', texto: 'Reyes' },
    { id: 'genealogia', icono: 'git-branch', texto: 'Genealogía' },
    { id: 'curiosidades', icono: 'lightbulb', texto: 'Curiosidades' },
    { id: 'personajes', icono: 'users', texto: 'Personajes' },
    { id: 'lugares', icono: 'map-pin', texto: 'Lugares' },
    { id: 'objetos', icono: 'gem', texto: 'Objetos' },
    { id: 'cronologia', icono: 'clock', texto: 'Cronología' },
    { id: 'milagros', icono: 'sparkles', texto: 'Milagros' },
    { id: 'parabolas', icono: 'book-open', texto: 'Parábolas' },
    { id: 'profecias', icono: 'target', texto: 'Profecías' }
  ];

  let _datos = {};
  let _pestana = 'reyes';
  let _busqueda = '';
  let _curiosidadesIndex = 0;
  let _curiosidadesTimer = null;

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function _cargarDatos() {
    const cache = window._explorarCache;
    if (cache) { _datos = cache; return; }
    const archivos = ['reyes', 'genealogia', 'curiosidades', 'personajes', 'lugares', 'objetos', 'cronologia', 'milagros', 'parabolas', 'profecias'];
    const resultados = await Promise.all(archivos.map(a => fetch(`data/${a}.json`).then(r => r.json()).catch(() => [])));
    _datos = {};
    archivos.forEach((a, i) => _datos[a] = resultados[i]);
    window._explorarCache = _datos;
  }

  // Búsqueda multi-campo (array de campos o todo el objeto)
  function _coincide(item, campos) {
    if (!_busqueda) return true;
    const q = _busqueda.toLowerCase();
    if (campos) {
      return campos.some(c => item[c] != null && String(item[c]).toLowerCase().includes(q));
    }
    return JSON.stringify(item).toLowerCase().includes(q);
  }

  function _filtrar(items, campos) {
    if (!_busqueda) return items;
    return items.filter(it => _coincide(it, campos));
  }

  function _vacio(msg) {
    return `<div class="explorar__vacio"><span class="explorar__vacio-icono">${I('search')}</span><p>${_esc(msg)}</p></div>`;
  }

  // Chips de referencias con delegación de eventos (sin onclick inline frágil)
  function _refChips(refs, icono, extraClase) {
    const lista = Array.isArray(refs) ? refs : (refs ? [refs] : []);
    return lista.slice(0, 4).map(r => `
      <button type="button" class="explorar__ref${extraClase ? ' ' + extraClase : ''}" data-ref="${_esc(r)}">${I(icono || 'book-open')} ${_esc(r)}</button>
    `).join('');
  }

  function _mostrarRef(ref) {
    const clean = String(ref || '').replace(/\s+/g, ' ').trim();
    if (clean) window.helpers.mostrarAlerta(`${I('book-open')} ${_esc(clean)}`, 'info', 4000);
  }

  // ===== Reyes =====

  function _reyEstrellas(cal) {
    const n = Math.max(1, Math.min(5, Number(cal) || 0));
    let s = `<span class="explorar__rey-estrellas" aria-label="Calificación ${n} de 5">`;
    for (let i = 1; i <= 5; i++) {
      s += `<span class="explorar__rey-estrella${i <= n ? ' explorar__rey-estrella--activa' : ''}">${I('star')}</span>`;
    }
    return s + '</span>';
  }

  function _reyBadge(etiqueta, cal) {
    const n = Number(cal) || 0;
    const tipo = n >= 4 ? 'fiel' : (n <= 2 ? 'infiel' : 'mixto');
    return `<span class="explorar__rey-badge explorar__rey-badge--${tipo}">${_esc(etiqueta || '')}</span>`;
  }

  function _renderReyes() {
    let grupos = _datos.reyes || [];
    if (_busqueda) {
      const q = _busqueda.toLowerCase();
      grupos = grupos
        .map(g => ({
          ...g,
          reyes: (g.reyes || []).filter(r => _coincide(r, ['nombre', 'reinado', 'etiqueta', 'detalle']) || String(g.periodo || '').toLowerCase().includes(q))
        }))
        .filter(g => (g.reyes || []).length > 0);
    }
    const total = grupos.reduce((n, g) => n + (g.reyes || []).length, 0);
    if (!total) return _vacio('No se encontraron reyes.');
    return grupos.map(grupo => `
      <div class="explorar__seccion">
        <h4 class="explorar__seccion-titulo">${I('flag')} ${_esc(grupo.periodo)}<span class="explorar__seccion-count">${(grupo.reyes || []).length}</span></h4>
        <div class="explorar__grid">
          ${(grupo.reyes || []).map(r => `
            <div class="explorar__card">
              <div class="explorar__card-header">
                <div class="explorar__card-icon">${I('crown')}</div>
                <div class="explorar__card-head-body">
                  <div class="explorar__card-titulo">${_esc(r.nombre)}</div>
                  <div class="explorar__card-sub">${_esc(r.reinado)}</div>
                </div>
                ${_reyBadge(r.etiqueta, r.calificacion)}
              </div>
              ${_reyEstrellas(r.calificacion)}
              <div class="explorar__card-detalle">${_esc(r.detalle)}</div>
              ${r.eventos && r.eventos.length ? `
                <div class="explorar__eventos">
                  ${r.eventos.slice(0, 3).map(e => `<span class="explorar__evento">${_esc(e)}</span>`).join('')}
                  ${r.eventos.length > 3 ? `<span class="explorar__tag">+${r.eventos.length - 3} más</span>` : ''}
                </div>` : ''}
              <div class="explorar__card-refs">${_refChips(r.refs)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // ===== Genealogía =====

  function _renderGenealogia() {
    const data = _filtrar(_datos.genealogia || [], ['nombre', 'detalle', 'ref']);
    if (!data.length) return _vacio('No se encontraron personas.');
    return `
      <p class="u-fs-xs u-color-texto-secundario u-mb-2">Desde Adán hasta Jesús — 60 generaciones según Mateo 1 y Lucas 3.</p>
      <div class="explorar__timeline">
        ${data.map(p => `
          <div class="explorar__timeline-item">
            <div class="explorar__timeline-dot${p.destacado ? ' explorar__timeline-dot--destacado' : ''}"></div>
            <div class="explorar__timeline-periodo">${p.nivel === 0 ? 'Origen' : 'Generación ' + p.nivel}</div>
            <div class="explorar__timeline-nombre${p.destacado ? ' explorar__timeline-nombre--destacado' : ''}">${p.destacado ? I('star') + ' ' : ''}${_esc(p.nombre)}</div>
            ${p.detalle ? `<div class="explorar__timeline-detalle">${_esc(p.detalle)}</div>` : ''}
            <div class="explorar__card-refs">${_refChips(p.ref)}</div>
          </div>
        `).join('')}
      </div>`;
  }

  // ===== Curiosidades =====

  function _curiosidadesDestacados(data) {
    const destacados = [];
    data.forEach(cat => (cat.items || []).forEach(item => {
      if (item.destacado) destacados.push({ ...item, categoria: cat });
    }));
    if (destacados.length) return destacados;
    return data.filter(cat => cat.items && cat.items.length).map(cat => ({ ...cat.items[0], categoria: cat }));
  }

  function _curiosidadesHeroHTML(data) {
    const destacados = _curiosidadesDestacados(data);
    if (!destacados.length) return '';
    const actual = destacados[_curiosidadesIndex % destacados.length];
    const cat = actual.categoria || {};
    const dots = destacados.length > 1 ? `
      <div class="curiosidades-hero__dots" aria-hidden="true">
        ${destacados.map((_, i) => `<span class="curiosidades-hero__dot${i === (_curiosidadesIndex % destacados.length) ? ' curiosidades-hero__dot--activo' : ''}"></span>`).join('')}
      </div>` : '';
    return `
      <div class="curiosidades-hero" id="curiosidadesHero" aria-live="polite">
        <div class="curiosidades-hero__emoji">${_esc(cat.emoji || '✨')}</div>
        <div class="curiosidades-hero__body">
          <span class="curiosidades-hero__badge">${I('sparkles')} ¿Sabías que…?</span>
          <h3 class="curiosidades-hero__titulo">${_esc(actual.titulo)}</h3>
          <p class="curiosidades-hero__texto">${_esc(actual.texto)}</p>
          ${actual.ref ? `<div class="explorar__card-refs">${_refChips(actual.ref)}</div>` : ''}
        </div>
        ${dots}
      </div>`;
  }

  function _renderCuriosidades() {
    const data = _datos.curiosidades || [];
    if (!data.length) return _vacio('No hay datos curiosos.');
    const chips = data.map((cat, i) => {
      const count = _filtrar(cat.items || [], ['titulo', 'texto', 'ref']).length;
      if (!count) return '';
      return `<button class="curiosidades-chip" data-target="curiosidad-cat-${i}"><span class="curiosidades-chip__emoji">${_esc(cat.emoji || '✨')}</span>${_esc(cat.categoria)}<span class="curiosidades-chip__count">${count}</span></button>`;
    }).join('');
    const secciones = data.map((cat, i) => {
      const items = _filtrar(cat.items || [], ['titulo', 'texto', 'ref']);
      if (!items.length) return '';
      return `
        <section class="explorar__seccion curiosidades-seccion" id="curiosidad-cat-${i}">
          <h4 class="explorar__seccion-titulo">
            <span class="curiosidades-seccion__emoji">${_esc(cat.emoji || '✨')}</span>
            ${_esc(cat.categoria)}
            <span class="curiosidades-seccion__count">${items.length}</span>
          </h4>
          <div class="explorar__grid">
            ${items.map(item => `
              <article class="explorar__card curiosidades-item" data-emoji="${_esc(cat.emoji || '✨')}">
                <div class="curiosidades-item__emoji">${_esc(cat.emoji || '✨')}</div>
                <h5 class="explorar__card-titulo">${_esc(item.titulo)}</h5>
                <p class="explorar__card-detalle">${_esc(item.texto)}</p>
                ${item.ref ? `<div class="explorar__card-refs">${_refChips(item.ref)}</div>` : ''}
              </article>
            `).join('')}
          </div>
        </section>`;
    }).join('');
    return `${_curiosidadesHeroHTML(data)}${chips ? `<div class="curiosidades-chips">${chips}</div>` : ''}${secciones}`;
  }

  // ===== Personajes =====

  function _renderPersonajes() {
    const data = _filtrar(_datos.personajes || [], ['nombre', 'epoca', 'detalle', 'nacimiento']);
    if (!data.length) return _vacio('No se encontraron personajes.');
    return `
      <div class="explorar__grid">
        ${data.map(p => {
          const datos = [];
          if (p.nacimiento) datos.push(`<span class="explorar__dato">${I('map-pin')} Nac.: ${_esc(p.nacimiento)}</span>`);
          if (p.muerte && !/desconocido/i.test(p.muerte)) datos.push(`<span class="explorar__dato">${I('flag')} Murió: ${_esc(p.muerte)}</span>`);
          if (p.padre && !/desconocido/i.test(p.padre)) datos.push(`<span class="explorar__dato">${I('users')} Hijo de ${_esc(p.padre)}</span>`);
          if (p.hijos && p.hijos.length) datos.push(`<span class="explorar__dato">${I('heart')} Hijos: ${_esc(p.hijos.slice(0, 3).join(', '))}${p.hijos.length > 3 ? '…' : ''}</span>`);
          return `
            <div class="explorar__card">
              <div class="explorar__card-header">
                <div class="explorar__card-icon explorar__card-icon--grande">${I('user')}</div>
                <div class="explorar__card-head-body">
                  <div class="explorar__card-titulo">${_esc(p.nombre)}</div>
                  <div class="explorar__card-sub">${_esc(p.epoca || '')}</div>
                </div>
              </div>
              ${datos.length ? `<div class="explorar__datos">${datos.join('')}</div>` : ''}
              <div class="explorar__card-detalle">${_esc(p.detalle)}</div>
              ${p.eventos && p.eventos.length ? `
                <div class="explorar__eventos">
                  ${p.eventos.slice(0, 3).map(e => `<span class="explorar__evento">${_esc(e)}</span>`).join('')}
                  ${p.eventos.length > 3 ? `<span class="explorar__tag">+${p.eventos.length - 3} más</span>` : ''}
                </div>` : ''}
              <div class="explorar__card-refs">${_refChips(p.libros)}</div>
            </div>`;
        }).join('')}
      </div>`;
  }

  // ===== Lugares =====

  function _renderLugares() {
    const data = _filtrar(_datos.lugares || [], ['nombre', 'region', 'detalle']);
    if (!data.length) return _vacio('No se encontraron lugares.');
    return `
      <div class="explorar__grid">
        ${data.map(l => `
          <div class="explorar__card">
            <div class="explorar__card-header">
              <div class="explorar__card-icon">${I('map-pin')}</div>
              <div class="explorar__card-head-body">
                <div class="explorar__card-titulo">${_esc(l.nombre)}</div>
                <div class="explorar__card-sub">${_esc(l.region || '')}</div>
              </div>
            </div>
            <div class="explorar__card-detalle">${_esc(l.detalle)}</div>
            ${l.eventos && l.eventos.length ? `
              <div class="explorar__eventos">
                ${l.eventos.slice(0, 3).map(e => `<span class="explorar__evento">${_esc(e)}</span>`).join('')}
                ${l.eventos.length > 3 ? `<span class="explorar__tag">+${l.eventos.length - 3} más</span>` : ''}
              </div>` : ''}
            ${l.personajes && l.personajes.length ? `
              <div class="explorar__datos">
                ${l.personajes.slice(0, 4).map(p => `<span class="explorar__dato">${I('user')} ${_esc(p)}</span>`).join('')}
              </div>` : ''}
            <div class="explorar__card-refs">${_refChips(l.refs)}</div>
          </div>
        `).join('')}
      </div>`;
  }

  // ===== Objetos =====

  function _renderObjetos() {
    const data = _filtrar(_datos.objetos || [], ['nombre', 'epoca', 'detalle']);
    if (!data.length) return _vacio('No se encontraron objetos.');
    return `
      <div class="explorar__grid">
        ${data.map(o => `
          <div class="explorar__card">
            <div class="explorar__card-header">
              <div class="explorar__card-icon">${I('gem')}</div>
              <div class="explorar__card-head-body">
                <div class="explorar__card-titulo">${_esc(o.nombre)}</div>
                <div class="explorar__card-sub">${_esc(o.epoca || '')}</div>
              </div>
            </div>
            ${o.descripcion ? `<p class="explorar__card-detalle">${_esc(o.descripcion)}</p>` : ''}
            ${o.detalle ? `<p class="explorar__card-detalle explorar__card-detalle--suave">${_esc(o.detalle)}</p>` : ''}
            ${o.personajes && o.personajes.length ? `
              <div class="explorar__datos">
                ${o.personajes.slice(0, 4).map(p => `<span class="explorar__dato">${I('user')} ${_esc(p)}</span>`).join('')}
              </div>` : ''}
            <div class="explorar__card-refs">${_refChips(o.refs)}</div>
          </div>
        `).join('')}
      </div>`;
  }

  // ===== Cronología =====

  function _renderCronologia() {
    const data = _filtrar(_datos.cronologia || [], ['evento', 'periodo', 'detalle']);
    if (!data.length) return _vacio('No se encontraron eventos.');
    return `
      <div class="explorar__timeline">
        ${data.map(e => `
          <div class="explorar__timeline-item">
            <div class="explorar__timeline-dot"></div>
            <div class="explorar__timeline-periodo">${_esc(e.periodo)}</div>
            <div class="explorar__timeline-nombre">${_esc(e.evento)}</div>
            <div class="explorar__timeline-detalle">${_esc(e.detalle)}</div>
            <div class="explorar__card-refs">${_refChips(e.refs)}</div>
          </div>
        `).join('')}
      </div>`;
  }

  // ===== Milagros =====

  function _renderMilagros() {
    const data = _datos.milagros || {};
    const sections = [];
    if (data.antiguo_testamento) {
      const items = _filtrar(data.antiguo_testamento, ['nombre', 'detalle']);
      if (items.length) sections.push({ titulo: 'Antiguo Testamento', items });
    }
    if (data.nuevo_testamento) {
      const items = _filtrar(data.nuevo_testamento, ['nombre', 'detalle']);
      if (items.length) sections.push({ titulo: 'Nuevo Testamento', items });
    }
    if (!sections.length) return _vacio('No se encontraron milagros.');
    return sections.map(s => `
      <div class="explorar__seccion">
        <h4 class="explorar__seccion-titulo">${I('sparkles')} ${_esc(s.titulo)}<span class="explorar__seccion-count">${s.items.length}</span></h4>
        <div class="explorar__grid">
          ${s.items.map(m => `
            <div class="explorar__card">
              <div class="explorar__card-header">
                <div class="explorar__card-icon">${I('sparkles')}</div>
                <div class="explorar__card-head-body">
                  <div class="explorar__card-titulo">${_esc(m.nombre)}</div>
                  ${m.personajes && m.personajes.length ? `<div class="explorar__card-sub">${_esc(m.personajes.join(', '))}</div>` : ''}
                </div>
              </div>
              <div class="explorar__card-detalle">${_esc(m.detalle)}</div>
              <div class="explorar__card-refs">${_refChips(m.ref)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // ===== Parábolas =====

  function _renderParabolas() {
    const data = _filtrar(_datos.parabolas || [], ['nombre', 'tema', 'detalle', 'leccion']);
    if (!data.length) return _vacio('No se encontraron parábolas.');
    return `
      <div class="explorar__grid">
        ${data.map(p => `
          <div class="explorar__card">
            <div class="explorar__card-header">
              <div class="explorar__card-icon">${I('book-open')}</div>
              <div class="explorar__card-head-body">
                <div class="explorar__card-titulo">${_esc(p.nombre)}</div>
                <div class="explorar__card-sub">${_esc(p.tema)}</div>
              </div>
            </div>
            <div class="explorar__card-detalle">${_esc(p.detalle)}</div>
            ${p.leccion ? `
              <div class="explorar__detail-card">
                <p class="u-fs-xs u-fw-600" style="color:var(--color-acento)">${I('info')} Lección:</p>
                <p class="u-fs-xs u-color-texto-secundario">${_esc(p.leccion)}</p>
              </div>` : ''}
            <div class="explorar__card-refs">${_refChips(p.ref)}</div>
          </div>
        `).join('')}
      </div>`;
  }

  // ===== Profecías =====

  function _renderProfecias() {
    const data = _datos.profecias || {};
    const sections = [];
    if (data.mesianicas) {
      const items = _filtrar(data.mesianicas, ['nombre', 'detalle']);
      if (items.length) sections.push({ titulo: 'Profecías mesiánicas', items });
    }
    if (data.cumplidas) {
      const items = _filtrar(data.cumplidas, ['nombre', 'detalle']);
      if (items.length) sections.push({ titulo: 'Cumplidas', items });
    }
    if (data.futuras) {
      const items = _filtrar(data.futuras, ['nombre', 'detalle']);
      if (items.length) sections.push({ titulo: 'Futuras', items });
    }
    if (!sections.length) return _vacio('No se encontraron profecías.');
    return sections.map(s => `
      <div class="explorar__seccion">
        <h4 class="explorar__seccion-titulo">${I('target')} ${_esc(s.titulo)}<span class="explorar__seccion-count">${s.items.length}</span></h4>
        <div class="explorar__grid">
          ${s.items.map(p => `
            <div class="explorar__card">
              <div class="explorar__card-header">
                <div class="explorar__card-icon">${I('target')}</div>
                <div class="explorar__card-head-body">
                  <div class="explorar__card-titulo">${_esc(p.nombre)}</div>
                </div>
              </div>
              <div class="explorar__card-detalle">${_esc(p.detalle)}</div>
              <div class="explorar__card-refs">
                ${_refChips(p.profecia, 'book-open')}
                ${p.cumplimiento && String(p.cumplimiento).toLowerCase() !== 'pendiente' ? _refChips(p.cumplimiento, 'check-circle', 'explorar__ref--cumplimiento') : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  const RENDERERS = {
    reyes: _renderReyes,
    genealogia: _renderGenealogia,
    curiosidades: _renderCuriosidades,
    personajes: _renderPersonajes,
    lugares: _renderLugares,
    objetos: _renderObjetos,
    cronologia: _renderCronologia,
    milagros: _renderMilagros,
    parabolas: _renderParabolas,
    profecias: _renderProfecias
  };

  function _skeletonHTML() {
    return `
      <div class="explorar__skeleton" aria-hidden="true">
        ${Array.from({ length: 4 }).map(() => '<div class="explorar__skeleton-card"></div>').join('')}
      </div>`;
  }

  function _renderContenido(raiz) {
    const cont = raiz.querySelector('#explorarContent');
    if (!cont) return;
    if (_curiosidadesTimer) { clearInterval(_curiosidadesTimer); _curiosidadesTimer = null; }
    const renderer = RENDERERS[_pestana];
    cont.innerHTML = renderer ? renderer() : '';
    window.Iconos.actualizar();

    if (_busqueda) {
      const n = cont.querySelectorAll('.explorar__card, .explorar__timeline-item').length;
      const bar = document.createElement('div');
      bar.className = 'explorar__resultados';
      bar.innerHTML = `${I('search')} <strong>${n}</strong> resultado${n === 1 ? '' : 's'} para «${_esc(_busqueda)}»`;
      cont.prepend(bar);
      window.Iconos.actualizar();
    }

    if (_pestana === 'curiosidades') {
      const data = _datos.curiosidades || [];
      if (!data.length) return;

      cont.querySelectorAll('.curiosidades-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const target = cont.querySelector('#' + chip.dataset.target);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });

      if (_curiosidadesDestacados(data).length > 1 && cont.querySelector('#curiosidadesHero')) {
        _curiosidadesTimer = setInterval(() => {
          if (!document.body.contains(cont)) {
            clearInterval(_curiosidadesTimer);
            _curiosidadesTimer = null;
            return;
          }
          _curiosidadesIndex += 1;
          const hero = cont.querySelector('#curiosidadesHero');
          if (hero) {
            hero.outerHTML = _curiosidadesHeroHTML(data);
            window.Iconos.actualizar();
          }
        }, 7000);
      }
    }
  }

  window.vistaExplorar = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      if (window._explorarCache) {
        await _cargarDatos();
        this._renderizar(raiz);
        return;
      }
      this._renderizar(raiz, true);
      await _cargarDatos();
      this._renderizar(raiz);
    },

    _renderizar(raiz, esSkeleton) {
      const pestanaActual = TABS.find(t => t.id === _pestana) || TABS[0];
      raiz.innerHTML = `
        <div class="o-contenedor explorar">
          <div class="explorar__titulo">
            <h2>${I('compass')} Explorar</h2>
          </div>
          <div class="explorar__search">
            <span class="explorar__search-icon">${I('search')}</span>
            <input type="search" id="explorarSearch" placeholder="Buscar en ${_esc(pestanaActual.texto)}..." value="${_esc(_busqueda)}" aria-label="Buscar en ${_esc(pestanaActual.texto)}">
          </div>
          <div class="explorar__tabs-wrapper" id="explorarTabsWrapper">
            <div class="explorar__tabs" id="explorarTabs" role="tablist" aria-label="Categorías de exploración">
              ${TABS.map(t => `
                <button class="explorar__tab${t.id === _pestana ? ' explorar__tab--activo' : ''}" data-tab="${t.id}" role="tab" aria-selected="${t.id === _pestana}">
                  ${I(t.icono)} ${_esc(t.texto)}
                </button>
              `).join('')}
            </div>
          </div>
          <div id="explorarContent" class="explorar__contenido">${esSkeleton ? _skeletonHTML() : ''}</div>
        </div>`;

      raiz.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (_pestana === btn.dataset.tab) return;
          _pestana = btn.dataset.tab;
          _busqueda = '';
          this._renderizar(raiz);
          const content = raiz.querySelector('#explorarContent');
          if (content && window.animaciones) window.animaciones.animar(content, 'anim-tab', 180);
        });
      });

      this._initTabsScroll(raiz);

      const searchInput = raiz.querySelector('#explorarSearch');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          _busqueda = e.target.value;
          _renderContenido(raiz);
        });
      }

      const content = raiz.querySelector('#explorarContent');
      if (content) {
        content.addEventListener('click', (e) => {
          const chip = e.target.closest('.explorar__ref[data-ref]');
          if (chip) _mostrarRef(chip.dataset.ref);
        });
      }

      if (!esSkeleton) _renderContenido(raiz);
      window.Iconos.actualizar();
    },

    _initTabsScroll(raiz) {
      const wrapper = raiz.querySelector('#explorarTabsWrapper');
      const tabs = raiz.querySelector('#explorarTabs');
      if (!wrapper || !tabs) return;

      const actualizarFlechas = () => {
        const l = tabs.scrollLeft;
        const max = tabs.scrollWidth - tabs.clientWidth;
        wrapper.classList.toggle('explorar__tabs-wrapper--fade-left', l > 4);
        wrapper.classList.toggle('explorar__tabs-wrapper--fade-right', l < max - 4);
      };

      tabs.addEventListener('scroll', actualizarFlechas, { passive: true });
      window.addEventListener('resize', actualizarFlechas);

      actualizarFlechas();

      const activo = tabs.querySelector('.explorar__tab--activo');
      if (activo) {
        setTimeout(() => {
          activo.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
          actualizarFlechas();
        }, 50);
      }
    }
  };
})();
