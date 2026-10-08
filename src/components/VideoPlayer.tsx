'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  RotateCcw,
  RotateCw,
  SkipForward,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { SubtitleItem } from '@/lib/kisskh-api';
import { subtitleToVtt, subtitleLanguage } from '@/lib/subtitles';

interface VideoPlayerProps {
  streamUrl: string;
  format?: 'hls' | 'file';
  subtitles: SubtitleItem[];
  title: string;
  episodeNumber: number;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
  dramaId: number;
  thumbnail?: string;
  episodeId?: number;
}

export function VideoPlayer({
  streamUrl,
  format = 'hls',
  subtitles,
  title,
  episodeNumber,
  onNextEpisode,
  hasNextEpisode,
  dramaId,
  thumbnail,
  episodeId,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeSub, setActiveSub] = useState<string>('off');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<{ index: number; height: number; bitrate: number }[]>([]);
  const [selectedQuality, setSelectedQuality] = useState(-1);
  const [sourceHeight, setSourceHeight] = useState(0);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [localSub, setLocalSub] = useState<SubtitleItem | null>(null);
  const [subError, setSubError] = useState('');
  const [embeddedSubs, setEmbeddedSubs] = useState<{index:number;label:string;land:string}[]>([]);
  const localSubRef = useRef<string | null>(null);
  const allSubtitles = localSub ? [...subtitles,localSub] : subtitles;
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (localSubRef.current) URL.revokeObjectURL(localSubRef.current);
      localSubRef.current = null;
      setLocalSub(null); setSubError(''); setEmbeddedSubs([]);
      const preferred = subtitles.find(sub => sub.land === 'en') || subtitles.find(sub => sub.land === 'id') || subtitles.find(sub => sub.default);
      setActiveSub(preferred?.src || 'off');
    });
    return () => {active=false;};
  }, [streamUrl, subtitles]);
  useEffect(() => () => {if(localSubRef.current) URL.revokeObjectURL(localSubRef.current);}, []);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format time (00:00 or 00:00:00)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Activity timer for controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSubMenu && !showSettings) {
        setShowControls(false);
        setShowSettings(false);
        setShowSubMenu(false);
      }
    }, 3000);
  };

  // Setup HLS / Stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let active = true;
    let networkRecoveries = 0;
    let mediaRecoveries = 0;
    const fail = (message: string) => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      setHasError(true);
      setErrorMessage(message);
      setIsLoading(false);
    };
    const onNativeError = () => fail('Sumber video gagal dimuat atau akses ditolak.');
    const onNativeMetadata = () => {
      setIsLoading(false);
      setSourceHeight(video.videoHeight);
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    };

    queueMicrotask(() => {
      if (!active) return;
      setIsLoading(!!streamUrl);
      setHasError(!streamUrl);
      setErrorMessage(streamUrl ? '' : 'Sumber video langsung tidak tersedia.');
      setQualityLevels([]);
      setSelectedQuality(-1);
      setSourceHeight(0);
    });
    if (!streamUrl) return () => { active = false; };

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (format === 'file') {
      video.addEventListener('error', onNativeError);
      video.addEventListener('loadedmetadata', onNativeMetadata);
      video.src = streamUrl;
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        manifestLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 1,
        levelLoadingTimeOut: 20000,
        levelLoadingMaxRetry: 1,
        fragLoadingTimeOut: 25000,
        fragLoadingMaxRetry: 2,
        startFragPrefetch: true,
      });

      hlsRef.current = hls;
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_event,data) => {
        const tracks=data.subtitleTracks.map((track,index) => {
          const land=subtitleLanguage(track.lang,track.name);
          return {index,label:land==='en' ? 'English' : land==='id' ? 'Bahasa Indonesia' : track.name || track.lang || 'Subtitle '+(index+1),land};
        });
        const priority=(land:string) => land==='en' ? 0 : land==='id' ? 1 : 2;
        setEmbeddedSubs(tracks.sort((a,b)=>priority(a.land)-priority(b.land)));
        if (!subtitles.length) {
          const preferred = data.subtitleTracks.findIndex(track => subtitleLanguage(track.lang,track.name)==='en');
          const fallback = data.subtitleTracks.findIndex(track => subtitleLanguage(track.lang,track.name)==='id');
          const index=preferred>=0 ? preferred : fallback;
          if(index>=0) {hls.subtitleTrack=index;hls.subtitleDisplay=true;setActiveSub('hls:'+index);}
        }
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setQualityLevels(hls.levels.map((level, index) => ({ index, height: level.height, bitrate: level.bitrate })));
        setIsLoading(false);
        // Try autoplay safely without unhandled AbortError
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch((err) => {
              if (err.name !== 'AbortError') {
                setIsPlaying(false);
              }
            });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('HLS Network error, trying recover:', data);
              if (networkRecoveries++ < 1 && ![401, 403, 429, 502, 503].includes(data.response?.code || 0)) hls.startLoad();
              else fail('Sumber video tidak bisa diakses. Coba lagi nanti.');
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS Media error, trying recover:', data);
              if (mediaRecoveries++ < 1) hls.recoverMediaError();
              else fail('Format video tidak bisa diputar.');
              break;
            default:
              console.error('Fatal HLS error:', data);
              hls.destroy();
              setHasError(true);
              setErrorMessage('Streaming error occurred. Please refresh or try again.');
              setIsLoading(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple HLS (Safari/iOS)
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', onNativeMetadata);
      video.addEventListener('error', onNativeError);
    } else {
      setHasError(true);
      setErrorMessage('Your browser does not support HLS video playback.');
      setIsLoading(false);
    }

    return () => {
      active = false;
      video.removeEventListener('loadedmetadata', onNativeMetadata);
      video.removeEventListener('error', onNativeError);
      video.removeAttribute('src');
      video.load();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, format, subtitles]);

  // Video time & buffer tracking + save watch progress to localStorage
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    // Save watch progress
    try {
      const historyStr = localStorage.getItem('metromovies_history') || localStorage.getItem('kisskh_history');
      const history = historyStr ? JSON.parse(historyStr) : {};
      history[dramaId] = {
        dramaId,
        title,
        thumbnail: thumbnail || history[dramaId]?.thumbnail || '',
        episodeNumber,
        episodeId: episodeId || history[dramaId]?.episodeId,
        currentTime: video.currentTime,
        duration: video.duration || 0,
        updatedAt: Date.now(),
      };
      localStorage.setItem('metromovies_history', JSON.stringify(history));
    } catch {
      // Ignore localStorage errors
    }

    // Buffer tracking
    if (video.buffered.length > 0) {
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= video.currentTime && video.currentTime <= video.buffered.end(i)) {
          setBuffered(video.buffered.end(i));
          break;
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
      setSourceHeight(video.videoHeight);
      // Restore previous time if available
      try {
        const historyStr = localStorage.getItem('metromovies_history') || localStorage.getItem('kisskh_history');
        if (historyStr) {
          const history = JSON.parse(historyStr);
          const saved = history[dramaId];
          if (saved && saved.episodeNumber === episodeNumber && saved.currentTime > 10 && saved.currentTime < video.duration - 30) {
            video.currentTime = saved.currentTime;
          }
        }
      } catch {
        // Ignore
      }
    }
  };

  // Toggle Play
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            if (err.name !== 'AbortError') {
              console.warn('Play error:', err);
            }
          });
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const video = videoRef.current;
    if (video) {
      video.volume = val;
      video.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      video.volume = volume || 0.5;
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // Fullscreen
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  // Change speed
  const changeSpeed = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettings(false);
  };

  // Change Subtitle
  const changeSubtitle = (subUrl: string) => {
    setActiveSub(subUrl);
    setShowSubMenu(false);
    const video = videoRef.current;
    if (!video) return;

    // Toggle track modes
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      if (subUrl === 'off') {
        tracks[i].mode = 'disabled';
      } else {
        const trackEl = video.querySelectorAll('track')[i];
        if (trackEl && trackEl.dataset.subUrl === subUrl) {
          tracks[i].mode = 'showing';
        } else {
          tracks[i].mode = 'disabled';
        }
      }
    }
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = subUrl.startsWith('hls:') ? Number(subUrl.slice(4)) : -1;
      hlsRef.current.subtitleDisplay = subUrl.startsWith('hls:');
    }
  };

  const importSubtitle = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 5*1024*1024) throw new Error('Subtitle maksimal 5 MB.');
      const url = URL.createObjectURL(new Blob([subtitleToVtt(await file.text())],{type:'text/vtt'}));
      if (localSubRef.current) URL.revokeObjectURL(localSubRef.current);
      localSubRef.current=url;
      setLocalSub({src:url,label:'Subtitle lokal: '+file.name,land:'und',default:false});
      setActiveSub(url); setSubError('');
    } catch(error) {setSubError(error instanceof Error ? error.message : 'Subtitle gagal dibaca.');}
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime -= 10;
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime += 10;
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl select-none group border border-white/10"
    >
      <>
          {/* Main Video Element */}
          <video
            ref={videoRef}
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => {
              setIsLoading(false);
              setIsPlaying(true);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              if (onNextEpisode && hasNextEpisode) {
                onNextEpisode();
              }
            }}
            className="w-full h-full object-contain cursor-pointer"
            playsInline
            crossOrigin="anonymous"
          >
            {/* Subtitle tracks via VTT converter */}
            {allSubtitles.map((sub, idx) => (
              <track
                key={idx}
                data-sub-url={sub.src}
                kind="subtitles"
                label={sub.label}
                srcLang={sub.land}
                src={sub.src.startsWith('blob:') ? sub.src : `/api/sub-vtt?url=${encodeURIComponent(sub.src)}`}
                default={sub.default}
                onLoad={event => {event.currentTarget.track.mode = activeSub === sub.src ? 'showing' : 'disabled';}}
                onError={() => setSubError('Subtitle dari sumber gagal dimuat. Coba bahasa lain atau buka file SRT/VTT lokal.')}
              />
            ))}
          </video>

          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none z-20">
              <Loader2 className="w-12 h-12 text-[#e50914] animate-spin mb-2" />
              <p className="text-xs text-zinc-300 font-medium">Buffering video stream...</p>
            </div>
          )}

          {/* Error State */}
          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 p-6 text-center z-30">
              <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Streaming Error</h3>
              <p className="text-sm text-zinc-400 max-w-md mb-4">{errorMessage}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 rounded-lg bg-[#e50914] text-white font-semibold text-sm hover:bg-[#b20710] transition-colors"
              >
                Reload Player
              </button>
            </div>
          )}

          {/* Custom Controls Bar */}
          <div
            className={`absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/90 via-transparent to-black/60 transition-opacity duration-300 z-20 ${
              showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Top Bar: Title + Episode Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-[#e50914] text-white text-xs font-black uppercase">
                  EP {episodeNumber}
                </span>
                <h2 className="text-white text-sm sm:text-base font-bold drop-shadow line-clamp-1">
                  {title}
                </h2>
              </div>
              {streamUrl && (
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-xs text-zinc-300 hover:text-white transition-colors"
                  title="Direct stream source link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Source Stream
                </a>
              )}
            </div>

            {/* Center Big Play Button (when paused) */}
            {!isPlaying && !isLoading && !hasError && (
              <div className="self-center">
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#e50914] text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                >
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-black ml-1" />
                </button>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="space-y-2">
              {/* Progress Seek Bar */}
              <div className="relative w-full flex items-center group/scrubber cursor-pointer">
                {/* Buffered track */}
                <div
                  className="absolute left-0 h-1 bg-white/20 rounded-full pointer-events-none"
                  style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 group-hover/scrubber:h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#e50914] transition-all"
                />
              </div>

              {/* Bottom Buttons */}
              <div className="flex items-center justify-between text-white text-sm pt-1 gap-2 pb-1 sm:pb-0">
                {/* Left Controls */}
                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                  <button
                    onClick={togglePlay}
                    className="p-2 sm:p-1.5 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg hover:text-[#e50914] active:scale-95 transition-transform"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>

                  {/* Skip 10s back/forward (hidden on tiny screens, accessible via tap) */}
                  <button
                    onClick={() => {
                      if (videoRef.current) videoRef.current.currentTime -= 10;
                    }}
                    className="hidden xs:flex p-1.5 min-w-[32px] min-h-[32px] items-center justify-center hover:text-[#e50914] transition-colors"
                    title="Rewind 10s"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (videoRef.current) videoRef.current.currentTime += 10;
                    }}
                    className="hidden xs:flex p-1.5 min-w-[32px] min-h-[32px] items-center justify-center hover:text-[#e50914] transition-colors"
                    title="Forward 10s"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  {/* Next Episode Button */}
                  {hasNextEpisode && onNextEpisode && (
                    <button
                      onClick={onNextEpisode}
                      className="p-2 sm:p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center hover:text-[#e50914] active:scale-95 transition-colors"
                      title="Next Episode"
                    >
                      <SkipForward className="w-5 h-5" />
                    </button>
                  )}

                  {/* Volume Control */}
                  <div className="flex items-center gap-1 sm:gap-2 group/vol">
                    <button onClick={toggleMute} className="p-2 sm:p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center hover:text-[#e50914] transition-colors">
                      {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-[#e50914] hidden sm:block"
                    />
                  </div>

                  {/* Time Display */}
                  <div className="text-[11px] sm:text-xs text-zinc-300 font-mono flex items-center whitespace-nowrap">
                    <span>{formatTime(currentTime)}</span>
                    <span className="text-zinc-500 mx-1">/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Right Controls (shrink-0 ensures fullscreen is NEVER pushed off screen) */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 relative shrink-0">
                  {/* Subtitle Selector */}
                  {(
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowSubMenu(!showSubMenu);
                          setShowSettings(false);
                        }}
                        className={`p-2 sm:p-1.5 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg hover:text-[#e50914] transition-colors ${
                          activeSub !== 'off' ? 'text-[#e50914] bg-white/10' : 'text-zinc-300'
                        }`}
                        title="Subtitles" aria-label="Subtitles" aria-expanded={showSubMenu}
                      >
                        <Subtitles className="w-5 h-5" />
                      </button>

                      {showSubMenu && (
                        <div className="absolute right-0 bottom-full mb-2 w-64 max-h-72 overflow-y-auto bg-[#252525] border border-zinc-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                          <div className="px-3 py-1 font-semibold text-zinc-400 border-b border-zinc-700/60 uppercase text-[10px]">
                            Subtitles
                          </div>
                          <button
                            onClick={() => changeSubtitle('off')}
                            className={`w-full text-left px-3 py-2 hover:bg-zinc-700 transition-colors ${
                              activeSub === 'off' ? 'text-[#e50914] font-bold' : 'text-zinc-300'
                            }`}
                          >
                            Off
                          </button>
                          {allSubtitles.map((sub, i) => (
                            <button
                              key={i}
                              onClick={() => changeSubtitle(sub.src)}
                              className={`w-full text-left px-3 py-2 hover:bg-zinc-700 transition-colors ${
                                activeSub === sub.src ? 'text-[#e50914] font-bold' : 'text-zinc-300'
                              }`}
                            >
                              {sub.label}
                            </button>
                          ))}
                          {embeddedSubs.map(sub => <button key={'hls:'+sub.index} onClick={() => changeSubtitle('hls:'+sub.index)} className="w-full text-left px-3 py-2 hover:bg-zinc-700">{sub.label} · HLS</button>)}
                          {(['en','id'] as const).filter(land => !allSubtitles.some(sub => sub.land === land) && !embeddedSubs.some(sub => sub.land === land)).map(land => <p key={land} className="px-3 py-2 text-zinc-500">{land === 'en' ? 'English' : 'Bahasa Indonesia'} — belum tersedia dari sumber</p>)}
                          {!!subError && <p role="alert" className="px-3 py-2 text-red-300">{subError}</p>}
                          <label className="block px-3 py-2 text-white hover:bg-zinc-700 cursor-pointer">Buka subtitle SRT / VTT<input type="file" accept=".srt,.vtt" aria-label="Buka subtitle lokal" className="sr-only" onChange={event => {void importSubtitle(event.target.files?.[0]);event.target.value='';}} /></label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Speed / Settings Selector */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowSettings(!showSettings);
                        setShowSubMenu(false);
                      }}
                      className="p-2 sm:p-1.5 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg hover:text-[#e50914] transition-colors text-zinc-300"
                      title="Pengaturan video" aria-label="Pengaturan video"
                    >
                      <Settings className="w-5 h-5" />
                    </button>

                    {showSettings && (
                      <div className="absolute right-0 bottom-full mb-2 w-48 max-h-64 overflow-y-auto bg-[#252525] border border-zinc-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                        <div className="px-3 py-1 font-semibold text-zinc-400 border-b border-zinc-700/60 uppercase text-[10px]">
                          Kecepatan
                        </div>
                        <div className="px-3 py-2 text-zinc-300 border-b border-white/10">
                          <p className="mb-2 font-semibold">Kualitas video</p>
                          {qualityLevels.length > 1 ? (
                            <select aria-label="Kualitas video" value={selectedQuality} onChange={(event) => {
                              const level = Number(event.target.value);
                              setSelectedQuality(level);
                              if (hlsRef.current) hlsRef.current.currentLevel = level;
                            }} className="w-full rounded bg-zinc-800 p-2 text-white">
                              <option value={-1}>Auto</option>
                              {qualityLevels.map((level) => <option key={level.index} value={level.index}>{level.height ? level.height + 'p' : Math.round(level.bitrate / 1000) + ' kbps'}</option>)}
                            </select>
                          ) : <p className="text-[11px] leading-relaxed text-zinc-400">{sourceHeight ? sourceHeight + 'p' : 'Kualitas asli'} · Sumber hanya menyediakan satu resolusi.</p>}
                        </div>
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                          <button
                            key={s}
                            onClick={() => changeSpeed(s)}
                            className={`w-full text-left px-3 py-1.5 hover:bg-zinc-700 transition-colors ${
                              playbackRate === s ? 'text-[#e50914] font-bold' : 'text-zinc-300'
                            }`}
                          >
                            {s === 1 ? '1x (Normal)' : `${s}x`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fullscreen Button with large comfortable touch target */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 sm:p-1.5 min-w-[42px] min-h-[42px] flex items-center justify-center rounded-xl bg-[#e50914]/20 sm:bg-transparent hover:bg-[#e50914]/30 text-[#e50914] sm:text-white sm:hover:text-[#e50914] active:scale-90 transition-all border border-[#e50914]/30 sm:border-transparent"
                    aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
      </>
    </div>
  );
}
