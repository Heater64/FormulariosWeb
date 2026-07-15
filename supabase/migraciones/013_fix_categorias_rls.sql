-- Corrección: el app usa auth custom, no Supabase Auth.
-- auth.uid() es null → RLS bloquea todo. Eliminamos RLS de estas tablas.

ALTER TABLE categorias_memorizacion DISABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_tarjetas DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus categorías" ON categorias_memorizacion;
DROP POLICY IF EXISTS "Usuarios crean sus categorías" ON categorias_memorizacion;
DROP POLICY IF EXISTS "Usuarios actualizan sus categorías" ON categorias_memorizacion;
DROP POLICY IF EXISTS "Usuarios eliminan sus categorías" ON categorias_memorizacion;

DROP POLICY IF EXISTS "Usuarios ven sus asignaciones" ON categorias_tarjetas;
DROP POLICY IF EXISTS "Usuarios crean sus asignaciones" ON categorias_tarjetas;
DROP POLICY IF EXISTS "Usuarios eliminan sus asignaciones" ON categorias_tarjetas;
