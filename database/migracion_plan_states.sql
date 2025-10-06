-- Normalización de estados de planes por tipo

-- 1) Tablas de catálogo
CREATE TABLE IF NOT EXISTS plan_types (
  id SMALLINT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_states (
  id SERIAL PRIMARY KEY,
  plan_type_id SMALLINT NOT NULL REFERENCES plan_types(id) ON DELETE RESTRICT,
  code SMALLINT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE (plan_type_id, code)
);

-- 2) Seeds
INSERT INTO plan_types (id, slug, name) VALUES
  (1, 'predefinido', 'Plan predefinido'),
  (2, 'personalizado', 'Plan personalizado')
ON CONFLICT (id) DO NOTHING;

-- Predefinido (3 estados)
INSERT INTO plan_states (plan_type_id, code, slug, name) VALUES
  (1, 0, 'en_creacion', 'En creación'),
  (1, 1, 'en_proceso_aceptacion', 'En proceso de aceptación'),
  (1, 2, 'finalizado', 'Finalizado')
ON CONFLICT DO NOTHING;

-- Personalizado (4 estados)
INSERT INTO plan_states (plan_type_id, code, slug, name) VALUES
  (2, 0, 'en_creacion', 'En creación'),
  (2, 1, 'en_proceso_aceptacion', 'En proceso de aceptación'),
  (2, 2, 'en_votacion', 'En votación'),
  (2, 3, 'finalizado', 'Finalizado')
ON CONFLICT DO NOTHING;

-- 3) Alteraciones en tabla de planes (usar comillas por uso de mayúsculas)
ALTER TABLE "Planes"
  ADD COLUMN IF NOT EXISTS plan_type_id SMALLINT,
  ADD COLUMN IF NOT EXISTS plan_state_id INTEGER;

-- 4) Migración de datos desde columnas legacy si existen (estado int, tipoPlan string)
DO $$
BEGIN
  -- Mapear tipoPlan -> plan_type_id si existe la columna tipoPlan
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'Planes' AND column_name = 'tipoPlan'
  ) THEN
    UPDATE "Planes" p
    SET plan_type_id = CASE lower(p."tipoPlan")
      WHEN 'predefinido' THEN 1
      WHEN 'personalizado' THEN 2
      ELSE 1
    END
    WHERE p.plan_type_id IS NULL;
  END IF;

  -- Si no hay tipo, asumir predefinido por defecto
  UPDATE "Planes" p
  SET plan_type_id = 1
  WHERE p.plan_type_id IS NULL;

  -- Mapear estado (int) -> plan_state_id por tipo si existe la columna estado
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'Planes' AND column_name = 'estado'
  ) THEN
    UPDATE "Planes" p
    SET plan_state_id = ps.id
    FROM plan_states ps
    WHERE ps.plan_type_id = p.plan_type_id
      AND ps.code = p.estado
      AND p.plan_state_id IS NULL;
  END IF;

  -- Si aún no se pudo mapear, usar estado 0 por defecto del tipo asignado
  UPDATE "Planes" p
  SET plan_state_id = ps0.id
  FROM plan_states ps0
  WHERE ps0.plan_type_id = p.plan_type_id
    AND ps0.code = 0
    AND p.plan_state_id IS NULL;
END $$;

-- 5) Restringir y relacionar
ALTER TABLE "Planes"
  ALTER COLUMN plan_type_id SET NOT NULL,
  ALTER COLUMN plan_state_id SET NOT NULL;

ALTER TABLE "Planes"
  ADD CONSTRAINT IF NOT EXISTS fk_planes_plan_types FOREIGN KEY (plan_type_id) REFERENCES plan_types(id) ON DELETE RESTRICT,
  ADD CONSTRAINT IF NOT EXISTS fk_planes_plan_states FOREIGN KEY (plan_state_id) REFERENCES plan_states(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_planes_plan_type ON "Planes"(plan_type_id);
CREATE INDEX IF NOT EXISTS idx_planes_plan_state ON "Planes"(plan_state_id);

-- 6) Limpieza (ejecutar manualmente cuando se valide la migración)
-- ALTER TABLE "Planes" DROP COLUMN estado;
-- ALTER TABLE "Planes" DROP COLUMN "tipoPlan";


