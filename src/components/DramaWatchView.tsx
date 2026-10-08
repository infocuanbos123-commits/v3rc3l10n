'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  DramaDetail,
  EpisodeItem,
  VideoStreamResult,
} from '@/lib/kisskh-api';
import { VideoPlayer } from './VideoPlayer';
import { EpisodeList } from './EpisodeList';
import {
  Calendar,
  Globe,
  Film,
  CheckCircle,
  Bookmark,
  BookmarkCheck,
  Share2,
  Check,
  Tv,
  Info,
  Loader2,
} from 'lucide-react';

interface DramaWatchViewProps {
  drama: DramaDetail;
  initialEpisodeId?: number;
}

export function DramaWatchView({ drama, initialEpisodeId }: DramaWatchViewProps) {
  // Determine default episode (if initial specified, use that; otherwise episode 1)
  const defaultEp =
    drama.episodes && drama.episodes.length > 0
      ? (initialEpisodeId
          ? drama.episodes.find((e) => e.id === initialEpisodeId) || drama.episodes[0]
          : drama.episodes[0])
      : null;

  const [currentEpisode, setCurrentEpisode] = useState<EpisodeItem | null>(defaultEp);
  const [streamData, setStreamData] = useState<VideoStreamResult | null>(null);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [retryVersion, setRetryVersion] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Check if drama is in watchlist
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
    if (!active) return;
    try {
      const saved = localStorage.getItem('metromovies_watchlist') || localStorage.getItem('kisskh_watchlist');
      if (saved) {
        const list = JSON.parse(saved);
        setIsSaved(!!list[drama.id]);
      }
    } catch {
      // Ignore
    }
    });
    return () => { active = false; };
  }, [drama.id]);

  const toggleWatchlist = () => {
    try {
      const saved = localStorage.getItem('metromovies_watchlist') || localStorage.getItem('kisskh_watchlist');
      const list = saved ? JSON.parse(saved) : {};
      if (list[drama.id]) {
        delete list[drama.id];
        setIsSaved(false);
      } else {
        list[drama.id] = {
          id: drama.id,
          title: drama.title,
          thumbnail: drama.thumbnail,
          episodesCount: drama.episodesCount,
          addedAt: Date.now(),
        };
        setIsSaved(true);
      }
      localStorage.setItem('metromovies_watchlist', JSON.stringify(list));
    } catch {
      // Ignore
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  // Fetch episode stream when currentEpisode changes
  useEffect(() => {
    if (!currentEpisode) return;

    let isMounted = true;
    queueMicrotask(() => {
      if (!isMounted) return;
      setIsLoadingStream(true);
      setStreamData(null);
      setStreamError('');
    });
    const controller = new AbortController();

    fetch(`/api/stream?episodeId=${currentEpisode.id}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Sumber video tidak tersedia.');
        return data;
      })
      .then((data: VideoStreamResult) => {
        if (isMounted) {
          setStreamData(data);
          setIsLoadingStream(false);
        }
      })
      .catch((err) => {
        if (!isMounted || controller.signal.aborted) return;
        console.error('Failed to load stream:', err);
        if (isMounted) {
          setStreamError(err instanceof Error ? err.message : 'Sumber video tidak tersedia.');
          setStreamData(null);
          setIsLoadingStream(false);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [currentEpisode, retryVersion]);

  // Next episode logic
  const currentEpIndex = drama.episodes.findIndex((e) => e.id === currentEpisode?.id);
  const hasNextEpisode =
    currentEpIndex !== -1 && currentEpIndex + 1 < drama.episodes.length;

  const handleNextEpisode = useCallback(() => {
    if (hasNextEpisode) {
      setCurrentEpisode(drama.episodes[currentEpIndex + 1]);
    }
  }, [hasNextEpisode, currentEpIndex, drama.episodes]);

  return (
    <div className="space-y-8">
      {/* Video Player Section */}
      <div className="space-y-4">
        {isLoadingStream ? (
          <div className="w-full aspect-video bg-zinc-950 rounded-2xl flex flex-col items-center justify-center border border-white/5">
            <Loader2 className="w-12 h-12 text-[#e50914] animate-spin mb-3" />
            <p className="text-zinc-400 text-sm font-medium">
              Extracting stream for Episode {currentEpisode?.number}...
            </p>
          </div>
        ) : streamData ? (
          <VideoPlayer
            streamUrl={streamData.video}
            format={streamData.format}
            subtitles={streamData.subtitles}
            title={drama.title}
            episodeNumber={currentEpisode ? currentEpisode.number : 1}
            onNextEpisode={handleNextEpisode}
            hasNextEpisode={hasNextEpisode}
            dramaId={drama.id}
            thumbnail={drama.thumbnail}
            episodeId={currentEpisode ? currentEpisode.id : undefined}
          />
        ) : (
          <div className="w-full aspect-video bg-zinc-950 rounded-2xl flex flex-col items-center justify-center border border-white/5 p-6 text-center">
            <Tv className="w-12 h-12 text-zinc-600 mb-3" />
            <p className="text-zinc-300 font-semibold mb-1">
              {streamError || 'Select an episode below to start watching'}
            </p>
            <p className="text-zinc-500 text-xs">
              {streamError ? 'Video langsung dari sumber belum bisa dimuat.' : 'Pilih episode untuk mulai menonton.'}
            </p>
            {streamError && <button onClick={() => setRetryVersion((value) => value + 1)} className="mt-4 px-5 py-2 rounded-lg bg-[#e50914] text-white font-semibold">Coba lagi</button>}
          </div>
        )}
      </div>

      {/* Episode Selection Grid */}
      {drama.episodes && drama.episodes.length > 0 && (
        <EpisodeList
          episodes={drama.episodes}
          currentEpisodeId={currentEpisode ? currentEpisode.id : 0}
          onSelectEpisode={(ep) => setCurrentEpisode(ep)}
          dramaId={drama.id}
        />
      )}

      {/* Drama Details Card */}
      <div className="bg-[#242424] rounded-2xl p-6 sm:p-8 border border-white/5 shadow-xl">
        <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
          {/* Poster */}
          <div className="relative w-36 sm:w-48 aspect-[2/3] rounded-xl overflow-hidden shadow-lg flex-shrink-0 bg-zinc-900 border border-white/5 self-start" style={{ position: 'relative' }}>
            {drama.thumbnail ? (
              <Image
                src={drama.thumbnail}
                alt={drama.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <Film className="w-12 h-12" />
              </div>
            )}
          </div>

          {/* Details & Actions */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {drama.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-2">
                  {drama.country && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-zinc-500" />
                      {drama.country}
                    </span>
                  )}
                  {drama.releaseDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      {new Date(drama.releaseDate).getFullYear()}
                    </span>
                  )}
                  {drama.status && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      {drama.status}
                    </span>
                  )}
                  {drama.episodesCount && (
                    <span className="px-2 py-0.5 rounded bg-[#e50914]/20 text-[#e50914] font-bold">
                      {drama.episodesCount} Episodes
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleWatchlist}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    isSaved
                      ? 'bg-amber-500/20 text-red-400 border border-amber-500/30'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/5'
                  }`}
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-red-400" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4 text-zinc-400" />
                      Watchlist
                    </>
                  )}
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/5 transition-colors"
                >
                  {copiedShare ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-zinc-400" />
                      Share
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Synopsis */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-red-500" />
                Synopsis
              </h3>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                {drama.description || 'No description available for this drama.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
