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
                       'enviar_contacto');
```

Todas las tablas de datos privados deben tener `rowsecurity = true`. No debe existir una política `FOR ALL TO anon USING (true)` en tablas de usuarios, notas, exámenes, progreso, notificaciones, backups o contacto.

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

La RPC `enviar_contacto` persiste solicitudes en `contacto_mensajes`. Antes de producción hay que definir quién consulta la tabla, un canal de respuesta y una alerta o revisión diaria. La persistencia por sí sola no equivale a un buzón atendido.

## Rollback

No revertir con `git reset` ni borrar datos. En staging, restaurar el snapshot del proyecto o eliminar únicamente las funciones/tablas nuevas después de conservar los logs. En producción, el rollback debe ser una migración SQL revisada y aprobada, nunca una ejecución manual improvisada.
