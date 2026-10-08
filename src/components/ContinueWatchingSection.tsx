'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { History, Play, Trash2, ArrowRight } from 'lucide-react';
import { isHiddenFromBrowse } from '@/lib/browse-policy';
import { getBrowseHiddenIds } from '@/lib/browse-client';

interface HistoryItem {
  dramaId: number;
  title: string;
  thumbnail?: string;
  episodeNumber: number;
  episodeId?: number;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export function ContinueWatchingSection() {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
    if (!active) return;
    try {
      const historyStr =
        localStorage.getItem('metromovies_history') ||
        localStorage.getItem('kisskh_history');
      if (historyStr) {
        const obj = JSON.parse(historyStr);
        const list: HistoryItem[] = Object.values(obj);
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        const hidden = await getBrowseHiddenIds(list.map(item => item.dramaId));
        if (active) setHistoryList(list.filter(item => !hidden.has(item.dramaId) && !isHiddenFromBrowse({ id: item.dramaId, title: item.title })).slice(0, 10));
      }
    } catch {
      // Ignore localStorage parse errors
    } finally {
      setIsLoaded(true);
    }
    });
    return () => { active = false; };
  }, []);

  const removeItem = (e: React.MouseEvent, dramaId: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const historyStr =
        localStorage.getItem('metromovies_history') ||
        localStorage.getItem('kisskh_history');
      if (historyStr) {
        const obj = JSON.parse(historyStr);
        delete obj[dramaId];
        localStorage.setItem('metromovies_history', JSON.stringify(obj));
        setHistoryList((prev) => prev.filter((item) => item.dramaId !== dramaId));
      }
    } catch {
      // Ignore
    }
  };

  if (!isLoaded || historyList.length === 0) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#e50914]/10 text-[#e50914] border border-[#e50914]/20">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Lanjut Nonton <span className="text-xs font-normal text-zinc-400">(Tersimpan di Cache Lokal)</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Riwayat tontonan terakhir lo, klik untuk langsung melanjutkan dari menit terakhir
            </p>
          </div>
        </div>

        <Link
          href="/watchlist"
          className="text-xs font-semibold text-zinc-400 hover:text-[#e50914] flex items-center gap-1 transition-colors"
        >
          Lihat Semua
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Horizontal Carousel List */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x">
        {historyList.map((item) => {
          const progress = item.duration > 0 ? Math.min(100, Math.round((item.currentTime / item.duration) * 100)) : 0;
          const targetUrl = item.episodeId
            ? `/drama/${item.dramaId}?ep=${item.episodeId}`
            : `/drama/${item.dramaId}`;

          return (
            <div
              key={item.dramaId}
              className="snap-start shrink-0 w-64 sm:w-72 bg-[#1f1f1f] border border-white/5 rounded-2xl overflow-hidden hover:border-[#e50914]/40 transition-all group flex flex-col justify-between shadow-lg"
            >
              <Link href={targetUrl} prefetch={false} className="block relative aspect-video bg-zinc-900 overflow-hidden">
                {item.thumbnail ? (
                  <Image
                    src={item.thumbnail}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                    <Play className="w-8 h-8 opacity-40" />
                  </div>
                )}

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* Play Button Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-[#e50914] text-white flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Episode Badge */}
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#e50914] text-white text-[11px] font-black uppercase shadow">
                  EP {item.episodeNumber || 1}
                </span>

                {/* Delete from history button */}
                <button
                  onClick={(e) => removeItem(e, item.dramaId)}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-red-500/80 text-zinc-300 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                  title="Hapus dari riwayat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Progress Bar at bottom of thumbnail */}
                <div className="absolute bottom-0 inset-x-0 h-1.5 bg-zinc-800">
                  <div
                    className="h-full bg-[#e50914] transition-all"
                    style={{ width: `${Math.max(5, progress)}%` }}
                  />
                </div>
              </Link>

              {/* Title & Info */}
              <div className="p-3.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={targetUrl}
                    prefetch={false}
                    className="font-bold text-sm text-zinc-100 group-hover:text-[#e50914] transition-colors truncate block"
                    title={item.title}
                  >
                    {item.title}
                  </Link>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                    <span>{formatTime(item.currentTime)}</span>
                    <span>•</span>
                    <span className="text-red-400/90 font-medium">{progress}% Ditonton</span>
                  </div>
                </div>

                <Link
                  href={targetUrl}
                  prefetch={false}
                  className="shrink-0 p-2 rounded-xl bg-zinc-800 group-hover:bg-[#e50914] text-zinc-300 group-hover:text-white transition-colors"
                  title="Lanjut Nonton"
                >
                  <Play className="w-4 h-4 fill-current" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
