class Router {
  constructor() {
    this._rutas = new Map();
    this._vistaActual = null;
    this._primeraCarga = true;
    this._transiciones = true;
    this._guardias = [];
    this._middlewares = [];
    this._cacheVistas = new Map();
    this._ejecucionToken = 0;
    this._ultimaEjecucionMs = 0;

    // ── Navegación direccional ──
    this._historial = [];          // pila de rutas visitadas
    this._direccion = 'adelante';  // 'adelante' | 'atras'
    this._scrollPosiciones = new Map(); // ruta → { x, y }

    window.addEventListener('hashchange', () => this._ejecutar());
  }

  registrar(ruta, vista) {
    const parametros = [];
    const patronStr = ruta.replace(/:(\w+)/g, (_, nombre) => {
      parametros.push(nombre);
      return '([^/]+)';
    });
    this._rutas.set(ruta, {
      patron: new RegExp(`^${patronStr}$`),
      parametros,
      vista,
      lazy: typeof vista === 'function' && vista.name !== 'montar'
    });
  }

  registrarLazy(ruta, importFn) {
    this._rutas.set(ruta, {
      patron: new RegExp(`^${ruta.replace(/:(\w+)/g, '([^/]+)')}$`),
      parametros: [...ruta.matchAll(/:(\w+)/g)].map(m => m[1]),
      vista: null,
      lazy: true,
      importFn
    });
  }

  registrarGuardia(guardia) {
    this._guardias.push(guardia);
    return () => {
      const idx = this._guardias.indexOf(guardia);
      if (idx >= 0) this._guardias.splice(idx, 1);
    };
  }

  usar(middleware) {
    this._middlewares.push(middleware);
  }

  navegar(ruta, opciones = {}) {
    const href = `#!${ruta}`;
    if (opciones.reemplazar) {
      window.location.replace(href);
    } else {
      window.location.hash = href;
      if (!opciones.guardarHistorial) {
        window.history.replaceState(null, '', href);
      }
    }
  }

  reemplazar(ruta) {
    window.location.replace(`#!${ruta}`);
  }

  _rutaActual() {
    const hash = window.location.hash;
    return hash.startsWith('#!') ? hash.slice(2) : '/';
  }

  // Ruta normalizada (sin query string) para comparaciones de navegación:
  // los consumidores comparan contra rutas fijas ('/login', '/desafio/x'),
  // así que el query (?a=1) debe quedar fuera.
  pathActual() {
    return this._descomponer(this._rutaActual()).pathScript;
  }

  // Descompone la ruta cruda (sin #!) en { path, query }.
  // path conserva la barra inicial; query es un URLSearchParams.
  // /editor/nuevo?evaluacion=123 → path='/editor/nuevo', query.get('evaluacion')='123'
  _descomponer(rutaCruda) {
    const idx = rutaCruda.indexOf('?');
    const pathScript = idx === -1 ? rutaCruda : rutaCruda.slice(0, idx);
    const query = idx === -1 ? new URLSearchParams() : new URLSearchParams(rutaCruda.slice(idx + 1));
    return { pathScript, query };
  }

  async _ejecutar() {
    // Separar query string de la ruta: las vistas reciben route.query y no
    // tienen que parsear hash a mano (antes /editor/:id capturaba id con ?query).
    const cruda = this._rutaActual();
    const { pathScript: ruta, query } = this._descomponer(cruda);
    // Token anti-carrera: si otra navegación arranca mientras esta ejecución
    // está esperando (guardias, middleware o async de la vista), la
    // ejecución obsoleta se descarta y nunca pisa la vista recién montada.
    const token = ++this._ejecucionToken;

    // ── Detectar dirección de navegación ──
    // Si la ruta destino ya está en el historial → es retroceso (back/atrás).
    // Si no está → es avance (nueva vista).
    const idxEnHistorial = this._historial.lastIndexOf(ruta);
    const esAtras = idxEnHistorial >= 0;
    if (esAtras) {
      // Recortar historial desde esa posición en adelante
      this._historial.splice(idxEnHistorial + 1);
      this._direccion = 'atras';
    } else {
      // Guardar scroll de la vista actual antes de navegar
      if (this._vistaActual && this._historial.length > 0) {
        const rutaAnterior = this._historial[this._historial.length - 1];
        this._scrollPosiciones.set(rutaAnterior, { x: window.scrollX, y: window.scrollY });
      }
      this._historial.push(ruta);
      this._direccion = 'adelante';
      // Limitar historial a 20 entradas
      if (this._historial.length > 20) this._historial.shift();
    }

    for (const guardia of this._guardias) {
      try {
        const resultado = await guardia(ruta);
        if (resultado === false) return;
        if (typeof resultado === 'string') {
          this.reemplazar(resultado);
          return;
        }
      } catch (e) {
        console.warn('[Router] Guardia falló:', e);
      }
    }

    for (const [rutaConfig, config] of this._rutas) {
      const match = ruta.match(config.patron);
      if (match) {
        const params = {};
        if (config.parametros) {
          config.parametros.forEach((nombre, i) => {
            // decodeURIComponent puede lanzar URIError con secuencias % inválidas
            // (p.ej. #!/desafio/%E0%A4%A). Si falla, usar el segmento crudo para
            // que la navegación nunca muera por una URL malformada.
            const crudo = match[i + 1];
            try {
              params[nombre] = decodeURIComponent(crudo);
            } catch (e) {
              params[nombre] = crudo;
            }
          });
        }

        // Objeto plano de query string (fuente única: route.query / params.query)
        const queryObj = Object.fromEntries(query.entries());

        if (this._middlewares.length > 0) {
          for (const mw of this._middlewares) {
            try { await mw({ ruta, rutaConfig, params, query: queryObj }); } catch (e) { console.warn('[Router] Middleware:', e); }
          }
        }

        if (config.lazy && !config.vista) {
          if (this._cacheVistas.has(rutaConfig)) {
            config.vista = this._cacheVistas.get(rutaConfig);
          } else {
            try {
              const modulo = await config.importFn();
              config.vista = modulo.default || modulo;
              this._cacheVistas.set(rutaConfig, config.vista);
            } catch (e) {
              console.error(`[Router] Error cargando vista lazy para ${rutaConfig}:`, e);
              this._irError('No se pudo cargar esta sección. Verifica tu conexión.');
              return;
            }
          }
        }

        if (this._vistaActual?.desmontar) {
          await this._vistaActual.desmontar(ruta);
        }
        if (window.memoria) window.memoria.liberar(this._vistaActual);

        // Abortar si mientras tanto se inició otra navegación (carrera de
        // monturas async: una vista lenta puede terminar DESPUÉS de que el
        // usuario ya navegó a otra, pisándola). Comparar contra la ruta cruda
        // (con query) para no perder cambios de query string del mismo path.
        if (token !== this._ejecucionToken || this._rutaActual() !== cruda) return;

        const raiz = document.getElementById('app-root');
        if (!raiz) return;

        // En el primer arranque solo se muestra el splash principal. Las
        // navegaciones posteriores usan la transición ligera de sección;
        // nunca vuelven a bloquear la app con una pantalla completa.
        // No mostramos una pantalla completa al cambiar de sección: el shell y
        // los skeletons de cada vista mantienen la interfaz estable y permiten
        // navegar como en una app nativa. El splash solo pertenece al arranque.

        // Saltar animación de salida si el usuario está navegando muy rápido
        // (menos de 250ms entre ejecuciones): evita parpadeo por transiciones
        // solapadas de opacity: 0 → 1 → 0.
        const ahora = Date.now();
        const navegacionRapida = !this._primeraCarga && (ahora - this._ultimaEjecucionMs) < 250;
        this._ultimaEjecucionMs = ahora;

        if (!this._primeraCarga && this._transiciones && !navegacionRapida && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
          const claseSalida = this._direccion === 'atras' ? 'app-transicion-salida-atras' : 'app-transicion-salida';
          raiz.classList.add(claseSalida);
          await new Promise(r => setTimeout(r, 150));
          raiz.classList.remove(claseSalida);
        }

raiz.innerHTML = '';
        this._vistaActual = config.vista;

        // Contexto uniforme para las vistas: { params, query, path }
        // params.id → parámetros :id; query.x → query string (?x=1); path → ruta sin query
        const contextoVista = { ...params, query: queryObj, path: ruta };

        if (this._vistaActual && this._vistaActual.montar) {
          try {
            await this._vistaActual.montar(raiz, contextoVista);
          } catch (e) {
            console.error(`[Router] Error montando vista ${rutaConfig}:`, e);
            // Si fue un import() fallido, ofrecer un reintento y reparación
            // de datos locales además del simple reintento.
            const msg = (e && e.message) || 'Ocurrió un error inesperado.';
            raiz.innerHTML = `<div class="o-contenedor u-mt-4 u-texto-centrado o-pila">
              <h2>Error al cargar</h2>
              <p class="u-color-texto-secundario u-fs-sm">${msg}</p>
              <div class="o-flecha" style="justify-content:center;flex-wrap:wrap">
                <button class="btn-primario" data-router-accion="recargar">Reintentar</button>
                <button class="btn-secundario" data-router-accion="limpiar-cache">Limpiar caché y recargar</button>
              </div>
            </div>`;
            this._conectarAccionesError(raiz);
          }
          // Una vista async puede terminar de escribir su HTML DESPUÉS de que
          // el usuario ya navegó a otra (carrera de monturas). Si eso ocurre,
          // re-renderizar la vista actual DIRECTAMENTE (sin re-ejecutar el router
          // entero, lo que causaría otra cascada de animaciones y parpadeo).
          if (token !== this._ejecucionToken || this._rutaActual() !== cruda) {
            this._repararVistaActual();
            return;
          }
        } else {
          raiz.innerHTML = `<div class="o-contenedor u-mt-4 u-texto-centrado o-pila">
            <h2>Vista no disponible</h2>
            <p class="u-color-texto-secundario u-fs-sm">Es necesario recargar para obtener la última versión.</p>
            <button class="btn-primario" data-router-accion="recargar">Recargar</button>
          </div>`;
          this._conectarAccionesError(raiz);
        }

        if (this._transiciones) {
          const claseEntrada = this._direccion === 'atras' ? 'app-transicion-entrada-atras' : 'app-transicion-entrada';
          raiz.classList.add(claseEntrada);
          requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.remove(claseEntrada)));
        }

        // App-like: restaurar posición de scroll o ir arriba
        try {
          if (this._direccion === 'atras' && this._scrollPosiciones.has(ruta)) {
            const pos = this._scrollPosiciones.get(ruta);
            window.scrollTo({ top: pos.y, left: pos.x, behavior: 'auto' });
            this._scrollPosiciones.delete(ruta);
          } else {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
          }
        } catch (e) { window.scrollTo(0, 0); }

        this._primeraCarga = false;
        this._aplicarTitulo(rutaConfig, params);
        store.actualizar('rutaActual', ruta);
        window.eventBus.publicar('route:change', { ruta, rutaConfig, params, query: queryObj });

        if (window.Iconos) window.Iconos.actualizar();
        document.querySelector('.barra-nav-inferior__item--activo')?.focus();

        return;
      }
    }
    this._irError('Página no encontrada');
  }

  // Repara la vista actual sin transiciones: se usa cuando una vista async
  // obsoleta pisó el DOM (carrera de monturas). Re-monta la vista correcta
  // directamente, sin animaciones, para evitar parpadeo en navegación rápida.
  async _repararVistaActual() {
    const raiz = document.getElementById('app-root');
    if (!raiz || !this._vistaActual || !this._vistaActual.montar) return;

    // Limpiar sin animación
    raiz.classList.remove('app-transicion-salida', 'app-transicion-entrada', 'app-transicion-salida-atras', 'app-transicion-entrada-atras');
    raiz.innerHTML = '';

    // Reconstruir el contexto desde la ruta actual
    const cruda = this._rutaActual();
    const { pathScript: ruta, query } = this._descomponer(cruda);
    for (const [rutaConfig, config] of this._rutas) {
      const match = ruta.match(config.patron);
      if (!match) continue;
      const params = {};
      if (config.parametros) {
        config.parametros.forEach((nombre, i) => { params[nombre] = match[i + 1]; });
      }
      const queryObj = Object.fromEntries(query.entries());
      const contextoVista = { ...params, query: queryObj, path: ruta };

      try {
        await this._vistaActual.montar(raiz, contextoVista);
      } catch (e) {
        console.error('[Router] Error reparando vista:', e);
        this._irError('Error al recuperar la vista.');
      }
      return;
    }
  }

  _conectarAccionesError(raiz) {
    raiz.querySelectorAll('[data-router-accion]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const accion = boton.dataset.routerAccion;
        if (accion === 'recargar') window.location.reload();
        if (accion === 'inicio') this.navegar('/estudio');
        if (accion === 'limpiar-cache' && window.errorRecovery) {
          window.errorRecovery.recuperarCacheYRecargar('error de vista');
        }
      });
    });
  }

  _irError(mensaje) {
    const raiz = document.getElementById('app-root');
    if (raiz) {
      raiz.innerHTML = `<div class="o-contenedor u-texto-centrado u-mt-4 o-pila">
        <h1>404</h1>
        <p>${mensaje}</p>
        <button class="btn-primario" data-router-accion="inicio">Ir al inicio</button>
      </div>`;
      this._conectarAccionesError(raiz);
    }
  }

  // Títulos únicos por ruta (UX/SEO dentro de la app). La marca del centro
  // configurada por el propietario (fb_marca) tiene prioridad: si existe,
  // se mantiene como título en todas las secciones.
  _titulos() {
    return {
      '/': 'FormsBiblicos — Estudio bíblico guiado',
      '/estudio': 'Estudio — FormsBiblicos',
      '/estudio/libro/:libro': 'Capítulos — FormsBiblicos',
      '/estudio/sesion/:libro/:capitulo': 'Sesión de estudio — FormsBiblicos',
      '/leer/:libro/:capitulo': 'Lectura — FormsBiblicos',
      '/examenes': 'Exámenes — FormsBiblicos',
      '/memorizacion': 'Memorización — FormsBiblicos',
      '/explorar': 'Explorar — FormsBiblicos',
      '/perfil': 'Perfil — FormsBiblicos',
      '/notificaciones': 'Notificaciones — FormsBiblicos',
      '/mapa': 'Mapa bíblico — FormsBiblicos',
      '/tomar/:id': 'Examen — FormsBiblicos',
      '/editor/nuevo': 'Nuevo examen — FormsBiblicos',
      '/editor/:id': 'Editar examen — FormsBiblicos',
      '/corregir/:id': 'Corregir examen — FormsBiblicos',
      '/calificaciones': 'Calificaciones — FormsBiblicos',
      '/grupos': 'Clases — FormsBiblicos',
      '/grupos/:id': 'Clase — FormsBiblicos',
      '/desafio/:id': 'Desafío — FormsBiblicos',
      '/admin': 'Panel de administración — FormsBiblicos'
    };
  }

  _aplicarTitulo(rutaConfig, params) {
    let marcaNombre = '';
    try {
      const cache = JSON.parse(localStorage.getItem('fb_marca') || 'null');
      if (cache && cache.marca_nombre) marcaNombre = cache.marca_nombre;
    } catch (e) {}
    if (marcaNombre) {
      document.title = marcaNombre;
      return;
    }
    const plantilla = this._titulos()[rutaConfig];
    if (!plantilla) return;
    document.title = plantilla.replace(/:\w+/g, (_, n) => params[n] || '');
  }

  irAtras() {
    window.history.back();
  }

  // ── Utilidades de navegación ──
  get direccion() { return this._direccion; }
  get historialLength() { return this._historial.length; }
  puedeRetroceder() { return this._historial.length >= 2; }

  recargar() {
    this._ejecutar();
  }

  habilitarTransiciones(valor = true) {
    this._transiciones = valor;
  }

  limpiarCacheVistas() {
    this._cacheVistas.clear();
  }
}

window.Router = Router;
window.router = new Router();
