// ============================================================
// Adaptador FCM unificado para web/APK.
// ============================================================
// La APK actual usa @capacitor/push-notifications + NotificacionesService
// para conservar botones de desafíos. Cuando se instale
// @capacitor-firebase/messaging, este adaptador puede seleccionarlo sin que
// el resto de la aplicación conozca el plugin. Si no está disponible, retorna
// false y el servicio existente continúa funcionando.
(function (root) {
  'use strict';

  function plugin() {
    return root.Capacitor?.Plugins?.FirebaseMessaging || null;
  }

  const adapter = {
    disponible() {
      const p = plugin();
      return !!(p && typeof p.requestPermissions === 'function' && typeof p.getToken === 'function');
    },

    async registrar({ onToken, onNotification, onAction } = {}) {
      const p = plugin();
      if (!this.disponible()) return false;
      const permiso = await p.requestPermissions();
      if (permiso?.receive === 'denied') return false;
      const token = await p.getToken();
      if (token?.token && typeof onToken === 'function') onToken(token.token);
      if (typeof p.addListener === 'function') {
        if (onNotification) await p.addListener('notificationReceived', onNotification);
        if (onAction) await p.addListener('notificationActionPerformed', onAction);
        await p.addListener('tokenReceived', (event) => {
          if (event?.token && onToken) onToken(event.token);
        });
      }
      return true;
    }
  };

  root.fcmMessagingAdapter = adapter;
})(typeof window !== 'undefined' ? window : globalThis);
