(function() {
  'use strict';

  window.helpers = {
    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    // Hash SHA-256 en hex (coincide con el esquema de la base de datos).
    // Usa Web Crypto cuando está disponible y cae a una implementación
    // pura en JS para contextos sin crypto.subtle.
    async hashPassword(texto) {
      const str = String(texto == null ? '' : texto);
      try {
        if (window.crypto && window.crypto.subtle && window.TextEncoder) {
          const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
          return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
      } catch (e) { /* continúa con el fallback */ }
      return this._sha256Fallback(str);
    },

    _sha256Fallback(texto) {
      const k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
      const msg = new TextEncoder().encode(texto);
      const bitLenHi = Math.floor(msg.length / 0x20000000);
      const bitLenLo = (msg.length << 3) >>> 0;
      const padded = new Uint8Array(((msg.length + 8 + 63) >> 6) << 6);
      padded.set(msg);
      padded[msg.length] = 0x80;
      const dv = new DataView(padded.buffer);
      dv.setUint32(padded.length - 8, bitLenHi);
      dv.setUint32(padded.length - 4, bitLenLo);
      let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
      const w = new Uint32Array(64);
      for (let i = 0; i < padded.length; i += 64) {
        for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4);
        for (let j = 16; j < 64; j++) {
          const s0 = ((w[j-15]>>>7)|(w[j-15]<<25)) ^ ((w[j-15]>>>18)|(w[j-15]<<14)) ^ (w[j-15]>>>3);
          const s1 = ((w[j-2]>>>17)|(w[j-2]<<15)) ^ ((w[j-2]>>>19)|(w[j-2]<<13)) ^ (w[j-2]>>>10);
          w[j] = (w[j-16] + s0 + w[j-7] + s1) >>> 0;
        }
        let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,hh=h7;
        for (let j = 0; j < 64; j++) {
          const S1 = ((e>>>6)|(e<<26)) ^ ((e>>>11)|(e<<21)) ^ ((e>>>25)|(e<<7));
          const ch = (e & f) ^ (~e & g);
          const t1 = (hh + S1 + ch + k[j] + w[j]) >>> 0;
          const S0 = ((a>>>2)|(a<<30)) ^ ((a>>>13)|(a<<19)) ^ ((a>>>22)|(a<<10));
          const maj = (a & b) ^ (a & c) ^ (b & c);
          const t2 = (S0 + maj) >>> 0;
          hh=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
        }
        h0=(h0+a)>>>0; h1=(h1+b)>>>0; h2=(h2+c)>>>0; h3=(h3+d)>>>0;
        h4=(h4+e)>>>0; h5=(h5+f)>>>0; h6=(h6+g)>>>0; h7=(h7+hh)>>>0;
      }
      return [h0,h1,h2,h3,h4,h5,h6,h7].map(x => x.toString(16).padStart(8,'0')).join('');
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
    mostrarGuia(titulo, texto, ejemplo, extra) {
      const overlay = document.createElement('div');
      overlay.className = 'guia-overlay';
        overlay.innerHTML = `
          <div class="guia-popup anim-menu" role="dialog" aria-modal="true">
            <h3 class="guia-popup__titulo">${window.Iconos ? window.Iconos.render('info') : 'ℹ️'} ${window.helpers.escapeHtml(titulo)}</h3>
          <p class="guia-popup__texto">${window.helpers.escapeHtml(texto)}</p>
          ${extra ? `<div class="guia-popup__stats">${extra}</div>` : ''}
          ${ejemplo ? `<p class="guia-popup__ejemplo">${window.Iconos?.render('lightbulb') || '💡'} ${window.helpers.escapeHtml(ejemplo)}</p>` : ''}
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
          window.helpers.mostrarGuia(guia[0], guia[1], guia[2], guia[3]);
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
