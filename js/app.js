// ============================================================
// APP - Inicialización y navegación (SERVIDOR CENTRAL)
// ============================================================

(function() {
    'use strict';
    
    console.log('🚀 Iniciando FormPro...');
    
    // ============================================================
    // VERIFICAR CONFIGURACIÓN
    // ============================================================
    
    function checkSupabaseConfig() {
        if (typeof window.SUPABASE_CONFIG === 'undefined') {
            console.warn('⚠️ SUPABASE_CONFIG no encontrado, usando valores por defecto');
            window.SUPABASE_CONFIG = {
                url: 'https://josxcvncescqqlajahkh.supabase.co',
                anonKey: 'sb_publishable_UvqSGCMonC_9ncBmYV14tw_PLM6-9R8'
            };
        }
        return true;
    }
    checkSupabaseConfig();
    
    // ============================================================
    // CREAR SUPABASE CLIENTE
    // ============================================================
    
    let supabaseClient = null;
    try {
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            supabaseClient = supabase.createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.anonKey
            );
            console.log('✅ Supabase cliente creado correctamente');
        } else {
            console.warn('⚠️ Supabase no está disponible, usando modo offline');
        }
    } catch (error) {
        console.error('❌ Error al crear cliente Supabase:', error);
        supabaseClient = null;
    }
    
    // ============================================================
    // INICIALIZAR MANAGERS
    // ============================================================
    
    let formsManager = null;
    let responsesManager = null;
    
    function initManagers() {
        try {
            // Verificar que las clases existen
            if (typeof FormsManager !== 'undefined') {
                formsManager = new FormsManager(supabaseClient);
                console.log('✅ FormsManager creado');
            } else {
                console.warn('⚠️ FormsManager no definido, creando placeholder');
                // Crear un placeholder con métodos básicos
                formsManager = {
                    cache: [],
                    isLoading: false,
                    getAll: async function() { return this.cache; },
                    getById: async function(id) { return this.cache.find(f => f.id === id) || null; },
                    getBySlug: async function(slug) { return this.cache.find(f => f.slug === slug) || null; },
                    save: async function(id, title, questions, slug) { 
                        const newForm = { id: id || Utils.generateId(), title, questions, slug, created_at: new Date().toISOString() };
                        this.cache.push(newForm);
                        return newForm;
                    },
                    updateMeta: async function(id, meta) { return true; },
                    updateConfig: async function(id, config) { return true; },
                    delete: async function(id) { this.cache = this.cache.filter(f => f.id !== id); return true; },
                    duplicate: async function(id, title) { return null; },
                    clearCache: function() { this.cache = []; this.isLoading = false; },
                    refresh: async function() { return this.cache; },
                    getConfig: function(id) { return {}; }
                };
            }
            
            if (typeof ResponsesManager !== 'undefined') {
                responsesManager = new ResponsesManager(supabaseClient);
                console.log('✅ ResponsesManager creado');
            } else {
                console.warn('⚠️ ResponsesManager no definido, creando placeholder');
                responsesManager = {
                    cache: [],
                    isLoading: false,
                    save: async function(formId, answers) { return { id: Utils.generateId(), form_id: formId, answers }; },
                    getByForm: async function(formId) { return this.cache.filter(r => r.form_id === formId); },
                    correct: async function(responseId, correction) { return true; },
                    getStats: async function(formId) { return { total: 0, corrected: 0, pending: 0, averageScore: 0 }; },
                    deleteByForm: async function(formId) { this.cache = this.cache.filter(r => r.form_id !== formId); },
                    deleteResponse: async function(responseId) { this.cache = this.cache.filter(r => r.id !== responseId); },
                    clearCache: function() { this.cache = []; this.isLoading = false; },
                    refresh: async function(formId) { return this.cache; }
                };
            }
        } catch (error) {
            console.error('❌ Error al crear managers:', error);
            // Crear objetos vacíos pero funcionales
            formsManager = {
                cache: [],
                isLoading: false,
                getAll: async function() { return this.cache; },
                getById: async function(id) { return this.cache.find(f => f.id === id) || null; },
                save: async function(id, title, questions, slug) { 
                    const newForm = { id: id || Utils.generateId(), title, questions, slug };
                    this.cache.push(newForm);
                    return newForm;
                },
                updateMeta: async function(id, meta) { return true; },
                updateConfig: async function(id, config) { return true; },
                delete: async function(id) { this.cache = this.cache.filter(f => f.id !== id); return true; },
                clearCache: function() { this.cache = []; this.isLoading = false; },
                refresh: async function() { return this.cache; },
                getConfig: function(id) { return {}; }
            };
            responsesManager = {
                cache: [],
                isLoading: false,
                save: async function(formId, answers) { return { id: Utils.generateId(), form_id: formId, answers }; },
                getByForm: async function(formId) { return this.cache.filter(r => r.form_id === formId); },
                correct: async function(responseId, correction) { return true; },
                getStats: async function(formId) { return { total: 0, corrected: 0, pending: 0, averageScore: 0 }; },
                deleteByForm: async function(formId) { this.cache = this.cache.filter(r => r.form_id !== formId); },
                clearCache: function() { this.cache = []; this.isLoading = false; },
                refresh: async function(formId) { return this.cache; }
            };
        }
    }
    
    // Inicializar managers inmediatamente
    initManagers();
    
    // EXPONER MANAGERS GLOBALMENTE
    window.formsManager = formsManager;
    window.responsesManager = responsesManager;
    
    // ============================================================
    // VERIFICAR QUE LOS MANAGERS EXISTEN
    // ============================================================
    
    function ensureManagers() {
        if (!window.formsManager) {
            console.warn('⚠️ formsManager no existe, recreando...');
            window.formsManager = formsManager || {
                cache: [],
                isLoading: false,
                getAll: async function() { return this.cache; },
                getById: async function(id) { return this.cache.find(f => f.id === id) || null; },
                save: async function(id, title, questions, slug) { 
                    const newForm = { id: id || Utils.generateId(), title, questions, slug, created_at: new Date().toISOString() };
                    this.cache.push(newForm);
                    return newForm;
                },
                updateMeta: async function(id, meta) { return true; },
                updateConfig: async function(id, config) { return true; },
                delete: async function(id) { this.cache = this.cache.filter(f => f.id !== id); return true; },
                clearCache: function() { this.cache = []; this.isLoading = false; },
                refresh: async function() { return this.cache; },
                getConfig: function(id) { return {}; }
            };
        }
        if (!window.responsesManager) {
            console.warn('⚠️ responsesManager no existe, recreando...');
            window.responsesManager = responsesManager || {
                cache: [],
                isLoading: false,
                save: async function(formId, answers) { return { id: Utils.generateId(), form_id: formId, answers }; },
                getByForm: async function(formId) { return this.cache.filter(r => r.form_id === formId); },
                correct: async function(responseId, correction) { return true; },
                getStats: async function(formId) { return { total: 0, corrected: 0, pending: 0, averageScore: 0 }; },
                deleteByForm: async function(formId) { this.cache = this.cache.filter(r => r.form_id !== formId); },
                clearCache: function() { this.cache = []; this.isLoading = false; },
                refresh: async function(formId) { return this.cache; }
            };
        }
    }
    
    // ============================================================
    // ESTADO GLOBAL
    // ============================================================
    
    let currentView = 'dashboard';
    let isAppInitialized = false;
    let editingId = null;
    let tempQuestions = [];
    let currentFormId = null;
    
    // Exponer estado global
    window.editingId = editingId;
    window.tempQuestions = tempQuestions;
    window.currentFormId = currentFormId;
    
    // ============================================================
    // NAVEGACIÓN (FUNCIÓN PRINCIPAL)
    // ============================================================
    
    window.showView = function(view, data) {
        // Asegurar que los managers existen
        ensureManagers();
        
        currentView = view;
        window.currentFormId = data || null;
        
        // Ocultar todas las vistas
        document.querySelectorAll('#mainApp [id^="view-"]').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Mostrar la vista seleccionada
        const target = document.getElementById(`view-${view}`);
        if (target) {
            target.classList.remove('hidden');
        }
        
        // Renderizar según vista
        switch(view) {
            case 'dashboard':
                if (typeof window.renderDashboard === 'function') {
                    window.renderDashboard();
                }
                break;
            case 'editor':
                if (typeof window.renderEditor === 'function') {
                    window.renderEditor();
                }
                break;
            case 'form':
                if (data && typeof window.renderFormView === 'function') {
                    window.renderFormView(data);
                }
                break;
            case 'responses':
                if (data && typeof window.renderResponses === 'function') {
                    window.renderResponses(data);
                }
                break;
            case 'stats':
                if (data && typeof window.renderStatsView === 'function') {
                    window.renderStatsView(data);
                }
                break;
            case 'student':
                if (typeof window.renderStudentDashboard === 'function') {
                    const content = window.renderStudentDashboard();
                    document.getElementById('studentContent').innerHTML = content;
                }
                break;
            case 'profile':
                if (typeof window.initProfile === 'function') {
                    window.initProfile();
                }
                break;
        }
        
        // Actualizar URL
        if (window.history && window.history.replaceState) {
            const url = view === 'dashboard' 
                ? window.location.pathname 
                : `${window.location.pathname}?view=${view}${data ? `&id=${data}` : ''}`;
            window.history.replaceState({ view, data }, '', url);
        }
        
        // Actualizar navbar según rol después de cambiar de vista
        if (view === 'dashboard' || view === 'profile' || view === 'student') {
            updateNavbarByRole();
        }
    };
    
    window.goBack = function() {
        window.showView('dashboard');
    };
    
    // ============================================================
    // CARGA DE DATOS INICIALES
    // ============================================================
    
    window.initApp = async function() {
        if (isAppInitialized) return;
        isAppInitialized = true;
        
        // Asegurar managers
        ensureManagers();
        
        try {
            // Verificar conexión a Supabase
            if (supabaseClient) {
                try {
                    const { error } = await supabaseClient
                        .from('forms')
                        .select('count')
                        .limit(1);
                    
                    if (error) {
                        console.warn('⚠️ Error de conexión a Supabase:', error);
                        if (typeof Utils !== 'undefined') {
                            Utils.showNotification('⚠️ No se pudo conectar con la base de datos', 'warning');
                        }
                    } else {
                        console.log('✅ Conexión a Supabase establecida');
                    }
                } catch (e) {
                    console.warn('⚠️ Error de conexión:', e);
                }
            }
        } catch (error) {
            console.error('⚠️ Error de conexión:', error);
        }
        
        // Cargar formularios
        if (window.formsManager && typeof window.formsManager.getAll === 'function') {
            try {
                await window.formsManager.getAll();
                console.log('✅ Formularios cargados:', window.formsManager.cache?.length || 0);
            } catch (error) {
                console.error('❌ Error cargando formularios:', error);
                // Si falla, usar caché vacía
                if (window.formsManager) {
                    window.formsManager.cache = [];
                }
            }
        } else {
            console.warn('⚠️ formsManager no disponible para cargar datos');
            // Crear un formsManager básico si no existe
            if (!window.formsManager) {
                window.formsManager = {
                    cache: [],
                    isLoading: false,
                    getAll: async function() { return this.cache; },
                    getById: async function(id) { return this.cache.find(f => f.id === id) || null; },
                    save: async function(id, title, questions, slug) { 
                        const newForm = { id: id || Utils.generateId(), title, questions, slug, created_at: new Date().toISOString() };
                        this.cache.push(newForm);
                        return newForm;
                    },
                    updateMeta: async function(id, meta) { return true; },
                    updateConfig: async function(id, config) { return true; },
                    delete: async function(id) { this.cache = this.cache.filter(f => f.id !== id); return true; },
                    clearCache: function() { this.cache = []; this.isLoading = false; },
                    refresh: async function() { return this.cache; },
                    getConfig: function(id) { return {}; }
                };
            }
            if (!window.responsesManager) {
                window.responsesManager = {
                    cache: [],
                    isLoading: false,
                    save: async function(formId, answers) { return { id: Utils.generateId(), form_id: formId, answers }; },
                    getByForm: async function(formId) { return this.cache.filter(r => r.form_id === formId); },
                    correct: async function(responseId, correction) { return true; },
                    getStats: async function(formId) { return { total: 0, corrected: 0, pending: 0, averageScore: 0 }; },
                    deleteByForm: async function(formId) { this.cache = this.cache.filter(r => r.form_id !== formId); },
                    clearCache: function() { this.cache = []; this.isLoading = false; },
                    refresh: async function(formId) { return this.cache; }
                };
            }
        }
        
        // Actualizar navbar según rol
        updateNavbarByRole();
        
        // Mostrar dashboard
        window.showView('dashboard');
    };
    
    // ============================================================
    // ACTUALIZAR NAVBAR SEGÚN ROL
    // ============================================================
    
    function updateNavbarByRole() {
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        const isAdmin = user?.role === 'admin';
        const isAlumno = user?.role === 'alumno' || user?.role === 'student';
        
        // Mostrar/ocultar elementos del navbar
        const navbarActions = document.querySelector('.navbar-actions');
        if (!navbarActions) return;
        
        // Botón "Nuevo" - solo admin
        const newBtn = navbarActions.querySelector('.btn-primary');
        if (newBtn) {
            newBtn.style.display = isAdmin ? '' : 'none';
        }
        
        // Botón "Papelera" - solo admin
        const trashBtn = navbarActions.querySelector('[onclick*="showTrash"]');
        if (trashBtn) {
            trashBtn.style.display = isAdmin ? '' : 'none';
        }
        
        // Botón "Dashboard" - siempre visible para admin, oculto para alumno
        const dashboardBtn = navbarActions.querySelector('[onclick*="showView(\'dashboard\')"]');
        if (dashboardBtn) {
            dashboardBtn.style.display = isAdmin ? '' : 'none';
        }
        
        // Botón de "Mi Panel" para alumnos
        const existingStudentBtn = navbarActions.querySelector('.student-dashboard-btn');
        if (existingStudentBtn) existingStudentBtn.remove();
        
        if (isAlumno && !isAdmin) {
            const studentBtn = document.createElement('button');
            studentBtn.className = 'nav-btn student-dashboard-btn';
            studentBtn.innerHTML = '<i data-lucide="graduation-cap" class="w-4 h-4"></i> Mi Panel';
            studentBtn.onclick = () => window.showView('student');
            // Insertar antes de Salir
            const logoutBtn = navbarActions.querySelector('[onclick*="logout"]');
            if (logoutBtn) {
                navbarActions.insertBefore(studentBtn, logoutBtn);
            } else {
                navbarActions.appendChild(studentBtn);
            }
            setTimeout(() => {
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }, 100);
        }
        
        // Actualizar badge de rol
        const existingRole = navbarActions.querySelector('.role-badge');
        if (existingRole) existingRole.remove();
        
        if (user) {
            const roleBadge = document.createElement('span');
            roleBadge.className = `role-badge role-${user.role}`;
            roleBadge.textContent = isAdmin ? '👑 Admin' : '🎓 Alumno';
            navbarActions.insertBefore(roleBadge, navbarActions.firstChild);
        }
    }
    
    // ============================================================
    // MANEJO DE PARÁMETROS URL
    // ============================================================
    
    function handleUrlParams() {
        // Asegurar managers
        ensureManagers();
        
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view') || 'dashboard';
        const id = params.get('id');
        const form = params.get('form');
        
        // Enlace público de formulario
        if (form) {
            const loginScreen = document.getElementById('loginScreen');
            const mainApp = document.getElementById('mainApp');
            const navbar = document.querySelector('#mainApp nav');
            
            if (loginScreen) loginScreen.classList.add('hidden');
            if (mainApp) mainApp.classList.remove('hidden');
            if (navbar) navbar.style.display = 'none';
            
            document.querySelectorAll('.dashboard-only').forEach(el => {
                if (el) el.style.display = 'none';
            });
            
            if (window.formsManager && typeof window.formsManager.getById === 'function') {
                window.formsManager.getById(form).then(formData => {
                    if (formData) {
                        window.showView('form', form);
                    } else {
                        document.getElementById('formViewContent').innerHTML = `
                            <div class="card text-center py-12">
                                <div class="text-4xl mb-4">⚠️</div>
                                <h3 class="text-xl font-semibold text-red-500">Formulario no encontrado</h3>
                                <p class="text-sm text-gray-400 mt-2">El enlace puede ser incorrecto o el formulario ha sido eliminado</p>
                            </div>
                        `;
                        document.getElementById('view-form').classList.remove('hidden');
                    }
                }).catch(() => {
                    document.getElementById('formViewContent').innerHTML = `
                        <div class="card text-center py-12">
                            <div class="text-4xl mb-4">⚠️</div>
                            <h3 class="text-xl font-semibold text-red-500">Error al cargar el formulario</h3>
                            <p class="text-sm text-gray-400 mt-2">No se pudo cargar el formulario solicitado</p>
                        </div>
                    `;
                    document.getElementById('view-form').classList.remove('hidden');
                });
            }
            return true;
        }
        
        // Vistas normales - verificar permisos
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        const isAdmin = user?.role === 'admin';
        
        if (view === 'responses' && id) {
            if (!isAdmin) {
                Utils.showNotification('Solo el administrador puede ver respuestas', 'warning');
                window.showView('dashboard');
                return true;
            }
            window.showView('responses', id);
            return true;
        }
        
        if (view === 'stats' && id) {
            if (!isAdmin) {
                Utils.showNotification('Solo el administrador puede ver estadísticas', 'warning');
                window.showView('dashboard');
                return true;
            }
            window.showView('stats', id);
            return true;
        }
        
        if (view === 'editor') {
            if (!isAdmin) {
                Utils.showNotification('Solo el administrador puede crear o editar formularios', 'warning');
                window.showView('dashboard');
                return true;
            }
            if (id) window.editingId = id;
            window.showView('editor');
            return true;
        }
        
        if (view === 'form' && id) {
            window.showView('form', id);
            return true;
        }
        
        if (view === 'student') {
            if (isAdmin) {
                Utils.showNotification('El administrador no tiene panel de alumno', 'info');
                window.showView('dashboard');
                return true;
            }
            window.showView('student');
            return true;
        }
        
        if (view === 'profile') {
            window.showView('profile');
            return true;
        }
        
        if (view === 'dashboard') {
            window.showView('dashboard');
            return true;
        }
        
        return false;
    }
    
    // ============================================================
    // INICIALIZACIÓN COMPLETA
    // ============================================================
    
    async function init() {
        try {
            // Asegurar que los managers existen
            ensureManagers();
            
            // Verificar autenticación
            const isAuthenticated = typeof window.checkAuth === 'function' ? window.checkAuth() : false;
            
            if (isAuthenticated) {
                const loginScreen = document.getElementById('loginScreen');
                const mainApp = document.getElementById('mainApp');
                
                if (loginScreen) loginScreen.classList.add('hidden');
                if (mainApp) mainApp.classList.remove('hidden');
                
                await window.initApp();
                handleUrlParams();
            } else {
                const loginScreen = document.getElementById('loginScreen');
                const mainApp = document.getElementById('mainApp');
                
                if (loginScreen) loginScreen.classList.remove('hidden');
                if (mainApp) mainApp.classList.add('hidden');
                
                const loginUser = document.getElementById('loginUser');
                const loginPassword = document.getElementById('loginPassword');
                if (loginUser) loginUser.value = 'admin';
                if (loginPassword) loginPassword.value = 'admin123';
            }
        } catch (error) {
            console.error('Error en init:', error);
            document.body.innerHTML = `
                <div style="text-align:center;padding:50px;font-family:sans-serif;">
                    <h1 style="color:#EF4444;">⚠️ Error al iniciar la aplicación</h1>
                    <p style="color:#6B7280;">${error.message || 'Error desconocido'}</p>
                    <button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:#3B82F6;color:white;border:none;border-radius:8px;cursor:pointer;">
                        Recargar página
                    </button>
                </div>
            `;
        }
    }
    
    // ============================================================
    // EVENTOS GLOBALES
    // ============================================================
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('correctionModalOverlay');
            if (modal) {
                modal.remove();
            }
            const studentModal = document.getElementById('studentDashboardOverlay');
            if (studentModal) {
                studentModal.remove();
            }
            const editModal = document.getElementById('editUserModal');
            if (editModal) {
                editModal.remove();
            }
        }
    });
    
    // Cargar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    console.log('🚀 FormPro v2.0 - Iniciado correctamente');
    console.log('👤 Usuarios: admin/admin123, alumno/alumno123');
    console.log('📊 Estado:', {
        supabase: !!supabaseClient,
        formsManager: !!window.formsManager,
        responsesManager: !!window.responsesManager
    });
    
})();