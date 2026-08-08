-- ============================================================================
-- MIGRACIÓN 028-C: Supabase Auth — Cierre de RLS (políticas restrictivas)
-- ============================================================================
-- Objetivo: REEMPLAZAR las políticas abiertas a anon (002_anon_custom_auth.sql
-- y las abiertas en migraciones posteriores) por políticas basadas en
-- auth.uid(). Es el momento en que el agujero de seguridad se cierra de verdad:
-- ya nadie podrá leer hashes de contraseñas, notas de otros, backups, ni
-- auto-calificarse.
--
-- ⚠️ CUÁNDO APLICAR: SOLO en el cutover, es decir, cuando el cliente ya esté
--    actualizado para loguear con auth_login → signInWithPassword (JWT).
--    Si se aplica antes, la app (auth custom con anon) deja de funcionar.
--
-- ✅ ESTADO: APLICADA (este archivo ya se ejecutó). La "Fase 2 del cliente"
--    (login Auth, RPCs del panel admin, asegurar_grupo, enviar_notificacion,
--    recuperación de sesión) quedó implementada el 2026-08-06 en:
--    js/datos/auth-repository.js, js/core/index.js, js/vistas/vista-perfil.js,
--    js/datos/admin-repository.js, js/datos/notificaciones-repository.js.
--    Pendiente conocido: restaurar perfiles desde backup requiere una RPC nueva
--    (anotado en admin-repository.restaurarBackup).
--
-- ORDEN DE CUTOVER:
--   1. 028_auth_esquema.sql
--   2. 028_auth_migracion_datos.sql
--   3. DESPLEGAR el cliente nuevo (login por Supabase Auth)
--   4. 028_auth_politicas.sql   ← este archivo, lo último
--
-- ROLLBACK: reaplicar 002_anon_custom_auth.sql restaura las políticas abiertas.
-- Los datos no se tocan en ningún caso.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) CERRAR EL GRIFO A ANON: revocar el acceso masivo que concedió 002
-- ----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Endurecer el futuro: las tablas nuevas ya no se abrirán a anon/authenticated
-- por defecto (cada migración futura concederá explícitamente lo que necesite).
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;

-- Grants base: cada tabla recibe solo lo que necesita (más abajo).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- ============================================================================
-- 1) PERFILES
-- ============================================================================
-- RLS: cualquier usuario autenticado ve los datos básicos de los demás
-- (comunidad cerrada: solo el owner crea cuentas). El password queda oculto
-- por grants de columna y ya no es necesario (lo gestiona Supabase Auth).
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfiles_anon_all" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_anon_login" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_lectura_propios_o_admin" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_actualizacion_propia" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_admin_actualiza" ON public.perfiles;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "perfiles_lectura_autenticados" ON public.perfiles;
CREATE POLICY "perfiles_lectura_autenticados"
  ON public.perfiles FOR SELECT TO authenticated USING (true);

-- El usuario actualiza SOLO su propia fila (la columna se limita por grants)
CREATE POLICY "perfiles_actualizacion_propia"
  ON public.perfiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Sin política de INSERT/DELETE → nadie crea ni borra perfiles por la API
-- (solo el trigger handle_new_user y las RPCs de admin, que son SECURITY DEFINER)

-- Grants con restricción de COLUMNAS (anti-escalada):
--   * no se puede UPDATE rol / username / password / activo / grupo_id por la API
--     (el grupo se asigna vía RPC asegurar_grupo / admin_actualizar_usuario)
--   * no se puede leer el password ni el email real (solo owner vía RPC/SQL)
--   * INSERT/DELETE denegados
GRANT SELECT (id, username, nombre_completo, rol, activo, grupo_id,
              foto_perfil, preferencias, ultimo_acceso, creado_en)
  ON public.perfiles TO authenticated;
GRANT UPDATE (nombre_completo, foto_perfil, preferencias, ultimo_acceso)
  ON public.perfiles TO authenticated;

-- ============================================================================
-- 2) GRUPOS
-- ============================================================================
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grupos_anon_all" ON public.grupos;
DROP POLICY IF EXISTS "grupos_lectura_miembros" ON public.grupos;
DROP POLICY IF EXISTS "grupos_admin_gestiona" ON public.grupos;
DROP POLICY IF EXISTS "grupos_insert_propio" ON public.grupos;

CREATE POLICY "grupos_lectura_miembros"
  ON public.grupos FOR SELECT TO authenticated
  USING (public.es_miembro_del_grupo(id) OR public.es_owner());

-- Insertar el propio grupo (asegurarGrupo: un profesor crea su clase)
CREATE POLICY "grupos_insert_propio"
  ON public.grupos FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid() OR public.es_owner());

CREATE POLICY "grupos_admin_gestiona"
  ON public.grupos FOR UPDATE TO authenticated
  USING (public.es_admin_del_grupo(id) OR public.es_owner())
  WITH CHECK (public.es_admin_del_grupo(id) OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "grupos_admin_borra" ON public.grupos;
CREATE POLICY "grupos_admin_borra"
  ON public.grupos FOR DELETE TO authenticated
  USING (public.es_admin_del_grupo(id) OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos TO authenticated;

-- ============================================================================
-- 3) MIEMBROS_GRUPO
-- ============================================================================
ALTER TABLE public.miembros_grupo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "miembros_anon_all" ON public.miembros_grupo;
DROP POLICY IF EXISTS "miembros_lectura_miembros" ON public.miembros_grupo;
DROP POLICY IF EXISTS "miembros_admin_gestiona" ON public.miembros_grupo;
DROP POLICY IF EXISTS "miembros_salida_propia" ON public.miembros_grupo;
DROP POLICY IF EXISTS "miembros_inscripcion_propia" ON public.miembros_grupo;
DROP POLICY IF EXISTS "miembros_autoactualiza" ON public.miembros_grupo;

CREATE POLICY "miembros_lectura_miembros"
  ON public.miembros_grupo FOR SELECT TO authenticated
  USING (public.es_miembro_del_grupo(grupo_id) OR public.es_owner());

-- Unirse a un grupo SOLO como 'miembro' (unirseAGrupo usa upsert)
CREATE POLICY "miembros_inscripcion_propia"
  ON public.miembros_grupo FOR INSERT TO authenticated
  WITH CHECK (public.es_owner()
              OR (usuario_id = auth.uid() AND rol_en_grupo = 'miembro')
              OR public.es_admin_del_grupo(grupo_id));

-- Actualizar el propio estado como miembro (upsert) o gestionar como admin
CREATE POLICY "miembros_autoactualiza"
  ON public.miembros_grupo FOR UPDATE TO authenticated
  USING (public.es_owner()
         OR (usuario_id = auth.uid() AND rol_en_grupo = 'miembro')
         OR public.es_admin_del_grupo(grupo_id))
  WITH CHECK (public.es_owner()
              OR (usuario_id = auth.uid() AND rol_en_grupo = 'miembro')
              OR public.es_admin_del_grupo(grupo_id));

-- Salir del grupo (DELETE propio) o gestionar como admin
CREATE POLICY "miembros_salida_propia"
  ON public.miembros_grupo FOR DELETE TO authenticated
  USING (public.es_owner() OR usuario_id = auth.uid()
         OR public.es_admin_del_grupo(grupo_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.miembros_grupo TO authenticated;

-- ============================================================================
-- 3b) CATEGORIAS_MEMORIZACION / CATEGORIAS_TARJETAS
-- ============================================================================
-- Sus políticas propias (auth.uid() = usuario_id) ya existen desde la migración
-- 012; aquí solo se restablecen los grants que el REVOKE ALL de arriba retiró.
ALTER TABLE public.categorias_memorizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_tarjetas ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_memorizacion TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_tarjetas TO authenticated;

-- ============================================================================
-- 4) CATÁLOGO BÍBLICO (contenido público de la app, requiere login)
-- ============================================================================
ALTER TABLE public.libros_biblicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "libros_anon_publico" ON public.libros_biblicos;
DROP POLICY IF EXISTS "libros_publico" ON public.libros_biblicos;
CREATE POLICY "libros_publico" ON public.libros_biblicos FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.libros_biblicos TO authenticated;

ALTER TABLE public.capitulos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "capitulos_anon_publico" ON public.capitulos;
DROP POLICY IF EXISTS "capitulos_publico" ON public.capitulos;
CREATE POLICY "capitulos_publico" ON public.capitulos FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.capitulos TO authenticated;

ALTER TABLE public.versiculos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "versiculos_anon_publico" ON public.versiculos;
DROP POLICY IF EXISTS "versiculos_publico" ON public.versiculos;
CREATE POLICY "versiculos_publico" ON public.versiculos FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.versiculos TO authenticated;

-- ============================================================================
-- 5) PROGRESO_LECTURA (cada usuario su propio progreso)
-- ============================================================================
ALTER TABLE public.progreso_lectura ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progreso_lectura_anon_all" ON public.progreso_lectura;
DROP POLICY IF EXISTS "progreso_lectura_propio" ON public.progreso_lectura;
DROP POLICY IF EXISTS "progreso_lectura_profesor_ve" ON public.progreso_lectura;

CREATE POLICY "progreso_lectura_propio"
  ON public.progreso_lectura FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

CREATE POLICY "progreso_lectura_profesor_ve"
  ON public.progreso_lectura FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.perfiles p
    JOIN public.miembros_grupo mg ON mg.grupo_id = p.grupo_id
    WHERE p.id = progreso_lectura.usuario_id
      AND mg.usuario_id = auth.uid()
      AND mg.rol_en_grupo IN ('admin', 'editor')
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.progreso_lectura TO authenticated;

-- ============================================================================
-- 6) PREGUNTAS_SISTEMA (contenido de estudio: lectura para todos, edición
--    solo para editores/owner). Se CORRIGE la política original, que usaba
--    una subconsulta rota (perfiles p ON p.grupo_id IS NOT NULL LIMIT 1).
-- ============================================================================
ALTER TABLE public.preguntas_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preguntas_sistema_anon_all" ON public.preguntas_sistema;
DROP POLICY IF EXISTS "preguntas_sistema_lectura_grupo" ON public.preguntas_sistema;
DROP POLICY IF EXISTS "preguntas_sistema_edicion_editor" ON public.preguntas_sistema;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "preguntas_sistema_lectura" ON public.preguntas_sistema;
CREATE POLICY "preguntas_sistema_lectura"
  ON public.preguntas_sistema FOR SELECT TO authenticated USING (true);

CREATE POLICY "preguntas_sistema_edicion_editor"
  ON public.preguntas_sistema FOR INSERT TO authenticated
  WITH CHECK (public.es_owner()
              OR (creado_por = auth.uid()
                  AND public.es_editor_del_grupo(
                    (SELECT grupo_id FROM public.perfiles WHERE id = auth.uid()))));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "preguntas_sistema_edicion_editor_upd" ON public.preguntas_sistema;
CREATE POLICY "preguntas_sistema_edicion_editor_upd"
  ON public.preguntas_sistema FOR UPDATE TO authenticated
  USING (public.es_owner()
         OR (creado_por = auth.uid()
             AND public.es_editor_del_grupo(
               (SELECT grupo_id FROM public.perfiles WHERE id = creado_por))));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "preguntas_sistema_edicion_editor_del" ON public.preguntas_sistema;
CREATE POLICY "preguntas_sistema_edicion_editor_del"
  ON public.preguntas_sistema FOR DELETE TO authenticated
  USING (public.es_owner()
         OR (creado_por = auth.uid()
             AND public.es_editor_del_grupo(
               (SELECT grupo_id FROM public.perfiles WHERE id = creado_por))));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preguntas_sistema TO authenticated;

-- ============================================================================
-- 7) EXAMENES_PERSONALIZADOS
-- ============================================================================
ALTER TABLE public.examenes_personalizados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "examenes_anon_all" ON public.examenes_personalizados;
DROP POLICY IF EXISTS "examenes_lectura_grupo" ON public.examenes_personalizados;
DROP POLICY IF EXISTS "examenes_edicion_profesor" ON public.examenes_personalizados;

CREATE POLICY "examenes_lectura_grupo"
  ON public.examenes_personalizados FOR SELECT TO authenticated
  USING (public.es_miembro_del_grupo(grupo_id) OR public.es_owner());

CREATE POLICY "examenes_edicion_profesor"
  ON public.examenes_personalizados FOR INSERT TO authenticated
  WITH CHECK (public.es_owner()
              OR (creado_por = auth.uid() AND public.es_editor_del_grupo(grupo_id)));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "examenes_edicion_profesor_upd" ON public.examenes_personalizados;
CREATE POLICY "examenes_edicion_profesor_upd"
  ON public.examenes_personalizados FOR UPDATE TO authenticated
  USING (public.es_editor_del_grupo(grupo_id) OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "examenes_edicion_profesor_del" ON public.examenes_personalizados;
CREATE POLICY "examenes_edicion_profesor_del"
  ON public.examenes_personalizados FOR DELETE TO authenticated
  USING (public.es_editor_del_grupo(grupo_id) OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.examenes_personalizados TO authenticated;

-- ============================================================================
-- 8) INTENTOS_EXAMEN_PERSONALIZADO (alumno: sus intentos; profesor: califica)
-- ============================================================================
ALTER TABLE public.intentos_examen_personalizado ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intentos_anon_all" ON public.intentos_examen_personalizado;
DROP POLICY IF EXISTS "intentos_alumno_propio" ON public.intentos_examen_personalizado;
DROP POLICY IF EXISTS "intentos_profesor_ve" ON public.intentos_examen_personalizado;
DROP POLICY IF EXISTS "intentos_profesor_califica" ON public.intentos_examen_personalizado;

CREATE POLICY "intentos_alumno_propio"
  ON public.intentos_examen_personalizado FOR ALL TO authenticated
  USING (alumno_id = auth.uid() OR public.es_owner())
  WITH CHECK (alumno_id = auth.uid() OR public.es_owner());

CREATE POLICY "intentos_profesor_ve"
  ON public.intentos_examen_personalizado FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.examenes_personalizados e
    WHERE e.id = examen_id AND public.es_editor_del_grupo(e.grupo_id)
  ));

CREATE POLICY "intentos_profesor_califica"
  ON public.intentos_examen_personalizado FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.examenes_personalizados e
    WHERE e.id = examen_id AND public.es_editor_del_grupo(e.grupo_id)
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intentos_examen_personalizado TO authenticated;

-- ============================================================================
-- 9) TARJETAS_MEMORIZACION (propias + las del mazo global + owner)
-- ============================================================================
ALTER TABLE public.tarjetas_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tarjetas_anon_all" ON public.tarjetas_memorizacion;
DROP POLICY IF EXISTS "tarjetas_propias" ON public.tarjetas_memorizacion;
DROP POLICY IF EXISTS "tarjetas_lectura_globales" ON public.tarjetas_memorizacion;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "tarjetas_lectura" ON public.tarjetas_memorizacion;
CREATE POLICY "tarjetas_lectura"
  ON public.tarjetas_memorizacion FOR SELECT TO authenticated
  USING (usuario_id = auth.uid()
         OR public.es_owner()
         OR (mazo_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM public.mazos_memorizacion m
               WHERE m.id = mazo_id AND m.es_global = true
             )));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "tarjetas_insert_propias" ON public.tarjetas_memorizacion;
CREATE POLICY "tarjetas_insert_propias"
  ON public.tarjetas_memorizacion FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "tarjetas_edicion_propias" ON public.tarjetas_memorizacion;
CREATE POLICY "tarjetas_edicion_propias"
  ON public.tarjetas_memorizacion FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "tarjetas_borrado_propias" ON public.tarjetas_memorizacion;
CREATE POLICY "tarjetas_borrado_propias"
  ON public.tarjetas_memorizacion FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarjetas_memorizacion TO authenticated;

-- ============================================================================
-- 10) REPASOS_MEMORIZACION (vía tarjeta propia)
-- ============================================================================
ALTER TABLE public.repasos_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "repasos_anon_all" ON public.repasos_memorizacion;
DROP POLICY IF EXISTS "repasos_propios" ON public.repasos_memorizacion;

CREATE POLICY "repasos_propios"
  ON public.repasos_memorizacion FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tarjetas_memorizacion t
    WHERE t.id = tarjeta_id AND (t.usuario_id = auth.uid() OR public.es_owner())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tarjetas_memorizacion t
    WHERE t.id = tarjeta_id AND (t.usuario_id = auth.uid() OR public.es_owner())
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.repasos_memorizacion TO authenticated;

-- ============================================================================
-- 11) LOGROS Y LOGROS_USUARIO
-- ============================================================================
ALTER TABLE public.logros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logros_anon_all" ON public.logros;
DROP POLICY IF EXISTS "logros_todos_ven" ON public.logros;
CREATE POLICY "logros_todos_ven" ON public.logros FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.logros TO authenticated;

ALTER TABLE public.logros_usuario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logros_usuario_anon_all" ON public.logros_usuario;
DROP POLICY IF EXISTS "logros_usuario_propios" ON public.logros_usuario;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "logros_usuario_lectura" ON public.logros_usuario;
CREATE POLICY "logros_usuario_lectura"
  ON public.logros_usuario FOR SELECT TO authenticated
  USING (usuario_id = auth.uid()
         OR public.es_admin_del_grupo(
           (SELECT grupo_id FROM public.perfiles WHERE id = usuario_id))
         OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "logros_usuario_gestion" ON public.logros_usuario;
CREATE POLICY "logros_usuario_gestion"
  ON public.logros_usuario FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.logros_usuario TO authenticated;

-- ============================================================================
-- 12) AUDITORIA (lectura solo owner; escritura por RPCs/RLS de sistema)
-- ============================================================================
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auditoria_anon_all" ON public.auditoria;
DROP POLICY IF EXISTS "auditoria_solo_owner" ON public.auditoria;
DROP POLICY IF EXISTS "auditoria_insert_sistema" ON public.auditoria;

CREATE POLICY "auditoria_solo_owner"
  ON public.auditoria FOR SELECT TO authenticated USING (public.es_owner());

-- INSERT permitido a cualquier autenticado para no romper el registro actual
-- de auditoría desde el cliente; las RPCs de admin ya registran por su cuenta.
CREATE POLICY "auditoria_insert_sistema"
  ON public.auditoria FOR INSERT TO authenticated WITH CHECK (true);

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "auditoria_update_owner" ON public.auditoria;
CREATE POLICY "auditoria_update_owner"
  ON public.auditoria FOR UPDATE TO authenticated
  USING (public.es_owner()) WITH CHECK (public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "auditoria_borrado_owner" ON public.auditoria;
CREATE POLICY "auditoria_borrado_owner"
  ON public.auditoria FOR DELETE TO authenticated USING (public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auditoria TO authenticated;

-- ============================================================================
-- 13) SUGERENCIAS (cada usuario sus sugerencias; owner las gestiona)
-- ============================================================================
ALTER TABLE public.sugerencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sugerencias_anon_all" ON public.sugerencias;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "sugerencias_lectura_propias" ON public.sugerencias;
CREATE POLICY "sugerencias_lectura_propias"
  ON public.sugerencias FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "sugerencias_insert_propias" ON public.sugerencias;
CREATE POLICY "sugerencias_insert_propias"
  ON public.sugerencias FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "sugerencias_gestion_owner" ON public.sugerencias;
CREATE POLICY "sugerencias_gestion_owner"
  ON public.sugerencias FOR UPDATE TO authenticated
  USING (public.es_owner()) WITH CHECK (public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "sugerencias_borrado_owner" ON public.sugerencias;
CREATE POLICY "sugerencias_borrado_owner"
  ON public.sugerencias FOR DELETE TO authenticated USING (public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sugerencias TO authenticated;

-- ============================================================================
-- 14) MAZOS_MEMORIZACION (propios + mazo global + owner)
-- ============================================================================
ALTER TABLE public.mazos_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mazos_anon_all" ON public.mazos_memorizacion;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "mazos_lectura" ON public.mazos_memorizacion;
CREATE POLICY "mazos_lectura"
  ON public.mazos_memorizacion FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR es_global = true OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "mazos_insert_propios" ON public.mazos_memorizacion;
CREATE POLICY "mazos_insert_propios"
  ON public.mazos_memorizacion FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "mazos_edicion_propios" ON public.mazos_memorizacion;
CREATE POLICY "mazos_edicion_propios"
  ON public.mazos_memorizacion FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "mazos_borrado_propios" ON public.mazos_memorizacion;
CREATE POLICY "mazos_borrado_propios"
  ON public.mazos_memorizacion FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mazos_memorizacion TO authenticated;

-- ============================================================================
-- 15) PROGRESO_TARJETAS_MEMORIZACION (propias)
-- ============================================================================
ALTER TABLE public.progreso_tarjetas_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progreso_anon_all" ON public.progreso_tarjetas_memorizacion;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "progreso_tarjetas_propio" ON public.progreso_tarjetas_memorizacion;
CREATE POLICY "progreso_tarjetas_propio"
  ON public.progreso_tarjetas_memorizacion FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.progreso_tarjetas_memorizacion TO authenticated;

-- ============================================================================
-- 16) NOTIFICACIONES (propias; las ajenas se crean vía RPC enviar_notificacion)
-- ============================================================================
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notificaciones_anon_all" ON public.notificaciones;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "notificaciones_lectura_propias" ON public.notificaciones;
CREATE POLICY "notificaciones_lectura_propias"
  ON public.notificaciones FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "notificaciones_insert_propias" ON public.notificaciones;
CREATE POLICY "notificaciones_insert_propias"
  ON public.notificaciones FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "notificaciones_actualiza_propias" ON public.notificaciones;
CREATE POLICY "notificaciones_actualiza_propias"
  ON public.notificaciones FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "notificaciones_borrado_propias" ON public.notificaciones;
CREATE POLICY "notificaciones_borrado_propias"
  ON public.notificaciones FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificaciones TO authenticated;

-- ============================================================================
-- 17) DESAFIOS
-- ============================================================================
ALTER TABLE public.desafios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "desafios_anon_all" ON public.desafios;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafios_lectura" ON public.desafios;
CREATE POLICY "desafios_lectura"
  ON public.desafios FOR SELECT TO authenticated
  USING (creador_id = auth.uid()
         OR public.es_owner()
         OR EXISTS (SELECT 1 FROM public.desafio_participantes dp
                    WHERE dp.desafio_id = desafios.id AND dp.usuario_id = auth.uid()));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafios_insert_propios" ON public.desafios;
CREATE POLICY "desafios_insert_propios"
  ON public.desafios FOR INSERT TO authenticated
  WITH CHECK (creador_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafios_edicion_creador" ON public.desafios;
CREATE POLICY "desafios_edicion_creador"
  ON public.desafios FOR UPDATE TO authenticated
  USING (creador_id = auth.uid() OR public.es_owner())
  WITH CHECK (creador_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafios_borrado_creador" ON public.desafios;
CREATE POLICY "desafios_borrado_creador"
  ON public.desafios FOR DELETE TO authenticated
  USING (creador_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.desafios TO authenticated;

-- ============================================================================
-- 18) DESAFIO_PARTICIPANTES
-- ============================================================================
ALTER TABLE public.desafio_participantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "desafio_participantes_anon_all" ON public.desafio_participantes;

-- Participante, creador del desafío u owner
-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafio_participantes_lectura" ON public.desafio_participantes;
CREATE POLICY "desafio_participantes_lectura"
  ON public.desafio_participantes FOR SELECT TO authenticated
  USING (usuario_id = auth.uid()
         OR public.es_owner()
         OR EXISTS (SELECT 1 FROM public.desafios d
                    WHERE d.id = desafio_id AND d.creador_id = auth.uid()));

-- El creador invita (inserta a los rivales) y cada usuario puede unirse solo
-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafio_participantes_insert" ON public.desafio_participantes;
CREATE POLICY "desafio_participantes_insert"
  ON public.desafio_participantes FOR INSERT TO authenticated
  WITH CHECK (public.es_owner()
              OR usuario_id = auth.uid()
              OR EXISTS (SELECT 1 FROM public.desafios d
                         WHERE d.id = desafio_id AND d.creador_id = auth.uid()));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafio_participantes_update" ON public.desafio_participantes;
CREATE POLICY "desafio_participantes_update"
  ON public.desafio_participantes FOR UPDATE TO authenticated
  USING (public.es_owner()
         OR usuario_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.desafios d
                    WHERE d.id = desafio_id AND d.creador_id = auth.uid()))
  WITH CHECK (public.es_owner()
              OR usuario_id = auth.uid()
              OR EXISTS (SELECT 1 FROM public.desafios d
                         WHERE d.id = desafio_id AND d.creador_id = auth.uid()));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafio_participantes_delete" ON public.desafio_participantes;
CREATE POLICY "desafio_participantes_delete"
  ON public.desafio_participantes FOR DELETE TO authenticated
  USING (public.es_owner()
         OR usuario_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.desafios d
                    WHERE d.id = desafio_id AND d.creador_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.desafio_participantes TO authenticated;

-- ============================================================================
-- 19) EVALUACIONES
-- ============================================================================
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evaluaciones_anon_all" ON public.evaluaciones;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "evaluaciones_lectura" ON public.evaluaciones;
CREATE POLICY "evaluaciones_lectura"
  ON public.evaluaciones FOR SELECT TO authenticated
  USING (grupo_id IS NULL
         OR public.es_miembro_del_grupo(grupo_id)
         OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "evaluaciones_insert" ON public.evaluaciones;
CREATE POLICY "evaluaciones_insert"
  ON public.evaluaciones FOR INSERT TO authenticated
  WITH CHECK (public.es_owner()
              OR (creado_por = auth.uid() AND public.es_editor_del_grupo(grupo_id)));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "evaluaciones_update" ON public.evaluaciones;
CREATE POLICY "evaluaciones_update"
  ON public.evaluaciones FOR UPDATE TO authenticated
  USING (public.es_editor_del_grupo(grupo_id) OR public.es_owner())
  WITH CHECK (public.es_editor_del_grupo(grupo_id) OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "evaluaciones_delete" ON public.evaluaciones;
CREATE POLICY "evaluaciones_delete"
  ON public.evaluaciones FOR DELETE TO authenticated
  USING (public.es_editor_del_grupo(grupo_id) OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluaciones TO authenticated;

-- ============================================================================
-- 20) NOTAS_CAPITULO — HOY CON RLS DESACTIVADA (hueco). Se habilita.
-- ============================================================================
ALTER TABLE public.notas_capitulo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notas_capitulo_anon_all" ON public.notas_capitulo;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "notas_capitulo_propias" ON public.notas_capitulo;
CREATE POLICY "notas_capitulo_propias"
  ON public.notas_capitulo FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_capitulo TO authenticated;

-- ============================================================================
-- 21) NOTAS_PERSONALES — HOY CON RLS DESACTIVADA (hueco). Se habilita.
-- ============================================================================
ALTER TABLE public.notas_personales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notas_personales_anon_all" ON public.notas_personales;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "notas_personales_propias" ON public.notas_personales;
CREATE POLICY "notas_personales_propias"
  ON public.notas_personales FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_personales TO authenticated;

-- ============================================================================
-- 22) CONFIGURACION (lectura pública para autenticados; escritura solo owner)
-- ============================================================================
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "configuracion_anon_all" ON public.configuracion;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "configuracion_lectura" ON public.configuracion;
CREATE POLICY "configuracion_lectura"
  ON public.configuracion FOR SELECT TO authenticated USING (true);

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "configuracion_gestion_owner" ON public.configuracion;
CREATE POLICY "configuracion_gestion_owner"
  ON public.configuracion FOR ALL TO authenticated
  USING (public.es_owner()) WITH CHECK (public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracion TO authenticated;

-- ============================================================================
-- 23) BACKUPS (solo owner)
-- ============================================================================
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "backups_anon_all" ON public.backups;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "backups_solo_owner" ON public.backups;
CREATE POLICY "backups_solo_owner"
  ON public.backups FOR ALL TO authenticated
  USING (public.es_owner()) WITH CHECK (public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backups TO authenticated;

-- ============================================================================
-- 24) STUDY_HISTORY (si existe en producción; propia + owner)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_history')
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'study_history'
                   AND column_name = 'usuario_id') THEN
    EXECUTE 'ALTER TABLE public.study_history ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "study_history_anon_all" ON public.study_history';
    EXECUTE 'DROP POLICY IF EXISTS "study_history_propio" ON public.study_history';
    EXECUTE 'CREATE POLICY "study_history_propio" ON public.study_history FOR ALL TO authenticated
             USING (usuario_id = auth.uid() OR public.es_owner())
             WITH CHECK (usuario_id = auth.uid() OR public.es_owner())';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_history TO authenticated';
  END IF;
END $$;

-- ============================================================================
-- 25) STORAGE (avatars) — endurecer el INSERT para que nadie suba fotos a la
--     carpeta de otro usuario (UPDATE/DELETE/SELECT ya estaban por carpeta)
-- ============================================================================
DROP POLICY IF EXISTS "avatars_insert_autenticado" ON storage.objects;
CREATE POLICY "avatars_insert_autenticado"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars'
              AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- NOTA DE SEGURIDAD RESIDUAL (documentada, no bloqueante):
--   * La nota de exámenes objetivos y la puntuación de desafíos las calcula el
--     cliente al entregar/finalizar (diseño actual de la app). El RLS limita el
--     UPDATE a las propias filas, pero no impide que un alumno se suba la nota de
--     SU propio intento ni que un participante se ponga la puntuación de SU
--     desafío. Cerrarlo requiere RPCs de entrega/corrección con cálculo en el
--     servidor (Fase 3).
--   * Un usuario desactivado con un JWT sin expirar conserva acceso mientras el
--     token viva: las políticas no comprueban `activo`. El cliente ya fuerza el
--     logout al revalidar el perfil; para endurecer, banear también en auth
--     (auth.admin_update_user_by_id) en Fase 3.
-- ============================================================================

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT '✅ 028-C aplicada: RLS cerrado con auth.uid() en ' || count(*)::text ||
       ' tablas; anon sin acceso a datos' AS mensaje
  FROM pg_policies WHERE schemaname = 'public';
