(function () {
  'use strict';
  function iniciar() {
    var form = document.getElementById('formRegistro');
    var error = document.getElementById('errorRegistro');
    var exito = document.getElementById('exitoRegistro');
    if (!form) return;
    function mensaje(nodo, texto, tipo) { nodo.textContent = texto; nodo.className = 'msg ' + tipo + ' visible'; }
    function limpiar() { error.className = 'msg error'; exito.className = 'msg success'; }
    form.addEventListener('submit', async function (evento) {
      evento.preventDefault(); limpiar();
      var nombre = document.getElementById('nombreRegistro').value.trim();
      var email = document.getElementById('emailRegistro').value.trim();
      var password = document.getElementById('passwordRegistro').value;
      var confirmar = document.getElementById('confirmarRegistro').value;
      if (nombre.length < 2) { mensaje(error, 'Escribe tu nombre completo.', 'error'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { mensaje(error, 'Escribe un correo electrónico válido.', 'error'); return; }
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) { mensaje(error, 'La contraseña debe tener al menos 8 caracteres e incluir letras y números.', 'error'); return; }
      if (password !== confirmar) { mensaje(error, 'Las contraseñas no coinciden.', 'error'); return; }
      var boton = document.getElementById('btnRegistro'); boton.disabled = true; boton.textContent = 'Creando cuenta…';
      try {
        var resultado = await window.authRepository.registrarResponsable(email, password, nombre);
        if (resultado && resultado.session) {
          window.location.href = 'onboarding.html';
          return;
        }
        mensaje(exito, 'Cuenta creada. Revisa tu correo y confirma la dirección para continuar con la institución.', 'success');
        form.reset();
      } catch (e) { mensaje(error, e && e.message ? e.message : 'No se pudo crear la cuenta.', 'error'); }
      finally { boton.disabled = false; boton.textContent = 'Crear cuenta y continuar'; }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
