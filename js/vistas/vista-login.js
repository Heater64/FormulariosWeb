(function() {
  'use strict';
  const I = (n) => { try { return window.Iconos.render(n); } catch(e) { return ''; } };

  function crearLoading(texto) {
    const el = document.createElement('div');
    el.className = 'login-loading';
    el.innerHTML = `
      <div class="login-loading__icono">${I('book-open')}</div>
      <div class="login-loading__spinner"></div>
      <p class="login-loading__texto">${texto}</p>`;
    document.body.appendChild(el);
    return el;
  }

  function crearWelcome(nombre) {
    return new Promise(resolve => {
      const el = document.createElement('div');
      el.className = 'login-welcome';
      el.innerHTML = `
        <div class="login-welcome__check">${I('check')}</div>
        <p class="login-welcome__nombre">Bienvenido, ${window.helpers.escapeHtml(nombre)}</p>
        <p class="login-welcome__sub">Cargando tu progreso...</p>`;
      document.body.appendChild(el);
      setTimeout(() => { el.remove(); resolve(); }, 1200);
    });
  }

  // Panel demo SOLO visible en modo demo (window.entorno.modoDemo). Las
  // credenciales viven en config (js/config/entorno.js), nunca en esta vista.
  function credencialesDemo() {
    const e = window.entorno;
    if (!e || !e.modoDemo) return [];
    return Array.isArray(e.credencialesDemo) ? e.credencialesDemo : [];
  }

  function renderDemo(raiz) {
    const creds = credencialesDemo();
    if (!creds.length) return;
    const filas = creds.map(c => `
      <div class="login-demo__fila">
        <span class="login-demo__usuario">${window.helpers.escapeHtml(c.usuario)} &bull; ${window.helpers.escapeHtml(c.password)}</span>
        <button type="button" class="login-demo__copiar" data-copiar="${window.helpers.escapeHtml(c.usuario)}" data-copiar-pass="${window.helpers.escapeHtml(c.password)}">Copiar</button>
      </div>`).join('');
    const el = document.createElement('div');
    el.innerHTML = `
      <details class="login-demo">
        <summary>¿Quieres probar la aplicación?</summary>
        <div class="login-demo__panel">${filas}</div>
      </details>`;
    raiz.appendChild(el.firstElementChild);
    const primerBtn = el.querySelector('.login-demo__copiar');
    if (el.querySelectorAll('.login-demo__fila').length === 1) {
      primerBtn.dataset.copia = 'todo'; // fallback: copiar usuario+pass si un solo dato
    }
  }

  window.vistaLogin = {
    montar(raiz) {
      raiz.innerHTML = `
        <div class="login-pantalla">

          <!-- HERO -->
          <div class="login-hero">
            <div class="login-hero__icono">${I('book-open')}</div>
            <h1 class="login-hero__titulo">FormsBiblicos</h1>
            <p class="login-hero__tagline">Aprende la Biblia de forma estructurada, memorizando y evaluando tu progreso.</p>
          </div>

          <!-- FORMULARIO -->
          <form class="login-formulario" id="loginForm" autocomplete="on">
            <input type="text" id="loginUser" placeholder="Correo o usuario" autocomplete="username" required>
            <input type="password" id="loginPass" placeholder="Contraseña" autocomplete="current-password" required>
            <label class="login-recordar">
              <input type="checkbox" id="loginRecordar" checked>
              Recordar sesión
            </label>
            <button type="submit" id="loginBtn" class="login-btn">
              <span id="loginBtnTexto">Iniciar sesión</span>
            </button>
            <div id="loginError" class="login-error" style="display:none" role="alert"></div>
          </form>

          <!-- CREDENCIALES DEMO (solo modo demo; render dinámico) -->
          <div id="loginDemoContainer"></div>

          <!-- MÁS INFORMACIÓN -->
          <details class="login-info">
            <summary>${I('info')} Más información</summary>
            <div class="login-info__cuerpo">

              <div class="login-info__seccion">
                <h3>${I('book-open')} ¿Qué es FormsBiblicos?</h3>
                <p>Plataforma de estudio bíblico guiado con repaso inteligente, evaluaciones personalizadas y seguimiento de progreso. Diseñada para alumnos, profesores y comunidades de estudio.</p>
              </div>

              <div class="login-info__seccion">
                <h3>${I('map-pin')} ¿Cómo funciona?</h3>
                <div class="login-info__pasos">
                  <div class="login-info__paso"><p class="login-info__paso-num">①</p><p class="login-info__paso-titulo">Estudia</p><p class="login-info__paso-desc">Lee capítulos de la Biblia con preguntas guiadas.</p></div>
                  <div class="login-info__paso"><p class="login-info__paso-num">②</p><p class="login-info__paso-titulo">Memoriza</p><p class="login-info__paso-desc">Guarda versículos y repasa con repetición espaciada.</p></div>
                  <div class="login-info__paso"><p class="login-info__paso-num">③</p><p class="login-info__paso-titulo">Examínate</p><p class="login-info__paso-desc">Responde exámenes creados por tus profesores.</p></div>
                  <div class="login-info__paso"><p class="login-info__paso-num">④</p><p class="login-info__paso-titulo">Progresa</p><p class="login-info__paso-desc">Sigue tu avance con estadísticas y logros.</p></div>
                </div>
              </div>

              <div class="login-info__seccion">
                <h3>${I('help-circle')} Preguntas frecuentes</h3>
                <div class="login-info__faq">
                  <div class="login-info__faq-item">
                    <button class="login-info__faq-preg" type="button"><span>¿Es gratis?</span><span>${I('chevron-down')}</span></button>
                    <div class="login-info__faq-resp">Sí. FormsBiblicos es una herramienta educativa para grupos de estudio bíblico.</div>
                  </div>
                  <div class="login-info__faq-item">
                    <button class="login-info__faq-preg" type="button"><span>¿Necesito cuenta?</span><span>${I('chevron-down')}</span></button>
                    <div class="login-info__faq-resp">Sí. Un administrador de tu grupo debe crear tu cuenta con credenciales de acceso.</div>
                  </div>
                  <div class="login-info__faq-item">
                    <button class="login-info__faq-preg" type="button"><span>¿Funciona sin internet?</span><span>${I('chevron-down')}</span></button>
                    <div class="login-info__faq-resp">La aplicación completa se distribuye como APK para Android. Necesitarás conexión para sincronizar tus datos con Supabase.</div>
                  </div>
                  <div class="login-info__faq-item">
                    <button class="login-info__faq-preg" type="button"><span>¿Qué libros hay?</span><span>${I('chevron-down')}</span></button>
                    <div class="login-info__faq-resp">Todos los libros del Antiguo y Nuevo Testamento, organizados por capítulos.</div>
                  </div>
                </div>
              </div>

              <div class="login-info__seccion">
                <div class="login-info__cuenta">
                  <h3 style="justify-content:center">${I('users')} ¿Necesitas una cuenta?</h3>
                  <p>Contacta con un administrador de tu grupo de estudio para que te cree una.</p>
                </div>
              </div>

            </div>
          </details>

          <!-- FOOTER -->
          <div class="login-footer">
            <p>FormsBiblicos &middot; Versión 1.0.0</p>
            <p>&copy; ${new Date().getFullYear()} FormsBiblicos</p>
          </div>

        </div>`;

      if (window.Iconos) window.Iconos.actualizar();
      renderDemo(raiz);

      const form = raiz.querySelector('#loginForm');
      const user = raiz.querySelector('#loginUser');
      const pass = raiz.querySelector('#loginPass');
      const btn = raiz.querySelector('#loginBtn');
      const btnTexto = raiz.querySelector('#loginBtnTexto');
      const errorDiv = raiz.querySelector('#loginError');
      const chkRecordar = raiz.querySelector('#loginRecordar');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!user.value.trim() || !pass.value) {
          errorDiv.textContent = 'Completa todos los campos';
          errorDiv.style.display = 'flex';
          return;
        }
        btn.disabled = true;
        btnTexto.textContent = 'Verificando credenciales...';
        const spinner = document.createElement('span');
        spinner.className = 'login-btn__spinner';
        btn.appendChild(spinner);
        errorDiv.style.display = 'none';

        try {
          await authRepository.iniciarSesion(user.value.trim(), pass.value, chkRecordar.checked);
        } catch (err) {
          errorDiv.textContent = err.message;
          errorDiv.style.display = 'flex';
          btn.disabled = false;
          btnTexto.textContent = 'Iniciar sesión';
          spinner.remove();
        }
      });

      user.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pass.focus(); } });

      raiz.querySelectorAll('.login-demo__copiar').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!btn.dataset.copiar) return; // sin datos (modo demo mal configurado)
          const cred = btn.dataset.copiarPass
            ? (btn.dataset.copiar + '\n' + btn.dataset.copiarPass)
            : btn.dataset.copiar;
          try {
            await navigator.clipboard.writeText(cred);
            const b = e.currentTarget;
            b.textContent = 'Copiado';
            b.classList.add('login-demo__copiar--ok');
            setTimeout(() => { b.textContent = 'Copiar'; b.classList.remove('login-demo__copiar--ok'); }, 2000);
          } catch (err) {
            const [cu, cp] = cred.split('\n');
            if (cu) user.value = cu;
            if (cp) pass.value = cp;
          }
        });
      });

      raiz.querySelectorAll('.login-info__faq-preg').forEach(btn => {
        btn.addEventListener('click', () => {
          const resp = btn.nextElementSibling;
          resp.classList.toggle('login-info__faq-resp--abierto');
        });
      });

      user.focus();
    }
  };

  window._loginUI = { crearLoading, crearWelcome };
})();
