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
  _esCorrectoHueco(respuesta, hueco) {
    if (!respuesta && respuesta !== 0) return false;
    const normalizada = this._normalizarRespuesta(respuesta);
    if (this._normalizarRespuesta(hueco.respuesta_correcta) === normalizada) return true;
    if (hueco.variantes && Array.isArray(hueco.variantes)) {
      return hueco.variantes.some(v => this._normalizarRespuesta(v) === normalizada);
    }
    return false;
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
    if (tipo === 'texto_largo') {
      return this._normalizarRespuesta(respuestaUsuario) === this._normalizarRespuesta(respuestaCorrecta);
    }
    if (tipo === 'completar') {
      const opciones = respuestaCorrecta.split('|').map(s => s.trim().toLowerCase());
      return opciones.includes(this._normalizarRespuesta(respuestaUsuario));
    }
    return false;
  },
  esCorrectaPregunta(respuestaUsuario, pregunta) {
    if (pregunta.tipo === 'completar' && pregunta.huecos && Array.isArray(pregunta.huecos)) {
      const respuestas = Array.isArray(respuestaUsuario) ? respuestaUsuario : [];
      const resultado = this._calcularHuecos(respuestas, pregunta.huecos);
      return resultado.correctos === resultado.total;
    }
    return this.esCorrecta(respuestaUsuario, pregunta.respuesta_correcta, pregunta.tipo);
  },
  _calcularHuecos(respuestasArray, huecos) {
    if (!Array.isArray(respuestasArray) || !Array.isArray(huecos) || huecos.length === 0) {
      return { correctos: 0, total: huecos ? huecos.length : 0 };
    }
    let correctos = 0;
    for (let i = 0; i < huecos.length; i++) {
      const respuesta = respuestasArray[i] || '';
      if (this._esCorrectoHueco(respuesta, huecos[i])) correctos++;
    }
    return { correctos, total: huecos.length };
  },
  calcularPuntuacion(respuestas, preguntas) {
    let aciertos = 0;
    let puntosObtenidos = 0;
    let totalPuntos = 0;
    for (const p of preguntas) {
      const pts = this.puntosPregunta(p);
      totalPuntos += pts;
      const rUser = respuestas[p.id];
      if (p.tipo === 'completar' && p.huecos && Array.isArray(p.huecos)) {
        const respuestasArr = Array.isArray(rUser) ? rUser : [];
        const h = this._calcularHuecos(respuestasArr, p.huecos);
        const fraccion = h.total > 0 ? h.correctos / h.total : 0;
        const puntos = Math.round(fraccion * pts * 100) / 100;
        puntosObtenidos += puntos;
        if (fraccion === 1) aciertos++;
      } else {
        if (rUser !== undefined && this.esCorrecta(rUser, p.respuesta_correcta, p.tipo)) {
          aciertos++;
          puntosObtenidos += pts;
        }
      }
    }
    const total = preguntas.length;
    const porcentaje = totalPuntos > 0 ? Math.round((puntosObtenidos / totalPuntos) * 100) : 0;
    const nota = totalPuntos > 0 ? Math.round(((puntosObtenidos / totalPuntos) * 10) * 100) / 100 : 0;
    return { aciertos, total, porcentaje, nota, puntosObtenidos, totalPuntos };
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
      let puntosAuto = 0;
      if (p.tipo === 'completar' && p.huecos && Array.isArray(p.huecos)) {
        const respuestasArr = Array.isArray(respuestas[p.id]) ? respuestas[p.id] : [];
        const h = this._calcularHuecos(respuestasArr, p.huecos);
        const fraccion = h.total > 0 ? h.correctos / h.total : 0;
        puntosAuto = Math.round(fraccion * pts * 100) / 100;
        esCorrecta = fraccion === 1;
      } else {
        esCorrecta = this.esCorrecta(respuestas[p.id], p.respuesta_correcta, p.tipo);
        puntosAuto = esCorrecta ? pts : 0;
      }
      let puntos;
      if (override && override.es_correcta !== undefined && override.es_correcta !== null) {
        esCorrecta = !!override.es_correcta;
        puntos = override.puntos != null ? Number(override.puntos) : (esCorrecta ? pts : 0);
      } else {
        puntos = puntosAuto;
      }
      if (esCorrecta) aciertos++;
      puntosObtenidos += puntos;
    }
    const porcentaje = totalPuntos > 0 ? Math.round((puntosObtenidos / totalPuntos) * 100) : 0;
    const nota = totalPuntos > 0 ? Math.round(((puntosObtenidos / totalPuntos) * 10) * 100) / 100 : 0;
    return { aciertos, puntosObtenidos, totalPuntos, porcentaje, nota };
  },
  detalleCompletar(respuestaUsuario, pregunta) {
    if (!pregunta.huecos || !Array.isArray(pregunta.huecos)) return null;
    const respuestas = Array.isArray(respuestaUsuario) ? respuestaUsuario : [];
    return pregunta.huecos.map((h, i) => ({
      respuestaUsuario: respuestas[i] || '',
      respuestaCorrecta: h.respuesta_correcta,
      variantes: h.variantes || [],
      esCorrecta: this._esCorrectoHueco(respuestas[i] || '', h)
    }));
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
