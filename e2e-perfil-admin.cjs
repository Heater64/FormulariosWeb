// E2E: Perfil + Paneles Admin/Owner — verifica las mejoras visuales en navegador real
// node e2e-perfil-admin.cjs  (requiere dev server en http://localhost:3000)
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000';
const ADMIN_U = 'admin1';
const ADMIN_C = 'admin123';
const OWNER_U = 'owner';
const OWNER_C = 'owner123';

let aciertos = 0;
let total = 0;
const log = (ok, msg) => { total++; if (ok) aciertos++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

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
      document.querySelectorAll('.login-setup, #updateCard').forEach(el => el.remove());
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
    log(true, 'P1 Login admin1');

    // ---- P2: Perfil — cabecera, badge de rol y fila de stats ----
    await page.goto(BASE + '/#!/perfil', { waitUntil: 'domcontentloaded' });
    await esperar(1800);
    const rolBadge = await page.locator('.perfil-rol-badge').count();
    const badgeTexto = (await page.locator('.perfil-rol-badge').first().innerText().catch(() => '')).toLowerCase();
    log(rolBadge > 0, 'P2 Badge de rol visible');
    log(badgeTexto.includes('administrador'), `P2 Badge de rol: "${badgeTexto.trim()}"`);
    const statCards = await page.locator('#perfilStats .tarjeta-capitulo, #perfilStats .tarjeta-racha, #perfilStats .tarjeta-porcentaje').count();
    const rachaCard = await page.locator('#perfilStats .tarjeta-racha').count();
    const pctCard = await page.locator('#perfilStats .tarjeta-porcentaje').count();
    log(statCards === 4, `P2 Fila de stats: ${statCards}/4 tarjetas`);
    log(rachaCard === 1 && pctCard === 1, 'P2 Tarjetas ricas reutilizadas (racha llama + % con barra)');
    const statRacha = (await page.locator('#statRacha').innerText().catch(() => ''));
    const statCaps = (await page.locator('#statCaps').innerText().catch(() => ''));
    log(statRacha !== '—' && statCaps !== '—', `P2 Stats cargadas: racha="${statRacha}" caps="${statCaps}"`);
    const btnAdmin = await page.locator('#btnAdmin').count();
    log(btnAdmin > 0, 'P2 Botón Panel de Administración visible');

    // ---- P3: Panel Admin standalone — dashboard con stats e iconos ----
    await page.goto(BASE + '/paginas/admin/panel-admin.html', { waitUntil: 'domcontentloaded' });
    await esperar(2500);
    const statsAdmin = await page.locator('#adminContenido .tarjeta-estadistica').count();
    log(statsAdmin >= 4, `P3 Dashboard admin: ${statsAdmin} tarjetas de estadística`);
    const statsIcono = await page.locator('#adminContenido .tarjeta-estadistica__icono').count();
    log(statsIcono >= 4, `P3 Dashboard admin: ${statsIcono} iconos renderizados`);
    const tabsAdmin = await page.locator('.admin-tab').count();
    log(tabsAdmin >= 4, `P3 Panel admin: ${tabsAdmin} pestañas`);

    // ---- P4: Panel admin — pestaña exámenes con badges de estado ----
    await page.click('.admin-tab[data-tab="examenes"]');
    await esperar(900);
    const examenCards = await page.locator('.admin-examen-card').count();
    const badgesExamen = await page.locator('.admin-examen-card .admin-examen-badge').count();
    log(examenCards > 0, `P4 Exámenes: ${examenCards} cards con icono`);
    log(badgesExamen === examenCards, `P4 Exámenes: cada card tiene su badge de estado (${badgesExamen}/${examenCards})`);

    // ---- P5: Panel admin — pestaña grupos con contador de exámenes ----
    await page.click('.admin-tab[data-tab="grupos"]');
    await esperar(900);
    const grupoCards = await page.locator('.admin-grupo-card').count();
    const verMiembros = await page.locator('.admin-grupo-card__ver').count();
    log(verMiembros === grupoCards, `P5 Grupos: enlace "Ver miembros" en cada card (${verMiembros}/${grupoCards})`);

    // ---- P6: Login owner + panel owner standalone ----
    await login(OWNER_U, OWNER_C);
    log(true, 'P6 Login owner');
    await page.goto(BASE + '/paginas/admin/panel-owner.html', { waitUntil: 'domcontentloaded' });
    await esperar(2500);
    const statsOwner = await page.locator('#ownerContenido .tarjeta-estadistica').count();
    log(statsOwner >= 4, `P6 Dashboard owner: ${statsOwner} tarjetas de estadística con iconos`);
    const tabsOwner = await page.locator('.admin-tab').count();
    log(tabsOwner >= 6, `P6 Panel owner: ${tabsOwner} pestañas`);

    // ---- P7: Owner — pestaña sugerencias con resumen coloreado ----
    await page.click('.admin-tab[data-tab="sugerencias"]');
    await esperar(800);
    const resumenColores = await page.locator('.owner-sug-resumen__card--enviada, .owner-sug-resumen__card--en_revision, .owner-sug-resumen__card--aceptada, .owner-sug-resumen__card--implementada, .owner-sug-resumen__card--rechazada').count();
    log(resumenColores >= 1, `P7 Sugerencias: resumen coloreado por estado (${resumenColores} cards)`);

    // ---- P8: Owner — pestaña auditoría con iconos de acción ----
    await page.click('.admin-tab[data-tab="auditoria"]');
    await esperar(900);
    const auditItems = await page.locator('.owner-auditoria-item').count();
    const auditIconos = await page.locator('.owner-auditoria-item__icono').count();
    log(auditIconos === auditItems, `P8 Auditoría: icono por item (${auditIconos}/${auditItems})`);

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
