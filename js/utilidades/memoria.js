(function () {
  'use strict';

  /* Registro de timers/intervals/observers por vista para liberar al desmontar.
     Uso: window.memoria.seguir(estaVista) devuelve un gestor; o usar las funciones globales. */

  const _gestores = new WeakMap();

  function crearGestor() {
    const timers = new Set();
    const observers = new Set();
    const gestor = {
      _cancelado: false,
      timeout(fn, ms) {
        const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
        timers.add(id);
        return id;
      },
      interval(fn, ms) {
        const id = setInterval(fn, ms);
        timers.add(id);
        return id;
      },
      raf(fn) {
        const id = requestAnimationFrame(() => { timers.delete(id); fn(); });
        timers.add(id);
        return id;
      },
      observer(obs) {
        observers.add(obs);
        return obs;
      },
      limpiar() {
        this._cancelado = true;
        timers.forEach((id) => { clearTimeout(id); clearInterval(id); });
        timers.clear();
        observers.forEach((o) => { try { o.disconnect(); } catch (e) {} });
        observers.clear();
      }
    };
    return gestor;
  }

  function seguir(obj) {
    let g = _gestores.get(obj);
    if (!g) { g = crearGestor(); _gestores.set(obj, g); }
    return g;
  }

  function liberar(obj) {
    const g = _gestores.get(obj);
    if (g) { g.limpiar(); _gestores.delete(obj); }
  }

  /* Render por lotes (chunked) para listas enormes sin bloquear el hilo principal.
     items: array; renderItem: (item, index) => HTMLElement; contenedor: nodo;
     porLote: número de nodos por frame (default 24); gestor: opcional para cancelar. */
  function renderPorLotes(contenedor, items, renderItem, porLote, gestor) {
    porLote = porLote || 24;
    contenedor.innerHTML = '';
    let i = 0;
    function lote() {
      if (gestor && gestor._cancelado) return;
      const fin = Math.min(i + porLote, items.length);
      const frag = document.createDocumentFragment();
      for (; i < fin; i++) {
        const el = renderItem(items[i], i);
        if (el) frag.appendChild(el);
      }
      contenedor.appendChild(frag);
      if (i < items.length) {
        if (gestor) gestor.raf(lote); else requestAnimationFrame(lote);
      }
    }
    lote();
  }

  /* Igual que renderPorLotes pero el callback devuelve HTML string (append progresivo) */
  function renderPorLotesHtml(contenedor, items, renderHtml, porLote, gestor) {
    porLote = porLote || 24;
    contenedor.innerHTML = '';
    let i = 0;
    function lote() {
      if (gestor && gestor._cancelado) return;
      const fin = Math.min(i + porLote, items.length);
      let html = '';
      for (; i < fin; i++) html += renderHtml(items[i], i);
      contenedor.insertAdjacentHTML('beforeend', html);
      if (i < items.length) {
        if (gestor) gestor.raf(lote); else requestAnimationFrame(lote);
      }
    }
    lote();
  }

  window.memoria = { seguir, liberar, renderPorLotes, renderPorLotesHtml, crearGestor };
})();
