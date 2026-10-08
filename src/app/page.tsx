import Link from 'next/link';
import React from 'react';
import {
  getHomeShow,
  getLastUpdates,
  getMostView,
  getTopRating,
  getAnime,
  getUpcoming,
  getHollywood,
} from '@/lib/kisskh-api';
import { HeroSlider } from '@/components/HeroSlider';
import { ContinueWatchingSection } from '@/components/ContinueWatchingSection';
import { DramaSection } from '@/components/DramaSection';
import { filterBrowseWithAI } from '@/lib/browse-ai';
import { sharedBrowseSettingsUnavailable } from '@/lib/admin-settings';
import {
  Sparkles,
  Clock,
  Flame,
  Star,
  Film,
  Calendar,
  Clapperboard,
} from 'lucide-react';

// Retry rendering promptly after an unavailable source; catalogue fetches retain their own longer TTLs.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Limit simultaneous requests to the source.
  const [heroSlides, lastUpdates] = await Promise.all([
    getHomeShow(),
    getLastUpdates(1, 0, 0),
  ]);

  const [topKdrama, topCdrama] = await Promise.all([
    getMostView(2), // Korea
    getMostView(1), // China
  ]);

  const [hollywoodList, topRating] = await Promise.all([
    getHollywood(1, 2), // Hollywood / Western (Country 6)
    getTopRating(1, 0),
  ]);

  const [animeList, upcomingList] = await Promise.all([
    getAnime(1, 1),
    getUpcoming(1, 0),
  ]);
  const shelves = [heroSlides,lastUpdates,topKdrama,topCdrama,hollywoodList,topRating,animeList,upcomingList];
  const filtered = await filterBrowseWithAI([...new Map(shelves.flat().map(item => [item.id,item])).values()]);
  const visibleIds = new Set(filtered.map(item => item.id));
  // Use new arrays: source cache entries must remain complete for search/direct access.
  const [visibleHero,visibleLatest,visibleK,visibleC,visibleHollywood,visibleRating,visibleAnime,visibleUpcoming] = shelves.map(items => items.filter(item => visibleIds.has(item.id)));

  return (
    <div className="home-dashboard pb-12">
      {sharedBrowseSettingsUnavailable() && <div role="alert" className="mb-6 rounded-xl border border-orange-500/30 bg-zinc-900 p-5 text-zinc-300">Preferensi tampilan katalog sementara tidak tersedia. Coba muat ulang nanti. Pencarian judul tetap dapat digunakan.</div>}
      {![heroSlides, lastUpdates, topKdrama, topCdrama, hollywoodList, topRating, animeList, upcomingList].some((items) => items.length > 0) && (
        <div role="alert" className="mb-6 rounded-xl border border-orange-500/30 bg-zinc-900 p-5 text-zinc-300">
          Katalog belum bisa diambil dari sumber. Sumber mungkin sedang tidak tersedia atau membatasi akses langsung. Coba lagi nanti.
        </div>
      )}
      {/* Top Banner Hero Carousel */}
      <HeroSlider slides={visibleHero} />

      <nav aria-label="Browse categories" className="category-shortcuts">
        <Link href="/explore?type=2">Movies</Link><Link href="/explore?type=1">Series</Link>
        <Link href="/explore?type=3">Anime</Link><Link href="/explore?country=1">K-Drama</Link>
        <Link href="/explore?country=2">C-Drama</Link><Link href="/explore?country=6">Hollywood</Link>
      </nav>
      {/* Continue Watching / Last Watch Local Cache */}
      <ContinueWatchingSection />

      {/* Latest Updates Section */}
      <DramaSection
        title="Latest Updates"
        icon={Clock}
        viewAllHref="/explore?order=1"
        dramas={visibleLatest.slice(0, 30)}
      />

      {/* Hollywood & Western Movies Section */}
      <DramaSection
        title="Hollywood & Western Movies"
        icon={Clapperboard}
        viewAllHref="/explore?country=6"
        dramas={visibleHollywood.slice(0, 30)}
      />

      {/* Top K-Drama Section */}
      <DramaSection
        title="Top K-Drama"
        icon={Sparkles}
        viewAllHref="/explore?country=1"
        dramas={visibleK.slice(0, 30)}
      />

      {/* Top C-Drama Section */}
      <DramaSection
        title="Top C-Drama"
        icon={Flame}
        viewAllHref="/explore?country=2"
        dramas={visibleC.slice(0, 30)}
      />

      {/* Top Rated Section */}
      <DramaSection
        title="Top Rating"
        icon={Star}
        viewAllHref="/explore?order=3"
        dramas={visibleRating.slice(0, 30)}
      />

      {/* Anime Section */}
      <DramaSection
        title="Anime Series"
        icon={Film}
        viewAllHref="/explore?type=3"
        dramas={visibleAnime.slice(0, 30)}
      />

      {/* Upcoming Section */}
      <DramaSection
        title="Upcoming Dramas"
        icon={Calendar}
        viewAllHref="/explore?status=1"
        dramas={visibleUpcoming.slice(0, 30)}
      />
    </div>
  );
}
