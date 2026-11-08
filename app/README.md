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

- `/`: landing pública.
- `/ingresar`: ingreso y registro simulado de clientes.

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
- El panel de cliente y las funcionalidades posteriores de vuelos/reservas no están implementados en este prototipo.

## Identidad y recursos

- El nombre visual de la marca es SkyNova Airlines.
- El header y el footer usan `/skynova-logo.png`, derivado de la imagen oficial proporcionada para quitar el fondo blanco y aplicar azul marino.
- Los videos y las imágenes de las tarjetas están en `public/`.

## Estructura principal

```text
src/
  components/
    Destinations/
    Footer/
    Hero/
    LoginPage/
    Navbar/
    Routes/
  data/
    customers.ts
    flights.ts
  App.tsx
  main.tsx
public/
  videos/
```

Las tarifas, conexiones aprobadas y días de operación se mantienen en `src/data/flights.ts`. Las cuentas de demostración iniciales están en `src/data/customers.ts`.

## Alcance no implementado

La aplicación todavía no incluye el panel del cliente, búsqueda o reserva de vuelos, procesamiento de pagos, autenticación real, almacenamiento persistente, servicios operativos de aerolínea ni acceso de agente. La página de ingreso sólo cubre la identificación y el registro simulados descritos arriba.
