#!/usr/bin/env python3
"""Apply new memorizacion card design to vista-memorizacion.js"""

import os, sys

JS_PATH = os.path.join(
    os.path.dirname(__file__), "..", "js", "vistas", "vista-memorizacion.js"
)
CSS_PATH = os.path.join(
    os.path.dirname(__file__), "..", "css", "05-componentes", "_memorizacion-juego.css"
)

with open(JS_PATH, "r", encoding="utf-8") as f:
    js = f.read()

with open(CSS_PATH, "r", encoding="utf-8") as f:
    css = f.read()

# ── JS: Replace _pintar, _tarjetaMazo, _bindHome ──
old_js_start = (
    "    /* \u2550\u2550\u2550 HOME: grid de mazos (Duolingo) \u2550\u2550\u2550 */"
)
old_js_end = "    /* \u2550\u2550\u2550 DETALLE DE MAZO \u2550\u2550\u2550 */"

si = js.find(old_js_start)
ei = js.find(old_js_end)
if si < 0 or ei < 0:
    print("ERROR: Could not find JS block boundaries")
    sys.exit(1)

new_js_block = r"""    /* ═══ HOME: grid de mazos ═══ */
    _pintar(raiz) {
      const d = this._datos;
      const esAdmin = this._puedeEditar();
      const totalPendientes = d.mazos.reduce((acc, m) => acc + this._pendientesMazo(m.id).length, 0);

      raiz.innerHTML = `
        <div class="o-contenedor mem-juego-home">
          <div class="mem-juego-cabecera">
            <h2>${I('brain')} Memorización <button class="info-ayuda" data-guia="memorizacion-juego" aria-label="Guía de Memorización">i</button></h2>
            <div class="mem-juego-cabecera__acciones">
              ${window.campanaNotificaciones ? window.campanaNotificaciones.renderCampana() : ''}
              <span class="mem-juego-racha">${I('flame')} ${totalPendientes} para hoy</span>
            </div>
          </div>
          <p class="mem-juego-sub">Entrena tu memoria jugando. Cada mazo es un reto: completa, ordena, relaciona y escribe. ¡Aprende la Biblia divirtiéndote!</p>

          <div class="mem-juego-layout">
            ${esAdmin ? `
              <aside class="mem-juego-sidebar">
                <button class="mem-juego-sidebar__btn" id="btnEditarMazos">${I('edit-3')} Editar mazos</button>
                <button class="mem-juego-sidebar__btn" id="btnCrearMazo">${I('plus')} Crear mazo</button>
                <button class="mem-juego-sidebar__btn" id="btnGestionarContenido">${I('layers')} Gestionar contenido</button>
              </aside>` : ''}

            <div class="mem-juego-grid">
              ${d.mazos.length === 0
                ? `<div class="mem-juego-vacio"><span class="mem-juego-vacio__icono">${I('layers')}</span><h3>Sin mazos todavía</h3><p class="mem-juego-sub">El administrador publicará mazos de contenido bíblico. ¡Vuelve pronto!</p></div>`
                : d.mazos.map((m, i) => this._tarjetaMazo(m, i)).join('')}
            </div>
          </div>

          <div class="mem-juego-features">
            <div class="mem-juego-feature">
              <span class="mem-juego-feature__icono mem-juego-feature__icono--juego">${I('gamepad-2')}</span>
              <div><strong>Aprende jugando</strong><p class="mem-juego-sub">Métodos activos que mejoran tu memoria</p></div>
            </div>
            <div class="mem-juego-feature">
              <span class="mem-juego-feature__icono mem-juego-feature__icono--progreso">${I('target')}</span>
              <div><strong>Progreso real</strong><p class="mem-juego-sub">Sigue tu avance y domina cada tema</p></div>
            </div>
            <div class="mem-juego-feature">
              <span class="mem-juego-feature__icono mem-juego-feature__icono--racha">${I('flame')}</span>
              <div><strong>Racha diaria</strong><p class="mem-juego-sub">Construye tu hábito y mantén la constancia</p></div>
            </div>
            <div class="mem-juego-feature">
              <span class="mem-juego-feature__icono mem-juego-feature__icono--logros">${I('trophy')}</span>
              <div><strong>Logros</strong><p class="mem-juego-sub">Desbloquea logros y supérate cada día</p></div>
            </div>
          </div>
        </div>`;

      this._bindHome(raiz);
      if (window.campanaNotificaciones) window.campanaNotificaciones.conectar(raiz);
      window.Iconos.actualizar();
      window.helpers.registrarGuias(raiz, {
        'memorizacion-juego': ['Memorización', 'Aprende la Biblia jugando: cada mazo combina completar palabras, ordenar, relacionar y más. Sin exámenes: solo práctica divertida.', 'Elige un mazo y pulsa Continuar. Cada sesión mezcla tipos de ejercicios automáticamente. Las tarjetas que fallas aparecen más veces hasta que las dominas.']
      });

      // Bind admin sidebar
      if (esAdmin) {
        const btnEditar = raiz.querySelector('#btnEditarMazos');
        if (btnEditar) btnEditar.onclick = () => router.navegar('/admin?tab=memorizacion');
        const btnCrear = raiz.querySelector('#btnCrearMazo');
        if (btnCrear) btnCrear.onclick = () => router.navegar('/admin?tab=memorizacion&nuevo=true');
        const btnGestionar = raiz.querySelector('#btnGestionarContenido');
        if (btnGestionar) btnGestionar.onclick = () => router.navegar('/admin?tab=memorizacion');
      }
    },

    _tarjetaMazo(m, idx) {
      const d = this._datos;
      const tarjetas = d.tarjetas.filter(t => t.mazo_id === m.id);
      const dominadas = tarjetas.filter(t => {
        const p = d.progreso[t.id];
        return p && ['dominada', 'perfecta'].includes(p.nivel);
      }).length;
      const pct = tarjetas.length ? Math.round((dominadas / tarjetas.length) * 100) : 0;
      const color = colorMazo(m.color, idx);
      const completado = tarjetas.length > 0 && pct === 100;

      const menuHtml = this._puedeEditar() ? `
        <div class="mem-juego-mazo__menu-wrap">
          <button class="mem-juego-mazo__menu-btn mem-menu-toggle" aria-label="Más opciones" aria-expanded="false" onclick="event.stopPropagation()">⋮</button>
          <div class="mem-juego-mazo__menu">
            <button class="mem-juego-mazo__menu-item btn-editar-mazo" data-id="${m.id}">${I('edit-3')} Editar</button>
            <button class="mem-juego-mazo__menu-item btn-duplicar-mazo" data-id="${m.id}" data-nombre="${E(m.nombre)}">${I('copy')} Duplicar</button>
            <hr class="mem-juego-mazo__menu-sep">
            <button class="mem-juego-mazo__menu-item mem-juego-mazo__menu-item--peligro btn-eliminar-mazo" data-id="${m.id}" data-nombre="${E(m.nombre)}">${I('trash-2')} Eliminar</button>
          </div>
        </div>` : '';

      return `
        <div class="mem-juego-mazo" data-mazo="${m.id}" style="--mazo-color:${color}">
          <div class="mem-juego-mazo__contenido">
            <div class="mem-juego-mazo__header">
              <span class="mem-juego-mazo__icono">${I(m.icono || 'layers')}</span>
              <h3 class="mem-juego-mazo__nombre">${E(m.nombre)}</h3>
              ${menuHtml}
            </div>
            <div class="mem-juego-mazo__stats">
              <span class="mem-juego-mazo__preguntas">${tarjetas.length} pregunta${tarjetas.length === 1 ? '' : 's'}</span>
              <span class="mem-juego-mazo__respondidas">${dominadas} respondida${dominadas === 1 ? '' : 's'}</span>
            </div>
            <div class="mem-juego-mazo__progreso-info">
              <span>${dominadas} / ${tarjetas.length}</span>
              <span>${pct}%</span>
            </div>
            <div class="mem-juego-mazo__barra" aria-hidden="true"><div class="mem-juego-mazo__progreso" style="width:${pct}%"></div></div>
            <button class="mem-juego-mazo__btn ${completado ? 'mem-juego-mazo__btn--completado' : ''}" data-mazo="${m.id}">
              ${completado ? I('check') : I('play')} ${completado ? 'Completado' : 'Empezar'} ${String.fromCharCode(8594)}
            </button>
          </div>
        </div>`;
    },

    _bindHome(raiz) {
      // Click en tarjeta
      $$(raiz, '.mem-juego-mazo').forEach(el => {
        el.onclick = (e) => {
          if (e.target.closest('.mem-juego-mazo__menu-wrap')) return;
          this._verMazo(raiz, el.dataset.mazo);
        };
      });
      // Click en boton Empezar
      $$(raiz, '.mem-juego-mazo__btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this._verMazo(raiz, btn.dataset.mazo);
        };
      });

      // Menu 3-puntitos toggle
      $$(raiz, '.mem-menu-toggle').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const menu = btn.nextElementSibling;
          const abierto = menu.classList.contains('mem-juego-mazo__menu--abierto');
          raiz.querySelectorAll('.mem-juego-mazo__menu--abierto').forEach(m => m.classList.remove('mem-juego-mazo__menu--abierto'));
          raiz.querySelectorAll('.mem-menu-toggle').forEach(t => t.setAttribute('aria-expanded', 'false'));
          if (!abierto) {
            menu.classList.add('mem-juego-mazo__menu--abierto');
            btn.setAttribute('aria-expanded', 'true');
          }
        };
      });
      // Cerrar menus al click fuera
      const closeMenus = (e) => {
        if (!e.target.closest('.mem-juego-mazo__menu-wrap')) {
          raiz.querySelectorAll('.mem-juego-mazo__menu--abierto').forEach(m => m.classList.remove('mem-juego-mazo__menu--abierto'));
          raiz.querySelectorAll('.mem-menu-toggle').forEach(t => t.setAttribute('aria-expanded', 'false'));
        }
      };
      raiz.addEventListener('click', closeMenus);

      // Admin: Editar mazo
      $$(raiz, '.btn-editar-mazo').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          router.navegar('/admin?tab=memorizacion&mazo=' + encodeURIComponent(btn.dataset.id));
        };
      });
      // Admin: Duplicar mazo
      $$(raiz, '.btn-duplicar-mazo').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const ok = await window.helpers.confirmar(
            'Se creara una copia del mazo "' + btn.dataset.nombre + '".',
            { titulo: 'Duplicar mazo', textoConfirmar: 'Duplicar' }
          );
          if (!ok) return;
          try {
            const json = await window.memorizacionRepository.exportarMazo(btn.dataset.id);
            const usuario = store.obtener('usuario');
            await window.memorizacionRepository.importarMazo(usuario.id, json, { nombre: 'Copia de ' + btn.dataset.nombre });
            window.helpers.mostrarAlerta('Mazo duplicado.', 'exito');
            this.montar(raiz);
          } catch (err) {
            window.helpers.mostrarAlerta('Error: ' + err.message, 'error');
          }
        };
      });
      // Admin: Eliminar mazo
      $$(raiz, '.btn-eliminar-mazo').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const ok = await window.helpers.confirmar(
            'Se eliminara el mazo "' + btn.dataset.nombre + '" y todo su contenido. Esta accion no se puede deshacer.',
            { titulo: 'Eliminar mazo', textoConfirmar: 'Eliminar' }
          );
          if (!ok) return;
          try {
            await window.memorizacionRepository.eliminarMazo(btn.dataset.id);
            window.helpers.mostrarAlerta('Mazo eliminado.', 'exito');
            this.montar(raiz);
          } catch (err) {
            window.helpers.mostrarAlerta('Error: ' + err.message, 'error');
          }
        };
      });
    },

"""

new_js = js[:si] + new_js_block + js[ei:]
with open(JS_PATH, "w", encoding="utf-8") as f:
    f.write(new_js)
print("JS updated OK")

# ── CSS: Replace old card styles, add new ones ──
# Replace from ".mem-juego-grid" through ".mem-juego-mazo__btn--completado" + keyframes
old_css_start = "/* Tarjeta de mazo (Duolingo: color de fondo por mazo) */"
old_css_end = "/* \u2550\u2550\u2550 Estado vac\u00edo \u2500\u2500\u2500 */"

csi = css.find(old_css_start)
cei = css.find(old_css_end)
if csi < 0 or cei < 0:
    print(f"ERROR: Could not find CSS boundaries: {csi}, {cei}")
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

/* ── Tarjeta de mazo ── */
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
print("CSS updated OK")

# ── Now add features section CSS ──
# Insert before the DETALLE section
css2_marker = "/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 DETALLE DE MAZO"
with open(CSS_PATH, "r", encoding="utf-8") as f:
    css2 = f.read()

feat_pos = css2.find(css2_marker)
if feat_pos < 0:
    print(
        "WARNING: Could not find DETALLE marker in CSS, adding features at end of HOME section"
    )
else:
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
    css2 = css2[:feat_pos] + features_css + css2[feat_pos:]
    with open(CSS_PATH, "w", encoding="utf-8") as f:
        f.write(css2)
    print("Features CSS added OK")

# Verify JS syntax
try:
    compile(open(JS_PATH, encoding="utf-8").read(), JS_PATH, "exec")
    print("JS syntax OK")
except SyntaxError as e:
    print(f"JS SYNTAX ERROR: {e}")

print("Done!")
