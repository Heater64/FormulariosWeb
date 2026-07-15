CREATE TABLE IF NOT EXISTS categorias_memorizacion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now(),
  UNIQUE(usuario_id, nombre)
);

ALTER TABLE categorias_memorizacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus categorías" ON categorias_memorizacion
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios crean sus categorías" ON categorias_memorizacion
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios actualizan sus categorías" ON categorias_memorizacion
  FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios eliminan sus categorías" ON categorias_memorizacion
  FOR DELETE USING (auth.uid() = usuario_id);

CREATE TABLE IF NOT EXISTS categorias_tarjetas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tarjeta_id UUID NOT NULL REFERENCES tarjetas_memorizacion(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES categorias_memorizacion(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(tarjeta_id, categoria_id)
);

ALTER TABLE categorias_tarjetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus asignaciones" ON categorias_tarjetas
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios crean sus asignaciones" ON categorias_tarjetas
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios eliminan sus asignaciones" ON categorias_tarjetas
  FOR DELETE USING (auth.uid() = usuario_id);
