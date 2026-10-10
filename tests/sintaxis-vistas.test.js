import { describe, it, expect } from 'vitest';
import { transformSync } from 'esbuild';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Guard de sintaxis: los módulos JS de la app deben parsear con esbuild,
// el mismo parser que el build usa para minificar. Los tests de este repo
// no importan las vistas directamente, así que una rotación de sintaxis en
// un módulo NO rompe ningún test pero SÍ rompe la app en el navegador
// (visto: vista-examen-editor.js quedó con bloques duplicados y una doble
// cerradura; los 335 tests seguían en verde mientras la vista no cargaba
// y el build sólo emitía un warning que no fallaba el proceso).

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

function listarJs(dir, excluidos = []) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    const rel = relative(raiz, ruta).replaceAll('\\', '/');
    if (excluidos.includes(rel)) continue;
    if (statSync(ruta).isDirectory()) out.push(...listarJs(ruta, excluidos));
    else if (entrada.endsWith('.js')) out.push(ruta);
  }
  return out;
}

const archivos = [
  // js/vendor son libs de terceros ya minificadas y verificadas por su autor.
  ...listarJs(join(raiz, 'js'), ['js/vendor']),
  ...listarJs(join(raiz, 'public-site')),
  ...listarJs(join(raiz, 'public')),
];

describe('Guard de sintaxis de los módulos JS', () => {
  it('el alcance cubre los módulos reales de la app', () => {
    expect(archivos.length).toBeGreaterThan(30);
    expect(archivos.some((r) => r.endsWith('vista-examen-editor.js'))).toBe(true);
  });

  it('todos los módulos de js/, public-site/ y public/ parsean con esbuild', () => {
    const rotos = [];
    for (const ruta of archivos) {
      try {
        transformSync(readFileSync(ruta, 'utf8'), { loader: 'js', target: 'es2020' });
      } catch (error) {
        const primeraLinea = String(error.message).split('\n')[0];
        rotos.push(`${relative(raiz, ruta).replaceAll('\\', '/')}: ${primeraLinea}`);
      }
    }
    expect(rotos, `módulos con sintaxis inválida:\n${rotos.join('\n')}`).toEqual([]);
  });

  it('el detector sí falla ante sintaxis inválida (no es un check vacío)', () => {
    expect(() => transformSync('(function () { , ;', { loader: 'js' })).toThrow();
    expect(() => transformSync('const a = ;', { loader: 'js' })).toThrow();
  });
});
