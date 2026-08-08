# Notificaciones push nativas Android (FCM)

## 1. Arquitectura

Las notificaciones push son una **capa adicional** sobre el historial in-app
ya existente (`notificaciones` + `NotificationService`). No lo reemplazan:
cada evento se persiste igual que antes en `notificaciones` y, además, se
entrega como notificación nativa cuando la app está cerrada o en segundo
plano.

```text
app (Capacitor) ── token FCM ──▶ dispositivos_notificacion (Supabase)
app ── emite evento ──▶ notificaciones (historial in-app, ya existente)
app ── invoke enviar-push (JWT) ──▶ Edge Function ──▶ FCM ──▶ Android

Al pulsar la notificación:
Android ──▶ Capacitor PushNotifications ──▶ payload (url, tipo, notifId)
          ──▶ router.navegar(url) + marcar fila como completada
```

La notificación push y la fila del historial representan **el mismo evento**:
el payload de FCM lleva `tipo`, `categoria`, `titulo`, `cuerpo`, `datos`
(planos como `d.*`), `url` y `notifId` (el id de la fila en `notificaciones`).

### Por qué la Edge Function se invoca desde la app (no desde un trigger SQL)

El diseño pedido era "backend/trigger de notificación → FCM". Un trigger SQL
tendría que llamar a la Edge Function con `pg_net` y, para autenticarse,
necesitaría la `service_role` key o un secreto compartido **dentro de la base
de datos o del repositorio**, lo que es un anti-patrón de seguridad.

La alternativa elegida: la app (que ya tiene el JWT del usuario autenticado)
invoca `enviar-push` con `verify_jwt: true`. Cualquier usuario autenticado
puede enviar (mismo modelo de confianza que la RPC `enviar_notificacion` ya
existente). No hay ningún secreto en el repositorio.

## 2. Piezas implementadas

| Pieza | Archivo | Función |
|---|---|---|
| Migración DB | `supabase/migraciones/029_notificaciones_push.sql` | Tabla `dispositivos_notificacion` (usuario, token FCM, plataforma, activo, última actividad, último error) + RLS estilo 028 |
| Edge Function | `supabase/functions/enviar-push/index.ts` | OAuth2 con cuenta de servicio, FCM HTTP v1, canales, desactivación de tokens no registrados |
| Puente cliente | `js/services/push-notification-service.js` | Permiso, `register()`, token → Supabase, escuchas, navegación al pulsar, heartbeat, logout |
| Integración | `js/core/notification-service.js` | Tras persistir, envía push a destinatarios **ajenos** |
| Integración | `js/datos/auth-repository.js` | `cerrarSesion` desactiva los tokens **antes** de `signOut()` |
| Integración | `js/core/index.js` + `index.html` | Arranque (escuchas tempranas), login, logout |
| Android | `android/app/src/main/AndroidManifest.xml` | `POST_NOTIFICATIONS` (Android 13+) |
| Plugins | `@capacitor/push-notifications`, `@capacitor/local-notifications` | Registro FCM + canales Android |

### Canales Android

| Canal | Categorías | Importancia |
|---|---|---|
| `general` | grupos, logros | Alta |
| `desafios` | desafios | Alta |
| `examenes` | examenes | Alta |
| `recordatorios` | estudio | Media |
| `sistema` | sistema, anuncios | Alta |

El mapeo categoría → canal vive en dos sitios que deben mantenerse
sincronizados: `js/services/push-notification-service.js` (cliente) y
`supabase/functions/enviar-push/index.ts` (Edge Function).

## 3. Qué pasa en cada estado de la app

- **Primer plano:** la presentación la hace la capa in-app (banner/toast vía
  realtime/polling de `NotificationService`). El evento FCM en primer plano se
  ignora para **no duplicar** avisos.
- **Segundo plano:** Android muestra la notificación del sistema (canal según
  categoría). Al pulsarla, la app vuelve y navega a `url` del payload.
- **Cerrada:** igual que en segundo plano; al arrancar en frío la acción queda
  pendiente y se navega en cuanto se restaura la sesión.
- **Logout:** `authRepository.cerrarSesion` llama a
  `pushNotificationService.desactivarTokens()` antes de invalidar la sesión:
  todos los tokens del usuario quedan `activo = false` y dejan de recibir push.

## 4. Configuración pendiente (una sola vez)

La app ya compila con los plugins (verificado con `assembleDebug`), pero para
que el push funcione de verdad falta la configuración de Firebase y Supabase:

### 4.1 Aplica la migración 029

En Supabase → **SQL Editor**, pega y ejecuta
`supabase/migraciones/029_notificaciones_push.sql`.

### 4.2 Crea el proyecto Firebase y conecta la app Android

1. Ve a https://console.firebase.google.com → **Añadir proyecto**.
2. **Añadir app → Android** con package name exacto: `com.formsbiblicos.app`.
3. Descarga el archivo **`google-services.json`** y colócalo en:

   ```text
   android/app/google-services.json
   ```

   El plugin de Google Services ya está declarado en los Gradle files de forma
   condicional: sin el archivo la app compila igual (solo no llegan push); con
   el archivo, el plugin se activa en el build.

### 4.3 Crea una cuenta de servicio para FCM (envío)

1. En Firebase → **Configuración del proyecto → Cuentas de servicio**.
2. **Generar nueva clave privada** (JSON).
3. Guarda ese JSON como secret en Supabase:

   - Dashboard → **Edge Functions → Secrets** → **New secret**
   - `FCM_SERVICE_ACCOUNT` = contenido completo del JSON (es un JSON, no una
     ruta).

### 4.4 Añade la service_role key como secret

- Dashboard → **Settings → API** → copia `service_role` (secreto).
- **Edge Functions → Secrets** → `SUPABASE_SERVICE_ROLE_KEY` = ese valor.

### 4.5 Despliega la Edge Function

Opciones:

- **Dashboard:** Edge Functions → **Create a new function** → nombre
  `enviar-push` → pega el contenido de
  `supabase/functions/enviar-push/index.ts` → Deploy. Deja `verify_jwt`
  activado (por defecto).
- **CLI (si lo instalas):**

  ```bash
  supabase functions deploy enviar-push --project-ref TU_PROJECT_REF
  ```

### 4.6 Rebuild y release

```bash
npm run version:patch
npm test
npm run build
npx cap sync android
```

y lanza **Actions → Android Release → Run workflow** como siempre. La APK
nueva incluirá Firebase (por el `google-services.json`) y el puente push.

## 5. Prueba física (checklist)

1. Instala la APK en el móvil e inicia sesión.
2. La app pedirá permiso de notificaciones (Android 13+): **Permitir**.
3. Comprueba en Supabase (SQL Editor) que aparece la fila del dispositivo:

   ```sql
   select usuario_id, token_fcm, plataforma, activo, ultima_actividad
   from dispositivos_notificacion;
   ```

4. Desde otra cuenta (o SQL) emite una notificación a ese usuario (p.ej. un
   desafío). El push debe llegar como notificación nativa.
5. Cierra la app (o ponla en segundo plano) y envía otra: debe llegar igual.
6. Pulsa la notificación: la app debe abrir la pantalla correcta (p.ej.
   `/desafio/<id>`).
7. Verifica que la fila del historial quedó marcada como `completada`.
8. Cierra sesión y comprueba en Supabase que el token quedó `activo = false`.
9. Envía otra notificación a ese usuario: el dispositivo ya no debe recibirla.

### Depuración

- **Token no aparece en Supabase:** ¿`google-services.json` está en
  `android/app/`? ¿Se reconstruyó la APK después de añadirlo? (El registro FCM
  falla en runtime sin el archivo, aunque la app compile.)
- **`enviar-push` responde 500:** revisa los secrets `FCM_SERVICE_ACCOUNT` y
  `SUPABASE_SERVICE_ROLE_KEY`, y que la función esté desplegada.
- **Error UNREGISTERED:** el token dejó de ser válido (reinstalación, cambio
  de app). La Edge Function lo desactiva automáticamente.
- **La notificación llega pero no navega:** comprueba que el payload lleva
  `url` (la app la escribe en `datos.url` al persistir) y que la sesión está
  restaurada al pulsar.

## 6. Fuentes oficiales

- Capacitor Push Notifications: https://capacitorjs.com/docs/apis/push-notifications
- Capacitor Local Notifications: https://capacitorjs.com/docs/apis/local-notifications
- Guía Firebase + Capacitor (google-services.json): https://capacitorjs.com/docs/guides/push-notifications-firebase
- FCM HTTP v1: https://firebase.google.com/docs/cloud-messaging/migrate-v1
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
