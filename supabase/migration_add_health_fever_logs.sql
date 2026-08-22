-- ==============================================================================
-- MIGRATION: ADD HEALTH & FEVER LOGS (health_logs)
-- Jalankan query ini di Supabase SQL Editor untuk menambahkan fitur Demam & Obat
-- 100% aman dijalankan pada database yang sudah aktif (tidak menghapus data lama).
-- ==============================================================================

-- 1. TABEL: health_logs (Riwayat Suhu Tubuh & Pemberian Obat)
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

-- Index pencarian cepat berdasarkan family_id & recorded_at
CREATE INDEX IF NOT EXISTS idx_health_logs_family_time ON public.health_logs(family_id, recorded_at DESC);


-- 2. AKTIFKAN REALTIME PUBLICATION UNTUK health_logs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'health_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.health_logs;
    END IF;
END $$;


-- 3. AKTIFKAN ROW LEVEL SECURITY (RLS) & POLICY
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to health_logs" ON public.health_logs;
CREATE POLICY "Allow all access to health_logs" ON public.health_logs FOR ALL USING (true) WITH CHECK (true);
