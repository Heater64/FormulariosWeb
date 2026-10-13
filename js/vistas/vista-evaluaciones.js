/* ============================================================================
 * js/vistas/vista-evaluaciones.js — Sección Evaluaciones (listado)
 * ----------------------------------------------------------------------------
 * Agrupa varios exámenes en una evaluación ("1ª Evaluación") para ver las
 * notas de cada alumno en una rejilla. Esta vista lista las evaluaciones del
 * profesor y permite crearlas; la rejilla vive en vista-evaluacion-editar.js.
 *
 * Datos: RPCs de la migración 060 (fb_evaluacion*), transportadas por
 * plataformaRepository. Nada de esto toca el flujo del alumno público.
 * ==========================================================================*/
(function () {
  'use strict';

  const ROLES = ['admin', 'editor', 'owner'];
  const esc = (v) => window.panelUI.esc(v);
  const I = (n) => window.Iconos ? window.Iconos.render(n) : '';

  function esAdmin() {
    const usuario = store.obtener('usuario');
    return usuario && ROLES.includes((usuario.rol || '').toLowerCase());
  }

  window.vistaEvaluaciones = {
    _lista: [],

    async montar(raiz) {
      if (!esAdmin()) {
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta sección es solo para el administrador.</div></div>`;
        return;
      }

      raiz.innerHTML = `<div class="o-contenedor" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
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
        <div id="contenido"><p class="adm-cabecera__sub">Cargando…</p></div>
      </div>`;

      raiz.querySelector('#btnNueva').addEventListener('click', () => this._modalCrear(raiz));
      const contenido = raiz.querySelector('#contenido');

      try {
        this._lista = (await window.plataformaRepository.listarEvaluaciones()) || [];
      } catch (e) {
        contenido.innerHTML = `<div class="adm-aviso adm-aviso--error">No se pudieron cargar las evaluaciones: ${esc(e.message)}</div>`;
        if (window.Iconos) window.Iconos.actualizar();
        return;
      }

      // Estado de búsqueda (como en exámenes).
      this._busqueda = '';
      this._timer = null;

      // Si el usuario navegó mientras cargaba, no pintar sobre el DOM viejo.
      if (!contenido.isConnected) return;
      this._pintarLista(contenido);
      if (window.Iconos) window.Iconos.actualizar();
    },

    desmontar() {
      clearTimeout(this._timer);
      this._timer = null;
    },

    _pintarLista(contenido) {
      if (!this._lista.length) {
        contenido.innerHTML = `<div class="adm-vacio">
          <p class="adm-vacio__titulo">Todavía no hay evaluaciones</p>
          <p>Crea la primera (por ejemplo, «1ª Evaluación») y añadele tus exámenes como columnas, o importa tu Excel: la tabla se copia del archivo.</p>
        </div>`;
        return;
      }

      contenido.innerHTML = `
        <div class="adm-busqueda-wrap">
          <span class="admin-buscar__icono" aria-hidden="true">${I('search')}</span>
          <input type="search" class="adm-buscador" id="buscar" placeholder="Buscar por título…" value="${esc(this._busqueda)}" aria-label="Buscar evaluaciones">
        </div>
        <div class="adm-lista">${this._lista.filter((ev) => !this._busqueda || String(ev.titulo || '').toLowerCase().includes(this._busqueda)).map((ev) => {
        const meta = [];
        if (ev.fecha) meta.push(window.panelUI.fechaCorta(ev.fecha));
        meta.push((Number(ev.num_columnas) || 0) + ' columna(s)');
        meta.push((Number(ev.num_alumnos) || 0) + ' alumno(s)');
        return `<div class="adm-fila">
          <div class="adm-fila__principal">
            <div class="adm-fila__titulo">${esc(ev.titulo)}</div>
            <div class="adm-fila__meta">${meta.map((m) => `<span>${esc(m)}</span>`).join('')}</div>
            ${ev.descripcion ? `<div class="adm-fila__meta"><span>${esc(ev.descripcion)}</span></div>` : ''}
          </div>
          <div class="adm-fila__acciones">
            <button class="adm-btn adm-btn--principal adm-btn--pequeno" data-abrir="${esc(ev.id)}">${window.Iconos.render('table-2')} Abrir</button>
            <button class="adm-btn adm-btn--pequeno" data-editar="${esc(ev.id)}">${window.Iconos.render('edit-3')} Editar</button>
            <button class="adm-btn adm-btn--peligro adm-btn--pequeno" data-eliminar="${esc(ev.id)}">${window.Iconos.render('trash-2')} Eliminar</button>
          </div>
        </div>`;
      }).join('')}</div>`;

      const buscar = contenido.querySelector('#buscar');
      if (buscar) {
        buscar.addEventListener('input', () => {
          clearTimeout(this._timer);
          this._timer = setTimeout(() => {
            this._busqueda = buscar.value.trim().toLowerCase();
            this._pintarLista(contenido);
          }, 180);
        });
      }

      contenido.querySelectorAll('[data-abrir]').forEach((btn) => {
        btn.addEventListener('click', () => router.navegar('/evaluaciones/' + btn.dataset.abrir));
      });
      contenido.querySelectorAll('[data-editar]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const ev = this._lista.find((x) => x.id === btn.dataset.editar);
          if (ev) this._modalEditar(ev);
        });
      });
      contenido.querySelectorAll('[data-eliminar]').forEach((btn) => {
        btn.addEventListener('click', () => this._eliminar(btn.dataset.eliminar));
      });
      if (window.Iconos) window.Iconos.actualizar();
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
      const ev = this._lista.find((x) => x.id === id);
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
