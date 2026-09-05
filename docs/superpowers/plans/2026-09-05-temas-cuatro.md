# 4 Temas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 4 temas elegibles desde Apariencia (Umbra Claro/Oscuro + Clásico Claro/Oscuro) con alias retrocompatibles.

**Architecture:** doble atributo: `data-theme` (modo `light|dark|ausente`, intacto — los 228 selectores existentes siguen funcionando) + `data-tema` (id completo `umbra-claro|umbra-oscuro|clasico-claro|clasico-oscuro|ausente`, solo overrides Umbra en `_tokens.css`); normalización legacy en 4 JS (incluye `login.html` inline); grid 2x2 en `_configApariencia`. Sin hojas nuevas, sin migración de datos.

**Tech Stack:** HTML + CSS (ITCSS/BEM, Custom Properties) + JS nativo ES Modules + vitest (node env).

## Global Constraints

- Todos los valores visuales usan tokens `var(--*)` de `css/00-settings/`; hex solo en previews ornamentales.
- Clases BEM kebab-case; cada bloque en su único `_*.css`; utilidades `u-` al final.
- Solo `var(--transicion-rapida|normal|lenta)` y `var(--easing-*)`; nunca literales.
- Sin scripts inline ni `onclick=` (CSP producción); `theme-init.js` externo y bloqueante.
- Toque mínimo 48px; `prefers-reduced-motion` respetado; foco visible; `radiogroup` + `aria-checked`.
- `light`/`claro`→`clasico-claro`, `dark`/`oscuro`→`clasico-oscuro`, `null`=Auto (clásico según SO). `data-theme` = modo (`light` si el id termina en `-claro`, `dark` si termina en `-oscuro`); `data-tema` = id completo.

---

### Task 1: Tokens 4 temas + test base

**Files:**
- Modify: `css/00-settings/_tokens.css`
- Create: `tests/temas-cuatro.test.js`
- Test: `tests/temas-cuatro.test.js`

**Interfaces:**
- Consumes: nada (base del plan).
- Produces: bloques `:root[data-tema="umbra-claro"]`, `:root[data-tema="umbra-oscuro"]` (overrides tras los bloques dark existentes); `data-theme` no se toca; exporta IDs `umbra-claro|umbra-oscuro|clasico-claro|clasico-oscuro` + regla modo (`*-claro`→`light`, `*-oscuro`→`dark`) para Task 2/3.

- [ ] **Step 1: Write the failing test**

```js
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function luminancia(hex) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(parseInt(hex.slice(1,3),16)) + 0.7152 * f(parseInt(hex.slice(3,5),16)) + 0.0722 * f(parseInt(hex.slice(5,7),16));
}
const contraste = (a,b) => { const [l1,l2]=[luminancia(a),luminancia(b)].sort((x,y)=>y-x); return (l1+0.05)/(l2+0.05); };

describe('4 temas: tokens', () => {
  test('existen los overrides umbra por data-tema (data-theme intacto)', () => {
    const css = read('css/00-settings/_tokens.css');
    for (const s of ['[data-tema="umbra-claro"]','[data-tema="umbra-oscuro"]']) expect(css).toContain(s);
    expect(css).toContain('[data-theme="dark"]');
  });
  test('umbra claro: frambuesa sobre blanco pasa AA', () => {
    expect(contraste('#c2185b','#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
  test('umbra oscuro usa coral y fondo casi negro', () => {
    const css = read('css/00-settings/_tokens.css');
    expect(css).toContain('#e8735a');
    expect(css).toContain('#0a0a0c');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/temas-cuatro.test.js`
Expected: FAIL (Cannot find module / bloques ausentes).

- [ ] **Step 3: Write minimal implementation**

En `css/00-settings/_tokens.css`, al final del archivo (tras los bloques dark y HC existentes, para que ganen por cascada con igual especificidad), añadir solo overrides Umbra por `data-tema` (Clásico no necesita bloques: base `:root` + dark existentes lo cubren):

```css
/* ===== THEME: Umbra Claro (porcelana rosa; override sobre base clara) ===== */
:root[data-tema="umbra-claro"] {
  --color-acento: #c2185b;
  --color-acento-hover: #d63068;
  --color-acento-soft: #fdf3f6;
  --color-acento-soft-hover: #f8e7ee;
  --color-acento-fuerte: #a5124b;
  --color-texto-acento: #FFFFFF;
  --color-texto: rgba(50,16,32,.94);
  --color-texto-secundario: rgba(50,16,32,.62);
  --color-texto-terciario: rgba(50,16,32,.40);
  --color-fondo: #faf6f8;
  --color-fondo-alt: #fdf3f6;
  --color-fondo-tarjeta: #ffffff;
  --color-borde: rgba(50,16,32,.12);
  --color-borde-foco: #c2185b;
  --color-exito: #15803d;
  --color-exito-soft: #DCFCE7;
  --color-error: #dc2626;
  --color-error-soft: #FEE2E2;
  --color-aviso: #b45309;
  --color-aviso-soft: #FEF3C7;
  --color-info: #2563eb;
  --color-info-soft: #E0F2FE;
  --fuente-display: "Playfair Display", Georgia, "Times New Roman", serif;
}
/* ===== THEME: Umbra Oscuro (override sobre base oscura) ===== */
:root[data-tema="umbra-oscuro"] {
  --color-acento: #e8735a;
  --color-acento-hover: #f0846c;
  --color-acento-soft: rgba(232,115,90,.12);
  --color-acento-soft-hover: rgba(232,115,90,.22);
  --color-acento-fuerte: #d4624a;
  --color-texto-acento: #0a0a0c;
  --color-texto: rgba(255,255,255,.93);
  --color-texto-secundario: rgba(255,255,255,.65);
  --color-texto-terciario: rgba(255,255,255,.38);
  --color-fondo: #0a0a0c;
  --color-fondo-alt: #111114;
  --color-fondo-tarjeta: #19191d;
  --color-borde: rgba(255,255,255,.10);
  --color-borde-foco: #e8735a;
  --color-exito: #5FE0A0;
  --color-exito-soft: #123E36;
  --color-error: #FF8A92;
  --color-error-soft: #542A38;
  --color-aviso: #FFD166;
  --color-aviso-soft: #4C3A1C;
  --color-info: #72D4FF;
  --color-info-soft: #123E56;
  --color-fondo-dibujo: #F7F9FC;
  --color-vidrio: rgba(17,17,20,.86);
  --color-vidrio-borde: rgba(255,255,255,.10);
  --fuente-display: "Playfair Display", Georgia, "Times New Roman", serif;
}
```

Nota: no se toca ningún selector `data-theme` existente (228 usos siguen intactos); el `@media (prefers-color-scheme: dark)` se deja intacto (Auto clásico).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/temas-cuatro.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add css/00-settings/_tokens.css tests/temas-cuatro.test.js
git commit -m "feat(temas): tokens 4 temas umbra + clasico con alias"
```

---

### Task 2: Normalización JS en 4 archivos (dual atributo)

**Files:**
- Modify: `js/utilidades/preferencias.js`
- Modify: `js/core/theme-init.js`
- Modify: `public-site/theme.js`
- Modify: `login.html` (script inline de tema, líneas ~28-45)
- Test: `tests/temas-cuatro.test.js` (añadir 2 tests)

**Interfaces:**
- Consumes: IDs de Task 1.
- Produces: `normalizarTema()` implícito (mismo mapa en 4 archivos) + escritura dual `data-theme` (modo) + `data-tema` (id) + `isDark = /-oscuro$/` para Task 3 y theme-color.

- [ ] **Step 1: Write the failing test (añadir al mismo archivo)**

```js
test('preferencias.js normaliza legacy y acepta los 4 ids', () => {
  const js = read('js/utilidades/preferencias.js');
  for (const s of ['umbra-claro','umbra-oscuro','clasico-claro','clasico-oscuro']) expect(js).toContain(s);
  expect(js).toContain("claro");
});
test('theme-init, public theme y login escriben dual atributo (comportamiento, no literales)', () => {
  for (const f of ['js/core/theme-init.js','public-site/theme.js','login.html','js/utilidades/preferencias.js']) {
    const src = read(f);
    expect(src).toContain('dataset.tema');
    expect(src).toContain('aplicarTema');
  }
  expect(read('js/core/theme-init.js')).toContain("dataset.theme");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/temas-cuatro.test.js`
Expected: FAIL (2 tests nuevos fallan).

- [ ] **Step 3: Write minimal implementation**

`js/utilidades/preferencias.js`: sustituir DEFAULTS/lectura/guardado/`_bgActual`/`aplicar` por:

```js
const CLAVE = 'fb_preferencias';
const TEMAS = ['umbra-claro','umbra-oscuro','clasico-claro','clasico-oscuro'];
const DEFAULTS = { tema: null, alto_contraste: false, letra_grande: false };
function normalizarTema(t) {
  if (t === 'claro') return 'clasico-claro';
  if (t === 'oscuro') return 'clasico-oscuro';
  if (t === 'light') return 'clasico-claro';
  if (t === 'dark') return 'clasico-oscuro';
  return TEMAS.includes(t) ? t : null;
}
```

`leer()`: `tema: normalizarTema(p.tema)` (sin elección → null = Auto). `guardar()`: `tema: pref.tema !== undefined ? normalizarTema(pref.tema) : actual.tema`. `_bgActual`: mapa `{'umbra-oscuro':'#0a0a0c','clasico-oscuro':'#0B1020','umbra-claro':'#faf6f8','clasico-claro':'#FFFFFF'}` + Auto por `matchMedia`. Escritura dual (en `aplicar()` y en cada click de Task 3):

```js
function aplicarTema(root, id) {
  if (!id) { delete root.dataset.theme; delete root.dataset.tema; return; }
  root.dataset.theme = /-oscuro$/.test(id) ? 'dark' : 'light';
  root.dataset.tema = id;
}
```

`isDark = /-oscuro$/.test(p.tema||'') || (!p.tema && matchMedia dark)`.

`js/core/theme-init.js`: mismo `normalizarTema` + mapa bg/txt (`umbra-claro #faf6f8`, `clasico-claro #FFFFFF`, `umbra-oscuro #0a0a0c`, `clasico-oscuro #0B1020`); escribe dual: `data-theme` = modo (`light` si `*-claro`, `dark` si `*-oscuro`) + `data-tema` = id; sin elección → borra ambos (Auto).

`public-site/theme.js`: mismo mapa dual + meta theme-color por id, con excepción legacy: la meta de `clasico-claro` es `#FAFAF9` (valor original de la landing, se conserva; en app el bg de `clasico-claro` sigue `#FFFFFF`).

`login.html` (inline ~líneas 28-45): mismo mapa dual mínimo (normaliza `claro/oscuro/light/dark`, escribe `data-theme` + `data-tema`); no tocar sus `<style>` con `:not([data-theme="light"])` — siguen funcionando vía modo.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/temas-cuatro.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add js/utilidades/preferencias.js js/core/theme-init.js public-site/theme.js login.html tests/temas-cuatro.test.js
git commit -m "feat(temas): normalizacion 4 temas + auto en app y sitio publico"
```

---

### Task 3: Selector elegante en Apariencia + CSS

**Files:**
- Modify: `js/vistas/vista-perfil.js:463-537` (`_configApariencia`)
- Modify: `css/05-componentes/_perfil.css` (añadir `.tema-grid`, `.tema-card`)
- Test: `tests/temas-cuatro.test.js` (añadir 1 test de marcado)

**Interfaces:**
- Consumes: IDs y `guardarPref(usuario,'tema',id|null)` de Task 2.
- Produces: UI final verificable en `/perfil/config/apariencia`; nada posterior depende de ella.

- [ ] **Step 1: Write the failing test**

```js
test('apariencia ofrece grid 2x2 con los 4 temas + auto', () => {
  const v = read('js/vistas/vista-perfil.js');
  for (const s of ['tema-grid','umbra-claro','umbra-oscuro','clasico-claro','clasico-oscuro','data-tema="auto"']) expect(v).toContain(s);
  expect(read('css/05-componentes/_perfil.css')).toContain('.tema-card');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/temas-cuatro.test.js`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

En `_configApariencia`, sustituir `.perfil-segmented` por:

```html
<div class="tema-grid" role="radiogroup" aria-label="Seleccionar tema">
  <!-- por cada tema: button.tema-card[data-tema=id] con span.tema-card__preview (3 franjas inline con sus hex) + span.tema-card__nombre + span.tema-card__check -->
</div>
<button class="perfil-segmented__btn" data-tema="auto">Seguir sistema (Auto)</button>
```

JS: click fija dual `dataset.theme` = modo + `dataset.tema` = id (en auto borra ambos), `aria-checked`, clase `--activo`, y `guardarPref(usuario,'tema', id|null)`; reset → `{tema:null,...}` + borra ambos atributos + `router.navegar('/perfil/config/apariencia')`. Mantener toggles HC/LG y confirm de reset intactos. Orden: Umbra Claro, Umbra Oscuro, Clásico Claro, Clásico Oscuro; etiqueta grupo "Claros" / "Oscuros" como `aria-label` en cada tarjeta.

CSS (solo tokens + previews fijas):

```css
.tema-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:var(--espaciado-sm); margin-top:var(--espaciado-sm); }
.tema-card { min-height:var(--toque-minimo); display:flex; flex-direction:column; gap:var(--espaciado-xs); padding:var(--espaciado-sm); background:var(--color-fondo-tarjeta); border:1px solid var(--color-borde); border-radius:var(--radio-lg); cursor:pointer; transition:transform var(--transicion-rapida), box-shadow var(--transicion-rapida), border-color var(--transicion-rapida); text-align:left; font:inherit; color:var(--color-texto); }
.tema-card:hover { transform:translateY(-1px); box-shadow:var(--sombra-md); }
.tema-card--activo { border:2px solid var(--color-acento); box-shadow:var(--focus-ring); }
.tema-card__preview { display:flex; gap:4px; }
.tema-card__preview i { flex:1; height:22px; border-radius:var(--radio-sm); border:1px solid var(--color-borde); }
.tema-card__nombre { font-size:var(--texto-sm); font-weight:600; }
.tema-card__check { margin-left:auto; }
@media (prefers-reduced-motion: reduce) { .tema-card { transition:none; } }
```

- [ ] **Step 4: Run tests + verificación manual**

Run: `npx vitest run tests/temas-cuatro.test.js`
Expected: PASS (6 tests).
Manual: abrir `/perfil/config/apariencia`, pulsar las 4 tarjetas (persisten tras recarga), Auto sigue al SO, teclado Tab+Enter, 360/390/768 sin overflow, login + landing cambian igual.

- [ ] **Step 5: Commit**

```bash
git add js/vistas/vista-perfil.js css/05-componentes/_perfil.css tests/temas-cuatro.test.js
git commit -m "feat(temas): selector elegante 2x2 con preview en apariencia"
```
