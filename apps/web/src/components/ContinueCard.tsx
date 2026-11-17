import { Link } from 'react-router';
import type { StoredProgress } from '../db/db.ts';
import { useBook, useSeries } from '../lib/queries.ts';
import { Cover } from './Cover.tsx';
import { Ledge } from './Spine.tsx';

export function ContinueCard({ progress }: { progress: StoredProgress }) {
  const { data: book } = useBook(progress.bookId);
  const { data: series } = useSeries(book?.seriesId);
  return (
    <Link to={`/read/${progress.bookId}`} className="group block space-y-2.5">
      <div className="transition-transform duration-200 group-hover:-translate-y-1">
        <Cover
          bookId={progress.bookId}
          alt=""
          progress={(progress.page + 1) / progress.pageCount}
        />
      </div>
      <Ledge />
      <div className="px-0.5">
        <p className="truncate font-medium text-sm group-hover:text-obi-300">
          {series?.name ?? ' '}
        </p>
        <p className="truncate text-ink-300 text-xs">
          {book && book.title !== series?.name ? `${book.title} · ` : ''}Pág. {progress.page + 1} de{' '}
          {progress.pageCount}
        </p>
      </div>
    </Link>
  );
}
