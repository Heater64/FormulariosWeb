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
      throw new Error(mensaje(error));
    }
    return data;
  }

  window.plataformaRepository = {
    // ── Panel del administrador ───────────────────────────────────────────
    resumen() {
      return rpc('fb_resumen_admin');
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

    cambiarEstado(examenId, estado) {
      return rpc('fb_cambiar_estado_examen', { p_examen_id: examenId, p_estado: estado });
    },

    // ── Utilidades de enlace ──────────────────────────────────────────────
    /** URL pública que el alumno abre. El token es el secreto del enlace. */
    urlEnlace(token) {
      const base = window.location.origin;
      return base + '/e/' + encodeURIComponent(token);
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
    }
  };
})();
