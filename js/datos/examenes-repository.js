(function() {
  'use strict';
  const sb = () => window.supabaseClient;
  window.examenesRepository = {
    async listar(usuario) {
      if (!usuario || !sb()) {
        const cache = await window.cacheDatos.get(`examenes:grupo:${usuario?.grupo_id}`);
        return cache || [];
      }
      try {
        const esAlumno = (usuario.rol || '').toLowerCase() === 'usuario';
        // La papelera es un estado más del examen ('archivado'), no una tabla
        // aparte: las listas normales lo excluyen y solo se ve en /examenes.
        const respuesta = esAlumno
          ? await sb().rpc('listar_examenes_alumno', { p_grupo_id: usuario.grupo_id })
          : await sb().from('examenes_personalizados').select('*').eq('grupo_id', usuario.grupo_id)
            .neq('estado', 'archivado').order('creado_en', { ascending: false });
        if (respuesta.error) throw respuesta.error;
        const lista = respuesta.data || [];
        await window.cacheDatos.set(`examenes:grupo:${usuario.grupo_id}`, lista);
        return lista;
      } catch (e) {
        return await window.cacheDatos.get(`examenes:grupo:${usuario?.grupo_id}`) || [];
      }
    },
    async crearEvaluacion({ grupoId, creadoPor, titulo, asignatura, descripcion }) {
      if (!sb()) throw new Error('Sin conexión');
      const { data, error } = await sb().from('evaluaciones').insert({
        grupo_id: grupoId,
        creado_por: creadoPor,
        titulo: titulo || 'Nueva evaluación',
        asignatura: asignatura || '',
        descripcion: descripcion || ''
      }).select().single();
      if (error) throw error;
      return data;
    },
    async actualizarEvaluacion(id, campos) {
      if (!sb()) throw new Error('Sin conexión');
      const { data, error } = await sb().from('evaluaciones').update(campos).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    async eliminarEvaluacion(id) {
      if (!sb()) throw new Error('Sin conexión');
      const { error } = await sb().from('evaluaciones').delete().eq('id', id);
      if (error) throw error;
    },
    async guardarOrdenEvaluaciones(grupoId, idsEnOrden) {
      if (!sb()) throw new Error('Sin conexión');
      for (let i = 0; i < idsEnOrden.length; i++) {
        const { error } = await sb().from('evaluaciones').update({ orden: i }).eq('id', idsEnOrden[i]).eq('grupo_id', grupoId);
        if (error) throw error;
      }
    },
    async listarEvaluaciones(grupoId) {
      if (!sb()) return [];
      // Intento 1: orden manual (migración 025). Si la columna `orden` no
      // existe aún, degrada al orden por fecha de creación.
      let evs = null;
      try {
        const { data, error } = await sb().from('evaluaciones').select('*').eq('grupo_id', grupoId)
          .order('orden', { ascending: true })
          .order('creado_en', { ascending: true });
        if (!error) evs = data;
      } catch (e) { /* sin columna orden → fallback */ }
      if (evs === null) {
        try {
          const { data } = await sb().from('evaluaciones').select('*').eq('grupo_id', grupoId).order('creado_en', { ascending: true });
          evs = data;
        } catch (e2) { evs = []; }
      }
      const evaluaciones = evs || [];
      if (evaluaciones.length) {
        const ids = evaluaciones.map(e => e.id);
        const { data: exs } = await sb().from('examenes_personalizados').select('id, titulo, evaluacion_id, grupo_id').in('evaluacion_id', ids);
        evaluaciones.forEach(e => { e.examenes = (exs || []).filter(x => x.evaluacion_id === e.id); });
      } else {
        evaluaciones.forEach(e => { e.examenes = []; });
      }
      return evaluaciones;
    },
    async listarExamenesSueltos(grupoId) {
      if (!sb()) return [];
      const { data } = await sb().from('examenes_personalizados').select('*').eq('grupo_id', grupoId)
        .is('evaluacion_id', null).neq('estado', 'archivado')
        .order('creado_en', { ascending: false });
      return data || [];
    },
    async obtener(id) {
      // Los IDs son UUID: un id claramente inválido no debe llegar a la BD.
      const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
      if (!esUuid) return null;
      if (!sb()) return await window.cacheDatos.get(`examen:${id}`) || null;
      try {
        const usuario = window.store?.obtener?.('usuario');
        const esAlumno = (usuario?.rol || '').toLowerCase() === 'usuario';
        const respuesta = esAlumno
          ? await sb().rpc('obtener_examen_alumno', { p_examen_id: id })
          : await sb().from('examenes_personalizados').select('*').eq('id', id).single();
        if (respuesta.error) throw respuesta.error;
        if (respuesta.data) await window.cacheDatos.set(`examen:${id}`, respuesta.data);
        return respuesta.data || null;
      } catch (e) {
        return await window.cacheDatos.get(`examen:${id}`) || null;
      }
    },
    async guardar(examen) {
      if (!sb()) throw new Error('Sin conexión');
      const { data, error } = await sb().from('examenes_personalizados').upsert(examen, { onConflict: 'id' }).select().single();
      if (error) throw error;
      return data;
    },
    async eliminar(id) {
      if (!sb()) throw new Error('Sin conexión');
      await sb().from('examenes_personalizados').delete().eq('id', id);
    },

    // ── Papelera ──────────────────────────────────────────────────────────
    // Borrado suave con el estado 'archivado' (ya admitido por el CHECK de la
    // tabla): no hace falta migración y todas las RPC del alumno exigen
    // estado='publicado' + publicado=true, así que un examen en la papelera
    // deja de estar accesible por sus enlaces al instante.
    // El estado anterior se guarda en config.papelera para poder restaurarlo.
    _configConPapelera(actual) {
      const config = (actual && actual.config && typeof actual.config === 'object' && !Array.isArray(actual.config))
        ? Object.assign({}, actual.config)
        : {};
      const previa = (config.papelera && typeof config.papelera === 'object') ? config.papelera : {};
      const usuario = (window.store && typeof window.store.obtener === 'function')
        ? window.store.obtener('usuario')
        : null;
      config.papelera = {
        estado_previo: previa.estado_previo || actual.estado || 'borrador',
        publicado_previo: typeof previa.publicado_previo === 'boolean' ? previa.publicado_previo : !!actual.publicado,
        eliminado_en: new Date().toISOString(),
        eliminado_por: (usuario && usuario.id) || null
      };
      return config;
    },

    /** Mueve un examen a la papelera. No borra la fila ni sus entregas. */
    async moverAPapelera(id) {
      if (!sb()) throw new Error('Sin conexión');
      const actual = await this.obtener(id);
      if (!actual) throw new Error('No se encontró el examen.');
      if (actual.estado === 'archivado') return actual;
      const { data, error } = await sb().from('examenes_personalizados')
        .update({
          estado: 'archivado',
          publicado: false,
          config: this._configConPapelera(actual),
          actualizado_en: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (window.cacheDatos) await window.cacheDatos.set(`examen:${id}`, data);
      return data;
    },

    /** Devuelve el examen a su estado anterior (nunca a 'archivado'). */
    async restaurar(id) {
      if (!sb()) throw new Error('Sin conexión');
      const actual = await this.obtener(id);
      if (!actual || actual.estado !== 'archivado') throw new Error('El examen no está en la papelera.');
      const config = (actual.config && typeof actual.config === 'object' && !Array.isArray(actual.config))
        ? Object.assign({}, actual.config)
        : {};
      const previa = (config.papelera && typeof config.papelera === 'object') ? config.papelera : {};
      delete config.papelera;
      const estado = ['borrador', 'publicado', 'cerrado'].includes(previa.estado_previo)
        ? previa.estado_previo
        : 'borrador';
      const { data, error } = await sb().from('examenes_personalizados')
        .update({
          estado,
          publicado: estado === 'publicado',
          config,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (window.cacheDatos) await window.cacheDatos.set(`examen:${id}`, data);
      return data;
    },

    /** La papelera es del grupo del profesor; sin grupo (owner) se ve todo. */
    _grupoActual() {
      const usuario = (window.store && typeof window.store.obtener === 'function')
        ? window.store.obtener('usuario')
        : null;
      return (usuario && usuario.grupo_id) || null;
    },

    /** Exámenes en la papelera del profesor (solo su grupo / owner). */
    async listarPapelera() {
      if (!sb()) return [];
      const grupoId = this._grupoActual();
      try {
        let consulta = sb().from('examenes_personalizados').select('*').eq('estado', 'archivado');
        // Solo la papelera del grupo activo: RLS permite ver exámenes de
        // cualquier grupo donde el profesor sea editor.
        if (grupoId) consulta = consulta.eq('grupo_id', grupoId);
        const { data, error } = await consulta.order('actualizado_en', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (e) {
        return [];
      }
    },

    /**
     * IDs en la papelera. La RPC fb_resumen_admin normaliza cualquier estado
     * desconocido a 'borrador', así que el resumen no puede distinguirlos:
     * esta consulta directa permite ocultarlos del panel y de sus contadores.
     */
    async idsEnPapelera() {
      if (!sb()) return [];
      const grupoId = this._grupoActual();
      try {
        let consulta = sb().from('examenes_personalizados').select('id').eq('estado', 'archivado');
        if (grupoId) consulta = consulta.eq('grupo_id', grupoId);
        const { data, error } = await consulta;
        if (error) throw error;
        return (data || []).map((fila) => String(fila.id));
      } catch (e) {
        return [];
      }
    },

    /** Borrado definitivo de UN examen de la papelera (enlaces y entregas caen en cascada). */
    async eliminarDefinitivo(id) {
      if (!sb()) throw new Error('Sin conexión');
      const grupoId = this._grupoActual();
      let consulta = sb().from('examenes_personalizados').delete()
        .eq('id', id)
        .eq('estado', 'archivado');
      if (grupoId) consulta = consulta.eq('grupo_id', grupoId);
      const { error } = await consulta;
      if (error) throw error;
      if (window.cacheDatos) await window.cacheDatos.set(`examen:${id}`, null);
    },

    /** Vacía la papelera: borra definitivamente todo lo archivado del grupo. */
    async vaciarPapelera() {
      if (!sb()) throw new Error('Sin conexión');
      const ids = await this.idsEnPapelera();
      if (!ids.length) return 0;
      const { error } = await sb().from('examenes_personalizados').delete().in('id', ids);
      if (error) throw error;
      if (window.cacheDatos) {
        await Promise.all(ids.map((id) => window.cacheDatos.set(`examen:${id}`, null)));
      }
      return ids.length;
    },
    // ── Recuperación desde la caché del dispositivo ──────────────────────
    // La caché guarda el examen completo (preguntas incluidas) cada vez que se
    // lee del servidor, y `list()` no descarta las entradas caducadas: si un
    // examen se borró por error (o por otra vía) todavía se puede reconstruir
    // desde el navegador donde se abrió. Es la única red que queda cuando la
    // fila ya no existe en Supabase y no hay copia de seguridad.
    async copiasLocales() {
      if (!window.cacheDatos || typeof window.cacheDatos.list !== 'function') return [];
      const items = await window.cacheDatos.list('examen:');
      const copias = items
        .filter((item) => item && item.valor && typeof item.valor === 'object' && item.valor.id)
        .map((item) => ({
          examen: item.valor,
          guardadoEn: item.ts ? new Date(item.ts).toISOString() : null
        }));
      if (!copias.length) return [];

      // Solo interesan las que ya no están en el servidor: las que siguen
      // vivas (incluidas las de la papelera) se gestionan desde la lista.
      let vivos = null;
      if (sb()) {
        try {
          const { data, error } = await sb().from('examenes_personalizados').select('id');
          if (!error) vivos = new Set((data || []).map((fila) => String(fila.id)));
        } catch (e) { /* sin conexión: se muestran todas las copias */ }
      }
      if (!vivos) return copias;
      return copias.filter((copia) => !vivos.has(String(copia.examen.id)));
    },

    /**
     * Recrea en la nube una copia de la caché, siempre como borrador: un
     * examen recuperado no debe reabrir sus enlaces antiguos sin revisarlo.
     */
    async recuperarCopia(examen) {
      if (!sb()) throw new Error('Sin conexión');
      if (!examen || !examen.id) throw new Error('La copia no es válida.');
      const usuario = (window.store && typeof window.store.obtener === 'function')
        ? window.store.obtener('usuario')
        : null;
      const grupoId = examen.grupo_id || (usuario && usuario.grupo_id) || null;
      if (!grupoId) throw new Error('No se pudo determinar tu grupo de trabajo.');
      const config = (examen.config && typeof examen.config === 'object' && !Array.isArray(examen.config))
        ? Object.assign({}, examen.config)
        : {};
      delete config.papelera;
      const { data, error } = await sb().from('examenes_personalizados').upsert({
        id: examen.id,
        grupo_id: grupoId,
        creado_por: examen.creado_por || (usuario && usuario.id) || null,
        titulo: String(examen.titulo || '').trim() || 'Examen recuperado',
        descripcion: examen.descripcion || '',
        preguntas: Array.isArray(examen.preguntas) ? examen.preguntas : [],
        puntos_totales: Number(examen.puntos_totales) || 0,
        estado: 'borrador',
        publicado: false,
        config,
        actualizado_en: new Date().toISOString()
      }, { onConflict: 'id' }).select().single();
      if (error) throw error;
      if (window.cacheDatos) await window.cacheDatos.set(`examen:${data.id}`, data);
      return data;
    },

    async publicar(id) {
      if (!sb()) throw new Error('Sin conexión');
      const { data: ex } = await sb().from('examenes_personalizados').select('grupo_id, titulo, publicado').eq('id', id).single();
      if (ex && !ex.publicado) {
        await sb().from('examenes_personalizados').update({ publicado: true, estado: 'publicado' }).eq('id', id);
        if (ex.grupo_id) {
          await this.asignarAGrupo(id, ex.grupo_id);
          await this._notificarExamenPublicado(id, ex);
        }
      }
    },

    // El servicio resuelve destinatarios (alumnos del grupo) y persiste.
    async _notificarExamenPublicado(examenId, examen) {
      if (!examen || !examen.grupo_id) return;
      if (!window.notificationService) return;
      try {
        await window.notificationService.emitir('examen.publicado', {
          examenId,
          titulo: examen.titulo || 'Examen',
          grupoId: examen.grupo_id,
          datos: { examen_id: examenId, examen_titulo: examen.titulo || 'Examen' }
        });
      } catch (e) { /* no crítico */ }
    },
    async obtenerMiembrosGrupo(grupoId, soloAlumnos = true) {
      if (!sb() || !grupoId) return [];
      let q = sb().from('perfiles').select('id, nombre_completo, username, rol').eq('grupo_id', grupoId);
      if (soloAlumnos) q = q.eq('rol', 'usuario');
      const { data } = await q.order('nombre_completo');
      return data || [];
    },
    // Los intentos ya no se preasignan desde el navegador. El servidor crea
    // uno al comenzar y aplica el límite de intentos bajo bloqueo transaccional.
    async asignarAGrupo() { return 0; },
    async asignarAlumnos() { return 0; },
    async obtenerIntentosGrupo(grupoId) {
      if (!sb() || !grupoId) return [];
      const { data: ex } = await sb().from('examenes_personalizados').select('id').eq('grupo_id', grupoId);
      const ids = (ex || []).map(e => e.id);
      if (ids.length === 0) return [];
      const { data } = await sb().from('intentos_examen_personalizado')
        .select('*, perfiles!alumno_id(id, nombre_completo, username), examenes_personalizados!examen_id(id, titulo)')
        .in('examen_id', ids)
        .order('fecha_inicio', { ascending: false });
      return data || [];
    },
    async estadisticasGrupo(grupoId) {
      if (!sb() || !grupoId) return null;
      const { data: alumnosData } = await sb().from('perfiles').select('id, nombre_completo').eq('grupo_id', grupoId).eq('rol', 'usuario');
      const totalAlumnos = (alumnosData || []).length;
      const intentos = await this.obtenerIntentosGrupo(grupoId);
      const calificados = intentos.filter(i => i.corregido && i.nota != null);
      const notas = calificados.map(i => parseFloat(i.nota || 0));
      const promedioGrupo = notas.length ? Math.round(notas.reduce((s, n) => s + n, 0) / notas.length) : 0;
      const porAlumno = {};
      calificados.forEach(i => {
        if (!porAlumno[i.alumno_id]) porAlumno[i.alumno_id] = [];
        porAlumno[i.alumno_id].push(parseFloat(i.nota || 0));
      });
      let aprobados = 0, enRiesgo = 0, destacados = 0;
      Object.values(porAlumno).forEach(arr => {
        const avg = arr.reduce((s, n) => s + n, 0) / arr.length;
        if (avg >= 7) aprobados++;
        else enRiesgo++;
        if (avg >= 9) destacados++;
      });
      const distribucion = { '0-4': 0, '5-5': 0, '6-6': 0, '7-8': 0, '9-10': 0 };
      notas.forEach(n => {
        if (n < 5) distribucion['0-4']++;
        else if (n < 6) distribucion['5-5']++;
        else if (n < 7) distribucion['6-6']++;
        else if (n < 9) distribucion['7-8']++;
        else distribucion['9-10']++;
      });
      return {
        totalAlumnos,
        totalExamenes: new Set(intentos.map(i => i.examen_id)).size,
        intentosCalificados: calificados.length,
        promedioGrupo,
        aprobados,
        enRiesgo,
        destacados,
        distribucion
      };
    },
    async obtenerIntentos(examenId) {
      if (!sb()) return [];
      const { data } = await sb().from('intentos_examen_personalizado').select('*, perfiles!alumno_id(*)').eq('examen_id', examenId).order('fecha_inicio', { ascending: false });
      return data || [];
    },
    /**
     * Whitelist de columnas válidas para intentos_examen_personalizado.
     * Mantener en sincronía con supabase/migraciones/*:
     *   - 001_initial_schema.sql   (14 columnas base: id, examen_id, alumno_id,
     *     respuestas, puntuacion, nota, corregido, corregido_por, observaciones,
     *     estado, fecha_inicio, fecha_completado, fecha_corregido, creado_en)
     *   - 008_correccion_examenes.sql (añade correccion JSONB)
     * NOTA: la migración 017 añade columnas a `examenes_personalizado`, NO a esta tabla.
     *
     * `pendiente_sync` NO es columna DB: es un flag de retorno que este método
     * añade cuando la operación queda encolada offline.
     *
     * Evita que objetos embebidos (e.g. `examenes_personalizados` desde
     * un SELECT con join `*, examenes_personalizados!examen_id(*)`)
     * se propaguen al upsert y reventen con:
     * "Could not find the '<X>' column of 'intentos_examen_personalizado' in the schema cache"
     */
    async guardarIntento(intento) {
      // La escritura de intentos ya no se hace con upsert directo: el servidor
      // controla propietario, estado y columnas inmutables.
      if (sb() && intento && intento.id && Object.prototype.hasOwnProperty.call(intento, 'respuestas') && Object.keys(intento).every(k => ['id', 'respuestas'].includes(k))) {
        const respuestas = typeof intento.respuestas === 'string' ? JSON.parse(intento.respuestas || '{}') : (intento.respuestas || {});
        const { data, error } = await sb().rpc('guardar_borrador_examen', { p_intento_id: intento.id, p_respuestas: respuestas });
        if (error) throw error;
        return data;
      }
      if (sb() && intento && !intento.id && intento.examen_id) {
        const { data, error } = await sb().rpc('iniciar_intento_examen', { p_examen_id: intento.examen_id });
        if (error) throw error;
        return data;
      }
      throw new Error('Operación de intento no soportada: usa iniciar, guardar borrador o entregar mediante RPC');
    },
    async misIntentos(usuarioId) {
      if (!sb()) return await window.cacheDatos.get(`intentos:${usuarioId}`) || [];
      try {
        const { data, error } = await sb().rpc('listar_mis_intentos_examen');
        if (error) throw error;
        const lista = data || [];
        await window.cacheDatos.set(`intentos:${usuarioId}`, lista);
        return lista;
      } catch (e) {
        return await window.cacheDatos.get(`intentos:${usuarioId}`) || [];
      }
    },
    async obtenerResultado(examenId, intentoId) {
      if (!sb()) throw new Error('Sin conexión');
      const { data, error } = await sb().rpc('obtener_resultado_examen', { p_examen_id: examenId, p_intento_id: intentoId });
      if (error) throw error;
      return data || null;
    },
    async entregarIntento(intentoId, respuestas) {
      if (!sb()) throw new Error('Sin conexión: no se puede entregar un examen sin validación del servidor');
      const payload = typeof respuestas === 'string' ? JSON.parse(respuestas || '{}') : (respuestas || {});
      const { data, error } = await sb().rpc('entregar_intento_examen', { p_intento_id: intentoId, p_respuestas: payload });
      if (error) throw error;
      return data;
    },
    async calificar(intentoId, nota, observaciones, corregidoPor, correccion) {
      if (!sb()) throw new Error('Sin conexión');
      const { data, error } = await sb().rpc('calificar_intento_examen', {
        p_intento_id: intentoId,
        p_nota: nota,
        p_observaciones: observaciones || '',
        p_correccion: correccion || {}
      });
      if (error) throw error;
      return data;
    }
  };
})();
