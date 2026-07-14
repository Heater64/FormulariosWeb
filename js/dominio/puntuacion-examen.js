const puntuacionExamen = {
  _normalizarRespuesta(r) {
    return String(r).trim().toLowerCase().replace(/\s+/g, ' ');
  },
  _compararArrays(usuario, correcto) {
    try {
      const u = JSON.parse(usuario);
      const c = JSON.parse(correcto);
      if (!Array.isArray(u) || !Array.isArray(c)) return false;
      if (u.length !== c.length) return false;
      return u.every((val, i) => String(val).trim().toLowerCase() === String(c[i]).trim().toLowerCase());
    } catch (e) { return false; }
  },
  _compararRelaciones(usuario, correcto) {
    try {
      const u = typeof usuario === 'string' ? JSON.parse(usuario) : usuario;
      const c = typeof correcto === 'string' ? JSON.parse(correcto) : correcto;
      if (typeof u !== 'object' || typeof c !== 'object') return false;
      const uKeys = Object.keys(u).sort();
      const cKeys = Object.keys(c).sort();
      if (uKeys.length !== cKeys.length) return false;
      return uKeys.every(k => String(u[k]).trim().toLowerCase() === String(c[k]).trim().toLowerCase());
    } catch (e) { return false; }
  },
  esCorrecta(respuestaUsuario, respuestaCorrecta, tipo) {
    if (!respuestaUsuario && respuestaUsuario !== 0) return false;
    if (!respuestaCorrecta && respuestaCorrecta !== 0) return false;
    if (tipo === 'multiple' || tipo === 'verdadero_falso' || tipo === 'opcion_unica') {
      return String(respuestaUsuario) === String(respuestaCorrecta);
    }
    if (tipo === 'varias_opciones') {
      return this._compararArrays(respuestaUsuario, respuestaCorrecta);
    }
    if (tipo === 'relacionar') {
      return this._compararRelaciones(respuestaUsuario, respuestaCorrecta);
    }
    if (tipo === 'ordenar') {
      return this._compararArrays(respuestaUsuario, respuestaCorrecta);
    }
    if (tipo === 'respuesta_corta' || tipo === 'texto_corto') {
      return this._normalizarRespuesta(respuestaUsuario) === this._normalizarRespuesta(respuestaCorrecta);
    }
    if (tipo === 'texto_largo' || tipo === 'solo_numero') {
      if (tipo === 'solo_numero') {
        const n = parseFloat(respuestaUsuario);
        const r = parseFloat(respuestaCorrecta);
        return !isNaN(n) && !isNaN(r) && n === r;
      }
      return this._normalizarRespuesta(respuestaUsuario) === this._normalizarRespuesta(respuestaCorrecta);
    }
    if (tipo === 'completar') {
      const opciones = respuestaCorrecta.split('|').map(s => s.trim().toLowerCase());
      return opciones.includes(this._normalizarRespuesta(respuestaUsuario));
    }
    return false;
  },
  calcularPuntuacion(respuestas, preguntas) {
    let aciertos = 0;
    for (const p of preguntas) {
      const rUser = respuestas[p.id];
      if (rUser !== undefined && this.esCorrecta(rUser, p.respuesta_correcta, p.tipo)) {
        aciertos++;
      }
    }
    const total = preguntas.length;
    return {
      aciertos,
      total,
      porcentaje: total > 0 ? Math.round((aciertos / total) * 100) : 0,
      nota: total > 0 ? Math.round(((aciertos / total) * 10) * 100) / 100 : 0
    };
  },
  puntosPregunta(p) {
    return Number(p.puntos) || 1;
  },
  calcularConCorreccion(preguntas, respuestas, correccion) {
    let puntosObtenidos = 0, totalPuntos = 0, aciertos = 0;
    for (const p of preguntas) {
      const pts = this.puntosPregunta(p);
      totalPuntos += pts;
      const override = correccion && correccion[p.id];
      let esCorrecta;
      if (override && override.es_correcta !== undefined && override.es_correcta !== null) {
        esCorrecta = !!override.es_correcta;
      } else {
        esCorrecta = this.esCorrecta(respuestas[p.id], p.respuesta_correcta, p.tipo);
      }
      let puntos = 0;
      if (esCorrecta) {
        puntos = (override && override.puntos != null) ? Number(override.puntos) : pts;
        aciertos++;
      } else if (override && override.puntos != null) {
        puntos = Number(override.puntos);
      }
      puntosObtenidos += puntos;
    }
    const porcentaje = totalPuntos > 0 ? Math.round((puntosObtenidos / totalPuntos) * 100) : 0;
    const nota = totalPuntos > 0 ? Math.round(((puntosObtenidos / totalPuntos) * 10) * 100) / 100 : 0;
    return { aciertos, puntosObtenidos, totalPuntos, porcentaje, nota };
  },
  convertirNota(nota) {
    if (nota >= 9) return { letra: 'A', excelente: true };
    if (nota >= 8) return { letra: 'B', excelente: false };
    if (nota >= 7) return { letra: 'C', excelente: false };
    if (nota >= 6) return { letra: 'D', excelente: false };
    return { letra: 'F', excelente: false };
  }
};
window.puntuacionExamen = puntuacionExamen;
