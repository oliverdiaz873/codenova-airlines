import { describe, expect, it } from 'vitest';
import {
  isValidEmail,
  isValidPhone,
  registrationMissingFields,
  type RegistrationInput,
} from '@/lib/registration';

const complete: RegistrationInput = {
  name: 'Ana Pérez',
  address: 'Av. Winston Churchill 100, Santo Domingo',
  phone: '809-555-0123',
  email: 'ana@ejemplo.com',
  company: '',
  customerType: 'Minorista',
};

describe('CU-02 registrationMissingFields', () => {
  it('returns no missing fields for a complete minorista form', () => {
    expect(registrationMissingFields(complete)).toEqual([]);
  });

  it('requires dirección and teléfono (Paso 3.2 / Paso 5)', () => {
    expect(
      registrationMissingFields({ ...complete, address: '', phone: '' }),
    ).toEqual(['Dirección', 'Teléfono']);
  });

  it('treats whitespace-only values as missing', () => {
    expect(
      registrationMissingFields({ ...complete, name: '   ' }),
    ).toEqual(['Nombre completo']);
  });

  it('requires the company only for corporate customers', () => {
    expect(registrationMissingFields(complete)).not.toContain(
      'Nombre de la compañía',
    );
    expect(
      registrationMissingFields({ ...complete, customerType: 'Corporativo' }),
    ).toEqual(['Nombre de la compañía']);
    expect(
      registrationMissingFields({
        ...complete,
        customerType: 'Corporativo',
        company: 'Acme SRL',
      }),
    ).toEqual([]);
  });

  it('lists every missing field in form order', () => {
    expect(
      registrationMissingFields({
        name: '',
        address: '',
        phone: '',
        email: '',
        company: '',
        customerType: 'Corporativo',
      }),
    ).toEqual([
      'Nombre completo',
      'Dirección',
      'Teléfono',
      'Correo electrónico',
      'Nombre de la compañía',
    ]);
  });
});

describe('CU-02 isValidPhone', () => {
  it.each(['809-555-0123', '(809) 555 0123', '+1 809 555 0123', '8095550123'])(
    'accepts %s',
    (phone) => {
      expect(isValidPhone(phone)).toBe(true);
    },
  );

  it.each(['555-0123', 'llámame', '809-555-01ab', ''])('rejects %s', (phone) => {
    expect(isValidPhone(phone)).toBe(false);
  });
});

describe('CU-02 isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail(' ana@ejemplo.com ')).toBe(true);
  });

  it.each(['ana', 'ana@ejemplo', 'ana @ejemplo.com', ''])('rejects %s', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});
