'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Play, Info } from 'lucide-react';
import { DramaItem } from '@/lib/kisskh-api';

interface HeroSliderProps {
  slides: DramaItem[];
}

export function HeroSlider({ slides }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!slides || slides.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides]);

  if (!slides || slides.length === 0) return null;

  const current = slides[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="cinema-hero relative w-full h-[470px] sm:h-[570px] lg:h-[660px] overflow-hidden bg-zinc-950 mb-2 group">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0" style={{ position: 'absolute' }}>
        {current.thumbnail && (
          <Image
            src={current.thumbnail}
            alt={current.title}
            fill
            className="object-cover object-center transition-all duration-700"
            priority
            unoptimized
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/40 to-transparent" />
      </div>

      {/* Content Overlay */}
      <div className="relative h-full mx-auto px-5 sm:px-8 lg:px-12 flex flex-col justify-end pb-16 sm:pb-24 z-10">
        <div className="max-w-2xl space-y-4">
          {/* Featured Badge */}
          <div className="inline-flex items-center gap-2 text-white/80 text-[11px] font-semibold uppercase tracking-[0.3em]">
            <span>MetroMovies • Pilihan hari ini</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md">
            {current.title}
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 line-clamp-2 drop-shadow">
            Temukan cerita berikutnya. Drama Asia, film, dan anime favoritmu, dalam satu tempat.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Link
              href={`/drama/${current.id}`}
              prefetch={false}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-md bg-white hover:bg-white/80 text-zinc-950 font-bold text-sm sm:text-base shadow-lg shadow-[#e50914]/20 hover:scale-105 transition-all"
            >
              <Play className="w-5 h-5 fill-zinc-950" />
              Putar
            </Link>
            <Link
              href={`/drama/${current.id}`}
              prefetch={false}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-zinc-500/40 hover:bg-zinc-700 text-white font-semibold text-sm sm:text-base backdrop-blur-sm border border-white/10 hover:scale-105 transition-all"
            >
              <Info className="w-5 h-5 text-zinc-300" />
              Info Selengkapnya
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20 border border-white/10"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-20 border border-white/10"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Indicators Dots */}
      <div className="absolute bottom-4 right-6 sm:right-12 flex items-center gap-2 z-20">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-8 bg-[#e50914]' : 'w-2 bg-white/40 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
