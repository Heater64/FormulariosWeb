// ============================================================
// js/componentes/pwa-install.js
// Modal de instalación PWA.
//   • Captura beforeinstallprompt (Chrome/Edge, móvil y escritorio)
//     y ofrece el botón de instalación real del navegador.
//   • En iOS (sin beforeinstallprompt) muestra una guía de
//     "Añadir a pantalla de inicio" una vez hay sesión y 2+ visitas.
//   • Recuerda el descarte ("Ahora no") con un cooldown de 14 días
//     y no vuelve a ofrecerse si la app ya está instalada.
// ============================================================

(function (root) {
  'use strict';

  const CLAVE_ESTADO = 'fb_pwa_estado';
  const DIAS_REINTENTO = 14;
  const VISITAS_MIN_IOS = 2;

  class PwaInstall {
    constructor() {
      this._deferred = null;        // evento beforeinstallprompt pendiente
      this._overlay = null;
      this._desregistrar = () => {};
      this._focoPrevio = null;
      this._onKeyDown = (event) => this._manejarTeclado(event);
    }

    // ── Estado persistente ─────────────────────────────────
    _leerEstado() {
      try {
        const crudo = root.localStorage && root.localStorage.getItem(CLAVE_ESTADO);
        return crudo ? JSON.parse(crudo) : {};
      } catch (e) {
        return {};
      }
    }

    _guardarEstado(parcial) {
      try {
        const estado = { ...this._leerEstado(), ...parcial };
        if (root.localStorage) root.localStorage.setItem(CLAVE_ESTADO, JSON.stringify(estado));
      } catch (e) { /* sin almacenamiento: no se persiste, no pasa nada */ }
    }

    // ── Detección ──────────────────────────────────────────
    yaInstalada() {
      try {
        if (root.matchMedia && root.matchMedia('(display-mode: standalone)').matches) return true;
      } catch (e) {}
      // iOS: navigator.standalone es true dentro de la app añadida.
      if (root.navigator && root.navigator.standalone === true) return true;
      // APK nativa (Capacitor): ya es una app instalada.
      const cap = root.Capacitor;
      if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) return true;
      return false;
    }

    esIOS() {
      const ua = (root.navigator && root.navigator.userAgent) || '';
      return /iPad|iPhone|iPod/.test(ua) && !root.MSStream;
    }

    _tieneEventoInstalacion() {
      return 'onbeforeinstallprompt' in root;
    }

    _enCooldown() {
      const estado = this._leerEstado();
      if (!estado.descartadoEn) return false;
      return (Date.now() - estado.descartadoEn) / 86400000 < DIAS_REINTENTO;
    }

    // ── Arranque ───────────────────────────────────────────
    iniciar() {
      if (this.yaInstalada()) return;

      root.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        this._deferred = event;
        this._autoMostrar();
      });

      root.addEventListener('appinstalled', () => {
        this._guardarEstado({ instalada: true, descartadoEn: null });
        this.cerrar();
      });

      // iOS / navegadores sin beforeinstallprompt: contar visitas y
      // ofrecer la guía cuando haya sesión y suficientes visitas.
      if (!this._tieneEventoInstalacion()) {
        this._contarVisita();
        if (root.store && typeof root.store.suscribir === 'function') {
          root.store.suscribir('usuario', () => this._autoMostrar());
        }
        setTimeout(() => this._autoMostrar(), 5000);
      }
    }

    _contarVisita() {
      const estado = this._leerEstado();
      const visitas = (estado.visitas || 0) + 1;
      this._guardarEstado({ visitas });
      return visitas;
    }

    _autoMostrar() {
      if (this._overlay || this.yaInstalada() || this._enCooldown()) return;
      const estado = this._leerEstado();
      if (estado.instalada) return;

      // Con beforeinstallprompt: el navegador ya exigió engagement.
      if (this._deferred) { this.mostrar(); return; }

      // Sin evento (iOS): solo con sesión iniciada y visitas suficientes,
      // para no molestar en la pantalla de login.
      const usuario = root.store && typeof root.store.obtener === 'function'
        ? root.store.obtener('usuario')
        : null;
      if (!usuario) return;
      if ((estado.visitas || 0) >= VISITAS_MIN_IOS) this.mostrar();
    }

    // El auto-mostrado ya comprobó cooldown/instalada antes de llamar.
    mostrar() {
      if (this._overlay || this.yaInstalada() || this._enCooldown()) return;
      this._focoPrevio = document.activeElement;
      this._render();
    }

    cerrar() {
      if (!this._overlay) return;
      document.removeEventListener('keydown', this._onKeyDown);
      this._desregistrar();
      this._overlay.remove();
      this._overlay = null;
      if (this._focoPrevio && this._focoPrevio.isConnected) this._focoPrevio.focus();
    }

    // Cualquier cierre sin instalar cuenta como descarte (cooldown).
    _descartar() {
      this._guardarEstado({ descartadoEn: Date.now() });
      this.cerrar();
    }

    // ── Render ─────────────────────────────────────────────
    _render() {
      const conInstalacion = !!this._deferred;
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay pwa-install-overlay';
      this._overlay = overlay;
      document.body.appendChild(overlay);
      this._desregistrar = root.backNav ? root.backNav.registrar(() => this._descartar()) : () => {};

      const icono = (nombre) => (root.Iconos ? root.Iconos.render(nombre) : '');
      const tituloId = 'pwaInstallTitulo';

      const cuerpo = conInstalacion
        ? `
          <p class="pwa-install__lede">Tu estudio, siempre a un toque. Instálala y entra directo desde tu pantalla de inicio.</p>
          <ul class="pwa-install__beneficios">
            <li>${icono('smartphone')}<div><strong>Un toque para entrar</strong><span>Se abre como una app, sin volver a escribir la dirección.</span></div></li>
            <li>${icono('maximize')}<div><strong>Pantalla completa</strong><span>Sin la barra del navegador: más espacio para leer y estudiar.</span></div></li>
            <li>${icono('download-cloud')}<div><strong>Siempre disponible</strong><span>Lo que ya has visitado se guarda en tu dispositivo, incluso con poca señal.</span></div></li>
          </ul>
          <div class="pwa-install__acciones">
            <button class="btn-secundario" type="button" data-cerrar>Ahora no</button>
            <button class="btn-primario" type="button" data-instalar>Instalar</button>
          </div>
          <p class="pwa-install__nota">Gratis · Tu cuenta y tu progreso siguen igual.</p>`
        : `
          <p class="pwa-install__lede">Abre FormsBiblicos como una app más, con un toque desde tu pantalla de inicio.</p>
          <ol class="pwa-install__pasos">
            <li><span class="pwa-install__paso-icono" aria-hidden="true">${icono('share-2')}</span><div><strong>Pulsa Compartir</strong><span>El icono de la flecha, en la barra inferior de Safari.</span></div></li>
            <li><span class="pwa-install__paso-icono" aria-hidden="true">${icono('home')}</span><div><strong>Toca «Añadir a pantalla de inicio»</strong><span>Está en el menú que se despliega al compartir.</span></div></li>
            <li><span class="pwa-install__paso-icono" aria-hidden="true">${icono('check')}</span><div><strong>Confirma con «Añadir»</strong><span>El icono aparecerá en tu pantalla de inicio.</span></div></li>
          </ol>
          <div class="pwa-install__acciones">
            <button class="btn-primario" type="button" data-cerrar>Entendido</button>
          </div>`;

      overlay.innerHTML = `
        <section class="modal pwa-install" role="dialog" aria-modal="true" aria-labelledby="${tituloId}">
          <button class="pwa-install__cerrar" type="button" data-cerrar aria-label="Cerrar">${icono('x') || '×'}</button>
          <div class="pwa-install__medallon" aria-hidden="true">${icono(conInstalacion ? 'download' : 'share-2')}</div>
          <h2 class="pwa-install__titulo" id="${tituloId}">${conInstalacion ? 'Instala FormsBiblicos' : 'Añade FormsBiblicos a tu pantalla'}</h2>
          ${cuerpo}
        </section>`;

      if (root.Iconos && typeof root.Iconos.actualizar === 'function') root.Iconos.actualizar();
      document.addEventListener('keydown', this._onKeyDown);

      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) this._descartar();
      });

      // Hay varios [data-cerrar] (la ×, «Ahora no» y «Entendido»): todos descartan.
      overlay.querySelectorAll('[data-cerrar]').forEach((btn) => {
        btn.addEventListener('click', () => this._descartar());
      });

      const instalarBtn = overlay.querySelector('[data-instalar]');
      if (instalarBtn) instalarBtn.addEventListener('click', () => this._instalar());

      setTimeout(() => {
        const foco = (overlay.querySelector('[data-instalar]') || overlay.querySelector('[data-cerrar]'));
        if (foco) foco.focus();
      }, 0);
    }

    async _instalar() {
      const evento = this._deferred;
      if (!evento || typeof evento.prompt !== 'function') { this._deferred = null; this.cerrar(); return; }
      try {
        evento.prompt();
        const resultado = await evento.userChoice;
        if (resultado && resultado.outcome === 'accepted') {
          this._guardarEstado({ instalada: true, descartadoEn: null });
        }
      } catch (e) { /* prompt cancelado o no soportado: cierra sin cooldown */ }
      this._deferred = null;
      this.cerrar();
    }

    _manejarTeclado(event) {
      if (!this._overlay) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this._descartar();
        return;
      }
      if (event.key !== 'Tab') return;
      const botones = [...this._overlay.querySelectorAll('button:not([disabled])')];
      if (botones.length < 2) return;
      const primero = botones[0];
      const ultimo = botones[botones.length - 1];
      if (event.shiftKey && document.activeElement === primero) { event.preventDefault(); ultimo.focus(); }
      else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primero.focus(); }
    }
  }

  root.PwaInstall = PwaInstall;
  root.pwaInstall = null;

  document.addEventListener('DOMContentLoaded', () => {
    root.pwaInstall = new PwaInstall();
    root.pwaInstall.iniciar();
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PwaInstall };
  }
})(typeof window !== 'undefined' ? window : globalThis);
