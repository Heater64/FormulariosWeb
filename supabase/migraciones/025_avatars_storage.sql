-- MIGRACIÓN 025: Bucket de almacenamiento para fotos de perfil
-- Este bucket es público para que las fotos sean visibles para todos.
-- Ejecutar en el SQL Editor de Supabase Dashboard.

-- Crear bucket público para avatares
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Permitir que cualquier usuario autenticado pueda subir su propia foto
CREATE POLICY "avatars_insert_autenticado"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Permitir que el propietario pueda actualizar/eliminar su foto
CREATE POLICY "avatars_update_propio"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_delete_propio"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Permitir lectura pública de los avatares
CREATE POLICY "avatars_lectura_publica"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
