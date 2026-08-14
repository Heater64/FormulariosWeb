(function() {
  'use strict';

  const TIPOS_PREGUNTA = [
    { valor: 'multiple', nombre: 'Opción única', icono: 'circle' },
    { valor: 'varias_opciones', nombre: 'Varias respuestas', icono: 'check-square' },
    { valor: 'verdadero_falso', nombre: 'Verdadero / Falso', icono: 'help-circle' },
    { valor: 'respuesta_corta', nombre: 'Respuesta corta', icono: 'type' },
    { valor: 'texto_largo', nombre: 'Párrafo', icono: 'align-left' },
    { valor: 'completar', nombre: 'Completar huecos', icono: 'minus-square' },
    { valor: 'relacionar', nombre: 'Relacionar columnas', icono: 'link' },
    { valor: 'ordenar', nombre: 'Ordenar', icono: 'arrow-up-down' }
  ];

  function preguntaVacia() {
    return {
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      texto: 'Nueva pregunta',
      tipo: 'multiple',
      opciones: ['Opción A', 'Opción B', 'Opción C'],
      respuesta_correcta: '0',
      explicacion: '',
      huecos: [],
      obligatoria: true,
      puntos: 1,
      mostrar_solucion: true,
      temporizador: 0, // En segundos, 0 es sin límite
      imagen: '',
      video: '',
      audio: '',
      retroalimentacion_correcta: '¡Excelente trabajo!',
      retroalimentacion_incorrecta: 'Respuesta incorrecta. Inténtalo de nuevo.'
    };
  }

  window.vistaExamenEditor = {
    _arrastreIdx: null,
    _pestanaActiva: 'preguntas', // preguntas, informacion, configuracion, vista_previa
    _preguntaSeleccionadaIdx: 0,
    _modoVistaPrevia: 'ordenador', // ordenandor, tablet, movil
    _previewRespuestas: {},
    _autoSaveInterval: null,

    async montar(raiz, params) {
      const usuario = store.obtener('usuario');
      if (!usuario || !['admin', 'editor', 'owner'].includes(usuario.rol)) {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p></div>';
        return;
      }

      // El router entrega params (:id) y query (?evaluacion=&pestana=) en el
      // contexto de la vista. Ya no se parsea window.location.hash a mano.
      const idParam = params?.id || 'nuevo';
      const evaluacionParam = params?.query?.evaluacion || null;
      const pestanaQuery = params?.query?.pestana;
      const pestanasValidas = ['informacion', 'preguntas', 'configuracion', 'vista_previa'];
      this._pestanaActiva = pestanaQuery && pestanasValidas.includes(pestanaQuery) ? pestanaQuery : 'preguntas';
      const editando = idParam && idParam !== 'nuevo';

      // Cargar o Inicializar examen
      let examen = {
        id: editando ? idParam : undefined,
        titulo: 'Examen sin título',
        descripcion: 'Escribe una descripción o instrucciones aquí...',
        grupo_id: usuario.grupo_id,
        creado_por: usuario.id,
        preguntas: [preguntaVacia()],
        publicado: false,
        estado: 'borrador',
        puntos_totales: 1,
        evaluacion_id: evaluacionParam || null,
        materia: '',
        tema: '',
        profesor: usuario.nombre_completo || usuario.username || 'Profesor',
        color: '#2563EB', // Color predeterminado (azul de la web)
        icono: '',
        portada: '',
        // Configuración por defecto (Google Forms Ampliado)
        config: {
          modo: 'examen', // examen, practica, encuesta
          fecha_inicio: '',
          fecha_fin: '',
          intentos: '1',
          temporizador_global: 'sin_limite', // sin_limite, 15, 30, 45, 60, personalizado
          temporizador_personalizado: 0,
          navegacion: 'todas', // todas, una_por_pantalla
          permitir_volver: true,
          aleatorizar_preguntas: false,
          aleatorizar_respuestas: false,
          excluir_primeras: 0,
          correccion: 'automatica', // automatica, manual, mixta
          resultados_visibles: 'al_publicar', // al_publicar, nunca (el alumno ve la corrección solo cuando el profesor la publica)
          mostrar_nota: true,
          mostrar_respuestas: true,
          mostrar_errores: true,
          mostrar_solucion: true,
          mostrar_explicacion: true,
          seguridad_pantalla_completa: false,
          seguridad_bloquear_copiar: false,
          seguridad_bloquear_pegar: false,
          seguridad_bloquear_imprimir: false,
          seguridad_cambio_pestana: false
        }
      };

      if (editando) {
        const existente = await window.examenesRepository.obtener(idParam);
        if (existente) {
          examen = { ...examen, ...existente };
          // Normalizar colores legacy (morados de versiones antiguas) al azul de la web
          if (examen.color && !/^#(25|1D)[0-9A-Fa-f]{4}$/.test(examen.color) && ['#673ab7', '#3f51b5', '#9c27b0', '#7b1fa2', '#ab47bc'].includes(examen.color.toLowerCase())) {
            examen.color = '#2563EB';
          }
          if (typeof examen.preguntas === 'string') {
            try { examen.preguntas = JSON.parse(examen.preguntas); } catch (e) { examen.preguntas = []; }
          }
          if (typeof examen.config === 'string') {
            try { examen.config = JSON.parse(examen.config); } catch (e) { examen.config = examen.config || {}; }
          }
          // Normalizar exámenes legacy: el 'modo practica' ya no existe → pasa a examen.
          // La corrección ya no se muestra al terminar: siempre espera al profesor.
          if (examen.config && examen.config.modo === 'practica') examen.config.modo = 'examen';
          if (examen.config && examen.config.resultados_visibles === 'al_terminar') examen.config.resultados_visibles = 'al_publicar';
          if (!Array.isArray(examen.preguntas)) examen.preguntas = [];
          examen.preguntas.forEach(p => {
            if (p.tipo === 'completar' && !Array.isArray(p.huecos)) p.huecos = [];
            // Rellenar campos faltantes con valores por defecto
            if (p.obligatoria === undefined) p.obligatoria = true;
            if (p.puntos === undefined) p.puntos = 1;
            if (p.retroalimentacion_correcta === undefined) p.retroalimentacion_correcta = '¡Excelente trabajo!';
            if (p.retroalimentacion_incorrecta === undefined) p.retroalimentacion_incorrecta = 'Respuesta incorrecta.';
          });
        }
      }

      // Draft Local
      const draftKey = 'editor_examen_' + (examen.id || 'nuevo') + '_borrador';
      const draft = localStorage.getItem(draftKey);
      if (draft && editando) {
        try {
          const draftData = JSON.parse(draft);
          if (draftData && draftData.preguntas && draftData.preguntas.length > 0) {
            const recuperar = await window.helpers.confirmar(
              'Se encontró un borrador con cambios sin guardar. ¿Deseas recuperarlo?',
              { titulo: 'Borrador detectado', textoConfirmar: 'Recuperar', textoCancelar: 'Descartar' }
            );
            if (recuperar) examen = { ...examen, ...draftData };
          }
        } catch (e) {}
      }

      let evaluaciones = [];
      try { evaluaciones = await window.examenesRepository.listarEvaluaciones(usuario.grupo_id); } catch (e) {}

      this._examen = examen;
      this._evaluaciones = evaluaciones;
      this._editando = editando;
      this._draftKey = draftKey;
      this._editoresHueco = {};

      this._renderizarCompleto(raiz);
    },

    desmontar() {
      if (this._autoSaveInterval) {
        clearInterval(this._autoSaveInterval);
        this._autoSaveInterval = null;
      }
      // Solo guardar borrador si NO se ha guardado ya con éxito
      if (this._examen && !this._guardadoExitoso) {
        try {
          localStorage.setItem(this._draftKey, JSON.stringify(this._examen));
        } catch (e) {}
      }
    },    _renderizarCompleto(raiz) {
      const examen = this._examen;
      raiz.innerHTML = `
        <div class="editor-root" style="--color-acento: ${examen.color || '#2563EB'}">
          <!-- CABECERA: título grande + botones -->
          <header class="editor-header-bar">
            <div class="editor-header-bar__inner">
              <div class="editor-header-bar__titulo-wrap">
                <button class="editor-header-bar__volver-btn" id="btnEditorVolver" title="Volver a exámenes">${window.Iconos.render('arrow-left')}</button>
                <h2 class="editor-header-bar__titulo" id="cabeceraTituloExamen">${window.helpers.escapeHtml(examen.titulo)}</h2>
              </div>
              <div class="editor-header-bar__acciones">
                <span id="saveIndicator" style="font-size:var(--texto-xs);color:var(--color-texto-terciario);margin-right:var(--espaciado-xs)">${window.Iconos.render('check')} Guardado</span>
                <button class="btn-secundario" id="btnGuardarEditor">${window.Iconos.render('save')} Guardar</button>
                <button class="btn-primario" id="btnPublicarEditor">Publicar</button>
              </div>
            </div>
          </header>

          <!-- TABS SEGMENTADOS -->
          <nav class="editor-tabs" role="tablist">
            <div class="editor-tabs__inner">
              <button class="editor-tab-btn ${this._pestanaActiva === 'informacion' ? 'editor-tab-btn--active' : ''}" data-tab="informacion" role="tab">Información</button>
              <button class="editor-tab-btn ${this._pestanaActiva === 'preguntas' ? 'editor-tab-btn--active' : ''}" data-tab="preguntas" role="tab">Preguntas <span id="tabCountPreguntas">(${examen.preguntas.length})</span></button>
              <button class="editor-tab-btn ${this._pestanaActiva === 'configuracion' ? 'editor-tab-btn--active' : ''}" data-tab="configuracion" role="tab">Configuración</button>
              <button class="editor-tab-btn ${this._pestanaActiva === 'vista_previa' ? 'editor-tab-btn--active' : ''}" data-tab="vista_previa" role="tab">Vista previa</button>
            </div>
          </nav>

          <!-- ESPACIO DE TRABAJO -->
          <main class="editor-workspace" id="editorWorkspaceArea">
          </main>

          <!-- BARRA FLOTANTE (Solo visible en pestaña Preguntas) -->
          <div class="floating-toolbar" id="formsFloatingToolbar" style="${this._pestanaActiva === 'preguntas' ? '' : 'display:none'}">
            <button class="toolbar-btn toolbar-btn--principal" id="floatAddQuestion" title="Añadir pregunta">${window.Iconos.render('plus-circle')}</button>
            <button class="toolbar-btn" id="floatAddTitle" title="Añadir sección">${window.Iconos.render('layout')}</button>
          </div>
        </div>
      `;

      this._conectarAccionesGenerales(raiz);
      this._renderizarPestanaActiva(raiz);
      this._iniciarAutoGuardado(raiz);
    },

    _conectarAccionesGenerales(raiz) {
      const btnVolver = raiz.querySelector('#btnEditorVolver');
      if (btnVolver) {
        btnVolver.onclick = async () => {
          const ok = await window.helpers.confirmar('¿Estás seguro de que quieres salir? Los cambios recientes se guardan automáticamente.', { titulo: 'Salir del editor' });
          if (ok) router.navegar('/examenes');
        };
      }

      raiz.querySelectorAll('.editor-tab-btn').forEach(btn => {
        btn.onclick = () => {
          this._sincronizarDatosPestanaActual(raiz);
          this._pestanaActiva = btn.dataset.tab;
          raiz.querySelectorAll('.editor-tab-btn').forEach(b => b.classList.remove('editor-tab-btn--active'));
          btn.classList.add('editor-tab-btn--active');
          
          const workspace = raiz.querySelector('#editorWorkspaceArea');
          const toolbar = raiz.querySelector('#formsFloatingToolbar');
          if (this._pestanaActiva === 'preguntas') {
            toolbar.style.display = '';
          } else {
            toolbar.style.display = 'none';
            workspace.classList.remove('editor-workspace--con-panel', 'editor-workspace--panel-flotante', 'editor-workspace--panel-abierto');
          }

          this._renderizarPestanaActiva(raiz);
        };
      });

      raiz.querySelector('#btnGuardarEditor').onclick = () => this._guardarExamen(raiz, false);
      raiz.querySelector('#btnPublicarEditor').onclick = () => this._guardarExamen(raiz, true);

      // Barra flotante
      raiz.querySelector('#floatAddQuestion').onclick = () => {
        const nueva = preguntaVacia();
        this._examen.preguntas.push(nueva);
        this._preguntaSeleccionadaIdx = this._examen.preguntas.length - 1;
        this._renderizarPestanaPreguntas(raiz);
        this._actualizarCountPreguntas(raiz);
        
        // Auto scroll a la nueva pregunta
        setTimeout(() => {
          const cards = raiz.querySelectorAll('.forms-card--pregunta');
          if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth' });
        }, 100);
      };

      raiz.querySelector('#floatAddTitle').onclick = async () => {
        const text = await window.helpers.formulario({
          titulo: 'Crear nueva Sección',
          mensaje: 'Las secciones te permiten dividir el examen en diferentes partes.',
          campos: [
            { nombre: 'titulo', etiqueta: 'Nombre de la sección', valor: 'Sección 2', requerido: true, placeholder: 'Parte 2: Comprensión Lectora' },
            { nombre: 'descripcion', etiqueta: 'Descripción o instrucciones', valor: '', placeholder: 'Lee detenidamente y responde...' }
          ]
        });
        if (text) {
          const nuevaSeccion = preguntaVacia();
          nuevaSeccion.tipo = 'seccion';
          nuevaSeccion.texto = text.titulo;
          nuevaSeccion.explicacion = text.descripcion;
          nuevaSeccion.opciones = [];
          nuevaSeccion.respuesta_correcta = '';
          this._examen.preguntas.push(nuevaSeccion);
          this._renderizarPestanaPreguntas(raiz);
          this._actualizarCountPreguntas(raiz);
        }
      };

    },

    _actualizarCountPreguntas(raiz) {
      const el = raiz.querySelector('#tabCountPreguntas');
      if (el) el.textContent = `(${this._examen.preguntas.length})`;
    },

    _sincronizarDatosPestanaActual(raiz) {
      if (this._pestanaActiva === 'preguntas') {
        this._sincronizarPreguntasEnPantalla(raiz);
      } else if (this._pestanaActiva === 'informacion') {
        this._sincronizarInformacion(raiz);
      } else if (this._pestanaActiva === 'configuracion') {
        this._sincronizarConfiguracion(raiz);
      }
    },

    _renderizarPestanaActiva(raiz) {
      const workspace = raiz.querySelector('#editorWorkspaceArea');
      workspace.innerHTML = '';

      switch (this._pestanaActiva) {
        case 'informacion':
          this._renderizarPestanaInformacion(workspace);
          break;
        case 'preguntas':
          this._renderizarPestanaPreguntas(raiz);
          break;
        case 'configuracion':
          this._renderizarPestanaConfiguracion(workspace);
          break;
        case 'vista_previa':
          this._renderizarPestanaVistaPrevia(workspace);
          break;
      }
      window.Iconos.actualizar();
    },

    // ==========================================
    // PESTAÑA 1: INFORMACIÓN GENERAL
    // ==========================================
    _renderizarPestanaInformacion(contenedor) {
      const examen = this._examen;
      const evaluaciones = this._evaluaciones;
      const selectEvaluaciones = evaluaciones.map(e => 
        `<option value="${e.id}" ${e.id === examen.evaluacion_id ? 'selected' : ''}>${window.helpers.escapeHtml(e.titulo)}</option>`
      ).join('');

      const estadoBadge = examen.estado === 'publicado' 
        ? '<span style="background:var(--color-exito-soft);color:var(--color-exito);padding:2px 10px;border-radius:var(--radio-pill);font-size:var(--texto-xs)">Publicado</span>'
        : examen.estado === 'archivado'
        ? '<span style="background:var(--color-error-soft);color:var(--color-error);padding:2px 10px;border-radius:var(--radio-pill);font-size:var(--texto-xs)">Archivado</span>'
        : '<span style="background:var(--color-fondo-alt);color:var(--color-texto-terciario);padding:2px 10px;border-radius:var(--radio-pill);font-size:var(--texto-xs)">Borrador</span>';

      contenedor.innerHTML = `
        <div class="forms-card">
          <div class="o-pila">
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Título del examen</label>
            <input type="text" id="infoTitulo" value="${window.helpers.escapeHtml(examen.titulo)}" placeholder="Ej: Examen Unidad 5">
          </div>

          <div class="o-pila">
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Descripción o Instrucciones</label>
            <textarea id="infoDescripcion" rows="3" placeholder="Instrucciones para tus alumnos...">${window.helpers.escapeHtml(examen.descripcion || '')}</textarea>
          </div>

          <div class="o-pila">
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Evaluación</label>
            <select id="infoEvaluacion">
              <option value="">— Ninguna —</option>
              ${selectEvaluaciones}
            </select>
          </div>

          <div class="o-pila">
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Estado</label>
            <div>${estadoBadge}</div>
            <p class="u-fs-xs u-color-texto-terciario">El estado se cambia al guardar o publicar desde la cabecera.</p>
          </div>
        </div>
      `;

      contenedor.querySelector('#infoTitulo').addEventListener('input', (e) => {
        examen.titulo = e.target.value || 'Examen sin título';
        const cabeceraTitulo = document.getElementById('cabeceraTituloExamen');
        if (cabeceraTitulo) cabeceraTitulo.innerHTML = `${window.helpers.escapeHtml(examen.titulo)}`;
      });
    },

    _sincronizarInformacion(raiz) {
      const examen = this._examen;
      const tit = raiz.querySelector('#infoTitulo')?.value;
      if (tit) examen.titulo = tit;
      examen.descripcion = raiz.querySelector('#infoDescripcion')?.value || '';
      examen.evaluacion_id = raiz.querySelector('#infoEvaluacion')?.value || null;
    },

    // ==========================================
    // PESTAÑA 2: PREGUNTAS (EL CORAZÓN)
    // ==========================================
    _renderizarPestanaPreguntas(raiz) {
      const workspace = raiz.querySelector('#editorWorkspaceArea');
      workspace.innerHTML = `
        <div class="preguntas-lista" id="preguntasContainerArea">
          <!-- Cabecera + tarjetas de preguntas (renderizadas juntas) -->
        </div>
      `;

      this._renderizarPreguntasTarjetas(raiz);
    },

    _renderizarPreguntasTarjetas(raiz) {
      const cont = raiz.querySelector('#preguntasContainerArea');
      if (!cont) return;
      const preguntas = this._examen.preguntas;
      const puntosTotales = preguntas.reduce((acc, p) => acc + (p.puntos || 0), 0);
      const numPreguntas = preguntas.filter(p => p.tipo !== 'seccion').length;

      const cabecera = `
        <div class="preguntas-cabecera">
          <div class="preguntas-cabecera__info">
            <h3 class="preguntas-cabecera__titulo">Preguntas <span class="preguntas-cabecera__contador">${preguntas.length}</span></h3>
            <span class="u-fs-xs u-color-texto-terciario">${numPreguntas} preguntas · ${puntosTotales} puntos</span>
          </div>
          <div class="preguntas-cabecera__acciones">
            <button class="btn-secundario u-fs-sm" id="btnNuevaPregunta" title="Añadir pregunta">${window.Iconos.render('plus')} Pregunta</button>
            <button class="btn-secundario u-fs-sm" id="btnNuevaSeccion" title="Añadir sección">${window.Iconos.render('layout')} Sección</button>

          </div>
        </div>
      `;

      if (preguntas.length === 0) {
        cont.innerHTML = cabecera + `
          <div class="forms-card u-texto-centrado" style="padding:var(--espaciado-lg)">
            <p style="font-size:3rem">${window.Iconos.render('help-circle')}</p>
            <h4>No hay preguntas aún</h4>
            <p class="u-color-texto-secundario">Utiliza «Añadir pregunta» o el botón flotante (+) para crear tu primera pregunta.</p>
          </div>
        `;
        this._conectarCabeceraPreguntas(raiz);
        window.Iconos.actualizar();
        return;
      }

      cont.innerHTML = cabecera + preguntas.map((p, i) => {
        const esSeleccionada = this._preguntaSeleccionadaIdx === i;
        
        if (p.tipo === 'seccion') {
          return `
            <div class="forms-card forms-card--seccion ${esSeleccionada ? 'forms-card--pregunta-active' : ''}" data-preg-idx="${i}">
              <div class="o-flecha o-flecha--between">
                <span class="u-fs-xs u-fw-700 u-color-texto-terciario u-seccion-badge">SECCIÓN</span>
                <div class="o-flecha u-gap-2xs">
                  <button class="btn-secundario btn-icono u-fs-xs btn-subir-p" data-idx="${i}">${window.Iconos.render('chevron-up')}</button>
                  <button class="btn-secundario btn-icono u-fs-xs btn-bajar-p" data-idx="${i}">${window.Iconos.render('chevron-down')}</button>
                  <button class="btn-secundario btn-icono u-fs-xs btn-duplicar-p" data-idx="${i}">${window.Iconos.render('copy')}</button>
                  <button class="btn-secundario btn-icono u-fs-xs btn-eliminar-p" data-idx="${i}" style="color:var(--color-error)">${window.Iconos.render('trash-2')}</button>
                </div>
              </div>
              <input type="text" class="u-fw-600" data-campo-pregunta="texto" data-idx="${i}" value="${window.helpers.escapeHtml(p.texto)}" placeholder="Título de la Sección">
              <textarea rows="2" data-campo-pregunta="explicacion" data-idx="${i}" placeholder="Instrucciones de la sección">${window.helpers.escapeHtml(p.explicacion || '')}</textarea>
            </div>
          `;
        }

        const tipoSelect = TIPOS_PREGUNTA.map(t => 
          `<option value="${t.valor}" ${p.tipo === t.valor ? 'selected' : ''}>${t.nombre}</option>`
        ).join('');

        return `            <div class="forms-card forms-card--pregunta ${esSeleccionada ? 'forms-card--pregunta-active' : ''}" data-preg-idx="${i}">
            <div class="o-flecha o-flecha--between u-flex-center">
              <span class="u-fs-xs u-fw-700 u-color-texto-terciario">PREGUNTA ${i + 1}</span>
              <div class="o-flecha u-gap-xs">
                <select class="select-tipo-p" data-idx="${i}" style="padding:4px 8px; font-size:var(--texto-xs)">
                  ${tipoSelect}
                </select>
                <button class="btn-secundario btn-icono u-fs-xs btn-subir-p" data-idx="${i}">${window.Iconos.render('chevron-up')}</button>
                <button class="btn-secundario btn-icono u-fs-xs btn-bajar-p" data-idx="${i}">${window.Iconos.render('chevron-down')}</button>
                <button class="btn-secundario btn-icono u-fs-xs btn-duplicar-p" data-idx="${i}">${window.Iconos.render('copy')}</button>
                <button class="btn-secundario btn-icono u-fs-xs btn-eliminar-p u-color-error" data-idx="${i}">${window.Iconos.render('trash-2')}</button>
              </div>
            </div>

            <!-- Cuerpo de Pregunta (oculto para 'completar': el texto vive en el editor de huecos) -->
            ${p.tipo === 'completar' ? '' : `<textarea class="u-fw-600" rows="2" data-campo-pregunta="texto" data-idx="${i}" placeholder="Pregunta sin título">${window.helpers.escapeHtml(p.texto)}</textarea>`}
            
            <!-- Zona Multimedia (opcional, si tiene valor asignado) -->
            ${p.imagen ? `<div style="position:relative"><img src="${window.helpers.escapeHtml(p.imagen)}" style="max-height:150px;border-radius:var(--radio-sm)"><button class="btn-secundario btn-icono btn-remove-img" data-idx="${i}" style="position:absolute;top:5px;left:5px;background:rgba(255,255,255,0.8)">✕</button></div>` : ''}

            <!-- Opciones específicas de Tipo de Pregunta -->
            <div class="o-pila u-mt-1" data-opciones-p-idx="${i}">
              ${this._renderizarCuerpoEspecifico(p, i)}
            </div>
            
            <div class="o-flecha o-flecha--between u-mt-1" style="border-top:1px dashed var(--color-borde);padding-top:var(--espaciado-xs);align-items:center">
              <span class="u-fs-xs u-color-texto-terciario">Puntos: <b>${p.puntos || 1} pt</b> | Obligatoria: <b>${p.obligatoria ? 'Sí' : 'No'}</b></span>
            </div>
          </div>
        `;
      }).join('');

      this._conectarCabeceraPreguntas(raiz);
      this._conectarEventosPreguntas(raiz);
      window.Iconos.actualizar();
    },

    _renderizarCuerpoEspecifico(p, i) {
      let html = '';
      if (p.tipo === 'multiple' || p.tipo === 'opcion_unica') {
        html += (p.opciones || []).map((o, oi) => `
          <div class="o-flecha u-gap-xs u-mb-xxs">
            <input type="radio" name="correcta_${i}" ${String(p.respuesta_correcta) === String(oi) ? 'checked' : ''} data-correcta-idx="${oi}" data-idx="${i}">
            <input type="text" data-opcion-val="${oi}" data-idx="${i}" value="${window.helpers.escapeHtml(o)}" placeholder="Opción ${oi + 1}" class="u-flex-1">
            <button class="btn-remove-opt u-color-error u-btn-ghost" data-idx="${i}" data-opt-idx="${oi}">✕</button>
          </div>
        `).join('');
        html += `<button class="btn-secundario u-fs-xs btn-add-opt u-self-start" data-idx="${i}">+ Añadir opción</button>`;
      } else if (p.tipo === 'varias_opciones') {
        let seleccionadas = [];
        try {
          const parseadas = JSON.parse(p.respuesta_correcta || '[]');
          seleccionadas = Array.isArray(parseadas) ? parseadas : [];
        } catch (e) { seleccionadas = []; }
        html += (p.opciones || []).map((o, oi) => `
          <div class="o-flecha u-gap-xs u-mb-xxs">
            <input type="checkbox" ${seleccionadas.includes(oi) ? 'checked' : ''} data-correcta-check-idx="${oi}" data-idx="${i}">
            <input type="text" data-opcion-val="${oi}" data-idx="${i}" value="${window.helpers.escapeHtml(o)}" placeholder="Opción ${oi + 1}" class="u-flex-1">
            <button class="btn-remove-opt u-color-error u-btn-ghost" data-idx="${i}" data-opt-idx="${oi}">✕</button>
          </div>
        `).join('');
        html += `<button class="btn-secundario u-fs-xs btn-add-opt" data-idx="${i}" style="align-self:flex-start">+ Añadir opción</button>`;
      } else if (p.tipo === 'verdadero_falso') {
        html += `
          <div class="o-flecha u-gap-md">
            <label class="o-flecha u-gap-2xs"><input type="radio" name="vf_${i}" value="true" ${p.respuesta_correcta === 'true' ? 'checked' : ''} data-vf-val="true" data-idx="${i}"> Verdadero</label>
            <label class="o-flecha u-gap-2xs"><input type="radio" name="vf_${i}" value="false" ${p.respuesta_correcta === 'false' ? 'checked' : ''} data-vf-val="false" data-idx="${i}"> Falso</label>
          </div>
        `;
      } else if (p.tipo === 'respuesta_corta') {
        html += `<input type="text" class="u-w-full" data-correcta-texto="${i}" value="${window.helpers.escapeHtml(p.respuesta_correcta || '')}" placeholder="Respuesta correcta (variantes separadas por |)">`;
      } else if (p.tipo === 'texto_largo') {
        html += `<textarea class="u-w-full u-input-desactivado" rows="2" placeholder="Respuesta de párrafo (se corregirá manualmente o con palabras clave)" disabled></textarea>`;
      } else if (p.tipo === 'completar') {
        html += `<div id="editorHuecos_${i}"></div>`;
      } else if (p.tipo === 'relacionar') {
        const opciones = p.opciones || ['', '', ''];
        const mitad = Math.ceil(opciones.length / 2);
        let relacion = {};
        try { relacion = JSON.parse(p.respuesta_correcta || '{}'); } catch (e) { relacion = {}; }
        
        html += `<div class="o-pila u-gap-xs">`;
        for (let pi = 0; pi < mitad; pi++) {
          html += `
            <div class="o-flecha u-gap-xs">
              <input type="text" class="u-flex-1" data-rel-izq="${pi}" data-idx="${i}" value="${window.helpers.escapeHtml(opciones[pi] || '')}" placeholder="Izquierda ${pi + 1}">
              <span>→</span>
              <input type="text" class="u-flex-1" data-rel-der="${pi}" data-idx="${i}" value="${window.helpers.escapeHtml(opciones[mitad + pi] || '')}" placeholder="Derecha ${pi + 1}">
            </div>
          `;
        }
        html += `</div>`;
        html += `
          <div class="o-flecha u-mt-1 u-gap-2xs">
            <button class="btn-secundario u-fs-xs btn-add-par" data-idx="${i}">+ Par</button>
            <button class="btn-secundario u-fs-xs btn-remove-par" data-idx="${i}" ${mitad <= 1 ? 'disabled class="u-input-desactivado"' : ''}>- Par</button>
          </div>
        `;
      } else if (p.tipo === 'ordenar') {
        html += (p.opciones || []).map((o, oi) => `
          <div class="o-flecha u-gap-xs u-mb-xxs">
            <span class="u-fw-600 u-fs-xs">${oi + 1}.</span>
            <input type="text" class="u-flex-1" data-orden-opt="${oi}" data-idx="${i}" value="${window.helpers.escapeHtml(o)}" placeholder="Elemento en su posición correcta">
            <button class="btn-remove-opt u-color-error u-btn-ghost" data-idx="${i}" data-opt-idx="${oi}">✕</button>
          </div>
        `).join('');
        html += `<button class="btn-secundario u-fs-xs btn-add-opt" data-idx="${i}">+ Añadir elemento</button>`;
      }
      return html;
    },

    _conectarCabeceraPreguntas(raiz) {
      const btnNueva = raiz.querySelector('#btnNuevaPregunta');
      if (btnNueva) {
        btnNueva.onclick = () => {
          const nueva = preguntaVacia();
          this._examen.preguntas.push(nueva);
          this._preguntaSeleccionadaIdx = this._examen.preguntas.length - 1;
          this._renderizarPreguntasTarjetas(raiz);
          this._actualizarCountPreguntas(raiz);
          setTimeout(() => {
            const cards = raiz.querySelectorAll('.forms-card--pregunta');
            if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth' });
          }, 100);
        };
      }

      const btnSeccion = raiz.querySelector('#btnNuevaSeccion');
      if (btnSeccion) {
        btnSeccion.onclick = async () => {
          const text = await window.helpers.formulario({
            titulo: 'Crear nueva Sección',
            mensaje: 'Las secciones te permiten dividir el examen en diferentes partes.',
            campos: [
              { nombre: 'titulo', etiqueta: 'Nombre de la sección', valor: 'Sección 2', requerido: true, placeholder: 'Parte 2: Comprensión Lectora' },
              { nombre: 'descripcion', etiqueta: 'Descripción o instrucciones', valor: '', placeholder: 'Lee detenidamente y responde...' }
            ]
          });
          if (text) {
            const nuevaSeccion = preguntaVacia();
            nuevaSeccion.tipo = 'seccion';
            nuevaSeccion.texto = text.titulo;
            nuevaSeccion.explicacion = text.descripcion;
            nuevaSeccion.opciones = [];
            nuevaSeccion.respuesta_correcta = '';
            this._examen.preguntas.push(nuevaSeccion);
            this._renderizarPreguntasTarjetas(raiz);
            this._actualizarCountPreguntas(raiz);
          }
        };
      }

    },

    _conectarEventosPreguntas(raiz) {
      const cont = raiz.querySelector('#preguntasContainerArea');
      if (!cont) return;

      // Seleccionar pregunta
      cont.querySelectorAll('.forms-card').forEach(card => {
        card.onclick = (e) => {
          if (e.target.closest('button, select, input, textarea')) return;
          const idx = parseInt(card.dataset.pregIdx);
          if (!isNaN(idx) && idx !== this._preguntaSeleccionadaIdx) {
            this._sincronizarPreguntasEnPantalla(raiz);
            this._preguntaSeleccionadaIdx = idx;
            this._renderizarPreguntasTarjetas(raiz);
          }
        };
      });

      // Cambiar Tipo de Pregunta
      cont.querySelectorAll('.select-tipo-p').forEach(sel => {
        sel.onchange = () => {
          const idx = parseInt(sel.dataset.idx);
          const nuevoTipo = sel.value;
          const p = this._examen.preguntas[idx];
          p.tipo = nuevoTipo;
          if (nuevoTipo === 'multiple' || nuevoTipo === 'opcion_unica' || nuevoTipo === 'varias_opciones') {
            p.opciones = p.opciones.length >= 2 ? p.opciones : ['Opción A', 'Opción B', 'Opción C'];
            // 'varias_opciones' guarda un array JSON de índices marcados; el resto, un índice único
            p.respuesta_correcta = nuevoTipo === 'varias_opciones' ? '[]' : '0';
          } else if (nuevoTipo === 'verdadero_falso') {
            p.opciones = [];
            p.respuesta_correcta = 'true';
          } else if (nuevoTipo === 'completar') {
            p.opciones = [];
            p.huecos = [];
            p.respuesta_correcta = '';
          } else if (nuevoTipo === 'relacionar') {
            p.opciones = ['Opción A izq', 'Opción B izq', 'Opción A der', 'Opción B der'];
            p.respuesta_correcta = '{"0":0, "1":1}';
          } else if (nuevoTipo === 'ordenar') {
            p.opciones = ['Paso 1', 'Paso 2', 'Paso 3'];
            p.respuesta_correcta = '[0,1,2]';
          }
          this._renderizarPreguntasTarjetas(raiz);
        };
      });

      // Duplicar pregunta
      cont.querySelectorAll('.btn-duplicar-p').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.idx);
          const original = this._examen.preguntas[idx];
          const copia = JSON.parse(JSON.stringify(original));
          copia.id = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
          this._examen.preguntas.splice(idx + 1, 0, copia);
          this._preguntaSeleccionadaIdx = idx + 1;
          this._renderizarPreguntasTarjetas(raiz);
          this._actualizarCountPreguntas(raiz);
        };
      });

      // Eliminar pregunta
      cont.querySelectorAll('.btn-eliminar-p').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.idx);
          if (this._examen.preguntas.length <= 1) {
            window.helpers.mostrarAlerta('El examen debe tener al menos una tarjeta o sección.', 'advertencia');
            return;
          }
          const ok = await window.helpers.confirmar('¿Estás seguro de que quieres eliminar esta tarjeta?', { titulo: 'Eliminar tarjeta' });
          if (ok) {
            this._examen.preguntas.splice(idx, 1);
            this._preguntaSeleccionadaIdx = Math.max(0, idx - 1);
            this._renderizarPreguntasTarjetas(raiz);
            this._actualizarCountPreguntas(raiz);
          }
        };
      });

      // Reordenar: Mover arriba
      cont.querySelectorAll('.btn-subir-p').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.idx);
          if (idx > 0) {
            this._sincronizarPreguntasEnPantalla(raiz);
            [this._examen.preguntas[idx], this._examen.preguntas[idx - 1]] = [this._examen.preguntas[idx - 1], this._examen.preguntas[idx]];
            this._preguntaSeleccionadaIdx = idx - 1;
            this._renderizarPreguntasTarjetas(raiz);
          }
        };
      });

      // Reordenar: Mover abajo
      cont.querySelectorAll('.btn-bajar-p').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.idx);
          if (idx < this._examen.preguntas.length - 1) {
            this._sincronizarPreguntasEnPantalla(raiz);
            [this._examen.preguntas[idx], this._examen.preguntas[idx + 1]] = [this._examen.preguntas[idx + 1], this._examen.preguntas[idx]];
            this._preguntaSeleccionadaIdx = idx + 1;
            this._renderizarPreguntasTarjetas(raiz);
          }
        };
      });

      // Añadir opción
      cont.querySelectorAll('.btn-add-opt').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          const p = this._examen.preguntas[idx];
          p.opciones.push(`Nueva Opción ${p.opciones.length + 1}`);
          this._renderizarPreguntasTarjetas(raiz);
        };
      });

      // Quitar opción
      cont.querySelectorAll('.btn-remove-opt').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          const optIdx = parseInt(btn.dataset.optIdx);
          const p = this._examen.preguntas[idx];
          if (p.opciones.length > 2) {
            p.opciones.splice(optIdx, 1);
            this._renderizarPreguntasTarjetas(raiz);
          } else {
            window.helpers.mostrarAlerta('Debes mantener al menos dos opciones.', 'advertencia');
          }
        };
      });

      // Quitar imagen
      cont.querySelectorAll('.btn-remove-img').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          this._examen.preguntas[idx].imagen = '';
          this._renderizarPreguntasTarjetas(raiz);
        };
      });

      // Agregar pares (relacionar)
      cont.querySelectorAll('.btn-add-par').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          const p = this._examen.preguntas[idx];
          const mitad = Math.ceil(p.opciones.length / 2);
          const izq = p.opciones.slice(0, mitad);
          const der = p.opciones.slice(mitad);
          
          izq.push(`Nueva Izq ${mitad + 1}`);
          der.push(`Nueva Der ${mitad + 1}`);
          
          p.opciones = [...izq, ...der];
          
          let relacion = {};
          try { relacion = JSON.parse(p.respuesta_correcta || '{}'); } catch (e) { relacion = {}; }
          relacion[String(mitad)] = mitad;
          p.respuesta_correcta = JSON.stringify(relacion);
          
          this._renderizarPreguntasTarjetas(raiz);
        };
      });

      // Quitar pares (relacionar)
      cont.querySelectorAll('.btn-remove-par').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          const p = this._examen.preguntas[idx];
          const mitad = Math.ceil(p.opciones.length / 2);
          if (mitad > 1) {
            const izq = p.opciones.slice(0, mitad);
            const der = p.opciones.slice(mitad);
            izq.pop();
            der.pop();
            p.opciones = [...izq, ...der];
            
            let relacion = {};
            try { relacion = JSON.parse(p.respuesta_correcta || '{}'); } catch (e) { relacion = {}; }
            delete relacion[String(mitad - 1)];
            p.respuesta_correcta = JSON.stringify(relacion);
            
            this._renderizarPreguntasTarjetas(raiz);
          }
        };
      });

      // Montar editor de completar huecos
      this._examen.preguntas.forEach((p, i) => {
        if (p.tipo === 'completar') {
          const contHuecos = raiz.querySelector(`#editorHuecos_${i}`);
          if (contHuecos) {
            window.editorHuecos.montar(contHuecos, {
              // El texto por defecto 'Nueva pregunta' no tiene sentido en un
              // editor de huecos: se empieza con el enunciado vacío.
              texto: p.texto && p.texto !== 'Nueva pregunta' ? p.texto : '',
              huecos: p.huecos || [],
              onChange: (datos) => {
                p.texto = datos.texto;
                p.huecos = datos.huecos;
              }
            });
          }
        }
      });
    },

    _sincronizarPreguntasEnPantalla(raiz) {
      const cont = raiz.querySelector('#preguntasContainerArea');
      if (!cont) return;

      this._examen.preguntas.forEach((p, i) => {
        const card = cont.querySelector(`.forms-card[data-preg-idx="${i}"]`);
        if (!card) return;

        // Texto o título principal (para 'completar' lo gestiona el editor de huecos)
        const txtInput = card.querySelector(`[data-campo-pregunta="texto"]`);
        if (txtInput && p.tipo !== 'completar') p.texto = txtInput.value;

        // Si es sección, también lee descripción
        if (p.tipo === 'seccion') {
          const descInput = card.querySelector(`[data-campo-pregunta="explicacion"]`);
          if (descInput) p.explicacion = descInput.value;
          return;
        }

        // Respuestas cortas
        const cortasInput = card.querySelector(`[data-correcta-texto="${i}"]`);
        if (cortasInput) p.respuesta_correcta = cortasInput.value;

        // Sincronizar Opciones de texto para opción múltiple, varias opciones y ordenar
        card.querySelectorAll(`input[data-opcion-val]`).forEach(optEl => {
          const optIdx = parseInt(optEl.dataset.opcionVal);
          p.opciones[optIdx] = optEl.value;
        });

        card.querySelectorAll(`input[data-orden-opt]`).forEach(optEl => {
          const optIdx = parseInt(optEl.dataset.ordenOpt);
          p.opciones[optIdx] = optEl.value;
        });

        // Sincronizar respuesta correcta de opción múltiple
        const elegidaRadio = card.querySelector(`input[name="correcta_${i}"]:checked`);
        if (elegidaRadio) {
          p.respuesta_correcta = elegidaRadio.dataset.correctaIdx;
        }

        // Sincronizar respuestas correctas múltiples (checkboxes):
        // siempre se escribe el array (aunque esté vacío) para no dejar un '0' inválido
        if (p.tipo === 'varias_opciones') {
          const elegidasChecks = card.querySelectorAll(`input[data-correcta-check-idx]:checked`);
          const list = Array.from(elegidasChecks).map(c => parseInt(c.dataset.correctaCheckIdx));
          p.respuesta_correcta = JSON.stringify(list);
        }

        // Sincronizar verdadero o falso
        const elegidaVF = card.querySelector(`input[name="vf_${i}"]:checked`);
        if (elegidaVF) {
          p.respuesta_correcta = elegidaVF.dataset.vfVal;
        }

        // Relacionar columnas
        const relIzquierdas = card.querySelectorAll(`input[data-rel-izq]`);
        const relDerechas = card.querySelectorAll(`input[data-rel-der]`);
        if (relIzquierdas.length && relDerechas.length) {
          const opcionesNuevas = [];
          const mapeo = {};
          
          relIzquierdas.forEach((el, index) => {
            opcionesNuevas[index] = el.value;
          });
          relDerechas.forEach((el, index) => {
            opcionesNuevas[relIzquierdas.length + index] = el.value;
            mapeo[String(index)] = index;
          });
          p.opciones = opcionesNuevas;
          p.respuesta_correcta = JSON.stringify(mapeo);
        }
      });
    },

    // ==========================================
    // PESTAÑA 3: CONFIGURACIÓN AVANZADA
    // ==========================================
    _renderizarPestanaConfiguracion(contenedor) {
      const config = this._examen.config || {};

      const modoCard = (valor, titulo, desc, icono) => {
        const sel = config.modo === valor ? ' modo-selector__opcion--sel' : '';
        const checked = config.modo === valor ? 'checked' : '';
        return `
          <label class="modo-selector__opcion${sel}" data-modo="${valor}">
            <input type="radio" name="confModo" value="${valor}" ${checked} class="modo-selector__radio">
            <span class="modo-selector__icono">${icono}</span>
            <span class="modo-selector__texto"><b>${titulo}</b><small>${desc}</small></span>
            <span class="modo-selector__check">${window.Iconos.render('check')}</span>
          </label>`;
      };

      contenedor.innerHTML = `
        <div class="forms-card config-eval">
          <h3 class="config-eval__titulo">${window.Iconos.render('settings')} Configuración de la evaluación</h3>

          <section class="config-seccion">
            <h4 class="config-seccion__titulo">Modo de funcionamiento</h4>
            <div class="modo-selector">
              ${modoCard('examen', 'Modo Examen', 'Calificaciones formales, intentos limitados y temporizador estricto.', '🎯')}
              ${modoCard('encuesta', 'Modo Encuesta', 'Recopila opiniones o datos sin respuestas correctas asignadas.', '📊')}
            </div>
          </section>

          <section class="config-seccion">
            <h4 class="config-seccion__titulo">Disponibilidad</h4>
            <div class="config-fila">
              <div class="o-pila">
                <label class="config-label">Fecha y hora de inicio</label>
                <input type="datetime-local" id="confFechaInicio" value="${config.fecha_inicio || ''}">
              </div>
              <div class="o-pila">
                <label class="config-label">Fecha y hora de límite</label>
                <input type="datetime-local" id="confFechaFin" value="${config.fecha_fin || ''}">
              </div>
            </div>
            <p class="config-ayuda">Deja ambos vacíos para que esté disponible siempre.</p>
          </section>

          <section class="config-seccion">
            <h4 class="config-seccion__titulo">Intentos y tiempo</h4>
            <div class="config-fila">
              <div class="o-pila">
                <label class="config-label">Intentos permitidos</label>
                <select id="confIntentos">
                  <option value="1" ${config.intentos === '1' ? 'selected' : ''}>1 intento único</option>
                  <option value="2" ${config.intentos === '2' ? 'selected' : ''}>2 intentos</option>
                  <option value="3" ${config.intentos === '3' ? 'selected' : ''}>3 intentos</option>
                  <option value="ilimitados" ${config.intentos === 'ilimitados' ? 'selected' : ''}>Ilimitados</option>
                </select>
              </div>
              <div class="o-pila">
                <label class="config-label">Temporizador general</label>
                <select id="confTemporizadorGlobal">
                  <option value="sin_limite" ${config.temporizador_global === 'sin_limite' ? 'selected' : ''}>Sin límite de tiempo</option>
                  <option value="15" ${config.temporizador_global === '15' ? 'selected' : ''}>15 minutos</option>
                  <option value="30" ${config.temporizador_global === '30' ? 'selected' : ''}>30 minutos</option>
                  <option value="45" ${config.temporizador_global === '45' ? 'selected' : ''}>45 minutos</option>
                  <option value="60" ${config.temporizador_global === '60' ? 'selected' : ''}>60 minutos</option>
                  <option value="personalizado" ${config.temporizador_global === 'personalizado' ? 'selected' : ''}>Personalizado...</option>
                </select>
                <input type="number" id="confTemporizadorMinutos" value="${config.temporizador_personalizado || 0}" min="1" placeholder="Minutos" class="config-temporizador-custom ${config.temporizador_global === 'personalizado' ? '' : 'is-oculto'}">
              </div>
            </div>
          </section>

          <section class="config-seccion">
            <h4 class="config-seccion__titulo">Navegación</h4>
            <div class="config-checks">
              <label class="config-check"><input type="checkbox" id="confAleatorizarPreguntas" ${config.aleatorizar_preguntas ? 'checked' : ''}><span>Aleatorizar orden de preguntas</span></label>
              <label class="config-check"><input type="checkbox" id="confAleatorizarRespuestas" ${config.aleatorizar_respuestas ? 'checked' : ''}><span>Aleatorizar orden de opciones de respuesta</span></label>
              <label class="config-check"><input type="checkbox" id="confPermitirVolver" ${config.permitir_volver !== false ? 'checked' : ''}><span>Permitir regresar a preguntas anteriores</span></label>
            </div>
          </section>

          <section class="config-seccion">
            <h4 class="config-seccion__titulo">Resultados para el alumno</h4>
            <div class="o-pila">
              <label class="config-label">¿Cuándo se muestran las respuestas y la nota?</label>
              <select id="confResultadosVisibles" class="config-select-ancho">
                <option value="al_publicar" ${config.resultados_visibles === 'al_publicar' ? 'selected' : ''}>Cuando el profesor publique las notas</option>
                <option value="nunca" ${config.resultados_visibles === 'nunca' ? 'selected' : ''}>Nunca mostrar respuestas</option>
              </select>
            </div>
            <div class="config-checks u-mt-1">
              <label class="config-check"><input type="checkbox" id="confMostrarNota" ${config.mostrar_nota !== false ? 'checked' : ''}><span>Mostrar nota numérica de inmediato</span></label>
              <label class="config-check"><input type="checkbox" id="confMostrarRespuestas" ${config.mostrar_respuestas !== false ? 'checked' : ''}><span>Mostrar respuestas correctas</span></label>
              <label class="config-check"><input type="checkbox" id="confMostrarErrores" ${config.mostrar_errores !== false ? 'checked' : ''}><span>Mostrar preguntas falladas</span></label>
              <label class="config-check"><input type="checkbox" id="confMostrarExplicacion" ${config.mostrar_explicacion !== false ? 'checked' : ''}><span>Mostrar explicaciones pedagógicas</span></label>
            </div>
          </section>
        </div>
      `;

      // Selector de temporizador personalizado
      contenedor.querySelector('#confTemporizadorGlobal').onchange = (e) => {
        const inp = contenedor.querySelector('#confTemporizadorMinutos');
        if (inp) inp.classList.toggle('is-oculto', e.target.value !== 'personalizado');
      };

      // Resaltar la tarjeta de modo seleccionada
      contenedor.querySelectorAll('.modo-selector__opcion input').forEach(rad => {
        rad.onchange = () => {
          contenedor.querySelectorAll('.modo-selector__opcion').forEach(l =>
            l.classList.toggle('modo-selector__opcion--sel', l.querySelector('input').checked));
        };
      });
    },

    _sincronizarConfiguracion(raiz) {
      const config = this._examen.config;
      
      const modoRad = raiz.querySelector('input[name="confModo"]:checked');
      if (modoRad) config.modo = modoRad.value;
      
      config.fecha_inicio = raiz.querySelector('#confFechaInicio').value || '';
      config.fecha_fin = raiz.querySelector('#confFechaFin').value || '';
      config.intentos = raiz.querySelector('#confIntentos').value || '1';
      config.temporizador_global = raiz.querySelector('#confTemporizadorGlobal').value || 'sin_limite';
      config.temporizador_personalizado = parseInt(raiz.querySelector('#confTemporizadorMinutos').value) || 0;
      
      config.aleatorizar_preguntas = raiz.querySelector('#confAleatorizarPreguntas').checked;
      config.aleatorizar_respuestas = raiz.querySelector('#confAleatorizarRespuestas').checked;
      config.permitir_volver = raiz.querySelector('#confPermitirVolver').checked;
      
      config.resultados_visibles = raiz.querySelector('#confResultadosVisibles').value || 'al_publicar';
      config.mostrar_nota = raiz.querySelector('#confMostrarNota').checked;
      config.mostrar_respuestas = raiz.querySelector('#confMostrarRespuestas').checked;
      config.mostrar_errores = raiz.querySelector('#confMostrarErrores').checked;
      config.mostrar_explicacion = raiz.querySelector('#confMostrarExplicacion').checked;
    },

    // ==========================================
    // PESTAÑA 4: VISTA PREVIA INTERACTIVA
    // ==========================================
    _renderizarPestanaVistaPrevia(contenedor, conservar) {
      if (!conservar) this._previewRespuestas = {};
      const examen = this._examen;
      const preguntas = examen.preguntas || [];
      const numPreguntas = preguntas.filter(p => p.tipo !== 'seccion').length;
      const puntosTotales = preguntas.reduce((acc, p) => acc + (p.puntos || 0), 0);

      contenedor.innerHTML = `
        <div class="preview-barra">
          <span class="u-fs-sm u-color-texto-secundario">Simula la experiencia interactiva que tendrán tus alumnos:</span>
        </div>

        <div class="preview-container">
          <div class="preview-device preview-device--ordenador" id="previewDeviceBody">
            <div class="preview-screen">
              <div class="forms-card preview-portada" style="border-top-color: ${examen.color || '#2563EB'}">
                <h2 style="margin:0">${window.helpers.escapeHtml(examen.titulo)}</h2>
                <p class="u-color-texto-secundario u-fs-sm" style="margin:4px 0">${window.helpers.escapeHtml(examen.descripcion || 'Sin descripción.')}</p>
                <span class="u-fs-xs u-color-texto-terciario">${numPreguntas} preguntas · ${puntosTotales} puntos</span>
              </div>

              <div class="o-pila u-mt-2" style="gap:var(--espaciado-md)" id="previewInteractiveQuestions"></div>

              <button class="btn-primario u-mt-2" style="width:100%" id="previewSimulateSubmit">Enviar respuestas</button>
            </div>
          </div>
        </div>
      `;

      // (Selector de dispositivo eliminado: la previsualización se muestra
      // siempre a ancho completo — la vista que mejor refleja el contenido.)

      // Render de preguntas con numeración correcta (las secciones no cuentan)
      const areaPreguntas = contenedor.querySelector('#previewInteractiveQuestions');
      let numPregunta = 0;
      areaPreguntas.innerHTML = preguntas.map((p, index) => {
        if (p.tipo === 'seccion') {
          return `
            <div class="u-seccion-bloque preview-seccion">
              <h4 style="margin:0">${window.helpers.escapeHtml(p.texto)}</h4>
              ${p.explicacion ? `<p class="u-fs-xs" style="margin:4px 0 0;opacity:0.85">${window.helpers.escapeHtml(p.explicacion)}</p>` : ''}
            </div>
          `;
        }
        numPregunta += 1;
        const pid = p.id || ('prev_' + index);
        const resp = this._previewRespuestas[pid];
        return `
          <div class="forms-card forms-card--pregunta" data-pid="${pid}" style="border-left-color: ${p.obligatoria ? 'var(--color-acento)' : 'transparent'}">
            <span class="u-fw-600 u-fs-sm">${numPregunta}. ${p.tipo === 'completar' ? 'Completa la frase:' : window.helpers.escapeHtml(p.texto)} ${p.obligatoria ? '<span style="color:var(--color-error)">*</span>' : ''}</span>
            <span class="u-fs-xs u-color-texto-terciario" style="margin-top:-6px">${p.puntos || 1} pt</span>
            ${p.imagen ? `<img src="${window.helpers.escapeHtml(p.imagen)}" style="max-height:120px;border-radius:var(--radio-sm);align-self:flex-start">` : ''}
            <div class="o-pila u-mt-1" style="gap:4px">
              ${this._renderOpcionesPreview(p, pid, resp)}
            </div>
          </div>
        `;
      }).join('');

      // Recordar respuestas al interactuar
      areaPreguntas.addEventListener('change', (e) => {
        const card = e.target.closest('.forms-card--pregunta[data-pid]');
        if (card) this._guardarPreviewRespuestas(card);
      });

      // Simular envío con validación de preguntas obligatorias
      contenedor.querySelector('#previewSimulateSubmit').onclick = () => {
        const pendientes = [];
        areaPreguntas.querySelectorAll('.forms-card--pregunta').forEach(card => {
          const pid = card.dataset.pid;
          const p = preguntas.find(q => (q.id || 'prev_' + preguntas.indexOf(q)) === pid);
          if (!p) return;
          const respondido = this._cardPreviewRespondida(card);
          card.classList.toggle('preview-card--pendiente', p.obligatoria && !respondido);
          if (p.obligatoria && !respondido) pendientes.push(p.texto);
        });
        if (pendientes.length) {
          window.helpers.mostrarAlerta(`Faltan por responder ${pendientes.length} pregunta(s) obligatoria(s).`, 'advertencia');
          const primera = areaPreguntas.querySelector('.preview-card--pendiente');
          if (primera) primera.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        window.helpers.mostrarAlerta('¡Vista previa completada! Todas las preguntas responden correctamente.', 'exito');
      };
    },

    _guardarPreviewRespuestas(card) {
      const pid = card.dataset.pid;
      if (!pid) return;
      const datos = {};
      card.querySelectorAll('input[type="radio"]:checked').forEach(r => { datos[r.name] = r.value; });
      card.querySelectorAll('input[type="checkbox"]:checked').forEach(c => {
        (datos[c.name] = datos[c.name] || []).push(c.value);
      });
      card.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(t => {
        if (!t.value) return;
        if (t.dataset.hidx !== undefined) {
          datos['hueco_' + t.dataset.hidx] = t.value;
        } else {
          datos[t.name || 'texto'] = t.value;
        }
      });
      card.querySelectorAll('select').forEach(s => {
        if (s.value) datos[s.name] = s.value;
      });
      this._previewRespuestas[pid] = datos;
    },

    _renderOpcionesPreview(p, pid, resp) {
      let oHtml = '';
      if (p.tipo === 'multiple' || p.tipo === 'opcion_unica') {
        const sel = resp && resp['p_prev_' + pid];
        oHtml = (p.opciones || []).map((o, oi) => `
          <label class="o-flecha" style="gap:var(--espaciado-xs);padding:var(--espaciado-xxs) 0;cursor:pointer">
            <input type="radio" name="p_prev_${pid}" value="${oi}" ${sel === String(oi) ? 'checked' : ''}>
            <span class="u-fs-sm">${window.helpers.escapeHtml(o)}</span>
          </label>
        `).join('');
      } else if (p.tipo === 'varias_opciones') {
        const sel = (resp && resp['p_prev_' + pid]) || [];
        oHtml = (p.opciones || []).map((o, oi) => `
          <label class="o-flecha" style="gap:var(--espaciado-xs);padding:var(--espaciado-xxs) 0;cursor:pointer">
            <input type="checkbox" name="p_prev_${pid}" value="${oi}" ${sel.includes(String(oi)) ? 'checked' : ''}>
            <span class="u-fs-sm">${window.helpers.escapeHtml(o)}</span>
          </label>
        `).join('');
      } else if (p.tipo === 'verdadero_falso') {
        const sel = resp && resp['p_prev_' + pid];
        oHtml = `
          <label class="o-flecha" style="gap:var(--espaciado-xs);padding:var(--espaciado-xxs) 0;cursor:pointer"><input type="radio" name="p_prev_${pid}" value="true" ${sel === 'true' ? 'checked' : ''}> <span class="u-fs-sm">Verdadero</span></label>
          <label class="o-flecha" style="gap:var(--espaciado-xs);padding:var(--espaciado-xxs) 0;cursor:pointer"><input type="radio" name="p_prev_${pid}" value="false" ${sel === 'false' ? 'checked' : ''}> <span class="u-fs-sm">Falso</span></label>
        `;
      } else if (p.tipo === 'respuesta_corta') {
        const val = (resp && resp['p_prev_' + pid]) || '';
        oHtml = `<input type="text" name="p_prev_${pid}" value="${window.helpers.escapeHtml(val)}" placeholder="Escribe tu respuesta aquí..." style="width:100%">`;
      } else if (p.tipo === 'texto_largo') {
        const val = (resp && resp['p_prev_' + pid]) || '';
        oHtml = `<textarea name="p_prev_${pid}" rows="2" placeholder="Redacta tu respuesta aquí..." style="width:100%">${window.helpers.escapeHtml(val)}</textarea>`;
      } else if (p.tipo === 'completar') {
        // Renderizado paralelo al de vista-examen-tomar.js para que el profesor vea lo mismo que el alumno.
        const huecos = Array.isArray(p.huecos) ? p.huecos : [];
        const texto = p.texto || '';
        if (!huecos.length) {
          oHtml += `<div class="preview-hueco-vacio" data-pid="${pid}">
            <p class="u-fs-sm u-color-texto-terciario"><em>Edita esta pregunta en la pestaña <b>Preguntas</b> y selecciona palabras para convertirlas en huecos.</em></p>
          </div>`;
        } else {
          const MARCADOR = /\{\{HUECO_(\d+)\}\}/g;
          const partes = texto.split(MARCADOR);
          oHtml += `<div class="pregunta-examen" data-pid="${pid}">`;
          partes.forEach((parte, pi) => {
            if (pi % 2 === 0) {
              oHtml += `<span>${window.helpers.escapeHtml(parte)}</span>`;
              return;
            }
            const hIdx = huecos.findIndex(h => h.id === parseInt(parte));
            if (hIdx === -1) {
              oHtml += `<span class="u-color-texto-terciario">[hueco ${parte} sin definir]</span>`;
              return;
            }
            const val = (resp && resp['hueco_' + hIdx]) || '';
            oHtml += `<span class="pregunta-examen__hueco-inline"><input type="text" class="pregunta-examen__hueco-input" data-hidx="${hIdx}" value="${window.helpers.escapeHtml(val)}" placeholder="…"></span>`;
          });
          oHtml += `</div>`;
        }
      } else if (p.tipo === 'relacionar') {
        const mitad = Math.ceil(p.opciones.length / 2);
        const izq = p.opciones.slice(0, mitad);
        const der = p.opciones.slice(mitad);
        oHtml += izq.map((z, zi) => {
          const nombre = `p_prev_${pid}_${zi}`;
          const val = (resp && resp[nombre]) || '';
          return `
            <div class="o-flecha o-flecha--between u-mb-1">
              <span class="u-fs-sm">${window.helpers.escapeHtml(z)}</span>
              <select name="${nombre}" style="width:140px;font-size:var(--texto-xs)">
                <option value="">— Relacionar —</option>
                ${der.map((d, di) => `<option value="${di}" ${val === String(di) ? 'selected' : ''}>${window.helpers.escapeHtml(d)}</option>`).join('')}
              </select>
            </div>
          `;
        }).join('');
      } else if (p.tipo === 'ordenar') {
        oHtml = (p.opciones || []).map((o, oi) => `
          <div class="o-flecha" style="gap:var(--espaciado-xs);background:var(--color-fondo-alt);padding:6px;border-radius:var(--radio-sm);margin-bottom:2px">
            <span>☰</span>
            <span class="u-fs-sm">${window.helpers.escapeHtml(o)}</span>
          </div>
        `).join('');
      } else if (p.tipo === 'completar') {
        oHtml = `<input type="file" name="p_prev_${pid}" style="font-size:var(--texto-xs)">`;
      }
      return oHtml;
    },

    _cardPreviewRespondida(card) {
      if (card.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked')) return true;
      const textos = card.querySelectorAll('input[type="text"], input[type="number"], textarea');
      for (const t of textos) if (t.value.trim()) return true;
      const selects = card.querySelectorAll('select');
      for (const s of selects) if (s.value && s.value !== '') return true;
      const files = card.querySelectorAll('input[type="file"]');
      for (const f of files) if (f.files && f.files.length) return true;
      return false;
    },

    // PERSISTENCIA Y GUARDADO
    // ==========================================
    _iniciarAutoGuardado(raiz) {
      if (this._autoSaveInterval) clearInterval(this._autoSaveInterval);

      this._autoSaveInterval = setInterval(() => {
        if (this._examen) {
          try {
            this._sincronizarDatosPestanaActual(raiz);
            localStorage.setItem(this._draftKey, JSON.stringify(this._examen));
            
            const indicator = raiz.querySelector('#saveIndicator');
            if (indicator) {
              indicator.innerHTML = `${window.Iconos.render('check')} Guardado`;
              indicator.style.color = 'var(--color-exito)';
              setTimeout(() => {
                if (indicator) {
                  indicator.innerHTML = `${window.Iconos.render('check')} Guardado`;
                  indicator.style.color = 'var(--color-texto-terciario)';
                }
              }, 2000);
            }
          } catch (e) {}
        }
      }, 30000); // Cada 30 segundos de inactividad
    },

    async _guardarExamen(raiz, publicar) {
      this._sincronizarDatosPestanaActual(raiz);
      const examen = this._examen;

      if (!examen.titulo.trim() || examen.titulo === 'Examen sin título') {
        window.helpers.mostrarAlerta('Por favor asigna un título válido al examen.', 'advertencia');
        return;
      }

      if (examen.preguntas.length === 0) {
        window.helpers.mostrarAlerta('El examen debe contener al menos una pregunta.', 'advertencia');
        return;
      }

      try {
        const usuario = await window.authRepository.asegurarGrupo(store.obtener('usuario'));
        examen.grupo_id = usuario.grupo_id;
        examen.creado_por = usuario.id;
        
        const guardado = await window.examenesRepository.guardar({
          id: examen.id || undefined,
          grupo_id: examen.grupo_id,
          creado_por: examen.creado_por,
          evaluacion_id: examen.evaluacion_id,
          titulo: examen.titulo.trim(),
          descripcion: examen.descripcion ? examen.descripcion.trim() : '',
          materia: examen.materia ? examen.materia.trim() : '',
          tema: examen.tema ? examen.tema.trim() : '',
          profesor: examen.profesor ? examen.profesor.trim() : '',
          color: examen.color || '#2563EB',
          icono: examen.icono || '',
          portada: examen.portada || '',
          preguntas: JSON.stringify(examen.preguntas),
          config: JSON.stringify(examen.config),
          puntos_totales: examen.preguntas.reduce((acc, p) => acc + (p.puntos || 0), 0),
          // Un guardado normal NO despublica: solo cambia el estado si se publica
          // o se archiva explícitamente; si ya estaba publicado, se mantiene.
          publicado: publicar ? true : (examen.estado === 'archivado' ? false : (examen.publicado || examen.estado === 'publicado')),
          estado: publicar ? 'publicado' : (examen.estado === 'archivado' ? 'archivado' : ((examen.publicado || examen.estado === 'publicado') ? 'publicado' : 'borrador'))
        });

        if (publicar && guardado && guardado.id) {
          await window.examenesRepository.publicar(guardado.id);
        }

        await window.adminRepository.registrarAuditoria(
          publicar ? 'examen:publicar' : 'examen:guardar',
          `Examen "${examen.titulo.trim()}" (${examen.preguntas.length} preguntas)`,
          examen.creado_por, examen.grupo_id
        );

        this._guardadoExitoso = true;
        localStorage.removeItem(this._draftKey);
        if (this._autoSaveInterval) clearInterval(this._autoSaveInterval);
        
        window.helpers.mostrarAlerta(publicar ? 'Examen publicado con éxito.' : 'Examen guardado como borrador con éxito.', 'exito');
        router.navegar('/examenes');
      } catch (e) {
        window.helpers.mostrarAlerta('Error al guardar examen: ' + e.message, 'error');
      }
    }
  };
})();
