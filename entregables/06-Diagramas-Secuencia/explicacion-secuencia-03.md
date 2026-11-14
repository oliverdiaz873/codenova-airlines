# DI-S3 — CU-07 Actualizar información de vuelo (diagrama de secuencia)

**Fuente editable:** `sec-03-cu07-actualizar-vuelo.mmd` · **Exportación:** `sec-03-cu07-actualizar-vuelo.svg`

## Flujo representado

Actualización de servicio programado según `casos de uso.pdf` CU-07 y las decisiones aprobadas por etapas:

1. **Consulta:** el agente selecciona un `flightNumber` en `/agente`; el panel muestra los datos protegidos (ruta, aeropuertos, días, tarifa, capacidad) y el horario vigente (`currentScheduleFieldsForService` = última versión o base).
2. **Edición:** solo `departureLocal` (HH:mm) y `durationMinutes` (entero > 0) son editables; no hay campos de estado ni controles de fallo.
3. **Guardado atómico:** `updateFlightService` → `applyFlightUpdate` valida todo antes de producir estado: vuelo existente, formatos, no-op contra la última versión. El `effectiveAtMs` es no decreciente por servicio.
4. **Commit único:** solo si la transición es `ok` se hace `commit({...store, flightUpdates})`, manteniendo `storeRef` y `useState` sincronizados.
5. **Consumo:** cada consumidor resuelve por fecha con `scheduledServiceForDate`/`serviceForDate` — búsqueda, validación de reserva, itinerarios de reservas, elegibilidad de cancelación, correos y próxima salida de la landing. Una versión solo aplica si la salida vigente de esa ocurrencia es posterior al `effectiveAtMs`.

## Comportamientos clave

- **Persistencia:** solo memoria dentro de `BookingProvider`; recargar restablece la base. Sin `localStorage`/`sessionStorage`/IndexedDB.
- **Histórico:** ocurrencias ya iniciadas conservan su horario; las futuras reciben la actualización.
- **Errores:** validación, no-op o fallo → retorno sin commit; la UI muestra el mensaje sin simular guardado.

## Participantes y correspondencia con el código

| Participante | Implementación |
|---|---|
| `/agente` | `components/AgentPanel/AgentPanel.tsx` |
| BookingProvider | `components/BookingProvider/BookingProvider.tsx` (`updateFlightService`, `commit`) |
| Ops | `lib/flightUpdate.ts` (`createFlightUpdateOps`, `applyFlightUpdate`) |
| Catálogo | `data/scheduledServices.ts` |
| flightUpdates | `BookingState.flightUpdates` en memoria |
| Consumidores | `lib/flightSearch.ts`, `lib/booking.ts`, `lib/cancelPurchase.ts`, `lib/confirmationEmail.ts`, `lib/purchaseView.ts`, `components/Routes/Routes.tsx` |
