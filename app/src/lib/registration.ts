/**
 * CU-02 — Registrar cliente.
 * Source: casos de uso (Paso 3.2) and escenarios (Paso 5): the registration
 * form requests nombre, dirección, nombre de la compañía, teléfono y correo
 * electrónico, plus the corporativo/minorista classification. Escenario
 * alternativo 3 (datos incompletos): the system points out the missing data
 * and the registration does not finish until it is complete.
 *
 * Pure helpers: no state, no side effects.
 */

export interface RegistrationInput {
  name: string;
  address: string;
  phone: string;
  email: string;
  company: string;
  customerType: 'Minorista' | 'Corporativo';
}

/** Minimum number of digits accepted for a phone number (e.g. 809-555-0123). */
export const MIN_PHONE_DIGITS = 10;

/**
 * Visible labels of the required fields that are empty (or whitespace only),
 * in the order they appear in the form. The company is required only for
 * corporate customers.
 */
export function registrationMissingFields(input: RegistrationInput): string[] {
  const required: [label: string, value: string][] = [
    ['Nombre completo', input.name],
    ['Dirección', input.address],
    ['Teléfono', input.phone],
    ['Correo electrónico', input.email],
  ];
  if (input.customerType === 'Corporativo') {
    required.push(['Nombre de la compañía', input.company]);
  }
  return required
    .filter(([, value]) => value.trim() === '')
    .map(([label]) => label);
}

/** Basic e-mail shape check (something@domain.tld); not a deliverability check. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Accepts common formats such as "809-555-0123", "(809) 555 0123" or
 * "+1 809 555 0123": only digits, spaces, dashes, dots, parentheses and a
 * leading "+", with at least MIN_PHONE_DIGITS digits.
 */
export function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return false;
  return trimmed.replace(/\D/g, '').length >= MIN_PHONE_DIGITS;
}
