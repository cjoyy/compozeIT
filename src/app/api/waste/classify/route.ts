// POST /api/waste/classify
// Receives a food waste photo, classifies it using AI, and saves to database.

import { NextRequest, NextResponse } from 'next/server';
import { classifyWasteWithFallback } from '@/lib/ai/provider';
import { getSupabaseServerClient } from '@/lib/db/supabase';

interface ClassifyRequestBody {
  image: string;     // base64-encoded image
  user_id: string;   // UUID
  track: 'sell' | 'diy' | 'b2b';
}

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

    // 3. Save to Supabase
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
        status: 'pending',
        // photo_url would be set after uploading to Supabase Storage (future enhancement)
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

    // 4. Return response
    return NextResponse.json({
      id: data.id,
      waste_type: data.waste_type,
      estimated_weight_kg: data.estimated_weight_kg,
      is_contaminated: data.is_contaminated,
      contaminant_type: data.contaminant_type,
      confidence: data.confidence,
      track: data.track,
      created_at: data.created_at,
      _meta: {
        ai_provider: providerUsed,
      },
    });
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
