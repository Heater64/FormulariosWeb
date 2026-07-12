// ============================================================
// CONFIGURACIÓN - Supabase y variables de entorno
// ============================================================

(function() {
    'use strict';
    
    // Lee la configuración de Supabase.
    // Puedes sobreescribirla desde el HTML con:
    //   window.__SUPABASE_URL = '...'; window.__SUPABASE_ANON_KEY = '...';
    // o bien inyectando window.ENV = { SUPABASE_URL, SUPABASE_ANON_KEY }
    // antes de cargar este script.
    function getSupabaseConfig() {
        let url = 'https://josxcvncescqqlajahkh.supabase.co';
        let anonKey = 'sb_publishable_UvqSGCMonC_9ncBmYV14tw_PLM6-9R8';
        
        if (typeof window !== 'undefined') {
            if (window.__SUPABASE_URL) url = window.__SUPABASE_URL;
            if (window.__SUPABASE_ANON_KEY) anonKey = window.__SUPABASE_ANON_KEY;
            if (window.ENV) {
                if (window.ENV.SUPABASE_URL) url = window.ENV.SUPABASE_URL;
                if (window.ENV.SUPABASE_ANON_KEY) anonKey = window.ENV.SUPABASE_ANON_KEY;
            }
        }
        
        return { url, anonKey };
    }
    
    const supabaseConfig = getSupabaseConfig();
    window.SUPABASE_CONFIG = supabaseConfig;
    
    console.log('🔧 Configuración cargada');
    console.log('📡 URL:', supabaseConfig.url);
    
})();
