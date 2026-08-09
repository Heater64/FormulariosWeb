package com.formsbiblicos.app;

import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.getcapacitor.Bridge;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/**
 * Servicio FCM propio de la app (sustituye al del plugin @capacitor/push-notifications,
 * que se elimina del manifest con tools:node="remove").
 *
 * Motivo: el plugin SIEMPRE reporta actionId "tap" y no permite responder un reto
 * desde la notificación. Aquí, cuando llega un desafío ('desafio.creado') con la app
 * en SEGUNDO PLANO, se construye la notificación con los botones Aceptar/Rechazar.
 * Al pulsarlos, DesafioActionReceiver lanza la app con la acción en los extras; la
 * capa JS (push-notification-service._alPulsar) responde la invitación
 * (responderInvitacion) sin que el usuario abra la app manualmente.
 *
 * El resto de mensajes conservan el comportamiento FCM estándar (auto-display) y
 * todos se reenvían al plugin para que sus eventos JS (registration, etc.) sigan
 * funcionando igual que antes.
 */
public class NotificacionesService extends FirebaseMessagingService {

    private static final String CANAL_DESAFIOS = "desafios";
    private static final String ACCION_RECEIVER = "com.formsbiblicos.app.DESAFIO_ACCION";
    // Package-private: los lee DesafioActionReceiver (mismo paquete).
    static final String EXTRA_ACCION = "fb_accion";
    static final String EXTRA_DESAFIO_ID = "fb_desafio_id";
    static final String EXTRA_URL = "fb_url";
    static final String EXTRA_NOTIF_ID = "fb_notifId";
    private static int secuencia = 0;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        String tipo = data.get("tipo");

        // Retos: notificación nativa CON botones Aceptar/Rechazar (solo con la
        // app en segundo plano; en primer plano la presenta la capa in-app con
        // su banner interactivo, para no duplicar avisos).
        if ("desafio.creado".equals(tipo)) {
            if (!appEnPrimerPlano()) {
                mostrarNotificacionReto(remoteMessage);
            }
            // El plugin sigue enterado de la recepción (eventos JS y dedupe).
            PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
            return;
        }

        // Resto de mensajes: comportamiento FCM estándar + plugin.
        super.onMessageReceived(remoteMessage);
        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        PushNotificationsPlugin.onNewToken(token);
    }

    /** ¿Está la app visible? (el bridge de Capacitor vive aunque la app esté en segundo plano). */
    private boolean appEnPrimerPlano() {
        try {
            Bridge bridge = PushNotificationsPlugin.staticBridge;
            if (bridge == null || bridge.getActivity() == null) return false;
            Activity activity = bridge.getActivity();
            return activity.hasWindowFocus() && !activity.isFinishing();
        } catch (Exception e) {
            return false;
        }
    }

    private void mostrarNotificacionReto(RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        String titulo = null;
        String cuerpo = null;
        if (remoteMessage.getNotification() != null) {
            titulo = remoteMessage.getNotification().getTitle();
            cuerpo = remoteMessage.getNotification().getBody();
        }
        if (titulo == null || titulo.isEmpty()) titulo = data.get("titulo");
        if (cuerpo == null) cuerpo = data.get("cuerpo");

        String desafioId = data.get("d.desafio_id");
        String url = data.get("url");
        String notifId = data.get("notifId");
        String messageId = remoteMessage.getMessageId();
        if (desafioId == null || desafioId.isEmpty()) {
            // Sin id de desafío no se puede responder: display estándar.
            super.onMessageReceived(remoteMessage);
            return;
        }

        crearCanalSiFalta(CANAL_DESAFIOS);
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // Tap en el cuerpo → abrir el desafío (misma navegación que antes).
        Intent contentIntent = new Intent(this, MainActivity.class);
        contentIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        contentIntent.putExtra("google.message_id", messageId);
        contentIntent.putExtra("tipo", "desafio.creado");
        contentIntent.putExtra("url", url);
        contentIntent.putExtra("notifId", notifId);
        contentIntent.putExtra("d.desafio_id", desafioId);
        PendingIntent contentPi = PendingIntent.getActivity(this, secuencia++, contentIntent, banderasPendingIntent());

        PendingIntent aceptarPi = pendingAccion(messageId, url, notifId, desafioId, "aceptar");
        PendingIntent rechazarPi = pendingAccion(messageId, url, notifId, desafioId, "rechazar");

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CANAL_DESAFIOS)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(titulo)
            .setContentText(cuerpo)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(cuerpo))
            .setContentIntent(contentPi)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .addAction(0, "Aceptar", aceptarPi)
            .addAction(0, "Rechazar", rechazarPi);

        // tag = desafioId: cada reto reemplaza su propia notificación.
        nm.notify(desafioId, 0, builder.build());
    }

    private PendingIntent pendingAccion(String messageId, String url, String notifId, String desafioId, String accion) {
        Intent intent = new Intent(this, DesafioActionReceiver.class);
        intent.setAction(ACCION_RECEIVER + "." + accion);
        intent.putExtra(EXTRA_ACCION, accion);
        intent.putExtra(EXTRA_DESAFIO_ID, desafioId);
        intent.putExtra(EXTRA_URL, url);
        intent.putExtra(EXTRA_NOTIF_ID, notifId);
        intent.putExtra("google.message_id", messageId);
        return PendingIntent.getBroadcast(this, secuencia++, intent, banderasPendingIntent());
    }

    private int banderasPendingIntent() {
        int flags = PendingIntent.FLAG_ONE_SHOT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return flags;
    }

    private void crearCanalSiFalta(String id) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm.getNotificationChannel(id) == null) {
            NotificationChannel canal = new NotificationChannel(id, "Desafíos", NotificationManager.IMPORTANCE_HIGH);
            canal.setDescription("Desafíos de memorización y sus resultados");
            nm.createNotificationChannel(canal);
        }
    }
}
