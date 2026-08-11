'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/components/role-provider';
import { Leaf, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const B2B_LINKS = [
  { href: '/upload', label: 'Upload Waste' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/impact', label: 'Impact' },
];

const B2C_LINKS = [
  { href: '/sell-track', label: 'Jual Sampah' },
  { href: '/diy-track', label: 'DIY Kompos' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/impact', label: 'Impact' },
];

export function Navbar() {
  const { role, setRole, userName } = useRole();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = role === 'b2b' ? B2B_LINKS : B2C_LINKS;

  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Compoze<span className="text-primary">IT</span>
            </span>
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

          {/* Role Switcher + User */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
              <button
                onClick={() => setRole('b2c')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-base',
                  role === 'b2c'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                B2C
              </button>
              <button
                onClick={() => setRole('b2b')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-base',
                  role === 'b2b'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                B2B
              </button>
            </div>
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">{userName}</span>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-base"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 pb-4 pt-2 space-y-1">
          {/* Role Switcher */}
          <div className="flex items-center gap-2 py-2 mb-2">
            <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5 flex-1">
              <button
                onClick={() => setRole('b2c')}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-medium rounded-md transition-base',
                  role === 'b2c'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                B2C
              </button>
              <button
                onClick={() => setRole('b2b')}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-medium rounded-md transition-base',
                  role === 'b2b'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                B2B
              </button>
            </div>
          </div>
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
