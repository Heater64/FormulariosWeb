// ============================================================================
// js/vistas/admin/panel-admin-boot.js — arranque del Centro de Administración
// ============================================================================
// Este código vivía como <script> inline en paginas/admin/panel-admin.html,
// pero la CSP de producción (script-src 'self', sin 'unsafe-inline') bloquea
// los scripts incrustados y la página se quedaba en blanco. Va en un archivo
// externo y se carga con defer, tras el resto de dependencias del panel.
document.addEventListener('DOMContentLoaded', () => {
  // Aplicar el tema y ajustes del usuario (oscuro, contraste, texto
  // grande) igual que en el SPA; sin esto la página ignora sus ajustes.
  if (window.preferencias) window.preferencias.aplicar();
  // Restaurar sesión persistida (la guarda el SPA en localStorage/sessionStorage)
  const guardado = localStorage.getItem('fb_usuario') || sessionStorage.getItem('fb_usuario');
  if (guardado) {
    try { store.asignar({ usuario: JSON.parse(guardado) }); } catch (e) {}
  }
  const usuario = store.obtener('usuario');
  const rol = (usuario?.rol || '').toString().trim().toLowerCase();
  if (!usuario || !['admin', 'owner'].includes(rol)) {
    // Sin sesión: fuera del panel, al login normal. En producción la app vive
    // en /app/paginas/admin/ y el login es la landing de la raíz; en
    // desarrollo el login es /login.html junto a la app (igual que
    // irAlLogin() en js/core/index.js).
    const enApp = window.location.pathname.startsWith('/app');
    window.location.href = enApp ? '../../' : '../../login.html';
    return;
  }
  // El botón "← Volver" de la vista usa router.navegar; en esta página standalone
  // no hay rutas registradas, así que redirigimos al SPA manualmente.
  // Se vuelve al origen (?origen=cuenta|perfil); por defecto a la cuenta.
  // La lista blanca evita redirecciones abiertas vía query manipulado.
  // Barra de navegación con los mismos ítems que el SPA según el rol. Los
  // enlaces van al SPA (index.html); owner y admin aterrizan aquí en "Inicio".
  const renderizarNav = (usuario) => {
    const nav = document.getElementById('barra-navegacion');
    if (!nav) return;
    const E = (v) => window.helpers.escapeHtml(v == null ? '' : String(v));
    let marca = 'FormsBiblicos';
    try {
      const c = JSON.parse(localStorage.getItem('fb_marca') || 'null');
      if (c && c.marca_nombre) marca = c.marca_nombre;
    } catch (e) { /* caché corrupta: nombre por defecto */ }
    const SPA = '../../index.html#!';
    const rol = (usuario.rol || '').trim().toLowerCase();
    const items = rol === 'owner'
      ? [
          { ruta: 'panel-admin.html', icono: 'settings', texto: 'Panel de admin', activo: true },
          { ruta: SPA + '/cuenta', icono: 'user', texto: 'Cuenta' }
        ]
      : [
          { ruta: SPA + '/inicio', icono: 'home', texto: 'Inicio' },
          { ruta: SPA + '/examenes', icono: 'clipboard-check', texto: 'Exámenes', centro: true },
          { ruta: SPA + '/evaluaciones', icono: 'clipboard-list', texto: 'Evaluaciones' },
          { ruta: SPA + '/entregas', icono: 'inbox', texto: 'Entregas' },
          { ruta: SPA + '/cuenta', icono: 'user', texto: 'Cuenta' }
        ];
    nav.innerHTML = `
      <div class="barra-nav-inferior__marca">
        <span class="barra-nav-inferior__logo" aria-hidden="true"><img src="../../assets/iconos/icono.svg" alt="" class="barra-nav-inferior__logo-img"></span>
        <span class="barra-nav-inferior__marca-nombre">${E(marca)}</span>
      </div>
      <div class="barra-nav-inferior__items" role="tablist" aria-label="Navegación principal">
        ${items.map((i) => `<a href="${E(i.ruta)}" class="barra-nav-inferior__item${i.activo ? ' barra-nav-inferior__item--activo' : ''}${i.centro ? ' barra-nav-inferior__item--centro' : ''}" role="tab" aria-selected="${!!i.activo}" aria-label="${E(i.texto)}"><span class="barra-nav-inferior__icono">${window.Iconos.render(i.icono)}</span><span class="barra-nav-inferior__texto">${E(i.texto)}</span></a>`).join('')}
      </div>`;
    nav.style.display = '';
  };
  renderizarNav(usuario);
  const _origen = new URLSearchParams(window.location.search).get('origen');
  const _destino = _origen === 'perfil' ? 'perfil' : 'cuenta';
  window.vistaPanelAdmin._volverAlSpa = () => {
    window.location.href = '../../index.html#!/' + _destino;
  };
  // Reenviar el query (?tab=...&mazo=...) como contexto para que los
  // deep links (p. ej. desde Memorización) abran la pestaña indicada.
  const query = new URLSearchParams(window.location.search);
  window.vistaPanelAdmin.montar(document.getElementById('app-root'), { query });
});
