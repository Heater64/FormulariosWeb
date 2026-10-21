(function () {
  'use strict';

  /* ==========================================================================
   * Esqueletos de carga ("skeleton screens")
   * --------------------------------------------------------------------------
   * Un esqueleto no es un spinner: dibuja la MISMA estructura que tendrá el
   * contenido real (cabecera, estadísticas, filas, tabla, formulario) para que
   * el paso de "cargando" a "cargado" no mueva nada en pantalla (CLS ≈ 0).
   *
   * Reglas de la casa:
   *  - Las alturas están fijadas para reservar el hueco real del contenido.
   *  - Nada de texto "Cargando…" visible: el aviso va en `.skel-stack__sr`
   *    (solo lectores de pantalla) y el contenedor es role="status".
   *  - La animación de brillo se apaga con prefers-reduced-motion (CSS).
   *  - Se puede usar en cualquier página: no depende de las clases del panel.
   *
   * API pública: window.skeleton.{ mostrar, bloque, linea, titulo, tarjetas,
   * filas, conFiltros, tabla, inicioPanel, examenes, entregas, corregir,
   * evaluaciones, evaluacionEditar, editor, misNotas, cuenta, perfil,
   * notificaciones, calificaciones, grupos, explorar, examenAlumno, panelAdmin,
   * estudio, memorizacion, notas }
   * ========================================================================== */

  const SR = (etiqueta) => `<span class="skel-stack__sr">${etiqueta}</span>`;

  /* ── Primitivas ────────────────────────────────────────────────────────── */

  function bloque(alto, ancho, extra) {
    return `<div class="skel" style="height:${alto};${ancho ? 'width:' + ancho + ';' : ''}${extra ? extra : ''}"></div>`;
  }

  /** Línea de texto. */
  function linea(ancho, alto) {
    return bloque(alto || '12px', ancho || '100%');
  }

  /** Titular de sección o de tarjeta. */
  function titulo(ancho) {
    return bloque('26px', ancho || '45%', 'border-radius:var(--radio-md)');
  }

  /** Subtítulo / texto secundario. */
  function subtitulo(ancho) {
    return bloque('14px', ancho || '70%');
  }

  /** Píldora (badge, chip de filtro). */
  function chip(ancho) {
    return bloque('22px', ancho || '78px', 'border-radius:var(--radio-pill)');
  }

  /** Botón con la altura mínima táctil real del proyecto. */
  function boton(ancho) {
    return bloque('44px', ancho || '112px', 'border-radius:var(--radio-md);flex:0 0 auto');
  }

  /** Icono cuadrado (cabecera de sección). */
  function icono(lado) {
    const d = lado || '42px';
    return bloque(d, d, 'border-radius:var(--radio-md);flex:0 0 auto');
  }

  /** Tarjeta genérica con contenido interno. */
  function tarjeta(alto, contenido) {
    return `<div class="skel-tarjeta${alto ? '' : ''}"${alto ? ` style="min-height:${alto}"` : ''}>${contenido || ''}</div>`;
  }

  /** Celda de métrica (mismo hueco que .adm-stat de la tira agrupada). */
  function stat() {
    return `<div class="skel-stat">
      <div class="skel-stat__cifra">
        ${bloque('16px', '16px', 'border-radius:var(--radio-sm)')}
        ${bloque('24px', '38%')}
      </div>
      ${bloque('9px', '70%')}
    </div>`;
  }

  /**
   * Fila de lista (mismo hueco que .adm-fila / .adm-examen).
   * `medallon` dibuja la ficha de examen: marca de estado, datos con icono y
   * pie, en lugar de la fila de dos líneas.
   */
  function fila(opciones) {
    const o = opciones || {};
    const compacta = Boolean(o.compacta);
    const medallon = Boolean(o.medallon);
    return `<div class="skel-fila${compacta ? ' skel-fila--compacta' : ''}${medallon ? ' skel-fila--medallon' : ''}">
      ${medallon ? '<div class="skel skel-medallon"></div>' : ''}
      <div class="skel-fila__texto">
        ${bloque(compacta ? '18px' : '20px', o.titulo || '58%', 'border-radius:var(--radio-sm)')}
        <div class="skel-fila__meta">
          ${bloque('11px', '72px')}
          ${bloque('11px', '64px')}
          ${bloque('11px', '80px')}
        </div>
        ${medallon
          ? `<div class="skel-fila__pie">${bloque('10px', '96px')}${bloque('10px', '124px')}</div>`
          : ''}
      </div>
      <div class="skel-fila__acciones">
        ${boton(compacta ? '96px' : '110px')}
        ${boton(compacta ? '82px' : '88px')}
      </div>
    </div>`;
  }

  /** Varias filas de lista. `agrupada` dibuja el contenedor único de Inicio. */
  function filas(cantidad, opciones) {
    const o = opciones || {};
    let html = '';
    for (let i = 0; i < (cantidad || 5); i++) html += fila(o);
    return `<div class="skel-stack__grupo${o.agrupada ? ' skel-stack__grupo--agrupada' : ''}">${html}</div>`;
  }

  /** Cabecera de sección: icono + título + subtítulo + acción. */
  function cabecera(opciones) {
    const o = opciones || {};
    return `<div class="skel-cabecera${o.inicio ? ' skel-cabecera--inicio' : ''}">
      ${icono()}
      <div class="skel-cabecera__texto">
        ${bloque('28px', o.titulo || '46%', 'border-radius:var(--radio-md)')}
        ${bloque('13px', o.subtitulo || '78%')}
      </div>
      ${o.accion === false ? '' : boton(o.accionAncho || '132px')}
    </div>`;
  }

  /** Riel de pestañas + buscador. */
  function filtros(opciones) {
    const o = opciones || {};
    const chips = ['72px', '86px', '78px', '70px', '84px'].map((a) => chip(a)).join('');
    return `${o.sinTabs ? '' : `<div class="skel-tabs">${chips}</div>`}
      <div class="skel-buscador"></div>`;
  }

  /** Tabla (rejilla de evaluación, listados de notas). */
  function tabla(filas, columnas) {
    const nFilas = filas || 6;
    const nCols = columnas || 5;
    const plantilla = `grid-template-columns:minmax(110px,1.4fr) repeat(${Math.max(0, nCols - 2)}, minmax(54px,1fr)) minmax(64px,.8fr)`;
    let html = '';
    for (let f = 0; f < nFilas; f++) {
      let celdas = '';
      for (let c = 0; c < nCols; c++) {
        celdas += `<div class="skel" style="height:${f === 0 ? 12 : 14}px;width:${f === 0 ? '72%' : (c === 0 ? '86%' : '64%')}"></div>`;
      }
      html += `<div class="skel-tabla__fila" style="${plantilla}">${celdas}</div>`;
    }
    return `<div class="skel-tabla" role="presentation">${html}</div>`;
  }

  /** Formulario: etiqueta + campo, repetido. */
  function formulario(campos, opciones) {
    const o = opciones || {};
    let html = '';
    for (let i = 0; i < (campos || 4); i++) {
      html += `<div class="skel-campo">
        ${bloque('11px', '32%')}
        ${bloque(o.altoCampo || '46px', '100%', 'border-radius:var(--radio-md)')}
      </div>`;
    }
    return `<div class="skel-stack__grupo">${html}</div>`;
  }

  /* ── Composiciones por pantalla ─────────────────────────────────────────── */

  /* Lista genérica de tarjetas (estilo YouTube) — se conserva por compatibilidad */
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

  function inicioPanel() {
    return `<div class="o-contenedor panel-inicio skel-stack" role="status" aria-busy="true">
      ${SR('Cargando el panel')}
      ${cabecera({ titulo: '38%', subtitulo: '62%', inicio: true })}
      <div class="skel-stats">${stat()}${stat()}${stat()}${stat()}</div>
      <div class="skel-seccion">
        <div class="skel-seccion__fila">
          ${bloque('11px', '24%')}
          ${bloque('11px', '12%')}
        </div>
        ${filas(5, { medallon: true })}
      </div>
    </div>`;
  }

  function examenes() {
    return `<div class="o-contenedor skel-stack" role="status" aria-busy="true" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
      ${SR('Cargando los exámenes')}
      ${cabecera({ titulo: '34%', subtitulo: '70%' })}
      ${filtros()}
      ${filas(6)}
    </div>`;
  }

  /** Solo el bloque que va dentro de #contenido (la cabecera ya está pintada). */
  function conFiltros(cantidad) {
    return `${filtros()}${filas(cantidad || 6)}`;
  }

  function entregas() {
    return `<div class="o-contenedor skel-stack" role="status" aria-busy="true" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
      ${SR('Cargando las entregas')}
      ${cabecera({ titulo: '26%', subtitulo: '74%', accion: false })}
      ${filas(5)}
    </div>`;
  }

  function corregir() {
    return `<div class="o-contenedor skel-stack" role="status" aria-busy="true" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
      ${SR('Cargando las entregas del examen')}
      ${cabecera({ titulo: '32%', subtitulo: '58%' })}
      <div class="skel-stats">${stat()}${stat()}${stat()}</div>
      ${filas(6)}
    </div>`;
  }

  function evaluaciones() {
    return `<div class="o-contenedor skel-stack" role="status" aria-busy="true" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
      ${SR('Cargando las evaluaciones')}
      ${cabecera({ titulo: '30%', subtitulo: '76%' })}
      <div class="skel-buscador"></div>
      ${filas(4)}
    </div>`;
  }

  function evaluacionEditar() {
    return `<div class="skel-stack" role="status" aria-busy="true">${SR('Cargando la evaluación')}${tabla(9, 6)}</div>`;
  }

  function editor() {
    return `<div class="o-contenedor skel-stack" role="status" aria-busy="true" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
      ${SR('Cargando el editor')}
      ${cabecera({ titulo: '40%', subtitulo: '66%' })}
      <div class="skel-tarjeta">
        ${formulario(2)}
        ${bloque('42px', '100%', 'margin-top:var(--espaciado-sm)')}
      </div>
      <div class="skel-seccion">
        ${bloque('16px', '30%')}
        ${tarjeta('132px', `${bloque('18px', '52%')}<div style="height:12px"></div>${bloque('12px', '84%')}<div style="height:8px"></div>${bloque('12px', '68%')}`)}
        ${tarjeta('132px', `${bloque('18px', '44%')}<div style="height:12px"></div>${bloque('12px', '78%')}<div style="height:8px"></div>${bloque('12px', '58%')}`)}
      </div>
    </div>`;
  }

  /* Contenido para «Mis notas»: la vista ya aporta su propio contenedor. */
  function misNotas() {
    return `<div class="skel-stack" role="status" aria-busy="true">
      ${SR('Cargando tus notas')}
      ${cabecera({ titulo: '42%', subtitulo: '64%', accion: false })}
      <div class="skel-stats">${stat()}${stat()}${stat()}</div>
      <div class="skel-seccion">
        ${bloque('16px', '33%')}
        ${filas(4, { titulo: '64%' })}
      </div>
    </div>`;
  }

  function cuenta() {
    return `<div class="o-contenedor skel-stack" role="status" aria-busy="true" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
      ${SR('Cargando tu cuenta')}
      ${cabecera({ titulo: '30%', subtitulo: '62%', accion: false })}
      <div class="skel-tarjeta skel-tarjeta--perfil">
        ${bloque('76px', '76px', 'border-radius:50%')}
        <div class="skel-perfil__datos">
          ${bloque('20px', '48%')}
          ${bloque('12px', '34%')}
        </div>
      </div>
      ${formulario(3)}
      ${filas(2, { titulo: '48%' })}
    </div>`;
  }

  function perfil() {
    return cuenta();
  }

  function notificaciones() {
    return `${filtros()}${filas(5, { titulo: '62%' })}`;
  }

  function calificaciones() {
    return `<div class="o-contenedor skel-stack" role="status" aria-busy="true" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
      ${SR('Cargando el libro de calificaciones')}
      ${cabecera({ titulo: '44%', subtitulo: '60%', accion: false })}
      ${tabla(8, 6)}
    </div>`;
  }

  function grupos() {
    return `${filas(3, { titulo: '54%' })}`;
  }

  function explorar() {
    return `<div class="o-contenedor skel-stack" role="status" aria-busy="true" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
      ${SR('Cargando el explorador')}
      ${cabecera({ titulo: '28%', subtitulo: '58%', accion: false })}
      ${filtros({ sinTabs: true })}
      <div class="skel-tabs">${chip('70px')}${chip('84px')}${chip('76px')}${chip('92px')}</div>
      ${tarjetas(4, { ancho: '100%' })}
    </div>`;
  }

  /** Examen público del alumno (/e/:token). */
  function examenAlumno() {
    return `<div class="o-contenedor skel-stack" role="status" aria-busy="true" style="padding:var(--espaciado-lg) var(--espaciado-md) 120px">
      ${SR('Cargando el examen')}
      <div class="skel-cabecera">
        ${icono()}
        <div class="skel-cabecera__texto">
          ${bloque('22px', '58%')}
          ${bloque('12px', '40%')}
        </div>
      </div>
      <div class="skel-tarjeta">
        ${bloque('14px', '26%')}
        <div style="height:10px"></div>
        ${bloque('20px', '88%')}
        <div style="height:14px"></div>
        ${bloque('48px', '100%', 'border-radius:var(--radio-md)')}
        <div style="height:8px"></div>
        ${bloque('48px', '100%', 'border-radius:var(--radio-md)')}
        <div style="height:8px"></div>
        ${bloque('48px', '100%', 'border-radius:var(--radio-md)')}
        <div style="height:8px"></div>
        ${bloque('48px', '100%', 'border-radius:var(--radio-md)')}
      </div>
    </div>`;
  }

  /** Panel de administración standalone (paginas/admin). */
  function panelAdmin() {
    return `<div class="o-contenedor skel-stack" role="status" aria-busy="true" style="padding-top:var(--espaciado-lg);padding-bottom:var(--espaciado-xl)">
      ${SR('Cargando el panel de administración')}
      ${cabecera({ titulo: '38%', subtitulo: '66%' })}
      <div class="skel-stats">${stat()}${stat()}${stat()}${stat()}</div>
      ${filas(4)}
    </div>`;
  }

  /* ── Composiciones heredadas (estudio / memorización / notas) ───────────── */

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

  /* ── Helper de pintado ──────────────────────────────────────────────────── */

  /**
   * Pinta un esqueleto dentro de `raiz` y devuelve un objeto con `quitar()`.
   * El contenedor anuncia "cargando" a lectores de pantalla sin mostrar texto.
   */
  function mostrar(raiz, html, etiqueta) {
    if (!raiz) return { quitar() {} };
    const aviso = etiqueta || 'Cargando contenido';
    raiz.innerHTML = `<div class="skel-stack" role="status" aria-busy="true" aria-live="polite">${SR(aviso)}${html || ''}</div>`;
    return {
      quitar() {
        const stack = raiz.querySelector(':scope > .skel-stack');
        if (stack) stack.remove();
      }
    };
  }

  window.skeleton = {
    // primitivas
    bloque, linea, titulo, subtitulo, chip, boton, icono, tarjeta, stat, fila, filas,
    cabecera, filtros, tabla, formulario, tarjetas,
    // composiciones
    inicioPanel, examenes, conFiltros, entregas, corregir, evaluaciones,
    evaluacionEditar, editor, misNotas, cuenta, perfil, notificaciones,
    calificaciones, grupos, explorar, examenAlumno, panelAdmin,
    estudio, memorizacion, notas,
    // helper
    mostrar
  };
})();
