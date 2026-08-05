(function() {
  'use strict';

  const I = (n) => { try { return window.Iconos.render(n); } catch(e) { return ''; } };

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const TABS = [
    { id: 'general', icono: 'compass', texto: 'General' },
    { id: 'reyes', icono: 'crown', texto: 'Reyes' },
    { id: 'personajes', icono: 'users', texto: 'Personajes' },
    { id: 'mas', icono: 'grid', texto: 'Más' }
  ];

  const CATS_MAS = [
    { id: 'genealogia', icono: 'git-branch', texto: 'Genealogía', desc: 'Desde Adán hasta Jesús' },
    { id: 'lugares', icono: 'map-pin', texto: 'Lugares', desc: 'Geografía bíblica' },
    { id: 'objetos', icono: 'gem', texto: 'Objetos', desc: 'Artefactos sagrados' },
    { id: 'cronologia', icono: 'clock', texto: 'Cronología', desc: 'Línea del tiempo' },
    { id: 'milagros', icono: 'sparkles', texto: 'Milagros', desc: 'Obras sobrenaturales' },
    { id: 'parabolas', icono: 'book-open', texto: 'Parábolas', desc: 'Enseñanzas de Jesús' },
    { id: 'profecias', icono: 'target', texto: 'Profecías', desc: 'Anuncios y cumplimientos' },
    { id: 'curiosidades', icono: 'lightbulb', texto: 'Curiosidades', desc: 'Datos sorprendentes' }
  ];

  let _datos = {};
  let _pestana = 'general';
  let _busqueda = '';

  async function _cargarDatos() {
    const cache = window._explorarCache;
    if (cache) { _datos = cache; return; }
    const archivos = ['reyes', 'genealogia', 'curiosidades', 'personajes', 'lugares', 'objetos', 'cronologia', 'milagros', 'parabolas', 'profecias'];
    const resultados = await Promise.all(archivos.map(a => fetch(`data/${a}.json`).then(r => r.json()).catch(() => [])));
    _datos = {};
    archivos.forEach((a, i) => _datos[a] = resultados[i]);
    window._explorarCache = _datos;
  }

  function _coincide(item, campos) {
    if (!_busqueda) return true;
    const q = _busqueda.toLowerCase();
    if (campos) return campos.some(c => item[c] != null && String(item[c]).toLowerCase().includes(q));
    return JSON.stringify(item).toLowerCase().includes(q);
  }

  function _filtrar(items, campos) {
    if (!_busqueda) return items;
    return items.filter(it => _coincide(it, campos));
  }

  function _vacio(msg) {
    return `<div class="explorar__vacio"><span class="explorar__vacio-icono">${I('search')}</span><p>${_esc(msg)}</p></div>`;
  }

  /* Chips de referencias */
  function _refChips(refs) {
    const lista = Array.isArray(refs) ? refs : (refs ? [refs] : []);
    return lista.length ? `<div class="explorar__refs"><span class="explorar__refs-label">${I('book-open')} Referencias</span><div class="explorar__refs-chips">${lista.map(r => `<span class="explorar__ref-chip">${_esc(r)}</span>`).join('')}</div></div>` : '';
  }

  /* ===== GENERAL ===== */
  function _renderGeneral() {
    return `
      <div class="explorar-general">
        <div class="explorar-general__hero">
          <span class="explorar-general__icono">${I('compass')}</span>
          <div>
            <h3 class="explorar-general__titulo">Explorar la Biblia</h3>
            <p class="explorar-general__desc">Un recurso de consulta para profundizar en el conocimiento de las Escrituras. Aquí encontrarás información detallada sobre reyes, personajes, lugares, objetos, cronología y mucho más.</p>
          </div>
        </div>
        <div class="explorar-general__fuente">
          <span class="explorar-general__fuente-icono">${I('book-open')}</span>
          <div>
            <h4 class="explorar-general__fuente-titulo">Fuente de información</h4>
            <p class="explorar-general__fuente-texto">Toda la información presentada en esta sección está basada en la <strong>Biblia Reina Valera 1960</strong> (RV60), complementada con estudios históricos, arqueológicos y teológicos de fuentes reconocidas.</p>
          </div>
        </div>
        <div class="explorar-general__tabs-info">
          <div class="explorar-general__tab-info">
            <span class="explorar-general__tab-icono">${I('crown')}</span>
            <div>
              <h4>Reyes</h4>
              <p>Perfiles detallados de los reyes de Israel y Judá con calificación, eventos clave y referencias bíblicas.</p>
            </div>
          </div>
          <div class="explorar-general__tab-info">
            <span class="explorar-general__tab-icono">${I('users')}</span>
            <div>
              <h4>Personajes</h4>
              <p>Personajes bíblicos diversos: profetas, jueces, apóstoles y más, con datos biográficos y referencias.</p>
            </div>
          </div>
          <div class="explorar-general__tab-info">
            <span class="explorar-general__tab-icono">${I('grid')}</span>
            <div>
              <h4>Más</h4>
              <p>Explora genealogía, lugares, objetos, cronología, milagros, parábolas, profecías y curiosidades.</p>
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ===== REYES (expandable cards) ===== */
  function _reyBadge(etiqueta, cal) {
    const n = Number(cal) || 0;
    const tipo = n >= 4 ? 'fiel' : (n <= 2 ? 'infiel' : 'mixto');
    return `<span class="explorar__rey-badge explorar__rey-badge--${tipo}">${_esc(etiqueta || '')}</span>`;
  }

  function _reyEstrellas(cal) {
    const n = Math.max(1, Math.min(5, Number(cal) || 0));
    let s = '';
    for (let i = 1; i <= 5; i++) {
      s += `<span class="explorar__rey-estrella${i <= n ? ' explorar__rey-estrella--activa' : ''}">${i <= n ? '★' : '☆'}</span>`;
    }
    return s;
  }

  function _renderReyes() {
    let grupos = _datos.reyes || [];
    const q = _busqueda.toLowerCase().trim();
    if (q) {
      grupos = grupos.map(g => ({
        ...g,
        reyes: (g.reyes || []).filter(r => _coincide(r, ['nombre', 'reinado', 'etiqueta', 'detalle']) || String(g.periodo || '').toLowerCase().includes(q))
      })).filter(g => (g.reyes || []).length > 0);
    }
    const total = grupos.reduce((n, g) => n + (g.reyes || []).length, 0);
    if (!total) return _vacio('No se encontraron reyes.');

    return grupos.map(grupo => `
      <div class="explorar__seccion">
        <h4 class="explorar__seccion-titulo">${I('flag')} ${_esc(grupo.periodo)}<span class="explorar__seccion-count">${(grupo.reyes || []).length}</span></h4>
        <div class="explorar__grid">
          ${(grupo.reyes || []).map(r => `
            <div class="explorar__card explorar__card--expandible" data-expandible role="button" tabindex="0" aria-expanded="false">
              <div class="explorar__card-header">
                <div class="explorar__card-icon">${I('crown')}</div>
                <div class="explorar__card-head-body">
                  <div class="explorar__card-titulo">${_esc(r.nombre)}</div>
                  <div class="explorar__card-sub">${_esc(r.reinado)}</div>
                </div>
                ${_reyBadge(r.etiqueta, r.calificacion)}
              </div>
              <div class="explorar__card-estrellas">${_reyEstrellas(r.calificacion)}</div>
              <p class="explorar__card-desc">${_esc(r.detalle)}</p>
              <div class="explorar__card-expand">
                ${r.eventos && r.eventos.length ? `
                  <div class="explorar__eventos">
                    <span class="explorar__eventos-label">${I('list')} Eventos clave</span>
                    ${r.eventos.map(e => `<span class="explorar__evento">${_esc(e)}</span>`).join('')}
                  </div>` : ''}
                ${r.personajes && r.personajes.length ? `
                  <div class="explorar__personajes-rel">
                    <span class="explorar__personajes-label">${I('users')} Personajes relacionados</span>
                    <span class="explorar__personajes-lista">${r.personajes.map(p => _esc(p)).join(', ')}</span>
                  </div>` : ''}
                ${_refChips(r.refs)}
              </div>
              <div class="explorar__card-toggle">
                <span class="explorar__card-toggle-text">Ver más</span>
                <span class="explorar__card-toggle-icon">${I('chevron-down')}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  /* ===== PERSONAJES (expandable cards, same pattern) ===== */
  function _renderPersonajes() {
    const data = _filtrar(_datos.personajes || [], ['nombre', 'epoca', 'detalle']);
    if (!data.length) return _vacio('No se encontraron personajes.');

    return `
      <div class="explorar__grid">
        ${data.map(p => `
          <div class="explorar__card explorar__card--expandible" data-expandible role="button" tabindex="0" aria-expanded="false">
            <div class="explorar__card-header">
              <div class="explorar__card-icon">${I('user')}</div>
              <div class="explorar__card-head-body">
                <div class="explorar__card-titulo">${_esc(p.nombre)}</div>
                <div class="explorar__card-sub">${_esc(p.epoca || '')}</div>
              </div>
            </div>
            <p class="explorar__card-desc">${_esc(p.detalle)}</p>
            <div class="explorar__card-expand">
              <div class="explorar__card-datos">
                ${p.nacimiento ? `<span class="explorar__card-dato">${I('map-pin')} <strong>Nacimiento:</strong> ${_esc(p.nacimiento)}</span>` : ''}
                ${p.muerte && !/desconocido/i.test(p.muerte) ? `<span class="explorar__card-dato">${I('flag')} <strong>Muerte:</strong> ${_esc(p.muerte)}</span>` : ''}
                ${p.padre && !/desconocido/i.test(p.padre) ? `<span class="explorar__card-dato">${I('users')} <strong>Padre:</strong> ${_esc(p.padre)}</span>` : ''}
                ${p.hijos && p.hijos.length ? `<span class="explorar__card-dato">${I('heart')} <strong>Hijos:</strong> ${_esc(p.hijos.slice(0, 3).join(', '))}${p.hijos.length > 3 ? '…' : ''}</span>` : ''}
              </div>
              ${p.eventos && p.eventos.length ? `
                <div class="explorar__eventos">
                  <span class="explorar__eventos-label">${I('list')} Eventos clave</span>
                  ${p.eventos.slice(0, 5).map(e => `<span class="explorar__evento">${_esc(e)}</span>`).join('')}
                  ${p.eventos.length > 5 ? `<span class="explorar__evento">+${p.eventos.length - 5} más</span>` : ''}
                </div>` : ''}
              ${_refChips(p.libros)}
            </div>
            <div class="explorar__card-toggle">
              <span class="explorar__card-toggle-text">Ver más</span>
              <span class="explorar__card-toggle-icon">${I('chevron-down')}</span>
            </div>
          </div>
        `).join('')}
      </div>`;
  }

  /* ===== MÁS (category grid) ===== */
  function _renderMas() {
    return `
      <p class="explorar-mas__intro">Selecciona un tema para explorar más contenido bíblico:</p>
      <div class="explorar__cat-grid">
        ${CATS_MAS.map(c => `
          <div class="explorar__cat-card" data-mas="${c.id}" role="button" tabindex="0">
            <div class="explorar__cat-icono">${I(c.icono)}</div>
            <div class="explorar__cat-nombre">${_esc(c.texto)}</div>
            <div class="explorar__cat-desc">${_esc(c.desc)}</div>
          </div>
        `).join('')}
      </div>`;
  }

  /* ===== Renderers for Más sub-tabs ===== */
  function _renderGenealogia() {
    const data = _filtrar(_datos.genealogia || [], ['nombre', 'detalle', 'ref']);
    if (!data.length) return _vacio('No se encontraron personas.');
    return `
      <button class="explorar__back-btn" data-volver="mas">${I('arrow-left')} Volver a Más</button>
      <p class="explorar-mas__intro">Desde Adán hasta Jesús — 60 generaciones según Mateo 1 y Lucas 3.</p>
      <div class="explorar__timeline">
        ${data.map(p => `
          <div class="explorar__timeline-item">
            <div class="explorar__timeline-dot${p.destacado ? ' explorar__timeline-dot--destacado' : ''}"></div>
            <div class="explorar__timeline-periodo">${p.nivel === 0 ? 'Origen' : 'Generación ' + p.nivel}</div>
            <div class="explorar__timeline-nombre${p.destacado ? ' explorar__timeline-nombre--destacado' : ''}">${p.destacado ? I('star') + ' ' : ''}${_esc(p.nombre)}</div>
            ${p.detalle ? `<div class="explorar__timeline-detalle">${_esc(p.detalle)}</div>` : ''}
            ${_refChips(p.ref)}
          </div>
        `).join('')}
      </div>`;
  }

  function _renderLugaresMas() {
    const data = _filtrar(_datos.lugares || [], ['nombre', 'region', 'detalle']);
    if (!data.length) return _vacio('No se encontraron lugares.');
    return `
      <button class="explorar__back-btn" data-volver="mas">${I('arrow-left')} Volver a Más</button>
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
            <p class="explorar__card-desc">${_esc(l.detalle)}</p>
            ${l.eventos && l.eventos.length ? `
              <div class="explorar__eventos">
                ${l.eventos.slice(0, 3).map(e => `<span class="explorar__evento">${_esc(e)}</span>`).join('')}
                ${l.eventos.length > 3 ? `<span class="explorar__tag">+${l.eventos.length - 3} más</span>` : ''}
              </div>` : ''}
            ${_refChips(l.refs)}
          </div>
        `).join('')}
      </div>`;
  }

  function _renderObjetosMas() {
    const data = _filtrar(_datos.objetos || [], ['nombre', 'epoca', 'detalle']);
    if (!data.length) return _vacio('No se encontraron objetos.');
    return `
      <button class="explorar__back-btn" data-volver="mas">${I('arrow-left')} Volver a Más</button>
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
            ${o.descripcion ? `<p class="explorar__card-desc">${_esc(o.descripcion)}</p>` : ''}
            ${_refChips(o.refs)}
          </div>
        `).join('')}
      </div>`;
  }

  function _renderCronologiaMas() {
    const data = _filtrar(_datos.cronologia || [], ['evento', 'periodo', 'detalle']);
    if (!data.length) return _vacio('No se encontraron eventos.');
    return `
      <button class="explorar__back-btn" data-volver="mas">${I('arrow-left')} Volver a Más</button>
      <div class="explorar__timeline">
        ${data.map(e => `
          <div class="explorar__timeline-item">
            <div class="explorar__timeline-dot"></div>
            <div class="explorar__timeline-periodo">${_esc(e.periodo)}</div>
            <div class="explorar__timeline-nombre">${_esc(e.evento)}</div>
            <div class="explorar__timeline-detalle">${_esc(e.detalle)}</div>
            ${_refChips(e.refs)}
          </div>
        `).join('')}
      </div>`;
  }

  function _renderMilagrosMas() {
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
    return `
      <button class="explorar__back-btn" data-volver="mas">${I('arrow-left')} Volver a Más</button>
      ${sections.map(s => `
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
                <p class="explorar__card-desc">${_esc(m.detalle)}</p>
                ${_refChips(m.ref)}
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}`;
  }

  function _renderParabolasMas() {
    const data = _filtrar(_datos.parabolas || [], ['nombre', 'tema', 'detalle', 'leccion']);
    if (!data.length) return _vacio('No se encontraron parábolas.');
    return `
      <button class="explorar__back-btn" data-volver="mas">${I('arrow-left')} Volver a Más</button>
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
            <p class="explorar__card-desc">${_esc(p.detalle)}</p>
            ${p.leccion ? `
              <div class="explorar__detail-card">
                <p class="explorar__detail-card-label">${I('info')} Lección:</p>
                <p class="explorar__detail-card-text">${_esc(p.leccion)}</p>
              </div>` : ''}
            ${_refChips(p.ref)}
          </div>
        `).join('')}
      </div>`;
  }

  function _renderProfeciasMas() {
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
    return `
      <button class="explorar__back-btn" data-volver="mas">${I('arrow-left')} Volver a Más</button>
      ${sections.map(s => `
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
                <p class="explorar__card-desc">${_esc(p.detalle)}</p>
                ${_refChips(p.profecia || p.cumplimiento)}
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}`;
  }

  function _renderCuriosidadesMas() {
    const data = _datos.curiosidades || [];
    if (!data.length) return _vacio('No hay datos curiosos.');
    return `
      <button class="explorar__back-btn" data-volver="mas">${I('arrow-left')} Volver a Más</button>
      ${data.map((cat, i) => {
        const items = _filtrar(cat.items || [], ['titulo', 'texto', 'ref']);
        if (!items.length) return '';
        return `
          <section class="explorar__seccion" id="curiosidad-mas-${i}">
            <h4 class="explorar__seccion-titulo">
              <span class="curiosidades-seccion__emoji">${_esc(cat.emoji || '✨')}</span>
              ${_esc(cat.categoria)}
              <span class="explorar__seccion-count">${items.length}</span>
            </h4>
            <div class="explorar__grid">
              ${items.map(item => `
                <div class="explorar__card">
                  <div class="explorar__card-header">
                    <span class="curiosidades-item__emoji">${_esc(cat.emoji || '✨')}</span>
                    <div class="explorar__card-head-body">
                      <div class="explorar__card-titulo">${_esc(item.titulo)}</div>
                    </div>
                  </div>
                  <p class="explorar__card-desc">${_esc(item.texto)}</p>
                  ${_refChips(item.ref)}
                </div>
              `).join('')}
            </div>
          </section>`;
      }).join('')}`;
  }

  const MAS_RENDERERS = {
    genealogia: _renderGenealogia,
    lugares: _renderLugaresMas,
    objetos: _renderObjetosMas,
    cronologia: _renderCronologiaMas,
    milagros: _renderMilagrosMas,
    parabolas: _renderParabolasMas,
    profecias: _renderProfeciasMas,
    curiosidades: _renderCuriosidadesMas
  };

  const RENDERERS = {
    general: _renderGeneral,
    reyes: _renderReyes,
    personajes: _renderPersonajes,
    mas: _renderMas
  };

  function _renderContenido(raiz) {
    const cont = raiz.querySelector('#explorarContent');
    if (!cont) return;
    const renderer = RENDERERS[_pestana] || MAS_RENDERERS[_pestana];
    cont.innerHTML = renderer ? renderer() : '';
    window.Iconos.actualizar();

    // Barra de resultados
    if (_busqueda && _pestana !== 'general' && _pestana !== 'mas') {
      const n = cont.querySelectorAll('.explorar__card, .explorar__timeline-item').length;
      if (n > 0) {
        const bar = document.createElement('div');
        bar.className = 'explorar__resultados';
        bar.innerHTML = `${I('search')} <strong>${n}</strong> resultado${n === 1 ? '' : 's'} para «${_esc(_busqueda)}»`;
        cont.prepend(bar);
        window.Iconos.actualizar();
      }
    }

    // Bind expandable cards
    cont.querySelectorAll('[data-expandible]').forEach(card => {
      const toggle = card.querySelector('.explorar__card-toggle');
      const clickHandler = () => {
        const expandido = card.getAttribute('aria-expanded') === 'true';
        card.setAttribute('aria-expanded', String(!expandido));
        const toggleText = toggle?.querySelector('.explorar__card-toggle-text');
        if (toggleText) toggleText.textContent = expandido ? 'Ver más' : 'Ver menos';
      };
      if (toggle) toggle.addEventListener('click', (e) => { e.stopPropagation(); clickHandler(); });
      card.addEventListener('click', clickHandler);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickHandler(); }
      });
    });

    // Bind "Más" category cards
    cont.querySelectorAll('[data-mas]').forEach(card => {
      const handler = () => {
        const id = card.dataset.mas;
        if (!id || !MAS_RENDERERS[id]) return;
        _pestana = id;
        _renderContenido(raiz);
        // Update tab bar
        const tabs = raiz.querySelectorAll('.explorar__tab');
        tabs.forEach(t => t.classList.remove('explorar__tab--activo'));
        const masTab = raiz.querySelector('[data-tab="mas"]');
        if (masTab) masTab.classList.add('explorar__tab--activo');
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
      });
    });

    // Bind volver buttons in Más sub-views
    cont.querySelectorAll('[data-volver="mas"]').forEach(btn => {
      btn.addEventListener('click', () => {
        _pestana = 'mas';
        _renderContenido(raiz);
      });
    });
  }

  function _skeletonHTML() {
    return `<div class="explorar__skeleton" aria-hidden="true">${Array.from({ length: 4 }).map(() => '<div class="explorar__skeleton-card"></div>').join('')}</div>`;
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
      const mostrarBusqueda = _pestana !== 'general';
      raiz.innerHTML = `
        <div class="o-contenedor explorar">
          <div class="explorar__titulo">
            <h2>${I('compass')} Explorar</h2>
          </div>
          ${mostrarBusqueda ? `
          <div class="explorar__search">
            <span class="explorar__search-icon">${I('search')}</span>
            <input type="search" id="explorarSearch" placeholder="Buscar en ${_esc(pestanaActual.texto)}..." value="${_esc(_busqueda)}" aria-label="Buscar en ${_esc(pestanaActual.texto)}">
          </div>` : ''}
          <div class="explorar__tabs-bar" id="explorarTabsBar" role="tablist" aria-label="Categorías">
            ${TABS.map(t => `
              <button class="explorar__tab${t.id === _pestana ? ' explorar__tab--activo' : ''}" data-tab="${t.id}" role="tab" aria-selected="${t.id === _pestana}">
                ${I(t.icono)} ${_esc(t.texto)}
              </button>
            `).join('')}
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

      const searchInput = raiz.querySelector('#explorarSearch');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          _busqueda = e.target.value;
          _renderContenido(raiz);
        });
      }

      if (!esSkeleton) _renderContenido(raiz);
      window.Iconos.actualizar();
    }
  };
})();
