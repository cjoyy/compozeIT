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
  AlertTriangle,
  Scale,
  Leaf,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface ClassifyResult {
  id: string;
  waste_type: string;
  estimated_weight_kg: number;
  is_contaminated: boolean;
  contaminant_type: string | null;
  confidence: number;
  track: string;
  status: string;
  b2b_status?: {
    total_pending_kg: number;
    threshold_kg: number;
    threshold_reached: boolean;
  };
  _meta?: { ai_provider: string };
}

export default function B2BUploadPage() {
  const { userId } = useRole();
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [sampleUrl, setSampleUrl] = useState<string | null>(null);

  const sampleImages = [
    '/samples/food-waste/sampah1.jpeg',
    '/samples/food-waste/sampah2.jpg',
    '/samples/food-waste/sampah3.jpg',
    '/samples/food-waste/sampah4.jpeg',
    '/samples/food-waste/sampah5.jpg',
    '/samples/food-waste/sampah6.jpeg',
  ];

  const handleClassify = async () => {
    if (!imageBase64) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/waste/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          user_id: userId,
          track: 'b2b',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengklasifikasi sampah');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const wasteTypeLabels: Record<string, string> = {
    nasi: '🍚 Nasi',
    sayur: '🥬 Sayur',
    protein: '🍗 Protein',
    buah: '🍎 Buah',
    campuran: '🥗 Campuran',
    lainnya: '📦 Lainnya',
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Scan Sampah Makanan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tidak perlu mengetik. Pilih foto, lalu tekan tombol scan untuk melihat jenis, berat, dan kontaminasi.
        </p>
      </div>

      {/* Upload Section */}
      <div className="space-y-4">
        <ImageUpload
          onImageSelect={setImageBase64}
          disabled={loading}
          sampleUrl={sampleUrl}
        />

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Coba foto contoh</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {sampleImages.map((url, index) => (
              <button
                key={url}
                type="button"
                disabled={loading}
                aria-label={`Pilih foto sample ${index + 1}`}
                aria-pressed={sampleUrl === url}
                onClick={() => {
                  setResult(null);
                  setSampleUrl(url);
                }}
                className={`overflow-hidden rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-primary ${sampleUrl === url ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary'}`}
              >
                <img src={url} alt={`Sample sampah ${index + 1}`} className="h-16 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {imageBase64 && !loading && !result && (
          <Button
            onClick={handleClassify}
            className="w-full h-11 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20"
          >
            <Upload className="mr-2 h-4 w-4" />
            Scan Sekarang
          </Button>
        )}
      </div>

      {/* Loading */}
      {loading && <LoadingState message="AI sedang menganalisis foto sampah..." className="mt-8" />}

      {/* Error */}
      {error && (
        <ErrorState
          message={error}
          onRetry={handleClassify}
          className="mt-8"
        />
      )}

      {/* Result */}
      {result && (
        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Hasil Klasifikasi</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Leaf className="h-3.5 w-3.5" />
                  Jenis Sampah
                </div>
                <p className="text-lg font-semibold">
                  {wasteTypeLabels[result.waste_type] || result.waste_type}
                </p>
              </div>

              <div className="rounded-xl bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Scale className="h-3.5 w-3.5" />
                  Estimasi Berat
                </div>
                <p className="text-lg font-semibold">{result.estimated_weight_kg} kg</p>
              </div>
            </div>

            {/* Contamination */}
            {result.is_contaminated && (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-destructive/5 border border-destructive/20 p-4">
                <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Kontaminasi Terdeteksi</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Jenis kontaminan: {result.contaminant_type || 'Tidak diketahui'}
                  </p>
                </div>
              </div>
            )}

            {!result.is_contaminated && (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 p-4">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm font-medium text-primary">Tidak ada kontaminasi</p>
              </div>
            )}

            {/* Confidence */}
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Confidence: {Math.round(result.confidence * 100)}%</span>
              <span>Provider: {result._meta?.ai_provider}</span>
            </div>
          </div>

          {/* B2B Status */}
          {result.b2b_status && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-chart-4" />
                Status Akumulasi B2B
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Total Pending</span>
                    <span>
                      {result.b2b_status.total_pending_kg} / {result.b2b_status.threshold_kg} kg
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-chart-1 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (result.b2b_status.total_pending_kg / result.b2b_status.threshold_kg) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                {result.b2b_status.threshold_reached && (
                  <p className="text-xs text-primary font-medium">
                    ✅ Threshold tercapai! Pickup otomatis dijadwalkan.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setImageBase64(null);
              }}
              className="flex-1 rounded-xl"
            >
              Upload Lagi
            </Button>
            <Link href="/dashboard" className="flex-1">
              <Button className="w-full rounded-xl">
                Dashboard
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
