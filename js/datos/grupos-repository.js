(function() {
  'use strict';
  const sb = () => window.supabaseClient;

  // Cache de sesión: si la columna grupos.imagen no existe (migración 024
  // no aplicada), no repetir la consulta fallida en cada render del directorio
  // (evita un 400 en consola por cada carga).
  let _imagenNoDisponible = false;

  const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I

  function rolGrupoDesdeRol(rol) {
    const map = { owner: 'admin', admin: 'admin', editor: 'editor', usuario: 'miembro' };
    return map[rol] || 'miembro';
  }

  // La migración 040 (instituciones + código de clase) aún no aplicada:
  // PostgREST responde PGRST205 con "Could not find the table". Se traduce a
  // un aviso claro en vez del error SQL en crudo.
  function _traducirErrorMigracion(e) {
    const msg = (e && e.message) || '';
    if (/Could not find the table 'public\.instituciones'|Could not find the table.*instituciones/i.test(msg)) {
      return new Error('El sistema de instituciones aún no está activado en la base de datos. Aplica la migración 040 (supabase/migraciones/040_clases_instituciones.sql).');
    }
    if (/Could not find the table.*grupos/i.test(msg) || /column.*codigo.*does not exist/i.test(msg) || /column.*institucion_id.*does not exist/i.test(msg) || /'codigo' column of 'grupos'/i.test(msg) || /'institucion_id' column of 'grupos'/i.test(msg)) {
      return new Error('El sistema de clases necesita la migración 040 en la base de datos (supabase/migraciones/040_clases_instituciones.sql).');
    }
    if (/Could not find the function public\.unirse_con_codigo/i.test(msg)) {
      return new Error('El código de clase requiere la migración 040 en la base de datos (supabase/migraciones/040_clases_instituciones.sql).');
    }
    return e;
  }

  // Código de clase de 6 caracteres sin ambiguos (como el de Classroom).
  function generarCodigo() {
    let c = '';
    for (let i = 0; i < 6; i++) {
      c += ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)];
    }
    return c;
  }

  window.gruposRepository = {
    // Rol dentro del grupo (rol_en_grupo de miembros_grupo), con fallback al
    // rol global del perfil (cuentas creadas por asegurarGrupo no tienen fila
    // en miembros_grupo).
    rolGrupoDesdeRol,
    generarCodigo,

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
            .select('id, nombre_completo, username, rol, foto_perfil, creado_en, ultimo_acceso')
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

    // Crea una clase con el usuario actual como administrador (admin_id) y
    // un código de clase único (reintenta si hay colisión). institucionId es
    // opcional: si no se pasa, la clase queda sin institución (visible en
    // "Mis clases" sin agrupar).
    async crearGrupo(nombre, adminId, institucionId = null) {
      if (!sb()) throw new Error('Sin conexión');
      for (let intento = 0; intento < 5; intento++) {
        const codigo = generarCodigo();
        const { data, error } = await sb().from('grupos')
          .insert({ nombre, admin_id: adminId, institucion_id: institucionId || null, codigo })
          .select().single();
        if (!error) return data;
        // Colisión de código (extremadamente rara): reintentar con otro código
        if (!/duplicate key/i.test(error.message || '')) throw _traducirErrorMigracion(error);
      }
      throw new Error('No se pudo generar un código de clase único');
    },

    // ── Instituciones ─────────────────────────────────────────

    // Crea una institución; el creador pasa a ser su administrador.
    async crearInstitucion(nombre, adminId, descripcion = '') {
      if (!sb()) throw new Error('Sin conexión');
      const { data, error } = await sb().from('instituciones')
        .insert({ nombre, admin_id: adminId, descripcion })
        .select().single();
      if (error) throw _traducirErrorMigracion(error);
      return data;
    },

    // Instituciones donde el usuario es admin, o tiene alguna clase
    // (para agrupar "Mis clases" por institución en el home).
    async listarInstituciones(usuarioId) {
      if (!sb() || !usuarioId) return [];
      try {
        const [adminRes, membresiasRes, claseRes] = await Promise.all([
          sb().from('instituciones').select('*').eq('admin_id', usuarioId),
          sb().from('miembros_grupo')
            .select('grupos(institucion_id)')
            .eq('usuario_id', usuarioId),
          // Evitar el join ambiguo perfiles -> grupos: el usuario puede
          // relacionarse con grupos por grupo_id y por membresías.
          sb().from('perfiles')
            .select('grupo_id')
            .eq('id', usuarioId).limit(1)
        ]);
        const ids = new Set();
        const vistos = new Map();
        const poner = (i) => { if (i && i.id && !vistos.has(i.id)) { vistos.set(i.id, i); ids.add(i.id); } };
        (adminRes.data || []).forEach(poner);
        (membresiasRes.data || []).forEach(m => {
          if (m && m.grupos && m.grupos.institucion_id) ids.add(m.grupos.institucion_id);
        });
        const clase = claseRes.data && claseRes.data[0];
        if (clase && clase.grupo_id) {
          const { data: grupos } = await sb().from('grupos')
            .select('institucion_id')
            .eq('id', clase.grupo_id).limit(1);
          const institucionId = grupos && grupos[0] && grupos[0].institucion_id;
          if (institucionId) ids.add(institucionId);
        }
        if (!ids.size) return [...vistos.values()];
        // Traer datos completos de las instituciones restantes
        const faltantes = [...ids].filter(id => !vistos.has(id));
        if (faltantes.length) {
          const { data } = await sb().from('instituciones').select('*').in('id', faltantes);
          (data || []).forEach(poner);
        }
        return [...vistos.values()].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      } catch (e) {
        console.warn('[Grupos] No se pudieron listar instituciones:', e.message);
        return [];
      }
    },

    // ── Mis clases ────────────────────────────────────────────

    // Todas las clases del usuario (miembro, administrador o clase principal
    // del perfil), con institución y número de miembros. Es la fuente del
    // home "Mis clases" (estilo Classroom): ya no hay directorio abierto.
    // Resiliente a la migración 040 sin aplicar: si la tabla instituciones no
    // existe, reintenta sin el join para que las clases sigan viéndose.
    async listarMisClases(usuarioId) {
      if (!sb() || !usuarioId) return [];
      const CON_INST = 'instituciones(id, nombre)';
      const SIN_INST = '';
      const consultar = async (conInst) => {
        const instCol = conInst ? ', ' + CON_INST : '';
        const codCol = conInst ? ', codigo' : '';
        const [membresiasRes, adminRes, conteosRes, claseRes] = await Promise.all([
          sb().from('miembros_grupo')
            .select('rol_en_grupo, grupos(id, nombre, descripcion, admin_id' + codCol + ', creado_en' + instCol + ')')
            .eq('usuario_id', usuarioId),
          sb().from('grupos')
            .select('id, nombre, descripcion, admin_id' + codCol + ', creado_en' + instCol)
            .eq('admin_id', usuarioId),
          sb().from('miembros_grupo').select('grupo_id'),
          sb().from('perfiles').select('grupo_id').eq('id', usuarioId).limit(1)
        ]);
        // PostgREST no lanza excepción: devuelve { data, error }. Si falta la
        // migración 040 (relación instituciones o columna codigo), lanzamos
        // para activar el fallback.
        const err = membresiasRes.error || adminRes.error || conteosRes.error || claseRes.error;
        if (err) throw err;
        // Conteo de miembros por clase (solo miembros_grupo, como el directorio
        // antiguo; los asignados por perfiles.grupo_id se ven en el detalle).
        const conteo = {};
        (conteosRes.data || []).forEach(m => { if (m && m.grupo_id) conteo[m.grupo_id] = (conteo[m.grupo_id] || 0) + 1; });

        const vistos = new Map();
        const poner = (g, rol) => {
          if (!g || !g.id || vistos.has(g.id)) return;
          vistos.set(g.id, {
            ...g,
            rol_en_grupo: rol || 'miembro',
            num_miembros: conteo[g.id] || 0
          });
        };
        (membresiasRes.data || []).forEach(m => {
          if (m && m.grupos) poner(m.grupos, m.rol_en_grupo);
        });
        (adminRes.data || []).forEach(g => poner(g, 'admin'));
        // Clase principal del perfil (puede no estar en miembros_grupo)
        const clase = claseRes.data && claseRes.data[0];
        if (clase && clase.grupo_id && !vistos.has(clase.grupo_id)) {
          const r = await sb().from('grupos')
            .select('id, nombre, descripcion, admin_id' + codCol + ', creado_en' + instCol)
            .eq('id', clase.grupo_id).limit(1);
          const g = r.data && r.data[0];
          if (g) poner(g, rolGrupoDesdeRol((await sb().from('perfiles').select('rol').eq('id', usuarioId).limit(1)).data?.[0]?.rol));
        }
        return [...vistos.values()]
          .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      };
      try {
        return await consultar(true);
      } catch (e) {
        // Migración 040 no aplicada (instituciones o codigo inexistentes):
        // reintentar sin el join ni el código para que el home siga
        // mostrando las clases existentes.
        if (!/instituciones|column grupos\.codigo does not exist/i.test((e && e.message) || '')) {
          console.warn('[Grupos] No se pudieron listar tus clases:', e.message);
          return [];
        }
        try {
          return await consultar(false);
        } catch (e2) {
          console.warn('[Grupos] No se pudieron listar tus clases:', e2.message);
          return [];
        }
      }
    },

    // ── Directorio público (legado) ───────────────────────────

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

    // Unirse a una clase con su código (RPC SECURITY DEFINER del lado
    // servidor: el código no se expone en el SELECT de grupos). Devuelve
    // el id de la clase.
    async unirseConCodigo(codigo) {
      if (!sb()) throw new Error('Sin conexión');
      const { data, error } = await sb().rpc('unirse_con_codigo', { p_codigo: String(codigo || '').trim() });
      if (error) throw _traducirErrorMigracion(error);
      return data;
    },

    async salirDeGrupo(grupoId, usuarioId) {
      if (!sb() || !grupoId || !usuarioId) return;
      try { await sb().from('miembros_grupo').delete()
        .eq('grupo_id', grupoId).eq('usuario_id', usuarioId); } catch (e) {}
    },

    // Miembros de una clase con la membresía UNIFICADA: solo miembros_grupo
    // (la migración 044 backfillea perfiles.grupo_id → miembros_grupo, así
    // que no hay que combinar dos fuentes).
    // Devuelve [{ ...perfil, rol_en_grupo, es_principal, miembro_desde }].
    async obtenerMiembrosDe(grupoId) {
      if (!sb() || !grupoId) return [];
      try {
        const { data } = await sb().from('miembros_grupo')
          .select('usuario_id, rol_en_grupo, es_principal, creado_en, perfiles!usuario_id(id, nombre_completo, username, rol, foto_perfil, ultimo_acceso, grupo_id)')
          .eq('grupo_id', grupoId);
        return (data || []).map(m => ({
          ...(m.perfiles || {}),
          rol_en_grupo: m.rol_en_grupo,
          es_principal: !!m.es_principal,
          miembro_desde: m.creado_en
        })).sort((a, b) => (a.nombre_completo || '').localeCompare(b.nombre_completo || ''));
      } catch (e) {
        console.warn('[Grupos] No se pudieron obtener miembros:', e.message);
        return [];
      }
    },

    // ── Solicitudes de admisión ────────────────────────────────

    // Solicitar ingreso a una clase. El owner entra directo (la RPC devuelve
    // { resultado: 'unido' }); el resto crea una solicitud pendiente de
    // aprobación del admin de la clase ({ resultado: 'solicitud' }).
    async solicitarIngreso(grupoId) {
      if (!sb() || !grupoId) throw new Error('Faltan datos');
      const { data, error } = await sb().rpc('solicitar_ingreso', { p_grupo_id: grupoId });
      if (error) throw error;
      return data;
    },

    // Solicitudes propias (para "Tus solicitudes de ingreso" en el home).
    async misSolicitudes(usuarioId) {
      if (!sb() || !usuarioId) return [];
      try {
        const { data } = await sb().from('solicitudes_grupo')
          .select('*, grupos!grupo_id(nombre)')
          .eq('usuario_id', usuarioId)
          .order('creado_en', { ascending: false });
        return data || [];
      } catch (e) {
        console.warn('[Grupos] No se pudieron listar tus solicitudes:', e.message);
        return [];
      }
    },

    // Solicitudes PENDIENTES de una clase (solo las ve el admin/owner).
    async solicitudesDeClase(grupoId) {
      if (!sb() || !grupoId) return [];
      try {
        const { data } = await sb().from('solicitudes_grupo')
          .select('*, perfiles!usuario_id(id, nombre_completo, username, foto_perfil, creado_en)')
          .eq('grupo_id', grupoId)
          .eq('estado', 'pendiente')
          .order('creado_en');
        return data || [];
      } catch (e) {
        console.warn('[Grupos] No se pudieron listar solicitudes:', e.message);
        return [];
      }
    },

    // Aprobar/rechazar una solicitud (RPC; solo admin de la clase u owner).
    async resolverSolicitud(solicitudId, aceptar) {
      if (!sb() || !solicitudId) throw new Error('Faltan datos');
      const { data, error } = await sb().rpc('resolver_solicitud', {
        p_solicitud_id: solicitudId,
        p_aceptar: !!aceptar
      });
      if (error) throw error;
      return !!data;
    },

    // ── Avisos de clase ────────────────────────────────────────

    // Avisos del muro de la clase (con el autor), más recientes primero.
    async listarAvisos(grupoId, limite = 50) {
      if (!sb() || !grupoId) return [];
      try {
        const { data } = await sb().from('avisos_grupo')
          .select('*, perfiles!autor_id(id, nombre_completo, username, foto_perfil)')
          .eq('grupo_id', grupoId)
          .order('creado_en', { ascending: false })
          .limit(limite);
        return data || [];
      } catch (e) {
        console.warn('[Grupos] No se pudieron listar avisos:', e.message);
        return [];
      }
    },

    async crearAviso(grupoId, contenido) {
      if (!sb() || !grupoId) throw new Error('Faltan datos');
      const { data, error } = await sb().rpc('crear_aviso', {
        p_grupo_id: grupoId,
        p_contenido: String(contenido || '').trim()
      });
      if (error) throw error;
      return data;
    },

    async eliminarAviso(avisoId) {
      if (!sb() || !avisoId) return false;
      const { data, error } = await sb().rpc('eliminar_aviso', { p_aviso_id: avisoId });
      if (error) throw error;
      return !!data;
    },

    // ── Estadísticas, progreso y actividad de la clase ─────────

    async estadisticasClase(grupoId) {
      if (!sb() || !grupoId) return null;
      try {
        const { data, error } = await sb().rpc('estadisticas_clase', { p_grupo_id: grupoId });
        if (error) throw error;
        return data;
      } catch (e) {
        console.warn('[Grupos] No se pudieron obtener estadísticas:', e.message);
        return null;
      }
    },

    // Progreso de estudio por miembro (capítulos completados).
    async progresoMiembros(grupoId) {
      if (!sb() || !grupoId) return [];
      try {
        const { data, error } = await sb().rpc('progreso_miembros', { p_grupo_id: grupoId });
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.warn('[Grupos] No se pudo obtener el progreso:', e.message);
        return [];
      }
    },

    // Historial de actividad de la clase (ingresos, solicitudes, avisos).
    async actividadClase(grupoId, limite = 20) {
      if (!sb() || !grupoId) return [];
      try {
        const { data } = await sb().from('actividad_grupo')
          .select('*, perfiles!actor_id(id, nombre_completo, username)')
          .eq('grupo_id', grupoId)
          .order('creado_en', { ascending: false })
          .limit(limite);
        return data || [];
      } catch (e) {
        console.warn('[Grupos] No se pudo listar la actividad:', e.message);
        return [];
      }
    }
  };
})();
