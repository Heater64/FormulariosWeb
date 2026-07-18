(function() {
  'use strict';

  const DB_NAME = 'formsbiblicos-versiones';
  const DB_VERSION = 1;
  const MAX_VERSIONES = 50;
  const DEBOUNCE_MS = 5000;

  let _db = null;

  function abrirDB() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains('versiones')) {
          const store = db.createObjectStore('versiones', { keyPath: 'id' });
          store.createIndex('notaId', 'notaId', { unique: false });
          store.createIndex('creado', 'creado', { unique: false });
        }
      };
      req.onsuccess = (ev) => {
        _db = ev.target.result;
        resolve(_db);
      };
      req.onerror = () => reject(new Error('No se pudo abrir IndexedDB'));
    });
  }

  async function conStore(modo, fn) {
    const db = await abrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('versiones', modo);
      const store = tx.objectStore('versiones');
      try {
        const r = fn(store);
        tx.oncomplete = () => resolve(r);
        tx.onerror = () => reject(tx.error);
      } catch (e) { reject(e); }
    });
  }

  function generarId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  window.versionHistory = {
    async guardar(notaId, contenido) {
      if (!contenido || contenido === '<p></p>') return;
      await conStore('readwrite', (store) => {
        const version = {
          id: generarId(),
          notaId,
          contenido,
          creado: Date.now(),
        };
        store.put(version);
      });
      // Trim old versions
      const todas = await this.listar(notaId);
      if (todas.length > MAX_VERSIONES) {
        const sobrantes = todas.slice(0, todas.length - MAX_VERSIONES);
        await conStore('readwrite', (store) => {
          sobrantes.forEach(v => store.delete(v.id));
        });
      }
    },

    async listar(notaId) {
      return conStore('readonly', (store) => {
        const idx = store.index('notaId');
        const range = IDBKeyRange.only(notaId);
        return new Promise((resolve, reject) => {
          const resultados = [];
          const req = idx.openCursor(range, 'prev');
          req.onsuccess = (ev) => {
            const cursor = ev.target.result;
            if (cursor) {
              resultados.push(cursor.value);
              cursor.continue();
            } else {
              resolve(resultados);
            }
          };
          req.onerror = () => reject(req.error);
        });
      });
    },

    async obtener(id) {
      return conStore('readonly', (store) => {
        return new Promise((resolve, reject) => {
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      });
    },

    async eliminar(notaIds) {
      const ids = Array.isArray(notaIds) ? notaIds : [notaIds];
      await conStore('readwrite', async (store) => {
        for (const id of ids) {
          const todas = await this.listar(id);
          await conStore('readwrite', (s) => {
            todas.forEach(v => s.delete(v.id));
          });
        }
      });
    },

    iniciarAutoSave(notaId, obtenerHtml, onVersion) {
      let timer = null;
      let ultimo = '';

      const guardarVersion = async () => {
        const html = typeof obtenerHtml === 'function' ? obtenerHtml() : '';
        if (html && html !== ultimo) {
          ultimo = html;
          await this.guardar(notaId, html);
          if (onVersion) onVersion();
        }
      };

      const handler = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(guardarVersion, DEBOUNCE_MS);
      };

      return {
        trigger: handler,
        detener: () => { if (timer) clearTimeout(timer); },
        guardarAhora: guardarVersion,
      };
    },
  };
})();
