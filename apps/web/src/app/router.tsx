import { createBrowserRouter, Link } from 'react-router';
import { AppShell } from '../components/AppShell.tsx';
import { EmptyState } from '../components/ui.tsx';
import { ActivityPage } from '../features/activity/ActivityPage.tsx';
import { CollectionPage } from '../features/collections/CollectionPage.tsx';
import { CollectionsPage } from '../features/collections/CollectionsPage.tsx';
import { HomePage } from '../features/home/HomePage.tsx';
import { LibraryPage } from '../features/library/LibraryPage.tsx';
import { SeriesPage } from '../features/series/SeriesPage.tsx';
import { SettingsPage } from '../features/settings/SettingsPage.tsx';

function NotFound() {
  return (
    <EmptyState icon={<span className="font-black">404</span>} title="Página não encontrada">
      <Link to="/" className="text-obi-300 hover:underline">
        Voltar para o início
      </Link>
    </EmptyState>
  );
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/library', element: <LibraryPage /> },
      { path: '/series/:seriesId', element: <SeriesPage /> },
      { path: '/collections', element: <CollectionsPage /> },
      { path: '/collections/:collectionId', element: <CollectionPage /> },
      { path: '/activity', element: <ActivityPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    // Leitor fora do shell (tela cheia) e em chunk separado.
    path: '/read/:bookId',
    lazy: async () => ({
      Component: (await import('../features/reader/ReaderPage.tsx')).ReaderRoute,
    }),
  },
]);
