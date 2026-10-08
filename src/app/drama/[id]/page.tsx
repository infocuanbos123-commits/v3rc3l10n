import React from 'react';
import { notFound } from 'next/navigation';
import { getDramaDetail } from '@/lib/kisskh-api';
import { DramaWatchView } from '@/components/DramaWatchView';
import { Metadata } from 'next';

interface DramaPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ep?: string }>;
}

export async function generateMetadata({ params }: DramaPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const drama = await getDramaDetail(resolvedParams.id);
  if (!drama) return { title: 'Drama Not Found | MetroMovies by dbarya' };

  return {
    title: `Watch ${drama.title} Online in HD | MetroMovies by dbarya`,
    description: drama.description?.slice(0, 160) || 'Watch Asian drama, anime, and movies online free in high quality on MetroMovies.',
  };
}

export const revalidate = 86400; // Cache drama info for 24 hours

export default async function DramaPage({ params, searchParams }: DramaPageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const drama = await getDramaDetail(resolvedParams.id);
  if (!drama) {
    notFound();
  }

  const initialEpId = resolvedSearchParams.ep
    ? parseInt(resolvedSearchParams.ep, 10)
    : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DramaWatchView drama={drama} initialEpisodeId={initialEpId} />
    </div>
  );
}
