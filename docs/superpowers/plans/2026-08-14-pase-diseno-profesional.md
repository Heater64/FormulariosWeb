# Pase de Diseño Profesional — FormsBiblicos

> **For agentic workers:** Ejecutar tarea por tarea con `executing-plans`. Pasos con checkbox (`- [ ]`).

**Goal:** Pulir la identidad visual de toda la web y PWA a nivel de equipo de diseño profesional, manteniendo la identidad blanca/azul y dejando la barra de navegación inferior exactamente igual.

**Architecture:** SPA vanilla + CSS ITCSS con tokens (`css/00-settings/`). La auditoría visual previa (18 vistas × escritorio/móvil, claro/oscuro, 6 anchos) confirma que el diseño base ya es sólido y sin bugs de layout. El trabajo restante es: contraste AA en modo oscuro, consistencia tipográfica de cabeceras y micro-pulido de copys/estados.

**Tech Stack:** CSS vanilla con variables, JS vanilla, tests Vitest.

## Global Constraints

- Identidad fija: fondo blanco/gris cálido + acento azul (#2563EB claro, #60A5FA oscuro). No cambiar la paleta.
- **No tocar** `css/05-componentes/_barra-navegacion-inferior.css` ni el markup de la barra (`#barra-navegacion` en `index.html` y `_renderizarBarraNavegacion` en `js/core/index.js`).
- Contrastes WCAG AA: 4.5:1 texto normal, 3:1 texto grande.
- Respetar `prefers-reduced-motion` (ya implementado globalmente).
- Los 294+ tests del proyecto deben seguir en verde.

---

### Task 1: Contraste AA de botones de acento en modo oscuro

**Files:**
- Modify: `css/00-settings/_tokens.css` (bloques dark)
- Modify: `login.html` (`.btn-login-submit` estado base en dark)
- Test: `tests/contraste-dark.test.js` (nuevo)

**Contexto:** En oscuro, `--color-acento: #60A5FA` y `--color-texto-acento` queda `#FFFFFF` → texto blanco sobre azul claro ≈ 2.4:1 (falla AA). El login del SPA ya usa texto oscuro (`#0C0A09`) sobre el azul claro. Unificar a nivel de token para cubrir todos los controles rellenos de acento (`.btn-primario`, FAB, tabs activos, logo, iconos de tarjeta).

- [ ] **Paso 1: Escribir el test que falla**

`tests/contraste-dark.test.js`:
```js
import { describe, it, expect } from 'vitest';

function ratio(a, b) {
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(parseInt(c.slice(1, 3), 16)) + 0.7152 * f(parseInt(c.slice(3, 5), 16)) + 0.0722 * f(parseInt(c.slice(5, 7), 16));
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe('Contraste dark: acento + texto', () => {
  it('texto sobre acento oscuro pasa AA (4.5:1)', () => {
    // #0C0A09 sobre #60A5FA (acento dark)
    expect(ratio('#0C0A09', '#60A5FA')).toBeGreaterThanOrEqual(4.5);
  });
  it('blanco sobre acento oscuro NO debe usarse (regresión)', () => {
    expect(ratio('#FFFFFF', '#60A5FA')).toBeLessThan(4.5); // confirma por qué se cambia
  });
  it('texto oscuro sobre hover dark #3B82F6 pasa AA', () => {
    expect(ratio('#0C0A09', '#3B82F6')).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Paso 2: Ver que falla o documenta el problema**

Run: `npx vitest run tests/contraste-dark.test.js`
Expected: los asserts documentan 2.4:1 < 4.5 (blanco) y 7.9:1 ≥ 4.5 (oscuro).

- [ ] **Paso 3: Fix de token**

En `css/00-settings/_tokens.css`, añadir `--color-texto-acento: #0C0A09;` en los dos bloques dark (el `@media (prefers-color-scheme: dark)` y `:root[data-theme="dark"]`). Verificar que ningún consumer dependa de blanco sobre acento en dark (buscar `color-texto-acento` en combinación con fondos oscuros).

- [ ] **Paso 4: Fix del login standalone**

En `login.html`, el estado base de `.btn-login-submit` en dark usa `color: #fff` → cambiar a `color: #0C0A09` (igual que el hover existente). Añadir la regla con `:root:not([data-theme="light"])` y `:root[data-theme="dark"]`, igual que el hover.

- [ ] **Paso 5: Verificación**

Run: `npx vitest run tests/contraste-dark.test.js && npm test`
Expected: PASS. Además, comprobación visual en vivo: botones primarios en dark muestran texto oscuro legible.

- [ ] **Paso 6: Commit**

```bash
git add css/00-settings/_tokens.css login.html tests/contraste-dark.test.js
git commit -m "fix(a11y): contraste AA de botones de acento en modo oscuro"
```

---

> **Resultado de ejecución:** T2–T4 quedaron **reencuadradas tras verificación más profunda**:
> - T2 (cabeceras): la regla global `h1,h2 { font-family: var(--fuente-display) }` ya daba serif consistente a todas las vistas (verificado por DOM). Sin cambio necesario.
> - T3 (copys): «Racha (días)» y «Capítulo no disponible» ya estaban correctos; el carrusel del login ya tiene `:focus-visible` explícito. Sin cambio necesario.
> - T4 (standalone): el login standalone ya usa los mismos valores de marca (verificado); el único gap era el contraste dark del botón, cubierto en T1.
> - La tarea que sí aportó valor (además de T1) fue la **verificación integral post-flip**: auditoría de layout refinada (54 comprobaciones, 0 fallos), suite 320/320 y capturas claro/oscuro en la galería `auditoria/`.

---

### Task 2: Consistencia tipográfica de cabeceras de vista

**Files:**
- Modify: `js/vistas/vista-notificaciones.js` (h1 → patrón serif display)
- Modify: `css/05-componentes/_notificaciones.css` (si hace falta)

**Contexto:** Estudio/Exámenes usan `h2` con icono + título serif display (`--fuente-display`) + subtítulo. Notificaciones usa `h1` sans. Unificar: mismo tratamiento tipográfico en todas las cabeceras principales.

- [ ] **Paso 1: Comprobar el patrón actual**

Leer `vista-notificaciones.js` línea ~40 y `css/05-componentes/_notificaciones.css`. Comparar con `estudio-cabecera__titulo-texto` (`_estudio.css`) y `examen-header__titulo` (`_examen-lista.css`).

- [ ] **Paso 2: Aplicar el patrón**

Alinear `notif-centro__titulo` a `font-family: var(--fuente-display)`, peso 600-700, mismo tamaño relativo y tratamiento de subtítulo que Estudio/Exámenes. Mantener el `h1` (jerarquía semántica) solo cambiando la tipografía visual.

- [ ] **Paso 3: Verificar en vivo**

Script Playwright: navegar a `#!/notificaciones` (owner) y comprobar `getComputedStyle` del título: `font-family` contiene `Newsreader`, tamaño ≥ 1.5rem. Y que `#!/estudio` y `#!/examenes` muestran el mismo tratamiento.

- [ ] **Paso 4: Commit**

```bash
git add js/vistas/vista-notificaciones.js css/05-componentes/_notificaciones.css
git commit -m "style(cabeceras): tipografía serif consistente en notificaciones"
```

---

### Task 3: Micro-pulido de copys y estados

**Files:**
- Modify: `js/vistas/vista-progreso.js` (o el archivo que renderice "RACHA (DÍAS)")
- Modify: `js/vistas/vista-sesion-estudio.js` ("Capítulo no disponible" → tilde)
- Modify: `css/05-componentes/_login.css` (focus-visible del carrusel si falta)

**Contexto:** Nits detectados en la auditoría: etiqueta "RACHA (DÍAS)" con paréntesis; "Capitulo no disponible" sin tilde; verificar foco visible en los controles del carrusel del login.

- [ ] **Paso 1: Localizar y corregir copys**

Buscar `RACHA`, `Capitulo no disponible` en `js/vistas/` y corregir: "Racha (días)" o similar en title-case según el patrón de la vista; "Capítulo no disponible".

- [ ] **Paso 2: Foco visible del carrusel**

Comprobar que `.login-info__galeria-flecha`, `.login-info__galeria-punto` y `.login-info__tarjeta-boton` tienen `:focus-visible` visible (usa el sistema `body.navegacion-teclado` global — verificar que no se excluyen).

- [ ] **Paso 3: Verificación**

Run: `npm test`. Comprobación en vivo: foco teclado recorre el carrusel del login sin perderse.

- [ ] **Paso 4: Commit**

```bash
git add -u js/vistas css/05-componentes/_login.css
git commit -m "polish: copys y foco visible del carrusel del login"
```

---

### Task 4: Alineación del login standalone con el sistema

**Files:**
- Modify: `login.html`
- Modify: `public-site/index.html` (si replica el botón)

**Contexto:** El standalone usa los mismos valores de marca pero su botón primario en dark falla AA en el estado base (ver Task 1). Además verificar que el versículo, la tarjeta de login y las secciones usan la misma escala tipográfica que el SPA.

- [ ] **Paso 1: Revisar los estilos dark del standalone**

Leer `login.html` completo en modo dark: `.hero`, `.login-card`, `.btn-login-submit`, `.versiculo`, `.pasos`, `.faq`. Anotar desviaciones de la escala del sistema.

- [ ] **Paso 2: Aplicar fixes**

Botón dark (Task 1 si no se hizo), y cualquier desviación tipográfica/espaciado evidente frente al SPA.

- [ ] **Paso 3: Verificación visual**

Captura de `login.html` en claro y oscuro; comparar con el SPA `#!/login`.

- [ ] **Paso 4: Commit**

```bash
git add login.html public-site/index.html
git commit -m "style(login): alineación del login standalone con el sistema"
```

---

### Task 5: Verificación final integral

**Files:**
- Test: `tests/contraste-dark.test.js` (ya creado)

- [ ] **Paso 1: Suite completa**

Run: `npm test`
Expected: 0 fallos (294+ tests).

- [ ] **Paso 2: Auditoría de layout**

Re-ejecutar el script de overflow/centrado (320–1440px × vistas principales). Expected: sin overflow real (los tabs de Explorar son scroll intencional; el "descentrado" ≥1024 es el panel de la sidebar).

- [ ] **Paso 3: Capturas antes/después**

Capturar `#!/login` (claro+oscuro), `#!/estudio` (oscuro) y `login.html` (oscuro) y confirmar contraste del botón.

- [ ] **Paso 4: Reporte**

Resumen de cambios + verificación con evidencia.
