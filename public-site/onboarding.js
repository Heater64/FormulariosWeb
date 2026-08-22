(function () {
  'use strict';
  function iniciar() {
    var form = document.getElementById('formOnboarding');
    var error = document.getElementById('errorOnboarding');
    var exito = document.getElementById('exitoOnboarding');
    if (!form) return;
    function mostrar(nodo, texto, tipo) { nodo.textContent = texto; nodo.className = 'msg ' + tipo + ' visible'; }
    function limpiar() { error.className = 'msg error'; exito.className = 'msg success'; }
    function mostrarExito(data) {
      form.classList.add('hidden');
      mostrar(exito, 'Institución creada. Tu primera clase ya está lista. Código para compartir: ' + data.codigo + '.', 'success');
      setTimeout(function () { window.location.href = '/app/'; }, 1800);
    }
    form.addEventListener('submit', async function (evento) {
      evento.preventDefault(); limpiar();
      var institucion = document.getElementById('institucionNombre').value.trim();
      var clase = document.getElementById('claseNombre').value.trim();
      var descripcion = document.getElementById('descripcion').value.trim();
      if (institucion.length < 2 || clase.length < 2) { mostrar(error, 'Completa el nombre de la institución y de la clase.', 'error'); return; }
      if (!window.authRepository || !window.supabaseClient) { mostrar(error, 'El servicio aún no está disponible. Recarga la página e inténtalo de nuevo.', 'error'); return; }
      var boton = document.getElementById('btnOnboarding'); boton.disabled = true; boton.textContent = 'Creando…';
      try { mostrarExito(await window.authRepository.crearInstitucionYClase(institucion, clase, descripcion)); }
      catch (e) { mostrar(error, e && e.message ? e.message : 'No se pudo completar el onboarding.', 'error'); boton.disabled = false; boton.textContent = 'Crear institución y clase'; }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
