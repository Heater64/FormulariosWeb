(function() {
  'use strict';
  const I = (n) => window.Iconos.render(n);
  const E = (h) => window.helpers.escapeHtml(h);

  function fechaLarga(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return d.getDate() + ' de ' + meses[d.getMonth()] + ' de ' + d.getFullYear();
  }

  function _recortarSimple(file, cb) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const size = Math.min(img.width, img.height, 400);
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const sx = (img.width - size) / 2, sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
        cb(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => cb(base64);
    };
    reader.readAsDataURL(file);
  }

  function rolBonito(rol) {
    const map = { owner: 'Propietario', admin: 'Administrador', editor: 'Profesor', usuario: 'Alumno' };
    return map[rol] || rol;
  }

  // Fila de navegación dentro de una tarjeta (estilo Ajustes)
  function filaNav(icono, titulo, desc, href) {
    return `
      <a class="perfil-fila-nav" href="#!${href}">
        <span class="perfil-fila-nav__icono">${I(icono)}</span>
        <span class="perfil-fila-nav__texto">
          <span class="perfil-fila-nav__label">${E(titulo)}</span>
          ${desc ? `<span class="perfil-fila-nav__desc">${E(desc)}</span>` : ''}
        </span>
        <span class="perfil-fila-nav__flecha">${I('chevron-right')}</span>
      </a>`;
  }

  function subcabecera(titulo, sub) {
    return `
      <div class="perfil-subcabecera">
        <button class="btn-icono perfil-subcabecera__volver" data-volver aria-label="Volver al perfil">${I('arrow-left')}</button>
        <div class="perfil-subcabecera__texto">
          <h1 class="perfil-subcabecera__titulo">${E(titulo)}</h1>
          ${sub ? `<p class="perfil-subcabecera__sub">${E(sub)}</p>` : ''}
        </div>
      </div>`;
  }

  // Guarda una preferencia del usuario (store + localStorage + Supabase)
  async function guardarPref(usuario, clave, valor) {
    if (!usuario) return;
    const prefs = { ...(usuario.preferencias || {}), [clave]: valor };
    usuario.preferencias = prefs;
    store.actualizar('usuario', { ...usuario });
    localStorage.setItem('fb_usuario', JSON.stringify(usuario));
    if (window.preferencias && ['tema', 'alto_contraste', 'letra_grande'].includes(clave)) window.preferencias.guardar(prefs);
    if (window.supabaseClient) {
      try { await window.supabaseClient.from('perfiles').update({ preferencias: JSON.stringify(prefs) }).eq('id', usuario.id); } catch (e) {}
    }
  }

  const CONFIG_META = {
    apariencia:    { icono: 'palette', titulo: 'Apariencia',    desc: 'Modo, contraste y tamaño de texto' },
    notificaciones:{ icono: 'bell',    titulo: 'Notificaciones',desc: 'Avisos y sonidos de la app' },
    privacidad:    { icono: 'eye-off', titulo: 'Privacidad',    desc: 'Qué puede verse de tu perfil' },
    almacenamiento:{ icono: 'database',titulo: 'Almacenamiento',desc: 'Caché, datos temporales y sincronización' },
    seguridad:     { icono: 'lock',    titulo: 'Seguridad',     desc: 'Contraseña, sesión y zona de peligro' }
  };

  window.vistaPerfil = {
    montar(raiz, params = {}) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      const ruta = router._rutaActual();
      const seccion = params.seccion;

      if (ruta.startsWith('/perfil/config/')) {
        this._montarConfig(raiz, usuario, seccion);
      } else if (ruta.startsWith('/perfil/acerca/')) {
        this._montarAcerca(raiz, usuario, seccion);
      } else {
        this._montarPrincipal(raiz, usuario);
      }
    },

    // Hook del ciclo de vida (sin listeners globales que limpiar)
    desmontar() {},

    // ============================================================
    // PERFIL PRINCIPAL
    // ============================================================
    _montarPrincipal(raiz, usuario) {
      const rol = (usuario.rol || '').trim().toLowerCase();
      const esAdmin = rol === 'admin' || rol === 'owner';
      const prefs = usuario.preferencias || {};
      const descripcion = (prefs.descripcion || prefs.frase || '').trim();

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:0;padding-bottom:calc(100px + env(safe-area-inset-bottom))">

          <!-- HERO (se contrae al hacer scroll) -->
          <div class="perfil-hero" id="perfilHero">
            <div class="perfil-avatar perfil-avatar--lg perfil-avatar--hero" id="avatarPerfil" title="Cambiar foto de perfil">
              <span id="avatarLetra">${E(usuario.nombre_completo.charAt(0).toUpperCase())}</span>
              <input type="file" id="inputFotoPerfil" accept="image/*" aria-label="Subir foto de perfil">
            </div>
            <div class="perfil-hero__info">
              <div class="perfil-nombre-fila">
                <h2 id="nombrePerfil">${E(usuario.nombre_completo)}</h2>
              </div>
              <span class="perfil-username">@${E(usuario.username)}</span>
              <span class="perfil-rol-badge perfil-rol-badge--${rol}">${rolBonito(usuario.rol)}</span>
              <div class="perfil-hero__acciones">
                <button class="perfil-hero__btn" id="btnEditarPerfil" aria-label="Editar perfil">${I('user')} <span class="perfil-hero__btn-texto">Editar perfil</span></button>
              </div>
            </div>
          </div>

          <div class="o-pila o-pila--md">

            <!-- CUENTA -->
            <section class="perfil-seccion">
              <div class="perfil-seccion__cabecera">
                <div class="perfil-seccion__icono">${I('user')}</div>
                <div>
                  <h4 class="perfil-seccion__titulo">Cuenta</h4>
                  <p class="perfil-seccion__desc">Información básica de tu cuenta</p>
                </div>
              </div>
              <div class="perfil-fila"><span class="perfil-fila__label">Usuario</span><span class="perfil-fila__valor">@${E(usuario.username)}</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Rol</span><span class="perfil-fila__valor">${rolBonito(usuario.rol)}</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Miembro desde</span><span class="perfil-fila__valor">${fechaLarga(usuario.creado_en)}</span></div>
              <div class="perfil-fila">
                <span class="perfil-fila__label">Descripción</span>
                <span class="perfil-fila__valor" style="font-weight:400;white-space:normal;max-width:70%">${descripcion ? E(descripcion) : 'Sin descripción.'}</span>
              </div>
            </section>

            <!-- CONFIGURACIÓN -->
            <section class="perfil-seccion">
              <div class="perfil-seccion__cabecera">
                <div class="perfil-seccion__icono">${I('settings')}</div>
                <div>
                  <h4 class="perfil-seccion__titulo">Configuración</h4>
                  <p class="perfil-seccion__desc">Personaliza tu experiencia</p>
                </div>
              </div>
              <div class="o-pila" style="gap:var(--espaciado-xxs)">
                ${filaNav('palette', 'Apariencia', 'Modo claro, oscuro o automático', '/perfil/config/apariencia')}
                ${filaNav('bell', 'Notificaciones', 'Avisos y sonidos de la app', '/perfil/config/notificaciones')}
                ${filaNav('eye-off', 'Privacidad', 'Qué puede verse de tu perfil', '/perfil/config/privacidad')}
                ${filaNav('database', 'Almacenamiento', 'Caché, datos temporales y sincronización', '/perfil/config/almacenamiento')}
                ${filaNav('lock', 'Seguridad', 'Contraseña, sesión y zona de peligro', '/perfil/config/seguridad')}
              </div>
            </section>

            <!-- GRUPOS (resumen compacto) -->
            <section class="perfil-seccion">
              <div class="perfil-seccion__cabecera">
                <div class="perfil-seccion__icono">${I('users')}</div>
                <div>
                  <h4 class="perfil-seccion__titulo">Grupos</h4>
                  <p class="perfil-seccion__desc" id="perfilGruposResumen">Cargando...</p>
                </div>
              </div>
              <a class="btn-secundario perfil-btn-full" href="#!/grupos">${I('layout')} Ver todos</a>
            </section>

            <!-- SUGERENCIAS -->
            <section class="perfil-seccion">
              <div class="perfil-seccion__cabecera">
                <div class="perfil-seccion__icono" style="background:var(--color-info-soft);color:var(--color-info)">${I('message-square')}</div>
                <div>
                  <h4 class="perfil-seccion__titulo">Sugerencias</h4>
                  <p class="perfil-seccion__desc">Reporta errores, comparte ideas o propón mejoras</p>
                </div>
              </div>
              <p class="u-fs-xs u-color-texto-terciario" style="margin-bottom:var(--espaciado-sm);line-height:1.5">
                ¿Encontraste un error o tienes una idea? Escríbela aquí. El equipo la revisará y podrás seguir su estado.
              </p>
              <div class="sug-form">
                <select id="sugCategoria" aria-label="Categoría de la sugerencia" style="width:100%">
                  ${window.sugerenciasRepository ? window.sugerenciasRepository.CATEGORIAS.map(c => `<option value="${c.valor}">${c.texto}</option>`).join('') : ''}
                </select>
                <textarea id="sugTexto" rows="3" maxlength="1000" placeholder="Ej: En la sección de exámenes, al publicar uno con varias preguntas..." aria-label="Texto de la sugerencia"></textarea>
                <div class="o-flecha" style="gap:var(--espaciado-xs);align-items:center">
                  <span class="u-fs-xxs u-color-texto-terciario" id="sugContador">0/1000</span>
                  <button class="btn-primario" id="btnEnviarSugerencia" style="margin-left:auto">${I('send')} Enviar</button>
                </div>
              </div>
              <div class="o-pila" id="listaMisSugerencias" style="gap:var(--espaciado-xs);margin-top:var(--espaciado-sm)"></div>
            </section>

            <!-- PANELES ESPECIALES (acceso rápido unificado) -->
            ${esAdmin ? `
            <a class="perfil-boton-seccion" id="btnAdmin" href="#!/admin">
              <div class="perfil-boton-seccion__icono">${I('settings')}</div>
              <div class="perfil-boton-seccion__texto">
                <p class="perfil-boton-seccion__label">Centro de Administración</p>
                <p class="perfil-boton-seccion__desc">Gestionar usuarios, grupos, exámenes y configuración</p>
              </div>
              <span class="perfil-boton-seccion__flecha">${I('chevron-right')}</span>
            </a>` : ''}

            <!-- INFORMACIÓN (compacta) -->
            <section class="perfil-seccion">
              <div class="perfil-info-card">
                <div class="perfil-info-card__texto">
                  <p class="perfil-info-card__nombre">FormsBiblicos</p>
                  <p class="perfil-info-card__version">Versión 1.0.1</p>
                </div>
                <button class="btn-secundario u-fs-xs" id="btnMasInfo">Más información</button>
              </div>
              <div class="o-pila" style="gap:var(--espaciado-xxs);margin-top:var(--espaciado-xs)">
                ${filaNav('file-text', 'Términos de uso', 'Condiciones del servicio', '/perfil/acerca/terminos')}
                ${filaNav('shield', 'Política de privacidad', 'Cómo tratamos tus datos', '/perfil/acerca/privacidad')}
                ${filaNav('copyright', 'Licencias', 'Tecnologías y atribuciones', '/perfil/acerca/licencias')}
              </div>
            </section>
          </div>
        </div>`;

      if (window.Iconos) window.Iconos.actualizar();

      // Avatar con foto
      if (usuario.foto_perfil) {
        const avatar = raiz.querySelector('#avatarPerfil');
        if (avatar) avatar.innerHTML = `<img src="${usuario.foto_perfil}" alt="Foto de perfil"><input type="file" id="inputFotoPerfil" accept="image/*" aria-label="Subir foto de perfil" style="position:absolute;inset:0;opacity:0;cursor:pointer">`;
      }

      // (El hero ya no se contrae al hacer scroll: la foto de perfil se
      // mantiene siempre grande. Se eliminó el listener de scroll y la
      // clase .perfil-hero--compacto.)

      // Editar perfil (foto + nombre + descripción; username fijo)
      const editarPerfil = async () => {
        const datos = await window.helpers.formulario({
          titulo: 'Editar perfil',
          mensaje: 'Puedes modificar tu nombre y tu descripción. El usuario @' + usuario.username + ' no se puede cambiar.',
          campos: [
            { nombre: 'nombre_completo', etiqueta: 'Nombre', valor: usuario.nombre_completo || '', requerido: true },
            { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', filas: 2, valor: (usuario.preferencias && (usuario.preferencias.descripcion || usuario.preferencias.frase)) || '', placeholder: 'Ej: Amante del estudio bíblico' }
          ],
          textoConfirmar: 'Guardar'
        });
        if (!datos) return;
        try {
          await window.supabaseClient.from('perfiles').update({ nombre_completo: datos.nombre_completo.trim() }).eq('id', usuario.id);
          const prefs = { ...(usuario.preferencias || {}), descripcion: datos.descripcion.trim() };
          delete prefs.frase;
          usuario.nombre_completo = datos.nombre_completo.trim();
          usuario.preferencias = prefs;
          store.actualizar('usuario', { ...usuario });
          localStorage.setItem('fb_usuario', JSON.stringify(usuario));
          try { await window.supabaseClient.from('perfiles').update({ preferencias: JSON.stringify(prefs) }).eq('id', usuario.id); } catch (e) {}
          window.helpers.mostrarAlerta('Perfil actualizado.', 'exito');
          router.navegar('/perfil');
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      };
      raiz.querySelector('#btnEditarPerfil').onclick = editarPerfil;

      // Más información
      raiz.querySelector('#btnMasInfo').onclick = () => router.navegar('/perfil/acerca/que-es');

      // Foto de perfil — sube a Supabase Storage y guarda la URL pública
      const alElegir = async (base64) => {
        window.helpers.mostrarAlerta('Subiendo foto...', 'info', 2000);
        try {
          // Convertir base64 a Blob
          const resp = await fetch(base64);
          const blob = await resp.blob();
          const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
          const nombre = `${usuario.id}.${ext}`;

          // Subir a Supabase Storage
          const { error: uploadErr } = await window.supabaseClient.storage
            .from('avatars')
            .upload(nombre, blob, { upsert: true, contentType: blob.type });

          if (uploadErr) throw uploadErr;

          // Obtener URL pública
          const { data: { publicUrl } } = window.supabaseClient.storage
            .from('avatars')
            .getPublicUrl(nombre);

          // Guardar URL pública en el perfil
          usuario.foto_perfil = publicUrl;
          store.actualizar('usuario', { ...usuario });
          localStorage.setItem('fb_usuario', JSON.stringify(usuario));

          // Actualizar UI
          const avatar = raiz.querySelector('#avatarPerfil');
          if (avatar) avatar.innerHTML = `<img src="${publicUrl}" alt="Foto de perfil"><input type="file" id="inputFotoPerfil" accept="image/*" aria-label="Subir foto de perfil" style="position:absolute;inset:0;opacity:0;cursor:pointer">`;
          const nuevoInput = raiz.querySelector('#inputFotoPerfil');
          if (nuevoInput) nuevoInput.onchange = onFotoChange;

          // Guardar URL en la base de datos
          await window.supabaseClient.from('perfiles').update({ foto_perfil: publicUrl }).eq('id', usuario.id);

          window.helpers.mostrarAlerta('Foto de perfil actualizada.', 'exito');
        } catch (err) {
          console.error('Error al subir foto:', err);
          window.helpers.mostrarAlerta('No se pudo subir la foto. Intenta de nuevo.', 'error');
        }
      };
      function onFotoChange(e) {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        if (window.editorImagen) window.editorImagen.abrir(file, { onConfirm: alElegir });
        else _recortarSimple(file, alElegir);
      }
      raiz.querySelector('#inputFotoPerfil').onchange = onFotoChange;

      // Resumen de grupos: combina la clase (grupo_id), las membresías de
      // miembros_grupo y los grupos donde el usuario es administrador.
      const cargarGrupos = async () => {
        const resumen = raiz.querySelector('#perfilGruposResumen');
        if (!resumen || !window.gruposRepository) return;
        const [clase, membresias, administrados] = await Promise.all([
          window.gruposRepository.obtenerMiClase(usuario),
          window.gruposRepository.misMembresias(usuario.id),
          window.gruposRepository.gruposAdminDe(usuario.id)
        ]);
        const ids = new Set();
        if (clase && clase.grupo) ids.add(clase.grupo.id);
        (membresias || []).forEach(g => { if (g && g.id) ids.add(g.id); });
        (administrados || []).forEach(g => { if (g && g.id) ids.add(g.id); });
        const n = ids.size;
        resumen.textContent = n
          ? (n + ' grupo' + (n !== 1 ? 's' : ''))
          : 'No perteneces a ningún grupo todavía';
      };
      cargarGrupos();

      // Sugerencias
      this._bindSugerencias(raiz, usuario);

      raiz.querySelector('#btnAdmin')?.addEventListener('click', (e) => { e.preventDefault(); router.navegar('/admin'); });
    },

    // ============================================================
    // FORMULARIO DE SUGERENCIAS (compartido)
    // ============================================================
    _bindSugerencias(raiz, usuario) {
      const sugerenciasRepo = window.sugerenciasRepository;
      const contador = raiz.querySelector('#sugContador');
      const txtSug = raiz.querySelector('#sugTexto');
      const listaSug = raiz.querySelector('#listaMisSugerencias');

      const renderMisSugerencias = async () => {
        if (!listaSug || !sugerenciasRepo) return;
        listaSug.innerHTML = '<p class="u-fs-xs u-color-texto-terciario">Cargando...</p>';
        let lista = [];
        try { lista = await sugerenciasRepo.listarMias(usuario.id); } catch (e) { lista = []; }
        if (!lista.length) {
          listaSug.innerHTML = '<p class="u-fs-xs u-color-texto-terciario">Aún no has enviado sugerencias.</p>';
          return;
        }
        listaSug.innerHTML = lista.slice(0, 8).map(s => {
          const est = sugerenciasRepo.estadoInfo(s.estado);
          const cat = sugerenciasRepo.CATEGORIAS.find(c => c.valor === s.categoria) || sugerenciasRepo.CATEGORIAS[sugerenciasRepo.CATEGORIAS.length - 1];
          return `
            <div class="sug-item">
              <div class="sug-item__cabecera">
                <span class="sug-item__categoria">${cat ? cat.texto : '📝'}</span>
                <span class="sug-estado ${est.clase}">${est.texto}</span>
              </div>
              <p class="sug-item__texto">${E(s.texto)}</p>
              ${s.respuesta ? `<p class="sug-item__respuesta"><strong>Respuesta:</strong> ${E(s.respuesta)}</p>` : ''}
              <span class="sug-item__fecha">${window.helpers.formatearFecha(s.creado_en)}</span>
            </div>`;
        }).join('');
      };

      if (txtSug && contador) {
        txtSug.addEventListener('input', () => { contador.textContent = txtSug.value.length + '/1000'; });
      }
      const btnSug = raiz.querySelector('#btnEnviarSugerencia');
      if (btnSug && sugerenciasRepo) {
        btnSug.onclick = async () => {
          const texto = txtSug ? txtSug.value.trim() : '';
          if (!texto) { window.helpers.mostrarAlerta('Escribe tu sugerencia antes de enviar.', 'advertencia'); return; }
          const categoria = raiz.querySelector('#sugCategoria')?.value || 'otro';
          btnSug.disabled = true;
          try {
            await sugerenciasRepo.crear(usuario.id, categoria, texto);
            window.helpers.mostrarAlerta('Sugerencia enviada. ¡Gracias por tu aporte!', 'exito');
            if (txtSug) txtSug.value = '';
            if (contador) contador.textContent = '0/1000';
            await renderMisSugerencias();
          } catch (e) {
            window.helpers.mostrarAlerta(e.message || 'No se pudo enviar.', 'error');
          } finally {
            btnSug.disabled = false;
          }
        };
      }
      renderMisSugerencias();
    },

    // ============================================================
    // SUB-PESTAÑAS DE CONFIGURACIÓN
    // ============================================================
    _montarConfig(raiz, usuario, seccion) {
      const meta = CONFIG_META[seccion] || CONFIG_META.apariencia;
      const prefs = usuario.preferencias || {};

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-md);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          ${subcabecera(meta.titulo, meta.desc)}
          <div id="configContenido" class="o-pila" style="gap:var(--espaciado-md)">
            <div class="skel" style="height:160px;border-radius:var(--card-radius)"></div>
          </div>
        </div>`;
      raiz.querySelector('[data-volver]').onclick = () => router.navegar('/perfil');

      const cont = raiz.querySelector('#configContenido');
      if (seccion === 'apariencia') this._configApariencia(cont, usuario, prefs);
      else if (seccion === 'notificaciones') this._configNotificaciones(cont, usuario, prefs);
      else if (seccion === 'privacidad') this._configPrivacidad(cont, usuario, prefs);
      else if (seccion === 'almacenamiento') this._configAlmacenamiento(cont, usuario);
      else if (seccion === 'seguridad') this._configSeguridad(cont, usuario);
      if (window.Iconos) window.Iconos.actualizar();
    },

    _configApariencia(cont, usuario, prefs) {
      cont.innerHTML = `
        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono">${I('palette')}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Modo</h4>
              <p class="perfil-seccion__desc">Elige el aspecto visual de la app</p>
            </div>
          </div>
          <div class="perfil-segmented" role="radiogroup" aria-label="Seleccionar modo">
            <button class="perfil-segmented__btn ${prefs.tema === 'light' ? 'perfil-segmented__btn--activo' : ''}" data-tema="light" role="radio" aria-checked="${prefs.tema === 'light'}">${I('sun')} Claro</button>
            <button class="perfil-segmented__btn ${!prefs.tema ? 'perfil-segmented__btn--activo' : ''}" data-tema="auto" role="radio" aria-checked="${!prefs.tema}">${I('settings')} Automático</button>
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
          <button class="btn-secundario u-mt-2 perfil-btn-full" id="btnResetPrefs">Restablecer preferencias</button>
        </div>`;

      cont.querySelector('#chkContraste').addEventListener('change', function() {
        document.documentElement.dataset.hc = this.checked ? 'true' : 'false';
        guardarPref(usuario, 'alto_contraste', this.checked);
      });
      const chkLetra = cont.querySelector('#chkLetra');
      if (chkLetra) chkLetra.addEventListener('change', function() {
        document.documentElement.dataset.lg = this.checked ? 'true' : 'false';
        guardarPref(usuario, 'letra_grande', this.checked);
      });

      cont.querySelectorAll('.perfil-segmented__btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tema = btn.dataset.tema;
          const temaValor = tema === 'auto' ? null : tema;
          cont.querySelectorAll('.perfil-segmented__btn').forEach(b => {
            b.classList.remove('perfil-segmented__btn--activo');
            b.setAttribute('aria-checked', 'false');
          });
          btn.classList.add('perfil-segmented__btn--activo');
          btn.setAttribute('aria-checked', 'true');
          if (tema === 'auto') delete document.documentElement.dataset.theme;
          else document.documentElement.dataset.theme = tema;
          guardarPref(usuario, 'tema', temaValor);
        });
      });

      cont.querySelector('#btnResetPrefs').onclick = async () => {
        const ok = await window.helpers.confirmar('Se restaurarán las preferencias a sus valores por defecto.', { titulo: '¿Restablecer preferencias?', textoConfirmar: 'Restablecer' });
        if (!ok) return;
        delete document.documentElement.dataset.theme;
        document.documentElement.dataset.hc = 'false';
        document.documentElement.dataset.lg = 'false';
        if (window.preferencias) window.preferencias.guardar({ tema: null, alto_contraste: false, letra_grande: false });
        const prefsDefault = { ...(usuario.preferencias || {}) };
        prefsDefault.tema = null; prefsDefault.alto_contraste = false; prefsDefault.letra_grande = false;
        usuario.preferencias = prefsDefault;
        store.actualizar('usuario', { ...usuario });
        localStorage.setItem('fb_usuario', JSON.stringify(usuario));
        try { await window.supabaseClient.from('perfiles').update({ preferencias: JSON.stringify(prefsDefault) }).eq('id', usuario.id); } catch (e) {}
        window.helpers.mostrarAlerta('Preferencias restablecidas.', 'exito');
        router.navegar('/perfil/config/apariencia');
      };
    },

    _configNotificaciones(cont, usuario, prefs) {
      const permiso = ('Notification' in window) ? Notification.permission : 'unsupported';
      const permisoTexto = {
        granted: 'Permitidas por el navegador',
        denied: 'Bloqueadas en el navegador',
        default: 'Aún no has decidido',
        unsupported: 'No soportadas en este dispositivo'
      };
      // Claves antiguas que también desactivan el aviso (para reflejar el estado real)
      const LEGACY_NOTIF = { notif_recordatorios: 'notif_repasos', notif_desafios: 'notif_logros' };
      const filaToggle = (clave, icono, titulo, desc) => {
        const legacy = LEGACY_NOTIF[clave];
        const activo = prefs[clave] !== false && !(legacy && prefs[legacy] === false);
        return `
        <div class="perfil-opcion">
          <div class="perfil-opcion__info">
            <p class="perfil-opcion__label">${I(icono)} ${E(titulo)}</p>
            <p class="perfil-opcion__desc">${E(desc)}</p>
          </div>
          <label class="switch"><input type="checkbox" data-notif="${clave}" ${activo ? 'checked' : ''}><span class="slider"></span></label>
        </div>`;
      };

      cont.innerHTML = `
        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono">${I('bell')}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Permiso del navegador</h4>
              <p class="perfil-seccion__desc">${E(permisoTexto[permiso] || permisoTexto.unsupported)}</p>
            </div>
          </div>
          ${permiso === 'default' ? `<button class="btn-primario perfil-btn-full" id="btnPedirPermiso">${I('bell-plus')} Activar notificaciones</button>` : ''}
          ${permiso === 'denied' ? `<p class="u-fs-xs u-color-texto-terciario" style="line-height:1.5">Para activarlas, permite las notificaciones de FormsBiblicos en los ajustes de tu navegador.</p>` : ''}
        </div>

        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono">${I('settings')}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Avisos</h4>
              <p class="perfil-seccion__desc">Elige qué notificaciones recibir</p>
            </div>
          </div>
          ${filaToggle('notif_desafios', 'trophy', 'Notificaciones de desafíos', 'Logros y desafíos de estudio')}
          ${filaToggle('notif_examenes', 'clipboard-check', 'Nuevos exámenes', 'Cuando un profesor publica un examen')}
          ${filaToggle('notif_invitaciones', 'user-plus', 'Invitaciones a grupos', 'Cuando te invitan a un grupo')}
          ${filaToggle('notif_recordatorios', 'brain', 'Recordatorios de estudio', 'Versículos pendientes de repaso')}
          ${filaToggle('notif_sonidos', 'volume-2', 'Sonidos', 'Sonido y vibración al recibir avisos')}
        </div>`;

      if (window.Iconos) window.Iconos.actualizar();

      cont.querySelectorAll('[data-notif]').forEach(inp => {
        inp.addEventListener('change', () => {
          // Al reactivar, limpiar la clave legacy desactivada para que el runtime no la siga suprimiendo
          if (inp.checked && LEGACY_NOTIF[inp.dataset.notif] && usuario.preferencias) {
            const prefs = { ...usuario.preferencias };
            delete prefs[LEGACY_NOTIF[inp.dataset.notif]];
            usuario.preferencias = prefs;
          }
          guardarPref(usuario, inp.dataset.notif, inp.checked);
        });
      });

      const btnPermiso = cont.querySelector('#btnPedirPermiso');
      if (btnPermiso) btnPermiso.onclick = async () => {
        try {
          const res = await Notification.requestPermission();
          window.helpers.mostrarAlerta(res === 'granted' ? 'Notificaciones activadas.' : 'No se concedió el permiso.', res === 'granted' ? 'exito' : 'advertencia');
          if (window.notifications) window.notifications.setPermiso(res);
          // Re-render para reflejar el nuevo estado del permiso
          window.vistaPerfil._configNotificaciones(cont, usuario, { ...(usuario.preferencias || {}) });
        } catch (e) { window.helpers.mostrarAlerta('No se pudo solicitar el permiso.', 'error'); }
      };
    },

    _configPrivacidad(cont, usuario, prefs) {
      const visibilidad = prefs.priv_visibilidad || 'todos';
      const filaToggle = (clave, icono, titulo, desc) => `
        <div class="perfil-opcion">
          <div class="perfil-opcion__info">
            <p class="perfil-opcion__label">${I(icono)} ${E(titulo)}</p>
            <p class="perfil-opcion__desc">${E(desc)}</p>
          </div>
          <label class="switch"><input type="checkbox" data-priv="${clave}" ${prefs[clave] !== false ? 'checked' : ''}><span class="slider"></span></label>
        </div>`;

      cont.innerHTML = `
        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono">${I('eye-off')}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Visibilidad del perfil</h4>
              <p class="perfil-seccion__desc">Qué pueden ver otros usuarios</p>
            </div>
          </div>
          ${filaToggle('priv_mostrar_foto', 'camera', 'Mostrar foto', 'Permite que otros vean tu foto de perfil')}
          ${filaToggle('priv_mostrar_descripcion', 'align-left', 'Mostrar descripción', 'Permite que otros vean tu descripción')}
          ${filaToggle('priv_recibir_desafios', 'trophy', 'Recibir desafíos', 'Acepta desafíos enviados por otros usuarios')}
          ${filaToggle('priv_aparecer_busquedas', 'search', 'Aparecer en búsquedas', 'Permite que otros usuarios te encuentren')}
        </div>

        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono">${I('globe')}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Perfil visible para</h4>
              <p class="perfil-seccion__desc">Quién puede consultar tu perfil</p>
            </div>
          </div>
          <div class="perfil-segmented perfil-segmented--3" role="radiogroup" aria-label="Visibilidad del perfil">
            <button class="perfil-segmented__btn ${visibilidad === 'todos' ? 'perfil-segmented__btn--activo' : ''}" data-vis="todos" role="radio" aria-checked="${visibilidad === 'todos'}">Todos</button>
            <button class="perfil-segmented__btn ${visibilidad === 'registrados' ? 'perfil-segmented__btn--activo' : ''}" data-vis="registrados" role="radio" aria-checked="${visibilidad === 'registrados'}">Registrados</button>
            <button class="perfil-segmented__btn ${visibilidad === 'grupos' ? 'perfil-segmented__btn--activo' : ''}" data-vis="grupos" role="radio" aria-checked="${visibilidad === 'grupos'}">Mis grupos</button>
          </div>
        </div>`;

      if (window.Iconos) window.Iconos.actualizar();
      cont.querySelectorAll('[data-priv]').forEach(inp => {
        inp.addEventListener('change', () => guardarPref(usuario, inp.dataset.priv, inp.checked));
      });
      cont.querySelectorAll('[data-vis]').forEach(btn => {
        btn.addEventListener('click', () => {
          cont.querySelectorAll('[data-vis]').forEach(b => {
            b.classList.remove('perfil-segmented__btn--activo');
            b.setAttribute('aria-checked', 'false');
          });
          btn.classList.add('perfil-segmented__btn--activo');
          btn.setAttribute('aria-checked', 'true');
          guardarPref(usuario, 'priv_visibilidad', btn.dataset.vis);
        });
      });
    },

    _configAlmacenamiento(cont, usuario) {
      cont.innerHTML = `
        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono" style="background:var(--color-aviso-soft);color:var(--color-aviso)">${I('database')}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Almacenamiento</h4>
              <p class="perfil-seccion__desc">Gestión de caché y datos temporales</p>
            </div>
          </div>
          <p class="u-fs-xs u-color-texto-terciario" style="margin-bottom:var(--espaciado-sm);line-height:1.5">
            Elimina los datos guardados localmente (caché de Supabase, imágenes en memoria, etc.). La app se recargará y volverá a descargar todo desde el servidor. <strong>Tu progreso y cuenta no se perderán.</strong>
          </p>
          <div class="perfil-info-card">
            <div class="perfil-info-card__texto">
              <p class="perfil-info-card__nombre">Última sincronización</p>
              <p class="perfil-info-card__sync" id="perfilUltimaSync"></p>
            </div>
          </div>
          <button class="btn-secundario perfil-btn-full u-mt-2" id="btnLimpiarCache">${I('trash-2')} Limpiar caché</button>
        </div>`;

      const elSync = cont.querySelector('#perfilUltimaSync');
      if (elSync && window.syncStatus) {
        const ts = window.syncStatus.getUltima();
        elSync.textContent = ts ? window.syncStatus.fmtHace(ts) : 'Sin sincronizar aún';
      }

      cont.querySelector('#btnLimpiarCache').onclick = async () => {
        const ok = await window.helpers.confirmar(
          'Esto eliminará la caché local (datos de Supabase, imágenes temporales, etc.). La app se recargará automáticamente. Tu cuenta y progreso en línea NO se perderán.',
          { titulo: '¿Limpiar caché de la app?', textoConfirmar: 'Limpiar y recargar' }
        );
        if (!ok) return;
        window.helpers.mostrarAlerta('Limpiando caché...', 'info', 1500);
        try { await window.cacheDatos.limpiarTodo(); } catch (e) {}
        setTimeout(() => window.location.reload(), 1200);
      };
    },

    _configSeguridad(cont, usuario) {
      cont.innerHTML = `
        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono">${I('lock')}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Contraseña</h4>
              <p class="perfil-seccion__desc">Actualiza tu contraseña de acceso</p>
            </div>
          </div>
          <button class="perfil-btn-full btn-secundario" id="btnCambiarPassword">${I('key')} Cambiar contraseña</button>
        </div>

        <div class="perfil-seccion">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono">${I('log-out')}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Sesión</h4>
              <p class="perfil-seccion__desc">Cierra la sesión en este dispositivo</p>
            </div>
          </div>
          <button class="perfil-btn-cerrar" id="btnLogout">${I('log-out')} Cerrar sesión</button>
        </div>

        <div class="perfil-seccion perfil-seccion--peligro">
          <div class="perfil-seccion__cabecera">
            <div class="perfil-seccion__icono" style="background:var(--color-error-soft);color:var(--color-error)">${I('alert-triangle')}</div>
            <div>
              <h4 class="perfil-seccion__titulo">Zona de peligro</h4>
              <p class="perfil-seccion__desc">Acciones irreversibles</p>
            </div>
          </div>
          <p class="u-fs-xs u-color-texto-terciario" style="margin-bottom:var(--espaciado-sm);line-height:1.5">
            <strong>Eliminar todos mis datos</strong> borrará permanentemente tu progreso de lectura, tarjetas de memorización, historial de repasos, logros e intentos de exámenes. Tu cuenta seguirá existiendo.
          </p>
          <button class="btn-peligro" id="btnEliminarDatos">${I('trash-2')} Eliminar todos mis datos</button>
        </div>`;

      // Cambiar contraseña
      cont.querySelector('#btnCambiarPassword').onclick = async () => {
        const datos = await window.helpers.formulario({
          titulo: 'Cambiar contraseña',
          mensaje: 'Verificaremos tu contraseña actual antes de cambiarla.',
          campos: [
            { nombre: 'actual', etiqueta: 'Contraseña actual', tipo: 'password', requerido: true },
            { nombre: 'nueva', etiqueta: 'Contraseña nueva', tipo: 'password', requerido: true, placeholder: 'Mínimo 6 caracteres' },
            { nombre: 'confirmar', etiqueta: 'Confirmar contraseña nueva', tipo: 'password', requerido: true }
          ],
          textoConfirmar: 'Cambiar contraseña'
        });
        if (!datos) return;
        if (datos.nueva.length < 6) { window.helpers.mostrarAlerta('La contraseña nueva debe tener al menos 6 caracteres.', 'advertencia'); return; }
        if (datos.nueva !== datos.confirmar) { window.helpers.mostrarAlerta('Las contraseñas no coinciden.', 'advertencia'); return; }
        try {
          const hashActual = await window.helpers.hashPassword(datos.actual);
          if (usuario.password !== hashActual && usuario.password !== datos.actual) {
            window.helpers.mostrarAlerta('La contraseña actual no es correcta.', 'error');
            return;
          }
          const hashNueva = await window.helpers.hashPassword(datos.nueva);
          await window.supabaseClient.from('perfiles').update({ password: hashNueva }).eq('id', usuario.id);
          usuario.password = hashNueva;
          store.actualizar('usuario', { ...usuario });
          localStorage.setItem('fb_usuario', JSON.stringify(usuario));
          try { await window.adminRepository.registrarAuditoria('config:password', 'Contraseña cambiada', usuario.id, usuario.grupo_id); } catch (e) {}
          window.helpers.mostrarAlerta('Contraseña actualizada.', 'exito');
        } catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
      };

      cont.querySelector('#btnLogout').onclick = async () => {
        const ok = await window.helpers.confirmar('¿Estás seguro de cerrar sesión?', { titulo: 'Cerrar sesión', textoConfirmar: 'Cerrar sesión' });
        if (ok) authRepository.cerrarSesion();
      };

      cont.querySelector('#btnEliminarDatos').onclick = async () => {
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
    },

    // ============================================================
    // PÁGINAS ACERCA DE
    // ============================================================
    _montarAcerca(raiz, usuario, seccion) {
      const contenido = {
        'que-es': `
          <div class="perfil-seccion">
            <div class="perfil-info-card">
              <div class="perfil-info-card__texto">
                <p class="perfil-info-card__nombre">FormsBiblicos</p>
                <p class="perfil-info-card__version">Versión 1.0.1</p>
                <p class="perfil-info-card__sync">Estudio bíblico guiado</p>
              </div>
            </div>
            <p class="u-fs-sm u-color-texto-secundario" style="line-height:1.7;margin-top:var(--espaciado-sm)">
              <strong>FormsBiblicos</strong> es una plataforma de estudio bíblico guiado. Lee capítulos, responde preguntas, memoriza versículos y sigue tu progreso a través de toda la Biblia. Profesores y administradores pueden crear exámenes, gestionar grupos y seguir el avance de sus alumnos.
            </p>
            <div class="o-pila" style="gap:var(--espaciado-xxs);margin-top:var(--espaciado-sm)">
              <div class="perfil-fila"><span class="perfil-fila__label">Objetivo</span><span class="perfil-fila__valor" style="font-weight:400;max-width:70%">Estudio bíblico sistemático</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Versión</span><span class="perfil-fila__valor">1.0.1</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Plataforma</span><span class="perfil-fila__valor">PWA</span></div>
              <div class="perfil-fila"><span class="perfil-fila__label">Tecnologías</span><span class="perfil-fila__valor" style="font-weight:400;max-width:70%">HTML, CSS, JS, Supabase</span></div>
            </div>
          </div>`,
        terminos: `
          <div class="perfil-seccion">
            <h4 class="perfil-seccion__titulo" style="margin-bottom:var(--espaciado-sm)">Términos de uso</h4>
            <div class="perfil-texto-legal">
              <h5>1. Uso de la plataforma</h5>
              <p>FormsBiblicos es una herramienta educativa de estudio bíblico. Al usarla aceptas hacerlo con fines personales y educativos, sin interferir en el funcionamiento del servicio ni acceder a datos de otros usuarios sin autorización.</p>
              <h5>2. Cuentas</h5>
              <p>Las cuentas son creadas por un administrador de tu grupo. Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad realizada con tu cuenta.</p>
              <h5>3. Contenido</h5>
              <p>Los textos bíblicos, preguntas y materiales del servicio están destinados al estudio. El contenido que tú o tu grupo generen (exámenes, notas, sugerencias) pertenece a vuestro grupo y se gestiona según los permisos de cada rol.</p>
              <h5>4. Disponibilidad</h5>
              <p>El servicio se ofrece "tal cual". Puede sufrir interrupciones por mantenimiento o causas ajenas a nuestro control, y podemos modificar o retirar funciones cuando sea necesario.</p>
            </div>
          </div>`,
        privacidad: `
          <div class="perfil-seccion">
            <h4 class="perfil-seccion__titulo" style="margin-bottom:var(--espaciado-sm)">Política de privacidad</h4>
            <div class="perfil-texto-legal">
              <h5>1. Datos que tratamos</h5>
              <p>Nombre, username, correo electrónico (si lo facilita tu administrador), rol, grupo, foto de perfil y el progreso de estudio (lecturas, tarjetas, repasos, exámenes, logros).</p>
              <h5>2. Finalidad</h5>
              <p>Tus datos se usan exclusivamente para darte acceso a la plataforma, gestionar tu grupo y mostrar tu progreso. No se venden ni se comparten con terceros con fines publicitarios.</p>
              <h5>3. Almacenamiento</h5>
              <p>Los datos se guardan de forma segura en nuestro proveedor de base de datos (Supabase). Las fotos de perfil se almacenan localmente en tu dispositivo.</p>
              <h5>4. Tus derechos</h5>
              <p>Puedes eliminar todos tus datos de estudio desde Configuración → Seguridad → Zona de peligro. Para eliminar la cuenta, contacta con el administrador o propietario de tu grupo.</p>
              <h5>5. Cambios</h5>
              <p>Esta política puede actualizarse. Los cambios se publicarán en esta misma página.</p>
            </div>
          </div>`,
        licencias: `
          <div class="perfil-seccion">
            <h4 class="perfil-seccion__titulo" style="margin-bottom:var(--espaciado-sm)">Licencias</h4>
            <div class="perfil-texto-legal">
              <h5>FormsBiblicos</h5>
              <p>Plataforma de estudio bíblico desarrollada sin frameworks: HTML, CSS y JavaScript nativos.</p>
              <h5>Supabase</h5>
              <p>Backend y base de datos (PostgreSQL) — <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a>. Licencia Apache 2.0.</p>
              <h5>Lucide Icons</h5>
              <p>Iconografía de la interfaz — <a href="https://lucide.dev" target="_blank" rel="noopener">lucide.dev</a>. Licencia ISC.</p>
              <h5>Vite y Vitest</h5>
              <p>Herramientas de desarrollo y pruebas — <a href="https://vitejs.dev" target="_blank" rel="noopener">vitejs.dev</a>. Licencia MIT.</p>
              <h5>Textos bíblicos</h5>
              <p>El contenido bíblico es de dominio público (versión RVR1960 y similares).</p>
            </div>
          </div>`
      };

      const meta = {
        'que-es':   { titulo: 'Qué es FormsBiblicos', sub: 'Información de la aplicación' },
        terminos:   { titulo: 'Términos de uso', sub: 'Condiciones de uso del servicio' },
        privacidad: { titulo: 'Política de privacidad', sub: 'Cómo tratamos tus datos' },
        licencias:  { titulo: 'Licencias', sub: 'Tecnologías y atribuciones' }
      }[seccion] || { titulo: 'Acerca de', sub: '' };

      raiz.innerHTML = `
        <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-md);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          ${subcabecera(meta.titulo, meta.sub)}
          <div id="acercaContenido" class="o-pila" style="gap:var(--espaciado-md)">
            ${contenido[seccion] || contenido['que-es']}
          </div>
        </div>`;
      raiz.querySelector('[data-volver]').onclick = () => router.navegar('/perfil');
      if (window.Iconos) window.Iconos.actualizar();
    }
  };
})();
