'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, Calendar, Globe, Film, CheckCircle2, ArrowUpDown, X } from 'lucide-react';

interface ExploreFilterBarProps {
  currentType: number;
  currentCountry: number;
  currentStatus: number;
  currentOrder: number;
  currentYear: string;
}

const TYPES = [
  { label: 'Semua Tipe', value: 0 },
  { label: 'Series Drama', value: 1 },
  { label: 'Film / Movies', value: 2 },
  { label: 'Anime Series', value: 3 },
];

const COUNTRIES = [
  { label: 'Semua Negara', value: 0 },
  { label: 'Korea (K-Drama)', value: 1 },
  { label: 'China (C-Drama)', value: 2 },
  { label: 'Jepang (J-Drama/Anime)', value: 3 },
  { label: 'Thailand (Lakorn)', value: 4 },
  { label: 'Taiwan', value: 5 },
  { label: 'Hollywood / Barat', value: 6 },
];

const YEARS = [
  { label: 'Semua Tahun', value: '' },
  { label: '2026', value: '2026' },
  { label: '2025', value: '2025' },
  { label: '2024', value: '2024' },
  { label: '2023', value: '2023' },
  { label: '2022', value: '2022' },
  { label: '2021', value: '2021' },
  { label: '2020 & Lama', value: '2020' },
];

const STATUSES = [
  { label: 'Semua Status', value: 0 },
  { label: 'Ongoing (Tayang)', value: 1 },
  { label: 'Completed (Tamat)', value: 2 },
];

const ORDERS = [
  { label: 'Paling Baru Update', value: 1 },
  { label: 'Paling Populer (Views)', value: 2 },
  { label: 'Rating Tertinggi', value: 3 },
];

export function ExploreFilterBar({
  currentType,
  currentCountry,
  currentStatus,
  currentOrder,
  currentYear,
}: ExploreFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  const applyFilter = (key: string, value: string | number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1'); // Reset to page 1 on filter change

    if (!value || value === 0 || value === '') {
      params.delete(key);
    } else {
      params.set(key, value.toString());
    }

    router.push(`/explore?${params.toString()}`);
  };

  const resetAllFilters = () => {
    router.push('/explore');
  };

  const hasActiveFilters =
    currentType !== 0 ||
    currentCountry !== 0 ||
    currentStatus !== 0 ||
    currentOrder !== 1 ||
    Boolean(currentYear);

  return (
    <div className="bg-[#181818] border border-white/10 rounded-lg p-4 sm:p-5 space-y-4">
      {/* Top Filter Bar Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Filter className="w-4 h-4 text-[#e50914]" />
          <span>Filter & Kategori Film</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 rounded-full bg-[#e50914]/20 text-[#e50914] text-[11px] font-semibold border border-[#e50914]/30">
              Aktif
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg hover:bg-zinc-800"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filter
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors sm:hidden"
          >
            {isExpanded ? 'Tutup Filter' : 'Buka Semua Filter'}
          </button>
        </div>
      </div>

      {/* Primary Type Selector (Always Visible, Horizontal Pills) */}
      <div className="space-y-1.5">
        <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-[#e50914]" />
          Jenis Film
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => applyFilter('type', t.value)}
              className={`shrink-0 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currentType === t.value
                  ? 'bg-[#e50914] text-white shadow-md'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Rows Container: Responsive Accordion on Mobile, Full on Desktop */}
      <div className={`space-y-4 pt-1 border-t border-white/5 ${isExpanded ? 'block' : 'hidden sm:block'}`}>
        {/* Year Filter */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-red-400" />
            Tahun Rilis
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-wrap">
            {YEARS.map((y) => (
              <button
                key={y.value}
                onClick={() => applyFilter('year', y.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  (currentYear || '') === y.value
                    ? 'bg-[#e50914] text-white font-bold shadow'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                {y.label}
              </button>
            ))}
          </div>
        </div>

        {/* Country / Category Filter */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            Negara / Kategori
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-wrap">
            {COUNTRIES.map((c) => (
              <button
                key={c.value}
                onClick={() => applyFilter('country', c.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  currentCountry === c.value
                    ? 'bg-[#e50914] text-white font-bold shadow'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status & Sorting (Grid on Desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Status Tayang
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => applyFilter('status', s.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    currentStatus === s.value
                      ? 'bg-[#e50914] text-white font-bold shadow'
                      : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Order */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
              Urutkan Berdasarkan
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ORDERS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => applyFilter('order', o.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    currentOrder === o.value
                      ? 'bg-[#e50914] text-white font-bold shadow'
                      : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
