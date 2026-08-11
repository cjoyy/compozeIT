// GET /api/impact
// Aggregate impact statistics across all users and processors.

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';

// Assumptions & conversion factors:
// CO2 avoided: ~2.5 kg CO2e per kg food waste diverted from landfill
// Conventional cost saved: Rp 500 per kg
const CO2_PER_KG_DIVERTED = 2.5;
const CONVENTIONAL_COST_PER_KG = 500;

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // 1. Total waste submissions weight
    const { data: wasteData, error: wasteError } = await supabase
      .from('waste_submissions')
      .select('estimated_weight_kg, track');

    if (wasteError) {
      console.error('[impact] DB error waste_submissions:', wasteError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: wasteError.message },
        { status: 500 }
      );
    }

    const totalWasteKg = (wasteData || []).reduce(
      (sum, s) => sum + Number(s.estimated_weight_kg || 0),
      0
    );

    const b2bWasteKg = (wasteData || [])
      .filter((s) => s.track === 'b2b')
      .reduce((sum, s) => sum + Number(s.estimated_weight_kg || 0), 0);

    // 2. Processors stats
    const { data: processorsData, error: procError } = await supabase
      .from('processors')
      .select('capacity_kg, current_load_kg');

    if (procError) {
      console.error('[impact] DB error processors:', procError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: procError.message },
        { status: 500 }
      );
    }

    const activeProcessorsCount = processorsData?.length || 0;
    const totalCapacityKg = (processorsData || []).reduce(
      (sum, p) => sum + Number(p.capacity_kg || 0),
      0
    );
    const totalCurrentLoadKg = (processorsData || []).reduce(
      (sum, p) => sum + Number(p.current_load_kg || 0),
      0
    );

    const co2AvoidedKg = totalWasteKg * CO2_PER_KG_DIVERTED;
    const b2bCostSavedIdr = b2bWasteKg * CONVENTIONAL_COST_PER_KG;

    return NextResponse.json({
      total_waste_diverted_kg: Math.round(totalWasteKg * 10) / 10,
      co2_avoided_kg: Math.round(co2AvoidedKg * 10) / 10,
      b2b_cost_saved_idr: Math.round(b2bCostSavedIdr),
      active_processors_count: activeProcessorsCount,
      total_capacity_kg: Math.round(totalCapacityKg),
      total_current_load_kg: Math.round(totalCurrentLoadKg * 10) / 10,
      capacity_utilized_percent:
        totalCapacityKg > 0
          ? Math.round((totalCurrentLoadKg / totalCapacityKg) * 100)
          : 0,
    });
  } catch (error) {
    console.error('[impact] Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
