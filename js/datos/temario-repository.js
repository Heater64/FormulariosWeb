(function () {
  'use strict';
  const sb = () => window.supabaseClient;
  const CLAVE_CATALOGO = 'temario:catalogo:libros';

  // Única capa de datos del temario. La columna `temario` vive en
  // examenes_personalizados, así que el guardado se delega en
  // examenesRepository.guardar (el upsert ya existe y respeta RLS).
  window.temarioRepository = {
    /**
     * Catálogo de libros para js/dominio/temario-parser.js:
     * [{ id, nombre, abreviatura, num_capitulos }]. Es estático (la BD no
     * cambia), así que se memoriza en la caché de datos de la app.
     */
    async catalogoLibros() {
      try {
        const cache = await window.cacheDatos.get(CLAVE_CATALOGO);
        if (Array.isArray(cache) && cache.length) return cache;
      } catch (e) { /* sin caché: se consulta igualmente */ }

      if (!sb()) return [];
      try {
        const { data, error } = await sb()
          .from('libros_biblicos')
          .select('id, nombre, abreviatura, num_capitulos')
          .order('id');
        if (error) throw error;
        const libros = data || [];
        if (libros.length) {
          try { await window.cacheDatos.set(CLAVE_CATALOGO, libros); } catch (e) { /* caché best-effort */ }
        }
        return libros;
      } catch (e) {
        return [];
      }
    },

    /** Guarda el temario interpretado (y su texto original) del examen. */
    async guardar(examen) {
      if (!examen || !examen.id) throw new Error('El examen todavía no está guardado');
      return window.examenesRepository.guardar({ id: examen.id, temario: examen.temario });
    }
  };
})();
