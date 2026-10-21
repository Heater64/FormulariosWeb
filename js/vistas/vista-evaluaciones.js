/* ============================================================================
 * js/vistas/vista-evaluaciones.js — Sección Evaluaciones (listado)
 * ----------------------------------------------------------------------------
 * Agrupa varios exámenes en una evaluación ("1ª Evaluación") para ver las
 * notas de cada alumno en una rejilla. Esta vista lista las evaluaciones del
 * profesor y permite crearlas; la rejilla vive en vista-evaluacion-editar.js.
 *
 * El listado es un archivo de hojas de notas, con la misma ficha que la cola
 * de exámenes (_examenes-panel.css, ámbito .ex-vista): medallón con el estado
 * de la hoja, datos con icono, descripción a una línea y acciones ordenadas
 * (Abrir + menú). Lo que aún no tiene columnas se separa arriba porque es lo
 * único que pide trabajo antes de poder usarse.
 *
 * Datos: RPCs de la migración 060 (fb_evaluacion*), transportadas por
 * plataformaRepository. Nada de esto toca el flujo del alumno público.
 * ==========================================================================*/
(function () {
  'use strict';

  const ROLES = ['admin', 'editor', 'owner'];
  const esc = (v) => window.panelUI.esc(v);
  const I = (n) => window.Iconos ? window.Iconos.render(n) : '';
  // «0 columna(s)» delataba el contador escrito a mano.
  const plural = (n, singular, plurales) => `${n} ${n === 1 ? singular : plurales}`;

  function esAdmin() {
    const usuario = store.obtener('usuario');
    return usuario && ROLES.includes((usuario.rol || '').toLowerCase());
  }

  /**
   * Estado de la hoja, deducido de lo que ya devuelve el RPC:
   *  - sin columnas: no hay nada que rellenar, es lo único que exige acción;
   *  - sin notas: preparada pero nadie tiene nota todavía;
   *  - con notas: en uso.
   */
  function estadoDe(ev) {
    const columnas = Number(ev.num_columnas) || 0;
    const alumnos = Number(ev.num_alumnos) || 0;
    if (!columnas) {
      return { clave: 'sin-columnas', texto: 'Sin columnas', clase: 'adm-badge--aviso', icono: 'columns-3', atencion: true };
    }
    if (!alumnos) {
      return { clave: 'sin-notas', texto: 'Sin notas', clase: 'adm-badge--borrador', icono: 'table-2', atencion: false };
    }
    return { clave: 'con-notas', texto: 'Con notas', clase: 'adm-badge--exito', icono: 'table-2', atencion: false };
  }

  window.vistaEvaluaciones = {
    _lista: [],
    _busqueda: '',
    _timer: null,

    async montar(raiz) {
      if (!esAdmin()) {
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta sección es solo para el administrador.</div></div>`;
        return;
      }

      // `ex-vista` es el ámbito de la ficha compartida: el mismo medallón,
      // los mismos metadatos y las mismas acciones que en Exámenes.
      raiz.innerHTML = `<div class="o-contenedor vista-evaluaciones ex-vista">
        <header class="adm-cabecera">
          <span class="adm-cabecera__icono" aria-hidden="true">${window.Iconos.render('clipboard-list')}</span>
          <div class="adm-cabecera__principal">
            <h1 class="adm-cabecera__titulo">Evaluaciones</h1>
            <p class="adm-cabecera__sub">Agrupa exámenes en una evaluación y consulta las notas de tus alumnos en una sola tabla.</p>
          </div>
          <div class="adm-cabecera__acciones">
            <button class="adm-btn adm-btn--principal" id="btnNueva">${window.Iconos.render('plus')} Añadir evaluación</button>
          </div>
        </header>
        <div id="contenido"></div>
      </div>`;

      raiz.querySelector('#btnNueva').addEventListener('click', () => this._modalCrear(raiz));
      const contenido = raiz.querySelector('#contenido');
      // Misma rejilla que el listado final: fichas con medallón y acciones.
      if (window.skeleton) {
        window.skeleton.mostrar(contenido, window.skeleton.filas(4, { medallon: true }), 'Cargando las evaluaciones');
      }

      try {
        this._lista = (await window.plataformaRepository.listarEvaluaciones()) || [];
      } catch (e) {
        contenido.innerHTML = `<div class="adm-aviso adm-aviso--error">No se pudieron cargar las evaluaciones: ${esc(e.message)}</div>`;
        if (window.Iconos) window.Iconos.actualizar();
        return;
      }

      this._busqueda = '';
      clearTimeout(this._timer);
      this._timer = null;

      // Si el usuario navegó mientras cargaba, no pintar sobre el DOM viejo.
      if (!contenido.isConnected) return;
      this._pintarLista(contenido, raiz);
      if (window.Iconos) window.Iconos.actualizar();
    },

    desmontar() {
      clearTimeout(this._timer);
      this._timer = null;
    },

    _pintarLista(contenido, raiz) {
      if (!this._lista.length) {
        contenido.innerHTML = this._htmlVacio();
        this._conectar(contenido, raiz);
        if (window.Iconos) window.Iconos.actualizar();
        return;
      }

      const visibles = this._lista.filter((ev) => !this._busqueda
        || String(ev.titulo || '').toLowerCase().includes(this._busqueda));

      contenido.innerHTML = `
        <div class="ex-barra">
          <p class="ex-barra__resumen">
            ${I('table-2')}
            <span><strong>${visibles.length}</strong> ${visibles.length === 1 ? 'evaluación' : 'evaluaciones'}${this._busqueda ? ` de ${this._lista.length}` : ''}</span>
          </p>
          <div class="adm-busqueda-wrap ex-busqueda">
            <span class="admin-buscar__icono" aria-hidden="true">${I('search')}</span>
            <input type="search" class="adm-buscador" id="buscar" placeholder="Buscar por título…" value="${esc(this._busqueda)}" aria-label="Buscar evaluaciones">
          </div>
        </div>
        <div id="listaEvaluaciones">${visibles.length ? this._htmlGrupos(visibles) : this._htmlSinResultados()}</div>`;

      this._conectar(contenido, raiz);
      if (window.Iconos) window.Iconos.actualizar();
    },

    /**
     * Con búsqueda activa manda lo que el profesor escribió: una lista plana.
     * Sin búsqueda, lo que todavía no tiene columnas va arriba, separado del
     * archivo, porque es lo único que pide trabajo.
     */
    _htmlGrupos(visibles) {
      const sinConfigurar = !this._busqueda
        ? visibles.filter((ev) => !Number(ev.num_columnas))
        : [];
      if (!sinConfigurar.length) {
        return `<div class="adm-lista">${visibles.map((ev) => this._tarjeta(ev)).join('')}</div>`;
      }

      const pendientes = new Set(sinConfigurar.map((ev) => String(ev.id)));
      const resto = visibles.filter((ev) => !pendientes.has(String(ev.id)));
      const grupos = [
        { clave: 'sin-configurar', titulo: 'Sin configurar', icono: 'columns-3', evaluaciones: sinConfigurar },
        { clave: 'archivo', titulo: 'Todas las evaluaciones', icono: 'table-2', evaluaciones: resto }
      ].filter((grupo) => grupo.evaluaciones.length);

      return grupos.map((grupo) => `<section class="ex-grupo ex-grupo--${grupo.clave}${grupo.clave === 'sin-configurar' ? ' ex-grupo--atencion' : ''}" aria-label="${grupo.titulo} (${grupo.evaluaciones.length})">
        <p class="ex-grupo__titulo">
          <span class="ex-grupo__icono" aria-hidden="true">${I(grupo.icono)}</span>
          ${grupo.titulo}
          <span class="ex-grupo__cuenta">${grupo.evaluaciones.length}</span>
        </p>
        <div class="adm-lista">${grupo.evaluaciones.map((ev) => this._tarjeta(ev)).join('')}</div>
      </section>`).join('');
    },

    /** Una ficha = estado + qué es + qué contiene + qué puedo hacer. */
    _tarjeta(ev) {
      const estado = estadoDe(ev);
      const columnas = Number(ev.num_columnas) || 0;
      const alumnos = Number(ev.num_alumnos) || 0;
      const titulo = esc(ev.titulo);
      const fecha = ev.fecha ? window.panelUI.fechaCorta(ev.fecha) : '';
      const actualizada = ev.actualizado_en
        ? `Actualizada ${esc(window.panelUI.tiempoRelativo(ev.actualizado_en))}`
        : '';

      const datos = [
        `<span class="ex-ficha__dato">${I('columns-3')}${plural(columnas, 'columna', 'columnas')}</span>`,
        `<span class="ex-ficha__dato">${I('users')}${plural(alumnos, 'alumno', 'alumnos')}</span>`
      ];
      if (fecha) datos.push(`<span class="ex-ficha__dato">${I('calendar')}${esc(fecha)}</span>`);

      return `<article class="adm-fila adm-evaluacion" data-estado="${estado.clave}"${estado.atencion ? ' data-atencion="1"' : ''} aria-label="${titulo}">
        <span class="ex-ficha__marca" aria-hidden="true">${I(estado.icono)}</span>
        <div class="ex-ficha__cuerpo">
          <div class="ex-ficha__titulo">
            <h2>${titulo}</h2>
            <span class="adm-badge ${estado.clase}">${estado.texto}</span>
          </div>
          <div class="ex-ficha__meta">${datos.join('')}</div>
          ${ev.descripcion ? `<p class="ex-ficha__descripcion">${esc(ev.descripcion)}</p>` : ''}
          ${actualizada ? `<div class="ex-ficha__pie"><span>${I('clock')}${actualizada}</span></div>` : ''}
        </div>
        <div class="ex-ficha__acciones">
          <div class="adm-examen__acciones-principales">
            <button class="adm-btn adm-btn--pequeno ex-boton-suave" type="button" data-abrir="${esc(ev.id)}">${I('table-2')} Abrir</button>
          </div>
          <details class="adm-examen__mas">
            <summary class="adm-btn adm-btn--pequeno ex-boton-fantasma" aria-label="Más opciones para ${titulo}">${I('more-horizontal')} Más ${I('chevron-down')}</summary>
            <div class="adm-examen__menu" aria-label="Acciones adicionales">
              <button class="adm-btn adm-btn--pequeno" type="button" data-editar="${esc(ev.id)}">${I('edit-3')} Editar datos</button>
              <button class="adm-btn adm-btn--pequeno adm-btn--peligro" type="button" data-eliminar="${esc(ev.id)}">${I('trash-2')} Eliminar evaluación</button>
            </div>
          </details>
        </div>
      </article>`;
    },

    /** Estado vacío con una salida real: crear la primera evaluación. */
    _htmlVacio() {
      return `<div class="adm-vacio ex-vacio">
        <span class="ex-vacio__icono" aria-hidden="true">${I('table-2')}</span>
        <p class="adm-vacio__titulo">Tu primera evaluación empieza aquí</p>
        <p>Crea una (por ejemplo, «1ª Evaluación») y añade tus exámenes como columnas. También puedes importar tu Excel: la tabla se copia del archivo.</p>
        <button class="adm-btn adm-btn--principal" type="button" data-crear>${I('plus')} Añadir evaluación</button>
      </div>`;
    },

    _htmlSinResultados() {
      return `<div class="adm-vacio ex-vacio">
        <span class="ex-vacio__icono" aria-hidden="true">${I('search')}</span>
        <p class="adm-vacio__titulo">Sin resultados para «${esc(this._busqueda)}»</p>
        <p>Ninguna evaluación coincide con esa búsqueda. Prueba con otra palabra o vuelve a la lista completa.</p>
        <button class="adm-btn" type="button" data-limpiar>${I('x')} Limpiar búsqueda</button>
      </div>`;
    },

    _conectar(contenido, raiz) {
      const buscar = contenido.querySelector('#buscar');
      if (buscar) {
        buscar.addEventListener('input', () => {
          clearTimeout(this._timer);
          this._timer = setTimeout(() => {
            this._busqueda = buscar.value.trim().toLowerCase();
            this._pintarLista(contenido, raiz);
            // Devolver el foco al buscador: el input se repinta con la lista.
            const deNuevo = contenido.querySelector('#buscar');
            if (deNuevo) {
              deNuevo.focus();
              deNuevo.setSelectionRange(deNuevo.value.length, deNuevo.value.length);
            }
          }, 180);
        });
      }

      const crear = contenido.querySelector('[data-crear]');
      if (crear) crear.addEventListener('click', () => this._modalCrear(raiz));

      const limpiar = contenido.querySelector('[data-limpiar]');
      if (limpiar) {
        limpiar.addEventListener('click', () => {
          this._busqueda = '';
          this._pintarLista(contenido, raiz);
          const deNuevo = contenido.querySelector('#buscar');
          if (deNuevo) deNuevo.focus();
        });
      }

      contenido.querySelectorAll('[data-abrir]').forEach((btn) => {
        btn.addEventListener('click', () => router.navegar('/evaluaciones/' + btn.dataset.abrir));
      });
      contenido.querySelectorAll('[data-editar]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this._cerrarMenu(btn);
          const ev = this._lista.find((x) => String(x.id) === String(btn.dataset.editar));
          if (ev) this._modalEditar(ev);
        });
      });
      contenido.querySelectorAll('[data-eliminar]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this._cerrarMenu(btn);
          this._eliminar(btn.dataset.eliminar);
        });
      });

      // El desplegable flota sobre las fichas siguientes; si al abrirse no cabe
      // en la ventana (última evaluación de la lista), se abre hacia arriba.
      contenido.querySelectorAll('details.adm-examen__mas').forEach((menu) => {
        menu.addEventListener('toggle', () => {
          if (!menu.open) { menu.classList.remove('adm-examen__mas--arriba'); return; }
          const panel = menu.querySelector('.adm-examen__menu');
          if (!panel) return;
          if (window.getComputedStyle(panel).position !== 'absolute') return;
          menu.classList.remove('adm-examen__mas--arriba');
          if (panel.getBoundingClientRect().bottom > window.innerHeight - 8) {
            menu.classList.add('adm-examen__mas--arriba');
          }
        });
      });
    },

    _cerrarMenu(btn) {
      const menu = btn.closest('details');
      if (menu) menu.open = false;
    },

    /** Alta y edición comparten el mismo formulario modal. */
    _formHtml(ev) {
      const valor = (v) => esc(v == null ? '' : String(v));
      return `<div class="adm-aviso adm-aviso--error" id="errorEvaluacion" hidden></div>
        <div class="adm-campo">
          <label class="adm-campo__etiqueta" for="evNombre">Nombre *</label>
          <input class="adm-entrada" id="evNombre" maxlength="160" placeholder="1ª Evaluación" value="${valor(ev && ev.titulo)}">
        </div>
        <div class="adm-campo">
          <label class="adm-campo__etiqueta" for="evDescripcion">Descripción (opcional)</label>
          <textarea class="adm-entrada" id="evDescripcion" maxlength="2000" rows="2">${valor(ev && ev.descripcion)}</textarea>
        </div>
        <div class="adm-campo">
          <label class="adm-campo__etiqueta" for="evFecha">Fecha (opcional)</label>
          <input class="adm-entrada" id="evFecha" type="date" value="${valor(ev && ev.fecha ? String(ev.fecha).slice(0, 10) : '')}">
        </div>`;
    },

    _leerForm(cuerpo) {
      const nombre = (cuerpo.querySelector('#evNombre').value || '').trim();
      if (!nombre) return { error: 'La evaluación necesita nombre.' };
      return {
        nombre,
        descripcion: cuerpo.querySelector('#evDescripcion').value || '',
        fecha: cuerpo.querySelector('#evFecha').value || null
      };
    },

    _modalCrear(raiz) {
      const modal = window.panelUI.modal({
        titulo: 'Añadir evaluación',
        cuerpoHtml: this._formHtml(null),
        pieHtml: `<button class="adm-btn" type="button" data-rol="cerrar">Cancelar</button>
          <button class="adm-btn adm-btn--principal" type="button" id="btnCrearEvaluacion">Crear evaluación</button>`
      });
      modal.pie.querySelector('[data-rol="cerrar"]').addEventListener('click', modal.cerrar);
      modal.pie.querySelector('#btnCrearEvaluacion').addEventListener('click', async () => {
        const datos = this._leerForm(modal.cuerpo);
        const error = modal.cuerpo.querySelector('#errorEvaluacion');
        if (datos.error) { error.textContent = datos.error; error.hidden = false; return; }
        const boton = modal.pie.querySelector('#btnCrearEvaluacion');
        boton.disabled = true;
        try {
          const creada = await window.plataformaRepository.crearEvaluacion(datos.nombre, datos.descripcion, datos.fecha);
          modal.cerrar();
          window.helpers.mostrarAlerta('Evaluación creada. Añade columnas o importa tu Excel: la rejilla se copia del archivo.', 'exito');
          router.navegar('/evaluaciones/' + (creada && creada.id));
        } catch (e) {
          error.textContent = e.message;
          error.hidden = false;
          boton.disabled = false;
        }
      });
    },

    _modalEditar(ev) {
      const modal = window.panelUI.modal({
        titulo: 'Editar datos de la evaluación',
        cuerpoHtml: this._formHtml(ev),
        pieHtml: `<button class="adm-btn" type="button" data-rol="cerrar">Cancelar</button>
          <button class="adm-btn adm-btn--principal" type="button" id="btnGuardarEvaluacion">Guardar</button>`
      });
      modal.pie.querySelector('[data-rol="cerrar"]').addEventListener('click', modal.cerrar);
      modal.pie.querySelector('#btnGuardarEvaluacion').addEventListener('click', async () => {
        const datos = this._leerForm(modal.cuerpo);
        const error = modal.cuerpo.querySelector('#errorEvaluacion');
        if (datos.error) { error.textContent = datos.error; error.hidden = false; return; }
        const boton = modal.pie.querySelector('#btnGuardarEvaluacion');
        boton.disabled = true;
        try {
          await window.plataformaRepository.actualizarEvaluacion(ev.id, datos.nombre, datos.descripcion, datos.fecha);
          modal.cerrar();
          window.helpers.mostrarAlerta('Datos guardados.', 'exito');
          const raiz = document.querySelector('#app-root');
          if (raiz && router.pathActual() === '/evaluaciones') await this.montar(raiz);
        } catch (e) {
          error.textContent = e.message;
          error.hidden = false;
          boton.disabled = false;
        }
      });
    },

    async _eliminar(id) {
      const ev = this._lista.find((x) => String(x.id) === String(id));
      const ok = await window.helpers.confirmar(
        '¿Eliminar «' + (ev ? ev.titulo : 'esta evaluación') + '»? Se borran también sus columnas y notas manuales.',
        { titulo: 'Eliminar evaluación', textoConfirmar: 'Eliminar' }
      );
      if (!ok) return;
      try {
        await window.plataformaRepository.eliminarEvaluacion(id);
        window.helpers.mostrarAlerta('Evaluación eliminada.', 'exito');
        const raiz = document.querySelector('#app-root');
        if (raiz) await this.montar(raiz);
      } catch (e) {
        window.helpers.mostrarAlerta('No se pudo eliminar: ' + e.message, 'error');
      }
    }
  };
})();
