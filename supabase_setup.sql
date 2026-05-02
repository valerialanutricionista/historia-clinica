-- =============================================================================
-- Historia Clínica Nutricional - Esquema Supabase
-- Modelo A: espacio compartido (todos los usuarios autenticados ven los mismos
-- pacientes). Para invitar a alguien más, simplemente lo creás en Supabase Auth.
--
-- USO: copiá y pegá TODO este archivo en Supabase → SQL Editor → Run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla principal: pacientes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pacientes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  fecha_inicio DATE,
  fecha_nacimiento DATE,
  sexo TEXT,
  domicilio TEXT,
  telefono TEXT,
  profesion TEXT,
  motivo_consulta TEXT,
  operaciones TEXT,
  medicamentos TEXT,
  presion_arterial TEXT,
  intolerancia_alimentaria TEXT,
  alergia_alimentaria TEXT,
  patologias_gastricas TEXT,
  patologias_intestinales TEXT,
  otras TEXT,
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now(),
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Antropometría (acumula histórico)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS antropometria (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  paciente_id BIGINT NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  peso NUMERIC,
  talla NUMERIC,
  peso_ideal NUMERIC,
  imc NUMERIC,
  categoria_imc TEXT,
  observaciones TEXT,
  creado_en TIMESTAMPTZ DEFAULT now(),
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Laboratorio (acumula histórico)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS laboratorio (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  paciente_id BIGINT NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  colesterol NUMERIC,
  ldl NUMERIC,
  hdl NUMERIC,
  tg NUMERIC,
  glucemia NUMERIC,
  hgb_glicosilada NUMERIC,
  globulos_rojos NUMERIC,
  hematocrito NUMERIC,
  hemoglobina NUMERIC,
  globulos_blancos NUMERIC,
  observaciones TEXT,
  creado_en TIMESTAMPTZ DEFAULT now(),
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Día alimentario / Recordatorio 24hs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dia_alimentario (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  paciente_id BIGINT NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  desayuno TEXT,
  media_manana TEXT,
  almuerzo TEXT,
  media_tarde TEXT,
  cena TEXT,
  creado_en TIMESTAMPTZ DEFAULT now(),
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Selección de alimentos (anamnesis alimentaria)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seleccion_alimentos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  paciente_id BIGINT NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  lacteos TEXT,
  legumbres TEXT,
  carnes TEXT,
  cereales TEXT,
  frutas TEXT,
  agua TEXT,
  verduras TEXT,
  bebidas_alcoholicas TEXT,
  actividad_fisica TEXT,
  creado_en TIMESTAMPTZ DEFAULT now(),
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Planes alimentarios
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planes_alimentarios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  paciente_id BIGINT NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  titulo TEXT,
  contenido TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now(),
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Índices para búsquedas rápidas
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_antropo_paciente ON antropometria(paciente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_lab_paciente ON laboratorio(paciente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_dia_paciente ON dia_alimentario(paciente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_seleccion_paciente ON seleccion_alimentos(paciente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_planes_paciente ON planes_alimentarios(paciente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_pacientes_nombre ON pacientes(nombre);

-- -----------------------------------------------------------------------------
-- Trigger: actualizar "actualizado_en" automáticamente en pacientes
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pacientes_actualizado_en ON pacientes;
CREATE TRIGGER pacientes_actualizado_en
  BEFORE UPDATE ON pacientes
  FOR EACH ROW EXECUTE FUNCTION trg_set_actualizado_en();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Modelo A: cualquier usuario autenticado puede ver y editar todo.
-- Los anónimos no pueden hacer nada.
-- =============================================================================

ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE antropometria ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratorio ENABLE ROW LEVEL SECURITY;
ALTER TABLE dia_alimentario ENABLE ROW LEVEL SECURITY;
ALTER TABLE seleccion_alimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes_alimentarios ENABLE ROW LEVEL SECURITY;

-- Helper: aplicar las 4 políticas (SELECT/INSERT/UPDATE/DELETE) a una tabla
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'pacientes', 'antropometria', 'laboratorio',
    'dia_alimentario', 'seleccion_alimentos', 'planes_alimentarios'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_select" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete" ON %I', t);

    EXECUTE format(
      'CREATE POLICY "auth_select" ON %I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format(
      'CREATE POLICY "auth_insert" ON %I FOR INSERT TO authenticated WITH CHECK (true)', t);
    EXECUTE format(
      'CREATE POLICY "auth_update" ON %I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format(
      'CREATE POLICY "auth_delete" ON %I FOR DELETE TO authenticated USING (true)', t);
  END LOOP;
END $$;

-- =============================================================================
-- Listo. Verificar:
--   SELECT * FROM pacientes;  -- debería devolver 0 filas (sin error)
-- =============================================================================
