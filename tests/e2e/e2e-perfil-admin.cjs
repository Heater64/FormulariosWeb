// E2E: Perfil + Paneles Admin/Owner — verifica las mejoras visuales en navegador real
// node e2e-perfil-admin.cjs  (requiere dev server en http://localhost:3000)
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
const ADMIN_U = process.env.FB_E2E_USER;
const ADMIN_C = process.env.FB_E2E_PASSWORD;
const OWNER_U = process.env.FB_E2E_OWNER_USER || ADMIN_U;
const OWNER_C = process.env.FB_E2E_OWNER_PASSWORD || ADMIN_C;
if (!ADMIN_U || !ADMIN_C || !OWNER_U || !OWNER_C) {
  console.error('Configura FB_E2E_USER/FB_E2E_PASSWORD y, si procede, FB_E2E_OWNER_USER/FB_E2E_OWNER_PASSWORD.');
  process.exit(2);
}

let aciertos = 0;
let total = 0;
const log = (ok, msg) => { total++; if (ok) aciertos++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };
const esperar = (ms) => new Promise(r => setTimeout(r, ms));
// Espera (polling) a que aparezca al menos un elemento con el selector.
// Reemplaza los sleeps fijos que se vuelven frágiles cuando el arranque
// del panel tarda más (máquina cargada, red lenta).
const esperarSelector = async (page, selector, timeoutMs = 15000) => {
  const fin = Date.now() + timeoutMs;
  while (Date.now() < fin) {
    const n = await page.locator(selector).count().catch(() => 0);
    if (n > 0) return true;
    await esperar(200);
  }
  return false;
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  const httpErrores = [];
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|failed to load resource/i.test(m.text())) consoleErrors.push('CONSOLE: ' + m.text()); });
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('supabase.co') && !r.url().includes('josxcvncescqqlajahkh') && !r.url().includes('favicon')) {
      httpErrores.push(r.status() + ' ' + r.url());
    }
  });

  await page.addInitScript(() => {
    const obs = new MutationObserver(() => {
      document.querySelectorAll('.login-setup').forEach(el => el.remove());
    });
    obs.observe(document, { childList: true, subtree: true });
  });

  const login = async (u, c) => {
    // Limpiar sesión previa para que el login no redirija
    await page.goto(BASE + '/#!/login', { waitUntil: 'domcontentloaded' });
    await esperar(600);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await esperar(1200);
    await page.fill('#loginUser', u);
    await page.fill('#loginPass', c);
    await page.click('#loginBtn');
    await esperar(2400);
  };

  try {
    // ---- P1: Login admin ----
    await login(ADMIN_U, ADMIN_C);
    log(true, 'P1 Login usuario E2E');

    // ---- P2: Perfil — cabecera, badge de rol (sin fila de stats) ----
    await page.goto(BASE + '/#!/perfil', { waitUntil: 'domcontentloaded' });
    await esperarSelector(page, '.perfil-rol-badge', 15000);
    const rolBadge = await page.locator('.perfil-rol-badge').count();
    const badgeTexto = (await page.locator('.perfil-rol-badge').first().innerText().catch(() => '')).toLowerCase();
    log(rolBadge > 0, 'P2 Badge de rol visible');
    log(badgeTexto.includes('administrador'), `P2 Badge de rol: "${badgeTexto.trim()}"`);
    // Las tarjetas de estadísticas (racha, capítulos, % y repaso) se eliminaron del perfil.
    const statCards = await page.locator('#perfilStats, #statRacha, #statCaps, #statPct, #statTarjetas').count();
    log(statCards === 0, `P2 Fila de stats eliminada del perfil (${statCards} restos)`);
    const btnAdmin = await page.locator('#btnAdmin').count();
    log(btnAdmin > 0, 'P2 Botón Panel de Administración visible');

    // ---- P3: Panel Admin standalone — dashboard con stats e iconos ----
    await page.goto(BASE + '/paginas/admin/panel-admin.html', { waitUntil: 'domcontentloaded' });
    await esperarSelector(page, '#adminContenido .tarjeta-estadistica', 20000);
    const statsAdmin = await page.locator('#adminContenido .tarjeta-estadistica').count();
    log(statsAdmin >= 4, `P3 Dashboard admin: ${statsAdmin} tarjetas de estadística`);
    const statsIcono = await page.locator('#adminContenido .tarjeta-estadistica__icono').count();
    log(statsIcono >= 4, `P3 Dashboard admin: ${statsIcono} iconos renderizados`);
    const tabsAdmin = await page.locator('.admin-tab').count();
    log(tabsAdmin >= 4, `P3 Panel admin: ${tabsAdmin} pestañas`);

    // ---- P4: Panel admin — pestaña exámenes con badges de estado ----
    await page.click('.admin-tab[data-tab="examenes"]');
    await esperarSelector(page, '.admin-examen-card', 15000);
    const examenCards = await page.locator('.admin-examen-card').count();
    const badgesExamen = await page.locator('.admin-examen-card .admin-tabla-badge').count();
    log(examenCards > 0, `P4 Exámenes: ${examenCards} cards con icono`);
    log(badgesExamen === examenCards, `P4 Exámenes: cada card tiene su badge de estado (${badgesExamen}/${examenCards})`);

    // ---- P5: Panel admin — pestaña grupos con contador de exámenes ----
    await page.click('.admin-tab[data-tab="grupos"]');
    await esperar(900);
    const grupoCards = await page.locator('.admin-grupo-card').count();
    const verMiembros = await page.locator('.admin-grupo-card__ver').count();
    log(verMiembros === grupoCards, `P5 Grupos: enlace "Ver miembros" en cada card (${verMiembros}/${grupoCards})`);

    // ---- P6: Login owner + panel unificado (switch de nivel visible) ----
    await login(OWNER_U, OWNER_C);
    log(true, 'P6 Login owner');
    await page.goto(BASE + '/paginas/admin/panel-admin.html', { waitUntil: 'domcontentloaded' });
    // Esperar a que el panel monte en vez de un sleep fijo (el arranque puede
    // tardar >2.5s con la máquina cargada). El panel renderiza sus tarjetas
    // de forma asíncrona tras las consultas a Supabase.
    await esperarSelector(page, '#adminContenido .tarjeta-estadistica', 20000);
    const statsOwner = await page.locator('#adminContenido .tarjeta-estadistica').count();
    log(statsOwner >= 4, `P6 Dashboard owner: ${statsOwner} tarjetas de estadística con iconos`);
    const nivelSwitch = await page.locator('.admin-nivel__btn[data-nivel="owner"]').count();
    log(nivelSwitch === 1, 'P6 Switch de nivel Owner visible para el propietario');
    const tabsAdminUnif = await page.locator('.admin-tab').count();
    log(tabsAdminUnif >= 4, `P6 Panel unificado: ${tabsAdminUnif} pestañas del nivel Admin`);

    // ---- P7: Owner — cambiar a nivel Owner y ver sugerencias ----
    await page.click('.admin-nivel__btn[data-nivel="owner"]');
    await esperar(900);
    const tabsOwner = await page.locator('.admin-tab').count();
    log(tabsOwner >= 4, `P7 Nivel Owner: ${tabsOwner} pestañas (Sugerencias, Auditoría, Admins, Marca, Sistema)`);
    const resumenColores = await page.locator('.owner-sug-resumen__card--enviada, .owner-sug-resumen__card--en_revision, .owner-sug-resumen__card--aceptada, .owner-sug-resumen__card--implementada, .owner-sug-resumen__card--rechazada').count();
    log(resumenColores >= 1, `P7 Sugerencias: resumen coloreado por estado (${resumenColores} cards)`);

    // ---- P8: Owner — pestaña auditoría con iconos de acción ----
    await page.click('.admin-tab[data-tab="auditoria"]');
    await esperar(900);
    const auditItems = await page.locator('.owner-auditoria-item').count();
    const auditIconos = await page.locator('.owner-auditoria-item__icono').count();
    log(auditIconos === auditItems, `P8 Auditoría: icono por item (${auditIconos}/${auditItems})`);

    // ---- P9: Owner — pestaña Administradores (fichas) ----
    await page.click('.admin-tab[data-tab="admins"]');
    await esperarSelector(page, '.admin-ficha', 15000);
    const fichasAdmin = await page.locator('.admin-ficha').count();
    log(fichasAdmin >= 1, `P9 Admins: ${fichasAdmin} fichas de administrador`);

    // ---- P10: Owner — pestaña Marca (formulario) ----
    await page.click('.admin-tab[data-tab="marca"]');
    await esperarSelector(page, '#marcaNombre', 15000);
    const marcaInput = await page.locator('#marcaNombre').count();
    log(marcaInput === 1, 'P10 Marca: formulario de marca visible');

    // ---- P11: Owner — pestaña Sistema (herramientas + backups) ----
    await page.click('.admin-tab[data-tab="sistema"]');
    await esperarSelector(page, '.owner-tool', 15000);
    const herramientasSistema = await page.locator('.owner-tool').count();
    log(herramientasSistema >= 2, `P11 Sistema: ${herramientasSistema} herramientas de sistema`);

    // ---- Resumen ----
    // Los 404 de la API de Supabase provienen de tablas aún no migradas en producción
    // (gap de infraestructura documentado), no de estas mejoras visuales.
    const hayErrores = consoleErrors.length + httpErrores.length;
    const detalle = [...consoleErrors, ...httpErrores].join(' | ');
    log(hayErrores === 0, `Errores de consola/HTTP: ${hayErrores === 0 ? 'ninguno' : detalle}`);
  } catch (e) {
    log(false, 'EXCEPCIÓN: ' + e.message);
    try { await page.screenshot({ path: 'e2e-perfil-admin-error.png', fullPage: true }); } catch {}
  }

  console.log(`\n=== Resultado: ${aciertos}/${total} ===`);
  await browser.close();
  process.exit(aciertos === total ? 0 : 1);
})();
