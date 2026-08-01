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
        const { data } = await sb().from('examenes_personalizados').select('*').eq('grupo_id', usuario.grupo_id).order('creado_en', { ascending: false });
        const lista = data || [];
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
    async listarEvaluaciones(grupoId) {
      if (!sb()) return [];
      const { data: evs } = await sb().from('evaluaciones').select('*').eq('grupo_id', grupoId).order('creado_en', { ascending: true });
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
      if (!sb()) {
        return await window.cacheDatos.get(`examen:${id}`) || null;
      }
      try {
        const { data, error } = await sb().from('examenes_personalizados').select('*').eq('id', id).single();
        if (error) { console.error('obtener examen:', error); return null; }
        if (data) await window.cacheDatos.set(`examen:${id}`, data);
        return data || null;
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
      const { data: ex } = await sb().from('examenes_personalizados').select('grupo_id').eq('id', id).single();
      await sb().from('examenes_personalizados').update({ publicado: true, estado: 'publicado' }).eq('id', id);
      if (ex && ex.grupo_id) await this.asignarAGrupo(id, ex.grupo_id);
    },
    async obtenerMiembrosGrupo(grupoId, soloAlumnos = true) {
      if (!sb() || !grupoId) return [];
      let q = sb().from('perfiles').select('id, nombre_completo, username, rol').eq('grupo_id', grupoId);
      if (soloAlumnos) q = q.eq('rol', 'usuario');
      const { data } = await q.order('nombre_completo');
      return data || [];
    },
    async asignarAGrupo(examenId, grupoId) {
      if (!sb()) throw new Error('Sin conexión');
      const alumnos = await this.obtenerMiembrosGrupo(grupoId, true);
      if (alumnos.length === 0) return 0;
      const { data: existentes } = await sb().from('intentos_examen_personalizado').select('alumno_id').eq('examen_id', examenId);
      const yaAsignados = new Set((existentes || []).map(i => i.alumno_id));
      const nuevos = alumnos.filter(a => !yaAsignados.has(a.id));
      if (nuevos.length === 0) return 0;
      const filas = nuevos.map(a => ({ examen_id: examenId, alumno_id: a.id, estado: 'pendiente', respuestas: '{}' }));
      const { error } = await sb().from('intentos_examen_personalizado').insert(filas);
      if (error) throw error;
      return nuevos.length;
    },
    async asignarAlumnos(examenId, alumnoIds) {
      if (!sb()) throw new Error('Sin conexión');
      if (!alumnoIds || alumnoIds.length === 0) return 0;
      const { data: existentes } = await sb().from('intentos_examen_personalizado').select('alumno_id').eq('examen_id', examenId);
      const yaAsignados = new Set((existentes || []).map(i => i.alumno_id));
      const nuevos = alumnoIds.filter(id => !yaAsignados.has(id));
      if (nuevos.length === 0) return 0;
      const filas = nuevos.map(id => ({ examen_id: examenId, alumno_id: id, estado: 'pendiente', respuestas: '{}' }));
      const { error } = await sb().from('intentos_examen_personalizado').insert(filas);
      if (error) throw error;
      return nuevos.length;
    },
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
      const CAMPOS_VALIDOS = new Set([
        'id', 'examen_id', 'alumno_id', 'respuestas', 'puntuacion', 'nota',
        'corregido', 'corregido_por', 'observaciones', 'estado',
        'fecha_inicio', 'fecha_completado', 'fecha_corregido',
        'creado_en', 'correccion'
      ]);
      const limpio = {};
      for (const k of Object.keys(intento || {})) {
        if (CAMPOS_VALIDOS.has(k) && k !== 'pendiente_sync') limpio[k] = intento[k];
      }
      if (!sb() || !navigator.onLine) {
        try { window.colaSync.encolar('upsert', 'intentos_examen_personalizado', limpio, { onConflict: 'id' }); } catch (e) { console.warn('guardarIntento offline queue:', e); }
        return { ...limpio, pendiente_sync: true };
      }
      try {
        const { data, error } = await sb().from('intentos_examen_personalizado').upsert(limpio, { onConflict: 'id' }).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        try { window.colaSync.encolar('upsert', 'intentos_examen_personalizado', limpio, { onConflict: 'id' }); } catch (e2) { console.warn('guardarIntento sync queue:', e2); }
        return { ...limpio, pendiente_sync: true };
      }
    },
    async misIntentos(usuarioId) {
      if (!sb()) {
        return await window.cacheDatos.get(`intentos:${usuarioId}`) || [];
      }
      try {
        const { data, error } = await sb().from('intentos_examen_personalizado').select('*, examenes_personalizados!examen_id(*)').eq('alumno_id', usuarioId).order('fecha_inicio', { ascending: false });
        if (error) { console.error('misIntentos:', error); return []; }
        const lista = data || [];
        await window.cacheDatos.set(`intentos:${usuarioId}`, lista);
        return lista;
      } catch (e) {
        return await window.cacheDatos.get(`intentos:${usuarioId}`) || [];
      }
    },
    async calificar(intentoId, nota, observaciones, corregidoPor, correccion) {
      if (!sb()) throw new Error('Sin conexión');
      const update = {
        nota, observaciones, corregido: true, corregido_por: corregidoPor,
        estado: 'calificado', fecha_corregido: new Date().toISOString()
      };
      if (correccion !== undefined) update.correccion = correccion;
      await sb().from('intentos_examen_personalizado').update(update).eq('id', intentoId);
    }
  };
})();
