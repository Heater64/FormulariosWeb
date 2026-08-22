---
name: diseño-global
description: Sistema de diseño integral para interfaces web y mobile. Combina los principios de frontend-design, designing-frontend-interfaces, animations.dev, impeccable.style, tasteskill.dev, y Refactoring UI. Genera interfaces con personalidad propia, sin slop de IA, con animaciones que se sienten bien y tipografía con carácter.
---

# Diseño Global - Sistema de Diseño para Interfaces

## Identidad del Proyecto

**NO CAMBIAR** los colores principales ni la personalidad existente del proyecto. Esta skill se integra con el design system actual, no lo reemplaza. Cuando exista un DESIGN.md o tokens definidos, respetarlos como fuente de verdad.

---

## §0 - Inferencia del Brief

Antes de diseñar, leer el contexto:

1. **¿Qué es?** — Nombre concreto del producto, no genérico.
2. **¿Para quién?** — Audiencia real, no "usuarios".
3. **¿Qué debería hacer la página?** — Un solo trabajo por superficie.
4. **¿Qué tono?** — Brutalista, editorial, lujo, orgánico, minimal, etc.
5. **¿Qué evitar?** — Referencias negativas explícitas.

Declarar una línea de dirección visual antes de tocar código. Si el brief no pincha una dirección, elegir una y justificarla.

---

## §1 - Principios de Diseño Visual

### Tipografía con Personalidad

- **NUNCA** usar fuentes genéricas por defecto (Arial, Inter, Roboto, system fonts).
- Elegir una fuente display con carácter que sea memorable por sí misma.
- Pair display + body deliberadamente: la personalidad de la página está en el tipo.
- Establecer una escala de tipos clara con pesos, anchos y spacing intencionales.
- El tratamiento tipográfico es parte del diseño, no un vehículo neutral para contenido.

**Fuentes recomendadas por estilo:**
| Estilo | Display | Body |
|--------|---------|------|
| Editorial | Cormorant Garamond, Playfair Display, EB Garamond | Source Serif 4, Libre Caslon |
| Moderno | Space Grotesk, Syne, Outfit | DM Sans, Inter, Sora |
| Lujo | Bodoni Moda, Didot, Cinzel | Cormorant, Newsreader |
| Brutalista | Archivo Narrow, Barlow Condensed, Anton | IBM Plex Sans, Roboto Mono |
| Orgánico | Literata, Noto Serif, Merriweather | Nunito Sans, Work Sans |

### Color con Intención

- Paleta de 4-6 colores con nombres descriptivos.
- Un color accent dominante, no distribución tímida.
- CSS variables para consistencia: `--color-primary`, `--color-surface`, `--color-text`, etc.
- Nunca usar gradientes purple-on-white como default de IA.
- Off-black (#0a0a0b o #111) y off-white (#fafaf9 o #f5f5f4), nunca valores puros.

### Espacio como Herramientura

- El espacio negativo es diseño, no vacío.
- Breakpoints de 4px o 8px para spacing consistente.
- Generosidad espacial > densidad controlada (para la mayoría de briefs).
- Jerarquía visual lograda con espacio, no solo con tamaño de fuente.

---

## §2 - Anti-Slop: Lo que NUNCA Hacer

Estos patrones hacen que todo se vea igual. Prohibidos por defecto:

### Layout y Estructura
- ❌ Tres cards iguales en fila como "features"
- ❌ Hero con headline grande + subtext + gradient purple
- ❌ Secciones numeradas (01, 02, 03) cuando el contenido no es secuencial
- ❌ Fake UI de producto hecha con divs (terminales, dashboards falsos)
- ❌ border-t + border-b en cada fila de listas largas

### Copy y Contenido
- ❌ Guiones largos (—) y medios (–) en copy de salida. Usar guiones cortos (-) o reestructurar.
- ❌ Eyebrows numerados (00 · Índice, 001 · Capacidades)
- ❌ Labels de versión en hero (V0.6, BETA) salvo que el brief sea un launch
- ❌ Strips decorativos de estado (Lisbon 14:23 · 18°C)
- ❌ Scroll cues (Scroll, down-arrow, Scroll to explore)
- ❌ Photo-credit como decoración bajo stock images

### Visual
- ❌ Gradient purple + mesh blobs como default
- ❌ Glassmorphism genérico
- ❌ Illustraciones SVG decorativas hechas a mano (salvo mark geométrico simple)
- ❌ Pills flotados sobre imágenes
- ❌ Status dots decorativos (solo estado semántico real, máximo 1 por sección)
- ❌ Drop shadows genéricos

### Motion
- ❌ `window.addEventListener('scroll')` en JS — usar IntersectionObserver, CSS scroll-driven animations, o librerías de motion
- ❌ Animaciones scattered sin orchestración
- ❌ Transiciones que no respetan `prefers-reduced-motion`

---

## §3 - Animaciones que se Sienten Bien

Referencia: animations.dev (Emil Kowalski)

### Framework de Decisión

**¿Esta cosa debería animarse?**
- Si el usuario lo ve una vez → animación de entrada vale la pena
- Si el usuario lo ve 50 veces al día → sutil o nada
- Si distrae de la tarea → no animar

### Easing y Timing

| Tipo de movimiento | Easing recomendado |
|-------------------|-------------------|
| Elementos entrando | `ease-out` (desacelera al llegar) |
| Elementos saliendo | `ease-in` (acelera al irse) |
| Movimiento natural | Spring animations (no lineales) |
| UI state changes | `ease-in-out` rápido (150-200ms) |
| Hover micro-interactions | `ease-out` (200-300ms) |

### Duraciones

| Contexto | Duración |
|----------|----------|
| Tooltip/popover | 150-200ms |
| Button hover | 200ms |
| Page transition | 300-400ms |
| Drawer/modal open | 300-500ms |
| Scroll reveal | 400-600ms |
| Hero entrance | 600-1000ms |

### Reglas de Oro

1. **Transform y opacity primero** — son las únicas propiedades GPU-accelerated de forma consistente.
2. **Si todo se anima, nada se destaca** — orquestar, no scatter.
3. **Spring animations para elementos orgánicos** — drawer, dynamic island, modales.
4. **Stagger para listas** — cada item con delay incremental (50-100ms entre items).
5. **Reduced motion siempre** — `@media (prefers-reduced-motion: reduce)` con `animation-duration: 0.01ms`.

### CSS Patterns

```css
/* Entrada con stagger */
.stagger-item {
  opacity: 0;
  transform: translateY(12px);
  animation: fadeSlideUp 0.5s ease forwards;
}
.stagger-item:nth-child(1) { animation-delay: 0.1s; }
.stagger-item:nth-child(2) { animation-delay: 0.2s; }

@keyframes fadeSlideUp {
  to { opacity: 1; transform: translateY(0); }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## §4 - Proceso de Diseño

### Loop de 3 fases

```
BRAINSTORM → PLAN → BUILD → CRITIQUE → REFINISH
```

1. **Brainstorm** — Dirección visual en 1 línea + token system compacto (color, type, layout, signature).
2. **Plan** — Revisar contra el brief. Si algo suena a default genérico, cambiarlo.
3. **Build** — Implementar siguiendo el plan exacto. Cada color y tipo derivado del token system.
4. **Critique** — Auto-revisión: ¿esto tiene personalidad propia? ¿Se ve a "AI-generated"?
5. **Refinish** — Pulir: responsive, keyboard focus, reduced motion, edge cases.

### El Elemento Signature

Cada diseño debe tener UN elemento memorable que lo distinga:
- Una interacción hover inesperada
- Un tratamiento tipográfico distintivo
- Un efecto de profundidad (glow, parallax sutil)
- Una composición asimétrica
- Un micro-momento de Delight

Todo lo demás alrededor debe ser quieto y disciplinado.

---

## §5 - Tipos de Superficie

Leer el modo de la superficie y ajustar el vocabulario:

| Modo | Trabajo | Ejemplos |
|------|---------|----------|
| **Persuadir** | Ganar atención, decidir y actuar | Landing pages, pricing, campaigns |
| **Operar** | Completar una tarea | App UI, dashboards, editors, tools |
| **Leer** | Construir comprensión | Docs, guides, changelogs, blogs |
| **Experiencia** | El arte lidera | Portfolios, galleries, showcases |

---

## §6 - Accesibilidad (No Negociable)

- **Contraste WCAG AA** mínimo en todos los textos.
- **Keyboard navigation** visible en todos los interactive elements.
- **Focus rings** explícitos, no `outline: none`.
- **Alt text** descriptivo en imágenes, no vacío.
- **Semantic HTML** — `<button>`, `<nav>`, `<main>`, `<h1>`-`<h6>` en orden.
- **prefers-reduced-motion** respetado siempre.
- **Touch targets** mínimo 44x44px en mobile.

---

## §7 - Responsive Design

- Mobile-first como base, desktop como elevación.
- No ocultar contenido en mobile — reorganizar.
- Touch targets mínimo 44x44px.
- Tipografía fluida con `clamp()`:
  ```css
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  ```
- No usar `!important` para overrides responsive.
- Testear en 320px (SE) hasta 2560px (ultrawide).

---

## §8 - Dark Mode Protocol

- Dual-mode por defecto cuando se pida.
- Off-black (#0a0a0b o #111) y off-white (#fafaf9), nunca puros (#000, #fff).
- Jerarquía de contraste paridad entre temas.
- Brand fidelity en ambos modos — el accent no cambia.
- CSS variables con `@media (prefers-color-scheme: dark)` o clase manual.

---

## §9 - Copy que Funciona

- **Voz activa por defecto**: "Save changes", no "Submit".
- **Sentence case** en labels y botones.
- **Específico > clever**: Nombre las cosas por lo que el usuario controla.
- **Errores sin disculpas**: Explicar qué pasó y cómo arreglarlo.
- **Empty states como invitación**: No mostrar vacío, mostrar next action.
- **Consistencia de vocabulario**: El botón dice "Publish" → el toast dice "Published".

---

## §10 - Referencias y Recursos

### Libros de Diseño
- **Refactoring UI** (Adam Wathan & Steve Schoger) — Patrones prácticos de UI. La biblia para evitar slop.
- **The Design of Everyday Things** (Don Norman) — Principios fundamentales de usabilidad.
- **Thinking with Type** (Ellen Lupton) — Tipografía como herramienta de diseño.
- **Grid Systems in Graphic Design** (Josef Müller-Brockmann) — Sistemas de grid.

### Herramientas y Cursos
- **animations.dev** (Emil Kowalski) — Teoría y práctica de animaciones web que se sienten bien.
- **impeccable.style** (Paul Bakaus) — Vocabulario de diseño para agents. Anti-slop detector con 59 reglas.
- **tasteskill.dev** (Leon Lin) — Framework anti-slop para agents. Brief inference, dark mode, redesign protocol.
- **Refactoring UI** (refactoringui.com) — Tips visuales y patrones de Steve Schoger.

### Comunidades
- **Impeccable Discord** — Comunidad de diseño para agents.
- **Taste Skill GitHub** — Skills open-source para Cursor, Claude Code, Codex, etc.

---

## §11 - Redesign Protocol

Cuando se pida rediseñar algo existente:

1. **Auditar primero** — No sobre-escribir. Leer lo que existe.
2. **Preservar** — URLs, labels de nav, nombres de campos de formulario nunca cambian silenciosamente.
3. **Modernizar con intención** — No "hacerlo más bonito", mejorar usabilidad y claridad.
4. **Degradar gracefully** — Si hay usuarios existentes, la transición debe ser suave.

---

## §12 - Checklist Pre-Ship

Antes de marcar algo como completo:

- [ ] ¿Tiene personalidad propia? (No se ve a "AI-generated")
- [ ] ¿La tipografía es intencional? (No default/genérica)
- [ ] ¿Los colores son coherentes? (Un accent, no rainbow)
- [ ] ¿Es responsive? (320px → 2560px)
- [ ] ¿Tiene keyboard navigation?
- [ ] ¿Respeta prefers-reduced-motion?
- [ ] ¿Tiene contraste WCAG AA?
- [ ] ¿Los errores tienen mensajes útiles?
- [ ] ¿El copy usa voz activa y sentence case?
- [ ] ¿No hay console.log ni código muerto?
- [ ] ¿No hay animaciones scattered sin orquestación?
- [ ] ¿No hay patrones de la lista de anti-slop?

---

## §13 - Fórmulas Rápidas de UI

### Botón
```css
.btn-primary {
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  border-radius: 6px;
  transition: all 0.2s ease;
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(accent, 0.25);
}
```

### Card
```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.card:hover {
  border-color: var(--accent);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
```

### Input Focus
```css
.input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(accent, 0.12);
  outline: none;
}
```

### Glow Ambiental
```css
.glow {
  position: fixed;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(accent, 0.1) 0%, transparent 70%);
  pointer-events: none;
  animation: breathe 8s ease-in-out infinite;
}
@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 1; }
}
```
