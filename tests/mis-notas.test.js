// ============================================================================
// tests/mis-notas.test.js — Inicio del alumno (vista-mis-notas)
// Contrato de estados: sin datos SIEMPRE hay pantalla (empty-state con
// acción), nunca un error técnico en la UI, y una fuente caída no tumba la
// otra.
// ============================================================================
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const codigo = readFileSync(join(root, 'js/vistas/vista-mis-notas.js'), 'utf8');

describe('vista Mis notas (inicio del alumno)', () => {
  test('todo estado sin datos es una pantalla empty-state, no un error técnico', () => {
    expect(codigo).toContain('class="empty-state');
    expect(codigo).toContain('empty-state__titulo');
    // Sin sesión: pantalla con acceso al login.
    expect(codigo).toContain('Inicia sesión para ver tus notas');
    expect(codigo).toContain('btn-ir-login');
    // Fallo total de carga: pantalla propia con reintento.
    expect(codigo).toContain('No pudimos cargar tus notas');
    expect(codigo).toContain('btn-reintentar-notas');
    // El error técnico no se vuelca a la UI.
    expect(codigo).not.toMatch(/No se pudieron cargar tus notas:\s*\$\{/);
  });

  test('las fuentes cargan por separado: una caída no deja la pantalla en blanco', () => {
    expect(codigo).toContain('Promise.allSettled');
    expect(codigo).not.toContain('Promise.all(');
    // Cada sección degradada tiene su propia pantalla con reintento.
    expect(codigo).toContain('No se pudieron cargar tus exámenes');
    expect(codigo).toContain('No se pudieron cargar tus evaluaciones');
  });

  test('el detalle técnico se registra para diagnóstico', () => {
    expect(codigo).toContain('window.errores.registrar');
    expect(codigo).toContain("'mis-notas:examenes'");
    expect(codigo).toContain("'mis-notas:evaluaciones'");
  });

  test('el reintento vuelve a montar la vista sin APIs privadas del router', () => {
    expect(codigo).not.toContain('router._ejecutar');
    expect(codigo).toContain('window.vistaMisNotas.montar(raiz)');
  });
});
