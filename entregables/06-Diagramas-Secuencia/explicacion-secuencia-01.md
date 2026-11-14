# DI-S1 — CU-04 Reservar vuelo (diagrama de secuencia)

**Fuente editable:** `sec-01-cu04-reservar-vuelo.mmd` · **Exportación:** `sec-01-cu04-reservar-vuelo.svg`

## Flujo representado

Escenario principal de reserva según `PLAN_CODENOVA.md` 4.8 y `casos de uso.pdf` CU-04, reflejando la implementación real:

1. **Búsqueda (CU-03):** `/buscar` consulta `searchFlights` con los `flightUpdates` vigentes; el catálogo resuelve el horario por fecha de cada ocurrencia.
2. **Límite de reserva:** la selección viaja por router state; `/reservar` la revalida con `isValidSearchSelection` y `validatePurchase` **con `flightUpdates`** — una selección obsoleta por actualización de horario se rechaza pidiendo nueva búsqueda.
3. **Asientos:** el cliente asigna un asiento por pasajero en cada trayecto; la ocupación se deriva de compras confirmadas + reservas de demostración.
4. **Confirmación atómica:** `confirmPurchase` ejecuta `applyDueAccrual` (millas pendientes), `validateSeatAvailability`, validación de millas y `buildPurchase`+`commit` en una sola transición. Cualquier error retorna sin crear compra, ocupar asientos ni descontar millas.
5. **Correo (CU-05, relación «extend»):** tras navegar a `/confirmacion`, `sendConfirmationEmail` congela el contenido con los horarios vigentes y transiciona PENDING → SENT/FAILED.

## Fragmentos alternativos

- Selección inválida/obsoleta → rechazo con nueva búsqueda.
- Asiento ocupado o capacidad insuficiente → error sin estado parcial.
- Millas inválidas/excedidas → error sin estado parcial.
- Éxito → `CN-XXXX`, millas pendientes de acreditación hasta completar el viaje.

## Participantes y correspondencia con el código

| Participante | Implementación |
|---|---|
| `/buscar` | `components/SearchPage/SearchPage.tsx` |
| Catálogo | `lib/flightSearch.ts` + `data/scheduledServices.ts` |
| `/reservar` | `components/BookingPage/BookingPage.tsx` |
| BookingProvider | `components/BookingProvider/BookingProvider.tsx` (`commit`, `storeRef`) |
| Asientos | `lib/seatOccupancy.ts` |
| Millas | `lib/miles.ts` + `lib/accrual.ts` |
| Correo | `lib/confirmationEmail.ts` |
