# Convenciones del Proyecto FormsBiblicos

Este archivo documenta las convenciones de nomenclatura, organización y estilo del proyecto. **Debe leerse antes de hacer cualquier contribución.**

## Nomenclatura

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Archivos JS (dominio/utilidades) | `camelCase.js` | `progresoLectura.js` |
| Archivos JS (componentes/vistas) | `kebab-case.js` | `tarjeta-capitulo.js` |
| Archivos CSS | `_nombre.css` (prefijo `_`) | `_boton-primario.css` |
| Clases CSS | BEM (`bloque__elemento--modificador`) | `tarjeta-capitulo__titulo--activo` |
| Objetos CSS | Prefijo `o-` | `o-contenedor`, `o-pila` |
| Utilidades CSS | Prefijo `u-` | `u-oculto`, `u-mt-2` |
| Tablas SQL | `snake_case` en español | `progreso_lectura`, `examenes_personalizados` |
| IDs HTML | `kebab-case` | `app-root`, `barra-navegacion` |
| Funciones JS | `camelCase` | `calcularProximoRepaso()` |

## Estructura de Carpetas

```
/css/           → ITCSS: 00-settings/ 01-tools/ 02-generic/ 03-elements/ 04-objects/ 05-componentes/ 06-utilidades/
/js/
  /core/        → router.js, store.js, eventBus.js, index.js
  /dominio/     → Lógica pura sin DOM ni Supabase
  /datos/       → Repositorios (única capa que llama a Supabase)
  /componentes/ → Fábricas de nodos DOM reutilizables
  /vistas/      → Controladores de página (montar/desmontar)
  /utilidades/  → Helpers puros (fechas, validación, sanitización)
/supabase/
  /migraciones/ → SQL versionado
  /politicas-rls/ → SQL de políticas RLS
  /funciones/   → Funciones Postgres / Edge Functions
```

## Principios

1. **Separación de capas**: UI → Componentes → Lógica de aplicación → Estado → Datos → Supabase
2. **RLS siempre activo**: ninguna tabla sin RLS en producción
3. **Sin dependencias de frontend**: solo HTML/CSS/JS nativo + Supabase SDK
4. **Delegación de eventos**: un listener por contenedor, no por elemento
5. **44×44px mínimo táctil**: superando WCAG AA
6. **Supabase como única fuente de verdad**: el progreso nunca vive solo en localStorage
7. **Validación duplicada**: cliente (UX) + servidor (RLS/constraints)

## Flujo de Trabajo

1. Cada cambio debe incluir su política RLS si crea una tabla nueva
2. Probar siempre autenticado como cada rol (usuario, editor, admin, owner)
3. Los modos de accesibilidad (alto contraste, letra grande) se implementan solo con variables CSS

## CSS — Reglas del Sistema de Diseño

Todos los valores visuales deben usar **tokens** declarados en `css/00-settings/`. Está prohibido usar hex, px o tiempos literales cuando existe token equivalente.

### Tokens disponibles (resumen)

- `--color-*` semánticos: `acento`, `acento-hover`, `acento-soft`, `acento-fuerte`, `acento-soft-hover`, `texto`, `texto-secundario`, `texto-terciario`, `fondo`, `fondo-alt`, `fondo-tarjeta`, `borde`, `exito/+soft`, `error/+soft/+hover`, `aviso/+soft`, `info/+soft`, `naranja/+soft` (para gestos de swipe arriba y llama de racha)
- Paleta raw: `--color-azul-*`, `--color-verde-*`, `--color-rojo-*`, `--color-amarillo-*`, `--color-naranja-*`, `--color-gris-*`
- Texto: `--texto-xxs/xs/sm/md/base/lg/xl/2xl/3xl/4xl` (clamp fluido)
- Espaciado: `--espaciado-2xs/xxs/xs/sm/md/lg/xl/2xl/3xl`
- Radios: `--radio-sm/md/lg/xl/2xl/pill(999px)`
- Sombras: `--sombra-sm/md/lg/xl/nav`
- Animación: `--transicion-rapida(240ms)/normal(380ms)/lenta(640ms)` y `--easing-apple/smooth/entrada/salida/spring` (spring para pops con rebote)
- Toque: `--toque-minimo: 48px`

### Reglas estrictas

1. **Transiciones**: solo `var(--transicion-rapida|normal|lenta)`. Nunca `0.15s ease`.
2. **Easings**: solo `var(--easing-apple|smooth|entrada|salida)`. Nunca `cubic-bezier(...)` inline.
3. **Colores**: `var(--color-*)` con semântica. Hex hardcoded solo en gradientes ornamentales únicos.
4. **Sin duplicación**: cada bloque vive en un único `_*.css` (`.btn-calidad` solo en `_btn-calidad.css`, `.barra-nav-inferior` solo en `_barra-navegacion-inferior.css`).
5. **Border widths**: `1px` estándar, `2px` énfasis/foco, `3px` decoración.
6. **Pastillas**: `var(--radio-pill)` o `border-radius: 50%` para círculos perfectos.
7. **Orden de carga ITCSS** (en `index.html`): Settings → Tools → Generic → Elements → Objects → Components → Utilities. Las utilidades van al final porque pueden usar `!important`.
8. **Token primero**: si un componente referencia `--color-info`, `--color-error-hover`, `--espaciado-2xs`, etc., primero declarar el token en `_tokens.css`/`_tipografia.css`/`_espaciado.css`.

### Capas ITCSS

```
css/00-settings/   tokens, colores, tipografía, espaciado
css/01-tools/      funciones (placeholder @property)
css/02-generic/    reset
css/03-elements/   elementos HTML básicos (body, headings, button, input, link)
css/04-objects/    layouts reutilizables (o-contenedor, o-pila, o-grid-tarjetas)
css/05-componentes/ componentes BEM (tarjeta-*, modal, alerta, splash, etc.)
css/06-utilidades/ helpers `!important` (u-oculto, u-mt-2, u-color-exito)
```

### Nomenclatura CSS

- Componentes: kebab-case BEM (`tarjeta-capitulo__titulo--completado`)
- Objetos: prefijo `o-` (`o-contenedor--estrecho`)
- Utilidades: prefijo `u-` (`u-oculto`, `u-mt-2`, `u-color-exito`)
- Modificadores booleanos: `--activo`, `--deshabilitado`, `--exito`, `--error`
