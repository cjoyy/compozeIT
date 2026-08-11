// GET/POST /api/marketplace
// GET: List marketplace listings with filters, sort, pagination. Joins with processors.
// POST: Create a new marketplace listing.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const product_type = searchParams.get('product_type');
    const min_stock_kg = searchParams.get('min_stock_kg');
    const sort_by = searchParams.get('sort_by') || 'created_at';
    const sort_order = searchParams.get('sort_order') || 'desc';
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
    const offset = Number(searchParams.get('offset')) || 0;

    const supabase = getSupabaseServerClient();

    // Build query with join to processors
    let query = supabase
      .from('marketplace_listings')
      .select(`
        id,
        processor_id,
        product_type,
        price_per_kg,
        stock_kg,
        npk_content,
        description,
        created_at,
        processors!inner (
          name,
          type,
          lat,
          lng
        )
      `, { count: 'exact' });

    // Apply filters
    if (product_type && ['compost', 'bsf'].includes(product_type)) {
      query = query.eq('product_type', product_type);
    }

    if (min_stock_kg) {
      query = query.gte('stock_kg', Number(min_stock_kg));
    }

    // Apply sorting
    const validSortFields = ['price_per_kg', 'stock_kg', 'created_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    query = query.order(sortField, { ascending: sort_order === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[marketplace] GET DB error:', error);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: 'Failed to fetch listings', details: error.message },
        { status: 500 }
      );
    }

    // Transform data to flatten processor info
    const listings = (data || []).map((item) => {
      const processor = item.processors as unknown as { name: string; type: string; lat: number; lng: number };
      return {
        id: item.id,
        processor_id: item.processor_id,
        processor_name: processor?.name || 'Unknown',
        processor_type: processor?.type || 'unknown',
        product_type: item.product_type,
        price_per_kg: Number(item.price_per_kg),
        stock_kg: Number(item.stock_kg),
        npk_content: item.npk_content,
        description: item.description,
        created_at: item.created_at,
      };
    });

    return NextResponse.json({
      listings,
      total: count || listings.length,
    });
  } catch (error) {
    console.error('[marketplace] GET Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.processor_id || typeof body.processor_id !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_PROCESSOR_ID', message: 'Field "processor_id" is required' },
        { status: 400 }
      );
    }

    if (!body.product_type || !['compost', 'bsf'].includes(body.product_type)) {
      return NextResponse.json(
        { error: 'INVALID_PRODUCT_TYPE', message: 'Field "product_type" must be "compost" or "bsf"' },
        { status: 400 }
      );
    }

    if (typeof body.price_per_kg !== 'number' || body.price_per_kg <= 0) {
      return NextResponse.json(
        { error: 'INVALID_PRICE', message: 'Field "price_per_kg" must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof body.stock_kg !== 'number' || body.stock_kg <= 0) {
      return NextResponse.json(
        { error: 'INVALID_STOCK', message: 'Field "stock_kg" must be a positive number' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Verify processor exists
    const { data: processor, error: procError } = await supabase
      .from('processors')
      .select('id')
      .eq('id', body.processor_id)
      .single();

    if (procError || !processor) {
      return NextResponse.json(
        { error: 'PROCESSOR_NOT_FOUND', message: 'Processor not found' },
        { status: 404 }
      );
    }

    // Create listing
    const { data, error: insertError } = await supabase
      .from('marketplace_listings')
      .insert({
        processor_id: body.processor_id,
        product_type: body.product_type,
        price_per_kg: body.price_per_kg,
        stock_kg: body.stock_kg,
        npk_content: body.npk_content || null,
        description: body.description || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[marketplace] POST DB error:', insertError);
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: 'Failed to create listing', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[marketplace] POST Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
