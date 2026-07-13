(function() {
  'use strict';

  window.vistaLogin = {
    montar(raiz) {
      raiz.innerHTML = `
        <div class="o-contenedor o-contenedor--estrecho" style="padding-top:20vh">
          <div class="o-pila o-pila--lg">
            <div class="u-texto-centrado">
              <h1 style="font-size:2.5rem;color:var(--color-acento);display:flex;justify-content:center">${window.Iconos.render('book-open')}</h1>
              <h2>FormsBiblicos</h2>
              <p class="u-color-texto-secundario u-mb-3">Plataforma de estudio bíblico guiado</p>
            </div>
            <div id="loginError" class="u-oculto" style="background:var(--color-error-soft);color:var(--color-error);padding:var(--espaciado-sm);border-radius:var(--radio-md);font-size:var(--texto-sm)"></div>
            <input type="text" id="loginUser" placeholder="Usuario" autocomplete="username">
            <input type="password" id="loginPass" placeholder="Contraseña" autocomplete="current-password">
            <button id="loginBtn" class="btn-primario" style="width:100%;justify-content:center">Iniciar sesión</button>
            <p class="u-texto-centrado u-color-texto-terciario u-fs-xs">Demo: admin1 / admin123</p>
          </div>
        </div>
      `;

      const btn = raiz.querySelector('#loginBtn');
      const user = raiz.querySelector('#loginUser');
      const pass = raiz.querySelector('#loginPass');
      const error = raiz.querySelector('#loginError');

      const login = async () => {
        if (!user.value || !pass.value) {
          error.textContent = 'Completa todos los campos';
          error.classList.remove('u-oculto');
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Entrando...';
        try {
          await authRepository.iniciarSesion(user.value, pass.value);
        } catch (e) {
          error.textContent = e.message;
          error.classList.remove('u-oculto');
          btn.disabled = false;
          btn.textContent = 'Iniciar sesión';
        }
      };

      btn.addEventListener('click', login);
      pass.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
      user.focus();
    }
  };
})();
