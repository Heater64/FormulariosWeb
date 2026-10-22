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

  // Categorías de aviso: mismas claves de preferencias que lee
  // notification-service (_categoriaHabilitada). Las claves legacy siguen
  // desactivando la categoría hasta que el usuario la vuelve a activar.
  // `disponible: false` oculta las categorías que aún no existen en la web;
  // al activarlas basta con quitar la marca (las preferencias ya guardadas
  // se conservan).
  const NOTIF_CATEGORIAS = [
    { clave: 'notif_desafios', legado: 'notif_logros', icono: 'sword', titulo: 'Desafíos', desc: 'Invitaciones y resultados de tus retos', disponible: false },
    { clave: 'notif_examenes', icono: 'clipboard-check', titulo: 'Exámenes', desc: 'Publicación, entregas y correcciones' },
    { clave: 'notif_estudio', legado: 'notif_recordatorios', icono: 'book-open', titulo: 'Estudio', desc: 'Repasos, mazos y capítulos completados', disponible: false },
    { clave: 'notif_grupos', legado: 'notif_invitaciones', icono: 'users', titulo: 'Grupos', desc: 'Invitaciones y novedades de tus clases', disponible: false },
    { clave: 'notif_logros', icono: 'trophy', titulo: 'Logros', desc: 'Logros desbloqueados', disponible: false },
    { clave: 'notif_sistema', icono: 'settings', titulo: 'Sistema', desc: 'Avisos y actualizaciones de la plataforma' }
  ].filter((categoria) => categoria.disponible !== false);

  const NOTIF_DISPOSITIVO = [
    { clave: 'notif_sonidos', icono: 'volume-2', titulo: 'Sonidos', desc: 'Aviso sonoro al recibir una notificación' },
    { clave: 'notif_vibracion', legado: 'notif_sonidos', icono: 'vibrate', titulo: 'Vibración', desc: 'Vibra al recibir un aviso' },
    { clave: 'notif_nativas', icono: 'smartphone', titulo: 'Notificaciones del dispositivo', desc: 'Mostrar en la bandeja del sistema en vez de solo dentro de la app' }
  ];

  // Fila con interruptor. Toda la fila es <label>, así el toque en cualquier
  // punto alterna el checkbox y el nombre accesible sale del texto visible.
  function filaNotif({ clave, icono, titulo, desc }, activo) {
    return `
      <label class="cuenta-ajuste">
        <span class="cuenta-ajuste__icono" aria-hidden="true">${I(icono)}</span>
        <span class="cuenta-ajuste__texto">
          <span class="cuenta-ajuste__titulo">${esc(titulo)}</span>
          <span class="cuenta-ajuste__ayuda">${esc(desc)}</span>
        </span>
        <span class="cuenta-ajuste__control">
          <input class="adm-switch" type="checkbox" data-notif="${clave}" ${activo ? 'checked' : ''}>
        </span>
      </label>`;
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
      const prefs = preferenciasActuales(usuario);
      const permisoNotif = ('Notification' in window) ? Notification.permission : 'unsupported';
      const permisoTexto = {
        granted: 'Permitidas por el navegador',
        denied: 'Bloqueadas en el navegador; actívalas desde los ajustes del sitio',
        default: 'Todavía no has dado permiso',
        unsupported: 'Este dispositivo no admite avisos del navegador'
      }[permisoNotif] || 'Estado desconocido';
      const webPushNotif = !!(window.pushNotificationService
        && typeof window.pushNotificationService.webPushDisponible === 'function'
        && window.pushNotificationService.webPushDisponible());
      const notifActiva = (item) => prefs[item.clave] !== false && !(item.legado && prefs[item.legado] === false);

      raiz.innerHTML = `
        <div class="o-contenedor vista-cuenta">
          <header class="adm-cabecera cuenta-cabecera">
            <span class="adm-cabecera__icono" aria-hidden="true">${I('user')}</span>
            <div class="adm-cabecera__principal">
              <h1 class="adm-cabecera__titulo">Mi cuenta</h1>
              <p class="adm-cabecera__sub">Tu identidad, preferencias y seguridad.</p>
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
            <button class="adm-btn adm-btn--pequeno cuenta-boton-suave cuenta-ficha__accion" id="btnEditarPerfil" type="button">${I('pencil')} Editar perfil</button>
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

          <!-- Notificaciones -->
          <section class="cuenta-bloque" aria-labelledby="tituloNotificaciones">
            ${cabeceraBloque('bell', 'Notificaciones', 'Elige qué avisos quieres recibir y cómo te avisa la app.', 'tituloNotificaciones')}
            <div class="cuenta-sesion">
              <span class="cuenta-sesion__texto">
                Avisos del navegador<br>
                <span class="cuenta-ajuste__ayuda">${esc(permisoTexto)}</span>
              </span>
              ${permisoNotif === 'default' ? `<button class="adm-btn adm-btn--pequeno" id="btnPermisoNotif" type="button">${I('bell-plus')} Permitir</button>` : ''}
              ${permisoNotif === 'granted' && webPushNotif ? `<button class="adm-btn adm-btn--pequeno" id="btnActivarPush" type="button">${I('bell-plus')} Activar en este navegador</button>` : ''}
            </div>

            <p class="cuenta-bloque__desc" style="margin-top:var(--espaciado-md)">Categorías</p>
            <div class="cuenta-ajustes" role="group" aria-label="Categorías de notificaciones">
              ${NOTIF_CATEGORIAS.map((c) => filaNotif(c, notifActiva(c))).join('')}
            </div>

            <p class="cuenta-bloque__desc" style="margin-top:var(--espaciado-md)">En este dispositivo</p>
            <div class="cuenta-ajustes" role="group" aria-label="Sonido y dispositivo">
              ${NOTIF_DISPOSITIVO.map((c) => filaNotif(c, notifActiva(c))).join('')}
            </div>
            <p id="estadoNotificaciones" class="cuenta-estado" role="status" aria-live="polite"></p>
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

          <!-- Almacenamiento -->
          <section class="cuenta-bloque" aria-labelledby="tituloAlmacenamiento">
            ${cabeceraBloque('database', 'Almacenamiento', 'Gestión de la caché y los datos temporales.', 'tituloAlmacenamiento')}
            <div class="cuenta-sesion">
              <span class="cuenta-sesion__texto">
                Elimina los datos guardados localmente y recarga la app para volver a descargarlos. <strong>Tu cuenta, tu progreso y tus borradores no se pierden.</strong>
              </span>
              <button class="adm-btn adm-btn--pequeno" id="btnLimpiarCache" type="button">${I('trash-2')} Eliminar caché</button>
            </div>
          </section>

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

      // Preferencias de notificación: mismas claves que lee
      // notification-service. Al reactivar una categoría se borra su clave
      // legacy para que una config antigua no la siga silenciando.
      const estadoNotificaciones = raiz.querySelector('#estadoNotificaciones');
      raiz.querySelectorAll('[data-notif]').forEach((input) => {
        input.addEventListener('change', () => {
          const clave = input.dataset.notif;
          const item = [...NOTIF_CATEGORIAS, ...NOTIF_DISPOSITIVO].find((c) => c.clave === clave);
          const actuales = preferenciasActuales(usuario);
          if (input.checked && item && item.legado) delete actuales[item.legado];
          usuario.preferencias = actuales;
          Object.assign(prefs, persistirPreferencias(usuario, { [clave]: input.checked }));
          if (estadoNotificaciones) estadoNotificaciones.textContent = 'Preferencias de notificación guardadas.';
        });
      });

      const btnPermisoNotif = raiz.querySelector('#btnPermisoNotif');
      if (btnPermisoNotif) btnPermisoNotif.addEventListener('click', async () => {
        btnPermisoNotif.disabled = true;
        try {
          const resultado = await Notification.requestPermission();
          if (window.notifications && window.notifications.setPermiso) window.notifications.setPermiso(resultado);
          if (resultado === 'granted' && webPushNotif) {
            await window.pushNotificationService.activarWeb().catch(() => false);
          }
          window.helpers.mostrarAlerta(
            resultado === 'granted' ? 'Notificaciones activadas.' : 'No se concedió el permiso.',
            resultado === 'granted' ? 'exito' : 'advertencia'
          );
          if (router.pathActual() === '/cuenta') await window.vistaCuenta.montar(raiz);
        } catch (e) {
          window.helpers.mostrarAlerta('No se pudo solicitar el permiso.', 'error');
          btnPermisoNotif.disabled = false;
        }
      });

      const btnActivarPush = raiz.querySelector('#btnActivarPush');
      if (btnActivarPush) btnActivarPush.addEventListener('click', async () => {
        btnActivarPush.disabled = true;
        try {
          const ok = await window.pushNotificationService.activarWeb();
          window.helpers.mostrarAlerta(
            ok ? 'Avisos activados en este navegador.' : 'No se pudo activar en este navegador.',
            ok ? 'exito' : 'advertencia'
          );
        } catch (e) {
          window.helpers.mostrarAlerta('No se pudo activar en este navegador.', 'error');
        } finally {
          btnActivarPush.disabled = false;
        }
      });

      raiz.querySelector('#btnEditarPerfil')?.addEventListener('click', async () => {
        const prefsPerfil = preferenciasActuales(usuario);
        const datos = await window.helpers.formulario({
          titulo: 'Editar perfil',
          mensaje: `Puedes cambiar tu nombre y tu descripción. El usuario @${usuario.username} no se puede cambiar.`,
          campos: [
            { nombre: 'nombre_completo', etiqueta: 'Nombre', valor: usuario.nombre_completo || '', requerido: true },
            { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', filas: 2, valor: prefsPerfil.descripcion || prefsPerfil.frase || '', placeholder: 'Ej: Amante del estudio bíblico' }
          ],
          textoConfirmar: 'Guardar'
        });
        if (!datos) return;

        const nombreNuevo = datos.nombre_completo.trim();
        const prefsActualizadas = { ...prefsPerfil, descripcion: datos.descripcion.trim() };
        delete prefsActualizadas.frase;
        try {
          const { error } = await window.supabaseClient.from('perfiles')
            .update({ nombre_completo: nombreNuevo, preferencias: JSON.stringify(prefsActualizadas) })
            .eq('id', usuario.id);
          if (error) throw error;
          usuario.nombre_completo = nombreNuevo;
          usuario.preferencias = prefsActualizadas;
          store.actualizar('usuario', { ...usuario });
          localStorage.setItem('fb_usuario', JSON.stringify(usuario));
          window.helpers.mostrarAlerta('Perfil actualizado.', 'exito');
          // Refrescar la ficha sin salir de Cuenta; si el usuario ya navegó a
          // otra sección mientras guardaba, no pisar esa vista.
          if (router.pathActual() === '/cuenta') await window.vistaCuenta.montar(raiz);
        } catch (e) {
          window.helpers.mostrarAlerta('No se pudo actualizar el perfil: ' + e.message, 'error');
        }
      });

      raiz.querySelector('#btnSalir').addEventListener('click', async () => {
        const ok = await window.helpers.confirmar('¿Seguro que quieres cerrar sesión?', {
          titulo: 'Cerrar sesión', textoConfirmar: 'Cerrar sesión'
        });
        if (ok && window.authRepository) window.authRepository.cerrarSesion();
      });

      // Eliminar caché: misma mecánica que la antigua vista de Perfil.
      // cacheDatos.limpiarTodo() borra la caché del Service Worker, la
      // IndexedDB de datos y las claves temporales de localStorage, pero
      // conserva la sesión y los borradores del editor.
      const btnLimpiarCache = raiz.querySelector('#btnLimpiarCache');
      if (btnLimpiarCache) btnLimpiarCache.addEventListener('click', async () => {
        const ok = await window.helpers.confirmar(
          'Se eliminarán los datos guardados localmente (caché de la app) y la página se recargará. Tu cuenta, tu progreso y tus borradores no se pierden.',
          { titulo: '¿Eliminar caché?', textoConfirmar: 'Eliminar y recargar' }
        );
        if (!ok) return;
        window.helpers.mostrarAlerta('Eliminando caché…', 'info', 1500);
        try { await window.cacheDatos.limpiarTodo(); } catch (e) {}
        setTimeout(() => window.location.reload(), 1200);
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
