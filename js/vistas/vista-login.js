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
        <summary>${I('key')} Credenciales de prueba</summary>
        <div class="login-demo__panel">${filas}</div>
      </details>`;
    // Insertar dentro de la columna de contenido (no fuera de .login-pantalla)
    const contenedor = raiz.querySelector('#loginDemoContainer') || raiz;
    contenedor.appendChild(el.firstElementChild);
    const primerBtn = el.querySelector('.login-demo__copiar');
    if (el.querySelectorAll('.login-demo__fila').length === 1) {
      primerBtn.dataset.copia = 'todo'; // fallback: copiar usuario+pass si un solo dato
    }
  }

  window.vistaLogin = {
    montar(raiz) {
      const version = (window.__FB_APP_VERSION__ && window.__FB_APP_VERSION__.version) || '1.0.0';
      // Ruta de las capturas de la app: la página standalone vive en /paginas/,
      // el SPA en la raíz. Con ../ desde paginas ambos resuelven igual.
      const baseCapturas = window.location.pathname.includes('/paginas/')
        ? '../assets/capturas/'
        : 'assets/capturas/';

      raiz.innerHTML = `
        <div class="login-pantalla">

          <!-- MARCA (panel lateral / cabecera compacta en móvil) -->
          <aside class="login-marca" aria-label="Presentación de FormsBiblicos">
            <div class="login-marca__interior">
              <div class="login-marca__centro">
                <div class="login-marca__logo">
                  <span class="login-marca__logo-icono">${I('book-open')}</span>
                  <span class="login-marca__logo-texto">FormsBiblicos</span>
                </div>
                <h1 class="login-marca__titulo">Estudia la Biblia,<br><em>capítulo a capítulo.</em></h1>
                <p class="login-marca__tagline">Lectura guiada, memorización con repetición espaciada y evaluaciones personalizadas para tu grupo de estudio.</p>
                <ul class="login-marca__ventajas">
                  <li>${I('book-open')}<span>Lectura guiada con preguntas por capítulo</span></li>
                  <li>${I('repeat')}<span>Memorización con repetición espaciada</span></li>
                  <li>${I('clipboard-check')}<span>Exámenes y seguimiento de progreso</span></li>
                </ul>
              </div>
              <p class="login-marca__datos">66 libros &middot; 1.189 capítulos</p>
            </div>
          </aside>

          <!-- CONTENIDO -->
          <section class="login-contenido" aria-label="Acceso">
            <div class="login-contenido__caja">
              <header class="login-cabecera">
                <h2 class="login-cabecera__titulo">Iniciar sesión</h2>
                <p class="login-cabecera__sub">Accede con la cuenta que te asignó tu grupo de estudio.</p>
              </header>

              <!-- FORMULARIO -->
              <form class="login-formulario" id="loginForm" autocomplete="on" novalidate>
                <div class="login-campo">
                  <label class="login-campo__label" for="loginUser">Correo o usuario</label>
                  <div class="login-campo__control">
                    <span class="login-campo__icono" aria-hidden="true">${I('user')}</span>
                    <input type="text" id="loginUser" placeholder="nombre@correo.com" autocomplete="username" autocapitalize="none" spellcheck="false" required>
                  </div>
                </div>

                <div class="login-campo">
                  <label class="login-campo__label" for="loginPass">Contraseña</label>
                  <div class="login-campo__control">
                    <span class="login-campo__icono" aria-hidden="true">${I('lock')}</span>
                    <input type="password" id="loginPass" placeholder="••••••••" autocomplete="current-password" required>
                    <button type="button" class="login-campo__ver" id="loginVerPass" aria-label="Mostrar contraseña" aria-pressed="false">${I('eye')}</button>
                  </div>
                </div>

                <label class="login-recordar">
                  <input type="checkbox" id="loginRecordar" checked>
                  <span>Recordar sesión</span>
                </label>

                <button type="submit" id="loginBtn" class="login-btn">
                  <span id="loginBtnTexto">Iniciar sesión</span>
                </button>
                <div id="loginError" class="login-error" style="display:none" role="alert" aria-live="polite"></div>
              </form>

              <!-- CREDENCIALES DEMO (solo modo demo; render dinámico) -->
              <div id="loginDemoContainer"></div>

            </div>

            <!-- MÁS INFORMACIÓN: en móvil alterna el acordeón inferior; en escritorio es ancla -->
            <a class="login-info-enlace" href="#mas-informacion" aria-controls="mas-informacion">
              <span class="login-info-enlace__icono" aria-hidden="true">${I('info')}</span>
              Más información
            </a>

            <!-- FOOTER -->
            <footer class="login-footer">
              <p>FormsBiblicos &middot; Versión ${version}</p>
              <p>&copy; ${new Date().getFullYear()} FormsBiblicos</p>
            </footer>
          </section>

          <!-- MÁS INFORMACIÓN: sección integrada a ancho completo (escritorio) / acordeón (móvil) -->
          <section class="login-info" id="mas-informacion" aria-label="Más información">
            <div class="login-info__interior">
              <div class="login-info__cuerpo">
              <div class="login-info__contenido">
                <header class="login-info__cabecera">
                  <h2 class="login-info__titulo">Más información</h2>
                  <p class="login-info__lede">Así se ve la plataforma por dentro: las secciones principales y cómo te ayudan a estudiar la Biblia capítulo a capítulo.</p>
                </header>
              <div class="login-info__grid">

                <div class="login-info__seccion login-info__seccion--galeria">
                  <h3>${I('sparkles')} Descubre la app</h3>
                  <div class="login-info__galeria" id="loginGaleria" tabindex="0" role="group" aria-roledescription="carrusel" aria-label="Galería de capturas de la aplicación"></div>
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
                      <button class="login-info__faq-preg" type="button" aria-expanded="false"><span>¿Es gratis?</span><span>${I('chevron-down')}</span></button>
                      <div class="login-info__faq-resp">Sí. FormsBiblicos es una herramienta educativa para grupos de estudio bíblico.</div>
                    </div>
                    <div class="login-info__faq-item">
                      <button class="login-info__faq-preg" type="button" aria-expanded="false"><span>¿Necesito cuenta?</span><span>${I('chevron-down')}</span></button>
                      <div class="login-info__faq-resp">Sí. Un administrador de tu grupo debe crear tu cuenta con credenciales de acceso.</div>
                    </div>
                    <div class="login-info__faq-item">
                      <button class="login-info__faq-preg" type="button" aria-expanded="false"><span>¿Funciona sin internet?</span><span>${I('chevron-down')}</span></button>
                      <div class="login-info__faq-resp">Funciona en el navegador y puedes instalarla como aplicación (PWA) en tu móvil u ordenador. Necesitarás conexión para sincronizar tus datos con Supabase.</div>
                    </div>
                    <div class="login-info__faq-item">
                      <button class="login-info__faq-preg" type="button" aria-expanded="false"><span>¿Qué libros hay?</span><span>${I('chevron-down')}</span></button>
                      <div class="login-info__faq-resp">Todos los libros del Antiguo y Nuevo Testamento, organizados por capítulos.</div>
                    </div>
                  </div>
                </div>

                <div class="login-info__seccion login-info__seccion--ancha">
                  <div class="login-info__cuenta">
                    <h3 style="justify-content:center">${I('users')} ¿Necesitas una cuenta?</h3>
                    <p>Contacta con un administrador de tu grupo de estudio para que te cree una.</p>
                  </div>
                </div>

              </div>
              </div>
              </div>
            </div>
          </section>

        </div>`;

      if (window.Iconos) window.Iconos.actualizar();
      renderDemo(raiz);

      // Galería de capturas (carrusel): flechas, puntos, contador y teclado
      const galeriaDatos = [
        { img: 'estudio-sesion.png', icono: 'book-open', titulo: 'Estudio guiado', desc: 'Lee cada capítulo con preguntas de repaso y lleva tu propio ritmo.', alt: 'Sesión de estudio guiado: lectura de un capítulo con preguntas de repaso' },
        { img: 'memorizacion.png', icono: 'repeat', titulo: 'Memorización', desc: 'Guarda versículos y repásalos con repetición espaciada para retenerlos de verdad.', alt: 'Memorización de versículos con repetición espaciada' },
        { img: 'examenes.png', icono: 'clipboard-check', titulo: 'Exámenes', desc: 'Responde los exámenes que crea tu profesor y consulta tus calificaciones.', alt: 'Lista de exámenes de estudio' },
        { img: 'progreso.png', icono: 'trending-up', titulo: 'Progreso', desc: 'Sigue tu avance con estadísticas, rachas y logros.', alt: 'Progreso de estudio con estadísticas y rachas' }
      ];
      const galeriaEl = raiz.querySelector('#loginGaleria');
      if (galeriaEl) {
        galeriaEl.innerHTML = `
          <div class="login-info__galeria-viewport">
            <div class="login-info__galeria-pista"></div>
            <button type="button" class="login-info__galeria-flecha login-info__galeria-flecha--prev" aria-label="Captura anterior">${I('chevron-left')}</button>
            <button type="button" class="login-info__galeria-flecha login-info__galeria-flecha--next" aria-label="Captura siguiente">${I('chevron-right')}</button>
          </div>
          <p class="login-info__galeria-titulo" data-galeria-titulo></p>
          <p class="login-info__galeria-desc" data-galeria-desc></p>
          <div class="login-info__galeria-controles">
            <span class="login-info__galeria-contador" data-galeria-contador aria-hidden="true"></span>
            <div class="login-info__galeria-puntos" role="group" aria-label="Seleccionar captura">
              ${galeriaDatos.map((d, i) => `<button type="button" class="login-info__galeria-punto" aria-label="Captura ${i + 1} de ${galeriaDatos.length}"></button>`).join('')}
            </div>
          </div>`;
        if (window.Iconos) window.Iconos.actualizar();

        const pista = galeriaEl.querySelector('.login-info__galeria-pista');
        // Cada captura es un botón clicable que abre el lightbox ampliado
        const botones = galeriaDatos.map((d, i) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'login-info__tarjeta-boton';
          b.setAttribute('aria-label', `Ver captura ampliada: ${d.titulo}`);
          b.innerHTML = `<img class="login-info__tarjeta-img" src="${baseCapturas}${d.img}" alt="${window.helpers.escapeHtml(d.alt)}" loading="lazy" decoding="async">`;
          return b;
        });
        pista.append(...botones);
        const imgs = botones.map(b => b.querySelector('img'));
        const puntos = [...galeriaEl.querySelectorAll('.login-info__galeria-punto')];
        const prevBtn = galeriaEl.querySelector('.login-info__galeria-flecha--prev');
        const nextBtn = galeriaEl.querySelector('.login-info__galeria-flecha--next');
        const tituloEl = galeriaEl.querySelector('[data-galeria-titulo]');
        const descEl = galeriaEl.querySelector('[data-galeria-desc]');
        const contadorEl = galeriaEl.querySelector('[data-galeria-contador]');
        const total = galeriaDatos.length;
        let indice = 0;

        const pintar = () => {
          const d = galeriaDatos[indice];
          pista.style.transform = `translateX(-${indice * 100}%)`;
          botones.forEach((b, i) => {
            const activo = i === indice;
            imgs[i].setAttribute('aria-hidden', String(!activo));
            b.setAttribute('aria-hidden', String(!activo));
            b.tabIndex = activo ? 0 : -1;
          });
          tituloEl.innerHTML = `${I(d.icono)} ${window.helpers.escapeHtml(d.titulo)}`;
          descEl.textContent = d.desc;
          if (contadorEl) contadorEl.textContent = `${indice + 1} / ${total}`;
          puntos.forEach((p, i) => {
            p.classList.toggle('login-info__galeria-punto--activo', i === indice);
            p.setAttribute('aria-current', i === indice ? 'true' : 'false');
          });
          if (prevBtn) prevBtn.disabled = indice === 0;
          if (nextBtn) nextBtn.disabled = indice === total - 1;
          if (window.Iconos) window.Iconos.actualizar();
        };
        const ir = (n) => { indice = Math.max(0, Math.min(total - 1, n)); pintar(); };

        if (prevBtn) prevBtn.addEventListener('click', () => ir(indice - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => ir(indice + 1));
        puntos.forEach((p, i) => p.addEventListener('click', () => ir(i)));
        galeriaEl.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); ir(indice - 1); }
          if (e.key === 'ArrowRight') { e.preventDefault(); ir(indice + 1); }
        });
        pintar();

        // ── Lightbox: ver la captura en grande ──
        const lightbox = document.createElement('div');
        lightbox.className = 'login-lightbox';
        lightbox.setAttribute('role', 'dialog');
        lightbox.setAttribute('aria-modal', 'true');
        lightbox.setAttribute('aria-label', 'Captura ampliada de la aplicación');
        lightbox.innerHTML = `
          <button type="button" class="login-lightbox__cerrar" aria-label="Cerrar vista ampliada">${I('x')}</button>
          <button type="button" class="login-lightbox__flecha login-lightbox__flecha--prev" aria-label="Captura anterior">${I('chevron-left')}</button>
          <figure class="login-lightbox__marco">
            <img class="login-lightbox__img" alt="">
            <figcaption class="login-lightbox__pie"></figcaption>
          </figure>
          <button type="button" class="login-lightbox__flecha login-lightbox__flecha--next" aria-label="Captura siguiente">${I('chevron-right')}</button>`;
        document.body.appendChild(lightbox);
        if (window.Iconos) window.Iconos.actualizar();

        const lbCerrar = lightbox.querySelector('.login-lightbox__cerrar');
        const lbPrev = lightbox.querySelector('.login-lightbox__flecha--prev');
        const lbNext = lightbox.querySelector('.login-lightbox__flecha--next');
        const lbImg = lightbox.querySelector('.login-lightbox__img');
        const lbPie = lightbox.querySelector('.login-lightbox__pie');
        let focoAnterior = null;

        const pintarLightbox = () => {
          const d = galeriaDatos[indice];
          lbImg.src = `${baseCapturas}${d.img}`;
          lbImg.alt = d.alt;
          lbPie.innerHTML = `<strong>${window.helpers.escapeHtml(d.titulo)}</strong><span>${indice + 1} / ${total}</span>`;
          lbPrev.disabled = indice === 0;
          lbNext.disabled = indice === total - 1;
        };
        const abrirLightbox = (i) => {
          indice = i;
          pintar();
          pintarLightbox();
          focoAnterior = document.activeElement;
          lightbox.classList.add('login-lightbox--abierto');
          document.body.classList.add('login-lightbox-activo');
          lbCerrar.focus();
        };
        const cerrarLightbox = () => {
          lightbox.classList.remove('login-lightbox--abierto');
          document.body.classList.remove('login-lightbox-activo');
          if (focoAnterior && typeof focoAnterior.focus === 'function') focoAnterior.focus();
        };
        const irLightbox = (n) => { ir(n); pintarLightbox(); };

        botones.forEach((b, i) => b.addEventListener('click', () => abrirLightbox(i)));
        lbCerrar.addEventListener('click', cerrarLightbox);
        lbPrev.addEventListener('click', () => irLightbox(indice - 1));
        lbNext.addEventListener('click', () => irLightbox(indice + 1));
        lightbox.addEventListener('click', (e) => { if (e.target === lightbox) cerrarLightbox(); });
        document.addEventListener('keydown', (e) => {
          if (!lightbox.classList.contains('login-lightbox--abierto')) return;
          if (e.key === 'Escape') { e.preventDefault(); cerrarLightbox(); return; }
          if (e.key === 'ArrowLeft') { e.preventDefault(); irLightbox(indice - 1); return; }
          if (e.key === 'ArrowRight') { e.preventDefault(); irLightbox(indice + 1); return; }
          if (e.key === 'Tab') {
            const focables = [lbCerrar, lbPrev, lbNext].filter(b => !b.disabled);
            if (!focables.length) return;
            const primero = focables[0];
            const ultimo = focables[focables.length - 1];
            if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
            else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
          }
        });
      }

      const form = raiz.querySelector('#loginForm');
      const user = raiz.querySelector('#loginUser');
      const pass = raiz.querySelector('#loginPass');
      const btn = raiz.querySelector('#loginBtn');
      const btnTexto = raiz.querySelector('#loginBtnTexto');
      const errorDiv = raiz.querySelector('#loginError');
      const chkRecordar = raiz.querySelector('#loginRecordar');
      const verPass = raiz.querySelector('#loginVerPass');

      // Toggle mostrar/ocultar contraseña
      if (verPass) {
        verPass.addEventListener('click', () => {
          const oculta = pass.type === 'password';
          pass.type = oculta ? 'text' : 'password';
          verPass.setAttribute('aria-pressed', String(oculta));
          verPass.setAttribute('aria-label', oculta ? 'Ocultar contraseña' : 'Mostrar contraseña');
          verPass.innerHTML = I(oculta ? 'eye-off' : 'eye');
          if (window.Iconos) window.Iconos.actualizar();
          pass.focus();
        });
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!user.value.trim() || !pass.value) {
          errorDiv.textContent = 'Completa todos los campos';
          errorDiv.style.display = 'flex';
          if (!user.value.trim()) user.focus(); else pass.focus();
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

      // Más información: acordeón en móvil, ancla de scroll nativa en escritorio
      const infoEnlace = raiz.querySelector('.login-info-enlace');
      const infoSeccion = raiz.querySelector('#mas-informacion');
      const infoCuerpo = raiz.querySelector('.login-info__cuerpo');
      const mqMovil = window.matchMedia('(max-width: 879px)');

      const sincronizarInfo = () => {
        if (!infoSeccion) return;
        const movil = mqMovil.matches;
        const abierto = infoSeccion.classList.contains('login-info--abierto');
        infoSeccion.classList.toggle('login-info--abierto', !movil);
        if (infoCuerpo) infoCuerpo.inert = movil && !abierto;
        if (infoEnlace) {
          // En escritorio es una ancla de scroll (sin estado expandido);
          // en móvil sí es un acordeón con estado expandido real.
          if (movil) infoEnlace.setAttribute('aria-expanded', String(abierto));
          else infoEnlace.removeAttribute('aria-expanded');
        }
      };
      sincronizarInfo();
      if (mqMovil.addEventListener) mqMovil.addEventListener('change', sincronizarInfo);

      if (infoEnlace) {
        infoEnlace.addEventListener('click', (e) => {
          e.preventDefault();
          if (!mqMovil.matches) {
            // Escritorio: scroll suave hasta la sección inferior (funciona
            // también si el hash ya está en la URL y se pulsa de nuevo).
            if (history.replaceState) history.replaceState(null, '', '#mas-informacion');
            infoSeccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
          const abrir = !infoSeccion.classList.contains('login-info--abierto');
          infoSeccion.classList.toggle('login-info--abierto', abrir);
          infoEnlace.setAttribute('aria-expanded', String(abrir));
          if (infoCuerpo) infoCuerpo.inert = !abrir;
          // Desplazarse al inicio de la transición del acordeón
          window.setTimeout(() => {
            (abrir ? infoSeccion : infoEnlace).scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, abrir ? 140 : 0);
        });
      }

      raiz.querySelectorAll('.login-info__faq-preg').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = btn.closest('.login-info__faq-item');
          const abierto = item.classList.toggle('login-info__faq-item--abierto');
          btn.setAttribute('aria-expanded', String(abierto));
        });
      });

      user.focus();
    }
  };

  window._loginUI = { crearLoading, crearWelcome };
})();
