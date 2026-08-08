const authRepository = {
  // Columnas legibles del perfil tras el RLS 028 (grants de columna)
  COLUMNAS_PERFIL: 'id, username, nombre_completo, rol, activo, grupo_id, foto_perfil, preferencias, ultimo_acceso, creado_en',

  // Traduce mensajes técnicos del servidor a texto amigable (igual que admin-repository)
  _traducir(error) {
    return window.errores
      ? window.errores.mensajeUsuario(error)
      : (error && error.message) || 'Error inesperado';
  },

  // Convierte el error de una RPC/PostgREST en un mensaje legible para el usuario
  _extraerMensajeAuth(error) {
    if (!error) return 'Error de autenticación';
    const bruto = error.message || error.details || String(error);
    const lineas = String(bruto).split('\n').map(l => l.trim()).filter(Boolean);
    // Saltar SQLSTATE (p.ej. P0001) y quedarse con el texto del RAISE
    const primera = lineas.find(l => !/^[A-Z0-9]{5}$/.test(l));
    if (!primera) return 'Error de autenticación';
    const limpia = primera.replace(/^(Detalle|Detail|Hint|Error)\s*:\s*/i, '').trim();
    return limpia || 'Error de autenticación';
  },

  // FASE 2 (028): el login identifica por CORREO directamente con Supabase Auth
  // (signInWithPassword). Si el usuario escribe su username legacy (sin '@'),
  // auth_login lo resuelve a su correo sintético ANTES.
  async iniciarSesion(usuario, password, recordar) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');

    // 1) Resolver el email: si viene un correo (@) se usa tal cual; si viene un
    //    username, se traduce vía auth_login (solo devuelve email si acierta).
    const email = String(usuario).trim().includes('@')
      ? String(usuario).trim()
      : await this._resolverEmail(sb, usuario, password);
    if (!email) throw new Error('Usuario o contraseña incorrectos');

    // 2) Obtener el JWT de Supabase Auth con el correo
    const { data: sesion, error: errSign } = await sb.auth.signInWithPassword({ email, password });
    if (errSign || !sesion || !sesion.user) throw new Error('Usuario o contraseña incorrectos');

    // 3) Cargar el perfil con la sesión activa (solo las columnas del grant)
    const { data: perfil, error: errPerfil } = await sb
      .from('perfiles')
      .select(this.COLUMNAS_PERFIL)
      .eq('id', sesion.user.id)
      .single();
    if (errPerfil || !perfil) throw new Error('No se pudo cargar tu perfil. Inténtalo de nuevo.');

    store.asignar({ usuario: perfil, sesion: { autenticado: true, inicio: Date.now() } });
    window.eventBus.publicar('auth:login', { usuario: perfil, recordar: recordar !== false });
    return perfil;
  },

  // FASE 2 (028): resuelve username → email sintético validando primero la
  // contraseña (auth_login devuelve el correo solo si acierta).
  async _resolverEmail(sb, usuario, password) {
    const { data: email, error } = await sb.rpc('auth_login', { p_username: usuario, p_password: password });
    if (error) throw new Error(this._extraerMensajeAuth(error));
    return email || null;
  },

  async cerrarSesion() {
    const sb = window.supabaseClient;
    if (sb) {
      try { await sb.auth.signOut(); } catch (e) { /* la sesión local se limpia igualmente */ }
    }
    store.asignar({ usuario: null, sesion: null });
    localStorage.removeItem('fb_usuario');
    localStorage.removeItem('fb_recordar_sesion');
    sessionStorage.removeItem('fb_usuario');
    window.eventBus.publicar('auth:logout');
  },

  // FASE 2 (028): la clase principal se asigna vía RPC asegurar_grupo()
  // (con el RLS cerrado el usuario ya no puede UPDATE su propio grupo_id).
  async asegurarGrupo(usuario) {
    const sb = window.supabaseClient;
    if (!sb || !usuario) return usuario;
    if (usuario.grupo_id) return usuario;
    const { data: grupoId, error } = await sb.rpc('asegurar_grupo');
    if (error) throw new Error('No se pudo crear un grupo para tu cuenta: ' + _traducir(error));
    // Releer el perfil para obtener el grupo_id recién asignado por el servidor
    const { data: perfil } = await sb
      .from('perfiles')
      .select(this.COLUMNAS_PERFIL)
      .eq('id', usuario.id)
      .single();
    const actualizado = perfil || { ...usuario, grupo_id: grupoId };
    store.asignar({ usuario: actualizado });
    return actualizado;
  },

  // FASE 2 (028): la contraseña vive en Supabase Auth, no en perfiles.
  // Se verifica la actual con auth_login (devuelve email solo si acierta) y
  // el cambio se aplica con updateUser (no requiere el email del usuario).
  async cambiarPassword(actual, nueva) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
    const usuario = store.obtener('usuario');
    if (!usuario || !usuario.username) throw new Error('Sesión no válida.');

    const { error } = await sb.rpc('auth_login', { p_username: usuario.username, p_password: actual });
    if (error) throw new Error(this._extraerMensajeAuth(error));

    const { error: errUpdate } = await sb.auth.updateUser({ password: nueva });
    if (errUpdate) throw new Error('No se pudo cambiar la contraseña: ' + _traducir(errUpdate));
  },

  async eliminarMisDatos(usuarioId) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
    const tablas = [
      ['notas_capitulo', 'usuario_id'],
      ['categorias_tarjetas', 'usuario_id'],
      ['categorias_memorizacion', 'usuario_id'],
      ['mazos_memorizacion', 'usuario_id'],
      ['miembros_grupo', 'usuario_id'],
      ['logros_usuario', 'usuario_id'],
      ['progreso_lectura', 'usuario_id'],
      ['tarjetas_memorizacion', 'usuario_id'], // repasos_memorizacion se borran en cascada
      ['intentos_examen_personalizado', 'alumno_id']
    ];
    for (const [tabla, col] of tablas) {
      const { error } = await sb.from(tabla).delete().eq(col, usuarioId);
      if (error) throw new Error('Error al eliminar ' + tabla + ': ' + _traducir(error));
    }
  }
};

window.authRepository = authRepository;
