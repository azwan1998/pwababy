'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, FAMILY_ID } from '@/lib/supabase/client';
import { FormulaInventory, FormulaStockPrediction } from '@/lib/supabase/types';

const LOCAL_STORAGE_KEY = 'pwababy_formula_inventory';

export function useFormulaInventory() {
  const [stockData, setStockData] = useState<FormulaStockPrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper untuk menyimpan ke localStorage
  const saveToLocalStorage = (data: FormulaStockPrediction) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        console.warn('Failed to save inventory to localStorage:', err);
      }
    }
  };

  // Helper untuk membaca dari localStorage
  const loadFromLocalStorage = (): FormulaStockPrediction | null => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  };

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const savedLocal = loadFromLocalStorage();

      // Fetch data dari SQL View v_formula_stock_prediction
      const { data, error } = await supabase
        .from('v_formula_stock_prediction')
        .select('*')
        .eq('family_id', FAMILY_ID)
        .single();

      if (data) {
        const prediction = data as FormulaStockPrediction;
        setStockData(prediction);
        saveToLocalStorage(prediction);
      } else {
        // Direct query ke formula_inventories jika View belum tersedia
        const { data: invData } = await supabase
          .from('formula_inventories')
          .select('*')
          .eq('family_id', FAMILY_ID)
          .single();

        if (invData) {
          const currentGrams = Number(invData.current_weight_grams);
          const canGrams = Number(invData.can_weight_grams);
          const gramsPerScoop = Number(invData.grams_per_scoop) || 4.6;
          const mlPerScoop = Number(invData.ml_per_scoop) || 30;

          const avgDailyGrams = savedLocal?.avg_daily_grams || 77.4;
          const estDays = Number((currentGrams / avgDailyGrams).toFixed(1));

          const invPrediction: FormulaStockPrediction = {
            id: invData.id,
            inventory_id: invData.id,
            family_id: FAMILY_ID,
            brand_name: invData.brand_name || 'Bebelac 1',
            can_weight_grams: canGrams,
            current_weight_grams: currentGrams,
            grams_per_scoop: gramsPerScoop,
            ml_per_scoop: mlPerScoop,
            total_ml_7d: savedLocal?.total_ml_7d || 3780,
            total_feedings_7d: savedLocal?.total_feedings_7d || 42,
            avg_daily_ml: savedLocal?.avg_daily_ml || 540,
            avg_daily_grams: avgDailyGrams,
            estimated_days_left: estDays,
            estimated_hours_left: Math.round(estDays * 24),
            created_at: invData.created_at || new Date().toISOString(),
            updated_at: invData.updated_at || new Date().toISOString(),
          };

          setStockData(invPrediction);
          saveToLocalStorage(invPrediction);
        } else {
          // Fallback ke localStorage jika Supabase belum ada data
          const fallbackInv: FormulaStockPrediction = savedLocal || {
            id: 'local-inv-1',
            inventory_id: 'local-inv-1',
            family_id: FAMILY_ID,
            brand_name: 'Bebelac 1',
            can_weight_grams: 600,
            current_weight_grams: 600,
            grams_per_scoop: 4.6,
            ml_per_scoop: 30,
            total_ml_7d: 3780,
            total_feedings_7d: 42,
            avg_daily_ml: 540,
            avg_daily_grams: 77.4,
            estimated_days_left: 7.8,
            estimated_hours_left: 187,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          setStockData(fallbackInv);
          saveToLocalStorage(fallbackInv);
        }
      }
    } catch (err) {
      console.warn('Inventory fetch fallback to local:', err);
      const savedLocal = loadFromLocalStorage();
      if (savedLocal) setStockData(savedLocal);
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime subscription untuk update otomatis saat stok dipotong oleh trigger/feeding log
  useEffect(() => {
    fetchInventory();

    const invChannel = supabase
      .channel(`public:formula_inventories:${FAMILY_ID}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'formula_inventories', filter: `family_id=eq.${FAMILY_ID}` },
        () => fetchInventory()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feeding_logs', filter: `family_id=eq.${FAMILY_ID}` },
        () => fetchInventory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(invChannel);
    };
  }, [fetchInventory]);

  // Update pengaturan kaleng susu (setup gram per scoop, berat kaleng, dll)
  const updateInventory = async (payload: Partial<FormulaInventory>) => {
    const current = stockData || loadFromLocalStorage() || {
      id: 'local-inv-1',
      inventory_id: 'local-inv-1',
      family_id: FAMILY_ID,
      brand_name: 'Bebelac 1',
      can_weight_grams: 600,
      current_weight_grams: 600,
      grams_per_scoop: 4.6,
      ml_per_scoop: 30,
      total_ml_7d: 3780,
      total_feedings_7d: 42,
      avg_daily_ml: 540,
      avg_daily_grams: 77.4,
      estimated_days_left: 7.8,
      estimated_hours_left: 187,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = { ...current, ...payload };
    
    // Kalkulasi ulang estimasi sisa hari secara instan di UI
    const avgDailyGrams = current.avg_daily_grams > 0 ? current.avg_daily_grams : 77.4;
    const estDays = Number((updated.current_weight_grams / avgDailyGrams).toFixed(1));
    const estHours = Math.round(estDays * 24);

    const newStockData: FormulaStockPrediction = {
      ...updated,
      estimated_days_left: estDays,
      estimated_hours_left: estHours,
      updated_at: new Date().toISOString(),
    };

    // Update state & simpan ke localStorage secara instan!
    setStockData(newStockData);
    saveToLocalStorage(newStockData);

    try {
      const { error } = await supabase
        .from('formula_inventories')
        .upsert([
          {
            family_id: FAMILY_ID,
            brand_name: newStockData.brand_name,
            can_weight_grams: newStockData.can_weight_grams,
            current_weight_grams: newStockData.current_weight_grams,
            grams_per_scoop: newStockData.grams_per_scoop,
            ml_per_scoop: newStockData.ml_per_scoop,
            updated_at: new Date().toISOString(),
          },
        ]);
      if (error) throw error;
    } catch (err) {
      console.warn('Upsert inventory warning, saved locally:', err);
    }
  };

  // Fungsi potong stok langsung saat tombol buat susu diklik (Instan & Akurat)
  const deductStockLocally = (amount_ml: number) => {
    const current = stockData || loadFromLocalStorage();
    if (!current) return;

    const gramsPerScoop = current.grams_per_scoop || 4.6;
    const mlPerScoop = current.ml_per_scoop || 30;
    
    // Hitung gram yang terpakai
    const usedGrams = (amount_ml / mlPerScoop) * gramsPerScoop;
    const newCurrentGrams = Math.max(0, Number((current.current_weight_grams - usedGrams).toFixed(1)));

    const avgDailyGrams = current.avg_daily_grams > 0 ? current.avg_daily_grams : 77.4;
    const estDays = Number((newCurrentGrams / avgDailyGrams).toFixed(1));

    const newStockData: FormulaStockPrediction = {
      ...current,
      current_weight_grams: newCurrentGrams,
      estimated_days_left: estDays,
      estimated_hours_left: Math.round(estDays * 24),
    };

    setStockData(newStockData);
    saveToLocalStorage(newStockData);
  };

  return {
    stockData,
    loading,
    updateInventory,
    deductStockLocally,
    refresh: fetchInventory,
  };
}
