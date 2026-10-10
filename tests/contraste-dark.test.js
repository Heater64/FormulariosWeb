import { describe, it, expect } from 'vitest';

// Contraste WCAG (relación de luminancia). Documenta la paleta oscura:
// el acento y los estados usan tonos luminosos sobre superficies profundas,
// mientras que el texto sobre rellenos de acción usa un azul carbón oscuro.
function luminancia(hex) {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const r = f(parseInt(hex.slice(1, 3), 16));
  const g = f(parseInt(hex.slice(3, 5), 16));
  const b = f(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe('Contraste AA en modo oscuro (texto sobre relleno de acento)', () => {
  const ACENTO_DARK = '#3B82F6';
  const ACENTO_HOVER_DARK = '#60A5FA';
  const TEXTO_DARK = '#0C0A09'; // --color-texto-acento en oscuro

  it('blanco sobre el acento oscuro NO cumple AA (motivo del cambio)', () => {
    expect(contraste('#FFFFFF', ACENTO_DARK)).toBeLessThan(4.5);
  });

  it('texto oscuro sobre el acento oscuro cumple AA (≥4.5:1)', () => {
    expect(contraste(TEXTO_DARK, ACENTO_DARK)).toBeGreaterThanOrEqual(4.5);
  });

  it('texto oscuro sobre el hover del acento oscuro cumple AA', () => {
    expect(contraste(TEXTO_DARK, ACENTO_HOVER_DARK)).toBeGreaterThanOrEqual(4.5);
  });

  it('los estados semánticos luminosos admiten texto oscuro', () => {
    expect(contraste(TEXTO_DARK, '#4ADE80')).toBeGreaterThanOrEqual(4.5);
    expect(contraste(TEXTO_DARK, '#F87171')).toBeGreaterThanOrEqual(4.5);
    expect(contraste(TEXTO_DARK, '#FBBF24')).toBeGreaterThanOrEqual(4.5);
    expect(contraste(TEXTO_DARK, '#72D4FF')).toBeGreaterThanOrEqual(4.5);
  });

  it('texto oscuro sobre los colores de mazo de memorización cumple AA', () => {
    const mazos = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#84CC16'];
    for (const c of mazos) {
      expect(contraste(TEXTO_DARK, c)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('texto oscuro sobre los fundamentos de los temas de cuestionarios cumple AA', () => {
    const fondos = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#84CC16'];
    for (const c of fondos) {
      expect(contraste(TEXTO_DARK, c)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('el botón de acción sobre el fondo de acento cumple AA', () => {
    const accion = '#3B82F6';
    expect(contraste(TEXTO_DARK, accion)).toBeGreaterThanOrEqual(4.5);
  });

  it('el texto sobre el botón de acción en hover cumple AA', () => {
    const hover = '#60A5FA';
    expect(contraste(TEXTO_DARK, hover)).toBeGreaterThanOrEqual(4.5);
  });

  it('el texto oscuro sobre el verde semáforo A4C200 cumple AA', () => {
    expect(contraste(TEXTO_DARK, '#4ADE80')).toBeGreaterThanOrEqual(4.5);
  });

  it('el texto oscuro sobre el verde semáforo A4C200 cumple AA', () => {
    expect(contraste(TEXTO_DARK, '#A4C200')).toBeGreaterThanOrEqual(4.5);
  });

  it('el texto oscuro sobre el azul neón 00FFFF cumple AA', () => {
    expect(contraste(TEXTO_DARK, '#00FFFF')).toBeGreaterThanOrEqual(4.5);
  });

  it('el texto oscuro sobre el verde neón 00FF00 cumple AA', () => {
    expect(contraste(TEXTO_DARK, '#00FF00')).toBeGreaterThanOrEqual(4.5);
  });

  it('el texto oscuro sobre el magenta neón FF00FF cumple AA', () => {
    expect(contraste(TEXTO_DARK, '#FF00FF')).toBeGreaterThanOrEqual(4.5);
  });

  it('el texto oscuro sobre el cyan neón FF00FF cumple AA', () => {
    expect(contraste(TEXTO_DARK, '#FF00FF')).toBeGreaterThanOrEqual(4.5);
  });

  it('el texto oscuro sobre el violeta brillante 8A2BE2 NO cumple AA (debe usarse tono más luminoso)', () => {
    expect(contraste(TEXTO_DARK, '#8A2BE2')).toBeLessThan(4.5);
  });

  it('el texto oscuro sobre el borde de enlace #93C5FD cumple AA', () => {
    expect(contraste(TEXTO_DARK, '#93C5FD')).toBeGreaterThanOrEqual(4.5);
  });
});
