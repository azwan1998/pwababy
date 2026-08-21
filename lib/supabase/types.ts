export type FeedingStatus = 'dibuat' | 'mulai_minum' | 'selesai' | 'dibuang';
export type ActivityType = 'tummy_time' | 'diaper' | 'sleep';

export interface FormulaInventory {
  id: string;
  family_id: string;
  brand_name: string;
  can_weight_grams: number;
  current_weight_grams: number;
  grams_per_scoop: number;
  ml_per_scoop: number;
  created_at: string;
  updated_at: string;
}

export interface FeedingLog {
  id: string;
  family_id: string;
  amount_ml: number;
  status: FeedingStatus;
  created_at: string;
  drinking_started_at?: string | null;
  finished_at?: string | null;
  notes?: string | null;
}

export interface BabyActivity {
  id: string;
  family_id: string;
  activity_type: ActivityType;
  duration_minutes: number;
  started_at: string;
  finished_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface BabyProfile {
  id?: string;
  family_id: string;
  baby_name: string;
  birth_date: string; // ISO date format YYYY-MM-DD
  weight_kg: number;
}


export interface FormulaStockPrediction extends FormulaInventory {
  inventory_id: string;
  total_ml_7d: number;
  total_feedings_7d: number;
  avg_daily_ml: number;
  avg_daily_grams: number;
  estimated_days_left: number;
  estimated_hours_left: number;
}

