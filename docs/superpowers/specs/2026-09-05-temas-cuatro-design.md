# 4 Temas (2 claros + 2 oscuros) — Design Spec

**Fecha:** 2026-09-05 · **Enfoque aprobado:** A revisado (dual atributo: `data-theme` modo + `data-tema` id; 228 selectores `data-theme` existentes intactos)
**Objetivo:** poder elegir desde Perfil > Apariencia entre 4 temas de forma elegante, manteniendo tono actual y añadiendo tono Umbra claro/oscuro.

## 1. Los 4 temas

| id | Nombre UI | Fondo / Panel | Acento | Texto |
|----|-----------|---------------|--------|-------|
| `clasico-claro` (alias `light`, default `:root`) | Clásico Claro | `#FAFAF9` / `#FFFFFF` | `#2563EB` | `#1C1917` |
| `clasico-oscuro` (alias `dark`) | Clásico Oscuro | `#0B1020` / `#182236` | `#7DB7FF` | `#F5F7FB` |
| `umbra-claro` | Umbra Claro | `#faf6f8` / `#ffffff` | `#c2185b` | `rgba(50,16,32,.94)` |
| `umbra-oscuro` | Umbra Oscuro | `#0a0a0c` / `#111114` | `#e8735a` | `rgba(255,255,255,.93)` |

- `data-theme` = modo (`light|dark|ausente`): NO se toca ningún selector existente; `data-tema` = id (`umbra-claro|umbra-oscuro|clasico-claro|clasico-oscuro|ausente`): solo los overrides Umbra usan `data-tema`.
- `light`/`claro` → `clasico-claro`; `dark`/`oscuro` → `clasico-oscuro` (retrocompat con localStorage/Supabase/tests).
- `null` (sin ambos atributos) = Auto: sigue `prefers-color-scheme` del SO (clásico claro/oscuro).
- Umbra usa `--fuente-display: "Playfair Display", Georgia, serif` solo en sus bloques; Clásico mantiene `Newsreader`.
- Alto contraste (`data-hc`) y letra grande (`data-lg`) siguen ortogonales, solo con variables.

## 2. Arquitectura

- Fuente única de verdad visual: `css/00-settings/_tokens.css` (solo se añaden 2 bloques `data-tema` Umbra al final; Clásico = base + dark existentes). Sin hojas por tema, sin hex fuera de tokens (CONVENCIONES §CSS).
- Capas: `theme-init.js` (bloqueante en `<head>`, anti-flash) → `preferencias.js` (`aplicar()`/`guardar()`, `color-scheme` + `meta theme-color`) → `vista-perfil.js` (selector) → `public-site/theme.js` + `login.html` inline (mismo mapa dual).
- Escritura dual: `data-theme` = `light` si id `*-claro`, `dark` si `*-oscuro`; `data-tema` = id. `isDark` = `/-oscuro$/`. `theme-color`: umbra-oscuro `#0a0a0c`, clasico-oscuro `#0B1020`, umbra-claro `#faf6f8`, clasico-claro `#FFFFFF`.

## 3. UI Apariencia (Perfil > Config > Apariencia)

- Sustituir `.perfil-segmented` (Claro/Auto/Oscuro) por grid 2x2 `tema-grid` de tarjetas `tema-card` con mini-preview (franjas fondo/borde/acento con los colores reales de cada tema), nombre + etiqueta Claro/Oscuro, check en la activa, `role=radiogroup` + `aria-checked`.
- Debajo: fila Auto ("Seguir sistema", conmuta `data-theme` ausente) + toggles Alto contraste / Texto grande (sin cambios) + Restablecer (vuelve a Auto + sin HC/LG).
- Responsive: 2x2 en ≥360px, 1 columna solo si <320px. Toque ≥48px, `prefers-reduced-motion` respetado, foco visible.
- Preview usa colores fijos inline solo para la miniatura (ornamental, permitido); el resto siempre `var(--*)`.

## 4. Data flow y compat

- Guardado: `usuario.preferencias.tema` ∈ {`umbra-claro`,`umbra-oscuro`,`clasico-claro`,`clasico-oscuro`,null} → store + `localStorage fb_usuario` + `fb_preferencias` + Supabase `perfiles.preferencias` (JSON). Lectura normaliza legacy `claro/oscuro/light/dark`.
- Migración: ninguna. Usuarios con `light/dark` ven Clásico equivalente; Auto sigue igual.

## 5. Errores y edge cases

- `localStorage` corrupto/bloqueado → defaults clásico-claro, sin throw.
- Tema desconocido en Supabase → cae a Auto.
- Cambio de SO en Auto → listener `matchMedia` reaplica (ya existe).
- CSP: sin inline scripts; `theme-init.js` sigue externo y solo toca `style` de `<html>`, nunca variables.

## 6. Testing

- `tests/temas-cuatro.test.js` (nuevo, vitest): normalización legacy, `aplicar()` pone/quita `data-theme`, `isDark` por familia, theme-color por tema.
- Contraste AA: Clásico existente ya pasa; Umbra claro `#c2185b`/blanco 5.87:1, Umbra oscuro `#e8735a` solo para acciones/activos, texto principal ≥4.5:1.
- Manual: 360/390/768/1024/1280 + ambos modos + teclado solo + sin overflow.

## 7. Alcance / No-objetivos

- Sí: app SPA + `login.html` standalone + `public-site/` (landing, legal, 404).
- No: nuevos modos HC por tema, cambio de tipografías base, reorden de ITCSS, gamificación del selector.

## 8. Archivos a tocar (plan)

1. `css/00-settings/_tokens.css` (solo 2 bloques `data-tema` Umbra al final)
2. `js/utilidades/preferencias.js` (normalizar + escritura dual + bg/notch por 4 temas)
3. `js/core/theme-init.js` (mismo mapa dual, anti-flash)
4. `public-site/theme.js` (mismo mapa dual)
5. `login.html` (script inline: mismo mapa dual mínimo; sus `<style data-theme>` intactos)
6. `js/vistas/vista-perfil.js` (`_configApariencia` → grid 2x2 + Auto)
7. `css/05-componentes/_perfil.css` (`.tema-grid`, `.tema-card`, preview, check)
8. `tests/temas-cuatro.test.js` (nuevo)
