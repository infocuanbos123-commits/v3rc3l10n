'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search,
  Menu,
  X,
  Bookmark,
  Sparkles,
  Film,
  Tv,
  Clapperboard,
  Loader2,
} from 'lucide-react';
import { Logo } from './Logo';
import { DramaItem } from '@/lib/kisskh-api';

export function Navbar() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DramaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounce meaningful queries and discard results from cancelled searches.
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const query = searchQuery.trim().replace(/\s+/g, ' ');
    if (query.length < 3) {
      queueMicrotask(() => { if (active) { setSearchResults([]); setIsSearching(false); } });
      return () => { active = false; };
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');
      try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(query), { signal: controller.signal, cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (active) setSearchResults(Array.isArray(data) ? data.slice(0, 8) : []);
        } else if (active) {
          setSearchResults([]);
          setSearchError('Pencarian sumber tidak tersedia. Coba lagi.');
        }
      } catch (err) {
        if (active) { console.error('Search error:', err); setSearchResults([]); setSearchError('Pencarian gagal. Coba lagi.'); }
      } finally { if (active) setIsSearching(false); }
    }, 600);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [searchQuery]);

  // Click outside listener for search popup
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { label: 'Home', href: '/', icon: Tv },
    { label: 'Movies', href: '/explore?type=2', icon: Film },
    { label: 'Hollywood', href: '/explore?country=6', icon: Clapperboard },
    { label: 'Series', href: '/explore?type=1', icon: Tv },
    { label: 'K-Drama', href: '/explore?country=1', icon: Sparkles },
    { label: 'C-Drama', href: '/explore?country=2', icon: Clapperboard },
    { label: 'Anime', href: '/explore?type=3', icon: Film },
    { label: 'Watchlist', href: '/watchlist', icon: Bookmark },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#141414]/95 backdrop-blur-xl border-b border-white/5">
      <div className="mx-auto px-4 sm:px-6 lg:px-12 py-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-5 gap-y-3">
        {/* Left: Mobile Menu Trigger + Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="2xl:hidden p-2 text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-colors"
            aria-label="Toggle navigation"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <Logo />
        </div>

        {/* Center: Desktop Nav */}
        <nav className="hidden 2xl:flex items-center gap-1 text-[13px] font-medium whitespace-nowrap">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors"
              >
                <Icon className="w-4 h-4 text-zinc-400" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Search Box + Auth Button */}
        <div className="flex w-full items-center gap-3 justify-end md:w-auto md:flex-1 md:max-w-md">
          <div className="relative w-full md:max-w-xs" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="search"
                aria-label="Search movies and series"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Search dramas, movies..."
                className="w-full bg-black/35 text-zinc-100 placeholder-zinc-500 text-sm rounded-md pl-10 pr-9 py-2 focus:outline-none focus:ring-2 focus:ring-[#e50914]/60 border border-white/5 transition-all shadow-inner"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-red-500 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </form>

            {/* Search Dropdown Modal */}
            {isSearchOpen && (searchQuery.trim().length >= 3 || isSearching) && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-[#252525] border border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                {searchError ? <div role="alert" className="p-4 text-center text-sm text-zinc-400">{searchError}</div> : isSearching && searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-zinc-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                    Searching MetroMovies...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-zinc-800">
                    {searchResults.map((item) => (
                      <Link
                        key={item.id}
                        href={`/drama/${item.id}`}
                        prefetch={false}
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-3 p-2.5 hover:bg-zinc-800/80 transition-colors group"
                      >
                        <div className="relative w-11 h-14 bg-zinc-900 rounded overflow-hidden flex-shrink-0" style={{ position: 'relative' }}>
                          {item.thumbnail ? (
                            <Image
                              src={item.thumbnail}
                              alt={item.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Film className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-100 group-hover:text-[#e50914] truncate transition-colors">
                            {item.title}
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                            {item.episodesCount ? (
                              <span className="text-red-400 font-semibold">
                                {item.episodesCount} Episodes
                              </span>
                            ) : (
                              <span>Series</span>
                            )}
                            {item.label && <span className="text-zinc-500">• {item.label}</span>}
                          </div>
                        </div>
                      </Link>
                    ))}
                    <Link
                      href={`/search?q=${encodeURIComponent(searchQuery)}`}
                      onClick={() => setIsSearchOpen(false)}
                      className="block p-2.5 text-center text-xs font-semibold text-red-400 hover:bg-zinc-800 bg-[#202020] transition-colors"
                    >
                      View all results for &quot;{searchQuery}&quot; →
                    </Link>
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-zinc-400">
                    No dramas found for &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Watchlist Quick Button */}
          <Link
            href="/watchlist"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-medium text-xs border border-white/5 transition-all flex-shrink-0"
            title="My Saved Watchlist"
          >
            <Bookmark className="w-3.5 h-3.5 text-red-500" />
            <span className="hidden sm:inline">Watchlist</span>
          </Link>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="2xl:hidden bg-[#141414] border-b border-white/5 px-4 pt-2 pb-4 space-y-1 animate-in slide-in-from-top duration-200">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <Icon className="w-5 h-5 text-red-500" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
