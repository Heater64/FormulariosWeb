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
    // Desactivar los tokens FCM del usuario ANTES de invalidar la sesión:
    // la llamada a Supabase necesita el JWT aún válido.
    try { if (window.pushNotificationService) await window.pushNotificationService.desactivarTokens(); } catch (e) { /* no bloquea el logout */ }
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
    if (error) throw new Error('No se pudo crear un grupo para tu cuenta: ' + this._traducir(error));
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
  _validarPassword(nueva) {
    const password = String(nueva || '');
    if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error('La contraseña debe incluir letras y números.');
    }
    return password;
  },

  async registrarResponsable(email, password, nombre) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
    const direccion = String(email || '').trim().toLowerCase();
    const nombreSeguro = String(nombre || '').trim();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(direccion)) throw new Error('Escribe un correo electrónico válido.');
    if (nombreSeguro.length < 2 || nombreSeguro.length > 120) throw new Error('Escribe tu nombre completo.');
    const passwordSegura = this._validarPassword(password);
    const { data, error } = await sb.auth.signUp({
      email: direccion,
      password: passwordSegura,
      options: {
        emailRedirectTo: new URL('/onboarding.html', window.location.origin).toString(),
        data: { nombre_completo: nombreSeguro, rol: 'usuario', activo: true }
      }
    });
    if (error) {
      if (/already registered|already been registered|registered/i.test(error.message || '')) {
        throw new Error('Ya existe una cuenta con ese correo. Intenta iniciar sesión o recuperar el acceso.');
      }
      throw new Error('No se pudo crear la cuenta. Inténtalo de nuevo.');
    }
    return data;
  },

  async crearInstitucionYClase(nombreInstitucion, nombreClase, descripcion) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
    const { data, error } = await sb.rpc('crear_institucion_y_clase', {
      p_institucion_nombre: String(nombreInstitucion || '').trim(),
      p_clase_nombre: String(nombreClase || '').trim(),
      p_descripcion: String(descripcion || '').trim()
    });
    if (error) throw new Error(this._extraerMensajeAuth(error));
    if (!data || !data.institucion_id || !data.grupo_id || !data.codigo) {
      throw new Error('El onboarding no devolvió una institución válida.');
    }
    return data;
  },

  async solicitarRecuperacion(email) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
    const direccion = String(email || '').trim().toLowerCase();
    if (!direccion || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(direccion)) {
      throw new Error('Escribe un correo electrónico válido.');
    }
    if (direccion.endsWith('@accounts.formsbiblicos.com') || direccion.endsWith('@formsbiblicos.local')) {
      throw new Error('Esta cuenta no tiene un correo recuperable. Contacta con el administrador de tu institución.');
    }
    const { error } = await sb.auth.resetPasswordForEmail(direccion, {
      redirectTo: this._urlRecuperacion()
    });
    if (error) throw new Error('No se pudo solicitar la recuperación. Inténtalo de nuevo.');
  },

  _urlRecuperacion() {
    return new URL('/recuperar.html', window.location.origin).toString();
  },

  async actualizarPasswordRecuperacion(nueva) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
    const password = this._validarPassword(nueva);
    const { data, error } = await sb.auth.updateUser({ password });
    if (error || !data || !data.user) throw new Error('El enlace de recuperación no es válido o ha caducado. Solicita uno nuevo.');
    await sb.auth.signOut();
  },

  async cambiarPassword(actual, nueva) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
    const usuario = store.obtener('usuario');
    if (!usuario || !usuario.username) throw new Error('Sesión no válida.');
    const password = this._validarPassword(nueva);

    const { error } = await sb.rpc('auth_login', { p_username: usuario.username, p_password: actual });
    if (error) throw new Error(this._extraerMensajeAuth(error));

    const { error: errUpdate } = await sb.auth.updateUser({ password });
    if (errUpdate) throw new Error('No se pudo cambiar la contraseña: ' + this._traducir(errUpdate));
  },

  async eliminarMisDatos(usuarioId) {
    const sb = window.supabaseClient;
    if (!sb) throw new Error('No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.');
    // RPC SECURITY DEFINER (migración 055): borra las 9 tablas en una sola
    // transacción. El DELETE directo a intentos_examen_personalizado quedó
    // revocado por la 047 (seguridad de exámenes), así que no se puede
    // hacer desde el cliente.
    const { error } = await sb.rpc('eliminar_datos_usuario', { p_usuario_id: usuarioId });
    if (error) throw new Error('Error al eliminar tus datos: ' + this._traducir(error));
  }
};

window.authRepository = authRepository;
