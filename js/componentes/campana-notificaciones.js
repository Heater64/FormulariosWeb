// ============================================================
// js/componentes/campana-notificaciones.js
// Campana de notificaciones para la CABECERA superior de las
// secciones principales (Estudio, Exámenes, Memoria, Explorar,
// Perfil). Sustituye al item "Avisos" que vivía en la barra
// inferior: el usuario quiere el acceso a notificaciones fuera
// de la barra, integrado en la cabecera de cada sección.
//
// Mantiene los IDs que ya espera notification-service
// (#notif-barra y #notifBarraBadge) para no romper
// actualizarBadge() ni detener().
// ============================================================
(function () {
  'use strict';

  // HTML del botón campana (icono + badge sobre el icono).
  function renderCampana() {
    return (
      '<button type="button" id="notif-barra" class="notif-cabecera" aria-label="Centro de notificaciones">' +
        '<span class="notif-cabecera__icono-wrap">' +
          '<span class="notif-cabecera__icono">' + (window.Iconos ? window.Iconos.render('bell') : '') + '</span>' +
          '<span class="notif-cabecera__badge" id="notifBarraBadge" hidden>0</span>' +
        '</span>' +
      '</button>'
    );
  }

  // Conecta el clic (navegar al centro) y refresca el badge.
  // `raiz` es el contenedor donde se montó la campana.
  function conectar(raiz) {
    if (!raiz) return;
    const campana = raiz.querySelector('#notif-barra');
    if (campana) {
      campana.addEventListener('click', () => {
        if (window.router) window.router.navegar('/notificaciones');
      });
    }
    if (window.Iconos) window.Iconos.actualizar();
    if (window.notificationService) window.notificationService.actualizarBadge();
  }

  // Retira la campana del DOM (util en desmontajes).
  function quitar(raiz) {
    if (!raiz) return;
    const campana = raiz.querySelector('#notif-barra');
    if (campana) campana.remove();
  }

  window.campanaNotificaciones = { renderCampana, conectar, quitar };
})();
