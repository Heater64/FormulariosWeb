// ============================================================
// APP - Lógica principal de la aplicación
// ============================================================

// Inicializar Supabase
const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

// Inicializar managers
const formsManager = new FormsManager(supabase);
const responsesManager = new ResponsesManager(supabase);

// Estado global
let currentView = 'dashboard';
let editingId = null;
let tempQuestions = [];
let currentFormId = null;

// ============================================================
// NAVEGACIÓN
// ============================================================

function showView(view, data) {
    currentView = view;
    
    document.querySelectorAll('[id^="view-"]').forEach(el => {
        el.classList.add('hidden');
    });
    
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.remove('hidden');
    
    if (view === 'dashboard') renderDashboard();
    if (view === 'editor') renderEditor();
    if (view === 'form') renderFormView(data);
    if (view === 'responses') renderResponses(data);
}

window.showView = showView;
window.goBack = () => showView('dashboard');

// ============================================================
// DASHBOARD
// ============================================================

async function renderDashboard() {
    const container = document.getElementById('formList');
    container.innerHTML = `
        <div class="text-center py-12">
            <div class="loading mx-auto"></div>
            <p class="mt-4 text-gray-400">Cargando formularios...</p>
        </div>
    `;
    
    try {
        const forms = await formsManager.getAll();
        
        if (!forms || forms.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📝</div>
                    <h3>No tienes formularios</h3>
                    <p class="text-gray-400">Crea tu primer formulario ahora</p>
                    <button onclick="showView('editor')" class="btn-blue mt-4">+ Crear formulario</button>
                </div>
            `;
            return;
        }
        
        let html = '<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">';
        forms.forEach(form => {
            const qCount = form.questions?.length || 0;
            const url = `${Utils.getCurrentURL()}?form=${form.id}`;
            
            html += `
                <div class="card">
                    <div class="flex justify-between items-start">
                        <h3 class="font-semibold text-lg truncate">${Utils.escapeHtml(form.title || 'Sin título')}</h3>
                        <span class="badge badge-blue">${qCount} preguntas</span>
                    </div>
                    <p class="text-xs text-gray-400 mt-1">${form.slug || ''}</p>
                    <div class="flex flex-wrap gap-2 mt-4">
                        <button onclick="showView('form', '${form.id}')" class="text-sm text-blue-500 hover:underline">📋 Ver</button>
                        <button onclick="editForm('${form.id}')" class="text-sm text-green-500 hover:underline">✏️ Editar</button>
                        <button onclick="showView('responses', '${form.id}')" class="text-sm text-purple-500 hover:underline">📊 Respuestas</button>
                        <button onclick="shareForm('${form.id}')" class="share-btn">📱 Compartir</button>
                        <button onclick="deleteForm('${form.id}')" class="btn-red">🗑️</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">⚠️</div>
                <h3>Error de conexión</h3>
                <p class="text-gray-400">No se pudieron cargar los formularios</p>
                <button onclick="renderDashboard()" class="btn-blue mt-4">Reintentar</button>
            </div>
        `;
    }
}

// ============================================================
// EDITOR
// ============================================================

function renderEditor() {
    document.getElementById('editorTitle').textContent = editingId ? 'Editar Formulario' : 'Nuevo Formulario';
    
    if (editingId) {
        const form = formsManager.cache.find(f => f.id === editingId);
        if (form) {
            document.getElementById('formTitle').value = form.title || '';
            tempQuestions = JSON.parse(JSON.stringify(form.questions || []));
        }
    } else {
        document.getElementById('formTitle').value = 'Mi formulario';
        tempQuestions = [];
    }
    renderQuestions();
}

function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    const counter = document.getElementById('questionCounter');
    counter.textContent = `${tempQuestions.length} preguntas`;
    
    if (tempQuestions.length === 0) {
        container.innerHTML = `
            <div class="card text-center py-8 text-gray-400">
                <p class="text-2xl mb-2">➕</p>
                <p>Añade tu primera pregunta</p>
                <p class="text-sm">Usa los botones de abajo</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    tempQuestions.forEach((q, index) => {
        html += `
            <div class="card">
                <div class="flex items-start gap-3">
                    <span class="text-gray-400 text-sm mt-2">${index + 1}.</span>
                    <div class="flex-1">
                        <input class="form-input text-base font-medium border-none bg-transparent p-0" 
                               value="${Utils.escapeHtml(q.title || '')}" 
                               placeholder="Escribe tu pregunta"
                               onchange="updateQuestion(${index}, 'title', this.value)" />
                        <div class="mt-3">
                            ${getQuestionPreview(q, index)}
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <select class="text-sm border rounded-lg px-2 py-1 bg-white" 
                                onchange="updateQuestion(${index}, 'type', this.value)">
                            ${['text', 'textarea', 'radio', 'checkbox', 'select'].map(t => 
                                `<option value="${t}" ${q.type === t ? 'selected' : ''}>${t}</option>`
                            ).join('')}
                        </select>
                        <button onclick="removeQuestion(${index})" class="text-red-400 hover:text-red-600">✕</button>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function getQuestionPreview(q, index) {
    switch(q.type) {
        case 'text':
            return `<input class="form-input bg-gray-50" placeholder="Respuesta corta" disabled />`;
        case 'textarea':
            return `<textarea class="form-input bg-gray-50" rows="3" placeholder="Respuesta larga" disabled></textarea>`;
        case 'radio':
        case 'checkbox':
        case 'select':
            const opts = q.options || ['Opción 1'];
            const inputType = q.type === 'radio' ? 'radio' : q.type === 'checkbox' ? 'checkbox' : 'select';
            
            if (q.type === 'select') {
                return `
                    <select class="form-input bg-gray-50" disabled>
                        ${opts.map(opt => `<option>${Utils.escapeHtml(opt)}</option>`).join('')}
                    </select>
                    <div class="mt-2 space-y-1">
                        ${opts.map((opt, i) => `
                            <div class="question-option">
                                <input type="text" value="${Utils.escapeHtml(opt)}" 
                                       onchange="updateOption(${index}, ${i}, this.value)" />
                                <button onclick="removeOption(${index}, ${i})" class="text-red-300 text-xs">✕</button>
                            </div>
                        `).join('')}
                        <button onclick="addOption(${index})" class="text-xs text-blue-500 mt-1">+ Añadir opción</button>
                    </div>
                `;
            }
            
            return `
                <div class="space-y-1">
                    ${opts.map((opt, i) => `
                        <div class="question-option">
                            <input type="${inputType}" disabled />
                            <input type="text" value="${Utils.escapeHtml(opt)}" 
                                   onchange="updateOption(${index}, ${i}, this.value)" />
                            <button onclick="removeOption(${index}, ${i})" class="text-red-300 text-xs">✕</button>
                        </div>
                    `).join('')}
                    <button onclick="addOption(${index})" class="text-xs text-blue-500 mt-1">+ Añadir opción</button>
                </div>
            `;
        default:
            return `<input class="form-input bg-gray-50" placeholder="Respuesta" disabled />`;
    }
}

// ============================================================
// FUNCIONES GLOBALES DEL EDITOR
// ============================================================

window.addQuestion = function(type) {
    const newQ = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
        type: type,
        title: 'Nueva pregunta',
        required: false,
        options: ['radio', 'checkbox', 'select'].includes(type) ? ['Opción 1'] : undefined
    };
    tempQuestions.push(newQ);
    renderQuestions();
};

window.updateQuestion = function(index, field, value) {
    if (tempQuestions[index]) {
        tempQuestions[index][field] = value;
    }
};

window.updateOption = function(qIndex, optIndex, value) {
    if (tempQuestions[qIndex] && tempQuestions[qIndex].options) {
        tempQuestions[qIndex].options[optIndex] = value;
    }
};

window.addOption = function(index) {
    if (tempQuestions[index]) {
        if (!tempQuestions[index].options) tempQuestions[index].options = [];
        tempQuestions[index].options.push(`Opción ${tempQuestions[index].options.length + 1}`);
        renderQuestions();
    }
};

window.removeOption = function(qIndex, optIndex) {
    if (tempQuestions[qIndex] && tempQuestions[qIndex].options) {
        tempQuestions[qIndex].options.splice(optIndex, 1);
        if (tempQuestions[qIndex].options.length === 0) {
            tempQuestions[qIndex].options = ['Opción 1'];
        }
        renderQuestions();
    }
};

window.removeQuestion = function(index) {
    tempQuestions.splice(index, 1);
    renderQuestions();
};

window.editForm = function(formId) {
    editingId = formId;
    showView('editor');
};

window.deleteForm = async function(formId) {
    if (!confirm('¿Eliminar este formulario permanentemente?')) return;
    try {
        await formsManager.delete(formId);
        Utils.showToast('✅ Formulario eliminado', 'success');
        renderDashboard();
    } catch (error) {
        Utils.showToast('❌ Error al eliminar', 'error');
    }
};

window.shareForm = function(formId) {
    const form = formsManager.cache.find(f => f.id === formId);
    if (!form) return;
    
    const url = `${Utils.getCurrentURL()}?form=${formId}`;
    const text = `📝 ${form.title}\n\nCompleta este formulario:\n${url}`;
    
    if (navigator.share) {
        navigator.share({ title: form.title, text: text, url: url })
            .catch(() => Utils.copyToClipboard(url));
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
};

window.saveForm = async function() {
    const title = document.getElementById('formTitle').value.trim() || 'Formulario sin título';
    
    if (tempQuestions.length === 0) {
        Utils.showToast('⚠️ Añade al menos una pregunta', 'error');
        return;
    }
    
    const invalid = tempQuestions.some(q => !q.title || q.title.trim() === '');
    if (invalid) {
        Utils.showToast('⚠️ Todas las preguntas deben tener título', 'error');
        return;
    }
    
    try {
        const slug = Utils.generateSlug(title);
        await formsManager.save(editingId, title, tempQuestions, slug);
        
        Utils.showToast('✅ Formulario guardado correctamente', 'success');
        editingId = null;
        tempQuestions = [];
        showView('dashboard');
    } catch (error) {
        Utils.showToast('❌ Error al guardar: ' + error.message, 'error');
    }
};

// ============================================================
// VER FORMULARIO (para responder)
// ============================================================

async function renderFormView(formId) {
    const form = formsManager.cache.find(f => f.id === formId);
    if (!form) {
        document.getElementById('formViewContent').innerHTML = `
            <div class="card text-center py-12 text-red-400">
                <p>Formulario no encontrado</p>
            </div>
        `;
        return;
    }
    
    currentFormId = formId;
    const questions = form.questions || [];
    
    let html = `
        <div class="card mb-6">
            <h1 class="text-2xl font-bold">${Utils.escapeHtml(form.title)}</h1>
            <p class="text-gray-400 text-sm mt-1">${questions.length} preguntas</p>
        </div>
        <form id="responseForm" class="space-y-4" onsubmit="submitResponse(event)">
            <input type="hidden" name="formId" value="${form.id}" />
    `;
    
    questions.forEach((q, index) => {
        html += `
            <div class="card">
                <label class="font-medium block mb-2">
                    ${Utils.escapeHtml(q.title || 'Pregunta sin título')}
                    ${q.required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                ${getQuestionInput(q, index)}
            </div>
        `;
    });
    
    html += `
            <button type="submit" class="btn-blue w-full py-4 text-lg">📤 Enviar respuestas</button>
        </form>
    `;
    
    document.getElementById('formViewContent').innerHTML = html;
}

function getQuestionInput(q, index) {
    const name = `q${index}`;
    switch(q.type) {
        case 'text':
            return `<input name="${name}" class="form-input" placeholder="Tu respuesta" />`;
        case 'textarea':
            return `<textarea name="${name}" class="form-input" rows="3" placeholder="Tu respuesta"></textarea>`;
        case 'radio':
            return (q.options || ['Opción 1']).map(opt => 
                `<div class="flex items-center gap-2"><input type="radio" name="${name}" value="${Utils.escapeHtml(opt)}" /> ${Utils.escapeHtml(opt)}</div>`
            ).join('');
        case 'checkbox':
            return (q.options || ['Opción 1']).map(opt => 
                `<div class="flex items-center gap-2"><input type="checkbox" name="${name}" value="${Utils.escapeHtml(opt)}" /> ${Utils.escapeHtml(opt)}</div>`
            ).join('');
        case 'select':
            return `
                <select name="${name}" class="form-input">
                    <option value="">Selecciona...</option>
                    ${(q.options || ['Opción 1']).map(opt => `<option value="${Utils.escapeHtml(opt)}">${Utils.escapeHtml(opt)}</option>`).join('')}
                </select>
            `;
        default:
            return `<input name="${name}" class="form-input" placeholder="Tu respuesta" />`;
    }
}

window.submitResponse = async function(event) {
    event.preventDefault();
    const form = event.target;
    const formId = form.querySelector('[name="formId"]').value;
    const formData = new FormData(form);
    
    const answers = [];
    for (let [key, value] of formData.entries()) {
        if (key !== 'formId' && value) {
            answers.push({ question: key, value: value });
        }
    }
    
    if (answers.length === 0) {
        Utils.showToast('⚠️ Responde al menos una pregunta', 'error');
        return;
    }
    
    try {
        await responsesManager.save(formId, answers);
        
        document.getElementById('formViewContent').innerHTML = `
            <div class="card text-center py-12">
                <div class="text-6xl mb-4">✅</div>
                <h2 class="text-2xl font-bold">¡Respuesta enviada!</h2>
                <p class="text-gray-400 mt-2">Gracias por completar el formulario</p>
                <button onclick="goBack()" class="btn-blue mt-4">Volver</button>
            </div>
        `;
        Utils.showToast('✅ Respuesta enviada correctamente', 'success');
    } catch (error) {
        Utils.showToast('❌ Error al enviar: ' + error.message, 'error');
    }
};

// ============================================================
// VER RESPUESTAS
// ============================================================

async function renderResponses(formId) {
    const form = formsManager.cache.find(f => f.id === formId);
    if (!form) {
        document.getElementById('responsesContent').innerHTML = `
            <div class="card text-center py-12 text-red-400">
                <p>Formulario no encontrado</p>
            </div>
        `;
        return;
    }
    
    const responses = await responsesManager.getByForm(formId);
    const questions = form.questions || [];
    
    let html = `
        <div class="card mb-6">
            <h2 class="text-xl font-bold">${Utils.escapeHtml(form.title)}</h2>
            <p class="text-gray-400">${responses.length} respuestas recibidas</p>
        </div>
    `;
    
    if (responses.length === 0) {
        html += `<div class="card text-center py-12 text-gray-400">📭 Aún no hay respuestas</div>`;
    } else {
        html += `
            <div class="grid md:grid-cols-3 gap-4 mb-6">
                <div class="card text-center">
                    <p class="text-3xl font-bold">${responses.length}</p>
                    <p class="text-sm text-gray-400">Total respuestas</p>
                </div>
                <div class="card text-center">
                    <p class="text-3xl font-bold">${questions.length}</p>
                    <p class="text-sm text-gray-400">Preguntas</p>
                </div>
                <div class="card text-center">
                    <p class="text-3xl font-bold">${new Date(form.created_at).toLocaleDateString()}</p>
                    <p class="text-sm text-gray-400">Creado</p>
                </div>
            </div>
        `;
        
        html += `<div class="space-y-3">`;
        responses.forEach((r, index) => {
            html += `
                <div class="card">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-700">Respuesta #${responses.length - index}</p>
                            <p class="text-xs text-gray-400">${new Date(r.created_at).toLocaleString()}</p>
                        </div>
                        <span class="badge badge-green">Completado</span>
                    </div>
                    <div class="mt-2 space-y-1 text-sm">
                        ${r.answers.map(a => `
                            <div><span class="text-gray-400">${Utils.escapeHtml(a.question)}:</span> ${Utils.escapeHtml(a.value)}</div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    document.getElementById('responsesContent').innerHTML = html;
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

async function init() {
    // Verificar conexión
    try {
        const { data, error } = await supabase.from('forms').select('count').limit(1);
        if (error) throw error;
        document.getElementById('statusText').textContent = 'online';
        document.getElementById('statusDot').className = 'w-2 h-2 rounded-full bg-green-400 inline-block';
    } catch (error) {
        document.getElementById('statusText').textContent = 'offline';
        document.getElementById('statusDot').className = 'w-2 h-2 rounded-full bg-red-400 inline-block';
        Utils.showToast('⚠️ No se pudo conectar con Supabase', 'error');
    }
    
    // Detectar si venimos de un enlace compartido
    const params = new URLSearchParams(window.location.search);
    const formId = params.get('form');
    
    if (formId) {
        await formsManager.getAll();
        const form = formsManager.cache.find(f => f.id === formId);
        if (form) {
            showView('form', formId);
        } else {
            showView('dashboard');
            Utils.showToast('⚠️ Este formulario no existe', 'error');
        }
    } else {
        showView('dashboard');
    }
    
    // Limpiar URL
    if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);

console.log('🚀 FormPro v2.0 - Estructura profesional');
console.log('📦 Base de datos: Supabase');
console.log('🌍 Accesible desde cualquier lugar');