// ============================================================
// js/componentes/pwa-pill.js
// Píldora discreta «Instalar app» para alumnos (no es un modal).
//   • Solo aparece si el navegador ofrece instalación (beforeinstallprompt)
//     y la app no está ya instalada.
//   • «×» descarta. El descarte se guarda con el id del examen: se oculta
//     mientras el alumno siga en ese examen y vuelve a aparecer al abrir
//     OTRO examen. La landing no borra el descarte.
// ============================================================

(function (root) {
  'use strict';

  const CLAVE_ESTADO = 'fb_pwa_pill';
  const ID_LANDING = 'inicio';

  let evento = null;      // beforeinstallprompt capturado
  let instalada = false;
  const montajes = [];    // { contenedor, id, esExamen, el }

  // Se registra al cargar el script para no perder el evento si llega antes del montaje.
  root.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    evento = e;
    montajes.forEach(refrescar);
  });
  root.addEventListener('appinstalled', () => {
    instalada = true;
    montajes.forEach(refrescar);
  });

  function yaInstalada() {
    try {
      if (root.matchMedia && root.matchMedia('(display-mode: standalone)').matches) return true;
    } catch (e) { /* sin matchMedia */ }
    if (root.navigator && root.navigator.standalone === true) return true;
    const cap = root.Capacitor;
    return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  }

  function leerEstado() {
    try {
      const crudo = root.localStorage && root.localStorage.getItem(CLAVE_ESTADO);
      return crudo ? JSON.parse(crudo) : {};
    } catch (e) { return {}; }
  }

  function guardarEstado(estado) {
    try {
      if (root.localStorage) root.localStorage.setItem(CLAVE_ESTADO, JSON.stringify(estado));
    } catch (e) { /* sin almacenamiento: el descarte dura solo esta visita */ }
  }

  // Oculta si hay descarte para este id, o si el descarte es de otro punto
  // y estamos en la landing (que no cuenta como examen).
  function descartadaAqui(id, esExamen) {
    const estado = leerEstado();
    if (!estado.descartadoPara) return false;
    if (esExamen) {
      if (estado.descartadoPara !== id) {
        // Alumno abre otro examen: el descarte caduca.
        guardarEstado({});
        return false;
      }
      return true;
    }
    return true;
  }

  function estilos() {
    if (document.getElementById('pwa-pill-estilos')) return;
    const style = document.createElement('style');
    style.id = 'pwa-pill-estilos';
    style.textContent = `
      .pwa-pill{display:flex;align-items:center;gap:10px;width:fit-content;max-width:100%;margin:0 auto 12px;padding:6px 6px 6px 14px;border:1px solid var(--b,#E2E8F0);border-radius:999px;background:var(--c,#fff);color:var(--ts,#475569);font:500 13px/1.3 var(--body,system-ui,sans-serif);box-shadow:0 1px 2px rgba(0,0,0,.06)}
      .pwa-pill__texto{white-space:nowrap}
      .pwa-pill__instalar{border:0;border-radius:999px;padding:7px 14px;background:var(--a,#2563EB);color:#fff;font:inherit;font-weight:700;cursor:pointer}
      .pwa-pill__instalar:hover{background:var(--ah,#1D4ED8)}
      .pwa-pill__cerrar{border:0;background:transparent;color:var(--tt,#5E6D84);font-size:18px;line-height:1;width:32px;height:32px;border-radius:50%;cursor:pointer}
      .pwa-pill__cerrar:hover{background:var(--fa,#F1F5F9)}
      .pwa-pill:focus-within{outline:none}
    `;
    document.head.appendChild(style);
  }

  function refrescar(m) {
    const debeVerse = evento && !instalada && !yaInstalada() && !descartadaAqui(m.id, m.esExamen);
    if (!debeVerse) {
      if (m.el) { m.el.remove(); m.el = null; }
      return;
    }
    if (m.el && m.el.isConnected) return;
    m.el = crear(m);
    m.contenedor.insertBefore(m.el, m.contenedor.firstChild);
  }

  function crear(m) {
    const el = document.createElement('div');
    el.className = 'pwa-pill';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Instalar la app');
    el.innerHTML = `
      <span class="pwa-pill__texto">Instala la app en tu dispositivo</span>
      <button class="pwa-pill__instalar" type="button">Instalar</button>
      <button class="pwa-pill__cerrar" type="button" aria-label="Ahora no">×</button>`;

    el.querySelector('.pwa-pill__instalar').addEventListener('click', async () => {
      const ev = evento;
      if (!ev || typeof ev.prompt !== 'function') return;
      try {
        ev.prompt();
        const r = await ev.userChoice;
        if (r && r.outcome === 'accepted') instalada = true;
      } catch (e) { /* cancelado o no soportado */ }
      evento = null;
      montajes.forEach(refrescar);
    });

    el.querySelector('.pwa-pill__cerrar').addEventListener('click', () => {
      guardarEstado({ descartadoPara: m.id });
      el.remove();
      m.el = null;
    });

    return el;
  }

  // Monta la píldora en `contenedor` (se inserta al principio).
  // `id` identifica el punto: el token del examen, o ID_LANDING.
  function montar(opciones) {
    if (!opciones || !opciones.contenedor) return;
    estilos();
    const m = {
      contenedor: opciones.contenedor,
      id: opciones.id || ID_LANDING,
      esExamen: !!opciones.esExamen,
      el: null
    };
    montajes.push(m);
    refrescar(m);
  }

  root.PwaPill = { montar, ID_LANDING };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ID_LANDING };
  }
})(typeof window !== 'undefined' ? window : globalThis);
