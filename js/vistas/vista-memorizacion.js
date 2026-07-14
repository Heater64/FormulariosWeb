(function() {
  'use strict';
  const CAT_STORAGE_KEY = 'fb_categorias_mem';
  const TAB_STORAGE_KEY = 'fb_mem_pestana';
  const TARJETA_CAT_KEY = 'fb_tarjeta_categoria';

  function obtenerCategorias() {
    try { return JSON.parse(localStorage.getItem(CAT_STORAGE_KEY)) || []; } catch (e) { return []; }
  }
  function guardarCategorias(cats) { localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(cats)); }

  function obtenerCategoriaTarjeta() {
    try { return JSON.parse(localStorage.getItem(TARJETA_CAT_KEY)) || {}; } catch (e) { return {}; }
  }
  function guardarCategoriaTarjeta(map) { localStorage.setItem(TARJETA_CAT_KEY, JSON.stringify(map)); }
  function asignarCategoriaTarjeta(tarjetaId, catNombre) {
    const map = obtenerCategoriaTarjeta();
    if (catNombre) map[tarjetaId] = catNombre; else delete map[tarjetaId];
    guardarCategoriaTarjeta(map);
  }

  function obtenerPestana() {
    try { return localStorage.getItem(TAB_STORAGE_KEY) || 'pendientes'; } catch (e) { return 'pendientes'; }
  }
  function guardarPestana(val) { try { localStorage.setItem(TAB_STORAGE_KEY, val); } catch (e) {} }

  function refDeTarjeta(t) {
    const v = t.versiculos;
    const cap = v?.capitulos;
    return cap ? `${v.capitulos?.libros_biblicos?.nombre || ''} ${cap.numero}:${v.numero}` : (t.referencia || 'Versículo');
  }

  function textoDeTarjeta(t) {
    return t.versiculos?.texto || t.texto || '';
  }

  window.vistaMemorizacion = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      raiz.innerHTML = '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';
      try {
        const [tarjetas, pendientes, total, repasos, libros] = await Promise.all([
          window.memorizacionRepository.listarTarjetas(usuario.id),
          window.memorizacionRepository.tarjetasPendientes(usuario.id),
          window.memorizacionRepository.contarTarjetas(usuario.id),
          window.memorizacionRepository.totalRepasos(usuario.id),
          window.supabaseClient.from('libros_biblicos').select('id, nombre').order('id')
        ]);
        const categorias = obtenerCategorias();
        this._renderizar(raiz, { tarjetas, pendientes, total, repasos, categorias, libros: libros.data || [], usuario, pestaña: obtenerPestana() });
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    _renderizar(raiz, datos) {
      const { pendientes, total, repasos, tarjetas, categorias, libros, usuario, pestaña } = datos;
      const I = window.Iconos.render;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <h2>${I('brain')} Memorización <button class="info-ayuda" data-guia="memorizar" aria-label="Guía de Memorización">i</button></h2>
          <div class="mem-grid-tarjetas">
            <div class="tarjeta-capitulo mem-stat"><p class="u-fs-xs u-color-texto-terciario">Pendientes hoy <button class="info-ayuda" data-guia="mem-pendientes" aria-label="Info pendientes">i</button></p><p class="u-texto-2xl u-fw-700">${pendientes.length}</p></div>
            <div class="tarjeta-capitulo mem-stat"><p class="u-fs-xs u-color-texto-terciario">Total versículos <button class="info-ayuda" data-guia="mem-total" aria-label="Info total">i</button></p><p class="u-texto-2xl u-fw-700">${total}</p></div>
            <div class="tarjeta-capitulo mem-stat"><p class="u-fs-xs u-color-texto-terciario">Repasos <button class="info-ayuda" data-guia="mem-repasos" aria-label="Info repasos">i</button></p><p class="u-texto-2xl u-fw-700">${repasos}</p></div>
          </div>
          <div class="mem-tabs">
            <button class="mem-tab ${pestaña === 'pendientes' ? 'mem-tab--activo' : ''}" id="btnPestPendientes">${I('clock')} Repaso</button>
            <button class="mem-tab ${pestaña === 'versiculos' ? 'mem-tab--activo' : ''}" id="btnPestVersiculos">${I('bookmark')} Mis versículos</button>
            <button class="mem-tab ${pestaña === 'categorias' ? 'mem-tab--activo' : ''}" id="btnPestCategorias">${I('folder')} Categorías</button>
            <button class="mem-tab mem-tab--secundario" id="btnPestNuevo">${I('plus')} Nuevo</button>
          </div>
          <div id="memContent" class="o-pila"></div>
        </div>`;
      const btnPend = raiz.querySelector('#btnPestPendientes');
      const btnVers = raiz.querySelector('#btnPestVersiculos');
      const btnCat = raiz.querySelector('#btnPestCategorias');
      const btnNuevo = raiz.querySelector('#btnPestNuevo');
      btnPend.onclick = () => { guardarPestana('pendientes'); datos.pestaña = 'pendientes'; this._renderizar(raiz, datos); };
      btnVers.onclick = () => { guardarPestana('versiculos'); datos.pestaña = 'versiculos'; this._renderizar(raiz, datos); };
      btnCat.onclick = () => { guardarPestana('categorias'); datos.pestaña = 'categorias'; this._renderizar(raiz, datos); };
      btnNuevo.onclick = () => this._mostrarFormularioNuevo(raiz, datos);
      const cont = raiz.querySelector('#memContent');
      if (pestaña === 'pendientes') this._renderPendientes(cont, datos);
      else if (pestaña === 'versiculos') this._renderVersiculos(cont, datos);
      else if (pestaña === 'categorias') this._renderCategorias(cont, datos);
      window.Iconos.actualizar();
      const guiasMem = {
        'memorizar': ['Memorización', 'Sistema de repaso espaciado (SRS) para memorizar versículos bíblicos. Guarda versículos, repásalos cuando el sistema lo indique y califica qué tan bien los recuerdas. El programa ajusta automáticamente los intervalos de repaso.', 'Ej: En "Repaso" verás los versículos pendientes. Revela el texto, califica tu recuerdo (0/3/5) y el sistema programa el próximo repaso.'],
        'mem-pendientes': ['Pendientes hoy', 'Versículos que el sistema ha programado para repasar hoy. El repaso espaciado te muestra justo los que estás a punto de olvidar para maximizar la retención.', 'Cuantos más pendientes tengas, más ha estado funcionando el sistema de repaso. ¡Dedica unos minutos a repasarlos!'],
        'mem-total': ['Total versículos', 'Todos los versículos que has guardado para memorizar, incluyendo los que están al día y los pendientes de repaso.', 'Ej: 15 versículos guardados significa que tienes 15 pasajes bíblicos en tu banco de memoria.'],
        'mem-repasos': ['Repasos realizados', 'Número total de repasos que has completado desde que empezaste a usar el sistema. Cada vez que calificas un versículo cuenta como un repaso.', 'Cuantos más repasos acumules, mejor fijada tendrás la Palabra en tu memoria.']
      };
      raiz.querySelectorAll('[data-guia]').forEach(btn => {
        const g = guiasMem[btn.dataset.guia];
        if (g) btn.addEventListener('click', () => window.helpers.mostrarGuia(g[0], g[1], g[2]));
      });
    },
    _renderPendientes(cont, datos) {
      const { pendientes } = datos;
      if (pendientes.length === 0) {
        cont.innerHTML = `
          <div class="u-texto-centrado o-pila u-mt-4" style="align-items:center">
            <p style="font-size:3rem;color:var(--color-exito);display:flex;justify-content:center">${window.Iconos.render('party-popper')}</p>
            <p class="u-color-texto-secundario">¡No hay tarjetas pendientes hoy!</p>
            <p class="u-fs-xs u-color-texto-terciario">Agrega nuevos versículos para memorizar</p>
          </div>`;
        return;
      }
      cont.innerHTML = `<div id="tarjetaActual" class="o-pila" style="min-height:300px"></div>`;
      const tc = cont.querySelector('#tarjetaActual');
      let idxRepaso = 0;
      this._renderFlashcard(tc, pendientes, idxRepaso, datos);
    },
    _renderFlashcard(cont, pendientes, idx, datos) {
      if (idx >= pendientes.length) {
        cont.innerHTML = `
          <div class="u-texto-centrado o-pila" style="align-items:center;padding:var(--espaciado-xl) 0">
            <p style="font-size:3rem;color:var(--color-exito);display:flex;justify-content:center">${window.Iconos.render('party-popper')}</p>
            <p class="u-texto-lg u-fw-600">¡Completaste todas las tarjetas!</p>
            <p class="u-color-texto-secundario u-fs-sm">Vuelve mañana para más repasos</p>
            <button class="btn-primario" onclick="router.navegar('/estudio')">Seguir estudiando</button>
          </div>`;
        window.Iconos.actualizar();
        return;
      }
      const t = pendientes[idx];
      const referencia = refDeTarjeta(t);
      const texto = textoDeTarjeta(t);
      cont.innerHTML = `
        <div class="tarjeta-memorizacion" id="flashcard">
          <div class="tarjeta-memorizacion__progreso"><span>${window.Iconos.render('layers')} ${idx + 1} de ${pendientes.length}</span></div>
          <div class="flashcard-cara" id="cardFront">
            <p class="flashcard-etiqueta">Referencia</p>
            <p class="flashcard-referencia">${window.helpers.escapeHtml(referencia)}</p>
            <p class="flashcard-pista">¿Puedes recordar el texto?</p>
            <button class="btn-primario flashcard-btn" id="btnRevelar">Revelar texto</button>
          </div>
          <div class="flashcard-cara" id="cardBack" style="display:none">
            <p class="flashcard-referencia-chica">${window.helpers.escapeHtml(referencia)}</p>
            <p class="flashcard-texto">${window.helpers.escapeHtml(texto)}</p>
            <p class="flashcard-pregunta">¿Qué tan bien lo recordaste?</p>
            <div class="flashcard-calidades">
              <button class="btn-calidad btn-calidad--no" data-calidad="0"><span class="btn-calidad__num">0</span><span class="btn-calidad__label">No lo recordé</span></button>
              <button class="btn-calidad btn-calidad--dificil" data-calidad="3"><span class="btn-calidad__num">3</span><span class="btn-calidad__label">Con esfuerzo</span></button>
              <button class="btn-calidad btn-calidad--facil" data-calidad="5"><span class="btn-calidad__num">5</span><span class="btn-calidad__label">Fácil</span></button>
            </div>
          </div>
        </div>`;
      window.Iconos.actualizar();
      cont.querySelector('#btnRevelar').onclick = () => {
        const front = cont.querySelector('#cardFront');
        const back = cont.querySelector('#cardBack');
        if (front) front.style.display = 'none';
        if (back) back.style.display = 'flex';
      };
      cont.querySelectorAll('.btn-calidad').forEach(btn => {
        btn.onclick = async () => {
          const calidad = parseInt(btn.dataset.calidad);
          try {
            const resultado = window.repeticionEspaciada.calcularProximoRepaso(t, calidad);
            await window.memorizacionRepository.actualizarTarjeta({ ...t, ...resultado });
            await window.memorizacionRepository.registrarRepaso(t.id, calidad);
          } catch (e) { /* offline */ }
          this._renderFlashcard(cont, pendientes, idx + 1, datos);
        };
      });
    },
    _renderVersiculos(cont, datos) {
      const { tarjetas, categorias } = datos;
      const I = window.Iconos.render;
      if (tarjetas.length === 0) {
        cont.innerHTML = '<p class="u-color-texto-secundario u-texto-centrado u-mt-3">Aún no has guardado versículos. Estudia un capítulo y guarda versículos, o crea uno nuevo.</p>';
        return;
      }
      const catMap = obtenerCategoriaTarjeta();
      const agrupadas = {};
      const sinCat = [];
      tarjetas.forEach(t => {
        const ref = refDeTarjeta(t);
        const texto = textoDeTarjeta(t);
        const cat = catMap[t.id];
        if (cat && categorias.some(c => c.nombre === cat)) {
          if (!agrupadas[cat]) agrupadas[cat] = [];
          agrupadas[cat].push(t);
        } else {
          sinCat.push(t);
        }
      });
      cont.innerHTML = `
        <div class="o-pila">
          ${sinCat.length > 0 ? `
            <div class="o-pila u-mb-2">
              <h4 class="u-fw-600 mem-grupo-titulo">${I('inbox')} Sin categoría (${sinCat.length})</h4>
              ${sinCat.map(t => this._renderItemVersiculo(t, categorias)).join('')}
            </div>` : ''}
          ${Object.entries(agrupadas).map(([cat, items]) => `
            <div class="o-pila u-mb-2">
              <h4 class="u-fw-600 mem-grupo-titulo">${I('folder')} ${window.helpers.escapeHtml(cat)} (${items.length})</h4>
              ${items.map(t => this._renderItemVersiculo(t, categorias)).join('')}
            </div>
          `).join('')}
        </div>`;
      window.Iconos.actualizar();
      this._configurarAccionesVersiculos(cont, datos);
    },
    _renderItemVersiculo(t, categorias) {
      const ref = refDeTarjeta(t);
      const texto = textoDeTarjeta(t);
      const catMap = obtenerCategoriaTarjeta();
      const catActual = catMap[t.id] || '';
      const I = window.Iconos.render;
      const opcionesCat = [{ valor: '', texto: 'Sin categoría' }].concat(
        categorias.filter(c => c.nombre !== catActual).map(c => ({ valor: c.nombre, texto: c.nombre }))
      );
      return `
        <div class="tarjeta-capitulo mem-item" data-id="${t.id}">
          <div class="o-flecha o-flecha--between o-flecha--wrap" style="gap:var(--espaciado-xs)">
            <span class="u-fw-600 u-fs-sm">${window.helpers.escapeHtml(ref)}</span>
            <div class="o-flecha" style="gap:4px;flex-wrap:wrap">
              <button class="mem-btn-asignar-cat" data-id="${t.id}" title="Asignar categoría">${I('tag')}</button>
              <button class="mem-btn-eliminar" data-id="${t.id}" title="Eliminar versículo">${I('trash-2')}</button>
            </div>
          </div>
          <p class="u-fs-xs u-color-texto-secundario u-mt-1 mem-item-texto">${window.helpers.escapeHtml(texto.length > 100 ? texto.substr(0, 100) + '...' : texto)}</p>
          ${catActual ? `<p class="u-fs-xs u-color-acento u-mt-1">${I('folder')} ${window.helpers.escapeHtml(catActual)}</p>` : ''}
          ${opcionesCat.length > 1 ? `
            <div class="mem-asignar-cat" style="display:none;margin-top:var(--espaciado-sm)">
              <select class="mem-select-cat" data-id="${t.id}" style="width:100%;padding:var(--espaciado-xs);border:1px solid var(--color-borde);border-radius:var(--radio-md)">
                <option value="">— Sin categoría —</option>
                ${categorias.map(c => `<option value="${window.helpers.escapeHtml(c.nombre)}">${window.helpers.escapeHtml(c.nombre)}</option>`).join('')}
              </select>
            </div>` : ''}
        </div>`;
    },
    _configurarAccionesVersiculos(cont, datos) {
      cont.querySelectorAll('.mem-btn-eliminar').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.id;
          const ok = await window.helpers.confirmar('¿Desactivar este versículo? Dejará de aparecer en los repasos.', { titulo: 'Eliminar versículo', textoConfirmar: 'Sí, eliminar' });
          if (!ok) return;
          try {
            await window.memorizacionRepository.desactivarTarjeta(id);
            window.helpers.mostrarAlerta('Versículo eliminado.', 'exito');
            this.montar(cont.closest('#app-root') || document.getElementById('app-root'));
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });
      cont.querySelectorAll('.mem-btn-asignar-cat').forEach(btn => {
        btn.onclick = () => {
          const item = btn.closest('.mem-item');
          const selector = item.querySelector('.mem-asignar-cat');
          if (selector) {
            selector.style.display = selector.style.display === 'none' ? 'block' : 'none';
          } else {
            const cats = datos.categorias;
            if (cats.length === 0) {
              window.helpers.mostrarAlerta('Primero crea una categoría en la pestaña Categorías.', 'advertencia');
              return;
            }
            const id = btn.dataset.id;
            const selectHtml = document.createElement('div');
            selectHtml.className = 'mem-asignar-cat';
            selectHtml.style.marginTop = 'var(--espaciado-sm)';
            selectHtml.innerHTML = `<select class="mem-select-cat" data-id="${id}" style="width:100%;padding:var(--espaciado-xs);border:1px solid var(--color-borde);border-radius:var(--radio-md)"><option value="">— Sin categoría —</option>${cats.map(c => `<option value="${window.helpers.escapeHtml(c.nombre)}">${window.helpers.escapeHtml(c.nombre)}</option>`).join('')}</select>`;
            item.querySelector('.mem-asignar-cat')?.remove();
            item.appendChild(selectHtml);
            selectHtml.querySelector('select').onchange = () => {
              asignarCategoriaTarjeta(id, selectHtml.querySelector('select').value);
              datos.tarjetas = datos.tarjetas; this._renderVersiculos(cont, datos);
            };
          }
          if (selector) {
            selector.querySelector('select').onchange = () => {
              asignarCategoriaTarjeta(btn.dataset.id, selector.querySelector('select').value);
              this._renderVersiculos(cont, datos);
            };
          }
        };
      });
    },
    _renderCategorias(cont, datos) {
      const { categorias } = datos;
      const I = window.Iconos.render;
      cont.innerHTML = `
        <div class="o-pila">
          <div class="o-flecha o-flecha--between">
            <h3>${I('folder')} Mis categorías</h3>
            <button class="btn-primario" id="btnNuevaCat" style="font-size:var(--texto-xs)">+ Nueva</button>
          </div>
          ${categorias.length === 0 ? '<p class="u-color-texto-secundario u-fs-sm">Crea categorías para organizar tus versículos (ej: "Versículos que me gustan", "Salvación", "Promesas"...)</p>' : ''}
          <div id="listaCategorias" class="o-pila">
            ${categorias.map((c, i) => `
              <div class="tarjeta-capitulo mem-cat-item">
                <div class="o-flecha o-flecha--between">
                  <span class="u-fw-600">${I('folder')} ${window.helpers.escapeHtml(c.nombre)}</span>
                  <div class="o-flecha" style="gap:4px">
                    <button class="btn-icono" data-accion="editar-cat" data-idx="${i}" title="Editar">${I('edit-3')}</button>
                    <button class="btn-icono btn-icono--peligro" data-accion="eliminar-cat" data-idx="${i}" title="Eliminar">${I('trash-2')}</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
      window.Iconos.actualizar();
      cont.querySelector('#btnNuevaCat').onclick = async () => {
        const nombre = await window.helpers.formulario({
          titulo: 'Nueva categoría',
          campos: [{ nombre: 'nombre', etiqueta: 'Nombre de la categoría', valor: '', requerido: true, placeholder: 'Ej: Versículos de salvación' }],
          textoConfirmar: 'Crear'
        });
        if (!nombre) return;
        const cats = obtenerCategorias();
        cats.push({ nombre: nombre.nombre.trim() });
        guardarCategorias(cats);
        datos.categorias = cats;
        this._renderizar(cont.closest('#app-root') || document.getElementById('app-root'), datos);
      };
      cont.querySelectorAll('[data-accion="editar-cat"]').forEach(btn => {
        btn.onclick = async () => {
          const idx = parseInt(btn.dataset.idx);
          const cats = obtenerCategorias();
          const nombre = await window.helpers.formulario({
            titulo: 'Editar categoría',
            campos: [{ nombre: 'nombre', etiqueta: 'Nombre', valor: cats[idx].nombre, requerido: true }],
            textoConfirmar: 'Guardar'
          });
          if (!nombre) return;
          const viejoNombre = cats[idx].nombre;
          cats[idx].nombre = nombre.nombre.trim();
          guardarCategorias(cats);
          const catMap = obtenerCategoriaTarjeta();
          Object.keys(catMap).forEach(k => { if (catMap[k] === viejoNombre) catMap[k] = cats[idx].nombre; });
          guardarCategoriaTarjeta(catMap);
          datos.categorias = cats;
          this._renderizar(cont.closest('#app-root') || document.getElementById('app-root'), datos);
        };
      });
      cont.querySelectorAll('[data-accion="eliminar-cat"]').forEach(btn => {
        btn.onclick = async () => {
          const idx = parseInt(btn.dataset.idx);
          const ok = await window.helpers.confirmar('¿Eliminar esta categoría?', { titulo: 'Eliminar categoría', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          const cats = obtenerCategorias();
          const nombreEliminado = cats[idx].nombre;
          cats.splice(idx, 1);
          guardarCategorias(cats);
          const catMap = obtenerCategoriaTarjeta();
          Object.keys(catMap).forEach(k => { if (catMap[k] === nombreEliminado) delete catMap[k]; });
          guardarCategoriaTarjeta(catMap);
          datos.categorias = cats;
          this._renderizar(cont.closest('#app-root') || document.getElementById('app-root'), datos);
        };
      });
    },
    _mostrarFormularioNuevo(cont, datos) {
      const { categorias, libros, usuario } = datos;
      const opcionesCat = [{ valor: '', texto: 'Sin categoría' }].concat(categorias.map(c => ({ valor: c.nombre, texto: c.nombre })));
      const opcionesLibros = (libros || []).map(l => ({ valor: l.nombre, texto: l.nombre }));
      window.helpers.formulario({
        titulo: 'Nuevo versículo',
        mensaje: 'Añade un versículo para memorizar. Puedes organizarlo por categorías.',
        campos: [
          { nombre: 'libro', etiqueta: 'Libro', tipo: 'select', valor: '', opciones: opcionesLibros },
          { nombre: 'capitulo', etiqueta: 'Capítulo', valor: '', placeholder: 'Ej: 1' },
          { nombre: 'versiculo', etiqueta: 'Versículo', valor: '', placeholder: 'Ej: 16' },
          { nombre: 'categoria', etiqueta: 'Categoría', tipo: 'select', valor: '', opciones: opcionesCat },
          { nombre: 'contenido', etiqueta: 'Texto del versículo', tipo: 'textarea', valor: '', requerido: true, placeholder: 'Escribe el texto completo...' },
          { nombre: 'descripcion', etiqueta: 'Descripción (opcional)', valor: '', placeholder: '¿Por qué es importante para ti?' }
        ],
        textoConfirmar: 'Guardar'
      }).then(async (valores) => {
        if (!valores) return;
        if (!valores.contenido.trim()) { window.helpers.mostrarAlerta('El texto del versículo es obligatorio.', 'advertencia'); return; }
        const refPartes = [valores.libro, valores.capitulo].filter(Boolean).join(' ');
        const referencia = valores.versiculo ? refPartes + ':' + valores.versiculo : refPartes;
        const textoFinal = valores.contenido.trim() + (valores.descripcion ? '\n\n📝 ' + valores.descripcion.trim() : '');
        try {
          const resultado = await window.memorizacionRepository.agregarTarjetaManual(usuario.id, {
            referencia: referencia || 'Versículo personal',
            texto: textoFinal
          });
          if (resultado && resultado.id && valores.categoria) {
            asignarCategoriaTarjeta(resultado.id, valores.categoria);
          }
          window.helpers.mostrarAlerta('Versículo guardado correctamente.', 'exito');
        } catch (e) {
          window.helpers.mostrarAlerta('Error al guardar: ' + e.message, 'error');
        }
        this.montar(cont.closest('#app-root') || document.getElementById('app-root'));
      });
    }
  };
})();
