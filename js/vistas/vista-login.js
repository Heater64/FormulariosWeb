(function() {
  'use strict';

  function renderIcon(nombre) {
    try { return window.Iconos.render(nombre); } catch (e) { return ''; }
  }

  function actualizarIcons() {
    try { window.Iconos.actualizar(); } catch (e) {}
  }

  window.vistaLogin = {
    montar(raiz) {
      raiz.innerHTML = `
        <style>
          .landing-hero {
            text-align: center;
            padding: var(--espaciado-3xl, 48px) var(--espaciado-md) var(--espaciado-xl, 32px);
            background: linear-gradient(180deg, var(--color-acento-soft) 0%, transparent 100%);
          }
          .landing-hero__icono {
            font-size: 3rem;
            color: var(--color-acento);
            margin-bottom: var(--espaciado-md);
            display: flex;
            justify-content: center;
          }
          .landing-hero__titulo {
            font-size: clamp(1.5rem, 5vw, 2.5rem);
            font-weight: 800;
            color: var(--color-texto);
            margin: 0;
          }
          .landing-hero__subtitulo {
            font-size: var(--texto-base);
            color: var(--color-texto-secundario);
            max-width: 480px;
            margin: var(--espaciado-sm) auto 0;
          }
          .landing-seccion {
            padding: var(--espaciado-2xl, 32px) var(--espaciado-md);
            max-width: 720px;
            margin: 0 auto;
          }
          .landing-seccion__titulo {
            font-size: var(--texto-xl);
            font-weight: 700;
            color: var(--color-texto);
            margin: 0 0 var(--espaciado-md);
            display: flex;
            align-items: center;
            gap: var(--espaciado-sm);
          }
          .landing-seccion__titulo i { color: var(--color-acento); }
          .landing-card {
            padding: var(--espaciado-lg);
            background: var(--color-fondo-tarjeta);
            border: 1px solid var(--color-borde);
            border-radius: var(--radio-lg);
            margin-bottom: var(--espaciado-md);
          }
          .landing-card__icono {
            font-size: 1.5rem;
            color: var(--color-acento);
            display: flex;
            margin-bottom: var(--espaciado-xs);
          }
          .landing-card__titulo { font-weight: 700; margin: 0 0 var(--espaciado-xs); }
          .landing-card__texto { font-size: var(--texto-sm); color: var(--color-texto-secundario); margin: 0; line-height: 1.6; }
          .landing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--espaciado-md);
          }
          .landing-pasos {
            counter-reset: paso;
          }
          .landing-paso {
            display: flex;
            gap: var(--espaciado-md);
            padding: var(--espaciado-md) 0;
            border-bottom: 1px solid var(--color-borde);
          }
          .landing-paso:last-child { border-bottom: none; }
          .landing-paso__num {
            counter-increment: paso;
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--color-acento);
            color: #fff;
            font-weight: 800;
            font-size: var(--texto-sm);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .landing-paso__contenido { flex: 1; }
          .landing-paso__titulo { font-weight: 700; margin: 0 0 4px; }
          .landing-paso__texto { font-size: var(--texto-sm); color: var(--color-texto-secundario); margin: 0; line-height: 1.5; }
          .landing-acordeon {
            border: 1px solid var(--color-borde);
            border-radius: var(--radio-lg);
            overflow: hidden;
          }
          .landing-acordeon__item {
            border-bottom: 1px solid var(--color-borde);
          }
          .landing-acordeon__item:last-child { border-bottom: none; }
          .landing-acordeon__header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: var(--espaciado-md);
            background: none;
            border: none;
            cursor: pointer;
            font: inherit;
            font-size: var(--texto-sm);
            font-weight: 600;
            color: var(--color-texto);
            text-align: left;
            gap: var(--espaciado-sm);
            transition: background 0.15s ease;
          }
          .landing-acordeon__header:hover { background: var(--color-fondo-alt); }
          .landing-acordeon__icono { transition: transform 0.2s ease; color: var(--color-texto-terciario); flex-shrink: 0; }
          .landing-acordeon__icono--abierto { transform: rotate(180deg); }
          .landing-acordeon__cuerpo {
            padding: 0 var(--espaciado-md) var(--espaciado-md);
            font-size: var(--texto-sm);
            color: var(--color-texto-secundario);
            line-height: 1.6;
            display: none;
          }
          .landing-acordeon__cuerpo--abierto { display: block; }
          .landing-faqs {
            display: flex;
            flex-direction: column;
            gap: var(--espaciado-xs);
          }
          .landing-faq-pregunta {
            font-weight: 600;
            color: var(--color-texto);
            font-size: var(--texto-sm);
            margin: 0 0 4px;
          }
          .landing-faq-respuesta {
            font-size: var(--texto-sm);
            color: var(--color-texto-secundario);
            margin: 0;
            line-height: 1.6;
          }
          .landing-footer {
            text-align: center;
            padding: var(--espaciado-xl) var(--espaciado-md);
            border-top: 1px solid var(--color-borde);
            font-size: var(--texto-xs);
            color: var(--color-texto-terciario);
          }
          .form-login-wrapper {
            max-width: 400px;
            margin: 0 auto;
          }
          .form-login-card {
            padding: var(--espaciado-lg);
            background: var(--color-fondo-tarjeta);
            border: 2px solid var(--color-acento);
            border-radius: var(--radio-lg);
            box-shadow: var(--sombra-md);
          }
          .form-login-card h3 {
            margin: 0 0 var(--espaciado-sm);
            text-align: center;
            color: var(--color-texto);
          }
          @media (max-width: 480px) {
            .landing-grid { grid-template-columns: 1fr; }
            .landing-paso { flex-direction: column; align-items: flex-start; }
            .landing-seccion { padding: var(--espaciado-lg) var(--espaciado-sm); }
          }
        </style>

        <!-- HERO -->
        <div class="landing-hero">
          <div class="landing-hero__icono">${renderIcon('book-open')}</div>
          <h1 class="landing-hero__titulo">FormsBiblicos</h1>
          <p class="landing-hero__subtitulo">Plataforma de estudio bíblico guiado con repaso inteligente, evaluaciones personalizadas y seguimiento de progreso.</p>
        </div>

        <!-- LOGIN FORM -->
        <div class="landing-seccion">
          <div class="form-login-wrapper">
            <div class="form-login-card o-pila">
              <h3>${renderIcon('log-in')} Iniciar sesión</h3>
              <div id="loginError" class="u-oculto" style="background:var(--color-error-soft);color:var(--color-error);padding:var(--espaciado-sm);border-radius:var(--radio-md);font-size:var(--texto-sm)"></div>
              <input type="text" id="loginUser" placeholder="Usuario" autocomplete="username">
              <input type="password" id="loginPass" placeholder="Contraseña" autocomplete="current-password">
              <button id="loginBtn" class="btn-primario" style="width:100%;justify-content:center">Iniciar sesión</button>
              <p class="u-texto-centrado u-color-texto-terciario u-fs-xs">Demo: admin1 / admin123</p>
            </div>
          </div>
        </div>

        <!-- QUÉ ES -->
        <div class="landing-seccion">
          <h2 class="landing-seccion__titulo">${renderIcon('info')} ¿Qué es FormsBiblicos?</h2>
          <div class="landing-card">
            <p class="landing-card__texto">FormsBiblicos es una plataforma educativa diseñada para facilitar el estudio sistemático de la Biblia. Combina un plan de lectura estructurado por capítulos con un sistema de repaso espaciado (SRS) que optimiza la retención de conocimiento. Profesores y alumnos pueden interactuar a través de exámenes personalizados, evaluaciones y seguimiento de progreso individual y grupal.</p>
          </div>
        </div>

        <!-- OBJETIVOS -->
        <div class="landing-seccion">
          <h2 class="landing-seccion__titulo">${renderIcon('target')} Objetivos del proyecto</h2>
          <div class="landing-grid">
            <div class="landing-card">
              <div class="landing-card__icono">${renderIcon('book-marked')}</div>
              <p class="landing-card__titulo">Lectura guiada</p>
              <p class="landing-card__texto">Proporcionar un plan de lectura bíblica organizado por libros y capítulos para avanzar de forma constante y ordenada.</p>
            </div>
            <div class="landing-card">
              <div class="landing-card__icono">${renderIcon('brain')}</div>
              <p class="landing-card__titulo">Retención duradera</p>
              <p class="landing-card__texto">Aplicar técnicas de repaso espaciado para fijar el conocimiento bíblico en la memoria a largo plazo.</p>
            </div>
            <div class="landing-card">
              <div class="landing-card__icono">${renderIcon('graduation-cap')}</div>
              <p class="landing-card__titulo">Evaluación formativa</p>
              <p class="landing-card__texto">Permitir a profesores crear exámenes personalizados y dar seguimiento al progreso de cada alumno.</p>
            </div>
            <div class="landing-card">
              <div class="landing-card__icono">${renderIcon('users')}</div>
              <p class="landing-card__titulo">Comunidad de aprendizaje</p>
              <p class="landing-card__texto">Fomentar el estudio en grupo con herramientas de gestión de clases, evaluaciones compartidas y estadísticas colectivas.</p>
            </div>
          </div>
        </div>

        <!-- FILOSOFÍA -->
        <div class="landing-seccion">
          <h2 class="landing-seccion__titulo">${renderIcon('heart')} Filosofía de aprendizaje</h2>
          <div class="landing-card">
            <p class="landing-card__texto">Creemos que el estudio bíblico no debe ser esporádico ni desorganizado. Nuestra metodología se basa en tres pilares:</p>
            <ul style="font-size:var(--texto-sm);color:var(--color-texto-secundario);line-height:1.8;padding-left:var(--espaciado-lg);margin:var(--espaciado-sm) 0 0">
              <li><strong>Constancia</strong> — La lectura diaria y el repaso periódico son la base del aprendizaje profundo. El sistema motiva a mantener una racha constante.</li>
              <li><strong>Personalización</strong> — Cada alumno avanza a su ritmo. El repaso espaciado se adapta automáticamente a tu nivel de retención.</li>
              <li><strong>Comunidad</strong> — El aprendizaje en grupo potencia la motivación. Profesores guían, evalúan y acompañan el proceso.</li>
            </ul>
          </div>
        </div>

        <!-- CÓMO FUNCIONA -->
        <div class="landing-seccion">
          <h2 class="landing-seccion__titulo">${renderIcon('map-pin')} Cómo funciona</h2>
          <div class="landing-card landing-pasos">
            <div class="landing-paso">
              <span class="landing-paso__num"></span>
              <div class="landing-paso__contenido">
                <p class="landing-paso__titulo">Elige un libro y capítulo</p>
                <p class="landing-paso__texto">Selecciona cualquier libro de la Biblia. La plataforma muestra el contenido del capítulo y presenta preguntas relacionadas.</p>
              </div>
            </div>
            <div class="landing-paso">
              <span class="landing-paso__num"></span>
              <div class="landing-paso__contenido">
                <p class="landing-paso__titulo">Lee y responde preguntas</p>
                <p class="landing-paso__texto">Después de leer, contesta preguntas de opción múltiple, completar frases o verdadero/falso. Cada acierto refuerza tu aprendizaje.</p>
              </div>
            </div>
            <div class="landing-paso">
              <span class="landing-paso__num"></span>
              <div class="landing-paso__contenido">
                <p class="landing-paso__titulo">Repasa con el sistema SRS</p>
                <p class="landing-paso__texto">El repaso espaciado programa automáticamente cuándo debes repasar cada versículo, optimizando tu tiempo de estudio.</p>
              </div>
            </div>
            <div class="landing-paso">
              <span class="landing-paso__num"></span>
              <div class="landing-paso__contenido">
                <p class="landing-paso__titulo">Evalúa tu progreso</p>
                <p class="landing-paso__texto">Los profesores pueden crear exámenes personalizados. Alumnos y maestros ven estadísticas detalladas de rendimiento.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- BENEFICIOS -->
        <div class="landing-seccion">
          <h2 class="landing-seccion__titulo">${renderIcon('check-circle')} Beneficios del estudio bíblico guiado</h2>
          <div class="landing-grid">
            <div class="landing-card">
              <div class="landing-card__icono">${renderIcon('trending-up')}</div>
              <p class="landing-card__titulo">Progreso medible</p>
              <p class="landing-card__texto">Visualiza tu avance con estadísticas de lectura, rachas, preguntas respondidas y notas en exámenes.</p>
            </div>
            <div class="landing-card">
              <div class="landing-card__icono">${renderIcon('clock')}</div>
              <p class="landing-card__titulo">Optimización del tiempo</p>
              <p class="landing-card__texto">El repaso espaciado prioriza lo que estás a punto de olvidar, maximizando el rendimiento de cada sesión.</p>
            </div>
            <div class="landing-card">
              <div class="landing-card__icono">${renderIcon('message-square')}</div>
              <p class="landing-card__titulo">Retroalimentación continua</p>
              <p class="landing-card__texto">Los profesores pueden corregir exámenes, dejar observaciones y dar seguimiento personalizado a cada alumno.</p>
            </div>
            <div class="landing-card">
              <div class="landing-card__icono">${renderIcon('smartphone')}</div>
              <p class="landing-card__titulo">Acceso multi-dispositivo</p>
              <p class="landing-card__texto">Diseñada como PWA, funciona en navegadores móviles y de escritorio, con soporte offline parcial.</p>
            </div>
          </div>
        </div>

        <!-- SOLICITAR ACCESO -->
        <div class="landing-seccion">
          <h2 class="landing-seccion__titulo">${renderIcon('mail')} Cómo solicitar acceso</h2>
          <div class="landing-card">
            <p class="landing-card__texto">FormsBiblicos es una plataforma privada para grupos de estudio. Para solicitar acceso:</p>
            <ol style="font-size:var(--texto-sm);color:var(--color-texto-secundario);line-height:1.8;padding-left:var(--espaciado-lg);margin:var(--espaciado-sm) 0 0">
              <li>Contacta al administrador de tu grupo de estudio bíblico.</li>
              <li>El administrador creará tu cuenta y te proporcionará tus credenciales de acceso.</li>
              <li>Una vez dentro, podrás unirte al plan de lectura, realizar exámenes y usar el sistema de repaso.</li>
            </ol>
            <p class="landing-card__texto u-mt-2" style="font-size:var(--texto-xs);color:var(--color-texto-terciario)">Si eres profesor y deseas crear un grupo, escribe a <strong>formsbiblicos@ejemplo.com</strong>.</p>
          </div>
        </div>

        <!-- FAQ -->
        <div class="landing-seccion">
          <h2 class="landing-seccion__titulo">${renderIcon('help-circle')} Preguntas frecuentes</h2>
          <div class="landing-acordeon" id="faqAcordeon">
            <div class="landing-acordeon__item">
              <button class="landing-acordeon__header faq-toggle">
                <span>¿Es necesario tener una cuenta para usar la plataforma?</span>
                <span class="landing-acordeon__icono">${renderIcon('chevron-down')}</span>
              </button>
              <div class="landing-acordeon__cuerpo">Sí, el acceso es privado. Un administrador de tu grupo debe crear tu cuenta. Esto permite llevar un seguimiento personalizado del progreso.</div>
            </div>
            <div class="landing-acordeon__item">
              <button class="landing-acordeon__header faq-toggle">
                <span>¿Qué libros de la Biblia están disponibles?</span>
                <span class="landing-acordeon__icono">${renderIcon('chevron-down')}</span>
              </button>
              <div class="landing-acordeon__cuerpo">Todos los libros del Antiguo y Nuevo Testamento están disponibles, organizados por capítulos. Puedes navegarlos libremente desde la sección Estudio.</div>
            </div>
            <div class="landing-acordeon__item">
              <button class="landing-acordeon__header faq-toggle">
                <span>¿Cómo funciona el repaso espaciado?</span>
                <span class="landing-acordeon__icono">${renderIcon('chevron-down')}</span>
              </button>
              <div class="landing-acordeon__cuerpo">Cada versículo que guardas para memorizar se programa para repasarse en intervalos crecientes (1 día, 3 días, 7 días, 15 días…). Tú calificas qué tan bien lo recordaste y el sistema ajusta automáticamente el próximo repaso.</div>
            </div>
            <div class="landing-acordeon__item">
              <button class="landing-acordeon__header faq-toggle">
                <span>¿Puedo usar la plataforma sin conexión a internet?</span>
                <span class="landing-acordeon__icono">${renderIcon('chevron-down')}</span>
              </button>
              <div class="landing-acordeon__cuerpo">FormsBiblicos funciona como PWA (Progressive Web App). Puedes instalarla en tu dispositivo y algunas funciones como la lectura de capítulos ya visitados están disponibles sin conexión. Las respuestas a exámenes se sincronizan automáticamente cuando vuelves a tener conexión.</div>
            </div>
            <div class="landing-acordeon__item">
              <button class="landing-acordeon__header faq-toggle">
                <span>¿Los profesores pueden crear sus propios exámenes?</span>
                <span class="landing-acordeon__icono">${renderIcon('chevron-down')}</span>
              </button>
              <div class="landing-acordeon__cuerpo">Sí. Los usuarios con rol de profesor (admin/editor) pueden crear exámenes personalizados con preguntas de opción múltiple, verdadero/falso, completar, relacionar, ordenar y respuesta escrita. También pueden agruparlos en evaluaciones y calcular notas medias.</div>
            </div>
            <div class="landing-acordeon__item">
              <button class="landing-acordeon__header faq-toggle">
                <span>¿Se guarda mi progreso si cierro sesión?</span>
                <span class="landing-acordeon__icono">${renderIcon('chevron-down')}</span>
              </button>
              <div class="landing-acordeon__cuerpo">Sí, todo tu progreso (lecturas completadas, rachas, notas, tarjetas de memorización) se almacena de forma segura en la nube. Al iniciar sesión de nuevo, retomas exactamente donde lo dejaste.</div>
            </div>
            <div class="landing-acordeon__item">
              <button class="landing-acordeon__header faq-toggle">
                <span>¿Hay límite de alumnos por grupo?</span>
                <span class="landing-acordeon__icono">${renderIcon('chevron-down')}</span>
              </button>
              <div class="landing-acordeon__cuerpo">No hay un límite establecido. Cada grupo puede tener tantos alumnos como sea necesario. Los administradores pueden gestionar los miembros y asignar roles.</div>
            </div>
          </div>
        </div>

        <!-- ORGANIZACIÓN -->
        <div class="landing-seccion">
          <h2 class="landing-seccion__titulo">${renderIcon('building')} Sobre la organización</h2>
          <div class="landing-card">
            <p class="landing-card__texto">FormsBiblicos es un proyecto educativo sin fines de lucro desarrollado por un equipo de desarrolladores y educadores cristianos comprometidos con la enseñanza bíblica. Nuestro objetivo es poner la tecnología al servicio del estudio de las Escrituras, eliminando barreras y facilitando el aprendizaje en comunidad.</p>
            <p class="landing-card__texto u-mt-2" style="font-size:var(--texto-xs);color:var(--color-texto-terciario)">Para más información, escríbenos a: <strong>formsbiblicos@ejemplo.com</strong></p>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="landing-footer">
          <p>© ${new Date().getFullYear()} FormsBiblicos — Plataforma de estudio bíblico guiado</p>
          <p class="u-mt-1">Hecho con ${renderIcon('heart')} para la enseñanza de la Palabra</p>
        </div>
      `;

      actualizarIcons();

      // Login form logic
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

      // FAQ accordion
      raiz.querySelectorAll('.faq-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          const cuerpo = btn.nextElementSibling;
          const icono = btn.querySelector('.landing-acordeon__icono');
          const abierto = cuerpo.classList.contains('landing-acordeon__cuerpo--abierto');
          cuerpo.classList.toggle('landing-acordeon__cuerpo--abierto');
          if (icono) icono.classList.toggle('landing-acordeon__icono--abierto');
        });
      });
    }
  };
})();
