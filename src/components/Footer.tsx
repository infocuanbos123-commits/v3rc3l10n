import React from 'react';
import Link from 'next/link';
import { Logo } from './Logo';
import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-20 bg-[#171717] border-t border-white/5 text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Logo showAttribution={true} />
            <p className="text-sm text-zinc-400 leading-relaxed max-w-md">
              Watch Asian Dramas, K-Drama, C-Drama, Anime, and Movies in HD quality with multi-language subtitles. Free download and streaming with high speed playback.
            </p>
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
              <span>Crafted with</span>
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span>and Next.js by <strong className="text-red-400">dbarya</strong></span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-200 tracking-wider uppercase mb-3">
              Categories
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/explore?country=6" className="hover:text-red-400 transition-colors">
                  Hollywood &amp; Western
                </Link>
              </li>
              <li>
                <Link href="/explore?country=1" className="hover:text-red-400 transition-colors">
                  Korean Dramas (K-Drama)
                </Link>
              </li>
              <li>
                <Link href="/explore?country=2" className="hover:text-red-400 transition-colors">
                  Chinese Dramas (C-Drama)
                </Link>
              </li>
              <li>
                <Link href="/explore?type=3" className="hover:text-red-400 transition-colors">
                  Anime Series
                </Link>
              </li>
              <li>
                <Link href="/explore?type=2" className="hover:text-red-400 transition-colors">
                  Movies
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Info */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-200 tracking-wider uppercase mb-3">
              Information
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/watchlist" className="hover:text-red-400 transition-colors">
                  My Watchlist &amp; Saved
                </Link>
              </li>
              <li>
                <Link href="/watchlist" className="hover:text-red-400 transition-colors">
                  Watch History & Saved
                </Link>
              </li>
              <li>
                <span className="text-zinc-500 cursor-not-allowed">
                  DMCA Notice & Disclaimer
                </span>
              </li>
              <li>
                <span className="text-zinc-500 cursor-not-allowed">
                  Terms of Service
                </span>
              </li>
              <li>
                <span className="text-zinc-500 cursor-not-allowed">
                  Privacy Policy
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} MetroMovies<span className="hidden sm:inline"> — Built by dbarya</span>. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
