import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-obi-600 text-white hover:bg-obi-500 font-semibold shadow-[0_1px_0_0_rgb(255_255_255/0.15)_inset]',
  secondary: 'bg-white/10 text-ink-50 hover:bg-white/15 font-medium',
  ghost: 'text-ink-200 hover:bg-white/10 hover:text-white font-medium',
  danger: 'bg-red-500/15 text-red-300 hover:bg-red-500/25 font-medium',
};
// Em telas de toque, todo alvo sobe para 44px.
const SIZE: Record<Size, string> = {
  sm: 'h-8 pointer-coarse:h-11 gap-1.5 rounded-md px-2.5 text-xs',
  md: 'h-10 pointer-coarse:h-11 gap-2 rounded-lg px-4 text-sm',
};

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', extra = '') {
  return `inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40 ${VARIANT[variant]} ${SIZE[size]} ${extra}`;
}

export function Button({
  variant,
  size,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function IconButton({
  label,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid size-9 shrink-0 place-items-center rounded-lg text-ink-200 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40 pointer-coarse:size-11 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  const base =
    'inline-flex h-8 pointer-coarse:h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs transition-colors';
  const tone = active
    ? 'border-ink-300/60 bg-ink-600 text-ink-50'
    : 'border-white/15 text-ink-100 hover:border-white/30 hover:text-white';
  if (!onClick) return <span className={`${base} ${tone}`}>{children}</span>;
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`${base} ${tone}`}>
      {children}
    </button>
  );
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'gold' | 'red';
  children: ReactNode;
}) {
  const tones = {
    neutral: 'bg-white/10 text-ink-200',
    gold: 'bg-gold-400/15 text-gold-300',
    red: 'bg-red-400/15 text-red-300',
  };
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium text-[11px] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display font-extrabold uppercase tracking-wide text-4xl leading-none sm:text-5xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-ink-300 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/10 border-dashed px-6 py-16 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-white/5 text-ink-300">
        {icon}
      </div>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 max-w-sm text-ink-300 text-sm">{children}</div>}
    </div>
  );
}

/** Escolha única entre poucas opções (≤4). Mesmo visual do painel do leitor. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className = '',
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: grupo de botões de alternância, não um formulário
    <div
      role="group"
      aria-label={label}
      className={`flex rounded-lg bg-ink-850 p-0.5 ring-1 ring-white/10 ${className}`}
    >
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`min-h-9 flex-1 whitespace-nowrap rounded-md px-3 text-xs transition-colors pointer-coarse:min-h-11 sm:flex-none ${
            value === v ? 'bg-ink-600 font-semibold text-ink-50' : 'text-ink-200 hover:text-white'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** Erro em linguagem clara, com o que fazer em seguida. */
export function ErrorState({
  title,
  detail,
  onRetry,
  back,
}: {
  title: string;
  detail?: string | undefined;
  onRetry?: () => void;
  back?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-2xl border border-red-400/20 bg-red-500/5 px-6 py-14 text-center"
    >
      <p className="font-semibold">{title}</p>
      {detail && <p className="mt-2 max-w-md text-ink-200 text-sm">{detail}</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {onRetry && (
          <Button variant="primary" onClick={onRetry}>
            Tentar de novo
          </Button>
        )}
        {back}
      </div>
    </div>
  );
}

export const COVER_GRID =
  'grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]';
