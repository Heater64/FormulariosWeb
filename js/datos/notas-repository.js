(function() {
  'use strict';
  const sb = () => window.supabaseClient;

  function claveLista(usuarioId, tipo) { return `notas:lista:${usuarioId}:${tipo || 'todas'}`; }
  function claveNota(usuarioId, libroNombre, capituloNumero, tipo) {
    return `notas:nota:${usuarioId}:${libroNombre}:${capituloNumero}:${tipo || 'personal'}`;
  }

  async function _leerCache(usuarioId, tipo) {
    return (await window.cacheDatos.get(claveLista(usuarioId, tipo))) || [];
  }
  async function _escribirCache(usuarioId, tipo, lista) {
    await window.cacheDatos.set(claveLista(usuarioId, tipo), lista);
  }

  window.notasRepository = {
    /* Listar notas de un usuario. tipo: 'personal' | 'sesion' | undefined (todas) */
    async listar(usuarioId, tipo) {
      if (!sb()) {
        const todas = await _leerCache(usuarioId, 'todas');
        return tipo ? todas.filter(n => (n.tipo || 'personal') === tipo) : todas;
      }
      try {
        let q = sb().from('notas_capitulo')
          .select('*')
          .eq('usuario_id', usuarioId);
        if (tipo) q = q.eq('tipo', tipo);
        q = q.order('creado_en', { ascending: false });
        const { data } = await q;
        const lista = data || [];
        await _escribirCache(usuarioId, 'todas', lista);
        return tipo ? lista : lista;
      } catch (e) {
        const todas = await _leerCache(usuarioId, 'todas');
        return tipo ? todas.filter(n => (n.tipo || 'personal') === tipo) : todas;
      }
    },

    /* Contar notas personales de un capítulo (para auto-titular Nota N) */
    async contarPorCapitulo(usuarioId, libroNombre, capituloNumero) {
      const lista = await this.listar(usuarioId, 'personal');
      return lista.filter(n => n.libro_nombre === libroNombre && String(n.capitulo_numero) === String(capituloNumero)).length;
    },

    /* Guardar nota.
       - tipo 'personal': SIEMPRE crea una nueva (nota 1, nota 2...). Si se pasa id, actualiza esa.
       - tipo 'sesion': upsert sobre (usuario, libro, cap, tipo) para que al repetir se reemplace la de sesión. */
    async guardar(usuarioId, libroNombre, capituloNumero, contenido, opts) {
      opts = opts || {};
      const tipo = opts.tipo || 'personal';
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

    async _upsert(notaBase, id, usuarioId) {
      const esUpdate = !!id;
      if (!sb() || !navigator.onLine) {
        const notaLocal = { ...notaBase, id: id || 'local_' + Date.now() };
        const lista = await _leerCache(usuarioId, 'todas');
        const idx = lista.findIndex(n => n.id === notaLocal.id);
        if (idx >= 0) lista[idx] = notaLocal; else lista.unshift(notaLocal);
        await _escribirCache(usuarioId, 'todas', lista);
        window.colaSync.encolar('upsert', 'notas_capitulo', notaBase, { onConflict: 'id' });
        return notaLocal.id;
      }
      try {
        let data, error;
        if (esUpdate) {
          const r = await sb().from('notas_capitulo').update(notaBase).eq('id', id).select('*').single();
          data = r.data; error = r.error;
        } else {
          const r = await sb().from('notas_capitulo').insert(notaBase).select('*').single();
          data = r.data; error = r.error;
        }
        if (error) throw error;
        const lista = await _leerCache(usuarioId, 'todas');
        const fresca = { ...data, pendiente_sync: false };
        const idx = lista.findIndex(n => n.id === fresca.id);
        if (idx >= 0) lista[idx] = fresca; else lista.unshift(fresca);
        await _escribirCache(usuarioId, 'todas', lista);
        return fresca.id;
      } catch (e) {
        const notaLocal = { ...notaBase, id: id || 'local_' + Date.now() };
        const lista = await _leerCache(usuarioId, 'todas');
        lista.unshift(notaLocal);
        await _escribirCache(usuarioId, 'todas', lista);
        window.colaSync.encolar('upsert', 'notas_capitulo', notaBase, { onConflict: 'id' });
        return notaLocal.id;
      }
    },

    async obtener(usuarioId, libroNombre, capituloNumero, tipo) {
      const lista = await this.listar(usuarioId, tipo || 'sesion');
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
