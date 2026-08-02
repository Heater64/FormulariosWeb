// Sobrescribe desde window.ENV si existe (para tests o cambios rápidos)
const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || 'https://josxcvncescqqlajahkh.supabase.co';
const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || 'sb_publishable_UvqSGCMonC_9ncBmYV14tw_PLM6-9R8';

let cliente = null;

try {
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    cliente = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn('⚠️ SDK de Supabase no disponible');
  }
} catch (e) {
  console.warn('⚠️ Error creando cliente Supabase:', e.message);
}

window.supabaseClient = cliente;
