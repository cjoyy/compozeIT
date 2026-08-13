// POST /api/cashback/apply
// Simulates using accumulated B2B cashback to renew a monthly subscription.

import { NextRequest, NextResponse } from 'next/server';
import { SUBSCRIPTION_RENEWAL_FEE_IDR } from '@/lib/cashback';
import { getSupabaseServerClient } from '@/lib/db/supabase';

interface CashbackApplyRequest {
  user_id: string;
}

interface CashbackApplyResult {
  applied: boolean;
  reason: string | null;
  required_amount: number | string;
  current_balance: number | string;
  remaining_balance: number | string;
  subscription_status: 'active' | 'renewal_due';
}

export async function POST(request: NextRequest) {
  try {
    const body: CashbackApplyRequest = await request.json();

    if (!body.user_id || typeof body.user_id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'INVALID_USER_ID', message: 'Field "user_id" is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { data: rpcData, error: applyError } = await supabase
      .rpc('apply_cashback_to_subscription', {
        p_user_id: body.user_id,
        p_subscription_fee: SUBSCRIPTION_RENEWAL_FEE_IDR,
      })
      .single();

    if (applyError || !rpcData) {
      if (applyError?.message?.includes('B2B user not found')) {
        return NextResponse.json(
          { success: false, error: 'USER_NOT_FOUND', message: 'User not found or not a B2B user' },
          { status: 404 }
        );
      }

      console.error('[cashback] Failed to apply cashback:', applyError);
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR', message: 'Failed to apply cashback', details: applyError?.message },
        { status: 500 }
      );
    }

    const data = rpcData as CashbackApplyResult;

    if (!data.applied) {
      return NextResponse.json({
        success: true,
        data: {
          applied: false,
          reason: data.reason,
          required_amount: Number(data.required_amount),
          current_balance: Number(data.current_balance),
          remaining_balance: Number(data.remaining_balance),
          subscription_status: data.subscription_status,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        applied: true,
        applied_amount: SUBSCRIPTION_RENEWAL_FEE_IDR,
        remaining_balance: Number(data.remaining_balance),
        subscription_status: data.subscription_status,
      },
    });
  } catch (error) {
    console.error('[cashback] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Cashback belum dapat digunakan saat ini', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
