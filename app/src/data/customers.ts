export interface DemoCustomer {
  email: string;
  type: 'Minorista' | 'Corporativo';
  miles: number;
  name?: string;
  company?: string;
  /** Demo-only: forces the simulated confirmation email to FAIL for purchases owned by this account. Never assigned to registered customers. */
  simulatedEmailFailure?: boolean;
}

export const initialCustomers: DemoCustomer[] = [
  { email: 'minorista@codenova.demo', type: 'Minorista', miles: 0 },
  { email: 'corporativo@codenova.demo', type: 'Corporativo', miles: 10000 },
  {
    email: 'correo-fallido@codenova.demo',
    type: 'Minorista',
    miles: 0,
    name: 'Prueba',
    simulatedEmailFailure: true,
  },
];
