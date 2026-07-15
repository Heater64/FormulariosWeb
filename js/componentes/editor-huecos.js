(function() {
  'use strict';
  const MARCADOR_RE = /\{\{HUECO_(\d+)\}\}/g;
  function escaparRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function textoPlanoConMarcadores(nodo) {
    let resultado = '';
    for (const hijo of nodo.childNodes) {
      if (hijo.nodeType === 3) {
        resultado += hijo.textContent;
      } else if (hijo.nodeType === 1) {
        if (hijo.classList && hijo.classList.contains('editor-hueco__marcador')) {
          const id = hijo.dataset.huecoId;
          resultado += '{{HUECO_' + id + '}}';
        } else {
          resultado += textoPlanoConMarcadores(hijo);
        }
      }
    }
    return resultado;
  }
  function renderizarHtmlConHuecos(texto, huecos) {
    if (!texto) return '';
    let html = window.helpers.escapeHtml(texto);
    for (const h of huecos) {
      const marcador = '{{HUECO_' + h.id + '}}';
      const escaped = escaparRegex(marcador).replace(/\\\{/g, '{').replace(/\\\}/g, '}').replace(/\\_/g, '_');
      const idx = html.indexOf(marcador);
      if (idx !== -1) {
        const antes = html.substring(0, idx);
        const despues = html.substring(idx + marcador.length);
        html = antes + '<span class="editor-hueco__marcador" data-hueco-id="' + h.id + '" contenteditable="false">' + (h.respuesta_correcta || '…') + '</span>' + despues;
      }
    }
    return html;
  }
  function siguienteId(huecos) {
    if (!huecos.length) return 1;
    return Math.max(...huecos.map(h => h.id)) + 1;
  }
  window.editorHuecos = {
    montar(container, opciones) {
      const estado = {
        texto: opciones.texto || '',
        huecos: Array.isArray(opciones.huecos) ? opciones.huecos.map(h => ({ ...h, variantes: h.variantes || [] })) : [],
        onChange: opciones.onChange || (() => {})
      };
      container.innerHTML = `
        <div class="editor-hueco">
          <div class="editor-hueco__zona-texto">
            <div class="editor-hueco__escritorio" contenteditable="true" data-placeholder="Escribe la pregunta y selecciona palabras para convertirlas en huecos…">${renderizarHtmlConHuecos(estado.texto, estado.huecos)}</div>
            <div class="editor-hueco__btn-flotante" style="display:none">${window.Iconos.render('eye-off')} Convertir en hueco</div>
          </div>
          <div class="editor-hueco__lista" id="listaHuecos"></div>
        </div>`;
      const escritorio = container.querySelector('.editor-hueco__escritorio');
      const btnFlotante = container.querySelector('.editor-hueco__btn-flotante');
      const listaEl = container.querySelector('#listaHuecos');
      const _sincronizar = () => {
        estado.texto = textoPlanoConMarcadores(escritorio);
        estado.onChange({ texto: estado.texto, huecos: estado.huecos });
      };
      const _renderLista = () => {
        if (!estado.huecos.length) { listaEl.innerHTML = ''; return; }
        listaEl.innerHTML = estado.huecos.map((h, i) => `
          <div class="editor-hueco__item" data-hid="${h.id}">
            <div class="editor-hueco__item-header">
              <span class="editor-hueco__item-num">Hueco ${i + 1}</span>
              <button class="editor-hueco__item-eliminar" data-hid="${h.id}" title="Eliminar hueco">${window.Iconos.render('trash-2')}</button>
            </div>
            <label class="editor-hueco__label">Respuesta correcta
              <input type="text" class="editor-hueco__input" data-hid="${h.id}" data-campo="respuesta_correcta" value="${window.helpers.escapeHtml(h.respuesta_correcta)}" placeholder="Ej: mundo">
            </label>
            <div class="editor-hueco__variantes">
              <span class="editor-hueco__label">Variantes válidas</span>
              <div class="editor-hueco__variantes-lista" data-hid="${h.id}">
                ${(h.variantes || []).map((v, vi) => `
                  <span class="editor-hueco__variante-chip">
                    <input type="text" class="editor-hueco__variante-input" data-hid="${h.id}" data-vidx="${vi}" value="${window.helpers.escapeHtml(v)}">
                    <button class="editor-hueco__variante-eliminar" data-hid="${h.id}" data-vidx="${vi}">${window.Iconos.render('x')}</button>
                  </span>
                `).join('')}
                <button class="editor-hueco__variante-agregar" data-hid="${h.id}">+ variante</button>
              </div>
            </div>
          </div>
        `).join('');
        listaEl.querySelectorAll('[data-campo="respuesta_correcta"]').forEach(inp => {
          inp.addEventListener('input', () => {
            const hid = parseInt(inp.dataset.hid);
            const h = estado.huecos.find(x => x.id === hid);
            if (h) { h.respuesta_correcta = inp.value; _sincronizar(); _actualizarMarcadores(); }
          });
        });
        listaEl.querySelectorAll('.editor-hueco__variante-input').forEach(inp => {
          inp.addEventListener('input', () => {
            const hid = parseInt(inp.dataset.hid);
            const vidx = parseInt(inp.dataset.vidx);
            const h = estado.huecos.find(x => x.id === hid);
            if (h && h.variantes[vidx] !== undefined) { h.variantes[vidx] = inp.value; _sincronizar(); }
          });
        });
        listaEl.querySelectorAll('.editor-hueco__variante-eliminar').forEach(btn => {
          btn.onclick = () => {
            const hid = parseInt(btn.dataset.hid);
            const vidx = parseInt(btn.dataset.vidx);
            const h = estado.huecos.find(x => x.id === hid);
            if (h) { h.variantes.splice(vidx, 1); _renderLista(); _sincronizar(); }
          };
        });
        listaEl.querySelectorAll('.editor-hueco__variante-agregar').forEach(btn => {
          btn.onclick = () => {
            const hid = parseInt(btn.dataset.hid);
            const h = estado.huecos.find(x => x.id === hid);
            if (h) { h.variantes = h.variantes || []; h.variantes.push(''); _renderLista(); _sincronizar(); }
          };
        });
        listaEl.querySelectorAll('.editor-hueco__item-eliminar').forEach(btn => {
          btn.onclick = () => {
            const hid = parseInt(btn.dataset.hid);
            estado.huecos = estado.huecos.filter(x => x.id !== hid);
            const marcador = '{{HUECO_' + hid + '}}';
            const htmlActual = escritorio.innerHTML;
            const span = escritorio.querySelector('[data-hueco-id="' + hid + '"]');
            if (span) { span.remove(); }
            _renderLista(); _sincronizar();
          };
        });
        window.Iconos?.actualizar?.();
      };
      const _actualizarMarcadores = () => {
        escritorio.querySelectorAll('.editor-hueco__marcador').forEach(span => {
          const hid = parseInt(span.dataset.huecoId);
          const h = estado.huecos.find(x => x.id === hid);
          if (h) span.textContent = h.respuesta_correcta || '…';
        });
      };
      const _obtenerSeleccion = () => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
        const rango = sel.getRangeAt(0);
        if (!escritorio.contains(rango.commonAncestorContainer)) return null;
        const texto = sel.toString().trim();
        if (!texto) return null;
        const yaHueco = rango.startContainer.nodeType === 1 && rango.startContainer.classList && rango.startContainer.classList.contains('editor-hueco__marcador');
        if (yaHueco) return null;
        return { rango, texto };
      };
      const _posicionarBoton = (rango) => {
        const rect = rango.getBoundingClientRect();
        const contRect = escritorio.closest('.editor-hueco__zona-texto').getBoundingClientRect();
        btnFlotante.style.display = 'flex';
        btnFlotante.style.left = (rect.left + rect.width / 2 - contRect.left) + 'px';
        btnFlotante.style.top = (rect.top - contRect.top - 8) + 'px';
        btnFlotante.style.transform = 'translate(-50%, -100%)';
      };
      const _ocultarBoton = () => { btnFlotante.style.display = 'none'; };
      escritorio.addEventListener('mouseup', () => {
        setTimeout(() => {
          const sel = _obtenerSeleccion();
          if (sel) { _posicionarBoton(sel.rango); } else { _ocultarBoton(); }
        }, 10);
      });
      document.addEventListener('selectionchange', () => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !escritorio.contains(sel.anchorNode)) {
          setTimeout(_ocultarBoton, 150);
        }
      });
      btnFlotante.addEventListener('click', () => {
        const sel = _obtenerSeleccion();
        if (!sel) return;
        const textoSeleccionado = sel.texto;
        const hid = siguienteId(estado.huecos);
        estado.huecos.push({ id: hid, respuesta_correcta: textoSeleccionado, variantes: [] });
        sel.rango.deleteContents();
        const span = document.createElement('span');
        span.className = 'editor-hueco__marcador';
        span.dataset.huecoId = hid;
        span.contentEditable = 'false';
        span.textContent = textoSeleccionado;
        sel.rango.insertNode(span);
        const espacio = document.createTextNode('\u00A0');
        span.parentNode.insertBefore(espacio, span.nextSibling);
        sel.rango.setStartAfter(espacio);
        sel.rango.collapse(true);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(sel.rango);
        _ocultarBoton();
        _renderLista();
        _sincronizar();
      });
      escritorio.addEventListener('input', () => {
        const html = textoPlanoConMarcadores(escritorio);
        const idsEnHtml = new Set();
        let m;
        const re = /\{\{HUECO_(\d+)\}\}/g;
        while ((m = re.exec(html)) !== null) idsEnHtml.add(parseInt(m[1]));
        estado.huecos = estado.huecos.filter(h => idsEnHtml.has(h.id));
        estado.texto = html;
        _renderLista();
        _sincronizar();
      });
      _renderLista();
      return {
        obtenerDatos() { return { texto: estado.texto, huecos: estado.huecos }; },
        actualizar(texto, huecos) {
          estado.texto = texto || '';
          estado.huecos = Array.isArray(huecos) ? huecos.map(h => ({ ...h, variantes: h.variantes || [] })) : [];
          escritorio.innerHTML = renderizarHtmlConHuecos(estado.texto, estado.huecos);
          _renderLista();
        }
      };
    }
  };
})();
