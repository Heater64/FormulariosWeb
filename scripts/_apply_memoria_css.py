#!/usr/bin/env python3
"""Fix CSS only - JS was already updated"""

import os, sys

CSS_PATH = os.path.join(
    os.path.dirname(__file__), "..", "css", "05-componentes", "_memorizacion-juego.css"
)

with open(CSS_PATH, "r", encoding="utf-8") as f:
    css = f.read()

# The JS file was already updated. Now fix CSS.
# Replace from "/* Tarjeta de mazo" through the end of mem-juego-mazo__btn--completado + keyframes
# Then add features section before DETALLE

# Find the card styles section
old_css_start = "/* Tarjeta de mazo (Duolingo: color de fondo por mazo) */"
old_css_end = "/* \u2500\u2500\u2500 Estado vac"  # partial match for "Estado vacío"

csi = css.find(old_css_start)
cei = css.find(old_css_end)
print(f"CSS card block: {csi} to {cei}")

if csi < 0:
    print("ERROR: Could not find CSS start marker")
    sys.exit(1)

new_css_block = """/* Layout: sidebar + grid */
.mem-juego-layout {
  display: flex;
  gap: var(--espaciado-lg);
}

.mem-juego-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--espaciado-sm);
  flex-shrink: 0;
  width: 200px;
}

.mem-juego-sidebar__btn {
  display: flex;
  align-items: center;
  gap: var(--espaciado-sm);
  padding: var(--espaciado-sm) var(--espaciado-md);
  border-radius: var(--radio-lg);
  border: 1px solid var(--color-borde);
  background: var(--color-fondo-tarjeta);
  color: var(--color-texto);
  font: inherit;
  font-size: var(--texto-sm);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transicion-rapida);
  min-height: var(--toque-minimo);
}

.mem-juego-sidebar__btn:hover {
  border-color: var(--color-acento);
  color: var(--color-acento);
  background: var(--color-acento-soft);
}

.mem-juego-sidebar__btn svg { width: 18px; height: 18px; flex-shrink: 0; }

@media (max-width: 768px) {
  .mem-juego-layout { flex-direction: column; }
  .mem-juego-sidebar {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
  }
  .mem-juego-sidebar__btn { flex-shrink: 0; }
}

/* Grid de mazos */
.mem-juego-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--espaciado-md);
  flex: 1;
  min-width: 0;
}

@media (min-width: 560px) {
  .mem-juego-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 960px) {
  .mem-juego-grid { grid-template-columns: repeat(3, 1fr); }
}

/* Tarjeta de mazo */
.mem-juego-mazo {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--color-fondo-tarjeta);
  border: 1px solid var(--color-borde);
  border-top: 4px solid var(--mazo-color, var(--color-acento));
  border-radius: var(--radio-xl);
  overflow: hidden;
  box-shadow: var(--sombra-sm);
  transition: transform var(--transicion-normal), box-shadow var(--transicion-normal);
}

.mem-juego-mazo:hover {
  transform: translateY(-3px);
  box-shadow: var(--sombra-md);
}

.mem-juego-mazo__contenido {
  display: flex;
  flex-direction: column;
  gap: var(--espaciado-sm);
  padding: var(--espaciado-lg);
  flex: 1;
}

/* Header: icono + nombre + menu */
.mem-juego-mazo__header {
  display: flex;
  align-items: center;
  gap: var(--espaciado-sm);
}

.mem-juego-mazo__icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radio-xl);
  background: color-mix(in srgb, var(--mazo-color, var(--color-acento)) 14%, white);
  color: var(--mazo-color, var(--color-acento));
  flex-shrink: 0;
}

.mem-juego-mazo__icono svg { width: 24px; height: 24px; }

.mem-juego-mazo__nombre {
  flex: 1;
  font-size: var(--texto-lg);
  font-weight: 800;
  color: var(--color-texto);
  margin: 0;
  text-align: center;
}

/* Stats */
.mem-juego-mazo__stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mem-juego-mazo__preguntas {
  font-size: var(--texto-sm);
  font-weight: 700;
  color: var(--mazo-color, var(--color-acento));
}

.mem-juego-mazo__respondidas {
  font-size: var(--texto-sm);
  color: var(--color-texto-terciario);
}

/* Progress info row */
.mem-juego-mazo__progreso-info {
  display: flex;
  justify-content: space-between;
  font-size: var(--texto-xs);
  color: var(--color-texto-terciario);
  margin-top: var(--espaciado-xs);
}

/* Barra de progreso */
.mem-juego-mazo__barra {
  height: 6px;
  border-radius: var(--radio-pill);
  background: var(--color-fondo-alt);
  overflow: hidden;
}

.mem-juego-mazo__progreso {
  height: 100%;
  border-radius: var(--radio-pill);
  background: var(--mazo-color, var(--color-acento));
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Boton Empezar */
.mem-juego-mazo__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: var(--radio-lg);
  background: var(--color-acento);
  color: var(--color-texto-acento, #fff);
  font-size: var(--texto-base);
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--transicion-rapida), filter var(--transicion-rapida);
  margin-top: auto;
}

.mem-juego-mazo__btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
.mem-juego-mazo__btn:active { transform: scale(0.97); }
.mem-juego-mazo__btn--completado { background: var(--color-exito); }

/* Menu 3-puntitos */
.mem-juego-mazo__menu-wrap {
  position: relative;
  flex-shrink: 0;
}

.mem-juego-mazo__menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radio-pill);
  border: 1px solid var(--color-borde);
  background: var(--color-fondo);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-texto-secundario);
  transition: all var(--transicion-rapida);
}

.mem-juego-mazo__menu-btn:hover {
  border-color: var(--color-acento);
  color: var(--color-acento);
  background: var(--color-acento-soft);
}

.mem-juego-mazo__menu {
  display: none;
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: var(--color-fondo-tarjeta);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio-md);
  box-shadow: var(--sombra-lg);
  min-width: 160px;
  z-index: 50;
  overflow: hidden;
  animation: memMenuIn 150ms var(--easing-apple, ease);
}

@keyframes memMenuIn {
  from { opacity: 0; transform: translateY(-4px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.mem-juego-mazo__menu--abierto { display: block; }

.mem-juego-mazo__menu-item {
  display: flex;
  align-items: center;
  gap: var(--espaciado-sm);
  width: 100%;
  padding: var(--espaciado-sm) var(--espaciado-md);
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  font-size: var(--texto-sm);
  color: var(--color-texto);
  text-align: left;
  min-height: var(--toque-minimo);
  transition: background var(--transicion-rapida);
}

.mem-juego-mazo__menu-item:hover { background: var(--color-fondo-alt); }
.mem-juego-mazo__menu-item svg { width: 16px; height: 16px; flex-shrink: 0; color: var(--color-texto-terciario); }
.mem-juego-mazo__menu-item--peligro { color: var(--color-error); }
.mem-juego-mazo__menu-item--peligro svg { color: var(--color-error); }
.mem-juego-mazo__menu-sep { margin: 0; border: none; border-top: 1px solid var(--color-borde); }

"""

new_css = css[:csi] + new_css_block + css[cei:]
with open(CSS_PATH, "w", encoding="utf-8") as f:
    f.write(new_css)
print("CSS card section replaced OK")

# Now add features section before DETALLE DE MAZO
with open(CSS_PATH, "r", encoding="utf-8") as f:
    css2 = f.read()

# Find the DETALLE section
detalle_marker = "DETALLE DE MAZO"
di = css2.find(detalle_marker)
if di > 0:
    # Go back to find the start of the comment line
    line_start = css2.rfind("\n", 0, di)
    if line_start < 0:
        line_start = 0
    else:
        line_start += 1

    features_css = """/* ── Features section (bottom) ── */
.mem-juego-features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--espaciado-sm);
  margin-top: var(--espaciado-xl);
  padding: var(--espaciado-md);
  border-radius: var(--radio-xl);
  background: var(--color-fondo-tarjeta);
  border: 1px solid var(--color-borde);
}

.mem-juego-feature {
  display: flex;
  align-items: center;
  gap: var(--espaciado-sm);
  padding: var(--espaciado-sm);
}

.mem-juego-feature__icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radio-lg);
  flex-shrink: 0;
}

.mem-juego-feature__icono svg { width: 20px; height: 20px; }

.mem-juego-feature__icono--juego { background: #EEF2FF; color: #6366F1; }
.mem-juego-feature__icono--progreso { background: #ECFDF5; color: #10B981; }
.mem-juego-feature__icono--racha { background: #FFF7ED; color: #F97316; }
.mem-juego-feature__icono--logros { background: #FEF9C3; color: #CA8A04; }

.mem-juego-feature strong {
  display: block;
  font-size: var(--texto-sm);
  font-weight: 700;
  color: var(--color-texto);
  margin-bottom: 2px;
}

.mem-juego-feature .mem-juego-sub {
  font-size: var(--texto-xs);
  line-height: 1.4;
}

@media (max-width: 640px) {
  .mem-juego-features { grid-template-columns: 1fr; }
}

"""
    css2 = css2[:line_start] + features_css + css2[line_start:]
    with open(CSS_PATH, "w", encoding="utf-8") as f:
        f.write(css2)
    print("Features CSS added OK")
else:
    print("WARNING: Could not find DETALLE marker")

# Final verification
with open(CSS_PATH, "r", encoding="utf-8") as f:
    final = f.read()
print(f"Final CSS size: {len(final)} chars, {final.count(chr(10))} lines")

# Verify JS
JS_PATH = os.path.join(
    os.path.dirname(__file__), "..", "js", "vistas", "vista-memorizacion.js"
)
try:
    compile(open(JS_PATH, encoding="utf-8").read(), JS_PATH, "exec")
    print("JS syntax OK")
except SyntaxError as e:
    print(f"JS SYNTAX ERROR: {e}")

print("Done!")
