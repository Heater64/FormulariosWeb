const repeticionEspaciada = {
  EF_INICIAL: 2.5,
  EF_MIN: 1.3,
  INTERVALO_MAX: 365,

  crearTarjeta() {
    return {
      repeticiones: 0,
      intervalo: 0,
      factorFacilidad: this.EF_INICIAL,
      proximoRepaso: new Date().toISOString(),
      ultimoRepaso: null,
      rachaActual: 0,
      mejorRacha: 0,
      vecesOlvidado: 0,
      ultimaCalificacion: null
    };
  },

  calcularProximoRepaso(tarjeta, calidad) {
    const q = Math.max(0, Math.min(5, Math.round(calidad)));
    const fallo = q < 3;

    const anterior = {
      repeticiones: tarjeta.repeticiones || 0,
      intervalo: tarjeta.intervalo || 0,
      factorFacilidad: tarjeta.factorFacilidad || this.EF_INICIAL,
      rachaActual: tarjeta.rachaActual || 0,
      mejorRacha: tarjeta.mejorRacha || 0,
      vecesOlvidado: tarjeta.vecesOlvidado || 0
    };

    let { repeticiones, intervalo, factorFacilidad, rachaActual, mejorRacha, vecesOlvidado } = anterior;
    const totalRepeticiones = repeticiones + 1;

    const nuevoEF = this._calcularEF(factorFacilidad, q);
    const efAjustado = Math.max(this.EF_MIN, nuevoEF);

    if (fallo) {
      repeticiones = 0;
      intervalo = 1;
      rachaActual = 0;
      vecesOlvidado += 1;
    } else {
      rachaActual += 1;
      if (rachaActual > mejorRacha) mejorRacha = rachaActual;

      if (repeticiones === 0) {
        intervalo = 1;
      } else if (repeticiones === 1) {
        intervalo = 6;
      } else {
        intervalo = Math.round(intervalo * efAjustado);
      }

      repeticiones += 1;
    }

    intervalo = Math.min(intervalo, this.INTERVALO_MAX);
    factorFacilidad = efAjustado;

    const proximo = new Date();
    proximo.setDate(proximo.getDate() + intervalo);

    return {
      repeticiones,
      intervalo,
      factorFacilidad: Math.round(factorFacilidad * 100) / 100,
      proximoRepaso: proximo.toISOString(),
      ultimoRepaso: new Date().toISOString(),
      rachaActual,
      mejorRacha,
      vecesOlvidado,
      ultimaCalificacion: q
    };
  },

  _calcularEF(efAnterior, q) {
    return efAnterior + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  },

  calcularNivel(intervalo) {
    const i = intervalo || 0;
    if (i <= 0) return 0;
    const niveles = [1, 2, 7, 14, 30, 60, 120, 180, 365];
    for (let n = 0; n < niveles.length; n++) {
      if (i <= niveles[n]) return n + 1;
    }
    return niveles.length + 1;
  },

  programarRepasos(tarjetas) {
    const hoy = new Date();
    return tarjetas
      .map(t => ({
        ...t,
        diasRestantes: Math.ceil(
          (new Date(t.proximoRepaso || t.proximo_repaso) - hoy) / (1000 * 60 * 60 * 24)
        )
      }))
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  },

  estadoAprendizaje(rachaActual, intervalo) {
    if (rachaActual >= 5 && intervalo >= 21) return 'consolidado';
    if (rachaActual >= 3 && intervalo >= 7) return 'aprendido';
    if (intervalo <= 1) return 'nuevo';
    return 'repasando';
  },

  /* ─── Niveles del juego (Duolingo-like) ───
     Nueva → Aprendiendo → Dominada → Perfecta */
  nivelJuego(rachaActual, intervalo) {
    if (rachaActual >= 5 && intervalo >= 21) return 'perfecta';
    if (rachaActual >= 3 && intervalo >= 7) return 'dominada';
    if (rachaActual >= 1 && intervalo >= 1) return 'aprendiendo';
    return 'nueva';
  },

  NIVELES_JUEGO: [
    { id: 'nueva', texto: 'Nueva', color: 'var(--color-azul-500)' },
    { id: 'aprendiendo', texto: 'Aprendiendo', color: 'var(--color-amarillo-500)' },
    { id: 'dominada', texto: 'Dominada', color: 'var(--color-naranja-500)' },
    { id: 'perfecta', texto: 'Perfecta', color: 'var(--color-verde-500)' }
  ],

  infoNivel(id) {
    return this.NIVELES_JUEGO.find(n => n.id === id) || this.NIVELES_JUEGO[0];
  }
};

window.repeticionEspaciada = repeticionEspaciada;
