const authRepository = {
  async iniciarSesion(usuario, password) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('Supabase no disponible');

    const { data, error } = await sb
      .from('perfiles')
      .select('*')
      .eq('username', usuario)
      .single();

    if (error || !data) throw new Error('Usuario no encontrado');
    if (data.password !== password) throw new Error('Contraseña incorrecta');
    if (!data.activo) throw new Error('Cuenta desactivada');

    store.asignar({ usuario: data, sesion: { autenticado: true, inicio: Date.now() } });
    window.eventBus.publicar('auth:login', data);
    return data;
  },

  async cerrarSesion() {
    store.asignar({ usuario: null, sesion: null });
    window.eventBus.publicar('auth:logout');
  },

  async obtenerSesion() {
    const sb = window.supabaseClient;
    if (!sb) return null;
    try {
      const { data: { session } } = await sb.auth.getSession();
      return session;
    } catch {
      return null;
    }
  },

  async asegurarGrupo(usuario) {
    const sb = window.supabaseClient;
    if (!sb || !usuario) return usuario;
    if (usuario.grupo_id) return usuario;
    const nombre = 'Grupo de ' + (usuario.nombre_completo || usuario.username || 'profesor');
    const { data: g, error } = await sb.from('grupos').insert({ nombre, admin_id: usuario.id }).select().single();
    if (error) throw new Error('No se pudo crear un grupo para tu cuenta: ' + error.message);
    await sb.from('perfiles').update({ grupo_id: g.id }).eq('id', usuario.id);
    usuario.grupo_id = g.id;
    store.asignar({ usuario });
    return usuario;
  },

  async obtenerPerfil(id) {
    const sb = window.supabaseClient;
    if (!sb) return null;
    const { data } = await sb.from('perfiles').select('*').eq('id', id).single();
    return data;
  },

  async eliminarMisDatos(usuarioId) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('Supabase no disponible');
    const tablas = [
      ['repasos_memorizacion', 'usuario_id'],
      ['tarjetas_memorizacion', 'usuario_id'],
      ['logros_usuario', 'usuario_id'],
      ['progreso_lectura', 'usuario_id'],
      ['intentos_examen_personalizado', 'alumno_id']
    ];
    for (const [tabla, col] of tablas) {
      const { error } = await sb.from(tabla).delete().eq(col, usuarioId);
      if (error) throw new Error('Error al eliminar ' + tabla + ': ' + error.message);
    }
  }
};

window.authRepository = authRepository;
