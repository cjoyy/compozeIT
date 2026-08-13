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
        <UserRound className="h-4 w-4" /> Profil ini memakai data demo bisnis untuk presentasi.
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
