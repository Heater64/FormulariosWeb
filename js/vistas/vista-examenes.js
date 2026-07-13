(function() {
  'use strict';
  window.vistaExamenes = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      const esProfesor = ['admin', 'editor', 'owner'].includes(usuario.rol);
      raiz.innerHTML = '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando exámenes...</p></div>';
      try {
        const examenes = await window.examenesRepository.listar(usuario);
        const misIntentos = await window.examenesRepository.misIntentos(usuario.id);
        const intentados = new Set(misIntentos.map(i => i.examen_id));
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
          const pendiente = miIntento && miIntento.estado === 'en_progreso';
          const completado = miIntento && (miIntento.estado === 'completado' || miIntento.estado === 'calificado');
          return `<div class="tarjeta-capitulo ${ex.publicado && !esProfesor ? 'tarjeta-capitulo--en-progreso' : ''}" data-examen="${ex.id}">
            <div class="o-flecha o-flecha--between"><span class="u-fw-600">${window.helpers.escapeHtml(ex.titulo)}</span><span class="u-fs-xs u-color-texto-secundario">${ex.estado}</span></div>
            ${ex.descripcion ? `<p class="u-fs-sm u-color-texto-secundario">${window.helpers.escapeHtml(ex.descripcion)}</p>` : ''}
            <div class="o-flecha o-flecha--between u-mt-2">
              <span class="u-fs-xs u-color-texto-terciario">${ex.fecha_limite ? 'Límite: ' + window.helpers.formatearFecha(ex.fecha_limite) : ''}</span>
              <div style="display:flex;gap:var(--espaciado-xs)">
                ${calif !== null ? `<span class="u-fw-700" style="color:${calif >= 70 ? 'var(--color-exito)' : 'var(--color-error)'}">${calif}%</span>` : ''}
                ${esProfesor ? `<button class="btn-secundario btn-ver-resultados" data-id="${ex.id}" style="font-size:var(--texto-xs)">Resultados</button><button class="btn-secundario btn-editar-examen" data-id="${ex.id}" style="font-size:var(--texto-xs)">Editar</button>` : ''}
                ${ex.publicado && !completado ? `<button class="btn-primario btn-iniciar-examen" data-id="${ex.id}" style="font-size:var(--texto-xs)">${pendiente ? 'Continuar' : 'Comenzar'}</button>` : ''}
                ${!ex.publicado && esProfesor ? `<button class="btn-secundario btn-publicar-examen" data-id="${ex.id}" style="font-size:var(--texto-xs)">Publicar</button>` : ''}
              </div>
            </div>
          </div>`;
        }).join('');
        cont.querySelectorAll('.btn-iniciar-examen').forEach(btn => { btn.onclick = () => router.navegar('/tomar/' + btn.dataset.id); });
        cont.querySelectorAll('.btn-editar-examen').forEach(btn => { btn.onclick = () => router.navegar('/editor/' + btn.dataset.id); });
        cont.querySelectorAll('.btn-ver-resultados').forEach(btn => { btn.onclick = () => router.navegar('/corregir/' + btn.dataset.id); });
        cont.querySelectorAll('.btn-publicar-examen').forEach(btn => {
          btn.onclick = async () => {
            if (confirm('¿Publicar este examen? Los alumnos podrán verlo.')) {
              await window.examenesRepository.publicar(btn.dataset.id);
              router.navegar('/examenes');
            }
          };
        });
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    }
  };
})();
