-- Tabla para almacenar las ubicaciones en tiempo real de los participantes
CREATE TABLE IF NOT EXISTS "UbicacionParticipante" (
  id SERIAL PRIMARY KEY,
  "idPlan" INTEGER REFERENCES "Planes"("idPlan") ON DELETE CASCADE,
  "idPerfil" INTEGER REFERENCES "perfiles"(id) ON DELETE CASCADE,
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
