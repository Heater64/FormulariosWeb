// Configuración de entorno FormsBiblicos.
//
// Fuente única para: modo demo, credenciales Supabase y credenciales demo.
// Todo se puede sobrescribir desde window.ENV (tests, despliegues custom),
// pero los valores por defecto de producción NO incluyen credenciales demo:
// en un despliegue real el panel "demo" del login simplemente no aparece.
//
// Para activar el modo demo en desarrollo:
//   window.ENV = { MODO_DEMO: true, CREDENCIALES_DEMO: [...] }
// antes de que se cargue este archivo (p.ej. un script inline en index.html).
(function () {
  'use strict';

  const env = (typeof window.ENV === 'object' && window.ENV) || {};

  const entorno = {
    // Supabase (anon key: pública por diseño en SPA; la service_role NUNCA va aquí)
    supabaseUrl: env.SUPABASE_URL || 'https://josxcvncescqqlajahkh.supabase.co',
    supabaseAnonKey: env.SUPABASE_ANON_KEY || 'sb_publishable_UvqSGCMonC_9ncBmYV14tw_PLM6-9R8',

    // Modo demo: por defecto DESACTIVADO en cualquier build. Solo se habilita
    // cuando la plataforma de despliegue inyecta window.ENV.MODO_DEMO === true
    // (nunca hardcodeado en el código de las vistas).
    modoDemo: env.MODO_DEMO === true,

    // Credenciales demo: solo se muestran si MODO_DEMO está activo y se
    // definen explícitamente. En producción este array está vacío.
    credencialesDemo: Array.isArray(env.CREDENCIALES_DEMO) ? env.CREDENCIALES_DEMO : []
  };

  window.entorno = entorno;
})();