const progresoLectura = {
  calcularPorcentajeLeido(progreso, totalCapitulos) {
    if (!totalCapitulos) return 0;
    const completados = (progreso || []).filter(p => p.completado).length;
    return Math.round((completados / totalCapitulos) * 100);
  },

  calcularRacha(historial) {
    if (!historial || historial.length === 0) return 0;
    const dias = [...new Set(historial
      .filter(h => h.fecha_lectura)
      .map(h => new Date(h.fecha_lectura).toISOString().split('T')[0])
    )].sort((a, b) => b.localeCompare(a));
    let racha = 0;
    const hoy = new Date();
    for (let i = 0; i < dias.length; i++) {
      const esperado = new Date(hoy);
      esperado.setDate(esperado.getDate() - i);
      if (dias[i] === esperado.toISOString().split('T')[0]) racha++;
      else break;
    }
    return racha;
  }
};

window.progresoLectura = progresoLectura;
