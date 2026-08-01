(function() {
  'use strict';

  const ESTADO_BADGES = {
    'borrador': { clase: 'examen-badge--borrador', texto: 'Borrador', icono: 'file-edit' },
    'publicado': { clase: 'examen-badge--publicado', texto: 'Publicado', icono: 'send' },
    'cerrado': { clase: 'examen-badge--cerrado', texto: 'Cerrado', icono: 'lock' },
    'archivado': { clase: 'examen-badge--archivado', texto: 'Archivado', icono: 'archive' }
  };

  window.vistaExamenes = {
    _cleanup: null,
    _filtroActivo: 'todos',

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

        raiz.innerHTML = `
          <style>
            .examen-menu-wrap { position:relative; }
            .examen-menu { display:none; position:absolute; right:0; top:100%; margin-top:4px; background:var(--color-fondo-tarjeta); border:1px solid var(--color-borde); border-radius:var(--radio-md); box-shadow:var(--sombra-lg); min-width:180px; z-index:50; overflow:hidden; animation: examen-menu-in 150ms var(--easing-apple); }
            @keyframes examen-menu-in { from { opacity:0; transform:translateY(-4px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
            .examen-menu--abierto { display:block; }
            .examen-menu-item { display:flex; align-items:center; gap:var(--espaciado-xs); width:100%; padding:var(--espaciado-xs) var(--espaciado-sm); background:none; border:none; cursor:pointer; font:inherit; font-size:var(--texto-sm); color:var(--color-texto); text-align:left; min-height:var(--toque-minimo); }
            .examen-menu-item:hover { background:var(--color-fondo-alt); }
            .examen-menu-item--peligro { color:var(--color-error); }
            .examen-menu-sep { margin:0; border:none; border-top:1px solid var(--color-borde); }
            .examen-badge { display:inline-flex; align-items:center; gap:4px; font-size:var(--texto-xs); padding:2px var(--espaciado-xs); border-radius:var(--radio-pill); font-weight:600; }
            .examen-badge--borrador { background:var(--color-fondo-alt); color:var(--color-texto-terciario); }
            .examen-badge--publicado { background:var(--color-acento-soft); color:var(--color-acento); }
            .examen-badge--cerrado { background:var(--color-aviso-soft); color:var(--color-aviso); }
            .examen-badge--archivado { background:var(--color-fondo-alt); color:var(--color-texto-terciario); }
            .examen-badge--en-progreso { background:var(--color-acento-soft); color:var(--color-acento); }
            .examen-badge--calificado { background:var(--color-exito-soft); color:var(--color-exito); }
            .examen-badge--pendiente { background:var(--color-aviso-soft); color:var(--color-aviso); }
            .examen-badge--disponible { background:var(--color-acento-soft); color:var(--color-acento); }
            .examen-filtro { display:flex; gap:var(--espaciado-xxs); overflow-x:auto; padding:var(--espaciado-xs) 0; -webkit-overflow-scrolling:touch; }
            .examen-filtro-btn { flex-shrink:0; padding:var(--espaciado-xxs) var(--espaciado-sm); border:1px solid var(--color-borde); border-radius:var(--radio-pill); background:var(--color-fondo); font-size:var(--texto-xs); cursor:pointer; transition:all var(--transicion-rapida); white-space:nowrap; }
            .examen-filtro-btn:hover { border-color:var(--color-acento); }
            .examen-filtro-btn--activa { background:var(--color-acento); color:var(--color-fondo); border-color:var(--color-acento); }
          </style>
          <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
            <div class="o-flecha o-flecha--between o-flecha--wrap" style="gap:var(--espaciado-sm)">
              <h2>${window.Iconos.render('clipboard-check')} Exámenes <button class="info-ayuda" data-guia="examenes" aria-label="Guía de Exámenes">i</button></h2>
              <div class="o-flecha" style="gap:var(--espaciado-xs)">
                ${esProfesor ? '<button class="btn-secundario" id="btnCalificaciones">Notas</button>' : ''}
                ${esProfesor ? '<button class="btn-primario" id="btnNuevoExamen">+ Nuevo</button>' : ''}
              </div>
            </div>
            <div class="examen-filtro" id="filtroExamenes" role="tablist" aria-label="Filtrar exámenes"></div>
            <div class="notas-buscar" style="position:relative">
              <span style="position:absolute;left:var(--espaciado-sm);top:50%;transform:translateY(-50%);color:var(--color-texto-terciario);display:flex">${window.Iconos.render('search')}</span>
              <input type="text" id="buscarExamen" placeholder="Buscar por título..." style="width:100%;padding-left:2.2rem">
            </div>
            <div id="listaExamenes" class="o-pila" style="gap:var(--espaciado-md)"></div>
            <div id="listaExamenesVacia" class="empty-state empty-state--compacto" style="display:none">
              <div class="empty-state__icono">${window.Iconos.render('clipboard-check')}</div>
              <p class="empty-state__descripcion" id="textoVacio">No hay exámenes que coincidan con tu búsqueda.</p>
            </div>
          </div>`;

        if (esProfesor) {
          raiz.querySelector('#btnNuevoExamen').onclick = () => router.navegar('/editor/nuevo');
          raiz.querySelector('#btnCalificaciones').onclick = () => router.navegar('/calificaciones');
        }
        window.helpers.registrarGuias(raiz, {
          examenes: ['Exámenes', esProfesor
            ? 'Aquí puedes crear, publicar y revisar exámenes para tus alumnos. Cada tarjeta muestra su estado, alumnos asignados y acciones disponibles.'
            : 'Aquí aparecen los exámenes disponibles para ti. Puedes empezar uno nuevo, continuar uno en progreso o revisar si ya fue calificado.',
            esProfesor ? 'Usa "+ Nuevo" para crear un examen y "Notas" para revisar resultados.' : 'Toca un examen publicado para responderlo.']
        });

        this._examenes = examenes;
        this._misIntentos = misIntentos;
        this._esProfesor = esProfesor;

        const filtroCont = raiz.querySelector('#filtroExamenes');
        const filtros = this._obtenerFiltros(esProfesor);
        filtroCont.innerHTML = filtros.map(f =>
          `<button class="examen-filtro-btn${f.id === this._filtroActivo ? ' examen-filtro-btn--activa' : ''}" data-filtro="${f.id}" role="tab" aria-selected="${f.id === this._filtroActivo}">${f.etiqueta}</button>`
        ).join('');
        filtroCont.querySelectorAll('[data-filtro]').forEach(btn => {
          btn.onclick = () => {
            if (this._cleanup) this._cleanup();
            this._filtroActivo = btn.dataset.filtro;
            filtroCont.querySelectorAll('.examen-filtro-btn--activa').forEach(b => { b.classList.remove('examen-filtro-btn--activa'); b.setAttribute('aria-selected', 'false'); });
            btn.classList.add('examen-filtro-btn--activa');
            btn.setAttribute('aria-selected', 'true');
            this._renderizarLista();
          };
        });

        const buscarInput = raiz.querySelector('#buscarExamen');
        buscarInput.addEventListener('input', () => {
          if (this._timerBusqueda) clearTimeout(this._timerBusqueda);
          this._timerBusqueda = setTimeout(() => this._renderizarLista(), 200);
        });

        this._renderizarLista();
        this._notificarExamenesNuevos(examenes, esProfesor);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },

    _obtenerFiltros(esProfesor) {
      if (esProfesor) {
        return [
          { id: 'todos', etiqueta: 'Todos' },
          { id: 'publicados', etiqueta: 'Publicados' },
          { id: 'borradores', etiqueta: 'Borradores' },
        ];
      }
      return [
        { id: 'todos', etiqueta: 'Todos' },
        { id: 'disponibles', etiqueta: 'Disponibles' },
        { id: 'progreso', etiqueta: 'En progreso' },
        { id: 'completados', etiqueta: 'Completados' },
      ];
    },

    _renderizarLista() {
      const { _examenes, _misIntentos, _esProfesor, _filtroActivo } = this;
      const raiz = document.querySelector('#listaExamenes');
      if (!raiz) return;
      const vacioDiv = document.querySelector('#listaExamenesVacia');
      const textoVacio = vacioDiv?.querySelector('#textoVacio');
      const buscarVal = (document.querySelector('#buscarExamen')?.value || '').toLowerCase().trim();

      let filtrados = _examenes.filter(ex => {
        if (buscarVal && !ex.titulo.toLowerCase().includes(buscarVal)) return false;
        if (_filtroActivo === 'todos') return true;
        const miIntento = _misIntentos.find(i => i.examen_id === ex.id);
        if (_esProfesor) {
          if (_filtroActivo === 'publicados') return ex.publicado;
          if (_filtroActivo === 'borradores') return !ex.publicado;
          return true;
        }
        if (_filtroActivo === 'disponibles') {
          return ex.publicado && (!miIntento || miIntento.estado === 'en_progreso');
        }
        if (_filtroActivo === 'progreso') {
          return miIntento && miIntento.estado === 'en_progreso';
        }
        if (_filtroActivo === 'completados') {
          return miIntento && (miIntento.estado === 'completado' || miIntento.estado === 'calificado');
        }
        return true;
      });

      filtrados.sort((a, b) => new Date(b.creado_en || 0) - new Date(a.creado_en || 0));

      if (filtrados.length === 0) {
        raiz.innerHTML = '';
        if (vacioDiv) vacioDiv.style.display = '';
        if (textoVacio) {
          textoVacio.textContent = buscarVal ? `Sin resultados para "${buscarVal}"` : 'No hay exámenes en esta categoría';
        }
        return;
      }
      if (vacioDiv) vacioDiv.style.display = 'none';

      raiz.innerHTML = filtrados.map(ex => this._tarjetaExamen(ex, _misIntentos, _esProfesor)).join('');
      this._conectarEventos(raiz.parentElement, raiz, this._examenes, this._esProfesor);
      window.Iconos.actualizar();
    },

    _notificarExamenesNuevos(examenes, esProfesor) {
      if (esProfesor) return;
      try {
        const vistos = new Set(JSON.parse(localStorage.getItem('fb_examenes_vistos') || '[]'));
        const nuevos = examenes.filter(ex => ex.publicado && !vistos.has(ex.id));
        if (nuevos.length > 0 && window.notifications) {
          window.notifications.notificarExamen(nuevos[0].titulo, nuevos[0].id);
        }
        const todos = new Set(examenes.map(ex => ex.id));
        localStorage.setItem('fb_examenes_vistos', JSON.stringify([...todos]));
      } catch (e) {}
    },

    desmontar() {
      if (this._cleanup) { this._cleanup(); this._cleanup = null; }
      if (this._timerBusqueda) { clearTimeout(this._timerBusqueda); this._timerBusqueda = null; }
    },

    _tarjetaExamen(ex, misIntentos, esProfesor) {
      const miIntento = misIntentos.find(i => i.examen_id === ex.id);
      const calif = miIntento && miIntento.corregido ? miIntento.nota : null;
      const enProgreso = miIntento && miIntento.estado === 'en_progreso';
      const completado = miIntento && (miIntento.estado === 'completado' || miIntento.estado === 'calificado');

      // Student-facing status
      let badgeEstado;
      if (esProfesor) {
        badgeEstado = ESTADO_BADGES[ex.estado || (ex.publicado ? 'publicado' : 'borrador')] || ESTADO_BADGES['borrador'];
      } else if (completado) {
        badgeEstado = miIntento.corregido
          ? { clase: 'examen-badge--calificado', texto: 'Calificado', icono: 'check-circle' }
          : { clase: 'examen-badge--pendiente', texto: 'Pendiente', icono: 'clock' };
      } else if (enProgreso) {
        badgeEstado = { clase: 'examen-badge--en-progreso', texto: 'En progreso', icono: 'loader' };
      } else {
        badgeEstado = { clase: 'examen-badge--disponible', texto: 'Disponible', icono: 'circle' };
      }

      // Tiempo relativo para última modificación
      const obtenerTiempoRelativo = (fechaStr) => {
        if (!fechaStr) return 'Recientemente';
        try {
          const diff = Date.now() - new Date(fechaStr).getTime();
          const mins = Math.floor(diff / 60000);
          if (mins < 1) return 'Hace unos momentos';
          if (mins < 60) return `Hace ${mins} min`;
          const horas = Math.floor(mins / 60);
          if (horas < 24) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
          const dias = Math.floor(horas / 24);
          if (dias < 30) return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
          return window.helpers.formatearFecha(fechaStr);
        } catch (e) {
          return 'Recientemente';
        }
      };

      const tiempoMod = obtenerTiempoRelativo(ex.actualizado_en || ex.creado_en);

        // Stats for teachers (Google Forms Style)
        let stats = '';
        if (esProfesor) {
          const ints = this._intentosGrupo.filter(i => i.examen_id === ex.id);
          const totalAsignados = this._alumnos.length; // total alumnos en el grupo
          const hechos = ints.filter(i => i.estado === 'completado' || i.estado === 'calificado').length;
          const enProceso = ints.filter(i => i.estado === 'en_progreso').length;
          const pend = Math.max(0, totalAsignados - hechos);
          stats = `
            <div class="u-mt-1 u-fs-xs u-color-texto-secundario" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:6px 12px; margin-top:var(--espaciado-xs)" title="Resumen de participación del grupo">
              <span style="display:flex; align-items:center; gap:4px" title="Alumnos asignados al grupo">${window.Iconos.render('users')} <b>${totalAsignados}</b> alumnos</span>
              <span style="display:flex; align-items:center; gap:4px; color:var(--color-exito)" title="Respuestas recibidas">${window.Iconos.render('check-circle')} <b>${hechos}</b> respondieron</span>
              <span style="display:flex; align-items:center; gap:4px; color:var(--color-aviso)" title="Respuestas pendientes">${window.Iconos.render('clock')} <b>${pend}</b> pendientes</span>
              <span style="display:flex; align-items:center; gap:4px; color:var(--color-texto-terciario)" title="Última modificación">${window.Iconos.render('save')} Modificado ${tiempoMod}</span>
            </div>`;
        }


      // Teacher menu
      let menuProfesor = '';
      if (esProfesor) {
        const items = [];
        items.push(`<button class="examen-menu-item btn-editar-examen" data-id="${ex.id}">${window.Iconos.render('edit')} Editar</button>`);
        items.push(`<button class="examen-menu-item btn-duplicar-examen" data-id="${ex.id}" data-titulo="${window.helpers.escapeHtml(ex.titulo)}">${window.Iconos.render('copy')} Duplicar</button>`);
        items.push(`<button class="examen-menu-item btn-gestionar-alumnos" data-id="${ex.id}">${window.Iconos.render('users')} Gestionar alumnos</button>`);
        
        if (ex.publicado) {
          items.push(`<button class="examen-menu-item btn-compartir-examen" data-id="${ex.id}" data-titulo="${window.helpers.escapeHtml(ex.titulo)}">${window.Iconos.render('share-2')} Compartir</button>`);
          items.push(`<button class="examen-menu-item btn-ver-resultados" data-id="${ex.id}">${window.Iconos.render('bar-chart-2')} Respuestas</button>`);
        } else {
          items.push(`<button class="examen-menu-item btn-publicar-examen" data-id="${ex.id}">${window.Iconos.render('send')} Publicar</button>`);
        }

        if (ex.estado === 'archivado') {
          items.push(`<button class="examen-menu-item btn-desarchivar-examen" data-id="${ex.id}">${window.Iconos.render('arrow-up-circle')} Desarchivar</button>`);
        } else {
          items.push(`<button class="examen-menu-item btn-archivar-examen" data-id="${ex.id}">${window.Iconos.render('archive')} Archivar</button>`);
        }

        items.push(`<hr class="examen-menu-sep">`);
        items.push(`<button class="examen-menu-item examen-menu-item--peligro btn-eliminar-examen" data-id="${ex.id}" data-titulo="${window.helpers.escapeHtml(ex.titulo)}">${window.Iconos.render('trash-2')} Eliminar</button>`);
        menuProfesor = `
          <div class="examen-menu-wrap">
            <button class="btn-secundario examen-menu-toggle" aria-label="Más opciones" aria-expanded="false" style="font-size:var(--texto-lg);font-weight:700;min-width:32px;height:32px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:var(--radio-pill)">⋮</button>
            <div class="examen-menu">${items.join('')}</div>
          </div>`;
      }

      const colorExamen = ex.color || 'var(--color-acento)';

        return `<div class="tarjeta-capitulo ${enProgreso ? 'tarjeta-capitulo--en-progreso' : ''}" data-examen="${ex.id}" style="border-left: 5px solid ${colorExamen}; padding: var(--espaciado-md); background: var(--color-fondo-tarjeta); box-shadow: var(--sombra-sm); border-radius: var(--radio-md)" title="Examen: ${window.helpers.escapeHtml(ex.titulo)}">
          <div class="o-flecha o-flecha--between" style="align-items:flex-start">
            <div style="flex:1;min-width:0;padding-right:var(--espaciado-xs)">
              <div class="o-flecha" style="gap:var(--espaciado-xs);align-items:center;flex-wrap:wrap">
                <span class="u-fw-600 u-texto-lg" style="display:flex;align-items:center;gap:6px">${ex.icono ? `<span class="examen-icono-badge">${ex.icono}</span>` : '📘'} ${window.helpers.escapeHtml(ex.titulo)}</span>
                <span class="examen-badge ${badgeEstado.clase}" title="Estado: ${badgeEstado.texto}">${window.Iconos.render(badgeEstado.icono)} ${badgeEstado.texto}</span>
              </div>

            ${ex.descripcion ? `<p class="u-fs-sm u-color-texto-secundario u-mt-1" style="display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden">${window.helpers.escapeHtml(ex.descripcion)}</p>` : ''}
            ${ex.materia || ex.tema ? `<div class="o-flecha u-mt-1" style="gap:var(--espaciado-xxs);flex-wrap:wrap">
              ${ex.materia ? `<span class="u-fs-xs u-color-texto-terciario" style="background:var(--color-fondo-alt);padding:2px 8px;border-radius:var(--radio-pill)">${window.helpers.escapeHtml(ex.materia)}</span>` : ''}
              ${ex.tema ? `<span class="u-fs-xs u-color-texto-terciario" style="background:var(--color-fondo-alt);padding:2px 8px;border-radius:var(--radio-pill)">${window.helpers.escapeHtml(ex.tema)}</span>` : ''}
            </div>` : ''}
          </div>
          ${menuProfesor}
        </div>
        ${stats ? `<div class="u-mt-1" style="border-top: 1px solid var(--color-borde); padding-top: var(--espaciado-xs)">${stats}</div>` : ''}
        <div class="o-flecha o-flecha--between u-mt-2" style="align-items:center">
          <span class="u-fs-xs u-color-texto-terciario">${ex.fecha_limite ? window.Iconos.render('calendar') + ' Límite: ' + window.helpers.formatearFecha(ex.fecha_limite) : ''}</span>
          <div class="o-flecha" style="gap:var(--espaciado-xs);align-items:center">
            ${calif !== null ? `<span class="u-fw-700 u-fs-lg" style="color:${calif >= 7 ? 'var(--color-exito)' : 'var(--color-error)'}">${calif}</span>` : ''}
            ${ex.publicado && !completado ? `<button class="btn-primario btn-iniciar-examen" data-id="${ex.id}" style="font-size:var(--texto-xs)">${enProgreso ? 'Continuar' : 'Comenzar'}</button>` : ''}
            ${completado ? `<button class="btn-secundario btn-ver-resultados-alumno" data-id="${ex.id}" style="font-size:var(--texto-xs)">Ver resultados</button>` : ''}
          </div>
        </div>
      </div>`;
    },

    _conectarEventos(raiz, cont, examenes, esProfesor) {
      // Student actions
      cont.querySelectorAll('.btn-iniciar-examen').forEach(btn => { btn.onclick = () => router.navegar('/tomar/' + btn.dataset.id); });
      cont.querySelectorAll('.btn-ver-resultados-alumno').forEach(btn => { btn.onclick = () => router.navegar('/tomar/' + btn.dataset.id); });

      // Teacher actions
      cont.querySelectorAll('.btn-editar-examen').forEach(btn => { btn.onclick = () => router.navegar('/editor/' + btn.dataset.id); });
      cont.querySelectorAll('.btn-ver-resultados').forEach(btn => { btn.onclick = () => router.navegar('/editor/' + btn.dataset.id + '?pestana=respuestas'); });

      cont.querySelectorAll('.btn-publicar-examen').forEach(btn => {
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

      cont.querySelectorAll('.btn-duplicar-examen').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar(`Se creará una copia idéntica del examen "${btn.dataset.titulo}".`, { titulo: '¿Duplicar examen?', textoConfirmar: 'Duplicar' });
          if (!ok) return;
          try {
            const original = await window.examenesRepository.obtener(btn.dataset.id);
            if (!original) throw new Error('No se pudo cargar el examen original');
            
            // Crear copia sin ID para que inserte uno nuevo
            const copia = {
              ...original,
              id: undefined,
              titulo: `Copia de ${original.titulo}`,
              publicado: false,
              estado: 'borrador',
              creado_en: undefined,
              actualizado_en: undefined
            };

            await window.examenesRepository.guardar(copia);
            window.helpers.mostrarAlerta('Examen duplicado correctamente.', 'exito');
            router._ejecutar();
          } catch (e) { window.helpers.mostrarAlerta('Error al duplicar: ' + e.message, 'error'); }
        };
      });

      cont.querySelectorAll('.btn-archivar-examen').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar('El examen se archivará y dejará de estar visible para los alumnos.', { titulo: '¿Archivar examen?', textoConfirmar: 'Archivar' });
          if (!ok) return;
          try {
            const examen = await window.examenesRepository.obtener(btn.dataset.id);
            examen.estado = 'archivado';
            examen.publicado = false;
            await window.examenesRepository.guardar(examen);
            window.helpers.mostrarAlerta('Examen archivado.', 'exito');
            router._ejecutar();
          } catch (e) { window.helpers.mostrarAlerta('Error al archivar: ' + e.message, 'error'); }
        };
      });

      cont.querySelectorAll('.btn-desarchivar-examen').forEach(btn => {
        btn.onclick = async () => {
          try {
            const examen = await window.examenesRepository.obtener(btn.dataset.id);
            examen.estado = 'borrador'; // Vuelve a borrador para que el profesor decida cuándo publicar
            examen.publicado = false;
            await window.examenesRepository.guardar(examen);
            window.helpers.mostrarAlerta('Examen desarchivado (guardado como borrador).', 'exito');
            router._ejecutar();
          } catch (e) { window.helpers.mostrarAlerta('Error al desarchivar: ' + e.message, 'error'); }
        };
      });

      cont.querySelectorAll('.btn-eliminar-examen').forEach(btn => {
        btn.onclick = async () => {
          const ok = await window.helpers.confirmar(
            `Se eliminará el examen "${btn.dataset.titulo}" y todos los intentos de los alumnos asociados. Esta acción no se puede deshacer.`,
            { titulo: '¿Eliminar examen?', textoConfirmar: 'Sí, eliminar' }
          );
          if (!ok) return;
          try {
            await window.examenesRepository.eliminar(btn.dataset.id);
            window.helpers.mostrarAlerta('Examen eliminado.', 'exito');
            router._ejecutar();
          } catch (e) { window.helpers.mostrarAlerta('Error al eliminar: ' + e.message, 'error'); }
        };
      });

      cont.querySelectorAll('.btn-gestionar-alumnos').forEach(btn => {
        btn.onclick = () => this._modalGestionarAlumnos(raiz, btn.dataset.id);
      });

      cont.querySelectorAll('.btn-compartir-examen').forEach(btn => {
        btn.onclick = () => this._compartir(btn.dataset.id, btn.dataset.titulo);
      });

      // Menu toggles
      cont.querySelectorAll('.examen-menu-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const menu = btn.nextElementSibling;
          const abierto = menu.classList.contains('examen-menu--abierto');
          cont.querySelectorAll('.examen-menu--abierto').forEach(m => m.classList.remove('examen-menu--abierto'));
          cont.querySelectorAll('.examen-menu-toggle').forEach(t => t.setAttribute('aria-expanded', 'false'));
          if (!abierto) {
            menu.classList.add('examen-menu--abierto');
            btn.setAttribute('aria-expanded', 'true');
          }
        });
      });

      // Close menus on outside click (with cleanup) — sin fugas: se reutiliza
      // el mismo handler si esta vista ya lo registró antes.
      if (!this._closeMenusHandler) {
        this._closeMenusHandler = (e) => {
          if (!e.target.closest('.examen-menu-wrap')) {
            const lista = document.querySelector('#listaExamenes');
            if (lista) {
              lista.querySelectorAll('.examen-menu--abierto').forEach(m => m.classList.remove('examen-menu--abierto'));
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

    _modalGestionarAlumnos(raiz, examenId) {
      const asignados = new Set((this._intentosGrupo || []).filter(i => i.examen_id === examenId).map(i => i.alumno_id));
      const lista = this._alumnos.map(a => `
        <label class="o-flecha" style="gap:var(--espaciado-sm);cursor:pointer;padding:var(--espaciado-xs);border-radius:var(--radio-sm);border:1px solid var(--color-borde);min-height:var(--toque-minimo);align-items:center">
          <input type="checkbox" class="alumno-check" value="${a.id}" ${asignados.has(a.id) ? 'checked disabled' : ''}>
          <span class="u-fs-sm">${window.helpers.escapeHtml(a.nombre_completo || a.username)}</span>
          ${asignados.has(a.id) ? '<span class="u-fs-xs u-color-texto-terciario" style="margin-left:auto">Asignado</span>' : ''}
        </label>`).join('');

      const contenido = `
        <p class="u-fs-xs u-color-texto-secundario">Marca los alumnos que quieras añadir. Los ya asignados no se pueden quitar desde aquí.</p>
        <div class="o-pila u-mt-2" style="gap:var(--espaciado-xs);max-height:50vh;overflow-y:auto">${lista || '<p class="u-color-texto-terciario">No hay alumnos en el grupo.</p>'}</div>`;

      // Use shared modal system
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title-alumnos">
          <div class="o-flecha o-flecha--between" style="margin-bottom:var(--espaciado-sm)">
            <h3 id="modal-title-alumnos">Gestionar alumnos</h3>
            <button class="btn-secundario btn-icono" id="btnCerrarModal" aria-label="Cerrar">${window.Iconos.render('x')}</button>
          </div>
          ${contenido}
          <div class="o-flecha" style="justify-content:flex-end;gap:var(--espaciado-xs);margin-top:var(--espaciado-md)">
            <button class="btn-secundario" id="btnCerrarModal2">Cancelar</button>
            <button class="btn-primario" id="btnAñadirAlumnos">Añadir seleccionados</button>
          </div>
        </div>`;

      document.body.appendChild(overlay);
      window.Iconos.actualizar();

      const cerrar = () => overlay.remove();
      overlay.querySelector('#btnCerrarModal').onclick = cerrar;
      overlay.querySelector('#btnCerrarModal2').onclick = cerrar;
      overlay.onclick = (e) => { if (e.target === overlay) cerrar(); };

      // Keyboard trap
      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrar();
        if (e.key === 'Tab') {
          const focusables = overlay.querySelectorAll('button, input, [tabindex]');
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });

      overlay.querySelector('#btnAñadirAlumnos').onclick = async () => {
        const ids = Array.from(overlay.querySelectorAll('.alumno-check:checked:not([disabled])')).map(c => c.value);
        if (ids.length === 0) { window.helpers.mostrarAlerta('Marca al menos un alumno para añadir.', 'advertencia'); return; }
        try {
          const n = await window.examenesRepository.asignarAlumnos(examenId, ids);
          window.helpers.mostrarAlerta(n + ' alumno(s) añadido(s).', 'exito');
          cerrar();
          router._ejecutar();
        } catch (err) { window.helpers.mostrarAlerta('Error: ' + err.message, 'error'); }
      };
    },

    _compartir(examenId, titulo) {
      const base = (window.location.origin + window.location.pathname).replace(/index\.html$/, '');
      const url = base + '#!/tomar/' + examenId;
      const mensaje = '📝 ' + (titulo || 'Examen') + '\n\nRealiza tu examen aquí:\n' + url;
      const waUrl = 'https://wa.me/?text=' + encodeURIComponent(mensaje);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          window.helpers.mostrarAlerta('Enlace copiado. Se abre WhatsApp para compartir.', 'info');
          window.open(waUrl, '_blank');
        }).catch(() => { window.open(waUrl, '_blank'); });
      } else {
        window.open(waUrl, '_blank');
      }
    }
  };
})();
