// Cliente Supabase. La URL y la key anon provienen de js/config/entorno.js
// (única fuente de verdad, sobrescribible en window.ENV para tests).
let cliente = null;

try {
  const url = window.entorno && window.entorno.supabaseUrl;
  const key = window.entorno && window.entorno.supabaseAnonKey;
  if (typeof supabase !== 'undefined' && supabase.createClient && url && key) {
    cliente = supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // SPA: el callback de OAuth se maneja aparte
        storage: window.localStorage
      }
    });
  } else {
    console.warn('⚠️ SDK de Supabase no disponible o configuración ausente');
  }
} catch (e) {
  console.warn('⚠️ Error creando cliente Supabase:', e.message);
}

window.supabaseClient = cliente;