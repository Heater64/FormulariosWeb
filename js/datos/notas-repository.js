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

  window.notasRepository = {
    /* Listar notas de un usuario. tipo: 'personal' | 'sesion' | undefined (todas) */
    async listar(usuarioId, tipo) {
      if (!sb()) {
        const todas = await _leerCache(usuarioId, 'todas');
        return _ordenarNotas(tipo ? todas.filter(n => (n.tipo || 'personal') === tipo) : todas);
      }
      try {
        let q = sb().from('notas_capitulo')
          .select('*')
          .eq('usuario_id', usuarioId);
        if (tipo) q = q.eq('tipo', tipo);
        // No ordenar por 'fijada' en el servidor: si la columna no existe (migración
        // 019 parcial) la consulta entera falla y la lista queda vacía. Se ordena en cliente.
        q = q.order('creado_en', { ascending: false });
        const { data, error } = await q;
        if (error) throw error;
        const lista = _ordenarNotas(data || []);
        await _escribirCache(usuarioId, 'todas', lista);
        return lista;
      } catch (e) {
        const todas = await _leerCache(usuarioId, 'todas');
        return _ordenarNotas(tipo ? todas.filter(n => (n.tipo || 'personal') === tipo) : todas);
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

    /* Fijar / desfijar una nota (aparece primero en la lista) */
    async fijar(id, fijada) {
      if (!sb()) throw new Error('Sin conexión');
      try {
        const { error } = await sb().from('notas_capitulo').update({ fijada: !!fijada }).eq('id', id);
        if (error) throw error;
      } catch (e) {
        // Si la columna fijada no existe (migración 019 pendiente), la fijación
        // no se puede persistir: se informa con un mensaje claro en lugar de fallar silencioso.
        if (e && e.code === '42703') {
          throw new Error('Fijar notas requiere aplicar la migración 019 en la base de datos.');
        }
        throw new Error('No se pudo actualizar la nota: ' + (e.message || e));
      }
    },

    async _upsert(notaBase, id, usuarioId) {
      const esUpdate = !!id;
      // No enviar pendiente_sync al servidor: si la columna no existe (migración 019
      // parcial) el insert/update entero falla y la nota se pierde en la cola offline.
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
