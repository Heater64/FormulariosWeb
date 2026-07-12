// ============================================================
// MAPA - Mapa interactivo de la Biblia (básico)
// ============================================================

(function() {
    'use strict';

    console.log('Inicializando Mapa de la Biblia...');

    // ------------------------------------------------------------
    // 66 LIBROS (orden canónico, con testamento y sección)
    // ------------------------------------------------------------
    const BOOKS = [
        // Antiguo Testamento
        { nombre: 'Génesis', testamento: 'AT', seccion: 'Ley' },
        { nombre: 'Éxodo', testamento: 'AT', seccion: 'Ley' },
        { nombre: 'Levítico', testamento: 'AT', seccion: 'Ley' },
        { nombre: 'Números', testamento: 'AT', seccion: 'Ley' },
        { nombre: 'Deuteronomio', testamento: 'AT', seccion: 'Ley' },
        { nombre: 'Josué', testamento: 'AT', seccion: 'Historia' },
        { nombre: 'Jueces', testamento: 'AT', seccion: 'Historia' },
        { nombre: 'Rut', testamento: 'AT', seccion: 'Historia' },
        { nombre: '1 Samuel', testamento: 'AT', seccion: 'Historia' },
        { nombre: '2 Samuel', testamento: 'AT', seccion: 'Historia' },
        { nombre: '1 Reyes', testamento: 'AT', seccion: 'Historia' },
        { nombre: '2 Reyes', testamento: 'AT', seccion: 'Historia' },
        { nombre: '1 Crónicas', testamento: 'AT', seccion: 'Historia' },
        { nombre: '2 Crónicas', testamento: 'AT', seccion: 'Historia' },
        { nombre: 'Esdras', testamento: 'AT', seccion: 'Historia' },
        { nombre: 'Nehemías', testamento: 'AT', seccion: 'Historia' },
        { nombre: 'Ester', testamento: 'AT', seccion: 'Historia' },
        { nombre: 'Job', testamento: 'AT', seccion: 'Poesía' },
        { nombre: 'Salmos', testamento: 'AT', seccion: 'Poesía' },
        { nombre: 'Proverbios', testamento: 'AT', seccion: 'Poesía' },
        { nombre: 'Eclesiastés', testamento: 'AT', seccion: 'Poesía' },
        { nombre: 'Cantar de los Cantares', testamento: 'AT', seccion: 'Poesía' },
        { nombre: 'Isaías', testamento: 'AT', seccion: 'Profetas mayores' },
        { nombre: 'Jeremías', testamento: 'AT', seccion: 'Profetas mayores' },
        { nombre: 'Lamentaciones', testamento: 'AT', seccion: 'Profetas mayores' },
        { nombre: 'Ezequiel', testamento: 'AT', seccion: 'Profetas mayores' },
        { nombre: 'Daniel', testamento: 'AT', seccion: 'Profetas mayores' },
        { nombre: 'Oseas', testamento: 'AT', seccion: 'Profetas menores' },
        { nombre: 'Joel', testamento: 'AT', seccion: 'Profetas menores' },
        { nombre: 'Amós', testamento: 'AT', seccion: 'Profetas menores' },
        { nombre: 'Abdías', testamento: 'AT', seccion: 'Profetas menores' },
        { nombre: 'Jonás', testamento: 'AT', seccion: 'Profetas menores' },
        { nombre: 'Miqueas', testamento: 'AT', seccion: 'Profetas menores' },
        { nombre: 'Nahúm', testamento: 'AT', seccion: 'Profetas menores' },
        { nombre: 'Habacuc', testamento: 'AT', seccion: 'Profetas menores' },
        { nombre: 'Sofonías', testamento: 'AT', seccion: 'Profetas menores' },
        { nombre: 'Hageo', testamento: 'AT', seccion: 'Profetas menores' },
        { nombre: 'Zacarías', testamento: 'AT', seccion: 'Profetas menores' },
        { nombre: 'Malaquías', testamento: 'AT', seccion: 'Profetas menores' },
        // Nuevo Testamento
        { nombre: 'Mateo', testamento: 'NT', seccion: 'Evangelios' },
        { nombre: 'Marcos', testamento: 'NT', seccion: 'Evangelios' },
        { nombre: 'Lucas', testamento: 'NT', seccion: 'Evangelios' },
        { nombre: 'Juan', testamento: 'NT', seccion: 'Evangelios' },
        { nombre: 'Hechos', testamento: 'NT', seccion: 'Historia' },
        { nombre: 'Romanos', testamento: 'NT', seccion: 'Epístolas paulinas' },
        { nombre: '1 Corintios', testamento: 'NT', seccion: 'Epístolas paulinas' },
        { nombre: '2 Corintios', testamento: 'NT', seccion: 'Epístolas paulinas' },
        { nombre: 'Gálatas', testamento: 'NT', seccion: 'Epístolas paulinas' },
        { nombre: 'Efesios', testamento: 'NT', seccion: 'Epístolas paulinas' },
        { nombre: 'Filipenses', testamento: 'NT', seccion: 'Epístolas paulinas' },
        { nombre: 'Colosenses', testamento: 'NT', seccion: 'Epístolas paulinas' },
        { nombre: '1 Tesalonicenses', testamento: 'NT', seccion: 'Epístolas paulinas' },
        { nombre: '2 Tesalonicenses', testamento: 'NT', seccion: 'Epístolas paulinas' },
        { nombre: '1 Timoteo', testamento: 'NT', seccion: 'Epístolas paulinas' },
        { nombre: '2 Timoteo', testamento: 'NT', seccion: 'Epístolas paulinas' },
        { nombre: 'Tito', testamento: 'NT', seccion: 'Epístolas paulinas' },
        { nombre: 'Filemón', testamento: 'NT', seccion: 'Epístolas paulinas' },
        { nombre: 'Hebreos', testamento: 'NT', seccion: 'Epístolas generales' },
        { nombre: 'Santiago', testamento: 'NT', seccion: 'Epístolas generales' },
        { nombre: '1 Pedro', testamento: 'NT', seccion: 'Epístolas generales' },
        { nombre: '2 Pedro', testamento: 'NT', seccion: 'Epístolas generales' },
        { nombre: '1 Juan', testamento: 'NT', seccion: 'Epístolas generales' },
        { nombre: '2 Juan', testamento: 'NT', seccion: 'Epístolas generales' },
        { nombre: '3 Juan', testamento: 'NT', seccion: 'Epístolas generales' },
        { nombre: 'Judas', testamento: 'NT', seccion: 'Epístolas generales' },
        { nombre: 'Apocalipsis', testamento: 'NT', seccion: 'Profecía' }
    ];

    // ------------------------------------------------------------
    // PROGRESO
    // ------------------------------------------------------------
    function getEstudiados() {
        const u = window.getCurrentUser();
        const estudiados = (u && u.progress && Array.isArray(u.progress.studiedChapters))
            ? u.progress.studiedChapters : [];
        const curriculum = window.ESTUDIO_CURRICULUM || [];
        // Mapa libro -> capítulos estudiados
        const porLibro = {};
        curriculum.forEach(c => {
            if (estudiados.includes(c.id)) {
                if (!porLibro[c.libro]) porLibro[c.libro] = [];
                porLibro[c.libro].push(c);
            }
        });
        return porLibro;
    }

    function escapar(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ------------------------------------------------------------
    // RENDER
    // ------------------------------------------------------------
    window.renderMapa = async function() {
        const container = document.getElementById('mapaContent');
        if (!container) return;

        const user = window.getCurrentUser();
        if (!user) {
            container.innerHTML = '<p class="text-center text-gray-400">Debes iniciar sesión</p>';
            return;
        }

        const porLibro = getEstudiados();
        const librosTocados = Object.keys(porLibro).length;
        const porcentaje = Math.round((librosTocados / BOOKS.length) * 100);

        // Agrupar por testamento y sección
        const grupos = {};
        BOOKS.forEach(b => {
            const key = b.testamento;
            if (!grupos[key]) grupos[key] = {};
            if (!grupos[key][b.seccion]) grupos[key][b.seccion] = [];
            grupos[key][b.seccion].push(b);
        });

        let html = `
            <div class="mapa-resumen">
                <div class="mapa-resumen-header">
                    <h3><i data-lucide="bar-chart-3"></i> Tu avance en la Biblia</h3>
                    <span class="progreso-porcentaje">${porcentaje}%</span>
                </div>
                <div class="progreso-bar">
                    <div class="progreso-bar-fill" style="width:${porcentaje}%"></div>
                </div>
                <p class="ajustes-hint">${librosTocados} de ${BOOKS.length} libros tocados · ${Object.values(porLibro).reduce((a, c) => a + c.length, 0)} capítulos estudiados</p>
            </div>
        `;

        const nombresTestamento = { AT: '<i data-lucide="book"></i> Antiguo Testamento', NT: '<i data-lucide="sparkles"></i> Nuevo Testamento' };
        Object.keys(grupos).forEach(test => {
            html += `<div class="mapa-testamento"><h3 class="mapa-testamento-titulo">${nombresTestamento[test]}</h3>`;
            Object.keys(grupos[test]).forEach(seccion => {
                html += `<div class="mapa-seccion"><h4 class="mapa-seccion-titulo">${escapar(seccion)}</h4><div class="mapa-grid">`;
                grupos[test][seccion].forEach(b => {
                    const capitulos = porLibro[b.nombre] || [];
                    const estado = capitulos.length > 0 ? 'estudiado' : 'pendiente';
                    const icono = capitulos.length > 0 ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="circle"></i>';
                    html += `
                        <div class="mapa-libro ${estado}" onclick="window.abrirLibro('${escapar(b.nombre)}')">
                            <span class="mapa-libro-icono">${icono}</span>
                            <span class="mapa-libro-nombre">${escapar(b.nombre)}</span>
                            ${capitulos.length > 0 ? `<span class="mapa-libro-badge">${capitulos.length}</span>` : ''}
                        </div>
                    `;
                });
                html += `</div></div>`;
            });
            html += `</div>`;
        });

        container.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    // ------------------------------------------------------------
    // MODAL DETALLE
    // ------------------------------------------------------------
    window.abrirLibro = function(nombre) {
        const porLibro = getEstudiados();
        const capitulos = porLibro[nombre] || [];
        const totalCapitulos = (window.ESTUDIO_CURRICULUM || []).filter(c => c.libro === nombre);

        const titulo = document.getElementById('libroModalTitulo');
        const body = document.getElementById('libroModalBody');
        if (!titulo || !body) return;

        titulo.innerHTML = `<i data-lucide="book-open"></i> ${escapar(nombre)}`;
        titulo.setAttribute('data-nombre', nombre);

        let html = '';
        if (capitulos.length > 0) {
            html += `<p class="ajustes-hint">Capítulos estudiados: ${capitulos.length}</p><div class="mapa-capitulos">`;
            capitulos.forEach(c => {
                html += `
                    <div class="mapa-capitulo-item">
                        <div>
                            <strong>${escapar(c.referencia)}</strong> — ${escapar(c.titulo)}
                        </div>
                        <button onclick="window.estudiarCapitulo('${c.id}')" class="btn-primary btn-sm">Repasar</button>
                    </div>
                `;
            });
            html += `</div>`;
        } else if (totalCapitulos.length > 0) {
            html += `<p class="ajustes-hint">Tienes ${totalCapitulos.length} capítulo(s) disponible(s) para estudiar en este libro.</p><div class="mapa-capitulos">`;
            totalCapitulos.forEach(c => {
                html += `
                    <div class="mapa-capitulo-item">
                        <div>
                            <strong>${escapar(c.referencia)}</strong> — ${escapar(c.titulo)}
                        </div>
                        <button onclick="window.estudiarCapitulo('${c.id}')" class="btn-primary btn-sm">Estudiar</button>
                    </div>
                `;
            });
            html += `</div>`;
        } else {
            html += `<p class="ajustes-hint">Aún no hay capítulos de este libro en el currículo. Aparecerán aquí cuando el equipo los añada.</p>`;
        }

        body.innerHTML = html;

        const modal = document.getElementById('libroModal');
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('active'));
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    window.cerrarLibroModal = function() {
        const modal = document.getElementById('libroModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    };

    window.estudiarCapitulo = function(capId) {
        window.cerrarLibroModal();
        window.location.href = 'estudio.html';
        // Abrir el capítulo directamente tras cargar estudio
        sessionStorage.setItem('abrirCapitulo', capId);
    };

    // Al cargar estudio, si se pidió abrir un capítulo concreto
    if (window.location.pathname.includes('estudio.html')) {
        const pendiente = sessionStorage.getItem('abrirCapitulo');
        if (pendiente && typeof window.abrirCapitulo === 'function') {
            sessionStorage.removeItem('abrirCapitulo');
            setTimeout(() => window.abrirCapitulo(pendiente), 300);
        }
    }

    console.log('Mapa de la Biblia cargado');

    // Expuesto para Memorización
    window.BIBLIA_BOOKS = BOOKS;

})();
