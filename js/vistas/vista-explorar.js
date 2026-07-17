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
  let _detalle = null;

  async function _cargarDatos() {
    const cache = window._explorarCache;
    if (cache) { _datos = cache; return; }
    const archivos = ['reyes', 'genealogia', 'curiosidades', 'personajes', 'lugares', 'objetos', 'cronologia', 'milagros', 'parabolas', 'profecias'];
    const resultados = await Promise.all(archivos.map(a => fetch(`data/${a}.json`).then(r => r.json()).catch(() => [])));
    _datos = {};
    archivos.forEach((a, i) => _datos[a] = resultados[i]);
    window._explorarCache = _datos;
  }

  function _filtrar(items, campo) {
    if (!_busqueda) return items;
    const q = _busqueda.toLowerCase();
    return items.filter(item => {
      if (campo) return String(item[campo]).toLowerCase().includes(q);
      return JSON.stringify(item).toLowerCase().includes(q);
    });
  }

  function _refClick(ref) {
    const clean = ref.replace(/\s+/g, ' ').trim();
    window.helpers.mostrarAlerta(`${I('book-open')} ${clean}`, 'info', 4000);
  }

  function _renderReyes() {
    const data = _filtrar(_datos.reyes || [], 'periodo');
    if (!data.length) return '<div class="explorar__vacio"><span class="explorar__vacio-icono">' + I('search') + '</span><p>No se encontraron reyes.</p></div>';
    return data.map(grupo => `
      <div class="explorar__seccion">
        <h4 class="explorar__seccion-titulo">${I('flag')} ${grupo.periodo}</h4>
        <div class="explorar__grid">
          ${grupo.reyes.map(r => `
            <div class="explorar__card">
              <div class="explorar__card-header">
                <div class="explorar__card-icon">${I('crown')}</div>
                <div>
                  <div class="explorar__card-titulo">${r.nombre}</div>
                  <div class="explorar__card-sub">${r.reinado}</div>
                </div>
              </div>
              <div class="explorar__card-detalle">${r.detalle}</div>
              <div class="explorar__card-refs"><span class="explorar__ref" onclick="window._explorarRef('${r.ref}')">${I('book-open')} ${r.ref}</span></div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  function _renderGenealogia() {
    const data = _datos.genealogia || [];
    const filtrados = _filtrar(data, 'nombre');
    if (!filtrados.length) return '<div class="explorar__vacio"><span class="explorar__vacio-icono">' + I('search') + '</span><p>No se encontraron personas.</p></div>';
    return `
      <p class="u-fs-xs u-color-texto-secundario u-mb-2">Desde Adán hasta Jesús — 60 generaciones según Mateo 1 y Lucas 3.</p>
      <div class="explorar__timeline">
        ${filtrados.map(p => `
          <div class="explorar__timeline-item">
            <div class="explorar__timeline-dot${p.destacado ? ' explorar__timeline-dot--destacado' : ''}"></div>
            <div class="explorar__timeline-periodo">${p.nivel}.</div>
            <div class="explorar__timeline-nombre" style="${p.destacado ? 'color:var(--color-acento);font-size:var(--texto-md)' : ''}">${p.destacado ? I('star') + ' ' : ''}${p.nombre}</div>
            <div class="explorar__card-refs"><span class="explorar__ref" onclick="window._explorarRef('${p.ref}')">${p.ref}</span></div>
          </div>
        `).join('')}
      </div>`;
  }

  function _renderCuriosidades() {
    const data = _datos.curiosidades || [];
    if (!data.length) return '<div class="explorar__vacio"><span class="explorar__vacio-icono">' + I('search') + '</span><p>No hay datos curiosos.</p></div>';
    return data.map(cat => {
      const items = _filtrar(cat.items || [], 'titulo');
      if (!items.length) return '';
      return `
        <div class="explorar__seccion">
          <h4 class="explorar__seccion-titulo">${I('lightbulb')} ${cat.categoria}</h4>
          <div class="explorar__grid">
            ${items.map(item => `
              <div class="explorar__card">
                <div class="explorar__card-titulo">${item.titulo}</div>
                <div class="explorar__card-detalle">${item.texto}</div>
              </div>
            `).join('')}
          </div>
        </div>`;
    }).join('');
  }

  function _renderPersonajes() {
    const data = _filtrar(_datos.personajes || [], 'nombre');
    if (!data.length) return '<div class="explorar__vacio"><span class="explorar__vacio-icono">' + I('search') + '</span><p>No se encontraron personajes.</p></div>';
    return `
      <div class="explorar__grid">
        ${data.map(p => `
          <div class="explorar__card" data-personaje="${p.nombre}">
            <div class="explorar__card-header">
              <div class="explorar__card-icon explorar__card-icon--grande">${I('user')}</div>
              <div>
                <div class="explorar__card-titulo">${p.nombre}</div>
                <div class="explorar__card-sub">${p.epoca || ''}</div>
              </div>
            </div>
            <div class="explorar__card-detalle">${p.detalle}</div>
            <div class="explorar__eventos">
              ${(p.eventos || []).slice(0, 3).map(e => `<span class="explorar__evento">${e}</span>`).join('')}
              ${(p.eventos || []).length > 3 ? `<span class="explorar__tag">+${p.eventos.length - 3} más</span>` : ''}
            </div>
            <div class="explorar__card-refs">${(p.libros || []).slice(0, 2).map(r => `<span class="explorar__ref" onclick="window._explorarRef('${r}')">${r}</span>`).join('')}</div>
          </div>
        `).join('')}
      </div>`;
  }

  function _renderLugares() {
    const data = _filtrar(_datos.lugares || [], 'nombre');
    if (!data.length) return '<div class="explorar__vacio"><span class="explorar__vacio-icono">' + I('search') + '</span><p>No se encontraron lugares.</p></div>';
    return `
      <div class="explorar__grid">
        ${data.map(l => `
          <div class="explorar__card">
            <div class="explorar__card-header">
              <div class="explorar__card-icon">${I('map-pin')}</div>
              <div>
                <div class="explorar__card-titulo">${l.nombre}</div>
                <div class="explorar__card-sub">${l.region || ''}</div>
              </div>
            </div>
            <div class="explorar__card-detalle">${l.detalle}</div>
            <div class="explorar__eventos">
              ${(l.personajes || []).slice(0, 3).map(p => `<span class="explorar__evento">${p}</span>`).join('')}
            </div>
            <div class="explorar__card-refs">${(l.refs || []).slice(0, 2).map(r => `<span class="explorar__ref" onclick="window._explorarRef('${r}')">${r}</span>`).join('')}</div>
          </div>
        `).join('')}
      </div>`;
  }

  function _renderObjetos() {
    const data = _filtrar(_datos.objetos || [], 'nombre');
    if (!data.length) return '<div class="explorar__vacio"><span class="explorar__vacio-icono">' + I('search') + '</span><p>No se encontraron objetos.</p></div>';
    return `
      <div class="explorar__grid">
        ${data.map(o => `
          <div class="explorar__card">
            <div class="explorar__card-header">
              <div class="explorar__card-icon">${I('gem')}</div>
              <div>
                <div class="explorar__card-titulo">${o.nombre}</div>
                <div class="explorar__card-sub">${o.epoca || ''}</div>
              </div>
            </div>
            <div class="explorar__card-detalle">${o.detalle}</div>
            <div class="explorar__card-refs">${(o.refs || []).slice(0, 2).map(r => `<span class="explorar__ref" onclick="window._explorarRef('${r}')">${r}</span>`).join('')}</div>
          </div>
        `).join('')}
      </div>`;
  }

  function _renderCronologia() {
    const data = _filtrar(_datos.cronologia || [], 'evento');
    if (!data.length) return '<div class="explorar__vacio"><span class="explorar__vacio-icono">' + I('search') + '</span><p>No se encontraron eventos.</p></div>';
    return `
      <div class="explorar__timeline">
        ${data.map(e => `
          <div class="explorar__timeline-item">
            <div class="explorar__timeline-dot"></div>
            <div class="explorar__timeline-periodo">${e.periodo}</div>
            <div class="explorar__timeline-nombre">${e.evento}</div>
            <div class="explorar__timeline-detalle">${e.detalle}</div>
            <div class="explorar__card-refs">${(e.refs || []).map(r => `<span class="explorar__ref" onclick="window._explorarRef('${r}')">${r}</span>`).join('')}</div>
          </div>
        `).join('')}
      </div>`;
  }

  function _renderMilagros() {
    const data = _datos.milagros || {};
    const sections = [];
    if (data.antiguo_testamento) {
      const items = _filtrar(data.antiguo_testamento, 'nombre');
      if (items.length) sections.push({ titulo: 'Antiguo Testamento', items });
    }
    if (data.nuevo_testamento) {
      const items = _filtrar(data.nuevo_testamento, 'nombre');
      if (items.length) sections.push({ titulo: 'Nuevo Testamento', items });
    }
    if (!sections.length) return '<div class="explorar__vacio"><span class="explorar__vacio-icono">' + I('search') + '</span><p>No se encontraron milagros.</p></div>';
    return sections.map(s => `
      <div class="explorar__seccion">
        <h4 class="explorar__seccion-titulo">${I('sparkles')} ${s.titulo}</h4>
        <div class="explorar__grid">
          ${s.items.map(m => `
            <div class="explorar__card">
              <div class="explorar__card-header">
                <div class="explorar__card-icon">${I('sparkles')}</div>
                <div>
                  <div class="explorar__card-titulo">${m.nombre}</div>
                  <div class="explorar__card-sub">${(m.personajes || []).join(', ')}</div>
                </div>
              </div>
              <div class="explorar__card-detalle">${m.detalle}</div>
              <div class="explorar__card-refs"><span class="explorar__ref" onclick="window._explorarRef('${m.ref}')">${I('book-open')} ${m.ref}</span></div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  function _renderParabolas() {
    const data = _filtrar(_datos.parabolas || [], 'nombre');
    if (!data.length) return '<div class="explorar__vacio"><span class="explorar__vacio-icono">' + I('search') + '</span><p>No se encontraron parábolas.</p></div>';
    return `
      <div class="explorar__grid">
        ${data.map(p => `
          <div class="explorar__card">
            <div class="explorar__card-header">
              <div class="explorar__card-icon">${I('book-open')}</div>
              <div>
                <div class="explorar__card-titulo">${p.nombre}</div>
                <div class="explorar__card-sub">${p.tema}</div>
              </div>
            </div>
            <div class="explorar__card-detalle">${p.detalle}</div>
            <div class="explorar__detail-card" style="margin-top:var(--espaciado-xs);background:var(--color-acento-soft)">
              <p class="u-fs-xs u-fw-600" style="color:var(--color-acento)">${I('info')} Lección:</p>
              <p class="u-fs-xs u-color-texto-secundario">${p.leccion}</p>
            </div>
            <div class="explorar__card-refs"><span class="explorar__ref" onclick="window._explorarRef('${p.ref}')">${I('book-open')} ${p.ref}</span></div>
          </div>
        `).join('')}
      </div>`;
  }

  function _renderProfecias() {
    const data = _datos.profecias || {};
    const sections = [];
    if (data.mesianicas) {
      const items = _filtrar(data.mesianicas, 'nombre');
      if (items.length) sections.push({ titulo: 'Profecías mesiánicas', items });
    }
    if (data.cumplidas) {
      const items = _filtrar(data.cumplidas, 'nombre');
      if (items.length) sections.push({ titulo: 'Cumplidas', items });
    }
    if (data.futuras) {
      const items = _filtrar(data.futuras, 'nombre');
      if (items.length) sections.push({ titulo: 'Futuras', items });
    }
    if (!sections.length) return '<div class="explorar__vacio"><span class="explorar__vacio-icono">' + I('search') + '</span><p>No se encontraron profecías.</p></div>';
    return sections.map(s => `
      <div class="explorar__seccion">
        <h4 class="explorar__seccion-titulo">${I('target')} ${s.titulo}</h4>
        <div class="explorar__grid">
          ${s.items.map(p => `
            <div class="explorar__card">
              <div class="explorar__card-header">
                <div class="explorar__card-icon">${I('target')}</div>
                <div>
                  <div class="explorar__card-titulo">${p.nombre}</div>
                </div>
              </div>
              <div class="explorar__card-detalle">${p.detalle}</div>
              <div class="explorar__card-refs">
                <span class="explorar__ref" onclick="window._explorarRef('${p.profecia}')">${I('book-open')} ${p.profecia}</span>
                <span class="explorar__ref" onclick="window._explorarRef('${p.cumplimiento}')">${I('check-circle')} ${p.cumplimiento}</span>
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

  function _renderContenido(raiz) {
    const cont = raiz.querySelector('#explorarContent');
    if (!cont) return;
    const renderer = RENDERERS[_pestana];
    cont.innerHTML = renderer ? renderer() : '';
    window.Iconos.actualizar();
  }

  window._explorarRef = function(ref) {
    window.helpers.mostrarAlerta(`${I('book-open')} ${ref}`, 'info', 4000);
  };

  window.vistaExplorar = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      await _cargarDatos();
      this._renderizar(raiz);
    },

    _renderizar(raiz) {
      raiz.innerHTML = `
        <div class="o-contenedor explorar">
          <div class="explorar__titulo">
            <h2>${I('compass')} Explorar</h2>
          </div>
          <div class="explorar__search">
            <span class="explorar__search-icon">${I('search')}</span>
            <input type="text" id="explorarSearch" placeholder="Buscar en ${TABS.find(t => t.id === _pestana)?.texto || ''}..." value="${_busqueda}">
          </div>
          <div class="explorar__tabs-wrapper" id="explorarTabsWrapper">
            <div class="explorar__tabs" id="explorarTabs">
              ${TABS.map(t => `
                <button class="explorar__tab${t.id === _pestana ? ' explorar__tab--activo' : ''}" data-tab="${t.id}">
                  ${I(t.icono)} ${t.texto}
                </button>
              `).join('')}
            </div>
          </div>
          <div id="explorarContent" class="explorar__contenido"></div>
        </div>`;

      raiz.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (_pestana === btn.dataset.tab) return;
          _pestana = btn.dataset.tab;
          _busqueda = '';
          _detalle = null;
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
        searchInput.placeholder = `Buscar en ${TABS.find(t => t.id === _pestana)?.texto || ''}...`;
      }

      _renderContenido(raiz);
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
