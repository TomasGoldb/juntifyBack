-- Script para crear la tabla y función de tracking de ubicación
-- Ejecuta este script en tu base de datos de Supabase

-- Tabla para almacenar las ubicaciones en tiempo real de los participantes
CREATE TABLE IF NOT EXISTS "UbicacionParticipante" (
  id SERIAL PRIMARY KEY,
  "idPlan" INTEGER NOT NULL,
  "idPerfil" INTEGER NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  bateria INTEGER DEFAULT 100,
  UNIQUE("idPlan", "idPerfil")
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_ubicacion_plan ON "UbicacionParticipante"("idPlan");
CREATE INDEX IF NOT EXISTS idx_ubicacion_perfil ON "UbicacionParticipante"("idPerfil");
CREATE INDEX IF NOT EXISTS idx_ubicacion_timestamp ON "UbicacionParticipante"(timestamp);

-- Función para actualizar o insertar ubicación
CREATE OR REPLACE FUNCTION actualizar_ubicacion_participante(
  p_idPlan INTEGER,
  p_idPerfil INTEGER,
  p_latitude DECIMAL(10, 8),
  p_longitude DECIMAL(11, 8),
  p_bateria INTEGER DEFAULT 100
) RETURNS VOID AS $$
BEGIN
  INSERT INTO "UbicacionParticipante" ("idPlan", "idPerfil", latitude, longitude, bateria, timestamp)
  VALUES (p_idPlan, p_idPerfil, p_latitude, p_longitude, p_bateria, NOW())
  ON CONFLICT ("idPlan", "idPerfil")
  DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    bateria = EXCLUDED.bateria,
    timestamp = NOW();
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS en la tabla
ALTER TABLE "UbicacionParticipante" ENABLE ROW LEVEL SECURITY;

-- Política básica para permitir que los usuarios autenticados vean las ubicaciones
CREATE POLICY "Usuarios autenticados pueden ver ubicaciones" ON "UbicacionParticipante"
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir que los usuarios actualicen su propia ubicación
CREATE POLICY "Usuarios pueden actualizar su ubicación" ON "UbicacionParticipante"
  FOR UPDATE USING (auth.uid()::text = "idPerfil"::text);

-- Política para permitir que los usuarios inserten su ubicación
CREATE POLICY "Usuarios pueden insertar su ubicación" ON "UbicacionParticipante"
  FOR INSERT WITH CHECK (auth.uid()::text = "idPerfil"::text);

-- Política para permitir que los usuarios eliminen su ubicación
CREATE POLICY "Usuarios pueden eliminar su ubicación" ON "UbicacionParticipante"
  FOR DELETE USING (auth.uid()::text = "idPerfil"::text);

-- Dar permisos de ejecución a la función
GRANT EXECUTE ON FUNCTION actualizar_ubicacion_participante TO authenticated;

-- Comentario de confirmación
SELECT 'Tabla UbicacionParticipante y función actualizar_ubicacion_participante creadas exitosamente' as mensaje; 