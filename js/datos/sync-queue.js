(function() {
  'use strict';

  // Cola de sincronización offline (Optimistic UI + cola de reintento).
  // Las escrituras optimistas se aplican en la UI de inmediato y se envían a
  // Supabase; si fallan (sin red, sesión caída), se encolan en IndexedDB y se
  // reintentan automáticamente al volver la conexión o al iniciar la app.
  const sb = () => window.supabaseClient;

  function generarId() {
    return 'op_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  // Mapea tablas a etiquetas amigables para el checklist de sincronización.
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
    const cliente = sb();
    if (!cliente) throw new Error('No se ha podido conectar con el servidor.');
    if (op.tipo === 'upsert') {
      await cliente.from(op.tabla).upsert(op.datos, op.opts || {});
    } else if (op.tipo === 'insert') {
      await cliente.from(op.tabla).insert(op.datos);
    } else if (op.tipo === 'update') {
      await cliente.from(op.tabla).update(op.datos).eq('id', op.id);
    } else if (op.tipo === 'delete') {
      await cliente.from(op.tabla).delete().eq('id', op.id);
    } else {
      throw new Error('Tipo de operación desconocido: ' + op.tipo);
    }
  }

  async function sincronizar() {
    if (!sb() || !navigator.onLine) return;
    let ops = [];
    try { ops = await window.almacenamiento.listar(); } catch (e) { ops = []; }
    if (!ops.length) { emitir(0, {}); return; }

    window.eventBus.publicar('sincronizacion:inicio', { total: ops.length });
    const hechas = {};
    const categorias = [...new Set(ops.map(o => categoriaDe(o.tabla)))];

    for (const op of ops) {
      const cat = categoriaDe(op.tabla);
      try {
        await despachar(op);
        await window.almacenamiento.eliminar(op.id);
        hechas[cat] = (hechas[cat] || 0) + 1;
        window.eventBus.publicar('sincronizacion:progreso', {
          categoria: cat,
          completadas: hechas,
          categorias
        });
      } catch (e) {
        // Mantener en cola para reintentar más tarde.
      }
    }
    const restantes = (await window.almacenamiento.listar()).length;
    emitir(restantes, hechas);
    window.eventBus.publicar('sincronizacion:fin', { pendientes: restantes, completadas: hechas });
  }

  let indicador = null;
  function emitir(pendientes, hechas) {
    window.eventBus.publicar('sincronizacion:estado', { pendientes, hechas });
    mostrarIndicador(pendientes);
  }

  function mostrarIndicador(pendientes) {
    if (!indicador) {
      indicador = document.getElementById('fb-sync');
      if (!indicador) {
        indicador = document.createElement('div');
        indicador.id = 'fb-sync';
        indicador.className = 'fb-sync u-oculto';
        document.body.appendChild(indicador);
      }
    }
    if (pendientes > 0) {
      indicador.classList.remove('u-oculto');
      indicador.textContent = '⏳ ' + pendientes + ' por sincronizar';
      indicador.classList.add('fb-sync--pendiente');
    } else {
      indicador.textContent = '✔ Sincronizado';
      indicador.classList.remove('fb-sync--pendiente');
      setTimeout(() => { if (indicador) indicador.classList.add('u-oculto'); }, 1500);
    }
  }

  let inicializado = false;

  window.colaSync = {
    async encolar(tipo, tabla, datos, opts) {
      const op = { id: generarId(), tipo, tabla, datos, opts: opts || {}, creado: Date.now() };
      try { await window.almacenamiento.guardar(op); } catch (e) { /* almacenamiento no disponible */ }
      emitir((await window.almacenamiento.listar()).length, {});
      if (navigator.onLine && sb()) sincronizar();
    },
    sincronizar,
    iniciar() {
      if (inicializado) return;
      inicializado = true;
      window.addEventListener('online', () => sincronizar());
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => sincronizar());
      } else {
        sincronizar();
      }
    }
  };
})();
