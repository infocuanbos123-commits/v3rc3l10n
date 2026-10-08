import Link from 'next/link';
interface LogoProps { className?: string; showAttribution?: boolean; }
export function Logo({ className = '', showAttribution = true }: LogoProps) {
  return <Link href="/" aria-label="MetroMovies home" className={`inline-flex shrink-0 items-center gap-3 ${className}`}>
    <span className="brand-wordmark">METROMOVIES</span>
    {showAttribution && <span className="hidden sm:inline-flex text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">by dbarya</span>}
  </Link>;
}
