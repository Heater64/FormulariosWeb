(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────
     SEMBRADOR DE MAZOS — Memorización estilo juego
     Convierte el contenido curado de data/*.json en mazos y
     tarjetas globales (visibles para todos los usuarios).
     Idempotente: no duplica mazos con el mismo nombre global.
     ───────────────────────────────────────────────────────────── */

  const sb = () => window.supabaseClient;

  // ── Versículos famosos (curados) para el mazo "Versículos" ──
  const VERSICULOS_FAMOSOS = [
    { ref: 'Juan 3:16', texto: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree no se pierda, mas tenga vida eterna.' },
    { ref: 'Salmos 23:1', texto: 'Jehová es mi pastor; nada me faltará.' },
    { ref: 'Filipenses 4:13', texto: 'Todo lo puedo en Cristo que me fortalece.' },
    { ref: 'Proverbios 3:5', texto: 'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.' },
    { ref: 'Jeremías 29:11', texto: 'Porque yo sé los pensamientos que tengo acerca de vosotros, pensamientos de paz, y no de mal, para daros el fin que esperáis.' },
    { ref: 'Romanos 8:28', texto: 'Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien.' },
    { ref: 'Salmo 119:105', texto: 'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.' },
    { ref: 'Mateo 11:28', texto: 'Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.' },
    { ref: 'Génesis 1:1', texto: 'En el principio creó Dios los cielos y la tierra.' },
    { ref: '1 Corintios 13:4', texto: 'El amor es sufrido, es benigno; el amor no tiene envidia.' },
    { ref: 'Josué 1:9', texto: 'Esfuérzate y sé valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.' },
    { ref: 'Juan 14:6', texto: 'Jesús le dijo: Yo soy el camino, y la verdad, y la vida.' },
    { ref: 'Isaías 40:31', texto: 'Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas.' },
    { ref: 'Efesios 2:8', texto: 'Porque por gracia sois salvos por medio de la fe; y esto no de vosotros, pues es don de Dios.' },
    { ref: 'Salmo 46:1', texto: 'Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.' },
    { ref: 'Salmo 34:8', texto: 'Gustad, y ved que es bueno Jehová; dichoso el hombre que confía en él.' },
    { ref: 'Mateo 6:33', texto: 'Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.' },
    { ref: 'Salmo 27:1', texto: 'Jehová es mi luz y mi salvación; ¿de quién temeré? Jehová es la fortaleza de mi vida; ¿de quién he de atemorizarme?' },
    { ref: 'Romanos 12:2', texto: 'No os conforméis a este siglo, sino transformaos por medio de la renovación de vuestro entendimiento.' },
    { ref: 'Gálatas 5:22', texto: 'Mas el fruto del Espíritu es amor, gozo, paz, paciencia, benignidad, bondad, fe.' },
    { ref: 'Juan 14:27', texto: 'La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da.' },
    { ref: 'Salmo 121:1-2', texto: 'Alzaré mis ojos a los montes; ¿de dónde vendrá mi socorro? Mi socorro viene de Jehová, que hizo los cielos y la tierra.' },
    { ref: 'Proverbios 22:6', texto: 'Instruye al niño en su camino, y aun cuando fuere viejo no se apartará de él.' },
    { ref: '1 Juan 1:9', texto: 'Si confesamos nuestros pecados, él es fiel y justo para perdonar nuestros pecados y limpiarnos de toda maldad.' },
    { ref: 'Mateo 5:16', texto: 'Así alumbre vuestra luz delante de los hombres, para que vean vuestras buenas obras y glorifiquen a vuestro Padre.' },
    { ref: 'Hebreos 11:1', texto: 'Es, pues, la fe la certeza de lo que se espera, la convicción de lo que no se ve.' },
    { ref: 'Filipenses 4:6', texto: 'Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias.' },
    { ref: '2 Timoteo 3:16', texto: 'Toda la Escritura es inspirada por Dios, y útil para enseñar, para redargüir, para corregir, para instruir en justicia.' },
    { ref: 'Mateo 28:19', texto: 'Por tanto, id, y haced discípulos a todas las naciones, bautizándolos en el nombre del Padre, y del Hijo, y del Espíritu Santo.' }
  ];

  // ── Tarjetas extra del mazo "Desafío Bíblico" (juego de desafíos) ──
  const DESAFIO_BIBLICO = [
    { tipo: 'versiculo', pregunta: 'Juan 14:6', respuesta: 'Jesús le dijo: Yo soy el camino, y la verdad, y la vida; nadie viene al Padre sino por mí.', referencia: 'Juan 14:6', explicacion: 'Jesús se presentó como el único camino al Padre.' },
    { tipo: 'versiculo', pregunta: 'Romanos 8:28', respuesta: 'Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien.', referencia: 'Romanos 8:28', explicacion: 'Dios obra todas las cosas para el bien de los que le aman.' },
    { tipo: 'versiculo', pregunta: 'Mateo 11:28', respuesta: 'Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.', referencia: 'Mateo 11:28', explicacion: 'Jesús ofrece descanso a los cansados.' },
    { tipo: 'versiculo', pregunta: 'Jeremías 29:11', respuesta: 'Porque yo sé los pensamientos que tengo acerca de vosotros, pensamientos de paz, y no de mal.', referencia: 'Jeremías 29:11', explicacion: 'Dios tiene planes de bien para su pueblo.' },
    { tipo: 'multiple', pregunta: '¿Cuántos discípulos eligió Jesús?', respuesta: '12' },
    { tipo: 'multiple', pregunta: '¿Cuántos libros tiene el Nuevo Testamento?', respuesta: '27' },
    { tipo: 'multiple', pregunta: '¿Quién traicionó a Jesús?', respuesta: 'Judas Iscariote' },
    { tipo: 'multiple', pregunta: '¿Cuántos días estuvo Jesús en el desierto siendo tentado?', respuesta: '40' },
    { tipo: 'escrita', pregunta: '¿En qué ciudad nació Jesús?', respuesta: 'Belén' },
    { tipo: 'escrita', pregunta: '¿Quién fue el primer mártir cristiano?', respuesta: 'Esteban' },
    { tipo: 'escrita', pregunta: '¿Cómo se llamaba la esposa de Abraham?', respuesta: 'Sara' },
    { tipo: 'escrita', pregunta: '¿Qué profeta fue tragado por un gran pez?', respuesta: 'Jonás' },
    { tipo: 'verdadero_falso', pregunta: 'Moisés recibió los Diez Mandamientos en el monte Sinaí.', respuesta: 'true', explicacion: 'Éxodo 20 relata la entrega de la Ley en el Sinaí.' },
    { tipo: 'verdadero_falso', pregunta: 'La Biblia tiene 60 libros.', respuesta: 'false', explicacion: 'La Biblia protestante tiene 66 libros.' },
    { tipo: 'verdadero_falso', pregunta: 'Pedro negó a Jesús tres veces.', respuesta: 'true', explicacion: 'Mateo 26:69-75 narra las tres negaciones de Pedro.' }
  ];

  // ── Mazos temáticos generados desde data/*.json ──
  const DEFINICIONES = [
    {
      nombre: 'Versículos',
      icono: 'book-open',
      color: '#3B82F6',
      descripcion: 'Los versículos más conocidos de la Biblia. Completa, ordena y elige la cita correcta.',
      generar: () => VERSICULOS_FAMOSOS.map(v => ({
        tipo: 'versiculo',
        pregunta: v.ref,
        respuesta: v.texto,
        texto: v.texto,
        referencia: v.ref,
        explicacion: `Versículo de ${v.ref}. Memorízalo para aplicarlo en tu vida diaria.`,
        libro: (v.ref.split(' ')[0] || '').replace(/\d+$/, ''),
        capitulo: (v.ref.match(/\s(\d+):/) || [])[1] || '',
        versiculo: (v.ref.match(/:(\d+)/) || [])[1] || ''
      }))
    },
    {
      nombre: 'Personajes',
      icono: 'users',
      color: '#8B5CF6',
      descripcion: '¿Quién hizo qué? Conoce a los protagonistas de la historia bíblica.',
      generar: (d) => {
        const tarjetas = [];
        d.forEach(p => {
          (p.eventos || []).slice(0, 4).forEach(ev => {
            tarjetas.push({
              tipo: 'escrita',
              pregunta: `¿Quién ${ev.toLowerCase()}?`,
              respuesta: p.nombre.split(' (')[0].trim(),
              explicacion: p.detalle || '',
              referencia: (p.libros || [])[0] || ''
            });
          });
          if (p.nombre && p.detalle) {
            tarjetas.push({
              tipo: 'escrita',
              pregunta: `¿De quién hablamos? «${p.detalle.split('.')[0]}»`,
              respuesta: p.nombre.split(' (')[0].trim(),
              explicacion: p.detalle,
              referencia: (p.libros || [])[0] || ''
            });
          }
        });
        return tarjetas;
      }
    },
    {
      nombre: 'Lugares',
      icono: 'map-pin',
      color: '#10B981',
      descripcion: 'Belén, Jerusalén, el Jordán... Descubre la geografía de la Biblia.',
      generar: (d) => {
        const tarjetas = [];
        d.forEach(l => {
          (l.eventos || []).forEach(ev => {
            tarjetas.push({
              tipo: 'escrita',
              pregunta: `¿En qué lugar ${ev.toLowerCase()}?`,
              respuesta: l.nombre,
              explicacion: l.detalle || '',
              referencia: (l.refs || [])[0] || ''
            });
          });
          if (l.nombre && l.detalle) {
            tarjetas.push({
              tipo: 'escrita',
              pregunta: `¿Qué lugar es este? «${l.detalle.split('.')[0]}»`,
              respuesta: l.nombre,
              explicacion: l.detalle,
              referencia: (l.refs || [])[0] || ''
            });
          }
        });
        return tarjetas;
      }
    },
    {
      nombre: 'Cronología',
      icono: 'calendar',
      color: '#F59E0B',
      descripcion: 'De la creación al nuevo cielo. Ordena los grandes acontecimientos.',
      generar: (d) => d.map(e => ({
        tipo: 'escrita',
        pregunta: `¿Qué acontecimiento corresponde a ${e.periodo}?`,
        respuesta: e.evento,
        explicacion: e.detalle || '',
        referencia: (e.refs || [])[0] || ''
      }))
    },
    {
      nombre: 'Milagros',
      icono: 'zap',
      color: '#EC4899',
      descripcion: 'Las obras poderosas de Dios en el Antiguo y Nuevo Testamento.',
      generar: (d) => {
        const tarjetas = [];
        const listas = [
          ...(d.antiguo_testamento || []),
          ...(d.nuevo_testamento || [])
        ];
        listas.forEach(m => {
          tarjetas.push({
            tipo: 'escrita',
            pregunta: `¿Qué milagro es este? «${m.detalle.split('.')[0]}»`,
            respuesta: m.nombre,
            explicacion: m.detalle,
            referencia: m.ref || ''
          });
          tarjetas.push({
            tipo: 'verdadero_falso',
            pregunta: m.detalle,
            respuesta: 'true',
            opciones: { falsas: [`${m.nombre.split(' de ')[0]} no aparece en la Biblia.`] },
            explicacion: m.detalle,
            referencia: m.ref || ''
          });
        });
        return tarjetas;
      }
    },
    {
      nombre: 'Parábolas',
      icono: 'message-square',
      color: '#06B6D4',
      descripcion: 'Las historias que contó Jesús para enseñar grandes verdades.',
      generar: (d) => d.map(p => ({
        tipo: 'escrita',
        pregunta: `¿Qué parábola enseña «${p.leccion}»?`,
        respuesta: p.nombre,
        explicacion: `${p.detalle} Lección: ${p.leccion}`,
        referencia: p.ref || ''
      }))
    },
    {
      nombre: 'Curiosidades',
      icono: 'sparkles',
      color: '#84CC16',
      descripcion: 'Datos sorprendentes de la Biblia que te harán amar su lectura.',
      generar: (d) => {
        const tarjetas = [];
        d.forEach(cat => {
          (cat.items || []).forEach(it => {
            tarjetas.push({
              tipo: 'escrita',
              pregunta: `¿Sabías que...? ${it.titulo}`,
              respuesta: it.texto.split('.')[0],
              explicacion: it.texto,
              referencia: it.ref || ''
            });
          });
        });
        return tarjetas;
      }
    },
    {
      nombre: 'Objetos',
      icono: 'archive',
      color: '#EF4444',
      descripcion: 'El Arca, la Menorá, la honda de David... objetos con significado.',
      generar: (d) => d.map(o => ({
        tipo: 'escrita',
        pregunta: `¿Qué objeto bíblico es este? «${o.descripcion.split('.')[0]}»`,
        respuesta: o.nombre,
        explicacion: `${o.detalle || o.descripcion}`,
        referencia: (o.refs || [])[0] || ''
      }))
    },
    {
      nombre: 'Profecías',
      icono: 'eye',
      color: '#F97316',
      descripcion: 'Las profecías mesiánicas y su cumplimiento en Jesús.',
      generar: (d) => {
        const tarjetas = [];
        (d.mesianicas || []).forEach(p => {
          tarjetas.push({
            tipo: 'escrita',
            pregunta: `¿Qué profecía mesiánica se anuncia en ${p.profecia}?`,
            respuesta: p.nombre,
            explicacion: `${p.detalle} Se cumplió en ${p.cumplimiento}.`,
            referencia: p.profecia || ''
          });
        });
        return tarjetas;
      }
    },
    {
      nombre: 'Desafío Bíblico',
      icono: 'sword',
      color: '#F59E0B',
      descripcion: 'Preguntas rápidas de cultura bíblica para tus desafíos: versículos, datos y curiosidades.',
      generar: () => DESAFIO_BIBLICO.map(t => ({
        tipo: t.tipo,
        pregunta: t.pregunta,
        respuesta: t.respuesta,
        texto: t.tipo === 'versiculo' ? t.respuesta : '',
        referencia: t.referencia || '',
        explicacion: t.explicacion || '',
        libro: (t.referencia ? t.referencia.split(' ')[0].replace(/\d+$/, '') : ''),
        capitulo: (t.referencia ? (t.referencia.match(/\s(\d+):/) || [])[1] || '' : ''),
        versiculo: (t.referencia ? (t.referencia.match(/:(\d+)/) || [])[1] || '' : '')
      }))
    }
  ];

  async function _fetchJson(archivo) {
    try {
      const r = await fetch(`data/${archivo}`);
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }

  async function _existeMazoGlobal(nombre) {
    if (!sb()) return false;
    try {
      const { data } = await sb().from('mazos_memorizacion')
        .select('id')
        .eq('es_global', true)
        .eq('nombre', nombre)
        .limit(1);
      return (data && data.length > 0) ? data[0].id : null;
    } catch (e) { return false; }
  }

  /**
   * Sembra todos los mazos definidos. Devuelve un resumen.
   * @param {string|null} creadoPor id del perfil admin (o null)
   */
  async function sembrarTodo(creadoPor) {
    if (!sb()) return { ok: false, error: 'Sin conexión a Supabase' };
    const resumen = { mazos: 0, tarjetas: 0, omitidos: [] };

    // Cargar todos los JSON en paralelo (los que existan)
    const [personajes, lugares, cronologia, milagros, parabolas, curiosidades, objetos, profecias] = await Promise.all([
      _fetchJson('personajes.json'),
      _fetchJson('lugares.json'),
      _fetchJson('cronologia.json'),
      _fetchJson('milagros.json'),
      _fetchJson('parabolas.json'),
      _fetchJson('curiosidades.json'),
      _fetchJson('objetos.json'),
      _fetchJson('profecias.json')
    ]);
    const fuentes = {
      'Versículos': VERSICULOS_FAMOSOS,
      'Personajes': personajes,
      'Lugares': lugares,
      'Cronología': cronologia,
      'Milagros': milagros,
      'Parábolas': parabolas,
      'Curiosidades': curiosidades,
      'Objetos': objetos,
      'Profecías': profecias,
      'Desafío Bíblico': DESAFIO_BIBLICO
    };

    let orden = 0;
    for (const def of DEFINICIONES) {
      const fuente = fuentes[def.nombre];
      if (!fuente || !Array.isArray(fuente) && !(fuente && typeof fuente === 'object')) {
        resumen.omitidos.push(`${def.nombre} (sin datos)`);
        continue;
      }

      // Generar las tarjetas del mazo
      const tarjetas = def.generar(fuente) || [];
      const filas = tarjetas.map((t, i) => ({
        usuario_id: null,
        tipo: t.tipo,
        pregunta: t.pregunta || '',
        respuesta: t.respuesta || '',
        texto: t.texto || t.respuesta || '',
        referencia: t.referencia || '',
        explicacion: t.explicacion || '',
        opciones: t.opciones || null,
        libro: t.libro || '',
        capitulo: t.capitulo || '',
        versiculo: t.versiculo || '',
        orden: i,
        activa: true,
        creado_por: creadoPor || null
      }));

      const existente = await _existeMazoGlobal(def.nombre);
      if (!existente) {
        // Crear el mazo global nuevo
        const { data: mazo, error: errMazo } = await sb().from('mazos_memorizacion').insert({
          usuario_id: null,
          es_global: true,
          activo: true,
          nombre: def.nombre,
          descripcion: def.descripcion,
          icono: def.icono,
          color: def.color,
          orden: orden++,
          creado_por: creadoPor || null
        }).select().single();
        if (errMazo || !mazo) { resumen.omitidos.push(`${def.nombre} (error al crear mazo)`); continue; }
        resumen.mazos += 1;
        await _insertarTarjetas(mazo.id, filas, resumen, def.nombre);
        // Avisar del mazo nuevo (grupo + admin/owner) como al crear uno a mano
        if (window.notificationService) {
          window.notificationService.emitir('mazo.nuevo', {
            mazoId: mazo.id,
            nombre: def.nombre,
            adminId: creadoPor,
            datos: { mazo_id: mazo.id, mazo_nombre: def.nombre }
          }).catch(() => {});
        }
        continue;
      }

      // Mazo ya existente: refrescar metadatos y completar solo las tarjetas que falten (top-up idempotente)
      await sb().from('mazos_memorizacion')
        .update({ descripcion: def.descripcion, icono: def.icono, color: def.color })
        .eq('id', existente);
      const { data: actuales } = await sb().from('tarjetas_memorizacion')
        .select('pregunta, respuesta')
        .eq('mazo_id', existente);
      const clavesExistentes = new Set((actuales || []).map(t => (t.pregunta || '') + '\u0001' + (t.respuesta || '')));
      const nuevas = filas.filter(f => !clavesExistentes.has((f.pregunta || '') + '\u0001' + (f.respuesta || '')));
      if (nuevas.length === 0) {
        resumen.omitidos.push(`${def.nombre} (ya completo)`);
        continue;
      }
      const { data: maxOrden } = await sb().from('tarjetas_memorizacion')
        .select('orden')
        .eq('mazo_id', existente)
        .order('orden', { ascending: false })
        .limit(1);
      const baseOrden = (maxOrden && maxOrden.length ? maxOrden[0].orden : 0) + 1;
      nuevas.forEach((f, i) => { f.orden = baseOrden + i; });
      await _insertarTarjetas(existente, nuevas, resumen, def.nombre);
    }

    return resumen;
  }

  async function _insertarTarjetas(mazoId, filas, resumen, nombreMazo) {
    const conMazo = filas.map(f => ({ ...f, mazo_id: mazoId }));
    for (let i = 0; i < conMazo.length; i += 20) {
      const { error } = await sb().from('tarjetas_memorizacion').insert(conMazo.slice(i, i + 20));
      if (error) { resumen.omitidos.push(`${nombreMazo} (error al insertar tarjetas)`); return; }
    }
    resumen.tarjetas += conMazo.length;
  }

  window.sembradorMemorizacion = { sembrarTodo };
})();
