/* ============================================================================
 * js/vistas/vista-panel.js — Inicio del panel privado
 * ----------------------------------------------------------------------------
 * Resumen de exámenes, entregas y correcciones pendientes en una sola llamada
 * (fb_resumen_admin). Es la primera pantalla del administrador.
 *
 * Inicio es una cola de trabajo, no un listado: primero lo que exige acción
 * (corregir) y luego el archivo. Cada examen se pinta con la misma ficha que
 * «Mis exámenes» (_examenes-panel.css, ámbito .ex-vista): medallón de estado,
 * datos con icono, franco ámbar cuando hay entregas sin corregir y acciones
 * ordenadas. Un examen nunca aparece dos veces en la pantalla.
 * ==========================================================================*/
(function () {
  'use strict';

  const ROLES = ['admin', 'editor', 'owner'];

  const ESTADOS = {
    publicado: { texto: 'Publicado', clase: 'adm-badge--publicado' },
    cerrado: { texto: 'Cerrado', clase: 'adm-badge--cerrado' },
    borrador: { texto: 'Borrador', clase: 'adm-badge--borrador' }
  };
  // El medallón y el badge comparten símbolo: el estado se reconoce sin leer.
  const ICONOS_ESTADO = { borrador: 'pen-line', publicado: 'send', cerrado: 'lock' };

  // Cuántas fichas caben en Inicio antes de mandar a «Ver todos». El panel es
  // un vistazo: la lista completa vive en /examenes.
  const MAX_FICHAS = 6;

  // «1 preguntas» / «1 entregas» delataban el contador escrito a mano.
  const plural = (n, singular, plurales) => `${n} ${n === 1 ? singular : plurales}`;

  function esAdmin() {
    const usuario = store.obtener('usuario');
    return usuario && ROLES.includes((usuario.rol || '').toLowerCase());
  }

  function stat(valor, etiqueta, clase, icono) {
    return `<div class="adm-stat${clase ? ' ' + clase : ''}">
      <span class="adm-stat__cifra">
        <span class="adm-stat__icono" aria-hidden="true">${window.Iconos.render(icono)}</span>
        <span class="adm-stat__valor">${window.panelUI.esc(valor)}</span>
      </span>
      <span class="adm-stat__etiqueta">${window.panelUI.esc(etiqueta)}</span>
    </div>`;
  }

  /**
   * Una ficha = estado + qué es + cómo va + qué puedo hacer.
   * La acción principal cambia con el estado, pero nunca es sólida: el relleno
   * de acento está reservado a «Nuevo examen» en la cabecera.
   */
  function tarjetaExamen(ex) {
    const estado = ESTADOS[ex.estado] || ESTADOS.borrador;
    const porCorregir = Number(ex.por_corregir) || 0;
    const entregas = Number(ex.num_entregas) || 0;
    const numEnlaces = Number(ex.num_enlaces) || 0;
    const enlacesUsados = Number(ex.enlaces_usados) || 0;
    const esBorrador = ex.estado === 'borrador';
    const titulo = window.panelUI.esc(ex.titulo);
    const icono = ICONOS_ESTADO[ex.estado] || 'pen-line';

    const datos = [
      `<span class="ex-ficha__dato">${window.Iconos.render('file-text')}${plural(Number(ex.num_preguntas) || 0, 'pregunta', 'preguntas')}</span>`,
      `<span class="ex-ficha__dato">${window.Iconos.render('target')}${plural(Number(ex.puntos_totales) || 0, 'punto', 'puntos')}</span>`
    ];
    if (!esBorrador) {
      datos.push(`<span class="ex-ficha__dato ex-ficha__dato--entregas">${window.Iconos.render('inbox')}${plural(entregas, 'entrega', 'entregas')}</span>`);
      if (ex.nota_media != null) {
        datos.push(`<span class="ex-ficha__dato">${window.Iconos.render('medal')}media ${window.panelUI.esc(window.panelUI.numero(ex.nota_media))}</span>`);
      }
    }

    // Solo se mencionan los enlaces cuando hay alguno: repetir «sin enlaces»
    // en cada ficha convertía el pie en ruido.
    const pie = [];
    if (!esBorrador && numEnlaces) {
      pie.push(`<span>${window.Iconos.render('link-2')}${enlacesUsados} de ${numEnlaces} enlaces usados</span>`);
    }
    pie.push(`<span>${window.Iconos.render('clock')}Actualizado ${window.panelUI.esc(window.panelUI.tiempoRelativo(ex.actualizado_en || ex.creado_en))}</span>`);

    let principal;
    let editar = '';
    if (porCorregir > 0) {
      principal = `<button class="adm-btn adm-btn--pequeno ex-boton-suave" type="button" data-ir="/corregir/${window.panelUI.esc(ex.id)}">${window.Iconos.render('clipboard-check')} Corregir</button>`;
      editar = `<button class="adm-btn adm-btn--pequeno ex-boton-fantasma" type="button" data-ir="/editor/${window.panelUI.esc(ex.id)}" data-confirmar-edicion>${window.Iconos.render('edit-3')} Editar</button>`;
    } else if (!esBorrador) {
      principal = `<button class="adm-btn adm-btn--pequeno ex-boton-suave" type="button" data-ir="/corregir/${window.panelUI.esc(ex.id)}">${window.Iconos.render('inbox')} Entregas</button>`;
      editar = `<button class="adm-btn adm-btn--pequeno ex-boton-fantasma" type="button" data-ir="/editor/${window.panelUI.esc(ex.id)}" data-confirmar-edicion>${window.Iconos.render('edit-3')} Editar</button>`;
    } else {
      // Un borrador no tiene nada que corregir: el siguiente paso es abrirlo.
      principal = `<button class="adm-btn adm-btn--pequeno ex-boton-suave ex-accion-principal" type="button" data-ir="/editor/${window.panelUI.esc(ex.id)}" data-confirmar-edicion>${window.Iconos.render('edit-3')} Editar</button>`;
    }

    return `<article class="adm-fila adm-examen" data-estado="${window.panelUI.esc(ex.estado || 'borrador')}"${porCorregir > 0 ? ' data-atencion="1"' : ''} aria-label="${titulo}">
      <span class="ex-ficha__marca" aria-hidden="true">${window.Iconos.render(icono)}</span>
      <div class="ex-ficha__cuerpo">
        <div class="ex-ficha__titulo">
          <h3>${titulo}</h3>
          <span class="adm-badge ${estado.clase}">${estado.texto}</span>
          ${porCorregir > 0 ? `<span class="adm-badge adm-badge--aviso">${window.panelUI.esc(porCorregir + ' por corregir')}</span>` : ''}
        </div>
        <div class="ex-ficha__meta">${datos.join('')}</div>
        <div class="ex-ficha__pie">${pie.join('')}</div>
      </div>
      <div class="ex-ficha__acciones">
        <div class="adm-examen__acciones-principales">
          ${principal}
          ${editar}
        </div>
      </div>
    </article>`;
  }

  /**
   * Lista agrupada sin duplicados: «Por corregir» arriba y el archivo después.
   * Cuando no hay pendientes se omite el título del grupo: la sección ya se
   * llama «Tus exámenes» y un encabezado «Todos los exámenes» sobraba.
   */
  function htmlLista(examenes) {
    const pendientes = examenes
      .filter((ex) => Number(ex.por_corregir) > 0)
      .slice(0, MAX_FICHAS);
    const enAtencion = new Set(pendientes.map((ex) => String(ex.id)));
    const resto = examenes
      .filter((ex) => !enAtencion.has(String(ex.id)))
      .slice(0, Math.max(0, MAX_FICHAS - pendientes.length));

    if (!pendientes.length) {
      return `<div class="adm-lista">${resto.map(tarjetaExamen).join('')}</div>`;
    }

    const grupos = [
      { clave: 'atencion', titulo: 'Por corregir', icono: 'inbox', examenes: pendientes },
      { clave: 'resto', titulo: 'Todos los exámenes', icono: 'clipboard-list', examenes: resto }
    ].filter((grupo) => grupo.examenes.length);

    return grupos.map((grupo) => `<section class="ex-grupo ex-grupo--${grupo.clave}" aria-label="${grupo.titulo}">
      <p class="ex-grupo__titulo">
        <span class="ex-grupo__icono" aria-hidden="true">${window.Iconos.render(grupo.icono)}</span>
        ${grupo.titulo}
        <span class="ex-grupo__cuenta">${grupo.examenes.length}</span>
      </p>
      <div class="adm-lista">${grupo.examenes.map(tarjetaExamen).join('')}</div>
    </section>`).join('');
  }

  window.vistaPanel = {
    async montar(raiz) {
      if (!esAdmin()) {
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta sección es solo para el administrador.</div></div>`;
        return;
      }
      const usuario = store.obtener('usuario');
      // Esqueleto con la estructura real del panel (cabecera, estadísticas y
      // fichas): el contenido aterriza en el mismo hueco y no hay salto visual.
      raiz.innerHTML = window.skeleton
        ? window.skeleton.inicioPanel()
        : '<div class="o-contenedor u-mt-4" role="status" aria-busy="true"></div>';

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

      // «Todo corregido» informa sin ocupar una sección entera: cuando no hay
      // pendientes desaparece el grupo y queda solo el aviso, más bajo.
      const pendientesHtml = conPendientes.length
        ? ''
        : `<div class="adm-aviso adm-aviso--exito adm-aviso--fino" role="status">
            <span class="adm-aviso__icono" aria-hidden="true">${window.Iconos.render('check-circle')}</span>
            <span>Todo corregido. No hay respuestas pendientes.</span>
          </div>`;

      raiz.innerHTML = `
        <div class="o-contenedor panel-inicio ex-vista">
          <header class="adm-cabecera adm-cabecera--inicio">
            <span class="adm-cabecera__icono" aria-hidden="true">${window.Iconos.render('house')}</span>
            <div class="adm-cabecera__principal">
              <h1 class="adm-cabecera__titulo">Hola${nombre ? ', ' + window.panelUI.esc(nombre) : ''}</h1>
              <p class="adm-cabecera__sub">Crea exámenes, comparte un enlace con cada alumno y corrige las respuestas escritas.</p>
            </div>
            <div class="adm-cabecera__acciones">
              <button class="adm-btn adm-btn--principal" id="btnNuevo">${window.Iconos.render('plus')} Nuevo examen</button>
            </div>
          </header>

          <div class="adm-rejilla adm-rejilla--agrupada" role="group" aria-label="Resumen de exámenes">
            ${stat(examenes.length, 'Exámenes', '', 'clipboard-list')}
            ${stat(publicados, 'Publicados', '', 'check-circle')}
            ${stat(totalEntregas, 'Entregas recibidas', '', 'inbox')}
            ${stat(porCorregir, 'Respuestas por corregir', porCorregir > 0 ? 'adm-stat--aviso' : '', 'alert-triangle')}
          </div>

          ${pendientesHtml}

          <section class="adm-seccion" aria-label="Tus exámenes">
            <div class="adm-seccion__fila">
              <h2 class="adm-seccion__titulo">Tus exámenes</h2>
              ${examenes.length
                ? `<button type="button" class="adm-seccion__enlace" data-ir="/examenes">Ver todos ${window.Iconos.render('chevron-right')}</button>`
                : ''}
            </div>
            <div id="listaTodos"></div>
          </section>
        </div>`;

      // El usuario puede haber navegado mientras se cargaba el resumen: en ese
      // caso el router ya vació #app-root y estos nodos no existen. Pintar es
      // opcional; fallar aquí dejaría un error sin sentido en la consola.
      const todos = raiz.querySelector('#listaTodos');
      if (todos) {
        todos.innerHTML = examenes.length
          ? htmlLista(examenes)
          : `<div class="adm-vacio ex-vacio">
              <span class="ex-vacio__icono" aria-hidden="true">${window.Iconos.render('clipboard-list')}</span>
              <p class="adm-vacio__titulo">Tu primer examen empieza aquí</p>
              <p>Crea un examen, comparte un enlace con cada alumno y corrige las respuestas escritas desde esta misma página.</p>
              <button class="adm-btn adm-btn--principal" type="button" data-ir="/editor/nuevo">${window.Iconos.render('plus')} Nuevo examen</button>
            </div>`;
      }

      const btnNuevo = raiz.querySelector('#btnNuevo');
      if (btnNuevo) btnNuevo.addEventListener('click', () => router.navegar('/editor/nuevo'));
      raiz.querySelectorAll('[data-ir]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          // «Editar» saca al usuario del panel hacia el editor del examen: un
          // clic sin querer no debe abrirlo. Entregas/Corregir solo navegan.
          if (btn.hasAttribute('data-confirmar-edicion')) {
            // La tarjeta vive en helpers.confirmarEdicion: la comparten todas
            // las pantallas que ofrecen «Editar».
            const ok = await window.helpers.confirmarEdicion();
            if (!ok) return;
          }
          router.navegar(btn.dataset.ir);
        });
      });
      if (window.Iconos) window.Iconos.actualizar();
    }
  };
})();
