import { Flame, House, Layers, Library, Settings } from 'lucide-react';
import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { FolderInput } from './OpenFolderButton.tsx';
import { SourceBanner } from './SourceBanner.tsx';
import { SourceSwitcher } from './SourceSwitcher.tsx';
import { Toaster } from './Toaster.tsx';

const NAV = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/library', label: 'Biblioteca', icon: Library, end: false },
  { to: '/collections', label: 'Coleções', icon: Layers, end: false },
  { to: '/activity', label: 'Leituras', icon: Flame, end: false },
  { to: '/settings', label: 'Ajustes', icon: Settings, end: false },
] as const;

/** Layout das telas fora do leitor: sidebar no desktop, tab bar embaixo no celular. */
export function AppShell() {
  const { pathname } = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: rolar ao topo a cada rota
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-dvh lg:pl-60">
      <a
        href="#conteudo"
        className="sr-only rounded-lg bg-gold-400 px-4 py-2 font-semibold text-ink-900 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        Pular para o conteúdo
      </a>
      <Toaster />
      <FolderInput />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-white/5 border-r bg-ink-900 px-3 py-5 lg:flex">
        <Link to="/" className="mb-8 flex items-center gap-2.5 px-3">
          <Logo />
          <span className="font-display font-extrabold text-2xl uppercase tracking-wider">
            Gutter
          </span>
        </Link>
        <nav className="space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-10 items-center gap-3 rounded-lg px-3 font-medium text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-ink-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`size-[18px] ${isActive ? 'text-obi-300' : ''}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <SourceSwitcher />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2.5 border-white/5 border-b bg-ink-900/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <span className="font-display font-extrabold text-xl uppercase tracking-wider">Gutter</span>
        <div className="ml-auto">
          <SourceSwitcher compact />
        </div>
      </header>

      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto max-w-[1400px] px-4 pt-6 pb-28 outline-none sm:px-8 lg:pt-10 lg:pb-16"
      >
        <SourceBanner />
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-white/5 border-t bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex h-16 flex-col items-center justify-center gap-1 text-[11px] ${
                isActive ? 'text-obi-300' : 'text-ink-300'
              }`
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function Logo({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="3" width="9" height="18" rx="1.5" className="fill-obi-500" />
      <rect x="13" y="3" width="9" height="8" rx="1.5" className="fill-ink-100" />
      <rect x="13" y="13" width="9" height="8" rx="1.5" className="fill-ink-500" />
    </svg>
  );
}
