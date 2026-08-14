// ============================================================================
// api/og.js — Tarjetas Open Graph para compartir exámenes y clases.
//
// La app usa enrutado por hash (#!), así que el servidor nunca ve la ruta al
// compartir una URL normal. Para que las tarjetas muestren el TÍTULO del
// examen o de la clase, los botones de compartir enlazan a /o/examen/:id?t=…
// y /o/grupo/:id?t=… : esta función devuelve una página mínima con las meta
// tags Open Graph/Twitter y una redirección al SPA. Los rastreadores leen las
// meta tags; las personas llegan a la app.
//
// Desplegada como serverless function de Vercel (ver rewrites en vercel.json).
// El título viaja en la query (?t=) porque el id por sí solo no es legible sin
// service_role (RLS bloquea al rol anon), así que no hace falta ningún secreto.
// ============================================================================

const SITIO = 'https://formularios-web-flax.vercel.app';
const IMAGEN_OG = SITIO + '/og-1200x630.png';

function escaparHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Limpia el título aportado en la query: sin saltos/control ni HTML, un solo
// espacio, longitud acotada. El fallback cubre compartir sin ?t=.
function limpiarTitulo(raw, tipo) {
  const t = String(raw || '')
    .replace(/[\u0000-\u001f\u007f<>"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return t || (tipo === 'grupo' ? 'Clase de FormsBiblicos' : 'Examen de FormsBiblicos');
}

function construirPaginaOg({ tipo, id, titulo = '', host = '' }) {
  const esDev = /localhost|127\.0\.0\.1|\[::1\]/.test(host || '');
  const rutaApp = (tipo === 'grupo' ? 'grupos/' : 'tomar/') + encodeURIComponent(id);
  // En desarrollo la app vive junto al index; en producción, en /app/.
  const urlApp = (esDev ? '/index.html#!/' : '/app/#!/') + rutaApp;
  const urlAbs = new URL(urlApp, SITIO).href;
  const t = limpiarTitulo(titulo, tipo);
  const desc = tipo === 'grupo'
    ? 'Únete a esta clase y estudia la Biblia capítulo a capítulo con tu grupo.'
    : 'Realiza tu examen en FormsBiblicos y sigue tu progreso de estudio.';
  const canonical = SITIO + '/o/' + tipo + '/' + encodeURIComponent(id) + (titulo ? '?t=' + encodeURIComponent(titulo) : '');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escaparHtml(t)} — FormsBiblicos</title>
<meta name="description" content="${escaparHtml(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="FormsBiblicos">
<meta property="og:title" content="${escaparHtml(t)}">
<meta property="og:description" content="${escaparHtml(desc)}">
<meta property="og:url" content="${escaparHtml(canonical)}">
<meta property="og:image" content="${IMAGEN_OG}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="FormsBiblicos — Estudio bíblico guiado">
<meta property="og:locale" content="es_ES">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escaparHtml(t)}">
<meta name="twitter:description" content="${escaparHtml(desc)}">
<meta name="twitter:image" content="${IMAGEN_OG}">
<meta http-equiv="refresh" content="0; url=${escaparHtml(urlAbs)}">
<style>
  body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #FAFAF9; color: #1C1917; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .caja { text-align: center; padding: 40px 24px; }
  .icono { width: 52px; height: 52px; border-radius: 14px; background: #2563EB; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 18px; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.02em; }
  p { margin: 0 0 22px; color: #78716C; font-size: 15px; }
  a { display: inline-block; background: #2563EB; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 999px; font-weight: 600; font-size: 14px; }
</style>
</head>
<body>
<div class="caja">
  <div class="icono"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
  <h1>${escaparHtml(t)}</h1>
  <p>${escaparHtml(desc)}</p>
  <a href="${escaparHtml(urlAbs)}">Abrir en FormsBiblicos</a>
</div>
</body>
</html>`;
}

export default function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    const m = url.pathname.match(/^\/o\/(examen|grupo)\/([A-Za-z0-9_-]+)\/?$/);
    if (!m) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('No encontrado');
      return;
    }
    const html = construirPaginaOg({
      tipo: m[1],
      id: m[2],
      titulo: url.searchParams.get('t') || '',
      host: req.headers.host || ''
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
    res.end(html);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Error interno');
  }
}

export { construirPaginaOg, limpiarTitulo };
