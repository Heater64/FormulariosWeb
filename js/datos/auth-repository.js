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

  async obtenerPerfil(id) {
    const sb = window.supabaseClient;
    if (!sb) return null;
    const { data } = await sb.from('perfiles').select('*').eq('id', id).single();
    return data;
  }
};

window.authRepository = authRepository;
