(function() {
  'use strict';
  const sb = () => window.supabaseClient;

  // Cache de sesión: si la columna grupos.imagen no existe (migración 024
  // no aplicada), no repetir la consulta fallida en cada render del directorio
  // (evita un 400 en consola por cada carga).
  let _imagenNoDisponible = false;

  function rolGrupoDesdeRol(rol) {
    const map = { owner: 'admin', admin: 'admin', editor: 'editor', usuario: 'miembro' };
    return map[rol] || 'miembro';
  }

  window.gruposRepository = {
    // Rol dentro del grupo (rol_en_grupo de miembros_grupo), con fallback al
    // rol global del perfil (cuentas creadas por asegurarGrupo no tienen fila
    // en miembros_grupo).
    rolGrupoDesdeRol,

    // Obtiene la clase principal del usuario: datos del grupo + miembros
    // (con su rol dentro del grupo) + el rol del propio usuario.
    async obtenerMiClase(usuario) {
      if (!sb() || !usuario || !usuario.grupo_id) return null;
      try {
        const [grupoRes, miembrosRes, rolesRes] = await Promise.all([
          sb().from('grupos')
            .select('*, perfiles!admin_id(nombre_completo, username)')
            .eq('id', usuario.grupo_id).limit(1),
          sb().from('perfiles')
            .select('id, nombre_completo, username, rol, foto_perfil, creado_en')
            .eq('grupo_id', usuario.grupo_id)
            .order('nombre_completo'),
          sb().from('miembros_grupo')
            .select('usuario_id, rol_en_grupo')
            .eq('grupo_id', usuario.grupo_id)
        ]);
        const grupo = (grupoRes.data && grupoRes.data[0]) || null;
        if (!grupo) return null;
        const rolesMap = {};
        (rolesRes.data || []).forEach(r => { if (r && r.usuario_id) rolesMap[r.usuario_id] = r.rol_en_grupo; });
        const miembros = (miembrosRes.data || []).map(m => ({
          ...m,
          rol_en_grupo: rolesMap[m.id] || rolGrupoDesdeRol(m.rol)
        }));
        const miRol = rolesMap[usuario.id] || rolGrupoDesdeRol(usuario.rol);
        return { grupo, miembros, miRol };
      } catch (e) {
        console.warn('[Grupos] No se pudo obtener la clase:', e.message);
        return null;
      }
    },

    // Todas las membresías del usuario (grupos a través de miembros_grupo).
    async misMembresias(usuarioId) {
      if (!sb() || !usuarioId) return [];
      try {
        const { data } = await sb().from('miembros_grupo')
          .select('rol_en_grupo, grupos(id, nombre, descripcion, admin_id, creado_en)')
          .eq('usuario_id', usuarioId);
        return (data || [])
          .filter(m => m && m.grupos)
          .map(m => ({ ...m.grupos, rol_en_grupo: m.rol_en_grupo }));
      } catch (e) {
        console.warn('[Grupos] No se pudieron listar membresías:', e.message);
        return [];
      }
    },

    // ── Directorio público ──────────────────────────────────────

    // Todos los grupos del centro con su número de miembros, para el
    // directorio público. No expone actividad ni estadísticas.
    // Resiliente a la migración 024: si la columna imagen no existe aún,
    // reintenta sin ella para que el directorio funcione igualmente.
    // (PostgREST devuelve { error } sin lanzar excepción: hay que
    // comprobar gruposRes.error explícitamente para activar el fallback.)
    async listarGruposPublicos() {
      if (!sb()) return [];
      const consultar = async (conImagen) => {
        const cols = 'id, nombre, descripcion, admin_id, creado_en, perfiles!admin_id(nombre_completo, username)'
          + (conImagen ? ', imagen' : '');
        const [gruposRes, conteos] = await Promise.all([
          sb().from('grupos').select(cols).order('nombre'),
          sb().from('miembros_grupo').select('grupo_id')
        ]);
        if (gruposRes.error) throw gruposRes.error;
        const conteo = {};
        (conteos.data || []).forEach(m => { if (m && m.grupo_id) conteo[m.grupo_id] = (conteo[m.grupo_id] || 0) + 1; });
        return (gruposRes.data || []).map(g => ({
          ...g,
          num_miembros: conteo[g.id] || 0
        }));
      };
      // Sin la migración 024, usar directamente la consulta sin imagen
      if (_imagenNoDisponible) return consultar(false).catch(() => []);
      try {
        return await consultar(true);
      } catch (e) {
        // Migración 024 no aplicada (grupos.imagen no existe): memorizar y
        // reintentar sin la columna para que el directorio funcione igualmente.
        _imagenNoDisponible = true;
        try {
          return await consultar(false);
        } catch (e2) {
          console.warn('[Grupos] No se pudo listar el directorio:', e2.message);
          return [];
        }
      }
    },

    // Grupos de los que el usuario es administrador (admin_id en grupos).
    async gruposAdminDe(usuarioId) {
      if (!sb() || !usuarioId) return [];
      try {
        const { data } = await sb().from('grupos')
          .select('id, nombre, descripcion, admin_id, creado_en')
          .eq('admin_id', usuarioId);
        return data || [];
      } catch (e) {
        console.warn('[Grupos] No se pudieron listar grupos administrados:', e.message);
        return [];
      }
    },

    // ¿El usuario es miembro del grupo? Considera las mismas tres fuentes
    // que el resto de la zona de grupos: perfiles.grupo_id (clase), miembros_grupo
    // (uniones del directorio) y grupos.admin_id (administrador del grupo).
    async esMiembroDe(grupoId, usuarioId) {
      if (!sb() || !grupoId || !usuarioId) return false;
      try {
        const [m, p, g] = await Promise.all([
          sb().from('miembros_grupo').select('id').eq('grupo_id', grupoId).eq('usuario_id', usuarioId).limit(1),
          sb().from('perfiles').select('id').eq('id', usuarioId).eq('grupo_id', grupoId).limit(1),
          sb().from('grupos').select('id').eq('id', grupoId).eq('admin_id', usuarioId).limit(1)
        ]);
        return ((m.data || []).length + (p.data || []).length + (g.data || []).length) > 0;
      } catch { return false; }
    },

    // Entrar a un grupo del directorio (rol miembro). No toca grupo_id del
    // perfil: la "clase" principal la gestiona el administrador.
    async unirseAGrupo(grupoId, usuarioId) {
      if (!sb() || !grupoId || !usuarioId) throw new Error('Faltan datos');
      const { error } = await sb().from('miembros_grupo').upsert(
        { grupo_id: grupoId, usuario_id: usuarioId, rol_en_grupo: 'miembro' },
        { onConflict: 'grupo_id,usuario_id' }
      );
      if (error) throw error;
    },

    async salirDeGrupo(grupoId, usuarioId) {
      if (!sb() || !grupoId || !usuarioId) return;
      await sb().from('miembros_grupo').delete()
        .eq('grupo_id', grupoId).eq('usuario_id', usuarioId).catch(() => {});
    },

    // Miembros de un grupo concreto. Combina dos fuentes para que el
    // recuento coincida con el directorio:
    //   1. perfiles.grupo_id (la "clase" principal, asignada por el admin)
    //   2. miembros_grupo (uniones hechas desde el directorio público)
    // Devuelve [{ ...perfil, rol_en_grupo }] sin duplicados.
    async obtenerMiembrosDe(grupoId) {
      if (!sb() || !grupoId) return [];
      try {
        const [porGrupoId, rolesRes] = await Promise.all([
          sb().from('perfiles')
            .select('id, nombre_completo, username, rol, foto_perfil, creado_en')
            .eq('grupo_id', grupoId),
          sb().from('miembros_grupo')
            .select('usuario_id, rol_en_grupo')
            .eq('grupo_id', grupoId)
        ]);
        const rolesMap = {};
        (rolesRes.data || []).forEach(r => { if (r && r.usuario_id) rolesMap[r.usuario_id] = r.rol_en_grupo; });

        const idsMiembros = (rolesRes.data || []).map(r => r.usuario_id).filter(Boolean);
        let porMembresia = [];
        if (idsMiembros.length) {
          const r2 = await sb().from('perfiles')
            .select('id, nombre_completo, username, rol, foto_perfil, creado_en')
            .in('id', idsMiembros);
          if (!r2.error) porMembresia = r2.data || [];
        }

        // Unir sin duplicados (prioridad: grupo_id primero)
        const vistos = new Set();
        const lista = [];
        [...(porGrupoId.data || []), ...porMembresia].forEach(m => {
          if (m && m.id && !vistos.has(m.id)) {
            vistos.add(m.id);
            lista.push({ ...m, rol_en_grupo: rolesMap[m.id] || rolGrupoDesdeRol(m.rol) });
          }
        });
        return lista.sort((a, b) => (a.nombre_completo || '').localeCompare(b.nombre_completo || ''));
      } catch (e) {
        console.warn('[Grupos] No se pudieron obtener miembros:', e.message);
        return [];
      }
    }
  };
})();
