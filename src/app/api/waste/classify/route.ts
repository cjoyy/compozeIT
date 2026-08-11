// POST /api/waste/classify
// Receives a food waste photo, classifies it using AI, and saves to database.
// For 'sell' track: adds estimated_value and nearby collection points.
// For 'b2b' track: auto-triggers pickup check after saving.

import { NextRequest, NextResponse } from 'next/server';
import { classifyWasteWithFallback } from '@/lib/ai/provider';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { haversineDistance } from '@/lib/matching/haversine';

interface ClassifyRequestBody {
  image: string;     // base64-encoded image
  user_id: string;   // UUID
  track: 'sell' | 'diy' | 'b2b';
  lat?: number;      // user location for sell track matching
  lng?: number;
}

// Estimated value per kg of food waste for sell track
// Assumption: Rp 150/kg based on proposal market analysis
// Documented for judges Q&A
const SELL_PRICE_PER_KG = 150;

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

    const validTracks = ['sell', 'diy', 'b2b'];
    if (!body.track || !validTracks.includes(body.track)) {
      return NextResponse.json(
        { error: 'INVALID_TRACK', message: `Field "track" must be one of: ${validTracks.join(', ')}` },
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

    console.log(`[classify] Success via ${providerUsed}:`, classificationResult);

    // 3. Set status based on track
    const status = body.track === 'diy' ? 'completed' : 'pending';

    // 4. Save to Supabase
    const supabase = getSupabaseServerClient();

    const { data, error: dbError } = await supabase
      .from('waste_submissions')
      .insert({
        user_id: body.user_id,
        waste_type: classificationResult.waste_type,
        estimated_weight_kg: classificationResult.estimated_weight_kg,
        is_contaminated: classificationResult.is_contaminated,
        contaminant_type: classificationResult.contaminant_type,
        confidence: classificationResult.confidence,
        track: body.track,
        status,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[classify] Database error:', dbError);
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: 'Failed to save classification result',
          details: dbError.message,
        },
        { status: 500 }
      );
    }

    // 5. Build response based on track
    const response: Record<string, unknown> = {
      id: data.id,
      waste_type: data.waste_type,
      estimated_weight_kg: data.estimated_weight_kg,
      is_contaminated: data.is_contaminated,
      contaminant_type: data.contaminant_type,
      confidence: data.confidence,
      track: data.track,
      status: data.status,
      created_at: data.created_at,
      _meta: {
        ai_provider: providerUsed,
      },
    };

    // 5a. Sell track: add estimated value and nearby collection points
    if (body.track === 'sell') {
      const weight = Number(classificationResult.estimated_weight_kg) || 0;
      const estVal = Math.round(weight * SELL_PRICE_PER_KG);
      response.estimated_value = estVal;
      response.estimated_value_formatted = `Rp ${estVal.toLocaleString('id-ID')}`;

      // Find nearby collection points if user location is provided
      if (body.lat && body.lng) {
        const { data: processors } = await supabase.from('processors').select('*');
        if (processors && processors.length > 0) {
          const nearby = processors
            .filter((p) => Number(p.current_load_kg) < Number(p.capacity_kg))
            .map((p) => ({
              processor_id: p.id,
              name: p.name,
              type: p.type,
              distance_km: Math.round(haversineDistance(body.lat!, body.lng!, p.lat, p.lng) * 10) / 10,
              accepts_waste_type: (p.accepted_waste_types || []).includes(classificationResult.waste_type),
            }))
            .sort((a, b) => a.distance_km - b.distance_km)
            .slice(0, 3);

          response.nearby_collection_points = nearby;
        }
      }
    }

    // 5b. B2B track: auto-trigger pickup check
    if (body.track === 'b2b') {
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
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[classify] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
