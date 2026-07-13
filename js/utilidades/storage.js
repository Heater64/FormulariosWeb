(function() {
  'use strict';

  // Capa de persistencia local con IndexedDB. Se usa para la cola de
  // sincronización offline (cap. 5 del documento técnico): las operaciones
  // de escritura que no pueden enviarse a Supabase por falta de red se guardan
  // aquí y se reintentan cuando vuelve la conexión.
  const DB_NOMBRE = 'formsbiblicos';
  const DB_VERSION = 1;
  const STORE = 'cola_sincronizacion';
  let dbPromesa = null;

  function abrir() {
    if (dbPromesa) return dbPromesa;
    dbPromesa = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB no disponible')); return; }
      const req = indexedDB.open(DB_NOMBRE, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromesa;
  }

  async function obtenerStore(modo) {
    const db = await abrir();
    return db.transaction(STORE, modo).objectStore(STORE);
  }

  window.almacenamiento = {
    async guardar(op) {
      try {
        const store = await obtenerStore('readwrite');
        return await new Promise((res, rej) => {
          const r = store.put(op);
          r.onsuccess = () => res(true);
          r.onerror = () => rej(r.error);
        });
      } catch (e) { return false; }
    },
    async listar() {
      try {
        const store = await obtenerStore('readonly');
        return await new Promise((res, rej) => {
          const r = store.getAll();
          r.onsuccess = () => res(r.result || []);
          r.onerror = () => rej(r.error);
        });
      } catch (e) { return []; }
    },
    async eliminar(id) {
      try {
        const store = await obtenerStore('readwrite');
        return await new Promise((res) => {
          const r = store.delete(id);
          r.onsuccess = () => res(true);
          r.onerror = () => res(false);
        });
      } catch (e) { return false; }
    }
  };
})();
