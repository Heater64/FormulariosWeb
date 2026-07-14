(function() {
  'use strict';
  function colorNota(n) {
    if (n == null) return 'var(--color-texto-terciario)';
    return n >= 7 ? 'var(--color-exito)' : 'var(--color-error)';
  }
  function redondear(n) { return Math.round(n * 100) / 100; }
  window.vistaCalificaciones = {
    async montar(raiz, params) {
      const usuario = store.obtener('usuario');
      if (!usuario || !['admin', 'editor', 'owner'].includes(usuario.rol)) {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p></div>'; return;
      }
      raiz.innerHTML = '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando libro de calificaciones...</p></div>';
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
      let filtroAlumno = '';
      const completadosEval = (evalObj, alumnoId) => {
        return (evalObj.examenes || []).filter(e => notasPorExamen[e.id] && notasPorExamen[e.id][alumnoId] != null).length;
      };
      const mediaEval = (evalObj, alumnoId) => {
        const ns = (evalObj.examenes || []).map(e => notasPorExamen[e.id] && notasPorExamen[e.id][alumnoId]).filter(n => n != null);
        return ns.length ? redondear(ns.reduce((s, n) => s + n, 0) / ns.length) : null;
      };
      const mediaGrupoEval = (evalObj) => {
        const ns = [];
        (evalObj.examenes || []).forEach(e => { const m = notasPorExamen[e.id]; if (m) Object.values(m).forEach(n => ns.push(n)); });
        return ns.length ? redondear(ns.reduce((s, n) => s + n, 0) / ns.length) : null;
      };
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="o-flecha o-flecha--between o-flecha--wrap" style="gap:var(--espaciado-sm)">
            <h2>${window.Iconos.render('graduation-cap')} Libro de Calificaciones</h2>
            <div class="o-flecha" style="gap:var(--espaciado-xs)">
              <button class="btn-secundario" id="btnVolver">Volver</button>
              <button class="btn-primario" id="btnCrearEval">+ Crear evaluación</button>
            </div>
          </div>
          ${this._tarjetaCrear()}
          ${this._estadisticas(stats)}
          <div class="o-flecha u-fs-xs u-color-texto-terciario" style="gap:var(--espaciado-sm);flex-wrap:wrap">
            <span>${window.Iconos.render('info')} <span style="color:var(--color-exito);font-weight:700">Verde</span>: ≥7 &nbsp; <span style="color:var(--color-error);font-weight:700">Rojo</span>: &lt;7</span>
            <span>${window.Iconos.render('check')} Calificación automática &nbsp; ${window.Iconos.render('clipboard')} Pendiente de corrección</span>
          </div>
          <input type="text" id="filtroAlumno" placeholder="Buscar alumno..." style="width:100%;padding:var(--espaciado-sm);border:1px solid var(--color-borde);border-radius:var(--radio-md);background:var(--color-fondo);color:var(--color-texto)">
          ${evaluaciones.length === 0 && sueltos.length === 0
            ? '<p class="u-color-texto-terciario">Aún no hay evaluaciones ni exámenes. Crea una evaluación y añade exámenes.</p>'
            : alumnos.length === 0
              ? '<p class="u-color-texto-terciario">No hay alumnos asignados a este grupo.</p>'
              : evaluaciones.map(e => this._seccionEvaluacion(e, alumnos, notasPorExamen, mediaEval, completadosEval, mediaGrupoEval)).join('') +
                (sueltos.length ? this._seccionSueltos(sueltos, alumnos, notasPorExamen) : '')}
        </div>`;
      window.Iconos.actualizar();
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
      raiz.querySelectorAll('[data-anadir]').forEach(b => {
        b.onclick = () => router.navegar('/editor/nuevo?evaluacion=' + b.getAttribute('data-anadir'));
      });
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
      raiz.querySelectorAll('[data-editar-ex]').forEach(b => {
        b.onclick = () => router.navegar('/editor/' + b.getAttribute('data-editar-ex'));
      });
      raiz.querySelectorAll('[data-corregir]').forEach(b => {
        b.onclick = () => router.navegar('/corregir/' + b.getAttribute('data-corregir'));
      });
      const filtroInput = raiz.querySelector('#filtroAlumno');
      if (filtroInput) {
        filtroInput.addEventListener('input', () => {
          const q = filtroInput.value.toLowerCase().trim();
          raiz.querySelectorAll('.fila-alumno').forEach(tr => {
            const nombre = tr.querySelector('td:first-child')?.textContent?.toLowerCase() || '';
            tr.style.display = !q || nombre.includes(q) ? '' : 'none';
          });
        });
      }
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
    _estadisticas(stats) {
      if (!stats) return '';
      const tarjeta = (icono, valor, etiqueta, color) => `
        <div class="tarjeta-estadistica" style="flex:1;min-width:120px;border-left:3px solid ${color || 'var(--color-borde)'}">
          <div class="o-flecha o-flecha--between">
            <span class="u-fs-xs u-color-texto-secundario">${etiqueta}</span>
            <span>${window.Iconos.render(icono)}</span>
          </div>
          <p class="u-texto-2xl u-fw-700" style="color:${color || 'var(--color-texto)'}">${valor}</p>
        </div>`;
      return `
        <div style="display:flex;gap:var(--espaciado-sm);flex-wrap:wrap" class="u-mt-2 u-mb-2">
          ${tarjeta('users', stats.totalAlumnos, 'Alumnos', 'var(--color-texto)')}
          ${tarjeta('clipboard-check', stats.totalExamenes, 'Exámenes', 'var(--color-texto)')}
          ${tarjeta('percent', stats.promedioGrupo, 'Prom. grupo', stats.promedioGrupo >= 7 ? 'var(--color-exito)' : 'var(--color-error)')}
          ${tarjeta('check-check', stats.aprobados, 'Aprobados (≥70)', 'var(--color-exito)')}
          ${tarjeta('alert-triangle', stats.enRiesgo, 'En riesgo (<70)', 'var(--color-error)')}
          ${tarjeta('star', stats.destacados, 'Destacados (≥90)', 'var(--color-acento)')}
        </div>`;
    },
    _seccionEvaluacion(e, alumnos, notasPorExamen, mediaEval, completadosEval, mediaGrupoEval) {
      const mg = mediaGrupoEval(e);
      const examenes = e.examenes || [];
      const totalEx = examenes.length;
      const cabecera = `
        <div class="o-flecha o-flecha--between o-flecha--wrap" style="gap:var(--espaciado-sm)">
          <div>
            <h3 class="u-fw-700">${window.helpers.escapeHtml(e.titulo)}</h3>
            ${e.asignatura ? `<span class="u-fs-xs u-color-texto-secundario">${window.helpers.escapeHtml(e.asignatura)}</span>` : ''}
          </div>
          <div class="o-flecha" style="gap:var(--espaciado-xs)">
            <span class="u-fs-sm u-fw-700">Media grupo: <span style="color:${colorNota(mg)}">${mg != null ? mg : '—'}</span></span>
            <button class="btn-enlace u-fs-xs" data-editar-eval="${e.id}">Editar</button>
            <button class="btn-secundario u-fs-xs" data-anadir="${e.id}">+ Añadir examen</button>
            <button class="btn-peligro u-fs-xs" data-eliminar-eval="${e.id}" data-titulo="${window.helpers.escapeHtml(e.titulo)}" style="width:auto">${window.Iconos.render('trash-2')} Eliminar</button>
          </div>
        </div>`;
      const tabla = examenes.length === 0
        ? '<p class="u-fs-sm u-color-texto-terciario u-mt-2">Sin exámenes todavía. Pulsa “+ Añadir examen”.</p>'
        : `
          <div style="overflow-x:auto;-webkit-overflow-scrolling:touch" class="u-mt-2">
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
                      return `<td style="text-align:center;font-weight:${nota != null ? '700' : '400'};color:${colorNota(nota)}">${nota != null ? nota : '—'}</td>`;
                    }).join('')}
                    <td style="text-align:center;font-size:var(--texto-xs);color:${compl === totalEx ? 'var(--color-exito)' : 'var(--color-texto-terciario)'}">${compl}/${totalEx}</td>
                    <td style="text-align:center;font-weight:700;color:${colorNota(media)}">${media != null ? media : '—'}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          <p class="u-fs-xs u-color-texto-terciario u-mt-2">La media de cada alumno se recalcula automáticamente al corregir los exámenes de esta evaluación.</p>`;
      return `<section class="tarjeta-capitulo o-pila" style="padding:var(--espaciado-md)">${cabecera}${tabla}</section>`;
    },
    _seccionSueltos(sueltos, alumnos, notasPorExamen) {
      const cabecera = `
        <div class="o-flecha o-flecha--between">
          <h3 class="u-fw-700">Exámenes sin evaluación</h3>
        </div>`;
      const tabla = `
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch" class="u-mt-2">
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
                  return `<td style="text-align:center;font-weight:${nota != null ? '700' : '400'};color:${colorNota(nota)}">${nota != null ? nota : '—'}</td>`;
                }).join('')}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
      return `<section class="tarjeta-capitulo o-pila" style="padding:var(--espaciado-md)">${cabecera}${tabla}</section>`;
    }
  };
})();
