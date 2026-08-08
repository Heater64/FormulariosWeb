// Auditoría UX programática: overflow, tap targets, contraste WCAG, fuentes,
// nombres accesibles, errores de consola. Requiere dev server en :3000.
// node auditoria-ux.cjs
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
const USUARIO = 'owner';
const PASS = 'owner123';

const RUTAS = ['/estudio', '/examenes', '/memorizacion', '/explorar', '/perfil', '/progreso', '/grupos', '/calificaciones'];

const VIEWPORTS = [
  { nombre: 'MÓVIL 360x740', w: 360, h: 740 },
  { nombre: 'MÓVIL 375x812', w: 375, h: 812 },
  { nombre: 'TABLET 768x1024', w: 768, h: 1024 },
  { nombre: 'DESKTOP 1280x800', w: 1280, h: 800 }
];

const esperar = (ms) => new Promise(r => setTimeout(r, ms));

// ---- Luminancia/contraste WCAG ----
function relLum(hex) {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  const [r, g, b] = m.slice(1).map(v => parseInt(v, 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const la = relLum(a), lb = relLum(b);
  if (la === null || lb === null) return null;
  const [mas, menos] = la >= lb ? [la, lb] : [lb, la];
  return (mas + 0.05) / (menos + 0.05);
}
const parseColor = (c) => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
  if (!m) return null;
  return '#' + m.slice(1).map(v => Math.max(0, Math.min(255, +v)).toString(16).padStart(2, '0')).join('');
};

const ANALISIS = `(${function () {
  const parseColor = (c) => {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
    if (!m) return null;
    return '#' + m.slice(1).map(v => Math.max(0, Math.min(255, +v)).toString(16).padStart(2, '0')).join('');
  };
  const relLum = (hex) => {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return null;
    const vals = m.slice(1).map(v => parseInt(v, 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * vals[0] + 0.7152 * vals[1] + 0.0722 * vals[2];
  };
  const ratio = (a, b) => {
    const la = relLum(a), lb = relLum(b);
    if (la === null || lb === null) return null;
    const mas = Math.max(la, lb), menos = Math.min(la, lb);
    return (mas + 0.05) / (menos + 0.05);
  };
  const bgEfectivo = (el) => {
    let node = el;
    for (let i = 0; i < 12 && node; i++) {
      const cs = getComputedStyle(node);
      if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') {
        return parseColor(cs.backgroundColor);
      }
      node = node.parentElement;
    }
    return parseColor(getComputedStyle(document.body).backgroundColor) || '#FFFFFF';
  };
  const tieneTextoDirecto = (el) => {
    for (const n of el.childNodes) {
      if (n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0) return true;
    }
    return false;
  };
  const info = { overflowPx: 0, culpablesOverflow: [], tapsPequenos: [], contrasteBajo: [], fuenteMinima: [], sinNombre: [], errores: [] };

  // Overflow horizontal: elementos que sobresalen del viewport
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed') return;
    if (r.right > window.innerWidth + 2) {
      const sel = el.id ? '#' + el.id : (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase());
      info.culpablesOverflow.push(`${sel} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
    }
  });
  info.overflowPx = document.documentElement.scrollWidth - document.documentElement.clientWidth;

  // Tap targets < 44px (pantallas <= 768) / < 40px en 360
  const minTap = window.innerWidth <= 360 ? 40 : 44;
  document.querySelectorAll('a, button, [role="button"], [role="tab"], input, select, textarea, summary, label[for]').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    // Inputs tipo checkbox/radio se saltan (se acepta su tamaño)
    if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) return;
    if (r.width < minTap || r.height < minTap) {
      const sel = el.id ? '#' + el.id : (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase());
      info.tapsPequenos.push(`${sel} ${Math.round(r.width)}x${Math.round(r.height)}px`);
    }
  });

  // Contraste de texto directo
  document.querySelectorAll('body *').forEach(el => {
    if (!tieneTextoDirecto(el)) return;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    if (fs > 0 && fs < 11.5) {
      const sel = el.id ? '#' + el.id : (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase());
      info.fuenteMinima.push(`${sel} ${fs}px "${el.textContent.trim().slice(0, 40)}"`);
    }
    const color = parseColor(cs.color);
    if (!color) return;
    const bg = bgEfectivo(el);
    const r = ratio(color, bg);
    if (r === null) return;
    const esGrande = fs >= 24 || (fs >= 18.66 && parseInt(cs.fontWeight) >= 700);
    const min = esGrande ? 3 : 4.5;
    if (r < min) {
      const sel = el.id ? '#' + el.id : (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase());
      info.contrasteBajo.push(`${sel} ${r.toFixed(2)} (min ${min}) "${el.textContent.trim().slice(0, 40)}" fg=${color} bg=${bg}`);
    }
  });

  // Elementos interactivos sin nombre accesible (solo icono)
  document.querySelectorAll('button, a, [role="button"], [role="tab"]').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const nombre = (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.textContent || '').trim() || el.getAttribute('title') || '').trim();
    if (!nombre && !el.querySelector('img[alt], svg[role="img"]')) {
      const sel = el.id ? '#' + el.id : (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase());
      info.sinNombre.push(sel);
    }
  });

  return info;
}})()`;

async function auditar(page, etiqueta) {
  const info = await page.evaluate(ANALISIS);
  const errores = page.__errors || [];
  return { etiqueta, ...info, errores };
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const resultados = [];
  let page;

  const nuevaPagina = async (w, h) => {
    if (page) await page.close();
    page = await browser.newPage({ viewport: { width: w, height: h } });
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + (e.stack ? '\n    ' + e.stack.split('\n').slice(1, 7).join('\n    ') : '')));
    page.on('console', m => { if (m.type() === 'error' && !/404|failed to load resource|net::/i.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
    page.__errors = errs;
    await page.addInitScript(() => {
      const obs = new MutationObserver(() => {
        document.querySelectorAll('.login-setup').forEach(el => el.remove());
      });
      obs.observe(document, { childList: true, subtree: true });
    });
    return page;
  };

  const login = async () => {
    await page.goto(BASE + '/#!/login', { waitUntil: 'domcontentloaded' });
    await esperar(500);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#loginUser', { timeout: 8000 });
    await page.fill('#loginUser', USUARIO);
    await page.fill('#loginPass', PASS);
    await page.click('#loginBtn');
    for (let i = 0; i < 30; i++) {
      const ok = await page.evaluate((u) => {
        const s = localStorage.getItem('fb_usuario');
        if (!s) return false;
        try { return JSON.parse(s).username === u; } catch { return false; }
      }, USUARIO);
      if (ok) break;
      await esperar(400);
    }
    await esperar(900);
  };

  try {
    // Primero login en un viewport amplio y luego recorrer rutas en cada viewport
    for (const vp of VIEWPORTS) {
      console.log(`\n========== ${vp.nombre} ==========`);
      await nuevaPagina(vp.w, vp.h);
      await login();
      for (const ruta of RUTAS) {
        await page.evaluate((r) => { location.hash = '#!/' + r; }, ruta.replace(/^\//, ''));
        await esperar(1600);
        // Esperar a que la vista monte contenido (no skeleton)
        try { await page.waitForFunction(() => !document.querySelector('.skeleton-screen') && document.querySelector('#app-root').textContent.trim().length > 50, { timeout: 8000 }); } catch {}
        const res = await auditar(page, `${vp.nombre} :: ${ruta}`);
        resultados.push(res);
        const msgs = [];
        if (res.overflowPx > 0) msgs.push(`OVERFLOW ${res.overflowPx}px [${res.culpablesOverflow.slice(0, 4).join(', ')}]`);
        if (res.tapsPequenos.length) msgs.push(`${res.tapsPequenos.length} tap<44px [${res.tapsPequenos.slice(0, 5).join(', ')}]`);
        if (res.contrasteBajo.length) msgs.push(`${res.contrasteBajo.length} contraste [${res.contrasteBajo.slice(0, 4).join(' | ')}]`);
        if (res.fuenteMinima.length) msgs.push(`${res.fuenteMinima.length} fuente<11.5px [${res.fuenteMinima.slice(0, 3).join(', ')}]`);
        if (res.sinNombre.length) msgs.push(`${res.sinNombre.length} sin-nombre [${res.sinNombre.slice(0, 4).join(', ')}]`);
        if (res.errores.length) msgs.push(`ERR [${res.errores.slice(0, 2).join(' | ')}]`);
        console.log(`${msgs.length ? '⚠️' : '✅'} ${ruta}${msgs.length ? ' → ' + msgs.join(' ; ') : ''}`);
      }
    }

    // Panel admin (HTML directo)
    console.log('\n========== PANEL ADMIN (375x812) ==========');
    await nuevaPagina(375, 812);
    await login();
    await page.goto(BASE + '/paginas/admin/panel-admin.html', { waitUntil: 'domcontentloaded' });
    try { await page.waitForSelector('#adminContenido', { timeout: 8000 }); } catch {}
    await esperar(1200);
    const resAdmin = await auditar(page, 'ADMIN');
    resultados.push(resAdmin);
    console.log(`ADMIN → overflow=${resAdmin.overflowPx}px taps<44=${resAdmin.tapsPequenos.length} contraste=${resAdmin.contrasteBajo.length} fuentes=${resAdmin.fuenteMinima.length} sinNombre=${resAdmin.sinNombre.length} errores=${resAdmin.errores.length}`);

    // ---- Resumen ----
    console.log('\n========== RESUMEN ==========');
    const totalOverflow = resultados.filter(r => r.overflowPx > 0).length;
    const taps = resultados.reduce((a, r) => a + r.tapsPequenos.length, 0);
    const contraste = resultados.reduce((a, r) => a + r.contrasteBajo.length, 0);
    const fuentes = resultados.reduce((a, r) => a + r.fuenteMinima.length, 0);
    const sinNombre = resultados.reduce((a, r) => a + r.sinNombre.length, 0);
    const errs = resultados.reduce((a, r) => a + r.errores.length, 0);
    console.log(`Vistas con overflow horizontal: ${totalOverflow}/${resultados.length}`);
    console.log(`Taps < 44px: ${taps} | Contraste bajo: ${contraste} | Fuentes < 11.5px: ${fuentes} | Sin nombre accesible: ${sinNombre} | Errores consola: ${errs}`);

    // Top offenders de contraste
    const todosContraste = resultados.flatMap(r => r.contrasteBajo.map(c => ({ etiqueta: r.etiqueta, c })));
    const conteo = {};
    todosContraste.forEach(t => {
      const clave = t.c.split(' (')[0];
      conteo[clave] = (conteo[clave] || 0) + 1;
    });
    console.log('\nContraste bajo por selector (repetidos):');
    Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([sel, n]) => console.log(`  ${n}x ${sel}`));

    const todosTaps = resultados.flatMap(r => r.tapsPequenos);
    const tapConteo = {};
    todosTaps.forEach(t => { const k = t.split(' ')[0]; tapConteo[k] = (tapConteo[k] || 0) + 1; });
    console.log('\nTaps pequeños por selector:');
    Object.entries(tapConteo).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([sel, n]) => console.log(`  ${n}x ${sel}`));

    const todosFuentes = resultados.flatMap(r => r.fuenteMinima);
    const fConteo = {};
    todosFuentes.forEach(t => { const k = t.split(' ')[0]; fConteo[k] = (fConteo[k] || 0) + 1; });
    console.log('\nFuentes < 11.5px por selector:');
    Object.entries(fConteo).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([sel, n]) => console.log(`  ${n}x ${sel}`));
  } catch (e) {
    console.log('EXCEPCIÓN: ' + e.message);
  }

  await browser.close();
})();
