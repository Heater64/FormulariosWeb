(function () {
  'use strict';

  function iniciar() {
    if (!window.LoginForm) return;
    window.LoginForm.montar(document.getElementById('loginFormMount'), {
      iconoSrc: '/assets/iconos/icono.svg',
      destino: '/app/'
    });
    window.LoginForm.enlazarBotonesIr('login');
    if (window.PwaPill) {
      window.PwaPill.montar({ contenedor: document.getElementById('login'), id: window.PwaPill.ID_LANDING, esExamen: false });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
