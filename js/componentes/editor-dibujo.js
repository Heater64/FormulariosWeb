(function () {
  'use strict';

  /* Dibujo a mano alzada para el bloc de notas.
     Uso: window.editorDibujo.abrir({ onConfirm(dataUrl), onCancel() }) */

  const COLORES = ['#0F172A', '#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#FFFFFF'];

  function abrir(opts) {
    opts = opts || {};
    _montarModal(opts);
  }

  function _montarModal(opts) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay editor-dibujo-overlay';
    overlay.innerHTML = `
      <div class="editor-dibujo" role="dialog" aria-modal="true" aria-label="Dibujar a mano">
        <div class="editor-dibujo__cabecera">
          <h3>${window.Iconos?.render('pen-tool') || '✏️'} Dibujar</h3>
        </div>
        <div class="editor-dibujo__lienzo-wrap">
          <canvas id="dibujoCanvas" class="editor-dibujo__lienzo" width="600" height="400"
            aria-label="Lienzo de dibujo"></canvas>
        </div>
        <div class="editor-dibujo__barra">
          <div class="editor-dibujo__colores" role="group" aria-label="Colores">
            ${COLORES.map((c, i) => `
              <button type="button" class="editor-dibujo__color${i === 0 ? ' editor-dibujo__color--activo' : ''}"
                data-color="${c}" style="--c:${c}" aria-label="Color ${c}" title="Color ${c}"></button>`).join('')}
          </div>
          <div class="editor-dibujo__herramientas" role="group" aria-label="Herramientas">
            <input type="range" id="dibujoGrosor" min="1" max="24" value="5" aria-label="Grosor del trazo" title="Grosor">
            <button type="button" class="btn-icono" id="dibujoBorrador" title="Borrador" aria-label="Borrador">${window.Iconos?.render('eraser') || '🧽'}</button>
            <button type="button" class="btn-icono" id="dibujoLimpiar" title="Limpiar lienzo" aria-label="Limpiar lienzo">${window.Iconos?.render('trash-2') || '🗑️'}</button>
          </div>
        </div>
        <div class="editor-dibujo__acciones">
          <button class="btn-secundario" id="dibujoCancelar">Cancelar</button>
          <button class="btn-primario" id="dibujoGuardar">Añadir</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    if (window.Iconos?.actualizar) window.Iconos.actualizar();

    const canvas = overlay.querySelector('#dibujoCanvas');
    const ctx = canvas.getContext('2d');

    // Ajustar resolución al tamaño real mostrado (para calidad en pantallas retina)
    function ajustarResolucion() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(300, Math.round(rect.width * dpr));
      canvas.height = Math.max(200, Math.round(rect.height * dpr));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    ajustarResolucion();
    window.addEventListener('resize', ajustarResolucion);

    let color = COLORES[0];
    let grosor = 5;
    let borrador = false;
    let dibujando = false;
    let ultimoPunto = null;

    function trazarPunto(p) {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const x = (p.clientX - rect.left) * dpr;
      const y = (p.clientY - rect.top) * dpr;
      return { x, y };
    }

    function iniciar(p) {
      dibujando = true;
      ultimoPunto = trazarPunto(p);
    }

    function mover(p) {
      if (!dibujando) return;
      const pto = trazarPunto(p);
      ctx.strokeStyle = borrador ? '#FFFFFF' : color;
      ctx.lineWidth = borrador ? Math.max(grosor * 3, 16) : grosor;
      ctx.beginPath();
      ctx.moveTo(ultimoPunto.x, ultimoPunto.y);
      ctx.lineTo(pto.x, pto.y);
      ctx.stroke();
      ultimoPunto = pto;
    }

    function terminar() {
      dibujando = false;
      ultimoPunto = null;
    }

    // Ratón
    canvas.addEventListener('mousedown', (e) => { e.preventDefault(); iniciar(e); });
    canvas.addEventListener('mousemove', (e) => { if (dibujando) { e.preventDefault(); mover(e); } });
    window.addEventListener('mouseup', terminar);

    // Táctil
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      iniciar({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      if (!dibujando) return;
      e.preventDefault();
      const t = e.touches[0];
      mover({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: false });
    canvas.addEventListener('touchend', terminar, { passive: false });

    // Colores
    overlay.querySelectorAll('.editor-dibujo__color').forEach((btn) => {
      btn.onclick = () => {
        overlay.querySelectorAll('.editor-dibujo__color').forEach(b => b.classList.remove('editor-dibujo__color--activo'));
        btn.classList.add('editor-dibujo__color--activo');
        color = btn.dataset.color;
        borrador = false;
      };
    });

    overlay.querySelector('#dibujoGrosor').oninput = (e) => { grosor = parseInt(e.target.value, 10); };

    overlay.querySelector('#dibujoBorrador').onclick = () => { borrador = !borrador; };

    overlay.querySelector('#dibujoLimpiar').onclick = () => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    function cerrar() {
      window.removeEventListener('resize', ajustarResolucion);
      window.removeEventListener('mouseup', terminar);
      overlay.remove();
    }

    overlay.querySelector('#dibujoCancelar').onclick = () => { cerrar(); if (opts.onCancel) opts.onCancel(); };
    overlay.querySelector('#dibujoGuardar').onclick = () => {
      const url = canvas.toDataURL('image/png');
      cerrar();
      if (opts.onConfirm) opts.onConfirm(url);
    };
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { cerrar(); if (opts.onCancel) opts.onCancel(); }
    });
  }

  window.editorDibujo = { abrir };
})();
