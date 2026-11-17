import { BookOpen, Flame, Minus, Plus, Trophy } from 'lucide-react';
import { type KeyboardEvent, type ReactNode, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Cover } from '../../components/Cover.tsx';
import { Ledge } from '../../components/Spine.tsx';
import { buttonClass, IconButton, PageHeader } from '../../components/ui.tsx';
import {
  type Activity,
  type DayTotal,
  setDailyGoal,
  useActivity,
  useDailyGoal,
} from '../../db/activity.ts';
import type { ReadingLogEntry } from '../../db/db.ts';
import { dayKey } from '../../db/streak.ts';
import { useMediaQuery } from '../../lib/use-media-query.ts';

/** 12 semanas no desktop; 4 no celular, para hoje caber na tela sem rolar. */
const DAYS_WIDE = 84;
const DAYS_NARROW = 28;
const LONG = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const SHORT = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
const MONTH = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

function parse(key: string): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function dayName(key: string): string {
  if (key === dayKey()) return 'Hoje';
  return LONG.format(parse(key));
}

export function ActivityPage() {
  const activity = useActivity(DAYS_WIDE);
  const goal = useDailyGoal();
  const wide = useMediaQuery('(min-width: 640px)');

  if (!activity) return <PageHeader title="Leituras" />;
  if (!activity.hasAny) return <FirstRun goal={goal} />;

  const days = wide ? activity.days : activity.days.slice(-DAYS_NARROW);
  const weeks = wide ? 12 : 4;
  const readingDays = days.filter((d) => d.pages > 0).length;

  return (
    <div>
      <PageHeader
        title="Leituras"
        subtitle={`${activity.weekPages} páginas nos últimos 7 dias · ${activity.finishedThisMonth} ${
          activity.finishedThisMonth === 1 ? 'edição terminada' : 'edições terminadas'
        } em 30 dias · ${readingDays} ${readingDays === 1 ? 'dia' : 'dias'} com leitura em ${weeks} semanas`}
      />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <StreakPanel activity={activity} />
        <DayShelf
          days={days}
          goal={goal}
          today={activity.today}
          weeks={weeks}
          byDate={activity.byDate}
        />
      </div>
      <History activity={activity} />
    </div>
  );
}

/** Primeiro uso: um convite, não um paredão de zeros. */
function FirstRun({ goal }: { goal: number }) {
  return (
    <div>
      <PageHeader title="Leituras" />
      <section className="grid gap-8 rounded-3xl border border-white/10 bg-ink-850 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h2 className="pt-[0.1em] font-display font-extrabold text-4xl uppercase leading-none tracking-wide sm:text-5xl">
            Sua estante de dias começa na primeira página.
          </h2>
          <p className="mt-4 max-w-[55ch] text-ink-100">
            Cada dia que você ler vira uma lombada aqui, mais alta quanto mais páginas. Dias
            seguidos formam a sua sequência; a meta diária começa em {goal} páginas e você pode
            mudar quando quiser.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/library" className={buttonClass('primary')}>
              <BookOpen className="size-4" aria-hidden="true" /> Escolher o que ler
            </Link>
            <GoalControl goal={goal} />
          </div>
        </div>
        {/* Uma semana de exemplo, para mostrar como a estante vai ficar. */}
        <div aria-hidden="true" className="hidden w-64 lg:block">
          <div className="flex h-36 items-end gap-1.5">
            {[0.35, 0.8, 0.5, 1, 0.2, 0.65, 0.9].map((h, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: ilustração estática
                key={i}
                className={`flex-1 rounded-t-[2px] shadow-[inset_-2px_0_3px_-1px_rgb(0_0_0/0.45)] ${h >= 0.66 ? 'bg-obi-500' : 'bg-obi-500/45'}`}
                style={{ height: `${h * 100}%` }}
              />
            ))}
          </div>
          <div className="h-2 bg-ink-700" />
          <p className="mt-2 text-center text-ink-400 text-xs">exemplo de uma semana</p>
        </div>
      </section>
    </div>
  );
}

function GoalControl({ goal }: { goal: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="mr-1 text-ink-300 text-xs">Meta diária</span>
      <IconButton label="Diminuir meta" onClick={() => setDailyGoal(goal - 5)} disabled={goal <= 5}>
        <Minus className="size-4" />
      </IconButton>
      <span className="w-8 text-center font-semibold text-sm tabular-nums">{goal}</span>
      <IconButton label="Aumentar meta" onClick={() => setDailyGoal(goal + 5)}>
        <Plus className="size-4" />
      </IconButton>
    </div>
  );
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-ink-850 p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

function StreakPanel({ activity }: { activity: Activity }) {
  const { current, best, atRisk } = activity.streak;
  return (
    <Panel>
      <h2 className="flex items-center gap-2 font-semibold text-ink-200 text-sm">
        <Flame
          className={`size-4 ${current ? 'text-gold-400' : 'text-ink-400'}`}
          aria-hidden="true"
        />
        Sequência
      </h2>
      <p className="mt-2 flex items-baseline gap-3">
        <span className="font-display font-extrabold text-8xl text-ink-50 leading-none tabular-nums">
          {current}
        </span>
        <span className="font-display font-bold text-2xl text-ink-200 uppercase">
          {current === 1 ? 'dia' : 'dias'}
        </span>
      </p>
      <p className={`mt-3 text-sm ${atRisk ? 'text-gold-300' : 'text-ink-300'}`}>
        {current === 0
          ? 'Leia uma página hoje para recomeçar.'
          : atRisk
            ? 'Leia hoje para não perder a sequência.'
            : 'Hoje já conta. Continue amanhã.'}
      </p>
      <p className="mt-4 flex items-center gap-1.5 text-ink-300 text-xs">
        <Trophy className="size-3.5" aria-hidden="true" /> Melhor sequência: {best}{' '}
        {best === 1 ? 'dia' : 'dias'}
      </p>
    </Panel>
  );
}

/**
 * Estante de dias: cada dia é uma lombada fina e a altura é o quanto você leu.
 * Cinta vermelha bateu a meta, vermelho apagado leu menos, toco cinza não leu.
 * Cada dia é um botão: escolher um dia mostra as edições lidas nele.
 * Teclado: setas andam entre os dias (só o dia escolhido entra na ordem do Tab).
 */
function DayShelf({
  days,
  goal,
  today,
  weeks,
  byDate,
}: {
  days: DayTotal[];
  goal: number;
  today: number;
  weeks: number;
  byDate: Map<string, ReadingLogEntry[]>;
}) {
  const todayKey = dayKey();
  const [selected, setSelected] = useState(todayKey);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const max = Math.max(goal * 1.5, ...days.map((d) => d.pages));
  const total = days.reduce((n, d) => n + d.pages, 0);
  const done = today >= goal;
  const months = useMemo(
    () =>
      days
        .map((d, i) => ({ i, d: parse(d.date) }))
        .filter(({ d, i }) => i === 0 || d.getDate() === 1)
        .map(({ i, d }) => ({ i, label: MONTH.format(d).replace('.', '') })),
    [days],
  );

  const move = (e: KeyboardEvent, i: number) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, Home: -i, End: days.length - 1 - i }[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const next = Math.min(days.length - 1, Math.max(0, i + delta));
    const d = days[next];
    if (!d) return;
    setSelected(d.date);
    buttons.current[next]?.focus();
  };

  const entries = byDate.get(selected) ?? [];
  const selectedPages = days.find((d) => d.date === selected)?.pages ?? 0;

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl uppercase tracking-wide">
            Estante de dias
          </h2>
          <p className="mt-1 text-ink-300 text-sm">
            {total} páginas em {weeks} semanas
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-sm">
            <span
              className={`font-display font-extrabold text-3xl tabular-nums ${done ? 'text-gold-300' : 'text-ink-50'}`}
            >
              {today}
            </span>
            <span className="text-ink-300"> de {goal} páginas hoje</span>
          </p>
          <div className="mt-1 flex sm:justify-end">
            <GoalControl goal={goal} />
          </div>
        </div>
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: grupo de botões de dia com navegação por setas, não um formulário */}
      <div
        role="group"
        aria-label={`Páginas lidas por dia nas últimas ${weeks} semanas`}
        className="relative mt-6 flex h-44 items-end gap-[2px] border-ink-700 border-b-[8px] sm:gap-[3px]"
      >
        {days.map((d, i) => {
          const isToday = d.date === todayKey;
          const isSelected = d.date === selected;
          const h = d.pages ? Math.max(12, (d.pages / max) * 100) : 5;
          const tone =
            d.pages >= goal ? 'bg-obi-500' : d.pages > 0 ? 'bg-obi-500/50' : 'bg-ink-700';
          return (
            <button
              key={d.date}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              tabIndex={isSelected ? 0 : -1}
              aria-pressed={isSelected}
              aria-label={`${dayName(d.date)}: ${d.pages} ${d.pages === 1 ? 'página' : 'páginas'}`}
              onClick={() => setSelected(d.date)}
              onKeyDown={(e) => move(e, i)}
              className="group relative flex h-full flex-1 items-end focus-visible:outline-none"
            >
              <span
                className={`block w-full rounded-t-[2px] shadow-[inset_-2px_0_3px_-1px_rgb(0_0_0/0.45),inset_1px_0_2px_-1px_rgb(255_255_255/0.15)] transition-[height,filter] duration-500 group-hover:brightness-125 group-focus-visible:outline-2 group-focus-visible:outline-gold-400 group-focus-visible:outline-offset-2 motion-reduce:transition-none ${tone} ${
                  isSelected ? 'ring-2 ring-gold-400 ring-offset-2 ring-offset-ink-850' : ''
                } ${isToday && !isSelected ? 'ring-1 ring-gold-400/60' : ''}`}
                style={{ height: `${h}%` }}
              />
            </button>
          );
        })}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 border-gold-400/70 border-t border-dashed"
          style={{ bottom: `${(goal / max) * 100}%` }}
        >
          <span className="-top-5 absolute right-0 text-[11px] text-gold-300">meta {goal}</span>
        </span>
      </div>
      <div aria-hidden="true" className="relative mt-2 h-4 text-ink-400 text-xs">
        {months.map(({ i, label }) => (
          <span key={i} className="absolute" style={{ left: `${(i / days.length) * 100}%` }}>
            {label}
          </span>
        ))}
        <span className="absolute right-0 font-semibold text-gold-300">hoje</span>
      </div>

      {/* O dia escolhido */}
      <div aria-live="polite" className="mt-6 border-white/5 border-t pt-5">
        <p className="font-semibold text-sm">
          {dayName(selected)}
          <span className="font-normal text-ink-300">
            {' '}
            · {selectedPages} {selectedPages === 1 ? 'página' : 'páginas'}
          </span>
        </p>
        {entries.length ? (
          <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-x-4 gap-y-5">
            {entries.map((e) => (
              <li key={e.key}>
                <Link to={`/read/${e.bookId}`} className="group block space-y-2">
                  <span className="block transition-transform duration-200 group-hover:-translate-y-1">
                    <Cover bookId={e.bookId} alt="" />
                  </span>
                  <Ledge />
                  <span className="block truncate font-medium text-xs group-hover:text-obi-300">
                    {e.seriesName}
                    {e.bookTitle && e.bookTitle !== e.seriesName ? ` ${e.bookTitle}` : ''}
                  </span>
                  <span className="block text-ink-300 text-xs">{e.pages} pág.</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-ink-300 text-sm">Nenhuma página lida neste dia.</p>
        )}
      </div>
    </Panel>
  );
}

function History({ activity }: { activity: Activity }) {
  return (
    <Panel className="mt-4">
      <h2 className="font-display font-extrabold text-2xl uppercase tracking-wide">Histórico</h2>
      <ul className="mt-3 divide-y divide-white/5">
        {activity.recent.map((e) => (
          <li key={e.key}>
            <Link
              to={`/read/${e.bookId}`}
              className="group flex min-h-14 items-center gap-4 py-2.5"
            >
              <span className="w-9 shrink-0">
                <Cover bookId={e.bookId} alt="" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium group-hover:text-obi-300">
                  {e.seriesName}
                  {e.bookTitle && e.bookTitle !== e.seriesName ? ` ${e.bookTitle}` : ''}
                </span>
                <span className="block text-ink-300 text-xs">
                  {e.date === dayKey() ? 'Hoje' : SHORT.format(parse(e.date))}
                </span>
              </span>
              <span className="shrink-0 font-display font-bold text-xl tabular-nums">
                {e.pages}
                <span className="ml-1 font-sans font-normal text-ink-300 text-xs">pág.</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
