# DI-S2 — CU-06 Cancelar reservación (diagrama de secuencia)

**Fuente editable:** `sec-02-cu06-cancelar-reservacion.mmd` · **Exportación:** `sec-02-cu06-cancelar-reservacion.svg`

## Flujo representado

Cancelación completa según `PLAN_CODENOVA.md` §6 (PA-5) y `casos de uso.pdf` CU-06:

1. **Consulta:** `/panel/reservas` lista solo compras del cliente activo (`customerEmail`); el detalle muestra itinerario con horarios resueltos por fecha (`flightUpdates`) y el plazo calculado con `cancelDeadlineUtcMs`.
2. **Validación atómica:** `cancelPurchase` → `applyPurchaseCancellation` verifica titularidad, estado `confirmada` y —solo si pasa— la elegibilidad temporal.
3. **Elegibilidad:** el primer vuelo de la compra se resuelve por `flightNumber` + fecha con `scheduledServiceForDate`; el plazo es **168 horas inclusivas** desde su salida, en hora local del aeropuerto de origen (zona IANA).
4. **Resultado:** nuevo `Purchase` con `status='cancelada'`, `cancelledAtMs` y `refundAmount = round(netTotal × 0.80)`; commit atómico.

## Comportamientos clave reflejados

- **Asientos:** se liberan de forma implícita — `seatOccupancy` solo cuenta compras `confirmada` (no hay borrado explícito).
- **Millas:** sin reversión — las canjeadas no regresan y las acreditadas no se revierten (decisión D-5); la cancelación no toca `customers`.
- **Errores:** cada fallo retorna sin modificar compras, asientos ni millas.

## Participantes y correspondencia con el código

| Participante | Implementación |
|---|---|
| `/panel/reservas` | `components/ReservationList/ReservationList.tsx` |
| `/panel/reservas/:code` | `components/ReservationDetail/ReservationDetail.tsx` |
| BookingProvider | `components/BookingProvider/BookingProvider.tsx` (`cancelPurchase`, `storeRef`) |
| Cancelación | `lib/cancelPurchase.ts` (`applyPurchaseCancellation`, `isCancellationEligible`, `cancelDeadlineUtcMs`) |
| Asientos | `lib/seatOccupancy.ts` (ocupación derivada) |
| Millas | `lib/miles.ts`, `lib/accrual.ts` (sin cambios en cancelación) |
