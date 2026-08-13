'use client';

import { useEffect, useState } from 'react';
import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import {
  Store,
  Filter,
  Leaf,
  Package,
  ArrowUpDown,
  X,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketplaceListing {
  id: string;
  processor_id: string;
  processor_name: string;
  processor_type: string;
  product_type: 'compost' | 'bsf';
  price_per_kg: number;
  stock_kg: number;
  npk_content: string | null;
  description: string | null;
  created_at: string;
}

const FALLBACK_LISTINGS: MarketplaceListing[] = [
  {
    id: 'demo-compost-1',
    processor_id: 'demo-processor-kompos',
    processor_name: 'Green Cycle Compost Hub',
    processor_type: 'compost',
    product_type: 'compost',
    price_per_kg: 12000,
    stock_kg: 820,
    npk_content: '2-1-2',
    description: 'Kompos matang dari limbah dapur hotel dan kantin, cocok untuk urban farming dan taman kantor.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-bsf-1',
    processor_id: 'demo-processor-bsf',
    processor_name: 'BSF Nusantara Feed',
    processor_type: 'bsf',
    product_type: 'bsf',
    price_per_kg: 16500,
    stock_kg: 460,
    npk_content: null,
    description: 'Pakan maggot kering hasil pengolahan sampah makanan bersih dengan standar traceability batch.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-compost-2',
    processor_id: 'demo-processor-kompos-2',
    processor_name: 'Kebun Sirkular Jakarta',
    processor_type: 'compost',
    product_type: 'compost',
    price_per_kg: 19000,
    stock_kg: 540,
    npk_content: '3-1-2',
    description: 'Kompos premium untuk landscaping komersial dengan bahan baku food waste terpilah.',
    created_at: new Date().toISOString(),
  },
];

export default function MarketplacePage() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setUsingFallback] = useState(false);
  const [filter, setFilter] = useState<'all' | 'compost' | 'bsf'>('all');
  const [sortBy, setSortBy] = useState<'price' | 'stock'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadListings() {
      setLoading(true);
      setUsingFallback(false);
      try {
        const params = new URLSearchParams();
        if (filter !== 'all') params.set('product_type', filter);
        params.set('sort_by', sortBy === 'price' ? 'price_per_kg' : 'stock_kg');
        params.set('sort_order', sortOrder);

        const res = await fetchWithTimeout(`/api/marketplace?${params}`, {}, 2500);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Gagal memuat listing');
        if (active) setListings(data.listings || []);
      } catch {
        if (active) {
          const filteredListings = filter === 'all'
            ? FALLBACK_LISTINGS
            : FALLBACK_LISTINGS.filter((listing) => listing.product_type === filter);
          const fallbackListings = [...filteredListings].sort((a, b) => {
            const left = sortBy === 'price' ? a.price_per_kg : a.stock_kg;
            const right = sortBy === 'price' ? b.price_per_kg : b.stock_kg;
            return sortOrder === 'asc' ? left - right : right - left;
          });

          setListings(fallbackListings);
          setUsingFallback(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadListings();
    return () => {
      active = false;
    };
  }, [filter, sortBy, sortOrder]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-chart-4/20 bg-chart-4/5 px-3 py-1 text-xs font-medium text-chart-4">
            <ClipboardList className="h-3.5 w-3.5" />
            Produk hasil pengolahan
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Katalog Hasil Olahan</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Pilih produk olahan dari mitra kami. Sampaikan kebutuhan Anda, lalu tim kami membantu proses pemesanan.
          </p>
        </div>
        <div className="max-w-sm rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          <p className="font-semibold">Cara memilih produk</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Kompos digunakan untuk memperbaiki media tanam. Pakan BSF berasal dari larva lalat tentara hitam untuk kebutuhan pakan ternak dan ikan.</p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-border bg-card p-4 text-sm sm:grid-cols-3">
        <div><p className="font-semibold text-primary">Kompos</p><p className="mt-1 text-xs text-muted-foreground">Pupuk organik untuk kebun, taman, dan urban farming.</p></div>
        <div><p className="font-semibold text-chart-4">BSF</p><p className="mt-1 text-xs text-muted-foreground">Singkatan dari Black Soldier Fly, atau maggot, yang dapat diolah menjadi pakan.</p></div>
        <div><p className="font-semibold">NPK</p><p className="mt-1 text-xs text-muted-foreground">Ringkasan kandungan Nitrogen, Fosfor, dan Kalium pada kompos.</p></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filter:
        </div>
        <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
          {(['all', 'compost', 'bsf'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-base',
                filter === f
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? 'Semua' : f === 'compost' ? 'Kompos' : 'Pakan BSF'}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            if (sortBy === 'price') {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            } else {
              setSortBy('price');
              setSortOrder('asc');
            }
          }}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-base',
            sortBy === 'price' ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          <ArrowUpDown className="h-3 w-3" />
          Harga {sortBy === 'price' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
        </button>

        <button
          onClick={() => {
            if (sortBy === 'stock') {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            } else {
              setSortBy('stock');
              setSortOrder('desc');
            }
          }}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-base',
            sortBy === 'stock' ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          <ArrowUpDown className="h-3 w-3" />
          Stok {sortBy === 'stock' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
        </button>
      </div>

      {/* Content */}
      {loading && <LoadingState message="Memuat listing..." />}
      {!loading && listings.length === 0 && (
        <div className="text-center py-16">
          <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Tidak ada listing ditemukan.</p>
        </div>
      )}

      {!loading && listings.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <div
              key={listing.id}
              onClick={() => { setSelectedListing(listing); setRequestSent(false); }}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedListing(listing); setRequestSent(false); } }}
              role="button"
              tabIndex={0}
              className="group cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              {/* Product type badge */}
              <div className="flex items-center justify-between mb-3">
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                  listing.product_type === 'compost'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-chart-4/10 text-chart-4'
                )}>
                  {listing.product_type === 'compost' ? <Leaf className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                  {listing.product_type === 'compost' ? 'Kompos siap pakai' : 'Pakan BSF (maggot)'}
                </span>
                {listing.npk_content && (
                  <span className="text-xs text-muted-foreground">NPK: {listing.npk_content}</span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm font-medium line-clamp-2 mb-2 min-h-[2.5rem]">
                {listing.description || `${listing.product_type === 'compost' ? 'Kompos' : 'BSF'} dari ${listing.processor_name}`}
              </p>

              {/* Price & Stock */}
              <div className="flex items-end justify-between mt-3">
                <div>
                  <p className="text-xl font-bold">Rp {listing.price_per_kg.toLocaleString('id-ID')}</p>
                  <p className="text-xs text-muted-foreground">/kg</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Stok: {Number(listing.stock_kg).toLocaleString('id-ID')} kg
                </p>
              </div>

              {/* Processor */}
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground truncate">
                  🏭 Diproses oleh {listing.processor_name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="marketplace-dialog-title" onClick={() => setSelectedListing(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                selectedListing.product_type === 'compost' ? 'bg-primary/10 text-primary' : 'bg-chart-4/10 text-chart-4'
              )}>
                {selectedListing.product_type === 'compost' ? 'Kompos siap pakai' : 'Pakan BSF (maggot)'}
              </span>
              <button onClick={() => setSelectedListing(null)} aria-label="Tutup detail produk" className="p-1.5 rounded-lg hover:bg-muted transition-base">
                <X className="h-4 w-4" />
              </button>
            </div>

            <h2 id="marketplace-dialog-title" className="text-base font-semibold">{selectedListing.description || 'Produk dari ' + selectedListing.processor_name}</h2>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Harga</p>
                <p className="text-lg font-bold">Rp {selectedListing.price_per_kg.toLocaleString('id-ID')}/kg</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Stok Tersedia</p>
                <p className="text-lg font-bold">{selectedListing.stock_kg} kg</p>
              </div>
            </div>

            {selectedListing.npk_content && (
              <div className="mt-3 rounded-xl bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs text-muted-foreground">Kandungan NPK (Nitrogen, Fosfor, Kalium)</p>
                <p className="text-lg font-bold text-primary">{selectedListing.npk_content}</p>
              </div>
            )}

            <div className="mt-4 rounded-xl bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Mitra pengolahan</p>
              <p className="text-sm font-medium">🏭 {selectedListing.processor_name}</p>
            </div>

            {requestSent ? (
              <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
                <p className="font-semibold">Permintaan Anda sudah diterima.</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Terima kasih. Anda akan dihubungi oleh pihak kami dalam waktu kurang dari 2 jam. Mohon menunggu.</p>
              </div>
            ) : (
              <Button className="mt-5 h-11 w-full rounded-xl text-sm font-semibold" onClick={() => setRequestSent(true)}>
                Setujui dan minta dihubungi
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
