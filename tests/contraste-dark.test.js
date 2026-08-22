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
  const ACENTO_DARK = '#7DB7FF';
  const ACENTO_HOVER_DARK = '#A8D1FF';
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
    expect(contraste(TEXTO_DARK, '#5FE0A0')).toBeGreaterThanOrEqual(4.5);
    expect(contraste(TEXTO_DARK, '#FF8A92')).toBeGreaterThanOrEqual(4.5);
    expect(contraste(TEXTO_DARK, '#FFD166')).toBeGreaterThanOrEqual(4.5);
    expect(contraste(TEXTO_DARK, '#72D4FF')).toBeGreaterThanOrEqual(4.5);
  });

  it('texto oscuro sobre los colores de mazo de memorización cumple AA', () => {
    const mazos = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#84CC16'];
    for (const c of mazos) {
      expect(contraste(TEXTO_DARK, c)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
