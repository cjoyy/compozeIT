'use client';

import { useState } from 'react';
import { useRole } from '@/components/role-provider';
import { ImageUpload } from '@/components/image-upload';
import { LoadingState } from '@/components/loading-state';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import {
  Upload,
  CheckCircle2,
  Scale,
  Banknote,
  MapPin,
  Navigation,
  Calendar,
} from 'lucide-react';

interface CollectionPoint {
  processor_id: string;
  name: string;
  type: string;
  distance_km: number;
  accepts_waste_type: boolean;
}

interface ClassifyResult {
  id: string;
  waste_type: string;
  estimated_weight_kg: number;
  is_contaminated: boolean;
  contaminant_type: string | null;
  confidence: number;
  estimated_value?: number;
  estimated_value_formatted?: string;
  nearby_collection_points?: CollectionPoint[];
  _meta?: { ai_provider: string };
}

export default function SellTrackPage() {
  const { userId } = useRole();
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [scheduled, setScheduled] = useState<string | null>(null);

  const handleClassify = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setScheduled(null);

    try {
      const res = await fetch('/api/waste/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          user_id: userId,
          track: 'sell',
          // Default Jakarta Pusat location for demo
          lat: -6.1862,
          lng: 106.8345,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mengklasifikasi');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = (processorName: string) => {
    setScheduled(processorName);
  };

  const wasteTypeLabels: Record<string, string> = {
    nasi: '🍚 Nasi', sayur: '🥬 Sayur', protein: '🍗 Protein',
    buah: '🍎 Buah', campuran: '🥗 Campuran', lainnya: '📦 Lainnya',
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Jual Sampah Makanan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Foto sampah Anda, dapatkan estimasi nilai, dan jadwalkan pengambilan ke titik kumpul terdekat.
        </p>
      </div>

      {!scheduled && (
        <>
          <div className="space-y-4">
            <ImageUpload onImageSelect={setImageBase64} disabled={loading} />
            {imageBase64 && !loading && !result && (
              <Button onClick={handleClassify} className="w-full h-11 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20">
                <Upload className="mr-2 h-4 w-4" />
                Analisis & Estimasi Nilai
              </Button>
            )}
          </div>

          {loading && <LoadingState message="AI sedang menilai sampah Anda..." className="mt-8" />}
          {error && <ErrorState message={error} onRetry={handleClassify} className="mt-8" />}

          {result && (
            <div className="mt-8 space-y-4">
              {/* Result Summary */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Hasil Analisis</h2>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-muted/50 p-3 text-center">
                    <Scale className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                    <p className="text-lg font-bold">{result.estimated_weight_kg}</p>
                    <p className="text-xs text-muted-foreground">kg</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3 text-center">
                    <div className="text-xl mb-1">{wasteTypeLabels[result.waste_type]?.split(' ')[0] || '📦'}</div>
                    <p className="text-xs font-medium">{wasteTypeLabels[result.waste_type]?.split(' ')[1] || result.waste_type}</p>
                  </div>
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-center">
                    <Banknote className="h-4 w-4 text-primary mx-auto mb-1" />
                    <p className="text-lg font-bold text-primary">{result.estimated_value_formatted || `Rp ${result.estimated_value}`}</p>
                    <p className="text-xs text-muted-foreground">estimasi</p>
                  </div>
                </div>
              </div>

              {/* Collection Points */}
              {result.nearby_collection_points && result.nearby_collection_points.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5 text-chart-4" />
                    <h2 className="text-sm font-semibold">Titik Kumpul Terdekat</h2>
                  </div>

                  <div className="space-y-3">
                    {result.nearby_collection_points.map((cp) => (
                      <div key={cp.processor_id} className="flex items-center gap-3 rounded-xl border border-border p-4 transition-all hover:shadow-sm">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <Navigation className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{cp.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {cp.distance_km} km • {cp.type === 'compost' ? 'Kompos' : 'BSF'}
                            {cp.accepts_waste_type && ' • ✅ Cocok'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSchedule(cp.name)}
                          className="shrink-0 rounded-lg"
                        >
                          <Calendar className="mr-1 h-3.5 w-3.5" />
                          Jadwalkan
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => { setResult(null); setImageBase64(null); }}
                className="w-full rounded-xl"
              >
                Scan Lagi
              </Button>
            </div>
          )}
        </>
      )}

      {/* Confirmation */}
      {scheduled && (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Pickup Terjadwalkan!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sampah Anda akan diambil di titik kumpul <strong>{scheduled}</strong>.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Estimasi nilai: {result?.estimated_value_formatted}
          </p>
          <Button
            onClick={() => { setScheduled(null); setResult(null); setImageBase64(null); }}
            className="mt-6 rounded-xl"
          >
            Jual Sampah Lagi
          </Button>
        </div>
      )}
    </div>
  );
}
