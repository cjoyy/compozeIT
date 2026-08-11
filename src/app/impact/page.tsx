'use client';

import { useEffect, useState } from 'react';
import { LoadingState } from '@/components/loading-state';
import { ErrorState } from '@/components/error-state';
import {
  Scale,
  TrendingDown,
  DollarSign,
  Factory,
  PieChart,
  Recycle,
  Award,
  Globe,
} from 'lucide-react';

interface ImpactStats {
  total_waste_diverted_kg: number;
  co2_avoided_kg: number;
  b2b_cost_saved_idr: number;
  active_processors_count: number;
  total_capacity_kg: number;
  total_current_load_kg: number;
  capacity_utilized_percent: number;
}

export default function ImpactDashboardPage() {
  const [stats, setStats] = useState<ImpactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadImpact() {
      try {
        const res = await fetch('/api/impact');
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Gagal memuat data dampak');
        if (active) setStats(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadImpact();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <LoadingState message="Memuat Impact Dashboard..." className="py-20" />;
  if (error) return <ErrorState message={error} onRetry={fetchImpact} className="py-20" />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-xs font-medium text-primary">
          <Globe className="h-3.5 w-3.5" />
          Aggregate Circular Economy Impact
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Impact Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dampak nyata pengalihan sampah makanan dari TPA ke ekosistem olahan daur ulang (kompos &amp; BSF).
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary mb-4">
            <Scale className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Sampah Dialihkan</p>
          <p className="text-3xl font-extrabold mt-1 text-foreground">
            {stats?.total_waste_diverted_kg.toLocaleString('id-ID')} <span className="text-base font-normal text-muted-foreground">kg</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Terkumpul &amp; diproses dari TPA</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-chart-1/20 bg-gradient-to-br from-chart-1/10 via-card to-card p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-1/20 text-chart-1 mb-4">
            <TrendingDown className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estimasi CO₂ Avoided</p>
          <p className="text-3xl font-extrabold mt-1 text-foreground">
            {stats?.co2_avoided_kg.toLocaleString('id-ID')} <span className="text-base font-normal text-muted-foreground">kg CO₂e</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Berdasarkan rasio 2.5 kg CO₂e / kg waste</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-chart-2/20 bg-gradient-to-br from-chart-2/10 via-card to-card p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-2/20 text-chart-2 mb-4">
            <DollarSign className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Penghematan Biaya B2B</p>
          <p className="text-3xl font-extrabold mt-1 text-foreground">
            Rp {stats?.b2b_cost_saved_idr.toLocaleString('id-ID')}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Dihemat dibanding tipping fee TPA</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-chart-3/20 bg-gradient-to-br from-chart-3/10 via-card to-card p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-3/20 text-chart-3 mb-4">
            <Factory className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fasilitas Processor</p>
          <p className="text-3xl font-extrabold mt-1 text-foreground">
            {stats?.active_processors_count} <span className="text-base font-normal text-muted-foreground">unit</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Mitra pengolah Kompos &amp; BSF aktif</p>
        </div>
      </div>

      {/* Utilization & Metric Callout */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Kapasitas Processor Terpakai</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">{stats?.capacity_utilized_percent}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats?.total_current_load_kg.toLocaleString('id-ID')} kg dari {stats?.total_capacity_kg.toLocaleString('id-ID')} kg
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                <Recycle className="h-3 w-3" /> Optimum Load
              </span>
            </div>

            <div className="h-4 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-chart-1 to-chart-2 transition-all duration-700"
                style={{ width: `${Math.min(100, stats?.capacity_utilized_percent || 0)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-5 w-5 text-chart-4" />
              <h2 className="text-base font-semibold">Komitmen Metrik Lingkungan</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              CompozeIT membantu Jabodetabek mengurangi emisi gas metana dari TPA liar dan mempromosikan pupuk organik ramah lingkungan serta pakan ternak berkelanjutan.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Standardized Model</p>
              <p className="text-sm font-semibold text-foreground">EPA WARM Standard</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Scope Regional</p>
              <p className="text-sm font-semibold text-foreground">Jabodetabek Area</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
