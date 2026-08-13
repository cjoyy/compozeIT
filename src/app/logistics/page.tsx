'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { Button } from '@/components/ui/button';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
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
  lng: 106.8130,
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

type PickupStatus = 'in_transit' | 'delivered';

const TIMELINE = [
  { label: 'Permintaan pickup diterima', time: '09:10', icon: PackageCheck },
  { label: 'Mitra pengolahan dipilih', time: '09:12', icon: Factory },
  { label: 'Rute penjemputan disiapkan', time: '09:18', icon: Route },
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
  const [matches, setMatches] = useState<ProcessorMatch[]>(FALLBACK_MATCHES);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [pickupStatus, setPickupStatus] = useState<PickupStatus>('in_transit');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);

  useEffect(() => {
    let active = true;

    async function loadMatches() {
      setIsRefreshing(true);

      try {
        const res = await fetchWithTimeout('/api/matching/find', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: DEMO_PICKUP.lat,
            lng: DEMO_PICKUP.lng,
            waste_type: DEMO_PICKUP.wasteType,
            weight_kg: DEMO_PICKUP.weightKg,
          }),
        }, 2500);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Gagal memuat partner logistics');
        }

        if (active && data.matches?.length) setMatches(data.matches);
      } catch {
        if (active) {
          setMatches(FALLBACK_MATCHES);
          // This page intentionally keeps its static route simulation available for a live demo.
        }
      } finally {
        if (active) setIsRefreshing(false);
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

  useEffect(() => {
    let isActive = true;
    void import('leaflet').then(({ default: L }) => {
      if (!isActive || !mapContainerRef.current || !bestMatch) return;
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(
        [DEMO_PICKUP.lat, DEMO_PICKUP.lng],
        12
      );
      mapRef.current = map;
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const businessIcon = L.divIcon({ className: 'leaflet-business-pin', html: '●', iconSize: [24, 24], iconAnchor: [12, 12] });
      const processorIcon = L.divIcon({ className: 'leaflet-processor-pin', html: '◆', iconSize: [24, 24], iconAnchor: [12, 12] });
      const vehicleIcon = L.divIcon({ className: pickupStatus === 'delivered' ? 'leaflet-delivered-pin' : 'leaflet-vehicle-pin', html: pickupStatus === 'delivered' ? '✓' : '●', iconSize: [24, 24], iconAnchor: [12, 12] });
      const processor = matches.find((match) => match.processor_id === bestMatch.processor_id) || bestMatch;
      const processorLat = DEMO_PICKUP.lat + 0.035;
      const processorLng = DEMO_PICKUP.lng + 0.06;

      L.marker([DEMO_PICKUP.lat, DEMO_PICKUP.lng], { icon: businessIcon })
        .addTo(map)
        .bindPopup(`<strong>${DEMO_PICKUP.businessName}</strong><br/>Lokasi pickup`);
      L.marker([processorLat, processorLng], { icon: processorIcon })
        .addTo(map)
        .bindPopup(`<strong>${processor.name}</strong><br/>Mitra pengolahan`);
      const midpoint: [number, number] = [(DEMO_PICKUP.lat + processorLat) / 2, (DEMO_PICKUP.lng + processorLng) / 2];
      L.marker(midpoint, { icon: vehicleIcon }).addTo(map).bindPopup(pickupStatus === 'delivered' ? 'Pengantaran selesai' : `Armada menuju lokasi, ETA ${etaMinutes} menit`);
      L.polyline([[DEMO_PICKUP.lat, DEMO_PICKUP.lng], [processorLat, processorLng]], { color: pickupStatus === 'delivered' ? '#718096' : '#2d7a4b', weight: 5, dashArray: pickupStatus === 'delivered' ? undefined : '10 8' }).addTo(map);
    });
    return () => {
      isActive = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [bestMatch, matches, pickupStatus, etaMinutes]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-chart-3/20 bg-chart-3/5 px-3 py-1 text-xs font-medium text-chart-3">
            <Truck className="h-3.5 w-3.5" />
            Perjalanan pickup Anda
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Pantau Penjemputan</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Lihat perkiraan perjalanan armada dari bisnis Anda ke mitra pengolahan.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setReloadToken((token) => token + 1)}
          disabled={isRefreshing}
        >
          <Navigation className="mr-1.5 h-4 w-4" />
          {isRefreshing ? 'Memperbarui...' : 'Perbarui rute'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Partner terpilih</p>
                <h2 className="mt-2 text-2xl font-bold">{bestMatch.name}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Factory className="h-3.5 w-3.5" />
                    {bestMatch.type === 'compost' ? 'Mitra pembuat kompos' : 'Mitra pakan maggot'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-chart-3/10 px-3 py-1 text-xs font-medium text-chart-3">
                    <Route className="h-3.5 w-3.5" />
                    {bestMatch.distance_km.toLocaleString('id-ID')} km
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-right">
                <p className="text-xs text-muted-foreground">{pickupStatus === 'in_transit' ? 'Perkiraan tiba' : 'Status pengantaran'}</p>
                <p className="mt-1 text-2xl font-bold text-primary">{pickupStatus === 'in_transit' ? etaMinutes : 'Selesai'}</p>
                <p className="text-xs text-muted-foreground">{pickupStatus === 'in_transit' ? 'menit' : 'di mitra pengolahan'}</p>
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
                <p className="mt-1 text-xs text-muted-foreground">Di mitra pengolahan pilihan</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  Status
                </div>
                <p className="mt-2 text-xl font-semibold">{pickupStatus === 'in_transit' ? 'Sedang menuju lokasi' : 'Sudah selesai diantar'}</p>
                <p className="mt-1 text-xs text-muted-foreground">{pickupStatus === 'in_transit' ? 'Armada menuju lokasi' : 'Sampah sudah diterima mitra'}</p>
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
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Factory className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{bestMatch.name}</p>
                    <p className="truncate text-xs text-muted-foreground">Mitra pengolahan terdekat</p>
                  </div>
                </div>
              </div>
            </div>

            <div ref={mapContainerRef} className="mt-6 h-72 overflow-hidden rounded-2xl border border-border" aria-label="Peta rute pickup" />
          </section>

          <aside className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Status penjemputan</h2>
                <div className="flex rounded-lg border border-border p-1">
                  {(['in_transit', 'delivered'] as const).map((status) => (
                    <button key={status} onClick={() => setPickupStatus(status)} aria-pressed={pickupStatus === status} className={cn('rounded-md px-2.5 py-1.5 text-xs font-medium', pickupStatus === status ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                      {status === 'in_transit' ? 'Sedang dijemput' : 'Sudah diantar'}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Pilih status untuk melihat posisi terakhir perjalanan.</p>
              <div className="mt-6 space-y-0">
                {TIMELINE.concat({ label: pickupStatus === 'in_transit' ? 'Armada menuju lokasi' : 'Sampah selesai diantar', time: pickupStatus === 'in_transit' ? `ETA ${etaMinutes} menit` : 'Selesai 10:02', icon: pickupStatus === 'in_transit' ? Truck : CheckCircle2 }).map((step, index) => (
                  <div key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < TIMELINE.length && <span className="absolute left-[17px] top-9 h-[calc(100%-12px)] w-px bg-primary/25" />}
                    <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-sm font-semibold">Mitra pengolahan lain</h2>
              <div className="mt-4 space-y-3">
                {matches.slice(1, 4).map((match) => (
                  <div key={match.processor_id} className="rounded-lg bg-muted/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{match.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {match.distance_km.toLocaleString('id-ID')} km • kapasitas {formatKg(match.available_capacity_kg)}
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
    </div>
  );
}
