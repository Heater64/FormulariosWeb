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
});
