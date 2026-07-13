(function() {
  'use strict';
  window.vistaProgreso = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      raiz.innerHTML = '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando estadísticas...</p></div>';
      const sb = window.supabaseClient;
      if (!sb) return;
      try {
        const { data: progreso } = await sb.from('progreso_lectura').select('*, capitulos!capitulo_id(libro_id)').eq('usuario_id', usuario.id);
        const leidos = (progreso || []).filter(p => p.completado);
        const librosCompletados = new Set(leidos.map(p => p.capitulos?.libro_id).filter(Boolean));
        const { count: examenesCount } = await sb.from('intentos_examen_personalizado').select('id', { count: 'exact', head: true }).eq('alumno_id', usuario.id);
        const tarjetas = await window.memorizacionRepository.contarTarjetas(usuario.id);
        const repasos = await window.memorizacionRepository.totalRepasos(usuario.id);
        const racha = window.progresoLectura.calcularRacha(leidos);
        const { data: logrosUsuario } = await sb.from('logros_usuario').select('*, logros!logro_id(*)').eq('usuario_id', usuario.id);
        const progresoData = {
          capitulosLeidos: leidos.length, librosCompletados: librosCompletados.size,
          racha, examenesCompletados: examenesCount || 0, tarjetasCreadas: tarjetas,
          totalRepasos: repasos, ntCompleto: false, atCompleto: false, examenPerfecto: false
        };
        const nuevosLogros = await window.logrosDominio.verificarYOtorgar(usuario.id, progresoData);
        raiz.innerHTML = `
          <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:100px">
            <div class="o-flecha o-flecha--between"><h2>📊 Progreso</h2><span class="u-fs-sm u-color-texto-terciario">@${usuario.username}</span></div>
            <div class="o-grid-tarjetas" style="grid-template-columns:repeat(4,1fr)">
              <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Capítulos</p><p class="u-texto-xl u-fw-700">${leidos.length}</p></div>
              <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">🔥 Racha</p><p class="u-texto-xl u-fw-700">${racha} días</p></div>
              <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">📝 Exámenes</p><p class="u-texto-xl u-fw-700">${examenesCount || 0}</p></div>
              <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">🧠 Tarjetas</p><p class="u-texto-xl u-fw-700">${tarjetas}</p></div>
            </div>
            <div class="o-pila"><h3>🏅 Logros (${(logrosUsuario||[]).length})</h3>
              ${nuevosLogros.length > 0 ? `<div class="o-pila u-mb-2" style="background:var(--color-exito-soft,#d1fae5);border-radius:var(--radio-md);padding:var(--espaciado-sm)"><p class="u-fs-sm u-fw-600 u-color-exito">🎉 Nuevos logros desbloqueados:</p>${nuevosLogros.map(l => `<span class="u-fs-sm">${l.icono} ${l.nombre}</span>`).join(', ')}</div>` : ''}
              <div class="o-grid-tarjetas" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">
                ${(logrosUsuario||[]).length === 0 ? '<p class="u-color-texto-terciario u-fs-sm">Completa capítulos y exámenes para ganar logros</p>' :
                  logrosUsuario.map(lu => `<div class="tarjeta-capitulo u-texto-centrado" title="${lu.logros?.descripcion || ''}"><p style="font-size:2rem">${lu.logros?.icono || '🏆'}</p><p class="u-fs-xs u-fw-600">${lu.logros?.nombre || ''}</p></div>`).join('')}
              </div>
            </div>
          </div>`;
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    }
  };
})();
