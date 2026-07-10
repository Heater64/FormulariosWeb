// Configuración de Supabase
// ⚠️ NUNCA subas esto a GitHub con tus credenciales reales

// Para desarrollo local, usa variables de entorno
// En producción, usa las variables de Vercel

const SUPABASE_CONFIG = {
    // En desarrollo: usa valores por defecto (los reemplazarás en producción)
    
};

// Si estás en Vercel, usa las variables de entorno
if (process.env.NODE_ENV === 'production') {
    SUPABASE_CONFIG.url = process.env.VERCEL_SUPABASE_URL || SUPABASE_CONFIG.url;
    SUPABASE_CONFIG.anonKey = process.env.VERCEL_SUPABASE_ANON_KEY || SUPABASE_CONFIG.anonKey;
}

// Exportar configuración
window.SUPABASE_CONFIG = SUPABASE_CONFIG;