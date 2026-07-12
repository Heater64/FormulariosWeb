// ============================================================
// ORGANIZATION - Carpetas, favoritos, papelera (100% Supabase)
// Persistencia en users.organization (JSONB) del usuario actual.
// ============================================================

(function() {
    'use strict';
    
    console.log('📦 Inicializando Organization System (Supabase)...');
    
    let organizationData = {
        favorites: [],
        archived: [],
        deleted: []
    };
    let loadedUserId = null;
    
    function defaultOrg() {
        return { favorites: [], archived: [], deleted: [] };
    }
    
    // Cargar la organización del usuario actual desde Supabase
    window.initUserOrganization = async function() {
        const user = window.getCurrentUser();
        const sb = window.supabaseClient;
        if (!user || !sb) {
            organizationData = defaultOrg();
            return;
        }
        try {
            const { data, error } = await sb
                .from('users')
                .select('organization')
                .eq('id', user.id)
                .maybeSingle();
            if (!error && data && data.organization) {
                organizationData = Object.assign(defaultOrg(), data.organization);
            } else {
                organizationData = defaultOrg();
            }
        } catch (e) {
            console.warn('⚠️ Error cargando organización:', e.message);
            organizationData = defaultOrg();
        }
        loadedUserId = user.id;
    };
    
    async function saveUserOrganization() {
        const user = window.getCurrentUser();
        const sb = window.supabaseClient;
        if (!user || !sb) return;
        try {
            await sb.from('users').update({ organization: organizationData }).eq('id', user.id);
        } catch (e) {
            console.warn('⚠️ No se pudo guardar organización:', e.message);
        }
    }
    
    // ============================================================
    // FAVORITOS
    // ============================================================
    
    window.toggleFavorite = function(formId) {
        const index = organizationData.favorites.indexOf(formId);
        if (index === -1) organizationData.favorites.push(formId);
        else organizationData.favorites.splice(index, 1);
        saveUserOrganization();
        return index === -1;
    };
    
    window.isFavorite = function(formId) {
        return organizationData.favorites.includes(formId);
    };
    
    window.getFavorites = function() {
        return window.formsManager?.cache?.filter(f => organizationData.favorites.includes(f.id)) || [];
    };
    
    // ============================================================
    // ARCHIVAR
    // ============================================================
    
    window.archiveForm = function(formId) {
        if (!organizationData.archived.includes(formId)) {
            organizationData.archived.push(formId);
            saveUserOrganization();
            return true;
        }
        return false;
    };
    
    window.unarchiveForm = function(formId) {
        organizationData.archived = organizationData.archived.filter(id => id !== formId);
        saveUserOrganization();
    };
    
    window.isArchived = function(formId) {
        return organizationData.archived.includes(formId);
    };
    
    // ============================================================
    // PAPELERA
    // ============================================================
    
    window.moveToTrash = function(formId) {
        if (!organizationData.deleted.includes(formId)) {
            organizationData.deleted.push(formId);
            saveUserOrganization();
            return true;
        }
        return false;
    };
    
    window.restoreFromTrash = function(formId) {
        organizationData.deleted = organizationData.deleted.filter(id => id !== formId);
        saveUserOrganization();
    };
    
    window.permanentlyDelete = async function(formId) {
        organizationData.deleted = organizationData.deleted.filter(id => id !== formId);
        organizationData.favorites = organizationData.favorites.filter(id => id !== formId);
        organizationData.archived = organizationData.archived.filter(id => id !== formId);
        saveUserOrganization();
        if (window.formsManager) {
            await window.formsManager.delete(formId);
        }
    };
    
    window.isInTrash = function(formId) {
        return organizationData.deleted.includes(formId);
    };
    
    window.getTrash = function() {
        return window.formsManager?.cache?.filter(f => organizationData.deleted.includes(f.id)) || [];
    };
    
    console.log('✅ Organization System cargado (Supabase)');
    
})();
