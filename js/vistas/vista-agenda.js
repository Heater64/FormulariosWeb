(function () {
  'use strict';

  const I = (n) => window.Iconos.render(n);
  const E = (v) => window.helpers.escapeHtml(v == null ? '' : String(v));
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function claveObjetivo(usuarioId) { return `fb_agenda_objetivo_${usuarioId}`; }

  function leerObjetivo(usuarioId) {
    try {
      const valor = parseInt(localStorage.getItem(claveObjetivo(usuarioId)) || '1', 10);
      return Number.isFinite(valor) ? Math.min(7, Math.max(1, valor)) : 1;
    } catch (e) { return 1; }
  }

  function fechaClave(fecha) {
    const d = new Date(fecha);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function fechaLocalClave(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function escaparFecha(fecha) {
    return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  window.vistaAgenda = {
    _mes: new Date().getMonth(),
    _ano: new Date().getFullYear(),
    _objetivo: 1,

    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      this._objetivo = leerObjetivo(usuario.id);
      raiz.innerHTML = window.skeleton
        ? `<div class="o-contenedor o-pila o-pila--lg u-mt-3">${window.skeleton.tarjetas(5, { ancho: '100%' })}</div>`
        : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando agenda...</p></div>';

      try {
        const sb = window.supabaseClient;
        const [librosResult, progresoResult, capitulosResult, intentos] = await Promise.all([
          sb ? sb.from('libros_biblicos').select('id, nombre, num_capitulos').order('id') : { data: [] },
          sb ? sb.from('progreso_lectura').select('capitulo_id, fecha_lectura, completado').eq('usuario_id', usuario.id).eq('completado', true) : { data: [] },
          sb ? sb.from('capitulos').select('id, libro_id, numero').order('libro_id').order('numero') : { data: [] },
          window.examenesRepository ? window.examenesRepository.misIntentos(usuario.id).catch(() => []) : []
        ]);
        const libros = librosResult.data || [];
        const progreso = progresoResult.data || [];
        const capitulos = capitulosResult.data || [];
        const pendientesMem = window.memorizacionRepository
          ? await window.memorizacionRepository.tarjetasPendientes(usuario.id).catch(() => [])
          : [];
        const datos = this._prepararDatos(libros, capitulos, progreso, intentos, pendientesMem);
        this._datos = datos;
        this._render(raiz, usuario);
      } catch (e) {
        raiz.innerHTML = `<div class="o-contenedor u-mt-4"><p class="u-color-error">No se pudo cargar la agenda: ${E(e.message)}</p></div>`;
      }
    },

    _prepararDatos(libros, capitulos, progreso, intentos, pendientesMem) {
      const capPorId = new Map(capitulos.map(c => [c.id, c]));
      const libroPorId = new Map(libros.map(l => [l.id, l]));
      const completados = new Set(progreso.map(p => p.capitulo_id));
      const lecturasPorDia = {};
      progreso.forEach(p => {
        if (p.fecha_lectura) {
          const clave = fechaClave(p.fecha_lectura);
          lecturasPorDia[clave] = (lecturasPorDia[clave] || 0) + 1;
        }
      });
      const ultimo = progreso.slice().sort((a, b) => new Date(b.fecha_lectura || 0) - new Date(a.fecha_lectura || 0))[0];
      const siguiente = capitulos.find(c => !completados.has(c.id));
      const siguienteLibro = siguiente ? libroPorId.get(siguiente.libro_id) : null;
      const examenesPendientes = (intentos || []).filter(i => i.estado === 'pendiente' || i.estado === 'en_progreso').length;
      const totalCapitulos = libros.reduce((s, l) => s + (l.num_capitulos || 0), 0);
      return {
        libros,
        capitulos,
        capPorId,
        libroPorId,
        progreso,
        completados,
        lecturasPorDia,
        ultimo,
        siguiente,
        siguienteLibro,
        pendientesMem: pendientesMem.length,
        examenesPendientes,
        totalCapitulos,
        progresoGeneral: totalCapitulos ? Math.round(completados.size / totalCapitulos * 100) : 0
      };
    },

    _render(raiz, usuario) {
      const d = this._datos;
      const hoy = fechaClave(new Date());
      const totalHoy = d.lecturasPorDia[hoy] || 0;
      const rutaCapitulo = d.siguiente && d.siguienteLibro ? `/estudio/sesion/${d.siguienteLibro.id}/${d.siguiente.numero}` : '/estudio';
      const ultimoCap = d.ultimo ? d.capPorId.get(d.ultimo.capitulo_id) : null;
      const ultimoLibro = ultimoCap ? d.libroPorId.get(ultimoCap.libro_id) : null;

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg agenda-root" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <header class="vista-cabecera">
            <div class="vista-cabecera__principal">
              <button class="btn-icono agenda-cabecera__volver" data-volver aria-label="Volver a Estudio">${I('arrow-left')}</button>
              <h1>${I('calendar-days')} Agenda de estudio <button class="info-ayuda" data-guia="agenda" aria-label="Guía de Agenda de estudio">i</button></h1>
            </div>
            <div class="vista-cabecera__acciones">
              ${window.campanaNotificaciones ? window.campanaNotificaciones.renderCampana() : ''}
            </div>
          </header>

          <section class="agenda-resumen" aria-label="Resumen de estudio">
            <div class="agenda-resumen__principal">
              <span class="agenda-resumen__eyebrow">Hoy</span>
              <strong>${totalHoy}/${this._objetivo} capítulos</strong>
              <span class="agenda-resumen__meta">${totalHoy >= this._objetivo ? 'Objetivo diario completado' : `Te faltan ${this._objetivo - totalHoy} para cumplirlo`}</span>
            </div>
            <div class="agenda-resumen__barra" aria-label="${totalHoy} de ${this._objetivo} capítulos del objetivo diario">
              <span style="transform:scaleX(${Math.min(1, totalHoy / Math.max(1, this._objetivo))});transform-origin:left center"></span>
            </div>
            <div class="agenda-resumen__objetivo">
              <span>Objetivo diario</span>
              <div class="agenda-stepper" role="group" aria-label="Cambiar objetivo diario">
                <button class="btn-icono" data-objetivo="menos" aria-label="Reducir objetivo">${I('minus')}</button>
                <strong>${this._objetivo}</strong>
                <button class="btn-icono" data-objetivo="mas" aria-label="Aumentar objetivo">${I('plus')}</button>
              </div>
            </div>
          </section>

          <section class="agenda-acciones" aria-label="Acciones de estudio">
            <button class="agenda-accion agenda-accion--principal" data-ruta="${rutaCapitulo}">
              <span class="agenda-accion__icono">${I('book-open')}</span>
              <span><strong>${d.siguiente ? 'Siguiente capítulo' : 'Repasar Biblia'}</strong><small>${d.siguiente ? `${E(d.siguienteLibro.nombre)} ${d.siguiente.numero}` : 'Has completado todos los capítulos'}</small></span>
              ${I('chevron-right')}
            </button>
            <button class="agenda-accion" data-ruta="/memorizacion">
              <span class="agenda-accion__icono">${I('brain')}</span>
              <span><strong>Repasos pendientes</strong><small>${d.pendientesMem ? `${d.pendientesMem} tarjetas para practicar` : 'Todo al día'}</small></span>
              ${d.pendientesMem ? `<b class="agenda-accion__badge">${d.pendientesMem}</b>` : I('chevron-right')}
            </button>
            <button class="agenda-accion" data-ruta="/examenes">
              <span class="agenda-accion__icono">${I('clipboard-check')}</span>
              <span><strong>Exámenes disponibles</strong><small>${d.examenesPendientes ? `${d.examenesPendientes} pendientes` : 'Revisa tus exámenes'}</small></span>
              ${d.examenesPendientes ? `<b class="agenda-accion__badge agenda-accion__badge--aviso">${d.examenesPendientes}</b>` : I('chevron-right')}
            </button>
          </section>

          <section class="agenda-calendario" aria-label="Calendario de actividad">
            <div class="agenda-seccion__cabecera">
              <div><h2>${MESES[this._mes]} ${this._ano}</h2><p>Tu actividad de lectura</p></div>
              <div class="agenda-mes-nav">
                <button class="btn-icono" data-mes="anterior" aria-label="Mes anterior">${I('chevron-left')}</button>
                <button class="btn-icono" data-mes="siguiente" aria-label="Mes siguiente">${I('chevron-right')}</button>
              </div>
            </div>
            ${this._calendarioHtml(hoy)}
          </section>

          <section class="agenda-reciente">
            <div class="agenda-seccion__cabecera"><div><h2>Actividad reciente</h2><p>Tu último avance de lectura</p></div>${I('activity')}</div>
            ${ultimoCap && ultimoLibro ? `<button class="agenda-reciente__item" data-ruta="/estudio/sesion/${ultimoLibro.id}/${ultimoCap.numero}"><span class="agenda-reciente__icono">${I('check-circle')}</span><span><strong>${E(ultimoLibro.nombre)} ${ultimoCap.numero}</strong><small>Completado ${escaparFecha(new Date(d.ultimo.fecha_lectura))}</small></span>${I('chevron-right')}</button>` : '<p class="agenda-vacio">Todavía no hay capítulos completados. Empieza con el siguiente capítulo.</p>'}
          </section>
        </div>`;

      if (window.Iconos) window.Iconos.actualizar();
      if (window.campanaNotificaciones) window.campanaNotificaciones.conectar(raiz);
      window.helpers.registrarGuias(raiz, {
        agenda: ['Agenda de estudio', 'Organiza tu ritmo de lectura y consulta tus repasos y tareas pendientes.', 'El objetivo diario se guarda solo en este dispositivo. Usa el calendario para localizar tus días de actividad.']
      });
      raiz.querySelector('[data-volver]').onclick = () => router.navegar('/estudio');
      raiz.querySelectorAll('[data-ruta]').forEach(btn => { btn.onclick = () => router.navegar(btn.dataset.ruta); });
      raiz.querySelectorAll('[data-objetivo]').forEach(btn => {
        btn.onclick = () => {
          this._objetivo = Math.min(7, Math.max(1, this._objetivo + (btn.dataset.objetivo === 'mas' ? 1 : -1)));
          try { localStorage.setItem(claveObjetivo(usuario.id), String(this._objetivo)); } catch (e) {}
          this._render(raiz, usuario);
        };
      });
      raiz.querySelectorAll('[data-mes]').forEach(btn => {
        btn.onclick = () => {
          this._mes += btn.dataset.mes === 'siguiente' ? 1 : -1;
          if (this._mes < 0) { this._mes = 11; this._ano--; }
          if (this._mes > 11) { this._mes = 0; this._ano++; }
          this._render(raiz, usuario);
        };
      });
    },

    _calendarioHtml(hoy) {
      const primerDia = new Date(this._ano, this._mes, 1).getDay();
      const desplazamiento = (primerDia + 6) % 7;
      const dias = new Date(this._ano, this._mes + 1, 0).getDate();
      const celdas = [];
      for (let i = 0; i < desplazamiento; i++) celdas.push('<span class="agenda-dia agenda-dia--vacio" aria-hidden="true"></span>');
      for (let dia = 1; dia <= dias; dia++) {
        const clave = fechaLocalClave(this._ano, this._mes, dia);
        const lecturas = this._datos.lecturasPorDia[clave] || 0;
        const clases = ['agenda-dia'];
        if (clave === hoy) clases.push('agenda-dia--hoy');
        if (lecturas) clases.push('agenda-dia--activo');
        celdas.push(`<span class="${clases.join(' ')}" title="${lecturas ? `${lecturas} capítulo${lecturas === 1 ? '' : 's'} leído${lecturas === 1 ? '' : 's'}` : 'Sin actividad'}"><b>${dia}</b>${lecturas ? `<i>${Math.min(3, lecturas)}</i>` : ''}</span>`);
      }
      return `<div class="agenda-dias-semana">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span>${d}</span>`).join('')}</div><div class="agenda-grid">${celdas.join('')}</div>`;
    },

    desmontar() {}
  };
})();
