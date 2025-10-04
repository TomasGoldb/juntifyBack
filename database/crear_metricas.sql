-- Script para crear la tabla de métricas de usuario
-- Ejecuta este script en tu base de datos de Supabase

-- Tabla para almacenar todas las métricas de usuario
CREATE TABLE IF NOT EXISTS "user_metrics" (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  user_id VARCHAR(255),
  session_id VARCHAR(255),
  properties JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_metrics_event_name ON "user_metrics"(event_name);
CREATE INDEX IF NOT EXISTS idx_metrics_user_id ON "user_metrics"(user_id);
CREATE INDEX IF NOT EXISTS idx_metrics_session_id ON "user_metrics"(session_id);
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON "user_metrics"(created_at);
CREATE INDEX IF NOT EXISTS idx_metrics_properties ON "user_metrics" USING GIN(properties);

-- Índice compuesto para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_metrics_user_event_date ON "user_metrics"(user_id, event_name, created_at);

-- Índice para consultas de pantallas
CREATE INDEX IF NOT EXISTS idx_metrics_screen_views ON "user_metrics"(event_name, created_at) 
WHERE event_name = 'screen_view';

-- Índice para consultas de planes
CREATE INDEX IF NOT EXISTS idx_metrics_plan_events ON "user_metrics"(event_name, created_at) 
WHERE event_name IN ('plan_creation', 'plan_completion');

-- Índice para consultas de rendimiento
CREATE INDEX IF NOT EXISTS idx_metrics_performance ON "user_metrics"(event_name, created_at) 
WHERE event_name IN ('load_time', 'error');

-- Habilitar RLS
ALTER TABLE "user_metrics" ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propias métricas
CREATE POLICY "Users can view their own metrics" ON "user_metrics"
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Política para insertar métricas (todos los usuarios autenticados)
CREATE POLICY "Authenticated users can insert metrics" ON "user_metrics"
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para administradores (pueden ver todas las métricas)
CREATE POLICY "Admins can view all metrics" ON "user_metrics"
  FOR SELECT USING (auth.role() = 'service_role');

-- Función para limpiar métricas antiguas (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM "user_metrics" 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Métricas antiguas eliminadas (más de 90 días)';
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de pantallas
CREATE OR REPLACE FUNCTION get_screen_stats(
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL,
  p_user_id VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  screen_name VARCHAR,
  view_count BIGINT,
  unique_users BIGINT,
  avg_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    um.properties->>'screen' as screen_name,
    COUNT(*) as view_count,
    COUNT(DISTINCT um.user_id) as unique_users,
    COALESCE(AVG((um.properties->>'duration')::NUMERIC), 0) as avg_time
  FROM "user_metrics" um
  WHERE um.event_name = 'screen_view'
    AND (p_start_date IS NULL OR um.created_at >= p_start_date)
    AND (p_end_date IS NULL OR um.created_at <= p_end_date)
    AND (p_user_id IS NULL OR um.user_id = p_user_id)
  GROUP BY um.properties->>'screen'
  ORDER BY view_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de planes
CREATE OR REPLACE FUNCTION get_plan_stats(
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL,
  p_user_id VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  plan_type VARCHAR,
  step VARCHAR,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    um.properties->>'planType' as plan_type,
    um.properties->>'step' as step,
    COUNT(*) as count
  FROM "user_metrics" um
  WHERE um.event_name = 'plan_creation'
    AND (p_start_date IS NULL OR um.created_at >= p_start_date)
    AND (p_end_date IS NULL OR um.created_at <= p_end_date)
    AND (p_user_id IS NULL OR um.user_id = p_user_id)
  GROUP BY um.properties->>'planType', um.properties->>'step'
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE "user_metrics" IS 'Tabla para almacenar métricas de comportamiento de usuarios';
COMMENT ON COLUMN "user_metrics".event_id IS 'ID único del evento generado por el frontend';
COMMENT ON COLUMN "user_metrics".event_name IS 'Nombre del evento (screen_view, user_action, etc.)';
COMMENT ON COLUMN "user_metrics".properties IS 'Propiedades del evento en formato JSON';
COMMENT ON COLUMN "user_metrics".user_id IS 'ID del usuario que generó el evento';
COMMENT ON COLUMN "user_metrics".session_id IS 'ID de la sesión del usuario';

-- Crear vista para métricas de pantallas más consultadas
CREATE OR REPLACE VIEW screen_metrics_view AS
SELECT 
  properties->>'screen' as screen_name,
  COUNT(*) as total_views,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG((properties->>'duration')::NUMERIC) as avg_duration_ms,
  MIN(created_at) as first_view,
  MAX(created_at) as last_view
FROM "user_metrics"
WHERE event_name = 'screen_view'
GROUP BY properties->>'screen'
ORDER BY total_views DESC;

-- Crear vista para métricas de planes
CREATE OR REPLACE VIEW plan_metrics_view AS
SELECT 
  properties->>'planType' as plan_type,
  properties->>'step' as step,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions
FROM "user_metrics"
WHERE event_name = 'plan_creation'
GROUP BY properties->>'planType', properties->>'step'
ORDER BY count DESC;

-- Crear vista para métricas de rendimiento
CREATE OR REPLACE VIEW performance_metrics_view AS
SELECT 
  properties->>'component' as component,
  event_name,
  COUNT(*) as count,
  AVG((properties->>'duration')::NUMERIC) as avg_duration_ms,
  MIN(created_at) as first_occurrence,
  MAX(created_at) as last_occurrence
FROM "user_metrics"
WHERE event_name IN ('load_time', 'error')
GROUP BY properties->>'component', event_name
ORDER BY count DESC;
