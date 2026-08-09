(function() {
  'use strict';
  const I = (n) => window.Iconos.render(n);
  const E = (h) => window.helpers.escapeHtml(h);
  const J = () => window.ejerciciosMemorizacion;

  function avatarHtml(m, grande = false) {
    if (m && m.foto_perfil) return `<img src="${E(m.foto_perfil)}" alt="" loading="lazy">`;
    const letra = ((m && (m.nombre_completo || m.username)) || '?').charAt(0).toUpperCase();
    return `<span class="${grande ? 'grupos-avatar__letra--lg' : ''}">${E(letra)}</span>`;
  }

  function rolBonito(rol) {
    return (window.adminComunes && window.adminComunes.rolBonito) ? window.adminComunes.rolBonito(rol) : rol;
  }

  function fechaCorta(iso) {
    if (!iso) return '—';
    return window.helpers.formatearFecha(iso);
  }

  window.vistaGrupos = {
    async montar(raiz, params) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      this._usuario = usuario;
      this._seleccion = new Set();
      if (params && params.id) return this._montarGrupo(raiz, params.id);
      return this._montarDirectorio(raiz);
    },

    desmontar() { this._seleccion = null; this._usuario = null; },

    /* ══════════════════════════════════════════════════════════
       DIRECTORIO DE GRUPOS
       ══════════════════════════════════════════════════════════ */
    async _montarDirectorio(raiz) {
      const usuario = this._usuario;
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg grupos" style="padding-top:var(--espaciado-md);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <div class="grupos-cabecera">
            <button class="btn-icono grupos-cabecera__volver" id="btnVolverGrupos" aria-label="Volver al perfil">${I('arrow-left')}</button>
            <div class="grupos-cabecera__texto">
              <h1 class="grupos-cabecera__titulo">Grupos</h1>
              <p class="grupos-cabecera__sub">Estudia y desafía con tu comunidad</p>
            </div>
          </div>
          ${['admin', 'owner'].includes(usuario.rol) ? `
          <div class="o-flecha" style="justify-content:flex-end">
            <button class="btn-primario" id="btnCrearGrupo">${I('plus')} Crear grupo</button>
          </div>` : ''}
          <div id="gruposContenido">
            <div class="skeleton-stack" aria-hidden="true">
              <div class="skel" style="height:110px;border-radius:var(--card-radius)"></div>
              <div class="skel" style="height:110px;border-radius:var(--card-radius)"></div>
            </div>
          </div>
        </div>`;
      raiz.querySelector('#btnVolverGrupos').onclick = () => router.navegar('/perfil');

      // Crear grupo (admin/owner) sin salir de la pestaña Grupos
      const btnCrear = raiz.querySelector('#btnCrearGrupo');
      if (btnCrear) btnCrear.onclick = async () => {
        const datos = await window.helpers.formulario({
          titulo: 'Crear grupo',
          campos: [{ nombre: 'nombre', etiqueta: 'Nombre del grupo', requerido: true, placeholder: 'Ej: Clase 1º ESO A' }],
          textoConfirmar: 'Crear'
        });
        if (!datos || !datos.nombre.trim()) return;
        try {
          await window.gruposRepository.crearGrupo(datos.nombre.trim(), usuario.id);
          try { await window.adminRepository.registrarAuditoria('grupo:crear', `Grupo "${datos.nombre.trim()}" creado`, usuario.id); } catch (e) {}
          window.helpers.mostrarAlerta('Grupo creado.', 'exito');
          this._montarDirectorio(raiz);
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      };

      const [grupos, invitaciones, clase, membresias, administrados] = await Promise.all([
        window.gruposRepository.listarGruposPublicos(),
        window.desafiosRepository.misInvitaciones(usuario.id),
        window.gruposRepository.obtenerMiClase(usuario),
        window.gruposRepository.misMembresias(usuario.id),
        window.gruposRepository.gruposAdminDe(usuario.id)
      ]);
      const cont = raiz.querySelector('#gruposContenido');
      if (!cont) return;

      // Marcar los grupos del usuario (clase, membresías o administrados)
      const misGrupos = new Set();
      if (clase && clase.grupo) misGrupos.add(clase.grupo.id);
      (membresias || []).forEach(g => { if (g && g.id) misGrupos.add(g.id); });
      (administrados || []).forEach(g => { if (g && g.id) misGrupos.add(g.id); });
      (grupos || []).forEach(g => { g._soyMiembro = misGrupos.has(g.id); });

      const invitacionesHtml = invitaciones.length ? `
        <section class="grupos-seccion">
          <div class="grupos-seccion__cabecera">
            <div class="grupos-seccion__icono">${I('sword')}</div>
            <div>
              <h3 class="grupos-seccion__titulo">Invitaciones a desafíos</h3>
              <p class="grupos-seccion__desc">Acepta y empieza cuando todos estén listos</p>
            </div>
            <span class="grupos-otros__contador">${invitaciones.length}</span>
          </div>
          <div class="o-pila" style="gap:var(--espaciado-xs)">
            ${invitaciones.map(d => this._tarjetaInvitacion(d)).join('')}
          </div>
        </section>` : '';

      const buscadorHtml = `
        <div class="grupos-buscar">
          <span class="grupos-buscar__icono">${I('search')}</span>
          <input type="text" id="buscarGrupos" placeholder="Buscar un grupo..." aria-label="Buscar grupos">
        </div>`;

      const gruposHtml = grupos.length === 0
        ? `<div class="empty-state"><div class="empty-state__icono">${I('users')}</div>
            <h3 class="empty-state__titulo">Aún no hay grupos</h3>
            <p class="empty-state__descripcion">El administrador creará los primeros grupos de estudio.</p></div>`
        : `<div class="grupos-directorio" id="gruposDirectorio">
             ${grupos.map(g => this._tarjetaGrupo(g, usuario)).join('')}
           </div>`;

      cont.innerHTML = `
        ${invitacionesHtml}
        ${grupos.length ? buscadorHtml : ''}
        ${gruposHtml}`;
      if (window.Iconos) window.Iconos.actualizar();

      // Búsqueda en vivo
      const inp = cont.querySelector('#buscarGrupos');
      if (inp) inp.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        cont.querySelectorAll('.grupos-directorio__card').forEach(card => {
          const texto = (card.dataset.nombre || '').toLowerCase();
          card.style.display = (!q || texto.includes(q)) ? '' : 'none';
        });
      });

      // Invitaciones
      cont.querySelectorAll('[data-invitacion]').forEach(btn => {
        btn.onclick = async () => {
          const d = invitaciones.find(x => x.id === btn.dataset.invitacion);
          if (!d) return;
          btn.disabled = true;
          if (btn.dataset.accion === 'aceptar') {
            try {
              const r = await window.desafiosRepository.responderInvitacion(d.id, usuario.id, true);
              // Cerrar el ciclo de vida en el centro (completada), no solo leída
              if (d._notifId && window.notificationService) {
                window.notificationService.marcarCompletada(d._notifId).catch(() => {});
              } else {
                await window.desafiosRepository.marcarNotificacionLeida(d._notifId || null);
              }
              if (r.empezado) { router.navegar('/desafio/' + d.id); }
              else { window.helpers.mostrarAlerta('Has aceptado. Esperando a los demás...', 'exito'); this._montarDirectorio(raiz); }
            } catch (e) { btn.disabled = false; window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
          } else {
            try {
              await window.desafiosRepository.responderInvitacion(d.id, usuario.id, false);
              window.helpers.mostrarAlerta('Has rechazado el desafío.', 'info');
              this._montarDirectorio(raiz);
            } catch (e) { btn.disabled = false; window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
          }
        };
      });

      // Entrar / ver grupo
      cont.querySelectorAll('[data-grupo]').forEach(btn => {
        btn.onclick = async () => {
          const g = grupos.find(x => x.id === btn.dataset.grupo);
          if (!g) return;
          if (btn.dataset.accion === 'entrar') {
            btn.disabled = true;
            try {
              await window.gruposRepository.unirseAGrupo(g.id, usuario.id);
              window.helpers.mostrarAlerta(`Bienvenido a ${g.nombre}`, 'exito');
            } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
          }
          router.navegar('/grupos/' + g.id);
        };
      });
    },

    _tarjetaInvitacion(d) {
      const creador = (d.perfiles && d.perfiles[0]) || (d.perfiles) || {};
      return `
        <div class="grupos-invitacion">
          <div class="grupos-invitacion__avatar">${avatarHtml(creador)}</div>
          <div class="grupos-invitacion__info">
            <p class="grupos-invitacion__titulo">${E(creador.nombre_completo || creador.username || 'Alguien')} te ha desafiado</p>
            <p class="grupos-invitacion__desc">${I('layers')} ${E(d.mazo_nombre || 'Mazo de memorización')}</p>
          </div>
          <div class="grupos-invitacion__acciones">
            <button class="btn-primario u-fs-xs" data-invitacion="${d.id}" data-accion="aceptar">${I('check')} Aceptar</button>
            <button class="btn-secundario u-fs-xs" data-invitacion="${d.id}" data-accion="rechazar">${I('x')} Rechazar</button>
          </div>
        </div>`;
    },

    _tarjetaGrupo(g, usuario) {
      const esMiembro = g._soyMiembro === true;
      return `
        <article class="grupos-directorio__card" data-nombre="${E(g.nombre || '')}">
          ${g.imagen
            ? `<img class="grupos-directorio__img" src="${E(g.imagen)}" alt="" loading="lazy">`
            : `<div class="grupos-directorio__img grupos-directorio__img--fallback">${I('users')}</div>`}
          <div class="grupos-directorio__cuerpo">
            <h3 class="grupos-directorio__nombre">${E(g.nombre)}</h3>
            <p class="grupos-directorio__desc">${E((g.descripcion || 'Grupo de estudio bíblico').slice(0, 80))}</p>
            <div class="grupos-directorio__meta">
              <span>${I('users')} ${g.num_miembros} miembro${g.num_miembros !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button class="btn-primario grupos-directorio__btn" data-grupo="${g.id}" data-accion="${esMiembro ? 'ver' : 'entrar'}">
            ${esMiembro ? I('eye') + ' Ver grupo' : I('log-in') + ' Entrar'}
          </button>
        </article>`;
    },

    /* ══════════════════════════════════════════════════════════
       DETALLE DE GRUPO — lista de miembros
       ══════════════════════════════════════════════════════════ */
    async _montarGrupo(raiz, grupoId) {
      const usuario = this._usuario;
      raiz.innerHTML = `<div class="o-contenedor u-mt-3"><div class="skeleton-stack" aria-hidden="true"><div class="skel" style="height:150px;border-radius:var(--card-radius)"></div><div class="skel" style="height:200px;border-radius:var(--card-radius)"></div></div></div>`;
      const [grupoRes, miembros] = await Promise.all([
        window.supabaseClient.from('grupos').select('*').eq('id', grupoId).limit(1),
        window.gruposRepository.obtenerMiembrosDe(grupoId)
      ]);
      const grupo = grupoRes.data && grupoRes.data[0];
      if (!grupo) { raiz.innerHTML = window.adminComunes.vacio('users', 'Grupo no encontrado', ''); return; }

      const soyMiembro = miembros.some(m => m.id === usuario.id);
      this._miembros = miembros;
      this._grupo = grupo;

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg grupos" style="padding-top:var(--espaciado-md);padding-bottom:calc(110px + env(safe-area-inset-bottom))">
          <div class="grupos-cabecera">
            <button class="btn-icono grupos-cabecera__volver" id="btnVolverDirectorio" aria-label="Volver a grupos">${I('arrow-left')}</button>
            <div class="grupos-cabecera__texto">
              <h1 class="grupos-cabecera__titulo">${E(grupo.nombre)}</h1>
              <p class="grupos-cabecera__sub">${miembros.length} miembro${miembros.length !== 1 ? 's' : ''} · ${E(grupo.descripcion || 'Grupo de estudio bíblico')}</p>
            </div>
          </div>

          ${!soyMiembro ? `
          <div class="grupos-entrar">
            <p>${I('users')} Únete a este grupo para ver a sus miembros y desafiarlos.</p>
            <button class="btn-primario" id="btnEntrarGrupo" style="justify-content:center">${I('log-in')} Entrar al grupo</button>
          </div>` : ''}

          <section class="grupos-seccion">
            <div class="grupos-seccion__cabecera">
              <div class="grupos-seccion__icono">${I('users')}</div>
              <div>
                <h3 class="grupos-seccion__titulo">Miembros</h3>
                <p class="grupos-seccion__desc">Toca un miembro para ver su perfil</p>
              </div>
              ${soyMiembro && miembros.length > 1 ? `
              <button class="btn-secundario u-fs-xs" id="btnSeleccionarTodos">${I('check-square')} Seleccionar</button>` : ''}
            </div>
            <div class="grupos-miembros" id="listaMiembros">
              ${miembros.map(m => this._fichaMiembro(m, usuario)).join('')}
            </div>
          </section>

          ${soyMiembro ? `
          <div class="grupos-desafio-bar" id="desafioBar" hidden>
            <span id="desafioBarTexto">0 seleccionados</span>
            <button class="btn-primario" id="btnDesafiarSeleccion">${I('sword')} Desafiar</button>
          </div>` : ''}
        </div>`;

      if (window.Iconos) window.Iconos.actualizar();

      raiz.querySelector('#btnVolverDirectorio').onclick = () => router.navegar('/grupos');

      // Entrar al grupo
      const btnEntrar = raiz.querySelector('#btnEntrarGrupo');
      if (btnEntrar) btnEntrar.onclick = async () => {
        btnEntrar.disabled = true;
        try {
          await window.gruposRepository.unirseAGrupo(grupoId, usuario.id);
          window.helpers.mostrarAlerta(`Bienvenido a ${grupo.nombre}`, 'exito');
          this._montarGrupo(raiz, grupoId);
        } catch (e) { btnEntrar.disabled = false; window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      };

      // Seleccionar todos / modo selección
      const btnSel = raiz.querySelector('#btnSeleccionarTodos');
      if (btnSel) btnSel.onclick = () => {
        const activo = raiz.querySelector('#listaMiembros').classList.toggle('grupos-miembros--seleccion');
        this._seleccion.clear();
        if (activo) miembros.forEach(m => { if (m.id !== usuario.id) this._seleccion.add(m.id); });
        this._actualizarSeleccion(raiz);
        btnSel.textContent = activo ? 'Quitar selección' : 'Seleccionar';
      };

      // Perfil rápido de cada miembro
      raiz.querySelectorAll('[data-miembro]').forEach(el => {
        el.onclick = (e) => {
          if (e.target.closest('.grupos-miembro__check')) return;
          if (raiz.querySelector('#listaMiembros').classList.contains('grupos-miembros--seleccion')) return;
          const m = miembros.find(x => x.id === el.dataset.miembro);
          if (m) this._perfilRapido(m);
        };
      });

      // Checkboxes de selección
      raiz.querySelectorAll('.grupos-miembro__check input').forEach(cb => {
        cb.onchange = () => {
          if (cb.checked) this._seleccion.add(cb.dataset.id);
          else this._seleccion.delete(cb.dataset.id);
          this._actualizarSeleccion(raiz);
        };
      });

      // Barra de desafío masivo
      const btnDesafiar = raiz.querySelector('#btnDesafiarSeleccion');
      if (btnDesafiar) btnDesafiar.onclick = async () => {
        const elegidos = miembros.filter(m => this._seleccion.has(m.id));
        if (!elegidos.length) return;
        btnDesafiar.disabled = true;
        try { await this._flujoDesafio(elegidos); }
        catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
        finally { btnDesafiar.disabled = false; }
      };

      // Botón Desafiar del perfil rápido se enlaza al crearse
      this._miembrosActuales = miembros;
    },

    _fichaMiembro(m, usuario) {
      const esYo = m.id === usuario.id;
      const online = m.ultimo_acceso && (Date.now() - new Date(m.ultimo_acceso).getTime()) < 300000;
      return `
        <div class="grupos-miembro" data-miembro="${m.id}" role="button" tabindex="0" aria-label="Ver perfil de ${E(m.nombre_completo || m.username)}">
          <div class="grupos-miembro__avatar">${avatarHtml(m)}</div>
          <div class="grupos-miembro__info">
            <p class="grupos-miembro__nombre">${E(m.nombre_completo || m.username)}${esYo ? ' <span class="grupos-miembro__tu">(tú)</span>' : ''}</p>
            <p class="grupos-miembro__username">@${E(m.username)}</p>
          </div>
          ${online ? `<span class="grupos-miembro__online" title="En línea"></span>` : ''}
          <label class="grupos-miembro__check" aria-label="Seleccionar a ${E(m.nombre_completo || m.username)}">
            <input type="checkbox" data-id="${m.id}" ${esYo ? 'disabled' : ''}>
          </label>
        </div>`;
    },

    _actualizarSeleccion(raiz) {
      // Sincronizar los checkboxes visuales con el Set interno: al pulsar
      // "Seleccionar" (todos) o "Quitar selección", los checkboxes deben
      // reflejar el estado real. Antes solo se actualizaba la barra y el
      // usuario veía "5 seleccionados" con 0 casillas marcadas (o al revés)
      // — discrepancia confusa entre el contador y la UI.
      raiz.querySelectorAll('.grupos-miembro__check input').forEach(cb => {
        cb.checked = this._seleccion.has(cb.dataset.id);
      });
      const bar = raiz.querySelector('#desafioBar');
      const texto = raiz.querySelector('#desafioBarTexto');
      if (bar && texto) {
        const n = this._seleccion.size;
        bar.hidden = n === 0;
        texto.textContent = `${n} seleccionado${n !== 1 ? 's' : ''}`;
      }
    },

    /* ══════════════════════════════════════════════════════════
       PERFIL RÁPIDO + FLUJO DESAFIAR
       ══════════════════════════════════════════════════════════ */
    async _perfilRapido(m) {
      // Datos frescos del perfil (biografía incluida). Resiliente a la
      // migración 024 no aplicada (perfiles.biografia inexistente).
      let p = m;
      try {
        const res = await window.supabaseClient.from('perfiles')
          .select('id, nombre_completo, username, rol, foto_perfil, biografia, creado_en')
          .eq('id', m.id).limit(1);
        if (!res.error && res.data && res.data[0]) p = res.data[0];
      } catch (e) { /* sin biografia: usar datos de la lista */ }
      const esYo = p.id === this._usuario.id;

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal grupos-perfil">
          <div class="grupos-perfil__avatar">${avatarHtml(p, true)}</div>
          <h3 class="grupos-perfil__nombre">${E(p.nombre_completo || p.username)}</h3>
          <p class="grupos-perfil__username">@${E(p.username)}</p>
          <span class="perfil-rol-badge">${rolBonito(p.rol)}</span>
          <div class="grupos-perfil__meta">
            <span>${I('calendar')} Miembro desde ${E(fechaCorta(p.creado_en))}</span>
          </div>
          ${p.biografia ? `<p class="grupos-perfil__bio">${E(p.biografia)}</p>` : ''}
          <div class="grupos-perfil__acciones">
            ${esYo ? '' : `<button class="btn-primario grupos-perfil__desafiar" data-perfil-desafio="${p.id}">${I('sword')} Desafiar</button>`}
            <button class="btn-secundario grupos-perfil__cerrar">${I('x')} Cerrar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      if (window.Iconos) window.Iconos.actualizar();

      const cerrar = () => overlay.remove();
      overlay.querySelector('.grupos-perfil__cerrar').onclick = cerrar;
      overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });

      const btnDesafiar = overlay.querySelector('[data-perfil-desafio]');
      if (btnDesafiar) btnDesafiar.onclick = async () => {
        btnDesafiar.disabled = true;
        try { await this._flujoDesafio([p]); cerrar(); }
        catch (e) { btnDesafiar.disabled = false; window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      };
    },

    // Paso común: elegir mazo → construir sesión idéntica → crear desafío
    async _flujoDesafio(participantes) {
      // Evita crear dos desafíos por doble clic en "Desafiar".
      if (this._flujoEnCurso) return;
      this._flujoEnCurso = true;
      const terminarFlujo = () => { this._flujoEnCurso = false; };
      const usuario = this._usuario;
      const mazos = await window.desafiosRepository.listarMazosDesafio();
      if (!mazos.length) {
        window.helpers.mostrarAlerta('Aún no hay mazos de memorización para desafiar.', 'info');
        terminarFlujo();
        return;
      }
      const tarjetasTodas = await window.memorizacionRepository.listarTarjetas(null);
      const contar = (mazoId) => (tarjetasTodas || []).filter(t => t.mazo_id === mazoId).length;

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          <div class="o-pila o-pila--md">
            <div class="o-flecha o-flecha--between">
              <h3 class="modal__titulo" style="margin:0">${I('sword')} Elegir mazo</h3>
              <button class="btn-icono" data-cerrar aria-label="Cerrar">${I('x')}</button>
            </div>
            <p class="u-fs-xs u-color-texto-terciario">Desafiarás a ${participantes.length} participante${participantes.length !== 1 ? 's' : ''}. Todos responderéis las mismas preguntas.</p>
            <div class="grupos-mazos">
              ${mazos.length === 0
                ? '<p class="u-color-texto-terciario u-fs-sm">Sin mazos disponibles.</p>'
                : mazos.map(m => `
                  <button class="grupos-mazo" data-mazo="${m.id}" data-nombre="${E(m.nombre)}">
                    <span class="grupos-mazo__icono">${I(m.icono || 'layers')}</span>
                    <span class="grupos-mazo__info">
                      <span class="grupos-mazo__nombre">${E(m.nombre)}</span>
                      <span class="grupos-mazo__desc">${E(m.descripcion || 'Mazo de memorización')} · ${contar(m.id)} tarjetas</span>
                    </span>
                    <span class="grupos-mazo__flecha">${I('chevron-right')}</span>
                  </button>`).join('')}
            </div>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      if (window.Iconos) window.Iconos.actualizar();
      let resolver = null;
      const cerrarModal = () => { overlay.remove(); if (resolver) resolver(null); terminarFlujo(); };
      overlay.querySelector('[data-cerrar]').onclick = cerrarModal;
      overlay.addEventListener('click', e => { if (e.target === overlay) cerrarModal(); });

      return new Promise((resolve) => {
        resolver = resolve;
        overlay.querySelectorAll('[data-mazo]').forEach(btn => {
          btn.onclick = async () => {
            const mazo = mazos.find(m => m.id === btn.dataset.mazo);
            if (!mazo) return;
            const tarjetas = (tarjetasTodas || []).filter(t => t.mazo_id === mazo.id);
            if (!tarjetas.length) { window.helpers.mostrarAlerta('Ese mazo no tiene tarjetas todavía.', 'advertencia'); return; }
            const sesion = J().construirSesion(tarjetas, tarjetasTodas || [], { maxTarjetas: 10 });
            overlay.remove();
            btn.disabled = true;
            try {
              const desafio = await window.desafiosRepository.crearDesafio({
                creador: usuario,
                participantes,
                mazo,
                sesion
              });
              window.helpers.mostrarAlerta(`Desafío enviado a ${participantes.length} participante${participantes.length !== 1 ? 's' : ''}.`, 'exito');
              resolve(desafio);
              terminarFlujo();
              // Redirigir al creador a la pantalla de espera del desafío
              router.navegar('/desafio/' + desafio.id);
            } catch (e) {
              btn.disabled = false;
              window.helpers.mostrarAlerta('Error: ' + e.message, 'error');
              resolve(null);
              terminarFlujo();
            }
          };
        });
      });
    }
  };
})();
