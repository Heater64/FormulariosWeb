(function() {
  'use strict';
  window.vistaCalificaciones = {
    async montar(raiz, params) {
      const usuario = store.obtener('usuario');
      if (!usuario || !['admin', 'editor', 'owner'].includes(usuario.rol)) {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p></div>'; return;
      }
      raiz.innerHTML = '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando libro de calificaciones...</p></div>';
      try {
        const examenes = await window.examenesRepository.listar(usuario);
        this._renderizar(raiz, examenes, usuario);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    async _renderizar(raiz, examenes, usuario) {
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg)">
          <h2>📊 Libro de Calificaciones</h2>
          <div id="califLista" class="o-pila"></div>
        </div>`;
      const cont = raiz.querySelector('#califLista');
      if (examenes.length === 0) { cont.innerHTML = '<p class="u-color-texto-terciario">No hay exámenes</p>'; return; }
      for (const ex of examenes) {
        const intentos = await window.examenesRepository.obtenerIntentos(ex.id);
        const calificados = intentos.filter(i => i.corregido);
        const promedio = calificados.length > 0 ? Math.round(calificados.reduce((s, i) => s + parseFloat(i.nota || 0), 0) / calificados.length) : 0;
        cont.innerHTML += `
          <div class="tarjeta-capitulo">
            <div class="o-flecha o-flecha--between">
              <span class="u-fw-600">${window.helpers.escapeHtml(ex.titulo)}</span>
              <span class="u-fs-sm u-color-texto-secundario">Prom: ${promedio}%</span>
            </div>
            <div class="o-pila u-mt-1">
              ${intentos.length === 0 ? '<p class="u-fs-xs u-color-texto-terciario">Sin intentos</p>' :
                intentos.map(i => {
                  const calif = i.corregido ? parseFloat(i.nota || 0) : '—';
                  return `<div class="o-flecha o-flecha--between u-fs-sm" style="padding:var(--espaciado-xs) 0;border-bottom:1px solid var(--color-borde);${i.corregido ? '' : 'opacity:0.6'}">
                    <span>${i.perfiles?.nombre_completo || 'Alumno'}</span>
                    <span style="font-weight:${i.corregido ? '700' : '400'};color:${i.corregido ? (calif >= 70 ? 'var(--color-exito)' : 'var(--color-error)') : 'var(--color-texto-terciario)'}">${i.corregido ? calif + '%' : 'pendiente'}</span>
                  </div>`;
                }).join('')}
            </div>
          </div>`;
      }
    }
  };
})();
