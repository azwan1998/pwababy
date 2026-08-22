-- ==============================================================================
-- PWA BABY MILK & ACTIVITY TRACKER - SUPABASE DDL & REALTIME SCHEMA
-- ==============================================================================

-- 1. TABEL: formula_inventories (Manajemen Kaleng Susu)
CREATE TABLE IF NOT EXISTS public.formula_inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id TEXT NOT NULL DEFAULT 'family_123',
    brand_name TEXT NOT NULL DEFAULT 'Bebelac 1',
    can_weight_grams NUMERIC(10, 2) NOT NULL DEFAULT 600.00,
    current_weight_grams NUMERIC(10, 2) NOT NULL DEFAULT 600.00,
    grams_per_scoop NUMERIC(5, 2) NOT NULL DEFAULT 4.60,
    ml_per_scoop NUMERIC(5, 2) NOT NULL DEFAULT 30.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formula_inventories_family ON public.formula_inventories(family_id);

-- 2. TABEL: feeding_logs (Log Minum Susu & Status Basi)
CREATE TABLE IF NOT EXISTS public.feeding_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id TEXT NOT NULL DEFAULT 'family_123',
    amount_ml INT NOT NULL CHECK (amount_ml > 0),
    status TEXT NOT NULL CHECK (status IN ('dibuat', 'mulai_minum', 'selesai', 'dibuang')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Waktu dibuat (Start countdown 2 jam basi)
    drinking_started_at TIMESTAMPTZ NULL,          -- Waktu mulai minum (Start countdown 1 jam basi)
    finished_at TIMESTAMPTZ NULL,                  -- Waktu selesai (Start countdown 20 min tegak)
    notes TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_feeding_logs_family_status ON public.feeding_logs(family_id, status);

-- 3. TABEL: baby_activities (Log Aktivitas Tummy Time, Tidur, dll.)
CREATE TABLE IF NOT EXISTS public.baby_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id TEXT NOT NULL DEFAULT 'family_123',
    activity_type TEXT NOT NULL CHECK (activity_type IN ('tummy_time', 'diaper', 'sleep')),
    duration_minutes INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baby_activities_family ON public.baby_activities(family_id, activity_type);

-- 4. TABEL: baby_profiles (Profil Bayi, Tanggal Lahir, & Berat Badan)
CREATE TABLE IF NOT EXISTS public.baby_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id TEXT UNIQUE NOT NULL DEFAULT 'family_123',
    baby_name TEXT NOT NULL DEFAULT 'Si Kecil',
    birth_date DATE NOT NULL DEFAULT '2026-06-01',
    weight_kg NUMERIC(4, 2) NOT NULL DEFAULT 5.20,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baby_profiles_family ON public.baby_profiles(family_id);

-- 5. TABEL: growth_logs (KMS Digital: Riwayat Berat, Panjang, Lingkar Kepala)
CREATE TABLE IF NOT EXISTS public.growth_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id TEXT NOT NULL DEFAULT 'family_123',
    measured_date DATE NOT NULL DEFAULT CURRENT_DATE,
    age_months NUMERIC(4, 1) NOT NULL DEFAULT 0,
    weight_kg NUMERIC(4, 2) NOT NULL,
    height_cm NUMERIC(4, 1) NULL,
    head_circ_cm NUMERIC(4, 1) NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_logs_family ON public.growth_logs(family_id, measured_date);

-- 6. TABEL: health_logs (Catatan Demam, Suhu Tubuh & Pemberian Obat)
CREATE TABLE IF NOT EXISTS public.health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id TEXT NOT NULL DEFAULT 'family_123',
    log_type TEXT NOT NULL CHECK (log_type IN ('temperature', 'medication', 'symptom')),
    temperature_c NUMERIC(4, 2) NULL,
    medication_name TEXT NULL,
    dosage TEXT NULL,
    notes TEXT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_logs_family_time ON public.health_logs(family_id, recorded_at DESC);

-- ==============================================================================
-- 6. FUNCTION & TRIGGER: DEDUCT FORMULA STOCK AUTOMATICALLY
-- ==============================================================================
CREATE OR REPLACE FUNCTION deduct_formula_on_feeding()
RETURNS TRIGGER AS $$
DECLARE
    v_grams_per_scoop NUMERIC;
    v_ml_per_scoop NUMERIC;
    v_used_grams NUMERIC;
BEGIN
    SELECT grams_per_scoop, ml_per_scoop 
    INTO v_grams_per_scoop, v_ml_per_scoop
    FROM public.formula_inventories
    WHERE family_id = NEW.family_id
    ORDER BY created_at DESC LIMIT 1;

    IF v_grams_per_scoop IS NULL THEN
        v_grams_per_scoop := 4.6; v_ml_per_scoop := 30.0;
    END IF;

    v_used_grams := (NEW.amount_ml / v_ml_per_scoop) * v_grams_per_scoop;

    UPDATE public.formula_inventories
    SET current_weight_grams = GREATEST(0, current_weight_grams - v_used_grams),
        updated_at = NOW()
    WHERE family_id = NEW.family_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deduct_formula ON public.feeding_logs;
CREATE TRIGGER trg_deduct_formula
AFTER INSERT ON public.feeding_logs
FOR EACH ROW WHEN (NEW.status = 'dibuat')
EXECUTE FUNCTION deduct_formula_on_feeding();


-- ==============================================================================
-- 7. VIEW: ESTIMATED DAYS LEFT & CONSUMPTION STATS (7 HARI TERAKHIR)
-- ==============================================================================
CREATE OR REPLACE VIEW public.v_formula_stock_prediction AS
WITH last_7_days AS (
    SELECT 
        family_id,
        COALESCE(SUM(amount_ml), 0) AS total_ml_7d,
        COUNT(id) AS total_feedings_7d
    FROM public.feeding_logs
    WHERE created_at >= (NOW() - INTERVAL '7 days') AND status != 'dibuang'
    GROUP BY family_id
)
SELECT 
    inv.id AS inventory_id,
    inv.family_id,
    inv.brand_name,
    inv.can_weight_grams,
    inv.current_weight_grams,
    inv.grams_per_scoop,
    inv.ml_per_scoop,
    COALESCE(l7.total_ml_7d, 0) AS total_ml_7d,
    COALESCE(l7.total_feedings_7d, 0) AS total_feedings_7d,
    ROUND(COALESCE(l7.total_ml_7d, 0) / 7.0, 1) AS avg_daily_ml,
    ROUND((COALESCE(l7.total_ml_7d, 0) / 7.0 / inv.ml_per_scoop) * inv.grams_per_scoop, 1) AS avg_daily_grams,
    CASE 
        WHEN COALESCE(l7.total_ml_7d, 0) = 0 THEN 999.0
        ELSE ROUND(inv.current_weight_grams / ((l7.total_ml_7d / 7.0 / inv.ml_per_scoop) * inv.grams_per_scoop), 1)
    END AS estimated_days_left,
    CASE 
        WHEN COALESCE(l7.total_ml_7d, 0) = 0 THEN 9999
        ELSE ROUND((inv.current_weight_grams / ((l7.total_ml_7d / 7.0 / inv.ml_per_scoop) * inv.grams_per_scoop)) * 24, 0)
    END AS estimated_hours_left
FROM public.formula_inventories inv
LEFT JOIN last_7_days l7 ON inv.family_id = l7.family_id;


-- ==============================================================================
-- 8. ENABLE REALTIME PUBLICATION SAFE CHECK (TIDAK ERROR JIKA SUDAH ADA)
-- ==============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'formula_inventories') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.formula_inventories;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'feeding_logs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.feeding_logs;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'baby_activities') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.baby_activities;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'baby_profiles') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.baby_profiles;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'growth_logs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.growth_logs;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'health_logs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.health_logs;
    END IF;
END $$;


-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.formula_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baby_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baby_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to formula_inventories" ON public.formula_inventories;
DROP POLICY IF EXISTS "Allow all access to feeding_logs" ON public.feeding_logs;
DROP POLICY IF EXISTS "Allow all access to baby_activities" ON public.baby_activities;
DROP POLICY IF EXISTS "Allow all access to baby_profiles" ON public.baby_profiles;
DROP POLICY IF EXISTS "Allow all access to growth_logs" ON public.growth_logs;
DROP POLICY IF EXISTS "Allow all access to health_logs" ON public.health_logs;

CREATE POLICY "Allow all access to formula_inventories" ON public.formula_inventories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to feeding_logs" ON public.feeding_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to baby_activities" ON public.baby_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to baby_profiles" ON public.baby_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to growth_logs" ON public.growth_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to health_logs" ON public.health_logs FOR ALL USING (true) WITH CHECK (true);

-- Seed Data Awal
INSERT INTO public.formula_inventories (family_id, brand_name, can_weight_grams, current_weight_grams, grams_per_scoop, ml_per_scoop)
VALUES ('family_123', 'Bebelac 1', 600.00, 600.00, 4.60, 30.00)
ON CONFLICT DO NOTHING;

INSERT INTO public.baby_profiles (family_id, baby_name, birth_date, weight_kg)
VALUES ('family_123', 'Si Kecil', '2026-06-01', 5.20)
ON CONFLICT (family_id) DO NOTHING;

INSERT INTO public.growth_logs (family_id, measured_date, age_months, weight_kg, height_cm, head_circ_cm, notes)
VALUES 
  ('family_123', '2026-06-01', 0, 3.20, 49.5, 34.5, 'Lahir di RS'),
  ('family_123', '2026-07-01', 1, 4.30, 54.0, 37.0, 'Posyandu Bulan 1'),
  ('family_123', '2026-08-01', 2, 5.20, 58.0, 39.0, 'Posyandu Bulan 2')
ON CONFLICT DO NOTHING;
