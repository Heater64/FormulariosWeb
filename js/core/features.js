(function () {
  'use strict';

  // Runtime de banderas de función (AGENTS.md §«Regla principal»).
  // La fuente de verdad es la tabla public.funciones; el cliente solo pide
  // la RPC fb_funciones(), que devuelve {clave, activa} por permisos del
  // usuario actual (el owner recibe true sin consultar su rol aquí).
  //
  // Contrato:
  //   await window.features.cargar()   → rellena el mapa en memoria
  //   window.features.activa('clave')  → false si no está cargada o la RPC falló
  //
  // Nunca lanza: si no hay red, sesión o la RPC falla, todas las funciones
  // valen false y no se muestra ninguna sección a medias.

  const mapa = new Map();
  let cargado = false;

  const features = {
    async cargar() {
      mapa.clear();
      cargado = false;
      try {
        const sb = window.supabaseClient;
        if (!sb) return false;
        const { data, error } = await sb.rpc('fb_funciones');
        if (error) throw error;
        for (const fila of data || []) {
          if (fila && fila.clave) mapa.set(fila.clave, !!fila.activa);
        }
        cargado = true;
        return true;
      } catch (e) {
        // Sin conexión o RPC caída: todo oculto. Se registra para diagnóstico
        // sin ensuciar la consola del usuario con trazas.
        if (window.console && console.debug) {
          console.debug('[features] no se pudieron cargar las banderas:', e && e.message);
        }
        mapa.clear();
        cargado = false;
        return false;
      }
    },

    activa(clave) {
      if (!cargado || !clave) return false;
      return mapa.get(clave) === true;
    },

    /** Solo para pruebas/diagnóstico: estado completo del mapa. */
    _estado() {
      return { cargado, mapa: Object.fromEntries(mapa) };
    }
  };

  window.features = features;
})();
