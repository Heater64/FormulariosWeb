(function () {
  'use strict';

  function bloque(alto, ancho, extra) {
    return `<div class="skel" style="height:${alto};${ancho ? 'width:' + ancho + ';' : ''}${extra ? extra : ''}"></div>`;
  }

  /* Lista genérica de tarjetas (estilo YouTube) */
  function tarjetas(cantidad, opts) {
    opts = opts || {};
    const ancho = opts.ancho || '100%';
    let html = '';
    for (let i = 0; i < cantidad; i++) {
      const h1 = 56 + (i % 3) * 22;
      const h2 = 14 + (i % 2) * 8;
      html += `
        <div class="skel-tarjeta" style="width:${ancho}">
          ${bloque(h1, '100%', 'border-radius:var(--radio-lg);margin-bottom:var(--espaciado-sm)')}
          <div class="o-pila" style="gap:8px">
            ${bloque(h2, '70%')}
            ${bloque('12px', '45%')}
          </div>
        </div>`;
    }
    return html;
  }

  /* Skeleton para la vista de Estudio (stats + libros) */
  function estudio() {
    return `
      <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg)">
        ${bloque('28px', '55%', 'border-radius:var(--radio-md);margin-bottom:var(--espaciado-md)')}
        <div class="mem-grid-tarjetas">
          ${bloque('90px', '100%', 'border-radius:var(--radio-lg)')}
          ${bloque('90px', '100%', 'border-radius:var(--radio-lg)')}
          ${bloque('90px', '100%', 'border-radius:var(--radio-lg)')}
        </div>
        <div class="o-pila" style="gap:var(--espaciado-sm);margin-top:var(--espaciado-md)">
          ${tarjetas(6, { ancho: '100%' })}
        </div>
      </div>`;
  }

  /* Skeleton para Exámenes */
  function examenes() {
    return `
      <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg)">
        ${bloque('28px', '45%', 'border-radius:var(--radio-md);margin-bottom:var(--espaciado-md)')}
        <div class="o-pila" style="gap:var(--espaciado-sm)">
          ${tarjetas(5, { ancho: '100%' })}
        </div>
      </div>`;
  }

  /* Skeleton para Memorización (stats + pestañas) */
  function memorizacion() {
    return `
      <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg)">
        ${bloque('28px', '50%', 'border-radius:var(--radio-md);margin-bottom:var(--espaciado-md)')}
        <div class="mem-grid-tarjetas">
          ${bloque('80px', '100%', 'border-radius:var(--radio-lg)')}
          ${bloque('80px', '100%', 'border-radius:var(--radio-lg)')}
          ${bloque('80px', '100%', 'border-radius:var(--radio-lg)')}
          ${bloque('80px', '100%', 'border-radius:var(--radio-lg)')}
        </div>
        <div class="o-pila" style="gap:var(--espaciado-sm);margin-top:var(--espaciado-md)">
          ${tarjetas(4, { ancho: '100%' })}
        </div>
      </div>`;
  }

  /* Skeleton para Notas (bloc de notas: buscador + lista compacta) */
  function notas() {
    return `
      <div class="notas-home">
        <div style="padding:var(--espaciado-lg) var(--espaciado-lg) var(--espaciado-xs)">
          ${bloque('30px', '40%', 'border-radius:var(--radio-md)')}
        </div>
        <div style="margin:var(--espaciado-sm) var(--espaciado-lg) var(--espaciado-md)">
          ${bloque('44px', '100%', 'border-radius:var(--radio-pill)')}
        </div>
        <div class="o-pila" style="gap:var(--espaciado-xs);padding:0 var(--espaciado-lg)">
          ${bloque('64px', '100%', 'border-radius:var(--radio-lg)')}
          ${bloque('64px', '100%', 'border-radius:var(--radio-lg)')}
          ${bloque('64px', '100%', 'border-radius:var(--radio-lg)')}
          ${bloque('64px', '100%', 'border-radius:var(--radio-lg)')}
        </div>
      </div>`;
  }

  window.skeleton = { tarjetas, estudio, examenes, memorizacion, notas };
})();
