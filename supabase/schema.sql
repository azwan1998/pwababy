-- ==============================================================================
-- PWA BABY MILK & ACTIVITY TRACKER - SUPABASE DDL & REALTIME SCHEMA
-- ==============================================================================

-- 1. TABEL: formula_inventories (Manajemen Kaleng Susu)
CREATE TABLE IF NOT EXISTS public.formula_inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id TEXT NOT NULL DEFAULT 'family_123',
    brand_name TEXT NOT NULL DEFAULT 'Susu Formula',
    can_weight_grams NUMERIC(10, 2) NOT NULL DEFAULT 800.00,
    current_weight_grams NUMERIC(10, 2) NOT NULL DEFAULT 800.00,
    grams_per_scoop NUMERIC(5, 2) NOT NULL DEFAULT 4.30,
    ml_per_scoop NUMERIC(5, 2) NOT NULL DEFAULT 30.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk mempercepat query berdasarkan family_id
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
CREATE INDEX IF NOT EXISTS idx_feeding_logs_created_at ON public.feeding_logs(created_at DESC);

-- 3. TABEL: baby_activities (Log Aktivitas Tummy Time, dll.)
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

-- ==============================================================================
-- 4. FUNCTION & TRIGGER: DEDUCT FORMULA STOCK AUTOMATICALLY
-- ==============================================================================
CREATE OR REPLACE FUNCTION deduct_formula_on_feeding()
RETURNS TRIGGER AS $$
DECLARE
    v_grams_per_scoop NUMERIC;
    v_ml_per_scoop NUMERIC;
    v_used_grams NUMERIC;
BEGIN
    -- Ambil parameter takaran dari inventory keluarga
    SELECT grams_per_scoop, ml_per_scoop 
    INTO v_grams_per_scoop, v_ml_per_scoop
    FROM public.formula_inventories
    WHERE family_id = NEW.family_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Jika data inventory belum ada, gunakan standar default (4.3g per 30ml)
    IF v_grams_per_scoop IS NULL THEN
        v_grams_per_scoop := 4.3;
        v_ml_per_scoop := 30.0;
    END IF;

    -- Hitung estimasi gram yang terpakai
    v_used_grams := (NEW.amount_ml / v_ml_per_scoop) * v_grams_per_scoop;

    -- Potong stok di formula_inventories
    UPDATE public.formula_inventories
    SET current_weight_grams = GREATEST(0, current_weight_grams - v_used_grams),
        updated_at = NOW()
    WHERE family_id = NEW.family_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Pasang trigger saat baris feeding baru disisipkan
DROP TRIGGER IF EXISTS trg_deduct_formula ON public.feeding_logs;
CREATE TRIGGER trg_deduct_formula
AFTER INSERT ON public.feeding_logs
FOR EACH ROW
WHEN (NEW.status = 'dibuat')
EXECUTE FUNCTION deduct_formula_on_feeding();


-- ==============================================================================
-- 5. VIEW: ESTIMATED DAYS LEFT & CONSUMPTION STATS (7 HARI TERAKHIR)
-- ==============================================================================
CREATE OR REPLACE VIEW public.v_formula_stock_prediction AS
WITH last_7_days AS (
    SELECT 
        family_id,
        COALESCE(SUM(amount_ml), 0) AS total_ml_7d,
        COUNT(id) AS total_feedings_7d
    FROM public.feeding_logs
    WHERE created_at >= (NOW() - INTERVAL '7 days')
      AND status != 'dibuang'
    GROUP BY family_id
),
inventory_info AS (
    SELECT 
        id,
        family_id,
        brand_name,
        can_weight_grams,
        current_weight_grams,
        grams_per_scoop,
        ml_per_scoop,
        updated_at
    FROM public.formula_inventories
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
    -- Hitung rata-rata konsumsi ml per hari (7 hari)
    ROUND(COALESCE(l7.total_ml_7d, 0) / 7.0, 1) AS avg_daily_ml,
    -- Hitung rata-rata konsumsi gram per hari (7 hari)
    ROUND((COALESCE(l7.total_ml_7d, 0) / 7.0 / inv.ml_per_scoop) * inv.grams_per_scoop, 1) AS avg_daily_grams,
    -- Estimasi sisa hari sebelum stok habis (Current Grams / Avg Daily Grams)
    CASE 
        WHEN COALESCE(l7.total_ml_7d, 0) = 0 THEN 999.0
        ELSE ROUND(inv.current_weight_grams / ((l7.total_ml_7d / 7.0 / inv.ml_per_scoop) * inv.grams_per_scoop), 1)
    END AS estimated_days_left,
    -- Estimasi jam tersisa
    CASE 
        WHEN COALESCE(l7.total_ml_7d, 0) = 0 THEN 9999
        ELSE ROUND((inv.current_weight_grams / ((l7.total_ml_7d / 7.0 / inv.ml_per_scoop) * inv.grams_per_scoop)) * 24, 0)
    END AS estimated_hours_left
FROM inventory_info inv
LEFT JOIN last_7_days l7 ON inv.family_id = l7.family_id;


-- ==============================================================================
-- 6. ENABLE REALTIME PUBLICATION FOR SUPABASE REALTIME LISTENERS
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.formula_inventories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feeding_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.baby_activities;


-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES FOR 1 family_id
-- ==============================================================================
ALTER TABLE public.formula_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baby_activities ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Bebas/Sederhana Berdasarkan family_id (Dapat diakses oleh Anon & Authenticated Client)
CREATE POLICY "Allow all access to family formula_inventories" 
ON public.formula_inventories FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to family feeding_logs" 
ON public.feeding_logs FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to family baby_activities" 
ON public.baby_activities FOR ALL 
USING (true) WITH CHECK (true);

-- Seed Data Awal (Opsional - Default Bebelac 1 600g)
INSERT INTO public.formula_inventories (family_id, brand_name, can_weight_grams, current_weight_grams, grams_per_scoop, ml_per_scoop)
VALUES ('family_123', 'Bebelac 1', 600.00, 600.00, 4.60, 30.00)
ON CONFLICT DO NOTHING;

