const authRepository = {
  async iniciarSesion(usuario, password, recordar) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');

    const { data, error } = await sb
      .from('perfiles')
      .select('*')
      .eq('username', usuario)
      .single();

    if (error || !data) throw new Error('Usuario no encontrado');
    if (data.password !== password) throw new Error('Contraseña incorrecta');
    if (!data.activo) throw new Error('Cuenta desactivada');

    store.asignar({ usuario: data, sesion: { autenticado: true, inicio: Date.now() } });
    window.eventBus.publicar('auth:login', { usuario: data, recordar: recordar !== false });
    return data;
  },

  async cerrarSesion() {
    store.asignar({ usuario: null, sesion: null });
    localStorage.removeItem('fb_usuario');
    localStorage.removeItem('fb_recordar_sesion');
    sessionStorage.removeItem('fb_usuario');
    window.eventBus.publicar('auth:logout');
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

  async eliminarMisDatos(usuarioId) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
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
