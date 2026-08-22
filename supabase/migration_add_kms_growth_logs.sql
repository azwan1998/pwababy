-- ==============================================================================
-- MIGRATION: ADD KMS DIGITAL (growth_logs)
-- Jalankan query ini di Supabase SQL Editor untuk menambahkan fitur KMS Digital
-- aman dijalankan pada database yang sudah aktif (tidak menghapus data lama).
-- ==============================================================================

-- 1. TABEL: growth_logs (Riwayat Berat, Panjang, Lingkar Kepala)
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

-- Index pencarian cepat berdasarkan family_id & tanggal timbang
CREATE INDEX IF NOT EXISTS idx_growth_logs_family ON public.growth_logs(family_id, measured_date);


-- 2. AKTIFKAN REALTIME PUBLICATION UNTUK growth_logs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'growth_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.growth_logs;
    END IF;
END $$;


-- 3. AKTIFKAN ROW LEVEL SECURITY (RLS) & POLICY
ALTER TABLE public.growth_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to growth_logs" ON public.growth_logs;
CREATE POLICY "Allow all access to growth_logs" ON public.growth_logs FOR ALL USING (true) WITH CHECK (true);


-- 4. (OPSIONAL) DATA AWAL CONTOH TIMBANGAN
-- Uncomment baris di bawah jika ingin memasukkan data awal contoh:
/*
INSERT INTO public.growth_logs (family_id, measured_date, age_months, weight_kg, height_cm, head_circ_cm, notes)
VALUES 
  ('family_123', '2026-06-01', 0, 3.20, 49.5, 34.5, 'Lahir di RS'),
  ('family_123', '2026-07-01', 1, 4.30, 54.0, 37.0, 'Posyandu Bulan 1'),
  ('family_123', '2026-08-01', 2, 5.20, 58.0, 39.0, 'Posyandu Bulan 2')
ON CONFLICT DO NOTHING;
*/
