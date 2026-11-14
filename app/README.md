# SkyNova Airlines

Prototipo académico de una aerolínea ficticia, construido con React, TypeScript y Vite. La interfaz está en español y es adaptable a escritorio y móvil. Cubre los siete casos de uso aprobados (CU-01 a CU-07) de la práctica final INF-3290.

**Importante:** es un prototipo frontend. No hay backend, base de datos, autenticación real, pasarela de pagos ni servicios externos. Todo el estado vive en memoria (`BookingProvider`) y se pierde al recargar la página.

## Requisitos

- Node.js compatible con Vite 8.
- npm.

## Instalación y ejecución

Desde esta carpeta (`app/`):

```bash
npm install
npm run dev      # servidor de desarrollo Vite
npm run build    # tsc --noEmit + build de producción
npm run preview  # sirve el build de producción
npm run lint     # Oxlint
npm test         # Vitest (unitarias)
```

`npm run build` ejecuta TypeScript sin emitir archivos y genera el paquete de producción con Vite. `npm run lint` ejecuta Oxlint. La configuración de [Vercel](./vercel.json) reescribe las rutas a `index.html` para que las rutas internas funcionen al recargar.

## Rutas de la aplicación

| Ruta | Descripción | Acceso |
|---|---|---|
| `/` | Landing pública: hero, destinos, catálogo de conexiones, sección Experience, footer | Público (CU-01) |
| `/ingresar` | Ingreso y registro simulado de clientes | Público (CU-02) |
| `/panel` | Panel del cliente activo | Requiere sesión (CU-02) |
| `/buscar` | Búsqueda de vuelos ida y vuelta | Requiere sesión (CU-03) |
| `/reservar` | Selección de asientos, millas y confirmación de compra | Requiere sesión; muestra aviso de cuenta si no la hay (CU-04) |
| `/confirmacion` | Confirmación CN-XXXX + estado del correo simulado | Requiere sesión (CU-05) |
| `/panel/reservas` | Lista de reservaciones del cliente | Requiere sesión (CU-06) |
| `/panel/reservas/:code` | Detalle con itinerario, plazo 168 h y cancelación | Requiere sesión (CU-06) |
| `/agente` | Panel del agente de boletos | Público simulado, sin autenticación real (CU-07) |
| `*` | Cualquier otra ruta | Redirige a `/` |

`RequireCustomer` protege `/panel`, `/panel/reservas*`, `/buscar` y `/confirmacion`: sin sesión redirige a `/ingresar` conservando el destino para el retorno contextual. `/reservar` implementa su propia puerta de cliente para mostrar el aviso en lugar de una redirección. El enlace «Área del agente» del footer usa React Router (`Link`) para no recargar la página y perder el estado en memoria.

## Casos de uso implementados

- **CU-01 — Consultar información de vuelo:** landing `/` con catálogo público de las 5 conexiones aprobadas, tarifas, días de operación y próximas salidas resueltas por fecha operativa.
- **CU-02 — Registrar cliente:** `/ingresar` con login por correo (sin contraseña) y registro con nombre, dirección, teléfono, correo y tipo. Corporativo solicita compañía. Valida campos faltantes, formato de correo y teléfono (≥10 dígitos), rechaza correos duplicados y crea cuentas con 0 millas y sesión simulada.
- **CU-03 — Buscar vuelos:** `/buscar` con origen/destino, fechas dentro de 30 días, solo días operativos (Lun/Mié/Vie), ida y vuelta por la misma conexión, filtro de hora de salida por franjas (mañana/tarde/noche, solo ida), hasta 30 pasajeros y disponibilidad determinista por ocurrencia.
- **CU-04 — Reservar vuelo:** `/reservar` con mapa de asientos 10×3 por trayecto y pasajero dibujado como el avión visto desde arriba (ventana/ala identificadas), resumen de itinerario, canje de millas corporativas y confirmación atómica todo-o-nada (`applyPurchaseConfirmation`). Los vuelos marcados como no disponibles no pueden reservarse.
- **CU-05 — Enviar confirmación por correo:** correo **simulado** con estados PENDING → SENT/FAILED, retardo de 400 ms, un solo intento (sin reintentos). `correo-fallido@codenova.demo` fuerza el fallo. Un FAILED muestra alerta ámbar y **no invalida** la reserva. El contenido completo se congela como instantánea al iniciar el envío.
- **CU-06 — Cancelar reservación:** `/panel/reservas*` con elegibilidad de cancelación completa dentro de las **168 horas** previas a la salida (hora local del aeropuerto de origen, primer vuelo, inclusivo), reembolso del **80 % del total neto** redondeado al peso dominicano, liberación implícita de asientos y **sin reversión de millas**.
- **CU-07 — Actualizar información de vuelo:** `/agente` permite editar `departureLocal`, `durationMinutes`, la disponibilidad operativa (`available`) y el destino a nivel de conexión (`connectionUpdates`). Los overrides se guardan en memoria, con `effectiveAtMs`: aplican a ocurrencias futuras cuya salida vigente sea posterior al instante efectivo; las históricas conservan su horario. Se propagan a búsqueda, reserva, reservas, cancelación, correos futuros y landing. No hay persistencia (sin localStorage/sessionStorage/IndexedDB).

## Cuentas de demostración

En `src/data/customers.ts`:

- `minorista@codenova.demo` — Minorista, 0 millas.
- `corporativo@codenova.demo` — Corporativo, 10,000 millas.
- `correo-fallido@codenova.demo` — Minorista, fuerza el fallo del correo simulado.

El ingreso es solo por correo, sin contraseña; es una simulación académica. El acceso del agente en `/agente` tampoco requiere credenciales.

## Pruebas automatizadas

`npm test` ejecuta Vitest: **22 suites, 393 pruebas** cubriendo búsqueda, reserva, millas, correo, cancelación, proyección de reservas y actualizaciones temporales de vuelo (incluidas regresiones de anti-obsolescencia y snapshots de correo). Resultado verificado: todas superadas; `tsc --noEmit`, `oxlint` y `vite build` sin errores.

## Landing y catálogo

- Header con enlaces a Inicio, Destinos, Vuelos e Iniciar sesión; menú móvil adaptable.
- Hero con video `/videos/hero-video.mp4` (automático, silencioso, en bucle, inline).
- Sección Destinos con `/videos/destinos-video.mp4`.
- `src/components/Routes/Routes.tsx` muestra las 5 conexiones aprobadas de `src/data/flights.ts` con imágenes, tarifa y días de operación, más las próximas salidas operativas calculadas con el resolvedor temporal de CU-07.
- Footer con logo SkyNova, enlaces internos y «Área del agente».

## Reglas de negocio implementadas

- **Días operativos:** lunes, miércoles y viernes (`[1, 3, 5]`); 30 plazas por ocurrencia.
- **Millas:** solo clientes corporativos; conversión 10 millas = RD$1; mínimo e incrementos de 1,000 millas; tope = importe restante de la compra; las millas canjeadas **no se restauran** al cancelar.
- **Cancelación:** solo compra completa confirmada; 168 h inclusivas por hora local del origen; reembolso 80 % del neto; las millas acreditadas no se revierten.
- **Correos:** PENDING/SENT/FAILED, 400 ms, un intento; contenido congelado al enviar; los correos futuros usan horarios y destinos actualizados.
- **Actualización de vuelos:** editables hora de salida, duración, disponibilidad operativa y destino de conexión; vuelo, ruta, aeropuertos, zonas horarias, días, capacidad y tarifa son de solo lectura; persistencia solo en memoria.

## Estructura principal

```text
src/
  components/
    AgentPanel/          CU-07: panel del agente
    BookingConfirmation/ CU-05: confirmación y estado del correo
    BookingPage/         CU-04: reserva, SeatMap
    BookingProvider/     estado en memoria + transiciones atómicas
    BookingStub/         stub provisional (sin uso en rutas)
    ClientPanel/         panel del cliente
    CtaBanner/ Destinations/ Experience/ ExperienceSection/
    Footer/ Hero/ LoginPage/ Navbar/ RequireCustomer.tsx Routes/
    SearchPage/          CU-03: búsqueda
    ReservationDetail/ ReservationList/   CU-06
  data/
    customers.ts demoReservations.ts flights.ts
    routeDistances.ts scheduledServices.ts seatMap.ts
  lib/
    accrual.ts booking.ts cancelPurchase.ts confirmPurchase.ts
    confirmationEmail.ts dates.ts flightSearch.ts flightUpdate.ts
    miles.ts purchaseView.ts seatOccupancy.ts
    + suites *.test.ts (22 archivos)
  App.tsx  main.tsx  index.css
public/
  videos/  skynova-logo.png  ...
```

## Limitaciones del prototipo

- Estado 100 % en memoria: recargar la página borra clientes registrados, compras, correos y actualizaciones de vuelo.
- Sin autenticación real (ni contraseñas ni verificación); el agente entra sin credenciales.
- Sin pagos: el «pago» es la confirmación de compra simulada.
- Sin persistencia de actualizaciones de vuelo (CU-07) ni correos reales.
- Catálogo fijo y disponibilidad determinista; no hay integración con aerolíneas reales.
- `BookingStub/` se conserva como componente provisional sin ruta asociada.
