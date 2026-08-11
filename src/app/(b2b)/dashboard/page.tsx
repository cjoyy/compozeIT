'use client';

import { useEffect, useState } from 'react';
import { useRole } from '@/components/role-provider';
import { LoadingState } from '@/components/loading-state';
import { ErrorState } from '@/components/error-state';
import { QRCodeSVG } from 'qrcode.react';
import {
  TrendingDown,
  Leaf,
  Scale,
  Award,
  DollarSign,
  Package,
} from 'lucide-react';

// Cost assumptions — documented for judges Q&A:
// Biaya pembuangan konvensional: Rp 500/kg (rata-rata tipping fee TPA di Jabodetabek)
// Sumber: estimasi berdasarkan data Kementerian LHK 2023
const CONVENTIONAL_COST_PER_KG = 500;

// CO2 conversion factor:
// ~2.5 kg CO2e per kg food waste diverted from landfill
// Sumber: EPA WARM model, FAO food waste methodology
const CO2_PER_KG_DIVERTED = 2.5;

interface WasteSubmission {
  id: string;
  waste_type: string;
  estimated_weight_kg: number;
  is_contaminated: boolean;
  status: string;
  created_at: string;
}

export default function B2BDashboardPage() {
  const { userId, userName } = useRole();
  const [submissions, setSubmissions] = useState<WasteSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const res = await fetch(`/api/waste/submissions?user_id=${userId}&track=b2b`);
        if (!res.ok) {
          if (active) setSubmissions([]);
          return;
        }
        const data = await res.json();
        if (active) setSubmissions(data.submissions || []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat data');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [userId, reloadToken]);

  const handleRetry = () => setReloadToken((t) => t + 1);

  const totalKg = submissions.reduce((sum, s) => sum + Number(s.estimated_weight_kg || 0), 0);
  const totalCostSaved = totalKg * CONVENTIONAL_COST_PER_KG;
  const totalCO2Avoided = totalKg * CO2_PER_KG_DIVERTED;
  const totalSubmissions = submissions.length;

  const wasteTypeLabels: Record<string, string> = {
    nasi: '🍚 Nasi',
    sayur: '🥬 Sayur',
    protein: '🍗 Protein',
    buah: '🍎 Buah',
    campuran: '🥗 Campuran',
    lainnya: '📦 Lainnya',
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    pickup_scheduled: { label: 'Pickup', color: 'bg-blue-100 text-blue-800' },
    picked_up: { label: 'Picked Up', color: 'bg-indigo-100 text-indigo-800' },
    processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800' },
    completed: { label: 'Done', color: 'bg-green-100 text-green-800' },
  };

  if (loading) return <LoadingState message="Memuat dashboard..." className="py-20" />;
  if (error) return <ErrorState message={error} onRetry={handleRetry} className="py-20" />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">B2B Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">{userName}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Scale className="h-3.5 w-3.5" />
            Total Dialihkan
          </div>
          <p className="text-2xl font-bold">{totalKg.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">kg</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <DollarSign className="h-3.5 w-3.5" />
            Penghematan Biaya
          </div>
          <p className="text-2xl font-bold">Rp {totalCostSaved.toLocaleString('id-ID')}</p>
          <p className="text-xs text-muted-foreground">vs. konvensional</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <TrendingDown className="h-3.5 w-3.5" />
            CO₂ Avoided
          </div>
          <p className="text-2xl font-bold">{totalCO2Avoided.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">kg CO₂e</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Package className="h-3.5 w-3.5" />
            Total Submission
          </div>
          <p className="text-2xl font-bold">{totalSubmissions}</p>
          <p className="text-xs text-muted-foreground">entries</p>
        </div>
      </div>

      {/* Green Partner Badge + History */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Green Partner Badge */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6 shadow-sm lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold text-primary">Green Partner Badge</h2>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <QRCodeSVG
                value={`https://compozit.vercel.app/badge/${userId}`}
                size={140}
                bgColor="#ffffff"
                fgColor="#166534"
                level="M"
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium">{userName}</p>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Leaf className="h-3 w-3" />
                {totalKg.toFixed(1)} kg dialihkan
              </div>
            </div>
          </div>
        </div>

        {/* Waste History */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold mb-4">Riwayat Submission</h2>

          {submissions.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada data submission.</p>
              <p className="text-xs text-muted-foreground mt-1">Upload foto sampah pertama Anda di halaman Upload.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {submissions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
                  <div className="text-xl">{wasteTypeLabels[s.waste_type]?.split(' ')[0] || '📦'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {wasteTypeLabels[s.waste_type] || s.waste_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.estimated_weight_kg} kg •{' '}
                      {new Date(s.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusLabels[s.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                    {statusLabels[s.status]?.label || s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
