-- ============================================================
-- HABILITAR RLS + POLÍTICAS ABIERTAS PARA ANON
-- ⚠️ El sistema usa autenticación custom (tabla perfiles con password),
--    NO Supabase Auth JWT. auth.uid() devuelve null.
--    Las políticas abiertas son necesarias para que el sistema funcione.
--    Cuando se migre a Supabase Auth, reemplazar estas policies
--    con las restrictivas del archivo 001_global_policies.sql
-- ============================================================

-- 1) PERFILES
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfiles_anon_all" ON perfiles;
DROP POLICY IF EXISTS "perfiles_anon_login" ON perfiles;
DROP POLICY IF EXISTS "perfiles_lectura_propios_o_admin" ON perfiles;
CREATE POLICY "perfiles_anon_all" ON perfiles FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2) GRUPOS
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grupos_anon_all" ON grupos;
DROP POLICY IF EXISTS "grupos_lectura_miembros" ON grupos;
DROP POLICY IF EXISTS "grupos_admin_gestiona" ON grupos;
CREATE POLICY "grupos_anon_all" ON grupos FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3) MIEMBROS_GRUPO
ALTER TABLE miembros_grupo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "miembros_anon_all" ON miembros_grupo;
DROP POLICY IF EXISTS "miembros_lectura_miembros" ON miembros_grupo;
DROP POLICY IF EXISTS "miembros_admin_gestiona" ON miembros_grupo;
CREATE POLICY "miembros_anon_all" ON miembros_grupo FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4) LIBROS_BIBLICOS (catálogo público)
ALTER TABLE libros_biblicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "libros_anon_publico" ON libros_biblicos;
CREATE POLICY "libros_anon_publico" ON libros_biblicos FOR SELECT TO anon USING (true);

-- 5) CAPITULOS
ALTER TABLE capitulos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "capitulos_anon_publico" ON capitulos;
CREATE POLICY "capitulos_anon_publico" ON capitulos FOR SELECT TO anon USING (true);

-- 6) VERSICULOS
ALTER TABLE versiculos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "versiculos_anon_publico" ON versiculos;
CREATE POLICY "versiculos_anon_publico" ON versiculos FOR SELECT TO anon USING (true);

-- 7) PROGRESO_LECTURA
ALTER TABLE progreso_lectura ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progreso_lectura_anon_all" ON progreso_lectura;
DROP POLICY IF EXISTS "progreso_lectura_propio" ON progreso_lectura;
DROP POLICY IF EXISTS "progreso_lectura_profesor_ve" ON progreso_lectura;
CREATE POLICY "progreso_lectura_anon_all" ON progreso_lectura FOR ALL TO anon USING (true) WITH CHECK (true);

-- 8) PREGUNTAS_SISTEMA
ALTER TABLE preguntas_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preguntas_sistema_anon_all" ON preguntas_sistema;
DROP POLICY IF EXISTS "preguntas_sistema_lectura_grupo" ON preguntas_sistema;
DROP POLICY IF EXISTS "preguntas_sistema_edicion_editor" ON preguntas_sistema;
CREATE POLICY "preguntas_sistema_anon_all" ON preguntas_sistema FOR ALL TO anon USING (true) WITH CHECK (true);

-- 9) EXAMENES_PERSONALIZADOS
ALTER TABLE examenes_personalizados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "examenes_anon_all" ON examenes_personalizados;
DROP POLICY IF EXISTS "examenes_lectura_grupo" ON examenes_personalizados;
DROP POLICY IF EXISTS "examenes_edicion_profesor" ON examenes_personalizados;
CREATE POLICY "examenes_anon_all" ON examenes_personalizados FOR ALL TO anon USING (true) WITH CHECK (true);

-- 10) INTENTOS_EXAMEN_PERSONALIZADO
ALTER TABLE intentos_examen_personalizado ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intentos_anon_all" ON intentos_examen_personalizado;
DROP POLICY IF EXISTS "intentos_alumno_propio" ON intentos_examen_personalizado;
DROP POLICY IF EXISTS "intentos_profesor_ve" ON intentos_examen_personalizado;
DROP POLICY IF EXISTS "intentos_profesor_califica" ON intentos_examen_personalizado;
CREATE POLICY "intentos_anon_all" ON intentos_examen_personalizado FOR ALL TO anon USING (true) WITH CHECK (true);

-- 11) TARJETAS_MEMORIZACION
ALTER TABLE tarjetas_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tarjetas_anon_all" ON tarjetas_memorizacion;
DROP POLICY IF EXISTS "tarjetas_propias" ON tarjetas_memorizacion;
CREATE POLICY "tarjetas_anon_all" ON tarjetas_memorizacion FOR ALL TO anon USING (true) WITH CHECK (true);

-- 12) REPASOS_MEMORIZACION
ALTER TABLE repasos_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "repasos_anon_all" ON repasos_memorizacion;
DROP POLICY IF EXISTS "repasos_propios" ON repasos_memorizacion;
CREATE POLICY "repasos_anon_all" ON repasos_memorizacion FOR ALL TO anon USING (true) WITH CHECK (true);

-- 13) LOGROS
ALTER TABLE logros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logros_anon_all" ON logros;
DROP POLICY IF EXISTS "logros_todos_ven" ON logros;
CREATE POLICY "logros_anon_all" ON logros FOR ALL TO anon USING (true) WITH CHECK (true);

-- 14) LOGROS_USUARIO
ALTER TABLE logros_usuario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logros_usuario_anon_all" ON logros_usuario;
DROP POLICY IF EXISTS "logros_usuario_propios" ON logros_usuario;
CREATE POLICY "logros_usuario_anon_all" ON logros_usuario FOR ALL TO anon USING (true) WITH CHECK (true);

-- 15) AUDITORIA
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auditoria_anon_all" ON auditoria;
DROP POLICY IF EXISTS "auditoria_solo_owner" ON auditoria;
DROP POLICY IF EXISTS "auditoria_insert_sistema" ON auditoria;
CREATE POLICY "auditoria_anon_all" ON auditoria FOR ALL TO anon USING (true) WITH CHECK (true);

-- 16) GRANTs para el rol anon en TODAS las tablas
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 17) HABILITAR RLS EN study_history si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_history') THEN
    ALTER TABLE study_history ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "study_history_anon_all" ON study_history;
    CREATE POLICY "study_history_anon_all" ON study_history FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

SELECT '✅ RLS configurado para auth custom: todas las tablas abiertas para anon' AS mensaje;
