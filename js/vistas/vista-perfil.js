(function() {
  'use strict';
  const I = (n) => window.Iconos.render(n);

  function fechaLarga(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return d.getDate() + ' de ' + meses[d.getMonth()] + ' de ' + d.getFullYear();
  }

  function rolBonito(rol) {
    const map = { owner: 'Propietario', admin: 'Administrador', editor: 'Profesor', usuario: 'Alumno' };
    return map[rol] || rol;
  }

  window.vistaPerfil = {
    montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      const prefs = usuario.preferencias || {};
      if (prefs.tema === 'claro') prefs.tema = 'light';
      else if (prefs.tema === 'oscuro') prefs.tema = 'dark';
      const rol = (usuario.rol || '').trim().toLowerCase();
      const esAdmin = rol === 'admin' || rol === 'owner';
      const esOwner = rol === 'owner';

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-md);padding-bottom:calc(100px + env(safe-area-inset-bottom))">

          <!-- CABECERA -->
          <div class="perfil-cabecera">
            <div class="perfil-avatar" id="avatarPerfil" title="Cambiar foto de perfil">
              <span id="avatarLetra">${usuario.nombre_completo.charAt(0).toUpperCase()}</span>
              <input type="file" id="inputFotoPerfil" accept="image/*" aria-label="Subir foto de perfil">
            </div>
            <div class="perfil-nombre-fila">
              <h3 id="nombrePerfil">${window.helpers.escapeHtml(usuario.nombre_completo)}</h3>
              <button class="perfil-btn-editar" id="btnEditarNombre" title="Editar nombre">${I('edit-3')}</button>
            </div>
            <span class="perfil-meta">@${usuario.username} · ${rolBonito(usuario.rol)}</span>
            ${usuario.email ? `<span class="perfil-email">${I('mail')} ${window.helpers.escapeHtml(usuario.email)}</span>` : ''}
            <span class="perfil-miembro">${I('calendar')} Miembro desde ${fechaLarga(usuario.creado_en)}</span>
          </div>

          <!-- SECCIONES -->
          <div class="o-pila o-pila--md">

            <!-- CUENTA -->
            <div class="perfil-seccion">
              <div class="perfil-seccion__cabecera">
                <div class="perfil-seccion__icono">${I('user')}</div>
                <div>
                  <h4 class="perfil-seccion__titulo">Cuenta</h4>
                  <p class="perfil-seccion__desc">Información de tu cuenta</p>
                </div>
              </div>
              <div class="perfil-fila">
                <span class="perfil-fila__label">Username</span>
                <span class="perfil-fila__valor">@${window.helpers.escapeHtml(usuario.username)}</span>
              </div>
              ${usuario.email ? `<div class="perfil-fila">
                <span class="perfil-fila__label">Email</span>
                <span class="perfil-fila__valor">${window.helpers.escapeHtml(usuario.email)}</span>
              </div>` : ''}
              <div class="perfil-fila">
                <span class="perfil-fila__label">Rol</span>
                <span class="perfil-fila__valor">${rolBonito(usuario.rol)}</span>
              </div>
              <div class="perfil-fila">
                <span class="perfil-fila__label">Creado</span>
                <span class="perfil-fila__valor">${fechaLarga(usuario.creado_en)}</span>
              </div>
            </div>

            <!-- APARIENCIA -->
            <div class="perfil-seccion">
              <div class="perfil-seccion__cabecera">
                <div class="perfil-seccion__icono">${I('palette')}</div>
                <div>
                  <h4 class="perfil-seccion__titulo">Apariencia</h4>
                  <p class="perfil-seccion__desc">Configuración visual de la aplicación</p>
                </div>
              </div>

              <div class="perfil-opcion">
                <div class="perfil-opcion__info">
                  <p class="perfil-opcion__label">Tema</p>
                </div>
              </div>
              <div class="perfil-segmented" role="radiogroup" aria-label="Seleccionar tema">
                <button class="perfil-segmented__btn ${prefs.tema === 'light' ? 'perfil-segmented__btn--activo' : ''}" data-tema="light" role="radio" aria-checked="${prefs.tema === 'light'}">${I('sun')} Claro</button>
                <button class="perfil-segmented__btn ${!prefs.tema ? 'perfil-segmented__btn--activo' : ''}" data-tema="auto" role="radio" aria-checked="${!prefs.tema}">${I('settings')} Auto</button>
                <button class="perfil-segmented__btn ${prefs.tema === 'dark' ? 'perfil-segmented__btn--activo' : ''}" data-tema="dark" role="radio" aria-checked="${prefs.tema === 'dark'}">${I('moon')} Oscuro</button>
              </div>

              <div class="perfil-opcion" style="margin-top:var(--espaciado-sm)">
                <div class="perfil-opcion__info">
                  <p class="perfil-opcion__label">Alto contraste</p>
                  <p class="perfil-opcion__desc">Colores más vivos y bordes marcados</p>
                </div>
                <label class="switch"><input type="checkbox" id="chkContraste" ${prefs.alto_contraste ? 'checked' : ''}><span class="slider"></span></label>
              </div>

              <div class="perfil-opcion">
                <div class="perfil-opcion__info">
                  <p class="perfil-opcion__label">Texto grande</p>
                  <p class="perfil-opcion__desc">Aumenta el tamaño del texto</p>
                </div>
                <label class="switch"><input type="checkbox" id="chkLetra" ${prefs.letra_grande ? 'checked' : ''}><span class="slider"></span></label>
              </div>

              <button class="btn-secundario u-mt-2" id="btnResetPrefs" style="width:100%;justify-content:center;font-size:var(--texto-xs)">Restablecer preferencias</button>
            </div>

            <!-- INFORMACIÓN -->
            <div class="perfil-seccion">
              <div class="perfil-seccion__cabecera">
                <div class="perfil-seccion__icono">${I('info')}</div>
                <div>
                  <h4 class="perfil-seccion__titulo">Información</h4>
                  <p class="perfil-seccion__desc">Acerca de la aplicación</p>
                </div>
              </div>
              <div class="perfil-info-card">
                <div class="perfil-info-card__texto">
                  <p class="perfil-info-card__nombre">FormsBiblicos</p>
                  <p class="perfil-info-card__version">Versión 1.0.0</p>
                </div>
                <button class="btn-secundario" id="btnMasInfo" style="font-size:var(--texto-xs)">Más información</button>
              </div>
            </div>

            <!-- ADMIN / OWNER -->
            ${esAdmin ? `
            <button class="perfil-boton-seccion" id="btnAdmin">
              <div class="perfil-boton-seccion__icono">${I('settings')}</div>
              <div class="perfil-boton-seccion__texto">
                <p class="perfil-boton-seccion__label">Panel de Administración</p>
                <p class="perfil-boton-seccion__desc">Gestionar usuarios, grupos y exámenes</p>
              </div>
              <span class="perfil-boton-seccion__flecha">${I('chevron-right')}</span>
            </button>` : ''}
            ${esOwner ? `
            <button class="perfil-boton-seccion" id="btnOwner">
              <div class="perfil-boton-seccion__icono" style="background:var(--color-aviso-soft);color:var(--color-aviso)">${I('shield')}</div>
              <div class="perfil-boton-seccion__texto">
                <p class="perfil-boton-seccion__label">Panel de Propietario</p>
                <p class="perfil-boton-seccion__desc">Supervisión global del sistema</p>
              </div>
              <span class="perfil-boton-seccion__flecha">${I('chevron-right')}</span>
            </button>` : ''}

            <!-- SEGURIDAD -->
            <div class="perfil-seccion">
              <div class="perfil-seccion__cabecera">
                <div class="perfil-seccion__icono" style="background:var(--color-error-soft);color:var(--color-error)">${I('lock')}</div>
                <div>
                  <h4 class="perfil-seccion__titulo">Seguridad</h4>
                  <p class="perfil-seccion__desc">Gestión de sesión</p>
                </div>
              </div>
              <button class="perfil-btn-cerrar" id="btnLogout">${I('log-out')} Cerrar sesión</button>
            </div>

            <!-- ZONA DE PELIGRO -->
            <details class="zona-peligro">
              <summary class="zona-peligro__cabecera" style="cursor:pointer;list-style:none">
                ${I('alert-triangle')}
                <h4 style="display:inline">Zona de peligro</h4>
              </summary>
              <p class="zona-peligro__descripcion">
                <strong>Eliminar todos mis datos</strong><br><br>
                Se eliminarán permanentemente:<br>
                &bull; Progreso de lectura<br>
                &bull; Tarjetas de memorización<br>
                &bull; Historial de repasos<br>
                &bull; Logros<br>
                &bull; Intentos de exámenes<br><br>
                Tu cuenta seguirá existiendo.
              </p>
              <button class="btn-peligro" id="btnEliminarDatos">${I('trash-2')} Eliminar todos mis datos</button>
            </details>

          </div>
        </div>`;

      if (window.Iconos) window.Iconos.actualizar();

      if (usuario.foto_perfil) {
        const avatar = raiz.querySelector('#avatarPerfil');
        if (avatar) avatar.innerHTML = `<img src="${usuario.foto_perfil}" alt="Foto de perfil"><input type="file" id="inputFotoPerfil" accept="image/*" aria-label="Subir foto de perfil" style="position:absolute;inset:0;opacity:0;cursor:pointer">`;
      }

      const togglePref = async (clave, valor) => {
        if (!window.supabaseClient || !usuario) return;
        const prefsActuales = { ...(usuario.preferencias || {}), [clave]: valor };
        usuario.preferencias = prefsActuales;
        store.actualizar('usuario', { ...usuario });
        localStorage.setItem('fb_usuario', JSON.stringify(usuario));
        if (window.preferencias) window.preferencias.guardar(prefsActuales);
        try { await window.supabaseClient.from('perfiles').update({ preferencias: JSON.stringify(prefsActuales) }).eq('id', usuario.id); } catch (e) { window.helpers.mostrarAlerta('No se pudieron guardar las preferencias.', 'advertencia'); }
      };

      raiz.querySelector('#chkContraste').addEventListener('change', function() {
        document.documentElement.dataset.hc = this.checked ? 'true' : 'false';
        togglePref('alto_contraste', this.checked);
      });

      const chkLetra = raiz.querySelector('#chkLetra');
      if (chkLetra) {
        chkLetra.addEventListener('change', function() {
          document.documentElement.dataset.lg = this.checked ? 'true' : 'false';
          togglePref('letra_grande', this.checked);
        });
      }

      raiz.querySelectorAll('.perfil-segmented__btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tema = btn.dataset.tema;
          const temaValor = tema === 'auto' ? null : tema;
          raiz.querySelectorAll('.perfil-segmented__btn').forEach(b => {
            b.classList.remove('perfil-segmented__btn--activo');
            b.setAttribute('aria-checked', 'false');
          });
          btn.classList.add('perfil-segmented__btn--activo');
          btn.setAttribute('aria-checked', 'true');
          if (tema === 'auto') delete document.documentElement.dataset.theme;
          else document.documentElement.dataset.theme = tema;
          togglePref('tema', temaValor);
        });
      });

      raiz.querySelector('#btnResetPrefs').onclick = async () => {
        const ok = await window.helpers.confirmar('Se restaurarán las preferencias a sus valores por defecto.', { titulo: '¿Restablecer preferencias?', textoConfirmar: 'Restablecer' });
        if (!ok) return;
        delete document.documentElement.dataset.theme;
        document.documentElement.dataset.hc = 'false';
        document.documentElement.dataset.lg = 'false';
        if (window.preferencias) window.preferencias.guardar({ tema: null, alto_contraste: false, letra_grande: false });
        const prefsDefault = { tema: null, alto_contraste: false, letra_grande: false };
        usuario.preferencias = prefsDefault;
        store.actualizar('usuario', { ...usuario });
        localStorage.setItem('fb_usuario', JSON.stringify(usuario));
        try { await window.supabaseClient.from('perfiles').update({ preferencias: JSON.stringify(prefsDefault) }).eq('id', usuario.id); } catch (e) {}
        window.helpers.mostrarAlerta('Preferencias restablecidas.', 'exito');
        router.navegar('/perfil');
      };

      const btnAdmin = raiz.querySelector('#btnAdmin');
      if (btnAdmin) btnAdmin.onclick = () => router.navegar('/admin');
      const btnOwner = raiz.querySelector('#btnOwner');
      if (btnOwner) btnOwner.onclick = () => router.navegar('/owner');

      raiz.querySelector('#btnMasInfo').onclick = () => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
          <div class="modal" role="dialog" aria-modal="true">
            <div class="o-pila" style="gap:var(--espaciado-md)">
              <h3>${I('info')} Acerca de FormsBiblicos</h3>
              <p class="u-fs-sm" style="color:var(--color-texto-secundario);line-height:1.6">
                <strong>FormsBiblicos</strong> es una plataforma de estudio bíblico guiado. Lee capítulos, responde preguntas, memoriza versículos y sigue tu progreso a través de toda la Biblia.
              </p>
              <div class="o-pila" style="gap:var(--espaciado-xxs)">
                <div class="perfil-fila"><span class="perfil-fila__label">Objetivo</span><span class="perfil-fila__valor" style="font-weight:400;max-width:70%">Estudio bíblico sistemático</span></div>
                <div class="perfil-fila"><span class="perfil-fila__label">Versión</span><span class="perfil-fila__valor">1.0.0</span></div>
                <div class="perfil-fila"><span class="perfil-fila__label">Plataforma</span><span class="perfil-fila__valor">PWA</span></div>
                <div class="perfil-fila"><span class="perfil-fila__label">Tecnologías</span><span class="perfil-fila__valor" style="font-weight:400;max-width:70%">HTML, CSS, JS, Supabase</span></div>
              </div>
            </div>
            <button class="btn-primario u-mt-2" id="btnCerrarInfo" style="width:100%;justify-content:center">Cerrar</button>
          </div>`;
        document.body.appendChild(overlay);
        if (window.Iconos) window.Iconos.actualizar();
        overlay.querySelector('#btnCerrarInfo').onclick = () => overlay.remove();
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      };

      raiz.querySelector('#btnLogout').onclick = async () => {
        const ok = await window.helpers.confirmar('¿Estás seguro de cerrar sesión?', { titulo: 'Cerrar sesión', textoConfirmar: 'Cerrar sesión' });
        if (ok) authRepository.cerrarSesion();
      };

      raiz.querySelector('#btnEliminarDatos').onclick = async () => {
        const primero = await window.helpers.confirmar(
          'Se borrarán tu progreso, tarjetas, repasos, logros e intentos de exámenes. Esta acción no se puede deshacer.',
          { titulo: '¿Eliminar TODOS tus datos?', textoConfirmar: 'Sí, eliminar' }
        );
        if (!primero) return;
        const segundo = await window.helpers.confirmar(
          'CONFIRMACIÓN FINAL: ¿Eliminar permanentemente todos tus datos?',
          { titulo: 'Última confirmación', textoConfirmar: 'Eliminar permanentemente' }
        );
        if (!segundo) return;
        try {
          await authRepository.eliminarMisDatos(usuario.id);
          window.helpers.mostrarAlerta('Todos tus datos han sido eliminados.', 'exito');
          router._ejecutar();
        } catch (e) { window.helpers.mostrarAlerta('Error al eliminar: ' + e.message, 'error'); }
      };

      raiz.querySelector('#btnEditarNombre').onclick = async () => {
        const datos = await window.helpers.formulario({
          titulo: 'Editar nombre',
          mensaje: 'Solo puedes modificar tu nombre completo. El username no se puede cambiar.',
          campos: [
            { nombre: 'nombre_completo', etiqueta: 'Nombre completo', valor: usuario.nombre_completo || '', requerido: true }
          ],
          textoConfirmar: 'Guardar'
        });
        if (!datos) return;
        try {
          await window.supabaseClient.from('perfiles').update({ nombre_completo: datos.nombre_completo.trim() }).eq('id', usuario.id);
          usuario.nombre_completo = datos.nombre_completo.trim();
          store.actualizar('usuario', { ...usuario });
          localStorage.setItem('fb_usuario', JSON.stringify(usuario));
          window.helpers.mostrarAlerta('Nombre actualizado.', 'exito');
          router.navegar('/perfil');
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      };

      raiz.querySelector('#inputFotoPerfil').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const lector = new FileReader();
        lector.onload = async (ev) => {
          let base64 = ev.target.result;
          try {
            const img = new Image();
            img.src = base64;
            await new Promise(r => img.onload = r);
            const canvas = document.createElement('canvas');
            const size = Math.min(img.width, img.height, 400);
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            const sx = (img.width - size) / 2, sy = (img.height - size) / 2;
            ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
            base64 = canvas.toDataURL('image/jpeg', 0.85);
          } catch (err) {}
          usuario.foto_perfil = base64;
          store.actualizar('usuario', { ...usuario });
          localStorage.setItem('fb_usuario', JSON.stringify(usuario));
          const avatar = raiz.querySelector('#avatarPerfil');
          if (avatar) avatar.innerHTML = `<img src="${base64}" alt="Foto de perfil"><input type="file" id="inputFotoPerfil" accept="image/*" aria-label="Subir foto de perfil" style="position:absolute;inset:0;opacity:0;cursor:pointer">`;
          try { await window.supabaseClient.from('perfiles').update({ foto_perfil: base64 }).eq('id', usuario.id); } catch (e) {}
          window.helpers.mostrarAlerta('Foto de perfil actualizada.', 'exito');
        };
        lector.readAsDataURL(file);
      };
    }
  };
})();
