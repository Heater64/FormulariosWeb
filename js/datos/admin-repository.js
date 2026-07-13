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
      if (!sb()) return {};
      const usuarios = await sb().from('perfiles').select('id', { count: 'exact', head: true });
      const examenes = await sb().from('examenes_personalizados').select('id', { count: 'exact', head: true });
      const progreso = await sb().from('progreso_lectura').select('id', { count: 'exact', head: true });
      const tarjetas = await sb().from('tarjetas_memorizacion').select('id', { count: 'exact', head: true });
      return {
        usuarios: usuarios.count || 0,
        examenes: examenes.count || 0,
        lecturas: progreso.count || 0,
        tarjetas: tarjetas.count || 0
      };
    }
  };
})();
