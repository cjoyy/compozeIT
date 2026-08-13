'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Factory,
  MapPin,
  Navigation,
  PackageCheck,
  Route,
  Scale,
  Truck,
} from 'lucide-react';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProcessorMatch {
  processor_id: string;
  name: string;
  type: 'compost' | 'bsf';
  distance_km: number;
  available_capacity_kg: number;
  score: number;
  accepts_waste_type: boolean;
}

const DEMO_PICKUP = {
  businessName: 'Restoran Hijau Nusantara',
  locationLabel: 'Jl. Kemang Raya, Jakarta Selatan',
  lat: -6.2615,
  lng: 106.8106,
  wasteType: 'campuran',
  weightKg: 62.5,
};

const FALLBACK_MATCHES: ProcessorMatch[] = [
  {
    processor_id: 'a1b2c3d4-1111-4000-8000-000000000001',
    name: 'EcoCompost Jakarta Selatan',
    type: 'compost',
    distance_km: 0,
    available_capacity_kg: 380,
    score: 0.91,
    accepts_waste_type: true,
  },
  {
    processor_id: 'a1b2c3d4-1111-4000-8000-000000000003',
    name: 'GreenCycle Composting Kebayoran',
    type: 'compost',
    distance_km: 3.6,
    available_capacity_kg: 220,
    score: 0.74,
    accepts_waste_type: true,
  },
  {
    processor_id: 'a1b2c3d4-1111-4000-8000-000000000007',
    name: 'BSF Tangerang Selatan',
    type: 'bsf',
    distance_km: 14.7,
    available_capacity_kg: 320,
    score: 0.58,
    accepts_waste_type: true,
  },
];

const TIMELINE = [
  { label: 'Submission diterima', time: '09:10', icon: PackageCheck, done: true },
  { label: 'Partner logistik dipilih', time: '09:12', icon: Factory, done: true },
  { label: 'Rute sedang dioptimalkan', time: '09:18', icon: Route, done: true },
  { label: 'Armada menuju lokasi', time: 'ETA 32 menit', icon: Truck, done: false },
];

function formatKg(value: number) {
  return `${value.toLocaleString('id-ID')} kg`;
}

function getEta(distanceKm: number) {
  // Demo assumption: urban pickup speed averages 18 km/hour including loading buffer.
  const travelMinutes = Math.ceil((Math.max(distanceKm, 1) / 18) * 60);
  return travelMinutes + 20;
}

export default function LogisticsPage() {
  const [matches, setMatches] = useState<ProcessorMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadMatches() {
      setLoading(true);
      setError(null);
      setUsingFallback(false);

      try {
        const res = await fetch('/api/matching/find', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: DEMO_PICKUP.lat,
            lng: DEMO_PICKUP.lng,
            waste_type: DEMO_PICKUP.wasteType,
            weight_kg: DEMO_PICKUP.weightKg,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Gagal memuat partner logistics');
        }

        if (active) setMatches(data.matches || []);
      } catch (err) {
        if (active) {
          setMatches(FALLBACK_MATCHES);
          setUsingFallback(true);
          setError(err instanceof Error ? err.message : 'Data Supabase belum tersedia');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMatches();
    return () => {
      active = false;
    };
  }, [reloadToken]);

  const bestMatch = matches[0];
  const etaMinutes = useMemo(
    () => (bestMatch ? getEta(bestMatch.distance_km) : 0),
    [bestMatch]
  );

  if (loading) return <LoadingState message="Memuat simulasi smart logistics..." className="py-20" />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-chart-3/20 bg-chart-3/5 px-3 py-1 text-xs font-medium text-chart-3">
            <Truck className="h-3.5 w-3.5" />
            Smart Logistics Mockup
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Smart Logistics</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Simulasi pickup B2B dengan partner processor dari seed data dan jarak Haversine dari lokasi restoran.
          </p>
        </div>
        <Button variant="outline" onClick={() => setReloadToken((token) => token + 1)}>
          <Navigation className="mr-1.5 h-4 w-4" />
          Refresh Match
        </Button>
      </div>

      {usingFallback && (
        <div className="mb-6 rounded-lg border border-chart-4/30 bg-chart-4/5 p-4">
          <p className="text-sm font-medium text-foreground">Mode demo fallback aktif</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {error}. Tampilan tetap memakai seed processor yang sama agar alur demo tidak kosong.
          </p>
        </div>
      )}

      {!bestMatch ? (
        <ErrorState message="Belum ada partner processor tersedia" onRetry={() => setReloadToken((token) => token + 1)} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Partner terpilih</p>
                <h2 className="mt-2 text-2xl font-bold">{bestMatch.name}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Factory className="h-3.5 w-3.5" />
                    {bestMatch.type === 'compost' ? 'Compost Processor' : 'BSF Processor'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-chart-3/10 px-3 py-1 text-xs font-medium text-chart-3">
                    <Route className="h-3.5 w-3.5" />
                    {bestMatch.distance_km.toLocaleString('id-ID')} km
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-right">
                <p className="text-xs text-muted-foreground">Pickup ETA</p>
                <p className="mt-1 text-3xl font-bold text-primary">{etaMinutes}</p>
                <p className="text-xs text-muted-foreground">menit</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Scale className="h-3.5 w-3.5" />
                  Muatan pickup
                </div>
                <p className="mt-2 text-xl font-semibold">{formatKg(DEMO_PICKUP.weightKg)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Food waste campuran</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <PackageCheck className="h-3.5 w-3.5" />
                  Kapasitas tersedia
                </div>
                <p className="mt-2 text-xl font-semibold">{formatKg(bestMatch.available_capacity_kg)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Di processor pilihan</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  Status
                </div>
                <p className="mt-2 text-xl font-semibold">Sedang menuju lokasi</p>
                <p className="mt-1 text-xs text-muted-foreground">Simulasi operasional</p>
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-border bg-background p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{DEMO_PICKUP.businessName}</p>
                    <p className="truncate text-xs text-muted-foreground">{DEMO_PICKUP.locationLabel}</p>
                  </div>
                </div>
                <ArrowRight className="hidden h-5 w-5 shrink-0 text-muted-foreground md:block" />
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Factory className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{bestMatch.name}</p>
                    <p className="truncate text-xs text-muted-foreground">Jarak dihitung dengan Haversine</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-sm font-semibold">Timeline Pickup</h2>
              <div className="mt-5 space-y-4">
                {TIMELINE.map((step) => (
                  <div key={step.label} className="flex gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        step.done ? 'bg-primary/10 text-primary' : 'bg-chart-3/10 text-chart-3'
                      )}
                    >
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.time}</p>
                    </div>
                    {step.done && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-sm font-semibold">Alternatif Processor</h2>
              <div className="mt-4 space-y-3">
                {matches.slice(1, 4).map((match) => (
                  <div key={match.processor_id} className="rounded-lg bg-muted/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{match.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {match.distance_km.toLocaleString('id-ID')} km • {formatKg(match.available_capacity_kg)} available
                        </p>
                      </div>
                      <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium">
                        {Math.round(match.score * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
