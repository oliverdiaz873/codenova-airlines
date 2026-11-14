export interface DemoCustomer {
  email: string;
  type: 'Minorista' | 'Corporativo';
  miles: number;
  name?: string;
  /** Required by CU-02 for corporate customers, optional for retail (D-3). */
  company?: string;
  /** CU-02 academic field; optional in the type so existing fixtures stay valid. */
  address?: string;
  /** CU-02 academic field; optional in the type so existing fixtures stay valid. */
  phone?: string;
  /** Demo-only: forces the simulated confirmation email to FAIL for purchases owned by this account. Never assigned to registered customers. */
  simulatedEmailFailure?: boolean;
}

export const initialCustomers: DemoCustomer[] = [
  {
    email: 'minorista@codenova.demo',
    type: 'Minorista',
    miles: 0,
    name: 'María Rodríguez',
    address: 'Calle Duarte 45, Distrito Nacional, Santo Domingo',
    phone: '+1 809-555-0142',
  },
  {
    email: 'corporativo@codenova.demo',
    type: 'Corporativo',
    miles: 10000,
    name: 'Carlos Méndez',
    company: 'CodeNova SRL',
    address: 'Av. Winston Churchill 1099, Santo Domingo',
    phone: '+1 809-555-0175',
  },
  {
    email: 'correo-fallido@codenova.demo',
    type: 'Minorista',
    miles: 0,
    name: 'Prueba',
    address: 'Calle Demo 1, Santo Domingo',
    phone: '+1 809-555-0188',
    simulatedEmailFailure: true,
  },
];
