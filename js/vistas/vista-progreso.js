(function() {
  'use strict';

  const REYES = [
    { periodo: 'Reino Unido', reyes: [
      { nombre: 'Saúl', reinado: '1050-1010 a.C.', ref: '1 Samuel 8-31', detalle: 'Primer rey de Israel. Ungido por Samuel.' },
      { nombre: 'David', reinado: '1010-970 a.C.', ref: '1 Samuel 16 - 1 Reyes 2', detalle: 'El rey según el corazón de Dios. Conquistó Jerusalén.' },
      { nombre: 'Salomón', reinado: '970-931 a.C.', ref: '1 Reyes 1-11', detalle: 'Construyó el Templo. Conocido por su sabiduría.' }
    ]},
    { periodo: 'Reino del Norte (Israel)', reyes: [
      { nombre: 'Jeroboam I', reinado: '931-910 a.C.', ref: '1 Reyes 11-14', detalle: 'Primer rey del norte. Estableció becerros de oro.' },
      { nombre: 'Nadab', reinado: '910-909 a.C.', ref: '1 Reyes 15:25-31', detalle: 'Hijo de Jeroboam. Reinó 2 años.' },
      { nombre: 'Baasa', reinado: '909-886 a.C.', ref: '1 Reyes 15:32 - 16:7', detalle: 'Destruyó la casa de Jeroboam.' },
      { nombre: 'Elá', reinado: '886-885 a.C.', ref: '1 Reyes 16:8-14', detalle: 'Hijo de Baasa. Reinó 2 años.' },
      { nombre: 'Zimri', reinado: '885 a.C. (7 días)', ref: '1 Reyes 16:15-20', detalle: 'Reinó solo 7 días. Se suicidó.' },
      { nombre: 'Omri', reinado: '885-874 a.C.', ref: '1 Reyes 16:21-28', detalle: 'Padre de Acab. Estableció Samaria como capital.' },
      { nombre: 'Acab', reinado: '874-853 a.C.', ref: '1 Reyes 16:29 - 22:40', detalle: 'Casado con Jezabel. Enfrentó a Elías.' },
      { nombre: 'Ocozías', reinado: '853-852 a.C.', ref: '1 Reyes 22:51 - 2 Reyes 1', detalle: 'Hijo de Acab. Sirvió a Baal.' },
      { nombre: 'Joram', reinado: '852-841 a.C.', ref: '2 Reyes 3', detalle: 'Hermano de Ocozías. Último de la dinastía de Omri.' },
      { nombre: 'Jehú', reinado: '841-814 a.C.', ref: '2 Reyes 9-10', detalle: 'Destruyó la casa de Acab y el culto a Baal.' },
      { nombre: 'Joacaz', reinado: '814-798 a.C.', ref: '2 Reyes 13:1-9', detalle: 'Hijo de Jehú. Oprimido por Siria.' },
      { nombre: 'Joás', reinado: '798-782 a.C.', ref: '2 Reyes 13:10-25', detalle: 'Visitó a Eliseo en su lecho de muerte.' },
      { nombre: 'Jeroboam II', reinado: '782-753 a.C.', ref: '2 Reyes 14:23-29', detalle: 'Restauró fronteras de Israel. Profetizado por Jonás.' },
      { nombre: 'Zacarías', reinado: '753 a.C. (6 meses)', ref: '2 Reyes 15:8-12', detalle: 'Último de la dinastía de Jehú.' },
      { nombre: 'Salum', reinado: '752 a.C. (1 mes)', ref: '2 Reyes 15:13-15', detalle: 'Reinó un mes. Asesinado por Menahem.' },
      { nombre: 'Menahem', reinado: '752-742 a.C.', ref: '2 Reyes 15:16-22', detalle: 'Pagó tributo a Asiria.' },
      { nombre: 'Pekaías', reinado: '742-740 a.C.', ref: '2 Reyes 15:23-26', detalle: 'Hijo de Menahem. Asesinado por Peka.' },
      { nombre: 'Peka', reinado: '740-732 a.C.', ref: '2 Reyes 15:27-31', detalle: 'Perdió territorio ante Asiria.' },
      { nombre: 'Oseas', reinado: '732-722 a.C.', ref: '2 Reyes 17', detalle: 'Último rey de Israel. Samaria cayó ante Asiria.' }
    ]},
    { periodo: 'Reino del Sur (Judá)', reyes: [
      { nombre: 'Roboam', reinado: '931-913 a.C.', ref: '1 Reyes 12-14', detalle: 'Hijo de Salomón. El reino se dividió.' },
      { nombre: 'Abías', reinado: '913-911 a.C.', ref: '1 Reyes 15:1-8', detalle: 'Derrotó a Jeroboam en batalla.' },
      { nombre: 'Asa', reinado: '911-870 a.C.', ref: '1 Reyes 15:9-24', detalle: 'Rey bueno. Eliminó la idolatría.' },
      { nombre: 'Josafat', reinado: '870-848 a.C.', ref: '1 Reyes 22:41-50', detalle: 'Anduvo en los caminos de David.' },
      { nombre: 'Joram', reinado: '848-841 a.C.', ref: '2 Reyes 8:16-24', detalle: 'Casado con Atalía (hija de Acab).' },
      { nombre: 'Ocozías', reinado: '841 a.C.', ref: '2 Reyes 8:25-29', detalle: 'Reinó un año. Asesinado por Jehú.' },
      { nombre: 'Atalía', reinado: '841-835 a.C.', ref: '2 Reyes 11', detalle: 'Única reina. Madre de Ocozías. Usurpó el trono.' },
      { nombre: 'Joás', reinado: '835-796 a.C.', ref: '2 Reyes 12', detalle: 'Reparó el Templo. Corregido por el sumo sacerdote Joiada.' },
      { nombre: 'Amasías', reinado: '796-767 a.C.', ref: '2 Reyes 14:1-22', detalle: 'Derrotó a Edom pero cayó en idolatría.' },
      { nombre: 'Uzías (Azarías)', reinado: '767-740 a.C.', ref: '2 Reyes 15:1-7', detalle: 'Rey bueno. Hirido de lepra por orgullo.' },
      { nombre: 'Jotam', reinado: '740-732 a.C.', ref: '2 Reyes 15:32-38', detalle: 'Rey bueno. Fortaleció a Judá.' },
      { nombre: 'Acaz', reinado: '732-716 a.C.', ref: '2 Reyes 16', detalle: 'Rey malo. Ofreció a su hijo en sacrificio.' },
      { nombre: 'Ezequías', reinado: '716-687 a.C.', ref: '2 Reyes 18-20', detalle: 'Rey bueno. Senaquerib sitió Jerusalén.' },
      { nombre: 'Manasés', reinado: '687-642 a.C.', ref: '2 Reyes 21:1-18', detalle: 'Rey más malo de Judá. Se arrepintió al final.' },
      { nombre: 'Amón', reinado: '642-640 a.C.', ref: '2 Reyes 21:19-26', detalle: 'Volvió a la maldad de Manasés.' },
      { nombre: 'Josías', reinado: '640-609 a.C.', ref: '2 Reyes 22-23', detalle: 'Rey bueno. Halló el libro de la Ley.' },
      { nombre: 'Joacaz', reinado: '609 a.C. (3 meses)', ref: '2 Reyes 23:31-34', detalle: 'Depuesto por Faraón Neco.' },
      { nombre: 'Joacim', reinado: '609-598 a.C.', ref: '2 Reyes 23:34 - 24:7', detalle: 'Rey malo. Quemó el rollo de Jeremías.' },
      { nombre: 'Joaquín', reinado: '598-597 a.C. (3 meses)', ref: '2 Reyes 24:8-17', detalle: 'Exiliado a Babilonia.' },
      { nombre: 'Sedequías', reinado: '597-586 a.C.', ref: '2 Reyes 24:18 - 25:21', detalle: 'Último rey de Judá. Cautiverio en Babilonia.' }
    ]}
  ];

  const GENEALOGIA_JESUS = [
    { nivel: 0, nombre: 'Dios', ref: 'Creador' },
    { nivel: 1, nombre: 'Adán', ref: 'Gn 5:1' },
    { nivel: 2, nombre: 'Set', ref: 'Gn 5:3' },
    { nivel: 3, nombre: 'Enós', ref: 'Gn 5:6' },
    { nivel: 4, nombre: 'Cainán', ref: 'Gn 5:9' },
    { nivel: 5, nombre: 'Mahalaleel', ref: 'Gn 5:12' },
    { nivel: 6, nombre: 'Jared', ref: 'Gn 5:15' },
    { nivel: 7, nombre: 'Enoc', ref: 'Gn 5:18' },
    { nivel: 8, nombre: 'Matusalén', ref: 'Gn 5:21' },
    { nivel: 9, nombre: 'Lamec', ref: 'Gn 5:25' },
    { nivel: 10, nombre: 'Noé', ref: 'Gn 5:28-29' },
    { nivel: 11, nombre: 'Sem', ref: 'Gn 5:32' },
    { nivel: 12, nombre: 'Arfaxad', ref: 'Gn 11:10' },
    { nivel: 13, nombre: 'Selá', ref: 'Gn 11:12' },
    { nivel: 14, nombre: 'Heber', ref: 'Gn 11:14' },
    { nivel: 15, nombre: 'Peleg', ref: 'Gn 11:16' },
    { nivel: 16, nombre: 'Reú', ref: 'Gn 11:18' },
    { nivel: 17, nombre: 'Serug', ref: 'Gn 11:20' },
    { nivel: 18, nombre: 'Nacor', ref: 'Gn 11:22' },
    { nivel: 19, nombre: 'Taré', ref: 'Gn 11:24' },
    { nivel: 20, nombre: 'Abraham', ref: 'Gn 11:26' },
    { nivel: 21, nombre: 'Isaac', ref: 'Gn 21:3' },
    { nivel: 22, nombre: 'Jacob', ref: 'Gn 25:26' },
    { nivel: 23, nombre: 'Judá', ref: 'Gn 29:35' },
    { nivel: 24, nombre: 'Fares', ref: 'Gn 38:29' },
    { nivel: 25, nombre: 'Esrom', ref: 'Rt 4:18' },
    { nivel: 26, nombre: 'Aram', ref: 'Rt 4:19' },
    { nivel: 27, nombre: 'Aminadab', ref: 'Rt 4:19' },
    { nivel: 28, nombre: 'Naasón', ref: 'Rt 4:20' },
    { nivel: 29, nombre: 'Salmón', ref: 'Rt 4:20' },
    { nivel: 30, nombre: 'Booz', ref: 'Rt 4:21' },
    { nivel: 31, nombre: 'Obed', ref: 'Rt 4:21' },
    { nivel: 32, nombre: 'Isaí', ref: 'Rt 4:22' },
    { nivel: 33, nombre: 'David', ref: 'Rt 4:22' },
    { nivel: 34, nombre: 'Salomón', ref: '2 S 12:24' },
    { nivel: 35, nombre: 'Roboam', ref: '1 R 11:43' },
    { nivel: 36, nombre: 'Abías', ref: '1 R 14:31' },
    { nivel: 37, nombre: 'Asa', ref: '1 R 15:8' },
    { nivel: 38, nombre: 'Josafat', ref: '1 R 15:24' },
    { nivel: 39, nombre: 'Joram', ref: '1 R 22:50' },
    { nivel: 40, nombre: 'Uzías', ref: '2 R 15:13' },
    { nivel: 41, nombre: 'Jotam', ref: '2 R 15:32' },
    { nivel: 42, nombre: 'Acaz', ref: '2 R 15:38' },
    { nivel: 43, nombre: 'Ezequías', ref: '2 R 16:20' },
    { nivel: 44, nombre: 'Manasés', ref: '2 R 21:1' },
    { nivel: 45, nombre: 'Amón', ref: '2 R 21:18' },
    { nivel: 46, nombre: 'Josías', ref: '2 R 21:24' },
    { nivel: 47, nombre: 'Jeconías', ref: '2 R 24:6' },
    { nivel: 48, nombre: 'Salatiel', ref: '1 Cr 3:17' },
    { nivel: 49, nombre: 'Zorobabel', ref: 'Esd 3:2' },
    { nivel: 50, nombre: 'Abiud', ref: 'Mt 1:13' },
    { nivel: 51, nombre: 'Eliaquim', ref: 'Mt 1:13' },
    { nivel: 52, nombre: 'Azor', ref: 'Mt 1:13' },
    { nivel: 53, nombre: 'Sadoc', ref: 'Mt 1:14' },
    { nivel: 54, nombre: 'Aquim', ref: 'Mt 1:14' },
    { nivel: 55, nombre: 'Eliud', ref: 'Mt 1:14' },
    { nivel: 56, nombre: 'Eleazar', ref: 'Mt 1:15' },
    { nivel: 57, nombre: 'Matán', ref: 'Mt 1:15' },
    { nivel: 58, nombre: 'Jacob', ref: 'Mt 1:15' },
    { nivel: 59, nombre: 'José', ref: 'Mt 1:16' },
    { nivel: 60, nombre: 'Jesús', ref: 'Mt 1:16', destacado: true }
  ];

  const DATOS_CURIOSOS = [
    { icono: 'book-open', titulo: '¿Sabías que...?', texto: 'La Biblia tiene 66 libros, 39 en el Antiguo Testamento y 27 en el Nuevo Testamento.' },
    { icono: 'book-open', titulo: '¿Sabías que...?', texto: 'El libro más largo de la Biblia es Salmos con 150 capítulos.' },
    { icono: 'book-open', titulo: '¿Sabías que...?', texto: 'El capítulo más corto es el Salmo 117 (solo 2 versículos).' },
    { icono: 'book-open', titulo: '¿Sabías que...?', texto: 'El capítulo más largo es el Salmo 119 (176 versículos).' },
    { icono: 'book-open', titulo: '¿Sabías que...?', texto: 'La palabra "Biblia" viene del griego "biblos" que significa "libros".' },
    { icono: 'book-open', titulo: '¿Sabías que...?', texto: 'El versículo más corto es "Jesús lloró" (Juan 11:35).' },
    { icono: 'book-open', titulo: '¿Sabías que...?', texto: 'Matusalén vivió 969 años, la persona más longeva de la Biblia (Génesis 5:27).' },
    { icono: 'book-open', titulo: '¿Sabías que...?', texto: 'La Biblia fue escrita por aproximadamente 40 autores en un período de unos 1.500 años.' },
    { icono: 'book-open', titulo: '¿Sabías que...?', texto: 'El libro de Ester no menciona a Dios ni una sola vez.' },
    { icono: 'book-open', titulo: '¿Sabías que...?', texto: 'El arca de Noé medía aproximadamente 133 metros de largo (300 codos).' },
    { icono: 'book-open', titulo: '¿Sabías que...?', texto: 'Jesús contó 37 parábolas registradas en los Evangelios.' },
    { icono: 'book-open', titulo: '¿Sabías que...?', texto: 'El nombre más largo en la Biblia es Maher-salal-hasbaz (Isaías 8:1-3).' }
  ];

  window.vistaProgreso = {
    _pestana: 'cronologia',
    async montar(raiz) {
      const usuario = store.obtener('usuario');
      if (!usuario) { router.navegar('/login'); return; }
      this._renderizar(raiz);
    },
    _renderizar(raiz) {
      const I = window.Iconos.render;
      raiz.innerHTML = `
    <style>
      [data-lg="true"] .pestana-curiosidades { flex-direction:column !important; }
      [data-lg="true"] .pestana-curiosidades .btn-primario { width:100%; }
    </style>
          <div class="o-contenedor o-pila o-pila--lg" style="padding-top:var(--espaciado-lg);padding-bottom:calc(100px + env(safe-area-inset-bottom))">
          <h2>${I('sparkles')} Curiosidades Bíblicas <button class="info-ayuda" data-guia="curiosidades" aria-label="Guía de Curiosidades">i</button></h2>
          <div class="o-flecha pestana-curiosidades" style="gap:var(--espaciado-xs);flex-wrap:wrap">
            <button class="btn-primario" id="btnPestCronologia" style="flex:1;justify-content:center;${this._pestana === 'cronologia' ? '' : 'opacity:0.6'}">${I('clock')} Reyes</button>
            <button class="btn-primario" id="btnPestGenealogia" style="flex:1;justify-content:center;${this._pestana === 'genealogia' ? '' : 'opacity:0.6'}">${I('git-branch')} Genealogía</button>
            <button class="btn-primario" id="btnPestDatos" style="flex:1;justify-content:center;${this._pestana === 'datos' ? '' : 'opacity:0.6'}">${I('lightbulb')} Datos curiosos</button>
          </div>
          <div id="curiosidadesContent" class="o-pila"></div>
        </div>`;
      raiz.querySelector('#btnPestCronologia').onclick = () => { this._pestana = 'cronologia'; this._renderizar(raiz); };
      raiz.querySelector('#btnPestGenealogia').onclick = () => { this._pestana = 'genealogia'; this._renderizar(raiz); };
      raiz.querySelector('#btnPestDatos').onclick = () => { this._pestana = 'datos'; this._renderizar(raiz); };
      const cont = raiz.querySelector('#curiosidadesContent');
      if (this._pestana === 'cronologia') this._renderCronologia(cont);
      else if (this._pestana === 'genealogia') this._renderGenealogia(cont);
      else if (this._pestana === 'datos') this._renderDatosCuriosos(cont);
      window.Iconos.actualizar();
      const guiasCur = {
        'curiosidades': ['Curiosidades Bíblicas', 'Sección con información histórica y curiosa sobre la Biblia. Explora la cronología de los reyes de Israel y Judá, el árbol genealógico de Jesús y datos fascinantes sobre las Escrituras.', 'Usa las pestañas para cambiar entre: Reyes (cronología), Genealogía de Jesús y Datos curiosos.']
      };
      raiz.querySelectorAll('[data-guia]').forEach(btn => {
        const g = guiasCur[btn.dataset.guia];
        if (g) btn.addEventListener('click', () => window.helpers.mostrarGuia(g[0], g[1], g[2]));
      });
    },
    _renderCronologia(cont) {
      const I = window.Iconos.render;
      cont.innerHTML = '<h3>' + I('clock') + ' Cronología de Reyes de Israel y Judá</h3>' +
        REYES.map(grupo => `
          <div class="o-pila u-mb-3">
            <h4 class="u-fw-600" style="color:var(--color-acento)">${I('flag')} ${grupo.periodo}</h4>
            <div class="o-pila" style="border-left:3px solid var(--color-acento-soft);padding-left:var(--espaciado-md)">
              ${grupo.reyes.map(r => `
                <details class="tarjeta-capitulo" style="cursor:pointer">
                  <summary class="o-flecha o-flecha--between" style="cursor:pointer">
                    <span class="u-fw-600">${I('crown')} ${r.nombre}</span>
                    <span class="u-fs-xs u-color-texto-terciario">${r.reinado}</span>
                  </summary>
                  <div class="u-mt-2 o-pila" style="padding-left:var(--espaciado-sm)">
                    <p class="u-fs-sm">${r.detalle}</p>
                    <p class="u-fs-xs u-color-texto-terciario">${I('book-open')} ${r.ref}</p>
                  </div>
                </details>
              `).join('')}
            </div>
          </div>
        `).join('');
    },
    _renderGenealogia(cont) {
      const I = window.Iconos.render;
      cont.innerHTML = `
        <h3>${I('git-branch')} Árbol genealógico de Jesús (según Mateo 1 y Lucas 3)</h3>
        <p class="u-fs-sm u-color-texto-secundario u-mb-2">Desde Adán hasta Jesús, 60 generaciones. Los nombres destacados son los más conocidos.</p>
        <div class="o-pila" style="border-left:3px solid var(--color-acento-soft);padding-left:var(--espaciado-md)">
          ${GENEALOGIA_JESUS.map(p => `
            <div class="o-flecha" style="gap:var(--espaciado-xs);padding:var(--espaciado-xxs) 0">
              <span class="u-fs-xs u-color-texto-terciario" style="min-width:24px">${p.nivel}.</span>
              <span class="u-fw-600" style="${p.destacado ? 'color:var(--color-acento);font-size:var(--texto-lg)' : ''}">${p.destacado ? I('star') : ''} ${p.nombre}</span>
              <span class="u-fs-xs u-color-texto-terciario">${p.ref}</span>
            </div>
          `).join('')}
        </div>
        <div class="u-mt-3 tarjeta-capitulo" style="background:var(--color-acento-soft)">
          <p class="u-fs-sm u-fw-600">${I('info')} Nota:</p>
          <p class="u-fs-xs u-color-texto-secundario">La genealogía de Mateo 1 traza la línea desde Abraham hasta José (padre terrenal de Jesús), mientras que Lucas 3 va desde José hasta Adán. Hay diferencias entre ambas porque Mateo sigue la línea real de Salomón y Lucas posiblemente la línea biológica de Natán (otro hijo de David).</p>
        </div>`;
    },
    _renderDatosCuriosos(cont) {
      const I = window.Iconos.render;
      cont.innerHTML = '<h3>' + I('lightbulb') + ' Datos curiosos de la Biblia</h3>' +
        DATOS_CURIOSOS.map(d => `
          <div class="tarjeta-capitulo">
            <div class="o-flecha" style="gap:var(--espaciado-sm)">
              <span style="font-size:1.5rem;color:var(--color-acento);display:flex">${I(d.icono)}</span>
              <div>
                <p class="u-fw-600 u-fs-sm">${d.titulo}</p>
                <p class="u-fs-sm u-color-texto-secundario">${d.texto}</p>
              </div>
            </div>
          </div>
        `).join('');
    }
  };
})();