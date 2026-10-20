import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const css = read('css/05-componentes/_plataforma.css');
const vista = read('js/vistas/vista-examenes.js');

describe('«Más opciones» de exámenes: todas las opciones siempre alcanzables', () => {
  test('el menú abierto flota sobre las tarjetas siguientes', () => {
    // Sin esto, la tarjeta de debajo (con transform en :hover) pinta por
    // encima del desplegable y las últimas opciones quedan cortadas.
    expect(css).toContain('.adm-examen__mas[open]');
    const regla = css.slice(css.indexOf('.adm-examen__mas[open]'), css.indexOf('.adm-examen__mas[open]') + 120);
    expect(regla).toContain('z-index');
  });

  test('el menú nunca supera la altura de la ventana y desliza por dentro', () => {
    const bloque = css.slice(css.indexOf('.adm-examen__menu {'), css.indexOf('.adm-examen__menu {') + 900);
    expect(bloque).toContain('max-height');
    expect(bloque).toContain('overflow-y: auto');
  });

  test('existe la variante que abre el menú hacia arriba', () => {
    expect(css).toContain('.adm-examen__mas--arriba .adm-examen__menu');
    const regla = css.slice(
      css.indexOf('.adm-examen__mas--arriba .adm-examen__menu'),
      css.indexOf('.adm-examen__mas--arriba .adm-examen__menu') + 200
    );
    expect(regla).toContain('bottom:');
  });

  test('al abrir se voltea hacia arriba si no cabe debajo en la ventana', () => {
    expect(vista).toContain("details.adm-examen__mas");
    expect(vista).toContain("addEventListener('toggle'");
    expect(vista).toContain('adm-examen__mas--arriba');
    expect(vista).toContain('getBoundingClientRect().bottom');
    expect(vista).toContain('window.innerHeight');
  });

  test('en móvil (menú estático) no se voltea', () => {
    // El menú en flujo empuja el contenido y la página desliza: voltearlo
    // solo tendría sentido para el desplegable absoluto de escritorio.
    expect(vista).toContain("getComputedStyle(panel).position !== 'absolute'");
  });

  test('al cerrar se retira la variante hacia arriba', () => {
    expect(vista).toContain("if (!menu.open) { menu.classList.remove('adm-examen__mas--arriba'); return; }");
  });
});
