(function () {
  'use strict';

  /* ─── Helpers internos ─── */
  const E = (h) => window.helpers.escapeHtml(h);
  const I = (n) => window.Iconos.render(n);
  const $ = (c, s) => c.querySelector(s);
  const $$ = (c, s) => c.querySelectorAll(s);

  const J = window.ejerciciosMemorizacion;
  const SM = () => window.repeticionEspaciada;

  const COLORES = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#84CC16'];
  function colorMazo(color, idx) {
    if (color && /^#[0-9a-fA-F]{6}$/.test(color)) return color;
    return COLORES[(idx >= 0 ? idx : 0) % COLORES.length];
  }

  const TIPOS_NOMBRE = {
    completar: 'Completar palabras',
    ordenar: 'Ordenar palabras',
    elegir_versiculo: 'Elegir el versículo',
    verdadero_falso: 'Verdadero o falso',
    relacionar: 'Relacionar',
    escrita: 'Respuesta escrita'
  };

  const TIPOS_ICONO = {
    completar: 'edit-3',
    ordenar: 'list-ordered',
    elegir_versiculo: 'book-open',
    verdadero_falso: 'check-circle',
    relacionar: 'link-2',
    escrita: 'pen-line'
  };

  /* ════════════════════════════════════════════════════════════
     VISTA — Memorización modo juego
     ════════════════════════════════════════════════════════════ */
  window.vistaMemorizacion = {

    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      raiz.innerHTML = window.skeleton ? window.skeleton.memorizacion() : '<div class="o-contenedor u-mt-3"><p class="u-color-texto-terciario">Cargando...</p></div>';
      try {
        const [mazos, tarjetas, repasos, libros] = await Promise.all([
          window.memorizacionRepository.listarMazos(usuario.id),
          window.memorizacionRepository.listarTarjetas(usuario.id),
          window.memorizacionRepository.totalRepasos(usuario.id).catch(() => 0),
          window.supabaseClient.from('libros_biblicos').select('id, nombre').order('id'),
        ]);
        const progreso = await window.memorizacionRepository.listarProgreso(usuario.id).catch(() => ({}));
        this._datos = { mazos, tarjetas, progreso, repasos, libros: libros.data || [], usuario };
        this._pintar(raiz);
      } catch {
        raiz.innerHTML = '<div class="o-contenedor u-mt-4"><p class="u-color-error">Error al cargar</p></div>';
      }
    },

    desmontar() {},

    /* ═══ HOME: grid de mazos (Duolingo) ═══ */
    _pintar(raiz) {
      const d = this._datos;
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

          <div class="mem-juego-grid">
            ${d.mazos.length === 0
              ? `<div class="mem-juego-vacio"><span class="mem-juego-vacio__icono">${I('layers')}</span><h3>Sin mazos todavía</h3><p class="mem-juego-sub">El administrador publicará mazos de contenido bíblico. ¡Vuelve pronto!</p></div>`
              : d.mazos.map((m, i) => this._tarjetaMazo(m, i)).join('')}
          </div>
        </div>`;

      this._bindHome(raiz);
      if (window.campanaNotificaciones) window.campanaNotificaciones.conectar(raiz);
      window.Iconos.actualizar();
      window.helpers.registrarGuias(raiz, {
        'memorizacion-juego': ['Memorización', 'Aprende la Biblia jugando: cada mazo combina completar palabras, ordenar, relacionar y más. Sin exámenes: solo práctica divertida.', 'Elige un mazo y pulsa Continuar. Cada sesión mezcla tipos de ejercicios automáticamente. Las tarjetas que fallas aparecen más veces hasta que las dominas.']
      });
    },

    _tarjetaMazo(m, idx) {
      const d = this._datos;
      const tarjetas = d.tarjetas.filter(t => t.mazo_id === m.id);
      const pendientes = this._pendientesMazo(m.id);
      const dominadas = tarjetas.filter(t => {
        const p = d.progreso[t.id];
        return p && ['dominada', 'perfecta'].includes(p.nivel);
      }).length;
      const pct = tarjetas.length ? Math.round((dominadas / tarjetas.length) * 100) : 0;
      const color = colorMazo(m.color, idx);
      const completado = tarjetas.length > 0 && pct === 100;
      return `
        <button class="mem-juego-mazo" data-mazo="${m.id}" style="--mazo-color:${color}">
          <div class="mem-juego-mazo__top">
            <span class="mem-juego-mazo__icono">${I(m.icono || 'layers')}</span>
            <span class="mem-juego-mazo__porcentaje">${pct}%</span>
          </div>
          <h3 class="mem-juego-mazo__nombre">${E(m.nombre)}</h3>
          <p class="mem-juego-mazo__desc">${E(m.descripcion || 'Mazo de memorización')}</p>
          <div class="mem-juego-mazo__barra" aria-hidden="true"><div class="mem-juego-mazo__progreso" style="width:${pct}%"></div></div>
          <div class="mem-juego-mazo__stats">
            <span>${tarjetas.length} tarjeta${tarjetas.length === 1 ? '' : 's'}</span>
            <span>${dominadas} dominada${dominadas === 1 ? '' : 's'}</span>
          </div>
          <span class="mem-juego-mazo__btn ${completado ? 'mem-juego-mazo__btn--completado' : ''}">
            ${completado ? I('check') : I('play')} ${completado ? 'Completado' : 'Continuar'}
          </span>
        </button>`;
    },

    _bindHome(raiz) {
      $$(raiz, '.mem-juego-mazo').forEach(el => {
        el.onclick = () => this._verMazo(raiz, el.dataset.mazo);
      });
    },

    _pendientesMazo(mazoId) {
      const d = this._datos;
      const tarjetas = d.tarjetas.filter(t => t.mazo_id === mazoId);
      const ahora = Date.now();
      return tarjetas.filter(t => {
        const p = d.progreso[t.id];
        if (!p) return true;
        if (!p.proximo_repaso) return true;
        return new Date(p.proximo_repaso).getTime() <= ahora;
      });
    },

    /* ═══ DETALLE DE MAZO ═══ */
    _verMazo(raiz, mazoId) {
      const d = this._datos;
      const mazo = d.mazos.find(m => m.id === mazoId);
      if (!mazo) { this._pintar(raiz); return; }
      const color = colorMazo(mazo.color, d.mazos.indexOf(mazo));
      const tarjetas = d.tarjetas.filter(t => t.mazo_id === mazoId);
      const pendientes = this._pendientesMazo(mazoId);
      const dominadas = tarjetas.filter(t => {
        const p = d.progreso[t.id];
        return p && ['dominada', 'perfecta'].includes(p.nivel);
      }).length;

      raiz.innerHTML = `
        <div class="o-contenedor mem-juego-detalle">
          <div class="o-flecha o-flecha--between" style="flex-wrap:wrap;gap:var(--espaciado-xs)">
            <button class="btn-secundario" id="btnVolver">← Mazos</button>
            <span class="mem-juego-nivel" style="--nivel-color:${color}">${E(mazo.nombre)}</span>
          </div>

          <div class="mem-juego-detalle__hero" style="--mazo-color:${color}">
            <span class="mem-juego-detalle__icono">${I(mazo.icono || 'layers')}</span>
            <h2>${E(mazo.nombre)}</h2>
            <p class="mem-juego-detalle__desc">${E(mazo.descripcion || '')}</p>
            <div class="mem-juego-detalle__stats">
              <div class="mem-juego-detalle__stat"><p class="mem-juego-detalle__stat-valor">${tarjetas.length}</p><p class="mem-juego-detalle__stat-etiqueta">Tarjetas</p></div>
              <div class="mem-juego-detalle__stat"><p class="mem-juego-detalle__stat-valor">${dominadas}</p><p class="mem-juego-detalle__stat-etiqueta">Dominadas</p></div>
              <div class="mem-juego-detalle__stat"><p class="mem-juego-detalle__stat-valor">${pendientes.length}</p><p class="mem-juego-detalle__stat-etiqueta">Pendientes</p></div>
            </div>
            <button class="mem-juego-empezar" id="btnEmpezar" ${pendientes.length === 0 ? 'disabled' : ''}>
              ${I('play')} Empezar sesión ${pendientes.length ? `(${pendientes.length})` : ''}
            </button>
            ${pendientes.length === 0 && dominadas > 0 ? `<p class="mem-juego-sub">¡Mazo dominado! ${I('party-popper')} Vuelve mañana para consolidar.</p>` : ''}
          </div>
        </div>`;

      $(raiz, '#btnVolver').onclick = () => this._pintar(raiz);
      $(raiz, '#btnEmpezar').onclick = () => this._sesion(raiz, mazoId);
      window.Iconos.actualizar();
    },

    /* ═══ SESIÓN DE JUEGO ═══ */
    _sesion(raiz, mazoId) {
      const d = this._datos;
      const mazo = d.mazos.find(m => m.id === mazoId);
      const color = colorMazo(mazo.color, d.mazos.indexOf(mazo));
      const pendientes = this._pendientesMazo(mazoId);

      // Construir la mezcla de ejercicios (rotando tipos)
      const sesion = J.construirSesion(pendientes, d.tarjetas, { maxTarjetas: 10 });
      const estado = {
        mazoId,
        color,
        ejercicios: sesion,
        idx: 0,
        correctas: 0,
        incorrectas: 0,
        dominadas: 0,
        racha: 0,
        mejorRacha: 0
      };
      // estados de niveles al inicio
      this._estadoNiveles = {};

      raiz.innerHTML = `
        <div class="o-contenedor mem-juego-sesion">
          <div class="mem-juego-sesion__barra">
            <button class="btn-secundario u-fs-xs" id="btnSalir" style="padding:6px 10px">${I('x')}</button>
            <div class="mem-juego-sesion__track" aria-hidden="true"><div class="mem-juego-sesion__fill" style="width:${sesion.length ? Math.round((1 / sesion.length) * 100) : 0}%"></div></div>
            <span class="mem-juego-sesion__corazones" id="corazones" title="Fallos permitidos"></span>
          </div>
          <div id="slot" class="o-pila" style="flex:1;min-height:300px"></div>
        </div>`;

      $(raiz, '#btnSalir').onclick = () => this._verMazo(raiz, mazoId);
      this._pintarCorazones(raiz, estado);
      this._ejercicio(raiz, estado);
    },

    _pintarCorazones(raiz, estado) {
      const max = 5;
      const restantes = max - Math.min(estado.incorrectas, max);
      const el = $(raiz, '#corazones');
      if (el) {
        el.innerHTML = Array.from({ length: max }, (_, i) => `<span style="opacity:${i < restantes ? 1 : 0.25}">${I('heart')}</span>`).join('');
        window.Iconos.actualizar();
      }
    },

    /* Render del ejercicio actual */
    _ejercicio(raiz, estado) {
      const slot = $(raiz, '#slot');
      const ejercicio = estado.ejercicios[estado.idx];
      if (!ejercicio) { this._finSesion(raiz, estado); return; }

      const avance = Math.round(((estado.idx + 1) / estado.ejercicios.length) * 100);
      const fill = $(raiz, '.mem-juego-sesion__fill');
      if (fill) fill.style.width = avance + '%';

      const renderer = this._renderers[ejercicio.tipo];
      if (renderer) renderer.call(this, slot, ejercicio, estado, raiz);
    },

    /* ── Renderers por tipo de ejercicio ── */
    _renderers: {
      /* COMPLETAR */
      completar(slot, ej, estado, raiz) {
        const valores = {};
        const render = () => {
          slot.innerHTML = `
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
              ${ej.referencia ? `<p class="mem-juego-tarjeta__ref">${E(ej.referencia)}</p>` : ''}
              <div class="mem-juego-completar">
                ${ej.enunciado.split(' ').map((palabra, i) => {
                  if (palabra !== '_____') return `<span>${E(palabra)}</span>`;
                  const n = Object.keys(valores).length;
                  return `<input type="text" class="mem-juego-hueco" data-hueco="${n}" placeholder="..." value="${E(valores[n] || '')}" autocomplete="off">`;
                }).join(' ')}
              </div>
              ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp">Comprobar</button>
            </div>`;
          window.Iconos.actualizar();
          $$(slot, '.mem-juego-hueco').forEach(inp => {
            inp.addEventListener('input', () => { valores[inp.dataset.hueco] = inp.value; });
          });
          $(slot, '[data-pista]')?.addEventListener('click', () => {
            const b = $(slot, '[data-pista-box]');
            if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
          });
          $(slot, '#btnResp').onclick = () => {
            const vals = [...$$(slot, '.mem-juego-hueco')].map(inp => inp.value || '');
            const aciertos = ej.verificar(vals);
            const todasBien = aciertos.every(Boolean);
            // Marcar visualmente
            $$(slot, '.mem-juego-hueco').forEach((inp, i) => {
              inp.classList.add(aciertos[i] ? 'mem-juego-hueco--ok' : 'mem-juego-hueco--ko');
              if (!aciertos[i]) inp.value = ej.respuestas[i] || '';
              inp.disabled = true;
            });
            $(slot, '#btnResp').remove();
            this._feedback(slot, ej, todasBien, estado, raiz);
          };
        };
        render();
      },

      /* ORDENAR */
      ordenar(slot, ej, estado, raiz) {
        const restantes = [...ej.palabras];
        const elegidas = [];
        const render = () => {
          slot.innerHTML = `
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
              ${ej.referencia ? `<p class="mem-juego-tarjeta__ref">${E(ej.referencia)}</p>` : ''}
              <div class="mem-juego-ordenar">
                <div class="mem-juego-frase" id="frase"></div>
                <div class="mem-juego-palabras" id="palabras">
                  ${restantes.map((p, i) => `<button class="mem-juego-palabra" data-idx="${i}">${E(p)}</button>`).join('')}
                </div>
              </div>
              ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp" ${elegidas.length === 0 ? 'disabled' : ''}>Comprobar</button>
            </div>`;
          window.Iconos.actualizar();
          const frase = $(slot, '#frase');
          frase.innerHTML = elegidas.map((p, i) => `<span class="mem-juego-frase__palabra" data-pos="${i}">${E(p)}</span>`).join('') + (elegidas.length === 0 ? '<span class="mem-juego-sub">Toca las palabras aquí...</span>' : '');

          $$(slot, '.mem-juego-palabra').forEach(btn => {
            btn.onclick = () => {
              const idx = parseInt(btn.dataset.idx, 10);
              const palabra = restantes.splice(idx, 1)[0];
              elegidas.push(palabra);
              render();
            };
          });
          $$(slot, '.mem-juego-frase__palabra').forEach(el => {
            el.onclick = () => {
              const pos = parseInt(el.dataset.pos, 10);
              const palabra = elegidas.splice(pos, 1)[0];
              restantes.push(palabra);
              render();
            };
          });
          $(slot, '[data-pista]')?.addEventListener('click', () => {
            const b = $(slot, '[data-pista-box]');
            if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
          });
          $(slot, '#btnResp').onclick = () => {
            const bien = ej.verificar(elegidas);
            // Mostrar la frase correcta
            frase.innerHTML = ej.palabras.map((p, i) => `<span class="mem-juego-frase__palabra mem-juego-frase__palabra--${bien ? 'ok' : 'ko'}">${E(p)}</span>`).join('');
            $(slot, '#btnResp').remove();
            this._feedback(slot, ej, bien, estado, raiz);
          };
        };
        render();
      },

      /* ELEGIR EL VERSÍCULO */
      elegir_versiculo(slot, ej, estado, raiz) {
        let sel = null;
        const render = () => {
          slot.innerHTML = `
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
              <p class="mem-juego-tarjeta__enunciado">${E(ej.enunciado)}</p>
              <div class="mem-juego-opciones">
                ${ej.opciones.map((o, i) => `
                  <button class="mem-juego-opcion ${sel === i ? 'mem-juego-opcion--sel' : ''}" data-opt="${i}">
                    <span class="mem-juego-opcion__letra">${String.fromCharCode(65 + i)}</span>
                    <span>${E(o)}</span>
                  </button>`).join('')}
              </div>
              ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp" ${sel === null ? 'disabled' : ''}>Comprobar</button>
            </div>`;
          window.Iconos.actualizar();
          $$(slot, '.mem-juego-opcion').forEach(btn => {
            btn.onclick = () => { sel = parseInt(btn.dataset.opt, 10); render(); };
          });
          $(slot, '[data-pista]')?.addEventListener('click', () => {
            const b = $(slot, '[data-pista-box]');
            if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
          });
          $(slot, '#btnResp').onclick = () => {
            const bien = ej.verificar(ej.opciones[sel]);
            $$(slot, '.mem-juego-opcion').forEach((btn, i) => {
              btn.disabled = true;
              if (ej.opciones[i] === ej.respuestaCorrecta) btn.classList.add('mem-juego-opcion--ok');
              else if (i === sel && !bien) btn.classList.add('mem-juego-opcion--ko');
            });
            $(slot, '#btnResp').remove();
            this._feedback(slot, ej, bien, estado, raiz);
          };
        };
        render();
      },

      /* VERDADERO O FALSO */
      verdadero_falso(slot, ej, estado, raiz) {
        let sel = null;
        const opciones = ['Verdadero', 'Falso'];
        const render = () => {
          slot.innerHTML = `
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
              <p class="mem-juego-tarjeta__enunciado">${E(ej.enunciado)}</p>
              ${ej.referencia ? `<p class="mem-juego-tarjeta__ref">${E(ej.referencia)}</p>` : ''}
              <div class="mem-juego-opciones">
                ${opciones.map((o, i) => `
                  <button class="mem-juego-opcion ${sel === i ? 'mem-juego-opcion--sel' : ''}" data-opt="${i}">
                    <span class="mem-juego-opcion__letra">${i === 0 ? I('check') : I('x')}</span>
                    <span>${o}</span>
                  </button>`).join('')}
              </div>
              ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp" ${sel === null ? 'disabled' : ''}>Comprobar</button>
            </div>`;
          window.Iconos.actualizar();
          $$(slot, '.mem-juego-opcion').forEach(btn => {
            btn.onclick = () => { sel = parseInt(btn.dataset.opt, 10); render(); };
          });
          $(slot, '[data-pista]')?.addEventListener('click', () => {
            const b = $(slot, '[data-pista-box]');
            if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
          });
          $(slot, '#btnResp').onclick = () => {
            const bien = ej.verificar(opciones[sel]);
            $$(slot, '.mem-juego-opcion').forEach((btn, i) => {
              btn.disabled = true;
              if (ej.verificar(opciones[i])) btn.classList.add('mem-juego-opcion--ok');
              else if (i === sel) btn.classList.add('mem-juego-opcion--ko');
            });
            $(slot, '#btnResp').remove();
            this._feedback(slot, ej, bien, estado, raiz);
          };
        };
        render();
      },

      /* RELACIONAR */
      relacionar(slot, ej, estado, raiz) {
        const asociaciones = {}; // izqLimpia → der
        let selIzq = null;
        const render = () => {
          slot.innerHTML = `
            <div class="mem-juego-tarjeta">
              <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
              <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
              <div class="mem-juego-relacionar">
                <div class="mem-juego-rel-col">
                  ${ej.izquierda.map((item, i) => {
                    const clave = J.limpiar(item);
                    const yaAsignada = asociaciones[clave];
                    return `<button class="mem-juego-rel-item ${selIzq === i ? 'mem-juego-rel-item--sel' : ''}${yaAsignada ? ' mem-juego-rel-item--disabled' : ''}" data-izq="${i}">${E(item)}</button>`;
                  }).join('')}
                </div>
                <div class="mem-juego-rel-col">
                  ${ej.derecha.map((item, i) => {
                    const usado = Object.keys(asociaciones).some(k => asociaciones[k] === item);
                    return `<button class="mem-juego-rel-item ${usado ? 'mem-juego-rel-item--disabled' : ''}" data-der="${i}">${E(item)}</button>`;
                  }).join('')}
                </div>
              </div>
              ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
              <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
              <button class="mem-juego-continuar" id="btnResp">Comprobar</button>
            </div>`;
          window.Iconos.actualizar();

          $$(slot, '.mem-juego-rel-item[data-izq]').forEach(btn => {
            btn.onclick = () => {
              const i = parseInt(btn.dataset.izq, 10);
              if (asociaciones[J.limpiar(ej.izquierda[i])]) return;
              selIzq = selIzq === i ? null : i;
              render();
            };
          });
          $$(slot, '.mem-juego-rel-item[data-der]').forEach(btn => {
            btn.onclick = () => {
              const i = parseInt(btn.dataset.der, 10);
              if (selIzq === null) return;
              const itemIzq = ej.izquierda[selIzq];
              const clave = J.limpiar(itemIzq);
              if (asociaciones[clave]) return;
              asociaciones[clave] = ej.derecha[i];
              selIzq = null;
              render();
            };
          });
          $(slot, '[data-pista]')?.addEventListener('click', () => {
            const b = $(slot, '[data-pista-box]');
            if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
          });
          $(slot, '#btnResp').onclick = () => {
            const bien = ej.verificar(asociaciones);
            // marcar pares correctos
            $$(slot, '.mem-juego-rel-item').forEach(btn => {
              btn.disabled = true;
              if (btn.dataset.izq !== undefined) {
                const item = ej.izquierda[parseInt(btn.dataset.izq, 10)];
                if (asociaciones[J.limpiar(item)]) btn.classList.add('mem-juego-rel-item--ok');
              } else {
                const der = ej.derecha[parseInt(btn.dataset.der, 10)];
                if (Object.values(asociaciones).includes(der)) btn.classList.add('mem-juego-rel-item--ok');
              }
            });
            $(slot, '#btnResp').remove();
            this._feedback(slot, ej, bien, estado, raiz);
          };
        };
        render();
      },

      /* ESCRITA */
      escrita(slot, ej, estado, raiz) {
        let valor = '';
        // Render inicial: pinta la tarjeta completa una sola vez.
        // Las actualizaciones posteriores (tecleo) solo modifican el botón,
        // sin destruir el input ni perder el foco.
        const _actualizarBoton = () => {
          const btn = $(slot, '#btnResp');
          if (!btn) return;
          const hayTexto = valor.trim().length > 0;
          btn.disabled = !hayTexto;
          if (hayTexto) btn.classList.remove('btn-desactivado');
          else btn.classList.add('btn-desactivado');
        };

        slot.innerHTML = `
          <div class="mem-juego-tarjeta">
            <span class="mem-juego-tipo">${I(TIPOS_ICONO[ej.tipo])} ${TIPOS_NOMBRE[ej.tipo]}</span>
            <p class="mem-juego-tarjeta__instruccion">${E(ej.instruccion)}</p>
            <p class="mem-juego-tarjeta__enunciado">${E(ej.enunciado)}</p>
            <div class="mem-juego-escrita">
              <input type="text" class="mem-juego-input" id="txtResp" value="" placeholder="Escribe aquí..." autocomplete="off">
            </div>
            ${ej.referencia ? `<p class="mem-juego-tarjeta__ref">${E(ej.referencia)}</p>` : ''}
            ${ej.pista ? `<button class="mem-juego-pista" data-pista>${I('lightbulb')} Pista</button>` : ''}
            <div class="mem-juego-pista__box" data-pista-box style="display:none">${E(ej.pista)}</div>
            <button class="mem-juego-continuar btn-desactivado" id="btnResp" disabled>Comprobar</button>
          </div>`;
        window.Iconos.actualizar();

        $(slot, '#txtResp').addEventListener('input', (e) => {
          valor = e.target.value;
          _actualizarBoton();
        });
        $(slot, '[data-pista]')?.addEventListener('click', () => {
          const b = $(slot, '[data-pista-box]');
          if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none';
        });
        $(slot, '#btnResp').onclick = () => {
          const bien = ej.verificar(valor);
          const inp = $(slot, '#txtResp');
          inp.disabled = true;
          inp.classList.add(bien ? 'mem-juego-input--ok' : 'mem-juego-input--ko');
          if (!bien) inp.value = ej.respuestaCorrecta;
          $(slot, '#btnResp').remove();
          this._feedback(slot, ej, bien, estado, raiz);
        };
      }
    },

    /* ── Feedback de corrección ──
       Nunca decir solo "Incorrecto": mostrar la respuesta
       correcta, la referencia y una explicación breve. */
    _feedback(slot, ej, bien, estado, raiz) {
      const tarjetaId = ej.tarjetaId;
      if (bien) { estado.correctas++; estado.racha++; if (estado.racha > estado.mejorRacha) estado.mejorRacha = estado.racha; }
      else { estado.incorrectas++; estado.racha = 0; }

      if (window.haptica) bien ? window.haptica.logro() : window.haptica.fallo();

      const respuestaTexto = ej.respuestaCorrecta || (ej.tipo === 'verdadero_falso' ? (ej.esVerdadero ? 'Verdadero' : 'Falso') : '');

      // Registrar progreso (async, sin bloquear)
      window.memorizacionRepository.registrarResultado(this._datos.usuario.id, tarjetaId, bien)
        .then(({ progreso }) => {
          const t = this._datos.tarjetas.find(x => x.id === tarjetaId);
          if (t && progreso) this._datos.progreso[tarjetaId] = { ...this._datos.progreso[tarjetaId], ...progreso };
          if (progreso && ['dominada', 'perfecta'].includes(progreso.nivel)) estado.dominadas++;
        })
        .catch(() => {});

      const feedback = document.createElement('div');
      feedback.className = `mem-juego-feedback mem-juego-feedback--${bien ? 'ok' : 'ko'}`;
      feedback.innerHTML = `
        <p class="mem-juego-feedback__titulo">${bien ? I('check-circle') + ' ¡Correcto!' : I('x-circle') + ' Casi...'}</p>
        <p class="mem-juego-feedback__respuesta"><strong>${bien ? '' : 'Respuesta: '}</strong>${bien ? '' : E(String(respuestaTexto || ''))}</p>
        ${ej.referencia ? `<p class="mem-juego-feedback__ref">${I('book-open')} ${E(ej.referencia)}</p>` : ''}
        ${ej.explicacion ? `<p class="mem-juego-feedback__expl">${E(ej.explicacion)}</p>` : ''}
      `;
      window.Iconos.actualizar();

      const btn = document.createElement('button');
      btn.className = 'mem-juego-continuar';
      btn.innerHTML = `${I('arrow-right')} Continuar`;
      btn.onclick = () => {
        estado.idx++;
        this._pintarCorazones(raiz, estado);
        this._ejercicio(raiz, estado);
      };

      slot.appendChild(feedback);
      slot.appendChild(btn);
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /* ═══ FIN DE SESIÓN ═══ */
    _finSesion(raiz, estado) {
      const slot = $(raiz, '#slot');
      const total = estado.correctas + estado.incorrectas;
      const precision = total ? Math.round((estado.correctas / total) * 100) : 0;
      const perfecto = total > 0 && estado.incorrectas === 0;

      slot.innerHTML = `
        <div class="mem-juego-fin">
          <span class="mem-juego-fin__icono">${perfecto ? I('trophy') : I('party-popper')}</span>
          <h2>${perfecto ? '¡Sesión perfecta!' : '¡Sesión completada!'}</h2>
          <p class="mem-juego-fin__sub">${estado.dominadas ? `Dominaste ${estado.dominadas} tarjeta${estado.dominadas === 1 ? '' : 's'} nuevas.` : '¡Sigue así! Las tarjetas difíciles volverán pronto.'}</p>

          <div class="mem-juego-fin__anillo" style="--precision:${precision}">
            <div class="mem-juego-fin__anillo-inner">
              <span class="mem-juego-fin__anillo-valor">${precision}%</span>
              <span class="mem-juego-fin__stat-etiqueta">Precisión</span>
            </div>
          </div>

          <div class="mem-juego-fin__stats">
            <div class="mem-juego-fin__stat mem-juego-fin__stat--ok"><p class="mem-juego-fin__stat-valor">${estado.correctas}</p><p class="mem-juego-fin__stat-etiqueta">Correctas</p></div>
            <div class="mem-juego-fin__stat mem-juego-fin__stat--ko"><p class="mem-juego-fin__stat-valor">${estado.incorrectas}</p><p class="mem-juego-fin__stat-etiqueta">Incorrectas</p></div>
            <div class="mem-juego-fin__stat"><p class="mem-juego-fin__stat-valor">${estado.dominadas}</p><p class="mem-juego-fin__stat-etiqueta">Dominadas</p></div>
            <div class="mem-juego-fin__stat"><p class="mem-juego-fin__stat-valor">${estado.mejorRacha}</p><p class="mem-juego-fin__stat-etiqueta">Mejor racha</p></div>
          </div>

          <div class="mem-juego-fin__acciones">
            <button class="mem-juego-empezar" id="btnRepetir" style="background:var(--color-exito)">${I('rotate-ccw')} Continuar practicando</button>
            <button class="btn-secundario" id="btnVolverMazos" style="justify-content:center">Volver a los mazos</button>
          </div>
        </div>`;
      window.Iconos.actualizar();

      $(slot, '#btnRepetir').onclick = async () => {
        try {
          await this._recargar(raiz);
          this._sesion(raiz, estado.mazoId);
        } catch (e) { this._sesion(raiz, estado.mazoId); }
      };
      $(slot, '#btnVolverMazos').onclick = async () => {
        try { await this._recargar(raiz); } catch (e) {}
        this._pintar(raiz);
      };
    },

    /* ── Recargar datos ── */
    async _recargar(raiz) {
      const d = this._datos;
      const [mazos, tarjetas, repasos] = await Promise.all([
        window.memorizacionRepository.listarMazos(d.usuario.id),
        window.memorizacionRepository.listarTarjetas(d.usuario.id),
        window.memorizacionRepository.totalRepasos(d.usuario.id).catch(() => d.repasos || 0),
      ]);
      const progreso = await window.memorizacionRepository.listarProgreso(d.usuario.id).catch(() => d.progreso || {});
      d.mazos = mazos;
      d.tarjetas = tarjetas;
      d.progreso = progreso;
      d.repasos = repasos;
    }
  };
})();
