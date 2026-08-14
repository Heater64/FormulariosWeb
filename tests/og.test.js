import { describe, it, expect } from 'vitest';
import { construirPaginaOg, limpiarTitulo } from '../api/og.js';
import handler from '../api/og.js';

describe('limpiarTitulo', () => {
  it('recorta y normaliza espacios', () => {
    expect(limpiarTitulo('  Examen  de   Génesis  ', 'examen')).toBe('Examen de Génesis');
  });

  it('elimina HTML, comillas y saltos (anti-XSS)', () => {
    expect(limpiarTitulo('<script>alert(1)</script>', 'examen')).toBe('script alert(1) /script');
    expect(limpiarTitulo('"a" <b> y \n salto', 'examen')).toBe('a b y salto');
  });

  it('acota a 120 caracteres', () => {
    const largo = 'x'.repeat(300);
    expect(limpiarTitulo(largo, 'examen').length).toBeLessThanOrEqual(120);
  });

  it('usa fallback según tipo', () => {
    expect(limpiarTitulo('', 'examen')).toBe('Examen de FormsBiblicos');
    expect(limpiarTitulo('  ', 'grupo')).toBe('Clase de FormsBiblicos');
  });
});

describe('construirPaginaOg', () => {
  it('incluye el título del examen en og:title', () => {
    const html = construirPaginaOg({ tipo: 'examen', id: 'abc123', titulo: 'Génesis 1', host: 'formularios-web-flax.vercel.app' });
    expect(html).toContain('<meta property="og:title" content="Génesis 1">');
    expect(html).toContain('<meta property="og:type" content="website">');
    expect(html).toContain('og-1200x630.png');
    expect(html).toContain('twitter:card');
  });

  it('redirige a /app/ en producción', () => {
    const html = construirPaginaOg({ tipo: 'examen', id: 'e1', titulo: 'T', host: 'formularios-web-flax.vercel.app' });
    expect(html).toContain('url=https://formularios-web-flax.vercel.app/app/#!/tomar/e1');
  });

  it('redirige a /index.html en desarrollo', () => {
    const html = construirPaginaOg({ tipo: 'examen', id: 'e1', titulo: 'T', host: 'localhost:3100' });
    expect(html).toContain('url=https://formularios-web-flax.vercel.app/index.html#!/tomar/e1');
  });

  it('una clase apunta a /grupos/:id', () => {
    const html = construirPaginaOg({ tipo: 'grupo', id: 'g9', titulo: 'Clase de Juan', host: 'formularios-web-flax.vercel.app' });
    expect(html).toContain('og:title" content="Clase de Juan');
    expect(html).toContain('url=https://formularios-web-flax.vercel.app/app/#!/grupos/g9');
    expect(html).toContain('Únete a esta clase');
  });

  it('no deja scripts ni ampersands sin escapar', () => {
    const html = construirPaginaOg({ tipo: 'examen', id: 'x', titulo: '<script>alert(1)</script> & más', host: 'site.com' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('& más');
    expect(html).toContain('&amp; más');
  });
});

describe('handler /o/', () => {
  function resMock() {
    const res = { statusCode: 0, headers: {}, end: (b) => { resMock.body = b; } };
    res.setHeader = (k, v) => { res.headers[k] = v; };
    return res;
  }

  it('sirve 200 con HTML para /o/examen/:id', () => {
    const res = resMock();
    handler({ url: '/o/examen/abc123?t=Génesis%201', headers: { host: 'site.com' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toContain('text/html');
    expect(resMock.body).toContain('Génesis 1');
  });

  it('sirve 200 para /o/grupo/:id', () => {
    const res = resMock();
    handler({ url: '/o/grupo/g1?t=Mi%20clase', headers: { host: 'site.com' } }, res);
    expect(res.statusCode).toBe(200);
    expect(resMock.body).toContain('Mi clase');
  });

  it('404 para rutas no reconocidas', () => {
    const res = resMock();
    handler({ url: '/o/otra/1', headers: { host: 'site.com' } }, res);
    expect(res.statusCode).toBe(404);
  });

  it('404 para ids inválidos', () => {
    const res = resMock();
    handler({ url: '/o/examen/..%2F..', headers: { host: 'site.com' } }, res);
    expect(res.statusCode).toBe(404);
  });

  it('no filtra secretos ni claves', () => {
    const res = resMock();
    handler({ url: '/o/examen/e1?t=X', headers: { host: 'site.com' } }, res);
    expect(resMock.body).not.toMatch(/service_role|sb_publishable|SUPABASE/i);
  });
});
