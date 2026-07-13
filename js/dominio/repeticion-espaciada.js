const repeticionEspaciada = {
  _FACILIDAD_INICIAL: 2.5,
  _INTERVALO_INICIAL: 1,

  calcularProximoRepaso(tarjeta, calidad) {
    const calidadNum = Math.max(0, Math.min(5, Math.round(calidad)));
    const repeticiones = tarjeta.repeticiones || 0;
    let factor = tarjeta.factor_facilidad || this._FACILIDAD_INICIAL;
    let intervalo = tarjeta.intervalo || 0;

    if (calidadNum < 3) {
      repeticiones = 0;
      intervalo = 1;
    } else {
      if (repeticiones === 0) {
        intervalo = 1;
      } else if (repeticiones === 1) {
        intervalo = 6;
      } else {
        intervalo = Math.round(intervalo * factor);
      }
      repeticiones++;
    }

    factor = Math.max(1.3, factor + (0.1 - (5 - calidadNum) * (0.08 + (5 - calidadNum) * 0.02)));

    const proximo = new Date();
    proximo.setDate(proximo.getDate() + intervalo);

    return {
      repeticiones,
      factor_facilidad: Math.round(factor * 100) / 100,
      intervalo,
      proximo_repaso: proximo.toISOString()
    };
  },

  traducirCalidad(respuestaUsuario) {
    const mapa = { 'no': 0, 'dificil': 2, 'regular': 3, 'facil': 4, 'perfecto': 5 };
    return mapa[respuestaUsuario] !== undefined ? mapa[respuestaUsuario] : 3;
  }
};

window.repeticionEspaciada = repeticionEspaciada;
