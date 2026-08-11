// POST /api/pickup/trigger
// Check accumulated B2B waste submissions against threshold.
// If ≥ threshold (default 50kg), create a batch and auto-assign to nearest processor.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { haversineDistance } from '@/lib/matching/haversine';

interface PickupTriggerRequest {
  user_id: string;
  threshold_kg?: number;
}

// Default threshold in kg — hardcoded per proposal assumption
// Documented: 50kg is the minimum viable batch for cost-effective pickup logistics
const DEFAULT_THRESHOLD_KG = 50;

export async function POST(request: NextRequest) {
  try {
    const body: PickupTriggerRequest = await request.json();

    if (!body.user_id || typeof body.user_id !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_USER_ID', message: 'Field "user_id" is required' },
        { status: 400 }
      );
    }

    const threshold = body.threshold_kg || DEFAULT_THRESHOLD_KG;
    const supabase = getSupabaseServerClient();

    // 1. Get pending B2B submissions for this user
    const { data: submissions, error: subError } = await supabase
      .from('waste_submissions')
      .select('id, estimated_weight_kg, waste_type')
      .eq('user_id', body.user_id)
      .eq('track', 'b2b')
      .eq('status', 'pending');

    if (subError) {
      console.error('[pickup] DB error fetching submissions:', subError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: 'Failed to fetch submissions', details: subError.message },
        { status: 500 }
      );
    }

    const totalPendingKg = (submissions || []).reduce(
      (sum, s) => sum + Number(s.estimated_weight_kg || 0),
      0
    );

    // 2. Check if threshold is met
    if (totalPendingKg < threshold) {
      return NextResponse.json({
        triggered: false,
        total_pending_kg: Math.round(totalPendingKg * 100) / 100,
        threshold_kg: threshold,
      });
    }

    // 3. Get user location for matching
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('location_lat, location_lng')
      .eq('id', body.user_id)
      .single();

    if (userError || !user) {
      console.error('[pickup] User not found:', userError);
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'User not found or missing location' },
        { status: 404 }
      );
    }

    // 4. Find the dominant waste type for matching
    const wasteTypeCounts: Record<string, number> = {};
    for (const s of submissions || []) {
      const wt = s.waste_type || 'campuran';
      wasteTypeCounts[wt] = (wasteTypeCounts[wt] || 0) + Number(s.estimated_weight_kg || 0);
    }
    const dominantWasteType = Object.entries(wasteTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'campuran';

    // 5. Find best processor match
    const { data: processors } = await supabase
      .from('processors')
      .select('*');

    let processorMatch = null;
    if (processors && processors.length > 0 && user.location_lat && user.location_lng) {
      const activeProcessors = processors.filter(
        (p) => Number(p.current_load_kg) < Number(p.capacity_kg)
      );

      if (activeProcessors.length > 0) {
        const scored = activeProcessors.map((p) => {
          const dist = haversineDistance(user.location_lat, user.location_lng, p.lat, p.lng);
          const capRatio = (Number(p.capacity_kg) - Number(p.current_load_kg)) / Number(p.capacity_kg);
          const typeMatch = (p.accepted_waste_types || []).includes(dominantWasteType) ? 1 : 0;
          const score = 0.5 * (1 / (dist + 1)) + 0.3 * capRatio + 0.2 * typeMatch;
          return { ...p, distance_km: dist, score };
        });
        scored.sort((a, b) => b.score - a.score);
        const best = scored[0];
        processorMatch = {
          processor_id: best.id,
          processor_name: best.name,
          distance_km: Math.round(best.distance_km * 10) / 10,
        };
      }
    }

    // 6. Create batch
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .insert({
        processor_id: processorMatch?.processor_id || processors?.[0]?.id,
        total_weight_kg: totalPendingKg,
        status: 'collecting',
      })
      .select()
      .single();

    if (batchError || !batch) {
      console.error('[pickup] Failed to create batch:', batchError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: 'Failed to create batch', details: batchError?.message },
        { status: 500 }
      );
    }

    // 7. Link submissions to batch & update status
    const submissionIds = (submissions || []).map((s) => s.id);

    if (submissionIds.length > 0) {
      // Insert junction rows
      const junctionRows = submissionIds.map((sid) => ({
        batch_id: batch.id,
        submission_id: sid,
      }));
      await supabase.from('batch_submissions').insert(junctionRows);

      // Update submission statuses
      await supabase
        .from('waste_submissions')
        .update({ status: 'pickup_scheduled' })
        .in('id', submissionIds);
    }

    return NextResponse.json({
      triggered: true,
      total_pending_kg: Math.round(totalPendingKg * 100) / 100,
      threshold_kg: threshold,
      pickup_order: {
        id: batch.id,
        submissions: submissionIds,
        estimated_total_kg: Math.round(totalPendingKg * 100) / 100,
        processor_match: processorMatch,
        created_at: batch.created_at,
      },
    });
  } catch (error) {
    console.error('[pickup] Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
