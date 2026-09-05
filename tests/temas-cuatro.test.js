import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function luminancia(hex) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(parseInt(hex.slice(1,3),16)) + 0.7152 * f(parseInt(hex.slice(3,5),16)) + 0.0722 * f(parseInt(hex.slice(5,7),16));
}
const contraste = (a,b) => { const [l1,l2]=[luminancia(a),luminancia(b)].sort((x,y)=>y-x); return (l1+0.05)/(l2+0.05); };
describe('4 temas: tokens', () => {
  test('existen los overrides umbra por data-tema (data-theme intacto)', () => {
    const css = read('css/00-settings/_tokens.css');
    for (const s of ['[data-tema="umbra-claro"]','[data-tema="umbra-oscuro"]']) expect(css).toContain(s);
    expect(css).toContain('[data-theme="dark"]');
  });
  test('umbra claro: frambuesa sobre blanco pasa AA', () => {
    expect(contraste('#c2185b','#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
  test('umbra oscuro usa coral y fondo casi negro', () => {
    const css = read('css/00-settings/_tokens.css');
    expect(css).toContain('#e8735a');
    expect(css).toContain('#0a0a0c');
  });
  test('preferencias.js normaliza legacy y acepta los 4 ids', () => {
    const js = read('js/utilidades/preferencias.js');
    for (const s of ['umbra-claro','umbra-oscuro','clasico-claro','clasico-oscuro']) expect(js).toContain(s);
    expect(js).toContain('claro');
  });
  test('theme-init, public theme y login escriben dual atributo (comportamiento, no literales)', () => {
    for (const f of ['js/core/theme-init.js','public-site/theme.js','login.html','js/utilidades/preferencias.js']) {
      const src = read(f);
      expect(src).toContain('dataset.tema');
      expect(src).toContain('aplicarTema');
    }
    expect(read('js/core/theme-init.js')).toContain('dataset.theme');
  });
  test('apariencia ofrece grid 2x2 con los 4 temas + auto', () => {
    const v = read('js/vistas/vista-perfil.js');
    for (const s of ['tema-grid','umbra-claro','umbra-oscuro','clasico-claro','clasico-oscuro','data-tema="auto"']) expect(v).toContain(s);
    expect(read('css/05-componentes/_perfil.css')).toContain('.tema-card');
  });
  test('arranque y wizard usan el esquema de 4 temas', () => {
    const idx = read('js/core/index.js');
    for (const s of ['umbra-claro', 'umbra-oscuro', 'clasico-claro', 'clasico-oscuro']) expect(idx).toContain(s);
    expect(idx).toContain('dataset.tema');
    expect(idx).not.toContain("(tema === 'light' || tema === 'dark') ? tema : null");
    expect(read('js/vistas/vista-perfil.js')).toContain('Temas Umbra y Clásico');
  });
});
