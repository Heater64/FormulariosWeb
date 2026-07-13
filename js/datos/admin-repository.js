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
      if (!sb()) return;
      await sb().from('grupos').delete().eq('id', id);
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
    async asignarGrupo(usuarioId, grupoId) {
      if (!sb()) return;
      await sb().from('perfiles').update({ grupo_id: grupoId }).eq('id', usuarioId);
    },
    async toggleActivo(usuarioId, activo) {
      if (!sb()) return;
      await sb().from('perfiles').update({ activo }).eq('id', usuarioId);
    },
    async cambiarRol(usuarioId, rol) {
      if (!sb()) return;
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
      if (!sb()) return;
      await sb().from('auditoria').insert({ accion, detalle, actor_id: actorId, grupo_id: grupoId });
    },
    async statsGenerales() {
      if (!sb()) return { usuarios: 0, examenes: 0, lecturas: 0, tarjetas: 0 };
      try {
        const [usuarios, examenes, progreso, tarjetas] = await Promise.all([
          sb().from('perfiles').select('id', { count: 'exact', head: true }),
          sb().from('examenes_personalizados').select('id', { count: 'exact', head: true }),
          sb().from('progreso_lectura').select('id', { count: 'exact', head: true }),
          sb().from('tarjetas_memorizacion').select('id', { count: 'exact', head: true })
        ]);
        return {
          usuarios: usuarios.count || 0,
          examenes: examenes.count || 0,
          lecturas: progreso.count || 0,
          tarjetas: tarjetas.count || 0
        };
      } catch (e) {
        console.error('Error al obtener estadísticas generales:', e);
        return { usuarios: 0, examenes: 0, lecturas: 0, tarjetas: 0 };
      }
    }
  };
})();
