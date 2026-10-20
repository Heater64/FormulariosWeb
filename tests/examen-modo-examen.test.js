import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const nucleo = read('js/core/index.js');
const misNotas = read('js/vistas/vista-mis-notas.js');
const tomar = read('js/vistas/vista-examen-tomar.js');

describe('examen de un solo intento: sin navegación y con aviso', () => {
  test('la barra se oculta al alumno dentro de /tomar/:id', () => {
    expect(nucleo).toContain("rutaActualNav.startsWith('/tomar/')");
    expect(nucleo).toContain('fb-sin-nav');
    // Solo al alumno: el profesor previsualiza y conserva su navegación.
    expect(nucleo).toContain("=== 'usuario'");
  });

  test('«Hacer examen» no navega directo: confirma primero', () => {
    expect(misNotas).toContain('js-empezar-examen');
    expect(misNotas).toContain('ev.preventDefault()');
    expect(misNotas).toContain('window.helpers.confirmar(');
    expect(misNotas).toContain("router.navegar('/tomar/' + a.dataset.id)");
  });

  test('el aviso dice si es de un solo intento y que se oculta la navegación', () => {
    expect(misNotas).toContain('Es de un solo intento');
    expect(misNotas).toContain('la barra de navegación se ocultará hasta que lo entregues');
  });

  test('el aviso distingue retomar, intentos restantes e ilimitados', () => {
    expect(misNotas).toContain('data-reanudar=');
    expect(misNotas).toContain('data-restantes=');
    expect(misNotas).toContain('data-ilimitado=');
    expect(misNotas).toContain('infoIntentos(e, intentos)');
    expect(misNotas).toContain('Retomar examen');
  });

  test('el «Volver» del resultado va al inicio si eres alumno', () => {
    expect(tomar).toContain('_volverDe(usuario)');
    expect(tomar).toContain("texto: 'Volver', destino: '/inicio'");
    expect(tomar).toContain("texto: 'Volver a exámenes', destino: '/examenes'");
    // La corrección visible también recibe el usuario para decidir el destino.
    expect(tomar).toContain('aciertos, pct, usuario)');
  });

  test('el examen no tiene ninguna salida hasta entregar (un solo intento)', () => {
    // Sin barra de navegación y sin botón de salir: solo «Entregar examen».
    expect(tomar).not.toContain('btnSalirExamen');
    expect(tomar).not.toContain('¿Salir del examen?');
    expect(tomar).not.toContain('destinoSalida');
    expect(tomar).toContain('Sin salidas hasta entregar');
  });

  test('la barra de modo examen dice quién, cuántos intentos y que no hay salidas', () => {
    expect(tomar).toContain('Intento único');
    expect(tomar).toContain('Te quedan ${info.restantes} intentos');
    expect(tomar).toContain('Intentos ilimitados');
    expect(tomar).toContain('sin salidas hasta entregar');
    expect(tomar).toContain('Lo realizas como');
  });

  test('volver atrás avisa de que se enviará lo completado (contenido)', () => {
    expect(tomar).toContain('_registrarGuardiaSalida');
    expect(tomar).toContain('revertirNavegacion');
    expect(tomar).toContain('se enviarán las respuestas que hayas completado y ya no podrás continuar');
    expect(tomar).toContain('beforeunload');
  });
});

// Guardia de salida ejecutada de verdad en un contexto aislado: el atrás del
// navegador (o gesto) confirma, entrega lo completado y bloquea si falla.
describe('guardia de salida del examen: comportamiento real', () => {
  const entornoEx = {
    window: {
      helpers: {
        confirmar: async () => true,
        mostrarAlerta: () => {},
        escapeHtml: (v) => String(v == null ? '' : v)
      },
      examenesRepository: { entregarIntento: async () => ({}) },
      adminRepository: { registrarAuditoria: async () => ({}) },
      Iconos: { render: () => '', actualizar: () => {} },
      _oyentes: {},
      addEventListener(tipo, fn) {
        (this._oyentes[tipo] = this._oyentes[tipo] || []).push(fn);
      },
      removeEventListener(tipo, fn) {
        this._oyentes[tipo] = (this._oyentes[tipo] || []).filter((f) => f !== fn);
      }
    },
    router: null
  };
  vm.createContext(entornoEx);
  vm.runInContext(read('js/vistas/vista-examen-tomar.js'), entornoEx, { filename: 'vista-examen-tomar.js' });
  const vistaT = entornoEx.window.vistaExamenTomar;

  const examenF = { id: 'ex1', titulo: 'Examen 1' };
  const intentoF = { id: 'in1' };
  const usuarioF = { id: 'u1', grupo_id: 'g1' };
  const recogerF = () => ({ p1: '0' });

  function routerFalso() {
    const guardias = [];
    return {
      guardias,
      revertidos: [],
      registrarGuardia(fn) {
        guardias.push(fn);
        return () => { const i = guardias.indexOf(fn); if (i >= 0) guardias.splice(i, 1); };
      },
      revertirNavegacion(ruta) { this.revertidos.push(ruta); }
    };
  }

  test('cancelar el aviso revierte la navegación y no entrega', async () => {
    entornoEx.router = routerFalso();
    let entregas = 0;
    entornoEx.window.examenesRepository.entregarIntento = async () => { entregas++; return {}; };
    entornoEx.window.helpers.confirmar = async () => false;
    vistaT._registrarGuardiaSalida(examenF, intentoF, usuarioF, recogerF);
    const guardia = entornoEx.router.guardias[0];
    const permite = await guardia('/inicio');
    expect(permite).toBe(false);
    expect(entregas).toBe(0);
    expect(entornoEx.router.revertidos).toEqual(['/tomar/ex1']);
    vistaT._quitarGuardiaSalida();
  });

  test('aceptar entrega lo completado (con auditoría) y permite salir', async () => {
    entornoEx.router = routerFalso();
    const llamadas = { entregar: [], auditoria: [] };
    entornoEx.window.examenesRepository.entregarIntento = async (id, r) => { llamadas.entregar.push([id, r]); return {}; };
    entornoEx.window.adminRepository.registrarAuditoria = async (...a) => { llamadas.auditoria.push(a); return {}; };
    entornoEx.window.helpers.confirmar = async () => true;
    vistaT._registrarGuardiaSalida(examenF, intentoF, usuarioF, recogerF);
    const permite = await entornoEx.router.guardias[0]('/inicio');
    expect(permite).toBe(true);
    expect(llamadas.entregar).toEqual([['in1', { p1: '0' }]]);
    expect(llamadas.auditoria).toHaveLength(1);
    vistaT._quitarGuardiaSalida();
  });

  test('si la entrega falla, avisa y se sigue dentro del examen', async () => {
    entornoEx.router = routerFalso();
    const alertas = [];
    entornoEx.window.examenesRepository.entregarIntento = async () => { throw new Error('Falta responder una pregunta obligatoria'); };
    entornoEx.window.helpers.confirmar = async () => true;
    entornoEx.window.helpers.mostrarAlerta = (m) => { alertas.push(m); };
    vistaT._registrarGuardiaSalida(examenF, intentoF, usuarioF, recogerF);
    const permite = await entornoEx.router.guardias[0]('/inicio');
    expect(permite).toBe(false);
    expect(alertas.join(' ')).toContain('Falta responder una pregunta obligatoria');
    expect(entornoEx.router.revertidos).toEqual(['/tomar/ex1']);
    vistaT._quitarGuardiaSalida();
  });

  test('remontar la misma ruta y la salida autorizada no preguntan', async () => {
    entornoEx.router = routerFalso();
    let avisos = 0;
    entornoEx.window.helpers.confirmar = async () => { avisos++; return true; };
    vistaT._registrarGuardiaSalida(examenF, intentoF, usuarioF, recogerF);
    const guardia = entornoEx.router.guardias[0];
    expect(await guardia('/tomar/ex1')).toBe(true);
    vistaT._salidaAutorizada = true;
    expect(await guardia('/inicio')).toBe(true);
    expect(avisos).toBe(0);
    vistaT._salidaAutorizada = false;
    vistaT._quitarGuardiaSalida();
  });

  test('beforeunload se conecta en el examen y se retira al desmontar', () => {
    entornoEx.router = routerFalso();
    entornoEx.window._oyentes = {};
    vistaT._conectarAntesDeDescargar();
    expect((entornoEx.window._oyentes.beforeunload || []).length).toBe(1);
    // El aviso nativo pide confirmación (preventDefault del navegador).
    let pedido = false;
    entornoEx.window._oyentes.beforeunload[0]({ preventDefault: () => { pedido = true; } });
    expect(pedido).toBe(true);
    vistaT.desmontar();
    expect(entornoEx.window._oyentes.beforeunload || []).toEqual([]);
    expect(entornoEx.router.guardias).toEqual([]);
  });
});
