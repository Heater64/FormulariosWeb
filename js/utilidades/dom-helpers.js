(function() {
  'use strict';

  window.helpers = {
    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    formatearFecha(iso) {
      if (!iso) return '';
      return new Date(iso).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    },

    generarUUID() {
      return crypto.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
    },

    delegar(contenedor, selector, evento, handler) {
      contenedor.addEventListener(evento, e => {
        const el = e.target.closest(selector);
        if (el && contenedor.contains(el)) handler(e, el);
      });
    },

    $ (selector, ctx) { return (ctx || document).querySelector(selector); },
    $$ (selector, ctx) { return Array.from((ctx || document).querySelectorAll(selector)); },

    descargarCSV(nombreArchivo, cabeceras, filas) {
      const escapar = (v) => {
        const s = String(v == null ? '' : v);
        return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const lineas = [cabeceras.map(escapar).join(',')];
      filas.forEach(f => lineas.push(cabeceras.map(c => escapar(f[c])).join(',')));
      const contenido = '﻿' + lineas.join('\r\n');
      const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : nombreArchivo + '.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    descargarTexto(nombreArchivo, texto) {
      const blob = new Blob([texto], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo.endsWith('.txt') ? nombreArchivo : nombreArchivo + '.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    nombreAlumno(perfil) {
      if (!perfil) return 'Alumno';
      return perfil.nombre_completo || perfil.username || 'Alumno';
    },

    mostrarAlerta(mensaje, tipo = 'info', duracion = 4000) {
      let cont = document.getElementById('contenedorAlertas');
      if (!cont) {
        cont = document.createElement('div');
        cont.id = 'contenedorAlertas';
        document.body.appendChild(cont);
      }
      const el = document.createElement('div');
      el.className = 'alerta alerta--' + tipo;
      el.setAttribute('role', 'alert');
      el.textContent = mensaje;
      el.addEventListener('click', () => {
        el.classList.add('alerta--salir');
        setTimeout(() => el.remove(), 300);
      });
      cont.appendChild(el);
      if (duracion) {
        setTimeout(() => {
          el.classList.add('alerta--salir');
          setTimeout(() => el.remove(), 300);
        }, duracion);
      }
      return el;
    },

    confirmar(mensaje, opciones = {}) {
      return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
          <div class="modal-confirm" role="dialog" aria-modal="true">
            <h3 class="modal-confirm__titulo">${window.Iconos ? window.Iconos.render('alert-triangle') : '⚠️'} ${window.helpers.escapeHtml(opciones.titulo || '¿Confirmar?')}</h3>
            <p class="modal-confirm__mensaje">${window.helpers.escapeHtml(mensaje)}</p>
            <div class="modal-confirm__acciones">
              <button class="btn-secundario" data-cancelar>${opciones.textoCancelar || 'Cancelar'}</button>
              <button class="btn-peligro" data-confirmar>${opciones.textoConfirmar || 'Confirmar'}</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        const cerrar = (valor) => { overlay.remove(); resolve(valor); };
        overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(false); });
        overlay.querySelector('[data-cancelar]').onclick = () => cerrar(false);
        overlay.querySelector('[data-confirmar]').onclick = () => cerrar(true);
      });
    },
    formulario({ titulo = 'Formulario', mensaje = '', campos = [], textoConfirmar = 'Guardar', textoCancelar = 'Cancelar' } = {}) {
      return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const camposHtml = campos.map((c, i) => {
          let control;
          if (c.tipo === 'textarea') {
            control = `<textarea id="cmp_${i}" rows="${c.filas || 2}" placeholder="${window.helpers.escapeHtml(c.placeholder || '')}">${window.helpers.escapeHtml(c.valor || '')}</textarea>`;
          } else if (c.tipo === 'select') {
            control = `<select id="cmp_${i}">${(c.opciones || []).map(o => `<option value="${window.helpers.escapeHtml(o.valor)}" ${String(o.valor) === String(c.valor) ? 'selected' : ''}>${window.helpers.escapeHtml(o.texto || o.valor)}</option>`).join('')}</select>`;
          } else {
            const tipoInput = c.tipo === 'password' ? 'password' : 'text';
            control = `<input type="${tipoInput}" id="cmp_${i}" value="${window.helpers.escapeHtml(c.valor || '')}" placeholder="${window.helpers.escapeHtml(c.placeholder || '')}">`;
          }
          return `
          <div class="modal-formulario__campo">
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario" for="cmp_${i}">${window.helpers.escapeHtml(c.etiqueta || c.nombre)}</label>
            ${control}
          </div>`;
        }).join('');
        overlay.innerHTML = `
          <div class="modal-formulario" role="dialog" aria-modal="true">
            <h3 class="modal-confirm__titulo">${window.Iconos ? window.Iconos.render('edit-3') : '✎'} ${window.helpers.escapeHtml(titulo)}</h3>
            ${mensaje ? `<p class="modal-confirm__mensaje">${window.helpers.escapeHtml(mensaje)}</p>` : ''}
            <div class="modal-formulario__campos">${camposHtml}</div>
            <div class="modal-confirm__acciones">
              <button class="btn-secundario" data-cancelar>${window.helpers.escapeHtml(textoCancelar)}</button>
              <button class="btn-primario" data-confirmar>${window.helpers.escapeHtml(textoConfirmar)}</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        window.Iconos && window.Iconos.actualizar && window.Iconos.actualizar();
        const cerrar = (val) => { overlay.remove(); resolve(val); };
        overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(null); });
        overlay.querySelector('[data-cancelar]').onclick = () => cerrar(null);
        overlay.querySelector('[data-confirmar]').onclick = () => {
          const valores = {};
          campos.forEach((c, i) => {
            const el = overlay.querySelector('#cmp_' + i);
            valores[c.nombre] = el ? el.value : '';
          });
          const faltan = campos.some(c => c.requerido && !(valores[c.nombre] || '').trim());
          if (faltan) { window.helpers.mostrarAlerta('Completa los campos obligatorios.', 'advertencia'); return; }
          cerrar(valores);
        };
        setTimeout(() => { const p = overlay.querySelector('#cmp_0'); if (p) p.focus(); }, 50);
      });
    }
  };
})();
