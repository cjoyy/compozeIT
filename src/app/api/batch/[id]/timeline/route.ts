// GET/PATCH /api/batch/[id]/timeline
// Returns traceability history and allows manual status updates for demo flow.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';

type BatchStatus = 'submitted' | 'picked_up' | 'processing' | 'completed' | 'sold';

interface TimelineContext {
  params: Promise<{ id: string }>;
}

interface TimelinePatchRequest {
  status: BatchStatus;
  note?: string;
}

interface TimelineUpdateResult {
  batch_id: string;
  batch_status: BatchStatus;
  batch_total_weight_kg: number | string;
  batch_created_at: string;
  batch_completed_at: string | null;
  event_id: string;
  event_status: BatchStatus;
  event_note: string | null;
  event_created_at: string;
}

const VALID_BATCH_STATUSES: BatchStatus[] = [
  'submitted',
  'picked_up',
  'processing',
  'completed',
  'sold',
];

export async function GET(_request: NextRequest, context: TimelineContext) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseServerClient();

    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('id, status, total_weight_kg, created_at, completed_at, processors(name)')
      .eq('id', id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { success: false, error: 'BATCH_NOT_FOUND', message: 'Batch not found' },
        { status: 404 }
      );
    }

    const { data: events, error: eventsError } = await supabase
      .from('batch_status_events')
      .select('id, status, note, created_at')
      .eq('batch_id', id)
      .order('created_at', { ascending: true });

    if (eventsError) {
      console.error('[timeline] Failed to fetch events:', eventsError);
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR', message: 'Failed to fetch timeline events', details: eventsError.message },
        { status: 500 }
      );
    }

    const processor = batch.processors as unknown as { name: string } | null;

    return NextResponse.json({
      success: true,
      data: {
        batch: {
          id: batch.id,
          status: batch.status,
          total_weight_kg: Number(batch.total_weight_kg || 0),
          processor_name: processor?.name ?? null,
          created_at: batch.created_at,
          completed_at: batch.completed_at,
        },
        timeline: events || [],
      },
    });
  } catch (error) {
    console.error('[timeline] Unexpected GET error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Riwayat penjemputan belum dapat dimuat', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: TimelineContext) {
  try {
    const { id } = await context.params;
    const body: TimelinePatchRequest = await request.json();

    if (!VALID_BATCH_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_STATUS', message: 'Field "status" must be a valid batch status' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const completedAt =
      body.status === 'completed' || body.status === 'sold' ? new Date().toISOString() : null;

    const { data: rpcData, error: updateError } = await supabase
      .rpc('update_batch_status_with_timeline', {
        p_batch_id: id,
        p_status: body.status,
        p_note: body.note || defaultTimelineNote(body.status),
        p_completed_at: completedAt,
      })
      .single();

    if (updateError || !rpcData) {
      if (updateError?.message?.includes('Batch not found')) {
        return NextResponse.json(
          { success: false, error: 'BATCH_NOT_FOUND', message: 'Batch not found' },
          { status: 404 }
        );
      }

      console.error('[timeline] Failed to update timeline:', updateError);
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR', message: 'Failed to update batch timeline', details: updateError?.message },
        { status: 500 }
      );
    }

    const data = rpcData as TimelineUpdateResult;

    return NextResponse.json({
      success: true,
      data: {
        batch: {
          id: data.batch_id,
          status: data.batch_status,
          total_weight_kg: Number(data.batch_total_weight_kg || 0),
          created_at: data.batch_created_at,
          completed_at: data.batch_completed_at,
        },
        event: {
          id: data.event_id,
          status: data.event_status,
          note: data.event_note,
          created_at: data.event_created_at,
        },
      },
    });
  } catch (error) {
    console.error('[timeline] Unexpected PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Status penjemputan belum dapat diperbarui', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function defaultTimelineNote(status: BatchStatus): string {
  const notes: Record<BatchStatus, string> = {
    submitted: 'Batch diterima oleh sistem dan menunggu pickup.',
    picked_up: 'Limbah sudah dijemput partner logistik.',
    processing: 'Limbah sedang diproses oleh partner pengolah.',
    completed: 'Proses pengolahan selesai.',
    sold: 'Produk hasil olahan tercatat terjual di marketplace mockup.',
  };

  return notes[status];
}
