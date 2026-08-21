'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, FAMILY_ID } from '@/lib/supabase/client';
import { FormulaInventory, FormulaStockPrediction } from '@/lib/supabase/types';

export function useFormulaInventory() {
  const [stockData, setStockData] = useState<FormulaStockPrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch murni dari Supabase DB View v_formula_stock_prediction / formula_inventories
  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('v_formula_stock_prediction')
        .select('*')
        .eq('family_id', FAMILY_ID)
        .limit(1)
        .maybeSingle();

      if (data) {
        setStockData(data as FormulaStockPrediction);
      } else {
        const { data: invData } = await supabase
          .from('formula_inventories')
          .select('*')
          .eq('family_id', FAMILY_ID)
          .limit(1)
          .maybeSingle();

        if (invData) {
          const currentGrams = Number(invData.current_weight_grams);
          const canGrams = Number(invData.can_weight_grams);
          const gramsPerScoop = Number(invData.grams_per_scoop) || 4.6;
          const mlPerScoop = Number(invData.ml_per_scoop) || 30;

          const invPrediction: FormulaStockPrediction = {
            id: invData.id,
            inventory_id: invData.id,
            family_id: FAMILY_ID,
            brand_name: invData.brand_name || 'Bebelac 1',
            can_weight_grams: canGrams,
            current_weight_grams: currentGrams,
            grams_per_scoop: gramsPerScoop,
            ml_per_scoop: mlPerScoop,
            total_ml_7d: 0,
            total_feedings_7d: 0,
            avg_daily_ml: 0,
            avg_daily_grams: 0,
            estimated_days_left: 999,
            estimated_hours_left: 9999,
            created_at: invData.created_at || new Date().toISOString(),
            updated_at: invData.updated_at || new Date().toISOString(),
          };
          setStockData(invPrediction);
        } else {
          // Jika DB benar-benar kosong untuk family_id, daftarkan 1 baris default Bebelac di DB
          const initInv = {
            family_id: FAMILY_ID,
            brand_name: 'Bebelac 1',
            can_weight_grams: 600,
            current_weight_grams: 600,
            grams_per_scoop: 4.6,
            ml_per_scoop: 30,
          };
          const { data: inserted } = await supabase
            .from('formula_inventories')
            .insert([initInv])
            .select()
            .maybeSingle();

          if (inserted) {
            setStockData({
              ...inserted,
              inventory_id: inserted.id,
              total_ml_7d: 0,
              total_feedings_7d: 0,
              avg_daily_ml: 0,
              avg_daily_grams: 0,
              estimated_days_left: 999,
              estimated_hours_left: 9999,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Inventory fetch error from Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime subscription dengan channel ID unik untuk mencegah callback error
  useEffect(() => {
    fetchInventory();

    const channelName = `realtime:formula_inventories:${FAMILY_ID}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'formula_inventories', filter: `family_id=eq.${FAMILY_ID}` },
        () => fetchInventory()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feeding_logs', filter: `family_id=eq.${FAMILY_ID}` },
        () => fetchInventory()
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInventory]);

  // Update pengaturan kaleng susu murni ke Supabase DB (HANYA 1 BARIS PER FAMILY)
  const updateInventory = async (payload: Partial<FormulaInventory>) => {
    if (!stockData) return;

    const updated = { ...stockData, ...payload };
    const avgDailyGrams = stockData.avg_daily_grams > 0 ? stockData.avg_daily_grams : 77.4;
    const estDays = Number((updated.current_weight_grams / avgDailyGrams).toFixed(1));

    setStockData({
      ...updated,
      estimated_days_left: estDays,
      estimated_hours_left: Math.round(estDays * 24),
    });

    try {
      const { data: existing } = await supabase
        .from('formula_inventories')
        .select('id')
        .eq('family_id', FAMILY_ID)
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('formula_inventories')
          .update({
            brand_name: updated.brand_name,
            can_weight_grams: updated.can_weight_grams,
            current_weight_grams: updated.current_weight_grams,
            grams_per_scoop: updated.grams_per_scoop,
            ml_per_scoop: updated.ml_per_scoop,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('formula_inventories').insert([
          {
            family_id: FAMILY_ID,
            brand_name: updated.brand_name,
            can_weight_grams: updated.can_weight_grams,
            current_weight_grams: updated.current_weight_grams,
            grams_per_scoop: updated.grams_per_scoop,
            ml_per_scoop: updated.ml_per_scoop,
          },
        ]);
      }
    } catch (err) {
      console.warn('Update inventory error:', err);
    }
  };

  // Potong stok instan
  const deductStockLocally = (amount_ml: number) => {
    if (!stockData) return;
    const gramsPerScoop = stockData.grams_per_scoop || 4.6;
    const mlPerScoop = stockData.ml_per_scoop || 30;
    
    const usedGrams = (amount_ml / mlPerScoop) * gramsPerScoop;
    const newCurrentGrams = Math.max(0, Number((stockData.current_weight_grams - usedGrams).toFixed(1)));
    const avgDailyGrams = stockData.avg_daily_grams > 0 ? stockData.avg_daily_grams : 77.4;
    const estDays = Number((newCurrentGrams / avgDailyGrams).toFixed(1));

    setStockData({
      ...stockData,
      current_weight_grams: newCurrentGrams,
      estimated_days_left: estDays,
      estimated_hours_left: Math.round(estDays * 24),
    });
  };

  return {
    stockData,
    loading,
    updateInventory,
    deductStockLocally,
    refresh: fetchInventory,
  };
}
