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
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  calcularRacha(historial) {
    if (!historial || historial.length === 0) return 0;
    const dias = [...new Set(historial
      .filter(h => h.fecha_lectura)
      .map(h => this._fechaLocal(h.fecha_lectura))
    )].sort((a, b) => b.localeCompare(a));
    let racha = 0;
    const hoy = this._hoyLocal();
    for (let i = 0; i < dias.length; i++) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      const esperado = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (dias[i] === esperado) racha++;
      else break;
    }
    return racha;
  }
};

window.progresoLectura = progresoLectura;
