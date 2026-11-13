import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes as RouterRoutes,
  useLocation,
} from 'react-router';
import { Navbar } from '@/components/Navbar/Navbar';
import { Hero } from '@/components/Hero/Hero';
import { Destinations } from '@/components/Destinations/Destinations';
import { Routes as FlightRoutes } from '@/components/Routes/Routes';
import { ExperienceSection } from '@/components/ExperienceSection/ExperienceSection';
import { Footer } from '@/components/Footer/Footer';
import { LoginPage } from '@/components/LoginPage/LoginPage';
import { RequireCustomer } from '@/components/RequireCustomer';
import { ClientPanel } from '@/components/ClientPanel/ClientPanel';
import { SearchPage } from '@/components/SearchPage/SearchPage';
import { BookingPage } from '@/components/BookingPage/BookingPage';
import { BookingConfirmation } from '@/components/BookingConfirmation/BookingConfirmation';
import { ReservationDetail } from '@/components/ReservationDetail/ReservationDetail';
import { AgentPanel } from '@/components/AgentPanel/AgentPanel';
import { ReservationList } from '@/components/ReservationList/ReservationList';
import { BookingProvider } from '@/components/BookingProvider/BookingProvider';
import { useBooking } from '@/components/BookingProvider/useBooking';
import type { DemoCustomer } from '@/data/customers';

function AppLayout({
  customer,
  onLogout,
}: {
  customer: DemoCustomer | null;
  onLogout: () => void;
}) {
  const { pathname } = useLocation();
  return (
    <>
      <Navbar
        customer={customer}
        onLogout={onLogout}
        forceSolid={pathname !== '/'}
      />
      <Outlet />
    </>
  );
}

function AppRoutes() {
  const { customers, activeCustomer, login, register, logout } = useBooking();

  return (
    <BrowserRouter>
      <RouterRoutes>
        <Route
          element={<AppLayout customer={activeCustomer} onLogout={logout} />}
        >
          <Route
            path="/"
            element={
              <>
                <main>
                  <Hero />
                  <Destinations />
                  <FlightRoutes />
                  <ExperienceSection />
                </main>
                <Footer />
              </>
            }
          />
          <Route element={<RequireCustomer customer={activeCustomer} />}>
            <Route path="/panel" element={<ClientPanel onLogout={logout} />} />
            <Route
              path="/panel/reservas"
              element={<ReservationList />}
            />
            <Route
              path="/panel/reservas/:code"
              element={<ReservationDetail />}
            />
            <Route path="/buscar" element={<SearchPage />} />
            <Route
              path="/confirmacion"
              element={<BookingConfirmation />}
            />
          </Route>
          {/* CU-07 (C-1.7): simulated agent area — no real authentication. */}
          <Route path="/agente" element={<AgentPanel />} />
          {/* CU-04 (C-1.5): /reservar renders its own guest gate; it is not
              wrapped in RequireCustomer so visitors see the account notice
              instead of a bare redirect. */}
          <Route path="/reservar" element={<BookingPage />} />
        </Route>
        <Route
          path="/ingresar"
          element={
            <LoginPage
              activeCustomer={activeCustomer}
              customers={customers}
              onLogin={login}
              onRegister={register}
              onLogout={logout}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </RouterRoutes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <BookingProvider>
      <AppRoutes />
    </BookingProvider>
  );
}
