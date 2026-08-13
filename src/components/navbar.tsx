'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/components/role-provider';
import { Menu, UserRound, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const B2B_LINKS = [
  { href: '/upload', label: 'Scan Sampah' },
  { href: '/dashboard', label: 'Ringkasan' },
  { href: '/logistics', label: 'Jemputan' },
  { href: '/marketplace', label: 'Hasil Olahan' },
  { href: '/compliance', label: 'Laporan' },
  { href: '/impact', label: 'Dampak' },
  { href: '/profile', label: 'Profil Bisnis' },
];

export function Navbar() {
  const { userName } = useRole();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = B2B_LINKS;

  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" aria-label="CompozeIT beranda">
            <Image src="/logo.png" alt="CompozeIT" width={132} height={44} priority className="h-9 w-auto object-contain" />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-lg transition-base',
                  pathname === link.href || pathname.startsWith(link.href + '/')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Demo business user */}
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
          <p className="text-xs text-muted-foreground px-3 pb-2">{userName}</p>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'block px-3 py-2.5 text-sm font-medium rounded-lg transition-base',
                pathname === link.href || pathname.startsWith(link.href + '/')
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
