// ============================================================
// ORGANIZATION - Carpetas, etiquetas, favoritos, plantillas
// ============================================================

(function() {
    'use strict';
    
    // ============================================================
    // ESTRUCTURA DE DATOS
    // ============================================================
    
    const ORGANIZATION_KEY = 'formpro_organization';
    
    let organizationData = {
        folders: [],
        tags: [],
        favorites: [],
        archived: [],
        deleted: [],
        templates: []
    };
    
    // ============================================================
    // CARGA Y GUARDADO
    // ============================================================
    
    function loadOrganization() {
        try {
            const data = localStorage.getItem(ORGANIZATION_KEY);
            if (data) {
                organizationData = JSON.parse(data);
            }
        } catch (e) {
            console.warn('Error loading organization data:', e);
        }
        return organizationData;
    }
    
    function saveOrganization() {
        try {
            localStorage.setItem(ORGANIZATION_KEY, JSON.stringify(organizationData));
        } catch (e) {
            console.warn('Error saving organization data:', e);
        }
    }
    
    window.organization = {
        load: loadOrganization,
        save: saveOrganization,
        get: () => organizationData
    };
    
    // ============================================================
    // CARPETAS
    // ============================================================
    
    window.createFolder = function(name, color = '#007AFF') {
        const folder = {
            id: Utils.generateId(),
            name: name.trim(),
            color: color,
            created_at: new Date().toISOString(),
            formIds: []
        };
        organizationData.folders.push(folder);
        saveOrganization();
        return folder;
    };
    
    window.deleteFolder = function(folderId) {
        organizationData.folders = organizationData.folders.filter(f => f.id !== folderId);
        saveOrganization();
    };
    
    window.addFormToFolder = function(formId, folderId) {
        const folder = organizationData.folders.find(f => f.id === folderId);
        if (folder && !folder.formIds.includes(formId)) {
            folder.formIds.push(formId);
            saveOrganization();
            return true;
        }
        return false;
    };
    
    window.removeFormFromFolder = function(formId, folderId) {
        const folder = organizationData.folders.find(f => f.id === folderId);
        if (folder) {
            folder.formIds = folder.formIds.filter(id => id !== formId);
            saveOrganization();
            return true;
        }
        return false;
    };
    
    window.getFormsInFolder = function(folderId) {
        const folder = organizationData.folders.find(f => f.id === folderId);
        if (folder) {
            return window.formsManager.cache.filter(f => folder.formIds.includes(f.id));
        }
        return [];
    };
    
    // ============================================================
    // ETIQUETAS
    // ============================================================
    
    window.createTag = function(name, color = '#8B5CF6') {
        const tag = {
            id: Utils.generateId(),
            name: name.trim(),
            color: color,
            created_at: new Date().toISOString()
        };
        organizationData.tags.push(tag);
        saveOrganization();
        return tag;
    };
    
    window.deleteTag = function(tagId) {
        organizationData.tags = organizationData.tags.filter(t => t.id !== tagId);
        saveOrganization();
    };
    
    window.addTagToForm = function(formId, tagId) {
        // Las etiquetas se guardan en el formulario
        const form = window.formsManager.cache.find(f => f.id === formId);
        if (form) {
            if (!form.tags) form.tags = [];
            if (!form.tags.includes(tagId)) {
                form.tags.push(tagId);
                saveOrganization();
                return true;
            }
        }
        return false;
    };
    
    window.removeTagFromForm = function(formId, tagId) {
        const form = window.formsManager.cache.find(f => f.id === formId);
        if (form && form.tags) {
            form.tags = form.tags.filter(t => t !== tagId);
            saveOrganization();
            return true;
        }
        return false;
    };
    
    window.getFormsByTag = function(tagId) {
        return window.formsManager.cache.filter(f => f.tags && f.tags.includes(tagId));
    };
    
    // ============================================================
    // FAVORITOS
    // ============================================================
    
    window.toggleFavorite = function(formId) {
        const index = organizationData.favorites.indexOf(formId);
        if (index === -1) {
            organizationData.favorites.push(formId);
        } else {
            organizationData.favorites.splice(index, 1);
        }
        saveOrganization();
        return index === -1;
    };
    
    window.isFavorite = function(formId) {
        return organizationData.favorites.includes(formId);
    };
    
    window.getFavorites = function() {
        return window.formsManager.cache.filter(f => organizationData.favorites.includes(f.id));
    };
    
    // ============================================================
    // ARCHIVAR
    // ============================================================
    
    window.archiveForm = function(formId) {
        if (!organizationData.archived.includes(formId)) {
            organizationData.archived.push(formId);
            saveOrganization();
            return true;
        }
        return false;
    };
    
    window.unarchiveForm = function(formId) {
        organizationData.archived = organizationData.archived.filter(id => id !== formId);
        saveOrganization();
    };
    
    window.isArchived = function(formId) {
        return organizationData.archived.includes(formId);
    };
    
    window.getArchived = function() {
        return window.formsManager.cache.filter(f => organizationData.archived.includes(f.id));
    };
    
    // ============================================================
    // PAPELERA
    // ============================================================
    
    window.moveToTrash = function(formId) {
        if (!organizationData.deleted.includes(formId)) {
            organizationData.deleted.push(formId);
            saveOrganization();
            return true;
        }
        return false;
    };
    
    window.restoreFromTrash = function(formId) {
        organizationData.deleted = organizationData.deleted.filter(id => id !== formId);
        saveOrganization();
    };
    
    window.permanentlyDelete = function(formId) {
        organizationData.deleted = organizationData.deleted.filter(id => id !== formId);
        // También eliminar de favoritos y archivos
        organizationData.favorites = organizationData.favorites.filter(id => id !== formId);
        organizationData.archived = organizationData.archived.filter(id => id !== formId);
        saveOrganization();
        // Eliminar de la base de datos
        if (window.formsManager) {
            window.formsManager.delete(formId);
        }
    };
    
    window.isInTrash = function(formId) {
        return organizationData.deleted.includes(formId);
    };
    
    window.getTrash = function() {
        return window.formsManager.cache.filter(f => organizationData.deleted.includes(f.id));
    };
    
    // ============================================================
    // DUPLICAR FORMULARIO
    // ============================================================
    
    window.duplicateForm = async function(formId, newTitle) {
        const original = window.formsManager.cache.find(f => f.id === formId);
        if (!original) {
            throw new Error('Formulario no encontrado');
        }
        
        const title = newTitle || `${original.title} (copia)`;
        const slug = Utils.generateSlug(title);
        
        const newForm = await window.formsManager.save(
            null,
            title,
            JSON.parse(JSON.stringify(original.questions || [])),
            slug
        );
        
        // Copiar metadatos
        await window.formsManager.updateMeta(newForm.id, {
            allowMultiple: original.allowmultiple || false,
            showAnswers: original.showanswers || false,
            description: original.description || ''
        });
        
        // Copiar organización
        if (original.tags) {
            newForm.tags = [...original.tags];
        }
        saveOrganization();
        
        return newForm;
    };
    
    // ============================================================
    // PLANTILLAS
    // ============================================================
    
    window.saveAsTemplate = function(formId, templateName) {
        const form = window.formsManager.cache.find(f => f.id === formId);
        if (!form) return null;
        
        const template = {
            id: Utils.generateId(),
            name: templateName || form.title,
            description: form.description || '',
            questions: JSON.parse(JSON.stringify(form.questions || [])),
            config: {
                allowMultiple: form.allowmultiple || false,
                showAnswers: form.showanswers || false
            },
            created_at: new Date().toISOString()
        };
        
        organizationData.templates.push(template);
        saveOrganization();
        return template;
    };
    
    window.createFromTemplate = async function(templateId, newTitle) {
        const template = organizationData.templates.find(t => t.id === templateId);
        if (!template) throw new Error('Plantilla no encontrada');
        
        const title = newTitle || template.name;
        const slug = Utils.generateSlug(title);
        
        const newForm = await window.formsManager.save(
            null,
            title,
            JSON.parse(JSON.stringify(template.questions || [])),
            slug
        );
        
        await window.formsManager.updateMeta(newForm.id, {
            allowMultiple: template.config?.allowMultiple || false,
            showAnswers: template.config?.showAnswers || false,
            description: template.description || ''
        });
        
        return newForm;
    };
    
    window.getTemplates = function() {
        return organizationData.templates;
    };
    
    window.deleteTemplate = function(templateId) {
        organizationData.templates = organizationData.templates.filter(t => t.id !== templateId);
        saveOrganization();
    };
    
    // ============================================================
    // BUSCAR POR CATEGORÍA
    // ============================================================
    
    window.searchForms = function(query, filters = {}) {
        let results = window.formsManager.cache;
        
        // Búsqueda por texto
        if (query) {
            const q = query.toLowerCase();
            results = results.filter(f => 
                f.title?.toLowerCase().includes(q) ||
                f.description?.toLowerCase().includes(q) ||
                f.slug?.toLowerCase().includes(q)
            );
        }
        
        // Filtrar por carpeta
        if (filters.folder) {
            const folder = organizationData.folders.find(f => f.id === filters.folder);
            if (folder) {
                results = results.filter(f => folder.formIds.includes(f.id));
            }
        }
        
        // Filtrar por etiqueta
        if (filters.tag) {
            results = results.filter(f => f.tags && f.tags.includes(filters.tag));
        }
        
        // Favoritos
        if (filters.favorites) {
            results = results.filter(f => organizationData.favorites.includes(f.id));
        }
        
        // Archivados
        if (filters.archived) {
            results = results.filter(f => organizationData.archived.includes(f.id));
        }
        
        // No archivados
        if (filters.notArchived) {
            results = results.filter(f => !organizationData.archived.includes(f.id));
        }
        
        // Papelera
        if (filters.trash) {
            results = results.filter(f => organizationData.deleted.includes(f.id));
        }
        
        // No en papelera
        if (filters.notTrash) {
            results = results.filter(f => !organizationData.deleted.includes(f.id));
        }
        
        return results;
    };
    
    // Inicializar
    loadOrganization();
    
    console.log('✅ Organization System cargado');
    
})();