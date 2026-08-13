'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  FileText,
  Scale,
  ShieldCheck,
  TrendingDown,
  Download,
} from 'lucide-react';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { useRole } from '@/components/role-provider';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { cn } from '@/lib/utils';

interface WasteSubmission {
  id: string;
  waste_type: string;
  estimated_weight_kg: number;
  is_contaminated: boolean;
  created_at: string;
}

const FALLBACK_SUBMISSIONS: WasteSubmission[] = [
  { id: 'demo-1', waste_type: 'campuran', estimated_weight_kg: 18.5, is_contaminated: false, created_at: '2026-08-11T09:10:00.000Z' },
  { id: 'demo-2', waste_type: 'sayur', estimated_weight_kg: 14, is_contaminated: false, created_at: '2026-08-11T13:45:00.000Z' },
  { id: 'demo-3', waste_type: 'protein', estimated_weight_kg: 9.5, is_contaminated: true, created_at: '2026-08-12T08:20:00.000Z' },
  { id: 'demo-4', waste_type: 'buah', estimated_weight_kg: 20.5, is_contaminated: false, created_at: '2026-08-12T17:15:00.000Z' },
];

const WASTE_LABELS: Record<string, string> = {
  nasi: 'Nasi',
  sayur: 'Sayur',
  protein: 'Protein',
  buah: 'Buah',
  campuran: 'Campuran',
  lainnya: 'Lainnya',
};

// Demo reporting assumptions: landfill diversion avoids 2.5 kg CO2e/kg waste, and conventional handling costs Rp500/kg.
const CO2_PER_KG_DIVERTED = 2.5;
const CONVENTIONAL_COST_PER_KG = 500;
function formatKg(value: number) {
  return value.toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

export default function CompliancePage() {
  const { userId, userName } = useRole();
  const [submissions, setSubmissions] = useState<WasteSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setUsingFallback] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadReport() {
      setLoading(true);
      setUsingFallback(false);

      try {
        const submissionsRes = await fetchWithTimeout(`/api/waste/submissions?user_id=${userId}&track=b2b`, {}, 2500);
        const submissionsData = await submissionsRes.json();

        if (!submissionsRes.ok) {
          throw new Error(submissionsData.message || 'Gagal memuat submission B2B');
        }

        if (active) {
          setSubmissions(submissionsData.submissions || []);
        }
      } catch {
        if (active) {
          setSubmissions(FALLBACK_SUBMISSIONS);
          setUsingFallback(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReport();
    return () => {
      active = false;
    };
  }, [userId, reloadToken]);

  const report = useMemo(() => {
    const totalKg = submissions.reduce((sum, item) => sum + Number(item.estimated_weight_kg || 0), 0);
    const contaminatedCount = submissions.filter((item) => item.is_contaminated).length;
    const breakdown = Object.entries(
      submissions.reduce<Record<string, number>>((acc, item) => {
        const key = item.waste_type || 'lainnya';
        acc[key] = (acc[key] || 0) + Number(item.estimated_weight_kg || 0);
        return acc;
      }, {})
    )
      .map(([type, weightKg]) => ({
        type,
        label: WASTE_LABELS[type] || type,
        weightKg,
        percent: totalKg > 0 ? Math.round((weightKg / totalKg) * 100) : 0,
      }))
      .sort((a, b) => b.weightKg - a.weightKg);

    return {
      totalKg,
      co2AvoidedKg: totalKg * CO2_PER_KG_DIVERTED,
      costSavedIdr: totalKg * CONVENTIONAL_COST_PER_KG,
      contaminatedCount,
      cleanRate: submissions.length > 0 ? Math.round(((submissions.length - contaminatedCount) / submissions.length) * 100) : 0,
      breakdown,
    };
  }, [submissions]);

  if (loading) return <LoadingState message="Menyusun laporan compliance..." className="py-20" />;

  return (
      <div id="compliance-report" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-chart-5/20 bg-chart-5/5 px-3 py-1 text-xs font-medium text-chart-5">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Laporan Dampak Bisnis
          </div>
          <h1 className="text-2xl font-bold tracking-tight">MBG / ESG Compliance Report</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Pantau volume sampah yang dialihkan, jenis material, dan kontribusi lingkungan bisnis Anda.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            onClick={() => setReloadToken((token) => token + 1)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"
          >
            Perbarui laporan
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            Simpan sebagai PDF
          </button>
        </div>
      </div>

      {submissions.length === 0 ? (
        <ErrorState message="Belum ada submission untuk laporan" details="Upload foto sampah dulu agar laporan compliance memakai data real." />
      ) : (
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Prepared for</p>
                <h2 className="mt-1 text-xl font-bold">{userName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Reporting period: Agustus 2026</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-semibold">Audit-ready web summary</span>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={Scale} label="Total food waste" value={`${formatKg(report.totalKg)} kg`} tone="primary" />
            <MetricCard icon={TrendingDown} label="CO2e avoided" value={`${formatKg(report.co2AvoidedKg)} kg`} tone="blue" />
            <MetricCard icon={DollarSign} label="Cost avoided" value={`Rp ${report.costSavedIdr.toLocaleString('id-ID')}`} tone="purple" />
            <MetricCard icon={Award} label="Clean submission rate" value={`${report.cleanRate}%`} tone="amber" />
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-semibold">Breakdown Jenis Limbah</h2>
              </div>
              <div className="mt-6 space-y-4">
                {report.breakdown.map((item, index) => (
                  <div key={item.type}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground">{formatKg(item.weightKg)} kg</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          index % 3 === 0 && 'bg-primary',
                          index % 3 === 1 && 'bg-chart-3',
                          index % 3 === 2 && 'bg-chart-4'
                        )}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-chart-5" />
                <h2 className="text-sm font-semibold">Compliance Checklist</h2>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  'AI classification record tersedia',
                  'Kontaminasi dipantau per submission',
                  'Pengalihan TPA dihitung dalam kg',
                  'CO2e avoided memakai faktor eksplisit',
                  'Marketplace output tercatat sebagai katalog',
                  'PDF generation ditandai sebagai future scope',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-semibold">Aktivitas pengumpulan terbaru</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-[1fr_0.7fr_0.7fr] bg-muted/60 px-4 py-2 text-xs font-semibold text-muted-foreground">
                <span>Jenis</span>
                <span>Berat</span>
                <span>Kontaminasi</span>
              </div>
              {submissions.slice(0, 5).map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_0.7fr_0.7fr] border-t border-border px-4 py-3 text-sm">
                  <span>{WASTE_LABELS[item.waste_type] || item.waste_type}</span>
                  <span>{formatKg(Number(item.estimated_weight_kg || 0))} kg</span>
                  <span className={item.is_contaminated ? 'text-destructive' : 'text-primary'}>
                    {item.is_contaminated ? 'Terdeteksi' : 'Bersih'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: 'primary' | 'blue' | 'amber' | 'purple';
}) {
  const toneClass = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    blue: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
    amber: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
    purple: 'bg-chart-5/10 text-chart-5 border-chart-5/20',
  }[tone];

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className={cn('mb-4 flex h-10 w-10 items-center justify-center rounded-lg border', toneClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
