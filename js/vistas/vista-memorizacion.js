(function() {
  'use strict';
  window.vistaMemorizacion = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      raiz.innerHTML = '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando tarjetas...</p></div>';
      try {
        const tarjetas = await window.memorizacionRepository.tarjetasPendientes(usuario.id);
        const total = await window.memorizacionRepository.contarTarjetas(usuario.id);
        const repasos = await window.memorizacionRepository.totalRepasos(usuario.id);
        this._renderizar(raiz, tarjetas, total, repasos, usuario);
      } catch (e) { raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">Error: ${e.message}</p></div>`; }
    },
    _renderizar(raiz, tarjetas, total, repasos, usuario) {
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:120px">
          <h2>${window.Iconos.render('brain')} Memorización</h2>
          <div class="o-grid-tarjetas">
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Pendientes hoy</p><p class="u-texto-xl u-fw-700">${tarjetas.length}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Total tarjetas</p><p class="u-texto-xl u-fw-700">${total}</p></div>
            <div class="tarjeta-capitulo"><p class="u-fs-xs u-color-texto-terciario">Repasos</p><p class="u-texto-xl u-fw-700">${repasos}</p></div>
          </div>
          <div id="tarjetaActual" class="o-pila" style="min-height:300px"></div>
          ${tarjetas.length === 0 ? `
            <div class="u-texto-centrado o-pila u-mt-4" style="align-items:center">
              <p style="font-size:3rem;color:var(--color-exito);display:flex;justify-content:center">${window.Iconos.render('party-popper')}</p>
              <p class="u-color-texto-secundario">¡No hay tarjetas pendientes hoy!</p>
              <p class="u-fs-xs u-color-texto-terciario">Lee un capítulo y agrega versículos a memorizar</p>
              <button class="btn-primario" onclick="router.navegar('/estudio')">Ir a estudiar</button>
            </div>` : this._renderTarjeta(tarjetas[0], 0, tarjetas.length)}
        </div>`;
      if (tarjetas.length > 0) this._configurarBotones(raiz, tarjetas, usuario);
    },
    _renderTarjeta(t, idx, total) {
      const v = t.versiculos;
      const cap = v?.capitulos;
      return `
        <div class="tarjeta-memorizacion" id="flashcard">
          <div class="tarjeta-memorizacion__referencia u-color-texto-secundario u-fs-sm">${idx + 1} de ${total}</div>
          <div class="tarjeta-memorizacion__contenido" id="cardFront">
            <p class="u-color-texto-terciario u-fs-sm">Referencia</p>
            <p class="u-texto-lg u-fw-600" style="margin:var(--espaciado-md) 0">
              ${cap ? `${window.helpers.escapeHtml(t.libros_biblicos?.nombre || '')} ${cap.numero}:${v.numero}` : 'Versículo'}
            </p>
            <p class="u-color-texto-secundario u-fs-sm">¿Puedes recordar el texto?</p>
            <button class="btn-primario" id="btnRevelar" style="width:100%;justify-content:center">Revelar texto</button>
          </div>
          <div class="tarjeta-memorizacion__contenido" id="cardBack" style="display:none">
            <p class="u-color-texto-terciario u-fs-sm">${cap ? `${window.helpers.escapeHtml(t.libros_biblicos?.nombre || '')} ${cap.numero}:${v.numero}` : ''}</p>
            <p class="texto-biblico" style="margin:var(--espaciado-md) 0;line-height:var(--altura-linea-lectura)">${window.helpers.escapeHtml(v?.texto || '')}</p>
            <p class="u-fs-xs u-color-texto-terciario u-mb-2">¿Qué tan bien lo recordaste?</p>
            <div class="o-grid" style="grid-template-columns:repeat(5,1fr);gap:var(--espaciado-xs)">
              <button class="btn-calidad" data-calidad="0" style="background:#fee2e2;color:#dc2626">0<br><span class="u-fs-xs">Olvidé</span></button>
              <button class="btn-calidad" data-calidad="2" style="background:#fef3c7;color:#d97706">2<br><span class="u-fs-xs">Difícil</span></button>
              <button class="btn-calidad" data-calidad="3" style="background:#fef9c3;color:#a16207">3<br><span class="u-fs-xs">Regular</span></button>
              <button class="btn-calidad" data-calidad="4" style="background:#d1fae5;color:#059669">4<br><span class="u-fs-xs">Fácil</span></button>
              <button class="btn-calidad" data-calidad="5" style="background:#a7f3d0;color:#047857">5<br><span class="u-fs-xs">Perfecto</span></button>
            </div>
          </div>
        </div>`;
    },
    _configurarBotones(raiz, tarjetas, usuario) {
      let idx = 0;
      const cont = raiz.querySelector('#tarjetaActual');
      const revelar = cont?.querySelector('#btnRevelar');
      if (revelar) {
        revelar.onclick = () => {
          const front = cont.querySelector('#cardFront');
          const back = cont.querySelector('#cardBack');
          if (front) front.style.display = 'none';
          if (back) back.style.display = 'block';
        };
      }
      cont.querySelectorAll('.btn-calidad').forEach(btn => {
        btn.onclick = async () => {
          const calidad = parseInt(btn.dataset.calidad);
          const t = tarjetas[idx];
          const resultado = window.repeticionEspaciada.calcularProximoRepaso(t, calidad);
          await window.memorizacionRepository.actualizarTarjeta({ ...t, ...resultado });
          await window.memorizacionRepository.registrarRepaso(t.id, calidad);
          idx++;
          if (idx < tarjetas.length) {
            cont.innerHTML = '';
            cont.innerHTML = this._renderTarjeta(tarjetas[idx], idx, tarjetas.length);
            this._configurarBotones(raiz, tarjetas, usuario);
          } else {
            cont.innerHTML = `
              <div class="u-texto-centrado o-pila" style="align-items:center;padding:var(--espaciado-xl) 0">
                <p style="font-size:3rem;color:var(--color-exito);display:flex;justify-content:center">${window.Iconos.render('party-popper')}</p>
                <p class="u-texto-lg u-fw-600">¡Completaste todas las tarjetas!</p>
                <p class="u-color-texto-secundario u-fs-sm">Vuelve mañana para más repasos</p>
                <button class="btn-primario" onclick="router.navegar('/estudio')">Seguir estudiando</button>
              </div>`;
          }
        };
      });
    }
  };
})();
