/* ============================================================================
 * js/vistas/vista-examenes.js — Mis exámenes (panel del administrador)
 * ----------------------------------------------------------------------------
 * Lista los exámenes del administrador (borradores, publicados y cerrados),
 * permite publicar/cerrar, duplicar, eliminar y —sobre todo— generar los
 * ENLACES INDIVIDUALES de un solo uso que se comparten con cada alumno.
 *
 * Los enlaces viven en `examen_enlaces` (migración 056) y se generan en el
 * servidor: aquí solo se envían nombres y se pinta lo que devuelve la RPC.
 * ==========================================================================*/
(function () {
  'use strict';

  const ROLES = ['admin', 'editor', 'owner'];
  const ESTADOS = {
    borrador: { texto: 'Borrador', clase: 'adm-badge--borrador' },
    publicado: { texto: 'Publicado', clase: 'adm-badge--publicado' },
    cerrado: { texto: 'Cerrado', clase: 'adm-badge--cerrado' }
  };

  const esc = (v) => window.panelUI.esc(v);
  const I = (n) => window.Iconos ? window.Iconos.render(n) : '';

  window.vistaExamenes = {
    _examenes: [],
    _papelera: [],
    _copias: [],
    _borradoresLocales: [],
    _filtro: 'todos',
    _busqueda: '',
    _timer: null,

    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario || !ROLES.includes((usuario.rol || '').toLowerCase())) {
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta sección es solo para el administrador.</div></div>`;
        return;
      }

      raiz.innerHTML = `<div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
        <header class="adm-cabecera">
          <span class="adm-cabecera__icono" aria-hidden="true">${window.Iconos.render('clipboard-list')}</span>
          <div class="adm-cabecera__principal">
            <h1 class="adm-cabecera__titulo">Mis exámenes</h1>
            <p class="adm-cabecera__sub">Crea un examen, genérale un enlace a cada alumno y corrige las respuestas escritas.</p>
          </div>
          <div class="adm-cabecera__acciones">
            <button class="adm-btn adm-btn--principal" id="btnNuevo">${window.Iconos.render('plus')} Nuevo examen</button>
          </div>
        </header>
        <div id="contenido"></div>
      </div>`;

      raiz.querySelector('#btnNuevo').addEventListener('click', () => router.navegar('/editor/nuevo'));
      const contenido = raiz.querySelector('#contenido');
      contenido.innerHTML = `<p class="adm-cabecera__sub">Cargando…</p>`;

      try {
        const datos = await window.plataformaRepository.resumen();
        this._examenes = (datos && datos.examenes) || [];
      } catch (e) {
        contenido.innerHTML = `<div class="adm-aviso adm-aviso--error">No se pudieron cargar los exámenes: ${esc(e.message)}</div>`;
        return;
      }
      // La papelera vive solo aquí: no hay entrada en la barra lateral. Se
      // carga junto al listado para poder mostrar su contador en la pestaña.
      this._papelera = await window.examenesRepository.listarPapelera().catch(() => []);
      // Copias de exámenes que este navegador guardó y que ya no existen en la
      // nube: la última red si algo se borró por otra vía o desde otro equipo.
      this._copias = await window.examenesRepository.copiasLocales().catch(() => []);
      // Borradores del editor que nunca llegaron a la nube (o quedaron a medias
      // al cerrar la app). Es la red que evita perder un examen recién creado.
      const enPapelera = new Set(this._papelera.map((examen) => String(examen.id)));
      this._borradoresLocales = window.borradoresEditor
        ? window.borradoresEditor.listarPendientes().filter((borrador) => {
          const id = borrador.examen && borrador.examen.id;
          return !id || !enPapelera.has(String(id));
        })
        : [];

      const filtros = [
        ['todos', 'Todos'], ['borrador', 'Borradores'], ['publicado', 'Publicados'],
        ['cerrado', 'Cerrados'],
        ['papelera', this._papelera.length ? `Papelera (${this._papelera.length})` : 'Papelera']
      ];
      contenido.innerHTML = `
        <div class="adm-tabs adm-tabs--deslizante" id="tabs" role="tablist">
          <span class="adm-tabs__indicador" aria-hidden="true"></span>
          ${filtros
            .map(([id, texto]) => `<button class="adm-tab${this._filtro === id ? ' adm-tab--activo' : ''}" data-filtro="${id}" role="tab" aria-selected="${this._filtro === id}">${texto}</button>`)
            .join('')}
        </div>
        <div class="adm-busqueda-wrap">
          <span class="admin-buscar__icono" aria-hidden="true">${I('search')}</span>
          <input type="search" class="adm-buscador" id="buscar" placeholder="Buscar por título…" value="${esc(this._busqueda)}" aria-label="Buscar exámenes">
        </div>
        <div id="lista" class="adm-lista"></div>`;

      // Los borradores locales van fuera de #lista para que cambiar de pestaña
      // no los oculte: son trabajo del usuario pendiente de recuperar.
      if (this._borradoresLocales.length) {
        contenido.insertAdjacentHTML('afterbegin', this._htmlBorradoresLocales());
        this._conectarBorradoresLocales(contenido);
      }

      const tabs = contenido.querySelector('#tabs');
      // El indicador se coloca al pintar y se recoloca cuando la fila puede
      // reordenarse: al cambiar de ancho los filtros envuelven a otra línea, y
      // con la tipografía aún cargando los anchos todavía bailan.
      const recolocarIndicador = () => {
        if (contenido.isConnected === false) return;
        this._colocarIndicador(tabs);
      };
      recolocarIndicador();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(recolocarIndicador);
      window.addEventListener('resize', recolocarIndicador);
      this._recolocarIndicador = recolocarIndicador;

      tabs.querySelectorAll('.adm-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          this._filtro = btn.dataset.filtro;
          tabs.querySelectorAll('.adm-tab').forEach((b) => {
            b.classList.toggle('adm-tab--activo', b === btn);
            b.setAttribute('aria-selected', String(b === btn));
          });
          recolocarIndicador();
          this._pintarLista();
        });
      });

      const buscar = contenido.querySelector('#buscar');
      buscar.addEventListener('input', () => {
        clearTimeout(this._timer);
        this._timer = setTimeout(() => {
          this._busqueda = buscar.value.trim().toLowerCase();
          this._pintarLista();
        }, 180);
      });

      this._pintarLista();
    },

    desmontar() {
      clearTimeout(this._timer);
      this._timer = null;
      if (this._recolocarIndicador) {
        window.removeEventListener('resize', this._recolocarIndicador);
        this._recolocarIndicador = null;
      }
    },

    /**
     * Coloca la píldora del riel sobre el filtro activo. Se lee la geometría
     * real (offsetLeft/Top/Width/Height respecto al riel) en vez de calcularla,
     * porque los filtros tienen anchos distintos y en pantallas estrechas
     * envuelven a una segunda línea. El primer salto va sin transición: si no,
     * al entrar en la vista la píldora se vería deslizarse desde la esquina.
     */
    _colocarIndicador(tabs) {
      if (!tabs) return;
      const indicador = tabs.querySelector('.adm-tabs__indicador');
      const activo = tabs.querySelector('.adm-tab--activo');
      if (!indicador || !activo) return;

      const primeraVez = !indicador.dataset.colocado;
      if (primeraVez) indicador.style.transition = 'none';

      indicador.style.width = `${activo.offsetWidth}px`;
      indicador.style.height = `${activo.offsetHeight}px`;
      indicador.style.transform = `translate(${activo.offsetLeft}px, ${activo.offsetTop}px)`;

      if (primeraVez) {
        // Fuerza a pintar con la transición apagada antes de devolvérsela.
        void indicador.offsetWidth;
        indicador.style.transition = '';
        indicador.dataset.colocado = '1';
      }
    },

    _pintarLista() {
      const lista = document.querySelector('#lista');
      if (!lista) return;

      if (this._filtro === 'papelera') {
        this._pintarPapelera(lista);
        return;
      }

      const filtrados = this._examenes.filter((ex) => {
        if (this._filtro !== 'todos' && ex.estado !== this._filtro) return false;
        if (this._busqueda && !String(ex.titulo || '').toLowerCase().includes(this._busqueda)) return false;
        return true;
      });

      if (!filtrados.length) {
        lista.innerHTML = `<div class="adm-vacio">
          <p class="adm-vacio__titulo">${this._examenes.length ? 'Sin resultados' : 'Todavía no hay exámenes'}</p>
          <p>${this._examenes.length ? 'Prueba otro filtro o borra la búsqueda.' : 'Crea tu primer examen para empezar.'}</p>
        </div>`;
        return;
      }

      lista.innerHTML = filtrados.map((ex) => this._tarjeta(ex)).join('');
      lista.querySelectorAll('[data-accion]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const menu = btn.closest('details');
          if (menu) menu.open = false;
          this._accion(btn.dataset.accion, btn.dataset.id, btn.dataset.titulo);
        });
      });
      // El desplegable siempre abre hacia abajo por defecto; en las últimas
      // tarjetas no hay sitio y las opciones finales quedaban cortadas. Si al
      // abrir no cabe en la ventana, se abre hacia arriba (CSS
      // .adm-examen__mas--arriba). En móvil el menú es estático y empuja el
      // contenido, así que allí no hay nada que voltear.
      lista.querySelectorAll('details.adm-examen__mas').forEach((menu) => {
        menu.addEventListener('toggle', () => {
          if (!menu.open) { menu.classList.remove('adm-examen__mas--arriba'); return; }
          const panel = menu.querySelector('.adm-examen__menu');
          if (!panel) return;
          if (window.getComputedStyle(panel).position !== 'absolute') return;
          menu.classList.remove('adm-examen__mas--arriba');
          if (panel.getBoundingClientRect().bottom > window.innerHeight - 8) {
            menu.classList.add('adm-examen__mas--arriba');
          }
        });
      });
      if (window.Iconos) window.Iconos.actualizar();
    },

    // ── Borradores locales del editor ────────────────────────────────────
    _htmlBorradoresLocales() {
      if (!this._borradoresLocales.length) return '';
      const filas = this._borradoresLocales.map((borrador) => {
        const resumen = window.borradorExamen.resumenBorrador(borrador);
        const id = resumen.id ? esc(resumen.id) : '';
        const titulo = esc(resumen.titulo || 'Examen sin título');
        const preguntas = `${resumen.preguntas} pregunta${resumen.preguntas === 1 ? '' : 's'}`;
        return `<div class="adm-borradores-locales__fila">
          <div class="adm-borradores-locales__datos">
            <div class="adm-borradores-locales__titulo">${titulo}</div>
            <div class="adm-borradores-locales__meta">${preguntas} · Guardado ${esc(window.panelUI.tiempoRelativo(resumen.guardadoEn))}</div>
          </div>
          <div class="adm-borradores-locales__acciones">
            <button class="adm-btn adm-btn--principal adm-btn--pequeno" type="button" data-borrador-local="continuar" data-id="${id}">
              ${I('cloud')} Continuar
            </button>
            <button class="adm-btn adm-btn--pequeno" type="button" data-borrador-local="descartar" data-id="${id}">Descartar</button>
          </div>
        </div>`;
      }).join('');

      return `<section class="adm-borradores-locales" aria-label="Borradores sin terminar en este dispositivo">
        <p class="adm-seccion__titulo">Borradores sin terminar en este dispositivo</p>
        ${filas}
      </section>`;
    },

    _conectarBorradoresLocales(contenedor) {
      contenedor.querySelectorAll('[data-borrador-local]').forEach((btn) => {
        btn.addEventListener('click', () => this._accionBorradorLocal(btn.dataset.borradorLocal, btn.dataset.id));
      });
    },

    async _accionBorradorLocal(accion, id) {
      if (accion === 'continuar') {
        // Un borrador sin id nunca llegó a la nube: retomarlo equivale a crear
        // un examen nuevo, así que sigue siendo un solo clic.
        if (!id) {
          router.navegar('/editor/nuevo');
          return;
        }
        // Abrir un examen existente cambia de vista: misma tarjeta de siempre.
        if (!(await window.helpers.confirmarEdicion())) return;
        router.navegar('/editor/' + id);
        return;
      }
      if (accion !== 'descartar') return;

      const borrador = this._borradoresLocales.find((item) => {
        const resumen = window.borradorExamen.resumenBorrador(item);
        return String(resumen.id || '') === String(id || '');
      });
      const resumen = borrador ? window.borradorExamen.resumenBorrador(borrador) : { titulo: '' };
      const ok = await window.helpers.confirmar(
        `Se eliminarán los cambios sin guardar de «${resumen.titulo || 'Examen sin título'}» en este dispositivo.`,
        { titulo: '¿Descartar borrador?', textoConfirmar: 'Descartar' }
      );
      if (!ok) return;
      window.borradoresEditor.eliminar(id || 'nuevo');
      this._borradoresLocales = window.borradoresEditor.listarPendientes();
      router._ejecutar();
    },

    /** Pestaña Papelera: restaurar o borrar definitivamente. */
    _pintarPapelera(contenedor) {
      // El buscador también filtra la papelera, pero «Vaciar papelera» vacía
      // TODO lo archivado: por eso el contador y el botón miran la lista
      // completa y solo la lista visible respeta la búsqueda.
      const total = this._papelera.length;
      const visibles = this._busqueda
        ? this._papelera.filter((ex) => String(ex.titulo || '').toLowerCase().includes(this._busqueda))
        : this._papelera;
      const cabecera = `<div class="adm-papelera__cabecera">
        <p class="adm-cabecera__sub" style="margin:0">${total
          ? `${total} ${total === 1 ? 'examen' : 'exámenes'} en la papelera. Se pueden restaurar; vaciarla los borra para siempre.`
          : 'La papelera está vacía.'}</p>
        <button class="adm-btn adm-btn--peligro adm-btn--pequeno" type="button" id="btnVaciarPapelera" ${total ? '' : 'disabled'}>
          ${I('trash-2')} Vaciar papelera
        </button>
      </div>`;

      if (!total) {
        contenedor.innerHTML = `${cabecera}
          <div class="adm-vacio">
            <p class="adm-vacio__titulo">Nada por aquí</p>
            <p>Los exámenes que borres aparecerán en la papelera y podrás recuperarlos.</p>
          </div>`;
      } else if (!visibles.length) {
        contenedor.innerHTML = `${cabecera}
          <div class="adm-vacio">
            <p class="adm-vacio__titulo">Sin resultados</p>
            <p>Ningún examen de la papelera coincide con la búsqueda.</p>
          </div>`;
      } else {
        contenedor.innerHTML = `${cabecera}<div class="adm-lista">${visibles.map((ex) => this._tarjetaPapelera(ex)).join('')}</div>`;
      }

      if (this._copias.length) contenedor.insertAdjacentHTML('beforeend', this._htmlCopias());

      contenedor.querySelectorAll('[data-papelera-accion]').forEach((btn) => {
        btn.addEventListener('click', () => this._accionPapelera(btn.dataset.papeleraAccion, btn.dataset.id));
      });
      contenedor.querySelectorAll('[data-copia-accion]').forEach((btn) => {
        btn.addEventListener('click', () => this._accionCopia(btn.dataset.copiaId));
      });
      const vaciar = contenedor.querySelector('#btnVaciarPapelera');
      if (vaciar) vaciar.addEventListener('click', () => this._accionPapelera('vaciar'));
      if (window.Iconos) window.Iconos.actualizar();
    },

    /**
     * Copias que este navegador guardó de exámenes que ya no están en la nube.
     * No se ofrecen solas: recrear algo que el profesor borró a propósito
     * también sería molesto, así que la recuperación siempre es un clic suyo.
     */
    _htmlCopias() {
      const filas = this._copias.map(({ examen, guardadoEn }) => {
        const estado = ESTADOS[examen.estado] || ESTADOS.borrador;
        const titulo = esc(examen.titulo || 'Examen sin título');
        const preguntas = Array.isArray(examen.preguntas) ? examen.preguntas.length : 0;
        const meta = [
          `${preguntas} pregunta${preguntas === 1 ? '' : 's'}`,
          `${Number(examen.puntos_totales) || 0} puntos`,
          guardadoEn ? `Copia guardada ${esc(window.panelUI.tiempoRelativo(guardadoEn))}` : 'Copia de este dispositivo'
        ];
        return `<article class="adm-fila adm-examen adm-examen--copia" aria-label="${titulo}">
          <div class="adm-fila__principal adm-examen__principal">
            <div class="adm-fila__titulo adm-examen__titulo">
              <h2>${titulo}</h2>
              <span class="adm-badge adm-badge--cerrado">Copia local</span>
              <span class="adm-badge ${estado.clase}">Antes: ${estado.texto}</span>
            </div>
            <div class="adm-fila__meta adm-examen__meta">
              ${meta.map((m) => `<span>${m}</span>`).join('')}
            </div>
          </div>
          <div class="adm-fila__acciones adm-examen__acciones">
            <div class="adm-examen__acciones-principales">
              <button class="adm-btn adm-btn--principal adm-btn--pequeno" type="button" data-copia-accion="recuperar" data-copia-id="${esc(examen.id)}">
                ${I('rotate-ccw')} Recuperar como borrador
              </button>
            </div>
          </div>
        </article>`;
      }).join('');

      return `<section class="adm-seccion adm-seccion--copias" aria-label="Copias locales de exámenes">
        <div class="adm-seccion__cabecera">
          <span class="adm-seccion__titulo">Copias en este dispositivo</span>
        </div>
        <p class="adm-cabecera__sub">Estos exámenes se abrieron en este navegador y ya no están en la nube. Se recuperan como borrador, sin sus enlaces ni entregas.</p>
        <div class="adm-lista">${filas}</div>
      </section>`;
    },

    async _accionCopia(id) {
      const copia = this._copias.find((item) => String(item.examen.id) === String(id));
      if (!copia) return;
      const preguntas = Array.isArray(copia.examen.preguntas) ? copia.examen.preguntas.length : 0;
      const ok = await window.helpers.confirmar(
        `Se recreará «${copia.examen.titulo || 'Examen sin título'}» como borrador con sus ${preguntas} pregunta${preguntas === 1 ? '' : 's'}. Los enlaces y las entregas antiguas no vuelven.`,
        { titulo: '¿Recuperar esta copia?', textoConfirmar: 'Recuperar', peligroso: false }
      );
      if (!ok) return;
      await this._ejecutar(() => window.examenesRepository.recuperarCopia(copia.examen), 'Examen recuperado como borrador.');
    },

    _tarjetaPapelera(ex) {
      const previa = (ex.config && ex.config.papelera) || {};
      const estadoPrevio = ESTADOS[previa.estado_previo] || ESTADOS.borrador;
      const titulo = esc(ex.titulo || 'Examen sin título');
      const preguntas = Array.isArray(ex.preguntas) ? ex.preguntas.length : 0;
      const meta = [
        `${preguntas} pregunta${preguntas === 1 ? '' : 's'}`,
        `${Number(ex.puntos_totales) || 0} puntos`,
        `Eliminado ${esc(window.panelUI.tiempoRelativo(previa.eliminado_en || ex.actualizado_en))}`
      ];

      return `<article class="adm-fila adm-examen adm-examen--papelera" aria-label="${titulo}">
        <div class="adm-fila__principal adm-examen__principal">
          <div class="adm-fila__titulo adm-examen__titulo">
            <h2>${titulo}</h2>
            <span class="adm-badge adm-badge--papelera">En papelera</span>
            <span class="adm-badge ${estadoPrevio.clase}">Antes: ${estadoPrevio.texto}</span>
          </div>
          <div class="adm-fila__meta adm-examen__meta">
            ${meta.map((m) => `<span>${m}</span>`).join('')}
          </div>
        </div>
        <div class="adm-fila__acciones adm-examen__acciones">
          <div class="adm-examen__acciones-principales">
            <button class="adm-btn adm-btn--principal adm-btn--pequeno" type="button" data-papelera-accion="restaurar" data-id="${esc(ex.id)}">
              ${I('rotate-ccw')} Restaurar
            </button>
            <button class="adm-btn adm-btn--peligro adm-btn--pequeno" type="button" data-papelera-accion="borrar" data-id="${esc(ex.id)}" data-titulo="${titulo}">
              ${I('trash-2')} Eliminar definitivamente
            </button>
          </div>
        </div>
      </article>`;
    },

    _tarjeta(ex) {
      const estado = ESTADOS[ex.estado] || ESTADOS.borrador;
      const porCorregir = Number(ex.por_corregir) || 0;
      const numEnlaces = Number(ex.num_enlaces) || 0;
      const enlacesUsados = Number(ex.enlaces_usados) || 0;
      const meta = [
        (Number(ex.num_preguntas) || 0) + ' preguntas',
        (Number(ex.puntos_totales) || 0) + ' puntos',
        numEnlaces + ' compartidos · ' + enlacesUsados + ' usados',
        (Number(ex.num_entregas) || 0) + ' entregas'
      ];
      if (ex.nota_media != null) meta.push('media ' + window.panelUI.numero(ex.nota_media));

      const titulo = esc(ex.titulo);
      const estadoAccion = ex.estado === 'publicado'
        ? `<button class="adm-btn adm-btn--pequeno" type="button" data-accion="cerrar" data-id="${esc(ex.id)}">${window.Iconos.render('lock')} Cerrar examen</button>`
        : ex.estado === 'cerrado'
          ? `<button class="adm-btn adm-btn--pequeno" type="button" data-accion="publicar" data-id="${esc(ex.id)}">${window.Iconos.render('unlock')} Reabrir examen</button>`
          : `<button class="adm-btn adm-btn--pequeno" type="button" data-accion="publicar" data-id="${esc(ex.id)}">${window.Iconos.render('upload')} Publicar</button>`;

      return `<article class="adm-fila adm-examen" aria-label="${titulo}">
        <div class="adm-fila__principal adm-examen__principal">
          <div class="adm-fila__titulo adm-examen__titulo">
            <h2>${titulo}</h2>
            <span class="adm-badge ${estado.clase}">${estado.texto}</span>
            ${porCorregir > 0 ? `<span class="adm-badge adm-badge--aviso">${porCorregir} por corregir</span>` : ''}
          </div>
          <div class="adm-fila__meta adm-examen__meta">
            ${meta.map((m) => `<span>${esc(m)}</span>`).join('')}
            <span class="adm-fila__meta__actualizado">Actualizado ${esc(window.panelUI.tiempoRelativo(ex.actualizado_en || ex.creado_en))}</span>
          </div>
        </div>
        <div class="adm-fila__acciones adm-examen__acciones" aria-label="Acciones de ${titulo}">
          <div class="adm-examen__acciones-principales">
            <button class="adm-btn adm-btn--principal adm-btn--pequeno" type="button" data-accion="compartir" data-id="${esc(ex.id)}" data-titulo="${titulo}">${window.Iconos.render('link')} Gestionar enlaces</button>
            <button class="adm-btn adm-btn--pequeno" type="button" data-accion="editar" data-id="${esc(ex.id)}">${window.Iconos.render('edit-3')} Editar</button>
          </div>
          <details class="adm-examen__mas">
            <summary class="adm-btn adm-btn--pequeno" aria-label="Más opciones para ${titulo}">${window.Iconos.render('more-horizontal')} Más opciones ${window.Iconos.render('chevron-down')}</summary>
            <div class="adm-examen__menu" aria-label="Acciones adicionales">
              <button class="adm-btn adm-btn--pequeno" type="button" data-accion="entregas" data-id="${esc(ex.id)}">${window.Iconos.render('inbox')} Entregas${porCorregir > 0 ? ` · ${porCorregir} por corregir` : ''}</button>
              ${estadoAccion}
              <button class="adm-btn adm-btn--pequeno" type="button" data-accion="duplicar" data-id="${esc(ex.id)}" data-titulo="${titulo}">${window.Iconos.render('copy')} Duplicar como borrador</button>
              <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button" data-accion="eliminar" data-id="${esc(ex.id)}" data-titulo="${titulo}">${window.Iconos.render('trash-2')} Eliminar examen</button>
            </div>
          </details>
        </div>
      </article>`;
    },

    async _accion(accion, id, titulo) {
      if (accion === 'editar') {
        if (!(await window.helpers.confirmarEdicion())) return;
        router.navegar('/editor/' + id);
        return;
      }
      if (accion === 'entregas') { router.navegar('/corregir/' + id); return; }
      if (accion === 'compartir') { await this._modalEnlaceComunitario(id, titulo); return; }
      if (accion === 'compartir-individual') { await this._modalEnlaces(id, titulo); return; }

      if (accion === 'publicar') {
        const examen = this._examenes.find((item) => String(item.id) === String(id));
        const reabrir = examen && examen.estado === 'cerrado';
        const ok = await window.helpers.confirmar(
          reabrir
            ? 'El examen volverá a admitir entregas. Las respuestas y calificaciones anteriores se conservarán.'
            : 'Se generará un enlace para toda la clase: cada alumno lo abre, escribe su nombre y responde.',
          {
            titulo: reabrir ? '¿Reabrir este examen?' : '¿Publicar este examen?',
            textoConfirmar: reabrir ? 'Reabrir' : 'Publicar'
          }
        );
        if (!ok) return;
        const publicado = await this._ejecutar(() => window.plataformaRepository.cambiarEstado(id, 'publicado'), reabrir ? 'Examen reabierto.' : 'Examen publicado.');
        if (publicado && !reabrir) this._modalEnlaceComunitario(id, titulo);
        return;
      }

      if (accion === 'cerrar') {
        const ok = await window.helpers.confirmar(
          'Los alumnos ya no podrán entregar el examen. Las entregas recibidas se conservan.',
          { titulo: '¿Cerrar este examen?', textoConfirmar: 'Cerrar examen' }
        );
        if (!ok) return;
        await this._ejecutar(() => window.plataformaRepository.cambiarEstado(id, 'cerrado'), 'Examen cerrado.');
        return;
      }

      if (accion === 'duplicar') {
        const ok = await window.helpers.confirmar(
          `Se creará una copia de «${titulo}» como borrador. No se copian los enlaces ni las entregas.`,
          { titulo: '¿Duplicar examen?', textoConfirmar: 'Duplicar' }
        );
        if (!ok) return;
        await this._ejecutar(async () => {
          const original = await window.examenesRepository.obtener(id);
          if (!original) throw new Error('No se pudo cargar el examen original.');
          const copia = {
            grupo_id: original.grupo_id,
            creado_por: original.creado_por,
            titulo: 'Copia de ' + (original.titulo || 'examen'),
            descripcion: original.descripcion || '',
            preguntas: original.preguntas || [],
            puntos_totales: original.puntos_totales || 0,
            estado: 'borrador',
            publicado: false,
            config: original.config || {}
          };
          await window.examenesRepository.guardar(copia);
        }, 'Examen duplicado como borrador.');
        return;
      }

      if (accion === 'eliminar') {
        const ok = await window.helpers.confirmar(
          `«${titulo}» se moverá a la papelera. Podrás restaurarlo cuando quieras; sus enlaces dejan de funcionar mientras esté ahí.`,
          { titulo: '¿Mover a la papelera?', textoConfirmar: 'Mover a la papelera', peligroso: false }
        );
        if (!ok) return;
        await this._ejecutar(() => window.examenesRepository.moverAPapelera(id), 'Examen movido a la papelera.');
      }
    },

    /** Restaurar, borrar definitivamente o vaciar la papelera. */
    async _accionPapelera(accion, id) {
      const examen = this._papelera.find((item) => String(item.id) === String(id));
      const titulo = examen ? examen.titulo : 'este examen';

      if (accion === 'restaurar') {
        const ok = await window.helpers.confirmar(
          `«${titulo}» volverá a tus exámenes con el estado que tenía antes de borrarse.`,
          { titulo: '¿Restaurar examen?', textoConfirmar: 'Restaurar', peligroso: false }
        );
        if (!ok) return;
        await this._ejecutar(() => window.examenesRepository.restaurar(id), 'Examen restaurado.');
        return;
      }

      if (accion === 'borrar') {
        const ok = await window.helpers.confirmar(
          `Se eliminará «${titulo}» para siempre, junto con sus enlaces y todas sus entregas. Esta acción no se puede deshacer.`,
          { titulo: '¿Eliminar definitivamente?', textoConfirmar: 'Eliminar para siempre' }
        );
        if (!ok) return;
        await this._ejecutar(() => window.examenesRepository.eliminarDefinitivo(id), 'Examen eliminado definitivamente.');
        return;
      }

      if (accion === 'vaciar') {
        const total = this._papelera.length;
        if (!total) return;
        const cuerpo = (total === 1
          ? 'Se eliminará para siempre 1 examen de la papelera'
          : `Se eliminarán para siempre ${total} exámenes de la papelera`)
          + ', con sus enlaces y todas sus entregas. Esta acción no se puede deshacer.';
        const ok = await window.helpers.confirmar(cuerpo,
          { titulo: '¿Vaciar la papelera?', textoConfirmar: `Eliminar ${total === 1 ? 'el examen' : 'todo'}` }
        );
        if (!ok) return;
        await this._ejecutar(async () => {
          const borrados = await window.examenesRepository.vaciarPapelera();
          this._papelera = [];
          return borrados;
        }, 'Papelera vacía.');
      }
    },

    async _ejecutar(operacion, mensajeExito) {
      try {
        await operacion();
        window.helpers.mostrarAlerta(mensajeExito, 'exito');
        router._ejecutar();
        return true;
      } catch (e) {
        window.helpers.mostrarAlerta('Error: ' + e.message, 'error');
        return false;
      }
    },

    // ── Enlace para toda la clase ──────────────────────────────────────
    async _modalEnlaceComunitario(examenId, titulo) {
      const modal = window.panelUI.modal({
        titulo: 'Enlace para toda la clase',
        cuerpoHtml: `<p class="adm-cabecera__sub adm-modal__info">Un solo enlace para la clase: cada alumno se identifica con su nombre, responde el examen y, después de entregado, puede revisar su propio examen en este mismo enlace. Para ver su nota tendrá que escribir exactamente el mismo nombre con el que respondió.</p>
          <div class="adm-edicion" id="enlaceComunitario">
            <p class="adm-cabecera__sub">
              <span class="adm-edicion__clave">Enlace de la clase</span> <code id="claveComunitario"></code>
            </p>
            <div class="adm-edicion__acciones">
              <button class="adm-btn adm-btn--principal adm-btn--pequeno" id="btnCopiarComunitario" type="button">Copiar enlace</button>
              <button class="adm-btn adm-btn--primario adm-btn--pequeno" id="btnWhatsAppComunitario" type="button">Compartir en WhatsApp</button>
              <button class="adm-btn adm-btn--peligro adm-btn--pequeno" id="btnVaciarComunitario" type="button">Limpiar campos</button>
            </div>
            <p class="adm-cabecera__sub adm-edicion__nota" id="textoComunitario">
              No hay enlace de la clase creado todavía. El botón de abajo genera un enlace para toda la clase.
            </p>
            <div class="adm-edicion__acciones">
              <button class="adm-btn adm-btn--principal adm-btn--pequeno" id="btnCrearEnlaceComunitario" type="button">Generar enlace de la clase</button>
            </div>
          </div>
          <div id="errorComunitario" class="adm-aviso adm-aviso--error" hidden></div>
          <div class="adm-seccion__cabecera">
            <span class="adm-seccion__titulo">Enlaces individuales existentes</span>
          </div>
          <div id="listaEnlaces"><p class="adm-cabecera__sub">Cargando enlaces…</p></div>`,
        pieHtml: `<button class="adm-btn" id="btnIndividuales" type="button">Enlaces individuales…</button>
          <button class="adm-btn" data-rol="cerrar" type="button">Cerrar</button>`
      });
      modal.pie.querySelector('[data-rol="cerrar"]').addEventListener('click', modal.cerrar);
      const error = modal.cuerpo.querySelector('#errorComunitario');
      const clave = modal.cuerpo.querySelector('#claveComunitario');
      const boton = {
        copiar: modal.cuerpo.querySelector('#btnCopiarComunitario'),
        whatsapp: modal.cuerpo.querySelector('#btnWhatsAppComunitario'),
        vaciar: modal.cuerpo.querySelector('#btnVaciarComunitario')
      };

      const mensaje = (fila, texto, tipo) => {
        const p = modal.cuerpo.querySelector(fila);
        if (!p || p.children.length) return;
        if (tipo === 'aviso') {
          const aviso = el('div', 'aviso ' + (tipo.includes('error') ? 'aviso--error' : 'aviso--ok'), texto);
          modal.cuerpo.querySelector('#textoComunitario').insertAdjacentElement('afterend', aviso);
          return;
        }
        p.textContent = texto;
        // El estado se marca en el propio nodo para que el CSS pueda
        // distinguir «va bien» de «falta el enlace» sin más lógica.
        if (texto) p.dataset.estado = tipo === 'error' ? 'error' : 'ok';
        else delete p.dataset.estado;
      };

      const setClave = (token) => {
        // La URL completa (origin + /e/ + token): lo que el profesor copia y
        // comparte tiene que ser pulsable, no una clave suelta.
        clave.textContent = token ? window.plataformaRepository.urlEnlace(token) : 'Generar enlace de la clase…';
        if (token) {
          boton.copiar.disabled = false;
          boton.whatsapp.disabled = false;
          boton.vaciar.disabled = false;              mensaje('#textoComunitario', 'Copia el enlace y pásalo a toda la clase. Que cada alumno lo abra en su teléfono, escriba su nombre y responderá. Después de entregar, en el mismo enlace puede revisar su examen; para ver la nota tendrá que repetir exactamente el mismo nombre.', 'exito');
        } else {
          boton.copiar.disabled = true;
          boton.whatsapp.disabled = true;
          boton.vaciar.disabled = true;
          mensaje('#textoComunitario', 'No hay enlace de la clase creado todavía. El botón de abajo genera un enlace para toda la clase.', 'error');
        }
      };

      const recargar = async () => {
        const contenedor = modal.cuerpo.querySelector('#listaEnlaces');
        try {
          const enlaces = await window.plataformaRepository.listarEnlaces(examenId);
          const comunitario = enlaces.find((e) => e.comunitario);
          setClave(comunitario ? comunitario.token : null);
          // El de la clase ya se muestra arriba: la lista es solo de individuales.
          const individuales = enlaces.filter((e) => !e.comunitario);
          if (!individuales.length) contenedor.innerHTML = '<p class="adm-cabecera__sub">Sin enlaces individuales aún.</p>';
          else contenedor.innerHTML = this._htmlEnlaces(individuales, titulo);
          contenedor.querySelectorAll('[data-enlace-accion]').forEach((btn) => {
            btn.addEventListener('click', () => this._accionEnlace(btn, individuales, examenId, titulo, recargar));
          });
        } catch (e) {
          error.textContent = e.message;
          error.hidden = false;
          contenedor.innerHTML = `<div class="adm-aviso adm-aviso--error">${esc(e.message)}</div>`;
        }
      };

      boton.copiar.addEventListener('click', async () => {
        if (!clave.textContent.includes('/e/')) { error.textContent = 'Primero genera el enlace de la clase.'; error.hidden = false; return; }
        const ok = await window.plataformaRepository.copiar(clave.textContent);
        if (ok) window.helpers.mostrarAlerta('Enlace copiado al portapapeles.', 'exito');
        else window.helpers.mostrarAlerta('No se pudo copiar. Selecciona la URL manualmente.', 'error');
      });

      boton.whatsapp.addEventListener('click', async () => {
        if (!clave.textContent.includes('/e/')) { error.textContent = 'Primero genera el enlace de la clase.'; error.hidden = false; return; }
        const texto = 'Hola, este es el enlace de la clase para ' + titulo + ':\n'
          + clave.textContent;
        await window.plataformaRepository.abrirWhatsApp(texto);
      });

      boton.vaciar.addEventListener('click', () => {
        clave.textContent = '';
        boton.copiar.disabled = true;
        boton.whatsapp.disabled = true;
        boton.vaciar.disabled = true;
        error.hidden = true;
        mensaje('#textoComunitario', '', 'error');
      });

      const crear = async () => {
        error.hidden = true;
        setClave(null);
        try {
          const creado = await window.plataformaRepository.crearEnlaceComunitario(examenId);
          setClave(creado.token);
          window.helpers.mostrarAlerta('Enlace de la clase creado.', 'exito');
          await recargar();
        } catch (e) {
          error.textContent = e.message;
          error.hidden = false;
        }
      };

      modal.cuerpo.querySelector('#btnCrearEnlaceComunitario').addEventListener('click', crear);
      modal.pie.querySelector('#btnIndividuales').addEventListener('click', () => {
        modal.cerrar();
        this._modalEnlaces(examenId, titulo);
      });

      // Al abrir se muestra el estado real: la clave de la clase si ya existe y
      // la lista de individuales. Sin esto el modal solo cargaba tras «Generar».
      await recargar();
    },

    // ── Enlaces individuales ─────────────────────────────────────────────
    async _modalEnlaces(examenId, titulo) {
      const modal = window.panelUI.modal({
        titulo: 'Enlaces de «' + titulo + '»',
        cuerpoHtml: `<p class="adm-cabecera__sub adm-modal__info">Cada enlace es individual y de un solo uso.</p>
          <div class="adm-campo">
            <label class="adm-campo__etiqueta" for="listaAlumnos">Añadir alumnos</label>
            <textarea class="adm-entrada" id="listaAlumnos" placeholder="Un alumno por línea&#10;Ana Pérez&#10;Luis Gómez, 3º B"></textarea>
            <p class="adm-campo__ayuda">Puedes escribir «Nombre, Grupo». El grupo es opcional.</p>
          </div>
          <div id="errorEnlaces" class="adm-aviso adm-aviso--error" hidden></div>
          <div id="listaEnlaces"><p class="adm-cabecera__sub">Cargando enlaces…</p></div>`,
        pieHtml: `<button class="adm-btn" data-rol="cerrar" type="button">Cerrar</button>
          <button class="adm-btn adm-btn--principal" id="btnGenerar" type="button">Generar enlaces</button>`
      });

      modal.pie.querySelector('[data-rol="cerrar"]').addEventListener('click', modal.cerrar);

      const error = modal.cuerpo.querySelector('#errorEnlaces');
      const btnGenerar = modal.pie.querySelector('#btnGenerar');

      const recargar = async () => {
        const contenedor = modal.cuerpo.querySelector('#listaEnlaces');
        try {
          const enlaces = await window.plataformaRepository.listarEnlaces(examenId);
          // El enlace de la clase no es individual: no se lista ni se puede
          // borrar desde este diálogo (antes aparecía como fila «Pendiente»).
          const individuales = enlaces.filter((e) => !e.comunitario);
          contenedor.innerHTML = this._htmlEnlaces(individuales, titulo);
          contenedor.querySelectorAll('[data-enlace-accion]').forEach((btn) => {
            btn.addEventListener('click', () => this._accionEnlace(btn, individuales, examenId, titulo, recargar));
          });
        } catch (e) {
          contenedor.innerHTML = `<div class="adm-aviso adm-aviso--error">${esc(e.message)}</div>`;
        }
      };

      btnGenerar.addEventListener('click', async () => {
        const area = modal.cuerpo.querySelector('#listaAlumnos');
        const alumnos = area.value.split('\n')
          .map((linea) => linea.trim())
          .filter(Boolean)
          .map((linea) => {
            const [nombre, ...resto] = linea.split(',');
            return { nombre: nombre.trim(), grupo: resto.join(',').trim() };
          })
          .filter((a) => a.nombre);

        error.hidden = true;
        if (!alumnos.length) {
          error.textContent = 'Escribe al menos un nombre (uno por línea).';
          error.hidden = false;
          return;
        }
        btnGenerar.disabled = true;
        btnGenerar.textContent = 'Generando…';
        try {
          await window.plataformaRepository.crearEnlaces(examenId, alumnos);
          area.value = '';
          await recargar();
          window.helpers.mostrarAlerta(alumnos.length + ' enlace(s) generado(s).', 'exito');
        } catch (e) {
          error.textContent = e.message;
          error.hidden = false;
        } finally {
          btnGenerar.disabled = false;
          btnGenerar.textContent = 'Generar enlaces';
        }
      });

      await recargar();
    },

    _htmlEnlaces(enlaces, titulo) {
      if (!enlaces || !enlaces.length) {
        return `<div class="adm-vacio"><p class="adm-vacio__titulo">Sin enlaces todavía</p>
          <p>Escribe los nombres arriba y pulsa «Generar enlaces».</p></div>`;
      }
      const usados = enlaces.filter((e) => e.usado).length;
      return `<div class="adm-seccion__conteo">${enlaces.length} enlace(s) · ${usados} usado(s)</div>
        <div class="adm-bloque" style="margin-bottom:0">
          ${enlaces.map((enlace) => `
            <div class="adm-enlace">
              <span class="adm-enlace__nombre">${esc(enlace.nombre_alumno)}
                ${enlace.grupo_alumno ? `<span class="adm-enlace__grupo">· ${esc(enlace.grupo_alumno)}</span>` : ''}
                ${enlace.usado ? '<span class="adm-badge adm-badge--exito">Entregado</span>' : '<span class="adm-badge adm-badge--borrador">Pendiente</span>'}
              </span>
              <span class="adm-enlace__url" title="${esc(window.plataformaRepository.urlEnlace(enlace.token))}">${esc(window.plataformaRepository.urlEnlace(enlace.token))}</span>
              <span class="adm-enlace__acciones">
                <button class="adm-btn adm-btn--pequeno" type="button" data-enlace-accion="copiar" data-token="${esc(enlace.token)}">Copiar</button>
                <button class="adm-btn adm-btn--pequeno" type="button" data-enlace-accion="whatsapp" data-token="${esc(enlace.token)}" data-nombre="${esc(enlace.nombre_alumno)}">WhatsApp</button>
                <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button" data-enlace-accion="borrar" data-id="${esc(enlace.id)}">Borrar</button>
              </span>
            </div>`).join('')}
        </div>`;
    },

    async _accionEnlace(btn, enlaces, examenId, titulo, recargar) {
      const accion = btn.dataset.enlaceAccion;
      const enlace = enlaces.find((e) => e.token === btn.dataset.token || e.id === btn.dataset.id);

      if (accion === 'copiar') {
        const url = window.plataformaRepository.urlEnlace(btn.dataset.token);
        const ok = await window.plataformaRepository.copiar(url);
        window.helpers.mostrarAlerta(ok ? 'Enlace copiado.' : 'No se pudo copiar. Selecciona la URL manualmente.', ok ? 'exito' : 'error');
        return;
      }

      if (accion === 'whatsapp' && enlace) {
        window.plataformaRepository.abrirWhatsApp(window.plataformaRepository.mensajeWhatsApp(enlace, titulo));
        return;
      }

      if (accion === 'borrar') {
        const ok = await window.helpers.confirmar('Se eliminará este enlace. Si ya tiene una entrega, el servidor lo impedirá.', {
          titulo: '¿Borrar enlace?', textoConfirmar: 'Borrar'
        });
        if (!ok) return;
        try {
          await window.plataformaRepository.eliminarEnlace(btn.dataset.id);
          await recargar();
          window.helpers.mostrarAlerta('Enlace eliminado.', 'exito');
        } catch (e) {
          window.helpers.mostrarAlerta(e.message, 'error');
        }
      }
    }
  };
})();
