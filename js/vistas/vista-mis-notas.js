/* ============================================================================
 * js/vistas/vista-mis-notas.js — Inicio del alumno
 * ----------------------------------------------------------------------------
 * Muestra al alumno con sesión sus exámenes realizados (con nota cuando está
 * corregido) y sus notas finales de las evaluaciones vinculadas a su cuenta.
 * Solo lee datos propios: las RPC filtran por auth.uid().
 *
 * Estados: cada bloque de datos (exámenes, evaluaciones) se carga por
 * separado (Promise.allSettled) y se pinta por separado, de forma que un
 * fallo en una fuente no deja la pantalla en blanco. Todo estado sin datos
 * —sin sesión, fallo de carga o lista vacía— es una pantalla empty-state
 * con acción; el error técnico solo va al registro, nunca a la UI.
 * ==========================================================================*/
(function () {
  'use strict';

  const esc = (v) => window.panelUI.esc(v);
  const I = (n) => (window.Iconos ? window.Iconos.render(n) : '');

  // Contenedor con el espaciado propio de las vistas del panel privado.
  const contenedor = (contenido) => `<div class="o-contenedor vista-mis-notas" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">${contenido}</div>`;

  // Pantalla empty-state (componente canonical de la app) para un estado
  // sin datos. `accion` es opcional: { texto, clase, icono }.
  function pantalla(icono, titulo, descripcion, accion, compacta) {
    return `<div class="empty-state${compacta ? ' empty-state--compacto' : ''}">
      <div class="empty-state__icono">${I(icono)}</div>
      <h3 class="empty-state__titulo">${esc(titulo)}</h3>
      <p class="empty-state__descripcion">${esc(descripcion)}</p>
      ${accion ? `<div class="empty-state__cta"><button type="button" class="adm-btn adm-btn--principal ${esc(accion.clase)}">${I(accion.icono || 'refresh-cw')} ${esc(accion.texto)}</button></div>` : ''}
    </div>`;
  }

  const Reintentar = { texto: 'Reintentar', clase: 'btn-reintentar-notas', icono: 'refresh-cw' };

  function estadoExamen(intento) {
    if (intento.corregido) {
      return '<span class="adm-badge adm-badge--publicado">Corregido</span>';
    }
    if (intento.estado === 'en_progreso' || intento.estado === 'pendiente') {
      return '<span class="adm-badge adm-badge--borrador">En curso</span>';
    }
    return '<span class="adm-badge adm-badge--aviso">Pendiente de corrección</span>';
  }

  function filaExamen(intento) {
    const examen = intento.examenes_personalizados || {};
    const meta = [
      examen.materia,
      examen.tema,
      intento.fecha_completado ? 'Entregado ' + window.panelUI.fechaCorta(intento.fecha_completado) : null
    ].filter(Boolean);
    const verCorreccion = intento.corregido && intento.examen_id
      ? `<a class="btn-secundario u-fs-xs" href="#!/tomar/${encodeURIComponent(intento.examen_id)}">Ver corrección</a>`
      : '';
    const nota = intento.corregido && intento.nota != null
      ? `<span class="adm-fila__nota">${esc(window.panelUI.numero(intento.nota))}</span>`
      : '<span class="adm-fila__nota adm-fila__nota--pendiente">—</span>';

    return `<div class="adm-fila">
      <div class="adm-fila__principal">
        <div class="adm-fila__titulo">${esc(examen.titulo || 'Examen')} ${estadoExamen(intento)}</div>
        <div class="adm-fila__meta">${meta.map((m) => `<span>${esc(m)}</span>`).join('')}</div>
      </div>
      <div class="adm-fila__acciones">${nota}${verCorreccion}</div>
    </div>`;
  }

  // Examen publicado para el grupo que el alumno aún no ha entregado.
  // El enlace no navega directo: primero confirma (un solo intento) y avisa
  // de que la navegación se ocultará durante el examen (ver _conectarEmpezar).
  function filaPendiente(examen, info) {
    info = info || {};
    const meta = [
      examen.materia,
      examen.tema,
      examen.fecha_limite ? 'Fecha límite ' + window.panelUI.fechaCorta(examen.fecha_limite) : null
    ].filter(Boolean);
    const textoBoton = info.enCurso ? 'Retomar examen' : 'Hacer examen';
    return `<div class="adm-fila">
      <div class="adm-fila__principal">
        <div class="adm-fila__titulo">${esc(examen.titulo || 'Examen')} <span class="adm-badge adm-badge--aviso">Examen pendiente</span></div>
        <div class="adm-fila__meta">${meta.map((m) => `<span>${esc(m)}</span>`).join('')}</div>
      </div>
      <div class="adm-fila__acciones"><a class="btn-secundario u-fs-xs js-empezar-examen" href="#!/tomar/${encodeURIComponent(examen.id)}" data-id="${esc(examen.id)}" data-titulo="${esc(examen.titulo || 'Examen')}" data-restantes="${info.ilimitado ? '∞' : info.restantes}" data-ilimitado="${info.ilimitado ? '1' : '0'}" data-reanudar="${info.enCurso ? '1' : '0'}">${textoBoton}</a></div>
    </div>`;
  }

  // A partir de la configuración del examen y los intentos del alumno:
  // cuántos intentos le quedan, si son ilimitados y si tiene uno en curso.
  function infoIntentos(examen, intentos) {
    let cfg = (examen && examen.config) || {};
    if (typeof cfg === 'string') {
      try { cfg = JSON.parse(cfg); } catch (e) { cfg = {}; }
    }
    const ilimitado = cfg.intentos === 'ilimitados';
    const permitidos = ilimitado ? Infinity : (parseInt(cfg.intentos, 10) || 1);
    const lista = (intentos || []).filter((i) => i.examen_id === examen.id);
    const enCurso = lista.some((i) => i.estado === 'en_progreso' || i.estado === 'pendiente');
    const usados = lista.filter((i) => i.estado === 'completado' || i.estado === 'calificado').length;
    return { ilimitado, enCurso, restantes: ilimitado ? Infinity : Math.max(0, permitidos - usados) };
  }

  function filaEvaluacion(nota) {
    const tieneNota = nota.nota != null;
    const meta = [
      nota.fecha ? window.panelUI.fechaCorta(nota.fecha) : null,
      nota.nota_max != null ? 'sobre ' + window.panelUI.numero(nota.nota_max) : null
    ].filter(Boolean);
    const valor = tieneNota
      ? `<span class="adm-fila__nota">${esc(window.panelUI.numero(nota.nota))}</span>`
      : '<span class="adm-badge adm-badge--borrador">Pendiente</span>';

    return `<div class="adm-fila">
      <div class="adm-fila__principal">
        <div class="adm-fila__titulo">${esc(nota.nombre || 'Evaluación')}</div>
        <div class="adm-fila__meta">${meta.map((m) => `<span>${esc(m)}</span>`).join('')}</div>
      </div>
      <div class="adm-fila__acciones">${valor}</div>
    </div>`;
  }

  // Subgrupo dentro de «Mis exámenes»: subtítulo con conteo y sus filas.
  function subgrupo(titulo, filas) {
    return `<div class="vista-mis-notas__grupo">
      <h3 class="vista-mis-notas__subtitulo">${esc(titulo)} (${filas.length})</h3>
      <div class="adm-lista">${filas.join('')}</div>
    </div>`;
  }

  function seccion(titulo, contenido) {
    return `<section class="adm-seccion">
      <h2 class="adm-seccion__titulo">${esc(titulo)}</h2>
      ${contenido}
    </section>`;
  }

  window.vistaMisNotas = {
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) {
        raiz.innerHTML = contenedor(pantalla(
          'user',
          'Inicia sesión para ver tus notas',
          'Tus exámenes realizados y tus notas de evaluaciones aparecerán aquí.',
          { texto: 'Iniciar sesión', clase: 'btn-ir-login', icono: 'log-in' }
        ));
        raiz.querySelector('.btn-ir-login')?.addEventListener('click', () => router.navegar('/login'));
        return;
      }
      const nombre = (usuario.nombre_completo || usuario.username || '').split(' ')[0];

      raiz.innerHTML = contenedor(`<p class="adm-cabecera__sub">Cargando tus notas…</p>`);

      // Cargas independientes: cada fuente se pinta aunque la otra falle.
      // listar() devuelve los exámenes publicados del grupo (con caché si no
      // hay red), así que los pendientes se ven también sin notificaciones.
      const [resExamenes, resPublicados, resEvaluaciones] = await Promise.allSettled([
        window.examenesRepository.misIntentos(usuario.id),
        window.examenesRepository.listar(usuario),
        window.plataformaRepository.misNotasEvaluaciones()
      ]);
      if (resExamenes.status === 'rejected' && resEvaluaciones.status === 'rejected') {
        raiz.innerHTML = contenedor(pantalla(
          'cloud-off',
          'No pudimos cargar tus notas',
          'Puede ser un problema de conexión. Comprueba tu conexión y vuelve a intentarlo.',
          Reintentar
        ));
        raiz.querySelector('.btn-reintentar-notas')?.addEventListener('click', () => window.vistaMisNotas.montar(raiz));
        return;
      }
      // El detalle técnico se registra para diagnóstico; la UI no lo muestra.
      if (resExamenes.status === 'rejected' && window.errores) {
        window.errores.registrar(resExamenes.reason, 'mis-notas:examenes');
      }
      if (resEvaluaciones.status === 'rejected' && window.errores) {
        window.errores.registrar(resEvaluaciones.reason, 'mis-notas:evaluaciones');
      }

      const intentos = resExamenes.status === 'fulfilled' ? (resExamenes.value || []) : null;
      const publicados = resPublicados.status === 'fulfilled' ? (resPublicados.value || []) : [];
      // Pendiente = publicado y sin entrega. Un intento en curso sigue pendiente.
      const entregados = new Set(
        (intentos || [])
          .filter((i) => i.estado === 'completado' || i.estado === 'calificado')
          .map((i) => i.examen_id)
      );
      const pendientes = intentos ? publicados.filter((e) => !entregados.has(e.id)) : [];
      const realizados = (intentos || []).filter((i) => i.estado !== 'en_progreso');
      // Tres subgrupos: lo que falta por hacer, lo entregado sin corregir y lo corregido.
      const enCurso = realizados.filter((i) => !i.corregido && i.estado === 'pendiente');
      const sinCorregir = realizados.filter((i) => !i.corregido && i.estado !== 'pendiente');
      const corregidos = realizados.filter((i) => i.corregido);
      const grupos = [
        ['Pendientes de hacer', [...pendientes.map((e) => filaPendiente(e, infoIntentos(e, intentos))), ...enCurso.map(filaExamen)]],
        ['Entregados sin corregir', sinCorregir.map(filaExamen)],
        ['Corregidos', corregidos.map(filaExamen)]
      ].filter(([, filas]) => filas.length);

      const examenesHtml = intentos === null
        ? pantalla('file-text', 'No se pudieron cargar tus exámenes', 'Revisa tu conexión y vuelve a intentarlo.', Reintentar, true)
        : grupos.length
          ? grupos.map(([titulo, filas]) => subgrupo(titulo, filas)).join('')
          : pantalla('file-text', 'No tienes exámenes pendientes', 'Cuando tu profesor publique un examen para tu grupo aparecerá aquí.', null, true);

      const evaluacionesHtml = resEvaluaciones.status === 'rejected'
        ? pantalla('clipboard-list', 'No se pudieron cargar tus evaluaciones', 'Revisa tu conexión y vuelve a intentarlo.', Reintentar, true)
        : (resEvaluaciones.value || []).length
          ? `<div class="adm-lista">${resEvaluaciones.value.map(filaEvaluacion).join('')}</div>`
          : pantalla('clipboard-list', 'No hay evaluaciones vinculadas', 'Cuando tu profesor vincule tu cuenta a una evaluación, tu nota final aparecerá aquí.', null, true);

      raiz.innerHTML = contenedor(`
        <header class="adm-cabecera">
          <span class="adm-cabecera__icono" aria-hidden="true">${I('graduation-cap')}</span>
          <div class="adm-cabecera__principal">
            <h1 class="adm-cabecera__titulo">${esc('Hola' + (nombre ? ', ' + nombre : ''))}</h1>
            <p class="adm-cabecera__sub">Aquí tienes tus exámenes realizados y tus notas de evaluaciones.</p>
          </div>
        </header>
        ${seccion('Mis exámenes', examenesHtml)}
        ${seccion('Mis notas de evaluaciones', evaluacionesHtml)}
      `);

      raiz.querySelectorAll('.btn-reintentar-notas').forEach((btn) => {
        btn.addEventListener('click', () => window.vistaMisNotas.montar(raiz));
      });

      // «Hacer examen» confirma antes de entrar: el examen suele ser de un
      // solo intento y dentro se oculta la navegación hasta entregar.
      raiz.querySelectorAll('.js-empezar-examen').forEach((a) => {
        a.addEventListener('click', async (ev) => {
          ev.preventDefault();
          const titulo = a.dataset.titulo || 'este examen';
          const reanudar = a.dataset.reanudar === '1';
          const ilimitado = a.dataset.ilimitado === '1';
          const restantes = Number(a.dataset.restantes) || 1;
          const intentosTxt = ilimitado
            ? 'Puedes hacerlo las veces que quieras.'
            : (restantes <= 1 && !reanudar
              ? 'Es de un solo intento: tómatelo con calma.'
              : `Te quedan ${a.dataset.restantes} intentos.`);
          const verbo = reanudar ? 'retomar' : 'empezar';
          const Verbo = reanudar ? 'Retomar' : 'Empezar';
          const ok = await window.helpers.confirmar(
            `Vas a ${verbo} «${titulo}». ${intentosTxt} Mientras realizas el examen, la barra de navegación se ocultará hasta que lo entregues.`,
            { titulo: `¿${Verbo} el examen?`, textoConfirmar: `${Verbo} examen`, peligroso: false }
          );
          if (ok) router.navegar('/tomar/' + a.dataset.id);
        });
      });

      if (window.Iconos) window.Iconos.actualizar();
    }
  };
})();
