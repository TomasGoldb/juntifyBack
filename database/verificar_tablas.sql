-- Script para verificar las tablas existentes en la base de datos
-- Ejecuta esto primero para ver qué tablas tienes

-- Ver todas las tablas en el esquema público
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Ver las columnas de las tablas que podrían ser relevantes
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('perfiles', 'Perfiles', 'planes', 'Planes', 'participanteplan', 'ParticipantePlan')
ORDER BY table_name, ordinal_position;

-- Ver si existe alguna tabla de usuarios o perfiles
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%perfil%' OR table_name ILIKE '%user%' OR table_name ILIKE '%auth%'
ORDER BY table_name;
