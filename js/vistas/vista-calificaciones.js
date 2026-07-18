(function() {
  'use strict';
  function colorNota(n) {
    if (n == null) return 'var(--color-texto-terciario)';
    return n >= 7 ? 'var(--color-exito)' : 'var(--color-error)';
  }
  function claseNota(n) {
    if (n == null) return '';
    return n >= 7 ? 'calif-nota--aprobada' : 'calif-nota--suspendida';
  }
  function redondear(n) { return Math.round(n * 100) / 100; }
  function badgeNota(n) {
    if (n == null) return '—';
    return `<span class="${claseNota(n)}" style="font-weight:700">${n}</span>`;
  }
  function clasificacion(n) {
    if (n == null) return '';
    if (n >= 9) return 'Sobresaliente';
    if (n >= 7) return 'Notable';
    if (n >= 5) return 'Suficiente';
    return 'Insuficiente';
  }

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
        const [evaluaciones, sueltos, intentos, alumnos, stats] = await Promise.all([
          window.examenesRepository.listarEvaluaciones(grupoId),
          window.examenesRepository.listarExamenesSueltos(grupoId),
          window.examenesRepository.obtenerIntentosGrupo(grupoId),
          window.examenesRepository.obtenerMiembrosGrupo(grupoId, true),
          window.examenesRepository.estadisticasGrupo(grupoId)
        ]);
        this._renderizar(raiz, { evaluaciones, sueltos, intentos, alumnos, stats, usuario });
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },

    async _renderizar(raiz, ctx) {
      const { evaluaciones, sueltos, intentos, alumnos, stats, usuario } = ctx;

      const notasPorExamen = {};
      intentos.forEach(i => {
        if (i.corregido && i.nota != null) {
          (notasPorExamen[i.examen_id] = notasPorExamen[i.examen_id] || {})[i.alumno_id] = parseFloat(i.nota);
        }
      });

      const completadosEval = (evalObj, alumnoId) => {
        return (evalObj.examenes || []).filter(e => notasPorExamen[e.id] && notasPorExamen[e.id][alumnoId] != null).length;
      };
      const mediaEval = (evalObj, alumnoId) => mediaPonderada(evalObj, alumnoId, notasPorExamen);
      const mediaGrupoEval = (evalObj) => {
        const alumnosIds = alumnos.map(a => a.id);
        const ns = alumnosIds.map(aId => mediaPonderada(evalObj, aId, notasPorExamen)).filter(n => n != null);
        return ns.length ? redondear(ns.reduce((s, n) => s + n, 0) / ns.length) : null;
      };

      // Build distribution data for stats
      const todasLasNotas = Object.values(notasPorExamen).flatMap(m => Object.values(m));
      const distribucion = this._calcularDistribucion(todasLasNotas);

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="o-flecha o-flecha--between o-flecha--wrap" style="gap:var(--espaciado-sm)">
            <h2>${window.Iconos.render('graduation-cap')} Libro de Calificaciones</h2>
            <div class="o-flecha" style="gap:var(--espaciado-xs)">
              <button class="btn-secundario" id="btnVolver">${window.Iconos.render('arrow-left')} Volver</button>
              <button class="btn-secundario calif-exportar-btn" id="btnExportarCalif">${window.Iconos.render('download')} CSV</button>
              <button class="btn-secundario calif-exportar-btn" id="btnExportarPDF">${window.Iconos.render('file-text')} PDF</button>
              <button class="btn-primario" id="btnCrearEval">+ Crear evaluación</button>
            </div>
          </div>

          ${this._tarjetaCrear()}
          ${this._estadisticas(stats, distribucion)}

          <div class="o-flecha u-fs-xs u-color-texto-terciario" style="gap:var(--espaciado-sm);flex-wrap:wrap">
            <span>${window.Iconos.render('info')} <span style="color:var(--color-exito);font-weight:700">Verde</span>: ≥7 &nbsp; <span style="color:var(--color-error);font-weight:700">Rojo</span>: &lt;7</span>
            <span>${window.Iconos.render('check')} Auto &nbsp; ${window.Iconos.render('clipboard')} Pendiente</span>
          </div>

          <input type="text" id="filtroAlumno" placeholder="Buscar alumno..." style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto)">

          ${evaluaciones.length === 0 && sueltos.length === 0
            ? '<div class="empty-state"><div class="empty-state__icono">' + window.Iconos.render('graduation-cap') + '</div><h3 class="empty-state__titulo">Aún no hay evaluaciones ni exámenes</h3><p class="empty-state__descripcion">Crea una evaluación y añade exámenes para empezar a registrar calificaciones.</p></div>'              : alumnos.length === 0
              ? `<div class="empty-state empty-state--compacto"><div class="empty-state__icono">${window.Iconos.render('users')}</div><p class="empty-state__descripcion">No hay alumnos asignados a este grupo.</p></div>`
              : evaluaciones.map(e => this._seccionEvaluacion(e, alumnos, notasPorExamen, mediaEval, completadosEval, mediaGrupoEval)).join('') +
                (sueltos.length ? this._seccionSueltos(sueltos, alumnos, notasPorExamen) : '')}
        </div>`;

      window.Iconos.actualizar();
      this._conectarEventos(raiz, { evaluaciones, sueltos, intentos, alumnos, notasPorExamen, usuario, stats });
    },

    _conectarEventos(raiz, ctx) {
      const { evaluaciones, sueltos, intentos, alumnos, notasPorExamen, usuario, stats } = ctx;

      raiz.querySelector('#btnVolver').onclick = () => router.navegar('/examenes');

      const crearEval = async () => {
        const datos = await window.helpers.formulario({
          titulo: 'Crear evaluación',
          mensaje: 'Define el período de evaluación (ej: 1.ª Evaluación).',
          campos: [
            { nombre: 'titulo', etiqueta: 'Nombre', valor: 'Nueva evaluación', requerido: true, placeholder: '1.ª Evaluación' },
            { nombre: 'asignatura', etiqueta: 'Asignatura (opcional)', valor: '', placeholder: 'Génesis' }
          ],
          textoConfirmar: 'Crear'
        });
        if (!datos) return;
        try {
          await window.authRepository.asegurarGrupo(usuario);
          await window.examenesRepository.crearEvaluacion({
            grupoId: usuario.grupo_id, creadoPor: usuario.id,
            titulo: datos.titulo.trim() || 'Nueva evaluación', asignatura: (datos.asignatura || '').trim()
          });
          window.helpers.mostrarAlerta('Evaluación creada. Ahora añade exámenes.', 'exito');
          router._ejecutar();
        } catch (e) { window.helpers.mostrarAlerta('Error al crear la evaluación: ' + e.message, 'error'); }
      };
      raiz.querySelector('#btnCrearEval').onclick = crearEval;
      const cardCrear = raiz.querySelector('#btnCrearEvalCard');
      if (cardCrear) cardCrear.onclick = crearEval;

      // Export CSV
      raiz.querySelector('#btnExportarCalif').onclick = () => {
        this._exportarCSV(evaluaciones, sueltos, alumnos, notasPorExamen);
      };
      // Export PDF
      raiz.querySelector('#btnExportarPDF').onclick = () => {
        this._exportarPDF(evaluaciones, sueltos, alumnos, notasPorExamen);
      };

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
              { nombre: 'titulo', etiqueta: 'Nombre', valor: ev.titulo, requerido: true },
              { nombre: 'asignatura', etiqueta: 'Asignatura (opcional)', valor: ev.asignatura || '' }
            ],
            textoConfirmar: 'Guardar'
          });
          if (!datos) return;
          try {
            await window.examenesRepository.actualizarEvaluacion(id, { titulo: datos.titulo.trim() || ev.titulo, asignatura: (datos.asignatura || '').trim() });
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

      // Search filter (works for both desktop table rows AND mobile cards)
      const filtroInput = raiz.querySelector('#filtroAlumno');
      if (filtroInput) {
        let debounceTimer;
        filtroInput.addEventListener('input', () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            const q = filtroInput.value.toLowerCase().trim();
            // Desktop: table rows
            raiz.querySelectorAll('.fila-alumno').forEach(tr => {
              const nombre = tr.querySelector('td:first-child')?.textContent?.toLowerCase() || '';
              tr.style.display = !q || nombre.includes(q) ? '' : 'none';
            });
            // Mobile: cards
            raiz.querySelectorAll('.calif-card').forEach(card => {
              const nombre = card.querySelector('.calif-card__nombre')?.textContent?.toLowerCase() || '';
              card.style.display = !q || nombre.includes(q) ? '' : 'none';
            });
          }, 200);
        });
      }

      // Evaluation menu toggles
      raiz.querySelectorAll('[data-menu-toggle]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const menuId = btn.getAttribute('data-menu-toggle');
          const menu = raiz.querySelector('#' + menuId);
          if (!menu) return;
          // Close all other menus first
          raiz.querySelectorAll('.calif-menu--abierto').forEach(m => {
            if (m !== menu) m.classList.remove('calif-menu--abierto');
          });
          menu.classList.toggle('calif-menu--abierto');
        };
      });
      // Close menus on outside click
      const closeMenus = (e) => {
        if (!e.target.closest('[data-menu-toggle]') && !e.target.closest('.calif-menu')) {
          raiz.querySelectorAll('.calif-menu--abierto').forEach(m => m.classList.remove('calif-menu--abierto'));
        }
      };
      document.addEventListener('click', closeMenus);
      // Store cleanup reference
      this._cleanup = () => document.removeEventListener('click', closeMenus);
    },

    desmontar() {
      if (this._cleanup) { this._cleanup(); this._cleanup = null; }
    },

    _calcularDistribucion(notas) {
      const rangos = [
        { min: 0, max: 4, label: '0-4' },
        { min: 4, max: 5, label: '4-5' },
        { min: 5, max: 6, label: '5-6' },
        { min: 6, max: 7, label: '6-7' },
        { min: 7, max: 8, label: '7-8' },
        { min: 8, max: 9, label: '8-9' },
        { min: 9, max: 10.01, label: '9-10' }
      ];
      const maxCount = Math.max(1, ...rangos.map(r => notas.filter(n => n >= r.min && n < r.max).length));
      return rangos.map(r => {
        const count = notas.filter(n => n >= r.min && n < r.max).length;
        return { ...r, count, height: Math.max(4, (count / maxCount) * 100) };
      });
    },

    _tarjetaCrear() {
      return `
        <div class="tarjeta-crear" id="btnCrearEvalCard" role="button" tabindex="0">
          <div class="tarjeta-crear__icono">${window.Iconos.render('plus-circle')}</div>
          <div class="tarjeta-crear__texto">
            <p class="tarjeta-crear__titulo">Crear evaluación</p>
            <p class="tarjeta-crear__descripcion">Crea un período (1.ª, 2.ª, final…) y añade exámenes. La nota media se calcula sola.</p>
          </div>
          <div class="tarjeta-crear__accion"><span class="btn-primario">Crear</span></div>
        </div>`;
    },

    _estadisticas(stats, distribucion) {
      if (!stats) return '';
      const tarjeta = (icono, valor, etiqueta, color) => `
        <div class="tarjeta-estadistica" style="flex:1;min-width:120px;border-left:3px solid ${color || 'var(--color-borde)'}">
          <div class="o-flecha o-flecha--between">
            <span class="u-fs-xs u-color-texto-secundario">${etiqueta}</span>
            <span>${window.Iconos.render(icono)}</span>
          </div>
          <p class="u-texto-2xl u-fw-700" style="color:${color || 'var(--color-texto)'}">${valor}</p>
        </div>`;

      const distHtml = distribucion && distribucion.length ? `
        <div class="tarjeta-estadistica" style="flex:2;min-width:200px">
          <div class="o-flecha o-flecha--between" style="margin-bottom:var(--espaciado-xxs)">
            <span class="u-fs-xs u-color-texto-secundario">Distribución de notas</span>
            <span>${window.Iconos.render('bar-chart-2')}</span>
          </div>
          <div class="calif-distribucion">
            ${distribucion.map(d => `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
                <div class="calif-distribucion__barra" style="height:${d.height}%;width:100%">
                  <div class="calif-distribucion__barra--fill" style="height:100%;width:100%;border-radius:var(--radio-sm) var(--radio-sm) 0 0;background:${d.min >= 7 ? 'var(--color-exito)' : d.min >= 5 ? 'var(--color-aviso)' : 'var(--color-error)'};opacity:${d.count > 0 ? 1 : 0.3}"></div>
                </div>
                <span class="calif-distribucion__etiqueta">${d.label}</span>
              </div>
            `).join('')}
          </div>
        </div>` : '';

      return `
        <div class="calif-stats-grid u-mt-2 u-mb-2">
          ${tarjeta('users', stats.totalAlumnos, 'Alumnos', 'var(--color-texto)')}
          ${tarjeta('clipboard-check', stats.totalExamenes, 'Exámenes', 'var(--color-acento)')}
          ${tarjeta('percent', stats.promedioGrupo != null ? stats.promedioGrupo : '—', 'Prom. grupo', stats.promedioGrupo >= 7 ? 'var(--color-exito)' : 'var(--color-error)')}
          ${tarjeta('check-check', stats.aprobados, 'Aprobados (≥7)', 'var(--color-exito)')}
          ${tarjeta('alert-triangle', stats.enRiesgo, 'En riesgo (<7)', 'var(--color-error)')}
          ${tarjeta('star', stats.destacados, 'Destacados (≥9)', 'var(--color-acento)')}
          ${distHtml}
        </div>`;
    },

    _seccionEvaluacion(e, alumnos, notasPorExamen, mediaEval, completadosEval, mediaGrupoEval) {
      const mg = mediaGrupoEval(e);
      const examenes = e.examenes || [];
      const totalEx = examenes.length;
      const menuId = 'menu-eval-' + e.id;

      const currentPesos = pesosEval(e.id);
      const tienePesos = examenes.some(x => currentPesos[x.id] != null && currentPesos[x.id] > 0);

      const cabecera = `
        <div class="o-flecha o-flecha--between o-flecha--wrap" style="gap:var(--espaciado-sm)">
          <div>
            <h3 class="u-fw-700">${window.helpers.escapeHtml(e.titulo)}</h3>
            ${e.asignatura ? `<span class="u-fs-xs u-color-texto-secundario">${window.helpers.escapeHtml(e.asignatura)}</span>` : ''}
            ${tienePesos ? '<span class="u-fs-xs u-color-texto-terciario u-ml-1">(ponderada)</span>' : ''}
          </div>
          <div class="calif-eval-acciones">
            <span class="calif-eval-media" style="color:${colorNota(mg)}">Media: ${mg != null ? mg : '—'}</span>
            <div style="position:relative">
              <button class="btn-secundario u-fs-xs" data-menu-toggle="${menuId}" aria-expanded="false" aria-label="Acciones de evaluación">
                ${window.Iconos.render('more-vertical')}
              </button>
              <div class="calif-menu" id="${menuId}" style="position:absolute;right:0;top:100%;margin-top:4px;background:var(--color-fondo-tarjeta);border:1px solid var(--color-borde);border-radius:var(--radio-md);box-shadow:var(--sombra-lg);z-index:50;min-width:160px;display:none;padding:var(--espaciado-xxs) 0">
                <button class="calif-menu-item" data-editar-eval="${e.id}" style="width:100%;text-align:left;padding:var(--espaciado-xs) var(--espaciado-sm);background:none;border:none;color:var(--color-texto);cursor:pointer;font:inherit;font-size:var(--texto-sm);display:flex;align-items:center;gap:var(--espaciado-xs)">
                  ${window.Iconos.render('edit-3')} Editar
                </button>
                <button class="calif-menu-item" data-pesos="${e.id}" style="width:100%;text-align:left;padding:var(--espaciado-xs) var(--espaciado-sm);background:none;border:none;color:var(--color-texto);cursor:pointer;font:inherit;font-size:var(--texto-sm);display:flex;align-items:center;gap:var(--espaciado-xs)">
                  ${window.Iconos.render('scale')} Pesos
                </button>
                <button class="calif-menu-item" data-anadir="${e.id}" style="width:100%;text-align:left;padding:var(--espaciado-xs) var(--espaciado-sm);background:none;border:none;color:var(--color-texto);cursor:pointer;font:inherit;font-size:var(--texto-sm);display:flex;align-items:center;gap:var(--espaciado-xs)">
                  ${window.Iconos.render('plus')} Añadir examen
                </button>
                <div style="height:1px;background:var(--color-borde);margin:var(--espaciado-xxs) 0"></div>
                <button class="calif-menu-item" data-eliminar-eval="${e.id}" data-titulo="${window.helpers.escapeHtml(e.titulo)}" style="width:100%;text-align:left;padding:var(--espaciado-xs) var(--espaciado-sm);background:none;border:none;color:var(--color-error);cursor:pointer;font:inherit;font-size:var(--texto-sm);display:flex;align-items:center;gap:var(--espaciado-xs)">
                  ${window.Iconos.render('trash-2')} Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>`;

      // Cards móvil
      const cardsMovil = examenes.length === 0
        ? '<p class="u-fs-sm u-color-texto-terciario u-mt-2">Sin exámenes todavía.</p>'
        : `<div class="calif-cards u-mt-2">
            ${alumnos.map(a => {
              const media = mediaEval(e, a.id);
              const compl = completadosEval(e, a.id);
              const pct = totalEx > 0 ? (compl / totalEx) * 100 : 0;
              return `
                <div class="calif-card">
                  <div class="calif-card__header">
                    <span class="calif-card__nombre u-fw-600">${window.helpers.escapeHtml(window.helpers.nombreAlumno(a))}</span>
                    <span class="calif-card__media ${claseNota(media)}">${media != null ? media : '—'}</span>
                  </div>
                  <div class="calif-card__examenes">
                    ${examenes.map(x => {
                      const m = notasPorExamen[x.id];
                      const nota = m ? m[a.id] : undefined;
                      return `<div class="calif-card__examen">
                        <span class="calif-card__examen-nombre">${window.helpers.escapeHtml(x.titulo)}</span>
                        <span class="calif-card__examen-nota ${claseNota(nota)}">${nota != null ? nota : '—'}</span>
                      </div>`;
                    }).join('')}
                  </div>
                  <div class="calif-card__progreso">
                    <div class="barra-progreso">
                      <div class="barra-progreso__lleno ${pct >= 100 ? 'barra-progreso--exito' : ''}" style="width:${pct}%"></div>
                    </div>
                  </div>
                  <div class="calif-card__footer u-fs-xs u-color-texto-terciario">${compl}/${totalEx} completados</div>
                </div>`;
            }).join('')}
          </div>`;

      // Tabla escritorio
      const tabla = examenes.length === 0
        ? ''
        : `
          <div class="calif-tabla-desktop u-mt-2">
            <table class="tabla-admin" style="min-width:${Math.max(360, (examenes.length + 3) * 80)}px">
              <thead>
                <tr>
                  <th>Alumno</th>
                  ${examenes.map(x => `<th style="font-size:var(--texto-xs);text-align:center">
                    <a class="btn-enlace" data-corregir="${x.id}" title="Ver y corregir">${window.helpers.escapeHtml(x.titulo)}</a>
                    <br><button class="btn-enlace u-fs-xs" data-editar-ex="${x.id}">editar</button>
                  </th>`).join('')}
                  <th style="text-align:center;font-size:var(--texto-xs)">Compl.</th>
                  <th style="text-align:center">Media</th>
                </tr>
              </thead>
              <tbody>
                ${alumnos.map(a => {
                  const media = mediaEval(e, a.id);
                  const compl = completadosEval(e, a.id);
                  return `<tr class="fila-alumno">
                    <td class="u-fw-600 u-fs-sm">${window.helpers.escapeHtml(window.helpers.nombreAlumno(a))}</td>
                    ${examenes.map(x => {
                      const m = notasPorExamen[x.id];
                      const nota = m ? m[a.id] : undefined;
                      return `<td class="calif-nota-celda" style="color:${colorNota(nota)}">${nota != null ? nota : '—'}</td>`;
                    }).join('')}
                    <td style="text-align:center;font-size:var(--texto-xs);color:${compl === totalEx ? 'var(--color-exito)' : 'var(--color-texto-terciario)'}">${compl}/${totalEx}</td>
                    <td class="calif-nota-celda" style="color:${colorNota(media)}">${media != null ? media : '—'}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          <p class="u-fs-xs u-color-texto-terciario u-mt-2 calif-tabla-desktop">La media de cada alumno se recalcula automáticamente al corregir los exámenes de esta evaluación.</p>`;

      return `<section class="tarjeta-capitulo o-pila" style="padding:var(--espaciado-md)">${cabecera}${cardsMovil}${tabla}</section>`;
    },

    _seccionSueltos(sueltos, alumnos, notasPorExamen) {
      const cabecera = `
        <div class="o-flecha o-flecha--between">
          <div>
            <h3 class="u-fw-700">Exámenes sin evaluación</h3>
            <p class="u-fs-xs u-color-texto-terciario">Estos exámenes no pertenecen a ninguna evaluación. Puedes moverlos creando una evaluación y añadiéndolos.</p>
          </div>
        </div>`;

      // Cards móvil
      const cardsMovil = `
        <div class="calif-cards u-mt-2">
          ${alumnos.map(a => `
            <div class="calif-card">
              <div class="calif-card__header">
                <span class="calif-card__nombre u-fw-600">${window.helpers.escapeHtml(window.helpers.nombreAlumno(a))}</span>
              </div>
              <div class="calif-card__examenes">
                ${sueltos.map(x => {
                  const m = notasPorExamen[x.id];
                  const nota = m ? m[a.id] : undefined;
                  return `<div class="calif-card__examen">
                    <span class="calif-card__examen-nombre">${window.helpers.escapeHtml(x.titulo)}</span>
                    <span class="calif-card__examen-nota ${claseNota(nota)}">${nota != null ? nota : '—'}</span>
                  </div>`;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>`;

      // Tabla escritorio
      const tabla = `
        <div class="calif-tabla-desktop u-mt-2">
          <table class="tabla-admin" style="min-width:${Math.max(360, (sueltos.length + 1) * 120)}px">
            <thead>
              <tr>
                <th>Alumno</th>
                ${sueltos.map(x => `<th style="font-size:var(--texto-xs)">
                  <a class="btn-enlace" data-corregir="${x.id}" title="Ver y corregir">${window.helpers.escapeHtml(x.titulo)}</a>
                  <br><button class="btn-enlace u-fs-xs" data-editar-ex="${x.id}">editar</button>
                </th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${alumnos.map(a => `<tr class="fila-alumno">
                <td class="u-fw-600 u-fs-sm">${window.helpers.escapeHtml(window.helpers.nombreAlumno(a))}</td>
                ${sueltos.map(x => {
                  const m = notasPorExamen[x.id];
                  const nota = m ? m[a.id] : undefined;
                  return `<td class="calif-nota-celda" style="color:${colorNota(nota)}">${nota != null ? nota : '—'}</td>`;
                }).join('')}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
      return `<section class="tarjeta-capitulo o-pila" style="padding:var(--espaciado-md)">${cabecera}${cardsMovil}${tabla}</section>`;
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
          // Media eval
          const ns = (e.examenes || []).map(ex => notasPorExamen[ex.id] && notasPorExamen[ex.id][a.id]).filter(n => n != null);
          fila.push(ns.length ? redondear(ns.reduce((s, n) => s + n, 0) / ns.length) : '');
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

      const filas = [];
      let cabeceras = ['Alumno'];
      let examenesList = [];

      evaluaciones.forEach(e => {
        (e.examenes || []).forEach(ex => {
          cabeceras.push(ex.titulo);
          examenesList.push(ex);
        });
        cabeceras.push(e.titulo + ' (media)');
      });
      sueltos.forEach(x => {
        cabeceras.push(x.titulo);
        examenesList.push(x);
      });

      if (cabeceras.length === 1) { window.helpers.mostrarAlerta('No hay datos para exportar.', 'advertencia'); return; }

      const tablaRows = alumnos.map(a => {
        const celdas = [`<td style="font-weight:600;padding:4px 8px;border:1px solid #ccc">${window.helpers.escapeHtml(window.helpers.nombreAlumno(a))}</td>`];
        evaluaciones.forEach(e => {
          (e.examenes || []).forEach(ex => {
            const m = notasPorExamen[ex.id];
            const nota = m && m[a.id] != null ? m[a.id] : '';
            celdas.push(`<td style="text-align:center;padding:4px 8px;border:1px solid #ccc">${nota}</td>`);
          });
          const media = mediaPonderada(e, a.id, notasPorExamen);
          celdas.push(`<td style="text-align:center;padding:4px 8px;border:1px solid #ccc;font-weight:600">${media != null ? media : '—'}</td>`);
        });
        sueltos.forEach(x => {
          const m = notasPorExamen[x.id];
          const nota = m && m[a.id] != null ? m[a.id] : '';
          celdas.push(`<td style="text-align:center;padding:4px 8px;border:1px solid #ccc">${nota}</td>`);
        });
        return `<tr>${celdas.join('')}</tr>`;
      });

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Calificaciones</title>
<style>
  body { font-family:Arial,sans-serif; font-size:12px; margin:20px; }
  h1 { font-size:18px; margin-bottom:4px; }
  h2 { font-size:14px; font-weight:400; color:#555; margin-top:0; }
  table { border-collapse:collapse; width:100%; margin-top:12px; }
  th { background:#f5f5f5; font-size:11px; padding:4px 8px; border:1px solid #ccc; text-align:center; }
  td { font-size:11px; }
  .footer { margin-top:20px; font-size:10px; color:#999; text-align:center; }
  @media print { body { margin:10mm; } }
</style></head>
<body>
  <h1>Libro de Calificaciones</h1>
  <h2>${new Date().toLocaleDateString()}</h2>
  <table><thead><tr>${cabeceras.map(c => `<th>${window.helpers.escapeHtml(c)}</th>`).join('')}</tr></thead>
  <tbody>${tablaRows.join('')}</tbody></table>
  <div class="footer">Generado el ${new Date().toLocaleString()}</div>
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
