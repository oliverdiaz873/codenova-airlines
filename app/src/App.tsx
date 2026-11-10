import { useState } from 'react';
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
import { BookingStub } from '@/components/BookingStub/BookingStub';
import { initialCustomers, type DemoCustomer } from '@/data/customers';

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

export default function App() {
  const [customers, setCustomers] = useState<DemoCustomer[]>(initialCustomers);
  const [activeCustomer, setActiveCustomer] = useState<DemoCustomer | null>(null);

  const registerCustomer = (customer: DemoCustomer) => {
    setCustomers((currentCustomers) => [...currentCustomers, customer]);
    setActiveCustomer(customer);
  };

  const logout = () => setActiveCustomer(null);

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
            <Route path="/buscar" element={<SearchPage />} />
            <Route path="/reservar" element={<BookingStub />} />
          </Route>
        </Route>
        <Route
          path="/ingresar"
          element={
            <LoginPage
              activeCustomer={activeCustomer}
              customers={customers}
              onLogin={setActiveCustomer}
              onRegister={registerCustomer}
              onLogout={logout}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </RouterRoutes>
    </BrowserRouter>
  );
}
