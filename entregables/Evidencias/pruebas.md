# Evidencia de pruebas — SkyNova Airlines

**Fecha de ejecución:** 14/11/2026 · **Estado del código probado:** árbol de trabajo local con la reconciliación del PR #1 (cambios sin confirmar en Git; `main` local en `6b8f2e8`, `origin/main` en `96453fce`).

## Comandos y resultados (ejecutados en esta sesión, `app/`)

| Comando | Resultado |
|---|---|
| `npm test` (vitest run) | **22 archivos de test, 393 pruebas — todas superadas** (~54 s, jsdom) |
| `npx tsc --noEmit` | Sin errores |
| `npm run lint` (oxlint) | Sin errores ni advertencias |
| `npm run build` (tsc + vite build) | Build correcto; `dist/` generado |

## Suites y cobertura por CU

| Suite | CU / área | Pruebas representativas |
|---|---|---|
| `flightSearch.test.ts` | CU-03 | búsqueda por fechas operativas, franjas horarias de salida, disponibilidad, destinos efectivos CU-07, ida/vuelta |
| `departureTimeSlot.test.ts` | CU-03 | `matchesDepartureTimeSlot` (mañana/tarde/noche), filtro solo en ida, sugerencias de fechas |
| `registration.test.ts` | CU-02 | campos faltantes, formato de correo, teléfono ≥10 dígitos |
| `LoginPage.test.tsx` | CU-02 | formulario de registro completo, compañía corporativa, teléfono inválido, correo duplicado |
| `booking.test.ts` | CU-04 | `validatePurchase`, `isValidSearchSelection`, disponibilidad de asientos |
| `confirmPurchase.test.ts` | CU-04 | commit atómico todo-o-nada, anti-obsolescencia con `flightUpdates` |
| `seatOccupancy.test.ts` | CU-04 | ocupación derivada de compras confirmadas |
| `seatLocation.test.ts` | CU-04 | `describeSeat`, ventana/ala, zonas de cabina |
| `BookingPage.test.tsx` | CU-04 | mapa de avión, selección de asientos por pasajero, bloqueo de vuelos no disponibles |
| `SearchPage.test.tsx` | CU-03/CU-07 | filtro por franja horaria, vuelo no disponible deshabilitado con explicación |
| `miles.test.ts` | CU-04 | conversión 10:1, mínimo/incremento 1.000, tope por importe |
| `confirmationEmail.test.ts` | CU-05 | PENDING→SENT/FAILED, 400 ms, idempotencia, snapshot, cuenta forzada |
| `cancelPurchase.test.ts` | CU-06 | elegibilidad 168 h inclusiva, reembolso 80 % redondeado, sin reversión de millas |
| `purchaseView.test.ts` | CU-06 | proyección de reservas para el cliente |
| `accrual.test.ts` | CU-04/CU-06 | `applyDueAccrual` de millas pendientes |
| `demoPurchases.test.ts` | CU-04/CU-07 | reservas demo materializadas como compras |
| `connectionUpdate.test.ts` | CU-07 | actualización de destino a nivel de conexión |
| `flightUpdate.test.ts` | CU-07 | resolución temporal por fecha, `effectiveAtMs`, ocurrencias históricas |
| `flightUpdateOps.test.ts` | CU-07 | `createFlightUpdateOps`: validación de campos, clamps, transiciones |
| `ClientPanel.test.tsx` | CU-02/CU-06 | panel del cliente, datos de registro, acceso a reservas |
| `ReservationDetail.test.tsx` | CU-06 | detalle y cancelación de reserva |
| `Routes.test.tsx` | CU-01 | catálogo público y estado vacío |

## Regresiones relevantes verificadas

- Selección fresca tras actualización CU-07 aceptada; selección obsoleta rechazada (`confirmPurchase.test.ts`).
- Reserva confirmada antes de una actualización conserva su horario en detalle/correo (`flightUpdate.test.ts`, `confirmationEmail.test.ts`).
- Envío de correo idempotente: no duplica intentos (`confirmationEmail.test.ts`).
- Cancelación fuera de plazo no modifica la compra (`cancelPurchase.test.ts`).
- Vuelo marcado no disponible por el agente aparece deshabilitado y no puede reservarse (`SearchPage.test.tsx`, `BookingPage.test.tsx`).
- Las reservas demo ocupan asientos reales y liberan al cancelar (`seatOccupancy.test.ts`, `demoPurchases.test.ts`).

## Notas de procedencia

- La reconciliación con el PR #1 adoptó la implementación del PR para registro (campos faltantes, teléfono ≥10 dígitos), filtro horario por franjas (mañana/tarde/noche) y mapa de asientos con forma de avión (ventana/ala), conservando las funcionalidades locales no incluidas en el PR (disponibilidad, destinos por conexión, reservas demo como compras, millas históricas y pruebas de componentes).
- Resultados anteriores del proyecto: 252 pruebas sobre `6b8f2e8`; el conteo actual es **393** tras las suites de componentes y las nuevas libs de las correcciones académicas.
- La validación visual manual de cada CU quedó registrada en el historial del plan; este documento resume la evidencia automatizada ejecutable.
