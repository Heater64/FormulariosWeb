/* ============================================================================
 * js/vistas/vista-cuenta.js — Configuración básica de la cuenta
 * ----------------------------------------------------------------------------
 * La plataforma tiene un único rol con acceso al panel. Esta pantalla muestra
 * identidad, apariencia, contraseña y cierre de sesión. Los ajustes visuales
 * reutilizan el mismo servicio de preferencias que el resto de la aplicación.
 * ==========================================================================*/
(function () {
  'use strict';

  const ROLES = ['admin', 'editor', 'owner'];
  const etiquetaRol = { owner: 'Propietario', admin: 'Administrador', editor: 'Profesor' };
  const esc = (v) => window.panelUI.esc(v);

  function preferenciasActuales(usuario) {
    let prefs = usuario.preferencias || {};
    if (typeof prefs === 'string') {
      try { prefs = JSON.parse(prefs); } catch (e) { prefs = {}; }
    }
    return {
      ...prefs,
      tema: prefs.tema === 'claro' ? 'light' : (prefs.tema === 'oscuro' ? 'dark' : prefs.tema ?? null),
      alto_contraste: !!prefs.alto_contraste,
      letra_grande: !!prefs.letra_grande
    };
  }

  function persistirPreferencias(usuario, cambios) {
    const prefs = { ...preferenciasActuales(usuario), ...cambios };
    usuario.preferencias = prefs;
    store.actualizar('usuario', { ...usuario });
    try { localStorage.setItem('fb_usuario', JSON.stringify(usuario)); } catch (e) {}
    if (window.preferencias) {
      window.preferencias.guardar({
        tema: prefs.tema,
        alto_contraste: prefs.alto_contraste,
        letra_grande: prefs.letra_grande
      });
      window.preferencias.aplicar();
    }
    if (window.supabaseClient) {
      window.supabaseClient.from('perfiles')
        .update({ preferencias: JSON.stringify(prefs) })
        .eq('id', usuario.id)
        .then(({ error }) => {
          if (error) console.warn('[Cuenta] No se pudieron sincronizar preferencias:', error.message);
        })
        .catch((error) => console.warn('[Cuenta] No se pudieron sincronizar preferencias:', error.message));
    }
    return prefs;
  }

  window.vistaCuenta = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }

      const rol = (usuario.rol || '').toLowerCase();
      const nombre = usuario.nombre_completo || usuario.username || 'Cuenta';
      const inicial = nombre.charAt(0).toUpperCase();

      raiz.innerHTML = `
        <div class="o-contenedor o-contenedor--ancho" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <header class="adm-cabecera">
            <span class="adm-cabecera__icono" aria-hidden="true">${window.Iconos.render('user')}</span>
            <div class="adm-cabecera__principal">
              <h1 class="adm-cabecera__titulo">Mi cuenta</h1>
              <p class="adm-cabecera__sub">Los alumnos no necesitan cuenta: solo usan el enlace que les envías.</p>
            </div>
          </header>

          <section class="adm-bloque">
            <h2 class="adm-bloque__titulo">Identidad</h2>
            <div class="adm-fila" style="border:0;padding:0;background:transparent">
              <div style="flex:0 0 auto;width:52px;height:52px;border-radius:50%;background:var(--color-acento-soft);color:var(--color-acento-fuerte);display:grid;place-items:center;font-family:var(--fuente-display);font-size:var(--texto-xl);font-weight:var(--texto-peso-semibold)">${esc(inicial)}</div>
              <div class="adm-fila__principal">
                <div class="adm-fila__titulo">${esc(nombre)}</div>
                <div class="adm-fila__meta">
                  ${usuario.username ? `<span>@${esc(usuario.username)}</span>` : ''}
                  <span>${esc(etiquetaRol[rol] || usuario.rol || '')}</span>
                </div>
              </div>
            </div>
          </section>

          <section class="adm-bloque" aria-labelledby="tituloApariencia">
            <h2 class="adm-bloque__titulo" id="tituloApariencia">Apariencia</h2>
            <p class="adm-cabecera__sub" style="margin:calc(-1 * var(--espaciado-xs)) 0 var(--espaciado-sm)">Personaliza cómo se ve el panel en este dispositivo.</p>
            <span class="adm-campo__etiqueta" id="etiquetaAccesibilidad" style="display:block;margin-top:var(--espaciado-md)">Accesibilidad</span>
            <div class="adm-campo" style="margin-top:var(--espaciado-md)">
              <span class="adm-campo__etiqueta" id="etiquetaTema">Tema</span>
              <div class="adm-tabs" role="group" aria-labelledby="etiquetaTema">
                <button class="adm-tab" type="button" data-tema="light" aria-pressed="false">Claro</button>
                <button class="adm-tab" type="button" data-tema="auto" aria-pressed="false">Automático</button>
                <button class="adm-tab" type="button" data-tema="dark" aria-pressed="false">Oscuro</button>
              </div>
            </div>
            <div class="adm-campo--toggles" role="group" aria-labelledby="etiquetaAccesibilidad">
              <div class="adm-opcion" role="switch" aria-checked="false" tabindex="0" data-control="altoContraste">
                <span><span class="adm-opcion__titulo">Alto contraste</span><span class="adm-opcion__ayuda">Aumenta la separación entre texto, fondos y bordes.</span></span>
                <div class="adm-opcion__controles">
                  <input class="adm-switch" type="checkbox" id="chkContraste" role="presentation" aria-hidden="true">
                </div>
              </div>
              <div class="adm-opcion" role="switch" aria-checked="false" tabindex="0" data-control="letraGrande">
                <span><span class="adm-opcion__titulo">Texto grande</span><span class="adm-opcion__ayuda">Aumenta el tamaño del texto del panel.</span></span>
                <div class="adm-opcion__controles">
                  <input class="adm-switch" type="checkbox" id="chkLetra" role="presentation" aria-hidden="true">
                </div>
              </div>
            </div>
            <p id="estadoApariencia" class="adm-campo__ayuda" role="status" aria-live="polite"></p>
          </section>

          ${ROLES.includes(rol) ? `<section class="adm-bloque">
            <h2 class="adm-bloque__titulo">Cambiar contraseña</h2>
            <div id="avisoPassword" class="adm-aviso adm-aviso--error" hidden role="alert"></div>
            <form id="formPassword" novalidate>
              <div class="adm-campo">
                <label class="adm-campo__etiqueta" for="actual">Contraseña actual</label>
                <input class="adm-entrada" id="actual" type="password" autocomplete="current-password" required>
              </div>
              <div class="adm-campo">
                <label class="adm-campo__etiqueta" for="nueva">Contraseña nueva</label>
                <input class="adm-entrada" id="nueva" type="password" autocomplete="new-password" required>
                <p class="adm-campo__ayuda">Mínimo 8 caracteres, con letras y números.</p>
              </div>
              <div class="adm-campo">
                <label class="adm-campo__etiqueta" for="confirmar">Repite la contraseña nueva</label>
                <input class="adm-entrada" id="confirmar" type="password" autocomplete="new-password" required>
              </div>
              <button class="adm-btn adm-btn--principal" type="submit" id="btnPassword">Guardar contraseña</button>
            </form>
          </section>` : ''}

          ${['admin', 'owner'].includes(rol) ? `
          <!-- PANEL DE ADMINISTRACIÓN (mismo acceso rápido que en Perfil) -->
          <a class="perfil-boton-seccion" id="btnPanelAdmin" href="#!/admin">
            <div class="perfil-boton-seccion__icono">${window.Iconos.render('settings')}</div>
            <div class="perfil-boton-seccion__texto">
              <p class="perfil-boton-seccion__label">Centro de Administración</p>
              <p class="perfil-boton-seccion__desc">Gestionar usuarios, grupos, exámenes y configuración</p>
            </div>
            <span class="perfil-boton-seccion__flecha">${window.Iconos.render('chevron-right')}</span>
          </a>` : ''}

          <section class="adm-bloque">
            <h2 class="adm-bloque__titulo">Sesión</h2>
            <p class="adm-cabecera__sub" style="margin-bottom:var(--espaciado-sm)">Al cerrar sesión volverás a la pantalla de acceso.</p>
            <button class="adm-btn adm-btn--peligro" id="btnSalir" type="button">Cerrar sesión</button>
          </section>
        </div>`;

      const prefs = preferenciasActuales(usuario);
      const estadoApariencia = raiz.querySelector('#estadoApariencia');
      const botonesTema = [...raiz.querySelectorAll('[data-tema]')];
      const reflejarTema = () => {
        botonesTema.forEach((boton) => {
          const activo = (boton.dataset.tema === 'auto' && !prefs.tema)
            || boton.dataset.tema === prefs.tema;
          boton.classList.toggle('adm-tab--activo', activo);
          boton.setAttribute('aria-pressed', String(activo));
        });
      };
      reflejarTema();
      const altoContrasteControl = raiz.querySelector('[data-control="altoContraste"]');
      const letraGrandeControl = raiz.querySelector('[data-control="letraGrande"]');
      const actualizarEstadoControl = () => {
        if (altoContrasteControl) altoContrasteControl.setAttribute('aria-checked', String(prefs.alto_contraste));
        if (letraGrandeControl) letraGrandeControl.setAttribute('aria-checked', String(prefs.letra_grande));
        const contrasteInput = raiz.querySelector('#chkContraste');
        const letraInput = raiz.querySelector('#chkLetra');
        if (contrasteInput) contrasteInput.checked = prefs.alto_contraste;
        if (letraInput) letraInput.checked = prefs.letra_grande;
      };

      actualizarEstadoControl();

      botonesTema.forEach((boton) => boton.addEventListener('click', () => {
        const tema = boton.dataset.tema === 'auto' ? null : boton.dataset.tema;
        Object.assign(prefs, persistirPreferencias(usuario, { tema }));
        reflejarTema();
        if (estadoApariencia) estadoApariencia.textContent = 'Tema actualizado.';
      }));

      const aplicarCambios = (pref, mensaje) => {
        Object.assign(prefs, persistirPreferencias(usuario, pref));
        actualizarEstadoControl();
        if (estadoApariencia) estadoApariencia.textContent = mensaje;
      };

      if (altoContrasteControl) {
        altoContrasteControl.addEventListener('click', () => {
          aplicarCambios({ alto_contraste: !prefs.alto_contraste }, 'Preferencia de contraste actualizada.');
        });
        altoContrasteControl.addEventListener('keydown', (evento) => {
          if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            evento.stopPropagation();
            aplicarCambios({ alto_contraste: !prefs.alto_contraste }, 'Preferencia de contraste actualizada.');
          }
        });
      }

      if (letraGrandeControl) {
        letraGrandeControl.addEventListener('click', () => {
          aplicarCambios({ letra_grande: !prefs.letra_grande }, 'Tamaño de texto actualizado.');
        });
        letraGrandeControl.addEventListener('keydown', (evento) => {
          if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            evento.stopPropagation();
            aplicarCambios({ letra_grande: !prefs.letra_grande }, 'Tamaño de texto actualizado.');
          }
        });
      }

      const contrasteInput = raiz.querySelector('#chkContraste');
      if (contrasteInput) contrasteInput.addEventListener('change', () => {
        aplicarCambios({ alto_contraste: contrasteInput.checked }, 'Preferencia de contraste actualizada.');
      });

      const letraInput = raiz.querySelector('#chkLetra');
      if (letraInput) letraInput.addEventListener('change', () => {
        aplicarCambios({ letra_grande: letraInput.checked }, 'Tamaño de texto actualizado.');
      });

      if (window.Iconos) window.Iconos.actualizar();

      raiz.querySelector('#btnPanelAdmin')?.addEventListener('click', (e) => { e.preventDefault(); router.navegar('/admin?origen=cuenta'); });

      raiz.querySelector('#btnSalir').addEventListener('click', async () => {
        const ok = await window.helpers.confirmar('¿Seguro que quieres cerrar sesión?', {
          titulo: 'Cerrar sesión', textoConfirmar: 'Cerrar sesión'
        });
        if (ok && window.authRepository) window.authRepository.cerrarSesion();
      });

      const form = raiz.querySelector('#formPassword');
      if (form) {
        const aviso = raiz.querySelector('#avisoPassword');
        form.addEventListener('submit', async (evento) => {
          evento.preventDefault();
          aviso.hidden = true;
          const actual = raiz.querySelector('#actual').value;
          const nueva = raiz.querySelector('#nueva').value;
          const confirmar = raiz.querySelector('#confirmar').value;
          const boton = raiz.querySelector('#btnPassword');

          if (nueva !== confirmar) {
            aviso.textContent = 'Las contraseñas nuevas no coinciden.';
            aviso.hidden = false;
            return;
          }
          boton.disabled = true;
          boton.textContent = 'Guardando…';
          try {
            await window.authRepository.cambiarPassword(actual, nueva);
            form.reset();
            window.helpers.mostrarAlerta('Contraseña actualizada.', 'exito');
          } catch (e) {
            aviso.textContent = e.message;
            aviso.hidden = false;
          } finally {
            boton.disabled = false;
            boton.textContent = 'Guardar contraseña';
          }
        });
      }
    }
  };
})();
