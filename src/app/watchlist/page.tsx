'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bookmark, Clock, Trash2, Film, Play, Download, Upload, Check, AlertCircle } from 'lucide-react';
import { DramaItem } from '@/lib/kisskh-api';
import { DramaCard } from '@/components/DramaCard';
import { filterBrowseItems, isHiddenFromBrowse } from '@/lib/browse-policy';
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

export default function WatchlistPage() {
  const [activeTab, setActiveTab] = useState<'watchlist' | 'history'>('watchlist');
  const [watchlistItems, setWatchlistItems] = useState<DramaItem[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<number> | null>(null);
  const visibleWatchlist = hiddenIds ? filterBrowseItems(watchlistItems).filter(item => !hiddenIds.has(item.id)) : [];
  const visibleHistory = hiddenIds ? historyItems.filter(item => !hiddenIds.has(item.dramaId) && !isHiddenFromBrowse({id:item.dramaId,title:item.title})) : [];
  useEffect(() => {
    let active = true;
    void getBrowseHiddenIds([...watchlistItems.map(item => item.id),...historyItems.map(item => item.dramaId)]).then(ids => {if(active) setHiddenIds(ids);});
    return () => {active=false;};
  }, [watchlistItems,historyItems]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
    if (!active) return;
    try {
      const savedWatchlist =
        localStorage.getItem('metromovies_watchlist') ||
        localStorage.getItem('kisskh_watchlist');
      if (savedWatchlist) {
        const obj = JSON.parse(savedWatchlist);
        setWatchlistItems(Object.values(obj));
      }

      const savedHistory =
        localStorage.getItem('metromovies_history') ||
        localStorage.getItem('kisskh_history');
      if (savedHistory) {
        const obj = JSON.parse(savedHistory);
        const list: HistoryItem[] = Object.values(obj);
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        setHistoryItems(list);
      }
    } catch {
      // Ignore
    }
    });
    return () => { active = false; };
  }, []);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string>('');

  const clearHistory = () => {
    localStorage.removeItem('metromovies_history');
    localStorage.removeItem('kisskh_history');
    setHistoryItems([]);
  };

  const clearWatchlist = () => {
    localStorage.removeItem('metromovies_watchlist');
    localStorage.removeItem('kisskh_watchlist');
    setWatchlistItems([]);
  };

  const handleExportBackup = () => {
    try {
      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        watchlist: JSON.parse(
          localStorage.getItem('metromovies_watchlist') ||
          localStorage.getItem('kisskh_watchlist') ||
          '{}'
        ),
        history: JSON.parse(
          localStorage.getItem('metromovies_history') ||
          localStorage.getItem('kisskh_history') ||
          '{}'
        ),
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metromovies-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setNotice('Backup exported successfully!');
      setTimeout(() => setNotice(''), 3000);
    } catch {
      setNotice('Failed to export backup');
      setTimeout(() => setNotice(''), 3000);
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        if (data.watchlist) {
          localStorage.setItem('metromovies_watchlist', JSON.stringify(data.watchlist));
          setWatchlistItems(Object.values(data.watchlist));
        }
        if (data.history) {
          localStorage.setItem('metromovies_history', JSON.stringify(data.history));
          const list: HistoryItem[] = Object.values(data.history);
          list.sort((a, b) => b.updatedAt - a.updatedAt);
          setHistoryItems(list);
        }

        setNotice('Backup restored successfully!');
        setTimeout(() => setNotice(''), 3000);
      } catch {
        setNotice('Invalid backup file');
        setTimeout(() => setNotice(''), 3000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportBackup}
        accept=".json"
        className="hidden"
      />

      {/* Notice Message */}
      {notice && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs font-semibold animate-in fade-in">
          <Check className="w-4 h-4 text-red-400" />
          {notice}
        </div>
      )}

      {/* Page Title & Tabs & Backup Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            My Library
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Your saved titles and watch history stored locally on your device
          </p>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Backup Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold border border-white/5 transition-all shadow-sm"
              title="Download backup file"
            >
              <Download className="w-3.5 h-3.5 text-red-500" />
              Backup
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold border border-white/5 transition-all shadow-sm"
              title="Restore from JSON file"
            >
              <Upload className="w-3.5 h-3.5 text-red-500" />
              Restore
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-[#242424] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('watchlist')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'watchlist'
                  ? 'bg-[#e50914] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Watchlist ({visibleWatchlist.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-[#e50914] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              History ({visibleHistory.length})
            </button>
          </div>
        </div>
      </div>

      {/* Watchlist Tab Content */}
      {activeTab === 'watchlist' && (
        <div className="space-y-6">
          {watchlistItems.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={clearWatchlist}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Watchlist
              </button>
            </div>
          )}

          {visibleWatchlist.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
              {visibleWatchlist.map((item) => (
                <DramaCard key={item.id} drama={item} />
              ))}
            </div>
          ) : (
            <div className="bg-[#242424] rounded-2xl p-16 text-center border border-white/5 space-y-4">
              <Bookmark className="w-16 h-16 text-zinc-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">Your watchlist is empty</h3>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto">
                Explore the latest dramas and movies, and tap &quot;Watchlist&quot; to save them here for later.
              </p>
              <Link
                href="/"
                className="inline-flex px-6 py-2.5 rounded-xl bg-[#e50914] text-white text-xs font-bold"
              >
                Browse Dramas &amp; Movies
              </Link>
            </div>
          )}
        </div>
      )}

      {/* History Tab Content */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {historyItems.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={clearHistory}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear History
              </button>
            </div>
          )}

          {visibleHistory.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibleHistory.map((item) => {
                const percent =
                  item.duration > 0
                    ? Math.min(100, Math.round((item.currentTime / item.duration) * 100))
                    : 0;

                return (
                  <Link
                    key={`${item.dramaId}-${item.episodeNumber}`}
                    href={item.episodeId ? `/drama/${item.dramaId}?ep=${item.episodeId}` : `/drama/${item.dramaId}`}
                    prefetch={false}
                    className="group bg-[#242424] hover:bg-[#2b2b2b] rounded-2xl p-4 border border-white/5 transition-all shadow-md flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                        <span className="px-2 py-0.5 rounded bg-[#e50914]/20 text-[#e50914] font-bold">
                          Episode {item.episodeNumber}
                        </span>
                        <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#e50914] transition-colors line-clamp-1">
                        {item.title}
                      </h4>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#e50914] rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-zinc-500">
                        <span>{percent}% watched</span>
                        <span className="flex items-center gap-1 text-red-500 group-hover:underline">
                          <Play className="w-3 h-3 fill-current" />
                          Resume
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#242424] rounded-2xl p-16 text-center border border-white/5 space-y-4">
              <Clock className="w-16 h-16 text-zinc-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No watch history</h3>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto">
                Episodes you watch will appear here automatically so you can resume where you left off.
              </p>
              <Link
                href="/"
                className="inline-flex px-6 py-2.5 rounded-xl bg-[#e50914] text-white text-xs font-bold"
              >
                Start Watching
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
