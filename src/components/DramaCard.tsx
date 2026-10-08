'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Film } from 'lucide-react';
import { DramaItem } from '@/lib/kisskh-api';

interface DramaCardProps {
  drama: DramaItem;
  priority?: boolean;
  landscape?: boolean;
}

export function DramaCard({ drama, priority = false, landscape = false }: DramaCardProps) {
  const [imgError, setImgError] = useState(false);

  // Fallback poster generator if image link is broken
  const posterUrl = !imgError && drama.thumbnail ? drama.thumbnail : null;

  return (
    <Link
      href={`/drama/${drama.id}`}
      prefetch={false}
      data-drama-card
      className="group relative flex flex-col bg-[#181818] rounded-md overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50"
    >
      {/* Poster Container */}
      <div className={`relative ${landscape ? 'aspect-[16/10]' : 'aspect-[2/3]'} w-full bg-zinc-900 overflow-hidden`} style={{ position: 'relative' }}>
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={drama.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={priority}
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-zinc-500 bg-zinc-900">
            <Film className="w-10 h-10 mb-2 stroke-1" />
            <span className="text-xs text-center line-clamp-2">{drama.title}</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
          {drama.episodesCount ? (
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-[#e50914] text-white shadow-md">
              EP {drama.episodesCount}
            </span>
          ) : (
            <span />
          )}

          {drama.label && (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-600/90 text-white backdrop-blur-sm shadow-md">
              {drama.label}
            </span>
          )}
        </div>

        {/* Gradient shadow at bottom of image */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#252525] via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full bg-[#e50914] text-white flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Drama Metadata */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <h3
          title={drama.title}
          className="text-sm font-semibold text-zinc-100 group-hover:text-[#e50914] transition-colors line-clamp-2 leading-snug"
        >
          {drama.title}
        </h3>
        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
          <span className="flex items-center gap-1">
            <Film className="w-3 h-3 text-zinc-500" />
            {drama.episodesCount === 1 ? 'Movie' : 'Series'}
          </span>
          <span className="text-red-500/80 font-medium hover:underline">Watch now</span>
        </div>
      </div>
    </Link>
  );
}
