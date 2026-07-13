const puntuacionExamen = {
  _normalizarRespuesta(r) {
    return String(r).trim().toLowerCase().replace(/\s+/g, ' ');
  },
  esCorrecta(respuestaUsuario, respuestaCorrecta, tipo) {
    if (!respuestaUsuario || !respuestaCorrecta) return false;
    if (tipo === 'multiple' || tipo === 'verdadero_falso') {
      return String(respuestaUsuario) === String(respuestaCorrecta);
    }
    if (tipo === 'respuesta_corta') {
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
