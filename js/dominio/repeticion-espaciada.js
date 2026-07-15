const repeticionEspaciada = {
  _PROGRESION_FACIL: [7, 14, 30, 60, 90, 180, 365],

  calcularProximoRepaso(tarjeta, calidad) {
    const calidadNum = Math.max(0, Math.min(5, Math.round(calidad)));
    const intervaloActual = tarjeta.intervalo || 0;
    const rachaActual = tarjeta.racha_actual || 0;
    const mejorRacha = tarjeta.mejor_racha || 0;
    const vecesOlvidado = tarjeta.veces_olvidado || 0;
    const totalRepeticiones = (tarjeta.repeticiones || 0) + 1;

    let intervalo;
    let nuevaRacha;
    let nuevosOlvidados = vecesOlvidado;

    if (calidadNum === 0) {
      intervalo = 1;
      nuevaRacha = 0;
      nuevosOlvidados = vecesOlvidado + 1;
    } else if (calidadNum === 1) {
      intervalo = 1;
      nuevaRacha = 0;
    } else if (calidadNum === 3) {
      intervalo = 3;
      nuevaRacha = rachaActual + 1;
    } else {
      intervalo = this._siguienteIntervaloFacil(intervaloActual);
      nuevaRacha = rachaActual + 1;
    }

    const nuevaMejorRacha = Math.max(mejorRacha, nuevaRacha);

    const proximo = new Date();
    proximo.setDate(proximo.getDate() + intervalo);

    return {
      repeticiones: totalRepeticiones,
      intervalo,
      proximo_repaso: proximo.toISOString(),
      ultimo_repaso: new Date().toISOString(),
      mejor_racha: nuevaMejorRacha,
      veces_olvidado: nuevosOlvidados,
      ultima_calificacion: calidadNum,
      racha_actual: nuevaRacha
    };
  },

  _siguienteIntervaloFacil(intervaloActual) {
    for (const intervalo of this._PROGRESION_FACIL) {
      if (intervaloActual < intervalo) return intervalo;
    }
    return this._PROGRESION_FACIL[this._PROGRESION_FACIL.length - 1];
  },

  calcularNivel(intervalo) {
    const i = intervalo || 0;
    if (i < 2) return 0;
    if (i < 7) return 1;
    if (i < 14) return 2;
    if (i < 30) return 3;
    if (i < 60) return 4;
    if (i < 180) return 5;
    if (i < 365) return 6;
    return 7;
  }
};

window.repeticionEspaciada = repeticionEspaciada;
