-- Configuración de Supabase Storage para el bucket 'perfiles'
-- Este archivo contiene las políticas de seguridad necesarias para el funcionamiento correcto

-- 1. Crear el bucket 'perfiles' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('perfiles', 'perfiles', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Política para permitir que los usuarios vean fotos de perfil (lectura pública)
CREATE POLICY "Permitir lectura pública de fotos de perfil"
ON storage.objects FOR SELECT
USING (bucket_id = 'perfiles');

-- 3. Función auxiliar para extraer el user_id del nombre del archivo
-- Los archivos se nombran como: user_{userId}_{timestamp}.jpg
CREATE OR REPLACE FUNCTION extract_user_id_from_filename(filename text)
RETURNS text AS $$
BEGIN
  -- Extraer user_id del patrón user_{userId}_{timestamp}.jpg
  RETURN substring(filename from 'user_([^_]+)_');
END;
$$ LANGUAGE plpgsql;

-- 4. Políticas para operaciones de escritura (INSERT, UPDATE, DELETE)
-- Permitir subida de fotos propias
CREATE POLICY "Permitir subida de fotos propias"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'perfiles' 
  AND auth.uid()::text = extract_user_id_from_filename(name)
);

-- Permitir actualización de fotos propias
CREATE POLICY "Permitir actualización de fotos propias"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'perfiles' 
  AND auth.uid()::text = extract_user_id_from_filename(name)
);

-- Permitir eliminación de fotos propias
CREATE POLICY "Permitir eliminación de fotos propias"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'perfiles' 
  AND auth.uid()::text = extract_user_id_from_filename(name)
);

-- 5. Habilitar RLS (Row Level Security) en el bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 6. Configuración adicional del bucket (opcional)
-- Estas configuraciones se pueden hacer desde el dashboard de Supabase también

-- Configurar límites de tamaño (5MB máximo)
-- Esta configuración se hace desde el dashboard de Supabase Storage

-- 7. Índices para mejorar performance (opcional)
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_name 
ON storage.objects (bucket_id, name);

CREATE INDEX IF NOT EXISTS idx_storage_objects_owner 
ON storage.objects (owner);

-- 8. Función para limpiar archivos antiguos (opcional)
-- Esta función puede ser llamada periódicamente para limpiar archivos huérfanos
CREATE OR REPLACE FUNCTION cleanup_old_profile_photos()
RETURNS void AS $$
DECLARE
  cutoff_date timestamp := now() - interval '30 days';
BEGIN
  -- Eliminar archivos de más de 30 días que no estén referenciados en la tabla perfiles
  DELETE FROM storage.objects 
  WHERE bucket_id = 'perfiles' 
    AND created_at < cutoff_date
    AND name NOT IN (
      SELECT substring(foto from '[^/]+$') 
      FROM perfiles 
      WHERE foto IS NOT NULL 
        AND foto LIKE '%/storage/v1/object/public/perfiles/%'
    );
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger para actualizar última actividad cuando se actualiza la foto
CREATE OR REPLACE FUNCTION update_profile_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar ultima_actividad cuando se cambia la foto
  IF OLD.foto IS DISTINCT FROM NEW.foto THEN
    NEW.ultima_actividad = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger si no existe
DROP TRIGGER IF EXISTS trigger_update_profile_activity ON perfiles;
CREATE TRIGGER trigger_update_profile_activity
  BEFORE UPDATE ON perfiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_activity();

-- 10. Vista para estadísticas de uso del storage (opcional)
CREATE OR REPLACE VIEW profile_storage_stats AS
SELECT 
  COUNT(*) as total_files,
  SUM(metadata->>'size')::bigint as total_size_bytes,
  AVG((metadata->>'size')::bigint) as avg_size_bytes,
  MIN(created_at) as oldest_file,
  MAX(created_at) as newest_file
FROM storage.objects 
WHERE bucket_id = 'perfiles';

-- Comentarios sobre configuración adicional:
-- 
-- 1. Configurar CORS en Supabase Dashboard:
--    - Allowed origins: tu dominio de la app
--    - Allowed methods: GET, POST, PUT, DELETE
--    - Allowed headers: authorization, content-type
--
-- 2. Configurar límites en Supabase Dashboard:
--    - File size limit: 5MB
--    - Allowed file types: image/jpeg, image/png, image/webp
--
-- 3. Configurar transformaciones de imagen (opcional):
--    - Resize automático a 400x400px
--    - Compresión automática
--    - Conversión de formato automática
