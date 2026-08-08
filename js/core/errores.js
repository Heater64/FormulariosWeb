// ============================================================
// js/core/errores.js — Clasificación y mensajes de error
// ============================================================
// Contrato único para tratar errores en repositorios y vistas:
//   clasificar(error)        → tipo (NETWORK, AUTH, PERMISSION, VALIDATION,
//                               NOT_FOUND, CONFLICT, DATABASE, CACHE, OFFLINE, UNKNOWN)
//   mensajeUsuario(error)    → texto amigable (nunca expone detalles técnicos)
//   registrar(error, ctx)    → log técnico estructurado (para debugging)
// ============================================================

(function () {
  'use strict';

  const TIPOS = [
    'NETWORK', 'AUTH', 'PERMISSION', 'VALIDATION', 'NOT_FOUND',
    'CONFLICT', 'DATABASE', 'CACHE', 'OFFLINE', 'UNKNOWN'
  ];

  // Mensajes amigables de usuario (no exponen internals del servidor)
  const MENSAJES = {
    NETWORK: 'No hay conexión con el servidor. Compruébala e inténtalo de nuevo.',
    OFFLINE: 'Estás sin conexión. Los cambios se guardarán cuando vuelvas a estar en línea.',
    AUTH: 'Tu sesión no es válida. Inicia sesión de nuevo.',
    PERMISSION: 'No tienes permiso para realizar esta acción.',
    VALIDATION: 'Los datos introducidos no son válidos. Revísalos.',
    NOT_FOUND: 'No se encontró lo que buscabas. Puede que haya sido movido o eliminado.',
    CONFLICT: 'El cambio no se pudo guardar porque los datos cambiaron en otro lugar. Reinténtalo.',
    DATABASE: 'No se han podido guardar los datos. Inténtalo de nuevo.',
    CACHE: 'Hubo un problema con los datos guardados en este dispositivo.',
    UNKNOWN: 'Ocurrió un error inesperado. Inténtalo de nuevo.'
  };

  const textoDe = (error) => String(
    (error && (error.message || error.details || error)) || ''
  ).toLowerCase();

  const codigoDe = (error) => String((error && (error.code || error.status)) || '').toLowerCase();

  // Heurísticas de clasificación (especificidad primero)
  function clasificar(error) {
    const msg = textoDe(error);
    const code = codigoDe(error);

    if (msg.includes('failed to fetch') || msg.includes('networkerror') ||
        msg.includes('network error') || msg.includes('load failed') ||
        msg.includes('typeerror: fetch')) {
      // Fallo de petición: puede ser red caída o servidor inaccesible.
      // Sin navegador online se considera OFFLINE; si la UI marca online,
      // es un problema de red/servidor (NETWORK) — se distingue en la vista.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'OFFLINE';
      return 'NETWORK';
    }
    if (msg.includes('sin conexión') || msg.includes('estás offline')) return 'OFFLINE';
    if (msg.includes('jwt') || msg.includes('token') || msg.includes('auth') ||
        msg.includes('sesión') || msg.includes('password') || msg.includes('login') ||
        msg.includes('credentials') || msg.includes('usuario o contraseña') ||
        msg.includes('contraseña') || msg.includes('autentic')) return 'AUTH';
    if (msg.includes('permission') || msg.includes('denied') || msg.includes('forbidden') ||
        msg.includes('no autorizado') || msg.includes('permisos') ||
        msg.includes('row-level security') || msg.includes('rls') ||
        msg.includes('42501') || code === '403') return 'PERMISSION';
    if (msg.includes('validation') || msg.includes('no válido') || msg.includes('invalido') ||
        msg.includes('check constraint')) return 'VALIDATION';
    if (msg.includes('not found') || msg.includes('no se encontró') ||
        msg.includes('no existe') || code === '404') return 'NOT_FOUND';
    if (msg.includes('conflict') || msg.includes('duplicate') || msg.includes('duplicado') ||
        msg.includes('23505')) return 'CONFLICT';
    if (msg.includes('database') || msg.includes('sql') || msg.includes('postgres') ||
        msg.includes('relación') || msg.includes('constraint') ||
        /pgrst\d+/.test(code) || /p\d{4}/.test(code) || /^2\d{4}$/.test(code)) return 'DATABASE';
    if (msg.includes('cache') || msg.includes('indexeddb') || msg.includes('localstorage')) return 'CACHE';
    return 'UNKNOWN';
  }

  // Buffer técnico acotado (para diagnóstico, no para UI)
  function registrar(error, ctx) {
    const tipo = clasificar(error);
    if (tipo === 'NETWORK' || tipo === 'OFFLINE') return { tipo };
    const entrada = {
      tipo,
      mensaje: (error && (error.message || error.details)) || String(error),
      contexto: ctx || null,
      ruta: (typeof location !== 'undefined' && location.hash) || '',
      ts: new Date().toISOString()
    };
    try {
      const buf = window.__fbLogsTecnicos || (window.__fbLogsTecnicos = []);
      buf.push(entrada);
      if (buf.length > 50) window.__fbLogsTecnicos = buf.slice(-50);
    } catch (e) { /* sin canal de registro */ }
    return { tipo };
  }

  // Mensaje amigable para el usuario. contexto.mensajes permite
  // sobrescribir por tipo; nunca se filtra el mensaje técnico.
  function mensajeUsuario(error, contexto) {
    const tipo = clasificar(error);
    // Los mensajes de dominio (escritos por la app, en español) no matchean
    // heurísticas técnicas → se respetan tal cual. Solo se traduce lo técnico.
    if (tipo === 'UNKNOWN') {
      const original = (error && (error.message || error.details)) || '';
      return original || MENSAJES.UNKNOWN;
    }
    const map = contexto && contexto.mensajes
      ? { ...MENSAJES, ...contexto.mensajes }
      : MENSAJES;
    return map[tipo] || map.UNKNOWN;
  }

  window.errores = { TIPOS, clasificar, registrar, mensajeUsuario };
})();