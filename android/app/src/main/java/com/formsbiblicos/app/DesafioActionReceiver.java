package com.formsbiblicos.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

/**
 * Recibe la pulsación de los botones Aceptar/Rechazar de la notificación
 * NATIVA de un reto (construida por NotificacionesService cuando la app está
 * en segundo plano).
 *
 * Cancela la notificación y lanza la app con un deep link
 * formsbiblicos://desafio/{desafioId}/{accion}?notifId={notifId}. La capa JS
 * (push-notification-service._alAbrirDeepLink) responde la invitación
 * (responderInvitacion) con la sesión del usuario — la app se abre en
 * segundo plano, sin que el usuario tenga que navegar ni escribir nada.
 */
public class DesafioActionReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String accion = intent.getStringExtra(NotificacionesService.EXTRA_ACCION);
        String desafioId = intent.getStringExtra(NotificacionesService.EXTRA_DESAFIO_ID);
        String notifId = intent.getStringExtra(NotificacionesService.EXTRA_NOTIF_ID);

        // Quitar la notificación de la bandeja: ya se respondió desde ella.
        if (desafioId != null) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(desafioId, 0);
        }
        if (desafioId == null || desafioId.isEmpty()) return;

        // Deep link hacia la capa JS: formsbiblicos://desafio/{id}/{accion}?notifId=...
        String accionNormalizada = (accion != null && !accion.isEmpty()) ? accion : "ver";
        Uri uri = new Uri.Builder()
            .scheme("formsbiblicos")
            .authority("desafio")
            .path("/" + desafioId + "/" + accionNormalizada)
            .appendQueryParameter("notifId", notifId != null ? notifId : "")
            .build();

        Intent launch = new Intent(Intent.ACTION_VIEW, uri);
        launch.setClassName(context, MainActivity.class.getName());
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        launch.putExtra(NotificacionesService.EXTRA_ACCION, accionNormalizada);
        launch.putExtra(NotificacionesService.EXTRA_DESAFIO_ID, desafioId);
        launch.putExtra(NotificacionesService.EXTRA_NOTIF_ID, notifId);
        launch.putExtra("google.message_id", intent.getStringExtra("google.message_id"));
        try {
            context.startActivity(launch);
        } catch (Exception e) {
            // Contexto sin activity (p.ej. receiver tras reinicio): reabrir la tarea.
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(launch);
        }
    }
}
