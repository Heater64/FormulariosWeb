-- ============================================================
-- RLS: perfiles
-- ============================================================
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfiles_lectura_propios_o_admin"
  ON perfiles FOR SELECT USING (
    id = auth.uid() OR
    es_admin_del_grupo(grupo_id) OR
    es_owner()
  );

CREATE POLICY "perfiles_actualizacion_propia"
  ON perfiles FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "perfiles_admin_actualiza"
  ON perfiles FOR UPDATE USING (
    es_admin_del_grupo(grupo_id) OR es_owner()
  );

-- ============================================================
-- RLS: grupos
-- ============================================================
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grupos_lectura_miembros"
  ON grupos FOR SELECT USING (
    es_miembro_del_grupo(id) OR es_owner()
  );

CREATE POLICY "grupos_admin_gestiona"
  ON grupos FOR ALL USING (
    es_admin_del_grupo(id) OR es_owner()
  );

-- ============================================================
-- RLS: miembros_grupo
-- ============================================================
ALTER TABLE miembros_grupo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "miembros_lectura_miembros"
  ON miembros_grupo FOR SELECT USING (
    es_miembro_del_grupo(grupo_id) OR es_owner()
  );

CREATE POLICY "miembros_admin_gestiona"
  ON miembros_grupo FOR ALL USING (
    es_admin_del_grupo(grupo_id) OR es_owner()
  );

-- ============================================================
-- RLS: progreso_lectura (cada usuario ve su propio progreso)
-- ============================================================
ALTER TABLE progreso_lectura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progreso_lectura_propio"
  ON progreso_lectura FOR ALL USING (
    usuario_id = auth.uid() OR es_owner()
  );

CREATE POLICY "progreso_lectura_profesor_ve"
  ON progreso_lectura FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM perfiles p
      JOIN miembros_grupo mg ON mg.grupo_id = p.grupo_id
      WHERE p.id = progreso_lectura.usuario_id
        AND mg.usuario_id = auth.uid()
        AND mg.rol_en_grupo IN ('admin', 'editor')
    )
  );

-- ============================================================
-- RLS: preguntas_sistema (lectura para todos los miembros del grupo)
-- ============================================================
ALTER TABLE preguntas_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preguntas_sistema_lectura_grupo"
  ON preguntas_sistema FOR SELECT USING (
    es_miembro_del_grupo(
      (SELECT p.grupo_id FROM capitulos c
       JOIN libros_biblicos l ON c.libro_id = l.id
       JOIN perfiles p ON p.grupo_id IS NOT NULL
       WHERE c.id = preguntas_sistema.capitulo_id
       LIMIT 1)
    ) OR es_owner()
  );

CREATE POLICY "preguntas_sistema_edicion_editor"
  ON preguntas_sistema FOR INSERT WITH CHECK (
    creado_por = auth.uid() AND
    EXISTS (
      SELECT 1 FROM capitulos c
      JOIN libros_biblicos l ON c.libro_id = l.id
      JOIN miembros_grupo mg ON mg.grupo_id = (SELECT grupo_id FROM perfiles WHERE id = auth.uid())
      WHERE c.id = capitulo_id AND mg.rol_en_grupo IN ('admin', 'editor')
    )
  );

-- ============================================================
-- RLS: examenes_personalizados
-- ============================================================
ALTER TABLE examenes_personalizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "examenes_lectura_grupo"
  ON examenes_personalizados FOR SELECT USING (
    es_miembro_del_grupo(grupo_id) OR es_owner()
  );

CREATE POLICY "examenes_edicion_profesor"
  ON examenes_personalizados FOR ALL USING (
    es_editor_del_grupo(grupo_id)
  );

-- ============================================================
-- RLS: intentos_examen_personalizado
-- ============================================================
ALTER TABLE intentos_examen_personalizado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intentos_alumno_propio"
  ON intentos_examen_personalizado FOR ALL USING (
    alumno_id = auth.uid() OR es_owner()
  );

CREATE POLICY "intentos_profesor_ve"
  ON intentos_examen_personalizado FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM examenes_personalizados e
      WHERE e.id = examen_id AND es_editor_del_grupo(e.grupo_id)
    )
  );

CREATE POLICY "intentos_profesor_califica"
  ON intentos_examen_personalizado FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM examenes_personalizados e
      WHERE e.id = examen_id AND es_editor_del_grupo(e.grupo_id)
    )
  );

-- ============================================================
-- RLS: tarjetas_memorizacion
-- ============================================================
ALTER TABLE tarjetas_memorizacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tarjetas_propias"
  ON tarjetas_memorizacion FOR ALL USING (
    usuario_id = auth.uid() OR es_owner()
  );

-- ============================================================
-- RLS: repasos_memorizacion
-- ============================================================
ALTER TABLE repasos_memorizacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repasos_propios"
  ON repasos_memorizacion FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tarjetas_memorizacion t
      WHERE t.id = tarjeta_id AND t.usuario_id = auth.uid()
    )
  );

-- ============================================================
-- RLS: logros
-- ============================================================
ALTER TABLE logros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logros_todos_ven" ON logros FOR SELECT USING (true);

-- ============================================================
-- RLS: logros_usuario
-- ============================================================
ALTER TABLE logros_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logros_usuario_propios"
  ON logros_usuario FOR SELECT USING (
    usuario_id = auth.uid() OR es_admin_del_grupo(
      (SELECT grupo_id FROM perfiles WHERE id = logros_usuario.usuario_id)
    )
  );

-- ============================================================
-- RLS: auditoria (solo Owner)
-- ============================================================
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auditoria_solo_owner"
  ON auditoria FOR SELECT USING (es_owner());

CREATE POLICY "auditoria_insert_sistema"
  ON auditoria FOR INSERT WITH CHECK (true);
