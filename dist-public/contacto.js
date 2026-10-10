(function () {
  'use strict';

  // Formulario CSP-safe: la RPC valida y persiste el mensaje sin abrir la
  // tabla de soporte a escrituras directas desde el navegador.
  function iniciar() {
    var form = document.getElementById('contactForm');
    var exito = document.getElementById('exitoMsg');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var nombre = document.getElementById('nombre').value.trim();
      var email = document.getElementById('email').value.trim();
      var mensaje = document.getElementById('mensaje').value.trim();
      var boton = form.querySelector('button[type="submit"]');
      if (nombre.length < 2 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || mensaje.length < 10) return;
      if (!window.supabaseClient) return;
      if (boton) { boton.disabled = true; boton.textContent = 'Enviando…'; }
      try {
        var resultado = await window.supabaseClient.rpc('enviar_contacto', { p_nombre: nombre, p_email: email, p_mensaje: mensaje });
        if (resultado.error) throw resultado.error;
        if (exito) { exito.textContent = 'Mensaje recibido. Nuestro equipo lo revisará y te responderá pronto.'; exito.classList.add('visible'); }
        form.reset();
      } catch (error) {
        if (exito) { exito.textContent = error && error.message ? error.message : 'No se pudo enviar el mensaje. Inténtalo de nuevo.'; exito.classList.add('visible'); }
      } finally {
        if (boton) { boton.disabled = false; boton.textContent = 'Enviar mensaje'; }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
