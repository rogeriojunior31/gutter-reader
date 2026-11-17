import type { Series } from '@gutter/core';
import { Link } from 'react-router';
import { type SeriesStats, seriesProgress } from '../db/progress.ts';
import { Cover } from './Cover.tsx';
import { Ledge, turnName } from './Spine.tsx';

export function SeriesCard({
  series,
  stats,
  className = '',
}: {
  series: Series;
  stats?: SeriesStats | undefined;
  className?: string;
}) {
  const completed = !!stats && stats.completed >= series.bookCount;
  const progress = seriesProgress(stats, series.bookCount);
  const meta = series.metadata;
  const detail = [
    `${series.bookCount} ${series.bookCount === 1 ? 'livro' : 'livros'}`,
    meta?.genres?.[0],
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link to={`/series/${series.id}`} className={`group block space-y-2.5 ${className}`}>
      <div
        className="transition-transform duration-200 group-hover:-translate-y-1"
        style={{ viewTransitionName: turnName(series.id) }}
      >
        <Cover
          bookId={series.coverBookId}
          alt=""
          badge={series.rtl ? 'Oriental' : undefined}
          progress={progress}
          completed={completed}
        />
      </div>
      <Ledge />
      <div className="px-0.5">
        <p className="line-clamp-2 font-medium text-sm leading-snug group-hover:text-obi-300">
          {series.name}
        </p>
        <p className="mt-0.5 truncate text-ink-300 text-xs">{detail}</p>
      </div>
    </Link>
  );
}
