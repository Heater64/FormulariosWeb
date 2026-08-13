(function() {
  'use strict';
  function colorNota(n) {
    if (n == null) return 'var(--color-texto-terciario)';
    return n >= 7 ? 'var(--color-exito)' : 'var(--color-error)';
  }
  function redondear(n) { return Math.round(n * 100) / 100; }

  function pesosEval(evalId) {
    try { return JSON.parse(localStorage.getItem('fb_pesos_eval_' + evalId)) || {}; } catch { return {}; }
  }
  function guardarPesos(evalId, pesos) {
    localStorage.setItem('fb_pesos_eval_' + evalId, JSON.stringify(pesos));
  }
  function mediaPonderada(evalObj, alumnoId, notasPorExamen) {
    const exs = evalObj.examenes || [];
    if (!exs.length) return null;
    const pesos = pesosEval(evalObj.id);
    const tienePesos = exs.some(e => pesos[e.id] != null && pesos[e.id] > 0);
    if (!tienePesos) {
      // Simple average
      const ns = exs.map(e => notasPorExamen[e.id] && notasPorExamen[e.id][alumnoId]).filter(n => n != null);
      return ns.length ? redondear(ns.reduce((s, n) => s + n, 0) / ns.length) : null;
    }
    let sumaPonderada = 0, sumaPesos = 0;
    exs.forEach(e => {
      const nota = notasPorExamen[e.id] && notasPorExamen[e.id][alumnoId];
      const peso = pesos[e.id] || 1;
      if (nota != null) { sumaPonderada += nota * peso; sumaPesos += peso; }
    });
    return sumaPesos > 0 ? redondear(sumaPonderada / sumaPesos) : null;
  }

  window.vistaCalificaciones = {
    async montar(raiz, params) {
      const usuario = store.obtener('usuario');
      if (!usuario || !['admin', 'editor', 'owner'].includes(usuario.rol)) {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p></div>'; return;
      }
      raiz.innerHTML = window.skeleton ? `<div class="o-contenedor u-mt-3">${window.skeleton.tarjetas(6, { ancho: '100%' })}</div>` : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando libro de calificaciones...</p></div>';
      try {
        const grupoId = usuario.grupo_id;
        const [evaluaciones, sueltos, intentos, alumnos] = await Promise.all([
          window.examenesRepository.listarEvaluaciones(grupoId),
          window.examenesRepository.listarExamenesSueltos(grupoId),
          window.examenesRepository.obtenerIntentosGrupo(grupoId),
          window.examenesRepository.obtenerMiembrosGrupo(grupoId, true)
        ]);
        this._renderizar(raiz, { evaluaciones, sueltos, intentos, alumnos, usuario });
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },

    async _renderizar(raiz, ctx) {
      const { evaluaciones, sueltos, intentos, alumnos, usuario } = ctx;

      const notasPorExamen = {};
      intentos.forEach(i => {
        if (i.corregido && i.nota != null) {
          (notasPorExamen[i.examen_id] = notasPorExamen[i.examen_id] || {})[i.alumno_id] = parseFloat(i.nota);
        }
      });

      const mediaEval = (evalObj, alumnoId) => mediaPonderada(evalObj, alumnoId, notasPorExamen);
      const mediaGrupoEval = (evalObj) => {
        const alumnosIds = alumnos.map(a => a.id);
        const ns = alumnosIds.map(aId => mediaPonderada(evalObj, aId, notasPorExamen)).filter(n => n != null);
        return ns.length ? redondear(ns.reduce((s, n) => s + n, 0) / ns.length) : null;
      };

      // Construir grupos (evaluaciones + sueltos)
      const grupos = [];
      evaluaciones.forEach(e => {
        grupos.push({ tipo: 'eval', obj: e, titulo: e.titulo, asignatura: e.asignatura, examenes: e.examenes || [] });
      });
      if (sueltos.length) grupos.push({ tipo: 'sueltos', titulo: 'Sin evaluación', asignatura: '', examenes: sueltos });

      // Pestaña activa (por evaluación o 'todas')
      if (!this._pestanaActiva || !['todas', ...grupos.map(g => g.tipo === 'eval' ? g.obj.id : 'sueltos')].includes(this._pestanaActiva)) {
        this._pestanaActiva = 'todas';
      }

      const tabs = [
        { id: 'todas', titulo: 'Todas' },
        ...grupos.map(g => ({ id: g.tipo === 'eval' ? g.obj.id : 'sueltos', titulo: g.titulo }))
      ];
      const tabsHtml = tabs.map(t => `
        <button class="calif-tab ${this._pestanaActiva === t.id ? 'calif-tab--activo' : ''}" data-eval="${t.id}">${window.helpers.escapeHtml(t.titulo)}</button>
      `).join('');

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <!-- TÍTULO -->
          <h2 class="u-texto-2xl" style="margin:0">${window.Iconos.render('graduation-cap')} Notas</h2>

          <!-- BOTONES BAJO EL TÍTULO -->
          <div class="o-flecha o-flecha--wrap" style="gap:var(--espaciado-xs)">
            <button class="btn-secundario" id="btnVolver">${window.Iconos.render('arrow-left')} Volver</button>
            <div style="position:relative">
              <button class="btn-secundario calif-exportar-btn" data-menu-toggle="menuExportar">${window.Iconos.render('download')} Exportar</button>
              <div class="calif-menu" id="menuExportar" style="position:absolute;left:0;top:100%;margin-top:4px;background:var(--color-fondo-tarjeta);border:1px solid var(--color-borde);border-radius:var(--radio-md);box-shadow:var(--sombra-lg);z-index:50;min-width:150px;padding:var(--espaciado-xxs) 0">
                <button class="calif-menu-item" id="btnExportarCalif" style="width:100%;text-align:left;padding:var(--espaciado-xs) var(--espaciado-sm);background:none;border:none;color:var(--color-texto);cursor:pointer;font:inherit;font-size:var(--texto-sm);display:flex;align-items:center;gap:var(--espaciado-xs)">${window.Iconos.render('download')} CSV</button>
                <button class="calif-menu-item" id="btnExportarPDF" style="width:100%;text-align:left;padding:var(--espaciado-xs) var(--espaciado-sm);background:none;border:none;color:var(--color-texto);cursor:pointer;font:inherit;font-size:var(--texto-sm);display:flex;align-items:center;gap:var(--espaciado-xs)">${window.Iconos.render('file-text')} PDF</button>
              </div>
            </div>
            <button class="btn-secundario" id="btnImportarEvals" title="Importar evaluaciones desde un archivo CSV">${window.Iconos.render('upload')} Importar CSV</button>
            <button class="btn-primario" id="btnCrearEval">+ Crear evaluación</button>
          </div>

          <!-- PESTAÑAS POR EVALUACIÓN -->
          <div class="calif-tabs" role="tablist">
            ${tabsHtml}
          </div>

          <input type="text" id="filtroAlumno" placeholder="Buscar evaluación o alumno..." style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto)">

          ${evaluaciones.length === 0 && sueltos.length === 0
            ? '<div class="empty-state"><div class="empty-state__icono">' + window.Iconos.render('graduation-cap') + '</div><h3 class="empty-state__titulo">Aún no hay evaluaciones ni exámenes</h3><p class="empty-state__descripcion">Crea una evaluación y añade exámenes para empezar a registrar calificaciones.</p></div>'              : alumnos.length === 0
              ? `<div class="empty-state empty-state--compacto"><div class="empty-state__icono">${window.Iconos.render('users')}</div><p class="empty-state__descripcion">No hay alumnos asignados a este grupo.</p></div>`
              : `<div id="califGridContainer">${this._cuadricula({ grupos, activo: this._pestanaActiva, alumnos, notasPorExamen, mediaEval, mediaGrupoEval })}</div>`}
        </div>`;

      window.Iconos.actualizar();
      this._conectarEventos(raiz, { evaluaciones, sueltos, intentos, alumnos, notasPorExamen, usuario, grupos });
    },

    // Cuadrícula tipo Excel: en "Todas" cada evaluación se muestra como un
    // bloque independiente (su propia tabla) apilado verticalmente.
    _cuadricula({ grupos, activo, alumnos, notasPorExamen, mediaEval, mediaGrupoEval }) {
      const visibles = activo === 'todas' ? grupos : grupos.filter(g => (g.tipo === 'eval' ? g.obj.id : 'sueltos') === activo);
      if (!visibles.length) return '';
      const esTodas = activo === 'todas';

      const tablas = visibles.map(g => this._tablaGrupo(g, alumnos, notasPorExamen, mediaEval, mediaGrupoEval));

      return esTodas
        ? tablas.map(t => `<div class="calif-bloque">${t}</div>`).join('')
        : tablas.join('');
    },

    // Tabla completa para una única evaluación (o exámenes sueltos)
    _tablaGrupo(g, alumnos, notasPorExamen, mediaEval, mediaGrupoEval) {
      const conMedia = g.tipo === 'eval' && g.examenes.length > 0;
      const menuId = (id) => 'menu-eval-grid-' + id;

      const mg = g.tipo === 'eval' ? mediaGrupoEval(g.obj) : null;
      const menuBtn = g.tipo === 'eval' ? `
          <div style="position:relative;display:inline-flex">
            <button class="btn-secundario u-fs-xs btn-icono" data-menu-toggle="${menuId(g.obj.id)}" aria-label="Acciones de evaluación" style="min-width:28px;min-height:28px;padding:4px">${window.Iconos.render('more-vertical')}</button>
            <div class="calif-menu" id="${menuId(g.obj.id)}" style="position:absolute;right:0;top:100%;margin-top:4px;background:var(--color-fondo-tarjeta);border:1px solid var(--color-borde);border-radius:var(--radio-md);box-shadow:var(--sombra-lg);z-index:60;min-width:170px;padding:var(--espaciado-xxs) 0">
              <button class="calif-menu-item" data-editar-eval="${g.obj.id}" style="width:100%;text-align:left;padding:var(--espaciado-xs) var(--espaciado-sm);background:none;border:none;color:var(--color-texto);cursor:pointer;font:inherit;font-size:var(--texto-sm);display:flex;align-items:center;gap:var(--espaciado-xs)">${window.Iconos.render('edit-3')} Editar</button>
              <button class="calif-menu-item" data-pesos="${g.obj.id}" style="width:100%;text-align:left;padding:var(--espaciado-xs) var(--espaciado-sm);background:none;border:none;color:var(--color-texto);cursor:pointer;font:inherit;font-size:var(--texto-sm);display:flex;align-items:center;gap:var(--espaciado-xs)">${window.Iconos.render('scale')} Pesos</button>
              <button class="calif-menu-item" data-anadir="${g.obj.id}" style="width:100%;text-align:left;padding:var(--espaciado-xs) var(--espaciado-sm);background:none;border:none;color:var(--color-texto);cursor:pointer;font:inherit;font-size:var(--texto-sm);display:flex;align-items:center;gap:var(--espaciado-xs)">${window.Iconos.render('plus')} Añadir examen</button>
              <button class="calif-menu-item" data-subir-eval="${g.obj.id}" style="width:100%;text-align:left;padding:var(--espaciado-xs) var(--espaciado-sm);background:none;border:none;color:var(--color-texto);cursor:pointer;font:inherit;font-size:var(--texto-sm);display:flex;align-items:center;gap:var(--espaciado-xs)">${window.Iconos.render('arrow-up')} Mover arriba</button>
              <button class="calif-menu-item" data-bajar-eval="${g.obj.id}" style="width:100%;text-align:left;padding:var(--espaciado-xs) var(--espaciado-sm);background:none;border:none;color:var(--color-texto);cursor:pointer;font:inherit;font-size:var(--texto-sm);display:flex;align-items:center;gap:var(--espaciado-xs)">${window.Iconos.render('arrow-down')} Mover abajo</button>
              <div style="height:1px;background:var(--color-borde);margin:var(--espaciado-xxs) 0"></div>
              <button class="calif-menu-item" data-eliminar-eval="${g.obj.id}" data-titulo="${window.helpers.escapeHtml(g.titulo)}" style="width:100%;text-align:left;padding:var(--espaciado-xs) var(--espaciado-sm);background:none;border:none;color:var(--color-error);cursor:pointer;font:inherit;font-size:var(--texto-sm);display:flex;align-items:center;gap:var(--espaciado-xs)">${window.Iconos.render('trash-2')} Eliminar</button>
            </div>
          </div>` : '';

      // Fila 1: grupo (evaluación) con colspan
      const cols = g.examenes.length + (conMedia ? 1 : 0) || 1;
      const filaGrupo = `
        <th colspan="${cols}" class="calif-grid__grupo">
          <div class="o-flecha o-flecha--between" style="gap:var(--espaciado-xs)">
            <span class="calif-grid__grupo-titulo">${window.helpers.escapeHtml(g.titulo)}${g.asignatura ? ` <span class="u-color-texto-terciario u-fw-400">· ${window.helpers.escapeHtml(g.asignatura)}</span>` : ''}</span>
            <span class="o-flecha" style="gap:var(--espaciado-xs);align-items:center">${mg != null ? `<span class="calif-grid__grupo-media">Media: ${mg}</span>` : ''}${menuBtn}</span>
          </div>
        </th>`;

      // Fila 2: exámenes + media (o mensaje si la evaluación no tiene exámenes)
      let filaExamenes;
      if (!g.examenes.length) {
        filaExamenes = `<th class="calif-grid__examen u-color-texto-terciario" style="text-align:center;font-style:italic">Sin exámenes</th>`;
      } else {
        const colsEx = g.examenes.map(x => `
          <th class="calif-grid__examen" style="text-align:center">
            <a class="btn-enlace" data-corregir="${x.id}" title="Ver y corregir">${window.helpers.escapeHtml(x.titulo)}</a>
            <br><button class="btn-enlace u-fs-xs" data-editar-ex="${x.id}">editar</button>
          </th>`).join('');
        filaExamenes = colsEx + (conMedia ? `<th class="calif-grid__media">Media</th>` : '');
      }

      // Cuerpo: un alumno por fila
      const cuerpo = alumnos.map(a => {
        let filaCeldas;
        if (!g.examenes.length) {
          filaCeldas = `<td class="calif-nota-celda u-color-texto-terciario">—</td>`;
        } else {
          const celdasEx = g.examenes.map(x => {
            const m = notasPorExamen[x.id];
            const nota = m ? m[a.id] : undefined;
            return `<td class="calif-nota-celda" style="color:${colorNota(nota)}">${nota != null ? nota : '—'}</td>`;
          }).join('');
          const media = g.tipo === 'eval' ? mediaEval(g.obj, a.id) : null;
          filaCeldas = celdasEx + (conMedia ? `<td class="calif-nota-celda calif-grid__media" style="color:${colorNota(media)}">${media != null ? media : '—'}</td>` : '');
        }
        return `<tr class="fila-alumno">
          <td class="u-fw-600 u-fs-sm">${window.helpers.escapeHtml(window.helpers.nombreAlumno(a))}</td>
          ${filaCeldas}
        </tr>`;
      }).join('');

      return `
        <div class="calif-tabla-desktop calif-grid-wrap">
          <table class="tabla-admin calif-grid">
            <thead>
              <tr><th rowspan="2" class="calif-grid__alumno">Alumno</th>${filaGrupo}</tr>
              <tr>${filaExamenes}</tr>
            </thead>
            <tbody>${cuerpo}</tbody>
          </table>
        </div>`;
    },

    _conectarEventos(raiz, ctx) {
      const { evaluaciones, sueltos, intentos, alumnos, notasPorExamen, usuario, grupos } = ctx;

      raiz.querySelector('#btnVolver').onclick = () => router.navegar('/examenes');

      // Pestañas por evaluación
      raiz.querySelectorAll('.calif-tab').forEach(tab => {
        tab.onclick = () => {
          this._pestanaActiva = tab.getAttribute('data-eval');
          raiz.querySelectorAll('.calif-tab').forEach(t => t.classList.remove('calif-tab--activo'));
          tab.classList.add('calif-tab--activo');
          const cont = raiz.querySelector('#califGridContainer');
          if (cont) {
            const notasPorExamen = {};
            (intentos || []).forEach(i => {
              if (i.corregido && i.nota != null) {
                (notasPorExamen[i.examen_id] = notasPorExamen[i.examen_id] || {})[i.alumno_id] = parseFloat(i.nota);
              }
            });
            const mediaEval = (evalObj, alumnoId) => mediaPonderada(evalObj, alumnoId, notasPorExamen);
            const mediaGrupoEval = (evalObj) => {
              const ns = alumnos.map(aId => mediaPonderada(evalObj, aId, notasPorExamen)).filter(n => n != null);
              return ns.length ? redondear(ns.reduce((s, n) => s + n, 0) / ns.length) : null;
            };
            cont.innerHTML = this._cuadricula({ grupos, activo: this._pestanaActiva, alumnos, notasPorExamen, mediaEval, mediaGrupoEval });
            window.Iconos.actualizar();
            this._conectarGridEventos(raiz, ctx);
            // Re-aplicar el buscador de alumnos tras cambiar de pestaña
            const filtro = raiz.querySelector('#filtroAlumno');
            if (filtro && filtro.value.trim()) this._aplicarFiltroAlumnos(raiz, filtro.value);
          }
        };
      });

      const crearEval = async () => {
        const datos = await window.helpers.formulario({
          titulo: 'Crear evaluación',
          mensaje: 'Define el período de evaluación (ej: 1.ª Evaluación).',
          campos: [
            { nombre: 'titulo', etiqueta: 'Nombre', valor: 'Nueva evaluación', requerido: true, placeholder: '1.ª Evaluación' }
          ],
          textoConfirmar: 'Crear'
        });
        if (!datos) return;
        try {
          // asegurarGrupo devuelve el usuario ACTUALIZADO (con grupo_id recién
          // creado si no tenía); el objeto local `usuario` no se muta, así que
          // hay que usar el retorno o el INSERT iría con grupo_id null y RLS
          // lo denegaría (42501).
          const usuarioActualizado = await window.authRepository.asegurarGrupo(usuario) || usuario;
          await window.examenesRepository.crearEvaluacion({
            grupoId: usuarioActualizado.grupo_id, creadoPor: usuarioActualizado.id,
            titulo: datos.titulo.trim() || 'Nueva evaluación', asignatura: '', descripcion: ''
          });
          window.helpers.mostrarAlerta('Evaluación creada. Ahora añade exámenes.', 'exito');
          router._ejecutar();
        } catch (e) { window.helpers.mostrarAlerta('Error al crear la evaluación: ' + e.message, 'error'); }
      };
      raiz.querySelector('#btnCrearEval').onclick = crearEval;
      const cardCrear = raiz.querySelector('#btnCrearEvalCard');
      if (cardCrear) cardCrear.onclick = crearEval;
      const btnImportar = raiz.querySelector('#btnImportarEvals');
      if (btnImportar) btnImportar.onclick = () => this._importarEvaluacionesCSV(raiz, ctx);

      // Export CSV
      const cerrarMenuExportar = () => {
        this._cerrarMenu(raiz.querySelector('#menuExportar'));
      };
      raiz.querySelector('#btnExportarCalif').onclick = () => {
        cerrarMenuExportar();
        this._exportarCSV(evaluaciones, sueltos, alumnos, notasPorExamen);
      };
      // Export PDF
      raiz.querySelector('#btnExportarPDF').onclick = () => {
        cerrarMenuExportar();
        this._exportarPDF(evaluaciones, sueltos, alumnos, notasPorExamen);
      };

      // Buscador: filtra evaluaciones (pestañas) y alumnos (filas)
      const filtroInput = raiz.querySelector('#filtroAlumno');
      if (filtroInput) {
        let debounceTimer;
        filtroInput.addEventListener('input', () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            this._aplicarBusqueda(raiz, filtroInput.value, ctx);
          }, 200);
        });
      }

      // Conectar eventos del grid (se vuelve a llamar al cambiar de pestaña)
      this._conectarGridEventos(raiz, ctx);

      // Close menus on outside click
      const closeMenus = (e) => {
        if (!e.target.closest('[data-menu-toggle]') && !e.target.closest('.calif-menu')) {
          document.querySelectorAll('.calif-menu--abierto').forEach(m => this._cerrarMenu(m));
        }
      };
      document.addEventListener('click', closeMenus);
      // Los menús abiertos se posicionan en fixed: cerrarlos al hacer scroll o redimensionar.
      // OJO: en emulación móvil, Chrome dispara un evento 'scroll' espurio (delta 0) sobre
      // el contenedor con overflow-x (el grid) justo después de cada tap. Si cerramos en
      // cualquier scroll, el menú se cierra al instante de abrirse. Solo cerramos cuando la
      // posición de scroll cambió de verdad respecto a cuando se abrió el menú.
      const cerrarPorScroll = () => {
        const base = this._scrollBaseAlAbrir;
        let hayMovimiento = base && (window.scrollY !== base.y || window.scrollX !== base.x);
        // Un scroll horizontal real del grid (que sí descoloca el botón bajo el menú
        // fixed) también debe cerrar el menú; el evento espurio trae delta 0 y no cambia
        // la posición de ningún contenedor, así que queda ignorado.
        if (base && base.grids) {
          for (const g of base.grids) {
            if (g.el.scrollLeft !== g.left || g.el.scrollTop !== g.top) { hayMovimiento = true; break; }
          }
        }
        if (base && !hayMovimiento) return;
        document.querySelectorAll('.calif-menu--abierto').forEach(m => this._cerrarMenu(m));
      };
      document.addEventListener('scroll', cerrarPorScroll, true);
      // Resize always closes: the menu's fixed coordinates may go off-screen
      // after a viewport size change, regardless of scroll position.
      const cerrarPorResize = () => document.querySelectorAll('.calif-menu--abierto').forEach(m => this._cerrarMenu(m));
      window.addEventListener('resize', cerrarPorResize);
      // Store cleanup reference
      this._cleanup = () => {
        document.removeEventListener('click', closeMenus);
        document.removeEventListener('scroll', cerrarPorScroll, true);
        window.removeEventListener('resize', cerrarPorResize);
        this._scrollBaseAlAbrir = null;
      };
    },

    // Conectar los handlers del grid (corregir, editar, menús). Se llama tras re-renderizar.
    _conectarGridEventos(raiz, ctx) {
      const { evaluaciones } = ctx;

      // Configure weights
      raiz.querySelectorAll('[data-pesos]').forEach(b => {
        b.onclick = () => {
          const id = b.getAttribute('data-pesos');
          const ev = evaluaciones.find(x => x.id === id);
          if (ev) this._modalPesos(raiz, ev);
        };
      });

      // Edit evaluations
      raiz.querySelectorAll('[data-editar-eval]').forEach(b => {
        b.onclick = async () => {
          const id = b.getAttribute('data-editar-eval');
          const ev = evaluaciones.find(x => x.id === id);
          const datos = await window.helpers.formulario({
            titulo: 'Editar evaluación',
            campos: [
              { nombre: 'titulo', etiqueta: 'Nombre', valor: ev.titulo, requerido: true }
            ],
            textoConfirmar: 'Guardar'
          });
          if (!datos) return;
          try {
            await window.examenesRepository.actualizarEvaluacion(id, { titulo: datos.titulo.trim() || ev.titulo });
            router._ejecutar();
          } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        };
      });

      // Add exam to evaluation
      raiz.querySelectorAll('[data-anadir]').forEach(b => {
        b.onclick = () => router.navegar('/editor/nuevo?evaluacion=' + b.getAttribute('data-anadir'));
      });

      // Delete evaluation
      raiz.querySelectorAll('[data-eliminar-eval]').forEach(b => {
        b.onclick = async () => {
          const ok = await window.helpers.confirmar(
            `Se eliminará la evaluación "${b.getAttribute('data-titulo')}" y quedarán sueltos sus exámenes (no se borran los exámenes ni las notas). Esta acción no se puede deshacer.`,
            { titulo: '¿Eliminar evaluación?', textoConfirmar: 'Sí, eliminar' }
          );
          if (!ok) return;
          try {
            await window.examenesRepository.eliminarEvaluacion(b.getAttribute('data-eliminar-eval'));
            window.helpers.mostrarAlerta('Evaluación eliminada.', 'exito');
            router._ejecutar();
          } catch (e) { window.helpers.mostrarAlerta('Error al eliminar: ' + e.message, 'error'); }
        };
      });

      // Edit exam
      raiz.querySelectorAll('[data-editar-ex]').forEach(b => {
        b.onclick = () => router.navegar('/editor/' + b.getAttribute('data-editar-ex'));
      });

      // Correct exam
      raiz.querySelectorAll('[data-corregir]').forEach(b => {
        b.onclick = () => router.navegar('/corregir/' + b.getAttribute('data-corregir'));
      });

      // Orden manual de evaluaciones (subir / bajar)
      raiz.querySelectorAll('[data-subir-eval]').forEach(b => {
        b.onclick = () => this._moverEvaluacion(raiz, ctx, b.getAttribute('data-subir-eval'), -1);
      });
      raiz.querySelectorAll('[data-bajar-eval]').forEach(b => {
        b.onclick = () => this._moverEvaluacion(raiz, ctx, b.getAttribute('data-bajar-eval'), 1);
      });

      // Menús ⋮ dentro del grid: se posicionan en fixed para que nunca se
      // recorten por el contenedor con overflow-x (tabla con scroll horizontal)
      // ni queden ocultos tras las celdas pegajosas.
      raiz.querySelectorAll('[data-menu-toggle]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const menuId = btn.getAttribute('data-menu-toggle');
          const menu = document.getElementById(menuId);
          if (!menu) return;
          const estabaAbierto = menu.classList.contains('calif-menu--abierto');
          document.querySelectorAll('.calif-menu--abierto').forEach(m => this._cerrarMenu(m));
          if (estabaAbierto) return;
          // Los menús del grid viven dentro del <thead> pegajoso (stacking context
          // z-index 2). Las celdas pegajosas de la columna Alumno (z-index 3) y el
          // resto del contenido de la tabla quedan POR ENCIMA y recortan el menú al
          // abrirlo. Moverlo a <body> lo saca de ese contexto y se muestra completo.
          if (btn.closest('.calif-grid')) {
            menu._origen = menu.parentNode;
            document.body.appendChild(menu);
          }
          const r = btn.getBoundingClientRect();
          const ancho = 200;
          const alto = 240;
          let left = Math.min(r.right - ancho, window.innerWidth - ancho - 8);
          left = Math.max(8, left);
          let top = r.bottom + 6;
          if (top + alto > window.innerHeight) top = Math.max(8, r.top - alto - 6);
          menu.style.position = 'fixed';
          menu.style.top = top + 'px';
          menu.style.left = left + 'px';
          menu.style.right = 'auto';
          menu.style.zIndex = '1000';
          // Registrar posición de scroll al abrir: el scroll espurio (delta 0) de Chrome
          // no debe cerrar el menú recién abierto; solo un scroll real lo cierra.
          this._scrollBaseAlAbrir = {
            x: window.scrollX,
            y: window.scrollY,
            grids: Array.from(document.querySelectorAll('.calif-grid-wrap')).map(el => ({ el, left: el.scrollLeft, top: el.scrollTop }))
          };
          menu.classList.add('calif-menu--abierto');
        };
      });
    },

    _cerrarMenu(menu) {
      if (!menu) return;
      menu.classList.remove('calif-menu--abierto');
      this._scrollBaseAlAbrir = null;
      // Revertir el posicionamiento fixed → vuelve a los estilos inline originales
      menu.style.position = '';
      menu.style.top = '';
      menu.style.left = '';
      menu.style.right = '';
      menu.style.zIndex = '';
      // Devolver el menú a su lugar dentro de la tabla (si se movió a <body>)
      if (menu._origen && menu._origen !== document.body) {
        menu._origen.appendChild(menu);
      }
      menu._origen = null;
    },

    // Reordena manualmente las evaluaciones (cuál aparece primero)
    async _moverEvaluacion(raiz, ctx, id, dir) {
      const evals = (ctx.grupos || []).filter(g => g.tipo === 'eval').map(g => g.obj);
      const idx = evals.findIndex(e => e.id === id);
      if (idx === -1) return;
      const nuevo = idx + dir;
      if (nuevo < 0 || nuevo >= evals.length) return;
      [evals[idx], evals[nuevo]] = [evals[nuevo], evals[idx]];
      try {
        const grupoId = ctx.usuario.grupo_id;
        await window.examenesRepository.guardarOrdenEvaluaciones(grupoId, evals.map(e => e.id));
        window.helpers.mostrarAlerta('Orden actualizado.', 'exito');
        router._ejecutar();
      } catch (e) {
        window.helpers.mostrarAlerta('No se pudo guardar el orden (¿migración 025 aplicada?): ' + e.message, 'error');
      }
    },

    // Importa evaluaciones desde un archivo CSV (un nombre por línea/columna)
    _importarEvaluacionesCSV(raiz, ctx) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,text/csv';
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        let texto = '';
        try { texto = await file.text(); } catch (e) { window.helpers.mostrarAlerta('No se pudo leer el archivo.', 'error'); return; }
        const nombres = this._parsearCSVEvaluaciones(texto);
        if (!nombres.length) {
          window.helpers.mostrarAlerta('El archivo no contiene nombres de evaluación válidos. Usa un CSV con un nombre por fila (opcional cabecera "evaluacion").', 'advertencia');
          return;
        }
        const MAX = 100;
        if (nombres.length > MAX) {
          window.helpers.mostrarAlerta(`El archivo contiene ${nombres.length} filas; solo se importarán las primeras ${MAX}.`, 'advertencia');
          nombres.length = MAX;
        }
        const lista = nombres.map(n => '• ' + n).join('\n');
        const ok = await window.helpers.confirmar(
          `Se importarán ${nombres.length} evaluación(es):\n\n${lista}`,
          { titulo: 'Importar evaluaciones', textoConfirmar: 'Importar', textoCancelar: 'Cancelar' }
        );
        if (!ok) return;
        try {
          const usuarioActualizado = await window.authRepository.asegurarGrupo(ctx.usuario) || ctx.usuario;
          let creadas = 0;
          for (const nombre of nombres) {
            await window.examenesRepository.crearEvaluacion({
              grupoId: usuarioActualizado.grupo_id,
              creadoPor: usuarioActualizado.id,
              titulo: nombre,
              asignatura: '',
              descripcion: ''
            });
            creadas++;
          }
          window.helpers.mostrarAlerta(`${creadas} evaluación(es) importada(s).`, 'exito');
          router._ejecutar();
        } catch (e) {
          window.helpers.mostrarAlerta('Error al importar: ' + e.message, 'error');
        }
      };
      input.click();
    },

    // Parse simple de CSV: toma la primera columna de cada fila (soporta comillas).
    // Solo la primera línea no vacía se descarta si parece una cabecera.
    _parsearCSVEvaluaciones(texto) {
      const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const nombres = [];
      const CABECERAS = /^(evaluacion|evaluaciones|nombre|titulo)$/i;
      lineas.forEach((linea, idx) => {
        const m = linea.match(/^"((?:[^"]|"")*)"|^([^,;]*)/);
        let nombre = m ? (m[1] !== undefined ? m[1].replace(/""/g, '"') : m[2]) : linea;
        nombre = (nombre || '').trim();
        if (!nombre) return;
        if (idx === 0 && CABECERAS.test(nombre)) return;
        nombres.push(nombre);
      });
      return [...new Set(nombres)];
    },

    // Buscador combinado: filtra pestañas (evaluaciones) y filas (alumnos)
    _aplicarBusqueda(raiz, q, ctx) {
      const query = q.toLowerCase().trim();

      // Filtrar pestañas por nombre de evaluación
      const hayQuery = query.length > 0;
      raiz.querySelectorAll('.calif-tab').forEach(tab => {
        const titulo = (tab.textContent || '').toLowerCase();
        tab.style.display = (!hayQuery || titulo.includes(query)) ? '' : 'none';
      });

      // Si la pestaña activa quedó oculta, ir a la primera pestaña visible
      const tabActiva = raiz.querySelector('.calif-tab--activo');
      if (tabActiva && tabActiva.style.display === 'none') {
        const visible = Array.from(raiz.querySelectorAll('.calif-tab')).find(t => t.style.display !== 'none');
        if (visible) visible.click();
      }

      // Filtrar filas de alumnos
      this._aplicarFiltroAlumnos(raiz, q);
    },

    _aplicarFiltroAlumnos(raiz, q) {
      const query = q.toLowerCase().trim();
      raiz.querySelectorAll('.fila-alumno').forEach(tr => {
        const nombre = tr.querySelector('td:first-child')?.textContent?.toLowerCase() || '';
        tr.style.display = !query || nombre.includes(query) ? '' : 'none';
      });
    },

    desmontar() {
      if (this._cleanup) { this._cleanup(); this._cleanup = null; }
      // Cerrar y devolver a su sitio los menús del grid movidos a <body>
      document.querySelectorAll('.calif-menu--abierto').forEach(m => this._cerrarMenu(m));
    },

    _modalPesos(raiz, evalObj) {
      const exs = evalObj.examenes || [];
      if (!exs.length) { window.helpers.mostrarAlerta('Añade exámenes a la evaluación primero.', 'advertencia'); return; }
      const pesosActuales = pesosEval(evalObj.id);

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-pesos-title" style="max-width:400px">
          <div class="o-flecha o-flecha--between" style="margin-bottom:var(--espaciado-sm)">
            <h3 id="modal-pesos-title">Pesos: ${window.helpers.escapeHtml(evalObj.titulo)}</h3>
            <button class="btn-secundario btn-icono" id="btnCerrarModalPesos" aria-label="Cerrar">${window.Iconos.render('x')}</button>
          </div>
          <p class="u-fs-xs u-color-texto-secundario u-mb-2">Asigna un peso (porcentaje) a cada examen. Si todos están en 0 o vacíos, se usa media simple.</p>
          <div class="o-pila" style="gap:var(--espaciado-xs)" id="pesosLista">
            ${exs.map(ex => `
              <label class="o-flecha o-flecha--centro" style="gap:var(--espaciado-sm);padding:var(--espaciado-xs);border:1px solid var(--color-borde);border-radius:var(--radio-sm)">
                <span style="flex:1;font-size:var(--texto-sm)">${window.helpers.escapeHtml(ex.titulo)}</span>
                <input type="number" class="peso-input" data-exid="${ex.id}" value="${pesosActuales[ex.id] || ''}" min="0" max="100" placeholder="%" style="width:64px;text-align:center">
                <span class="u-fs-xs u-color-texto-terciario">%</span>
              </label>
            `).join('')}
          </div>
          <p class="u-fs-xs u-color-texto-terciario u-mt-1" id="pesosSumaMsg"></p>
          <div class="o-flecha" style="justify-content:flex-end;gap:var(--espaciado-xs);margin-top:var(--espaciado-md)">
            <button class="btn-secundario" id="btnCerrarPesos2">Cancelar</button>
            <button class="btn-primario" id="btnGuardarPesos">Guardar pesos</button>
          </div>
        </div>`;

      document.body.appendChild(overlay);
      window.Iconos.actualizar();

      const cerrar = () => overlay.remove();
      overlay.querySelector('#btnCerrarModalPesos').onclick = cerrar;
      overlay.querySelector('#btnCerrarPesos2').onclick = cerrar;
      overlay.onclick = (e) => { if (e.target === overlay) cerrar(); };

      const sumarPesos = () => {
        const inputs = overlay.querySelectorAll('.peso-input');
        let suma = 0;
        inputs.forEach(inp => { const v = parseFloat(inp.value); if (!isNaN(v)) suma += v; });
        const msg = overlay.querySelector('#pesosSumaMsg');
        if (suma === 0) msg.textContent = 'Media simple (sin ponderación)';
        else msg.textContent = suma === 100 ? '✓ Suma 100%' : `Suma: ${suma}% (debe sumar 100%)`;
        msg.style.color = suma === 100 || suma === 0 ? 'var(--color-exito)' : 'var(--color-aviso)';
      };
      overlay.querySelectorAll('.peso-input').forEach(inp => inp.addEventListener('input', sumarPesos));
      sumarPesos();

      overlay.querySelector('#btnGuardarPesos').onclick = () => {
        const pesos = {};
        overlay.querySelectorAll('.peso-input').forEach(inp => {
          const v = parseFloat(inp.value);
          if (!isNaN(v) && v > 0) pesos[inp.dataset.exid] = v;
        });
        guardarPesos(evalObj.id, pesos);
        window.helpers.mostrarAlerta('Pesos guardados. La media se recalculará.', 'exito');
        cerrar();
        router._ejecutar();
      };
    },

    _exportarCSV(evaluaciones, sueltos, alumnos, notasPorExamen) {
      const cabeceras = ['Alumno'];
      const examenesPorEval = [];

      evaluaciones.forEach(e => {
        (e.examenes || []).forEach(ex => {
          cabeceras.push(ex.titulo + ' (nota)');
          examenesPorEval.push(ex);
        });
      });
      evaluaciones.forEach(e => {
        cabeceras.push(e.titulo + ' (media)');
      });
      sueltos.forEach(x => {
        cabeceras.push(x.titulo + ' (nota)');
        examenesPorEval.push(x);
      });

      if (cabeceras.length === 1) {
        window.helpers.mostrarAlerta('No hay exámenes para exportar.', 'advertencia');
        return;
      }

      const filas = alumnos.map(a => {
        const fila = [window.helpers.nombreAlumno(a)];
        evaluaciones.forEach(e => {
          const evalNotas = notasPorExamen;
          (e.examenes || []).forEach(ex => {
            const m = evalNotas[ex.id];
            fila.push(m && m[a.id] != null ? m[a.id] : '');
          });
          // Media eval (usa la misma media ponderada que la interfaz y el PDF)
          const mediaEval = mediaPonderada(e, a.id, notasPorExamen);
          fila.push(mediaEval != null ? mediaEval : '');
        });
        sueltos.forEach(x => {
          const m = notasPorExamen[x.id];
          fila.push(m && m[a.id] != null ? m[a.id] : '');
        });
        return fila;
      });

      window.helpers.descargarCSV('calificaciones_grupo', cabeceras, filas);
      window.helpers.mostrarAlerta('CSV exportado correctamente.', 'exito');
    },

    _exportarPDF(evaluaciones, sueltos, alumnos, notasPorExamen) {
      if (!alumnos.length) { window.helpers.mostrarAlerta('No hay alumnos para exportar.', 'advertencia'); return; }

      const secciones = [];

      // Por cada evaluación: título + su tabla (exámenes + media)
      evaluaciones.forEach(e => {
        const exs = e.examenes || [];
        const conMedia = exs.length > 0;
        const cabeceras = ['Alumno', ...exs.map(x => x.titulo), ...(conMedia ? ['Media'] : [])];
        const rows = alumnos.map(a => {
          const celdas = [`<td style="font-weight:600;padding:4px 8px;border:1px solid #ccc">${window.helpers.escapeHtml(window.helpers.nombreAlumno(a))}</td>`];
          exs.forEach(ex => {
            const m = notasPorExamen[ex.id];
            const nota = m && m[a.id] != null ? m[a.id] : '';
            celdas.push(`<td style="text-align:center;padding:4px 8px;border:1px solid #ccc">${nota}</td>`);
          });
          if (conMedia) {
            const media = mediaPonderada(e, a.id, notasPorExamen);
            celdas.push(`<td style="text-align:center;padding:4px 8px;border:1px solid #ccc;font-weight:600">${media != null ? media : '—'}</td>`);
          }
          return `<tr>${celdas.join('')}</tr>`;
        });
        secciones.push({ titulo: e.titulo, sinExamenes: !exs.length, cabeceras, rows });
      });

      // Exámenes sueltos (sin evaluación) bajo un bloque "Sin evaluación"
      if (sueltos.length) {
        const cabeceras = ['Alumno', ...sueltos.map(x => x.titulo)];
        const rows = alumnos.map(a => {
          const celdas = [`<td style="font-weight:600;padding:4px 8px;border:1px solid #ccc">${window.helpers.escapeHtml(window.helpers.nombreAlumno(a))}</td>`];
          sueltos.forEach(x => {
            const m = notasPorExamen[x.id];
            const nota = m && m[a.id] != null ? m[a.id] : '';
            celdas.push(`<td style="text-align:center;padding:4px 8px;border:1px solid #ccc">${nota}</td>`);
          });
          return `<tr>${celdas.join('')}</tr>`;
        });
        secciones.push({ titulo: 'Sin evaluación', sinExamenes: false, cabeceras, rows });
      }

      const conContenido = secciones.filter(s => !s.sinExamenes).length > 0;
      if (!conContenido) { window.helpers.mostrarAlerta('No hay datos para exportar.', 'advertencia'); return; }

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Calificaciones</title>
<style>
  body { font-family:Arial,sans-serif; font-size:12px; margin:20px; }
  h1 { font-size:16px; margin:0 0 6px; }
  table { border-collapse:collapse; width:100%; margin-bottom:24px; }
  th { background:#f5f5f5; font-size:11px; padding:4px 8px; border:1px solid #ccc; text-align:center; }
  td { font-size:11px; }
  @media print { body { margin:10mm; } }
</style></head>
<body>
  ${secciones.map(sec => sec.sinExamenes
    ? `<h1>${window.helpers.escapeHtml(sec.titulo)}</h1><p style="color:var(--color-texto-terciario)">Sin exámenes</p>`
    : `<h1>${window.helpers.escapeHtml(sec.titulo)}</h1>
  <table><thead><tr>${sec.cabeceras.map(c => `<th>${window.helpers.escapeHtml(c)}</th>`).join('')}</tr></thead>
  <tbody>${sec.rows.join('')}</tbody></table>`
  ).join('\n')}
  <script>window.print();<\/script>
</body></html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) {
        // Fallback: download as HTML file
        const a = document.createElement('a');
        a.href = url;
        a.download = 'calificaciones_grupo.html';
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      window.helpers.mostrarAlerta('PDF generado. Usa Ctrl+P para guardar como PDF.', 'info');
    }
  };
})();
