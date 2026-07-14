(function() {
  'use strict';
  window.vistaPerfil = {
    montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      const prefs = usuario.preferencias || {};
      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:120px">
          <div class="u-texto-centrado o-pila" style="align-items:center">
            <div style="width:80px;height:80px;border-radius:50%;background:var(--color-acento-soft);display:flex;align-items:center;justify-content:center;font-size:2.2rem;font-weight:700;color:var(--color-acento);cursor:pointer;overflow:hidden;position:relative" id="avatarPerfil" title="Cambiar foto de perfil">
              <span id="avatarLetra">${usuario.nombre_completo.charAt(0).toUpperCase()}</span>
              <input type="file" id="inputFotoPerfil" accept="image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer">
            </div>
            <div>
              <div class="o-flecha" style="gap:var(--espaciado-xs);justify-content:center">
                <h3 id="nombrePerfil">${window.helpers.escapeHtml(usuario.nombre_completo)}</h3>
                <button class="btn-editar-nombre" id="btnEditarNombre" style="background:none;border:none;cursor:pointer;color:var(--color-acento);display:inline-flex;font-size:var(--texto-sm)">${window.Iconos.render('edit-3')}</button>
              </div>
              <span class="u-fs-sm u-color-texto-secundario">@${usuario.username} · ${usuario.rol}</span>
            </div>
          </div>
          <div class="o-pila"><h4>Información</h4>
            ${usuario.email ? `<div class="tarjeta-capitulo"><span class="u-fs-sm u-color-texto-secundario">Email</span><p>${window.helpers.escapeHtml(usuario.email)}</p></div>` : ''}
            <div class="tarjeta-capitulo"><span class="u-fs-sm u-color-texto-secundario">Miembro desde</span><p>${window.helpers.formatearFecha(usuario.creado_en) || '—'}</p></div>
          </div>
          <div class="o-pila"><h4>Preferencias</h4>
            <div class="tarjeta-capitulo"><div class="o-flecha o-flecha--between"><span>Alto contraste</span><label class="switch"><input type="checkbox" id="chkContraste" ${prefs.alto_contraste ? 'checked' : ''}><span class="slider"></span></label></div><p class="u-fs-xs u-color-texto-terciario u-mt-1">Aumenta el contraste con texto negro, bordes negros y colores vivos para facilitar la lectura.</p></div>
            <div class="tarjeta-capitulo"><div class="o-flecha o-flecha--between"><span>Letra grande</span><label class="switch"><input type="checkbox" id="chkLetra" ${prefs.letra_grande ? 'checked' : ''}><span class="slider"></span></label></div><p class="u-fs-xs u-color-texto-terciario u-mt-1">Aumenta el tamaño del texto en toda la aplicación.</p></div>
            <div class="tarjeta-capitulo"><div class="o-flecha o-flecha--between"><span>Tema claro</span><label class="switch"><input type="checkbox" id="chkTema" ${prefs.tema === 'claro' ? 'checked' : ''}><span class="slider"></span></label></div><p class="u-fs-xs u-color-texto-terciario u-mt-1">Fuerza la apariencia clara (blanco). Desactívalo para usar el tema oscuro. Es distinto de <strong>Alto contraste</strong>, que además pone bordes negros y colores vivos para facilitar la lectura.</p></div>
          </div>
          ${['admin', 'owner'].includes((usuario.rol || '').toString().trim().toLowerCase()) ? `<button class="btn-secundario" id="btnAdmin" style="width:100%;justify-content:center">${window.Iconos.render('settings')} Panel de Administración</button>` : ''}
          ${(usuario.rol || '').toString().trim().toLowerCase() === 'owner' ? `<button class="btn-secundario u-mt-1" id="btnOwner" style="width:100%;justify-content:center">${window.Iconos.render('building-2')} Panel de Propietario</button>` : ''}
          <button class="btn-secundario" id="btnMasInfo" style="width:100%;justify-content:center;margin-top:var(--espaciado-sm)">${window.Iconos.render('info')} Más información</button>
          <button class="btn-secundario" id="btnLogout" style="color:var(--color-error);border-color:var(--color-error-soft);width:100%;justify-content:center;margin-top:var(--espaciado-sm)">Cerrar sesión</button>
          <div class="zona-peligro">
            <div class="zona-peligro__cabecera">
              ${window.Iconos.render('alert-triangle')}
              <h4>Zona de peligro</h4>
            </div>
            <p class="zona-peligro__descripcion">Esta acción elimina permanentemente tus exámenes realizados, progreso de lectura, versículos de memoria y logros. No se puede deshacer. Tu cuenta seguirá existiendo pero sin información.</p>
            <button class="btn-peligro" id="btnEliminarDatos">${window.Iconos.render('trash-2')} Eliminar todos mis datos</button>
          </div>
        </div>`;
      raiz.querySelector('#btnLogout').onclick = async () => {
        const ok = await window.helpers.confirmar('¿Estás seguro de cerrar sesión?', { titulo: 'Cerrar sesión', textoConfirmar: 'Cerrar sesión' });
        if (ok) authRepository.cerrarSesion();
      };
      raiz.querySelector('#btnMasInfo').onclick = () => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = '<div class="modal"><div class="o-pila"><h3>' + window.Iconos.render('info') + ' Acerca de FormsBiblicos</h3><p class="u-color-texto-secundario u-fs-sm">FormsBiblicos es una herramienta de estudio bíblico guiado. Lee, responde preguntas, memoriza versículos y sigue tu progreso a través de toda la Biblia.</p><p class="u-color-texto-secundario u-fs-sm">Versión: 1.0.0</p></div><button class="btn-primario u-mt-2" id="btnCerrarInfo" style="width:100%;justify-content:center">Cerrar</button></div>';
        document.body.appendChild(overlay);
        window.Iconos.actualizar();
        overlay.querySelector('#btnCerrarInfo').onclick = () => overlay.remove();
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      };
      raiz.querySelector('#btnEliminarDatos').onclick = async () => {
        const primero = await window.helpers.confirmar(
          'Se borrarán tus exámenes realizados, progreso de lectura, versículos de memoria y logros. Esta acción no se puede deshacer.',
          { titulo: '¿Eliminar TODOS tus datos?', textoConfirmar: 'Sí, eliminar' }
        );
        if (!primero) return;
        const segundo = await window.helpers.confirmar(
          'ÚLTIMA CONFIRMACIÓN: ¿Estás seguro de eliminar permanentemente todos tus datos?',
          { titulo: 'Confirmación final', textoConfirmar: 'Eliminar permanentemente' }
        );
        if (!segundo) return;
        try {
          await authRepository.eliminarMisDatos(usuario.id);
          window.helpers.mostrarAlerta('Todos tus datos han sido eliminados.', 'exito');
          router._ejecutar();
        } catch (e) { window.helpers.mostrarAlerta('Error al eliminar: ' + e.message, 'error'); }
      };
      const togglePref = async (clave, checked) => {
        const sb = window.supabaseClient;
        if (!sb || !usuario) return;
        const prefsActuales = { ...(usuario.preferencias || {}), [clave]: checked };
        usuario.preferencias = prefsActuales;
        store.actualizar('usuario', { ...usuario });
        localStorage.setItem('fb_usuario', JSON.stringify(usuario));
        if (window.preferencias) window.preferencias.guardar(prefsActuales);
        try { await sb.from('perfiles').update({ preferencias: JSON.stringify(prefsActuales) }).eq('id', usuario.id); } catch (e) { console.warn(e); }
      };
      raiz.querySelector('#chkContraste').addEventListener('change', function() { document.documentElement.classList.toggle('alto-contraste', this.checked); togglePref('alto_contraste', this.checked); });
      raiz.querySelector('#chkLetra').addEventListener('change', function() { document.documentElement.classList.toggle('letra-grande', this.checked); togglePref('letra_grande', this.checked); });
      raiz.querySelector('#chkTema').addEventListener('change', function() {
        const tema = this.checked ? 'claro' : 'oscuro';
        document.documentElement.dataset.tema = tema;
        togglePref('tema', tema);
      });
      if (prefs.alto_contraste) document.documentElement.classList.add('alto-contraste');
      if (prefs.letra_grande) document.documentElement.classList.add('letra-grande');
      const btnAdmin = raiz.querySelector('#btnAdmin');
      if (btnAdmin) btnAdmin.onclick = () => router.navegar('/admin');
      const btnOwner = raiz.querySelector('#btnOwner');
      if (btnOwner) btnOwner.onclick = () => router.navegar('/owner');
      raiz.querySelector('#btnEditarNombre').onclick = async () => {
        const datos = await window.helpers.formulario({
          titulo: 'Editar nombre',
          mensaje: 'Puedes cambiar tu nombre visible. El nombre de usuario (@${usuario.username}) no se puede cambiar.',
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
          const base64 = ev.target.result;
          try {
            await window.supabaseClient.from('perfiles').update({ foto_perfil: base64 }).eq('id', usuario.id);
            usuario.foto_perfil = base64;
            store.actualizar('usuario', { ...usuario });
            localStorage.setItem('fb_usuario', JSON.stringify(usuario));
            const avatar = raiz.querySelector('#avatarPerfil');
            if (avatar) avatar.innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
            window.helpers.mostrarAlerta('Foto de perfil actualizada.', 'exito');
          } catch (e) { window.helpers.mostrarAlerta('Error al guardar la foto: ' + e.message, 'error'); }
        };
        lector.readAsDataURL(file);
      };
      if (usuario.foto_perfil) {
        const avatar = raiz.querySelector('#avatarPerfil');
        if (avatar) avatar.innerHTML = `<img src="${usuario.foto_perfil}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      }
    }
  };
})();
