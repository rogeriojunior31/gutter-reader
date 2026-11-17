import { useThumbnailUrl } from '../lib/queries.ts';

interface Props {
  bookId: string | undefined;
  alt: string;
  /** 0..1; omitido = sem barra. */
  progress?: number | undefined;
  completed?: boolean | undefined;
  badge?: string | undefined;
}

export function Cover({ bookId, alt, progress, completed, badge }: Props) {
  const url = useThumbnailUrl(bookId);
  return (
    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-ink-800 shadow-black/40 shadow-lg ring-1 ring-white/5">
      {url ? (
        <img
          src={url}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-ink-800" />
      )}
      {badge && (
        <span className="absolute top-2 left-2 rounded bg-black/75 px-1.5 py-0.5 font-semibold text-[11px] text-white">
          {badge}
        </span>
      )}
      {completed && (
        <span className="absolute top-2 right-2 rounded bg-gold-400 px-1.5 py-0.5 font-bold text-[11px] text-ink-900">
          Lido
        </span>
      )}
      {progress !== undefined && !completed && progress > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
          <div className="h-full bg-obi-600" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
