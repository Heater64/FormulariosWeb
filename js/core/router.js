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

        if (!this._primeraCarga && this._transiciones) {
          raiz.classList.add('app-transicion-salida');
          await new Promise(r => setTimeout(r, 150));
          raiz.classList.remove('app-transicion-salida');
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
                <button class="btn-primario" onclick="location.reload()">Reintentar</button>
                <button class="btn-secundario" onclick="window.errorRecovery&&window.errorRecovery.recuperarCacheYRecargar('error de vista')">Limpiar caché y recargar</button>
              </div>
            </div>`;
          }
          // Una vista async puede terminar de escribir su HTML DESPUÉS de que
          // el usuario ya navegó a otra (carrera de monturas). Si eso ocurre,
          // re-ejecutar el router para que la vista actual vuelva a mostrarse.
          if (token !== this._ejecucionToken || this._rutaActual() !== cruda) {
            this._ejecutar();
            return;
          }
        } else {
          raiz.innerHTML = `<div class="o-contenedor u-mt-4 u-texto-centrado o-pila">
            <h2>Vista no disponible</h2>
            <p class="u-color-texto-secundario u-fs-sm">Es necesario recargar para obtener la última versión.</p>
            <button class="btn-primario" onclick="location.reload()">Recargar</button>
          </div>`;
        }

        if (this._transiciones) {
          raiz.classList.add('app-transicion-entrada');
          requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.remove('app-transicion-entrada')));
        }

        // App-like: cada vista nueva arranca arriba. En una SPA con hash, el
        // scroll de la vista anterior persiste entre rutas (señal clásica de
        // web): hay que resetearlo en cada montaje.
        try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch (e) { window.scrollTo(0, 0); }

        this._primeraCarga = false;
        store.actualizar('rutaActual', ruta);
        window.eventBus.publicar('route:change', { ruta, rutaConfig, params, query: queryObj });

        if (window.Iconos) window.Iconos.actualizar();
        document.querySelector('.barra-nav-inferior__item--activo')?.focus();

        return;
      }
    }
    this._irError('Página no encontrada');
  }

  _irError(mensaje) {
    const raiz = document.getElementById('app-root');
    if (raiz) {
      raiz.innerHTML = `<div class="o-contenedor u-texto-centrado u-mt-4 o-pila">
        <h1>404</h1>
        <p>${mensaje}</p>
        <button class="btn-primario" onclick="router.navegar('/estudio')">Ir al inicio</button>
      </div>`;
    }
  }

  irAtras() {
    window.history.back();
  }

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
