const progresoLectura = {
  calcularPorcentajeLeido(progreso, totalCapitulos) {
    if (!totalCapitulos) return 0;
    const completados = (progreso || []).filter(p => p.completado).length;
    return Math.round((completados / totalCapitulos) * 100);
  },

  _fechaLocal(iso) {
    const d = new Date(iso);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  _hoyLocal() {
    const d = new Date();
    return String(d.getFullYear()) + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  _descomponer(yyyymmdd) {
    const p = yyyymmdd.split('-');
    return { y: parseInt(p[0], 10), m: parseInt(p[1], 10) - 1, d: parseInt(p[2], 10) };
  },
  _restarUnDia(yyyymmdd) {
    const { y, m, d } = this._descomponer(yyyymmdd);
    const dt = new Date(y, m, d);
    dt.setDate(dt.getDate() - 1);
    return String(dt.getFullYear()) + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  },
  calcularRacha(historial) {
    if (!historial || historial.length === 0) return 0;
    const fechas = historial
      .filter(h => h.fecha_lectura)
      .map(h => this._fechaLocal(h.fecha_lectura));
    const diasUnicos = [...new Set(fechas)];
    if (diasUnicos.length === 0) return 0;
    const hoy = this._hoyLocal();
    const maxDias = 730;
    let racha = 0;
    let cursor = hoy;
    while (racha < maxDias) {
      if (diasUnicos.includes(cursor)) {
        racha++;
        cursor = this._restarUnDia(cursor);
      } else {
        break;
      }
    }
    return racha;
  }
};

window.progresoLectura = progresoLectura;
