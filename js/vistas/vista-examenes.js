/* ============================================================================
 * js/vistas/vista-examenes.js — Mis exámenes (panel del administrador)
 * ----------------------------------------------------------------------------
 * Lista los exámenes del administrador (borradores, publicados y cerrados),
 * permite publicar/cerrar, duplicar, eliminar y —sobre todo— generar los
 * ENLACES INDIVIDUALES de un solo uso que se comparten con cada alumno.
 *
 * Los enlaces viven en `examen_enlaces` (migración 056) y se generan en el
 * servidor: aquí solo se envían nombres y se pinta lo que devuelve la RPC.
 * ==========================================================================*/
(function () {
  'use strict';

  const ROLES = ['admin', 'editor', 'owner'];
  const ESTADOS = {
    borrador: { texto: 'Borrador', clase: 'adm-badge--borrador' },
    publicado: { texto: 'Publicado', clase: 'adm-badge--publicado' },
    cerrado: { texto: 'Cerrado', clase: 'adm-badge--cerrado' }
  };

  const esc = (v) => window.panelUI.esc(v);

  window.vistaExamenes = {
    _examenes: [],
    _filtro: 'todos',
    _busqueda: '',
    _timer: null,

    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario || !ROLES.includes((usuario.rol || '').toLowerCase())) {
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta sección es solo para el administrador.</div></div>`;
        return;
      }

      raiz.innerHTML = `<div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
        <header class="adm-cabecera">
          <div class="adm-cabecera__principal">
            <h1 class="adm-cabecera__titulo">Mis exámenes</h1>
            <p class="adm-cabecera__sub">Crea un examen, genérale un enlace a cada alumno y corrige las respuestas escritas.</p>
          </div>
          <div class="adm-cabecera__acciones">
            <button class="adm-btn adm-btn--principal" id="btnNuevo">Nuevo examen</button>
          </div>
        </header>
        <div id="contenido"></div>
      </div>`;

      raiz.querySelector('#btnNuevo').addEventListener('click', () => router.navegar('/editor/nuevo'));
      const contenido = raiz.querySelector('#contenido');
      contenido.innerHTML = `<p class="adm-cabecera__sub">Cargando…</p>`;

      try {
        const datos = await window.plataformaRepository.resumen();
        this._examenes = (datos && datos.examenes) || [];
      } catch (e) {
        contenido.innerHTML = `<div class="adm-aviso adm-aviso--error">No se pudieron cargar los exámenes: ${esc(e.message)}</div>`;
        return;
      }

      contenido.innerHTML = `
        <div class="adm-tabs" id="tabs" role="tablist">
          ${[['todos', 'Todos'], ['borrador', 'Borradores'], ['publicado', 'Publicados'], ['cerrado', 'Cerrados']]
            .map(([id, texto]) => `<button class="adm-tab${this._filtro === id ? ' adm-tab--activo' : ''}" data-filtro="${id}" role="tab" aria-selected="${this._filtro === id}">${texto}</button>`)
            .join('')}
        </div>
        <input type="search" class="adm-buscador" id="buscar" placeholder="Buscar por título…" value="${esc(this._busqueda)}" aria-label="Buscar exámenes">
        <div id="lista" class="adm-lista"></div>`;

      contenido.querySelectorAll('#tabs .adm-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          this._filtro = btn.dataset.filtro;
          contenido.querySelectorAll('#tabs .adm-tab').forEach((b) => {
            b.classList.toggle('adm-tab--activo', b === btn);
            b.setAttribute('aria-selected', String(b === btn));
          });
          this._pintarLista();
        });
      });

      const buscar = contenido.querySelector('#buscar');
      buscar.addEventListener('input', () => {
        clearTimeout(this._timer);
        this._timer = setTimeout(() => {
          this._busqueda = buscar.value.trim().toLowerCase();
          this._pintarLista();
        }, 180);
      });

      this._pintarLista();
    },

    desmontar() {
      clearTimeout(this._timer);
      this._timer = null;
    },

    _pintarLista() {
      const lista = document.querySelector('#lista');
      if (!lista) return;

      const filtrados = this._examenes.filter((ex) => {
        if (this._filtro !== 'todos' && ex.estado !== this._filtro) return false;
        if (this._busqueda && !String(ex.titulo || '').toLowerCase().includes(this._busqueda)) return false;
        return true;
      });

      if (!filtrados.length) {
        lista.innerHTML = `<div class="adm-vacio">
          <p class="adm-vacio__titulo">${this._examenes.length ? 'Sin resultados' : 'Todavía no hay exámenes'}</p>
          <p>${this._examenes.length ? 'Prueba otro filtro o borra la búsqueda.' : 'Crea tu primer examen para empezar.'}</p>
        </div>`;
        return;
      }

      lista.innerHTML = filtrados.map((ex) => this._tarjeta(ex)).join('');
      lista.querySelectorAll('[data-accion]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const menu = btn.closest('details');
          if (menu) menu.open = false;
          this._accion(btn.dataset.accion, btn.dataset.id, btn.dataset.titulo);
        });
      });
    },

    _tarjeta(ex) {
      const estado = ESTADOS[ex.estado] || ESTADOS.borrador;
      const porCorregir = Number(ex.por_corregir) || 0;
      const numEnlaces = Number(ex.num_enlaces) || 0;
      const enlacesUsados = Number(ex.enlaces_usados) || 0;
      const meta = [
        (Number(ex.num_preguntas) || 0) + ' preguntas',
        (Number(ex.puntos_totales) || 0) + ' puntos',
        numEnlaces + ' compartidos · ' + enlacesUsados + ' usados',
        (Number(ex.num_entregas) || 0) + ' entregas'
      ];
      if (ex.nota_media != null) meta.push('media ' + window.panelUI.numero(ex.nota_media));

      const titulo = esc(ex.titulo);
      const estadoAccion = ex.estado === 'publicado'
        ? `<button class="adm-btn adm-btn--pequeno" type="button" data-accion="cerrar" data-id="${esc(ex.id)}">Cerrar examen</button>`
        : ex.estado === 'cerrado'
          ? `<button class="adm-btn adm-btn--pequeno" type="button" data-accion="publicar" data-id="${esc(ex.id)}">Reabrir examen</button>`
          : `<button class="adm-btn adm-btn--pequeno" type="button" data-accion="publicar" data-id="${esc(ex.id)}">Publicar</button>`;

      return `<article class="adm-fila adm-examen" aria-label="${titulo}">
        <div class="adm-fila__principal adm-examen__principal">
          <div class="adm-fila__titulo adm-examen__titulo">
            <h2>${titulo}</h2>
            <span class="adm-badge ${estado.clase}">${estado.texto}</span>
            ${porCorregir > 0 ? `<span class="adm-badge adm-badge--aviso">${porCorregir} por corregir</span>` : ''}
          </div>
          <div class="adm-fila__meta adm-examen__meta">
            ${meta.map((m) => `<span>${esc(m)}</span>`).join('')}
            <span>Actualizado ${esc(window.panelUI.tiempoRelativo(ex.actualizado_en || ex.creado_en))}</span>
          </div>
        </div>
        <div class="adm-fila__acciones adm-examen__acciones" aria-label="Acciones de ${titulo}">
          <div class="adm-examen__acciones-principales">
            <button class="adm-btn adm-btn--principal adm-btn--pequeno" type="button" data-accion="compartir" data-id="${esc(ex.id)}" data-titulo="${titulo}">Gestionar enlaces</button>
            <button class="adm-btn adm-btn--pequeno" type="button" data-accion="editar" data-id="${esc(ex.id)}">Editar</button>
            <button class="adm-btn adm-btn--pequeno" type="button" data-accion="entregas" data-id="${esc(ex.id)}">Entregas${porCorregir > 0 ? ` · ${porCorregir} por corregir` : ''}</button>
            ${estadoAccion}
          </div>
          <details class="adm-examen__mas">
            <summary class="adm-btn adm-btn--pequeno" aria-label="Más opciones para ${titulo}">Más opciones <span aria-hidden="true">▾</span></summary>
            <div class="adm-examen__menu" aria-label="Acciones adicionales">
              <button class="adm-btn adm-btn--pequeno" type="button" data-accion="duplicar" data-id="${esc(ex.id)}" data-titulo="${titulo}">Duplicar como borrador</button>
              <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button" data-accion="eliminar" data-id="${esc(ex.id)}" data-titulo="${titulo}">Eliminar examen</button>
            </div>
          </details>
        </div>
      </article>`;
    },

    async _accion(accion, id, titulo) {
      if (accion === 'editar') { router.navegar('/editor/' + id); return; }
      if (accion === 'entregas') { router.navegar('/corregir/' + id); return; }
      if (accion === 'compartir' || accion === 'compartir-individual') { await this._modalEnlaces(id, titulo); return; }

      if (accion === 'publicar') {
        const examen = this._examenes.find((item) => String(item.id) === String(id));
        const reabrir = examen && examen.estado === 'cerrado';
        const ok = await window.helpers.confirmar(
          reabrir
            ? 'El examen volverá a admitir entregas. Las respuestas y calificaciones anteriores se conservarán.'
            : 'Podrás enviar enlaces individuales y los alumnos podrán responder.',
          {
            titulo: reabrir ? '¿Reabrir este examen?' : '¿Publicar este examen?',
            textoConfirmar: reabrir ? 'Reabrir' : 'Publicar'
          }
        );
        if (!ok) return;
        const publicado = await this._ejecutar(() => window.plataformaRepository.cambiarEstado(id, 'publicado'), reabrir ? 'Examen reabierto.' : 'Examen publicado.');
        if (publicado && !reabrir) this._modalEnlaces(id, titulo);
        return;
      }

      if (accion === 'cerrar') {
        const ok = await window.helpers.confirmar(
          'Los alumnos ya no podrán entregar el examen. Las entregas recibidas se conservan.',
          { titulo: '¿Cerrar este examen?', textoConfirmar: 'Cerrar examen' }
        );
        if (!ok) return;
        await this._ejecutar(() => window.plataformaRepository.cambiarEstado(id, 'cerrado'), 'Examen cerrado.');
        return;
      }

      if (accion === 'duplicar') {
        const ok = await window.helpers.confirmar(
          `Se creará una copia de «${titulo}» como borrador. No se copian los enlaces ni las entregas.`,
          { titulo: '¿Duplicar examen?', textoConfirmar: 'Duplicar' }
        );
        if (!ok) return;
        await this._ejecutar(async () => {
          const original = await window.examenesRepository.obtener(id);
          if (!original) throw new Error('No se pudo cargar el examen original.');
          const copia = {
            grupo_id: original.grupo_id,
            creado_por: original.creado_por,
            titulo: 'Copia de ' + (original.titulo || 'examen'),
            descripcion: original.descripcion || '',
            preguntas: original.preguntas || [],
            puntos_totales: original.puntos_totales || 0,
            estado: 'borrador',
            publicado: false,
            config: original.config || {}
          };
          await window.examenesRepository.guardar(copia);
        }, 'Examen duplicado como borrador.');
        return;
      }

      if (accion === 'eliminar') {
        const ok = await window.helpers.confirmar(
          `Se eliminará «${titulo}», sus enlaces y todas sus entregas. Esta acción no se puede deshacer.`,
          { titulo: '¿Eliminar examen?', textoConfirmar: 'Eliminar' }
        );
        if (!ok) return;
        await this._ejecutar(() => window.examenesRepository.eliminar(id), 'Examen eliminado.');
      }
    },

    async _ejecutar(operacion, mensajeExito) {
      try {
        await operacion();
        window.helpers.mostrarAlerta(mensajeExito, 'exito');
        router._ejecutar();
        return true;
      } catch (e) {
        window.helpers.mostrarAlerta('Error: ' + e.message, 'error');
        return false;
      }
    },

    // ── Enlaces individuales ─────────────────────────────────────────────
    async _modalEnlaces(examenId, titulo) {
      const modal = window.panelUI.modal({
        titulo: 'Enlaces de «' + titulo + '»',
        cuerpoHtml: `<p class="adm-cabecera__sub">Cada enlace es individual y de un solo uso.</p>
          <div class="adm-campo">
            <label class="adm-campo__etiqueta" for="listaAlumnos">Añadir alumnos</label>
            <textarea class="adm-entrada" id="listaAlumnos" placeholder="Un alumno por línea&#10;Ana Pérez&#10;Luis Gómez, 3º B"></textarea>
            <p class="adm-campo__ayuda">Puedes escribir «Nombre, Grupo». El grupo es opcional.</p>
          </div>
          <div id="errorEnlaces" class="adm-aviso adm-aviso--error" hidden></div>
          <div id="listaEnlaces"><p class="adm-cabecera__sub">Cargando enlaces…</p></div>`,
        pieHtml: `<button class="adm-btn" data-rol="cerrar" type="button">Cerrar</button>
          <button class="adm-btn adm-btn--principal" id="btnGenerar" type="button">Generar enlaces</button>`
      });

      modal.pie.querySelector('[data-rol="cerrar"]').addEventListener('click', modal.cerrar);

      const error = modal.cuerpo.querySelector('#errorEnlaces');
      const btnGenerar = modal.pie.querySelector('#btnGenerar');

      const recargar = async () => {
        const contenedor = modal.cuerpo.querySelector('#listaEnlaces');
        try {
          const enlaces = await window.plataformaRepository.listarEnlaces(examenId);
          contenedor.innerHTML = this._htmlEnlaces(enlaces, titulo);
          contenedor.querySelectorAll('[data-enlace-accion]').forEach((btn) => {
            btn.addEventListener('click', () => this._accionEnlace(btn, enlaces, examenId, titulo, recargar));
          });
        } catch (e) {
          contenedor.innerHTML = `<div class="adm-aviso adm-aviso--error">${esc(e.message)}</div>`;
        }
      };

      btnGenerar.addEventListener('click', async () => {
        const area = modal.cuerpo.querySelector('#listaAlumnos');
        const alumnos = area.value.split('\n')
          .map((linea) => linea.trim())
          .filter(Boolean)
          .map((linea) => {
            const [nombre, ...resto] = linea.split(',');
            return { nombre: nombre.trim(), grupo: resto.join(',').trim() };
          })
          .filter((a) => a.nombre);

        error.hidden = true;
        if (!alumnos.length) {
          error.textContent = 'Escribe al menos un nombre (uno por línea).';
          error.hidden = false;
          return;
        }
        btnGenerar.disabled = true;
        btnGenerar.textContent = 'Generando…';
        try {
          await window.plataformaRepository.crearEnlaces(examenId, alumnos);
          area.value = '';
          await recargar();
          window.helpers.mostrarAlerta(alumnos.length + ' enlace(s) generado(s).', 'exito');
        } catch (e) {
          error.textContent = e.message;
          error.hidden = false;
        } finally {
          btnGenerar.disabled = false;
          btnGenerar.textContent = 'Generar enlaces';
        }
      });

      await recargar();
    },

    _htmlEnlaces(enlaces, titulo) {
      if (!enlaces || !enlaces.length) {
        return `<div class="adm-vacio"><p class="adm-vacio__titulo">Sin enlaces todavía</p>
          <p>Escribe los nombres arriba y pulsa «Generar enlaces».</p></div>`;
      }
      const usados = enlaces.filter((e) => e.usado).length;
      return `<div class="adm-seccion__titulo">${enlaces.length} enlace(s) · ${usados} usado(s)</div>
        <div class="adm-bloque" style="margin-bottom:0">
          ${enlaces.map((enlace) => `
            <div class="adm-enlace">
              <span class="adm-enlace__nombre">${esc(enlace.nombre_alumno)}
                ${enlace.grupo_alumno ? `<span class="adm-enlace__grupo">· ${esc(enlace.grupo_alumno)}</span>` : ''}
                ${enlace.usado ? '<span class="adm-badge adm-badge--exito">Entregado</span>' : '<span class="adm-badge adm-badge--borrador">Pendiente</span>'}
              </span>
              <span class="adm-enlace__url" title="${esc(window.plataformaRepository.urlEnlace(enlace.token))}">${esc(window.plataformaRepository.urlEnlace(enlace.token))}</span>
              <span class="adm-enlace__acciones">
                <button class="adm-btn adm-btn--pequeno" type="button" data-enlace-accion="copiar" data-token="${esc(enlace.token)}">Copiar</button>
                <button class="adm-btn adm-btn--pequeno" type="button" data-enlace-accion="whatsapp" data-token="${esc(enlace.token)}" data-nombre="${esc(enlace.nombre_alumno)}">WhatsApp</button>
                <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button" data-enlace-accion="borrar" data-id="${esc(enlace.id)}">Borrar</button>
              </span>
            </div>`).join('')}
        </div>`;
    },

    async _accionEnlace(btn, enlaces, examenId, titulo, recargar) {
      const accion = btn.dataset.enlaceAccion;
      const enlace = enlaces.find((e) => e.token === btn.dataset.token || e.id === btn.dataset.id);

      if (accion === 'copiar') {
        const url = window.plataformaRepository.urlEnlace(btn.dataset.token);
        const ok = await window.plataformaRepository.copiar(url);
        window.helpers.mostrarAlerta(ok ? 'Enlace copiado.' : 'No se pudo copiar. Selecciona la URL manualmente.', ok ? 'exito' : 'error');
        return;
      }

      if (accion === 'whatsapp' && enlace) {
        window.plataformaRepository.abrirWhatsApp(window.plataformaRepository.mensajeWhatsApp(enlace, titulo));
        return;
      }

      if (accion === 'borrar') {
        const ok = await window.helpers.confirmar('Se eliminará este enlace. Si ya tiene una entrega, el servidor lo impedirá.', {
          titulo: '¿Borrar enlace?', textoConfirmar: 'Borrar'
        });
        if (!ok) return;
        try {
          await window.plataformaRepository.eliminarEnlace(btn.dataset.id);
          await recargar();
          window.helpers.mostrarAlerta('Enlace eliminado.', 'exito');
        } catch (e) {
          window.helpers.mostrarAlerta(e.message, 'error');
        }
      }
    }
  };
})();
