// ============================================================
// js/componentes/login-form.js
// Formulario de acceso compartido por la landing pública
// (public-site/index.html) y la página de login de la app (login.html).
// Un solo marcado y una sola lógica de envío para ambos sitios.
//
// Uso: LoginForm.montar(contenedor, { iconoSrc, destino })
//   • Inyecta la tarjeta de login dentro de `contenedor`.
//   • Los botones [data-ir-login] hacen scroll hasta la tarjeta.
// ============================================================

(function (root) {
  'use strict';

  const MIN_PASSWORD = 6;

  function escapar(texto) {
    return String(texto).replace(/[&<>\"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function plantilla(iconoSrc) {
    return `
    <div class="login-card">
      <div class="login-card__icono">
        <img src="${escapar(iconoSrc)}" alt="" class="login-card__icono-img">
      </div>
      <h2 class="login-card__titulo">Iniciar sesión</h2>
      <p class="login-card__sub">Accede con tu cuenta de grupo.</p>

      <div class="error-msg" id="loginError" role="alert" data-login-error>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
        <span data-login-error-texto></span>
      </div>

      <form data-login-form novalidate>
        <div class="campo">
          <label class="campo__label" for="loginUser">Correo o usuario</label>
          <div class="campo__control">
            <svg class="campo__icono" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>
            <input class="campo__input" type="text" id="loginUser" name="usuario" placeholder="tu@correo.com o usuario" autocomplete="username" required>
          </div>
        </div>
        <div class="campo">
          <label class="campo__label" for="loginPassHero">Contraseña</label>
          <div class="campo__control campo__control--toggle">
            <svg class="campo__icono" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            <input class="campo__input" type="password" id="loginPassHero" name="password" placeholder="Tu contraseña" autocomplete="current-password" required>
            <button type="button" class="campo__toggle" data-login-toggle aria-label="Mostrar contraseña" aria-pressed="false" aria-controls="loginPassHero">
              <svg class="campo__toggle-icono icono-mostrar" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg class="campo__toggle-icono icono-ocultar" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>
            </button>
          </div>
        </div>
        <p class="login-card__olvido"><a href="recuperar.html">He olvidado mi contraseña</a></p>
        <button type="submit" class="btn-login-submit">Iniciar sesión</button>
      </form>

    </div>`;
  }

  function montar(contenedor, opciones) {
    if (!contenedor) return;
    const iconoSrc = (opciones && opciones.iconoSrc) || 'assets/iconos/icono.svg';
    contenedor.innerHTML = plantilla(iconoSrc);

    const form = contenedor.querySelector('[data-login-form]');
    const error = contenedor.querySelector('[data-login-error]');
    const errorTexto = contenedor.querySelector('[data-login-error-texto]');
    const usuarioInput = form.querySelector('input[name="usuario"]');
    const passwordInput = form.querySelector('input[name="password"]');
    const boton = form.querySelector('button[type="submit"]');
    const toggle = form.querySelector('[data-login-toggle]');
    const campos = [usuarioInput, passwordInput];

    function marcarCampo(input, invalido) {
      if (invalido) {
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', 'loginError');
      } else {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
    }

    function mostrarError(mensaje, campo) {
      errorTexto.textContent = mensaje;
      error.classList.remove('visible');
      void error.offsetWidth;
      error.classList.add('visible');
      campos.forEach((input) => marcarCampo(input, input === campo));
      if (campo) campo.focus();
    }

    function limpiarError() {
      error.classList.remove('visible');
      campos.forEach((input) => marcarCampo(input, false));
    }

    campos.forEach((input) => input.addEventListener('input', limpiarError));

    toggle.addEventListener('click', () => {
      const mostrando = passwordInput.type === 'text';
      passwordInput.type = mostrando ? 'password' : 'text';
      toggle.setAttribute('aria-pressed', mostrando ? 'false' : 'true');
      toggle.setAttribute('aria-label', mostrando ? 'Mostrar contraseña' : 'Ocultar contraseña');
    });

    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      limpiarError();

      const usuario = usuarioInput.value.trim();
      const password = passwordInput.value;

      if (!usuario) { mostrarError('Ingresa tu correo o usuario.', usuarioInput); return; }
      if (!password) { mostrarError('Ingresa tu contraseña.', passwordInput); return; }
      if (password.length < MIN_PASSWORD) { mostrarError('Mínimo 6 caracteres.', passwordInput); return; }

      if (!root.authRepository || !root.supabaseClient) {
        mostrarError('El servicio de inicio de sesión aún no está disponible. Recarga la página e inténtalo de nuevo.');
        return;
      }

      boton.disabled = true;
      boton.setAttribute('aria-busy', 'true');
      boton.textContent = 'Entrando…';

      try {
        // Sesión persistente: se mantiene hasta que el alumno cierre sesión.
        await root.authRepository.iniciarSesion(usuario, password, true);
        const estado = root.store && root.store.obtener('usuario');
        if (estado) {
          localStorage.setItem('fb_usuario', JSON.stringify(estado));
          localStorage.setItem('fb_recordar_sesion', 'true');
        }
        root.location.href = (opciones && opciones.destino) || '/app/';
      } catch (err) {
        mostrarError(err && err.message ? err.message : 'No se pudo iniciar sesión.', passwordInput);
      } finally {
        boton.disabled = false;
        boton.removeAttribute('aria-busy');
        boton.textContent = 'Iniciar sesión';
      }
    });

    if (/iPhone|iPad|iPod/.test(root.navigator.userAgent)) {
      campos.forEach((input) => { input.style.fontSize = '16px'; });
    }
  }

  function enlazarBotonesIr(seccion) {
    document.querySelectorAll('[data-ir-login]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const destino = document.getElementById(seccion);
        if (destino) destino.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  root.LoginForm = { montar, enlazarBotonesIr };
})(typeof window !== 'undefined' ? window : globalThis);
