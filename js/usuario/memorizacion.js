// ============================================================
// MEMORIZACIÓN - Versículos, Libros y Autores (básico)
// ============================================================

(function() {
    'use strict';

    console.log('Inicializando Memorización...');

    // ------------------------------------------------------------
    // DATOS BÁSICOS (ampliables)
    // ------------------------------------------------------------
    const VERSES = [
        { id: 'jn3_16', ref: 'Juan 3:16', texto: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.' },
        { id: 'sal23_1', ref: 'Salmos 23:1', texto: 'Jehová es mi pastor; nada me faltará.' },
        { id: 'fil4_13', ref: 'Filipenses 4:13', texto: 'Todo lo puedo en Cristo que me fortalece.' },
        { id: 'prov3_5', ref: 'Proverbios 3:5', texto: 'Fíate de Jehová con todo tu corazón, y no te apoyes en tu propia prudencia.' },
        { id: 'rom8_28', ref: 'Romanos 8:28', texto: 'Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien.' },
        { id: 'ef2_8', ref: 'Efesios 2:8', texto: 'Porque por gracia sois salvos por medio de la fe; y esto no de vosotros, pues es don de Dios.' }
    ];

    const AUTHORS = [
        { id: 'moises', nombre: 'Moisés', nota: 'Autor de la Ley (Génesis a Deuteronomio).' },
        { id: 'david', nombre: 'David', nota: 'Rey de Israel y autor de muchos Salmos.' },
        { id: 'salomon', nombre: 'Salomón', nota: 'Autor de Proverbios, Eclesiastés y Cantar de los Cantares.' },
        { id: 'pablo', nombre: 'Pablo', nota: 'Apóstol; autor de las epístolas paulinas.' },
        { id: 'lucas', nombre: 'Lucas', nota: 'Médico; autor del Evangelio de Lucas y Hechos.' },
        { id: 'juan', nombre: 'Juan', nota: 'Apóstol; autor del Evangelio de Juan, sus epístolas y Apocalipsis.' },
        { id: 'isaias', nombre: 'Isaías', nota: 'Profeta mayor del Antiguo Testamento.' },
        { id: 'pedro', nombre: 'Pedro', nota: 'Apóstol; autor de 1 y 2 Pedro.' }
    ];

    // Estado en memoria
    let progress = { versiculos: [], libros: [], autores: [] };
    let tabActual = 'versiculos';

    // ------------------------------------------------------------
    // PROGRESO
    // ------------------------------------------------------------
    async function cargar() {
        const u = window.getCurrentUser();
        const p = (u && u.progress) ? u.progress : {};
        progress = {
            versiculos: Array.isArray(p.versiculos) ? p.versiculos.slice() : [],
            libros: Array.isArray(p.librosMemorizados) ? p.librosMemorizados.slice() : [],
            autores: Array.isArray(p.autoresMemorizados) ? p.autoresMemorizados.slice() : []
        };
        return progress;
    }

    async function guardar(campo, lista) {
        const u = window.getCurrentUser();
        if (!u) return;
        progress[campo] = lista;
        const payload = {
            versiculos: progress.versiculos,
            librosMemorizados: progress.libros,
            autoresMemorizados: progress.autores
        };
        try {
            await window.updateUser(u.id, { progress: payload });
        } catch (e) {
            console.warn('No se pudo guardar memorización:', e.message);
        }
    }

    function escapar(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ------------------------------------------------------------
    // RENDER
    // ------------------------------------------------------------
    window.renderMemorizacion = async function() {
        const container = document.getElementById('memContent');
        if (!container) return;

        const user = window.getCurrentUser();
        if (!user) {
            container.innerHTML = '<p class="text-center text-gray-400">Debes iniciar sesión</p>';
            return;
        }

        await cargar();

        const totalV = VERSES.length;
        const totalL = (window.BIBLIA_BOOKS || []).length;
        const totalA = AUTHORS.length;
        const hechosV = progress.versiculos.length;
        const hechosL = progress.libros.length;
        const hechosA = progress.autores.length;

        container.innerHTML = `
            <div class="mem-resumen">
                <div class="mem-stat"><span class="mem-stat-num">${hechosV}/${totalV}</span><span class="mem-stat-label"><i data-lucide="pen-line"></i> Versículos</span></div>
                <div class="mem-stat"><span class="mem-stat-num">${hechosL}/${totalL}</span><span class="mem-stat-label"><i data-lucide="book-open"></i> Libros</span></div>
                <div class="mem-stat"><span class="mem-stat-num">${hechosA}/${totalA}</span><span class="mem-stat-label"><i data-lucide="pen-line"></i> Autores</span></div>
            </div>

            <div class="mem-tabs">
                <button class="mem-tab ${tabActual === 'versiculos' ? 'active' : ''}" onclick="window.cambiarTabMem('versiculos')"><i data-lucide="pen-line"></i> Versículos</button>
                <button class="mem-tab ${tabActual === 'libros' ? 'active' : ''}" onclick="window.cambiarTabMem('libros')"><i data-lucide="book-open"></i> Libros</button>
                <button class="mem-tab ${tabActual === 'autores' ? 'active' : ''}" onclick="window.cambiarTabMem('autores')"><i data-lucide="pen-line"></i> Autores</button>
            </div>

            <div id="memTabContent"></div>
        `;

        renderTab();
    };

    window.cambiarTabMem = function(tab) {
        tabActual = tab;
        window.renderMemorizacion();
    };

    function renderTab() {
        const el = document.getElementById('memTabContent');
        if (!el) return;

        if (tabActual === 'versiculos') {
            el.innerHTML = '<div class="mem-lista">' + VERSES.map(v => {
                const done = progress.versiculos.includes(v.id);
                return `
                    <div class="mem-verso ${done ? 'mem-hecho' : ''}" data-vid="${v.id}">
                        <div class="mem-verso-ref">${escapar(v.ref)}</div>
                        <div class="mem-verso-texto" id="texto-${v.id}">${escapar(v.texto)}</div>
                        <div class="mem-verso-acciones">
                            <button class="btn-secondary btn-sm" onclick="window.toggleRepasoVerso('${v.id}')">
                                <i data-lucide="eye-off" class="w-4 h-4"></i> Repaso
                            </button>
                            <button class="btn-${done ? 'secondary' : 'primary'} btn-sm" onclick="window.toggleVerso('${v.id}')">
                                <i data-lucide="${done ? 'undo-2' : 'check-circle'}"></i> ${done ? 'Desmarcar' : 'Marcar memorizado'}
                            </button>
                        </div>
                    </div>
                `;
            }).join('') + '</div>';
        }
        else if (tabActual === 'libros') {
            const libros = window.BIBLIA_BOOKS || [];
            el.innerHTML = '<div class="mem-lista">' + libros.map(b => {
                const done = progress.libros.includes(b.nombre);
                return `
                    <div class="mem-item ${done ? 'mem-hecho' : ''}" onclick="window.toggleLibro('${escapar(b.nombre)}')">
                        <span class="mem-item-icono">${done ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="circle"></i>'}</span>
                        <span class="mem-item-nombre">${escapar(b.nombre)}</span>
                        <span class="mem-item-tag">${escapar(b.testamento === 'AT' ? 'AT' : 'NT')}</span>
                    </div>
                `;
            }).join('') + '</div>';
        }
        else if (tabActual === 'autores') {
            el.innerHTML = '<div class="mem-lista">' + AUTHORS.map(a => {
                const done = progress.autores.includes(a.id);
                return `
                    <div class="mem-autor ${done ? 'mem-hecho' : ''}">
                        <div class="mem-autor-info">
                            <div class="mem-autor-nombre">${escapar(a.nombre)}</div>
                            <div class="mem-autor-nota">${escapar(a.nota)}</div>
                        </div>
                            <button class="btn-${done ? 'secondary' : 'primary'} btn-sm" onclick="window.toggleAutor('${a.id}')">
                                <i data-lucide="${done ? 'undo-2' : 'check-circle'}"></i> ${done ? 'Desmarcar' : 'Memorizado'}
                            </button>
                    </div>
                `;
            }).join('') + '</div>';
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // ------------------------------------------------------------
    // ACCIONES
    // ------------------------------------------------------------
    window.toggleVerso = async function(id) {
        const i = progress.versiculos.indexOf(id);
        if (i >= 0) progress.versiculos.splice(i, 1);
        else progress.versiculos.push(id);
        await guardar('versiculos', progress.versiculos);
        renderTab();
        window.showNotification(i >= 0 ? 'Versículo desmarcado' : 'Versículo memorizado', 'success', 1500);
    };

    window.toggleRepasoVerso = function(id) {
        const t = document.getElementById('texto-' + id);
        if (!t) return;
        if (t.dataset.oculto === '1') {
            t.textContent = VERSES.find(v => v.id === id).texto;
            t.dataset.oculto = '0';
        } else {
            t.textContent = '· · · · · · · · · ·';
            t.dataset.oculto = '1';
        }
    };

    window.toggleLibro = async function(nombre) {
        const i = progress.libros.indexOf(nombre);
        if (i >= 0) progress.libros.splice(i, 1);
        else progress.libros.push(nombre);
        await guardar('libros', progress.libros);
        renderTab();
        window.showNotification(i >= 0 ? 'Libro desmarcado' : 'Libro memorizado', 'success', 1500);
    };

    window.toggleAutor = async function(id) {
        const i = progress.autores.indexOf(id);
        if (i >= 0) progress.autores.splice(i, 1);
        else progress.autores.push(id);
        await guardar('autores', progress.autores);
        renderTab();
        window.showNotification(i >= 0 ? 'Autor desmarcado' : 'Autor memorizado', 'success', 1500);
    };

    console.log('Memorización cargado');

})();
