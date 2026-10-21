/* ============================================================================
 * js/vistas/vista-entregas.js — Entregas y corrección
 * ----------------------------------------------------------------------------
 * Dos rutas:
 *   · /entregas      → qué exámenes tienen entregas y cuántas quedan por corregir.
 *   · /corregir/:id  → listado de entregas de un examen y corrección manual de
 *                      las respuestas escritas.
 *
 * Los tests los califica el servidor al entregar; aquí solo se muestran. Las
 * respuestas escritas se deciden una a una y la nota final la sella el servidor
 * en `fb_corregir_entrega`, que rechaza cerrar mientras quede algo sin decidir.
 * ==========================================================================*/
(function () {
  'use strict';

  const ROLES = ['admin', 'editor', 'owner'];
  const esc = (v) => window.panelUI.esc(v);
  const I = (nombre) => (window.Iconos ? window.Iconos.render(nombre) : '');

  const plural = (n, singular, plurales) => `${n} ${n === 1 ? singular : plurales}`;

  /** Iniciales de un nombre para el avatar del detalle («Ana Pérez» → AP). */
  function iniciales(nombre) {
    const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    const primera = partes[0].charAt(0);
    const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : partes[0].charAt(1);
    return (primera + (ultima || '')).toUpperCase();
  }

  function esAdmin() {
    const usuario = store.obtener('usuario');
    return usuario && ROLES.includes((usuario.rol || '').toLowerCase());
  }

  function estadoBadge(entrega) {
    if (entrega.corregido) return '<span class="adm-badge adm-badge--exito">Calificada</span>';
    if (entrega.estado === 'en_progreso') return '<span class="adm-badge adm-badge--borrador">Sin entregar</span>';
    // Una entrega completada sin corregir es trabajo pendiente aunque el
    // servidor no haya contado aún respuestas escritas que decidir.
    const pendientes = Number(entrega.pendientes_correccion) || 0;
    return pendientes > 0
      ? `<span class="adm-badge adm-badge--aviso">${pendientes} por corregir</span>`
      : '<span class="adm-badge adm-badge--aviso">Por corregir</span>';
  }

  window.vistaEntregas = {
    _examenId: null,
    _entregas: [],
    _alumnos: [],
    _examenTitulo: '',

    async montar(raiz, params) {
      if (!esAdmin()) {
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><div class="adm-aviso adm-aviso--error">Esta sección es solo para el administrador.</div></div>`;
        return;
      }
      this._examenId = (params && params.id) || null;
      this._examenTitulo = '';
      if (this._examenId) await this._pintarExamen(raiz);
      else await this._pintarListado(raiz);
    },

    // ── Listado general (/entregas) ───────────────────────────────────────
    async _pintarListado(raiz) {
      raiz.innerHTML = `<div class="o-contenedor vista-entregas ex-vista">
        <header class="adm-cabecera">
          <span class="adm-cabecera__icono" aria-hidden="true">${window.Iconos.render('inbox')}</span>
          <div class="adm-cabecera__principal">
            <h1 class="adm-cabecera__titulo">Entregas</h1>
            <p class="adm-cabecera__sub">Revisa quién ha respondido, quién falta y qué queda por corregir en cada examen.</p>
          </div>
        </header>
        <div id="contenido"></div>
      </div>`;

      const contenido = raiz.querySelector('#contenido');
      if (window.skeleton) window.skeleton.mostrar(contenido, window.skeleton.filas(5), 'Cargando las entregas');
      // La lista de usuarios es independiente del resumen: se pide a la vez.
      const usuariosP = window.adminRepository.listarUsuarios().catch(() => null);
      let examenes = [];
      try {
        const datos = await window.plataformaRepository.resumen();
        examenes = (datos && datos.examenes) || [];
      } catch (e) {
        contenido.innerHTML = `<div class="adm-aviso adm-aviso--error">No se pudieron cargar las entregas: ${esc(e.message)}</div>`;
        return;
      }

      const conEntregas = examenes.filter((ex) => Number(ex.num_entregas) > 0);
      // Seguimiento de la clase: exámenes ofrecidos que nadie ha entregado
      // todavía. Solo publicado/cerrado: un borrador nunca se ofreció.
      let numAlumnosClase = null;
      try {
        const usuariosClase = await usuariosP || [];
        numAlumnosClase = usuariosClase.filter((u) => u.rol === 'usuario' && u.activo !== false).length;
      } catch (e) { numAlumnosClase = null; }
      const sinEntregas = examenes.filter((ex) => Number(ex.num_entregas) === 0 && (ex.estado === 'publicado' || ex.estado === 'cerrado'));
      if (!conEntregas.length && !sinEntregas.length) {
        contenido.innerHTML = `<div class="adm-vacio ex-vacio">
          <span class="ex-vacio__icono" aria-hidden="true">${window.Iconos.render('inbox')}</span>
          <p class="adm-vacio__titulo">Todavía no hay entregas</p>
          <p>Publica un examen y comparte los enlaces con tus alumnos. Aquí verás quién ha respondido y qué queda por corregir.</p>
          <button class="adm-btn adm-btn--principal" type="button" data-ir-examenes>${window.Iconos.render('clipboard-list')} Ir a Mis exámenes</button>
        </div>`;
        const irExamenes = contenido.querySelector('[data-ir-examenes]');
        if (irExamenes) irExamenes.addEventListener('click', () => router.navegar('/examenes'));
        if (window.Iconos) window.Iconos.actualizar();
        return;
      }

      const metaSinEntregas = numAlumnosClase == null || numAlumnosClase === 0
        ? 'Nadie ha entregado aún'
        : `${plural(numAlumnosClase, 'alumno', 'alumnos')} en clase · faltan todos`;

      // La cola se ordena por urgencia: primero lo que espera corrección, luego
      // lo que ya está al día y, al final, los exámenes que nadie ha entregado.
      const pendientes = conEntregas.filter((ex) => Number(ex.por_corregir) > 0);
      const alDia = conEntregas.filter((ex) => Number(ex.por_corregir) === 0);
      const grupos = [];
      if (pendientes.length) {
        grupos.push(this._htmlGrupoEntregas('atencion', 'Por corregir', 'clipboard-check', pendientes, true));
      }
      if (alDia.length) {
        grupos.push(this._htmlGrupoEntregas('al-dia', 'Al día', 'check-circle', alDia, false));
      }
      if (sinEntregas.length) {
        grupos.push(this._htmlGrupoEntregas('sin-entregas', 'Sin entregas todavía', 'send', sinEntregas, false, metaSinEntregas));
      }
      contenido.innerHTML = grupos.join('');

      contenido.querySelectorAll('[data-ir]').forEach((btn) => {
        btn.addEventListener('click', () => router.navegar(btn.dataset.ir));
      });
      if (window.Iconos) window.Iconos.actualizar();
    },

    /** Un grupo de la cola: pendientes, al día o exámenes que nadie entregó. */
    _htmlGrupoEntregas(clave, titulo, icono, examenes, atencion, metaSinEntregas) {
      // El nombre accesible lleva el total; el contador visible va como chip.
      const etiqueta = clave === 'sin-entregas'
        ? `Sin entregas todavía (${examenes.length})`
        : `${titulo} (${examenes.length})`;
      const tarjetas = examenes.map((ex) => (metaSinEntregas
        ? this._tarjetaSinEntregas(ex, metaSinEntregas)
        : this._tarjetaEntregas(ex))).join('');
      return `<section class="ex-grupo ex-grupo--${clave}${atencion ? ' ex-grupo--atencion' : ''}" aria-label="${etiqueta}">
        <p class="ex-grupo__titulo">
          <span class="ex-grupo__icono" aria-hidden="true">${I(icono)}</span>
          ${titulo}
          <span class="ex-grupo__cuenta">${examenes.length}</span>
        </p>
        <div class="adm-lista">${tarjetas}</div>
      </section>`;
    },

    /** Examen con entregas: estado de corrección, progreso y acción directa. */
    _tarjetaEntregas(ex) {
      const porCorregir = Number(ex.por_corregir) || 0;
      const entregas = Number(ex.num_entregas) || 0;
      const corregidas = Math.max(0, entregas - porCorregir);
      const numEnlaces = Number(ex.num_enlaces) || 0;
      const usados = Number(ex.enlaces_usados) || 0;
      const pendiente = porCorregir > 0;
      const titulo = esc(ex.titulo);
      const porcentaje = entregas ? Math.round((corregidas / entregas) * 100) : 0;

      const datos = [
        `<span class="ex-ficha__dato">${I('inbox')}${plural(entregas, 'entrega', 'entregas')}</span>`
      ];
      if (ex.nota_media != null) {
        datos.push(`<span class="ex-ficha__dato">${I('medal')}media ${esc(window.panelUI.numero(ex.nota_media))}</span>`);
      }

      // Sin enlaces no se dice «0 de 0»; el pie solo aparece cuando aporta.
      const pie = [];
      if (numEnlaces) {
        pie.push(`<span>${I('link-2')}${usados} de ${numEnlaces} enlaces usados</span>`);
      }
      if (ex.estado === 'cerrado') {
        pie.push(`<span>${I('lock')}Cerrado</span>`);
      }

      // La barra solo aparece cuando queda trabajo: un examen al día ya lo dice
      // su badge y no necesita otra línea verde.
      const progreso = pendiente ? `<div class="ex-progreso" role="group" aria-label="${corregidas} de ${entregas} corregidas">
        <span class="ex-progreso__pista" aria-hidden="true"><span class="ex-progreso__relleno" style="width:${porcentaje}%"></span></span>
        <span class="ex-progreso__texto">${corregidas} de ${entregas} ${corregidas === 1 ? 'corregida' : 'corregidas'}</span>
      </div>` : '';

      const accion = pendiente
        ? `<button class="adm-btn adm-btn--principal adm-btn--pequeno ex-accion-principal" type="button" data-ir="/corregir/${esc(ex.id)}">${I('clipboard-check')} Corregir ${porCorregir}</button>`
        : `<button class="adm-btn adm-btn--pequeno ex-boton-suave ex-accion-principal" type="button" data-ir="/corregir/${esc(ex.id)}">${I('eye')} Ver entregas</button>`;

      return `<article class="adm-fila adm-examen" data-estado="${pendiente ? 'pendiente' : 'al-dia'}" aria-label="${titulo}">
        <span class="ex-ficha__marca" aria-hidden="true">${I('inbox')}</span>
        <div class="ex-ficha__cuerpo">
          <div class="ex-ficha__titulo">
            <h2>${titulo}</h2>
            ${pendiente
              ? `<span class="adm-badge adm-badge--aviso">${porCorregir} por corregir</span>`
              : '<span class="adm-badge adm-badge--exito">Todo corregido</span>'}
          </div>
          <div class="ex-ficha__meta">${datos.join('')}</div>
          ${progreso}
          ${pie.length ? `<div class="ex-ficha__pie">${pie.join('')}</div>` : ''}
        </div>
        <div class="ex-ficha__acciones">
          <div class="adm-examen__acciones-principales">${accion}</div>
        </div>
      </article>`;
    },

    /** Examen ofrecido que aún no tiene ninguna entrega. */
    _tarjetaSinEntregas(ex, metaSinEntregas) {
      const titulo = esc(ex.titulo);
      const cerrado = ex.estado === 'cerrado';
      const detalle = cerrado
        ? 'El examen está cerrado y nadie entregó.'
        : metaSinEntregas;
      return `<article class="adm-fila adm-examen" data-estado="sin-entregas" aria-label="${titulo}">
        <span class="ex-ficha__marca" aria-hidden="true">${I(cerrado ? 'lock' : 'send')}</span>
        <div class="ex-ficha__cuerpo">
          <div class="ex-ficha__titulo">
            <h2>${titulo}</h2>
            <span class="adm-badge adm-badge--borrador">Sin entregas</span>
          </div>
          <div class="ex-ficha__meta">
            <span class="ex-ficha__dato">${I('users')}${esc(detalle)}</span>
          </div>
        </div>
        <div class="ex-ficha__acciones">
          <div class="adm-examen__acciones-principales">
            <button class="adm-btn adm-btn--pequeno ex-boton-suave" type="button" data-ir="/corregir/${esc(ex.id)}">${I('eye')} Ver seguimiento</button>
          </div>
        </div>
      </article>`;
    },

    // ── Entregas de un examen (/corregir/:id) ─────────────────────────────
    async _pintarExamen(raiz) {
      raiz.innerHTML = `<div class="o-contenedor vista-entregas ex-vista">
        <header class="adm-cabecera">
          <span class="adm-cabecera__icono" aria-hidden="true">${window.Iconos.render('clipboard-check')}</span>
          <div class="adm-cabecera__principal">
            <h1 class="adm-cabecera__titulo" id="tituloExamen">Entregas</h1>
            <div class="adm-cabecera__sub" id="subExamen">${window.skeleton ? window.skeleton.bloque('13px', '240px', 'border-radius:var(--radio-sm)') : ''}</div>
          </div>
          <div class="adm-cabecera__acciones">
            <button class="adm-btn" id="btnVolver">${window.Iconos.render('arrow-left')} Volver</button>
            <button class="adm-btn" id="btnEditar">${window.Iconos.render('edit-3')} Editar examen</button>
          </div>
        </header>
        <div id="contenido"></div>
      </div>`;

      raiz.querySelector('#btnVolver').addEventListener('click', () => router.navegar('/entregas'));
      raiz.querySelector('#btnEditar').addEventListener('click', async () => {
        if (!(await window.helpers.confirmarEdicion())) return;
        router.navegar('/editor/' + this._examenId);
      });
      const contenido = raiz.querySelector('#contenido');
      if (window.skeleton) window.skeleton.mostrar(contenido, window.skeleton.filas(6), 'Cargando las entregas del examen');

      try {
        const [entregas, resumen, usuarios] = await Promise.all([
          window.plataformaRepository.listarEntregas(this._examenId),
          window.plataformaRepository.resumen().catch(() => null),
          // Seguimiento de la clase: solo cuentas de alumno activas.
          window.adminRepository.listarUsuarios().catch(() => [])
        ]);
        this._entregas = entregas || [];
        this._alumnos = (usuarios || []).filter((u) => u.rol === 'usuario' && u.activo !== false);
        const examen = resumen && (resumen.examenes || []).find((e) => e.id === this._examenId);
        this._examenTitulo = examen ? examen.titulo : 'Examen';
      } catch (e) {
        contenido.innerHTML = `<div class="adm-aviso adm-aviso--error">No se pudieron cargar las entregas: ${esc(e.message)}</div>`;
        return;
      }

      // Si el usuario navegó durante la carga, el router ya vació #app-root:
      // estas referencias son nulas y pintar dejaría de tener sentido.
      const porCorregir = this._entregas.filter((t) => !t.corregido && t.estado === 'completado').length;
      const titulo = raiz.querySelector('#tituloExamen');
      const sub = raiz.querySelector('#subExamen');
      if (!titulo || !sub || !contenido.isConnected) return;

      const faltan = this._faltan();
      titulo.textContent = this._examenTitulo;
      const partesSubtitulo = [];
      if (this._entregas.length) {
        partesSubtitulo.push(plural(this._entregas.length, 'entrega', 'entregas'));
        partesSubtitulo.push(porCorregir > 0 ? `${porCorregir} por corregir` : 'todo corregido');
      } else {
        partesSubtitulo.push('Sin entregas todavía');
      }
      if (faltan.length) {
        partesSubtitulo.push(plural(faltan.length, 'alumno sin entregar', 'alumnos sin entregar'));
      }
      sub.textContent = partesSubtitulo.join(' · ');

      this._pintarEntregas(contenido);
    },

    _pintarEntregas(contenedor) {
      if (!this._entregas.length) {
        contenedor.innerHTML = `<div class="adm-vacio ex-vacio">
          <span class="ex-vacio__icono" aria-hidden="true">${I('inbox')}</span>
          <p class="adm-vacio__titulo">Nadie ha entregado este examen</p>
          <p>Cuando un alumno use su enlace, aparecerá aquí con lo que haya respondido.</p>
        </div>`;
      } else {
        // Primero lo que exige corrección, después el archivo y, al final, los
        // intentos que aún no se han entregado: el orden de trabajo del profesor.
        const pendientes = this._entregas.filter((t) => this._estadoEntrega(t) === 'pendiente');
        const corregidas = this._entregas.filter((t) => this._estadoEntrega(t) === 'corregida');
        const enCurso = this._entregas.filter((t) => this._estadoEntrega(t) === 'en-progreso');
        const grupos = [];
        if (pendientes.length) {
          grupos.push(this._htmlGrupoAlumnos('atencion', 'Por corregir', 'clipboard-check', pendientes, true));
        }
        if (corregidas.length) {
          grupos.push(this._htmlGrupoAlumnos('corregidas', 'Corregidas', 'check-circle', corregidas, false));
        }
        if (enCurso.length) {
          grupos.push(this._htmlGrupoAlumnos('en-curso', 'En curso', 'clock', enCurso, false));
        }
        contenedor.innerHTML = grupos.join('');
      }
      // Seguimiento de la clase: quién falta por entregar (y aviso si hay
      // entregas sin asignar a una cuenta).
      contenedor.insertAdjacentHTML('beforeend', this._htmlFaltan());

      contenedor.querySelectorAll('[data-abrir]').forEach((btn) => {
        btn.addEventListener('click', () => this._abrirCorreccion(btn.dataset.abrir));
      });
      contenedor.querySelectorAll('[data-asignar]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const entrega = this._entregas.find((t) => t.intento_id === btn.dataset.asignar);
          if (entrega) this._abrirAsignacion(entrega);
        });
      });
      if (window.Iconos) window.Iconos.actualizar();
    },

    /** Estado real de una entrega: decide su grupo y su acción. */
    _estadoEntrega(entrega) {
      if (entrega.estado === 'en_progreso') return 'en-progreso';
      if (entrega.corregido) return 'corregida';
      return 'pendiente';
    },

    /** Un grupo de alumnos del detalle, con su cuenta en el título. */
    _htmlGrupoAlumnos(clave, titulo, icono, entregas, atencion) {
      return `<section class="ex-grupo ex-grupo--${clave}${atencion ? ' ex-grupo--atencion' : ''}" aria-label="${titulo} (${entregas.length})">
        <p class="ex-grupo__titulo">
          <span class="ex-grupo__icono" aria-hidden="true">${I(icono)}</span>
          ${titulo}
          <span class="ex-grupo__cuenta">${entregas.length}</span>
        </p>
        <div class="adm-lista">${entregas.map((entrega) => this._tarjetaAlumno(entrega)).join('')}</div>
      </section>`;
    },

    /** Ficha de una entrega: quién, cuándo y qué toca hacer con ella. */
    _tarjetaAlumno(entrega) {
      const estado = this._estadoEntrega(entrega);
      const nombre = entrega.alumno_nombre || entrega.alumno_asignado || 'Sin nombre';
      const asignada = entrega.alumno_asignado && entrega.alumno_asignado !== nombre;
      const cuando = entrega.fecha_completado
        ? `Entregado ${window.panelUI.tiempoRelativo(entrega.fecha_completado)}`
        : `Empezado ${window.panelUI.tiempoRelativo(entrega.fecha_inicio)}`;

      const datos = [];
      if (entrega.alumno_grupo) {
        datos.push(`<span class="ex-ficha__dato">${I('users')}${esc(entrega.alumno_grupo)}</span>`);
      }
      datos.push(`<span class="ex-ficha__dato">${I('clock')}${esc(cuando)}</span>`);
      if (entrega.corregido) {
        datos.push(`<span class="ex-ficha__dato ex-ficha__nota">${I('medal')}Nota ${esc(window.panelUI.numero(entrega.nota))}/10</span>`);
      } else if (entrega.puntuacion != null) {
        datos.push(`<span class="ex-ficha__dato">${I('target')}Test ${esc(window.panelUI.numero(entrega.puntuacion))} %</span>`);
      }

      const pie = [];
      if (asignada) {
        pie.push(`<span>${I('link-2')}Asignada a ${esc(entrega.alumno_asignado)}</span>`);
      } else if (!entrega.alumno_id) {
        pie.push(`<span>${I('info')}Sin asignar a una cuenta</span>`);
      }

      const accion = estado === 'en-progreso'
        ? ''
        : (estado === 'pendiente'
          ? `<button class="adm-btn adm-btn--principal adm-btn--pequeno ex-accion-principal" type="button" data-abrir="${esc(entrega.intento_id)}">${I('clipboard-check')} Corregir</button>`
          : `<button class="adm-btn adm-btn--pequeno ex-boton-suave ex-accion-principal" type="button" data-abrir="${esc(entrega.intento_id)}">${I('eye')} Revisar</button>`);

      return `<article class="adm-fila adm-examen" data-estado="${estado}"${estado === 'pendiente' ? ' data-atencion' : ''} aria-label="${esc(nombre)}">
        <span class="ex-ficha__marca ex-ficha__marca--persona" aria-hidden="true">${esc(iniciales(nombre))}</span>
        <div class="ex-ficha__cuerpo">
          <div class="ex-ficha__titulo">
            <h2>${esc(nombre)}</h2>
            ${estadoBadge(entrega)}
          </div>
          <div class="ex-ficha__meta">${datos.join('')}</div>
          ${pie.length ? `<div class="ex-ficha__pie">${pie.join('')}</div>` : ''}
        </div>
        <div class="ex-ficha__acciones">
          <div class="adm-examen__acciones-principales">${accion}</div>
          <button class="adm-btn adm-btn--pequeno ex-boton-fantasma" type="button" data-asignar="${esc(entrega.intento_id)}" aria-label="${entrega.alumno_id ? 'Cambiar la cuenta de' : 'Asignar a una cuenta la entrega de'} ${esc(nombre)}">${I('link')} ${entrega.alumno_id ? 'Cambiar cuenta' : 'Asignar cuenta'}</button>
        </div>
      </article>`;
    },

    // ── Asignar la entrega a la cuenta de un alumno ───────────────────────
    /**
     * Vincula un intento hecho por enlace con una cuenta de alumno (069).
     * En cuanto la cuenta está fijada, el alumno ve esta nota en «Mis notas»
     * al iniciar sesión; nadie más la ve. Si el nombre escrito en el enlace
     * coincide con una cuenta, esa cuenta se preselecciona como sugerencia.
     */
    async _abrirAsignacion(entrega) {
      let usuarios = [];
      try {
        usuarios = ((await window.adminRepository.listarUsuarios()) || [])
          .filter((u) => u.rol === 'usuario' && u.activo !== false);
      } catch (e) {
        window.helpers.mostrarAlerta('No se pudieron cargar las cuentas: ' + e.message, 'error');
        return;
      }
      const normalizar = (v) => String(v || '').trim().toLowerCase();
      const nombre = normalizar(entrega.alumno_nombre);
      const sugerido = nombre
        ? usuarios.find((u) => normalizar(u.nombre_completo) === nombre || normalizar(u.username) === nombre) || null
        : null;
      const actual = entrega.alumno_id || null;
      const opciones = ['<option value="">Sin asignar (solo el enlace)</option>'].concat(usuarios.map((u) => {
        const seleccionada = actual ? u.id === actual : (sugerido && u.id === sugerido.id);
        return `<option value="${esc(u.id)}"${seleccionada ? ' selected' : ''}>${esc(u.nombre_completo || u.username || u.id)}</option>`;
      })).join('');
      const avisoSugerencia = !actual && sugerido
        ? `<p class="adm-campo__ayuda">${window.Iconos.render('info')} El nombre del enlace coincide con esta cuenta, así que aparece preseleccionada.</p>`
        : '';
      const modal = window.panelUI.modal({
        titulo: 'Asignar a usuario',
        cuerpoHtml: `<p>Entrega de <strong>${esc(entrega.alumno_nombre || entrega.alumno_asignado || 'Sin nombre')}</strong>. La cuenta elegida verá esta nota en «Mis notas» al iniciar sesión; nadie más.</p>
          ${avisoSugerencia}
          <div id="avisoAsignacion" class="adm-aviso adm-aviso--error" hidden></div>
          <label>Cuenta de alumno<select id="cuentaAlumno">${opciones}</select></label>`,
        pieHtml: `<button class="adm-btn" type="button" id="asignarCancelar">Cancelar</button>
          <button class="adm-btn adm-btn--principal" type="button" id="asignarGuardar">Guardar</button>`
      });
      modal.pie.querySelector('#asignarCancelar').addEventListener('click', modal.cerrar);
      const boton = modal.pie.querySelector('#asignarGuardar');
      boton.addEventListener('click', async () => {
        const id = modal.cuerpo.querySelector('#cuentaAlumno').value || null;
        boton.disabled = true;
        try {
          const res = await window.plataformaRepository.asignarIntentoAlumno(entrega.intento_id, id);
          // Refleja el cambio en la fila sin recargar toda la lista.
          entrega.alumno_id = res ? res.alumno_id : id;
          entrega.alumno_asignado = res ? res.alumno_asignado : null;
          modal.cerrar();
          if (res && res.ya_tenia_intento) {
            window.helpers.mostrarAlerta('Cuenta asignada, pero ese alumno ya tenía otro intento de este examen: «Mis notas» mostrará ambos.', 'exito');
          } else {
            window.helpers.mostrarAlerta(id
              ? 'Cuenta asignada: el alumno verá esta nota en «Mis notas».'
              : 'Cuenta desasignada: la entrega queda solo en el enlace.', 'exito');
          }
          this._repintarLista();
        } catch (e) {
          boton.disabled = false;
          const aviso = modal.cuerpo.querySelector('#avisoAsignacion');
          aviso.textContent = e.message;
          aviso.hidden = false;
        }
      });
    },

    /** Repinta la lista de entregas desde el estado en memoria. */
    _repintarLista() {
      const raiz = document.querySelector('#app-root');
      const contenido = raiz && raiz.querySelector('#contenido');
      if (contenido) this._pintarEntregas(contenido);
    },

    // ── Seguimiento de la clase: quién falta por entregar ───────────────
    /**
     * Una entrega cuenta para el alumno si trae su cuenta o si el nombre
     * escrito en el enlace coincide con el suyo (aunque aún no esté
     * asignada): así «faltan» nunca reclama a quien ya respondió; solo
     * queda asignar esa entrega a su cuenta para que la vea en «Mis notas».
     */
    _alumnoHaEntregado(alumno) {
      const normalizar = (v) => String(v || '').trim().toLowerCase();
      const nombres = [alumno.nombre_completo, alumno.username].map(normalizar).filter(Boolean);
      return (this._entregas || []).some((t) => {
        if (t.alumno_id && t.alumno_id === alumno.id) return true;
        const escrito = normalizar(t.alumno_nombre);
        return escrito !== '' && nombres.indexOf(escrito) !== -1;
      });
    },

    /** Alumnos de la clase (cuentas activas) sin entrega de este examen. */
    _faltan() {
      return (this._alumnos || []).filter((a) => !this._alumnoHaEntregado(a));
    },

    /** Sección «Faltan por entregar» (vacía si la clase no tiene alumnos). */
    /** Sección «Faltan por entregar» (vacía si la clase no tiene alumnos). */
    _htmlFaltan() {
      const alumnos = this._alumnos || [];
      if (!alumnos.length) return '';
      const faltan = alumnos.filter((a) => !this._alumnoHaEntregado(a));
      const sinAsignar = (this._entregas || []).filter((t) => !t.alumno_id).length;
      const avisoSinAsignar = sinAsignar > 0
        ? `<p class="ex-seguimiento__nota">${I('info')} ${plural(sinAsignar, 'entrega', 'entregas')} sin asignar a una cuenta: asígnalas para que aparezcan en «Mis notas».</p>`
        : '';
      if (!faltan.length) {
        return `<section class="ex-seguimiento" aria-label="Seguimiento de la clase">
          <p class="ex-seguimiento__nota ex-seguimiento__nota--exito">${I('check-circle')} Toda la clase ha entregado este examen.</p>
          ${avisoSinAsignar}
        </section>`;
      }
      // Nombres en pastillas: es un aviso de a quién reclamar, no una tarea que
      // se abra desde aquí. Por eso no repiten la anatomía de ficha.
      return `<section class="ex-seguimiento" aria-label="Seguimiento de la clase">
        <p class="ex-faltan__titulo">
          <span aria-hidden="true">${I('users')}</span>
          Faltan por entregar (${faltan.length})
        </p>
        ${avisoSinAsignar}
        <div class="ex-faltan">${faltan.map((a) => `
          <span class="ex-faltan__fila">
            <span class="ex-faltan__avatar" aria-hidden="true">${esc(iniciales(window.helpers.nombreAlumno(a)))}</span>
            ${esc(window.helpers.nombreAlumno(a))}
          </span>`).join('')}</div>
      </section>`;
    },

    // ── Corrección de una entrega ─────────────────────────────────────────
    async _abrirCorreccion(intentoId) {
      let entrega;
      try {
        entrega = await window.plataformaRepository.obtenerEntrega(intentoId);
      } catch (e) {
        window.helpers.mostrarAlerta('No se pudo abrir la entrega: ' + e.message, 'error');
        return;
      }

      const decisiones = {};
      // Pre-rellena la corrección automática con la MISMA regla del servidor
      // (fb_evaluar_pregunta): el profesor solo tiene que decidir las escritas.
      (entrega.preguntas || []).forEach((p) => {
        if (!this._esTest(p.tipo)) return;
        const respuestas = entrega.respuestas || {};
        if (p.tipo === 'completar' && Array.isArray(p.huecos) && p.huecos.length) {
          const arr = Array.isArray(respuestas[p.id]) ? respuestas[p.id] : [];
          const h = window.puntuacionExamen._calcularHuecos(arr, p.huecos);
          const fraccion = h.total > 0 ? h.correctos / h.total : 0;
          decisiones[p.id] = {
            es_correcta: fraccion === 1,
            puntos: Math.round(fraccion * (Number(p.puntos) || 0) * 100) / 100
          };
        } else {
          const acierta = window.puntuacionExamen.esCorrectaPregunta(respuestas[p.id], p);
          decisiones[p.id] = {
            es_correcta: acierta,
            puntos: window.puntuacionExamen.evaluarPregunta(acierta, Number(p.puntos) || 0)
          };
        }
      });
      // Se parte de la corrección ya guardada (si la hay) para poder revisarla.
      Object.keys(entrega.correccion || {}).forEach((id) => {
        decisiones[id] = Object.assign({}, entrega.correccion[id]);
      });

      const modal = window.panelUI.modal({
        titulo: (entrega.alumno_nombre || entrega.alumno_asignado || 'Alumno') + (entrega.alumno_grupo ? ' · ' + entrega.alumno_grupo : ''),
        cuerpoHtml: this._htmlCorreccion(entrega, decisiones),
        pieHtml: `<button class="adm-btn" type="button" data-rol="cerrar">Cerrar</button>
          <button class="adm-btn adm-btn--principal" type="button" id="btnGuardarCorreccion">Guardar corrección</button>`,
        ancho: '760px'
      });

      modal.pie.querySelector('[data-rol="cerrar"]').addEventListener('click', modal.cerrar);

      const cuerpo = modal.cuerpo;

      cuerpo.querySelectorAll('[data-decision]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.pregunta;
          const esCorrecta = btn.dataset.decision === 'correcta';
          const pregunta = entrega.preguntas.find((p) => p.id === id);
          const puntosMax = Number(pregunta.puntos) || 0;
          // Se conserva el comentario que haya escrito el profesor para esa pregunta.
          decisiones[id] = Object.assign({}, decisiones[id], { es_correcta: esCorrecta, puntos: esCorrecta ? puntosMax : 0 });
          const bloque = cuerpo.querySelector(`[data-bloque="${id}"]`);
          if (bloque) {
            bloque.classList.toggle('adm-respuesta--correcta', esCorrecta);
            bloque.classList.toggle('adm-respuesta--incorrecta', !esCorrecta);
            bloque.querySelectorAll('[data-decision]').forEach((b) => {
              b.classList.toggle('adm-btn--principal', b === btn);
            });
            const inputPuntos = bloque.querySelector('[data-puntos]');
            if (inputPuntos) inputPuntos.value = String(decisiones[id].puntos);
          }
          this._actualizarResumen(cuerpo, entrega, decisiones);
        });
      });

      cuerpo.querySelectorAll('[data-puntos]').forEach((input) => {
        input.addEventListener('input', () => {
          const id = input.dataset.puntos;
          const valor = Math.max(0, Number(input.value) || 0);
          decisiones[id] = Object.assign({}, decisiones[id], { puntos: valor });
          this._actualizarResumen(cuerpo, entrega, decisiones);
        });
      });

      // Comentario por pregunta: viaja dentro del mapa de corrección que se
      // guarda con fb_corregir_entrega (p_correccion) y el alumno lo ve en su
      // resultado junto a la respuesta.
      cuerpo.querySelectorAll('[data-comentario]').forEach((input) => {
        input.addEventListener('input', () => {
          const id = input.dataset.comentario;
          decisiones[id] = Object.assign({}, decisiones[id], { comentario: input.value });
        });
      });

      const boton = modal.pie.querySelector('#btnGuardarCorreccion');
      boton.addEventListener('click', async () => {
        const pendientes = entrega.preguntas.filter((p) => !this._esTest(p.tipo) && !(decisiones[p.id] && decisiones[p.id].es_correcta != null));
        const error = cuerpo.querySelector('#errorCorreccion');
        if (pendientes.length) {
          error.textContent = 'Faltan ' + pendientes.length + ' respuesta(s) escrita(s) por decidir.';
          error.hidden = false;
          return;
        }
        error.hidden = true;
        boton.disabled = true;
        boton.textContent = 'Guardando…';
        try {
          const observaciones = (cuerpo.querySelector('#observaciones') || {}).value || '';
          await window.plataformaRepository.corregirEntrega(intentoId, decisiones, observaciones);
          modal.cerrar();
          window.helpers.mostrarAlerta('Corrección guardada: la nota ya es definitiva.', 'exito');
          // Solo se repinta si el usuario sigue en esta misma pantalla.
          const raiz = document.querySelector('#app-root');
          if (raiz && router.pathActual() === '/corregir/' + this._examenId) {
            await this._pintarExamen(raiz);
          }
        } catch (e) {
          error.textContent = e.message;
          error.hidden = false;
          boton.disabled = false;
          boton.textContent = 'Guardar corrección';
        }
      });

      this._actualizarResumen(cuerpo, entrega, decisiones);
    },

    /**
     * Preguntas que califica el servidor (fb_respuesta_correcta + puntos en la
     * propia BD). Todo lo que no esté aquí lo decide el profesor a mano.
     */
    _esTest(tipo) {
      return ['multiple', 'opcion_unica', 'verdadero_falso', 'varias_opciones',
        'completar', 'relacionar', 'ordenar'].includes(tipo);
    },

    /** Puntos que el servidor otorgó a una pregunta automática (solo lectura). */
    _puntosAuto(pregunta, entrega) {
      if (!this._esTest(pregunta.tipo)) return 0;
      const respuestas = entrega.respuestas || {};
      // Los huecos de «completar» admiten crédito parcial (fracción de aciertos),
      // igual que fb_calcular_puntuacion.
      if (pregunta.tipo === 'completar' && Array.isArray(pregunta.huecos) && pregunta.huecos.length) {
        const arr = Array.isArray(respuestas[pregunta.id]) ? respuestas[pregunta.id] : [];
        const h = window.puntuacionExamen._calcularHuecos(arr, pregunta.huecos);
        const fraccion = h.total > 0 ? h.correctos / h.total : 0;
        return Math.round(fraccion * (Number(pregunta.puntos) || 0) * 100) / 100;
      }
      const correcta = window.puntuacionExamen.esCorrectaPregunta(respuestas[pregunta.id], pregunta);
      return window.puntuacionExamen.evaluarPregunta(correcta, Number(pregunta.puntos) || 0);
    },

    _actualizarResumen(cuerpo, entrega, decisiones) {
      const caja = cuerpo.querySelector('#resumenNota');
      if (!caja) return;
      const total = entrega.preguntas.reduce((s, p) => s + (Number(p.puntos) || 0), 0);
      if (total <= 0) { caja.textContent = ''; return; }
      let obtenidos = 0;
      entrega.preguntas.forEach((p) => {
        const d = decisiones[p.id];
        if (this._esTest(p.tipo)) obtenidos += this._puntosAuto(p, entrega);
        else if (d && d.es_correcta != null) obtenidos += Number(d.puntos) || 0;
      });
      const pendientes = entrega.preguntas.filter((p) => !this._esTest(p.tipo) && !(decisiones[p.id] && decisiones[p.id].es_correcta != null)).length;
      caja.textContent = 'Nota provisional: ' + window.panelUI.numero((obtenidos / total) * 10) + ' / 10'
        + (pendientes ? ' · faltan ' + pendientes + ' por decidir' : ' · lista para guardar');
      // Al cerrar todas las decisiones la caja pasa de aviso a confirmación.
      caja.classList.toggle('correccion-resumen--lista', pendientes === 0);
    },

    /**
     * Texto legible de una respuesta calificada automáticamente, en el formato
     * que corresponda al tipo de pregunta (índice, array JSON, mapa de parejas,
     * secuencia, palabras aceptadas o detalle por hueco).
     */
    _formatearAuto(p, respuesta) {
      const opciones = Array.isArray(p.opciones) ? p.opciones : [];
      const letra = (n) => String.fromCharCode(65 + n);
      const comoIndice = (n) => (opciones[n] != null ? letra(n) + '. ' + opciones[n] : String(n));
      const comoTexto = (n) => (opciones[n] != null ? opciones[n] : String(n));
      const parse = (v, defecto) => {
        if (Array.isArray(v) || (v && typeof v === 'object')) return v;
        try { return JSON.parse(v); } catch (e) { return defecto; }
      };
      const sinResponder = (v) => v == null || v === '' ||
        (Array.isArray(v) && !v.length) || (v && typeof v === 'object' && !Object.keys(v).length);

      if (['multiple', 'opcion_unica', 'verdadero_falso'].includes(p.tipo)) {
        const elegida = respuesta == null || respuesta === '' ? null : Number(respuesta);
        const correcta = Number(p.respuesta_correcta);
        return {
          alumno: elegida != null && opciones[elegida] != null ? comoIndice(elegida) : 'Sin responder',
          correcta: opciones[correcta] != null ? comoIndice(correcta) : ''
        };
      }

      if (p.tipo === 'varias_opciones') {
        const marcadas = parse(respuesta, []);
        const correctas = parse(p.respuesta_correcta, []);
        return {
          alumno: sinResponder(marcadas) || !Array.isArray(marcadas) ? 'Sin responder'
            : (marcadas.length ? marcadas.map(comoIndice).join(' · ') : 'Sin responder'),
          correcta: Array.isArray(correctas) ? correctas.map(comoIndice).join(' · ') : ''
        };
      }

      if (p.tipo === 'completar') {
        if (Array.isArray(p.huecos) && p.huecos.length) {
          const detalle = window.puntuacionExamen.detalleCompletar(respuesta, p) || [];
          return {
            alumno: sinResponder(respuesta) ? 'Sin responder'
              : detalle.map((h, n) => 'Hueco ' + (n + 1) + ': ' + (h.respuestaUsuario || '—') + (h.esCorrecta ? ' ✓' : ' ✗')).join(' · '),
            correcta: detalle.map((h) => h.respuestaCorrecta).join(' · ')
          };
        }
        const alternativas = String(p.respuesta_correcta || '').split('|').map((s) => s.trim()).filter(Boolean);
        return {
          alumno: sinResponder(respuesta) ? 'Sin responder' : String(respuesta),
          correcta: alternativas.join(' o ')
        };
      }

      if (p.tipo === 'relacionar') {
        const mapa = parse(respuesta, {}) || {};
        const mitad = Math.floor(opciones.length / 2);
        const comoPar = (k, derIdx) => (opciones[k] || k) + ' → ' +
          (opciones[mitad + derIdx] != null ? opciones[mitad + derIdx] : derIdx);
        const claves = (typeof mapa === 'object' && !Array.isArray(mapa)) ? Object.keys(mapa)
          .filter((k) => Number.isInteger(Number(mapa[k])) && Number(mapa[k]) >= 0 && Number(mapa[k]) < mitad) : [];
        return {
          alumno: claves.length ? claves.map((k) => comoPar(k, Number(mapa[k]))).join(' · ') : 'Sin responder',
          correcta: Array.from({ length: mitad }, (_, k) => comoPar(k, k)).join(' · ')
        };
      }

      if (p.tipo === 'ordenar') {
        const secuencia = parse(respuesta, []);
        return {
          alumno: sinResponder(secuencia) || !Array.isArray(secuencia) ? 'Sin responder'
            : secuencia.map(comoTexto).join(' → '),
          correcta: opciones.join(' → ')
        };
      }

      return { alumno: respuesta == null || respuesta === '' ? 'Sin responder' : String(respuesta), correcta: '' };
    },

    /**
     * Comentario del profesor para UNA pregunta. Vive en el mapa de corrección
     * (fb_corregir_entrega lo guarda entero) y por eso el mismo texto aparece
     * al reabrir la corrección y en el resultado del alumno.
     */
    _htmlComentarioPregunta(p, decisiones) {
      const d = decisiones[p.id] || {};
      return `<div class="adm-respuesta__comentario">
        <label class="adm-campo__etiqueta" for="comentario_${esc(p.id)}">Comentario para esta pregunta (opcional)</label>
        <input class="adm-entrada" id="comentario_${esc(p.id)}" type="text" maxlength="500"
          data-comentario="${esc(p.id)}" value="${esc(d.comentario || '')}"
          placeholder="Ej.: Buen razonamiento; repasa el versículo">
      </div>`;
    },

    _htmlCorreccion(entrega, decisiones) {
      const filas = entrega.preguntas.map((p, i) => {
        const respuesta = entrega.respuestas ? entrega.respuestas[p.id] : undefined;
        if (this._esTest(p.tipo)) {
          const acierto = window.puntuacionExamen.esCorrectaPregunta(respuesta, p);
          const formateo = this._formatearAuto(p, respuesta);
          const puntosAuto = this._puntosAuto(p, entrega);
          return `<div class="adm-respuesta ${acierto ? 'adm-respuesta--correcta' : 'adm-respuesta--incorrecta'}" data-bloque="${esc(p.id)}">
            <div class="adm-respuesta__letra">Pregunta ${i + 1} · automática · ${esc(window.panelUI.numero(puntosAuto))} de ${esc(window.panelUI.numero(p.puntos))} pt</div>
            <p class="adm-respuesta__enunciado">${esc(p.texto)}</p>
            <div class="adm-respuesta__alumno">${esc(formateo.alumno)}</div>
            <p class="adm-campo__ayuda">
              ${acierto ? '✓ Correcta' : '✗ Incorrecta'}
              ${formateo.correcta ? ' · Respuesta correcta: ' + esc(formateo.correcta) : ''}
              · la califica el servidor
            </p>
            ${this._htmlComentarioPregunta(p, decisiones)}
          </div>`;
        }

        const d = decisiones[p.id] || {};
        const texto = respuesta == null || respuesta === '' ? 'Sin responder' : String(respuesta);
        const referencia = p.tipo === 'respuesta_corta' && p.respuesta_correcta
          ? `<p class="adm-campo__ayuda">Respuesta de referencia: ${esc(p.respuesta_correcta)}</p>` : '';
        const clase = d.es_correcta === true ? ' adm-respuesta--correcta' : (d.es_correcta === false ? ' adm-respuesta--incorrecta' : '');
        return `<div class="adm-respuesta${clase}" data-bloque="${esc(p.id)}">
          <div class="adm-respuesta__letra">Pregunta ${i + 1} · escrita · ${esc(window.panelUI.numero(p.puntos))} pt</div>
          <p class="adm-respuesta__enunciado">${esc(p.texto)}</p>
          ${referencia}
          <div class="adm-respuesta__alumno">${esc(texto)}</div>
          <div class="adm-respuesta__controles">
            <button class="adm-btn adm-btn--pequeno${d.es_correcta === true ? ' adm-btn--principal' : ''}" type="button"
              data-decision="correcta" data-pregunta="${esc(p.id)}">Correcta</button>
            <button class="adm-btn adm-btn--pequeno${d.es_correcta === false ? ' adm-btn--principal' : ''}" type="button"
              data-decision="incorrecta" data-pregunta="${esc(p.id)}">Incorrecta</button>
            <label class="adm-campo__etiqueta" style="margin:0" for="puntos_${esc(p.id)}">Puntos</label>
            <input class="adm-entrada adm-entrada--corta" id="puntos_${esc(p.id)}" type="number" min="0" step="0.5"
              data-puntos="${esc(p.id)}" value="${esc(d.puntos != null ? d.puntos : '')}">
          </div>
          ${this._htmlComentarioPregunta(p, decisiones)}
        </div>`;
      }).join('');

      const yaCorregida = entrega.corregido;
      return `${yaCorregida ? `<div class="adm-aviso adm-aviso--exito">Entrega calificada con nota ${esc(window.panelUI.numero(entrega.nota))}/10. Puedes reajustar la corrección.</div>` : ''}
        <div id="errorCorreccion" class="adm-aviso adm-aviso--error" hidden></div>
        <p class="adm-cabecera__sub correccion-resumen" id="resumenNota"></p>
        ${filas}
        <div class="adm-campo">
          <label class="adm-campo__etiqueta" for="observaciones">Comentario para el alumno (opcional)</label>
          <textarea class="adm-entrada" id="observaciones" maxlength="2000">${esc(entrega.observaciones || '')}</textarea>
        </div>`;
    }
  };
})();
