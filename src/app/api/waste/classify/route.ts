// POST /api/waste/classify
// Receives a food waste photo, classifies it using AI, and saves to database.
// Exclusively handles B2B submissions and returns pickup-threshold status.

import { NextRequest, NextResponse } from 'next/server';
import { classifyWasteWithFallback } from '@/lib/ai/provider';
import { calculateCashbackAmount } from '@/lib/cashback';
import { getSupabaseServerClient } from '@/lib/db/supabase';

interface ClassifyRequestBody {
  image: string;     // base64-encoded image
  user_id: string;   // UUID
  track: 'b2b';
  estimated_weight_kg?: number;
}

interface WasteSubmissionWithCashback {
  id: string;
  waste_type: string;
  estimated_weight_kg: number | string;
  cashback_amount: number | string;
  is_contaminated: boolean;
  contaminant_type: string | null;
  is_food_waste: boolean;
  confidence: number | string;
  track: string;
  status: string;
  created_at: string;
  user_cashback_balance: number | string;
}

// B2B pickup threshold in kg
const B2B_THRESHOLD_KG = 50;

export async function POST(request: NextRequest) {
  try {
    // 1. Parse & validate request
    const body: ClassifyRequestBody = await request.json();

    if (!body.image || typeof body.image !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_IMAGE', message: 'Field "image" is required and must be a base64 string' },
        { status: 400 }
      );
    }

    if (!body.user_id || typeof body.user_id !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_USER_ID', message: 'Field "user_id" is required' },
        { status: 400 }
      );
    }

    if (body.track !== 'b2b') {
      return NextResponse.json(
        { error: 'INVALID_TRACK', message: 'Field "track" must be "b2b"' },
        { status: 400 }
      );
    }

    if (body.estimated_weight_kg !== undefined && (!Number.isFinite(body.estimated_weight_kg) || body.estimated_weight_kg <= 0 || body.estimated_weight_kg > 1000)) {
      return NextResponse.json(
        { error: 'INVALID_WEIGHT', message: 'Berat manual harus di antara 0,1 dan 1.000 kg' },
        { status: 400 }
      );
    }

    // Check image size (max ~10MB base64 ≈ 13.3MB string)
    if (body.image.length > 13_300_000) {
      return NextResponse.json(
        { error: 'IMAGE_TOO_LARGE', message: 'Image must be less than 10MB' },
        { status: 400 }
      );
    }

    // 2. Classify with AI (with retry on parse failure)
    let classificationResult;
    let providerUsed: string;

    try {
      const { result, provider } = await classifyWasteWithFallback(body.image);
      classificationResult = result;
      providerUsed = provider;
    } catch (firstError) {
      // Retry once if AI response was unparseable
      console.warn('[classify] First attempt failed, retrying...', firstError);
      try {
        const { result, provider } = await classifyWasteWithFallback(body.image);
        classificationResult = result;
        providerUsed = provider;
      } catch (retryError) {
        console.error('[classify] Retry also failed:', retryError);
        return NextResponse.json(
          {
            error: 'UNPARSEABLE_AI_RESPONSE',
            message: 'AI model returned invalid JSON after retry',
            details: retryError instanceof Error ? retryError.message : String(retryError),
          },
          { status: 422 }
        );
      }
    }

    const status = 'pending';
    const estimatedWeightKg = body.estimated_weight_kg ?? Number(classificationResult.estimated_weight_kg || 0);
    const cashbackAmount = calculateCashbackAmount(estimatedWeightKg);

    // 4. Save to Supabase
    const supabase = getSupabaseServerClient();

    const { data: rpcData, error: dbError } = await supabase
      .rpc('create_b2b_waste_submission_with_cashback', {
        p_user_id: body.user_id,
        p_waste_type: classificationResult.waste_type,
        p_estimated_weight_kg: estimatedWeightKg,
        p_cashback_amount: cashbackAmount,
        p_is_contaminated: classificationResult.is_contaminated,
        p_contaminant_type: classificationResult.contaminant_type,
        p_confidence: classificationResult.confidence,
        p_track: body.track,
        p_status: status,
      })
      .single();

    if (dbError || !rpcData) {
      console.error('[classify] Database error:', dbError);
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to save classification result',
          details: dbError?.message,
        },
        { status: 500 }
      );
    }

    const data = rpcData as WasteSubmissionWithCashback;

    // 5. Build B2B response
    const response: Record<string, unknown> = {
      id: data.id,
      waste_type: data.waste_type,
      food_detail: classificationResult.food_detail,
      estimated_weight_kg: data.estimated_weight_kg,
      is_contaminated: data.is_contaminated,
      contaminant_type: data.contaminant_type,
      is_food_waste: classificationResult.is_food_waste,
      confidence: data.confidence,
      track: data.track,
      status: data.status,
      cashback_amount: Number(data.cashback_amount || cashbackAmount),
      user_cashback_balance: Number(data.user_cashback_balance || 0),
      created_at: data.created_at,
      _meta: {
        ai_provider: providerUsed,
      },
    };

    try {
      // Check pending submissions total
      const { data: pendingSubs } = await supabase
        .from('waste_submissions')
        .select('estimated_weight_kg')
        .eq('user_id', body.user_id)
        .eq('track', 'b2b')
        .eq('status', 'pending');

      const totalPendingKg = (pendingSubs || []).reduce(
        (sum, s) => sum + Number(s.estimated_weight_kg || 0),
        0
      );

      response.b2b_status = {
        total_pending_kg: Math.round(totalPendingKg * 100) / 100,
        threshold_kg: B2B_THRESHOLD_KG,
        threshold_reached: totalPendingKg >= B2B_THRESHOLD_KG,
      };
    } catch (triggerErr) {
      console.warn('[classify] Auto-trigger check failed (non-blocking):', triggerErr);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[classify] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
            message: 'Foto belum dapat dianalisis saat ini',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
