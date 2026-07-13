(function() {
  'use strict';
  window.vistaExamenes = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      const esProfesor = ['admin', 'editor', 'owner'].includes(usuario.rol);
      raiz.innerHTML = '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando exámenes...</p></div>';
      try {
        const [examenes, misIntentos] = await Promise.all([
          window.examenesRepository.listar(usuario),
          window.examenesRepository.misIntentos(usuario.id)
        ]);
        this._grupoId = usuario.grupo_id;
        this._alumnos = esProfesor ? await window.examenesRepository.obtenerMiembrosGrupo(usuario.grupo_id, true) : [];
        this._intentosGrupo = esProfesor ? await window.examenesRepository.obtenerIntentosGrupo(usuario.grupo_id) : [];
        raiz.innerHTML = `
          <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:100px">
            <div class="o-flecha o-flecha--between">
              <h2>${window.Iconos.render('clipboard-check')} Exámenes</h2>
              <div style="display:flex;gap:var(--espaciado-xs)">
                ${esProfesor ? '<button class="btn-primario" id="btnNuevoExamen">+ Nuevo</button>' : ''}
                ${esProfesor ? '<button class="btn-secundario" id="btnCalificaciones">Notas</button>' : ''}
              </div>
            </div>
            <div id="listaExamenes" class="o-pila"></div>
          </div>`;
        if (esProfesor) {
          raiz.querySelector('#btnNuevoExamen').onclick = () => router.navegar('/editor/nuevo');
          raiz.querySelector('#btnCalificaciones').onclick = () => router.navegar('/calificaciones');
        }
        const cont = raiz.querySelector('#listaExamenes');
        if (examenes.length === 0) {
          cont.innerHTML = `<div class="u-texto-centrado o-pila u-mt-4" style="align-items:center"><p style="font-size:3rem;color:var(--color-texto-terciario);display:flex;justify-content:center">${window.Iconos.render('clipboard-check')}</p><p class="u-color-texto-secundario">No hay exámenes disponibles</p></div>`;
          return;
        }
        cont.innerHTML = examenes.map(ex => {
          const miIntento = misIntentos.find(i => i.examen_id === ex.id);
          const calif = miIntento && miIntento.corregido ? miIntento.nota : null;
          const enProgreso = miIntento && miIntento.estado === 'en_progreso';
          const completado = miIntento && (miIntento.estado === 'completado' || miIntento.estado === 'calificado');
          const estado = esProfesor ? ex.estado
            : completado ? (miIntento.corregido ? 'Calificado' : 'Pendiente de calificación')
            : enProgreso ? 'En progreso'
            : 'Disponible';
          let stats = '';
          if (esProfesor) {
            const ints = this._intentosGrupo.filter(i => i.examen_id === ex.id);
            const total = ints.length;
            const hechos = ints.filter(i => i.estado === 'completado' || i.estado === 'calificado').length;
            const pend = total - hechos;
            stats = `<span class="u-fs-xs u-color-texto-terciario">${total} asignados · ${hechos} completados · ${pend} pendientes</span>`;
          }
          return `<div class="tarjeta-capitulo ${enProgreso ? 'tarjeta-capitulo--en-progreso' : ''}" data-examen="${ex.id}">
            <div class="o-flecha o-flecha--between"><span class="u-fw-600">${window.helpers.escapeHtml(ex.titulo)}</span><span class="u-fs-xs u-color-texto-secundario">${estado}</span></div>
            ${ex.descripcion ? `<p class="u-fs-sm u-color-texto-secundario">${window.helpers.escapeHtml(ex.descripcion)}</p>` : ''}
            ${stats ? `<p class="u-fs-xs u-color-texto-terciario u-mt-1">${stats}</p>` : ''}
            <div class="o-flecha o-flecha--between u-mt-2">
              <span class="u-fs-xs u-color-texto-terciario">${ex.fecha_limite ? 'Límite: ' + window.helpers.formatearFecha(ex.fecha_limite) : ''}</span>
              <div style="display:flex;gap:var(--espaciado-xs);flex-wrap:wrap;justify-content:flex-end">
                ${calif !== null ? `<span class="u-fw-700" style="color:${calif >= 7 ? 'var(--color-exito)' : 'var(--color-error)'}">${calif}</span>` : ''}
                ${esProfesor ? `<button class="btn-secundario btn-editar-examen" data-id="${ex.id}" style="font-size:var(--texto-xs)">Editar</button>${ex.publicado ? `<button class="btn-secundario btn-compartir-examen" data-id="${ex.id}" data-titulo="${window.helpers.escapeHtml(ex.titulo)}" style="font-size:var(--texto-xs)">${window.Iconos.render('share-2')} Compartir</button><button class="btn-secundario btn-ver-resultados" data-id="${ex.id}" style="font-size:var(--texto-xs)">Resultados</button><button class="btn-secundario btn-gestionar-alumnos" data-id="${ex.id}" style="font-size:var(--texto-xs)">${window.Iconos.render('users')} Alumnos</button>` : `<button class="btn-secundario btn-publicar-examen" data-id="${ex.id}" style="font-size:var(--texto-xs)">Publicar</button>`}` : ''}
                ${esProfesor ? `<button class="btn-peligro btn-eliminar-examen" data-id="${ex.id}" data-titulo="${window.helpers.escapeHtml(ex.titulo)}" style="font-size:var(--texto-xs);width:auto">${window.Iconos.render('trash-2')} Eliminar</button>` : ''}
                ${!esProfesor && ex.publicado && !completado ? `<button class="btn-primario btn-iniciar-examen" data-id="${ex.id}" style="font-size:var(--texto-xs)">${enProgreso ? 'Continuar' : 'Comenzar'}</button>` : ''}
                ${!esProfesor && completado ? `<button class="btn-secundario btn-ver-resultados-alumno" data-id="${ex.id}" style="font-size:var(--texto-xs)">Ver resultados</button>` : ''}
              </div>
            </div>
          </div>`;
        }).join('');
        cont.querySelectorAll('.btn-iniciar-examen').forEach(btn => { btn.onclick = () => router.navegar('/tomar/' + btn.dataset.id); });
        cont.querySelectorAll('.btn-editar-examen').forEach(btn => { btn.onclick = () => router.navegar('/editor/' + btn.dataset.id); });
        cont.querySelectorAll('.btn-ver-resultados-alumno').forEach(btn => { btn.onclick = () => router.navegar('/tomar/' + btn.dataset.id); });
        cont.querySelectorAll('.btn-ver-resultados').forEach(btn => { btn.onclick = () => router.navegar('/corregir/' + btn.dataset.id); });
        cont.querySelectorAll('.btn-publicar-examen').forEach(btn => {
          btn.onclick = async () => {
            const ok = await window.helpers.confirmar('Los alumnos podrán ver y realizar este examen.', { titulo: '¿Publicar este examen?', textoConfirmar: 'Publicar' });
            if (!ok) return;
            await window.examenesRepository.publicar(btn.dataset.id);
            router.navegar('/examenes');
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
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    _modalGestionarAlumnos(raiz, examenId) {
      const examen = (this._intentosGrupo || []);
      const asignados = new Set(examen.filter(i => i.examen_id === examenId).map(i => i.alumno_id));
      const lista = this._alumnos.map(a => `
        <label class="o-flecha u-mb-1" style="gap:var(--espaciado-sm);cursor:pointer;padding:var(--espaciado-xs);border-radius:var(--radio-sm);border:1px solid var(--color-borde)">
          <input type="checkbox" class="alumno-check" value="${a.id}" ${asignados.has(a.id) ? 'checked disabled' : ''}>
          <span class="u-fs-sm">${window.helpers.escapeHtml(a.nombre_completo || a.username)}</span>
          ${asignados.has(a.id) ? '<span class="u-fs-xs u-color-texto-terciario" style="margin-left:auto">Asignado</span>' : ''}
        </label>`).join('');
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:200;padding:var(--espaciado-md)';
      overlay.innerHTML = `
        <div class="tarjeta-capitulo" style="width:min(480px,92vw);max-height:80vh;overflow:auto">
          <div class="o-flecha o-flecha--between">
            <h3>Gestionar alumnos</h3>
            <button class="btn-secundario" id="btnCerrarModal" style="font-size:var(--texto-xs)">Cerrar</button>
          </div>
          <p class="u-fs-xs u-color-texto-secundario">Marca los alumnos que quieras añadir a esta evaluación. Los ya asignados no se pueden quitar desde aquí.</p>
          <div class="o-pila u-mt-2" id="listaAlumnos">${lista || '<p class="u-color-texto-terciario">No hay alumnos en el grupo.</p>'}</div>
          <button class="btn-primario u-mt-2" id="btnAñadirAlumnos" style="width:100%;justify-content:center">Añadir seleccionados</button>
        </div>`;
      document.body.appendChild(overlay);
      window.Iconos.actualizar();
      const cerrar = () => overlay.remove();
      overlay.querySelector('#btnCerrarModal').onclick = cerrar;
      overlay.onclick = (e) => { if (e.target === overlay) cerrar(); };
        overlay.querySelector('#btnAñadirAlumnos').onclick = async () => {
          const ids = Array.from(overlay.querySelectorAll('.alumno-check:checked:not([disabled])')).map(c => c.value);
          if (ids.length === 0) { window.helpers.mostrarAlerta('Marca al menos un alumno para añadir.', 'advertencia'); return; }
          try {
            const n = await window.examenesRepository.asignarAlumnos(examenId, ids);
            window.helpers.mostrarAlerta(n + ' alumno(s) añadido(s) a la evaluación.', 'exito');
            overlay.remove();
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
          window.helpers.mostrarAlerta('Enlace copiado al portapapeles. Se abre WhatsApp para compartirlo.', 'info');
          window.open(waUrl, '_blank');
        }).catch(() => { window.open(waUrl, '_blank'); });
      } else {
        window.open(waUrl, '_blank');
      }
    }
  };
})();
