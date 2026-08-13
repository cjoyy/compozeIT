// GET /api/marketplace
// GET: List marketplace listings with filters, sort, pagination. Joins with processors.
// Marketplace is read-only in the B2B-only demo scope.

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
      { error: 'INTERNAL_ERROR', message: 'Katalog hasil olahan belum dapat dimuat', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
