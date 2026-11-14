# Especificación de Requerimientos de Software (SRS)

**Proyecto:** SkyNova Airlines — Sistema web de reservación de vuelos en línea (prototipo académico)
**Asignatura:** INF-3290 — Análisis y Diseño de Sistemas
**Equipo:** CodeNova
**Versión:** 1.0 — Cierre del proyecto
**Fecha:** 2026-11-13
**Estado:** Documento de entrega académica

---

## 1. Introducción

### 1.1 Propósito del documento

Este documento especifica los requerimientos funcionales y no funcionales del prototipo SkyNova Airlines, desarrollados como práctica final de la asignatura INF-3290. Constituye el modelo SRS (Software Requirements Specification) del proceso de diseño descrito en la guía académica y sirve de base para los modelos de casos de uso, escenarios, diagramas de secuencia, clases, actividad e interfaz gráfica entregados junto a este documento.

### 1.2 Alcance del sistema

SkyNova Airlines es un **prototipo frontend** de una aerolínea ficticia. Cubre la capa visual y de interacción de un sistema de reservación de vuelos: consulta pública de información, registro de clientes, búsqueda, reserva con selección de asientos, uso de millas corporativas, confirmación simulada por correo, cancelación con reembolso y actualización de información de vuelos por un agente de boletos.

El sistema **no** incluye backend, base de datos, autenticación real, procesamiento de pagos ni servicios externos operativos. Todos los datos son ficticios, se simulan en memoria y se restablecen al recargar la página.

### 1.3 Descripción general del producto

La aplicación es una Single Page Application (SPA) construida con React 19, TypeScript y Vite, con enrutamiento mediante React Router. Todo el estado de negocio reside en un único proveedor (`BookingProvider`) en memoria, con transiciones puras y atómicas para reserva, cancelación, millas y actualización de vuelos.

### 1.4 Tipos de usuarios y actores

Según `casos de uso.pdf` (Paso 3.1), los actores son:

| Actor | Descripción |
|---|---|
| **Visitante** | Consulta información pública de vuelos y puede registrarse; sin registro no puede reservar. |
| **Cliente** | Busca vuelos, reserva y solicita cancelaciones; utiliza millas cuando cumple las condiciones. El cliente corporativo y el minorista son variantes del mismo actor. |
| **Agente de boletos** | Consulta y actualiza información de los vuelos. |
| **Servicio de correo electrónico** | Sistema externo que participa en el envío de confirmaciones después de reservar; en el prototipo se simula. |

En la implementación, el Visitante accede a la landing `/`; el Cliente inicia sesión simulada por correo en `/ingresar`; el Agente accede a `/agente` sin autenticación real.

### 1.5 Entorno de operación

- Navegador web moderno (Chrome, Edge, Firefox).
- Servidor de desarrollo Vite (`npm run dev`) o build de producción estático (`npm run build` + `vite preview`).
- Sin conexión a internet ni servicios externos en tiempo de ejecución.

### 1.6 Restricciones

- Frontend únicamente; sin backend, base de datos ni persistencia.
- Estado 100 % en memoria: recargar la página restablece clientes, compras, millas y actualizaciones de vuelo.
- Autenticación simulada (correo sin contraseña); el acceso del agente no tiene credenciales.
- Correo de confirmación simulado; no se envían correos reales.
- Idioma de interfaz: español.

### 1.7 Suposiciones y dependencias

- Los 20 servicios programados, las 5 conexiones, las tarifas, las distancias y los datos de demostración son ficticios y aprobados para el prototipo (`PLAN_CODENOVA.md` 4.1, 4.7).
- Los vuelos operan lunes, miércoles y viernes (PA-2, 4.3).
- Las zonas horarias se resuelven con identificadores IANA por aeropuerto y fecha.

## 2. Requisitos funcionales

Los requerimientos funcionales se derivan de los siete casos de uso documentados en `casos de uso.pdf` y de las decisiones aprobadas registradas en `PLAN_CODENOVA.md`.

### 2.1 CU-01 — Consultar información de vuelo

| ID | Requerimiento |
|---|---|
| RF-01.1 | La landing `/` es de acceso público y muestra las conexiones aprobadas con origen, destino, tarifa por pasajero y días de operación. |
| RF-01.2 | La landing muestra las horas de salida vigentes de la **próxima salida operativa que aún no ha partido**, resueltas con las actualizaciones de CU-07 vigentes en la sesión. |
| RF-01.3 | La consulta pública no ofrece búsqueda ni reserva; eso pertenece a CU-03/CU-04 con sesión de Cliente. |

### 2.2 CU-02 — Registrar cliente

| ID | Requerimiento |
|---|---|
| RF-02.1 | El visitante puede registrarse en `/ingresar?mode=register` con nombre, dirección, teléfono, correo electrónico y tipo de cliente (Minorista/Corporativo); el corporativo indica además el nombre de la compañía. |
| RF-02.2 | El teléfono admite formatos comunes (`+`, espacios, guiones, puntos y paréntesis) con al menos 10 dígitos; el correo debe tener formato válido y ser único entre clientes, incluidos los correos de demostración. |
| RF-02.3 | El registro corporativo y el minorista son variantes del mismo caso de uso; ambos comparten panel y funcionalidades. |
| RF-02.4 | Las cuentas nuevas inician con 0 millas; la sesión simulada comienza al registrarse. |

### 2.3 CU-03 — Buscar vuelos

| ID | Requerimiento |
|---|---|
| RF-03.1 | Solo clientes con sesión activa pueden buscar (`/buscar`); el intento sin sesión dirige a `/ingresar` con retorno contextual. |
| RF-03.2 | La búsqueda es de ida y vuelta por la misma conexión, con origen, destino, fechas de ida/vuelta y pasajeros por tipo (adultos, niños, infantes); máximo 30 pasajeros. |
| RF-03.3 | Las fechas deben estar dentro de los próximos 30 días y ser días operativos (lunes, miércoles, viernes); el regreso no puede ser anterior a la ida. |
| RF-03.4 | Los resultados muestran número de vuelo, trayecto, hora local de salida, llegada calculada con la zona IANA del destino en la fecha del vuelo, duración, tarifa y plazas disponibles por ocurrencia. |
| RF-03.5 | La disponibilidad es ficticia y determinista: 30 plazas por ocurrencia menos los asientos ocupados por compras confirmadas, incluidas las reservas de demostración materializadas como compras; cancelar una reserva libera sus plazas y seleccionar vuelos no retiene plazas. |
| RF-03.6 | Si una fecha no tiene operación o capacidad suficiente, se informan mensajes y sugerencias de fechas próximas con disponibilidad. |
| RF-03.7 | La búsqueda admite un filtro opcional de hora de salida por franjas horarias predefinidas (mañana 05:00–11:59, tarde 12:00–17:59, noche 18:00–04:59, o «cualquier hora») aplicado únicamente al trayecto de ida; el regreso no se filtra por ese criterio. |
| RF-03.8 | Las ocurrencias marcadas como no disponibles por CU-07 se listan deshabilitadas con una explicación y no pueden seleccionarse. |

### 2.4 CU-04 — Reservar vuelo

| ID | Requerimiento |
|---|---|
| RF-04.1 | La reserva requiere sesión de Cliente; un visitante que intenta reservar ve el aviso de cuenta («Para reservar necesitas una cuenta») con acceso a registro o ingreso. |
| RF-04.2 | La selección de la búsqueda se valida en el límite de `/reservar` (estructura, horarios vigentes por fecha, tarifa, conexión efectiva de origen/destino y fechas coherentes); una selección obsoleta por actualización de horario o de destino se rechaza con «La información del vuelo cambió; realiza una nueva búsqueda.» |
| RF-04.3 | Se asigna un asiento por pasajero en cada trayecto (ida y vuelta), desde un mapa de 10 × 3 (30 asientos) representado como el avión visto desde arriba, con asientos de ventana y zona del ala identificados. No se permite repetir asiento en un mismo trayecto ni ocupar asientos ya reservados. |
| RF-04.4 | El cliente corporativo puede canjear millas: equivalencia 10 millas = RD$1 de descuento, mínimo e incrementos de 1,000 millas, tope en el importe pendiente de la compra, solo sobre el total. |
| RF-04.5 | La confirmación es atómica y todo-o-nada: si cualquier validación falla (asientos, millas, importe, selección obsoleta), no se crea compra, no se ocupan asientos ni se descuentan millas. |
| RF-04.6 | La compra genera una reserva principal visible (código `CN-XXXX`) más componentes por pasajero y trayecto; el precio es tarifa × 2 trayectos × pasajeros. |
| RF-04.7 | La confirmación exitosa navega a `/confirmacion` con el código y la selección; la milla acreditable queda pendiente hasta completarse el viaje (ida y vuelta). |
| RF-04.8 | La compra confirmada conserva la tarifa pagada y los aeropuertos de origen/destino como instantánea; una actualización posterior del destino de la conexión no reprecio ni reescribe las compras ya confirmadas. |

### 2.5 CU-05 — Enviar confirmación por correo

| ID | Requerimiento |
|---|---|
| RF-05.1 | Tras confirmar una compra, el sistema simula el envío del correo de confirmación con estados PENDING → SENT o FAILED tras un retardo simulado de 400 ms. |
| RF-05.2 | El contenido del correo incluye código de reserva, itinerario por tramo, pasajeros, asientos, millas utilizadas, descuento y totales. |
| RF-05.3 | La cuenta `correo-fallido@codenova.demo` fuerza determinísticamente el estado FAILED; un FAILED no invalida la reserva ni genera reintentos automáticos. |
| RF-05.4 | El envío es idempotente: re-renderizados, remontajes o navegación repetida no duplican el intento. |
| RF-05.5 | El contenido del correo queda congelado como instantánea (`confirmationEmailContent`) en la compra en el momento del intento de envío, para SENT y para FAILED. |

### 2.6 CU-06 — Cancelar reservación

| ID | Requerimiento |
|---|---|
| RF-06.1 | El cliente puede cancelar sus reservaciones desde `/panel/reservas` y `/panel/reservas/:code`; solo reservas propias y confirmadas. |
| RF-06.2 | La elegibilidad exige que la solicitud ocurra dentro de las 168 horas **inclusive** anteriores a la salida del primer vuelo, medida en la hora local del aeropuerto de origen. Fuera de esa ventana la cancelación queda **bloqueada** (la acción se muestra deshabilitada con su explicación) y la reservación permanece confirmada; no existe cancelación tardía sin reembolso. |
| RF-06.3 | La cancelación es completa (sin cancelaciones parciales) y genera un reembolso simulado del **80 % del neto pagado**, redondeado al peso dominicano; el 20 % restante no se devuelve. |
| RF-06.4 | La cancelación libera los asientos de forma implícita (la ocupación se deriva de compras confirmadas) y conserva la reserva en el historial con estado «cancelada», instante `cancelledAtMs` y `refundAmount`. |
| RF-06.5 | Las millas no se reponen: las canjeadas no regresan y las acreditadas no se revierten por la cancelación (decisión D-5). Una compra cancelada antes de completar el viaje no acredita millas (D-1, v2.10). |
| RF-06.6 | La cancelación es atómica: un fallo de validación no modifica compra, asientos ni millas. |

### 2.7 CU-07 — Actualizar información de vuelo

| ID | Requerimiento |
|---|---|
| RF-07.1 | El agente de boletos accede a `/agente` sin autenticación real (acceso simulado) y puede consultar los 20 servicios programados por número de vuelo. |
| RF-07.2 | Son editables la hora de salida (`departureLocal`, formato HH:mm), la duración (`durationMinutes`, entero > 0) y la disponibilidad operativa (`available`, booleano). Número de vuelo, ruta, aeropuertos, zonas horarias, días de operación, capacidad y tarifa son de solo consulta. |
| RF-07.3 | La actualización se realiza mediante `updateFlightService` del proveedor de estado; los cambios se guardan como versiones temporales por servicio con instante efectivo, en orden de inserción y no decreciente. |
| RF-07.4 | Una actualización aplica únicamente a ocurrencias cuya salida vigente aún no haya ocurrido al momento de la actualización; las ocurrencias ya salidas conservan su horario histórico. La vigencia se decide comparando el instante UTC de salida (zona IANA del origen) con el instante efectivo de la versión. |
| RF-07.5 | Los cambios se conservan exclusivamente en memoria dentro de `BookingProvider`: sin `localStorage`, `sessionStorage`, IndexedDB ni backend; una recarga de la página restablece los horarios base. |
| RF-07.6 | Las actualizaciones de horario, duración, disponibilidad y destino de la conexión se propagan a búsqueda, reserva, reservaciones existentes, correos futuros y la landing (que muestra la próxima salida operativa aún no iniciada); los correos ya generados conservan su instantánea y no se ven alterados. |
| RF-07.7 | Guardar sin cambios o con datos inválidos se rechaza sin modificar el estado; no hay controles de simulación de fallos en la interfaz. |
| RF-07.8 | El agente puede cambiar el destino de una conexión a un aeropuerto IATA con tarifa aprobada desde el mismo origen. El cambio es de nivel de conexión (afecta ambos trayectos), se resuelve una vez por viaje con la fecha de ida y conserva la coherencia de destino entre ida y vuelta. |

## 3. Requisitos no funcionales

| ID | Requerimiento |
|---|---|
| RNF-01 | Interfaz en español, responsive (escritorio y móvil), coherente con la identidad visual aprobada de SkyNova Airlines; las pantallas transaccionales incluyen reglas `@media` para móvil. |
| RNF-02 | Lógica de negocio en funciones puras y transiciones atómicas (`applyPurchaseConfirmation`, `applyPurchaseCancellation`, `applyDueAccrual`, `applyFlightUpdate`), probada con Vitest, incluida una capa de pruebas de componentes con Testing Library y jsdom. |
| RNF-03 | Cero persistencia externa: todo el estado vive en memoria y se reinicia al recargar. |
| RNF-04 | Determinismo: ocupación de asientos, envío de correo fallido y datos de demostración son reproducibles. |
| RNF-05 | Calidad verificable: suite de pruebas automatizadas, `tsc --noEmit`, oxlint y build de producción correctos. |

## 4. Reglas de negocio

| Regla | Detalle | Origen |
|---|---|---|
| Días de operación | Lunes, miércoles y viernes | PA-2 (4.3) |
| Tarifas | Mismo precio por conexión en ambos sentidos y para todas las edades; RD$ con impuestos incluidos | PA-2 (4.2), decisión del equipo |
| Capacidad | 30 asientos por ocurrencia (`vuelo|fecha`) | PA-2 (4.4), decisión del equipo |
| Millas — acumulación | Solo clientes corporativos; millas = distancia del trayecto × pasajeros; se acreditan de forma perezosa al completarse el viaje (ida y vuelta) | PA-3 (5.2), D-1, D-2, D-3 |
| Millas — canje | 10 millas = RD$1; mínimo/pasos de 1,000; tope en el importe pendiente; solo reservas propias del titular; sin transferencias | PA-3 (5.2), C-2, D-4, D-6 |
| Millas — cancelación | No se reponen canjeadas ni se revierten acreditadas | D-5 |
| Reserva | Una compra = reserva principal + componentes por pasajero/trayecto; confirmación todo-o-nada | C-3 (4.8) |
| Cancelación | Completa; 168 h inclusivas desde la salida del primer vuelo (hora local del origen); reembolso 80 % del neto; fuera de plazo la acción se bloquea | PA-5 (6.2), D-12 |
| Correo | Simulado; estados PENDING/SENT/FAILED; contenido congelado en la compra | CU-05, decisión CU-07 |
| Actualización de vuelo | Hora de salida, duración, disponibilidad y destino de la conexión; aplica a ocurrencias no iniciadas; en memoria; histórico y compras confirmadas preservados | CU-07, decisiones aprobadas por etapas |

## 5. Interfaces e interacciones principales

| Ruta | Actor | Caso de uso |
|---|---|---|
| `/` | Visitante/Cliente/Agente | CU-01 (consulta pública + catálogo) |
| `/ingresar` | Visitante | CU-02 / mecanismo de identificación (C-1) |
| `/panel` | Cliente | Panel del cliente |
| `/panel/reservas`, `/panel/reservas/:code` | Cliente | CU-06 (consulta y cancelación) |
| `/buscar` | Cliente | CU-03 |
| `/reservar` | Cliente (Visitante ve aviso) | CU-04 |
| `/confirmacion` | Cliente | CU-04/CU-05 (estado de la compra y correo simulado) |
| `/agente` | Agente de boletos | CU-07 |

## 6. Exclusiones y limitaciones del prototipo

- Sin backend, base de datos, autenticación real, pagos ni servicios externos.
- Datos ficticios; comportamiento de demostración.
- Sin cancelaciones parciales ni combinación de conexiones (pendientes operativos aprobados, PLAN 4.8.9, 9.4).
- Sin consulta de correos enviados fuera de la pantalla de confirmación; el historial de correos no existe como funcionalidad.
- La elegibilidad de cancelación usa la hora local del aeropuerto de origen; no hay gestión de zonas horarias complejas más allá de IANA por fecha.
- La búsqueda puede listar una ocurrencia del día que ya partió (limitación conocida del prototipo; no afecta las reservas, que validan por fecha e instante).

## 7. Trazabilidad

| Requerimiento | Caso de uso | Documento de diseño | Implementación |
|---|---|---|---|
| RF-01.x | CU-01 | `casos de uso.pdf`, Paso 5 CU-01 | `components/Routes`, landing `/` |
| RF-02.x | CU-02 | Paso 5 CU-02 | `components/LoginPage`, `components/ClientPanel`, `lib/registration`, `data/customers` |
| RF-03.x | CU-03 | Paso 5 CU-03, PLAN 3.9 | `components/SearchPage`, `lib/flightSearch`, `lib/seatOccupancy` |
| RF-04.x | CU-04 | Paso 5 CU-04, PLAN 4.8, 5.2 | `components/BookingPage`, `lib/booking`, `lib/confirmPurchase`, `lib/seatOccupancy`, `lib/miles`, `lib/demoPurchases` |
| RF-05.x | CU-05 | Paso 5 CU-05, PLAN 3.5 | `lib/confirmationEmail`, `components/BookingConfirmation` |
| RF-06.x | CU-06 | Paso 5 CU-06, PLAN 6 | `lib/cancelPurchase`, `components/ReservationList/Detail`, `lib/purchaseView` |
| RF-07.x | CU-07 | Paso 5 CU-07, PLAN v2.12 §4.9 | `components/AgentPanel`, `lib/flightUpdate`, `lib/connectionUpdate`, `components/BookingProvider` |

---

*Fin del SRS. Las diferencias entre el modelo académico original y la implementación se documentan explícitamente en `PLAN_CODENOVA.md` (decisiones del equipo) y en la sección 6 de este documento.*
