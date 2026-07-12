(function() {
    'use strict';

    function calificacionTexto(nota) {
        if (nota >= 9) return '\u{1F31F} Sobresaliente';
        if (nota >= 7) return '\u{1F4D7} Notable';
        if (nota >= 5) return '\u{1F4D8} Suficiente';
        return '\u{1F4D5} Insuficiente';
    }

    function formatDateShort(d) {
        if (!d) return '\u2014';
        var date = new Date(d);
        return date.getDate() + ' ' + date.toLocaleString('es', { month: 'short' }) + ' ' + date.getFullYear().toString().slice(-2) + ', ' + date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    }

    function descargarTxt(texto, nombreArchivo) {
        var blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo || 'export.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    window.exportarCorreccion = function(response, form, studentName) {
        var correction = response.correction || {};
        var score = correction.score || 0;
        var total = correction.total || 0;
        var nota = total > 0 ? (score / total) * 10 : 0;
        var questions = form.questions || [];

        var output = '=== CORRECCI\u00d3N DE EXAMEN ===\n\n';
        output += '\u{1F4DA} Formulario: ' + (form.title || 'Sin t\u00edtulo') + '\n';
        output += '\u{1F464} Estudiante: ' + (studentName || 'An\u00f3nimo') + '\n';
        output += '\u{1F4C5} Fecha: ' + formatDateShort(response.created_at) + '\n\n';
        output += '--- RESULTADOS ---\n';
        output += '\u{1F4CA} Total obtenido: ' + score.toFixed(2) + '\n';
        output += '\u{1F4CA} Total posible: ' + total.toFixed(2) + '\n';
        output += '\u{1F4CA} Nota: ' + nota.toFixed(2) + ' / 10\n';
        output += '\u{1F4CA} Calificaci\u00f3n: ' + calificacionTexto(nota) + '\n\n';
        output += '--- RESPUESTAS ---\n\n';

        questions.forEach(function(q, i) {
            var answer = response.answers.find(function(a) { return a.question === 'q' + i; });
            var userVal = answer ? answer.value : '\u2014';
            var isCorrect = correction.answers && correction.answers[i] === true;
            var s = correction.scores && correction.scores[i] !== undefined ? correction.scores[i] : 0;
            output += (i + 1) + '. ' + (q.title || 'Pregunta ' + (i + 1)) + '\n';
            output += '   Respuesta: ' + (userVal || '\u2014') + '\n';
            output += '   Puntuaci\u00f3n: ' + s.toFixed(2) + ' / 1.00\n';
            output += '   Estado: ' + (isCorrect ? '\u2705 CORRECTA' : '\u274C INCORRECTA') + '\n\n';
        });

        output += '--- COMENTARIO ---\n';
        output += 'Correcci\u00f3n manual. Nota: ' + nota.toFixed(2) + '/10 - ' + calificacionTexto(nota) + '.\n';

        descargarTxt(output, 'correccion_' + (form.title || 'examen').replace(/[^a-z0-9]/gi, '_') + '_' + (studentName || 'anonimo').replace(/\s+/g, '_') + '.txt');
    };

    window.exportarRespuesta = async function(responseId, formId) {
        var form = await window.formsManager.getById(formId);
        var responses = await window.responsesManager.getByForm(formId);
        var response = responses.find(function(r) { return r.id === responseId; });
        if (!form || !response) return;
        var nameAnswer = response.answers.find(function(a) { return a.question === 'respondent_name'; });
        var nombre = nameAnswer ? nameAnswer.value : 'An\u00f3nimo';
        window.exportarCorreccion(response, form, nombre);
    };

})();
