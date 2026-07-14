import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import SkateparksSpotsPage from '@/pages/SkateparksSpotsPage';
import SkateparksSpotsDetailPage from '@/pages/SkateparksSpotsDetailPage';
import EventVerwaltungPage from '@/pages/EventVerwaltungPage';
import EventVerwaltungDetailPage from '@/pages/EventVerwaltungDetailPage';
import AnmeldungenPage from '@/pages/AnmeldungenPage';
import AnmeldungenDetailPage from '@/pages/AnmeldungenDetailPage';
import PublicFormSkateparksSpots from '@/pages/public/PublicForm_SkateparksSpots';
import PublicFormEventVerwaltung from '@/pages/public/PublicForm_EventVerwaltung';
import PublicFormAnmeldungen from '@/pages/public/PublicForm_Anmeldungen';
// <public:imports>
// </public:imports>
// <custom:imports>
const EventErstellenPage = lazy(() => import('@/pages/intents/EventErstellenPage'));
const TeilnehmerAnmeldenPage = lazy(() => import('@/pages/intents/TeilnehmerAnmeldenPage'));
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a56741a9ef9a79ac692ad70" element={<PublicFormSkateparksSpots />} />
              <Route path="public/6a56741f84d8dce105858830" element={<PublicFormEventVerwaltung />} />
              <Route path="public/6a5674227925510842ea49d7" element={<PublicFormAnmeldungen />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="skateparks-&-spots" element={<SkateparksSpotsPage />} />
                <Route path="skateparks-&-spots/:id" element={<SkateparksSpotsDetailPage />} />
                <Route path="event-verwaltung" element={<EventVerwaltungPage />} />
                <Route path="event-verwaltung/:id" element={<EventVerwaltungDetailPage />} />
                <Route path="anmeldungen" element={<AnmeldungenPage />} />
                <Route path="anmeldungen/:id" element={<AnmeldungenDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                <Route path="intents/event-erstellen" element={<Suspense fallback={null}><EventErstellenPage /></Suspense>} />
                <Route path="intents/teilnehmer-anmelden" element={<Suspense fallback={null}><TeilnehmerAnmeldenPage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
