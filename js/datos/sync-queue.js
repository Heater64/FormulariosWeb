(function() {
  'use strict';

  const DB_NAME = 'formsbiblicos-sync';
  const DB_VERSION = 3;
  const STORE_NAME = 'cola-sync';
  const MAX_REINTENTOS = 10;
  const BACKOFF_BASE = 1000;
  const BACKOFF_MAX = 60000;
  const BATCH_SIZE = 10;
  const PENDIENTE = 1;
  const COMPLETADA = 0;

  let _db = null;
  let _inicializado = false;
  let _procesando = false;

  function generarId() {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 10);
    const counter = (generarId._counter = (generarId._counter || 0) + 1).toString(36);
    return `${ts}-${rand}-${counter}`;
  }

  function abrirDB() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('pendiente', ['pendiente', 'prioridad']);
          store.createIndex('tabla', 'tabla');
          store.createIndex('creado', 'creado');
        } else if (ev.oldVersion < 3) {
          const store = ev.target.transaction.objectStore(STORE_NAME);
          if (store.indexNames.contains('pendiente')) {
            store.deleteIndex('pendiente');
          }
          store.createIndex('pendiente', ['pendiente', 'prioridad']);
          store.openCursor().onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              const data = cursor.value;
              if (typeof data.pendiente === 'boolean') {
                data.pendiente = data.pendiente ? PENDIENTE : COMPLETADA;
                cursor.update(data);
              }
              cursor.continue();
            }
          };
        }
      };
      req.onsuccess = (ev) => {
        _db = ev.target.result;
        _db.onclose = () => { _db = null; };
        _db.onerror = () => { _db = null; };
        resolve(_db);
      };
      req.onerror = () => reject(new Error('No se pudo abrir IndexedDB'));
    });
  }

  async function conStore(modo, fn) {
    const db = await abrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, modo);
      const store = tx.objectStore(STORE_NAME);
      let resultado;
      try {
        resultado = fn(store);
      } catch (e) {
        reject(e);
        return;
      }
      tx.oncomplete = () => resolve(resultado);
      tx.onerror = () => reject(tx.error);
    });
  }

  const ETIQUETAS = {
    notas_capitulo: 'Notas',
    intentos_examen: 'Exámenes',
    memorizacion: 'Memorización',
    progreso_lectura: 'Progreso',
    tarjetas_memorizacion: 'Memorización',
    respuestas_examen: 'Exámenes'
  };

  function categoriaDe(tabla) {
    return ETIQUETAS[tabla] || tabla;
  }

  async function despachar(op) {
    const cliente = window.supabaseClient;
    if (!cliente) throw new Error('Cliente Supabase no disponible');

    switch (op.tipo) {
      case 'upsert':
        await cliente.from(op.tabla).upsert(op.datos, op.opts || {});
        break;
      case 'insert':
        await cliente.from(op.tabla).insert(op.datos);
        break;
      case 'update':
        await cliente.from(op.tabla).update(op.datos).eq('id', op.id);
        break;
      case 'delete':
        await cliente.from(op.tabla).delete().eq('id', op.id);
        break;
      default:
        throw new Error(`Tipo de operación desconocido: ${op.tipo}`);
    }
  }

  function calcularBackoff(reintentos) {
    return Math.min(BACKOFF_BASE * Math.pow(2, reintentos), BACKOFF_MAX);
  }

  async function sincronizar() {
    if (_procesando) return;
    if (!navigator.onLine) return;
    if (!window.supabaseClient) return;

    _procesando = true;
    store.actualizar('sincronizando', true);

    try {
      const ops = await listarPendientes();

      if (!ops.length) {
        store.actualizar('sincronizando', false);
        store.actualizar('ultimaSincronizacion', Date.now());
        window.eventBus.publicar('sincronizacion:fin', { pendientes: 0 });
        _procesando = false;
        return;
      }

      const totalInicial = ops.length;
      window.eventBus.publicar('sincronizacion:inicio', { total: totalInicial });

      const hechas = {};
      const categorias = [...new Set(ops.map(o => categoriaDe(o.tabla)))];
      const pendientes = [...ops];

      while (pendientes.length > 0) {
        const lote = pendientes.splice(0, BATCH_SIZE);
        const resultados = await Promise.allSettled(
          lote.map(op => ejecutarOp(op, hechas, categorias))
        );

        for (let i = 0; i < resultados.length; i++) {
          const r = resultados[i];
          if (r.status === 'rejected') {
            pendientes.push(lote[i]);
          }
        }

        const restantes = await contarPendientes();
        window.eventBus.publicar('sincronizacion:progreso', {
          completadas: totalInicial - restantes,
          total: totalInicial,
          categorias
        });
      }

      const finales = await contarPendientes();
      window.eventBus.publicar('sincronizacion:fin', { pendientes: finales, completadas: hechas });
      store.actualizar('ultimaSincronizacion', Date.now());
    } catch (e) {
      console.warn('[SyncQueue] Error en sincronización:', e);
    } finally {
      _procesando = false;
      store.actualizar('sincronizando', false);
    }
  }

  async function ejecutarOp(op, hechas, categorias) {
    try {
      await despachar(op);
      await eliminar(op.id);
      const cat = categoriaDe(op.tabla);
      hechas[cat] = (hechas[cat] || 0) + 1;
      window.eventBus.publicar('sincronizacion:item-completado', {
        id: op.id,
        tabla: op.tabla,
        categoria: cat
      });
    } catch (e) {
      op.reintentos = (op.reintentos || 0) + 1;
      if (op.reintentos <= MAX_REINTENTOS) {
        op.siguienteIntento = Date.now() + calcularBackoff(op.reintentos - 1);
        await actualizar(op);
        console.warn(`[SyncQueue] Reintento ${op.reintentos}/${MAX_REINTENTOS} para ${op.id}:`, e.message);
      } else {
        await eliminar(op.id);
        window.eventBus.publicar('sincronizacion:fallo-permanente', {
          id: op.id,
          tabla: op.tabla,
          error: e.message
        });
      }
      throw e;
    }
  }

  function listarPendientes() {
    return conStore('readonly', (store) => {
      const idx = store.index('pendiente');
      const range = IDBKeyRange.lowerBound([PENDIENTE, 0]);
      return new Promise((resolve, reject) => {
        const resultados = [];
        const req = idx.openCursor(range, 'next');
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
  }

  function contarPendientes() {
    return conStore('readonly', (store) => {
      const idx = store.index('pendiente');
      const range = IDBKeyRange.lowerBound([PENDIENTE, 0]);
      return new Promise((resolve, reject) => {
        let count = 0;
        const req = idx.openCursor(range);
        req.onsuccess = (ev) => {
          const cursor = ev.target.result;
          if (cursor) {
            count++;
            cursor.continue();
          } else {
            resolve(count);
          }
        };
        req.onerror = () => reject(req.error);
      });
    });
  }

  function guardar(op) {
    return conStore('readwrite', (store) => {
      const opCompleta = {
        ...op,
        pendiente: PENDIENTE,
        prioridad: op.prioridad || 0,
        creado: op.creado || Date.now(),
        reintentos: 0,
        siguienteIntento: 0
      };
      store.put(opCompleta);
      return opCompleta;
    });
  }

  function actualizar(op) {
    return conStore('readwrite', (store) => {
      store.put(op);
    });
  }

  function eliminar(id) {
    return conStore('readwrite', (store) => {
      store.delete(id);
    });
  }

  function limpiarCompletadas() {
    return conStore('readwrite', (store) => {
      const idx = store.index('pendiente');
      const range = IDBKeyRange.only([COMPLETADA, 0]);
      return new Promise((resolve, reject) => {
        const req = idx.openCursor(range);
        req.onsuccess = (ev) => {
          const cursor = ev.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        req.onerror = () => reject(req.error);
      });
    });
  }

  function iniciar() {
    if (_inicializado) return;
    _inicializado = true;

    window.addEventListener('online', () => {
      store.actualizar('online', true);
      sincronizar();
    });

    window.addEventListener('offline', () => {
      store.actualizar('online', false);
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => sincronizar());
    } else {
      sincronizar();
    }

    setInterval(() => {
      if (navigator.onLine) sincronizar();
    }, 30000);
  }

  window.colaSync = {
    async encolar(tipo, tabla, datos, opts) {
      const op = {
        id: generarId(),
        tipo,
        tabla,
        datos,
        opts: opts || {},
        creado: Date.now(),
        prioridad: opts?.prioridad || 0
      };

      await guardar(op);

      const pendientes = await contarPendientes();
      window.eventBus.publicar('sincronizacion:estado', { pendientes });

      if (navigator.onLine && window.supabaseClient) {
        sincronizar();
      }

      return op.id;
    },

    async eliminarOp(id) {
      await eliminar(id);
    },

    sincronizar,
    iniciar,
    contarPendientes,
    limpiarCompletadas,

    async obtenerEstado() {
      try {
        const db = await abrirDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const count = await new Promise((resolve, reject) => {
          const req = store.count();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        return { pendientes: count, online: navigator.onLine, procesando: _procesando };
      } catch {
        return { pendientes: 0, online: navigator.onLine, procesando: _procesando };
      }
    }
  };
})();
