(function () {
  'use strict';

  /* ════════════════════════════════════════════════════════════
     MOTOR DE EJERCICIOS — Memorización estilo juego
     Genera ejercicios a partir de las tarjetas. Cada tarjeta se
     juega con el tipo que mejor se adapta a su contenido, y en
     sesión se mezclan automáticamente distintos tipos.

     Tipos núcleo (v1):
       - completar        → rellenar huecos de un versículo/texto
       - ordenar          → ordenar palabras para construir el texto
       - elegir_versiculo → elegir el texto correcto dada la referencia
       - verdadero_falso  → juzgar una afirmación
       - relacionar       → emparejar pares (ej: David → Goliat)
       - escrita          → escribir la respuesta y comparar

     Estructura de tarjeta (normalizada):
       { id, tipo, pregunta, respuesta, texto, referencia, explicacion,
         opciones, libro, capitulo, versiculo, pista }
     ════════════════════════════════════════════════════════════ */

  function limpiar(t) {
    return String(t || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quitar tildes
      .replace(/[^\p{L}\p{N}\s]/gu, '') // quitar puntuación
      .replace(/\s+/g, ' ')
      .trim();
  }

  function barajar(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function muestraAleatoria(arr, n) {
    return barajar(arr).slice(0, n);
  }

  function tokenizar(texto) {
    return String(texto || '').split(/\s+/).filter(Boolean);
  }

  /* ¿El texto es un versículo extenso (más de 6 palabras)? */
  function esTextoExtenso(texto) {
    return tokenizar(texto).length >= 6;
  }

  /* Genera huecos (palabras omitidas) para "completar" */
  function generarHuecos(texto, num) {
    const palabras = tokenizar(texto);
    const numHuecos = Math.min(num || 1, Math.max(1, Math.floor(palabras.length / 6)));
    const candidatos = [];
    for (let i = 0; i < palabras.length; i++) {
      const limpia = limpiar(palabras[i]);
      if (limpia.length > 2) candidatos.push(i);
    }
    const elegidas = new Set(muestraAleatoria(candidatos, numHuecos));
    return palabras.map((p, i) => ({ palabra: p, hueco: elegidas.has(i) }));
  }

  /* ── Generación de distractores (opciones incorrectas) ── */
  function distractores(tarjeta, banco, n) {
    const pool = (banco || [])
      .filter(b => b && b.id !== tarjeta.id)
      .map(b => b.respuesta || b.texto || '')
      .filter(Boolean);
    const unicos = [...new Set(pool.map(p => limpiar(p)))];
    const elegidos = [];
    while (elegidos.length < n && unicos.length) {
      const idx = Math.floor(Math.random() * unicos.length);
      const texto = unicos.splice(idx, 1)[0];
      if (texto && limpiar(texto) !== limpiar(tarjeta.respuesta)) elegidos.push(texto);
    }
    return elegidos;
  }

  /* ── Tipos de ejercicio por tarjeta ── */
  const GENERADORES = {

    /* TIPO 1: COMPLETAR PALABRAS */
    completar(tarjeta) {
      const texto = tarjeta.texto || tarjeta.respuesta || '';
      const tokens = generarHuecos(texto, 2);
      const huecos = tokens.filter(t => t.hueco);
      if (!huecos.length) return null;
      const respuestas = huecos.map(h => h.palabra);
      return {
        tipo: 'completar',
        instruccion: 'Completa las palabras que faltan',
        enunciado: tokens.map(t => t.hueco ? '_____' : t.palabra).join(' '),
        huecos,
        respuestas,
        respuestaCorrecta: respuestas,
        verificar: (vals) => respuestas.map((r, i) => limpiar(vals[i]) === limpiar(r)),
        referencia: tarjeta.referencia,
        explicacion: tarjeta.explicacion,
        pista: tarjeta.pista
      };
    },

    /* TIPO 2: ORDENAR PALABRAS */
    ordenar(tarjeta) {
      const texto = tarjeta.texto || tarjeta.respuesta || '';
      const palabras = tokenizar(texto);
      if (palabras.length < 4) return null;
      // Agrupar: el usuario construye palabra por palabra
      const opciones = barajar(palabras);
      return {
        tipo: 'ordenar',
        instruccion: 'Toca las palabras en el orden correcto',
        enunciado: tarjeta.referencia || 'Construye el texto',
        palabras: opciones,
        respuestaCorrecta: palabras,
        verificar: (orden) => JSON.stringify(orden.map(limpiar)) === JSON.stringify(palabras.map(limpiar)),
        referencia: tarjeta.referencia,
        explicacion: tarjeta.explicacion,
        pista: tarjeta.pista
      };
    },

    /* TIPO 3: ELEGIR EL VERSÍCULO */
    elegir_versiculo(tarjeta, banco) {
      const correcta = tarjeta.texto || tarjeta.respuesta || '';
      if (!correcta || !tarjeta.referencia) return null;
      const malas = distractores(tarjeta, banco, 3);
      if (malas.length < 2) return null;
      const opciones = barajar([correcta, ...malas]);
      return {
        tipo: 'elegir_versiculo',
        instruccion: `¿Cuál es el texto de ${tarjeta.referencia}?`,
        enunciado: tarjeta.referencia,
        opciones,
        respuestaCorrecta: correcta,
        verificar: (sel) => limpiar(sel) === limpiar(correcta),
        referencia: tarjeta.referencia,
        explicacion: tarjeta.explicacion,
        pista: tarjeta.pista
      };
    },

    /* TIPO 9: VERDADERO O FALSO */
    verdadero_falso(tarjeta) {
      const afirmacion = tarjeta.pregunta || tarjeta.texto || '';
      if (!afirmacion) return null;
      const esVerdadero = String(tarjeta.respuesta).toLowerCase() === 'true' || ['v', 'verdadero'].includes(String(tarjeta.respuesta).toLowerCase());
      // Si el admin proporcionó falsas, usarlas como variante
      const falsas = (tarjeta.opciones && tarjeta.opciones.falsas) || [];
      return {
        tipo: 'verdadero_falso',
        instruccion: '¿Verdadero o falso?',
        enunciado: afirmacion,
        esVerdadero,
        falsas,
        respuestaCorrecta: esVerdadero ? 'Verdadero' : 'Falso',
        verificar: (sel) => (sel === 'Verdadero') === esVerdadero,
        referencia: tarjeta.referencia,
        explicacion: tarjeta.explicacion,
        pista: tarjeta.pista
      };
    },

    /* TIPO 8: RELACIONAR */
    relacionar(tarjeta, banco) {
      // pares definidos por el admin en opciones.pares: [[izq, der], ...]
      const pares = (tarjeta.opciones && tarjeta.opciones.pares) || [];
      if (pares.length >= 2) return this._relacionarPares(pares, tarjeta);
      // Auto-generar: un par principal (respuesta → referencia) + otros del banco
      if (!tarjeta.respuesta || !tarjeta.pregunta) return null;
      const principal = [tarjeta.pregunta, tarjeta.respuesta];
      const extra = (banco || [])
        .filter(b => b.id !== tarjeta.id && b.pregunta && b.respuesta)
        .slice(0, 3)
        .map(b => [b.pregunta, b.respuesta]);
      const todos = barajar([principal, ...extra]);
      if (todos.length < 2) return null;
      return this._relacionarPares(todos, tarjeta);
    },

    _relacionarPares(pares, tarjeta) {
      const izq = barajar(pares.map(p => p[0]));
      const der = barajar(pares.map(p => p[1]));
      const mapa = {};
      pares.forEach(p => { mapa[limpiar(p[0])] = p[1]; });
      return {
        tipo: 'relacionar',
        instruccion: 'Empareja cada elemento con su pareja',
        izquierda: izq,
        derecha: der,
        pares,
        respuestaCorrecta: mapa,
        verificar: (asociaciones) => {
          return pares.every(([i, d]) => {
            const sel = asociaciones[limpiar(i)];
            return sel && limpiar(sel) === limpiar(d);
          });
        },
        referencia: tarjeta.referencia,
        explicacion: tarjeta.explicacion,
        pista: tarjeta.pista
      };
    },

    /* TIPO 11: RESPUESTA ESCRITA */
    escrita(tarjeta) {
      const pregunta = tarjeta.pregunta || tarjeta.referencia || '';
      const respuesta = tarjeta.respuesta || tarjeta.texto || '';
      if (!pregunta || !respuesta) return null;
      return {
        tipo: 'escrita',
        instruccion: 'Escribe tu respuesta',
        enunciado: pregunta,
        respuestaCorrecta: respuesta,
        // acepta variantes: primera palabra o el texto completo
        verificar: (val) => {
          const v = limpiar(val);
          const r = limpiar(respuesta);
          if (!v) return false;
          if (v === r) return true;
          // tolerancia: si la respuesta es larga, aceptar coincidencia de >60% de palabras
          const palabrasR = tokenizar(r).length;
          if (palabrasR >= 4) {
            const coincide = tokenizar(v).filter(w => r.includes(w)).length;
            return coincide / palabrasR >= 0.6;
          }
          return false;
        },
        referencia: tarjeta.referencia,
        explicacion: tarjeta.explicacion,
        pista: tarjeta.pista
      };
    }
  };

  /* ── Elegir el mejor tipo de ejercicio para una tarjeta ──
     Devuelve una lista de generadores aplicables ordenados. */
  function tiposAplicables(tarjeta) {
    const tipos = [];
    const tipoDeclarado = (tarjeta.tipo || 'versiculo');
    switch (tipoDeclarado) {
      case 'versiculo':
        if (esTextoExtenso(tarjeta.texto)) tipos.push('completar', 'ordenar', 'elegir_versiculo');
        else if (tarjeta.referencia) tipos.push('elegir_versiculo');
        break;
      case 'completar': tipos.push('completar'); break;
      case 'ordenar': tipos.push('ordenar'); break;
      case 'elegir_versiculo': tipos.push('elegir_versiculo'); break;
      case 'verdadero_falso': tipos.push('verdadero_falso'); break;
      case 'relacionar': tipos.push('relacionar'); break;
      case 'escrita': tipos.push('escrita'); break;
      case 'libre': tipos.push('escrita'); break;
      default: tipos.push('escrita');
    }
    return tipos;
  }

  /**
   * Genera un ejercicio para una tarjeta.
   * @param {object} tarjeta tarjeta normalizada
   * @param {array} banco resto de tarjetas (para distractores/relacionar)
   * @param {array|null} soloTipos tipos permitidos (mezcla de sesión)
   */
  function generarEjercicio(tarjeta, banco, soloTipos) {
    let aplicables = tiposAplicables(tarjeta);
    if (soloTipos && soloTipos.length) {
      aplicables = aplicables.filter(t => soloTipos.includes(t));
    }
    if (!aplicables.length) aplicables = tiposAplicables(tarjeta);
    if (!aplicables.length) return null;
    // elegir uno aleatorio de los aplicables
    const tipo = aplicables[Math.floor(Math.random() * aplicables.length)];
    const ejercicio = GENERADORES[tipo] ? GENERADORES[tipo].call(GENERADORES, tarjeta, banco || []) : null;
    if (ejercicio) ejercicio.tarjetaId = tarjeta.id;
    return ejercicio;
  }

  /**
   * Construye la mezcla de una sesión: reparte las tarjetas
   * entre los tipos de ejercicio para que varíen sin repetirse
   * siempre el mismo tipo. Las tarjetas falladas se repiten.
   */
  function construirSesion(tarjetas, banco, { maxTarjetas = 12 } = {}) {
    const lista = [...tarjetas];
    const resultado = [];
    const tiposDisponibles = ['completar', 'ordenar', 'elegir_versiculo', 'verdadero_falso', 'relacionar', 'escrita'];
    let idx = 0;
    while (resultado.length < maxTarjetas && lista.length) {
      const tarjeta = lista[idx % lista.length];
      idx++;
      // Rotar el tipo por posición para mezclar
      const tipoRota = tiposDisponibles[resultado.length % tiposDisponibles.length];
      const ejercicio = generarEjercicio(tarjeta, banco, [tipoRota]);
      if (ejercicio) resultado.push(ejercicio);
      if (idx >= lista.length * 2) break; // seguridad: no bucles infinitos
    }
    if (!resultado.length) {
      // Fallback: un ejercicio cualquiera por tarjeta
      for (const t of lista.slice(0, maxTarjetas)) {
        const ej = generarEjercicio(t, banco);
        if (ej) resultado.push(ej);
      }
    }
    return resultado;
  }

  /* ── Serialización de sesiones para DESAFÍOS ──
     En un desafío todos los participantes deben recibir EXACTAMENTE la
     misma sesión: mismas preguntas, mismo orden, mismas opciones y mismo
     tiempo. Los ejercicios llevan funciones `verificar` (closures, no
     serializables), así que se guardan solo los datos y al cargar se
     re-engancha el verificador según el tipo. */
  function serializarSesion(sesion) {
    return (sesion || []).map(ej => {
      const { verificar, ...datos } = ej;
      return datos;
    });
  }

  function hidratarSesion(lista) {
    return (lista || []).map(ej => {
      switch (ej.tipo) {
        case 'completar':
          ej.verificar = (vals) => (ej.respuestas || []).map((r, i) => limpiar(vals[i]) === limpiar(r));
          break;
        case 'ordenar':
          ej.verificar = (orden) =>
            JSON.stringify((orden || []).map(limpiar)) === JSON.stringify((ej.respuestaCorrecta || []).map(limpiar));
          break;
        case 'elegir_versiculo':
          ej.verificar = (sel) => limpiar(sel) === limpiar(ej.respuestaCorrecta);
          break;
        case 'verdadero_falso':
          ej.verificar = (sel) => (sel === 'Verdadero') === ej.esVerdadero;
          break;
        case 'relacionar': {
          const pares = ej.pares || [];
          ej.verificar = (aso) => pares.every(([i, d]) => {
            const sel = aso[limpiar(i)];
            return sel && limpiar(sel) === limpiar(d);
          });
          break;
        }
        case 'escrita':
          ej.verificar = (val) => {
            const v = limpiar(val);
            const r = limpiar(ej.respuestaCorrecta || '');
            if (!v) return false;
            if (v === r) return true;
            const palabrasR = tokenizar(r).length;
            if (palabrasR >= 4) {
              const coincide = tokenizar(v).filter(w => r.includes(w)).length;
              return coincide / palabrasR >= 0.6;
            }
            return false;
          };
          break;
      }
      return ej;
    });
  }

  window.ejerciciosMemorizacion = {
    limpiar,
    generarEjercicio,
    construirSesion,
    tiposAplicables,
    serializarSesion,
    hidratarSesion
  };
})();
