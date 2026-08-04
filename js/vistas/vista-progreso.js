(function() {
  'use strict';

  const I = (n) => window.Iconos.render(n);

  window.vistaProgreso = {
    _cleanup: null,

    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }

      raiz.innerHTML = window.skeleton
        ? `<div class="o-contenedor o-pila o-pila--lg u-mt-3">${window.skeleton.tarjetas(6, { ancho: '100%' })}</div>`
        : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando progreso...</p></div>';

      try {
        const stats = await Promise.all([
          window.adminRepository ? window.adminRepository.estadisticas(usuario.grupo_id).catch(() => null) : null,
          window.examenesRepository ? window.examenesRepository.misIntentos(usuario.id).catch(() => []) : [],
        ]);
        const [adminStats, intentos] = stats;

        const examenesRealizados = intentos.filter(i => i.estado === 'completado' || i.estado === 'calificado');
        const notasExamenes = examenesRealizados.filter(i => i.corregido && i.nota != null).map(i => i.nota);
        const promedioExamenes = notasExamenes.length > 0
          ? (notasExamenes.reduce((s, n) => s + n, 0) / notasExamenes.length).toFixed(1)
          : '—';

        const racha = parseInt(localStorage.getItem('fb_racha') || '0', 10);
        const lecturas = adminStats && adminStats.lecturas != null ? adminStats.lecturas : parseInt(localStorage.getItem('fb_est_lecturas') || '0', 10);
        const tarjetas = adminStats && adminStats.tarjetas != null ? adminStats.tarjetas : parseInt(localStorage.getItem('fb_est_tarjetas') || '0', 10);

        raiz.innerHTML = `
          <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
            <h2>${I('bar-chart-2')} Mi progreso</h2>

            <div class="o-grid-tarjetas o-grid-tarjetas--estadisticas" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:var(--espaciado-sm)">
              <div class="tarjeta-estadistica">
                <div class="tarjeta-estadistica__icono">${I('flame')}</div>
                <div class="tarjeta-estadistica__info">
                  <p class="tarjeta-estadistica__valor">${racha}</p>
                  <p class="tarjeta-estadistica__etiqueta">Racha (días)</p>
                </div>
              </div>
              <div class="tarjeta-estadistica">
                <div class="tarjeta-estadistica__icono">${I('book-open')}</div>
                <div class="tarjeta-estadistica__info">
                  <p class="tarjeta-estadistica__valor">${lecturas}</p>
                  <p class="tarjeta-estadistica__etiqueta">Capítulos leídos</p>
                </div>
              </div>
              <div class="tarjeta-estadistica">
                <div class="tarjeta-estadistica__icono">${I('brain')}</div>
                <div class="tarjeta-estadistica__info">
                  <p class="tarjeta-estadistica__valor">${tarjetas}</p>
                  <p class="tarjeta-estadistica__etiqueta">Tarjetas memoria</p>
                </div>
              </div>
              <div class="tarjeta-estadistica">
                <div class="tarjeta-estadistica__icono">${I('clipboard-check')}</div>
                <div class="tarjeta-estadistica__info">
                  <p class="tarjeta-estadistica__valor">${examenesRealizados.length}</p>
                  <p class="tarjeta-estadistica__etiqueta">Exámenes hechos</p>
                </div>
              </div>
               <div class="tarjeta-estadistica">
                 <div class="tarjeta-estadistica__icono">${I('award')}</div>
                 <div class="tarjeta-estadistica__info">
                   <p class="tarjeta-estadistica__valor" style="color:${promedioExamenes !== '—' && parseFloat(promedioExamenes) >= 7 ? 'var(--color-exito)' : 'var(--color-aviso)'}">${promedioExamenes}</p>
                   <p class="tarjeta-estadistica__etiqueta">Promedio exámenes</p>
                 </div>
               </div>
             </div>

            <h3 class="u-mt-3">${I('clipboard-check')} Últimos exámenes</h3>
            <div id="ultimosExamenes" class="o-pila" style="gap:var(--espaciado-sm)">
              ${examenesRealizados.length === 0
                ? '<p class="u-color-texto-terciario u-fs-sm">Aún no has realizado ningún examen.</p>'
                : examenesRealizados.slice(-5).reverse().map(i => {
                    const notaStr = i.corregido && i.nota != null
                      ? `<span style="color:${i.nota >= 7 ? 'var(--color-exito)' : 'var(--color-error)'};font-weight:700">${i.nota}/10</span>`
                      : '<span class="u-color-texto-terciario">Pendiente</span>';
                    return `<div class="tarjeta-capitulo" style="display:flex;justify-content:space-between;align-items:center;gap:var(--espaciado-xs)">
                      <div>
                        <p class="u-fw-600 u-fs-sm">${I('file-text')} ${window.helpers.escapeHtml(i.examen_titulo || 'Examen')}</p>
                        <p class="u-fs-xs u-color-texto-terciario">${window.helpers.formatearFecha(i.fecha_completado || i.actualizado_en)}</p>
                      </div>
                      ${notaStr}
                    </div>`;
                  }).join('')
              }
            </div>
          </div>`;

        window.Iconos.actualizar();
      } catch (e) {
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error al cargar progreso: ${e.message}</p></div>`;
      }
    },

    desmontar() {
      if (this._cleanup) { this._cleanup(); this._cleanup = null; }
    }
  };
})();
