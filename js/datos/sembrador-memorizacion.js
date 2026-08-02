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
    { ref: 'Salmo 46:1', texto: 'Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.' }
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
      'Profecías': profecias
    };

    let orden = 0;
    for (const def of DEFINICIONES) {
      const fuente = fuentes[def.nombre];
      if (!fuente || !Array.isArray(fuente) && !(fuente && typeof fuente === 'object')) {
        resumen.omitidos.push(`${def.nombre} (sin datos)`);
        continue;
      }
      const existente = await _existeMazoGlobal(def.nombre);
      if (existente) { resumen.omitidos.push(`${def.nombre} (ya existe)`); continue; }

      // Crear el mazo global
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
      if (errMazo || !mazo) { resumen.omitidos.push(`${def.nombre} (error)`); continue; }

      // Generar y crear las tarjetas (en lotes de 20)
      const tarjetas = def.generar(fuente) || [];
      const filas = tarjetas.map((t, i) => ({
        usuario_id: null,
        mazo_id: mazo.id,
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
      for (let i = 0; i < filas.length; i += 20) {
        const { error } = await sb().from('tarjetas_memorizacion').insert(filas.slice(i, i + 20));
        if (error) { resumen.omitidos.push(`${def.nombre} (error al insertar tarjetas)`); break; }
      }
      resumen.mazos += 1;
      resumen.tarjetas += filas.length;
    }

    return resumen;
  }

  window.sembradorMemorizacion = { sembrarTodo };
})();
