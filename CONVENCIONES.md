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
