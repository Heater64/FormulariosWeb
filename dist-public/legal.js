// legal.js — Botón "Volver" contextual de las páginas legales compartidas
// (privacidad.html, terminos.html, licencias.html, contacto.html).
//
// Estas páginas las comparten el login (login.html / landing) y el perfil de
// la app (SPA). El botón Volver debe llevar a donde se hizo clic:
//   - Desde el perfil: la app abre la página con ?volver=<ruta> y el botón
//     lleva exactamente a esa ruta (dev: index.html#!/perfil, prod: /app/#!/perfil).
//   - Desde el login/landing (sin parámetro): se vuelve con history.back(),
//     que restaura la página de origen (login.html en dev, la landing en prod).
//   - Visita directa (sin referrer ni parámetro): se usa el href por defecto.
(function () {
  'use strict';
  var link = document.querySelector('.back');
  if (!link) return;

  try {
    var volver = new URLSearchParams(window.location.search).get('volver');
    if (volver) {
      link.href = decodeURIComponent(volver);
      return;
    }
  } catch (e) { /* parámetro corrupto: usar comportamiento por defecto */ }

  // Vino del login, la landing o el perfil (mismo sitio): volver al historial,
  // que restaura exactamente el punto donde se hizo clic.
  var ref = document.referrer;
  if (ref && ref.indexOf(window.location.origin) === 0) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      window.history.back();
    });
  }
})();
