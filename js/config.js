// ============================================================
// CONFIGURACIÓN DE SUPABASE
// ============================================================

// ⚠️ IMPORTANTE: NUNCA subas credenciales reales a GitHub
// Usa variables de entorno en Vercel para producción

(function() {
    'use strict';
    
    // Función para obtener la configuración de manera segura
    function getSupabaseConfig() {
        // Valores por defecto
        let url = 'https://josxcvncescqqlajahkh.supabase.co';
        let anonKey = 'sb_publishable_UvqSGCMonC_9ncBmYV14tw_PLM6-9R8';
        
        // Intentar obtener desde variables de entorno inyectadas
        if (typeof window !== 'undefined') {
            // Desde el servidor (Vercel)
            if (window.__SUPABASE_URL) url = window.__SUPABASE_URL;
            if (window.__SUPABASE_ANON_KEY) anonKey = window.__SUPABASE_ANON_KEY;
            
            // Desde ENV global
            if (window.ENV) {
                if (window.ENV.SUPABASE_URL) url = window.ENV.SUPABASE_URL;
                if (window.ENV.SUPABASE_ANON_KEY) anonKey = window.ENV.SUPABASE_ANON_KEY;
            }
        }
        
        return { url, anonKey };
    }
    
    // Cargar configuración
    const supabaseConfig = getSupabaseConfig();
    window.SUPABASE_CONFIG = supabaseConfig;
    
    console.log('🔧 Configuración de Supabase cargada');
    console.log('📡 URL:', supabaseConfig.url);
    console.log('🔑 Key:', supabaseConfig.anonKey ? supabaseConfig.anonKey.substring(0, 10) + '...' : 'NO DEFINIDA');
})();