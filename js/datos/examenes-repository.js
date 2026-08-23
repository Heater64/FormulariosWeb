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
        const respuesta = esAlumno
          ? await sb().rpc('listar_examenes_alumno', { p_grupo_id: usuario.grupo_id })
          : await sb().from('examenes_personalizados').select('*').eq('grupo_id', usuario.grupo_id).order('creado_en', { ascending: false });
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
      const { data } = await sb().from('examenes_personalizados').select('*').eq('grupo_id', grupoId).is('evaluacion_id', null).order('creado_en', { ascending: false });
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
