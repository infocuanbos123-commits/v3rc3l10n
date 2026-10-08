import React from 'react';
import Link from 'next/link';
import { getCatalogPage } from '@/lib/catalog';
import { sharedBrowseSettingsUnavailable } from '@/lib/admin-settings';
import Image from 'next/image';
import { DramaCard } from '@/components/DramaCard';
import { ExploreFilterBar } from '@/components/ExploreFilterBar';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ExplorePageProps {
  searchParams: Promise<{
    country?: string;
    status?: string;
    type?: string;
    order?: string;
    year?: string;
    page?: string;
  }>;
}

export const dynamic = 'force-dynamic'; // Shared admin choices must not remain in a cached page.

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = await searchParams;

  const country = Math.max(0, Math.min(6, Number(params.country) || 0));
  const status = Math.max(0, Math.min(2, Number(params.status) || 0));
  const type = Math.max(0, Math.min(3, Number(params.type) || 0));
  const order = [1, 2, 3].includes(Number(params.order)) ? Number(params.order) : 1;
  const page = Math.max(1, Math.min(100, Math.floor(Number(params.page) || 1)));
  const year = /^20(?:2[0-6])$/.test(params.year || '') ? params.year! : '';

  const result = await getCatalogPage(page, type, country, status, order, year);
  const displayData = result.data;

  // Helper to construct query link
  const makeFilterUrl = (updates: Partial<{ country: number; status: number; type: number; order: number; year: string; page: number }>) => {
    const q = new URLSearchParams();
    const c = updates.country !== undefined ? updates.country : country;
    const s = updates.status !== undefined ? updates.status : status;
    const t = updates.type !== undefined ? updates.type : type;
    const o = updates.order !== undefined ? updates.order : order;
    const y = updates.year !== undefined ? updates.year : year;
    const p = updates.page !== undefined ? updates.page : 1;

    if (c) q.set('country', c.toString());
    if (s) q.set('status', s.toString());
    if (t) q.set('type', t.toString());
    if (o) q.set('order', o.toString());
    if (y) q.set('year', y);
    if (p > 1) q.set('page', p.toString());

    return `/explore?${q.toString()}`;
  };

  // Derive page heading and description based on current selection
  let pageTitle = 'All Dramas & Movies';
  let pageDesc = 'Browse through our complete collection of titles';

  if (type === 3) {
    pageTitle = 'Anime Series';
    pageDesc = 'Discover the best ongoing and completed Japanese & Asian anime series';
  } else if (country === 6) {
    pageTitle = 'Hollywood & Western';
    pageDesc = 'Popular Hollywood movies, Western TV series, and trending US titles';
  } else if (country === 1) {
    pageTitle = 'Korean Dramas (K-Drama)';
    pageDesc = 'Top-rated Korean TV series, romance, thriller, and variety shows';
  } else if (country === 2) {
    pageTitle = 'Chinese Dramas (C-Drama)';
    pageDesc = 'Historical wuxia, modern romance, and fantasy Chinese dramas';
  } else if (type === 2) {
    pageTitle = 'Movies';
    pageDesc = 'Full-length movies and blockbuster feature films';
  } else if (order === 1) {
    pageTitle = 'Latest Updates';
    pageDesc = 'Freshly updated episodes and latest series released today';
  } else if (order === 3) {
    pageTitle = 'Top Rated';
    pageDesc = 'Highest rated drama series and fan-favorite hits';
  }

  return (
    <div className="catalog-page space-y-6">
      {sharedBrowseSettingsUnavailable() && <p role="alert" className="rounded-xl border border-orange-500/30 bg-zinc-900 p-4 text-sm text-zinc-300">Preferensi tampilan katalog sementara tidak tersedia. Coba muat ulang nanti. Pencarian judul tetap dapat digunakan.</p>}
      <div className="catalog-hero">
        {displayData[0]?.thumbnail && <Image src={displayData[0].thumbnail} alt="" fill unoptimized className="catalog-hero-image" />}
        <div className="catalog-hero-shade" />
        <div className="catalog-hero-content">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.3em] uppercase text-red-400">MetroMovies Collection</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">{pageTitle}</h1>
          <p className="mt-3 text-sm text-zinc-300">{pageDesc}</p>
        </div>
      </div>

      {/* Interactive Category & Year Filter Toolbar */}
      <ExploreFilterBar
        currentType={type}
        currentCountry={country}
        currentStatus={status}
        currentOrder={order}
        currentYear={year}
      />

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>
          {displayData.length} judul · Halaman {page}
          {year ? ` · Tahun ${year === '2020' ? '2020 & sebelumnya' : year}` : ''}
        </span>
      </div>

      {year && <p className="text-xs text-zinc-500">Tahun mengikuti informasi judul dari sumber.{result.partial ? ' Hasil yang cocok belum cukup untuk memenuhi halaman ini.' : ''}</p>}
      {!year && result.partial && <p role="status" className="text-xs text-zinc-400">Sebagian katalog belum bisa diperiksa. Coba muat ulang nanti untuk judul tambahan.</p>}
      {/* Grid of Results */}
      {displayData && displayData.length > 0 ? (
        <div className="catalog-grid">
          {displayData.map((item) => (
            <DramaCard key={item.id} drama={item} />
          ))}
        </div>
      ) : (
        <div className="bg-[#242424] rounded-2xl p-12 text-center border border-white/5">
          <p className="text-base text-zinc-300 font-semibold mb-2">
            No dramas found matching this filter
          </p>
          <p className="text-xs text-zinc-500 mb-4">
            Try resetting some filters to browse more titles.
          </p>
          <Link
            href="/explore"
            className="inline-flex px-5 py-2 rounded-xl bg-[#e50914] text-white text-xs font-bold"
          >
            Reset Filters
          </Link>
        </div>
      )}

      {/* Pagination Controls */}
      {(page > 1 || result.hasNext) && (
        <div className="flex items-center justify-center gap-2 pt-6">
          {page > 1 ? (
            <Link
              href={makeFilterUrl({ page: page - 1 })}
              prefetch={false}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Link>
          ) : (
            <div className="flex items-center gap-1 px-4 py-2 rounded-xl bg-zinc-900 text-zinc-600 text-xs font-semibold cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
              Prev
            </div>
          )}

          <span className="px-4 py-2 rounded-xl bg-[#242424] text-xs font-bold text-zinc-300 border border-white/5">
            Halaman {page}
          </span>

          {result.hasNext ? (
            <Link
              href={makeFilterUrl({ page: page + 1 })}
              prefetch={false}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <div className="flex items-center gap-1 px-4 py-2 rounded-xl bg-zinc-900 text-zinc-600 text-xs font-semibold cursor-not-allowed">
              Next
              <ChevronRight className="w-4 h-4" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
