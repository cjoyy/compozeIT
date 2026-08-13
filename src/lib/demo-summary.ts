// Seed-like B2B summary used only when the dashboard cannot reach Supabase.
// The values are intentionally static so the demo remains useful offline.
export const DEMO_SUMMARY_SUBMISSIONS = [
  {
    id: 'demo-summary-1',
    waste_type: 'nasi',
    estimated_weight_kg: 12.4,
    is_contaminated: false,
    status: 'completed',
    created_at: '2026-08-11T08:30:00.000Z',
  },
  {
    id: 'demo-summary-2',
    waste_type: 'sayur',
    estimated_weight_kg: 8.7,
    is_contaminated: true,
    status: 'processing',
    created_at: '2026-08-10T10:15:00.000Z',
  },
  {
    id: 'demo-summary-3',
    waste_type: 'buah',
    estimated_weight_kg: 6.2,
    is_contaminated: false,
    status: 'pickup_scheduled',
    created_at: '2026-08-09T07:45:00.000Z',
  },
] as const;
