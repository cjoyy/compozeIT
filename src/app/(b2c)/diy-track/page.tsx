'use client';

import { useState } from 'react';
import { useRole } from '@/components/role-provider';
import { ImageUpload } from '@/components/image-upload';
import { LoadingState } from '@/components/loading-state';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import {
  Upload,
  Sprout,
  Clock,
  Lightbulb,
  TreePine,
  ArrowRight,
} from 'lucide-react';

interface DIYGuideResult {
  waste_type: string;
  guide: {
    title: string;
    steps: string[];
    duration_days: number;
    tips: string[];
  };
  recommended_plants: { name: string; reason: string }[];
  _meta?: { ai_provider: string };
}

export default function DIYTrackPage() {
  const { userId } = useRole();
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [classifyLoading, setClassifyLoading] = useState(false);
  const [guideLoading, setGuideLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasteType, setWasteType] = useState<string | null>(null);
  const [weightKg, setWeightKg] = useState<number>(0);
  const [guide, setGuide] = useState<DIYGuideResult | null>(null);

  const handleClassify = async () => {
    if (!imageBase64) return;
    setClassifyLoading(true);
    setError(null);
    setWasteType(null);
    setGuide(null);

    try {
      const res = await fetch('/api/waste/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64, user_id: userId, track: 'diy' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mengklasifikasi');
      setWasteType(data.waste_type);
      setWeightKg(data.estimated_weight_kg);

      // Auto-fetch DIY guide
      await fetchGuide(data.waste_type, data.estimated_weight_kg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setClassifyLoading(false);
    }
  };

  const fetchGuide = async (wt: string, wkg: number) => {
    setGuideLoading(true);
    try {
      const res = await fetch('/api/waste/diy-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waste_type: wt, weight_kg: wkg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menghasilkan panduan');
      setGuide(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghasilkan panduan kompos');
    } finally {
      setGuideLoading(false);
    }
  };

  const wasteTypeLabels: Record<string, string> = {
    nasi: '🍚 Nasi', sayur: '🥬 Sayur', protein: '🍗 Protein',
    buah: '🍎 Buah', campuran: '🥗 Campuran', lainnya: '📦 Lainnya',
  };

  const loading = classifyLoading || guideLoading;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">DIY Kompos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Foto sampah makanan Anda dan dapatkan panduan kompos personal dari AI.
        </p>
      </div>

      {/* Upload */}
      <div className="space-y-4">
        <ImageUpload onImageSelect={setImageBase64} disabled={loading} />
        {imageBase64 && !loading && !guide && (
          <Button onClick={handleClassify} className="w-full h-11 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20">
            <Upload className="mr-2 h-4 w-4" />
            Analisis & Dapatkan Panduan
          </Button>
        )}
      </div>

      {/* Loading */}
      {classifyLoading && <LoadingState message="AI sedang menganalisis sampah..." className="mt-8" />}
      {guideLoading && <LoadingState message="AI sedang membuat panduan kompos..." className="mt-8" />}

      {/* Error */}
      {error && <ErrorState message={error} onRetry={handleClassify} className="mt-8" />}

      {/* Classification Summary */}
      {wasteType && !loading && (
        <div className="mt-6 flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 p-4">
          <span className="text-2xl">{wasteTypeLabels[wasteType]?.split(' ')[0] || '📦'}</span>
          <div>
            <p className="text-sm font-medium">Terdeteksi: {wasteTypeLabels[wasteType] || wasteType}</p>
            <p className="text-xs text-muted-foreground">{weightKg} kg</p>
          </div>
        </div>
      )}

      {/* Guide */}
      {guide && (
        <div className="mt-6 space-y-4">
          {/* Title */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Sprout className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{guide.guide.title}</h2>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {guide.guide.duration_days} hari
              </span>
            </div>
          </div>

          {/* Steps */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Langkah-langkah
            </h3>
            <div className="space-y-3">
              {guide.guide.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed pt-0.5">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          {guide.guide.tips.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-chart-4" />
                Tips
              </h3>
              <ul className="space-y-2">
                {guide.guide.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-chart-4 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Plants */}
          {guide.recommended_plants.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TreePine className="h-4 w-4 text-primary" />
                Tanaman yang Cocok
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {guide.recommended_plants.map((plant, i) => (
                  <div key={i} className="rounded-xl bg-muted/30 p-3">
                    <p className="text-sm font-medium">🌱 {plant.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{plant.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => { setGuide(null); setWasteType(null); setImageBase64(null); setError(null); }}
            className="w-full rounded-xl"
          >
            Scan Sampah Lain
          </Button>
        </div>
      )}
    </div>
  );
}
