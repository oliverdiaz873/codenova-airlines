export interface DemoCustomer {
  email: string;
  type: 'Minorista' | 'Corporativo';
  miles: number;
  name?: string;
  company?: string;
}

export const initialCustomers: DemoCustomer[] = [
  { email: 'minorista@codenova.demo', type: 'Minorista', miles: 0 },
  { email: 'corporativo@codenova.demo', type: 'Corporativo', miles: 10000 },
];
