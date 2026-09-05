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
});
