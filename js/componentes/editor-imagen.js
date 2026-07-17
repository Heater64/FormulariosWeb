(function () {
  'use strict';

  /* Editor de imagen tipo WhatsApp: mover, zoom, rotar y recortar circular.
     Uso: window.editorImagen.abrir(file, { onConfirm(base64), onCancel() }) */

  const STATE = { escala: 1, tx: 0, ty: 0, rot: 0 };

  function resetState() {
    STATE.escala = 1; STATE.tx = 0; STATE.ty = 0; STATE.rot = 0;
  }

  function abrir(file, opts) {
    opts = opts || {};
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      _montarModal(src, opts);
    };
    reader.onerror = () => { if (opts.onCancel) opts.onCancel(); };
    reader.readAsDataURL(file);
  }

  function _montarModal(src, opts) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay editor-imagen-overlay';
    overlay.innerHTML = `
      <div class="editor-imagen" role="dialog" aria-modal="true" aria-label="Editar foto">
        <div class="editor-imagen__visor" id="edVisor">
          <img id="edImg" class="editor-imagen__img" src="${src}" alt="Previsualización" draggable="false">
        </div>
        <div class="editor-imagen__controles">
          <button class="editor-imagen__btn" id="edRotar" aria-label="Rotar" title="Rotar">${window.Iconos?.render('rotate-cw') || '↻'}</button>
          <input type="range" id="edZoom" class="editor-imagen__zoom" min="1" max="4" step="0.01" value="1" aria-label="Zoom">
          <button class="editor-imagen__btn" id="edZoomMas" aria-label="Acercar">+</button>
        </div>
        <div class="editor-imagen__acciones">
          <button class="btn-secundario" id="edCancelar">Cancelar</button>
          <button class="btn-primario" id="edUsar">Usar foto</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    if (window.Iconos?.actualizar) window.Iconos.actualizar();

    const img = overlay.querySelector('#edImg');
    const visor = overlay.querySelector('#edVisor');
    const zoom = overlay.querySelector('#edZoom');
    const tam = 400;

    function aplicar() {
      img.style.transform =
        `translate(${STATE.tx}px, ${STATE.ty}px) rotate(${STATE.rot}deg) scale(${STATE.escala})`;
    }

    // Zoom con slider
    zoom.addEventListener('input', () => { STATE.escala = parseFloat(zoom.value); aplicar(); });

    overlay.querySelector('#edZoomMas').onclick = () => {
      STATE.escala = Math.min(4, STATE.escala + 0.25);
      zoom.value = String(STATE.escala);
      aplicar();
    };

    overlay.querySelector('#edRotar').onclick = () => {
      STATE.rot = (STATE.rot + 90) % 360;
      aplicar();
    };

    function cerrar() { overlay.remove(); }

    overlay.querySelector('#edCancelar').onclick = () => { cerrar(); if (opts.onCancel) opts.onCancel(); };

    overlay.querySelector('#edUsar').onclick = () => {
      try {
        const out = _recortar(img, STATE, tam);
        cerrar();
        if (opts.onConfirm) opts.onConfirm(out);
      } catch (e) {
        if (opts.onCancel) opts.onCancel();
        cerrar();
      }
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { cerrar(); if (opts.onCancel) opts.onCancel(); }
    });

    // ── Mover (drag mouse) ──
    let arrastrando = false, sx = 0, sy = 0, ox = 0, oy = 0;
    img.addEventListener('mousedown', (e) => {
      arrastrando = true; sx = e.clientX; sy = e.clientY; ox = STATE.tx; oy = STATE.ty;
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!arrastrando) return;
      STATE.tx = ox + (e.clientX - sx);
      STATE.ty = oy + (e.clientY - sy);
      aplicar();
    });
    document.addEventListener('mouseup', () => { arrastrando = false; });

    // ── Touch: mover con un dedo, zoom con dos dedos (pinch) ──
    let tocando = false, tStartX = 0, tStartY = 0, tOx = 0, tOy = 0;
    let pinchIni = 0, escalaIni = 1;

    function dist(a, b) {
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    visor.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        tocando = true;
        tStartX = e.touches[0].clientX; tStartY = e.touches[0].clientY;
        tOx = STATE.tx; tOy = STATE.ty;
      } else if (e.touches.length === 2) {
        tocando = false;
        pinchIni = dist(e.touches[0], e.touches[1]);
        escalaIni = STATE.escala;
      }
    }, { passive: false });

    visor.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && tocando) {
        e.preventDefault();
        STATE.tx = tOx + (e.touches[0].clientX - tStartX);
        STATE.ty = tOy + (e.touches[0].clientY - tStartY);
        aplicar();
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const d = dist(e.touches[0], e.touches[1]);
        if (pinchIni > 0) {
          STATE.escala = Math.min(4, Math.max(1, escalaIni * (d / pinchIni)));
          zoom.value = String(STATE.escala);
          aplicar();
        }
      }
    }, { passive: false });

    visor.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) tocando = false;
      if (e.touches.length < 2) pinchIni = 0;
    });

    // ── Zoom con rueda (desktop) ──
    visor.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      STATE.escala = Math.min(4, Math.max(1, STATE.escala + delta));
      zoom.value = String(STATE.escala);
      aplicar();
    }, { passive: false });

    resetState();
    aplicar();
  }

  /* Dibuja en canvas el recorte circular centrado aplicando transform inverso */
  function _recortar(img, st, tam) {
    const canvas = document.createElement('canvas');
    canvas.width = tam; canvas.height = tam;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, tam, tam);

    ctx.save();
    ctx.translate(tam / 2, tam / 2);
    ctx.rotate(st.rot * Math.PI / 180);
    ctx.scale(st.escala, st.escala);
    ctx.translate(-tam / 2 + st.tx, -tam / 2 + st.ty);

    const natW = img.naturalWidth, natH = img.naturalHeight;
    const visorSize = 280;
    const scaleFit = visorSize / Math.min(natW, natH);
    const drawW = natW * scaleFit, drawH = natH * scaleFit;
    ctx.drawImage(img, (tam - drawW) / 2, (tam - drawH) / 2, drawW, drawH);
    ctx.restore();

    // Máscara circular
    const out = document.createElement('canvas');
    out.width = tam; out.height = tam;
    const octx = out.getContext('2d');
    octx.save();
    octx.beginPath();
    octx.arc(tam / 2, tam / 2, tam / 2, 0, Math.PI * 2);
    octx.closePath();
    octx.clip();
    octx.drawImage(canvas, 0, 0);
    octx.restore();

    return out.toDataURL('image/jpeg', 0.85);
  }

  window.editorImagen = { abrir };
})();
