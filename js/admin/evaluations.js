// ============================================================
// EVALUATIONS - Gestión de evaluaciones y libro de calificaciones
// ============================================================

(function() {
    'use strict';

    console.log('Inicializando Evaluations System...');

    let _evalsCache = [];
    let _gradesCache = [];
    let _selectedEvalId = null;

    // ============================================================
    // CARGA DE DATOS
    // ============================================================

    async function loadEvaluations(claseId) {
        const sb = window.supabaseClient;
        if (!sb) return [];
        try {
            const { data } = await sb.from('evaluations')
                .select('*')
                .eq('clase_id', claseId)
                .order('created_at', { ascending: false });
            _evalsCache = data || [];
        } catch (e) {
            _evalsCache = [];
        }
        return _evalsCache;
    }

    async function loadGrades(evaluationId) {
        const sb = window.supabaseClient;
        if (!sb) return [];
        try {
            const { data } = await sb.from('evaluation_grades')
                .select('*')
                .eq('evaluation_id', evaluationId);
            _gradesCache = data || [];
        } catch (e) {
            _gradesCache = [];
        }
        return _gradesCache;
    }

    async function logAuditoria(accion, detalle) {
        const sb = window.supabaseClient;
        if (!sb) return;
        const u = window.getCurrentUser();
        try {
            await sb.from('audit_logs').insert({
                accion,
                detalle: detalle || '',
                actor: u ? u.username : 'sistema',
                clase: u ? (u.clase_id || null) : null
            });
        } catch (e) { /* secundario */ }
    }

    // ============================================================
    // RENDER: SECCIÓN DE EVALUACIONES
    // ============================================================

    async function renderEvaluationsSection() {
        const container = document.getElementById('adminEvaluacionesContainer');
        if (!container) return;

        const user = window.getCurrentUser();
        if (!user) return;

        const evals = await loadEvaluations(user.clase_id);
        const forms = window.formsManager?.cache || [];
        const responses = window.responsesManager?.cache || [];

        // Obtener el nombre de cada alumno
        const users = window.__adminUsers || [];

        // Calcular stats por evaluación
        const evalStats = evals.map(function(ev) {
            const formsInEval = forms.filter(function(f) { return f.evaluation_id === ev.id; });
            const formIds = formsInEval.map(function(f) { return f.id; });
            const respInEval = responses.filter(function(r) {
                return formIds.indexOf(r.form_id) >= 0 && r.correction && r.correction.completed;
            });

            const examGrades = respInEval.map(function(r) {
                const s = r.correction.score || 0;
                const t = r.correction.total || 0;
                return t > 0 ? (s / t) * 10 : 0;
            });

            const manualGrades = _gradesCache.filter(function(g) { return g.evaluation_id === ev.id; });
            const manualValues = manualGrades.map(function(g) { return g.grade; });

            const allGrades = examGrades.concat(manualValues);
            const avg = allGrades.length > 0
                ? allGrades.reduce(function(a, b) { return a + b; }, 0) / allGrades.length
                : 0;

            return {
                eval: ev,
                numExams: formsInEval.length,
                numResp: respInEval.length,
                numManual: manualGrades.length,
                avg: avg
            };
        });

        // Exámenes sin evaluación
        const orphanForms = forms.filter(function(f) { return !f.evaluation_id; });

        let html = '';
        html += '<div class="eval-header">';
        html += '  <h3 class="admin-section-title"><i data-lucide="layers" class="w-5 h-5"></i> Evaluaciones</h3>';
        html += '  <div class="eval-actions">';
        html += '    <button onclick="window.crearEvaluacion()" class="btn-primary btn-sm"><i data-lucide="plus" class="w-4 h-4"></i> Nueva</button>';
        html += '  </div>';
        html += '</div>';

        // Buscador
        html += '<div class="eval-search">';
        html += '  <input type="text" id="evalSearchInput" class="form-input" placeholder="Buscar evaluación..." oninput="window.buscarEvaluaciones()" />';
        html += '</div>';

        // Lista de evaluaciones
        html += '<div class="eval-grid" id="evalGrid">';

        if (evals.length === 0) {
            html += '<p class="text-gray-400">No hay evaluaciones. Crea la primera.</p>';
        } else {
            evalStats.forEach(function(es) {
                const e = es.eval;
                html += '<div class="eval-card eval-card-searchable" data-nombre="' + window.escapeHtml(e.nombre.toLowerCase()) + '">';
                html += '  <div class="eval-card-header">';
                html += '    <div class="eval-card-title">' + window.escapeHtml(e.nombre) + '</div>';
                html += '    <div class="eval-card-avg">' + es.avg.toFixed(2) + '</div>';
                html += '  </div>';
                html += '  <div class="eval-card-meta">';
                html += '    <span>' + es.numExams + ' exámenes</span>';
                html += '    <span>' + es.numResp + ' corregidos</span>';
                html += '    <span>' + es.numManual + ' notas manuales</span>';
                html += '  </div>';
                html += '  <div class="eval-card-actions">';
                html += '    <button onclick="window.seleccionarEvaluacion(\'' + e.id + '\')" class="btn-primary btn-sm"><i data-lucide="eye" class="w-4 h-4"></i> Ver notas</button>';
                html += '    <button onclick="window.exportarEvaluacion(\'' + e.id + '\')" class="btn-secondary btn-sm"><i data-lucide="download" class="w-4 h-4"></i> Exportar</button>';
                html += '    <button onclick="window.eliminarEvaluacion(\'' + e.id + '\', \'' + window.escapeHtml(e.nombre) + '\')" class="btn-danger btn-sm"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
                html += '  </div>';
                html += '</div>';
            });
        }

        html += '</div>';

        // Exámenes sin evaluación
        if (orphanForms.length > 0) {
            html += '<div class="eval-orphan-section">';
            html += '  <details>';
            html += '    <summary class="eval-orphan-summary">📝 ' + orphanForms.length + ' exámenes sin evaluación <span class="text-gray-400">(desplegar)</span></summary>';
            html += '    <div class="eval-orphan-list">';
            orphanForms.forEach(function(f) {
                html += '    <div class="eval-orphan-item">';
                html += '      <span>' + window.escapeHtml(f.title) + '</span>';
                html += '      <select class="form-input eval-assign-select" onchange="window.asignarExamenEvaluacion(\'' + f.id + '\', this.value)">';
                html += '        <option value="">Asignar a evaluación...</option>';
                evals.forEach(function(ev) {
                    html += '        <option value="' + ev.id + '">' + window.escapeHtml(ev.nombre) + '</option>';
                });
                html += '      </select>';
                html += '    </div>';
            });
            html += '    </div>';
            html += '  </details>';
            html += '</div>';
        }

        container.innerHTML = html;
    }

    // ============================================================
    // RENDER: LIBRO DE CALIFICACIONES (por evaluación)
    // ============================================================

    async function renderGradeBook(evaluationId) {
        const container = document.getElementById('adminCalificacionesContainer');
        if (!container) return;

        _selectedEvalId = evaluationId;

        const user = window.getCurrentUser();
        if (!user) return;

        const ev = _evalsCache.find(function(e) { return e.id === evaluationId; });
        if (!ev) {
            container.innerHTML = '<p class="text-gray-400">Evaluación no encontrada</p>';
            return;
        }

        await loadGrades(evaluationId);
        const forms = window.formsManager?.cache || [];
        const responses = window.responsesManager?.cache || [];
        const users = window.__adminUsers || [];

        // Obtener exámenes de esta evaluación
        const formsInEval = forms.filter(function(f) { return f.evaluation_id === evaluationId; });
        const formIds = formsInEval.map(function(f) { return f.id; });

        // Respuestas corregidas de estos exámenes
        const respInEval = responses.filter(function(r) {
            return formIds.indexOf(r.form_id) >= 0 && r.correction && r.correction.completed;
        });

        // Notas manuales
        const manualGrades = _gradesCache.filter(function(g) { return g.evaluation_id === evaluationId; });

        // Combinar todas las notas
        var allEntries = [];

        respInEval.forEach(function(r) {
            const nameAnswer = r.answers.find(function(a) { return a.question === 'respondent_name'; });
            const nombre = nameAnswer ? nameAnswer.value : 'Anónimo';
            const form = formsInEval.find(function(f) { return f.id === r.form_id; });
            const s = r.correction.score || 0;
            const t = r.correction.total || 0;
            allEntries.push({
                id: r.id,
                studentName: nombre,
                grade: t > 0 ? (s / t) * 10 : 0,
                type: 'Examen',
                source: form ? form.title : '—',
                date: r.created_at,
                isManual: false,
                responseId: r.id,
                formId: r.form_id
            });
        });

        manualGrades.forEach(function(g) {
            const student = users.find(function(u) { return u.id === g.student_id; });
            const nombre = student ? (student.fullName || student.username) : 'Usuario #' + g.student_id.substring(0, 8);
            allEntries.push({
                id: g.id,
                studentName: nombre,
                grade: g.grade,
                type: 'Manual',
                source: g.comment || '—',
                date: g.created_at,
                isManual: true,
                gradeId: g.id
            });
        });

        // Ordenar por fecha descendente
        allEntries.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

        // Calcular media
        const allGrades = allEntries.map(function(e) { return e.grade; });
        const avg = allGrades.length > 0
            ? allGrades.reduce(function(a, b) { return a + b; }, 0) / allGrades.length
            : 0;

        // Render
        var html = '';
        html += '<div class="eval-gradebook-header">';
        html += '  <button onclick="window.volverEvaluaciones()" class="btn-ghost btn-sm"><i data-lucide="arrow-left" class="w-4 h-4"></i> Volver</button>';
        html += '  <div class="eval-gradebook-info">';
        html += '    <h3 class="admin-section-title" style="margin-bottom:0"><i data-lucide="book-open" class="w-5 h-5"></i> ' + window.escapeHtml(ev.nombre) + '</h3>';
        html += '    <div class="eval-gradebook-avg">Media: <strong>' + avg.toFixed(2) + '</strong></div>';
        html += '  </div>';
        html += '  <button onclick="window.exportarEvaluacion(\'' + evaluationId + '\')" class="btn-secondary btn-sm"><i data-lucide="download" class="w-4 h-4"></i> Exportar todo</button>';
        html += '</div>';

        html += '<div class="eval-gradebook-actions">';
        html += '  <button onclick="window.abrirModalNotaManual(\'' + evaluationId + '\')" class="btn-primary btn-sm"><i data-lucide="plus" class="w-4 h-4"></i> Añadir nota manual</button>';
        html += '</div>';

        if (allEntries.length === 0) {
            html += '<p class="text-gray-400" style="padding:16px 0">No hay calificaciones en esta evaluación.</p>';
        } else {
            html += '<div class="eval-gradebook-table-wrapper">';
            html += '  <table class="eval-gradebook-table">';
            html += '    <thead><tr><th>Alumno</th><th>Examen</th><th>Nota</th><th>Fecha</th><th></th></tr></thead>';
            html += '    <tbody>';

            allEntries.forEach(function(e) {
                var badgeClass = e.grade >= 5 ? 'badge-green' : 'badge-orange';
                var examDisplay = e.isManual ? 'Manual' : window.escapeHtml(e.source);
                var exportBtn = '';
                if (e.isManual) {
                    exportBtn = '<button onclick="window.eliminarNotaManual(\'' + e.gradeId + '\', \'' + evaluationId + '\')" class="btn-danger btn-xs" title="Eliminar nota manual"><i data-lucide="trash-2" class="w-3 h-3"></i></button>';
                } else {
                    exportBtn = '<button onclick="window.exportarCorreccionExamen(\'' + e.responseId + '\', \'' + e.formId + '\')" class="btn-ghost btn-xs" title="Exportar corrección">\u{1F4E4}</button>';
                }

                html += '<tr>';
                html += '  <td class="eval-gradebook-student">' + window.escapeHtml(e.studentName) + '</td>';
                html += '  <td class="eval-gradebook-exam">' + examDisplay + '</td>';
                html += '  <td class="eval-gradebook-grade"><span class="badge ' + badgeClass + '">' + e.grade.toFixed(2) + '</span></td>';
                html += '  <td class="eval-gradebook-date">' + window.formatDate(e.date) + '</td>';
                html += '  <td class="eval-gradebook-export">' + exportBtn + '</td>';
                html += '</tr>';
            });

            html += '    </tbody>';
            html += '  </table>';
            html += '</div>';
        }

        container.innerHTML = html;
    }

    // ============================================================
    // CRUD: EVALUACIONES
    // ============================================================

    window.crearEvaluacion = function() {
        var modal = document.getElementById('evalModal');
        var body = document.getElementById('evalModalBody');
        if (!modal || !body) return;

        body.innerHTML = ''
            + '<div class="form-group">'
            + '  <label class="form-label">Nombre de la evaluación</label>'
            + '  <input type="text" id="newEvalName" class="form-input" placeholder="Ej: 1er Trimestre, Evaluación Diagnóstica..." />'
            + '</div>'
            + '<div class="form-group">'
            + '  <label class="form-label">Descripción (opcional)</label>'
            + '  <textarea id="newEvalDesc" class="form-input" rows="2" placeholder="Descripción breve..."></textarea>'
            + '</div>';

        document.getElementById('evalModalTitle').textContent = 'Nueva Evaluación';
        document.getElementById('evalModalConfirm').textContent = 'Crear';
        document.getElementById('evalModalConfirm').onclick = window._confirmCrearEvaluacion;
        modal.classList.add('active');
    };

    window._confirmCrearEvaluacion = async function() {
        var name = document.getElementById('newEvalName').value.trim();
        var desc = document.getElementById('newEvalDesc').value.trim();
        if (!name) {
            window.showNotification('El nombre es obligatorio', 'warning');
            return;
        }

        var sb = window.supabaseClient;
        if (!sb) return;

        var user = window.getCurrentUser();
        try {
            var { error } = await sb.from('evaluations').insert({
                clase_id: user.clase_id,
                nombre: name,
                descripcion: desc
            });
            if (error) throw error;
            window.showNotification('Evaluación creada', 'success');
            await logAuditoria('Crear evaluación', name + ' (' + user.clase_id + ')');
            window.cerrarModal('evalModal');
            if (typeof window.initAdmin === 'function') window.initAdmin();
        } catch (err) {
            window.showNotification(err.message || 'Error al crear', 'error');
        }
    };

    window.eliminarEvaluacion = function(id, nombre) {
        window.showConfirmDialog(
            'Eliminar Evaluación',
            '¿Seguro que quieres eliminar "' + nombre + '"?\n\n'
                + 'Los exámenes se quedarán sin evaluación asignada (podrás reasignarlos después).\n'
                + 'Las notas manuales de esta evaluación se eliminarán permanentemente.',
            'Eliminar',
            'Cancelar',
            async function() {
                var sb = window.supabaseClient;
                if (!sb) return;
                try {
                    // Borrar notas manuales
                    await sb.from('evaluation_grades').delete().eq('evaluation_id', id);
                    // Desvincular exámenes (ON DELETE SET NULL ya lo hace)
                    await sb.from('forms').update({ evaluation_id: null }).eq('evaluation_id', id);
                    // Borrar evaluación
                    await sb.from('evaluations').delete().eq('id', id);
                    window.showNotification('Evaluación eliminada', 'success');
                    await logAuditoria('Eliminar evaluación', nombre);
                    if (typeof window.initAdmin === 'function') window.initAdmin();
                } catch (err) {
                    window.showNotification(err.message || 'Error al eliminar', 'error');
                }
            }
        );
    };

    // ============================================================
    // NAVEGACIÓN ENTRE EVALUACIONES Y LIBRO DE CALIFICACIONES
    // ============================================================

    window.seleccionarEvaluacion = function(id) {
        renderGradeBook(id);
    };

    window.volverEvaluaciones = function() {
        _selectedEvalId = null;
        if (typeof window.initAdmin === 'function') window.initAdmin();
    };

    window.buscarEvaluaciones = function() {
        var input = document.getElementById('evalSearchInput');
        if (!input) return;
        var q = input.value.toLowerCase().trim();
        var cards = document.querySelectorAll('.eval-card-searchable');
        cards.forEach(function(card) {
            var name = card.getAttribute('data-nombre') || '';
            card.style.display = (!q || name.indexOf(q) >= 0) ? '' : 'none';
        });
    };

    // ============================================================
    // ASIGNAR EXAMEN A EVALUACIÓN
    // ============================================================

    window.asignarExamenEvaluacion = async function(formId, evaluationId) {
        if (!evaluationId) return;
        var sb = window.supabaseClient;
        if (!sb) return;
        try {
            await sb.from('forms').update({ evaluation_id: evaluationId }).eq('id', formId);
            window.showNotification('Examen asignado a la evaluación', 'success');
            if (typeof window.initAdmin === 'function') window.initAdmin();
        } catch (err) {
            window.showNotification(err.message || 'Error al asignar', 'error');
        }
    };

    // ============================================================
    // CRUD: NOTAS MANUALES
    // ============================================================

    window.abrirModalNotaManual = function(evaluationId) {
        var modal = document.getElementById('evalModal');
        var body = document.getElementById('evalModalBody');
        if (!modal || !body) return;

        var users = window.__adminUsers || [];
        var alumnos = users.filter(function(u) { return u.role === 'usuario' || u.role === 'editor'; });

        var options = '<option value="">Seleccionar alumno...</option>';
        alumnos.forEach(function(u) {
            options += '<option value="' + u.id + '">' + window.escapeHtml(u.fullName || u.username) + '</option>';
        });

        body.innerHTML = ''
            + '<input type="hidden" id="manualGradeEvalId" value="' + evaluationId + '" />'
            + '<div class="form-group">'
            + '  <label class="form-label">Alumno</label>'
            + '  <select id="manualGradeStudent" class="form-input">' + options + '</select>'
            + '</div>'
            + '<div class="form-group">'
            + '  <label class="form-label">Nota (0-10)</label>'
            + '  <input type="number" id="manualGradeValue" class="form-input" min="0" max="10" step="0.01" placeholder="7.50" />'
            + '</div>'
            + '<div class="form-group">'
            + '  <label class="form-label">Comentario (opcional)</label>'
            + '  <input type="text" id="manualGradeComment" class="form-input" placeholder="Ej: Trabajo en clase, Exposición oral..." />'
            + '</div>';

        document.getElementById('evalModalTitle').textContent = 'Añadir Nota Manual';
        document.getElementById('evalModalConfirm').textContent = 'Guardar';
        document.getElementById('evalModalConfirm').onclick = window._confirmAddManualGrade;
        modal.classList.add('active');
    };

    window._confirmAddManualGrade = async function() {
        var evalId = document.getElementById('manualGradeEvalId').value;
        var studentId = document.getElementById('manualGradeStudent').value;
        var grade = parseFloat(document.getElementById('manualGradeValue').value);
        var comment = document.getElementById('manualGradeComment').value.trim();

        if (!studentId) {
            window.showNotification('Selecciona un alumno', 'warning');
            return;
        }
        if (isNaN(grade) || grade < 0 || grade > 10) {
            window.showNotification('La nota debe ser entre 0 y 10', 'warning');
            return;
        }

        var sb = window.supabaseClient;
        if (!sb) return;

        try {
            var { error } = await sb.from('evaluation_grades').insert({
                evaluation_id: evalId,
                student_id: studentId,
                grade: grade,
                comment: comment
            });
            if (error) throw error;
            window.showNotification('Nota guardada', 'success');
            await logAuditoria('Añadir nota manual', 'Evaluación: ' + evalId + ', Nota: ' + grade);
            window.cerrarModal('evalModal');
            renderGradeBook(evalId);
        } catch (err) {
            window.showNotification(err.message || 'Error al guardar', 'error');
        }
    };

    window.eliminarNotaManual = async function(gradeId, evaluationId) {
        window.showConfirmDialog(
            'Eliminar nota',
            '¿Seguro que quieres eliminar esta nota manual?',
            'Eliminar',
            'Cancelar',
            async function() {
                var sb = window.supabaseClient;
                if (!sb) return;
                try {
                    await sb.from('evaluation_grades').delete().eq('id', gradeId);
                    window.showNotification('Nota eliminada', 'success');
                    renderGradeBook(evaluationId);
                } catch (err) {
                    window.showNotification(err.message || 'Error al eliminar', 'error');
                }
            }
        );
    };

    // ============================================================
    // EXPORTACIÓN
    // ============================================================

    function formatDateShort(d) {
        if (!d) return '—';
        var date = new Date(d);
        return date.getDate() + ' ' + date.toLocaleString('es', { month: 'short' }) + ' ' + date.getFullYear().toString().slice(-2) + ', ' + date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    }

    function calificacionTexto(nota) {
        if (nota >= 9) return '\u{1F31F} Sobresaliente';
        if (nota >= 7) return '\u{1F4D7} Notable';
        if (nota >= 5) return '\u{1F4D8} Suficiente';
        return '\u{1F4D5} Insuficiente';
    }

    window.exportarCorreccionExamen = async function(responseId, formId) {
        var form = await window.formsManager.getById(formId);
        var responses = await window.responsesManager.getByForm(formId);
        var response = responses.find(function(r) { return r.id === responseId; });
        if (!form || !response) return;

        var nameAnswer = response.answers.find(function(a) { return a.question === 'respondent_name'; });
        var nombre = nameAnswer ? nameAnswer.value : 'Anónimo';

        var correction = response.correction || {};
        var score = correction.score || 0;
        var total = correction.total || 0;
        var nota = total > 0 ? (score / total) * 10 : 0;
        var resultado = '=== CORRECCIÓN DE EXAMEN ===\n\n';
        resultado += '\u{1F4DA} Formulario: ' + (form.title || 'Sin título') + '\n';
        resultado += '\u{1F464} Estudiante: ' + nombre + '\n';
        resultado += '\u{1F4C5} Fecha: ' + formatDateShort(response.created_at) + '\n\n';
        resultado += '--- RESULTADOS ---\n';
        resultado += '\u{1F4CA} Total obtenido: ' + score.toFixed(2) + '\n';
        resultado += '\u{1F4CA} Total posible: ' + total.toFixed(2) + '\n';
        resultado += '\u{1F4CA} Nota: ' + nota.toFixed(2) + ' / 10\n';
        resultado += '\u{1F4CA} Calificación: ' + calificacionTexto(nota) + '\n\n';
        resultado += '--- RESPUESTAS ---\n\n';

        var questions = form.questions || [];
        questions.forEach(function(q, i) {
            var answer = response.answers.find(function(a) { return a.question === 'q' + i; });
            var userVal = answer ? answer.value : '—';
            var isCorrect = correction.answers && correction.answers[i] === true;
            var s = correction.scores && correction.scores[i] !== undefined ? correction.scores[i] : 0;
            resultado += (i + 1) + '. ' + (q.title || 'Pregunta ' + (i + 1)) + '\n';
            resultado += '   Respuesta: ' + (userVal || '—') + '\n';
            resultado += '   Puntuación: ' + s.toFixed(2) + ' / 1.00\n';
            resultado += '   Estado: ' + (isCorrect ? '\u2705 CORRECTA' : '\u274C INCORRECTA') + '\n\n';
        });

        resultado += '--- COMENTARIO ---\n';
        resultado += 'Corrección manual. Nota: ' + nota.toFixed(2) + '/10 - ' + calificacionTexto(nota) + '.\n';

        descargarTxt(resultado, 'correccion_' + (form.title || 'examen').replace(/[^a-z0-9]/gi, '_') + '_' + nombre.replace(/\s+/g, '_') + '.txt');
    };

    window.exportarEvaluacion = async function(evaluationId) {
        var ev = _evalsCache.find(function(e) { return e.id === evaluationId; });
        if (!ev) return;

        await loadGrades(evaluationId);
        var forms = window.formsManager?.cache || [];
        var responses = window.responsesManager?.cache || [];
        var users = window.__adminUsers || [];

        var formsInEval = forms.filter(function(f) { return f.evaluation_id === evaluationId; });
        var formIds = formsInEval.map(function(f) { return f.id; });
        var respInEval = responses.filter(function(r) {
            return formIds.indexOf(r.form_id) >= 0 && r.correction && r.correction.completed;
        });
        var manualGrades = _gradesCache.filter(function(g) { return g.evaluation_id === evaluationId; });

        var output = '';
        output += '========================================\n';
        output += '  INFORME DE EVALUACIÓN\n';
        output += '========================================\n\n';
        output += '\u{1F4DA} Evaluación: ' + ev.nombre + '\n';
        if (ev.descripcion) output += '   Descripción: ' + ev.descripcion + '\n';
        output += '\n';

        // Exportar exámenes
        if (respInEval.length > 0) {
            output += '--- EXÁMENES CORREGIDOS ---\n\n';
            respInEval.forEach(function(r) {
                var nameAnswer = r.answers.find(function(a) { return a.question === 'respondent_name'; });
                var nombre = nameAnswer ? nameAnswer.value : 'Anónimo';
                var form = formsInEval.find(function(f) { return f.id === r.form_id; });
                var correction = r.correction || {};
                var score = correction.score || 0;
                var total = correction.total || 0;
                var nota = total > 0 ? (score / total) * 10 : 0;

                output += '\u{1F4DA} ' + (form ? form.title : 'Sin título') + ' - ' + nombre + '\n';
                output += '   Fecha: ' + formatDateShort(r.created_at) + '\n';
                output += '   Nota: ' + nota.toFixed(2) + '/10 - ' + calificacionTexto(nota) + '\n\n';
            });
        }

        // Exportar notas manuales
        if (manualGrades.length > 0) {
            output += '--- NOTAS MANUALES ---\n\n';
            manualGrades.forEach(function(g) {
                var student = users.find(function(u) { return u.id === g.student_id; });
                var nombre = student ? (student.fullName || student.username) : 'Usuario #' + g.student_id.substring(0, 8);
                output += '\u{1F464} ' + nombre + '\n';
                output += '   Nota: ' + g.grade.toFixed(2) + '/10\n';
                output += '   Comentario: ' + (g.comment || '—') + '\n';
                output += '   Fecha: ' + formatDateShort(g.created_at) + '\n\n';
            });
        }

        // Resumen
        var allGrades = [];
        respInEval.forEach(function(r) {
            var s = r.correction.score || 0;
            var t = r.correction.total || 0;
            allGrades.push(t > 0 ? (s / t) * 10 : 0);
        });
        manualGrades.forEach(function(g) { allGrades.push(g.grade); });
        var avg = allGrades.length > 0 ? allGrades.reduce(function(a, b) { return a + b; }, 0) / allGrades.length : 0;

        output += '--- RESUMEN ---\n';
        output += 'Total de notas: ' + allGrades.length + '\n';
        output += 'Media: ' + avg.toFixed(2) + '/10\n';
        output += 'Calificación: ' + calificacionTexto(avg) + '\n';

        descargarTxt(output, 'evaluacion_' + ev.nombre.replace(/[^a-z0-9]/gi, '_') + '.txt');
    };

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

    // ============================================================
    // MODAL HELPER
    // ============================================================

    window.cerrarModal = function(modalId) {
        var modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    };

    // ============================================================
    // EXPORTAR PARA initAdmin
    // ============================================================

    window.loadEvaluationsAndRender = async function() {
        await renderEvaluationsSection();
    };

    console.log('Evaluations System cargado');

})();