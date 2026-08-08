// ============================================================
// js/services/push-notification-service.js
// Puente de notificaciones NATIVAS Android (FCM) vía Capacitor.
// ============================================================
// Capa ADICIONAL sobre el historial in-app (notification-service +
// tabla `notificaciones`). No reemplaza nada:
//
//   Supabase ── tabla dispositivos_notificacion (tokens FCM)
//   Edge Function enviar-push (supabase/functions/enviar-push) ──▶ FCM
//   Capacitor Push Notifications ──▶ sistema tray de Android
//
// FLUJO:
//   • Arranque/login  → permiso + register() + guardar token en Supabase
//   • App en segundo plano o cerrada → Android muestra el aviso del sistema
//     (payload FCM) y al pulsarlo navega a la url del payload.
//   • App en primer plano → la presentación la hace la capa in-app existente
//     (realtime/polling de notification-service), para no duplicar avisos.
//   • Logout → desactiva los tokens del usuario (deja de recibir push).
//   • Heartbeat → actualiza ultima_actividad de los tokens.
//
// El token FCM vive solo en memoria y en Supabase: nunca en localStorage
// como fuente principal.
//
// NOTA DE EMPAQUETADO: este archivo es un script clásico que Vite copia
// tal cual a dist/ (no pasa por el bundler), por eso NO usa import() de
// paquetes npm: accede a los plugins vía Capacitor.Plugins.* (el runtime
// nativo los registra en esa propiedad).
// ============================================================

(function (root) {
  'use strict';

  // Canales Android (ids usados también por la Edge Function enviar-push).
  const CANALES = [
    { id: 'general',      nombre: 'General',      descripcion: 'Avisos generales de FormsBiblicos',          importancia: 4 },
    { id: 'desafios',     nombre: 'Desafíos',     descripcion: 'Desafíos de memorización y sus resultados',  importancia: 4 },
    { id: 'examenes',     nombre: 'Exámenes',     descripcion: 'Exámenes publicados, entregas y correcciones', importancia: 4 },
    { id: 'recordatorios', nombre: 'Recordatorios', descripcion: 'Repasos y recordatorios de estudio',       importancia: 3 },
    { id: 'sistema',      nombre: 'Sistema',      descripcion: 'Avisos del sistema y anuncios',              importancia: 4 }
  ];

  // Los tokens FCM de Android son cadenas largas alfanuméricas con - y _.
  const TOKEN_RE = /^[A-Za-z0-9:_\-]{40,}$/;

  // ------------------------------------------------------------
  // Funciones puras (expuestas para tests)
  // ------------------------------------------------------------

  function esCapacitor() {
    try {
      return !!(root.Capacitor && typeof root.Capacitor.isNativePlatform === 'function' && root.Capacitor.isNativePlatform());
    } catch (e) {
      return false;
    }
  }

  function tokenValido(token) {
    return typeof token === 'string' && TOKEN_RE.test(token);
  }

  // Mapeo categoría del historial → canal Android (misma tabla que la
  // Edge Function; mantenerlas sincronizadas).
  function canalDe(categoria) {
    const mapa = {
      desafios: 'desafios',
      examenes: 'examenes',
      estudio: 'recordatorios',
      grupos: 'general',
      logros: 'general',
      sistema: 'sistema',
      anuncios: 'sistema'
    };
    return mapa[categoria] || 'general';
  }

  // Deriva la ruta de la app a partir de los datos del payload FCM.
  // Soporta `url` directa y fallbacks por tipo para payloads antiguos.
  function urlDe(datos) {
    if (!datos || typeof datos !== 'object') return null;
    if (typeof datos.url === 'string' && datos.url) return datos.url;
    const tipo = typeof datos.tipo === 'string' ? datos.tipo : '';
    const id = (k) => datos['d.' + k] || datos[k] || null;
    if (tipo === 'desafio' || tipo.startsWith('desafio.')) {
      const desafioId = id('desafio_id') || id('desafioId');
      if (desafioId) return '/desafio/' + desafioId;
    }
    if (tipo === 'examen_publicado' || tipo === 'examen_corregido' || tipo.startsWith('examen.')) {
      const examenId = id('examen_id') || id('examenId');
      if (examenId) return '/tomar/' + examenId;
    }
    if (tipo === 'examen_entregado') {
      const examenId = id('examen_id') || id('examenId');
      if (examenId) return '/corregir/' + examenId;
    }
    if (tipo === 'mazo_nuevo' || tipo === 'recordatorio' || tipo === 'recordatorio.repasos') return '/memorizacion';
    return null;
  }

  // Convierte una fila del historial en el payload que consume la Edge
  // Function enviar-push.
  function aPayloadPush(fila) {
    if (!fila || typeof fila !== 'object' || !fila.usuario_id) return null;
    const datos = (fila.datos && typeof fila.datos === 'object') ? fila.datos : {};
    return {
      usuario_id: fila.usuario_id,
      tipo: fila.tipo || 'generica',
      categoria: fila.categoria || 'sistema',
      titulo: fila.titulo || '',
      cuerpo: fila.cuerpo || '',
      datos,
      url: datos.url || fila.url || null,
      id: fila.id || null
    };
  }

  // ------------------------------------------------------------
  // Servicio
  // ------------------------------------------------------------

  class PushNotificationService {
    constructor() {
      this._capacitor = false;
      this._escuchas = false;
      this._registrado = false;
      this._token = null;
      this._usuarioId = null;
      this._accionPendiente = null;
      this._heartbeatTimer = null;
      this._localId = 0; // ids enteros únicos para LocalNotifications
    }

    /**
     * Instala escuchas y registra el dispositivo si hay sesión.
     * Idempotente: puede llamarse en el arranque, tras recuperar la sesión
     * y en cada login sin efectos secundarios.
     */
    async iniciar() {
      if (!esCapacitor()) return false;
      this._capacitor = true;
      await this._instalarEscuchas();
      const usuario = this._usuario();
      if (usuario && usuario.id) {
        this._usuarioId = usuario.id;
        await this._registrarToken();
        this._iniciarHeartbeat();
        this._procesarAccionPendiente();
      }
      return true;
    }

    /** Limpia temporizadores y estado local (logout / parada). */
    detener() {
      if (this._heartbeatTimer) { clearInterval(this._heartbeatTimer); this._heartbeatTimer = null; }
      this._registrado = false;
      this._token = null;
      this._accionPendiente = null;
    }

    // ---- Acceso a plugins (sin import() de npm: script clásico) ----

    _plugin(nombre) {
      return (root.Capacitor && root.Capacitor.Plugins && root.Capacitor.Plugins[nombre]) || null;
    }

    // ---- Escuchas Capacitor (una sola vez) ----

    async _instalarEscuchas() {
      if (this._escuchas) return;
      this._escuchas = true;
      const PushNotifications = this._plugin('PushNotifications');
      if (!PushNotifications) {
        console.warn('[Push] Plugin PushNotifications no disponible (¿FCM sin configurar?).');
        return;
      }
      try {
        await PushNotifications.addListener('registration', (data) => {
          this._alRecibirToken(data && data.value);
        });
        await PushNotifications.addListener('registrationError', (err) => {
          // P.ej. Firebase no configurado (falta google-services.json) o
          // permiso denegado. No bloquea la app: solo deja de llegar push.
          console.warn('[Push] Error de registro FCM:', err && err.error ? err.error : err);
        });
        await PushNotifications.addListener('pushNotificationReceived', (n) => {
          // En primer plano la presentación la hace la capa in-app
          // (notification-service vía realtime/polling), para no duplicar
          // avisos. Aquí solo se registra el evento.
          this._alRecibir(n);
        });
        await PushNotifications.addListener('pushNotificationActionPerformed', (n) => {
          this._alPulsar(n);
        });
        // Tap en una notificación LOCAL presentada por presentarNativa()
        // (bandeja del sistema en primer plano) → misma navegación que FCM.
        const LocalNotifications = this._plugin('LocalNotifications');
        if (LocalNotifications && LocalNotifications.addListener) {
          await LocalNotifications.addListener('localNotificationActionPerformed', (n) => {
            this._alPulsar(n);
          });
        }
      } catch (e) {
        console.warn('[Push] No se pudieron instalar las escuchas:', e.message || e);
      }
    }

    // ---- Permiso + registro del dispositivo ----

    async _registrarToken() {
      if (this._registrado) return;
      const usuario = this._usuario();
      if (!usuario || !usuario.id) return;
      const PushNotifications = this._plugin('PushNotifications');
      const LocalNotifications = this._plugin('LocalNotifications');
      if (!PushNotifications) return;
      try {
        // Canales visibles en los ajustes de Android
        if (LocalNotifications && LocalNotifications.createChannel) {
          for (const canal of CANALES) {
            try {
              await LocalNotifications.createChannel({
                id: canal.id,
                name: canal.nombre,
                description: canal.descripcion,
                importance: canal.importancia,
                visibility: 1
              });
            } catch (e) { /* canal ya existente u otro error: continuar */ }
          }
        }
        // Android 13+ pide permiso explícito (POST_NOTIFICATIONS)
        const permiso = await PushNotifications.requestPermissions();
        if (!permiso || permiso.receive !== 'granted') return;
        await PushNotifications.register();
        this._registrado = true;
      } catch (e) {
        console.warn('[Push] No se pudo registrar el dispositivo:', e.message || e);
      }
    }

    _alRecibirToken(value) {
      if (!tokenValido(value)) {
        console.warn('[Push] Token FCM recibido no válido; se ignora.');
        return;
      }
      this._token = value;
      this._guardarToken(value);
    }

    // ---- Presentación nativa en primer plano (bandeja del sistema) ----

    /**
     * Presenta una notificación NATIVA en la bandeja de Android usando
     * LocalNotifications (canal según categoría). Lo usa notification-service
     * para las categorías que NO son desafíos: en la app, los avisos van a la
     * bandeja del sistema, no a toasts dentro de la interfaz. El payload se
     * aplanado igual que en la Edge Function (`d.` prefijo + url/notifId) para
     * que al pulsarla urlDe() derive el destino correcto.
     */
    async presentarNativa({ titulo, cuerpo, categoria, url, datos, id }) {
      if (!this._capacitor) return false;
      const LocalNotifications = this._plugin('LocalNotifications');
      if (!LocalNotifications || typeof LocalNotifications.schedule !== 'function') return false;
      try {
        const datosPlano = { url: url || '', notifId: id ? String(id) : '' };
        if (datos && typeof datos === 'object') {
          for (const [clave, valor] of Object.entries(datos)) {
            if (valor === null || valor === undefined) continue;
            datosPlano['d.' + clave] = typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
          }
        }
        this._localId = ((this._localId || 0) % 2147483646) + 1;
        await LocalNotifications.schedule({
          notifications: [{
            id: this._localId,
            title: String(titulo || 'FormsBiblicos').slice(0, 200),
            body: String(cuerpo || '').slice(0, 500),
            channelId: canalDe(categoria),
            data: datosPlano,
            schedule: { at: new Date() }
          }]
        });
        return true;
      } catch (e) {
        console.warn('[Push] No se pudo presentar la notificación nativa:', e.message || e);
        return false;
      }
    }

    /**
     * Guarda/actualiza el token en Supabase (fuente de verdad).
     * Upsert por token_fcm: si el mismo dispositivo se registra dos veces
     * no se duplica la fila.
     */
    async _guardarToken(token) {
      const usuario = this._usuario();
      if (!usuario || !usuario.id) return;
      const sb = root.supabaseClient;
      if (!sb) return;
      try {
        const fila = {
          usuario_id: usuario.id,
          token_fcm: token,
          plataforma: 'android',
          activo: true,
          ultima_actividad: new Date().toISOString()
        };
        const { error } = await sb.from('dispositivos_notificacion').upsert(fila, { onConflict: 'token_fcm' });
        if (error) console.warn('[Push] No se pudo guardar el token:', error.message);
      } catch (e) {
        console.warn('[Push] No se pudo guardar el token:', e.message || e);
      }
    }

    // ---- Recepción ----

    _alRecibir(n) {
      // La presentación en primer plano la decide notification-service
      // (la fila llega por realtime/polling con el mismo notifId).
      // No se muestra aquí para evitar notificaciones duplicadas.
      if (root.__FB_DEBUG_PUSH__) console.debug('[Push] Recibida en primer plano:', n);
    }

    /**
     * Al pulsar la notificación (app en segundo plano o cerrada):
     * marca la fila como completada y navega al destino del payload.
     */
    _alPulsar(n) {
      const datos = (n && n.notification && n.notification.data) || {};
      const url = urlDe(datos);
      const notifId = datos.notifId || null;
      if (notifId && root.notificacionesRepository && root.notificacionesRepository.actualizarEstado) {
        root.notificacionesRepository.actualizarEstado(notifId, 'completada').catch(() => {});
      }
      const usuario = this._usuario();
      if (url && usuario && usuario.id && root.router) {
        root.router.navegar(url);
      } else if (url) {
        // Arranque en frío: aún no hay sesión restaurada; navegar al entrar.
        this._accionPendiente = { url };
      }
    }

    _procesarAccionPendiente() {
      if (!this._accionPendiente) return;
      const { url } = this._accionPendiente;
      this._accionPendiente = null;
      if (url && root.router) setTimeout(() => root.router.navegar(url), 600);
    }

    // ---- Envío (desde notification-service, para destinatarios ajenos) ----

    /**
     * Pide a la Edge Function enviar-push que entregue una o varias filas
     * del historial como notificaciones nativas. Solo en Android (Capacitor);
     * en web es no-op. Cada fila lleva su usuario_id: la función busca los
     * tokens activos de cada destinatario.
     */
    async enviarPush(filas) {
      if (!this._capacitor) return;
      const notificaciones = (Array.isArray(filas) ? filas : [])
        .map(aPayloadPush)
        .filter((f) => f && f.usuario_id);
      if (!notificaciones.length) return;
      const sb = root.supabaseClient;
      if (!sb || typeof sb.functions !== 'object') return;
      try {
        const { error } = await sb.functions.invoke('enviar-push', {
          body: { notificaciones }
        });
        if (error) console.warn('[Push] No se pudo enviar:', error.message);
      } catch (e) {
        console.warn('[Push] No se pudo enviar:', e.message || e);
      }
    }

    // ---- Logout ----

    /**
     * Desactiva todos los tokens del usuario (los dispositivos dejan de
     * recibir push dirigido). Se llama desde authRepository.cerrarSesion
     * ANTES de signOut(), mientras la sesión aún es válida.
     */
    async desactivarTokens() {
      const usuarioId = this._usuarioId;
      if (!usuarioId) return;
      const sb = root.supabaseClient;
      if (!sb) return;
      try {
        await sb.from('dispositivos_notificacion')
          .update({ activo: false, ultima_actividad: new Date().toISOString() })
          .eq('usuario_id', usuarioId)
          .eq('activo', true);
      } catch (e) {
        console.warn('[Push] No se pudieron desactivar los tokens:', e.message || e);
      }
      this._token = null;
    }

    // ---- Heartbeat ----

    _iniciarHeartbeat() {
      if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = setInterval(() => { this._heartbeat(); }, 6 * 3600 * 1000);
    }

    async _heartbeat() {
      const usuario = this._usuario();
      if (!usuario || !usuario.id || !this._token) return;
      const sb = root.supabaseClient;
      if (!sb) return;
      try {
        await sb.from('dispositivos_notificacion')
          .update({ ultima_actividad: new Date().toISOString() })
          .eq('token_fcm', this._token)
          .eq('activo', true);
      } catch (e) { /* silencioso */ }
    }

    // ---- Helpers ----

    _usuario() {
      try {
        return root.store && root.store.obtener ? root.store.obtener('usuario') : null;
      } catch (e) {
        return null;
      }
    }
  }

  root.pushNotificationService = new PushNotificationService();

  // Exposición para tests unitarios (entorno node)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PushNotificationService, esCapacitor, canalDe, tokenValido, urlDe, aPayloadPush, CANALES };
  }
})(typeof window !== 'undefined' ? window : globalThis);
