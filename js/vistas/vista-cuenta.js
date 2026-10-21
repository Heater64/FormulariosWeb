/* ============================================================================
 * js/vistas/vista-cuenta.js — Configuración básica de la cuenta
 * ----------------------------------------------------------------------------
 * La plataforma tiene un único rol con acceso al panel. Esta pantalla muestra
 * identidad, apariencia, contraseña y cierre de sesión. Los ajustes visuales
 * reutilizan el mismo servicio de preferencias que el resto de la aplicación.
 *
 * Anatomía: la identidad se lee como una ficha (avatar + nombre + rol + acción),
 * y cada bloque de ajustes es una tarjeta con cabecera propia. El formulario de
 * contraseña vive plegado: es una acción poco frecuente y no debe empujar el
 * resto de la página fuera de la pantalla.
 * ==========================================================================*/
(function () {
  'use strict';

  const ROLES = ['admin', 'editor', 'owner'];
  const etiquetaRol = { owner: 'Propietario', admin: 'Administrador', editor: 'Profesor' };
  const esc = (v) => window.panelUI.esc(v);
  const I = (nombre) => (window.Iconos ? window.Iconos.render(nombre) : '');

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

  function inicialDe(nombre) {
    const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    const primera = partes[0].charAt(0);
    const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : partes[0].charAt(1);
    return (primera + (ultima || '')).toUpperCase();
  }

  function cabeceraBloque(icono, titulo, desc, id) {
    return `<header class="cuenta-bloque__cabecera">
      <span class="cuenta-bloque__icono" aria-hidden="true">${I(icono)}</span>
      <div>
        <h2 class="cuenta-bloque__titulo"${id ? ` id="${id}"` : ''}>${esc(titulo)}</h2>
        <p class="cuenta-bloque__desc">${esc(desc)}</p>
      </div>
    </header>`;
  }

  window.vistaCuenta = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }

      const rol = (usuario.rol || '').toLowerCase();
      const nombre = usuario.nombre_completo || usuario.username || 'Cuenta';
      const foto = usuario.foto_perfil || '';
      const fechaAlta = (usuario.creado_en && window.helpers && window.helpers.formatearFecha)
        ? window.helpers.formatearFecha(usuario.creado_en)
        : '';

      raiz.innerHTML = `
        <div class="o-contenedor vista-cuenta">
          <header class="adm-cabecera cuenta-cabecera">
            <span class="adm-cabecera__icono" aria-hidden="true">${I('user')}</span>
            <div class="adm-cabecera__principal">
              <h1 class="adm-cabecera__titulo">Mi cuenta</h1>
              <p class="adm-cabecera__sub">Tu identidad, apariencia y seguridad.</p>
            </div>
          </header>

          <!-- Identidad -->
          <section class="cuenta-ficha" aria-label="Identidad">
            <span class="cuenta-ficha__avatar" aria-hidden="true">
              ${foto
                ? `<img src="${esc(foto)}" alt="" width="64" height="64" decoding="async">`
                : esc(inicialDe(nombre))}
            </span>
            <div class="cuenta-ficha__cuerpo">
              <div class="cuenta-ficha__titulo">
                <h2>${esc(nombre)}</h2>
                <span class="cuenta-rol cuenta-rol--${esc(rol || 'usuario')}">${esc(etiquetaRol[rol] || usuario.rol || 'Cuenta')}</span>
              </div>
              <div class="cuenta-ficha__meta">
                ${usuario.username ? `<span class="cuenta-ficha__dato">@${esc(usuario.username)}</span>` : ''}
                <span class="cuenta-ficha__dato">${usuario.activo === false ? 'Cuenta desactivada' : 'Cuenta activa'}</span>
                ${fechaAlta ? `<span class="cuenta-ficha__dato">${I('calendar')}Desde ${esc(fechaAlta)}</span>` : ''}
              </div>
            </div>
            <a class="adm-btn adm-btn--pequeno cuenta-boton-suave cuenta-ficha__accion" href="#!/perfil">${I('pencil')} Editar perfil</a>
          </section>

          <!-- Apariencia -->
          <section class="cuenta-bloque" aria-labelledby="tituloApariencia">
            ${cabeceraBloque('palette', 'Apariencia', 'Se guarda en tu cuenta y se aplica en todos tus dispositivos.', 'tituloApariencia')}
            <div class="cuenta-tema" role="group" aria-labelledby="tituloApariencia">
              <button class="cuenta-tema__btn" type="button" data-tema="light" aria-pressed="false">${I('sun')}<span>Claro</span></button>
              <button class="cuenta-tema__btn" type="button" data-tema="auto" aria-pressed="false">${I('refresh-cw')}<span>Automático</span></button>
              <button class="cuenta-tema__btn" type="button" data-tema="dark" aria-pressed="false">${I('moon')}<span>Oscuro</span></button>
            </div>

            <div class="cuenta-ajustes" role="group" aria-label="Accesibilidad">
              <div class="cuenta-ajuste" role="switch" aria-checked="false" tabindex="0" data-control="altoContraste">
                <span class="cuenta-ajuste__icono" aria-hidden="true">${I('eye')}</span>
                <span class="cuenta-ajuste__texto">
                  <span class="cuenta-ajuste__titulo">Alto contraste</span>
                  <span class="cuenta-ajuste__ayuda">Aumenta la separación entre texto, fondos y bordes.</span>
                </span>
                <span class="cuenta-ajuste__control" aria-hidden="true">
                  <input class="adm-switch" type="checkbox" id="chkContraste" tabindex="-1">
                </span>
              </div>
              <div class="cuenta-ajuste" role="switch" aria-checked="false" tabindex="0" data-control="letraGrande">
                <span class="cuenta-ajuste__icono" aria-hidden="true">${I('book-open')}</span>
                <span class="cuenta-ajuste__texto">
                  <span class="cuenta-ajuste__titulo">Texto grande</span>
                  <span class="cuenta-ajuste__ayuda">Aumenta el tamaño del texto del panel.</span>
                </span>
                <span class="cuenta-ajuste__control" aria-hidden="true">
                  <input class="adm-switch" type="checkbox" id="chkLetra" tabindex="-1">
                </span>
              </div>
            </div>
            <p id="estadoApariencia" class="cuenta-estado" role="status" aria-live="polite"></p>
          </section>

          ${ROLES.includes(rol) ? `<section class="cuenta-bloque" aria-labelledby="tituloSeguridad">
            ${cabeceraBloque('shield', 'Seguridad', 'Protege el acceso a tu cuenta.', 'tituloSeguridad')}
            <details class="cuenta-detalles" id="detallesPassword">
              <summary class="cuenta-detalles__resumen">
                <span class="cuenta-detalles__icono" aria-hidden="true">${I('key')}</span>
                <span class="cuenta-detalles__texto">
                  <span class="cuenta-detalles__titulo">Cambiar contraseña</span>
                  <span class="cuenta-detalles__ayuda">Mínimo 8 caracteres, con letras y números.</span>
                </span>
                <span class="cuenta-detalles__flecha" aria-hidden="true">${I('chevron-down')}</span>
              </summary>
              <div class="cuenta-detalles__cuerpo">
                <div id="avisoPassword" class="adm-aviso adm-aviso--error" hidden role="alert"></div>
                <form id="formPassword" class="cuenta-form" novalidate>
                  <div class="adm-campo">
                    <label class="adm-campo__etiqueta" for="actual">Contraseña actual</label>
                    <input class="adm-entrada" id="actual" type="password" autocomplete="current-password" required>
                  </div>
                  <div class="cuenta-form__par">
                    <div class="adm-campo">
                      <label class="adm-campo__etiqueta" for="nueva">Contraseña nueva</label>
                      <input class="adm-entrada" id="nueva" type="password" autocomplete="new-password" required>
                    </div>
                    <div class="adm-campo">
                      <label class="adm-campo__etiqueta" for="confirmar">Repite la contraseña nueva</label>
                      <input class="adm-entrada" id="confirmar" type="password" autocomplete="new-password" required>
                    </div>
                  </div>
                  <button class="adm-btn adm-btn--principal cuenta-form__guardar" type="submit" id="btnPassword">Guardar contraseña</button>
                </form>
              </div>
            </details>
          </section>` : ''}

          ${['admin', 'owner'].includes(rol) ? `
          <a class="cuenta-acceso" id="btnPanelAdmin" href="#!/admin">
            <span class="cuenta-acceso__icono" aria-hidden="true">${I('settings')}</span>
            <span class="cuenta-acceso__texto">
              <span class="cuenta-acceso__label">Centro de Administración</span>
              <span class="cuenta-acceso__desc">Usuarios, grupos, exámenes y configuración.</span>
            </span>
            <span class="cuenta-acceso__flecha" aria-hidden="true">${I('chevron-right')}</span>
          </a>` : ''}

          <section class="cuenta-bloque cuenta-bloque--sesion" aria-labelledby="tituloSesion">
            ${cabeceraBloque('log-out', 'Sesión', 'Cierra la sesión en este dispositivo. Podrás volver a entrar con tu usuario y contraseña.', 'tituloSesion')}
            <div class="cuenta-sesion">
              <span class="cuenta-sesion__texto">
                ${usuario.username ? `Sesión iniciada como <strong>@${esc(usuario.username)}</strong>.` : 'Sesión iniciada en este dispositivo.'}
              </span>
              <button class="adm-btn adm-btn--peligro" id="btnSalir" type="button">${I('log-out')} Cerrar sesión</button>
            </div>
          </section>
        </div>`;

      const prefs = preferenciasActuales(usuario);
      const estadoApariencia = raiz.querySelector('#estadoApariencia');
      const botonesTema = [...raiz.querySelectorAll('[data-tema]')];
      const reflejarTema = () => {
        botonesTema.forEach((boton) => {
          const activo = (boton.dataset.tema === 'auto' && !prefs.tema)
            || boton.dataset.tema === prefs.tema;
          boton.classList.toggle('cuenta-tema__btn--activo', activo);
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

      // El control entero es el interruptor (role="switch"): el checkbox solo
      // refleja el estado. Así el área táctil es toda la fila y no hay dos
      // manejadores que puedan invertir la preferencia dos veces.
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
