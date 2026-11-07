import { useState } from 'react';
import { BrowserRouter, Route, Routes as RouterRoutes } from 'react-router';
import { Navbar } from '@/components/Navbar/Navbar';
import { Hero } from '@/components/Hero/Hero';
import { Destinations } from '@/components/Destinations/Destinations';
import { Routes as FlightRoutes } from '@/components/Routes/Routes';
import { Footer } from '@/components/Footer/Footer';
import { LoginPage } from '@/components/LoginPage/LoginPage';
import { initialCustomers, type DemoCustomer } from '@/data/customers';

export default function App() {
  const [customers, setCustomers] = useState<DemoCustomer[]>(initialCustomers);
  const [activeCustomer, setActiveCustomer] = useState<DemoCustomer | null>(null);

  const registerCustomer = (customer: DemoCustomer) => {
    setCustomers((currentCustomers) => [...currentCustomers, customer]);
    setActiveCustomer(customer);
  };

  return (
    <BrowserRouter>
      <RouterRoutes>
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <main>
                <Hero />
                <Destinations />
                <FlightRoutes />
              </main>
              <Footer />
            </>
          }
        />
        <Route
          path="/ingresar"
          element={
            <LoginPage
              activeCustomer={activeCustomer}
              customers={customers}
              onLogin={setActiveCustomer}
              onRegister={registerCustomer}
              onLogout={() => setActiveCustomer(null)}
            />
          }
        />
      </RouterRoutes>
    </BrowserRouter>
  );
}
