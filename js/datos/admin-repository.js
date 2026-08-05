(function() {
  'use strict';
  const sb = () => window.supabaseClient;
  window.adminRepository = {
    // Actualiza ultimo_acceso del usuario actual (heartbeat)
    async actualizarUltimoAcceso(usuarioId) {
      if (!sb() || !usuarioId) return;
      try { await sb().from('perfiles').update({ ultimo_acceso: new Date().toISOString() }).eq('id', usuarioId); } catch (e) {}
    },
    async listarUsuarios() {
      if (!sb()) return [];
      const { data } = await sb().from('perfiles').select('*').order('creado_en', { ascending: false });
      return data || [];
    },
    async listarGrupos() {
      if (!sb()) return [];
      const { data } = await sb().from('grupos').select('*, perfiles!admin_id(nombre_completo, username)');
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
      if (error) throw new Error('No se pudo eliminar el grupo: ' + error.message);
    },
    async crearUsuario({ nombre_completo, username, password, rol, grupo_id }) {
      if (!sb()) throw new Error('Sin conexión');
      const { data, error } = await sb().from('perfiles').insert({
        nombre_completo: nombre_completo,
        username: username,
        password: await window.helpers.hashPassword(password || ''),
        rol: rol || 'usuario',
        grupo_id: grupo_id || null,
        activo: true
      }).select().single();
      if (error) {
        if (/duplicate|unique|ya existe/i.test(error.message)) throw new Error('Ese nombre de usuario ya existe.');
        throw error;
      }
      return data;
    },
    async toggleActivo(usuarioId, activo) {
      if (!sb()) throw new Error('Sin conexión');
      await sb().from('perfiles').update({ activo }).eq('id', usuarioId);
    },
    async cambiarRol(usuarioId, rol) {
      if (!sb()) throw new Error('Sin conexión');
      await sb().from('perfiles').update({ rol }).eq('id', usuarioId);
    },
    async eliminarUsuario(usuarioId, actorId) {
      if (!sb()) return;
      if (!actorId) throw new Error('Se requiere el administrador que ejecuta la acción.');
      // Limpiar referencias hijas antes de borrar el perfil (las FKs impiden borrarlo antes)
      await sb().from('auditoria').delete().eq('actor_id', usuarioId);
      await sb().from('miembros_grupo').delete().eq('usuario_id', usuarioId);
      await sb().from('notas_capitulo').delete().eq('usuario_id', usuarioId);
      await sb().from('categorias_tarjetas').delete().eq('usuario_id', usuarioId);
      await sb().from('categorias_memorizacion').delete().eq('usuario_id', usuarioId);
      await sb().from('mazos_memorizacion').delete().eq('usuario_id', usuarioId);
      await sb().from('logros_usuario').delete().eq('usuario_id', usuarioId);
      await sb().from('progreso_lectura').delete().eq('usuario_id', usuarioId);
      // repasos_memorizacion se borran en cascada al eliminar tarjetas_memorizacion
      await sb().from('tarjetas_memorizacion').delete().eq('usuario_id', usuarioId);
      await sb().from('intentos_examen_personalizado').delete().eq('alumno_id', usuarioId);
      await sb().from('intentos_examen_personalizado').update({ corregido_por: null }).eq('corregido_por', usuarioId);
      await sb().from('preguntas_sistema').update({ creado_por: null }).eq('creado_por', usuarioId);
      await sb().from('evaluaciones').update({ creado_por: null }).eq('creado_por', usuarioId);
      // Exámenes creados por el usuario: creado_por es NOT NULL, se reasignan al actor.
      await sb().from('examenes_personalizados').update({ creado_por: actorId }).eq('creado_por', usuarioId);
      await sb().from('grupos').update({ admin_id: null }).eq('admin_id', usuarioId);
      const { error } = await sb().from('perfiles').delete().eq('id', usuarioId);
      if (error) throw error;
    },
    async actualizarUsuario(usuarioId, { nombre_completo, username, rol, grupo_id, password }) {
      if (!sb()) return;
      const updates = {
        nombre_completo: nombre_completo,
        username: username,
        rol: rol,
        grupo_id: grupo_id || null
      };
      if (password !== undefined && password !== '') updates.password = await window.helpers.hashPassword(password);
      const { error } = await sb().from('perfiles').update(updates).eq('id', usuarioId);
      if (error) throw error;
    },
    async listarExamenes() {
      if (!sb()) return [];
      const { data } = await sb().from('examenes_personalizados').select('*, perfiles!creado_por(nombre_completo), grupos(nombre)').order('creado_en', { ascending: false });
      return data || [];
    },
    async obtenerAuditoria() {
      if (!sb()) return [];
      const { data } = await sb().from('auditoria').select('*, perfiles!actor_id(nombre_completo, username)').order('creado_en', { ascending: false }).limit(100);
      return data || [];
    },
    async registrarAuditoria(accion, detalle, actorId, grupoId) {
      if (!sb()) throw new Error('Sin conexión');
      await sb().from('auditoria').insert({ accion, detalle, actor_id: actorId, grupo_id: grupoId });
    },
    async statsGenerales() {
      if (!sb()) return { usuarios: 0, examenes: 0, lecturas: 0, tarjetas: 0, porRol: {} };
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
      await sb().from('perfiles').update({ rol }).in('id', ids);
    },
    async batchCambiarGrupo(ids, grupoId) {
      if (!sb() || !ids.length) return;
      await sb().from('perfiles').update({ grupo_id: grupoId || null }).in('id', ids);
    },
    async exportarUsuariosCSV() {
      if (!sb()) return '';
      const { data } = await sb().from('perfiles').select('nombre_completo, username, rol, activo, grupo_id, creado_en').order('creado_en', { ascending: false });
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
        icono: ex.icono || '📘',
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
        sb().from('perfiles').select('*'),
        sb().from('grupos').select('*'),
        sb().from('examenes_personalizados').select('*'),
        sb().from('configuracion').select('*'),
        sb().from('sugerencias').select('*')
      ]);
      const snapshot = {
        app: 'FormsBiblicos',
        version: '1.0.1',
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
      // Restaurar perfiles (upsert; solo password si viene incluida)
      for (const p of perfiles) {
        if (!p || !p.id) continue;
        const ups = {
          id: p.id,
          nombre_completo: p.nombre_completo || 'Usuario',
          username: p.username || ('usuario_' + String(p.id).slice(0, 6)),
          rol: p.rol || 'usuario',
          activo: p.activo !== false,
          grupo_id: p.grupo_id || null,
          creado_en: p.creado_en || new Date().toISOString()
        };
        if (p.password) ups.password = p.password;
        if (p.foto_perfil) ups.foto_perfil = p.foto_perfil;
        if (p.preferencias) ups.preferencias = p.preferencias;
        if (p.ultimo_acceso) ups.ultimo_acceso = p.ultimo_acceso;
        try { await sb().from('perfiles').upsert(ups); } catch (e) {}
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
        sb().from('perfiles').select('*'),
        sb().from('grupos').select('*'),
        sb().from('examenes_personalizados').select('*'),
        sb().from('configuracion').select('*'),
        sb().from('sugerencias').select('*')
      ]);
      return {
        app: 'FormsBiblicos',
        version: '1.0.1',
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
      const grupos = await this.listarGrupos();
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

    // Envía una notificación de anuncio a todos los usuarios de la plataforma.
    // Inserta una fila en notificaciones para CADA usuario y además notifica
    // al propietario con un resumen.
    async enviarAnuncioGlobal({ titulo, cuerpo }, actorId) {
      if (!sb()) throw new Error('Sin conexión');
      const tituloNotif = titulo.trim() || 'Anuncio';
      const cuerpoNotif = cuerpo.trim() || '';
      // Obtener todos los usuarios activos
      const { data: perfiles, error: errPerfiles } = await sb().from('perfiles').select('id, nombre_completo, username').neq('id', actorId);
      if (errPerfiles) throw new Error('No se pudieron listar los usuarios.');
      if (!perfiles || !perfiles.length) throw new Error('No hay usuarios a los que notificar.');
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
      if (error) throw new Error('Error al enviar notificaciones: ' + error.message);
      await this.registrarAuditoria('notificaciones:anuncio', `Anuncio enviado a ${perfiles.length} usuarios: "${tituloNotif}"`, actorId);
      return { enviados: perfiles.length };
    }
  };
})();
