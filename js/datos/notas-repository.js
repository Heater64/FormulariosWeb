(function() {
  'use strict';
  const sb = () => window.supabaseClient;
  // Traduce mensajes técnicos del servidor a texto amigable de usuario.
  const _traducir = (error) => window.errores
    ? window.errores.mensajeUsuario(error)
    : (error && error.message) || 'Error inesperado';

  function claveLista(usuarioId, tipo) { return `notas:lista:${usuarioId}:${tipo || 'todas'}`; }
  function claveNota(usuarioId, libroNombre, capituloNumero, tipo) {
    return `notas:nota:${usuarioId}:${libroNombre}:${capituloNumero}:${tipo || 'personal'}`;
  }
  // Notas personales (bloc de notas)
  function clavePersonales(usuarioId) { return `notas:personales:${usuarioId}`; }
  function clavePapelera(usuarioId) { return `notas:papelera:${usuarioId}`; }

  async function _leerCache(usuarioId, tipo) {
    return (await window.cacheDatos.get(claveLista(usuarioId, tipo))) || [];
  }
  async function _escribirCache(usuarioId, tipo, lista) {
    await window.cacheDatos.set(claveLista(usuarioId, tipo), lista);
  }

  // La migración 019 puede estar parcialmente aplicada (faltan fijada/pendiente_sync).
  // Estas funciones ordenan/limpian sin depender de esas columnas para que la app
  // siga funcionando aunque la migración aún no se haya ejecutado.
  function _ordenarNotas(lista) {
    return [...(lista || [])].sort((a, b) => {
      if (!!a.fijada !== !!b.fijada) return a.fijada ? -1 : 1;
      return new Date(b.creado_en || 0) - new Date(a.creado_en || 0);
    });
  }
  function _sinPendienteSync(objeto) {
    const copia = { ...objeto };
    delete copia.pendiente_sync;
    return copia;
  }

  // ── Capacidades de la BD (caché en memoria para no repetir reintentos) ──
  const _capacidades = { notasPersonales: null };

  function _esErrorTablaFaltante(e) {
    const msg = String((e && (e.message || e.details || e.code)) || e || '');
    return msg.includes('notas_personales') || msg.includes('42P01');
  }

  // Orden: fijadas primero, luego por actualizado_en desc (más reciente arriba)
  function _ordenarPersonales(lista) {
    return [...(lista || [])].sort((a, b) => {
      if (!!a.fijada !== !!b.fijada) return a.fijada ? -1 : 1;
      return new Date(b.actualizado_en || b.creado_en || 0) - new Date(a.actualizado_en || a.creado_en || 0);
    });
  }

  // ¿Podemos hablar con la BD de notas_personales? (false tras un 42P01)
  async function _bdNotasPersonales() {
    if (!sb() || !navigator.onLine) return false;
    return _capacidades.notasPersonales !== false;
  }

  window.notasRepository = {
    /* Listar notas de un usuario. tipo: 'personal' | 'sesion' | undefined (todas)
       - 'sesion': notas de sesión de estudio (tabla legacy notas_capitulo)
       - 'personal' / undefined: notas personales del bloc de notas */
    async listar(usuarioId, tipo) {
      if (tipo === 'sesion') {
        return this._listarSesion(usuarioId);
      }
      return this.listarPersonales(usuarioId);
    },

    async _listarSesion(usuarioId) {
      if (!sb()) {
        const todas = await _leerCache(usuarioId, 'todas');
        return _ordenarNotas(todas.filter(n => (n.tipo || 'personal') === 'sesion'));
      }
      try {
        const { data, error } = await sb().from('notas_capitulo')
          .select('*')
          .eq('usuario_id', usuarioId)
          .eq('tipo', 'sesion')
          .order('creado_en', { ascending: false });
        if (error) throw error;
        const lista = _ordenarNotas(data || []);
        await _escribirCache(usuarioId, 'todas', lista);
        return lista;
      } catch (e) {
        const todas = await _leerCache(usuarioId, 'todas');
        return _ordenarNotas(todas.filter(n => (n.tipo || 'personal') === 'sesion'));
      }
    },

    /* ── Bloc de notas personal ── */

    /* Listar notas personales (sin las de la papelera), ordenadas por última modificación. */
    async listarPersonales(usuarioId) {
      const desdeCache = async () => {
        const lista = (await window.cacheDatos.get(clavePersonales(usuarioId))) || [];
        return _ordenarPersonales(lista.filter(n => !n.en_papelera));
      };
      if (await _bdNotasPersonales()) {
        try {
          const { data, error } = await sb().from('notas_personales')
            .select('*')
            .eq('usuario_id', usuarioId)
            .eq('en_papelera', false);
          if (error) throw error;
          const lista = _ordenarPersonales(data || []);
          await window.cacheDatos.set(clavePersonales(usuarioId), lista);
          return lista;
        } catch (e) {
          if (_esErrorTablaFaltante(e)) _capacidades.notasPersonales = false;
        }
      }
      return desdeCache();
    },

    /* Listar notas de la papelera. */
    async listarPapelera(usuarioId) {
      const desdeCache = async () => {
        const lista = (await window.cacheDatos.get(clavePapelera(usuarioId))) || [];
        return _ordenarPersonales(lista.filter(n => n.en_papelera));
      };
      if (await _bdNotasPersonales()) {
        try {
          const { data, error } = await sb().from('notas_personales')
            .select('*')
            .eq('usuario_id', usuarioId)
            .eq('en_papelera', true)
            .order('eliminada_en', { ascending: false });
          if (error) throw error;
          await window.cacheDatos.set(clavePapelera(usuarioId), data || []);
          return _ordenarPersonales(data || []);
        } catch (e) {
          if (_esErrorTablaFaltante(e)) _capacidades.notasPersonales = false;
        }
      }
      return desdeCache();
    },

    /* Crear una nota personal nueva. */
    async crearPersonal(usuarioId, datos) {
      datos = datos || {};
      const nota = {
        usuario_id: usuarioId,
        titulo: (datos.titulo || '').trim(),
        contenido: datos.contenido || '',
        fijada: !!datos.fijada,
        en_papelera: false,
        color_fondo: datos.color_fondo || 'blanco',
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString()
      };
      if (await _bdNotasPersonales()) {
        try {
          const { data, error } = await sb().from('notas_personales').insert(nota).select('*').single();
          if (error) throw error;
          await this._cacheUpsert(usuarioId, data);
          return data;
        } catch (e) {
          if (_esErrorTablaFaltante(e)) _capacidades.notasPersonales = false;
        }
      }
      // Fallback local (offline o tabla no aplicada): id estable para la sesión
      const local = { ...nota, id: 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) };
      await this._cacheUpsert(usuarioId, local);
      if (sb() && navigator.onLine) {
        window.colaSync.encolar('upsert', 'notas_personales', local, { onConflict: 'id' });
      }
      return local;
    },

    /* Actualizar campos de una nota personal (título, contenido, color, fijada).
       La caché local se actualiza SIEMPRE; la BD es best-effort. */
    async actualizarPersonal(notaId, campos, usuarioId) {
      campos = campos || {};
      const patch = { actualizado_en: new Date().toISOString() };
      if (campos.titulo !== undefined) patch.titulo = (campos.titulo || '').trim();
      if (campos.contenido !== undefined) patch.contenido = campos.contenido;
      if (campos.color_fondo !== undefined) patch.color_fondo = campos.color_fondo;
      if (campos.fijada !== undefined) patch.fijada = !!campos.fijada;

      await this._actualizarEnCache(usuarioId, notaId, patch);

      if (await _bdNotasPersonales()) {
        try {
          const { error } = await sb().from('notas_personales').update(patch).eq('id', notaId);
          if (error) throw error;
        } catch (e) {
          if (_esErrorTablaFaltante(e)) _capacidades.notasPersonales = false;
          else if (sb() && navigator.onLine) window.colaSync.encolar('upsert', 'notas_personales', { id: notaId, ...patch }, { onConflict: 'id' });
        }
      } else if (sb() && navigator.onLine && !String(notaId).startsWith('local_')) {
        window.colaSync.encolar('upsert', 'notas_personales', { id: notaId, ...patch }, { onConflict: 'id' });
      }
    },

    /* Fijar / desfijar una nota personal. */
    async fijarPersonal(notaId, fijada, usuarioId) {
      await this.actualizarPersonal(notaId, { fijada: !!fijada }, usuarioId);
    },

    /* Mover a la papelera (borrado suave). La caché se actualiza siempre. */
    async moverAPapelera(notaId, usuarioId) {
      const patch = { en_papelera: true, eliminada_en: new Date().toISOString() };
      await this._moverEnCache(usuarioId, notaId, patch);

      if (await _bdNotasPersonales()) {
        try {
          const { error } = await sb().from('notas_personales').update(patch).eq('id', notaId);
          if (error) throw error;
        } catch (e) {
          if (_esErrorTablaFaltante(e)) _capacidades.notasPersonales = false;
          else if (sb() && navigator.onLine && !String(notaId).startsWith('local_')) window.colaSync.encolar('upsert', 'notas_personales', { id: notaId, ...patch }, { onConflict: 'id' });
        }
      } else if (sb() && navigator.onLine && !String(notaId).startsWith('local_')) {
        window.colaSync.encolar('upsert', 'notas_personales', { id: notaId, ...patch }, { onConflict: 'id' });
      }
    },

    /* Restaurar una nota desde la papelera. La caché se actualiza siempre. */
    async restaurarPersonal(notaId, usuarioId) {
      const patch = { en_papelera: false, eliminada_en: null };
      await this._moverEnCache(usuarioId, notaId, patch);

      if (await _bdNotasPersonales()) {
        try {
          const { error } = await sb().from('notas_personales').update(patch).eq('id', notaId);
          if (error) throw error;
        } catch (e) {
          if (_esErrorTablaFaltante(e)) _capacidades.notasPersonales = false;
          else if (sb() && navigator.onLine && !String(notaId).startsWith('local_')) window.colaSync.encolar('upsert', 'notas_personales', { id: notaId, ...patch }, { onConflict: 'id' });
        }
      } else if (sb() && navigator.onLine && !String(notaId).startsWith('local_')) {
        window.colaSync.encolar('upsert', 'notas_personales', { id: notaId, ...patch }, { onConflict: 'id' });
      }
    },

    /* Eliminar definitivamente una nota de la papelera. La caché se actualiza siempre. */
    async eliminarDefinitivo(notaId, usuarioId) {
      await this._quitarDeCaches(usuarioId, notaId);

      if (await _bdNotasPersonales()) {
        try {
          const { error } = await sb().from('notas_personales').delete().eq('id', notaId);
          if (error) throw error;
        } catch (e) {
          if (_esErrorTablaFaltante(e)) _capacidades.notasPersonales = false;
          else if (sb() && navigator.onLine && !String(notaId).startsWith('local_')) window.colaSync.encolar('delete', 'notas_personales', {}, { id: notaId });
        }
      } else if (sb() && navigator.onLine && !String(notaId).startsWith('local_')) {
        window.colaSync.encolar('delete', 'notas_personales', {}, { id: notaId });
      }
    },

    /* Duplicar una nota personal (título con " (copia)"). */
    async duplicarPersonal(usuarioId, nota) {
      const copia = {
        titulo: ((nota.titulo || '') ? nota.titulo + ' (copia)' : 'Nota (copia)'),
        contenido: nota.contenido || '',
        color_fondo: nota.color_fondo || 'blanco'
      };
      return this.crearPersonal(usuarioId, copia);
    },

    async _cacheUpsert(usuarioId, nota) {
      const lista = (await window.cacheDatos.get(clavePersonales(usuarioId))) || [];
      const idx = lista.findIndex(n => n.id === nota.id);
      if (idx >= 0) lista[idx] = nota; else lista.unshift(nota);
      await window.cacheDatos.set(clavePersonales(usuarioId), _ordenarPersonales(lista));
    },

    async _actualizarEnCache(usuarioId, notaId, patch) {
      const activas = (await window.cacheDatos.get(clavePersonales(usuarioId))) || [];
      const papelera = (await window.cacheDatos.get(clavePapelera(usuarioId))) || [];
      const idxA = activas.findIndex(n => n.id === notaId);
      const idxP = papelera.findIndex(n => n.id === notaId);
      if (idxA >= 0) {
        activas[idxA] = { ...activas[idxA], ...patch };
        await window.cacheDatos.set(clavePersonales(usuarioId), _ordenarPersonales(activas));
      }
      if (idxP >= 0) {
        papelera[idxP] = { ...papelera[idxP], ...patch };
        await window.cacheDatos.set(clavePapelera(usuarioId), papelera);
      }
    },

    async _moverEnCache(usuarioId, notaId, patch) {
      const activas = (await window.cacheDatos.get(clavePersonales(usuarioId))) || [];
      const papelera = (await window.cacheDatos.get(clavePapelera(usuarioId))) || [];
      const idxA = activas.findIndex(n => n.id === notaId);
      const idxP = papelera.findIndex(n => n.id === notaId);
      let nota = null;
      if (idxA >= 0) nota = activas[idxA];
      else if (idxP >= 0) nota = papelera[idxP];
      if (!nota) return;
      const actualizada = { ...nota, ...patch };

      if (patch.en_papelera) {
        if (idxA >= 0) activas.splice(idxA, 1);
        if (idxP < 0) papelera.unshift(actualizada);
      } else {
        if (idxP >= 0) papelera.splice(idxP, 1);
        if (idxA < 0) activas.unshift(actualizada);
      }
      await window.cacheDatos.set(clavePersonales(usuarioId), _ordenarPersonales(activas));
      await window.cacheDatos.set(clavePapelera(usuarioId), papelera);
    },

    async _quitarDeCaches(usuarioId, notaId) {
      const activas = (await window.cacheDatos.get(clavePersonales(usuarioId))) || [];
      const papelera = (await window.cacheDatos.get(clavePapelera(usuarioId))) || [];
      await window.cacheDatos.set(clavePersonales(usuarioId), activas.filter(n => n.id !== notaId));
      await window.cacheDatos.set(clavePapelera(usuarioId), papelera.filter(n => n.id !== notaId));
    },

    /* ── API legacy (notas_capitulo) — se mantiene para vista-sesion-estudio ── */

    /* Contar notas personales de un capítulo (para auto-titular Nota N) */
    async contarPorCapitulo(usuarioId, libroNombre, capituloNumero) {
      const lista = await this._listarSesion(usuarioId);
      return lista.filter(n => n.libro_nombre === libroNombre && String(n.capitulo_numero) === String(capituloNumero)).length;
    },

    /* Guardar nota de sesión de estudio (tipo 'sesion'): upsert sobre (usuario, libro, cap). */
    async guardar(usuarioId, libroNombre, capituloNumero, contenido, opts) {
      opts = opts || {};
      const tipo = opts.tipo || 'sesion';
      const notaBase = {
        usuario_id: usuarioId, libro_nombre: libroNombre,
        capitulo_numero: capituloNumero, contenido,
        tipo, titulo: opts.titulo || null,
        actualizado_en: new Date().toISOString(), pendiente_sync: true
      };

      // Actualización de una nota existente (por id)
      if (opts.id) {
        return this._upsert(notaBase, opts.id, usuarioId);
      }

      if (tipo === 'sesion') {
        // Reemplazar la nota de sesión del capítulo (no las personales)
        if (sb() && navigator.onLine) {
          try {
            const { data: existente } = await sb().from('notas_capitulo')
              .select('id').eq('usuario_id', usuarioId)
              .eq('libro_nombre', libroNombre).eq('capitulo_numero', capituloNumero)
              .eq('tipo', 'sesion').limit(1).maybeSingle();
            if (existente) return this._upsert(notaBase, existente.id, usuarioId);
          } catch (e) {}
        } else {
          const lista = await _leerCache(usuarioId, 'todas');
          const ex = lista.find(n => n.libro_nombre === libroNombre && String(n.capitulo_numero) === String(capituloNumero) && (n.tipo || 'personal') === 'sesion');
          if (ex) return this._upsert(notaBase, ex.id, usuarioId);
        }
        return this._upsert(notaBase, null, usuarioId);
      }

      // Personal: siempre nueva (no sobrescribe)
      return this._upsert(notaBase, null, usuarioId);
    },

    /* Fijar / desfijar una nota legacy (notas_capitulo) */
    async fijar(id, fijada) {
      if (!sb()) throw new Error('Sin conexión');
      try {
        const { error } = await sb().from('notas_capitulo').update({ fijada: !!fijada }).eq('id', id);
        if (error) throw error;
      } catch (e) {
        if (e && e.code === '42703') {
          throw new Error('Fijar notas requiere aplicar la migración 019 en la base de datos.');
        }
        throw new Error('No se pudo actualizar la nota: ' + _traducir(e));
      }
    },

    async _upsert(notaBase, id, usuarioId) {
      const esUpdate = !!id;
      const payload = _sinPendienteSync(notaBase);
      if (!sb() || !navigator.onLine) {
        const notaLocal = { ...notaBase, id: id || 'local_' + Date.now() };
        const lista = await _leerCache(usuarioId, 'todas');
        const idx = lista.findIndex(n => n.id === notaLocal.id);
        if (idx >= 0) lista[idx] = notaLocal; else lista.unshift(notaLocal);
        await _escribirCache(usuarioId, 'todas', _ordenarNotas(lista));
        window.colaSync.encolar('upsert', 'notas_capitulo', payload, { onConflict: 'id' });
        return notaLocal.id;
      }
      try {
        let data, error;
        if (esUpdate) {
          const r = await sb().from('notas_capitulo').update(payload).eq('id', id).select('*').single();
          data = r.data; error = r.error;
        } else {
          const r = await sb().from('notas_capitulo').insert(payload).select('*').single();
          data = r.data; error = r.error;
        }
        if (error) throw error;
        const lista = await _leerCache(usuarioId, 'todas');
        const fresca = { ...data, pendiente_sync: false };
        const idx = lista.findIndex(n => n.id === fresca.id);
        if (idx >= 0) lista[idx] = fresca; else lista.unshift(fresca);
        await _escribirCache(usuarioId, 'todas', _ordenarNotas(lista));
        return fresca.id;
      } catch (e) {
        const notaLocal = { ...notaBase, id: id || 'local_' + Date.now() };
        const lista = await _leerCache(usuarioId, 'todas');
        lista.unshift(notaLocal);
        await _escribirCache(usuarioId, 'todas', _ordenarNotas(lista));
        window.colaSync.encolar('upsert', 'notas_capitulo', payload, { onConflict: 'id' });
        return notaLocal.id;
      }
    },

    async obtener(usuarioId, libroNombre, capituloNumero, tipo) {
      const lista = await this._listarSesion(usuarioId);
      return lista.find(n => n.libro_nombre === libroNombre && String(n.capitulo_numero) === String(capituloNumero)) || null;
    },

    async obtenerPorId(usuarioId, id) {
      const todas = await _leerCache(usuarioId, 'todas');
      return todas.find(n => n.id === id) || null;
    },

    async eliminar(id) {
      if (!sb() || !navigator.onLine) {
        window.colaSync.encolar('delete', 'notas_capitulo', {}, { id });
        return;
      }
      await sb().from('notas_capitulo').delete().eq('id', id);
    }
  };
})();
