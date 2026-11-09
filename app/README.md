# SkyNova Airlines

Prototipo académico de una aerolínea ficticia, construido con React, TypeScript y Vite. La interfaz está en español y es adaptable a escritorio y móvil.

## Requisitos

- Node.js compatible con la versión instalada de Vite.
- npm.

## Desarrollo y validación

Desde esta carpeta (`app/`):

```bash
npm install
npm run dev
npm run build
npm run lint
```

`npm run build` ejecuta TypeScript sin emitir archivos y genera el paquete de producción con Vite. `npm run lint` ejecuta Oxlint.

La configuración de [Vercel](./vercel.json) reescribe las rutas de la aplicación a `index.html`, necesario para que rutas como `/ingresar` funcionen al abrirlas directamente o recargar la página.

## Rutas de la aplicación

- `/`: landing pública (CU-01).
- `/ingresar`: ingreso y registro simulado de clientes (C-1).
- `/panel`: panel mínimo del Cliente; requiere sesión activa.
- `/buscar`: búsqueda de vuelos CU-03; requiere sesión activa.
- `/reservar`: página provisional que recibe la selección de CU-03; CU-04 aún no está implementada.
- Cualquier otra ruta redirige a `/`.

### Landing

- Header con enlaces a Inicio, Destinos, Vuelos e Iniciar sesión. En scroll usa un fondo blanco translúcido con desenfoque; el menú móvil tiene navegación adaptable.
- Hero a pantalla completa con reproducción automática del video `/videos/hero-video.mp4`, silenciado, en bucle y compatible con reproducción inline. La CTA «Ver vuelos» lleva a `#routes`.
- Sección Destinos con el video `/videos/destinos-video.mp4`, información resumida y CTA a `#routes`.
- Catálogo de conexiones con imágenes, origen, destino, tarifa y días de operación. Los horarios no definidos se muestran como «Horario por confirmar».
- Footer con el logo procesado de SkyNova, enlaces internos, frase institucional y aviso de reinicio de datos.

### Catálogo de vuelos: precisión de los datos

`PLAN_CODENOVA.md` define cinco conexiones aprobadas, sus tarifas y los días generales de operación. Estas conexiones son las únicas entradas de `src/data/flights.ts`.

Por solicitud expresa para mostrar seis tarjetas, `src/components/Routes/Routes.tsx` añade además una **propuesta ficticia**: Madrid (MAD) → San José (SJO), RD$12,000, todos los días. No forma parte de PA-2, no es un vuelo operativo y se identifica visualmente como «Propuesta ficticia». No se debe tratar como dato aprobado ni usar para decisiones reales.

## Ingreso y registro de demostración

El flujo de `/ingresar` es una simulación académica; no ofrece autenticación, verificación de correo, contraseñas, servidor ni persistencia.

- Ingreso mediante correo y sin contraseña.
- Cuentas preconfiguradas:
  - `minorista@codenova.demo` — Minorista, 0 millas.
  - `corporativo@codenova.demo` — Corporativo, 10,000 millas.
- Registro con nombre, correo y tipo de cliente. El registro corporativo solicita también el nombre de la compañía.
- Los correos existentes, incluidos los de demostración, no se pueden volver a registrar.
- Las cuentas nuevas empiezan con 0 millas y la sesión simulada se inicia al registrarse.
- Clientes, sesiones y registros se mantienen en memoria y se pierden al recargar la página.
- Tras iniciar sesión o registrarse, el cliente vuelve al destino que lo originó cuando existe (`/buscar`, `/panel` o `/reservar`, validados contra una lista blanca); en caso contrario entra a `/panel`.

## Panel del cliente y búsqueda CU-03

`/panel` es una entrada mínima: muestra el correo, el tipo de cliente y las millas, y da acceso a «Buscar vuelos» y al cierre de sesión. No incluye historial ni reservas.

`/buscar` implementa CU-03 según `PLAN_CODENOVA.md` (3.9):

- Solo accesible con sesión de Cliente activa. Sin sesión, `RequireCustomer` redirige a `/ingresar` conservando el destino para el retorno contextual.
- Búsqueda exclusivamente de ida y vuelta por la misma conexión aprobada; el regreso usa los servicios inversos del mismo `routeId`.
- Selección de origen, destino, fecha de ida, fecha de regreso y pasajeros por tipo (adultos, niños, infantes). Máximo 30 pasajeros por búsqueda, infantes incluidos; mínimo 1.
- Fechas dentro de los próximos 30 días; solo hay servicios los lunes, miércoles y viernes. Si una fecha no tiene operación o plazas, se muestran mensajes y sugerencias de fechas próximas con disponibilidad.
- Resultados con número de vuelo, trayecto, horas locales, duración, tarifa ficticia y plazas disponibles por ocurrencia.
- La llegada se calcula como instante UTC de salida + duración, convertido a la zona IANA del destino **en la fecha del vuelo** (4.7.1). `src/lib/dates.ts` incluye un override documentado para `America/Havana` (UTC−4 desde `2026-11-01T05:00:00Z` hasta `2027-11-07T05:00:00Z` exclusivo): Cuba suspendió el regreso a hora estándar hasta noviembre de 2027 (tzdb 2026f) y el tzdata de ICU 2026b aún reporta UTC−5.
- Disponibilidad ficticia y determinista: cada ocurrencia parte de 30 plazas y `src/data/demoReservations.ts` descuenta las reservas de demostración de PA-1.10 (confirmada, cancelable y fuera de plazo) en sus vuelos y fechas ancladas. Es independiente por vuelo y fecha y se restablece al recargar.
- Seleccionar vuelos **no retiene plazas**: la disponibilidad es de solo lectura. El botón «Continuar» solo se habilita con ida y regreso seleccionados y capacidad suficiente para todo el grupo.
- Al continuar se navega a `/reservar` con la selección en el estado del router.

`/reservar` es un stub provisional: muestra el resumen de la selección (vuelo, fechas, horarios, pasajeros y total estimado) e informa que CU-04 se implementará posteriormente. No crea reservas, no selecciona asientos y no aplica millas. Si se recarga la página, el estado se pierde y la página pide una nueva búsqueda.

## Identidad y recursos

- El nombre visual de la marca es SkyNova Airlines.
- El header y el footer usan `/skynova-logo.png`, derivado de la imagen oficial proporcionada para quitar el fondo blanco y aplicar azul marino.
- Los videos y las imágenes de las tarjetas están en `public/`.

## Estructura principal

```text
src/
  components/
    BookingStub/
    ClientPanel/
    Destinations/
    Footer/
    Hero/
    LoginPage/
    Navbar/
    RequireCustomer.tsx
    Routes/
    SearchPage/
  data/
    customers.ts
    demoReservations.ts
    flights.ts
    scheduledServices.ts
  lib/
    dates.ts
    flightSearch.ts
  App.tsx
  main.tsx
public/
  videos/
```

Las conexiones, tarifas aprobadas y días de operación se mantienen en `src/data/flights.ts`. Los 20 servicios programados ficticios (4.7) están en `src/data/scheduledServices.ts` y las reservas de demostración que descuentan plazas en `src/data/demoReservations.ts`. Las cuentas de demostración iniciales están en `src/data/customers.ts`. La lógica de búsqueda, validaciones y disponibilidad está en `src/lib/flightSearch.ts` y los helpers de fechas y zonas IANA en `src/lib/dates.ts`.

## Alcance no implementado

CU-04 (reserva de vuelos) todavía no está implementada: `/reservar` es solo una página provisional. No existen reservas reales, retención de plazas, selección de asientos ni canje de millas. La aplicación tampoco incluye procesamiento de pagos, autenticación real, almacenamiento persistente, servicios operativos de aerolínea ni acceso de agente. La página de ingreso sólo cubre la identificación y el registro simulados descritos arriba.
