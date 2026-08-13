'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/components/role-provider';
import { BarChart3, Menu, ScanLine, Truck, UserRound, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const PRIMARY_LINKS = [
  { href: '/upload', label: 'Scan', icon: ScanLine },
  { href: '/dashboard', label: 'Ringkasan', icon: BarChart3 },
  { href: '/logistics', label: 'Jemputan', icon: Truck },
];

const INSIGHT_LINKS = [
  { href: '/marketplace', label: 'Hasil Olahan' },
  { href: '/compliance', label: 'Laporan' },
  { href: '/impact', label: 'Dampak' },
];

export function Navbar() {
  const { userName } = useRole();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" aria-label="CompozeIT beranda">
            <Image src="/logo.png" alt="CompozeIT" width={132} height={44} priority className="h-9 w-auto object-contain" />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1 rounded-xl border border-border/70 bg-card/70 p-1 shadow-sm">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-base',
                  isActive(link.href)
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </div>

          {/* Demo business user */}
          <div className="hidden lg:flex items-center gap-1">
            {INSIGHT_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={cn('rounded-lg px-2.5 py-2 text-xs font-medium transition-base', isActive(link.href) ? 'text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/profile" className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
              <UserRound className="h-4 w-4" />
              <span className="max-w-[120px] truncate">{userName}</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Tutup navigasi' : 'Buka navigasi'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-base"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div id="mobile-navigation" className="md:hidden border-t border-border bg-background px-4 pb-4 pt-2 space-y-1">
          <Link href="/profile" onClick={() => setMobileOpen(false)} className="mb-2 flex items-center gap-2 rounded-xl bg-muted/70 px-3 py-3 text-sm font-semibold">
            <UserRound className="h-4 w-4 text-primary" /> {userName}
          </Link>
          <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Operasional</p>
          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'block px-3 py-2.5 text-sm font-medium rounded-lg transition-base',
                isActive(link.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              >
              <link.icon className="mr-2 inline h-4 w-4" />
              {link.label}
            </Link>
          ))}
          <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Informasi</p>
          {INSIGHT_LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className={cn('block rounded-lg px-3 py-2.5 text-sm font-medium transition-base', isActive(link.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
