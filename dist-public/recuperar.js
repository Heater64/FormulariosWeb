(function () {
  'use strict';

  function iniciar() {
    var solicitar = document.getElementById('formSolicitar');
    var actualizar = document.getElementById('formNuevaPassword');
    var error = document.getElementById('errorRecuperacion');
    var exito = document.getElementById('exitoRecuperacion');
    var titulo = document.getElementById('tituloRecuperacion');
    var subtitulo = document.getElementById('subtituloRecuperacion');
    if (!solicitar || !actualizar) return;

    function mostrarError(mensaje) {
      error.textContent = mensaje;
      error.classList.add('visible');
      exito.classList.remove('visible');
    }

    function mostrarExito(mensaje) {
      exito.textContent = mensaje;
      exito.classList.add('visible');
      error.classList.remove('visible');
    }

    function limpiarMensajes() {
      error.classList.remove('visible');
      exito.classList.remove('visible');
    }

    function mostrarFormularioNuevaPassword() {
      solicitar.classList.add('oculto');
      actualizar.classList.remove('oculto');
      titulo.textContent = 'Crea una nueva contraseña';
      subtitulo.textContent = 'Elige una contraseña de al menos 8 caracteres con letras y números.';
    }

    function tieneSesionRecuperacion() {
      return window.supabaseClient && window.supabaseClient.auth &&
        window.supabaseClient.auth.getSession().then(function (respuesta) {
          return Boolean(respuesta.data && respuesta.data.session);
        }).catch(function () { return false; });
    }

    document.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('input', limpiarMensajes);
    });

    solicitar.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      limpiarMensajes();
      var boton = document.getElementById('btnSolicitar');
      var correo = document.getElementById('correoRecuperacion').value.trim();
      if (!correo) { mostrarError('Escribe tu correo electrónico.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { mostrarError('Escribe un correo electrónico válido.'); return; }
      if (!window.authRepository || !window.supabaseClient) { mostrarError('El servicio aún no está disponible. Recarga la página e inténtalo de nuevo.'); return; }

      boton.disabled = true;
      boton.textContent = 'Enviando…';
      try {
        await window.authRepository.solicitarRecuperacion(correo);
        mostrarExito('Si existe una cuenta con ese correo, recibirás un enlace para recuperar el acceso. Revisa también la carpeta de spam.');
        solicitar.reset();
      } catch (err) {
        mostrarError(err && err.message ? err.message : 'No se pudo solicitar la recuperación.');
      } finally {
        boton.disabled = false;
        boton.textContent = 'Enviar enlace de recuperación';
      }
    });

    actualizar.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      limpiarMensajes();
      var boton = document.getElementById('btnActualizar');
      var nueva = document.getElementById('nuevaPassword').value;
      var confirmar = document.getElementById('confirmarPassword').value;
      if (nueva.length < 8) { mostrarError('La contraseña debe tener al menos 8 caracteres.'); return; }
      if (!/[A-Za-z]/.test(nueva) || !/[0-9]/.test(nueva)) { mostrarError('La contraseña debe incluir letras y números.'); return; }
      if (nueva !== confirmar) { mostrarError('Las contraseñas no coinciden.'); return; }
      if (!window.authRepository || !window.supabaseClient) { mostrarError('El servicio aún no está disponible. Recarga la página e inténtalo de nuevo.'); return; }

      boton.disabled = true;
      boton.textContent = 'Guardando…';
      try {
        await window.authRepository.actualizarPasswordRecuperacion(nueva);
        mostrarExito('Contraseña actualizada. Ya puedes iniciar sesión con ella.');
        actualizar.reset();
      } catch (err) {
        mostrarError(err && err.message ? err.message : 'No se pudo actualizar la contraseña.');
      } finally {
        boton.disabled = false;
        boton.textContent = 'Guardar nueva contraseña';
      }
    });

    function prepararVista() {
      var hash = window.location.hash || '';
      var query = window.location.search || '';
      if (hash.indexOf('access_token=') !== -1 || hash.indexOf('type=recovery') !== -1 || query.indexOf('code=') !== -1) {
        mostrarFormularioNuevaPassword();
        return;
      }
      if (window.supabaseClient && window.supabaseClient.auth) {
        window.supabaseClient.auth.onAuthStateChange(function (evento) {
          if (evento === 'PASSWORD_RECOVERY') mostrarFormularioNuevaPassword();
        });
        tieneSesionRecuperacion().then(function (activa) {
          if (activa && (hash || query)) mostrarFormularioNuevaPassword();
        });
      }
    }

    prepararVista();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
