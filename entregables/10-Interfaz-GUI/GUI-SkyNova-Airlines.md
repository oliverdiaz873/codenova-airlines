# SkyNova Airlines — Análisis de tareas e interfaz gráfica (Paso 10)

**Curso:** INF-3290 · **Proyecto:** SkyNova Airlines (prototipo académico frontend) · **Base:** implementación real en `app/` de `main` local (commit `c88dcde` + merge `0e59567` con `origin/main`; push pendiente).

## 1. Objetivo de la interfaz

Proveer una experiencia web de consulta y reserva de vuelos de una aerolínea ficticia, con registro de clientes simulado, panel de reservas, cancelación con reembolso y un panel de agente para actualizar información de vuelos. Es un **prototipo académico**: datos estáticos, estado en memoria y servicios simulados.

## 2. Tipos de usuarios

| Actor | Descripción | Autenticación |
|---|---|---|
| Visitante | Consulta la landing pública; puede registrarse | Ninguna |
| Cliente Minorista | Cliente registrado; busca, reserva, cancela; sin millas canjeables | Simulada (selección de cuenta demo, sin contraseña real) |
| Cliente Corporativo | Igual que minorista + canje de millas (10 millas = RD$1) | Simulada |
| Agente de boletos | Actualiza hora de salida y duración de vuelos | **Simulada: acceso directo a `/agente` sin credenciales** |

## 3. Tareas por usuario

| Usuario | Tareas | CUs |
|---|---|---|
| Visitante | Consultar catálogo y tarifas; registrarse; iniciar sesión | CU-01, CU-02 |
| Cliente | Buscar vuelos; asignar asientos; canjear millas; confirmar; ver detalle; cancelar con reembolso | CU-03…CU-06 |
| Agente | Seleccionar vuelo; consultar datos protegidos; editar hora/duración; guardar actualización | CU-07 |

## 4. Navegación general

```text
/  (landing pública: Hero, Destinations, Routes, ExperienceSection, Footer)
├── CTA → /ingresar (acceso/registro)
├── Footer «Área del agente» → /agente  (Link SPA, no recarga)
├── /ingresar → /panel (tras login/registro)
├── /panel → /buscar → /reservar → /confirmacion
├── /panel/reservas → /panel/reservas/:code
└── rutas desconocidas → redirect a /
```

`RequireCustomer` protege `/panel`, `/panel/reservas*`, `/buscar`, `/confirmacion`: sin sesión simula acceso a `/ingresar`. `/reservar` tiene su propia puerta de cliente (muestra aviso con acceso a registro en lugar de redirigir). `/agente` es público por diseño académico (C-1.7).

## 5. Pantallas reales

| Ruta | Pantalla | Descripción |
|---|---|---|
| `/` | Landing | Hero, destinos, tarjetas de conexiones (`Routes`), sección Experience, footer con enlace al agente. Muestra próximas salidas resueltas por fecha operativa (CU-07). |
| `/ingresar` | Acceso/registro | Tabs login/registro; el registro pide nombre, dirección, teléfono, correo y tipo (Corporativo pide compañía). Valida campos faltantes, formato de correo y teléfono (≥10 dígitos, admite `+`, espacios, guiones, puntos y paréntesis) y evita correos duplicados. Cuentas demo precargadas. |
| `/panel` | Panel cliente | Resumen del cliente activo (tipo, millas, compañía, dirección y teléfono) y accesos a búsqueda/reservas. |
| `/buscar` | Búsqueda | Origen/destino, fechas ida/vuelta (ventana 30 días, días operativos Lun/Mié/Vie), filtro de hora de salida por franjas mañana/tarde/noche (solo ida) y pasajeros ≤30; resultados con horario vigente y disponibilidad. Los vuelos marcados como no disponibles se muestran deshabilitados con su explicación. |
| `/reservar` | Reserva | Mapa de asientos 10×3 por trayecto y pasajero con forma de avión (ventana/ala identificadas, asientos de ventana resaltables), resumen, canje de millas corporativas, confirmación atómica. |
| `/confirmacion` | Confirmación | Número CN-XXXX, itinerario, estado del correo simulado (PENDING/SENT/FAILED). |
| `/panel/reservas` | Mis reservaciones | Lista del cliente con estado y elegibilidad de cancelación. |
| `/panel/reservas/:code` | Detalle | Itinerario con horario vigente, importe, estado de millas (pendientes, acumuladas o no acumuladas), plazo 168 h y botón de cancelación; fuera de plazo la acción aparece bloqueada con su explicación. |
| `/agente` | Panel agente | Selector de vuelo, datos protegidos de solo lectura, edición de hora de salida, duración y disponibilidad, y cambio de destino de la conexión, con guardado validado. |

## 6. Flujos principales

1. **Reserva:** landing → `/ingresar` → `/buscar` → seleccionar ida/vuelta → `/reservar` (asientos + millas) → `/confirmacion` + correo simulado.
2. **Cancelación:** `/panel/reservas/:code` → verificar elegibilidad 168 h → confirmar → estado cancelada + reembolso 80 %.
3. **Actualización (agente):** footer → `/agente` → elegir vuelo → editar hora, duración o disponibilidad, o cambiar el destino de la conexión → guardar → los cambios vigentes se propagan a búsqueda, reservas, correos futuros y landing.

## 7. Relación tareas ↔ casos de uso

Cada pantalla implementa un CU: landing→CU-01; `/ingresar`→CU-02; `/buscar`→CU-03; `/reservar`→CU-04; `/confirmacion` (correo)→CU-05; `/panel/reservas*`→CU-06; `/agente`→CU-07.

## 8. Evidencias visuales

- `app/screenshots/` — 11 capturas originales del proyecto (landing/ExperienceSection). **No modificadas.**
- `capturas/` (esta carpeta) — capturas nuevas generadas con Chrome headless sobre `npm run dev`:
  - `landing.png` — `/` pública.
  - `ingresar.png` — formulario de acceso/registro.
  - `agente.png` — panel del agente (acceso simulado).
  - `buscar-sin-sesion.png` — `/buscar` sin sesión → redirección a `/ingresar` (evidencia del control de acceso).
  - `reservar-sin-sesion.png` — `/reservar` sin sesión → aviso de cuenta requerida.

### Limitaciones de la evidencia visual

- El estado es **en memoria**: no es posible capturar con una URL estática las pantallas autenticadas con datos (búsqueda con resultados, reserva, confirmación, cancelación). Se requeriría un arnés de pruebas E2E o sesión interactiva.
- Las capturas headless son de viewport 1440×900 y no sustituyen la validación manual ya realizada durante cada CU.
- El modelo que generó este documento no pudo inspeccionar visualmente las imágenes; la verificación de contenido queda para revisión humana. Los SVG de diagramas sí fueron validados como XML y renderizados a PNG de control en `entregables/herramientas/_preview/`.

## 9. Limitaciones de la interfaz académica

- Sin backend, base de datos ni autenticación real; recarga = estado vacío.
- Sin pasarela de pago ni SMTP: el correo es simulado (PENDING→SENT/FAILED, 400 ms, una cuenta forzada a fallo).
- Catálogo fijo (5 conexiones, 20 servicios, Lun/Mié/Vie, 30 asientos).
- El agente no tiene credenciales reales; las actualizaciones son solo hora de salida, duración, disponibilidad y destino de la conexión, en memoria.
- Las pantallas transaccionales (`/reservar`, `/confirmacion`, `/panel/reservas*`, `/panel`, `/agente`) incluyen reglas `@media` para apilar filas, acciones y mapas de asientos en móvil; no se realizó una auditoría visual exhaustiva en dispositivos físicos.
