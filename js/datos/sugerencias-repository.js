(function() {
  'use strict';
  const sb = () => window.supabaseClient;
  // Traduce mensajes técnicos del servidor a texto amigable de usuario.
  const _traducir = (error) => window.errores
    ? window.errores.mensajeUsuario(error)
    : (error && error.message) || 'Error inesperado';

  const ESTADOS = [
    { valor: 'enviada', texto: 'Enviada', clase: 'sug-estado--enviada' },
    { valor: 'en_revision', texto: 'En revisión', clase: 'sug-estado--revision' },
    { valor: 'aceptada', texto: 'Aceptada', clase: 'sug-estado--aceptada' },
    { valor: 'implementada', texto: 'Implementada', clase: 'sug-estado--implementada' },
    { valor: 'rechazada', texto: 'Rechazada', clase: 'sug-estado--rechazada' }
  ];

  const CATEGORIAS = [
    { valor: 'error', texto: '🐛 Error o fallo', icono: 'bug' },
    { valor: 'idea', texto: '💡 Idea nueva', icono: 'lightbulb' },
    { valor: 'mejora', texto: '✨ Mejora', icono: 'sparkles' },
    { valor: 'contenido', texto: '📖 Contenido', icono: 'book-open' },
    { valor: 'otro', texto: '📝 Otro', icono: 'message-square' }
  ];

  function estadoInfo(valor) {
    return ESTADOS.find(e => e.valor === valor) || ESTADOS[0];
  }

  window.sugerenciasRepository = {
    ESTADOS,
    CATEGORIAS,
    estadoInfo,

    /* Mis propias sugerencias, de más reciente a más antigua */
    async listarMias(usuarioId) {
      if (!sb()) return [];
      const { data } = await sb()
        .from('sugerencias')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('creado_en', { ascending: false });
      return data || [];
    },

    /* Todas las sugerencias (solo Owner). Incluye autor. */
    async listarTodas() {
      if (!sb()) return [];
      const { data } = await sb()
        .from('sugerencias')
        .select('*, perfiles!usuario_id(nombre_completo, username)')
        .order('creado_en', { ascending: false })
        .limit(300);
      return data || [];
    },

    async crear(usuarioId, categoria, texto) {
      if (!sb()) throw new Error('Sin conexión');
      if (!texto || !texto.trim()) throw new Error('Escribe tu sugerencia.');
      const { data, error } = await sb()
        .from('sugerencias')
        .insert({
          usuario_id: usuarioId,
          categoria: categoria || 'otro',
          texto: texto.trim(),
          estado: 'enviada',
          respuesta: ''
        })
        .select()
        .single();
      if (error) throw new Error('No se pudo enviar la sugerencia: ' + _traducir(error));
      return data;
    },

    async actualizar(id, { estado, respuesta }) {
      if (!sb()) throw new Error('Sin conexión');
      const cambios = { actualizado_en: new Date().toISOString() };
      if (estado !== undefined && estado !== null) cambios.estado = estado;
      if (respuesta !== undefined) cambios.respuesta = respuesta || '';
      const { error } = await sb().from('sugerencias').update(cambios).eq('id', id);
      if (error) throw new Error('No se pudo actualizar: ' + _traducir(error));
    },

    async eliminar(id) {
      if (!sb()) throw new Error('Sin conexión');
      const { error } = await sb().from('sugerencias').delete().eq('id', id);
      if (error) throw new Error('No se pudo eliminar: ' + _traducir(error));
    }
  };
})();
