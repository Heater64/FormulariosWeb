-- ============================================================
-- Funciones auxiliares de autorización (reutilizables en RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION es_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid() AND rol = 'owner' AND activo = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION es_admin_del_grupo(grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM miembros_grupo
    WHERE usuario_id = auth.uid()
      AND grupo_id = es_admin_del_grupo.grupo_id
      AND rol_en_grupo = 'admin'
  ) OR es_owner();
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION es_editor_del_grupo(grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM miembros_grupo
    WHERE usuario_id = auth.uid()
      AND grupo_id = es_editor_del_grupo.grupo_id
      AND rol_en_grupo IN ('admin', 'editor')
  ) OR es_owner();
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION es_miembro_del_grupo(grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM miembros_grupo
    WHERE usuario_id = auth.uid()
      AND grupo_id = es_miembro_del_grupo.grupo_id
  ) OR es_owner();
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION es_propio_usuario(usuario_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = usuario_id OR es_owner();
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION rol_actual()
RETURNS TEXT AS $$
DECLARE
  v_rol TEXT;
BEGIN
  SELECT rol INTO v_rol FROM perfiles WHERE id = auth.uid();
  RETURN v_rol;
END;
$$ LANGUAGE plpgsql STABLE;
