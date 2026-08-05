(function() {
  'use strict';
  window.vistaSesionEstudio = {
    async montar(raiz, params) {
      const libroId = parseInt(params.libro);
      const capituloNum = parseInt(params.capitulo);
      raiz.innerHTML = window.skeleton ? window.skeleton.tarjetas(2, { ancho: '100%' }) : '<div class="o-contenedor o-pila u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';
      const sb = window.supabaseClient;
      const usuario = store.obtener('usuario');
      if (!sb || !usuario) return;
      try {
        const { data: libro } = await sb.from('libros_biblicos').select('*').eq('id', libroId).single();
        const { data: cap } = await sb.from('capitulos').select('id').eq('libro_id', libroId).eq('numero', capituloNum).single();
        const { data: progreso } = await sb.from('progreso_lectura').select('*').eq('usuario_id', usuario.id).eq('capitulo_id', cap.id).single();
        const preguntas = await window.progresoRepository.obtenerPreguntasSistema(cap.id);
        this.estado = {
          raiz, libro, libroId, capituloNum, capId: cap.id,
          numCaps: libro.num_capitulos, yaLeido: progreso?.completado || false,
          estudioCompletado: progreso?.estudio_completado || false,
          preguntas,
          correctasId: new Set(),
          ronda: 'inicial',
          cola: [],
          idx: 0,
          respondido: false,
          falladasRonda: [],
          resInicial: { aciertos: 0, fallos: 0, falladas: [] },
          fsm: window.maquinaEstudio.estados.NO_INICIADO
        };
        this._renderInicio();
        raiz.addEventListener('click', async (ev) => {
          if (ev.target.closest('#btnRetroceder')) {
            if (this.estado && !this.estado.respondido) {
              const ok = await window.helpers.confirmar('¿Seguro que quieres salir? Perderás el progreso de esta sesión.', { titulo: 'Salir de la sesión', textoConfirmar: 'Salir' });
              if (!ok) return;
            }
            router.navegar('/estudio/libro/' + this.estado.libroId);
          }
        });
      } catch (e) {
        raiz.innerHTML = `<div class="o-contenedor o-pila u-mt-4 u-texto-centrado"><h2 style="color:var(--color-acento);display:flex;justify-content:center">${window.Iconos.render('book-open')}</h2><p class="u-color-texto-secundario">Capítulo no disponible</p><button class="btn-primario" onclick="router.navegar('/estudio')">← Volver</button></div>`;
      }
    },

    _cabecera(titulo, sub) {
      return `
        <div class="o-flecha o-flecha--between u-mb-3">
          <button class="btn-secundario" id="btnRetroceder">${window.Iconos.render('arrow-left')}</button>
          <div class="u-texto-centrado u-flex-1">
            <h3 style="margin:0">${titulo}</h3>
            ${sub ? `<span class="u-fs-xs u-color-texto-terciario">${sub}</span>` : ''}
          </div>
          <span class="u-min-ancho-40"></span>
        </div>`;
    },

    _renderInicio() {
      const { raiz, libro, capituloNum, numCaps } = this.estado;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila u-app-shell--comfort">
          ${this._cabecera(libro.nombre, `Capítulo ${capituloNum} de ${numCaps}`)}
          <div class="u-texto-centrado o-pila" style="align-items:center;margin-top:var(--espaciado-3xl)">
            <div class="u-icono-circular u-icono-circular--lg">${window.Iconos.render('book-open')}</div>
            <h2 class="u-mt-3">${libro.nombre} ${capituloNum}</h2>
            <p class="u-color-texto-secundario u-fs-sm u-max-ancho-320">Vamos a leer este capítulo y luego responder algunas preguntas para repasar lo aprendido.</p>
          </div>
          <div class="barra-accion">
            <button class="btn-primario" id="btnEmpezar">${window.Iconos.render('play')} Empezar</button>
          </div>
        </div>`;
      raiz.querySelector('#btnEmpezar').onclick = () => { this._transicion('INICIAR'); this._renderLeer(); };
      window.Iconos.actualizar();
    },

    _renderLeer() {
      const { raiz, libro, capituloNum } = this.estado;
      const I = window.Iconos.render;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila u-app-shell--comfort">
          ${this._cabecera(libro.nombre, `Capítulo ${capituloNum}`)}
          <div class="u-texto-centrado o-pila" style="align-items:center;margin-top:var(--espaciado-2xl)">
            <div class="u-icono-circular u-icono-circular--lg">${I('book-open')}</div>
            <h2 class="u-mt-3">Lee en tu Biblia</h2>
            <p class="u-color-texto-secundario u-fs-base u-max-ancho-340" style="line-height:var(--altura-linea-cuerpo)">Toma tu <strong>Biblia física</strong> y lee <strong>${libro.nombre} ${capituloNum}</strong>. Cuando termines de leerlo, pulsa el botón de abajo.</p>
          </div>
          <div class="o-pila u-w-full">
            <label class="u-fs-sm u-fw-600 u-color-texto-secundario">${I('edit-3')} Notas de la sesión (no se guardan como nota personal)</label>
            <textarea id="notasLectura" rows="3" placeholder="Escribe aquí tus notas, reflexiones o versículos destacados..." class="u-w-full u-input-textarea"></textarea>
          </div>
          <div class="barra-accion">
            <button class="btn-primario" id="btnLeido">${I('check')} Ya lo he leído</button>
          </div>
        </div>`;
      const usuario = store.obtener('usuario');
      if (usuario && window.notasRepository) {
        window.notasRepository.obtener(usuario.id, libro.nombre, parseInt(capituloNum), 'sesion').then(nota => {
          if (nota && nota.contenido) {
            const ta = raiz.querySelector('#notasLectura');
            if (ta) ta.value = nota.contenido;
          }
        }).catch(() => {});
      }
      raiz.querySelector('#btnLeido').onclick = async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true; btn.innerHTML = I('check') + ' Guardando...';
        this._transicion('LEER');
        const usuario = store.obtener('usuario');
        try {
          await window.progresoRepository.marcarLeido(usuario.id, this.estado.capId);
        } catch (e) { window.helpers.mostrarAlerta('No se pudo guardar el progreso.', 'advertencia'); }
        const notas = raiz.querySelector('#notasLectura')?.value.trim();
        if (notas && window.notasRepository) {
          await window.notasRepository.guardar(usuario.id, libro.nombre, parseInt(capituloNum), notas, { tipo: 'sesion' }).catch(() => {});
        }
        window.Iconos.actualizar();
        this._iniciarEstudio();
      };
      window.Iconos.actualizar();
    },

    _iniciarEstudio() {
      const e = this.estado;
      e.ronda = 'inicial';
      e.cola = this._barajar(e.preguntas);
      e.idx = 0;
      e.falladasRonda = [];
      e.resInicial = { aciertos: 0, fallos: 0, falladas: [] };
      e.correctasId = new Set();
      e.respondido = false;
      if (!e.preguntas.length) {
        this._completar();
        return;
      }
      this._renderPregunta();
    },

    _iniciarRepaso() {
      const e = this.estado;
      e.ronda = 'repaso';
      const mapa = new Map();
      e.falladasRonda.forEach(pid => {
        const p = e.preguntas.find(x => x.id === pid);
        if (p) mapa.set(p.id, p);
      });
      e.cola = this._barajar(Array.from(mapa.values()));
      e.idx = 0;
      e.falladasRonda = [];
      e.respondido = false;
      this._renderPregunta();
    },

    _renderPregunta() {
      const e = this.estado;
      e.respondido = false;
      const p = e.cola[e.idx];
      const total = e.cola.length;
      const num = e.idx + 1;
      const esRepaso = e.ronda === 'repaso';
      const { raiz } = e;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila u-app-shell--compact">
          ${this._cabecera(e.libro.nombre, `Capítulo ${e.capituloNum}`)}
          <div class="u-mt-2">
            <div class="o-flecha o-flecha--between u-mb-1">
              <span class="u-texto-etiqueta u-color-texto-terciario">${esRepaso ? 'Repaso' : 'Pregunta'} ${num} de ${total}</span>
              ${esRepaso ? `<span class="u-fs-xs u-fw-600 u-color-aviso">Corrige para avanzar</span>` : ''}
            </div>
            <div class="barra-progreso"><div class="barra-progreso__lleno" style="width:${(num / total) * 100}%"></div></div>
          </div>
          <div class="cuestion">
            <p class="cuestion__texto">${window.helpers.escapeHtml(p.texto)}</p>
            <div class="cuestion__opciones" id="opciones">${this._renderOpciones(p)}</div>
            <div class="cuestion__feedback u-oculto" id="feedback"></div>
          </div>
          <div class="barra-accion" id="accion"></div>
        </div>`;
      this._bindPregunta(p);
      window.Iconos.actualizar();
    },

    _renderOpciones(p) {
      if (p.tipo === 'multiple') {
        return (p.opciones || []).map((o, oi) => `
          <label class="cuestion__opcion" data-oi="${oi}">
            <input type="radio" name="resp" value="${oi}" class="u-oculto">
            <span class="cuestion__marcador"></span>
            <span class="cuestion__texto-op">${window.helpers.escapeHtml(o)}</span>
          </label>`).join('');
      }
      if (p.tipo === 'verdadero_falso') {
        return ['true', 'false'].map(v => `
          <label class="cuestion__opcion" data-oi="${v}">
            <input type="radio" name="resp" value="${v}" class="u-oculto">
            <span class="cuestion__marcador"></span>
            <span class="cuestion__texto-op">${v === 'true' ? 'Verdadero' : 'Falso'}</span>
          </label>`).join('');
      }
      return `<input type="text" id="respTexto" class="cuestion__input" placeholder="${p.tipo === 'completar' ? 'Completa la frase...' : 'Escribe tu respuesta...'}">`;
    },

    _bindPregunta(p) {
      const e = this.estado;
      const raiz = e.raiz;
      if (p.tipo === 'multiple' || p.tipo === 'verdadero_falso') {
        const accion = raiz.querySelector('#accion');
        let valorSeleccionado = null;
        raiz.querySelectorAll('input[name="resp"]').forEach(inp => {
          inp.addEventListener('change', () => {
            if (e.respondido) return;
            raiz.querySelectorAll('.cuestion__opcion').forEach(o => o.classList.remove('cuestion__opcion--seleccionada'));
            inp.closest('.cuestion__opcion').classList.add('cuestion__opcion--seleccionada');
            valorSeleccionado = inp.value;
            accion.innerHTML = `<button class="btn-primario cuestion__btn-confirmar" id="btnConfirmar">${window.Iconos.render('check')} Confirmar</button>`;
            raiz.querySelector('#btnConfirmar').onclick = () => {
              if (e.respondido || valorSeleccionado === null) return;
              this._corregir(p, valorSeleccionado);
            };
            window.Iconos.actualizar();
          });
        });
      } else {
        const accion = raiz.querySelector('#accion');
        accion.innerHTML = `<button class="btn-primario" id="btnComprobar">${window.Iconos.render('check')} Comprobar</button>`;
        const comprobar = () => {
          if (e.respondido) return;
          const inp = raiz.querySelector('#respTexto');
          if (!inp.value.trim()) { inp.focus(); return; }
          this._corregir(p, inp.value);
        };
        raiz.querySelector('#btnComprobar').onclick = comprobar;
        raiz.querySelector('#respTexto').addEventListener('keydown', ev => {
          if (ev.key === 'Enter') { ev.preventDefault(); comprobar(); }
        });
      }
    },

    _corregir(p, seleccion) {
      const e = this.estado;
      e.respondido = true;
      const correcta = window.puntuacionExamen.esCorrecta(seleccion, p.respuesta_correcta, p.tipo);
      if (correcta) {
        e.correctasId.add(p.id);
        if (e.ronda === 'inicial') e.resInicial.aciertos++;
      } else {
        if (e.ronda === 'inicial') e.resInicial.fallos++;
        if (!e.falladasRonda.includes(p.id)) e.falladasRonda.push(p.id);
      }
      this._renderCorreccion(p, seleccion, correcta);
    },

    _renderCorreccion(p, seleccion, correcta) {
      const e = this.estado;
      const raiz = e.raiz;
      if (p.tipo === 'multiple' || p.tipo === 'verdadero_falso') {
        raiz.querySelectorAll('.cuestion__opcion').forEach(op => {
          const input = op.querySelector('input');
          input.disabled = true;
          op.classList.remove('cuestion__opcion--seleccionada');
          const esEsta = window.puntuacionExamen.esCorrecta(input.value, p.respuesta_correcta, p.tipo);
          if (esEsta) op.classList.add('cuestion__opcion--correcta');
          if (input.value === seleccion && !correcta) op.classList.add('cuestion__opcion--incorrecta');
        });
      } else {
        const inp = raiz.querySelector('#respTexto');
        if (inp) inp.disabled = true;
      }
      const fb = raiz.querySelector('#feedback');
      fb.classList.remove('u-oculto');
      let html = `<div class="cuestion__resultado ${correcta ? 'cuestion__resultado--ok' : 'cuestion__resultado--mal'}">${correcta ? window.Iconos.render('check') + ' Correcto' : window.Iconos.render('x') + ' Incorrecto'}</div>`;
      if (!correcta) {
        html += `<p class="cuestion__explicacion"><strong>Respuesta correcta:</strong> ${window.helpers.escapeHtml(this._textoRespuestaCorrecta(p))}</p>`;
      }
      if (p.explicacion) html += `<p class="cuestion__explicacion">${window.helpers.escapeHtml(p.explicacion)}</p>`;
      fb.innerHTML = html;
      const accion = raiz.querySelector('#accion');
      accion.innerHTML = `<button class="btn-primario" id="btnContinuar">${window.Iconos.render('arrow-right')} Continuar</button>`;
      raiz.querySelector('#btnContinuar').onclick = () => this._continuar();
      window.Iconos.actualizar();
    },

    _textoRespuestaCorrecta(p) {
      if (p.tipo === 'multiple') {
        const i = parseInt(p.respuesta_correcta, 10);
        return (p.opciones && p.opciones[i]) ? p.opciones[i] : p.respuesta_correcta;
      }
      if (p.tipo === 'verdadero_falso') return p.respuesta_correcta === 'true' ? 'Verdadero' : 'Falso';
      if (p.tipo === 'completar') return p.respuesta_correcta.split('|').map(s => s.trim()).join(' / ');
      return p.respuesta_correcta;
    },

    _continuar() {
      const e = this.estado;
      e.idx++;
      if (e.idx < e.cola.length) {
        this._renderPregunta();
      } else {
        this._finRonda();
      }
    },

    _finRonda() {
      const e = this.estado;
      if (e.ronda === 'inicial') {
        this._transicion('EVALUAR');
        this._renderResumen();
      } else if (e.falladasRonda.length === 0) {
        this._completar();
      } else {
        this._renderResumenRepaso();
      }
    },

    _renderResumen() {
      const e = this.estado;
      const { aciertos, fallos } = e.resInicial;
      const falladasUnicas = [...new Set(e.falladasRonda)];
      const hayErrores = falladasUnicas.length > 0;
      const total = e.preguntas.length;
      const mensaje = this._mensajeCompletar(aciertos, total);
      const tono = (aciertos / total) < 0.5 ? 'error' : ((aciertos / total) >= 0.75 ? 'ok' : 'mal');
      const listaErrores = falladasUnicas.map(pid => {
        const p = e.preguntas.find(x => x.id === pid);
        if (!p) return '';
        return `<div class="cuestion-resumen__item">
          <p class="cuestion-resumen__pregunta">${window.helpers.escapeHtml(p.texto)}</p>
          <p class="cuestion-resumen__resp"><span class="u-color-exito u-fw-600">Correcta:</span> ${window.helpers.escapeHtml(this._textoRespuestaCorrecta(p))}</p>
          ${p.explicacion ? `<p class="cuestion-resumen__exp u-color-texto-terciario u-fs-xs">${window.helpers.escapeHtml(p.explicacion)}</p>` : ''}
        </div>`;
      }).join('');
      const { raiz } = e;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg u-app-shell--compact">
          ${this._cabecera(e.libro.nombre, `Capítulo ${e.capituloNum} · Resumen`)}
          <div class="cuestion-resumen">
            <div class="cuestion-resumen__icono cuestion-resumen__icono--${tono}">${window.Iconos.render(tono === 'ok' ? 'check-circle' : 'alert-triangle')}</div>
            <h2 class="u-texto-centrado">${mensaje}</h2>
            <div class="cuestion-resumen__stats">
              <div class="tarjeta-capitulo u-texto-centrado"><p class="u-fs-xs u-color-texto-terciario">Acertadas</p><p class="u-texto-2xl u-fw-700 u-color-exito">${aciertos}</p></div>
              <div class="tarjeta-capitulo u-texto-centrado"><p class="u-fs-xs u-color-texto-terciario">Falladas</p><p class="u-texto-2xl u-fw-700 ${hayErrores ? 'u-color-error' : 'u-color-texto-terciario'}">${fallos}</p></div>
            </div>
            ${hayErrores ? `<div class="o-pila u-w-full"><h3>Repaso de errores</h3><div class="o-pila">${listaErrores}</div></div>` : ''}
          </div>
          <div class="barra-accion">
            ${hayErrores
              ? `<button class="btn-primario" id="btnRepasar">${window.Iconos.render('refresh-cw')} Repasar errores (${fallos})</button>`
              : `<button class="btn-primario" id="btnFinalizar">${window.Iconos.render('check')} Finalizar capítulo</button>`}
          </div>
        </div>`;
      if (hayErrores) {
        raiz.querySelector('#btnRepasar').onclick = () => { this._transicion('REPASAR'); this._iniciarRepaso(); };
      } else {
        raiz.querySelector('#btnFinalizar').onclick = () => this._completar();
      }
      window.Iconos.actualizar();
    },

    _renderResumenRepaso() {
      const e = this.estado;
      const restantes = e.falladasRonda.length;
      const corregidas = e.cola.length - restantes;
      const { raiz } = e;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg u-app-shell--compact">
          ${this._cabecera(e.libro.nombre, `Capítulo ${e.capituloNum} · Repaso`)}
          <div class="cuestion-resumen">
            <div class="cuestion-resumen__icono cuestion-resumen__icono--mal">${window.Iconos.render('alert-triangle')}</div>
            <h2 class="u-texto-centrado">Aún quedan por corregir</h2>
            <p class="u-texto-centrado u-color-texto-secundario u-max-ancho-320">${restantes} ${restantes === 1 ? 'pregunta sin acertar' : 'preguntas sin acertar'}. Repítelas hasta responderlas bien.</p>
            <div class="cuestion-resumen__stats">
              <div class="tarjeta-capitulo u-texto-centrado"><p class="u-fs-xs u-color-texto-terciario">Corregidas</p><p class="u-texto-2xl u-fw-700 u-color-exito">${corregidas}</p></div>
              <div class="tarjeta-capitulo u-texto-centrado"><p class="u-fs-xs u-color-texto-terciario">Pendientes</p><p class="u-texto-2xl u-fw-700 u-color-error">${restantes}</p></div>
            </div>
          </div>
          <div class="barra-accion">
            <button class="btn-primario" id="btnRepetir">${window.Iconos.render('refresh-cw')} Repetir repaso (${restantes})</button>
          </div>
        </div>`;
      raiz.querySelector('#btnRepetir').onclick = () => { this._transicion('REPETIR'); this._iniciarRepaso(); };
      window.Iconos.actualizar();
    },

    _barajar(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },

    _mensajeCompletar(aciertos, total) {
      const ratio = total > 0 ? aciertos / total : 0;
      if (ratio < 0.5) return 'Repasa el capítulo';
      if (ratio < 0.75) return 'Por los pelos...';
      if (ratio < 1) return 'Bien hecho';
      return 'Eres increíble!!';
    },

    _transicion(evento) {
      try {
        this.estado.fsm = window.maquinaEstudio.siguiente(this.estado.fsm, evento);
      } catch (err) { window.helpers.mostrarAlerta('Error de estado del estudio.', 'advertencia'); }
    },

    async _completar() {
      const e = this.estado;
      e.estudioCompletado = true;
      if (window.haptica) window.haptica.logro();
      this._transicion('COMPLETAR');
      const usuario = store.obtener('usuario');
      try {
        await window.progresoRepository.marcarEstudioCompletado(usuario.id, e.capId);
      } catch (err) { window.helpers.mostrarAlerta('No se pudo guardar el progreso de estudio.', 'advertencia'); }
      const haySiguiente = e.capituloNum < e.numCaps;
      const { raiz } = e;
      const I = window.Iconos.render;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg u-texto-centrado u-app-shell--ceremony">
          <div class="cuestion-resumen__icono cuestion-resumen__icono--ok u-icono-circular u-icono-circular--lg">${I('check-circle')}</div>
          <h2>¡Capítulo completado!</h2>
          <p class="u-color-texto-secundario u-max-ancho-320">Has completado el estudio de ${e.libro.nombre} ${e.capituloNum}.</p>
          <div class="barra-accion">
            ${haySiguiente
              ? `<button class="btn-primario" id="btnSig">${I('arrow-right')} Siguiente capítulo</button>`
              : `<button class="btn-primario" id="btnLibro">${I('book-open')} Volver al libro</button>`}
          </div>
        </div>`;
      if (haySiguiente) raiz.querySelector('#btnSig').onclick = () => router.navegar(`/estudio/sesion/${e.libroId}/${e.capituloNum + 1}`);
      else raiz.querySelector('#btnLibro').onclick = () => router.navegar(`/estudio/libro/${e.libroId}`);
      window.Iconos.actualizar();

      // Notificación nativa al completar capítulo
      if (window.notifications) {
        window.notifications.notificarCapituloCompletado(e.libro.nombre, e.capituloNum);
      }

      // Racha, celebración y logros (una sola query a progreso_lectura)
      try {
        const [progRes, capsCountRes] = await Promise.all([
          window.supabaseClient.from('progreso_lectura').select('fecha_lectura, capitulos(libro_id)').eq('usuario_id', usuario.id).eq('completado', true),
          window.supabaseClient.from('progreso_lectura').select('*', { count: 'exact', head: true }).eq('usuario_id', usuario.id).eq('completado', true)
        ]);

        const todoProg = progRes.data || [];
        const capitulosLeidos = capsCountRes.count || 0;

        // Libros con al menos un capítulo completado (aproximación)
        const librosUnicos = new Set();
        todoProg.forEach(r => { if (r.capitulos?.libro_id) librosUnicos.add(r.capitulos.libro_id); });

        const nuevaRacha = window.progresoLectura.calcularRacha(todoProg);
        const anteriorRacha = parseInt(localStorage.getItem('fb_racha') || '0', 10);

        // Verificar y otorgar logros
        if (window.logrosDominio) {
          const progreso = {
            capitulosLeidos,
            librosCompletados: librosUnicos.size,
            racha: Math.max(nuevaRacha, anteriorRacha),
            examenesCompletados: 0,
            examenPerfecto: false,
            tarjetasCreadas: 0,
            totalRepasos: 0,
            ntCompleto: false,
            atCompleto: false
          };
          await window.logrosDominio.verificarYOtorgar(usuario.id, progreso).catch(() => {});
        }

        if (nuevaRacha > anteriorRacha) {
          localStorage.setItem('fb_racha', String(nuevaRacha));
          if (!haySiguiente) this._celebrar('trophy', '¡Libro completado!');
          else this._celebrar('flame', '¡Racha de ' + nuevaRacha + ' días!');
        } else if (!haySiguiente) {
          this._celebrar('trophy', '¡Libro completado!');
        }
      } catch (err) { if (!haySiguiente) this._celebrar('trophy', '¡Libro completado!'); }
    },

    _celebrar(icono, titulo) {
      const overlay = document.createElement('div');
      overlay.className = 'celebracion';
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let confeti = '';
      if (!reduced) {
        const colores = ['#FB923C', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
        for (let i = 0; i < 70; i++) {
          const left = Math.random() * 100;
          const color = colores[Math.floor(Math.random() * colores.length)];
          const dur = 1.8 + Math.random() * 1.8;
          const delay = Math.random() * 0.6;
          const ancho = 7 + Math.random() * 6;
          const alto = 12 + Math.random() * 8;
          confeti += `<span class="celebracion__confeti" style="left:${left}%;width:${ancho}px;height:${alto}px;background:${color};animation-duration:${dur}s;animation-delay:${delay}s"></span>`;
        }
      }
      overlay.innerHTML = `
        <div class="celebracion__emblema anim-exito">
          <div class="celebracion__icono">${window.Iconos.render(icono)}</div>
          <div class="celebracion__titulo">${titulo}</div>
        </div>
        ${confeti}`;
      overlay.classList.add('u-overlay-tap');
      overlay.onclick = () => overlay.remove();
      document.body.appendChild(overlay);
      setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, reduced ? 2000 : 2800);
    }
  };
})();
