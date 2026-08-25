# Runbook de staging de FormsBiblicos

Este documento separa lo que se puede validar en el checkout de lo que exige un proyecto Supabase real. Las migraciones no deben ejecutarse directamente en producción.

## Orden de migraciones

Aplicar en un proyecto Supabase de staging, en este orden:

1. `028_auth_esquema.sql`
2. `028_auth_migracion_datos.sql` si se migran cuentas existentes
3. Desplegar el cliente nuevo y validar login
4. `028_auth_politicas.sql`
5. `035_editor_grupo_por_perfil.sql`
6. `040_clases_instituciones.sql`
7. `041_alcance_panel_admin.sql`
8. `042_fix_creacion_usuarios_auth.sql`
9. `043_auth_email_valido.sql`
10. `044_grupos_profesionales.sql`
11. `045_onboarding_institucion.sql`
12. `046_contacto_soporte.sql`
13. `047_seguridad_examenes_y_soporte.sql`
14. `050_auditoria_inmutable.sql`
15. `051_admin_grupos_y_auditoria.sql`
16. `052_auth_sin_password_legacy.sql` (solo cuando no queden perfiles legacy)
17. `053_cerrar_tablas_legacy.sql`

No ejecutar `supabase/migraciones/pendientes_produccion.sql` como bloque: contiene políticas históricas abiertas a `anon` y debe dividirse o sustituirse por migraciones RLS equivalentes.

## Verificaciones mínimas

Ejecutar con un rol de administración de base de datos y guardar el resultado:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('perfiles', 'notas_personales', 'notas_capitulo',
                    'examenes_personalizados', 'intentos_examen_personalizado',
                    'progreso_lectura', 'notificaciones', 'contacto_mensajes');

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select routine_name, routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('auth_login', 'crear_institucion_y_clase',
                       'enviar_contacto', 'iniciar_intento_examen',
                       'guardar_borrador_examen', 'entregar_intento_examen',
                       'calificar_intento_examen', 'listar_contacto_mensajes');
```

Todas las tablas de datos privados deben tener `rowsecurity = true`; las tablas legacy `audit_logs` y `editor_requests` se cierran con 053 si existen. No debe existir ninguna política para `anon` en tablas públicas tras la 047. Las respuestas correctas y snapshots de exámenes no deben estar disponibles en lecturas directas del alumno.

## Prueba de aislamiento

Crear dos instituciones con dos cuentas administradoras y dos cuentas alumnas. Conservar los JWT de cada cuenta y ejecutar peticiones de lectura y escritura contra IDs de la otra institución. Deben devolver cero filas o `403/42501` en todos los casos:

- perfiles, clases y membresías
- notas personales y notas de capítulo
- progreso y notificaciones
- exámenes, intentos y calificaciones
- archivos de Storage

Intentar también cambiar desde el cliente `rol`, `grupo_id`, `activo`, `username` y `email`. La API debe rechazarlo aunque el ID del perfil sea propio.

## Prueba de onboarding

1. Registrar un correo real en `/registro.html`.
2. Confirmar el email en staging.
3. Completar `/onboarding.html` con institución y primera clase.
4. Comprobar que se crea una sola institución, una sola clase y una membresía admin.
5. Repetir el POST/RPC y confirmar que el segundo intento se rechaza por clase principal existente.
6. Usar el código con una cuenta de alumno y confirmar que la admisión respeta la política de la clase.

## Prueba de recuperación

Usar una cuenta con correo real, solicitar recuperación, abrir el enlace y establecer una contraseña de 8 caracteres con letras y números. Confirmar que la sesión se invalida después del cambio y que el enlace usado de nuevo no permite modificar la contraseña.

Las cuentas legacy con `@accounts.formsbiblicos.com` no pueden recibir correo. Deben pasar por un procedimiento administrativo de migración o asociarse a un email real antes del lanzamiento.

## Contacto y operación

La RPC `enviar_contacto` persiste solicitudes en `contacto_mensajes`. La migración 047 añade una bandeja para el owner y estados de atención. Antes de producción hay que configurar el correo real de soporte, probar respuestas y establecer una revisión diaria; la persistencia por sí sola no equivale a un buzón atendido.

## Automatizacion local y CI

El gate estatico de release se ejecuta con `npm run test:release` y comprueba PWA, CSP, cabeceras de seguridad, builds declarados y ausencia de credenciales demo. El CI lo ejecuta siempre.

La prueba HTTP de aislamiento usa `scripts/staging-isolation.mjs` y `docs/staging-resources.example.json`. Se activa en CI solo cuando existen los secretos `FB_STAGING_*`; si no, el workflow lo informa como omitido y no como prueba pasada.

La funcion `/api/health` permite registrar un monitor externo. El gate `npm run test:ops -- --strict` comprueba las evidencias de SMTP, backup/restauracion, soporte, legal y DNS cuando se proporcionan sus variables.

## Rollback

No revertir con `git reset` ni borrar datos. En staging, restaurar el snapshot del proyecto o eliminar únicamente las funciones/tablas nuevas después de conservar los logs. En producción, el rollback debe ser una migración SQL revisada y aprobada, nunca una ejecución manual improvisada.
