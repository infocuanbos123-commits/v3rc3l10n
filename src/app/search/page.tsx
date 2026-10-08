import React from 'react';
import Link from 'next/link';
import { searchDramas } from '@/lib/kisskh-api';
import { DramaCard } from '@/components/DramaCard';
import { Search, Film } from 'lucide-react';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || '';
  const type = parseInt(params.type || '0', 10);

  let searchError = '';
  const results = query ? await searchDramas(query, type).catch(() => { searchError = 'Pencarian sumber sedang tidak tersedia. Coba lagi nanti.'; return []; }) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Search className="w-7 h-7 text-[#e50914]" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Search Results
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Found {results.length} result(s) for &quot;
              <strong className="text-white">{query}</strong>&quot;
            </p>
          </div>
        </div>

        {/* Search Bar on Search Page */}
        <form action="/search" method="GET" className="relative w-full sm:w-72">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search titles..."
            className="w-full bg-[#242424] text-xs text-zinc-200 placeholder-zinc-500 rounded-xl pl-9 pr-4 py-2.5 border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-[#e50914]"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </form>
      </div>

      {/* Results Grid */}
      {results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
          {results.map((item) => (
            <DramaCard key={item.id} drama={item} />
          ))}
        </div>
      ) : (
        <div className="bg-[#242424] rounded-2xl p-16 text-center border border-white/5 space-y-4">
          <Film className="w-16 h-16 text-zinc-600 mx-auto" />
          <h2 className="text-lg font-bold text-white">{searchError || 'No results found'}</h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            We couldn&apos;t find any dramas or movies matching &quot;{query}&quot;. Try searching with other keywords or browse our categories.
          </p>
          <Link
            href="/"
            className="inline-flex px-6 py-2.5 rounded-xl bg-[#e50914] text-white text-xs font-bold shadow-lg shadow-[#e50914]/20"
          >
            Back to Home
          </Link>
        </div>
      )}
    </div>
  );
}
