(function() {
  'use strict';

  const BADGES = {
    'borrador':   { clase: 'examen-card__badge--borrador', texto: 'Borrador', icono: 'file-edit' },
    'publicado':  { clase: 'examen-card__badge--publicado', texto: 'Publicado', icono: 'send' },
    'cerrado':    { clase: 'examen-card__badge--cerrado', texto: 'Cerrado', icono: 'lock' },
    'archivado':  { clase: 'examen-card__badge--archivado', texto: 'Archivado', icono: 'archive' }
  };

  const I = (n) => window.Iconos.render(n);
  const _esc = (s) => window.helpers.escapeHtml(s || '');

  function _tiempoRelativo(fechaStr) {
    if (!fechaStr) return 'Recientemente';
    try {
      const diff = Date.now() - new Date(fechaStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Ahora';
      if (mins < 60) return `Hace ${mins} min`;
      const horas = Math.floor(mins / 60);
      if (horas < 24) return `Hace ${horas}h`;
      const dias = Math.floor(horas / 24);
      if (dias < 30) return `Hace ${dias}d`;
      return window.helpers.formatearFecha(fechaStr);
    } catch (e) { return 'Recientemente'; }
  }

  window.vistaExamenes = {
    _cleanup: null,
    _filtro: 'todos',
    _timerBusqueda: null,

    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      const esProfesor = ['admin', 'editor', 'owner'].includes(usuario.rol);
      raiz.innerHTML = window.skeleton ? window.skeleton.examenes() : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando exámenes...</p></div>';

      try {
        const [examenes, misIntentos] = await Promise.all([
          window.examenesRepository.listar(usuario),
          window.examenesRepository.misIntentos(usuario.id)
        ]);
        this._grupoId = usuario.grupo_id;
        this._alumnos = esProfesor ? await window.examenesRepository.obtenerMiembrosGrupo(usuario.grupo_id, true) : [];
        this._intentosGrupo = esProfesor ? await window.examenesRepository.obtenerIntentosGrupo(usuario.grupo_id) : [];

        const filtros = esProfesor
          ? [{ id: 'todos', etiqueta: 'Todos' }, { id: 'publicados', etiqueta: 'Publicados' }, { id: 'borradores', etiqueta: 'Borradores' }]
          : [{ id: 'todos', etiqueta: 'Todos' }, { id: 'disponibles', etiqueta: 'Disponibles' }, { id: 'completados', etiqueta: 'Completados' }];

        raiz.innerHTML = `
          <div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
            <!-- Header -->
            <div class="examen-header" style="margin-bottom:var(--espaciado-lg)">
              <h2 class="examen-header__titulo">${I('clipboard-check')} Exámenes <button class="info-ayuda" data-guia="examenes" aria-label="Guía de Exámenes">i</button></h2>
              <div class="examen-header__acciones">
                ${window.campanaNotificaciones ? window.campanaNotificaciones.renderCampana() : ''}
                ${esProfesor ? `<button class="btn-secundario examen-header__btn" id="btnCalificaciones">${I('bar-chart-2')} Notas</button>` : ''}
                ${esProfesor ? `<button class="btn-primario examen-header__btn" id="btnNuevoExamen">${I('plus')} Nuevo</button>` : ''}
              </div>
            </div>

            <!-- Tab bar -->
            <div class="examen-tabs" id="filtroExamenes" role="tablist">${filtros.map(f =>
              `<button class="examen-tab${f.id === this._filtro ? ' examen-tab--activo' : ''}" data-filtro="${f.id}" role="tab" aria-selected="${f.id === this._filtro}">${f.etiqueta}</button>`
            ).join('')}</div>

            <!-- Search -->
            <div style="position:relative;margin-bottom:var(--espaciado-md)">
              <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--color-texto-terciario);display:flex">${I('search')}</span>
              <input type="text" id="buscarExamen" placeholder="Buscar por título..." style="width:100%;padding:var(--espaciado-sm) var(--espaciado-md) var(--espaciado-sm) 2.4rem;border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto);font:inherit;font-size:var(--texto-sm)">
            </div>

            <!-- Separator -->
            <hr class="examen-separador">

            <!-- Lista -->
            <div id="listaExamenes" class="o-pila" style="gap:var(--espaciado-sm)"></div>
            <div id="listaExamenesVacia" class="empty-state empty-state--compacto" style="display:none">
              <div class="empty-state__icono">${I('clipboard-check')}</div>
              <p class="empty-state__descripcion" id="textoVacio">No hay exámenes que coincidan.</p>
            </div>
          </div>`;

        if (window.Iconos) window.Iconos.actualizar();

        if (esProfesor) {
          raiz.querySelector('#btnNuevoExamen').onclick = () => router.navegar('/editor/nuevo');
          raiz.querySelector('#btnCalificaciones').onclick = () => router.navegar('/calificaciones');
        }

        window.helpers.registrarGuias(raiz, {
          examenes: ['Exámenes', esProfesor
            ? 'Aquí puedes crear, publicar y revisar exámenes para tus alumnos.'
            : 'Aquí aparecen los exámenes disponibles para ti. Puedes comenzar uno nuevo o revisar tus resultados.',
            esProfesor ? 'Usa "Nuevo" para crear y "Notas" para ver resultados.' : 'Toca un examen para responderlo.']
        });

        this._examenes = examenes;
        this._misIntentos = misIntentos;
        this._esProfesor = esProfesor;

        // Tab clicks
        raiz.querySelectorAll('#filtroExamenes .examen-tab').forEach(btn => {
          btn.onclick = () => {
            if (this._cleanup) this._cleanup();
            this._filtro = btn.dataset.filtro;
            raiz.querySelectorAll('#filtroExamenes .examen-tab--activo').forEach(b => { b.classList.remove('examen-tab--activo'); b.setAttribute('aria-selected', 'false'); });
            btn.classList.add('examen-tab--activo');
            btn.setAttribute('aria-selected', 'true');
            this._renderizarLista();
          };
        });

        const buscarInput = raiz.querySelector('#buscarExamen');
        buscarInput.addEventListener('input', () => {
          clearTimeout(this._timerBusqueda);
          this._timerBusqueda = setTimeout(() => this._renderizarLista(), 200);
        });

        this._renderizarLista();
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },

    _renderizarLista() {
      const { _examenes, _misIntentos, _esProfesor, _filtro } = this;
      const raiz = document.querySelector('#listaExamenes');
      if (!raiz) return;
      const vacioDiv = document.querySelector('#listaExamenesVacia');
      const textoVacio = vacioDiv?.querySelector('#textoVacio');
      const buscarVal = (document.querySelector('#buscarExamen')?.value || '').toLowerCase().trim();

      let filtrados = _examenes.filter(ex => {
        if (buscarVal && !ex.titulo.toLowerCase().includes(buscarVal)) return false;
        if (_filtro === 'todos') return true;
        const miIntento = _misIntentos.find(i => i.examen_id === ex.id);
        if (_esProfesor) {
          if (_filtro === 'publicados') return ex.publicado;
          if (_filtro === 'borradores') return !ex.publicado;
          return true;
        }
        if (_filtro === 'disponibles') {
          return ex.publicado && (!miIntento || miIntento.estado === 'en_progreso');
        }
        if (_filtro === 'completados') {
          return miIntento && (miIntento.estado === 'completado' || miIntento.estado === 'calificado');
        }
        return true;
      });

      filtrados.sort((a, b) => new Date(b.creado_en || 0) - new Date(a.creado_en || 0));

      if (filtrados.length === 0) {
        raiz.innerHTML = '';
        if (vacioDiv) vacioDiv.style.display = '';
        if (textoVacio) textoVacio.textContent = buscarVal ? `Sin resultados para "${buscarVal}"` : 'No hay exámenes en esta categoría';
        return;
      }
      if (vacioDiv) vacioDiv.style.display = 'none';

      raiz.innerHTML = filtrados.map(ex => this._tarjetaExamen(ex)).join('');
      this._conectarEventos(raiz);
      if (window.campanaNotificaciones) window.campanaNotificaciones.conectar(document);
      window.Iconos.actualizar();
    },

    desmontar() {
      if (this._cleanup) { this._cleanup(); this._cleanup = null; }
      if (this._timerBusqueda) { clearTimeout(this._timerBusqueda); this._timerBusqueda = null; }
    },

    _tarjetaExamen(ex) {
      const miIntento = this._misIntentos.find(i => i.examen_id === ex.id);
      const esProfesor = this._esProfesor;
      const completado = miIntento && (miIntento.estado === 'completado' || miIntento.estado === 'calificado');
      const enProgreso = miIntento && miIntento.estado === 'en_progreso';

      // Badge
      let badge;
      if (esProfesor) {
        badge = BADGES[ex.estado || (ex.publicado ? 'publicado' : 'borrador')] || BADGES['borrador'];
      } else if (completado) {
        badge = miIntento.corregido
          ? { clase: 'examen-card__badge--calificado', texto: 'Calificado', icono: 'check-circle' }
          : { clase: 'examen-card__badge--pendiente', texto: 'Pendiente corrección', icono: 'clock' };
      } else if (enProgreso) {
        badge = { clase: 'examen-card__badge--en-progreso', texto: 'En progreso', icono: 'loader' };
      } else {
        badge = { clase: 'examen-card__badge--disponible', texto: 'Disponible', icono: 'circle' };
      }

      // Stats (teacher only)
      let statsHtml = '';
      let footerHtml = '';
      if (esProfesor) {
        const ints = this._intentosGrupo.filter(i => i.examen_id === ex.id);
        const totalAlumnos = this._alumnos.length;
        const hechos = ints.filter(i => i.estado === 'completado' || i.estado === 'calificado').length;
        const pendientes = Math.max(0, totalAlumnos - hechos);

        statsHtml = `
          <div class="examen-card__stats">
            <span class="examen-card__stat">${I('users')} <b>${totalAlumnos}</b> alumnos</span>
            ${ex.publicado ? `<span class="examen-card__stat examen-card__stat--exito">${I('check-circle')} <b>${hechos}</b> respondieron</span>` : ''}
            ${ex.publicado && pendientes > 0 ? `<span class="examen-card__stat examen-card__stat--aviso">${I('clock')} <b>${pendientes}</b> faltan</span>` : ''}
            <span class="examen-card__stat">${I('save')} ${_tiempoRelativo(ex.actualizado_en || ex.creado_en)}</span>
          </div>`;

        footerHtml = `
          <div class="examen-card__footer">
            <span class="u-fs-xs u-color-texto-terciario">${ex.fecha_limite ? I('calendar') + ' Límite: ' + window.helpers.formatearFecha(ex.fecha_limite) : ''}</span>
            <button class="btn-corregir btn-corregir-examen" data-id="${ex.id}">${I('check-square')} Corregir</button>
          </div>`;
      }

      // Student actions in footer
      let accionEstudiante = '';
      if (!esProfesor && ex.publicado) {
        if (completado) {
          accionEstudiante = `<button class="examen-card__accion-estudiante examen-card__accion-estudiante--ver btn-ver-resultados-alumno" data-id="${ex.id}">${I('eye')} Ver resultados</button>`;
        } else if (enProgreso) {
          accionEstudiante = `<button class="examen-card__accion-estudiante examen-card__accion-estudiante--continuar btn-iniciar-examen" data-id="${ex.id}">${I('play')} Continuar</button>`;
        } else {
          accionEstudiante = `<button class="examen-card__accion-estudiante examen-card__accion-estudiante--comenzar btn-iniciar-examen" data-id="${ex.id}">${I('play')} Comenzar</button>`;
        }
      }

      // 3-dot menu (teacher only)
      let menuHtml = '';
      if (esProfesor) {
        const items = [
          { accion: 'editar', icono: 'edit', texto: 'Editar', clase: 'btn-editar-examen' },
          { accion: 'duplicar', icono: 'copy', texto: 'Duplicar', clase: 'btn-duplicar-examen' },
          { accion: 'alumnos', icono: 'users', texto: 'Alumnos', clase: 'btn-ver-alumnos-examen' },
          { accion: 'compartir', icono: 'share-2', texto: 'Compartir', clase: 'btn-compartir-examen' },
        ];
        const peligroItems = [
          { accion: 'eliminar', icono: 'trash-2', texto: 'Eliminar', clase: 'btn-eliminar-examen' }
        ];

        menuHtml = `
          <div class="examen-card__menu-wrap">
            <button class="examen-card__menu-btn examen-menu-toggle" aria-label="Más opciones" aria-expanded="false">⋮</button>
            <div class="examen-card__menu">
              ${items.map(i => `<button class="examen-card__menu-item ${i.clase}" data-id="${ex.id}" data-titulo="${_esc(ex.titulo)}">${I(i.icono)} ${i.texto}</button>`).join('')}
              ${ex.publicado ? '' : `<button class="examen-card__menu-item btn-publicar-examen" data-id="${ex.id}">${I('send')} Publicar</button>`}
              <hr class="examen-card__menu-sep">
              ${peligroItems.map(i => `<button class="examen-card__menu-item examen-card__menu-item--peligro ${i.clase}" data-id="${ex.id}" data-titulo="${_esc(ex.titulo)}">${I(i.icono)} ${i.texto}</button>`).join('')}
            </div>
          </div>`;
      }

      // Student footer
      const footerEstudiante = (!esProfesor && accionEstudiante)
        ? `<div class="examen-card__footer"><span class="u-fs-xs u-color-texto-terciario">${ex.fecha_limite ? I('calendar') + ' Límite: ' + window.helpers.formatearFecha(ex.fecha_limite) : ''}</span>${accionEstudiante}</div>`
        : '';

      return `
        <div class="examen-card" data-examen="${ex.id}">
          <div class="examen-card__cuerpo">
            <div class="examen-card__header">
              <div class="examen-card__info">
                <h3 class="examen-card__titulo">
                  ${ex.icono || '📘'} ${_esc(ex.titulo)}
                  <span class="examen-card__badge ${badge.clase}">${I(badge.icono)} ${badge.texto}</span>
                </h3>
                ${ex.descripcion ? `<p class="examen-card__desc">${_esc(ex.descripcion)}</p>` : ''}
              </div>
              ${menuHtml}
            </div>
            ${statsHtml}
          </div>
          ${footerHtml}
          ${footerEstudiante}
        </div>`;
    },

    _conectarEventos(raiz) {
      const esProfesor = this._esProfesor;

      // Student
      raiz.querySelectorAll('.btn-iniciar-examen').forEach(btn => { btn.onclick = () => router.navegar('/tomar/' + btn.dataset.id); });
      raiz.querySelectorAll('.btn-ver-resultados-alumno').forEach(btn => { btn.onclick = () => router.navegar('/tomar/' + btn.dataset.id); });

      // Teacher: Corrección
      raiz.querySelectorAll('.btn-corregir-examen').forEach(btn => { btn.onclick = () => router.navegar('/corregir/' + btn.dataset.id); });

      // Teacher: Editar
      raiz.querySelectorAll('.btn-editar-examen').forEach(btn => { btn.onclick = () => router.navegar('/editor/' + btn.dataset.id); });

      // Teacher: Publicar
      raiz.querySelectorAll('.btn-publicar-examen').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar('Los alumnos podrán ver y realizar este examen.', { titulo: '¿Publicar este examen?', textoConfirmar: 'Publicar' });
          if (!ok) return;
          try {
            await window.examenesRepository.publicar(btn.dataset.id);
            window.helpers.mostrarAlerta('Examen publicado.', 'exito');
            router._ejecutar();
          } catch (e) { window.helpers.mostrarAlerta('Error al publicar: ' + e.message, 'error'); }
        };
      });

      // Teacher: Duplicar
      raiz.querySelectorAll('.btn-duplicar-examen').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar(`Se creará una copia del examen "${btn.dataset.titulo}".`, { titulo: '¿Duplicar examen?', textoConfirmar: 'Duplicar' });
          if (!ok) return;
          try {
            const original = await window.examenesRepository.obtener(btn.dataset.id);
            if (!original) throw new Error('No se pudo cargar el examen');
            const copia = { ...original, id: undefined, titulo: `Copia de ${original.titulo}`, publicado: false, estado: 'borrador', creado_en: undefined, actualizado_en: undefined };
            await window.examenesRepository.guardar(copia);
            window.helpers.mostrarAlerta('Examen duplicado.', 'exito');
            router._ejecutar();
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      // Teacher: Eliminar
      raiz.querySelectorAll('.btn-eliminar-examen').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar(`Se eliminará "${btn.dataset.titulo}" y todos los intentos. Esta acción no se puede deshacer.`, { titulo: '¿Eliminar examen?', textoConfirmar: 'Eliminar' });
          if (!ok) return;
          try {
            await window.examenesRepository.eliminar(btn.dataset.id);
            window.helpers.mostrarAlerta('Examen eliminado.', 'exito');
            router._ejecutar();
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      // Teacher: Compartir
      raiz.querySelectorAll('.btn-compartir-examen').forEach(btn => {
        btn.onclick = () => this._compartir(btn.dataset.id, btn.dataset.titulo);
      });

      // Teacher: Ver alumnos (nuevo modal)
      raiz.querySelectorAll('.btn-ver-alumnos-examen').forEach(btn => {
        btn.onclick = () => this._modalAlumnosEstado(btn.dataset.id, btn.dataset.titulo);
      });

      // Menu toggles
      raiz.querySelectorAll('.examen-menu-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const menu = btn.nextElementSibling;
          const abierto = menu.classList.contains('examen-card__menu--abierto');
          raiz.querySelectorAll('.examen-card__menu--abierto').forEach(m => m.classList.remove('examen-card__menu--abierto'));
          raiz.querySelectorAll('.examen-menu-toggle').forEach(t => t.setAttribute('aria-expanded', 'false'));
          if (!abierto) {
            menu.classList.add('examen-card__menu--abierto');
            btn.setAttribute('aria-expanded', 'true');
          }
        });
      });

      // Close menus on outside click
      if (!this._closeMenusHandler) {
        this._closeMenusHandler = (e) => {
          if (!e.target.closest('.examen-card__menu-wrap')) {
            const lista = document.querySelector('#listaExamenes');
            if (lista) {
              lista.querySelectorAll('.examen-card__menu--abierto').forEach(m => m.classList.remove('examen-card__menu--abierto'));
              lista.querySelectorAll('.examen-menu-toggle').forEach(t => t.setAttribute('aria-expanded', 'false'));
            }
          }
        };
        document.addEventListener('click', this._closeMenusHandler);
      }
      this._cleanup = () => {
        if (this._closeMenusHandler) {
          document.removeEventListener('click', this._closeMenusHandler);
          this._closeMenusHandler = null;
        }
      };
    },

    _modalAlumnosEstado(examenId, titulo) {
      const ints = this._intentosGrupo.filter(i => i.examen_id === examenId);
      const alumnoIds = new Set(this._alumnos.map(a => a.id));
      const hechoIds = new Set(ints.filter(i => (i.estado === 'completado' || i.estado === 'calificado') && alumnoIds.has(i.alumno_id)).map(i => i.alumno_id));
      const total = this._alumnos.length;
      const hechos = hechoIds.size;
      const pendientes = total - hechos;

      const filas = this._alumnos.map(a => {
        const hecho = hechoIds.has(a.id);
        return `
          <div class="examen-alumno-fila">
            <div class="examen-alumno-fila__avatar">
              ${a.foto_perfil ? `<img src="${_esc(a.foto_perfil)}" alt="">` : (a.nombre_completo || a.username || '?').charAt(0).toUpperCase()}
            </div>
            <div class="examen-alumno-fila__info">
              <div class="examen-alumno-fila__nombre">${_esc(a.nombre_completo || a.username)}</div>
              ${a.username && a.nombre_completo !== a.username ? `<div class="examen-alumno-fila__username">@${_esc(a.username)}</div>` : ''}
            </div>
            <span class="examen-alumno-fila__estado ${hecho ? 'examen-alumno-fila__estado--hecho' : 'examen-alumno-fila__estado--pendiente'}">${hecho ? I('check-circle') + ' Hecho' : I('circle') + ' Pendiente'}</span>
          </div>`;
      }).join('');

      const overlay = document.createElement('div');
      overlay.className = 'examen-alumnos-modal';
      overlay.innerHTML = `
        <div class="examen-alumnos-modal__backdrop"></div>
        <div class="examen-alumnos-modal__contenido">
          <div class="examen-alumnos-modal__handle"></div>
          <div class="examen-alumnos-modal__header">
            <h3 class="examen-alumnos-modal__titulo">${I('users')} Alumnos · ${_esc(titulo)}</h3>
            <button class="examen-alumnos-modal__cerrar" id="btnCerrarAlumnos" aria-label="Cerrar">✕</button>
          </div>
          <div class="examen-alumnos-modal__resumen">
            <span class="examen-alumnos-modal__resumen-badge examen-alumnos-modal__resumen-badge--hecho">${I('check-circle')} ${hechos} hecho${hechos !== 1 ? 's' : ''}</span>
            <span class="examen-alumnos-modal__resumen-badge examen-alumnos-modal__resumen-badge--pendiente">${I('circle')} ${pendientes} pendiente${pendientes !== 1 ? 's' : ''}</span>
          </div>
          <div class="examen-alumnos-modal__lista">
            ${filas || '<p class="u-color-texto-terciario u-fs-sm" style="padding:var(--espaciado-md);text-align:center">No hay alumnos en el grupo.</p>'}
          </div>
        </div>`;

      document.body.appendChild(overlay);
      window.Iconos.actualizar();

      const cerrar = () => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 200ms ease';
        setTimeout(() => overlay.remove(), 200);
      };
      overlay.querySelector('#btnCerrarAlumnos').onclick = cerrar;
      overlay.querySelector('.examen-alumnos-modal__backdrop').onclick = cerrar;
      overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
    },

    _compartir(examenId, titulo) {
      const base = (window.location.origin + window.location.pathname).replace(/index\.html$/, '');
      const url = base + '#!/tomar/' + examenId;
      const mensaje = '📝 ' + (titulo || 'Examen') + '\n\nRealiza tu examen aquí:\n' + url;
      const waUrl = 'https://wa.me/?text=' + encodeURIComponent(mensaje);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          window.helpers.mostrarAlerta('Enlace copiado. Se abre WhatsApp.', 'info');
          window.open(waUrl, '_blank');
        }).catch(() => { window.open(waUrl, '_blank'); });
      } else {
        window.open(waUrl, '_blank');
      }
    }
  };
})();
