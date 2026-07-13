const logrosDominio = {
  _definiciones: [
    { clave: 'primer_capitulo', nombre: 'Primer Paso', descripcion: 'Leíste tu primer capítulo', icono: '📖', condicion: p => p.capitulosLeidos >= 1 },
    { clave: 'lector_10', nombre: 'Aprendiz', descripcion: 'Leíste 10 capítulos', icono: '📚', condicion: p => p.capitulosLeidos >= 10 },
    { clave: 'lector_50', nombre: 'Estudioso', descripcion: 'Leíste 50 capítulos', icono: '📚', condicion: p => p.capitulosLeidos >= 50 },
    { clave: 'lector_100', nombre: 'Dedicado', descripcion: 'Leíste 100 capítulos', icono: '🏅', condicion: p => p.capitulosLeidos >= 100 },
    { clave: 'libro_completo', nombre: 'Libro Completo', descripcion: 'Completaste un libro entero', icono: '🎯', condicion: p => p.librosCompletados >= 1 },
    { clave: 'tres_libros', nombre: 'Trilogía', descripcion: 'Completaste 3 libros', icono: '🎯', condicion: p => p.librosCompletados >= 3 },
    { clave: 'racha_7', nombre: 'Constante', descripcion: 'Racha de 7 días', icono: '🔥', condicion: p => p.racha >= 7 },
    { clave: 'racha_30', nombre: 'Perseverante', descripcion: 'Racha de 30 días', icono: '🔥', condicion: p => p.racha >= 30 },
    { clave: 'racha_100', nombre: 'Inquebrantable', descripcion: 'Racha de 100 días', icono: '💎', condicion: p => p.racha >= 100 },
    { clave: 'primer_examen', nombre: 'Evaluado', descripcion: 'Completaste tu primer examen', icono: '✍️', condicion: p => p.examenesCompletados >= 1 },
    { clave: 'examen_perfecto', nombre: 'Perfect Score', descripcion: 'Sacaste 100% en un examen', icono: '⭐', condicion: p => p.examenPerfecto },
    { clave: 'primer_tarjeta', nombre: 'Memorizando', descripcion: 'Agregaste tu primera tarjeta', icono: '🧠', condicion: p => p.tarjetasCreadas >= 1 },
    { clave: 'diez_tarjetas', nombre: 'Memoria Activa', descripcion: 'Creas 10 tarjetas de memoria', icono: '🧠', condicion: p => p.tarjetasCreadas >= 10 },
    { clave: 'repaso_50', nombre: 'Disciplinado', descripcion: 'Realizas 50 repasos', icono: '🔄', condicion: p => p.totalRepasos >= 50 },
    { clave: 'nt_completo', nombre: 'Nuevo Pacto', descripcion: 'Completaste todo el Nuevo Testamento', icono: '🏆', condicion: p => p.ntCompleto },
    { clave: 'at_completo', nombre: 'Antiguo Pacto', descripcion: 'Completaste todo el Antiguo Testamento', icono: '👑', condicion: p => p.atCompleto }
  ],
  obtenerDefiniciones() { return this._definiciones; },
  verificar(progreso, logrosActuales) {
    const clavesActuales = new Set((logrosActuales || []).map(l => l.logros?.clave || l.clave));
    return this._definiciones.filter(d => !clavesActuales.has(d.clave) && d.condicion(progreso));
  },
  async verificarYOtorgar(usuarioId, progreso) {
    const sb = window.supabaseClient;
    if (!sb) return [];
    const { data: logrosActuales } = await sb().from('logros_usuario').select('logros!logro_id(clave)').eq('usuario_id', usuarioId);
    const aOtorgar = this.verificar(progreso, logrosActuales || []);
    for (const logro of aOtorgar) {
      const { data: l } = await sb().from('logros').select('id').eq('clave', logro.clave).single();
      if (l) {
        await sb().from('logros_usuario').insert({ usuario_id: usuarioId, logro_id: l.id }).onConflict('usuario_id,logro_id').ignore();
      }
    }
    return aOtorgar;
  }
};
window.logrosDominio = logrosDominio;
