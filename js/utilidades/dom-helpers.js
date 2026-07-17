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
      if (window.haptica) {
        if (tipo === 'error') window.haptica.error();
        else if (tipo === 'exito') window.haptica.exito();
        else if (tipo === 'advertencia') window.haptica.aviso();
      }
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
        const tituloId = 'modal-titulo-' + Date.now();
        overlay.innerHTML = `
          <div class="modal-confirm" role="dialog" aria-modal="true" aria-labelledby="${tituloId}">
            <h3 class="modal-confirm__titulo" id="${tituloId}">${window.Iconos ? window.Iconos.render('alert-triangle') : '⚠️'} ${window.helpers.escapeHtml(opciones.titulo || '¿Confirmar?')}</h3>
            <p class="modal-confirm__mensaje">${window.helpers.escapeHtml(mensaje)}</p>
            <div class="modal-confirm__acciones">
              <button class="btn-secundario" data-cancelar>${opciones.textoCancelar || 'Cancelar'}</button>
              <button class="btn-peligro" data-confirmar>${opciones.textoConfirmar || 'Confirmar'}</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        const cerrar = (valor) => { document.removeEventListener('keydown', onKey); overlay.remove(); resolve(valor); };
        const onKey = (e) => {
          if (e.key === 'Escape') { e.preventDefault(); cerrar(false); return; }
          if (e.key === 'Tab') {
            const btns = overlay.querySelectorAll('button');
            if (btns.length < 2) return;
            const first = btns[0], last = btns[btns.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
          }
        };
        document.addEventListener('keydown', onKey);
        overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(false); });
        overlay.querySelector('[data-cancelar]').onclick = () => cerrar(false);
        overlay.querySelector('[data-confirmar]').onclick = () => cerrar(true);
        setTimeout(() => overlay.querySelector('[data-cancelar]')?.focus(), 50);
      });
    },
    mostrarGuia(titulo, texto, ejemplo) {
      const overlay = document.createElement('div');
      overlay.className = 'guia-overlay';
        overlay.innerHTML = `
          <div class="guia-popup anim-menu" role="dialog" aria-modal="true">
            <h3 class="guia-popup__titulo">${window.Iconos ? window.Iconos.render('info') : 'ℹ️'} ${window.helpers.escapeHtml(titulo)}</h3>
          <p class="guia-popup__texto">${window.helpers.escapeHtml(texto)}</p>
          ${ejemplo ? `<p class="guia-popup__ejemplo">💡 ${window.helpers.escapeHtml(ejemplo)}</p>` : ''}
          <div class="guia-popup__accion">
            <button class="btn-primario" data-cerrar-guia style="justify-content:center">Entendido</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      if (window.Iconos && window.Iconos.actualizar) window.Iconos.actualizar();
      const cerrar = () => overlay.remove();
      overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });
      overlay.querySelector('[data-cerrar-guia]').onclick = cerrar;
    },
    registrarGuias(raiz, guias) {
      if (!raiz || !guias) return;
      raiz.querySelectorAll('[data-guia]').forEach(btn => {
        const guia = guias[btn.dataset.guia];
        if (!guia) return;
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          window.helpers.mostrarGuia(guia[0], guia[1], guia[2]);
        });
      });
    },
    formulario({ titulo = 'Formulario', mensaje = '', campos = [], textoConfirmar = 'Guardar', textoCancelar = 'Cancelar' } = {}) {
      return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const tituloId = 'modal-form-titulo-' + Date.now();
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
          <div class="modal-formulario" role="dialog" aria-modal="true" aria-labelledby="${tituloId}">
            <h3 class="modal-confirm__titulo" id="${tituloId}">${window.Iconos ? window.Iconos.render('edit-3') : '✎'} ${window.helpers.escapeHtml(titulo)}</h3>
            ${mensaje ? `<p class="modal-confirm__mensaje">${window.helpers.escapeHtml(mensaje)}</p>` : ''}
            <div class="modal-formulario__campos">${camposHtml}</div>
            <div class="modal-confirm__acciones">
              <button class="btn-secundario" data-cancelar>${window.helpers.escapeHtml(textoCancelar)}</button>
              <button class="btn-primario" data-confirmar>${window.helpers.escapeHtml(textoConfirmar)}</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        window.Iconos && window.Iconos.actualizar && window.Iconos.actualizar();
        const cerrar = (val) => { document.removeEventListener('keydown', onKey); overlay.remove(); resolve(val); };
        const onKey = (e) => {
          if (e.key === 'Escape') { e.preventDefault(); cerrar(null); return; }
          if (e.key === 'Tab') {
            const focusables = overlay.querySelectorAll('input, select, textarea, button');
            if (focusables.length < 2) return;
            const first = focusables[0], last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
          }
        };
        document.addEventListener('keydown', onKey);
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
