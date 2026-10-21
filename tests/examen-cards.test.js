import { describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const fuenteVista = read('js/vistas/vista-examenes.js');

function crearVista(window = {}, router = { navegar: vi.fn() }) {
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
  return new Function('window', 'router', `${fuenteVista}\nreturn window.vistaExamenes;`)(window, router);
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

  test('«Editar» pide confirmación antes de salir del listado', async () => {
    let confirmada = false;
    const router = { navegar: vi.fn() };
    const vista = crearVista({
      helpers: {
        confirmarEdicion: async () => confirmada
      }
    }, router);

    // Cancelar (valor por defecto) no navega…
    await vista._accion('editar', 'ex-9', 'Repaso');
    expect(router.navegar).not.toHaveBeenCalled();

    // …aceptar abre el editor de ese examen.
    confirmada = true;
    await vista._accion('editar', 'ex-9', 'Repaso');
    expect(router.navegar).toHaveBeenCalledWith('/editor/ex-9');
  });

  test('las demás acciones no pasan por la confirmación de edición', async () => {
    const vistas = [];
    const router = { navegar: vi.fn() };
    const vista = crearVista({
      helpers: {
        confirmarEdicion: async () => { vistas.push('editar'); return true; },
        confirmar: async () => true
      }
    }, router);

    await vista._accion('entregas', 'ex-9', 'Repaso');
    expect(router.navegar).toHaveBeenCalledWith('/corregir/ex-9');
    expect(vistas).toEqual([]);
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
    const plantillaFila = fuente.slice(fuente.indexOf('function tarjetaExamen'), fuente.indexOf('function htmlLista'));

    // Dos ramas, una acción por cada una: "Corregir" cuando hay entregas sin
    // corregir y "Entregas" cuando el examen está al día. Nunca ambas.
    expect((plantillaFila.match(/data-ir="\/corregir\//g) || []).length).toBe(2);
    expect(plantillaFila).toContain('porCorregir > 0');
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

  test('«Limpiar campos» lleva contorno rojo en su fila, sin relleno', () => {
    const css = read('css/05-componentes/_plataforma.css');
    const fila = '.adm-edicion__acciones .adm-btn--peligro';

    // El botón conserva el estilo de peligro del panel…
    expect(fuenteVista).toContain('adm-btn adm-btn--peligro adm-btn--pequeno" id="btnVaciarComunitario"');

    // …y su fila le da el contorno rojo pleno, sin tocar el fondo.
    const regla = css.slice(css.indexOf(fila + ' {'), css.indexOf(fila + ':hover'));
    expect(regla).toContain('border-color: var(--color-error)');
    expect(regla).not.toContain('background');
    expect(css).toContain(fila + ':hover');

    // El peligro suave se reserva al resto de la app: la variante base no cambia.
    const base = css.slice(css.indexOf('.adm-btn--peligro {'), css.indexOf('.adm-btn--peligro:hover'));
    expect(base).toContain('var(--color-error-soft)');
  });
});

describe('riel de filtros con píldora deslizante', () => {
  // Marcado mínimo del riel: el indicador es lo único que la vista coloca a mano.
  function crearRiel() {
    const transiciones = [];
    const indicador = {
      dataset: {},
      offsetWidth: 0,
      style: { set transition(valor) { transiciones.push(valor); } }
    };
    const activo = { offsetLeft: 208, offsetTop: 0, offsetWidth: 104, offsetHeight: 48 };
    const tabs = {
      querySelector: (sel) => (sel === '.adm-tabs__indicador' ? indicador : (sel === '.adm-tab--activo' ? activo : null))
    };
    return { tabs, indicador, activo, transiciones };
  }

  test('el riel de «Mis exámenes» lleva el indicador y la vista lo pinta', () => {
    expect(fuenteVista).toContain('<div class="adm-tabs adm-tabs--deslizante" id="tabs" role="tablist">');
    expect(fuenteVista).toContain('<span class="adm-tabs__indicador" aria-hidden="true"></span>');
    // El indicador se coloca al pintar, al cambiar de filtro y al redimensionar.
    expect((fuenteVista.match(/recolocarIndicador\(\);/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(fuenteVista).toContain("window.addEventListener('resize', recolocarIndicador)");
    expect(fuenteVista).toContain("window.removeEventListener('resize', this._recolocarIndicador)");
  });

  test('coloca la píldora sobre el filtro activo con la geometría real', () => {
    const { tabs, indicador, activo, transiciones } = crearRiel();
    crearVista()._colocarIndicador(tabs);

    expect(indicador.style.width).toBe('104px');
    expect(indicador.style.height).toBe('48px');
    expect(indicador.style.transform).toBe('translate(208px, 0px)');
  });

  test('el primer salto no se anima; los siguientes sí', () => {
    const { tabs, indicador, activo, transiciones } = crearRiel();
    const vista = crearVista();

    // Primera colocación: transición apagada y devuelta en el mismo tick, para
    // que la píldora no se vea llegar desde la esquina al abrir la vista.
    vista._colocarIndicador(tabs);
    expect(transiciones).toEqual(['none', '']);
    expect(indicador.dataset.colocado).toBe('1');

    // Cambio de filtro: solo cambia la posición, la transición queda intacta.
    transiciones.length = 0;
    activo.offsetLeft = 0;
    activo.offsetWidth = 80;
    vista._colocarIndicador(tabs);
    expect(transiciones).toEqual([]);
    expect(indicador.style.transform).toBe('translate(0px, 0px)');
    expect(indicador.style.width).toBe('80px');
  });

  test('sigue al filtro cuando los filtros envuelven a otra línea', () => {
    const { tabs, indicador, activo } = crearRiel();
    const vista = crearVista();
    vista._colocarIndicador(tabs);

    // En pantallas estrechas «Cerrados» cae a la segunda fila.
    activo.offsetLeft = 96;
    activo.offsetTop = 52;
    vista._colocarIndicador(tabs);
    expect(indicador.style.transform).toBe('translate(96px, 52px)');
  });

  test('sin activo o sin riel no revienta', () => {
    const vista = crearVista();
    expect(() => vista._colocarIndicador(null)).not.toThrow();
    expect(() => vista._colocarIndicador({ querySelector: () => null })).not.toThrow();
  });

  test('la píldora se mueve, y el estilo del activo no cambia en los demás rieles', () => {
    const css = read('css/05-componentes/_plataforma.css');

    const indicador = css.slice(css.indexOf('.adm-tabs__indicador {'), css.indexOf('.adm-tabs__indicador {') + 700);
    expect(indicador).toContain('position: absolute');
    expect(indicador).toContain('transition: transform var(--transicion-normal)');
    expect(indicador).toContain('pointer-events: none');

    // El fondo del botón se apaga solo en la variante deslizante…
    const inicio = css.indexOf('.adm-tabs--deslizante {');
    const variante = css.slice(inicio, css.indexOf('@media (hover: hover)', inicio));
    expect(variante).toMatch(/\.adm-tabs--deslizante \.adm-tab \{[^}]*background: transparent;/);
    expect(variante).toContain('z-index: 1');

    // …y los otros rieles (p. ej. el tema en Cuenta) conservan su píldora: la
    // regla base del activo sigue intacta por delante de la variante.
    const base = css.slice(css.indexOf('.adm-tab--activo {'), inicio);
    expect(base).toContain('background: var(--color-fondo-tarjeta)');
    expect(base).toContain('box-shadow: var(--sombra-sm)');

    // Con movimiento reducido la píldora salta sin animación.
    const sinMovimiento = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    expect(sinMovimiento.slice(0, 300)).toContain('.adm-tabs__indicador,');
  });
});
