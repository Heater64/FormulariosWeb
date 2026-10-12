/* ============================================================================
 * js/vistas/vista-panel.js — Inicio del panel privado
 * ----------------------------------------------------------------------------
 * Resumen de exámenes, entregas y correcciones pendientes en una sola llamada
 * (fb_resumen_admin). Es la primera pantalla del administrador.
 * ==========================================================================*/
(function () {
  'use strict';

  const ROLES = ['admin', 'editor', 'owner'];

  function esAdmin() {
    const usuario = store.obtener('usuario');
    return usuario && ROLES.includes((usuario.rol || '').toLowerCase());
  }

  function stat(valor, etiqueta, clase, icono) {
    return `<div class="adm-stat${clase ? ' ' + clase : ''}">
      <span class="adm-stat__icono" aria-hidden="true">${window.Iconos.render(icono)}</span>
      <span class="adm-stat__valor">${window.panelUI.esc(valor)}</span>
      <span class="adm-stat__etiqueta">${window.panelUI.esc(etiqueta)}</span>
    </div>`;
  }

  function filaExamen(ex, contexto) {
    const porCorregir = Number(ex.por_corregir) || 0;
    const meta = [
      (Number(ex.num_preguntas) || 0) + ' preguntas',
      (Number(ex.num_enlaces) || 0) + ' enlaces',
      (Number(ex.num_entregas) || 0) + ' entregas'
    ];
    if (porCorregir > 0) meta.push(porCorregir + ' por corregir');
    else if (ex.nota_media != null) meta.push('media ' + window.panelUI.numero(ex.nota_media));

    const badge = porCorregir > 0
      ? '<span class="adm-badge adm-badge--aviso">Por corregir</span>'
      : (ex.estado === 'publicado'
        ? '<span class="adm-badge adm-badge--publicado">Publicado</span>'
        : (ex.estado === 'cerrado'
          ? '<span class="adm-badge adm-badge--cerrado">Cerrado</span>'
          : '<span class="adm-badge adm-badge--borrador">Borrador</span>'));

    return `<div class="adm-fila">
      <div class="adm-fila__principal">
        <div class="adm-fila__titulo">${window.panelUI.esc(ex.titulo)} ${badge}</div>
        <div class="adm-fila__meta">${meta.map((m) => `<span>${window.panelUI.esc(m)}</span>`).join('')}</div>
      </div>
      <div class="adm-fila__acciones">
        ${contexto === 'pendientes'
          ? `<button class="adm-btn adm-btn--principal adm-btn--pequeno" data-ir="/corregir/${esc(ex.id)}">${window.Iconos.render('clipboard-check')} Corregir</button>`
          : `<button class="adm-btn adm-btn--pequeno" data-ir="/corregir/${esc(ex.id)}">${window.Iconos.render('inbox')} Entregas</button>`}
        <button class="adm-btn adm-btn--pequeno" data-ir="/editor/${esc(ex.id)}">${window.Iconos.render('edit-3')} Editar</button>
      </div>
    </div>`;
  }

  window.vistaPanel = {
    async montar(raiz) {
      if (!esAdmin()) {
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta sección es solo para el administrador.</div></div>`;
        return;
      }
      const usuario = store.obtener('usuario');
      raiz.innerHTML = `<div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
        <p class="adm-cabecera__sub">Cargando tu panel…</p>
      </div>`;

      let datos;
      try {
        datos = await window.plataformaRepository.resumen();
      } catch (e) {
        raiz.innerHTML = `<div class="o-contenedor u-mt-4">
          <div class="adm-aviso adm-aviso--error">No se pudo cargar el panel: ${window.panelUI.esc(e.message)}</div>
          <button class="adm-btn" id="btnReintentar">Reintentar</button>
        </div>`;
        raiz.querySelector('#btnReintentar').addEventListener('click', () => router._ejecutar());
        return;
      }

      const examenes = (datos && datos.examenes) || [];
      const publicados = examenes.filter((e) => e.estado === 'publicado').length;
      const totalEntregas = examenes.reduce((s, e) => s + (Number(e.num_entregas) || 0), 0);
      const porCorregir = examenes.reduce((s, e) => s + (Number(e.por_corregir) || 0), 0);
      const conPendientes = examenes.filter((e) => Number(e.por_corregir) > 0);
      const nombre = (usuario.nombre_completo || usuario.username || '').split(' ')[0];

      raiz.innerHTML = `
        <div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <header class="adm-cabecera">
            <span class="adm-cabecera__icono" aria-hidden="true">${window.Iconos.render('house')}</span>
            <div class="adm-cabecera__principal">
              <h1 class="adm-cabecera__titulo">Hola${nombre ? ', ' + window.panelUI.esc(nombre) : ''}</h1>
              <p class="adm-cabecera__sub">Crea exámenes, comparte un enlace con cada alumno y corrige las respuestas escritas.</p>
            </div>
            <div class="adm-cabecera__acciones">
              <button class="adm-btn adm-btn--principal" id="btnNuevo">${window.Iconos.render('plus')} Nuevo examen</button>
            </div>
          </header>

          <div class="adm-rejilla">
            ${stat(examenes.length, 'Exámenes', 'adm-stat--acento', 'clipboard-list')}
            ${stat(publicados, 'Publicados', 'adm-stat--exito', 'check-circle')}
            ${stat(totalEntregas, 'Entregas recibidas', '', 'inbox')}
            ${stat(porCorregir, 'Respuestas por corregir', porCorregir > 0 ? 'adm-stat--aviso' : '', 'alert-triangle')}
          </div>

          <section class="adm-seccion">
            <h2 class="adm-seccion__titulo">Pendientes de corrección</h2>
            <div id="listaPendientes"></div>
          </section>

          <section class="adm-seccion">
            <h2 class="adm-seccion__titulo">Tus exámenes</h2>
            <div id="listaTodos"></div>
          </section>
        </div>`;

      // El usuario puede haber navegado mientras se cargaba el resumen: en ese
      // caso el router ya vació #app-root y estos nodos no existen. Pintar es
      // opcional; fallar aquí dejaría un error sin sentido en la consola.
      const pendientes = raiz.querySelector('#listaPendientes');
      if (pendientes) {
        pendientes.innerHTML = conPendientes.length
          ? `<div class="adm-lista">${conPendientes.map((e) => filaExamen(e, 'pendientes')).join('')}</div>`
          : `<div class="adm-aviso adm-aviso--exito adm-aviso--destacado">Todo corregido. No hay respuestas pendientes.</div>`;
      }

      const todos = raiz.querySelector('#listaTodos');
      if (todos) {
        todos.innerHTML = examenes.length
          ? `<div class="adm-lista">${examenes.slice(0, 6).map((e) => filaExamen(e, 'todos')).join('')}</div>`
          : `<div class="adm-vacio">
              <p class="adm-vacio__titulo">Todavía no hay exámenes</p>
              <p>Crea tu primer examen y comparte los enlaces con tus alumnos.</p>
            </div>`;
      }

      const btnNuevo = raiz.querySelector('#btnNuevo');
      if (btnNuevo) btnNuevo.addEventListener('click', () => router.navegar('/editor/nuevo'));
      raiz.querySelectorAll('[data-ir]').forEach((btn) => {
        btn.addEventListener('click', () => router.navegar(btn.dataset.ir));
      });
      if (window.Iconos) window.Iconos.actualizar();
    }
  };

  // Uso local del helper de escape dentro de plantillas estáticas.
  function esc(valor) { return window.panelUI.esc(valor); }
})();
