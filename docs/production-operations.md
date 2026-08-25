# Operacion de FormsBiblicos

Este runbook separa automatizaciones del repositorio de acciones que requieren acceso a proveedores. No marcar una casilla externa como hecha solo porque exista código para ella.

## Entornos

| Entorno | Frontend | Supabase | Datos | Uso |
|---|---|---|---|---|
| Desarrollo | Vite local | Proyecto local o staging | Fixtures desechables | Desarrollo y tests unitarios |
| Staging | Preview o dominio de staging | Proyecto Supabase separado | Dos instituciones de prueba | E2E, restauración, correo y carga |
| Producción | Dominio definitivo/Vercel | Proyecto Supabase de producción | Datos reales | Usuarios finales |

Nunca reutilizar JWT, Storage paths ni cuentas de producción en staging.

## Variables de CI y operación

### Aislamiento staging

- `FB_STAGING_SUPABASE_URL`
- `FB_STAGING_SUPABASE_ANON_KEY`
- `FB_STAGING_A_TOKEN`
- `FB_STAGING_B_TOKEN`
- `FB_STAGING_RESOURCES_JSON`: JSON o ruta a fixture con IDs de recursos de ambas instituciones.

Ejecutar:

```bash
npm run test:staging:isolation
```

El script comprueba que cada usuario puede leer sus recursos y que el usuario de la otra institución recibe cero filas o una denegación. Incluye Storage si el fixture declara `storage.bucket` y paths.

El fixture debe incluir, como mínimo, un grupo, una nota personal, un progreso, una notificación, un examen, un intento y un desafío por institución. Añadir `desafio_participantes` y archivos de Storage cuando existan en staging.

## Correo, Sentry y autenticación

La captura de errores Sentry se prepara mediante `js/core/error-capture.js` y `js/services/sentry-loader.js`. Es opcional y requiere definir `FB_SENTRY_DSN_PUBLIC` y `FB_SENTRY_SDK_URL` mediante una configuración externa antes de cargar la app. No se incluye una DSN en el repositorio.

La APK dispone de `js/services/fcm-messaging-adapter.js` como punto de integración para `@capacitor-firebase/messaging`, pero el receptor Android actual de desafíos se conserva hasta migrar y probar botones Aceptar/Rechazar con el nuevo plugin. No deben coexistir dos receptores FCM que presenten la misma notificación.



1. En Supabase Auth, configurar un proveedor SMTP real.
2. Definir remitente, dominio y plantillas de confirmación, recuperación y reenvío.
3. Configurar `Site URL` y Redirect URLs para raíz, recuperación y onboarding.
4. Probar con una cuenta de staging cuyo correo pueda recibirse:
   - registro y confirmación;
   - recuperación y cambio de contraseña;
   - enlace caducado o reutilizado;
   - reenvío de confirmación;
   - correo inexistente sin enumeración de cuentas.
5. Registrar proveedor, responsable y fecha de prueba en el checklist de release.

El repositorio no contiene credenciales SMTP. El gate operativo acepta estas variables de evidencia:

- `FB_SMTP_PROVIDER`
- `FB_SMTP_VERIFIED=true`
- `FB_SUPPORT_EMAIL`

## Health y monitorización

La función `api/health.js` se publica como `/api/health` y devuelve `200` solo cuando la aplicación está operativa y, si se han configurado sus variables, Supabase responde a su health endpoint. Devuelve `503` cuando Supabase está degradado o el check no está configurado.

Configurar un monitor externo con:

- URL: `https://DOMINIO/api/health`;
- intervalo: 1-5 minutos;
- alerta tras 2-3 fallos consecutivos;
- alerta separada para latencia elevada;
- retención y responsable definidos.

Variables del runtime Vercel:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `APP_VERSION` opcional.

La anon key puede ser pública; nunca poner `service_role` en Vercel para el endpoint ni en el navegador.

## Backups y restauración

El snapshot JSON del panel no sustituye un backup de PostgreSQL/Storage del proveedor.

Antes del lanzamiento:

1. Confirmar el plan y retención de backups de Supabase.
2. Definir RPO y RTO aprobados.
3. Crear un backup/snapshot en staging.
4. Restaurarlo en un proyecto separado.
5. Ejecutar migraciones pendientes si el procedimiento lo requiere.
6. Ejecutar el smoke test de Auth, RLS, grupos, notas, exámenes, desafíos, notificaciones y Storage.
7. Confirmar que no se cruzan instituciones tras restaurar.
8. Guardar la evidencia fuera del repositorio.

Usar `docs/backup-restore-evidence.example.json` como plantilla. Para convertir la evidencia en un bloqueo de release:

```bash
FB_BACKUP_EVIDENCE_PATH=/ruta/evidence.json npm run test:ops -- --strict
```

El fichero real no debe commitearse si contiene IDs, nombres o datos de usuarios.

## Dominio, DNS y correo

Con el dominio definitivo:

1. Conectar el dominio a Vercel y validar HTTPS.
2. Confirmar redirección HTTP a HTTPS.
3. Publicar SPF del proveedor SMTP.
4. Publicar DKIM con el selector entregado por el proveedor.
5. Publicar DMARC inicialmente en modo monitorización y endurecerlo tras revisar reportes.
6. Ejecutar el gate:

```bash
FB_DNS_DOMAIN=ejemplo.org \
FB_DKIM_SELECTOR=selector1 \
FB_PUBLIC_BASE_URL=https://ejemplo.org \
FB_HEALTH_URL=https://ejemplo.org/api/health \
npm run test:ops -- --strict
```

El WAF/firewall, límites de abuso, rate limits y protección contra registros automatizados deben configurarse en Vercel/Supabase o en un proveedor dedicado. No están creados por este repositorio.

## Soporte y contacto

`enviar_contacto` persiste el formulario en `contacto_mensajes`; no envía automáticamente un email al responsable.

Definir antes del lanzamiento:

- buzón de soporte real;
- responsable y sustituto;
- horario y tiempo objetivo de primera respuesta;
- clasificación de incidentes;
- procedimiento para solicitudes de privacidad;
- revisión diaria de la bandeja owner;
- escalado de errores de Auth, RLS, sincronización y Edge Functions.

## Release gate

El gate local siempre ejecutable es:

```bash
npm run test:release
npm run test:web-quality
npm run test
npm run build
npm run build:public
```

El gate operativo estricto requiere evidencia externa:

```bash
npm run test:ops -- --strict
```

El CI ejecuta el aislamiento staging solo cuando están definidos los secretos `FB_STAGING_*`. Si no están configurados, el job informa que se omitió: eso no equivale a un E2E pasado.

## Rendimiento y accesibilidad

`npm run test:web-quality` valida el artefacto `dist-public` después de `npm run build:public`: metadatos, idioma, nombres accesibles básicos, imágenes con `alt`, PWA y presupuestos de tamaño. El runtime inline que Vite puede insertar en `app/index.html` se considera generado por el bundler; el HTML fuente sigue protegido por `test:release`. No reemplaza Lighthouse, axe, lector de pantalla, Safari iOS ni pruebas de carga.

Para cerrar el bloque manual, ejecutar Lighthouse en landing y `/app/`, revisar teclado/lector de pantalla y probar la PWA instalada en Safari iOS y Android real.

## Fuera del alcance actual

- Pagos y facturación: no aplican porque el producto es gratuito.
- APK, firma y tiendas: pausadas.
- Safari iOS/Android PWA real: requiere dispositivos o BrowserStack/LambdaTest.
- Revisión legal: requiere responsable jurídico.
- Prueba de carga: requiere objetivos de tráfico y un entorno de staging autorizado.
