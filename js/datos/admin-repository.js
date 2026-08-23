(function() {
  'use strict';
  const sb = () => window.supabaseClient;
  // Traduce mensajes técnicos del servidor (RLS, códigos SQL, PostgREST)
  // a texto amigable de usuario. Sin el módulo de errores, degrada al crudo.
  const _traducir = (error) => window.errores
    ? window.errores.mensajeUsuario(error)
    : (error && error.message) || 'Error inesperado';
  window.adminRepository = {
    // Actualiza ultimo_acceso del usuario actual (heartbeat)
    async actualizarUltimoAcceso(usuarioId) {
      if (!sb() || !usuarioId) return;
      try { await sb().from('perfiles').update({ ultimo_acceso: new Date().toISOString() }).eq('id', usuarioId); } catch (e) {}
    },
    // FASE 2 (028): con el RLS cerrado el SELECT debe listar solo las columnas
    // del grant (select('*') sobre perfiles daría permission denied).
    _columnasPerfil() {
      return window.authRepository ? window.authRepository.COLUMNAS_PERFIL
        : 'id, username, nombre_completo, rol, activo, grupo_id, foto_perfil, preferencias, ultimo_acceso, creado_en';
    },
    async listarUsuarios(actor) {
      if (!sb()) return [];
      const usuario = actor || window.store?.obtener?.('usuario');
      if (usuario?.rol === 'admin') {
        const { data, error } = await sb().rpc('admin_listar_usuarios_clase');
        if (error) throw new Error(_traducir(error));
        return data || [];
      }
      const { data, error } = await sb().from('perfiles').select(this._columnasPerfil()).order('creado_en', { ascending: false });
      if (error) throw new Error(_traducir(error));
      return data || [];
    },
    async listarGrupos(actor) {
      if (!sb()) return [];
      const usuario = actor || window.store?.obtener?.('usuario');
      if (usuario?.rol === 'admin') {
        const { data, error } = await sb().rpc('admin_listar_grupos_clase');
        if (error) throw new Error(_traducir(error));
        return data || [];
      }
      const { data, error } = await sb().from('grupos').select('*, perfiles!admin_id(nombre_completo, username)');
      if (error) throw new Error(_traducir(error));
      return data || [];
    },
    async crearGrupo(nombre, adminId) {
      if (!sb()) return null;
      const { data } = await sb().from('grupos').insert({ nombre, admin_id: adminId }).select().single();
      return data;
    },
    async eliminarGrupo(id) {
      if (!sb()) throw new Error('Sin conexión');
      await sb().from('auditoria').update({ grupo_id: null }).eq('grupo_id', id);
      const { error } = await sb().from('grupos').delete().eq('id', id);
      if (error) throw new Error('No se pudo eliminar el grupo: ' + _traducir(error));
    },
    // FASE 2 (028): el CRUD de usuarios pasa por las RPCs de admin
    // (SECURITY DEFINER, validan es_owner y crean/auth.users vía trigger).
    async crearUsuario({ nombre_completo, username, password, rol, grupo_id }) {
      if (!sb()) throw new Error('Sin conexión');
      const { data, error } = await sb().rpc('admin_crear_usuario', {
        p_nombre_completo: nombre_completo || '',
        p_username: username,
        p_password: password || '',
        p_rol: rol || 'usuario',
        p_grupo_id: grupo_id || null
      });
      if (error) {
        if (/ya existe|duplicate|unique/i.test(error.message)) throw new Error('Ese nombre de usuario ya existe.');
        if (error) throw new Error(_traducir(error));
      }
      return { id: data };
    },
    async toggleActivo(usuarioId, activo) {
      if (!sb()) throw new Error('Sin conexión');
      const { error } = await sb().rpc('admin_toggle_activo', { p_usuario_id: usuarioId, p_activo: !!activo });
      if (error) if (error) throw new Error(_traducir(error));
    },
    async cambiarRol(usuarioId, rol) {
      if (!sb()) throw new Error('Sin conexión');
      const { error } = await sb().rpc('admin_cambiar_rol', { p_usuario_id: usuarioId, p_rol: rol });
      if (error) if (error) throw new Error(_traducir(error));
    },
    // actorId se mantiene por compatibilidad con el panel; la RPC hace toda la
    // limpieza de FKs y reasigna los exámenes al owner autenticado.
    async eliminarUsuario(usuarioId, actorId) {
      if (!sb()) return;
      const { error } = await sb().rpc('admin_eliminar_usuario', { p_usuario_id: usuarioId });
      if (error) if (error) throw new Error(_traducir(error));
    },
    // FASE 2 (028): el panel envía SIEMPRE el grupo_id actual (o null si se le
    // quiere desasignar la clase), según el contrato de admin_actualizar_usuario.
    // p_username NO-NULL dispara la sincronización del email sintético en
    // auth.users (índice único case-insensitive). Si el username no cambió,
    // enviarlo tal cual provoca 'Ese nombre de usuario ya existe' al re-guardar
    // (colisión de email con otra fila de auth.users). Se normaliza a null
    // cuando coincide con el actual: sin cambio → sin sincronización.
    async actualizarUsuario(usuarioId, { nombre_completo, username, rol, grupo_id, password }) {
      if (!sb()) return;
      if (username != null) {
        try {
          const { data: actual } = await sb().from('perfiles').select('username').eq('id', usuarioId).single();
          if (actual && actual.username === username) username = null;
        } catch (e) { /* si no se puede leer, se envía tal cual */ }
      }
      const { error } = await sb().rpc('admin_actualizar_usuario', {
        p_usuario_id: usuarioId,
        p_nombre_completo: nombre_completo != null ? nombre_completo : null,
        p_username: username != null ? username : null,
        p_rol: rol != null ? rol : null,
        p_grupo_id: grupo_id,
        p_password: password || null
      });
      if (error) {
        if (/ya existe|duplicate|unique/i.test(error.message)) throw new Error('Ese nombre de usuario ya existe.');
        if (error) throw new Error(_traducir(error));
      }
    },
    async listarExamenes(actor) {
      if (!sb()) return [];
      const usuario = actor || window.store?.obtener?.('usuario');
      if (usuario?.rol === 'admin') {
        const { data, error } = await sb().rpc('admin_listar_examenes_clase');
        if (error) throw new Error(_traducir(error));
        return data || [];
      }
      const { data, error } = await sb().from('examenes_personalizados').select('*, perfiles!creado_por(nombre_completo), grupos(nombre)').order('creado_en', { ascending: false });
      if (error) throw new Error(_traducir(error));
      return data || [];
    },
    async obtenerAuditoria() {
      if (!sb()) return [];
      const { data } = await sb().from('auditoria').select('*, perfiles!actor_id(nombre_completo, username)').order('creado_en', { ascending: false }).limit(100);
      return data || [];
    },
    async listarMensajesContacto() {
      if (!sb()) return [];
      const { data, error } = await sb().rpc('listar_contacto_mensajes');
      if (error) throw new Error(_traducir(error));
      return data || [];
    },
    async actualizarMensajeContacto(id, estado) {
      if (!sb()) throw new Error('Sin conexión');
      const { data, error } = await sb().rpc('actualizar_contacto_mensaje', { p_id: id, p_estado: estado });
      if (error) throw new Error(_traducir(error));
      return data;
    },
    async registrarAuditoria(accion, detalle, actorId, grupoId) {
      if (!sb()) throw new Error('Sin conexión');
      await sb().from('auditoria').insert({ accion, detalle, actor_id: actorId, grupo_id: grupoId });
    },
    async statsGenerales(actor) {
      if (!sb()) return { usuarios: 0, examenes: 0, lecturas: 0, tarjetas: 0, porRol: {} };
      const usuario = actor || window.store?.obtener?.('usuario');
      if (usuario?.rol === 'admin') {
        const { data, error } = await sb().rpc('admin_stats_clase');
        if (error) throw new Error(_traducir(error));
        return data || { usuarios: 0, examenes: 0, lecturas: 0, tarjetas: 0, porRol: {} };
      }
      try {
        const [usuarios, examenes, progreso, tarjetas, roles] = await Promise.all([
          sb().from('perfiles').select('id', { count: 'exact', head: true }),
          sb().from('examenes_personalizados').select('id', { count: 'exact', head: true }),
          sb().from('progreso_lectura').select('id', { count: 'exact', head: true }),
          sb().from('tarjetas_memorizacion').select('id', { count: 'exact', head: true }),
          sb().from('perfiles').select('rol')
        ]);
        const porRol = { owner: 0, admin: 0, editor: 0, usuario: 0 };
        (roles.data || []).forEach(p => { if (porRol[p.rol] !== undefined) porRol[p.rol]++; });
        return {
          usuarios: usuarios.count || 0,
          examenes: examenes.count || 0,
          lecturas: progreso.count || 0,
          tarjetas: tarjetas.count || 0,
          porRol
        };
      } catch (e) {
        console.error('Error al obtener estadísticas generales:', e);
        return { usuarios: 0, examenes: 0, lecturas: 0, tarjetas: 0, porRol: {} };
      }
    },
    async batchCambiarRol(ids, rol) {
      if (!sb() || !ids.length) return;
      for (const id of ids) {
        const { error } = await sb().rpc('admin_cambiar_rol', { p_usuario_id: id, p_rol: rol });
        if (error) if (error) throw new Error(_traducir(error));
      }
    },
    async batchCambiarGrupo(ids, grupoId) {
      if (!sb() || !ids.length) return;
      for (const id of ids) {
        const { error } = await sb().rpc('admin_actualizar_usuario', { p_usuario_id: id, p_grupo_id: grupoId || null });
        if (error) if (error) throw new Error(_traducir(error));
      }
    },
    async exportarUsuariosCSV(actor) {
      if (!sb()) return '';
      const usuario = actor || window.store?.obtener?.('usuario');
      const { data, error } = usuario?.rol === 'admin'
        ? await sb().rpc('admin_listar_usuarios_clase')
        : await sb().from('perfiles').select('nombre_completo, username, rol, activo, grupo_id, creado_en').order('creado_en', { ascending: false });
      if (error) throw new Error(_traducir(error));
      if (!data) return '';
      const cabeceras = 'Nombre,Username,Rol,Activo,Grupo,Creado';
      const filas = data.map(u =>
        `"${u.nombre_completo || ''}","${u.username || ''}","${u.rol || ''}",${u.activo !== false},${u.grupo_id || ''},${u.creado_en || ''}`
      );
      return cabeceras + '\n' + filas.join('\n');
    },
    async obtenerActividadUsuario(userId) {
      if (!sb()) return { examenes: 0, lecturas: 0, repasos: 0, ultimoAcceso: null };
      try {
        const [examenes, lecturas, repasos] = await Promise.all([
          sb().from('intentos_examen_personalizado').select('id', { count: 'exact', head: true }).eq('alumno_id', userId),
          sb().from('progreso_lectura').select('id', { count: 'exact', head: true }).eq('usuario_id', userId),
          sb().from('repasos_memorizacion').select('id, tarjetas_memorizacion!inner(usuario_id)', { count: 'exact', head: true }).eq('tarjetas_memorizacion.usuario_id', userId)
        ]);
        return { examenes: examenes.count || 0, lecturas: lecturas.count || 0, repasos: repasos.count || 0 };
      } catch { return { examenes: 0, lecturas: 0, repasos: 0 }; }
    },
    async listarConfiguracion() {
      if (!sb()) return {};
      const { data } = await sb().from('configuracion').select('*');
      const mapa = {};
      (data || []).forEach(fila => { if (fila && fila.clave) mapa[fila.clave] = fila.valor; });
      return mapa;
    },
    async guardarConfiguracion(clave, valor) {
      if (!sb()) return;
      await sb().from('configuracion').upsert({ clave, valor, actualizado_en: new Date().toISOString() }, { onConflict: 'clave' });
    },

    // ============================================================
    // NUEVO PANEL: Métricas de exámenes (intentos, pendientes, nota media)
    // Defensivo: si la consulta falla devuelve un mapa vacío.
    // ============================================================
    async obtenerResumenExamenes() {
      if (!sb()) return {};
      try {
        const { data } = await sb().from('intentos_examen_personalizado').select('examen_id, estado, nota');
        const resumen = {};
        (data || []).forEach(i => {
          if (!resumen[i.examen_id]) resumen[i.examen_id] = { intentos: 0, pendientes: 0, notas: [] };
          resumen[i.examen_id].intentos++;
          if (i.estado === 'pendiente' || i.estado === 'en_progreso') resumen[i.examen_id].pendientes++;
          if (i.nota != null && !isNaN(Number(i.nota))) resumen[i.examen_id].notas.push(Number(i.nota));
        });
        const out = {};
        Object.keys(resumen).forEach(k => {
          const r = resumen[k];
          out[k] = { intentos: r.intentos, pendientes: r.pendientes, media: r.notas.length ? (r.notas.reduce((a, b) => a + b, 0) / r.notas.length) : null };
        });
        return out;
      } catch (e) { console.warn('No se pudo obtener resumen de exámenes:', e.message); return {}; }
    },

    // ============================================================
    // NUEVO PANEL: Exámenes — duplicar, publicar, eliminar
    // ============================================================
    async duplicarExamen(id) {
      if (!sb()) throw new Error('Sin conexión');
      const { data: ex } = await sb().from('examenes_personalizados').select('*').eq('id', id).single();
      if (!ex) throw new Error('Examen no encontrado');
      const { data, error } = await sb().from('examenes_personalizados').insert({
        grupo_id: ex.grupo_id,
        creado_por: ex.creado_por,
        titulo: (ex.titulo || 'Examen') + ' (copia)',
        descripcion: ex.descripcion || '',
        referencia_biblica: ex.referencia_biblica || null,
        preguntas: ex.preguntas || [],
        puntos_totales: ex.puntos_totales || 0,
        fecha_limite: null,
        estado: 'borrador',
        publicado: false,
        materia: ex.materia || '',
        tema: ex.tema || '',
        profesor: ex.profesor || '',
        color: ex.color || '#2563EB',
        icono: ex.icono || '',
        portada: ex.portada || '',
        config: ex.config || {}
      }).select().single();
      if (error) throw error;
      return data;
    },
    async publicarExamen(id) {
      if (!sb()) throw new Error('Sin conexión');
      const { data, error } = await sb().from('examenes_personalizados').update({ estado: 'publicado', publicado: true, actualizado_en: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      // Avisar a los alumnos del grupo vía Notification Service (igual que
      // examenesRepository.publicar) para cubrir esta vía alternativa de publicación.
      if (window.notificationService && data && data.grupo_id) {
        window.notificationService.emitir('examen.publicado', {
          examenId: id,
          titulo: data.titulo || 'Examen',
          grupoId: data.grupo_id,
          datos: { examen_id: id, examen_titulo: data.titulo || 'Examen' }
        }).catch(() => {});
      }
      return data;
    },
    async eliminarExamen(id) {
      if (!sb()) throw new Error('Sin conexión');
      const { error } = await sb().from('examenes_personalizados').delete().eq('id', id);
      if (error) throw error;
    },

    // ============================================================
    // NUEVO PANEL: Backups (tabla `backups`, migración 022)
    // ============================================================
    async listarBackups() {
      if (!sb()) return [];
      try {
        const { data } = await sb().from('backups').select('id, nombre, tamano_bytes, estado, notas, creado_en').order('creado_en', { ascending: false }).limit(30);
        return data || [];
      } catch (e) { console.warn('No se pudieron listar backups:', e.message); return []; }
    },
    async crearBackup(actorId) {
      if (!sb()) throw new Error('Sin conexión');
      const [perfiles, grupos, examenes, configuracion, sugerencias] = await Promise.all([
        sb().from('perfiles').select(this._columnasPerfil()),
        sb().from('grupos').select('*'),
        sb().from('examenes_personalizados').select('*'),
        sb().from('configuracion').select('*'),
        sb().from('sugerencias').select('*')
      ]);
      const snapshot = {
        app: 'FormsBiblicos',
        version: window.__FB_APP_VERSION__?.version || '—',
        creado_en: new Date().toISOString(),
        perfiles: perfiles.data || [],
        grupos: grupos.data || [],
        examenes: examenes.data || [],
        configuracion: configuracion.data || [],
        sugerencias: sugerencias.data || []
      };
      const nombre = 'backup-' + new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
      const json = JSON.stringify(snapshot);
      const tamanoBytes = new Blob([json]).size;
      const { data, error } = await sb().from('backups').insert({
        creado_por: actorId,
        nombre,
        tamano_bytes: tamanoBytes,
        snapshot,
        estado: 'ok'
      }).select().single();
      if (error) throw error;
      await this.registrarAuditoria('backup:crear', `Copia de seguridad "${nombre}" creada (${Math.round(tamanoBytes / 1024)} KB)`, actorId);
      return data;
    },
    async eliminarBackup(id, actorId) {
      if (!sb()) throw new Error('Sin conexión');
      await sb().from('backups').delete().eq('id', id);
      await this.registrarAuditoria('backup:eliminar', 'Copia de seguridad eliminada', actorId);
    },
    async restaurarBackup(id, actorId) {
      if (!sb()) throw new Error('Sin conexión');
      const { data: b } = await sb().from('backups').select('*').eq('id', id).single();
      if (!b || !b.snapshot) throw new Error('Copia no encontrada');
      const s = b.snapshot || {};
      const grupos = Array.isArray(s.grupos) ? s.grupos : [];
      const perfiles = Array.isArray(s.perfiles) ? s.perfiles : [];
      const examenes = Array.isArray(s.examenes) ? s.examenes : [];
      // Restaurar grupos (upsert)
      for (const g of grupos) {
        if (!g || !g.id) continue;
        try { await sb().from('grupos').upsert({
          id: g.id,
          nombre: g.nombre || 'Grupo',
          descripcion: g.descripcion || '',
          admin_id: g.admin_id || null,
          creado_en: g.creado_en || new Date().toISOString()
        }); } catch (e) {}
      }
      // ponytail: con el RLS cerrado (028) el cliente ya NO puede INSERT/upsert
      // en perfiles (sin política de INSERT). Restaurar los perfiles requiere una
      // RPC SECURITY DEFINER nueva (admin_restaurar_perfiles); hasta entonces se
      // avisa y NO se omiten en silencio (evita falsa sensación de restauración).
      if (perfiles.length) {
        throw new Error('La restauración de perfiles requiere una RPC de admin pendiente (028). Grupos y exámenes sí se restauran.');
      }
      // Restaurar exámenes (upsert)
      for (const ex of examenes) {
        if (!ex || !ex.id) continue;
        try { await sb().from('examenes_personalizados').upsert(ex); } catch (e) {}
      }
      await this.registrarAuditoria('backup:restaurar', `Copia "${b.nombre}" restaurada (${perfiles.length} perfiles, ${grupos.length} grupos, ${examenes.length} exámenes)`, actorId);
      return { perfiles: perfiles.length, grupos: grupos.length, examenes: examenes.length };
    },

    // ============================================================
    // NUEVO PANEL: Exportar / Importar datos
    // ============================================================
    async exportarDatosJSON() {
      if (!sb()) return null;
      const [perfiles, grupos, examenes, configuracion, sugerencias] = await Promise.all([
        sb().from('perfiles').select(this._columnasPerfil()),
        sb().from('grupos').select('*'),
        sb().from('examenes_personalizados').select('*'),
        sb().from('configuracion').select('*'),
        sb().from('sugerencias').select('*')
      ]);
      return {
        app: 'FormsBiblicos',
        version: window.__FB_APP_VERSION__?.version || '—',
        exportado: new Date().toISOString(),
        perfiles: perfiles.data || [],
        grupos: grupos.data || [],
        examenes: examenes.data || [],
        configuracion: configuracion.data || [],
        sugerencias: sugerencias.data || []
      };
    },
    // Importa usuarios desde CSV (Nombre,Username,Contraseña,Rol,Grupo).
    // Devuelve { creados: [usernames], errores: [mensajes] }.
    async importarUsuariosCSV(texto, actorId) {
      if (!sb()) throw new Error('Sin conexión');
      const lineas = String(texto || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lineas.length < 2) throw new Error('El archivo no contiene suficientes filas.');
      const primera = lineas[0].split(',').map(c => c.replace(/^"|"$/g, '').trim().toLowerCase());
      const tieneCabecera = /nombre|username|usuario|password|contrase|rol|grupo/.test(primera.join(' '));
      const filas = tieneCabecera ? lineas.slice(1) : lineas;
      const grupos = await this.listarGrupos(window.store?.obtener?.('usuario'));
      const creados = [];
      const errores = [];
      for (const fila of filas) {
        let username = '';
        try {
          const partes = fila.split(',').map(c => c.replace(/^"|"$/g, '').trim());
          const [nombre, usr, pass, rol, grupoNombre] = partes;
          username = usr || '';
          if (!nombre || !usr || !pass) { errores.push((usr || fila.slice(0, 24)) + ': faltan campos (nombre, username, contraseña)'); continue; }
          const rolOk = ['usuario', 'editor', 'admin'].includes(rol) ? rol : 'usuario';
          let grupoId = null;
          if (grupoNombre) {
            const g = grupos.find(x => String(x.nombre).toLowerCase() === String(grupoNombre).toLowerCase());
            if (g) grupoId = g.id;
            else errores.push(usr + ': grupo "' + grupoNombre + '" no existe');
          }
          await this.crearUsuario({ nombre_completo: nombre, username: usr, password: pass, rol: rolOk, grupo_id: grupoId });
          creados.push(usr);
        } catch (e) {
          errores.push(username + ': ' + e.message);
        }
      }
      if (creados.length) await this.registrarAuditoria('usuario:importar', `Importados ${creados.length} usuarios desde CSV`, actorId);
      return { creados, errores };
    },

    // ============================================================
    // NUEVO PANEL: Modo mantenimiento (configuracion) y limpieza
    // ============================================================
    async obtenerModoMantenimiento() {
      const c = await this.listarConfiguracion();
      return c['modo_mantenimiento'] === '1';
    },
    async establecerModoMantenimiento(activo, actorId) {
      await this.guardarConfiguracion('modo_mantenimiento', activo ? '1' : '0');
      await this.registrarAuditoria('config:mantenimiento', activo ? 'Modo mantenimiento activado' : 'Modo mantenimiento desactivado', actorId);
    },
    async limpiarAuditoriaCompleta(actorId) {
      if (!sb()) throw new Error('Sin conexión');
      await sb().from('auditoria').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await this.registrarAuditoria('config:limpiar', 'Auditoría completa vaciada', actorId);
    },
    async limpiarSugerenciasRechazadas(actorId) {
      if (!sb()) throw new Error('Sin conexión');
      const { data } = await sb().from('sugerencias').delete().eq('estado', 'rechazada').select('id');
      const n = (data || []).length;
      await this.registrarAuditoria('config:limpiar', `Sugerencias rechazadas eliminadas (${n})`, actorId);
      return n;
    },
    async limpiarIntentosViejos(actorId) {
      if (!sb()) throw new Error('Sin conexión');
      const hace90 = new Date(Date.now() - 90 * 86400000).toISOString();
      const { data } = await sb().from('intentos_examen_personalizado').delete().lt('creado_en', hace90).eq('estado', 'pendiente').select('id');
      const n = (data || []).length;
      await this.registrarAuditoria('config:limpiar', `Intentos pendientes antiguos eliminados (${n})`, actorId);
      return n;
    },

    // Envía una notificación de anuncio a todos los usuarios de la plataforma
    // a través del Notification Service (persistencia + entrega centralizadas).
    async enviarAnuncioGlobal({ titulo, cuerpo }, actorId) {
      if (!sb()) throw new Error('Sin conexión');
      const tituloNotif = titulo.trim() || 'Anuncio';
      const cuerpoNotif = cuerpo.trim() || '';
      // Obtener todos los usuarios activos
      const { data: perfiles, error: errPerfiles } = await sb().from('perfiles').select('id, nombre_completo, username').neq('id', actorId);
      if (errPerfiles) throw new Error('No se pudieron listar los usuarios.');
      if (!perfiles || !perfiles.length) throw new Error('No hay usuarios a los que notificar.');
      const destinatarios = perfiles.map(p => p.id);
      if (window.notificationService) {
        await window.notificationService.emitir('anuncio.creado', {
          titulo: tituloNotif,
          cuerpo: cuerpoNotif,
          destinatarios,
          datos: { anuncio_titulo: tituloNotif, anuncio_cuerpo: cuerpoNotif },
          emisorId: actorId
        });
      } else {
        // Fallback: inserción directa si el servicio no está disponible
        const notifs = perfiles.map(p => ({
          usuario_id: p.id,
          destinatario: p.nombre_completo || p.username || '',
          tipo: 'anuncio',
          titulo: tituloNotif,
          cuerpo: cuerpoNotif,
          datos: { anuncio_titulo: tituloNotif, anuncio_cuerpo: cuerpoNotif },
          leida: false
        }));
        const { error } = await sb().from('notificaciones').insert(notifs);
        if (error) throw new Error('Error al enviar notificaciones: ' + _traducir(error));
      }
      await this.registrarAuditoria('notificaciones:anuncio', `Anuncio enviado a ${perfiles.length} usuarios: "${tituloNotif}"`, actorId);
      return { enviados: perfiles.length };
    }
  };
})();
