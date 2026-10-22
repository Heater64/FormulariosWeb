import { afterEach, describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const shell = readFileSync(new URL('../js/core/index.js', import.meta.url), 'utf8');

function crearEntorno(usuario, ruta = '/inicio') {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/#!/inicio', runScripts: 'outside-only', pretendToBeVisual: true
  });
  const w = dom.window;
  const addDocumentListener = w.document.addEventListener.bind(w.document);
  w.document.addEventListener = (tipo, listener, opciones) => {
    if (tipo !== 'DOMContentLoaded') addDocumentListener(tipo, listener, opciones);
  };
  const estado = { usuario };
  const actualizaciones = [];
  const navegaciones = [];
  const envPath = { path: ruta };
  const timers = [];
  const eventos = new Map();
  w.setTimeout = (callback, delay) => { timers.push({ callback, delay }); return timers.length; };
  w.store = {
    obtener: (clave) => estado[clave],
    asignar: (parcial) => Object.assign(estado, parcial),
    actualizar: (clave, valor) => { estado[clave] = valor; }
  };
  w.router = {
    reemplazar: (ruta) => navegaciones.push(ruta),
    registrar: vi.fn(),
    registrarGuardia: vi.fn(),
    pathActual: () => envPath.path,
    _ejecutar: vi.fn()
  };
  w.Iconos = { render: (nombre) => `<i data-icono="${nombre}"></i>`, actualizar: vi.fn() };
  w.helpers = { mostrarAlerta: vi.fn() };
  w.cssSecciones = { cargarGrupo: vi.fn(async () => {}) };
  w.eventBus = {
    suscribir: (nombre, callback) => { eventos.set(nombre, callback); return () => eventos.delete(nombre); }
  };
  w.preferencias = { aplicar: vi.fn(), guardar: vi.fn() };
  w.adminRepository = { actualizarUltimoAcceso: vi.fn(), listarConfiguracion: vi.fn(async () => null) };
  w.supabaseClient = {
    from: (tabla) => ({
      update: (cambios) => ({
        eq: async (campo, id) => {
          actualizaciones.push({ tabla, cambios, campo, id });
          return { error: null };
        }
      })
    })
  };
  vm.runInContext(shell, dom.getInternalVMContext(), { filename: 'js/core/index.js' });
  w.appShell._inicializarRutas = vi.fn();
  w.appShell._renderizarBarraNavegacion = vi.fn();
  w.appShell._controlarSplash = vi.fn();
  w.appShell._verificarSesion = vi.fn();
  w.appShell._escucharAuthState = vi.fn();
  w.appShell._iniciarHeartbeat = vi.fn();
  w.appShell._precargarPorRol = vi.fn();
  w.appShell._aplicarMarca = vi.fn(async () => {});
  w.appShell._revalidarSesion = vi.fn(async () => {});
  w.appShell._aplicarPreferencias = vi.fn();
  return { dom, w, estado, actualizaciones, navegaciones, timers, envPath, eventos };
}

afterEach(() => vi.restoreAllMocks());

describe('tutorial informativo inicial', () => {
  test('abre para admin después de autenticar, aunque ya eligió tema', async () => {
    const env = crearEntorno({ id: 'admin-1', rol: 'admin', preferencias: { tema: 'dark' } });
    try {
      const usuario = env.estado.usuario;
      await env.w.appShell._procesarPrimeraVisita(usuario);
      expect(env.navegaciones).toEqual([]);
      env.estado.usuario = usuario;
      env.envPath.path = '/inicio';
      const temporizador = env.timers.find(({ delay }) => delay === 400);
      expect(temporizador).toBeDefined();
      temporizador.callback();
      await env.w.appShell._mostrarTutorialInicial(usuario);
      const dialogo = env.w.document.querySelector('[data-tutorial-inicial]');
      expect(dialogo?.getAttribute('role')).toBe('dialog');
      expect(dialogo?.getAttribute('aria-modal')).toBe('true');
      expect(dialogo?.textContent).toContain('Bienvenido, administrador');
      expect(dialogo?.textContent).toContain('Entendido');
      expect(dialogo?.textContent).not.toContain('Elige tu tema visual');
    } finally {
      env.dom.window.close();
    }
  });

  test('reanuda el tutorial al llegar a Inicio después de una redirección de login', async () => {
    const env = crearEntorno({ id: 'admin-redirigido', rol: 'admin', preferencias: {} }, '/');
    try {
      await env.w.appShell.init();
      env.envPath.path = '/inicio';
      env.eventos.get('route:change')();
      expect(env.timers.some(({ delay }) => delay === 400)).toBe(true);
    } finally {
      env.dom.window.close();
    }
  });

  test('no se agenda fuera de Inicio si se autentica desde otra ruta', async () => {
    const env = crearEntorno({ id: 'admin-ruta', rol: 'admin', preferencias: {} }, '/cuenta');
    try {
      await env.w.appShell._procesarPrimeraVisita(env.estado.usuario);
      expect(env.navegaciones).toEqual([]);
      expect(env.timers.some(({ delay }) => delay === 400)).toBe(false);
      expect(env.w.document.querySelector('[data-tutorial-inicial]')).toBeNull();
    } finally {
      env.dom.window.close();
    }
  });

  test('el tutorial de usuario resume Mis notas, exámenes y calificaciones', async () => {
    const env = crearEntorno({ id: 'usuario-1', rol: 'usuario', preferencias: '{}' });
    try {
      await env.w.appShell._mostrarTutorialInicial(env.estado.usuario);
      const texto = env.w.document.querySelector('[data-tutorial-inicial]')?.textContent || '';
      expect(texto).toContain('Tu espacio de estudio');
      expect(texto).toContain('Mis notas');
      expect(texto).toContain('Hacer examen');
      expect(texto).toContain('calificaciones');
    } finally {
      env.dom.window.close();
    }
  });

  test('confirma una sola vez y persiste el estado en las preferencias del perfil', async () => {
    const env = crearEntorno({ id: 'admin-2', rol: 'admin', preferencias: { tema: 'light' } });
    try {
      await env.w.appShell._mostrarTutorialInicial(env.estado.usuario);
      await env.w.appShell._mostrarTutorialInicial(env.estado.usuario);
      expect(env.w.document.querySelectorAll('[data-tutorial-inicial]')).toHaveLength(1);
      env.w.document.querySelector('[data-tutorial-confirmar]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(env.actualizaciones).toHaveLength(1);
      expect(env.actualizaciones[0]).toMatchObject({ tabla: 'perfiles', campo: 'id', id: 'admin-2' });
      expect(JSON.parse(env.actualizaciones[0].cambios.preferencias).tutorial_inicio_visto).toBe(true);
      expect(env.estado.usuario.preferencias.tutorial_inicio_visto).toBe(true);
      expect(env.w.document.querySelector('[data-tutorial-inicial]')).toBeNull();
    } finally {
      env.dom.window.close();
    }
  });

  test('no abre para owner, editor ni usuario con el tutorial ya visto', async () => {
    for (const usuario of [
      { id: 'owner-1', rol: 'owner', preferencias: {} },
      { id: 'editor-1', rol: 'editor', preferencias: {} },
      { id: 'usuario-2', rol: 'usuario', preferencias: JSON.stringify({ tutorial_inicio_visto: true }) }
    ]) {
      const env = crearEntorno(usuario);
      try {
        await env.w.appShell._mostrarTutorialInicial(usuario);
        expect(env.w.document.querySelector('[data-tutorial-inicial]')).toBeNull();
      } finally {
        env.dom.window.close();
      }
    }
  });

  test('no afirma que se completó si la escritura del perfil falla', async () => {
    const env = crearEntorno({ id: 'admin-3', rol: 'admin', preferencias: {} });
    env.w.supabaseClient.from = () => ({ update: () => ({ eq: async () => ({ error: new Error('offline') }) }) });
    try {
      await env.w.appShell._mostrarTutorialInicial(env.estado.usuario);
      env.w.document.querySelector('[data-tutorial-confirmar]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(env.w.document.querySelector('[data-tutorial-inicial]')).not.toBeNull();
      expect(env.w.document.querySelector('[data-tutorial-error]')?.textContent).toMatch(/No se pudo guardar/i);
      expect(env.w.document.querySelector('[data-tutorial-confirmar]').disabled).toBe(false);
      expect(env.estado.usuario.preferencias.tutorial_inicio_visto).not.toBe(true);
    } finally {
      env.dom.window.close();
    }
  });
});
