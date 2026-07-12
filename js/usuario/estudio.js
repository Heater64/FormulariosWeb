(function() {
    'use strict';

    console.log('Inicializando Estudio System v2...');

    var CURRICULUM = [
        {
            id: 'gen1', libro: 'G\u00e9nesis', referencia: 'G\u00e9nesis 1',
            titulo: 'La Creaci\u00f3n',
            objetivo: 'Comprender el origen del universo seg\u00fan el relato b\u00edblico.',
            tiempo_estimado: '10-15 min',
            instruccion: 'Lee el cap\u00edtulo 1 de G\u00e9nesis (La Creaci\u00f3n). T\u00f3mate tu tiempo para leerlo con la Biblia abierta.',
            frase_motivadora: 'Lee este cap\u00edtulo con calma. Las preguntas te ayudar\u00e1n a comprobar cu\u00e1nto has comprendido.',
            preguntas: [
                { id: 'gen1q1', tipo: 'texto', titulo: '\u00bfQu\u00e9 cre\u00f3 Dios en el primer d\u00eda?', respuesta: 'la luz' },
                { id: 'gen1q2', tipo: 'opcion', titulo: '\u00bfA qui\u00e9n cre\u00f3 Dios el sexto d\u00eda?', opciones: ['A los \u00e1ngeles', 'Al hombre y a la mujer', 'A los peces'], correcta: 1 },
                { id: 'gen1q3', tipo: 'vf', titulo: 'El hombre fue creado a imagen y semejanza de Dios.', correcta: 'v' }
            ]
        },
        {
            id: 'gen2', libro: 'G\u00e9nesis', referencia: 'G\u00e9nesis 2',
            titulo: 'El jard\u00edn del Ed\u00e9n',
            objetivo: 'Conocer el prop\u00f3sito de Dios al crear al hombre y colocarlo en el huerto.',
            tiempo_estimado: '10-15 min',
            instruccion: 'Lee el cap\u00edtulo 2 de G\u00e9nesis (El jard\u00edn del Ed\u00e9n). Observa c\u00f3mo Dios coloca al hombre en el huerto.',
            frase_motivadora: 'Cada detalle del relato tiene un prop\u00f3sito. Disfruta la lectura.',
            preguntas: [
                { id: 'gen2q1', tipo: 'texto', titulo: '\u00bfD\u00f3nde puso Dios al hombre que hab\u00eda formado?', respuesta: 'en el jard\u00edn del ed\u00e9n' },
                { id: 'gen2q2', tipo: 'opcion', titulo: '\u00bfQu\u00e9 \u00e1rbol hab\u00eda en medio del jard\u00edn, adem\u00e1s del \u00e1rbol de la vida?', opciones: ['El \u00e1rbol de la ciencia del bien y del mal', 'El \u00e1rbol de la sabidur\u00eda', 'El \u00e1rbol de la eternidad'], correcta: 0 },
                { id: 'gen2q3', tipo: 'vf', titulo: 'Ad\u00e1n puso nombre a todos los animales del campo.', correcta: 'v' }
            ]
        },
        {
            id: 'gen3', libro: 'G\u00e9nesis', referencia: 'G\u00e9nesis 3',
            titulo: 'La ca\u00edda',
            objetivo: 'Comprender el origen del pecado y la primera promesa de redenci\u00f3n.',
            tiempo_estimado: '10-15 min',
            instruccion: 'Lee el cap\u00edtulo 3 de G\u00e9nesis (La tentaci\u00f3n y la ca\u00edda). F\u00edjate en la promesa del Salvador.',
            frase_motivadora: 'Aunque la lectura toque temas dif\u00edciles, recuerda que Dios ya ten\u00eda un plan de salvaci\u00f3n.',
            preguntas: [
                { id: 'gen3q1', tipo: 'texto', titulo: '\u00bfQui\u00e9n enga\u00f1\u00f3 a la mujer en el jard\u00edn?', respuesta: 'la serpiente' },
                { id: 'gen3q2', tipo: 'opcion', titulo: '\u00bfQu\u00e9 comieron Ad\u00e1n y Eva?', opciones: ['Del \u00e1rbol de la vida', 'Del \u00e1rbol de la ciencia del bien y del mal', 'Del fruto del trigo'], correcta: 1 },
                { id: 'gen3q3', tipo: 'vf', titulo: 'Dios prometi\u00f3 que la descendencia de la mujer herir\u00eda la cabeza de la serpiente.', correcta: 'v' }
            ]
        },
        {
            id: 'gen6', libro: 'G\u00e9nesis', referencia: 'G\u00e9nesis 6',
            titulo: 'No\u00e9 y el Diluvio',
            objetivo: 'Entender por qu\u00e9 Dios decidi\u00f3 enviar el diluvio y c\u00f3mo preserv\u00f3 a No\u00e9.',
            tiempo_estimado: '10-15 min',
            instruccion: 'Lee el cap\u00edtulo 6 de G\u00e9nesis (La maldad y el Diluvio). Observa por qu\u00e9 Dios eligi\u00f3 a No\u00e9.',
            frase_motivadora: 'La historia de No\u00e9 nos recuerda que la fe marca la diferencia.',
            preguntas: [
                { id: 'gen6q1', tipo: 'texto', titulo: '\u00bfPor qu\u00e9 encontr\u00f3 No\u00e9 gracia ante los ojos de Dios?', respuesta: 'era justo' },
                { id: 'gen6q2', tipo: 'opcion', titulo: '\u00bfQu\u00e9 mand\u00f3 Dios a No\u00e9 construir?', opciones: ['Un altar', 'Un arca', 'Una torre'], correcta: 1 },
                { id: 'gen6q3', tipo: 'vf', titulo: 'No\u00e9 hizo conforme a todo lo que Dios le mand\u00f3.', correcta: 'v' }
            ]
        },
        {
            id: 'gen15', libro: 'G\u00e9nesis', referencia: 'G\u00e9nesis 15',
            titulo: 'La promesa a Abraham',
            objetivo: 'Comprender la alianza de Dios con Abraham y su promesa de descendencia.',
            tiempo_estimado: '10-15 min',
            instruccion: 'Lee el cap\u00edtulo 15 de G\u00e9nesis (La alianza con Abraham). F\u00edjate en la promesa de descendencia.',
            frase_motivadora: 'La fe de Abraham es un ejemplo para todos los creyentes.',
            preguntas: [
                { id: 'gen15q1', tipo: 'texto', titulo: '\u00bfA qui\u00e9n hizo Dios esta promesa?', respuesta: 'a abraham' },
                { id: 'gen15q2', tipo: 'opcion', titulo: '\u00bfEn qu\u00e9 compar\u00f3 Dios la descendencia de Abraham?', opciones: ['Las estrellas del cielo', 'La arena del mar', 'Ambas son correctas'], correcta: 2 },
                { id: 'gen15q3', tipo: 'vf', titulo: 'Abraham crey\u00f3 a Dios y le fue contado por justicia.', correcta: 'v' }
            ]
        }
    ];

    // Estado
    var state = {
        progress: { studiedChapters: [], versiculos: [], notas: {},
                    currentChapter: null, currentStep: null,
                    chapterAnswers: {}, chapterResults: {} },
        currentTab: 'estudio',
        historial: [],
        capAbierto: null
    };

    var notasTimer = null;
    var respuestasTimer = null;
    var esc = window.escapeHtml || function(t) {
        var d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    };

    // ============================================================
    // PROGRESO
    // ============================================================
    async function cargarProgreso() {
        var u = window.getCurrentUser();
        var p = (u && u.progress) ? u.progress : {};
        state.progress = {
            studiedChapters: Array.isArray(p.studiedChapters) ? p.studiedChapters.slice() : [],
            versiculos: Array.isArray(p.versiculos) ? p.versiculos.slice() : [],
            notas: (p.notas && typeof p.notas === 'object') ? Object.assign({}, p.notas) : {},
            currentChapter: p.currentChapter || null,
            currentStep: p.currentStep || null,
            chapterAnswers: (p.chapterAnswers && typeof p.chapterAnswers === 'object') ? Object.assign({}, p.chapterAnswers) : {},
            chapterResults: (p.chapterResults && typeof p.chapterResults === 'object') ? Object.assign({}, p.chapterResults) : {}
        };
    }

    async function guardarProgreso() {
        var u = window.getCurrentUser();
        if (!u || !u.id) return;
        try {
            await window.updateUser(u.id, { progress: state.progress });
        } catch (e) {
            console.warn('No se pudo persistir progreso:', e.message);
        }
    }

    async function guardarSesion(capId, paso) {
        state.progress.currentChapter = capId;
        state.progress.currentStep = paso;
        await guardarProgreso();
    }

    function limpiarSesion() {
        state.progress.currentChapter = null;
        state.progress.currentStep = null;
    }

    function sesionPendiente() {
        if (!state.progress.currentChapter || !state.progress.currentStep) return null;
        if (state.progress.currentStep === 'completado') return null;
        var cap = CURRICULUM.find(function(c) { return c.id === state.progress.currentChapter; });
        return cap || null;
    }

    // ============================================================
    // HISTORIAL
    // ============================================================
    async function cargarHistorial() {
        state.historial = [];
        var sb = window.System && window.System.supabase;
        if (!sb) return;
        var u = window.getCurrentUser();
        if (!u) return;
        try {
            var res = await sb.from('study_history')
                .select('*')
                .eq('user_id', u.id)
                .order('created_at', { ascending: false })
                .limit(50);
            if (res.data) state.historial = res.data;
        } catch (e) {
            console.warn('No se pudo cargar historial:', e.message);
        }
    }

    async function registrarHistorial(capId, accion, respuestas, aciertos, totalPreg) {
        var sb = window.System && window.System.supabase;
        if (!sb) return;
        var u = window.getCurrentUser();
        if (!u) return;
        try {
            await sb.from('study_history').insert({
                user_id: u.id,
                capitulo_id: capId,
                accion: accion,
                respuestas: respuestas || null,
                aciertos: aciertos || 0,
                total_preguntas: totalPreg || 0,
                tiempo_segundos: 0
            });
        } catch (e) {
            console.warn('No se pudo registrar historial:', e.message);
        }
    }

    // ============================================================
    // HELPERS
    // ============================================================
    function siguientePendiente() {
        return CURRICULUM.find(function(c) { return !state.progress.studiedChapters.includes(c.id); }) || null;
    }

    function contarEstudiados() {
        return state.progress.studiedChapters.filter(function(id) { return CURRICULUM.some(function(c) { return c.id === id; }); }).length;
    }

    function capitulosPorLibro() {
        var map = {};
        CURRICULUM.forEach(function(c) {
            if (!map[c.libro]) map[c.libro] = { total: 0, hechos: 0, capitulos: [] };
            map[c.libro].total++;
            map[c.libro].capitulos.push(c);
            if (state.progress.studiedChapters.includes(c.id)) map[c.libro].hechos++;
        });
        return map;
    }

    function librosIniciados() {
        var map = capitulosPorLibro();
        var count = 0;
        for (var k in map) { if (map[k].hechos > 0) count++; }
        return count;
    }

    function librosTerminados() {
        var map = capitulosPorLibro();
        var count = 0;
        for (var k in map) { if (map[k].hechos >= map[k].total) count++; }
        return count;
    }

    // ============================================================
    // PANEL PRINCIPAL
    // ============================================================
    window.renderEstudio = async function() {
        var container = document.getElementById('estudioContent');
        if (!container) return;
        document.body.classList.remove('estudio-flow');

        var user = window.getCurrentUser();
        if (!user) {
            container.innerHTML = '<p class="text-center text-gray-400">Debes iniciar sesi\u00f3n</p>';
            return;
        }

        await cargarProgreso();
        await cargarHistorial();

        var total = CURRICULUM.length;
        var hechos = contarEstudiados();
        var pct = total ? Math.round((hechos / total) * 100) : 0;
        var vers = (state.progress.versiculos && Array.isArray(state.progress.versiculos)) ? state.progress.versiculos.length : 0;
        var librosHechos = librosIniciados();
        var librosTerm = librosTerminados();

        var sesion = sesionPendiente();
        var continuarHtml = '';
        if (sesion) {
            var pasoTexto = { intro: 'Introducci\u00f3n', lectura: 'Lectura', preguntas: 'Preguntas', resumen: 'Resumen' };
            continuarHtml = ''
                + '<div class="estudio-continuar-sesion">'
                + '  <div class="estudio-continuar-sesion-icono">\u25b6</div>'
                + '  <div class="estudio-continuar-sesion-info">'
                + '    <div class="estudio-continuar-sesion-titulo">' + esc(sesion.referencia) + ' \u2014 ' + esc(sesion.titulo) + '</div>'
                + '    <div class="estudio-continuar-sesion-detalle">Paso: ' + (pasoTexto[state.progress.currentStep] || state.progress.currentStep) + ' \u00b7 \u00daltima sesi\u00f3n: hoy</div>'
                + '  </div>'
                + '  <button onclick="window.continuarEstudio()" class="btn-primary" style="flex-shrink:0">Continuar</button>'
                + '</div>';
        }

        container.innerHTML = ''
            + '<div class="estudio-progreso">'
            + '  <div class="estudio-progreso-header">'
            + '    <h3><i data-lucide="bar-chart-3"></i> Tu progreso de estudio</h3>'
            + '    <span class="progreso-porcentaje" id="progresoTotal">' + pct + '%</span>'
            + '  </div>'
            + '  <div class="progreso-bar"><div class="progreso-bar-fill" style="width:' + pct + '%"></div></div>'
            + '  <div class="estudio-stats-grid">'
            + '    <div class="estudio-stat"><span class="estudio-stat-number">' + hechos + '</span><span class="estudio-stat-label"><i data-lucide="book-open"></i> Cap\u00edtulos</span></div>'
            + '    <div class="estudio-stat"><span class="estudio-stat-number">' + librosTerm + '</span><span class="estudio-stat-label"><i data-lucide="books"></i> Libros</span></div>'
            + '    <div class="estudio-stat"><span class="estudio-stat-number">' + vers + '</span><span class="estudio-stat-label"><i data-lucide="pen-line"></i> Vers\u00edculos</span></div>'
            + '    <div class="estudio-stat"><span class="estudio-stat-number">' + librosHechos + '</span><span class="estudio-stat-label"><i data-lucide="map"></i> Iniciados</span></div>'
            + '  </div>'
            + '</div>'
            + '<div class="estudio-continuar">'
            + continuarHtml
            + '  <button onclick="window.iniciarProximoEstudio()" class="btn-primary btn-lg btn-full">'
            + '    <i data-lucide="book-open"></i> ' + (hechos > 0 ? 'Estudiar siguiente cap\u00edtulo' : 'Comenzar estudio')
            + '  </button>'
            + '</div>'
            + '<div class="estudio-tabs">'
            + '  <button class="estudio-tab active" data-tab="estudio" onclick="window.cambiarTabEstudio(\'estudio\')"><i data-lucide="book-open"></i> Estudio</button>'
            + '  <button class="estudio-tab" data-tab="memorizacion" onclick="window.cambiarTabEstudio(\'memorizacion\')"><i data-lucide="pen-line"></i> Memorizaci\u00f3n</button>'
            + '  <button class="estudio-tab" data-tab="mapa" onclick="window.cambiarTabEstudio(\'mapa\')"><i data-lucide="map"></i> Libros</button>'
            + '  <button class="estudio-tab" data-tab="historial" onclick="window.cambiarTabEstudio(\'historial\')"><i data-lucide="clock"></i> Historial</button>'
            + '</div>'
            + '<div id="estudioTabContent"></div>';

        if (typeof lucide !== 'undefined') lucide.createIcons();

        var capPendiente = sessionStorage.getItem('abrirCapitulo');
        if (capPendiente) {
            sessionStorage.removeItem('abrirCapitulo');
            var cap = CURRICULUM.find(function(c) { return c.id === capPendiente; });
            if (cap) { mostrarIntroduccion(cap); return; }
        }

        renderTabEstudio('estudio');
    };

    function renderTabEstudio(tab) {
        var el = document.getElementById('estudioTabContent');
        if (!el) return;

        document.querySelectorAll('.estudio-tab').forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-tab') === tab);
        });

        if (tab === 'estudio') {
            renderCapitulos(el);
        } else if (tab === 'memorizacion') {
            el.innerHTML = '<div id="memContent"></div>';
            if (typeof window.renderMemorizacion === 'function') window.renderMemorizacion();
        } else if (tab === 'mapa') {
            el.innerHTML = '<div id="mapaContent"></div>';
            if (typeof window.renderMapa === 'function') window.renderMapa();
        } else if (tab === 'historial') {
            renderHistorial(el);
        }
    }

    window.cambiarTabEstudio = function(tab) {
        state.currentTab = tab;
        renderTabEstudio(tab);
    };

    // ============================================================
    // LISTA DE CAPÍTULOS
    // ============================================================
    function renderCapitulos(container) {
        var hechos = contarEstudiados();
        var total = CURRICULUM.length;

        var porLibro = capitulosPorLibro();
        var librosHtml = '';
        var libroKeys = Object.keys(porLibro);

        libroKeys.forEach(function(nombre) {
            var lb = porLibro[nombre];
            var pct = lb.total > 0 ? Math.round((lb.hechos / lb.total) * 100) : 0;

            var capsHtml = lb.capitulos.map(function(c) {
                var done = state.progress.studiedChapters.includes(c.id);
                var pend = siguientePendiente() && siguientePendiente().id === c.id;
                return '<div class="estudio-capitulo ' + (done ? 'completado' : '') + (pend ? ' pendiente-sig' : '') + '" onclick="window.abrirCapitulo(\'' + c.id + '\')">'
                    + '  <span class="estudio-capitulo-estado">' + (done ? '<i data-lucide="check-circle"></i>' : (pend ? '<i data-lucide="play-circle"></i>' : '<i data-lucide="circle"></i>')) + '</span>'
                    + '  <div class="estudio-capitulo-info">'
                    + '    <div class="estudio-capitulo-ref">' + esc(c.referencia) + '</div>'
                    + '    <div class="estudio-capitulo-titulo">' + esc(c.titulo) + '</div>'
                    + '    <div class="estudio-capitulo-meta">' + c.preguntas.length + ' preguntas \u00b7 ' + (done ? 'Completado' : (pend ? 'Siguiente' : 'Pendiente')) + '</div>'
                    + '  </div>'
                    + '</div>';
            }).join('');

            librosHtml += ''
                + '<div class="estudio-libro-grupo">'
                + '  <div class="estudio-libro-header" onclick="var n=this.nextElementSibling;if(n)n.classList.toggle(\'hidden\');this.querySelector(\'.collapse-icon\').classList.toggle(\'open\')">'
                + '    <span class="collapse-icon open"><i data-lucide="chevron-right" class="w-4 h-4"></i></span>'
                + '    <span class="estudio-libro-nombre">' + esc(nombre) + '</span>'
                + '    <div class="estudio-libro-progreso-mini"><div class="estudio-libro-progreso-mini-fill" style="width:' + pct + '%"></div></div>'
                + '    <span class="estudio-libro-stats">' + lb.hechos + '/' + lb.total + '</span>'
                + '  </div>'
                + '  <div class="estudio-capitulos">' + capsHtml + '</div>'
                + '</div>';
        });

        container.innerHTML = ''
            + '<div class="estudio-libros-seccion">'
            + '  <h3><i data-lucide="book-open"></i> Cap\u00edtulos para estudiar</h3>'
            + '  <p class="ajustes-hint" style="margin-bottom:var(--spacing-md)">' + hechos + ' de ' + total + ' cap\u00edtulos completados</p>'
            + '  ' + librosHtml
            + '</div>';

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // ============================================================
    // HISTORIAL (timeline)
    // ============================================================
    function renderHistorial(container) {
        if (state.historial.length === 0) {
            container.innerHTML = ''
                + '<div class="estudio-historial">'
                + '  <div class="estudio-historial-header"><h3><i data-lucide="clock"></i> Historial de estudio</h3></div>'
                + '  <div class="estudio-historial-vacio">'
                + '    <i data-lucide="book-open"></i>'
                + '    <p>A\u00fan no tienes actividad. \u00a1Empieza a estudiar!</p>'
                + '  </div>'
                + '</div>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        var accionTexto = { completado: 'Completaste', nota_guardada: 'A\u00f1adiste notas en', iniciado: 'Iniciaste' };
        var accionIcono = { completado: '\u2705', nota_guardada: '\ud83d\udcdd', iniciado: '\u25b6' };
        var accionClase = { completado: 'completado', nota_guardada: 'nota', iniciado: 'iniciado' };

        // Agrupar por d\u00eda
        var grupos = {};
        var hoy = new Date();
        state.historial.forEach(function(h) {
            var d = new Date(h.created_at);
            var diff = Math.round((hoy - d) / (1000 * 60 * 60 * 24));
            var key;
            if (diff === 0) key = 'Hoy';
            else if (diff === 1) key = 'Ayer';
            else if (diff <= 7) key = 'Hace ' + diff + ' d\u00edas';
            else key = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            if (!grupos[key]) grupos[key] = [];
            grupos[key].push(h);
        });

        var gruposHtml = Object.keys(grupos).map(function(grupo) {
            return '<div class="estudio-historial-grupo">'
                + '  <div class="estudio-historial-grupo-titulo">' + grupo + '</div>'
                + grupos[grupo].map(function(h) {
                    var cap = CURRICULUM.find(function(c) { return c.id === h.capitulo_id; });
                    var ref = cap ? cap.referencia : h.capitulo_id;
                    var texto = accionTexto[h.accion] || h.accion;
                    var icono = accionIcono[h.accion] || '\u25cf';
                    var clase = accionClase[h.accion] || 'iniciado';
                    var extra = '';
                    if (h.accion === 'completado' && h.total_preguntas > 0) {
                        extra = ' (' + h.aciertos + '/' + h.total_preguntas + ' aciertos)';
                    }
                    var hora = new Date(h.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    return '<div class="estudio-historial-item">'
                        + '  <div class="estudio-historial-item-icono ' + clase + '">' + icono + '</div>'
                        + '  <div class="estudio-historial-item-contenido">'
                        + '    <div class="estudio-historial-item-texto"><strong>' + texto + ' ' + esc(ref) + '</strong>' + esc(extra) + '</div>'
                        + '    <div class="estudio-historial-item-fecha">' + hora + '</div>'
                        + '  </div>'
                        + '</div>';
                }).join('')
                + '</div>';
        }).join('');

        container.innerHTML = ''
            + '<div class="estudio-historial">'
            + '  <div class="estudio-historial-header"><h3><i data-lucide="clock"></i> Historial de estudio</h3></div>'
            + gruposHtml
            + '</div>';

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // ============================================================
    // NAVEGACIÓN DESDE EL PANEL
    // ============================================================
    window.iniciarProximoEstudio = function() {
        var cap = siguientePendiente() || CURRICULUM[0];
        mostrarIntroduccion(cap);
    };

    window.continuarEstudio = function() {
        var sesion = sesionPendiente();
        if (sesion) {
            var paso = state.progress.currentStep;
            if (paso === 'lectura') { mostrarLectura(sesion); }
            else if (paso === 'preguntas') { mostrarPreguntas(sesion); }
            else { mostrarIntroduccion(sesion); }
        } else {
            window.iniciarProximoEstudio();
        }
    };

    window.abrirCapitulo = function(capId) {
        var cap = CURRICULUM.find(function(c) { return c.id === capId; });
        if (cap) mostrarIntroduccion(cap);
    };

    window.volverAlPanel = async function() {
        limpiarSesion();
        await guardarProgreso();
        window.renderEstudio();
    };

    // ============================================================
    // PASO 1: INTRODUCCIÓN
    // ============================================================
    function mostrarIntroduccion(cap) {
        state.capAbierto = cap;
        var container = document.getElementById('estudioTabContent') || document.getElementById('estudioContent');
        if (!container) return;
        document.body.classList.add('estudio-flow');

        container.innerHTML = ''
            + '<div class="flow-topbar">'
            + '  <div class="flow-topbar-left">'
            + '    <button class="flow-btn-back" onclick="window.volverAlPanel()"><i data-lucide="arrow-left" class="w-4 h-4"></i> Volver</button>'
            + '  </div>'
            + '  <span class="flow-topbar-step">Paso 1 de 4</span>'
            + '</div>'
            + '<div class="flow-container">'
            + '  <div class="flow-intro">'
            + '    <div class="flow-intro-header">'
            + '      <div class="flow-intro-icon">\ud83d\udcd6</div>'
            + '      <div class="flow-intro-libro">' + esc(cap.libro) + '</div>'
            + '      <div class="flow-intro-capitulo">' + esc(cap.referencia) + '</div>'
            + '      <div class="flow-intro-titulo">' + esc(cap.titulo) + '</div>'
            + '    </div>'
            + '    <div class="flow-intro-body">'
            + '      <div class="flow-intro-objetivo">'
            + '        <div class="flow-intro-objetivo-label">\ud83c\udfaf Objetivo del estudio</div>'
            + '        <div class="flow-intro-objetivo-texto">' + esc(cap.objetivo || 'Comprender el mensaje de este cap\u00edtulo.') + '</div>'
            + '      </div>'
            + '      <div class="flow-intro-detalles">'
            + '        <div class="flow-intro-detalle"><div class="flow-intro-detalle-icono">\u23f1</div><div class="flow-intro-detalle-valor">' + esc(cap.tiempo_estimado || '10-15 min') + '</div><div class="flow-intro-detalle-label">Tiempo estimado</div></div>'
            + '        <div class="flow-intro-detalle"><div class="flow-intro-detalle-icono">\u2753</div><div class="flow-intro-detalle-valor">' + cap.preguntas.length + '</div><div class="flow-intro-detalle-label">Preguntas</div></div>'
            + '        <div class="flow-intro-detalle"><div class="flow-intro-detalle-icono">\ud83d\udcc5</div><div class="flow-intro-detalle-valor">1</div><div class="flow-intro-detalle-label">Sesi\u00f3n</div></div>'
            + '      </div>'
            + '      <div class="flow-intro-frase">\u201c' + esc(cap.frase_motivadora || 'Lee este cap\u00edtulo con calma. Las preguntas te ayudar\u00e1n a comprender mejor.') + '\u201d</div>'
            + '      <button class="flow-btn-primary" onclick="window.comenzarLectura(\'' + cap.id + '\')"><i data-lucide="book-open" class="w-5 h-5"></i> Comenzar estudio</button>'
            + '    </div>'
            + '  </div>'
            + '</div>';

        guardarSesion(cap.id, 'intro');
        registrarHistorial(cap.id, 'iniciado', null, 0, 0);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // ============================================================
    // PASO 2: LECTURA
    // ============================================================
    window.comenzarLectura = function(capId) {
        var cap = CURRICULUM.find(function(c) { return c.id === capId; });
        if (cap) mostrarLectura(cap);
    };

    function mostrarLectura(cap) {
        var container = document.getElementById('estudioTabContent') || document.getElementById('estudioContent');
        if (!container) return;
        document.body.classList.add('estudio-flow');

        var notas = (state.progress.notas && state.progress.notas[cap.id]) || '';
        var pasoCompleto = state.progress.studiedChapters.includes(cap.id);

        container.innerHTML = ''
            + '<div class="flow-topbar">'
            + '  <div class="flow-topbar-left">'
            + '    <button class="flow-btn-back" onclick="window.volverAlPanel()"><i data-lucide="arrow-left" class="w-4 h-4"></i> Salir</button>'
            + '  </div>'
            + '  <span class="flow-topbar-title">' + esc(cap.referencia) + '</span>'
            + '  <span class="flow-topbar-step">Paso 2 de 4</span>'
            + '</div>'
            + '<div class="flow-container">'
            + '  <div class="flow-lectura">'
            + '    <h2 class="flow-lectura-titulo">' + esc(cap.titulo) + '</h2>'
            + '    <p class="flow-lectura-texto">' + esc(cap.instruccion) + '</p>'
            + '    <p class="flow-lectura-ayuda">Abre tu Biblia y l\u00e9elo con calma. Cuando termines, contin\u00faa.</p>'
            + '    <button class="flow-lectura-notas-toggle" id="notasToggle" onclick="window.toggleNotasPanel(this)">'
            + '      <i data-lucide="pen-line" class="w-4 h-4"></i> Mis notas'
            + '    </button>'
            + '    <div class="flow-lectura-notas-area" id="notasArea">'
            + '      <textarea id="estudioNotas" placeholder="Escribe aqu\u00ed lo que el Se\u00f1or te ense\u00f1e...">' + esc(notas) + '</textarea>'
            + '    </div>'
            + '    <div class="flow-spacer"></div>'
            + (pasoCompleto
                ? '<button class="flow-btn-primary" onclick="window.comenzarPreguntas(\'' + cap.id + '\')"><i data-lucide="pen-line" class="w-5 h-5"></i> Ir a preguntas</button>'
                : '<button class="flow-btn-primary" onclick="window.terminarLectura(\'' + cap.id + '\')"><i data-lucide="check" class="w-5 h-5"></i> He terminado de leer</button>')
            + '  </div>'
            + '</div>';

        guardarSesion(cap.id, 'lectura');

        var ta = document.getElementById('estudioNotas');
        if (ta) {
            ta.addEventListener('input', function() {
                if (notasTimer) clearTimeout(notasTimer);
                notasTimer = setTimeout(function() {
                    guardarNota(cap.id, ta.value);
                }, 3000);
            });
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function guardarNota(capId, valor) {
        if (!state.progress.notas) state.progress.notas = {};
        state.progress.notas[capId] = valor;
        guardarProgreso();
    }

    window.terminarLectura = function(capId) {
        var cap = CURRICULUM.find(function(c) { return c.id === capId; });
        if (cap) {
            var ta = document.getElementById('estudioNotas');
            if (ta) guardarNota(capId, ta.value);
            guardarSesion(cap.id, 'preguntas');
            mostrarPreguntas(cap);
        }
    };

    window.comenzarPreguntas = function(capId) {
        var cap = CURRICULUM.find(function(c) { return c.id === capId; });
        if (cap) {
            var ta = document.getElementById('estudioNotas');
            if (ta) guardarNota(capId, ta.value);
            guardarSesion(cap.id, 'preguntas');
            mostrarPreguntas(cap);
        }
    };

    // ============================================================
    // PASO 3: PREGUNTAS CON CORRECCIÓN
    // ============================================================
    function mostrarPreguntas(cap) {
        var container = document.getElementById('estudioTabContent') || document.getElementById('estudioContent');
        if (!container) return;
        document.body.classList.add('estudio-flow');

        var answersGuardadas = state.progress.chapterAnswers || {};

        var preguntasHtml = cap.preguntas.map(function(p, i) {
            var savedVal = answersGuardadas[p.id] || '';
            var inputHtml = '';
            if (p.tipo === 'texto') {
                inputHtml = '<input type="text" class="flow-pregunta-input" id="flowQ_' + p.id + '" data-pid="' + p.id + '" data-tipo="texto" placeholder="Escribe tu respuesta..." value="' + esc(savedVal) + '" />';
            } else if (p.tipo === 'opcion') {
                inputHtml = '<div class="flow-pregunta-opciones" data-pid="' + p.id + '" data-tipo="opcion">'
                    + p.opciones.map(function(o, oi) {
                        var sel = savedVal === String(oi) ? ' checked' : '';
                        return '<label class="flow-pregunta-opcion"><input type="radio" name="fq_' + p.id + '" value="' + oi + '"' + sel + ' /> <span>' + esc(o) + '</span></label>';
                    }).join('')
                    + '</div>';
            } else if (p.tipo === 'vf') {
                var vSel = savedVal === 'v' ? ' checked' : '';
                var fSel = savedVal === 'f' ? ' checked' : '';
                inputHtml = '<div class="flow-pregunta-opciones" data-pid="' + p.id + '" data-tipo="vf">'
                    + '<label class="flow-pregunta-opcion"><input type="radio" name="fq_' + p.id + '" value="v"' + vSel + ' /> <span>Verdadero</span></label>'
                    + '<label class="flow-pregunta-opcion"><input type="radio" name="fq_' + p.id + '" value="f"' + fSel + ' /> <span>Falso</span></label>'
                    + '</div>';
            }
            return '<div class="flow-pregunta-card" id="flowCard_' + p.id + '">'
                + '  <div class="flow-pregunta-titulo">' + (i + 1) + '. ' + esc(p.titulo) + '</div>'
                + '  ' + inputHtml
                + '  <div id="flowResult_' + p.id + '"></div>'
                + '</div>';
        }).join('');

        container.innerHTML = ''
            + '<div class="flow-topbar">'
            + '  <div class="flow-topbar-left">'
            + '    <button class="flow-btn-back" onclick="window.volverAlPanel()"><i data-lucide="arrow-left" class="w-4 h-4"></i> Salir</button>'
            + '  </div>'
            + '  <span class="flow-topbar-title">' + esc(cap.referencia) + '</span>'
            + '  <span class="flow-topbar-step">Paso 3 de 4</span>'
            + '</div>'
            + '<div class="flow-container">'
            + '  <div class="flow-preguntas-intro">'
            + '    <p>Ahora responder\u00e1s unas preguntas para comprobar qu\u00e9 has comprendido del cap\u00edtulo. No te preocupes, no es un examen, solo una ayuda para aprender.</p>'
            + '  </div>'
            + '  <div class="flow-preguntas">' + preguntasHtml + '</div>'
            + '  <button class="flow-btn-primary" id="btnCorregirTodo" onclick="window.corregirTodas(\'' + cap.id + '\')"><i data-lucide="check-circle" class="w-5 h-5"></i> Corregir respuestas</button>'
            + '</div>';

        guardarSesion(cap.id, 'preguntas');

        // Auto-guardar respuestas al cambiar
        cap.preguntas.forEach(function(p) {
            if (p.tipo === 'texto') {
                var inp = document.getElementById('flowQ_' + p.id);
                if (inp) {
                    inp.addEventListener('input', function() {
                        guardarRespuesta(cap.id, p.id, this.value);
                    });
                }
            } else {
                var radios = document.querySelectorAll('input[name="fq_' + p.id + '"]');
                radios.forEach(function(r) {
                    r.addEventListener('change', function() {
                        if (this.checked) guardarRespuesta(cap.id, p.id, this.value);
                    });
                });
            }
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function guardarRespuesta(capId, pregId, valor) {
        if (!state.progress.chapterAnswers) state.progress.chapterAnswers = {};
        state.progress.chapterAnswers[pregId] = valor;
        if (respuestasTimer) clearTimeout(respuestasTimer);
        respuestasTimer = setTimeout(function() {
            guardarProgreso();
        }, 2000);
    }

    // Corregir todas las preguntas sin recargar
    window.corregirTodas = function(capId) {
        var cap = CURRICULUM.find(function(c) { return c.id === capId; });
        if (!cap) return;

        var aciertos = 0;
        var total = cap.preguntas.length;
        var todasRespondidas = true;

        cap.preguntas.forEach(function(p) {
            if (p.tipo === 'texto') {
                var el = document.getElementById('flowQ_' + p.id);
                if (!el || !el.value.trim()) { todasRespondidas = false; return; }
                var v = el.value.trim().toLowerCase();
                var ok = v === p.respuesta.toLowerCase() || v.indexOf(p.respuesta.toLowerCase()) >= 0;
                var card = document.getElementById('flowCard_' + p.id);
                var result = document.getElementById('flowResult_' + p.id);
                if (card) card.className = 'flow-pregunta-card ' + (ok ? 'correcta' : 'incorrecta');
                if (el) el.className = 'flow-pregunta-input ' + (ok ? 'correcto' : 'incorrecto');
                if (result) {
                    result.innerHTML = ok
                        ? '<div class="flow-pregunta-resultado correcta"><i data-lucide="check-circle" class="w-5 h-5"></i> \u00a1Correcto! \u2014 ' + esc(p.respuesta) + '</div>'
                        : '<div class="flow-pregunta-resultado incorrecta"><i data-lucide="x-circle" class="w-5 h-5"></i> Incorrecto. La respuesta es: <strong>' + esc(p.respuesta) + '</strong></div>'
                        + (p.explicacion ? '<div class="flow-pregunta-explicacion">' + esc(p.explicacion) + '</div>' : '');
                }
                if (ok) aciertos++;
                guardarRespuesta(capId, p.id, el.value.trim());
            } else if (p.tipo === 'opcion' || p.tipo === 'vf') {
                var sel = document.querySelector('input[name="fq_' + p.id + '"]:checked');
                if (!sel) { todasRespondidas = false; return; }
                var v = sel.value;
                var ok = (p.tipo === 'opcion' && parseInt(v) === p.correcta) || (p.tipo === 'vf' && v === p.correcta);
                var card = document.getElementById('flowCard_' + p.id);
                var result = document.getElementById('flowResult_' + p.id);
                if (card) card.className = 'flow-pregunta-card ' + (ok ? 'correcta' : 'incorrecta');

                // Marcar opciones visualmente
                var labels = document.querySelectorAll('.flow-pregunta-opciones[data-pid="' + p.id + '"] .flow-pregunta-opcion');
                labels.forEach(function(l, li) {
                    var rb = l.querySelector('input');
                    if (!rb) return;
                    if (rb.checked && ok) l.className = 'flow-pregunta-opcion correcta';
                    else if (rb.checked && !ok) l.className = 'flow-pregunta-opcion incorrecta';
                    else l.className = 'flow-pregunta-opcion';
                });

                var correctaTexto = p.tipo === 'opcion' ? p.opciones[p.correcta] : (p.correcta === 'v' ? 'Verdadero' : 'Falso');
                if (result) {
                    result.innerHTML = ok
                        ? '<div class="flow-pregunta-resultado correcta"><i data-lucide="check-circle" class="w-5 h-5"></i> \u00a1Correcto!</div>'
                        : '<div class="flow-pregunta-resultado incorrecta"><i data-lucide="x-circle" class="w-5 h-5"></i> Incorrecto. La respuesta correcta es: <strong>' + esc(correctaTexto) + '</strong></div>'
                        + (p.explicacion ? '<div class="flow-pregunta-explicacion">' + esc(p.explicacion) + '</div>' : '');
                }
                if (ok) aciertos++;
                guardarRespuesta(capId, p.id, v);
            }
        });

        if (!todasRespondidas) {
            window.showNotification('Responde todas las preguntas antes de corregir.', 'warning');
            return;
        }

        // Guardar resultados
        if (!state.progress.chapterResults) state.progress.chapterResults = {};
        state.progress.chapterResults[capId] = { aciertos: aciertos, total: total };
        guardarProgreso();

        // Bot\u00f3n para ir al resumen
        var btn = document.getElementById('btnCorregirTodo');
        if (btn) {
            btn.innerHTML = '<i data-lucide="arrow-right" class="w-5 h-5"></i> Ver resumen';
            btn.onclick = function() { window.mostrarResumenEstudio('' + capId); };
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    // ============================================================
    // PASO 4: RESUMEN
    // ============================================================
    window.mostrarResumenEstudio = function(capId) {
        var cap = CURRICULUM.find(function(c) { return c.id === capId; });
        if (cap) mostrarResumen(cap);
    };

    function mostrarResumen(cap) {
        var container = document.getElementById('estudioTabContent') || document.getElementById('estudioContent');
        if (!container) return;
        document.body.classList.add('estudio-flow');

        var result = state.progress.chapterResults && state.progress.chapterResults[cap.id];
        var aciertos = result ? result.aciertos : 0;
        var total = cap.preguntas.length;
        var incorrectas = total - aciertos;
        var tieneNotas = state.progress.notas && state.progress.notas[cap.id] && state.progress.notas[cap.id].trim();

        var mensaje = aciertos === total
            ? '\u00a1Excelente! Has comprendido bien el cap\u00edtulo. Sigue as\u00ed.'
            : (aciertos >= total / 2
                ? 'Buen trabajo. Repasa los puntos que fallaste para afianzar tu aprendizaje.'
                : 'No te preocupes. Vuelve a leer el cap\u00edtulo con calma e int\u00e9ntalo de nuevo. El estudio es un proceso.');

        var detallesHtml = cap.preguntas.map(function(p, i) {
            var answers = state.progress.chapterAnswers || {};
            var userAns = answers[p.id] || 'Sin responder';
            var isCorrect = false;
            var correctaTexto = '';

            if (p.tipo === 'texto') {
                var v = String(userAns).toLowerCase();
                isCorrect = v === p.respuesta.toLowerCase() || v.indexOf(p.respuesta.toLowerCase()) >= 0;
                correctaTexto = p.respuesta;
            } else if (p.tipo === 'opcion') {
                isCorrect = parseInt(userAns) === p.correcta;
                correctaTexto = p.opciones[p.correcta];
            } else if (p.tipo === 'vf') {
                isCorrect = userAns === p.correcta;
                correctaTexto = p.correcta === 'v' ? 'Verdadero' : 'Falso';
            }

            var icono = isCorrect ? '\u2705' : '\u274c';
            var tuya = p.tipo === 'texto' ? userAns : (p.tipo === 'opcion' ? (p.opciones[parseInt(userAns)] || userAns) : (userAns === 'v' ? 'Verdadero' : (userAns === 'f' ? 'Falso' : userAns)));

            return '<div class="flow-resumen-detalle-pregunta">'
                + '  <div class="icono">' + icono + '</div>'
                + '  <div class="info">'
                + '    <div class="q-text">' + esc(p.titulo) + '</div>'
                + '    <div class="q-respuestas">'
                + '      <span class="tuya">Tu respuesta: ' + esc(tuya) + '</span>'
                + (isCorrect ? '' : ' &middot; <span class="correcta-msg">Correcta: ' + esc(correctaTexto) + '</span>')
                + '    </div>'
                + '  </div>'
                + '</div>';
        }).join('');

        var siguiente = siguientePendiente();
        var fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

        container.innerHTML = ''
            + '<div class="flow-topbar">'
            + '  <div class="flow-topbar-left">'
            + '    <button class="flow-btn-back" onclick="window.volverAlPanel()"><i data-lucide="arrow-left" class="w-4 h-4"></i> Panel</button>'
            + '  </div>'
            + '  <span class="flow-topbar-title">' + esc(cap.referencia) + '</span>'
            + '  <span class="flow-topbar-step">Completado</span>'
            + '</div>'
            + '<div class="flow-container">'
            + '  <div class="flow-resumen">'
            + '    <div class="flow-resumen-header">'
            + '      <div class="flow-resumen-icono">\ud83d\udcd6</div>'
            + '      <h2 class="flow-resumen-titulo">Cap\u00edtulo completado</h2>'
            + '      <div class="flow-resumen-ref">' + esc(cap.referencia) + ' \u2014 ' + esc(cap.titulo) + '</div>'
            + '    </div>'
            + '    <div class="flow-resumen-stats">'
            + '      <div class="flow-resumen-stat"><div class="numero green">' + aciertos + '</div><div class="etiqueta">Aciertos</div></div>'
            + '      <div class="flow-resumen-stat"><div class="numero ' + (incorrectas > 0 ? 'red' : 'green') + '">' + incorrectas + '</div><div class="etiqueta">Revisar</div></div>'
            + '      <div class="flow-resumen-stat"><div class="numero primary">' + (tieneNotas ? 'S\u00ed' : 'No') + '</div><div class="etiqueta">Notas</div></div>'
            + '      <div class="flow-resumen-stat"><div class="numero primary" style="font-size:1.2rem">' + fecha + '</div><div class="etiqueta">Fecha</div></div>'
            + '    </div>'
            + '    <div class="flow-resumen-mensaje">' + mensaje + '</div>'
            + '    <div class="flow-resumen-detalles" id="resumenDetalles" style="display:none">'
            + '      <h4 style="font-size:0.95rem;font-weight:700;color:var(--text);margin-bottom:10px">Detalle por pregunta</h4>'
            + detallesHtml
            + '    </div>'
            + '    <div class="flow-resumen-acciones">'
            + '      <button class="flow-btn-secondary" onclick="window.toggleResumenDetalles(this)"><i data-lucide="search" class="w-4 h-4"></i> Revisar respuestas</button>'
            + (siguiente
                ? '<button class="flow-btn-primary" onclick="window.abrirCapitulo(\'' + siguiente.id + '\')"><i data-lucide="arrow-right" class="w-5 h-5"></i> Siguiente cap\u00edtulo: ' + esc(siguiente.referencia) + '</button>'
                : '')
            + '      <button class="flow-btn-ghost" onclick="window.volverAlPanel()"><i data-lucide="arrow-left" class="w-4 h-4"></i> Volver al panel</button>'
            + '    </div>'
            + '  </div>'
            + '</div>';

        finalizarCapitulo(cap, aciertos, total).catch(function(e) {
            console.warn('Error guardando progreso final:', e);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function finalizarCapitulo(cap, aciertos, total) {
        if (!state.progress.studiedChapters.includes(cap.id)) {
            state.progress.studiedChapters.push(cap.id);
        }
        state.progress.currentChapter = cap.id;
        state.progress.currentStep = 'completado';
        await guardarProgreso();
        await registrarHistorial(cap.id, 'completado', state.progress.chapterAnswers || {}, aciertos, total);
    }

    window.toggleNotasPanel = function(btn) {
        var a = document.getElementById('notasArea');
        if (!a) return;
        a.classList.toggle('open');
        var isOpen = a.classList.contains('open');
        btn.innerHTML = isOpen
            ? '<i data-lucide="chevron-up" class="w-4 h-4"></i> Cerrar notas'
            : '<i data-lucide="pen-line" class="w-4 h-4"></i> Mis notas';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    window.toggleResumenDetalles = function(btn) {
        var d = document.getElementById('resumenDetalles');
        if (!d) return;
        var isHidden = d.style.display === 'none';
        d.style.display = isHidden ? 'block' : 'none';
        btn.innerHTML = isHidden
            ? '<i data-lucide="chevron-up" class="w-4 h-4"></i> Ocultar detalles'
            : '<i data-lucide="search" class="w-4 h-4"></i> Revisar respuestas';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    window.ESTUDIO_CURRICULUM = CURRICULUM;

    console.log('Estudio System v2 cargado');

})();
