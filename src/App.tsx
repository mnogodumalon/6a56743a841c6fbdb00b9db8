import '@/lib/sentry';
import '@/lib/stale-bundle';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import PublicPagesAdmin from '@/pages/PublicPagesAdmin';
import SkateparksSpotsPage from '@/pages/SkateparksSpotsPage';
import SkateparksSpotsDetailPage from '@/pages/SkateparksSpotsDetailPage';
import EventVerwaltungPage from '@/pages/EventVerwaltungPage';
import EventVerwaltungDetailPage from '@/pages/EventVerwaltungDetailPage';
import AnmeldungenPage from '@/pages/AnmeldungenPage';
import AnmeldungenDetailPage from '@/pages/AnmeldungenDetailPage';
// <custom:imports>
// </custom:imports>

// Lazy: public pages live outside <Layout> and only load on /#/public/:slug —
// dashboard users never pay for them, anonymous visitors skip the dashboard.
const PublicPage = lazy(() => import('@/pages/public/PublicPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/:slug" element={<Suspense fallback={null}><PublicPage /></Suspense>} />
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="skateparks-spots" element={<SkateparksSpotsPage />} />
                <Route path="skateparks-spots/:id" element={<SkateparksSpotsDetailPage />} />
                <Route path="event-verwaltung" element={<EventVerwaltungPage />} />
                <Route path="event-verwaltung/:id" element={<EventVerwaltungDetailPage />} />
                <Route path="anmeldungen" element={<AnmeldungenPage />} />
                <Route path="anmeldungen/:id" element={<AnmeldungenDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="verwaltung/oeffentliche-seiten" element={<PublicPagesAdmin />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
