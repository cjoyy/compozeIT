'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Building2, ChevronRight, CircleCheck, MapPin, ScanLine, UserRound } from 'lucide-react';
import { useRole } from '@/components/role-provider';

export default function ProfilePage() {
  const { userName, businessName } = useRole();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="organic-hero relative h-28" />
        <div className="relative px-5 pb-6">
          <div className="-mt-11 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-card bg-white shadow-sm">
            <Image src="/logo.png" alt="Logo CompozeIT" width={64} height={64} className="h-12 w-12 object-contain" />
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-primary">Akun bisnis</p>
            <h1 className="mt-1 text-2xl font-bold">{userName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{businessName}</p>
          </div>
        </div>
      </div>

      <section className="mt-5 space-y-3">
        <h2 className="px-1 text-sm font-semibold">Informasi bisnis</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <InfoRow icon={<Building2 />} label="Jenis akun" value="Bisnis mitra CompozeIT" />
          <InfoRow icon={<MapPin />} label="Area layanan" value="Jakarta Selatan" />
          <InfoRow icon={<CircleCheck />} label="Status langganan" value="Aktif" />
        </div>
      </section>

      <section className="mt-5 space-y-3">
        <h2 className="px-1 text-sm font-semibold">Paket layanan</h2>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Paket aktif</p>
              <h3 className="mt-1 text-xl font-bold">KoSEDANG</h3>
              <p className="mt-1 text-sm text-muted-foreground">Cocok untuk bisnis yang mengalihkan hingga 70 kg sampah makanan setiap bulan.</p>
            </div>
              <p className="text-right text-sm font-semibold">Rp 600.000<span className="block text-xs font-normal text-muted-foreground">/bulan</span></p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-background p-3"><p className="font-bold">70 kg</p><p className="mt-1 text-muted-foreground">batas/bulan</p></div>
            <div className="rounded-xl bg-background p-3"><p className="font-bold">Rp8.571</p><p className="mt-1 text-muted-foreground">per kg</p></div>
            <div className="rounded-xl bg-background p-3"><p className="font-bold">Aktif</p><p className="mt-1 text-muted-foreground">status</p></div>
          </div>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <p><span className="font-semibold text-foreground">KoMINI</span> · Rp300.000 · 30 kg/bulan</p>
          <p><span className="font-semibold text-foreground">KoSEDANG</span> · Rp600.000 · 70 kg/bulan</p>
          <p><span className="font-semibold text-foreground">KoBESAR</span> · Rp1.100.000 · 170 kg/bulan</p>
        </div>
        <p className="text-xs text-muted-foreground">Pemakaian bulan berjalan dapat dilihat di Ringkasan Bisnis. Saldo cashback dapat dipakai untuk renewal layanan, dengan biaya renewal Rp300.000 per bulan.</p>
      </section>

      <section className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex gap-3">
          <ScanLine className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Butuh mencatat sampah hari ini?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pilih foto sampah. Kami bantu membaca jenis dan potensi kontaminasinya.</p>
            <Link href="/upload" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Scan sampah sekarang <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <p className="mt-5 flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <UserRound className="h-4 w-4" /> Kelola informasi bisnis dan mulai pencatatan sampah dari sini.
      </p>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-0">
      <span className="text-primary [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
      <span className="flex-1 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}
