/* ============================================================================
 * js/datos/borradores-editor.js — persistencia local del editor de exámenes
 * ----------------------------------------------------------------------------
 * localStorage (no IndexedDB) a propósito: la escritura es síncrona y puede
 * completarse dentro de `pagehide`/`beforeunload`, justo el momento en el que
 * una promesa ya no llegaría a terminar si la pestaña se cierra.
 *
 * Formato y reglas en js/dominio/borrador-examen.js. Aquí solo se lee, escribe,
 * migra (de 'nuevo' al id real) y se poda para no crecer sin límite.
 * ==========================================================================*/
(function () {
  'use strict';

  const dominio = () => window.borradorExamen;

  function almacen() {
    try {
      return window.localStorage || null;
    } catch (e) {
      return null;
    }
  }

  function leer(clave) {
    const store = almacen();
    if (!store) return null;
    try {
      const bruto = store.getItem(clave);
      return bruto ? JSON.parse(bruto) : null;
    } catch (e) {
      return null;
    }
  }

  function escribir(clave, valor) {
    const store = almacen();
    if (!store) return false;
    try {
      store.setItem(clave, JSON.stringify(valor));
      return true;
    } catch (e) {
      // Cuota llena o almacenamiento bloqueado: el autoguardado en nube y el
      // aviso de error del editor siguen funcionando.
      return false;
    }
  }

  function borrar(clave) {
    const store = almacen();
    if (!store) return false;
    try {
      store.removeItem(clave);
      return true;
    } catch (e) {
      return false;
    }
  }

  window.borradoresEditor = {
    /** Guarda (o reemplaza) una instantánea. Devuelve false si no se pudo. */
    guardar(borrador) {
      const d = dominio();
      if (!d || !borrador || !borrador.clave) return false;
      const guardado = escribir(borrador.clave, borrador);
      if (guardado) this._podar();
      return guardado;
    },

    obtener(id) {
      const d = dominio();
      if (!d) return null;
      const borrador = leer(d.clave(id));
      return d.instantaneaValida(borrador) ? borrador : null;
    },

    listar() {
      const d = dominio();
      const store = almacen();
      if (!d || !store) return [];
      const salida = [];
      for (let i = 0; i < store.length; i++) {
        const claveActual = store.key(i);
        if (!claveActual || !claveActual.startsWith(d.PREFIJO)) continue;
        const borrador = leer(claveActual);
        if (d.instantaneaValida(borrador)) salida.push(borrador);
      }
      return salida.sort((a, b) => String(b.guardadoEn || '').localeCompare(String(a.guardadoEn || '')));
    },

    /** Solo los que tienen cambios sin sincronizar y contenido real. */
    listarPendientes() {
      const d = dominio();
      if (!d) return [];
      return this.listar().filter((borrador) => d.necesitaRestauracion(borrador));
    },

    eliminar(id) {
      const d = dominio();
      if (!d) return false;
      return borrar(d.clave(id));
    },

    eliminarPorClave(clave) {
      return clave ? borrar(clave) : false;
    },

    /**
     * Un examen nuevo pasa a tener id tras el primer guardado en nube: la
     * clave local se mueve para que la restauración siga encontrándolo.
     */
    migrar(desde, hasta) {
      const d = dominio();
      if (!d || !desde || !hasta || String(desde) === String(hasta)) return false;
      const borrador = this.obtener(desde);
      if (!borrador) return false;
      borrador.examen.id = borrador.examen.id || String(hasta);
      borrador.clave = d.clave(hasta);
      escribir(borrador.clave, borrador);
      this.eliminar(desde);
      return true;
    },

    /** Mantiene como máximo MAX_BORRADORES instantáneas (las más recientes). */
    _podar() {
      const d = dominio();
      if (!d) return;
      const todos = this.listar();
      if (todos.length <= d.MAX_BORRADORES) return;
      todos.slice(d.MAX_BORRADORES).forEach((borrador) => {
        if (borrador.clave) borrar(borrador.clave);
      });
    }
  };
})();
