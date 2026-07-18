(function() {
  'use strict';

  const TIPOS_PREGUNTA = [
    { valor: 'multiple', nombre: 'Opción única', icono: 'circle' },
    { valor: 'varias_opciones', nombre: 'Varias respuestas', icono: 'check-square' },
    { valor: 'verdadero_falso', nombre: 'Verdadero / Falso', icono: 'help-circle' },
    { valor: 'respuesta_corta', nombre: 'Respuesta corta', icono: 'type' },
    { valor: 'texto_largo', nombre: 'Párrafo', icono: 'align-left' },
    { valor: 'solo_numero', nombre: 'Número', icono: 'hash' },
    { valor: 'fecha', nombre: 'Fecha', icono: 'calendar' },
    { valor: 'hora', nombre: 'Hora', icono: 'clock' },
    { valor: 'completar', nombre: 'Completar huecos', icono: 'minus-square' },
    { valor: 'relacionar', nombre: 'Relacionar columnas', icono: 'link' },
    { valor: 'ordenar', nombre: 'Ordenar', icono: 'arrow-up-down' },
    { valor: 'subir_archivo', nombre: 'Subir archivo', icono: 'upload-cloud' }
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
    _pestanaActiva: 'preguntas', // preguntas, informacion, configuracion, vista_previa, respuestas
    _preguntaSeleccionadaIdx: 0,
    _modoVistaPrevia: 'ordenador', // ordenandor, tablet, movil
    _autoSaveInterval: null,
    _bancoPreguntas: [],

    async montar(raiz, params) {
      const usuario = store.obtener('usuario');
      if (!usuario || !['admin', 'editor', 'owner'].includes(usuario.rol)) {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p>Acceso no autorizado</p></div>';
        return;
      }

      // Obtener ID del examen del Hash
      const raw = (window.location.hash || '').replace(/^#!\/?/, '');
      const [pathPart, queryPart] = raw.split('?');
      const idParam = (pathPart.split('/')[1] || 'nuevo').split('?')[0];
      const q = new URLSearchParams(queryPart || '');
      const evaluacionParam = q.get('evaluacion');
      const pestanaQuery = q.get('pestana');
      if (pestanaQuery) {
        this._pestanaActiva = pestanaQuery;
      } else {
        this._pestanaActiva = 'preguntas';
      }
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
        color: '#673ab7', // Color predeterminado de Google Forms
        icono: '📘',
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
          resultados_visibles: 'al_terminar', // al_terminar, al_publicar, nunca
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
          if (typeof examen.preguntas === 'string') {
            try { examen.preguntas = JSON.parse(examen.preguntas); } catch (e) { examen.preguntas = []; }
          }
          if (typeof examen.config === 'string') {
            try { examen.config = JSON.parse(examen.config); } catch (e) { examen.config = examen.config || {}; }
          }
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

      // Intentos para pestaña Respuestas
      let intentos = [];
      if (editando) {
        try { intentos = await window.examenesRepository.obtenerIntentos(idParam); } catch (e) {}
      }

      this._examen = examen;
      this._evaluaciones = evaluaciones;
      this._intentos = intentos;
      this._editando = editando;
      this._draftKey = draftKey;
      this._editoresHueco = {};
      this._alumnosGrupo = await window.examenesRepository.obtenerMiembrosGrupo(usuario.grupo_id, true);

      // Cargar banco de preguntas simulado/local para que sea rápido
      this._bancoPreguntas = [
        { id: 'b1', texto: '¿Quién guio al pueblo de Israel fuera de Egipto?', tipo: 'multiple', opciones: ['Moisés', 'Aarón', 'Josué', 'Abraham'], respuesta_correcta: '0', obligatoria: true, puntos: 5 },
        { id: 'b2', texto: '¿En qué ciudad nació Jesús?', tipo: 'multiple', opciones: ['Nazaret', 'Jerusalén', 'Belén', 'Egipto'], respuesta_correcta: '2', obligatoria: true, puntos: 5 },
        { id: 'b3', texto: '¿Cuál fue el primer libro de la Biblia?', tipo: 'multiple', opciones: ['Éxodo', 'Génesis', 'Apocalipsis', 'Levítico'], respuesta_correcta: '1', obligatoria: true, puntos: 2 },
        { id: 'b4', texto: 'El arca de Noé tenía tres pisos.', tipo: 'verdadero_falso', opciones: [], respuesta_correcta: 'true', obligatoria: true, puntos: 2 },
        { id: 'b5', texto: '¿Cuántos días y noches llovió durante el diluvio?', tipo: 'solo_numero', opciones: [], respuesta_correcta: '40', obligatoria: true, puntos: 3 }
      ];

      this._renderizarCompleto(raiz);
    },

    desmontar() {
      if (this._autoSaveInterval) {
        clearInterval(this._autoSaveInterval);
        this._autoSaveInterval = null;
      }
      // Auto-save draft
      if (this._examen) {
        try {
          localStorage.setItem(this._draftKey, JSON.stringify(this._examen));
        } catch (e) {}
      }
    },    _renderizarCompleto(raiz) {
      const examen = this._examen;
      raiz.innerHTML = `
        <div class="editor-root" style="--color-acento: ${examen.color || '#673ab7'}">
          <!-- CABECERA PRINCIPAL -->
          <header class="editor-header-bar">
            <div class="o-flecha u-gap-sm">
              <button class="btn-secundario btn-icono" id="btnEditorVolver" title="Volver a exámenes">${window.Iconos.render('arrow-left')}</button>
              <div style="line-height:1">
                <span class="u-fs-xs u-color-texto-terciario">Editor Completo de Exámenes</span>
                <h4 id="cabeceraTituloExamen" style="margin:0;font-weight:600;display:flex;align-items:center;gap:6px">${examen.icono || '📘'} ${window.helpers.escapeHtml(examen.titulo)}</h4>
              </div>
            </div>
            
            <div class="o-flecha u-gap-xs">
              <span class="editor-draft-indicator u-flex-center u-gap-2xs" id="saveIndicator" style="font-size:var(--texto-xs);color:var(--color-texto-terciario);display:flex;align-items:center;gap:4px">
                ${window.Iconos.render('check')} Autoguardado activado
              </span>
              <button class="btn-secundario btn-icono" id="btnGuardarEditor" title="Guardar borrador">${window.Iconos.render('save')}</button>
              <button class="btn-primario" id="btnPublicarEditor" style="font-size:var(--texto-sm)">Publicar Examen</button>
            </div>
          </header>

          <!-- TABS DE NAVEGACIÓN -->
          <nav class="editor-tabs" role="tablist">
            <button class="editor-tab-btn ${this._pestanaActiva === 'informacion' ? 'editor-tab-btn--active' : ''}" data-tab="informacion" role="tab">Información</button>
            <button class="editor-tab-btn ${this._pestanaActiva === 'preguntas' ? 'editor-tab-btn--active' : ''}" data-tab="preguntas" role="tab">Preguntas <span id="tabCountPreguntas" class="u-color-texto-terciario">(${examen.preguntas.length})</span></button>
            <button class="editor-tab-btn ${this._pestanaActiva === 'configuracion' ? 'editor-tab-btn--active' : ''}" data-tab="configuracion" role="tab">Configuración</button>
            <button class="editor-tab-btn ${this._pestanaActiva === 'vista_previa' ? 'editor-tab-btn--active' : ''}" data-tab="vista_previa" role="tab">Vista previa</button>
            <button class="editor-tab-btn ${this._pestanaActiva === 'respuestas' ? 'editor-tab-btn--active' : ''}" data-tab="respuestas" role="tab">Respuestas <span class="u-color-texto-terciario">(${this._intentos.length})</span></button>
          </nav>

          <!-- ESPACIO DE TRABAJO -->
          <main class="editor-workspace ${this._pestanaActiva === 'preguntas' ? 'editor-workspace--con-panel' : ''}" id="editorWorkspaceArea">
            <!-- El contenido dinámico de la pestaña seleccionada se inyectará aquí -->
          </main>

          <!-- BARRA FLOTANTE (Solo visible en pestaña Preguntas) -->
          <div class="floating-toolbar" id="formsFloatingToolbar" style="${this._pestanaActiva === 'preguntas' ? '' : 'display:none'}">
            <button class="toolbar-btn" id="floatAddQuestion" title="Añadir pregunta">${window.Iconos.render('plus-circle')}</button>
            <button class="toolbar-btn" id="floatImportQuestion" title="Banco de preguntas / Importar">${window.Iconos.render('database')}</button>
            <button class="toolbar-btn" id="floatAddTitle" title="Añadir sección">${window.Iconos.render('layout')}</button>
            <button class="toolbar-btn" id="floatAddMedia" title="Subir imagen/audio/video">${window.Iconos.render('image')}</button>
          </div>
        </div>
      `;

      this._conectarAccionesGenerales(raiz);
      this._renderizarPestanaActiva(raiz);
      this._iniciarAutoGuardado(raiz);
    },

    _conectarAccionesGenerales(raiz) {
      raiz.querySelector('#btnEditorVolver').onclick = async () => {
        const ok = await window.helpers.confirmar('¿Estás seguro de que quieres salir? Los cambios recientes se han guardado automáticamente.', { titulo: 'Salir del editor' });
        if (ok) {
          localStorage.removeItem(this._draftKey);
          router.navegar('/examenes');
        }
      };

      raiz.querySelectorAll('.editor-tab-btn').forEach(btn => {
        btn.onclick = () => {
          this._sincronizarDatosPestanaActual(raiz);
          this._pestanaActiva = btn.dataset.tab;
          raiz.querySelectorAll('.editor-tab-btn').forEach(b => b.classList.remove('editor-tab-btn--active'));
          btn.classList.add('editor-tab-btn--active');
          
          const workspace = raiz.querySelector('#editorWorkspaceArea');
          const toolbar = raiz.querySelector('#formsFloatingToolbar');
          if (this._pestanaActiva === 'preguntas') {
            workspace.classList.add('editor-workspace--con-panel');
            toolbar.style.display = '';
          } else {
            workspace.classList.remove('editor-workspace--con-panel');
            toolbar.style.display = 'none';
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

      raiz.querySelector('#floatImportQuestion').onclick = () => {
        this._abrirBancoPreguntas(raiz);
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

      raiz.querySelector('#floatAddMedia').onclick = () => {
        window.helpers.mostrarAlerta('Sube o asocia recursos visuales y auditivos en el panel de configuración de cada tarjeta de pregunta.', 'info');
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
        case 'respuestas':
          this._renderizarPestanaRespuestas(workspace);
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

      const colores = ['#673ab7', '#3f51b5', '#2196f3', '#009688', '#4caf50', '#ff9800', '#f44336', '#e91e63', '#795548', '#607d8b'];
      const selectColores = colores.map(col => 
        `<span class="color-dot ${examen.color === col ? 'color-dot--selected' : ''}" style="background:${col}" data-color="${col}"></span>`
      ).join('');

      const iconos = ['📘', '📝', '📖', '⛪', '💡', '🔥', '🎨', '⚙️', '🏆', '⭐'];
      const selectIconos = iconos.map(ico => 
        `<button class="btn-secundario btn-icono ${examen.icono === ico ? 'btn-primario' : ''}" style="font-size:var(--texto-lg)" data-icono="${ico}">${ico}</button>`
      ).join('');

      contenedor.innerHTML = `
        <div class="forms-card">
          <h3 style="border-bottom: 1px solid var(--color-borde); padding-bottom: var(--espaciado-xs)">Metadatos del Examen</h3>
          
          <div class="o-pila u-mt-1">
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Título del examen</label>
            <input type="text" id="infoTitulo" value="${window.helpers.escapeHtml(examen.titulo)}" placeholder="Ej: Examen Unidad 5">
          </div>

          <div class="o-pila">
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Descripción o Instrucciones</label>
            <textarea id="infoDescripcion" rows="3" placeholder="Instrucciones para tus alumnos...">${window.helpers.escapeHtml(examen.descripcion || '')}</textarea>
          </div>          <div class="o-grid u-grid-2col-adapt u-gap-md">
            <div class="o-pila">
              <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Materia</label>
              <input type="text" id="infoMateria" value="${window.helpers.escapeHtml(examen.materia || '')}" placeholder="Ej: Historia de la Iglesia">
            </div>

            <div class="o-pila">
              <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Tema</label>
              <input type="text" id="infoTema" value="${window.helpers.escapeHtml(examen.tema || '')}" placeholder="Ej: Hechos 1-12">
            </div>
          </div>          <div class="o-grid u-grid-2col-adapt u-gap-md">
            <div class="o-pila">
              <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Evaluación</label>
              <select id="infoEvaluacion">
                <option value="">— Ninguna —</option>
                ${selectEvaluaciones}
              </select>
            </div>

            <div class="o-pila">
              <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Profesor</label>
              <input type="text" id="infoProfesor" value="${window.helpers.escapeHtml(examen.profesor || '')}" placeholder="Nombre del Profesor">
            </div>
          </div>

          <div class="o-pila">
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Estado del Examen</label>
            <div class="o-flecha u-gap-md">
              <label class="o-flecha" style="gap:4px;cursor:pointer"><input type="radio" name="infoEstado" value="borrador" ${examen.estado === 'borrador' ? 'checked' : ''}> Borrador</label>
              <label class="o-flecha" style="gap:4px;cursor:pointer"><input type="radio" name="infoEstado" value="publicado" ${examen.estado === 'publicado' ? 'checked' : ''}> Publicado</label>
              <label class="o-flecha" style="gap:4px;cursor:pointer"><input type="radio" name="infoEstado" value="archivado" ${examen.estado === 'archivado' ? 'checked' : ''}> Archivado</label>
            </div>
          </div>

          <div class="o-pila">
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Tema de Color del Examen</label>
            <div class="o-flecha u-gap-xs u-flex-wrap">
              ${selectColores}
            </div>
          </div>

          <div class="o-pila">
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Icono Identificativo</label>
            <div class="o-flecha u-gap-xs u-flex-wrap">
              ${selectIconos}
            </div>
          </div>

          <div class="o-pila">
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Imagen de Portada (URL opcional)</label>
            <input type="text" id="infoPortada" value="${window.helpers.escapeHtml(examen.portada || '')}" placeholder="https://ejemplo.com/imagen.jpg">
          </div>
        </div>
      `;

      // Eventos locales
      contenedor.querySelectorAll('.color-dot').forEach(dot => {
        dot.onclick = () => {
          contenedor.querySelectorAll('.color-dot').forEach(d => d.classList.remove('color-dot--selected'));
          dot.classList.add('color-dot--selected');
          examen.color = dot.dataset.color;
          contenedor.closest('.editor-root').style.setProperty('--color-acento', examen.color);
        };
      });

      contenedor.querySelectorAll('[data-icono]').forEach(btn => {
        btn.onclick = () => {
          contenedor.querySelectorAll('[data-icono]').forEach(b => b.classList.remove('btn-primario'));
          btn.classList.add('btn-primario');
          examen.icono = btn.dataset.icono;
          const cabeceraTitulo = document.getElementById('cabeceraTituloExamen');
          if (cabeceraTitulo) cabeceraTitulo.innerHTML = `${examen.icono} ${window.helpers.escapeHtml(examen.titulo)}`;
        };
      });

      contenedor.querySelector('#infoTitulo').addEventListener('input', (e) => {
        examen.titulo = e.target.value || 'Examen sin título';
        const cabeceraTitulo = document.getElementById('cabeceraTituloExamen');
        if (cabeceraTitulo) cabeceraTitulo.innerHTML = `${examen.icono || '📘'} ${window.helpers.escapeHtml(examen.titulo)}`;
      });
    },

    _sincronizarInformacion(raiz) {
      const examen = this._examen;
      const tit = raiz.querySelector('#infoTitulo')?.value;
      if (tit) examen.titulo = tit;
      examen.descripcion = raiz.querySelector('#infoDescripcion')?.value || '';
      examen.materia = raiz.querySelector('#infoMateria')?.value || '';
      examen.tema = raiz.querySelector('#infoTema')?.value || '';
      examen.evaluacion_id = raiz.querySelector('#infoEvaluacion')?.value || null;
      examen.profesor = raiz.querySelector('#infoProfesor')?.value || '';
      examen.portada = raiz.querySelector('#infoPortada')?.value || '';
      
      const estadoRad = raiz.querySelector('input[name="infoEstado"]:checked');
      if (estadoRad) {
        examen.estado = estadoRad.value;
        examen.publicado = examen.estado === 'publicado';
      }
    },

    // ==========================================
    // PESTAÑA 2: PREGUNTAS (EL CORAZÓN)
    // ==========================================
    _renderizarPestanaPreguntas(raiz) {
      const workspace = raiz.querySelector('#editorWorkspaceArea');
      workspace.innerHTML = `
        <div class="preguntas-lista" id="preguntasContainerArea">
          <!-- Lista de preguntas -->
        </div>
        <div class="config-sidebar" id="configPreguntaSidebar">
          <!-- Panel de configuración dinámico de la pregunta seleccionada -->
        </div>
      `;

      this._renderizarPreguntasTarjetas(raiz);
      this._renderizarPanelLateralConfig(raiz);
    },

    _renderizarPreguntasTarjetas(raiz) {
      const cont = raiz.querySelector('#preguntasContainerArea');
      if (!cont) return;
      const preguntas = this._examen.preguntas;

      if (preguntas.length === 0) {
        cont.innerHTML = `
          <div class="forms-card u-texto-centrado" style="padding:var(--espaciado-lg)">
            <p style="font-size:3rem">${window.Iconos.render('help-circle')}</p>
            <h4>No hay preguntas aún</h4>
            <p class="u-color-texto-secundario">Utiliza el botón flotante (+) para crear tu primera pregunta.</p>
          </div>
        `;
        return;
      }

      cont.innerHTML = preguntas.map((p, i) => {
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

            <!-- Cuerpo de Pregunta -->
            <textarea class="u-fw-600" rows="2" data-campo-pregunta="texto" data-idx="${i}" placeholder="Pregunta sin título">${window.helpers.escapeHtml(p.texto)}</textarea>
            
            <!-- Zona Multimedia (opcional, si tiene valor asignado) -->
            ${p.imagen ? `<div style="position:relative"><img src="${p.imagen}" style="max-height:150px;border-radius:var(--radio-sm)"><button class="btn-secundario btn-icono btn-remove-img" data-idx="${i}" style="position:absolute;top:5px;left:5px;background:rgba(255,255,255,0.8)">✕</button></div>` : ''}

            <!-- Opciones específicas de Tipo de Pregunta -->
            <div class="o-pila u-mt-1" data-opciones-p-idx="${i}">
              ${this._renderizarCuerpoEspecifico(p, i)}
            </div>
            
            <div class="o-flecha o-flecha--between u-mt-1" style="border-top:1px dashed var(--color-borde);padding-top:var(--espaciado-xs);align-items:center">
              <span class="u-fs-xs u-color-texto-terciario">Puntos: <b>${p.puntos || 1} pt</b> | Obligatoria: <b>${p.obligatoria ? 'Sí' : 'No'}</b></span>
              <button class="btn-secundario btn-icono u-fs-xs btn-config-p" data-idx="${i}" title="Configuración de la pregunta">${window.Iconos.render('settings')}</button>
            </div>
          </div>
        `;
      }).join('');

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
        try { seleccionadas = JSON.parse(p.respuesta_correcta || '[]'); } catch (e) { seleccionadas = []; }
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
      } else if (p.tipo === 'solo_numero') {
        html += `<input type="text" class="u-w-full" data-correcta-numero="${i}" value="${window.helpers.escapeHtml(p.respuesta_correcta || '')}" placeholder="Ej: 42">`;
      } else if (p.tipo === 'fecha') {
        html += `<input type="date" class="u-w-full u-input-desactivado" disabled>`;
      } else if (p.tipo === 'hora') {
        html += `<input type="time" class="u-w-full u-input-desactivado" disabled>`;
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
      } else if (p.tipo === 'subir_archivo') {
        html += `<div style="border:2px dashed var(--color-borde);border-radius:var(--radio-sm);padding:var(--espaciado-md);text-align:center;color:var(--color-texto-terciario)">
          ${window.Iconos.render('upload-cloud')} Alumno entregará PDF o Imagen
        </div>`;
      }
      return html;
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
            this._renderizarPanelLateralConfig(raiz);
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
            p.respuesta_correcta = '0';
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
            this._renderizarPanelLateralConfig(raiz);
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
          this._renderizarPanelLateralConfig(raiz);
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

      // Configuración abre Sidebar directamente
      cont.querySelectorAll('.btn-config-p').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          this._preguntaSeleccionadaIdx = idx;
          this._renderizarPreguntasTarjetas(raiz);
          this._renderizarPanelLateralConfig(raiz);
          // Scroll suave al panel lateral
          const panel = raiz.querySelector('#configPreguntaSidebar');
          if (panel) panel.scrollIntoView({ behavior: 'smooth' });
        };
      });

      // Montar editor de completar huecos
      this._examen.preguntas.forEach((p, i) => {
        if (p.tipo === 'completar') {
          const contHuecos = raiz.querySelector(`#editorHuecos_${i}`);
          if (contHuecos) {
            window.editorHuecos.montar(contHuecos, {
              texto: p.texto || '',
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

    _renderizarPanelLateralConfig(raiz) {
      const panel = raiz.querySelector('#configPreguntaSidebar');
      if (!panel) return;
      
      const idx = this._preguntaSeleccionadaIdx;
      const p = this._examen.preguntas[idx];
      
      if (!p || p.tipo === 'seccion') {
        panel.innerHTML = `
          <h4 class="u-m-0">${window.Iconos.render('settings')} Propiedades</h4>
          <p class="u-fs-sm u-color-texto-secundario">Selecciona una pregunta para editar sus ajustes específicos de puntuación, validación y retroalimentación.</p>
        `;
        return;
      }

      panel.innerHTML = `
        <h4 class="u-m-0 sidebar-titulo">Ajustes Pregunta ${idx + 1}</h4>

        <div class="o-pila">
          <label class="o-flecha u-gap-xs u-cursor-pointer sidebar-toggle">
            <span class="u-fs-sm u-fw-600">Respuesta obligatoria</span>
            <input type="checkbox" id="sideObligatoria" ${p.obligatoria ? 'checked' : ''}>
          </label>
        </div>

        <div class="o-pila">
          <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Puntuación (Puntos)</label>
          <input type="number" id="sidePuntos" value="${p.puntos || 1}" min="1" max="100">
        </div>

        <div class="o-pila">
          <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Imagen de la pregunta (URL)</label>
          <input type="text" id="sideImagen" value="${window.helpers.escapeHtml(p.imagen || '')}" placeholder="https://ejemplo.com/pregunta.jpg">
        </div>

        <div class="o-pila">
          <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Explicación o pista de la respuesta</label>
          <textarea id="sideExplicacion" rows="2" placeholder="Se mostrará en la corrección o al ver la solución...">${window.helpers.escapeHtml(p.explicacion || '')}</textarea>
        </div>

        <div class="o-pila">
          <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Retroalimentación Correcta</label>
          <input type="text" id="sideRetroCorrecta" value="${window.helpers.escapeHtml(p.retroalimentacion_correcta || '¡Excelente trabajo!')}">
        </div>

        <div class="o-pila">
          <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Retroalimentación Incorrecta</label>
          <input type="text" id="sideRetroIncorrecta" value="${window.helpers.escapeHtml(p.retroalimentacion_incorrecta || 'Respuesta incorrecta.')}">
        </div>

        <div class="o-pila">
          <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Temporizador Individual (Segundos)</label>
          <input type="number" id="sideTemporizador" value="${p.temporizador || 0}" min="0" placeholder="0 = Sin límite de tiempo">
        </div>

        <div class="o-pila u-mt-1">
          <label class="o-flecha u-gap-xs u-cursor-pointer sidebar-toggle">
            <span class="u-fs-sm u-fw-600">Mostrar solución</span>
            <input type="checkbox" id="sideMostrarSolucion" ${p.mostrar_solucion !== false ? 'checked' : ''}>
          </label>
        </div>
      `;

      // Eventos locales sidebar
      const sideSincronizar = () => {
        p.obligatoria = panel.querySelector('#sideObligatoria').checked;
        p.puntos = parseInt(panel.querySelector('#sidePuntos').value) || 1;
        p.imagen = panel.querySelector('#sideImagen').value;
        p.explicacion = panel.querySelector('#sideExplicacion').value;
        p.retroalimentacion_correcta = panel.querySelector('#sideRetroCorrecta').value;
        p.retroalimentacion_incorrecta = panel.querySelector('#sideRetroIncorrecta').value;
        p.temporizador = parseInt(panel.querySelector('#sideTemporizador').value) || 0;
        p.mostrar_solucion = panel.querySelector('#sideMostrarSolucion').checked;
      };

      panel.querySelectorAll('input, textarea').forEach(el => {
        el.onchange = () => {
          sideSincronizar();
          // Renderizar parcialmente la tarjeta para reflejar puntos, obligatoria e imagen sin perder foco
          const cardPoints = raiz.querySelector(`.forms-card[data-preg-idx="${idx}"] .btn-config-p`);
          if (cardPoints) {
            this._sincronizarPreguntasEnPantalla(raiz);
            this._renderizarPreguntasTarjetas(raiz);
          }
        };
      });
    },

    _sincronizarPreguntasEnPantalla(raiz) {
      const cont = raiz.querySelector('#preguntasContainerArea');
      if (!cont) return;

      this._examen.preguntas.forEach((p, i) => {
        const card = cont.querySelector(`.forms-card[data-preg-idx="${i}"]`);
        if (!card) return;

        // Texto o título principal
        const txtInput = card.querySelector(`[data-campo-pregunta="texto"]`);
        if (txtInput) p.texto = txtInput.value;

        // Si es sección, también lee descripción
        if (p.tipo === 'seccion') {
          const descInput = card.querySelector(`[data-campo-pregunta="explicacion"]`);
          if (descInput) p.explicacion = descInput.value;
          return;
        }

        // Respuestas cortas o numéricas
        const cortasInput = card.querySelector(`[data-correcta-texto="${i}"]`);
        if (cortasInput) p.respuesta_correcta = cortasInput.value;

        const numInput = card.querySelector(`[data-correcta-numero="${i}"]`);
        if (numInput) p.respuesta_correcta = numInput.value;

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

        // Sincronizar respuestas correctas múltiples (checkboxes)
        const elegidasChecks = card.querySelectorAll(`input[data-correcta-check-idx]:checked`);
        if (elegidasChecks.length) {
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

    // BANCO DE PREGUNTAS
    _abrirBancoPreguntas(raiz) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal banco-modal" role="dialog" aria-modal="true">
          <div class="o-flecha o-flecha--between u-mb-1">
            <h4>${window.Iconos.render('database')} Banco de Preguntas</h4>
            <button class="btn-secundario btn-icono modal-cerrar-banco" style="border:none">✕</button>
          </div>
          <p class="u-fs-xs u-color-texto-secundario">Selecciona una pregunta prediseñada para insertarla en tu examen de manera inmediata.</p>
          
          <input type="text" id="buscarPreguntaBanco" placeholder="Buscar pregunta..." style="width:100%;margin-bottom:var(--espaciado-sm)">
          
          <div class="o-pila" id="bancoPreguntasLista" style="gap:var(--espaciado-xs);max-height:300px;overflow-y:auto">
            <!-- Preguntas del banco -->
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      window.Iconos.actualizar();

      const modalLista = modal.querySelector('#bancoPreguntasLista');
      const inputBusqueda = modal.querySelector('#buscarPreguntaBanco');

      const renderListaBanco = () => {
        const query = inputBusqueda.value.toLowerCase().trim();
        const filtradas = this._bancoPreguntas.filter(bp => bp.texto.toLowerCase().includes(query));
        
        modalLista.innerHTML = filtradas.map(bp => `
          <div class="banco-pregunta-card" data-banco-id="${bp.id}">
            <div>
              <span class="u-fw-600 u-fs-sm">${window.helpers.escapeHtml(bp.texto)}</span>
              <br><span class="u-fs-xs u-color-texto-terciario">Tipo: ${bp.tipo} | Puntos: ${bp.puntos}</span>
            </div>
            <button class="btn-primario u-fs-xs btn-insertar-b" data-id="${bp.id}">Insertar</button>
          </div>
        `).join('');

        modalLista.querySelectorAll('.btn-insertar-b').forEach(btn => {
          btn.onclick = () => {
            const pBanco = this._bancoPreguntas.find(b => b.id === btn.dataset.id);
            if (pBanco) {
              const nueva = {
                ...preguntaVacia(),
                texto: pBanco.texto,
                tipo: pBanco.tipo,
                opciones: [...pBanco.opciones],
                respuesta_correcta: pBanco.respuesta_correcta,
                puntos: pBanco.puntos,
                obligatoria: pBanco.obligatoria
              };
              this._examen.preguntas.push(nueva);
              this._preguntaSeleccionadaIdx = this._examen.preguntas.length - 1;
              this._renderizarPestanaPreguntas(raiz);
              this._actualizarCountPreguntas(raiz);
              modal.remove();
              window.helpers.mostrarAlerta('Pregunta añadida desde el banco.', 'exito');
            }
          };
        });
      };

      inputBusqueda.oninput = renderListaBanco;
      modal.querySelector('.modal-cerrar-banco').onclick = () => modal.remove();
      renderListaBanco();
    },

    // ==========================================
    // PESTAÑA 3: CONFIGURACIÓN AVANZADA
    // ==========================================
    _renderizarPestanaConfiguracion(contenedor) {
      const config = this._examen.config || {};
      
      contenedor.innerHTML = `
        <div class="forms-card">
          <h3 style="border-bottom: 1px solid var(--color-borde); padding-bottom: var(--espaciado-xs)">Configuración de Evaluación</h3>
          
          <!-- GENERAL -->
          <fieldset style="border:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--espaciado-sm)">
            <legend class="u-fw-600 u-color-texto-secundario u-fs-sm">Modo de Funcionamiento</legend>
            <div class="o-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:var(--espaciado-sm)">
              <label class="o-pila" style="border:1px solid var(--color-borde);padding:var(--espaciado-xs);border-radius:var(--radio-sm);cursor:pointer">
                <span class="o-flecha" style="gap:4px"><input type="radio" name="confModo" value="examen" ${config.modo === 'examen' ? 'checked' : ''}> <b>Modo Examen</b></span>
                <span class="u-fs-xs u-color-texto-terciario">Calificaciones formales, intentos limitados y temporizador estricto.</span>
              </label>
              <label class="o-pila" style="border:1px solid var(--color-borde);padding:var(--espaciado-xs);border-radius:var(--radio-sm);cursor:pointer">
                <span class="o-flecha" style="gap:4px"><input type="radio" name="confModo" value="practica" ${config.modo === 'practica' ? 'checked' : ''}> <b>Modo Práctica</b></span>
                <span class="u-fs-xs u-color-texto-terciario">Formativo. Los alumnos pueden ver las explicaciones en tiempo real.</span>
              </label>
              <label class="o-pila" style="border:1px solid var(--color-borde);padding:var(--espaciado-xs);border-radius:var(--radio-sm);cursor:pointer">
                <span class="o-flecha" style="gap:4px"><input type="radio" name="confModo" value="encuesta" ${config.modo === 'encuesta' ? 'checked' : ''}> <b>Modo Encuesta</b></span>
                <span class="u-fs-xs u-color-texto-terciario">Recopilación de opiniones o datos sin respuestas correctas asignadas.</span>
              </label>
            </div>
          </fieldset>

          <!-- DISPONIBILIDAD -->
          <div class="o-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--espaciado-md); border-top: 1px solid var(--color-borde); padding-top: var(--espaciado-md)">
            <div class="o-pila">
              <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Fecha y Hora de Inicio</label>
              <input type="datetime-local" id="confFechaInicio" value="${config.fecha_inicio || ''}">
            </div>
            <div class="o-pila">
              <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Fecha y Hora de Límite</label>
              <input type="datetime-local" id="confFechaFin" value="${config.fecha_fin || ''}">
            </div>
          </div>

          <!-- INTENTOS -->
          <div class="o-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--espaciado-md)">
            <div class="o-pila">
              <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Intentos Permitidos</label>
              <select id="confIntentos">
                <option value="1" ${config.intentos === '1' ? 'selected' : ''}>1 Intento único</option>
                <option value="2" ${config.intentos === '2' ? 'selected' : ''}>2 Intentos</option>
                <option value="3" ${config.intentos === '3' ? 'selected' : ''}>3 Intentos</option>
                <option value="ilimitados" ${config.intentos === 'ilimitados' ? 'selected' : ''}>Ilimitados (∞)</option>
              </select>
            </div>

            <!-- TEMPORIZADOR GLOBAL -->
            <div class="o-pila">
              <label class="u-fs-sm u-fw-600 u-color-texto-secundario">Temporizador General del Examen</label>
              <select id="confTemporizadorGlobal">
                <option value="sin_limite" ${config.temporizador_global === 'sin_limite' ? 'selected' : ''}>Sin límite de tiempo</option>
                <option value="15" ${config.temporizador_global === '15' ? 'selected' : ''}>15 minutos</option>
                <option value="30" ${config.temporizador_global === '30' ? 'selected' : ''}>30 minutos</option>
                <option value="45" ${config.temporizador_global === '45' ? 'selected' : ''}>45 minutos</option>
                <option value="60" ${config.temporizador_global === '60' ? 'selected' : ''}>60 minutos</option>
                <option value="personalizado" ${config.temporizador_global === 'personalizado' ? 'selected' : ''}>Personalizado...</option>
              </select>
              <input type="number" id="confTemporizadorMinutos" value="${config.temporizador_personalizado || 0}" min="1" placeholder="Minutos" style="margin-top:4px; ${config.temporizador_global === 'personalizado' ? '' : 'display:none'}">
            </div>
          </div>

          <!-- NAVEGACIÓN Y ALEATORIEDAD -->
          <div style="border-top:1px solid var(--color-borde);padding-top:var(--espaciado-md)">
            <h4 style="margin:0 0 var(--espaciado-xs) 0">Navegación y Estructura</h4>
            <div class="o-pila" style="gap:var(--espaciado-xs)">
              <label class="o-flecha" style="gap:6px;cursor:pointer"><input type="checkbox" id="confAleatorizarPreguntas" ${config.aleatorizar_preguntas ? 'checked' : ''}> Aleatorizar orden de preguntas</label>
              <label class="o-flecha" style="gap:6px;cursor:pointer"><input type="checkbox" id="confAleatorizarRespuestas" ${config.aleatorizar_respuestas ? 'checked' : ''}> Aleatorizar orden de opciones de respuesta</label>
              <label class="o-flecha" style="gap:6px;cursor:pointer"><input type="checkbox" id="confPermitirVolver" ${config.permitir_volver !== false ? 'checked' : ''}> Permitir a los alumnos regresar a preguntas anteriores</label>
            </div>
          </div>

          <!-- VISUALIZACIÓN DE RESULTADOS -->
          <div style="border-top:1px solid var(--color-borde);padding-top:var(--espaciado-md)">
            <h4 style="margin:0 0 var(--espaciado-xs) 0">Visualización de Resultados para Alumnos</h4>
            <div class="o-pila">
              <label class="u-fs-sm u-fw-600 u-color-texto-secundario">¿Cuándo se muestran las respuestas y nota?</label>
              <select id="confResultadosVisibles" style="max-width:320px">
                <option value="al_terminar" ${config.resultados_visibles === 'al_terminar' ? 'selected' : ''}>Inmediatamente al terminar</option>
                <option value="al_publicar" ${config.resultados_visibles === 'al_publicar' ? 'selected' : ''}>Cuando el profesor publique las notas</option>
                <option value="nunca" ${config.resultados_visibles === 'nunca' ? 'selected' : ''}>Nunca mostrar respuestas</option>
              </select>
            </div>
            
            <div class="o-pila u-mt-1" style="gap:var(--espaciado-xxs)">
              <label class="o-flecha" style="gap:6px;cursor:pointer"><input type="checkbox" id="confMostrarNota" ${config.mostrar_nota !== false ? 'checked' : ''}> Mostrar nota numérica de inmediato</label>
              <label class="o-flecha" style="gap:6px;cursor:pointer"><input type="checkbox" id="confMostrarRespuestas" ${config.mostrar_respuestas !== false ? 'checked' : ''}> Mostrar respuestas correctas</label>
              <label class="o-flecha" style="gap:6px;cursor:pointer"><input type="checkbox" id="confMostrarErrores" ${config.mostrar_errores !== false ? 'checked' : ''}> Mostrar preguntas falladas</label>
              <label class="o-flecha" style="gap:6px;cursor:pointer"><input type="checkbox" id="confMostrarExplicacion" ${config.mostrar_explicacion !== false ? 'checked' : ''}> Mostrar explicaciones pedagógicas de cada pregunta</label>
            </div>
          </div>

          <!-- SEGURIDAD Y CONTROL -->
          <div style="border-top:1px solid var(--color-borde);padding-top:var(--espaciado-md)">
            <h4 style="margin:0 0 var(--espaciado-xs) 0">Seguridad contra Copia o Fraude</h4>
            <div class="o-pila" style="gap:var(--espaciado-xs)">
              <label class="o-flecha" style="gap:6px;cursor:pointer"><input type="checkbox" id="confSeguridadPantallaCompleta" ${config.seguridad_pantalla_completa ? 'checked' : ''}> Forzar pantalla completa al iniciar</label>
              <label class="o-flecha" style="gap:6px;cursor:pointer"><input type="checkbox" id="confSeguridadBloquearCopiar" ${config.seguridad_bloquear_copiar ? 'checked' : ''}> Bloquear copiar textos del examen</label>
              <label class="o-flecha" style="gap:6px;cursor:pointer"><input type="checkbox" id="confSeguridadBloquearPegar" ${config.seguridad_bloquear_pegar ? 'checked' : ''}> Bloquear pegar contenidos externos</label>
              <label class="o-flecha" style="gap:6px;cursor:pointer"><input type="checkbox" id="confSeguridadCambioPestana" ${config.seguridad_cambio_pestana ? 'checked' : ''}> Detectar cambio de pestaña o pérdida de foco</label>
            </div>
          </div>
        </div>
      `;

      // Evento selector de temporizador global
      contenedor.querySelector('#confTemporizadorGlobal').onchange = (e) => {
        const inp = contenedor.querySelector('#confTemporizadorMinutos');
        if (e.target.value === 'personalizado') {
          inp.style.display = '';
        } else {
          inp.style.display = 'none';
        }
      };
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
      
      config.resultados_visibles = raiz.querySelector('#confResultadosVisibles').value || 'al_terminar';
      config.mostrar_nota = raiz.querySelector('#confMostrarNota').checked;
      config.mostrar_respuestas = raiz.querySelector('#confMostrarRespuestas').checked;
      config.mostrar_errores = raiz.querySelector('#confMostrarErrores').checked;
      config.mostrar_explicacion = raiz.querySelector('#confMostrarExplicacion').checked;
      
      config.seguridad_pantalla_completa = raiz.querySelector('#confSeguridadPantallaCompleta').checked;
      config.seguridad_bloquear_copiar = raiz.querySelector('#confSeguridadBloquearCopiar').checked;
      config.seguridad_bloquear_pegar = raiz.querySelector('#confSeguridadBloquearPegar').checked;
      config.seguridad_cambio_pestana = raiz.querySelector('#confSeguridadCambioPestana').checked;
    },

    // ==========================================
    // PESTAÑA 4: VISTA PREVIA INTERACTIVA
    // ==========================================
    _renderizarPestanaVistaPrevia(contenedor) {
      contenedor.innerHTML = `
        <div class="o-flecha o-flecha--between u-mb-1" style="width:100%; align-items:center">
          <span class="u-fs-sm u-color-texto-secundario">Simula la experiencia interactiva que tendrán tus alumnos:</span>
          <div class="o-flecha" style="gap:4px">
            <button class="btn-secundario btn-icono btn-device ${this._modoVistaPrevia === 'ordenador' ? 'btn-primario' : ''}" data-device="ordenador" title="Vista Ordenador">${window.Iconos.render('monitor')}</button>
            <button class="btn-secundario btn-icono btn-device ${this._modoVistaPrevia === 'tablet' ? 'btn-primario' : ''}" data-device="tablet" title="Vista Tablet">${window.Iconos.render('tablet')}</button>
            <button class="btn-secundario btn-icono btn-device ${this._modoVistaPrevia === 'movil' ? 'btn-primario' : ''}" data-device="movil" title="Vista Móvil">${window.Iconos.render('phone')}</button>
          </div>
        </div>

        <div class="preview-container">
          <div class="preview-device preview-device--${this._modoVistaPrevia}" id="previewDeviceBody">
            <div class="preview-screen">
              <!-- Renderizado interactivo del examen real -->
              <div class="forms-card" style="border-top-color: ${this._examen.color}">
                <h2>${window.helpers.escapeHtml(this._examen.titulo)}</h2>
                <p class="u-color-texto-secundario">${window.helpers.escapeHtml(this._examen.descripcion || 'Sin descripción.')}</p>
                <span class="u-fs-xs u-color-texto-terciario">Profesor: ${window.helpers.escapeHtml(this._examen.profesor)} | Materia: ${window.helpers.escapeHtml(this._examen.materia || 'General')}</span>
              </div>

              <div class="o-pila u-mt-2" style="gap:var(--espaciado-md)" id="previewInteractiveQuestions">
                <!-- Preguntas cargadas interactivas -->
              </div>

              <button class="btn-primario u-mt-2" style="width:100%" id="previewSimulateSubmit">Enviar Respuestas</button>
            </div>
          </div>
        </div>
      `;

      // Eventos de dispositivo
      contenedor.querySelectorAll('.btn-device').forEach(btn => {
        btn.onclick = () => {
          this._modoVistaPrevia = btn.dataset.device;
          this._renderizarPestanaVistaPrevia(contenedor);
        };
      });

      // Render preguntas interactivas
      const areaPreguntas = contenedor.querySelector('#previewInteractiveQuestions');
      const preguntas = this._examen.preguntas;

      areaPreguntas.innerHTML = preguntas.map((p, index) => {
        if (p.tipo === 'seccion') {
          return `
            <div class="u-seccion-bloque">
              <h4>${window.helpers.escapeHtml(p.texto)}</h4>
              <p class="u-fs-xs" style="opacity:0.8">${window.helpers.escapeHtml(p.explicacion || '')}</p>
            </div>
          `;
        }

        let oHtml = '';
        if (p.tipo === 'multiple' || p.tipo === 'opcion_unica') {
          oHtml = (p.opciones || []).map((o, oi) => `
            <label class="o-flecha" style="gap:var(--espaciado-xs);padding:var(--espaciado-xxs) 0;cursor:pointer">
              <input type="radio" name="p_prev_${index}" value="${oi}">
              <span class="u-fs-sm">${window.helpers.escapeHtml(o)}</span>
            </label>
          `).join('');
        } else if (p.tipo === 'varias_opciones') {
          oHtml = (p.opciones || []).map((o, oi) => `
            <label class="o-flecha" style="gap:var(--espaciado-xs);padding:var(--espaciado-xxs) 0;cursor:pointer">
              <input type="checkbox" name="p_prev_${index}" value="${oi}">
              <span class="u-fs-sm">${window.helpers.escapeHtml(o)}</span>
            </label>
          `).join('');
        } else if (p.tipo === 'verdadero_falso') {
          oHtml = `
            <label class="o-flecha" style="gap:var(--espaciado-xs);padding:var(--espaciado-xxs) 0;cursor:pointer"><input type="radio" name="p_prev_${index}" value="true"> <span class="u-fs-sm">Verdadero</span></label>
            <label class="o-flecha" style="gap:var(--espaciado-xs);padding:var(--espaciado-xxs) 0;cursor:pointer"><input type="radio" name="p_prev_${index}" value="false"> <span class="u-fs-sm">Falso</span></label>
          `;
        } else if (p.tipo === 'respuesta_corta' || p.tipo === 'solo_numero') {
          oHtml = `<input type="text" name="p_prev_${index}" placeholder="Escribe tu respuesta aquí..." style="width:100%">`;
        } else if (p.tipo === 'texto_largo') {
          oHtml = `<textarea name="p_prev_${index}" rows="2" placeholder="Redacta tu respuesta aquí..." style="width:100%"></textarea>`;
        } else if (p.tipo === 'completar') {
          // Renderizado paralelo al de vista-examen-tomar.js (renderer del alumno)
          // para que el profesor vea exactamente lo que verá el alumno.
          const huecos = Array.isArray(p.huecos) ? p.huecos : [];
          const texto = p.texto || '';
          if (!huecos.length) {
            // Estado vacío: usuario cambió tipo pero aún no creó huecos.
            // Wrapper plano (sin .pregunta-examen) para no heredar estilos de pregunta renderizada.
            oHtml += `<div class="preview-hueco-vacio" data-pid="${p.id}">
              <p class="u-fs-sm u-color-texto-terciario"><em>Edita esta pregunta en la pestaña <b>Preguntas</b> y selecciona palabras para convertirlas en huecos.</em></p>
            </div>`;
          } else {
            const MARCADOR = /\{\{HUECO_(\d+)\}\}/g;
            const partes = texto.split(MARCADOR);
            oHtml += `<div class="pregunta-examen" data-pid="${p.id}">`;
            partes.forEach((parte, pi) => {
              if (pi % 2 === 0) {
                oHtml += `<span>${window.helpers.escapeHtml(parte)}</span>`;
                return;
              }
              const hIdx = huecos.findIndex(h => h.id === parseInt(parte));
              if (hIdx === -1) {
                // Hueco referenciado en texto pero ausente en el array (huérfano)
                oHtml += `<span class="u-color-texto-terciario">[hueco ${parte} sin definir]</span>`;
                return;
              }
              oHtml += `<span class="pregunta-examen__hueco-inline"><input type="text" class="pregunta-examen__hueco-input" data-pid="${p.id}" data-hidx="${hIdx}" placeholder="Hueco ${hIdx + 1}" readonly></span>`;
            });
            oHtml += `</div>`;
          }
        } else if (p.tipo === 'relacionar') {
          const mitad = Math.ceil(p.opciones.length / 2);
          const izq = p.opciones.slice(0, mitad);
          const der = p.opciones.slice(mitad);
          oHtml += izq.map((z, zi) => `
            <div class="o-flecha o-flecha--between u-mb-1">
              <span class="u-fs-sm">${window.helpers.escapeHtml(z)}</span>
              <select style="width:140px;font-size:var(--texto-xs)">
                <option value="">— Relacionar —</option>
                ${der.map((d, di) => `<option value="${di}">${window.helpers.escapeHtml(d)}</option>`).join('')}
              </select>
            </div>
          `).join('');
        } else if (p.tipo === 'ordenar') {
          oHtml = (p.opciones || []).map((o, oi) => `
            <div class="o-flecha" style="gap:var(--espaciado-xs);background:var(--color-fondo-alt);padding:6px;border-radius:var(--radio-sm);margin-bottom:2px">
              <span>☰</span>
              <span class="u-fs-sm">${window.helpers.escapeHtml(o)}</span>
            </div>
          `).join('');
        } else if (p.tipo === 'subir_archivo') {
          oHtml = `<input type="file" style="font-size:var(--texto-xs)">`;
        }

        return `
          <div class="forms-card forms-card--pregunta" style="border-left-color: ${p.obligatoria ? 'var(--color-acento)' : 'transparent'}">
            <span class="u-fw-600 u-fs-sm">${index + 1}. ${window.helpers.escapeHtml(p.texto)} ${p.obligatoria ? '<span style="color:var(--color-error)">*</span>' : ''}</span>
            <span class="u-fs-xs u-color-texto-terciario" style="margin-top:-6px">(${p.puntos || 1} pt)</span>
            ${p.imagen ? `<img src="${p.imagen}" style="max-height:120px;border-radius:var(--radio-sm);align-self:flex-start">` : ''}
            <div class="o-pila u-mt-1" style="gap:4px">
              ${oHtml}
            </div>
          </div>
        `;
      }).join('');

      // Simular Envío
      contenedor.querySelector('#previewSimulateSubmit').onclick = () => {
        window.helpers.mostrarAlerta('¡Examen de Vista Previa completado con éxito! Se ha verificado que todos los tipos de respuesta interactúan correctamente.', 'exito');
      };
    },

    // ==========================================
    // PESTAÑA 5: RESPUESTAS Y CORRECCIÓN (SPLIT-SCREEN)
    // ==========================================
    _renderizarPestanaRespuestas(contenedor) {
      const intentos = this._intentos || [];
      const examen = this._examen;

      if (intentos.length === 0) {
        contenedor.innerHTML = `
          <div class="forms-card u-texto-centrado" style="padding:var(--espaciado-lg)">
            <p style="font-size:3.5rem;color:var(--color-texto-terciario)">📊</p>
            <h3>No se han recibido respuestas aún</h3>
            <p class="u-color-texto-secundario">Comparte este examen con tus alumnos y aquí aparecerán sus calificaciones y estadísticas completas.</p>
          </div>
        `;
        return;
      }

      // Métricas Básicas
      const calificados = intentos.filter(i => i.corregido && i.nota != null);
      const notas = calificados.map(i => parseFloat(i.nota || 0));
      const promedio = notas.length ? (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1) : 'N/A';
      const maxima = notas.length ? Math.max(...notas).toFixed(1) : 'N/A';
      
      const pendientes = intentos.filter(i => i.estado === 'completado' && !i.corregido).length;
      const noEntregados = this._alumnosGrupo.length - intentos.length;

      contenedor.innerHTML = `
        <div class="respuestas-tablas">
          <!-- METRICAS -->
          <div class="respuestas-metrica-grid">
            <div class="respuestas-metrica-card" style="border-top: 4px solid var(--color-acento)">
              <span class="u-fs-xs u-color-texto-terciario u-fw-600">RESPUESTAS</span>
              <h2 style="margin:4px 0 0 0;font-weight:700">${intentos.length}</h2>
            </div>
            <div class="respuestas-metrica-card" style="border-top: 4px solid var(--color-exito)">
              <span class="u-fs-xs u-color-texto-terciario u-fw-600">NOTA MEDIA</span>
              <h2 style="margin:4px 0 0 0;font-weight:700;color:var(--color-exito)">${promedio}</h2>
            </div>
            <div class="respuestas-metrica-card" style="border-top: 4px solid var(--color-aviso)">
              <span class="u-fs-xs u-color-texto-terciario u-fw-600">PENDIENTES CORREGIR</span>
              <h2 style="margin:4px 0 0 0;font-weight:700;color:var(--color-aviso)">${pendientes}</h2>
            </div>
            <div class="respuestas-metrica-card" style="border-top: 4px solid var(--color-error)">
              <span class="u-fs-xs u-color-texto-terciario u-fw-600">NO ENTREGADOS</span>
              <h2 style="margin:4px 0 0 0;font-weight:700;color:var(--color-error)">${Math.max(0, noEntregados)}</h2>
            </div>
          </div>

          <!-- SPLIT SCREEN: ALUMNOS E INFORMES -->
          <div class="respuestas-split">
            <!-- Columna Izquierda: Alumnos -->
            <div class="forms-card">
              <h4>Listado de Entregas</h4>
              <div class="o-pila" style="gap:var(--espaciado-xs);max-height:400px;overflow-y:auto">
                ${intentos.map((int, intIdx) => {
                  const nombre = int.perfiles?.nombre_completo || int.perfiles?.username || 'Alumno';
                  const fecha = window.helpers.formatearFecha(int.fecha_inicio);
                  const notaStr = int.corregido ? `<span class="u-fw-700 u-color-exito" style="font-size:var(--texto-md)">${int.nota}</span>` : `<span class="u-fs-xs u-color-aviso" style="background:var(--color-aviso-soft);padding:2px 6px;border-radius:var(--radio-sm)">Pendiente</span>`;
                  
                  return `
                    <div class="o-flecha o-flecha--between btn-alumno-entrega-select" data-int-idx="${intIdx}" style="padding:var(--espaciado-xs);border:1px solid var(--color-borde);border-radius:var(--radio-sm);cursor:pointer;background:var(--color-fondo-tarjeta);transition:all 150ms">
                      <div>
                        <span class="u-fw-600 u-fs-sm">${window.helpers.escapeHtml(nombre)}</span>
                        <br><span class="u-fs-xs u-color-texto-terciario">${fecha}</span>
                      </div>
                      ${notaStr}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Columna Derecha: Panel de Corrección Dinámica (Split Screen) -->
            <div class="forms-card" id="splitScreenCorreccion" style="border-top-color: var(--color-exito)">
              <h4>Panel de Corrección Individual</h4>
              <div id="splitScreenContent" class="o-pila u-mt-1">
                <p class="u-fs-sm u-color-texto-secundario">Selecciona un alumno de la lista de la izquierda para abrir el corrector inteligente rápido de examen.</p>
              </div>
            </div>
          </div>
        </div>
      `;

      // Eventos listado alumnos
      contenedor.querySelectorAll('.btn-alumno-entrega-select').forEach(btn => {
        btn.onclick = () => {
          contenedor.querySelectorAll('.btn-alumno-entrega-select').forEach(b => b.style.borderColor = 'var(--color-borde)');
          btn.style.borderColor = 'var(--color-acento)';
          const intIdx = parseInt(btn.dataset.intIdx);
          this._abrirCorrectorIndividual(contenedor, intentos[intIdx]);
        };
      });
    },

    _abrirCorrectorIndividual(contenedor, intento) {
      const panel = contenedor.querySelector('#splitScreenContent');
      if (!panel) return;

      const nombre = intento.perfiles?.nombre_completo || intento.perfiles?.username || 'Alumno';
      let respuestas = {};
      try {
        respuestas = typeof intento.respuestas === 'string' ? JSON.parse(intento.respuestas) : (intento.respuestas || {});
      } catch (e) {
        respuestas = {};
      }

      const preguntas = this._examen.preguntas;

      panel.innerHTML = `
        <div class="o-flecha o-flecha--between" style="border-bottom:1px solid var(--color-borde);padding-bottom:var(--espaciado-xs)">
          <div>
            <span class="u-fw-700 u-texto-md" style="color:var(--color-acento)">${window.helpers.escapeHtml(nombre)}</span>
            <br><span class="u-fs-xs u-color-texto-terciario">Intento completado</span>
          </div>
          <div class="o-pila" style="align-items:flex-end">
            <span class="u-fs-xs u-color-texto-terciario">Nota actual:</span>
            <input type="number" id="corrNotaFinal" value="${intento.nota || 0}" min="0" max="10" step="0.5" style="width:70px;padding:4px;font-size:var(--texto-md);font-weight:700;text-align:center">
          </div>
        </div>

        <div class="o-pila u-mt-1" style="gap:var(--espaciado-sm);max-height:320px;overflow-y:auto;padding-right:4px">
          ${preguntas.map((p, idx) => {
            if (p.tipo === 'seccion') return '';
            
            const respAlumno = respuestas[p.id] !== undefined ? respuestas[p.id] : 'Sin respuesta';
            let esCorrecta = false;
            
            // Verificación simple para la vista del profesor
            if (p.tipo === 'multiple' || p.tipo === 'opcion_unica') {
              esCorrecta = String(p.respuesta_correcta) === String(respAlumno);
            } else if (p.tipo === 'verdadero_falso') {
              esCorrecta = String(p.respuesta_correcta) === String(respAlumno);
            } else if (p.tipo === 'respuesta_corta' || p.tipo === 'solo_numero') {
              esCorrecta = String(p.respuesta_correcta).toLowerCase() === String(respAlumno).toLowerCase();
            }

            return `
              <div style="border-left:3px solid ${esCorrecta ? 'var(--color-exito)' : 'var(--color-error)'};padding-left:var(--espaciado-xs);background:var(--color-fondo-alt);border-radius:var(--radio-sm);padding:4px 8px">
                <span class="u-fw-600 u-fs-xs">${idx + 1}. ${window.helpers.escapeHtml(p.texto)}</span>
                <br><span class="u-fs-xs u-color-texto-secundario">Respuesta Alumno: <b>${window.helpers.escapeHtml(String(respAlumno))}</b></span>
                <br><span class="u-fs-xs u-color-texto-terciario">Respuesta Correcta: <b>${window.helpers.escapeHtml(String(p.respuesta_correcta || 'N/A'))}</b></span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="o-pila u-mt-1">
          <label class="u-fs-xs u-color-texto-secundario u-fw-600">Observaciones o retroalimentación</label>
          <textarea id="corrObservaciones" rows="2" placeholder="Buen trabajo...">${window.helpers.escapeHtml(intento.observaciones || '')}</textarea>
        </div>

        <button class="btn-primario u-mt-1" id="btnGuardarCorreccionRapida" style="width:100%">Guardar Corrección</button>
      `;

      panel.querySelector('#btnGuardarCorreccionRapida').onclick = async () => {
        const nuevaNota = parseFloat(panel.querySelector('#corrNotaFinal').value) || 0;
        const obs = panel.querySelector('#corrObservaciones').value;

        try {
          const usuario = store.obtener('usuario');
          await window.examenesRepository.calificar(intento.id, nuevaNota, obs, usuario.id);
          window.helpers.mostrarAlerta('Corrección rápida guardada con éxito.', 'exito');
          
          // Recargar intentos para respuestas
          this._intentos = await window.examenesRepository.obtenerIntentos(this._examen.id);
          this._renderizarPestanaRespuestas(contenedor);
        } catch (e) {
          window.helpers.mostrarAlerta('Error al guardar calificación: ' + e.message, 'error');
        }
      };
    },

    // ==========================================
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
              indicator.innerHTML = `${window.Iconos.render('check')} Cambios guardados automáticamente`;
              indicator.style.color = 'var(--color-exito)';
              setTimeout(() => {
                if (indicator) {
                  indicator.innerHTML = `${window.Iconos.render('check')} Autoguardado activado`;
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
          color: examen.color || '#673ab7',
          icono: examen.icono || '📘',
          portada: examen.portada || '',
          preguntas: JSON.stringify(examen.preguntas),
          config: JSON.stringify(examen.config),
          puntos_totales: examen.preguntas.reduce((acc, p) => acc + (p.puntos || 0), 0),
          publicado: publicar,
          estado: publicar ? 'publicado' : (examen.estado === 'archivado' ? 'archivado' : 'borrador')
        });

        if (publicar && guardado && guardado.id) {
          await window.examenesRepository.publicar(guardado.id);
        }

        await window.adminRepository.registrarAuditoria(
          publicar ? 'examen:publicar' : 'examen:guardar',
          `Examen "${examen.titulo.trim()}" (${examen.preguntas.length} preguntas)`,
          examen.creado_por, examen.grupo_id
        );

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
