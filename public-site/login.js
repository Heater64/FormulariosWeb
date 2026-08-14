(function () {
  'use strict';

  function mostrarError(mensaje) {
    var error = document.getElementById('errorLoginHero');
    var texto = document.getElementById('errorLoginHeroTexto');
    if (!error || !texto) return;
    texto.textContent = mensaje;
    error.classList.remove('visible');
    void error.offsetWidth;
    error.classList.add('visible');
  }

  function limpiarError() {
    var error = document.getElementById('errorLoginHero');
    if (error) error.classList.remove('visible');
  }

  function iniciar() {
    var loginForm = document.getElementById('loginFormHero');
    var loginSection = document.getElementById('login');
    if (!loginForm || !loginSection) return;

    var botonNav = document.querySelector('.btn-login-nav');
    if (botonNav) {
      botonNav.addEventListener('click', function () {
        loginSection.scrollIntoView({ behavior: 'smooth' });
      });
    }

    var usuarioInput = document.getElementById('loginUser');
    var passwordInput = document.getElementById('loginPassHero');
    var boton = loginForm.querySelector('button[type="submit"]');

    [usuarioInput, passwordInput].forEach(function (input) {
      if (input) input.addEventListener('input', limpiarError);
    });

    loginForm.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      limpiarError();

      var usuario = usuarioInput ? usuarioInput.value.trim() : '';
      var password = passwordInput ? passwordInput.value : '';

      if (!usuario) { mostrarError('Ingresa tu correo o usuario.'); return; }
      if (!password) { mostrarError('Ingresa tu contraseña.'); return; }
      if (password.length < 6) { mostrarError('Mínimo 6 caracteres.'); return; }

      if (!window.authRepository || !window.supabaseClient) {
        mostrarError('El servicio de inicio de sesión aún no está disponible. Recarga la página e inténtalo de nuevo.');
        return;
      }

      if (boton) {
        boton.disabled = true;
        boton.textContent = 'Entrando…';
      }

      try {
        await window.authRepository.iniciarSesion(usuario, password, true);
        var estado = window.store && window.store.obtener('usuario');
        if (estado) {
          localStorage.setItem('fb_usuario', JSON.stringify(estado));
          localStorage.setItem('fb_recordar_sesion', 'true');
        }
        window.location.href = '/app/';
      } catch (error) {
        mostrarError(error && error.message ? error.message : 'No se pudo iniciar sesión.');
      } finally {
        if (boton) {
          boton.disabled = false;
          boton.textContent = 'Iniciar sesión';
        }
      }
    });

    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      document.querySelectorAll('input[type="email"], input[type="password"], input[type="text"]').forEach(function (input) {
        input.style.fontSize = '16px';
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
