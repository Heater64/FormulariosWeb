import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function cargarRepositorio() {
  const codigo = readFileSync(join(root, 'js/datos/admin-repository.js'), 'utf8');
  new Function(codigo)();
}

describe('alcance del panel de administración', () => {
  test('el panel de admin no declara pestañas globales ni memorización', () => {
    const codigo = readFileSync(join(root, 'js/vistas/admin/vista-panel-admin.js'), 'utf8');
    const adminTabs = codigo.match(/const TABS_ADMIN = \[(.*?)\];/s)?.[1] || '';
    const ownerTabs = codigo.match(/const TABS_OWNER = \[(.*?)\];/s)?.[1] || '';

    expect(adminTabs).toContain("id: 'usuarios'");
    expect(adminTabs).toContain("id: 'examenes'");
    expect(adminTabs).not.toContain("id: 'memorizacion'");
    expect(adminTabs).not.toContain("id: 'grupos'");
    expect(ownerTabs).toContain("id: 'memorizacion'");
    expect(ownerTabs).toContain("id: 'sistema'");
  });

  test('las migraciones instalan helpers y creación Auth compatible', () => {
    const alcance = readFileSync(join(root, 'supabase/migraciones/041_alcance_panel_admin.sql'), 'utf8');
    // Sin comentarios SQL: el cuerpo de 042 no debe LLAMAR a auth.admin_create_user
    // (su comentario sí lo menciona al explicar por qué se abandonó).
    const auth = readFileSync(join(root, 'supabase/migraciones/042_fix_creacion_usuarios_auth.sql'), 'utf8').replace(/--[^\n]*/g, '');
    expect(alcance).toContain('CREATE OR REPLACE FUNCTION public.es_admin_de_clase()');
    expect(alcance).toContain('admin_listar_usuarios_clase');
    expect(alcance).toContain('admin_listar_examenes_clase');
    expect(alcance).toContain('admin_stats_clase');
    expect(alcance).toContain('CREATE POLICY "perfiles_lectura_alcance"');
    expect(auth).toContain('INSERT INTO auth.users');
    expect(auth).toContain('INSERT INTO auth.identities');
    expect(auth).not.toMatch(/v_uid\s*:=\s*auth\.admin_create_user/);
  });

  test('la migración de emails Auth evita el dominio reservado .local', () => {
    const sql = readFileSync(join(root, 'supabase/migraciones/043_auth_email_valido.sql'), 'utf8');
    expect(sql).toContain('@accounts.formsbiblicos.com');
    expect(sql).toContain('UPDATE auth.users');
    expect(sql).toContain('UPDATE auth.identities');
    expect(sql).not.toContain("v_email := v_base || '@formsbiblicos.local'");
  });

  test('las migraciones finales no reintroducen credenciales legacy ni borrado de auditoría', () => {
    const auth = readFileSync(join(root, 'supabase/migraciones/052_auth_sin_password_legacy.sql'), 'utf8');
    const auditoria = readFileSync(join(root, 'supabase/migraciones/051_admin_grupos_y_auditoria.sql'), 'utf8');
    expect(auth).toContain('ALTER TABLE public.perfiles DROP COLUMN IF EXISTS password');
    expect(auth).toContain('encrypted_password = extensions.crypt');
    expect(auth).not.toContain('v_perfil.password');
    expect(auditoria).toContain('ON DELETE SET NULL');
    expect(auditoria).toContain('admin_eliminar_grupo');
    expect(auditoria).not.toMatch(/DELETE FROM public\.auditoria|UPDATE public\.auditoria/);
  });

  test('las semillas no contienen contraseñas demo conocidas', () => {
    const semillas = [
      readFileSync(join(root, 'supabase/migraciones/002_seed_data.sql'), 'utf8'),
      readFileSync(join(root, 'esquema-consolidado.sql'), 'utf8')
    ].join('\\n');
    expect(semillas).not.toMatch(/owner123|admin123|editor123|alumno123/);
    expect(semillas).not.toContain('43a0d17178a9d26c9e0fe9a74b0b45e38d32f27aed887a008a54bf6e033bf7b9');
  });
});

describe('adminRepository consultas acotadas', () => {
  beforeEach(() => {
    global.window = global;
    global.window.supabaseClient = null;
    global.window.adminRepository = null;
    global.window.errores = { mensajeUsuario: (error) => error?.message || 'error' };
    cargarRepositorio();
  });

  test('un admin consulta usuarios mediante la RPC de su clase', async () => {
    const llamadas = [];
    global.window.supabaseClient = {
      rpc: async (nombre) => {
        llamadas.push(nombre);
        return { data: [{ id: 'alumno-1', grupo_id: 'clase-1' }], error: null };
      }
    };

    const data = await window.adminRepository.listarUsuarios({ id: 'admin-1', rol: 'admin', grupo_id: 'clase-1' });

    expect(data).toHaveLength(1);
    expect(llamadas).toEqual(['admin_listar_usuarios_clase']);
  });

  test('un admin obtiene estadísticas de su clase, no estadísticas globales', async () => {
    const llamadas = [];
    global.window.supabaseClient = {
      rpc: async (nombre) => {
        llamadas.push(nombre);
        return { data: { usuarios: 2, examenes: 1, porRol: { admin: 1, editor: 0, usuario: 1 } }, error: null };
      }
    };

    const stats = await window.adminRepository.statsGenerales({ id: 'admin-1', rol: 'admin', grupo_id: 'clase-1' });

    expect(stats.usuarios).toBe(2);
    expect(llamadas).toEqual(['admin_stats_clase']);
  });

  test('actualizarUsuario no reenvía el username si no cambió (evita colisión de email en auth)', async () => {
    const llamadas = { rpc: [], select: 0 };
    global.window.supabaseClient = {
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { username: 'admin1' }, error: null }) }) })
      }),
      rpc: async (nombre, params) => {
        llamadas.rpc.push({ nombre, params });
        return { data: null, error: null };
      }
    };

    // username sin cambios → el RPC recibe p_username: null (no toca auth.users)
    await window.adminRepository.actualizarUsuario('u-1', {
      nombre_completo: 'Admin Central', username: 'admin1', rol: 'admin', grupo_id: 'g-1', password: null
    });
    expect(llamadas.rpc[0].params.p_username).toBeNull();
    expect(llamadas.rpc[0].params.p_nombre_completo).toBe('Admin Central');
    expect(llamadas.rpc[0].params.p_grupo_id).toBe('g-1');
  });

  test('actualizarUsuario envía el username nuevo cuando sí cambió', async () => {
    const llamadas = [];
    global.window.supabaseClient = {
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { username: 'admin1' }, error: null }) }) })
      }),
      rpc: async (nombre, params) => {
        llamadas.push(params);
        return { data: null, error: null };
      }
    };

    await window.adminRepository.actualizarUsuario('u-1', {
      nombre_completo: 'Admin Central', username: 'admin2', rol: 'admin', grupo_id: 'g-1', password: null
    });
    expect(llamadas[0].p_username).toBe('admin2');
  });

  test('eliminarGrupo usa la RPC controlada y no modifica auditoría directamente', async () => {
    const llamadas = [];
    global.window.supabaseClient = {
      rpc: async (nombre, params) => {
        llamadas.push({ nombre, params });
        return { data: null, error: null };
      }
    };

    await window.adminRepository.eliminarGrupo('g-1');

    expect(llamadas).toEqual([{
      nombre: 'admin_eliminar_grupo',
      params: { p_grupo_id: 'g-1' }
    }]);
  });

  test('la ruta #!/admin del SPA redirige al panel standalone (no 404)', () => {
    const codigo = readFileSync(join(root, 'js/core/index.js'), 'utf8');
    expect(codigo).toContain("router.registrar('/admin'");
    expect(codigo).toContain('paginas/admin/panel-admin.html');
  });

  test('el panel refleja la papelera de exámenes (ver, restaurar, borrado suave/definitivo)', async () => {
    const codigo = readFileSync(join(root, 'js/vistas/admin/vista-panel-admin.js'), 'utf8');
    // Filtro y contador de archivados.
    expect(codigo).toContain('>En papelera</option>');
    expect(codigo).toContain('en papelera');
    // La papelera se restaura o se borra; no se edita ni se publica desde ella.
    expect(codigo).toContain('btn-restaurar-examen');
    expect(codigo).toContain('btn-eliminar-definitivo');
    expect(codigo).toContain("['borrador', 'cerrado'].includes(ex.estado)");
    // Eliminar mueve a la papelera, no borra en duro.
    expect(codigo).toContain('moverExamenAPapelera');
    expect(codigo).not.toContain('adminRepository.eliminarExamen(');
    // La página standalone carga el repositorio con la lógica de papelera.
    const html = readFileSync(join(root, 'paginas/admin/panel-admin.html'), 'utf8');
    expect(html).toContain('js/datos/examenes-repository.js');

    // Delegación: mismos métodos y auditoría que en Mis exámenes.
    const llamadas = [];
    global.window.supabaseClient = {};
    global.window.examenesRepository = {
      moverAPapelera: async (id) => { llamadas.push(['mover', id]); return { id }; },
      restaurar: async (id) => { llamadas.push(['restaurar', id]); return { id }; },
      eliminarDefinitivo: async (id) => { llamadas.push(['definitivo', id]); return { id }; }
    };
    await window.adminRepository.moverExamenAPapelera('ex-1');
    await window.adminRepository.restaurarExamen('ex-1');
    await window.adminRepository.eliminarExamenDefinitivo('ex-1');
    expect(llamadas).toEqual([['mover', 'ex-1'], ['restaurar', 'ex-1'], ['definitivo', 'ex-1']]);
    delete global.window.examenesRepository;
  });

  test('la pestaña Usuarios muestra solo el buscador, sin pills de filtro', () => {
    const codigo = readFileSync(join(root, 'js/vistas/admin/vista-panel-admin.js'), 'utf8');
    expect(codigo).toContain('id="buscarUsuarios"');
    expect(codigo).not.toContain('id="filtroRolUsuarios"');
    expect(codigo).not.toContain('id="filtroGrupoUsuarios"');
    expect(codigo).not.toContain('id="filtroEstadoUsuarios"');
    expect(codigo).not.toContain('id="ordenUsuarios"');
  });

  test('la pantalla Cuenta expone el acceso al Centro de Administración (solo admin/owner)', () => {
    const codigo = readFileSync(join(root, 'js/vistas/vista-cuenta.js'), 'utf8');
    // Misma tarjeta de acceso rápido que en Perfil (mismo tema y organización).
    expect(codigo).toContain('perfil-boton-seccion');
    expect(codigo).toContain('btnPanelAdmin');
    expect(codigo).toContain("['admin', 'owner'].includes(rol)");
    expect(codigo).toContain("router.navegar('/admin?origen=cuenta')");
  });

  test('el panel standalone vuelve al origen (cuenta o perfil, sin redirección abierta)', () => {
    const html = readFileSync(join(root, 'paginas/admin/panel-admin.html'), 'utf8');
    expect(html).toContain("_origen === 'perfil' ? 'perfil' : 'cuenta'");
    expect(html).toContain("'../../index.html#!/' + _destino");
  });

  test('la página standalone aplica el tema y ajustes del usuario como el SPA', () => {
    const html = readFileSync(join(root, 'paginas/admin/panel-admin.html'), 'utf8');
    expect(html).toContain('js/core/theme-init.js');
    expect(html).toContain('js/utilidades/preferencias.js');
    expect(html).toContain('window.preferencias');
    expect(html).toContain('.aplicar()');
  });

  test('la página standalone reenvía el query (?tab=) al montar el panel', () => {
    const html = readFileSync(join(root, 'paginas/admin/panel-admin.html'), 'utf8');
    expect(html).toContain('new URLSearchParams(window.location.search)');
    expect(html).toContain('montar(document.getElementById');
    expect(html).toContain('{ query }');
  });

  test('el panel no expone borrado de auditoría tras hacerla inmutable', () => {
    const codigo = readFileSync(join(root, 'js/vistas/admin/vista-panel-admin.js'), 'utf8');
    expect(codigo).not.toContain('limpiar-auditoria');
  });

  test('crearUsuario envía nombre, username, contraseña manual, rol y grupo a la RPC', async () => {
    const llamadas = [];
    global.window.supabaseClient = {
      rpc: async (nombre, params) => {
        llamadas.push({ nombre, params });
        return { data: 'nuevo-id', error: null };
      }
    };

    const resultado = await window.adminRepository.crearUsuario({
      nombre_completo: 'Ana Pérez',
      username: 'ana.2024',
      password: 'Secreta123',
      rol: 'usuario',
      grupo_id: 'clase-1'
    });

    expect(resultado).toEqual({ id: 'nuevo-id' });
    expect(llamadas).toEqual([{
      nombre: 'admin_crear_usuario',
      params: {
        p_nombre_completo: 'Ana Pérez',
        p_username: 'ana.2024',
        p_password: 'Secreta123',
        p_rol: 'usuario',
        p_grupo_id: 'clase-1'
      }
    }]);
  });

  test('crearUsuario traduce el username duplicado y el rechazo por falta de clase', async () => {
    global.window.supabaseClient = {
      rpc: async () => ({ data: null, error: { message: 'Ese nombre de usuario ya existe' } })
    };
    await expect(window.adminRepository.crearUsuario({
      nombre_completo: 'Ana', username: 'ana.2024', password: 'Secreta123', rol: 'usuario', grupo_id: 'clase-1'
    })).rejects.toThrow('Ese nombre de usuario ya existe.');

    global.window.supabaseClient = {
      rpc: async () => ({ data: null, error: { message: 'No autorizado: solo el owner o el admin de una clase' } })
    };
    await expect(window.adminRepository.crearUsuario({
      nombre_completo: 'Ana', username: 'ana.2024', password: 'Secreta123', rol: 'usuario', grupo_id: null
    })).rejects.toThrow(/clase asignada/);
  });

  test('el formulario de crear usuario fija el grupo del admin y exige contraseña manual válida', () => {
    const codigo = readFileSync(join(root, 'js/vistas/admin/vista-panel-admin.js'), 'utf8');
    // Grupo forzado a la clase del admin (no se puede elegir otra).
    expect(codigo).toContain('const grupoAdmin = esAdminClase ? (usuario.grupo_id || null) : null');
    expect(codigo).toContain('const grupoId = esAdminClase ? grupoAdmin : (datos.grupo_id || null)');
    // Sin clase asignada: aviso explicativo en vez de fallo silencioso.
    expect(codigo).toContain('aún no tiene clase asignada');
    // Contraseña manual con el mismo mínimo que el resto de la app.
    expect(codigo).toContain('_validarPasswordManual');
    expect(codigo).toContain('Mínimo 8 caracteres, letras y números');
    // La confirmación muestra quién se creó sin re-mostrar la clave.
    expect(codigo).toContain('Ya puede iniciar sesión con la contraseña que le diste');
  });
});
