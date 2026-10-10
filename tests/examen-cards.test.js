import { describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const fuenteVista = read('js/vistas/vista-examenes.js');

function crearVista(window = {}) {
  window.panelUI = {
    esc: (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]),
    numero: (value) => String(value),
    tiempoRelativo: () => 'ahora'
  };
  return new Function('window', 'router', `${fuenteVista}\nreturn window.vistaExamenes;`)(window, { navegar: vi.fn() });
}

describe('tarjetas de exámenes', () => {
  test('ofrece enlaces, edición, entregas y una acción clara para corregir pendientes', () => {
    const html = crearVista()._tarjeta({
      id: 'ex-1', titulo: 'Evaluación inicial', estado: 'publicado',
      por_corregir: 3, num_preguntas: 8, puntos_totales: 10,
      num_enlaces: 12, enlaces_usados: 7, num_entregas: 7, actualizado_en: '2026-10-10'
    });

    expect(html).toContain('aria-label="Evaluación inicial"');
    expect(html).toContain('data-accion="compartir"');
    expect(html).toContain('Gestionar enlaces');
    expect(html).toContain('data-accion="editar"');
    expect(html).toContain('data-accion="entregas"');
    expect(html).toContain('Entregas · 3 por corregir');
    expect(html).toContain('data-accion="cerrar"');
    expect(html).toContain('Cerrar examen');
    expect(html).toContain('<article class="adm-fila adm-examen"');
    expect(html).not.toContain('data-accion="compartir-opciones"');
    expect(html).not.toContain('data-accion="mas"');
  });

  test('agrupa duplicar y eliminar en opciones expandibles y solo ofrece publicar al borrador', () => {
    const html = crearVista()._tarjeta({
      id: 'draft-1', titulo: 'Borrador', estado: 'borrador',
      por_corregir: 0, num_preguntas: 0, puntos_totales: 0,
      num_enlaces: 0, enlaces_usados: 0, num_entregas: 0
    });

    expect(html).toContain('<details');
    expect(html).toContain('aria-label="Más opciones para Borrador"');
    expect(html).toContain('data-accion="duplicar"');
    expect(html).toContain('data-accion="eliminar"');
    expect(html).toContain('data-accion="publicar"');
    expect(html).toContain('>Publicar</button>');
    expect(html).not.toContain('data-accion="cerrar"');
    expect(html).not.toContain('data-accion="compartir-opciones"');
    expect(html).not.toContain('data-accion="mas"');
  });

  test('permite reabrir exámenes cerrados con una confirmación explícita', async () => {
    const llamadas = [];
    const vista = crearVista({
      helpers: {
        confirmar: async (mensaje, opciones) => {
          llamadas.push({ mensaje, opciones });
          return false;
        }
      }
    });
    vista._examenes = [{ id: 'closed-1', estado: 'cerrado' }];

    await vista._accion('publicar', 'closed-1', 'Cerrado');
    expect(llamadas[0].opciones.titulo).toBe('¿Reabrir este examen?');
    expect(llamadas[0].opciones.textoConfirmar).toBe('Reabrir');
    expect(llamadas[0].mensaje).toContain('volverá a admitir entregas');
  });

  test('escapa el título tanto en texto como en atributos', () => {
    const html = crearVista()._tarjeta({
      id: 'ex-2', titulo: 'Examen "A&B"', estado: 'cerrado',
      por_corregir: 0, num_preguntas: 1, puntos_totales: 1,
      num_enlaces: 0, enlaces_usados: 0, num_entregas: 0
    });

    expect(html).toContain('aria-label="Examen &quot;A&amp;B&quot;"');
    expect(html).toContain('data-titulo="Examen &quot;A&amp;B&quot;"');
    expect(html).toContain('Examen &quot;A&amp;B&quot;');
  });
});
