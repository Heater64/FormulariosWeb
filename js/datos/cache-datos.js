(function() {
  'use strict';

  // Capa de caché de lectura local (IndexedDB).
  // Guarda las respuestas de Supabase para poder servirlas sin conexión.
  const DB_NOMBRE = 'formsbiblicos';
  const DB_VERSION = 2;
  const STORE = 'cache_datos';
  let dbPromesa = null;

  function abrir() {
    if (dbPromesa) return dbPromesa;
    dbPromesa = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB no disponible')); return; }
      const req = indexedDB.open(DB_NOMBRE, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'clave' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromesa;
  }

  async function tx(modo) {
    const db = await abrir();
    return db.transaction(STORE, modo).objectStore(STORE);
  }

  window.cacheDatos = {
    async set(clave, valor, ttl = 1000 * 60 * 60 * 24) {
      try {
        const store = await tx('readwrite');
        return await new Promise((res, rej) => {
          const r = store.put({ clave, valor, ts: Date.now(), ttl });
          r.onsuccess = () => res(true);
          r.onerror = () => rej(r.error);
        });
      } catch (e) { return false; }
    },

    async get(clave) {
      try {
        const store = await tx('readonly');
        return await new Promise((res, rej) => {
          const r = store.get(clave);
          r.onsuccess = () => {
            const item = r.result;
            if (!item) return res(null);
            if (item.ttl && Date.now() - item.ts > item.ttl) return res(null);
            res(item.valor);
          };
          r.onerror = () => rej(r.error);
        });
      } catch (e) { return null; }
    },

    async list(prefix) {
      try {
        const store = await tx('readonly');
        return await new Promise((res, rej) => {
          const out = [];
          const cur = store.openCursor();
          cur.onsuccess = () => {
            const c = cur.result;
            if (!c) return res(out);
            if (!prefix || c.key.startsWith(prefix)) out.push(c.value);
            c.continue();
          };
          cur.onerror = () => rej(cur.error);
        });
      } catch (e) { return []; }
    },

    // Lee de caché; si no hay, ejecuta fnRed y guarda el resultado.
    async leerOCachear(clave, fnRed, ttl) {
      if (navigator.onLine && window.supabaseClient) {
        try {
          const fresco = await fnRed();
          await this.set(clave, fresco, ttl);
          return fresco;
        } catch (e) {
          const cache = await this.get(clave);
          if (cache) return cache;
          throw e;
        }
      }
      const cache = await this.get(clave);
      if (cache !== null) return cache;
      if (navigator.onLine && window.supabaseClient) {
        const fresco = await fnRed();
        await this.set(clave, fresco, ttl);
        return fresco;
      }
      return null;
    },

    // Limpiar toda la caché: Service Worker caches + IndexedDB + localStorage temporal
    async limpiarTodo() {
      // 1. Borrar todas las caches del Service Worker
      if ('caches' in window) {
        try {
          const names = await caches.keys();
          await Promise.all(names.filter(n => n.startsWith('formsbiblicos')).map(n => caches.delete(n)));
        } catch (e) {}
      }
      // 2. Borrar la IndexedDB de caché de datos
      try {
        indexedDB.deleteDatabase(DB_NOMBRE);
      } catch (e) {}
      // 3. Resetear la promesa de BD para que se vuelva a abrir
      dbPromesa = null;
      // 4. Limpiar claves temporales de localStorage (mantener sesión y preferencias)
      try {
        const clavesPreservar = new Set(['fb_usuario', 'fb_recordar_sesion', 'fb_setup_completado', 'fb_examenes_vistos']);
        const clavesBorrar = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('fb_') && !clavesPreservar.has(k)) clavesBorrar.push(k);
        }
        clavesBorrar.forEach(k => localStorage.removeItem(k));
      } catch (e) {}
    }
  };
})();
