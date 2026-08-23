-- FormsBiblicos: comprobación de aislamiento multiinstitución
-- Ejecutar en un proyecto de staging con dos usuarios autenticados.
-- Estas consultas administrativas verifican el esquema; las pruebas de IDs
-- ajenos deben ejecutarse con cada JWT desde el cliente/API, no con service_role.

-- 1. No debe quedar una política abierta a anon.
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND roles @> ARRAY['anon']::name[]
ORDER BY tablename, policyname;

-- 2. Tablas sensibles con RLS activo.
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'perfiles', 'grupos', 'miembros_grupo', 'notas_personales',
    'notas_capitulo', 'progreso_lectura', 'examenes_personalizados',
    'intentos_examen_personalizado', 'notificaciones', 'backups',
    'contacto_mensajes'
  )
ORDER BY tablename;

-- 3. Funciones críticas disponibles y permisos de ejecución.
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'iniciar_intento_examen', 'guardar_borrador_examen',
    'entregar_intento_examen', 'calificar_intento_examen',
    'obtener_examen_alumno', 'listar_examenes_alumno',
    'listar_mis_intentos_examen', 'listar_contacto_mensajes'
  )
ORDER BY routine_name;

-- 4. Pruebas manuales obligatorias desde dos sesiones JWT (A y B).
-- Para cada petición, sustituir el ID por uno perteneciente a la otra
-- institución. Esperado: cero filas o error 401/403/42501.
--
-- A -> leer perfiles, grupos, notas, progreso, exámenes, intentos,
--      notificaciones y archivos de B.
-- A -> modificar su propio rol, grupo_id, activo, username o email.
-- A -> entregar el intento de B y calificar el intento de B.
-- B -> repetir las mismas comprobaciones contra A.
--
-- La Management API/service_role NO sirve para validar RLS porque lo omite.
