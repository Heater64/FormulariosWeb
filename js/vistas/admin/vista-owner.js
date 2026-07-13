(function() {
  'use strict';
  window.vistaOwner = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario || usuario.rol !== 'owner') {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p><button class="btn-primario u-mt-2" onclick="router.navegar(\'/estudio\')">Volver</button></div>'; return;
      }
      raiz.innerHTML = '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando panel de propietario...</p></div>';
      try {
        const [stats, auditoria, grupos, examenes] = await Promise.all([
          window.adminRepository.statsGenerales(),
          window.adminRepository.obtenerAuditoria(),
          window.adminRepository.listarGrupos(),
          window.adminRepository.listarExamenes()
        ]);
        this._renderizar(raiz, { stats, auditoria, grupos, examenes, usuario });
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    _renderizar(raiz, { stats, auditoria, grupos, examenes, usuario }) {
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:100px">
          <div class="o-flecha o-flecha--between"><h2>🏢 Panel de Propietario</h2><button class="btn-secundario" onclick="router.navegar('/perfil')">← Volver</button></div>
          <div class="o-grid-tarjetas" style="grid-template-columns:repeat(4,1fr)">
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Usuarios</p><p class="u-texto-lg u-fw-700">${stats.usuarios}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Exámenes</p><p class="u-texto-lg u-fw-700">${stats.examenes}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Lecturas</p><p class="u-texto-lg u-fw-700">${stats.lecturas}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Tarjetas</p><p class="u-texto-lg u-fw-700">${stats.tarjetas}</p></div>
          </div>
          <div class="o-pila"><h3>👥 Grupos (${grupos.length})</h3>
            ${grupos.map(g => `<div class="tarjeta-capitulo"><span class="u-fw-600">${window.helpers.escapeHtml(g.nombre)}</span></div>`).join('')}
          </div>
          <div class="o-pila"><h3>📝 Todos los exámenes (${examenes.length})</h3>
            ${examenes.slice(0,20).map(ex => `<div class="tarjeta-capitulo"><div class="o-flecha o-flecha--between"><span class="u-fw-600">${window.helpers.escapeHtml(ex.titulo)}</span><span class="u-fs-xs">${ex.estado} · ${ex.grupos?.nombre || ''} · ${window.helpers.formatearFecha(ex.creado_en)}</span></div></div>`).join('')}
          </div>
          <div class="o-pila"><h3>📋 Auditoría (últimas ${auditoria.length})</h3>
            <div style="max-height:400px;overflow-y:auto">${auditoria.map(a => `<div class="tarjeta-capitulo" style="border-left:3px solid var(--color-acento)"><div class="o-flecha o-flecha--between"><span class="u-fs-sm u-fw-600">${a.accion}</span><span class="u-fs-xs u-color-texto-terciario">${window.helpers.formatearFecha(a.creado_en)}</span></div><p class="u-fs-xs u-color-texto-secundario">${window.helpers.escapeHtml(a.detalle)} · ${a.perfiles?.nombre_completo || a.perfiles?.username || 'Sistema'}</p></div>`).join('')}</div>
          </div>
        </div>`;
    }
  };
})();
