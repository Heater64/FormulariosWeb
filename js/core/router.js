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

  async _ejecutar() {
    const ruta = this._rutaActual();
    // Token anti-carrera: si otra navegación arranca mientras esta ejecución
    // está esperando (guardias, middleware o montaje async de la vista), la
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
            params[nombre] = decodeURIComponent(match[i + 1]);
          });
        }

        if (this._middlewares.length > 0) {
          for (const mw of this._middlewares) {
            try { await mw({ ruta, rutaConfig, params }); } catch (e) { console.warn('[Router] Middleware:', e); }
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
        // usuario ya navegó a otra, pisándola).
        if (token !== this._ejecucionToken || this._rutaActual() !== ruta) return;

        const raiz = document.getElementById('app-root');
        if (!raiz) return;

        if (!this._primeraCarga && this._transiciones) {
          raiz.classList.add('app-transicion-salida');
          await new Promise(r => setTimeout(r, 150));
          raiz.classList.remove('app-transicion-salida');
        }

        raiz.innerHTML = '';
        this._vistaActual = config.vista;

        if (this._vistaActual && this._vistaActual.montar) {
          try {
            await this._vistaActual.montar(raiz, params);
          } catch (e) {
            console.error(`[Router] Error montando vista ${rutaConfig}:`, e);
            raiz.innerHTML = `<div class="o-contenedor u-mt-4 u-texto-centrado o-pila">
              <h2>Error al cargar</h2>
              <p class="u-color-texto-secundario u-fs-sm">${e.message || 'Ocurrió un error inesperado.'}</p>
              <button class="btn-primario" onclick="location.reload()">Reintentar</button>
            </div>`;
          }
          // Una vista async puede terminar de escribir su HTML DESPUÉS de que
          // el usuario ya navegó a otra (carrera de monturas). Si eso ocurre,
          // re-ejecutar el router para que la vista actual vuelva a mostrarse.
          if (token !== this._ejecucionToken || this._rutaActual() !== ruta) {
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

        this._primeraCarga = false;
        store.actualizar('rutaActual', ruta);
        window.eventBus.publicar('route:change', { ruta, rutaConfig, params });

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

window.router = new Router();
