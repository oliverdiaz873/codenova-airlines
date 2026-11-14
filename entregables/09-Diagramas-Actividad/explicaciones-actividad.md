# Explicación de los diagramas de actividad (Paso 9)

Siete diagramas de actividad de **nivel medio** (flujo dentro de cada caso de uso con caminos alternativos), uno por CU. Fuentes editables: `act-XX-*.mmd`. Exportaciones: `act-XX-*.svg`.

## CU-01 — Consultar información de vuelo
`act-01-cu01-consultar-vuelo`
Flujo público: acceso a `/` → presentación del catálogo → decisión «¿hay información?» → tarjetas con tarifa, días y próximas salidas vigentes (resueltas con CU-07) o aviso de indisponibilidad. Sin registro requerido.

## CU-02 — Registrar cliente
`act-02-cu02-registrar-cliente`
Formulario de registro → validación de datos completos y correo único (bucles de corrección) → bifurcación por clasificación (Corporativo/Minorista) → cliente registrado con 0 millas y sesión simulada.

## CU-03 — Buscar vuelos
`act-03-cu03-buscar-vuelos`
Sesión requerida → criterios → validación (fechas 30 días, orden, ≤30 pasajeros) → `searchFlights` con días operativos y horarios vigentes → decisión de resultados y capacidad del grupo → continuación a `/reservar` o sugerencias de fechas.

## CU-04 — Reservar vuelo
`act-04-cu04-reservar-vuelo`
Sesión → validación de selección vigente (anti-obsolescencia CU-07) → asignación de asientos con bucle de corrección → resumen → canje opcional de millas con validación → `confirmPurchase` atómico con decisión final → `/confirmacion` + correo CU-05.

## CU-05 — Enviar confirmación por correo
`act-05-cu05-correo-confirmacion`
Compra confirmada → decisión de idempotencia → congelación del contenido → PENDING → decisión de resultado simulado (cuenta forzada FAILED vs SENT) → alerta ámbar o confirmación. El FAILED no invalida la reserva; sin reintentos.

## CU-06 — Cancelar reservación
`act-06-cu06-cancelar-reservacion`
Reserva propia y confirmada → cálculo del plazo (168 h inclusivas, hora local del origen, primer vuelo) → decisión de elegibilidad → commit atómico con reembolso 80 % → liberación implícita de asientos y sin reversión de millas → historial conservado.

## CU-07 — Actualizar información de vuelo
`act-07-cu07-actualizar-vuelo`
Selección de vuelo → datos protegidos de solo lectura → edición de los dos campos → decisión «¿hay cambios?» → validación de formatos → `applyFlightUpdate` → decisión de transición → commit en memoria → propagación a consumidores con histórico preservado.
