/* ============================================================================
 * js/datos/plataforma-repository.js
 * ----------------------------------------------------------------------------
 * Única capa que llama a las RPCs de la migración 056 (enlaces individuales de
 * un solo uso, entregas y corrección). Las vistas nunca invocan Supabase
 * directamente: así los nombres de las RPCs viven en un solo sitio.
 *
 * Ninguna de estas funciones decide permisos ni calcula notas: eso es del
 * servidor. Aquí solo se transporta y se traduce el error a texto legible.
 *
 * NOTA: las cinco RPCs por token (fb_estado_enlace, fb_iniciar_por_token,
 * fb_guardar_borrador_token, fb_entregar_por_token y fb_consultar_entrega) NO
 * pasan por aquí. Las llama directamente public-site/examen.js, que es una
 * página autónoma sin sesión y sin los bundlers de la SPA; cargar este archivo
 * allí solo añadiría peso. El contrato de esos cinco nombres está cubierto por
 * tests/enlaces-alumnos.test.js.
 * ==========================================================================*/
(function () {
  'use strict';

  const sb = () => window.supabaseClient;

  function mensaje(error) {
    if (window.errores) return window.errores.mensajeUsuario(error);
    if (!error) return 'Error inesperado';
    const bruto = error.message || error.details || String(error);
    const lineas = String(bruto).split('\n').map((l) => l.trim()).filter(Boolean);
    const util = lineas.find((l) => !/^[A-Z0-9]{5}$/.test(l)) || 'Error inesperado';
    return util.replace(/^(Detalle|Detail|Hint|Error)\s*:\s*/i, '').trim();
  }

  async function rpc(nombre, args) {
    if (!sb()) throw new Error('Sin conexión con el servidor.');
    const { data, error } = await sb().rpc(nombre, args || {});
    if (error) {
      // La migración 056 añade estas RPCs; distinguir un esquema atrasado de
      // un error transitorio ayuda al administrador a saber qué falta hacer.
      if (nombre === 'fb_resumen_admin') {
        if (error.code === '22023' && /cannot get array length of a scalar/i.test(error.message || '')) {
          throw new Error('El resumen encontró preguntas con formato antiguo o dañado. Aplica la migración 057_resumen_admin_json_preguntas_robusto.sql en Supabase y recarga.');
        }
        if (error.code === 'PGRST202' || error.code === '42883') {
          throw new Error('Falta aplicar la migración 056_enlaces_examen_alumnos.sql en Supabase. Pídele al propietario del proyecto que la ejecute en el SQL Editor y vuelve a cargar el panel.');
        }
        // Mantener el mensaje de usuario, pero mostrar el SQLSTATE no sensible:
        // permite al administrador distinguir fallos de esquema/permisos/datos.
        const codigo = /^[A-Z0-9]{5}$/.test(String(error.code || '')) ? ` (${error.code})` : '';
        throw new Error(mensaje(error) + codigo);
      }
      // La sincronización de filas es exclusiva de la hoja de cálculo (064).
      if (nombre === 'fb_evaluacion_alumnos_guardar' && (error.code === 'PGRST202' || error.code === '42883')) {
        throw new Error('Falta aplicar la migración 064_evaluacion_hoja_calculo.sql en Supabase. Ejecútala en el SQL Editor y vuelve a cargar la sección.');
      }
      // Asignación de cuentas a filas y notas del alumno: migración 067.
      if (['fb_evaluacion_vinculos', 'fb_evaluacion_vincular', 'fb_mis_notas_evaluaciones'].includes(nombre) && (error.code === 'PGRST202' || error.code === '42883')) {
        throw new Error('Falta aplicar la migración 067_evaluacion_vinculo_alumno.sql en Supabase. Ejecútala en el SQL Editor y vuelve a cargar la sección.');
      }
      // Las RPC de evaluaciones vienen de la migración 060.
      if (nombre.indexOf('fb_evaluacion') === 0 && (error.code === 'PGRST202' || error.code === '42883')) {
        throw new Error('Falta aplicar la migración 060_evaluaciones.sql (y sus actualizaciones 064_evaluacion_hoja_calculo.sql y 065_evaluacion_secciones_paginadas.sql) en Supabase. Ejecútalas en el SQL Editor y vuelve a cargar la sección.');
      }
      throw new Error(mensaje(error));
    }
    return data;
  }

  window.plataformaRepository = {
    // ── Panel del administrador ───────────────────────────────────────────
    /**
     * Resumen del panel sin los exámenes de la papelera. La RPC normaliza
     * cualquier estado que no conozca a 'borrador', así que un examen
     * archivado volvería a colarse en las listas y en los contadores; se
     * ocultan aquí, en el único punto por el que pasan panel, exámenes,
     * entregas y evaluaciones.
     */
    async resumen() {
      const datos = await rpc('fb_resumen_admin');
      const examenes = (datos && Array.isArray(datos.examenes)) ? datos.examenes : [];
      const repo = window.examenesRepository;
      if (!examenes.length || !repo || typeof repo.idsEnPapelera !== 'function') return datos;
      const enPapelera = await repo.idsEnPapelera();
      if (!enPapelera.length) return datos;
      const ocultos = new Set(enPapelera);
      return Object.assign({}, datos, {
        examenes: examenes.filter((examen) => !ocultos.has(String(examen.id)))
      });
    },

    crearEnlaces(examenId, alumnos) {
      return rpc('fb_crear_enlaces', { p_examen_id: examenId, p_alumnos: alumnos || [] });
    },

    listarEnlaces(examenId) {
      return rpc('fb_listar_enlaces', { p_examen_id: examenId });
    },

    eliminarEnlace(enlaceId) {
      return rpc('fb_eliminar_enlace', { p_enlace_id: enlaceId });
    },

    listarEntregas(examenId) {
      return rpc('fb_listar_entregas', { p_examen_id: examenId });
    },

    obtenerEntrega(intentoId) {
      return rpc('fb_obtener_entrega', { p_intento_id: intentoId });
    },

    corregirEntrega(intentoId, correccion, observaciones) {
      return rpc('fb_corregir_entrega', {
        p_intento_id: intentoId,
        p_correccion: correccion || {},
        p_observaciones: observaciones || ''
      });
    },

    /**
     * Asigna (o con `alumnoId` nulo desasigna) la cuenta de alumno que verá
     * este intento en «Mis notas» (migración 069). Devuelve
     * { intento_id, alumno_id, alumno_asignado, ya_tenia_intento }.
     */
    asignarIntentoAlumno(intentoId, alumnoId) {
      return rpc('fb_asignar_intento_alumno', {
        p_intento_id: intentoId,
        p_alumno: alumnoId || null
      });
    },

    cambiarEstado(examenId, estado) {
      return rpc('fb_cambiar_estado_examen', { p_examen_id: examenId, p_estado: estado });
    },

    // ── Utilidades de enlace ──────────────────────────────────────────────
    /** URL pública que el alumno abre. El token es el secreto del enlace. */
    urlEnlace(token) {
      const base = window.location.origin;
      return base + '/e/' + encodeURIComponent(token);
    },

    // ── Enlaces comunitarios (063): un solo enlace para toda la clase */
    crearEnlaceComunitario(examenId) {
      return rpc('fb_crear_enlace_comunitario', { p_examen_id: examenId });
    },

    /** Estado inicial del enlace, indicando si es de la clase (comunitario). */
    estadoComunitario(token) {
      return rpc('fb_estado_enlace', { p_token: token });
    },

    /** Abre (o retoma) el examen de un alumno mediante su nombre. */
    comunitarioIniciar(token, nombre, grupo) {
      return rpc('fb_comunitario_iniciar', {
        p_token: token, p_nombre: nombre, p_grupo: grupo || ''
      });
    },

    /** Borrador de un alumno identificado por nombre. */
    comunitarioBorrador(token, nombre, respuestas) {
      return rpc('fb_comunitario_borrador', {
        p_token: token, p_nombre: nombre, p_respuestas: respuestas
      });
    },

    /** Entrega de un alumno identificado por nombre. */
    comunitarioEntregar(token, nombre, respuestas) {
      return rpc('fb_comunitario_entregar', {
        p_token: token, p_nombre: nombre, p_respuestas: respuestas
      });
    },

    /** Resultado (revisión) del alumno identificado por nombre. */
    comunitarioConsultar(token, nombre) {
      return rpc('fb_comunitario_consultar', {
        p_token: token, p_nombre: nombre
      });
    },

    /** Mensaje listo para pegar en WhatsApp (uno por alumno). */
    mensajeWhatsApp(alumno, titulo) {
      const nombre = (alumno && alumno.nombre_alumno) ? alumno.nombre_alumno.split(' ')[0] : '';
      const saludo = nombre ? 'Hola ' + nombre + ', ' : '';
      return saludo + 'aquí tienes tu examen' + (titulo ? ' de ' + titulo : '') + ':\n'
        + this.urlEnlace(alumno.token)
        + '\n\nSolo puedes entregarlo una vez.';
    },

    abrirWhatsApp(texto) {
      window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener');
    },

    async copiar(texto) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(texto);
          return true;
        }
      } catch (e) { /* sin permiso de portapapeles: se ignora */ }
      return false;
    },

    // ── Evaluaciones (migración 060) ─────────────────────────────────────
    listarEvaluaciones() {
      return rpc('fb_evaluaciones_listar');
    },

    crearEvaluacion(nombre, descripcion, fecha) {
      return rpc('fb_evaluacion_crear', {
        p_nombre: nombre, p_descripcion: descripcion || '', p_fecha: fecha || null
      });
    },

    actualizarEvaluacion(id, nombre, descripcion, fecha, notaMax) {
      const args = {
        p_id: id, p_nombre: nombre, p_descripcion: descripcion || '', p_fecha: fecha || null
      };
      // Rango de la evaluación (migración 064). Si no se envía, el servidor
      // conserva el valor que ya tiene, así que este llamador sigue válido.
      if (notaMax !== undefined) args.p_nota_max = notaMax;
      return rpc('fb_evaluacion_actualizar', args);
    },

    eliminarEvaluacion(id) {
      return rpc('fb_evaluacion_eliminar', { p_id: id });
    },

    /**
     * Sincroniza la lista visible y ordenada de filas de alumnos.
     * `alumnos` debe ser SIEMPRE la lista completa que se ve en la rejilla:
     * el servidor oculta lo que falte y borra sus notas manuales.
     */
    guardarAlumnosEvaluacion(id, alumnos) {
      return rpc('fb_evaluacion_alumnos_guardar', { p_id: id, p_alumnos: alumnos || [] });
    },

    /** Sincroniza las columnas de la rejilla con la lista del editor. */
    guardarColumnasEvaluacion(id, columnas) {
      return rpc('fb_evaluacion_columnas_guardar', { p_id: id, p_columnas: columnas || [] });
    },

    /** Nota escrita a mano; `null` devuelve la celda al valor automático. */
    guardarCeldaEvaluacion(id, columnaId, alumno, nota) {
      return rpc('fb_evaluacion_celda_guardar', {
        p_id: id, p_columna_id: columnaId, p_alumno: alumno, p_nota: nota
      });
    },

    /**
     * Rejilla completa de una evaluación (todas las columnas; la vista
     * gestiona el scroll, sin troceado del servidor).
     */
    obtenerEvaluacion(id) {
      return rpc('fb_evaluacion_obtener', { p_id: id });
    },

    importarEvaluacion(id, celdas, finales) {
      return rpc('fb_evaluacion_importar', {
        p_id: id, p_celdas: celdas || [], p_finales: finales || []
      });
    },

    /** Cuentas de alumno vinculadas a las filas de una evaluación (migración 067). */
    vinculosEvaluacion(id) {
      return rpc('fb_evaluacion_vinculos', { p_id: id });
    },

    /** Asigna (o quita con `alumnoId` nulo) la cuenta de una fila de la rejilla. */
    vincularAlumnoEvaluacion(id, clave, alumnoId) {
      return rpc('fb_evaluacion_vincular', {
        p_id: id, p_clave: clave, p_alumno: alumnoId || null
      });
    },

    /** Solo las notas finales propias del alumno con sesión (migración 067). */
    misNotasEvaluaciones() {
      return rpc('fb_mis_notas_evaluaciones');
    }
  };
})();
