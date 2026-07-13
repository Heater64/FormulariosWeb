-- Migración 010: Permisos del rol anon para las funciones de administración
-- El proyecto NO usa RLS; las tablas funcionan con los privilegios que
-- Supabase otorga al rol anon. Para que el "Panel de Administración" pueda
-- crear usuarios, grupos y registrar auditoría (operaciones INSERT/UPDATE/DELETE),
-- el rol anon necesita permisos explícitos sobre estas tablas.
-- También se otorga acceso a authenticated por coherencia.

ALTER TABLE perfiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE grupos DISABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE perfiles TO anon;
GRANT ALL ON TABLE perfiles TO authenticated;

GRANT ALL ON TABLE grupos TO anon;
GRANT ALL ON TABLE grupos TO authenticated;

GRANT ALL ON TABLE auditoria TO anon;
GRANT ALL ON TABLE auditoria TO authenticated;
