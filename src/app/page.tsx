'use client';

import Link from 'next/link';
import {
  Leaf,
  Upload,
  BarChart3,
  ArrowRight,
  Recycle,
  Factory,
  Store,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="organic-hero relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="leaf-orb leaf-orb-left" />
          <div className="leaf-orb leaf-orb-right" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <Recycle className="h-3.5 w-3.5" />
              Pengelolaan sampah makanan yang lebih mudah
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Sampah makanan jadi nilai baru{' '}
              <span className="bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent">
                Sumber Daya Berharga
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              Foto sampah, tekan satu tombol, dan dapatkan hasil yang mudah dipahami.
              CompozeIT membantu tim operasional mengurangi limbah dan menemukan nilai baru.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                <Upload className="h-4 w-4" />
                Mulai Scan Sampah
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Bagaimana CompozeIT Bekerja?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Dari foto sampai keputusan yang jelas, dibantu AI
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Upload,
                title: 'Foto & Klasifikasi',
                desc: 'Upload foto sampah, AI mendeteksi jenis & berat otomatis',
                color: 'bg-primary/10 text-primary',
              },
              {
                icon: Recycle,
                title: 'Matching Processor',
                desc: 'Sistem mencocokkan ke fasilitas pemrosesan terdekat',
                color: 'bg-chart-2/10 text-chart-2',
              },
              {
                icon: Factory,
                title: 'Proses Circular',
                desc: 'Sampah diolah menjadi kompos atau pakan BSF',
                color: 'bg-chart-3/10 text-chart-3',
              },
              {
                icon: Store,
                title: 'Marketplace',
                desc: 'Hasil olahan dijual melalui marketplace terintegrasi',
                color: 'bg-chart-4/10 text-chart-4',
              },
            ].map((step, i) => (
              <div
                key={i}
                className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
              >
                <div className="absolute -top-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${step.color}`}>
                  <step.icon className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="border-t border-border/40 bg-muted/20 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/marketplace" className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-chart-4/10">
                <Store className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Marketplace</h3>
                <p className="text-xs text-muted-foreground">Beli kompos & pakan BSF berkualitas</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-foreground transition-base" />
            </Link>

            <Link href="/impact" className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-chart-1/10">
                <BarChart3 className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Impact Dashboard</h3>
                <p className="text-xs text-muted-foreground">Lihat dampak nyata kita bersama</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-foreground transition-base" />
            </Link>

            <Link href="/upload" className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5 sm:col-span-2 lg:col-span-1">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Leaf className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Klasifikasi Limbah</h3>
                <p className="text-xs text-muted-foreground">Scan limbah bisnis Anda dengan AI</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-foreground transition-base" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
