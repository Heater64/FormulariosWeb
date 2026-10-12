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
  // La vista pinta iconos Lucide en las acciones y la cabecera.
  window.Iconos = {
    render: (nombre) => `<i data-lucide="${nombre}"></i>`,
    actualizar() {}
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
    // El botón de publicar lleva su icono Lucide y su etiqueta.
    expect(html).toMatch(/data-accion="publicar"[^>]*>[\s\S]*?data-lucide="upload"/);
    expect(html).toContain('Publicar</button>');
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

  test('las acciones visibles se limitan a enlaces y edición; el resto vive en Más opciones', () => {
    const html = crearVista()._tarjeta({
      id: 'ex-3', titulo: 'Repaso', estado: 'publicado',
      por_corregir: 2, num_preguntas: 4, puntos_totales: 5,
      num_enlaces: 3, enlaces_usados: 3, num_entregas: 3, actualizado_en: '2026-10-10'
    });

    const principales = html.slice(html.indexOf('adm-examen__acciones-principales'), html.indexOf('<details'));
    const menu = html.slice(html.indexOf('adm-examen__menu'));

    expect(principales).toContain('Gestionar enlaces');
    expect(principales).toContain('Editar');
    expect(principales).not.toContain('Entregas');
    expect(principales).not.toContain('Cerrar examen');
    expect(principales).not.toContain('Duplicar');

    expect(menu).toContain('Entregas · 2 por corregir');
    expect(menu).toContain('Cerrar examen');
    expect(menu).toContain('Duplicar como borrador');
    expect(menu).toContain('Eliminar examen');

    // Cada acción se reconoce por su icono Lucide.
    for (const icono of ['link', 'edit-3', 'more-horizontal', 'chevron-down', 'inbox', 'lock', 'copy', 'trash-2']) {
      expect(html).toContain(`data-lucide="${icono}"`);
    }
  });

  test('las filas del panel ofrecen UNA acción de entrega, no dos botones iguales', () => {
    const fuente = read('js/vistas/vista-panel.js');
    const plantillaFila = fuente.slice(fuente.indexOf('function filaExamen'), fuente.indexOf('window.vistaPanel'));

    // Dos ramas, una acción por cada una: "Corregir" en pendientes o
    // "Entregas" en la lista general. Nunca ambas en la misma fila.
    expect((plantillaFila.match(/data-ir="\/corregir\//g) || []).length).toBe(2);
    expect(plantillaFila).toContain("contexto === 'pendientes'");
    expect(plantillaFila).toContain(' Corregir</button>');
    expect(plantillaFila).toContain(' Entregas</button>');
    // Regresión del bug: la fila ya no acumula "Corregir" condicional Y un
    // "Entregas" fijo apuntando a la misma ruta.
    expect(plantillaFila).not.toMatch(/porCorregir > 0\s*\?\s*`<button[^`]*\/corregir/);
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

describe('modal de enlaces comunitario', () => {
  test('ofrece la URL completa, no una clave suelta, y la comparte entera', () => {
    // Regresión: el modal mostraba '/e/' + token (ruta relativa que no se puede
    // pulsar ni compartir) y el mensaje de WhatsApp salía sin el enlace.
    expect(fuenteVista).toContain('window.plataformaRepository.urlEnlace(token)');
    expect(fuenteVista).not.toContain("'/e/' + token");
    // El mensaje de WhatsApp termina en la URL: nada de texto sobrante detrás.
    expect(fuenteVista).toContain("+ titulo + ':\\n'");
    expect(fuenteVista).toContain('+ clave.textContent;');
    expect(fuenteVista).not.toContain('Cada alumno abre el enlace');
    // Al abrir, el modal muestra el estado real (clave + individuales):
    // recargar debe invocarse al crear el modal, no solo tras «Generar».
    const modal = fuenteVista.slice(
      fuenteVista.indexOf('async _modalEnlaceComunitario'),
      fuenteVista.indexOf('async _modalEnlaces')
    );
    expect((modal.match(/await recargar\(\);/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
