import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const migrationPath = join(root, 'supabase', 'migraciones', '070_cuentas_aisladas_y_admin_con_clase.sql');
const adminViewPath = join(root, 'js', 'vistas', 'admin', 'vista-panel-admin.js');

function migration() {
  return readFileSync(migrationPath, 'utf8');
}

describe('aislamiento de cuentas y administración por clase', () => {
  test('existe una migración que impide admins sin clase asignada', () => {
    expect(existsSync(migrationPath)).toBe(true);
    expect(migration()).toContain("p_rol = 'admin' AND p_grupo_id IS NULL");
    expect(migration()).toContain("p_rol = 'admin' AND v_objetivo_grupo IS NULL");
  });

  test('las notas de sesión y personales solo admiten a su propietario', () => {
    const sql = migration();
    expect(sql).toContain('usuario_id = auth.uid()');
    expect(sql).not.toContain('usuario_id = auth.uid() OR public.es_owner()');
  });

  test('el formulario evita crear un administrador sin clase', () => {
    expect(readFileSync(adminViewPath, 'utf8')).toContain("datos.rol === 'admin' && !grupoId");
  });
});
