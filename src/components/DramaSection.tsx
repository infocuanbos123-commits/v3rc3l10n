import React from 'react';
import Link from 'next/link';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { DramaItem } from '@/lib/kisskh-api';
import { DramaCard } from './DramaCard';

interface DramaSectionProps {
  title: string;
  icon?: LucideIcon;
  viewAllHref?: string;
  dramas: DramaItem[];
}

export function DramaSection({ title, icon: Icon, viewAllHref, dramas }: DramaSectionProps) {
  if (!dramas || dramas.length === 0) return null;

  return (
    <section className="cinema-shelf mb-9">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="w-5 h-5 text-red-500" />}
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {title}
          </h2>
        </div>

        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="group flex items-center gap-1 text-xs sm:text-sm font-semibold text-zinc-400 hover:text-[#e50914] transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* Grid of Cards */}
      <div className="shelf-track">
        {dramas.map((drama) => (
          <DramaCard key={drama.id} drama={drama} landscape />
        ))}
      </div>
    </section>
  );
}
