// GET /api/waste/submissions
// Fetches waste submissions for a user, optionally filtered by track.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const track = searchParams.get('track');

    if (!user_id) {
      return NextResponse.json(
        { error: 'INVALID_USER_ID', message: 'Query param "user_id" is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('waste_submissions')
      .select('id, waste_type, estimated_weight_kg, is_contaminated, contaminant_type, confidence, track, status, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (track) {
      query = query.eq('track', track);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[submissions] DB error:', error);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ submissions: data || [] });
  } catch (error) {
    console.error('[submissions] Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
