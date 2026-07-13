(function() {
  'use strict';

  // Máquina de estados finita del flujo de estudio guiado (Mundo 1).
  // Estados: no_iniciado -> leyendo -> preguntas -> evaluado -> (repaso|completado)
  // El objetivo es validar las transiciones a nivel de dominio, de modo que
  // ni la UI ni una petición manipulada puedan saltarse pasos del ciclo
  // leer -> preguntar -> repasar -> memorizar -> evaluar -> continuidad.
  const maquinaEstudio = {
    estados: {
      NO_INICIADO: 'no_iniciado',
      LEYENDO: 'leyendo',
      PREGUNTAS: 'preguntas',
      EVALUADO: 'evaluado',
      REPASO: 'repaso',
      MEMORIZACION: 'memorizacion',
      COMPLETADO: 'completado'
    },

    // Evento -> estado destino resultante.
    _eventos: {
      INICIAR: 'leyendo',
      LEER: 'preguntas',
      EVALUAR: 'evaluado',
      REPASAR: 'repaso',
      REPETIR: 'preguntas',
      MEMORIZAR: 'memorizacion',
      COMPLETAR: 'completado'
    },

    // Desde cada estado, a qué estados se permite avanzar.
    _transiciones: {
      no_iniciado: ['leyendo'],
      leyendo: ['preguntas'],
      preguntas: ['evaluado'],
      evaluado: ['repaso', 'completado'],
      repaso: ['preguntas', 'completado'],
      memorizacion: ['completado'],
      completado: []
    },

    puede(actual, siguiente) {
      return (this._transiciones[actual] || []).includes(siguiente);
    },

    // Devuelve el estado siguiente para un evento, o lanza si la transición
    // no es válida desde el estado actual.
    siguiente(actual, evento) {
      const destino = this._eventos[evento];
      if (!destino) throw new Error('Evento de estudio desconocido: ' + evento);
      if (!this.puede(actual, destino)) {
        throw new Error('Transición de estudio inválida: ' + actual + ' --' + evento + '--> ' + destino);
      }
      return destino;
    }
  };

  window.maquinaEstudio = maquinaEstudio;
})();
