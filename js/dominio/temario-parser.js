(function (window) {
  'use strict';

  // ============================================================================
  // temario-parser.js — Interpretación determinista del texto del profesor
  // ----------------------------------------------------------------------------
  // Entrada: el mensaje tal cual lo escribe el profesor (una línea por
  // elemento) + el catálogo de libros (libros_biblicos: nombre, abreviatura,
  // num_capitulos). Salida: { items, avisos, resumen }.
  //
  // Sin dependencias ni IA: léxico de libros + regex + reglas de clasificación.
  // El parser NUNCA descarta texto: toda línea genera un elemento (si no se
  // interpreta, queda tipo 'texto' con aviso para que el profesor lo revise).
  //
  // Tipos de elemento:
  //   referencia   → solo referencias de estudio
  //   observacion  → instrucción «fijarse en…» vinculada a sus referencias
  //   tarea        → «averiguar/cuántos…» (p. ej. nº de capítulos de un libro)
  //   texto        → línea no interpretada (fallback revisable)
  //
// Herencia en una línea: «Génesis 49:33; y 50:3» → la 2.ª referencia
// sigue siendo de Génesis; «2 Crónicas 18:3; 18:29 y 1 Reyes 22:30»
// cambia de libro cuando aparece uno nuevo.
//
// Familias: «Crónicas 30:2» sin 1./2. se resuelve por número de capítulo
// (30 solo existe en 2 Crónicas), así que no genera ningún aviso.
  //
  // Posiciones: la normalización es 1:1 (mismas longitudes), así que las
  // posiciones del texto normalizado coinciden con las del original y se puede
  // enmascarar lo ya interpretado para buscar avisos sobre el texto original.
  // ============================================================================

  // Alias frecuentes que no aparecen en abreviatura/nombre de la BD.
  // Clave = nombre canónico exacto del catálogo.
  const ALIAS = {
    'Génesis': ['gn', 'gen'],
    'Éxodo': ['ex', 'exo'],
    'Levítico': ['lev'],
    'Números': ['nm'],
    'Deuteronomio': ['deu'],
    'Jueces': ['juz'],
    '1 Samuel': ['1 sam'],
    '2 Samuel': ['2 sam'],
    '1 Reyes': ['1 rey'],
    '2 Reyes': ['2 rey'],
    '1 Crónicas': ['1 cron'],
    '2 Crónicas': ['2 cron'],
    'Salmos': ['sal', 'salmo'],
    'Proverbios': ['prov'],
    'Eclesiastés': ['ecle'],
    'Isaías': ['isa'],
    'Jeremías': ['jer'],
    'Ezequiel': ['ezq'],
    'Mateo': ['mt', 'mte'],
    'Marcos': ['mrk'],
    'Lucas': ['luc'],
    'Hechos': ['hech'],
    'Romanos': ['rom'],
    '1 Corintios': ['1 cor'],
    '2 Corintios': ['2 cor'],
    'Gálatas': ['gal'],
    'Efesios': ['efs'],
    'Colosenses': ['col'],
    '1 Tesalonicenses': ['1 tes'],
    '2 Tesalonicenses': ['2 tes'],
    '1 Timoteo': ['1 tim'],
    '2 Timoteo': ['2 tim'],
    'Santiago': ['sant'],
    '1 Pedro': ['1 ped'],
    '2 Pedro': ['2 ped'],
    'Hebreos': ['heb'],
    'Apocalipsis': ['apo', 'apoc'],
    'Filemón': ['flm']
  };

  // Tarea: se investiga algo. Gana a observación si la línea trae ambas
  // («Fijarse cuántos capítulos tiene el libro de Isaías»).
  const RE_TAREA = /\b(cuantos|cuantas|averiguar|averigua|averiguen|descubre|descubrir|descubran|investigar|investiga|investiguen|numero\s+de)\b/;
  // Observación: «fijarse / observar / anotar…» sobre una referencia.
  const RE_OBSERVACION = /\b(fijarse|fijate|fijense|fijarnos|observar|observa|observen|anotar|anota|anoten|atencion|acordarse|reparar)\b/;

  // Palabras que NO son libros aunque vayan seguidas de números
  // («Examen 39», «Tema 4»…): evitan falsos avisos de libro desconocido.
  const STOP_DESCONOCIDO = new Set([
    'examen', 'prueba', 'unidad', 'leccion', 'tema', 'dia', 'pregunta',
    'ejercicio', 'pagina', 'punto', 'numero', 'versiculo', 'versiculos',
    'texto', 'libro', 'capitulo', 'capitulos', 'caps', 'anote', 'anotar',
    'estudio', 'estudiar', 'leer', 'lectura', 'memorizar', 'referencia',
    'tarea', 'linea', 'apartado', 'apartados', 'temario', 'semana',
    'clase', 'parte', 'nota', 'objetivo', 'aprende', 'estudia'
  ]);

  // Normalización 1:1 (misma longitud): minúsculas, sin acentos, puntos en
  // espacio («1 S.» → «1 s »). Sin colapsar espacios para conservar posiciones.
  function normalizar(texto) {
    return String(texto == null ? '' : texto)
      .toLowerCase()
      .replace(/[áàâä]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôöõ]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/ç/g, 'c')
      .replace(/\./g, ' ');
  }

  function escapar(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function construirLexicono(catalogo) {
    const canonicos = new Map();   // variante normalizada → libro
    const aliases = new Map();

    const entradaDe = (libro) => ({
      nombre: libro.nombre,
      num_capitulos: Number(libro.num_capitulos) || 0
    });

    // 1.ª pasada: nombres y abreviaturas del catálogo (mandan sobre alias).
    for (const libro of catalogo || []) {
      if (!libro || !libro.nombre) continue;
      const entrada = entradaDe(libro);
      for (const clave of [libro.nombre, libro.abreviatura]) {
        if (!clave) continue;
        const v = normalizar(clave).trim();
        if (v && !canonicos.has(v)) canonicos.set(v, entrada);
      }
    }
    // 2.ª pasada: alias propios, solo si no pisan nada canónico.
    for (const libro of catalogo || []) {
      if (!libro || !libro.nombre) continue;
      const canonica = canonicos.get(normalizar(libro.nombre).trim());
      if (!canonica) continue;
      for (const alt of ALIAS[libro.nombre] || []) {
        const v = normalizar(alt).trim();
        if (v && !canonicos.has(v) && !aliases.has(v)) aliases.set(v, canonica);
      }
    }

    const variantes = new Map([...canonicos, ...aliases]);
    // 3.ª pasada: libros numerados («1 Crónicas»/«2 Crónicas»…). El nombre
    // sin el número («Crónicas 30:2») se resuelve por número de capítulo en
    // procesarLinea, así que aquí solo se registra la entrada «familia».
    const familias = new Map();
    for (const libro of catalogo || []) {
      if (!libro || !libro.nombre) continue;
      const mFam = /^([12])\s+(.+)$/.exec(libro.nombre.trim());
      if (!mFam) continue;
      const canonica = canonicos.get(normalizar(libro.nombre).trim());
      if (!canonica) continue;
      const clave = normalizar(mFam[2]).trim();
      if (!clave) continue;
      if (!familias.has(clave)) familias.set(clave, []);
      familias.get(clave).push(canonica);
    }
    for (const [clave, alternativas] of familias) {
      // Hace falta la pareja completa y que el nombre sin número no pise
      // nada ya registrado.
      if (alternativas.length < 2 || canonicos.has(clave) || aliases.has(clave)) continue;
      const ordenadasFam = alternativas.slice().sort((a, b) => (a.nombre < b.nombre ? -1 : 1));
      variantes.set(clave, {
        nombre: ordenadasFam[0].nombre,
        num_capitulos: ordenadasFam[0].num_capitulos,
        alternativas: ordenadasFam
      });
    }

    // Más largo primero: «2 cronicas» antes que «2 cr».
    const ordenadas = Array.from(variantes.keys()).sort((a, b) => b.length - a.length);
    const fuentes = ordenadas.map((v) => escapar(v).split(/\s+/).join('\\s*'));
    const patronLibros = fuentes.length
      ? new RegExp(`(?<![a-z0-9])(?:${fuentes.join('|')})(?![a-záéíóúüñ])`, 'g')
      : null;

    return { variantes, patronLibros };
  }

  // Cola tras un libro: «cap 21:10-11», «21:10-11», «107», «49-50», «5:4-6:2».
  // Devuelve los campos de la referencia + `fin` (posición absoluta de corte).
  function parsearCola(norm, inicio) {
    const desde = norm.slice(inicio);
    const m0 = /^\s*((?:caps?|capitulos?)\s+)?(\d{1,3})\s*(?::\s*(\d{1,3}))?/.exec(desde);
    if (!m0) return null;

    const capitulo = parseInt(m0[2], 10);
    const versiculo = m0[3] !== undefined ? parseInt(m0[3], 10) : null;
    let fin = inicio + m0[0].length;
    let capituloFin = null;
    let versiculosFin = null;
    let versiculosRango = null;

    const resto = desde.slice(m0[0].length);
    const mRango = /^\s*[-–—]\s*(\d{1,3})(\s*:\s*(\d{1,3}))?/.exec(resto);
    if (mRango) {
      const segundo = parseInt(mRango[1], 10);
      if (mRango[2] !== undefined) {
        // «5:4-6:2» → de capítulo 5 v4 a capítulo 6 v2
        capituloFin = segundo;
        versiculosFin = parseInt(mRango[3], 10);
      } else if (versiculo === null) {
        // «49-50» → rango de capítulos
        capituloFin = segundo;
      } else {
        // «21:10-11» → rango de versículos
        versiculosRango = segundo;
      }
      fin += mRango[0].length;
    }

    const ref = { capitulo };
    if (versiculo !== null) {
      ref.versiculos = versiculosRango !== null ? `${versiculo}-${versiculosRango}` : String(versiculo);
    }
    if (capituloFin !== null) ref.capitulo_fin = capituloFin;
    if (versiculosFin !== null) ref.versiculos_fin = String(versiculosFin);
    ref.fin = fin;
    return ref;
  }

  // Conectores reales de enumeración antes de una referencia sin libro:
  // «; y 50:3», «, 18:29», « y 22:30»…
  function connectorValido(antes) {
    return /(?:^|[,;])\s*(?:y|e)?\s*$/.test(antes) || /(?:^|\s)(?:y|e)\s*$/.test(antes);
  }

  function validarRef(ref, libro, linea, id, avisos) {
    const tope = libro.num_capitulos;
    const comprobar = (cap) => {
      if (cap == null || !Number.isFinite(cap)) return false;
      if (cap < 1 || (tope > 0 && cap > tope)) {
        avisos.push({
          id,
          linea,
          tipo: 'capitulo_fuera_rango',
          mensaje: `El capítulo ${cap} no existe en ${libro.nombre}${tope > 0 ? ` (1–${tope})` : ''}`
        });
        return false;
      }
      return true;
    };
    const ok = comprobar(ref.capitulo);
    if (ref.capitulo_fin != null) comprobar(ref.capitulo_fin);
    return ok;
  }

  // Avisa de «Palabra 30» con la palabra desconocida (solo mayúsculas,
  // fuera de lo ya interpretado y fuera de la lista de palabras comunes).
  function detectarLibroDesconocido(original, consumido, variantes, linea, id, avisos) {
    const enmascarado = original
      .split('')
      .map((c, i) => (consumido[i] ? ' ' : c))
      .join('');
    const re = /(?<![A-Za-zÁÉÍÓÚÑáéíóúñ0-9])([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]{3,})(?=\s+\d{1,3}(?:\s*:\s*\d+)?)/g;
    let m;
    while ((m = re.exec(enmascarado)) !== null) {
      const palabra = normalizar(m[1]).trim();
      if (!palabra || variantes.has(palabra) || STOP_DESCONOCIDO.has(palabra)) continue;
      avisos.push({
        id,
        linea,
        tipo: 'libro_desconocido',
        mensaje: `No reconozco «${m[1]}» como libro de la Biblia; revísalo`
      });
    }
  }

  // «Crónicas 30:2» sin 1./2.: elige el libro de la familia donde el
  // capítulo cabe (30 solo existe en 2 Crónicas). Sin capítulo o si no cabe
  // ninguno, queda el de más capítulos y el aviso de rango lo da validarRef.
  function resolverFamilia(alternativas, cola) {
    if (!cola) return alternativas[0];
    const capMax = cola.capitulo_fin != null ? cola.capitulo_fin : cola.capitulo;
    const cabe = alternativas.find((a) => a.num_capitulos > 0 && capMax <= a.num_capitulos);
    if (cabe) return cabe;
    return alternativas.reduce(
      (mayor, a) => (a.num_capitulos > mayor.num_capitulos ? a : mayor),
      alternativas[0]
    );
  }

  function clasificar(norm, refs) {
    if (RE_TAREA.test(norm)) return 'tarea';
    if (RE_OBSERVACION.test(norm)) return 'observacion';
    if (refs.length) return 'referencia';
    return 'texto';
  }

  // Interpreta una línea. Devuelve { refs, tipo, consumido } donde `consumido`
  // es un array booleano de posiciones del texto original ya interpretadas.
  function procesarLinea(raw, indice, lex, id, avisos) {
    const norm = normalizar(raw);
    const consumido = new Array(raw.length).fill(false);
    const refs = [];
    let ultimoLibro = null;
    let pos = 0;

    const marcar = (desde, hasta) => {
      for (let i = Math.max(0, desde); i < Math.min(raw.length, hasta); i++) consumido[i] = true;
    };

    while (pos < norm.length) {
      // ── Candidatos: próximo libro conocido vs. próxima ref sin libro ──
      let libroMatch = null;
      if (lex.patronLibros) {
        lex.patronLibros.lastIndex = pos;
        libroMatch = lex.patronLibros.exec(norm);
      }

      let bareMatch = null;
      if (ultimoLibro) {
        const reBare = /(?<![a-z0-9:])(\d{1,3})(?:\s*:\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?)?(?!\d)(?!\s*[a-záéíóúüñ]{2,})/g;
        reBare.lastIndex = pos;
        bareMatch = reBare.exec(norm);
        if (bareMatch && !connectorValido(norm.slice(pos, bareMatch.index))) bareMatch = null;
      }

      const idxLibro = libroMatch ? libroMatch.index : Infinity;
      const idxBare = bareMatch ? bareMatch.index : Infinity;

      // ── Libro conocido en esta posición ──
      if (libroMatch && idxLibro <= idxBare) {
        const variante = normalizar(libroMatch[0]).trim();
        const entrada = lex.variantes.get(variante);
        const finLibro = libroMatch.index + libroMatch[0].length;
        const cola = parsearCola(norm, finLibro);
        const libro = entrada && entrada.alternativas
          ? resolverFamilia(entrada.alternativas, cola)
          : entrada;
        const antes = norm.slice(0, libroMatch.index);
        const esPrimero = antes.trim() === '';
        const trasLibro = /(?:el\s+|la\s+|los\s+|las\s+)?libro\s+(?:de|del)\s*$/.test(antes.slice(-30));

        if (cola) {
          const { fin, ...campos } = cola;
          const ref = Object.assign({ libro: libro.nombre }, campos);
          refs.push(ref);
          validarRef(ref, libro, indice + 1, id, avisos);
          ultimoLibro = libro;
          pos = fin;
          marcar(libroMatch.index, fin);
        } else if (esPrimero || trasLibro) {
          // Libro sin capítulo: «Isaías» solo o «…del libro de Isaías».
          refs.push({ libro: libro.nombre });
          ultimoLibro = libro;
          pos = finLibro;
          marcar(libroMatch.index, finLibro);
        } else {
          // Mención que no es referencia (p. ej. «un salmo corto»).
          pos = finLibro;
        }
        continue;
      }

      // ── Referencia sin libro: hereda el último libro de la línea ──
      if (bareMatch && ultimoLibro) {
        const capitulo = parseInt(bareMatch[1], 10);
        const ref = { libro: ultimoLibro.nombre, capitulo };
        if (bareMatch[2] !== undefined) {
          const verso = parseInt(bareMatch[2], 10);
          ref.versiculos = bareMatch[3] !== undefined
            ? `${verso}-${parseInt(bareMatch[3], 10)}`
            : String(verso);
        }
        refs.push(ref);
        validarRef(ref, ultimoLibro, indice + 1, id, avisos);
        const fin = bareMatch.index + bareMatch[0].length;
        pos = fin;
        marcar(bareMatch.index, fin);
        continue;
      }

      // ── Nada que interpretar aquí: saltar al próximo carácter límite ──
      const reAvance = /(?<![a-z0-9])(?:\d{1,3}|[a-záéíóúüñ])/g;
      reAvance.lastIndex = pos;
      const avance = reAvance.exec(norm);
      pos = avance ? avance.index + avance[0].length : norm.length;
    }

    return { refs, tipo: clasificar(norm, refs), consumido };
  }

  function parse(texto, catalogo) {
    const crudo = String(texto == null ? '' : texto);
    const items = [];
    const avisos = [];

    if (!crudo.trim()) {
      return { items, avisos, resumen: { referencia: 0, observacion: 0, tarea: 0, texto: 0, avisos: 0 } };
    }

    const lex = construirLexicono(catalogo);
    const lineas = crudo.split(/\r?\n/);

    lineas.forEach((raw, indice) => {
      if (!raw.trim()) return;

      const id = `t${items.length + 1}`;
      const { refs, tipo, consumido } = procesarLinea(raw, indice, lex, id, avisos);
      detectarLibroDesconocido(raw, consumido, lex.variantes, indice + 1, id, avisos);

      if (!refs.length) {
        avisos.push({
          id,
          linea: indice + 1,
          tipo: tipo === 'texto' ? 'linea_sin_interpretar' : 'sin_referencia',
          mensaje: tipo === 'texto'
            ? 'No he reconocido esta línea; revísala o edítala a mano'
            : 'No encuentro ninguna referencia bíblica en esta línea'
        });
      }

      const tieneAvisos = avisos.some((a) => a.id === id);
      items.push({
        id,
        tipo,
        texto: raw.trim(),
        refs,
        nota: '',
        orden: items.length,
        estado: refs.length && !tieneAvisos ? 'ok' : 'revisar'
      });
    });

    const resumen = { referencia: 0, observacion: 0, tarea: 0, texto: 0, avisos: avisos.length };
    for (const item of items) resumen[item.tipo] = (resumen[item.tipo] || 0) + 1;

    return { items, avisos, resumen };
  }

  window.temarioParser = {
    parse,
    interpretar: parse,
    // Expuestos para pruebas unitarias.
    _normalizar: normalizar,
    _construirLexicono: construirLexicono,
    _parsearCola: parsearCola
  };
})(window);
