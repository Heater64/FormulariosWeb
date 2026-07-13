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
            <div style="width:80px;height:80px;border-radius:50%;background:var(--color-acento-soft);display:flex;align-items:center;justify-content:center;font-size:2.2rem;font-weight:700;color:var(--color-acento)">${usuario.nombre_completo.charAt(0).toUpperCase()}</div>
            <div><h3>${window.helpers.escapeHtml(usuario.nombre_completo)}</h3><span class="u-fs-sm u-color-texto-secundario">@${usuario.username} · ${usuario.rol}</span></div>
          </div>
          <div class="o-pila"><h4>Información</h4>
            <div class="tarjeta-capitulo"><span class="u-fs-sm u-color-texto-secundario">Email</span><p>${usuario.email || 'No registrado'}</p></div>
            <div class="tarjeta-capitulo"><span class="u-fs-sm u-color-texto-secundario">Miembro desde</span><p>${window.helpers.formatearFecha(usuario.creado_en) || '—'}</p></div>
          </div>
          <div class="o-pila"><h4>Preferencias</h4>
            <div class="tarjeta-capitulo"><div class="o-flecha o-flecha--between"><span>Alto contraste</span><label class="switch"><input type="checkbox" id="chkContraste" ${prefs.alto_contraste ? 'checked' : ''}><span class="slider"></span></label></div><p class="u-fs-xs u-color-texto-terciario u-mt-1">Aumenta el contraste con texto negro, bordes negros y colores vivos para facilitar la lectura.</p></div>
            <div class="tarjeta-capitulo"><div class="o-flecha o-flecha--between"><span>Letra grande</span><label class="switch"><input type="checkbox" id="chkLetra" ${prefs.letra_grande ? 'checked' : ''}><span class="slider"></span></label></div><p class="u-fs-xs u-color-texto-terciario u-mt-1">Aumenta el tamaño del texto en toda la aplicación.</p></div>
            <div class="tarjeta-capitulo"><div class="o-flecha o-flecha--between"><span>Tema claro</span><label class="switch"><input type="checkbox" id="chkTema" ${prefs.tema === 'claro' ? 'checked' : ''}><span class="slider"></span></label></div><p class="u-fs-xs u-color-texto-terciario u-mt-1">Fuerza la apariencia clara (blanco). Desactívalo para usar el tema oscuro. Es distinto de <strong>Alto contraste</strong>, que además pone bordes negros y colores vivos para facilitar la lectura.</p></div>
          </div>
          ${['admin', 'owner'].includes((usuario.rol || '').toString().trim().toLowerCase()) ? `<button class="btn-secundario" id="btnAdmin" style="width:100%;justify-content:center">${window.Iconos.render('settings')} Panel de Administración</button>` : ''}
          ${(usuario.rol || '').toString().trim().toLowerCase() === 'owner' ? `<button class="btn-secundario u-mt-1" id="btnOwner" style="width:100%;justify-content:center">${window.Iconos.render('building-2')} Panel de Propietario</button>` : ''}
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
      raiz.querySelector('#btnLogout').onclick = () => authRepository.cerrarSesion();
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
    }
  };
})();
