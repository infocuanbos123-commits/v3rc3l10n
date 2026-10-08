'use client';

import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, Play } from 'lucide-react';
import { EpisodeItem } from '@/lib/kisskh-api';

interface EpisodeListProps {
  episodes: EpisodeItem[];
  currentEpisodeId: number;
  onSelectEpisode: (ep: EpisodeItem) => void;
  dramaId: number;
}

export function EpisodeList({
  episodes,
  currentEpisodeId,
  onSelectEpisode,
  dramaId,
}: EpisodeListProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [watchedEpNumbers, setWatchedEpNumbers] = useState<number[]>([]);

  // Load watched history
  useEffect(() => {
    try {
      const historyStr = localStorage.getItem('metromovies_history') || localStorage.getItem('kisskh_history');
      if (historyStr) {
        const history = JSON.parse(historyStr);
        const item = history[dramaId];
        if (item && item.episodeNumber) {
          setWatchedEpNumbers([item.episodeNumber]);
        }
      }
    } catch {
      // Ignore
    }
  }, [dramaId, currentEpisodeId]);

  const filtered = episodes.filter((ep) =>
    ep.number.toString().includes(filterQuery.trim())
  );

  return (
    <div className="bg-[#242424] rounded-2xl p-4 sm:p-5 border border-white/5 shadow-xl">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-white tracking-wide">
            Episodes ({episodes.length})
          </h3>
        </div>

        {episodes.length > 12 && (
          <div className="relative w-full sm:w-44">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Ep number..."
              className="w-full bg-[#141414] text-xs text-zinc-200 placeholder-zinc-500 rounded-lg pl-8 pr-3 py-1.5 border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-[#e50914]"
            />
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        )}
      </div>

      {/* Grid of Episode Buttons */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-72 overflow-y-auto pr-1">
        {filtered.map((ep) => {
          const isCurrent = ep.id === currentEpisodeId;
          const isWatched = watchedEpNumbers.includes(ep.number);

          return (
            <button
              key={ep.id}
              onClick={() => onSelectEpisode(ep)}
              className={`relative flex items-center justify-center py-2.5 px-1 rounded-xl text-xs font-bold transition-all duration-200 ${
                isCurrent
                  ? 'bg-[#e50914] text-white shadow-lg shadow-[#e50914]/30 scale-105'
                  : 'bg-[#2e2e2e] hover:bg-[#383838] text-zinc-200 hover:text-white border border-white/5'
              }`}
            >
              {isCurrent ? (
                <div className="flex items-center gap-1">
                  <Play className="w-3 h-3 fill-black" />
                  <span>{ep.number}</span>
                </div>
              ) : (
                <span>{ep.number}</span>
              )}

              {isWatched && !isCurrent && (
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 absolute top-1 right-1" />
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-6 text-xs text-zinc-500">
          No episode matches &quot;{filterQuery}&quot;
        </div>
      )}
    </div>
  );
}
