(function() {
  'use strict';
  const sb = () => window.supabaseClient;
  window.adminRepository = {
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
        password: password,
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
    async eliminarUsuario(usuarioId) {
      if (!sb()) return;
      // Limpiar referencias RESTRICT antes de borrar el perfil
      await sb().from('auditoria').delete().eq('actor_id', usuarioId);
      await sb().from('calificaciones').delete().eq('alumno_id', usuarioId);
      await sb().from('calificaciones').delete().eq('corregido_por', usuarioId);
      await sb().from('examenes_personalizados').update({ creado_por: null }).eq('creado_por', usuarioId);
      await sb().from('evaluaciones').update({ creado_por: null }).eq('creado_por', usuarioId);
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
      if (password !== undefined && password !== '') updates.password = password;
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
          sb().from('evaluaciones').select('id', { count: 'exact', head: true }).eq('alumno_id', userId),
          sb().from('progreso_lectura').select('id', { count: 'exact', head: true }).eq('usuario_id', userId),
          sb().from('historial_repaso').select('id', { count: 'exact', head: true }).eq('tarjeta_id', userId)
        ]);
        return { examenes: examenes.count || 0, lecturas: lecturas.count || 0, repasos: repasos.count || 0 };
      } catch { return { examenes: 0, lecturas: 0, repasos: 0 }; }
    },
    async listarConfiguracion() {
      if (!sb()) return {};
      const { data } = await sb().from('configuracion').select('*').maybeSingle();
      return data || {};
    },
    async guardarConfiguracion(clave, valor) {
      if (!sb()) return;
      await sb().from('configuracion').upsert({ clave, valor }, { onConflict: 'clave' });
    }
  };
})();
