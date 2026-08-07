import '@/lib/sentry';
import '@/lib/stale-bundle';
import { Fragment, lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { locale, onLocaleChange, syncProfileLocale } from '@/i18n';
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
const EventAnlegenPage = lazy(() => import('@/pages/intents/EventAnlegenPage'));
const TeilnehmerAnmeldenPage = lazy(() => import('@/pages/intents/TeilnehmerAnmeldenPage'));
// </custom:imports>

// Lazy: public pages live outside <Layout> and only load on /#/public/:slug —
// dashboard users never pay for them, anonymous visitors skip the dashboard.
const PublicPage = lazy(() => import('@/pages/public/PublicPage'));

// Language switch = full remount below the router: every t()/label lookup
// re-evaluates, the la-* widgets re-read <html lang>. Sits INSIDE
// ActionsProvider so chat/drawer state survives a switch, and inside
// HashRouter so the current route survives (it re-reads the URL hash).
function LocaleGate({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState(locale);
  useEffect(() => onLocaleChange(() => setCurrent(locale)), []);
  // Adopt the LA profile language (SSOT) — but never on public routes,
  // where the visitor's browser language governs (initPublicLocale).
  useEffect(() => {
    if (!window.location.hash.startsWith('#/public')) void syncProfileLocale();
  }, []);
  return <Fragment key={current}>{children}</Fragment>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <LocaleGate>
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
                <Route path="intents/event-anlegen" element={<Suspense fallback={null}><EventAnlegenPage /></Suspense>} />
                <Route path="intents/teilnehmer-anmelden" element={<Suspense fallback={null}><TeilnehmerAnmeldenPage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
            </LocaleGate>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
