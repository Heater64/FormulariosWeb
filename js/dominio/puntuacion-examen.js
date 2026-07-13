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
      nota: total > 0 ? Math.round(((aciertos / total) * 100) * 100) / 100 : 0
    };
  },
  convertirNota(porcentaje) {
    if (porcentaje >= 90) return { letra: 'A', excelente: true };
    if (porcentaje >= 80) return { letra: 'B', excelente: false };
    if (porcentaje >= 70) return { letra: 'C', excelente: false };
    if (porcentaje >= 60) return { letra: 'D', excelente: false };
    return { letra: 'F', excelente: false };
  }
};
window.puntuacionExamen = puntuacionExamen;
