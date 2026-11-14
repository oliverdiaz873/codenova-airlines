# CodeNova Airlines

Prototipo frontend de reserva de vuelos para la asignatura INF-3290.

El proyecto se centra en la capa visual y de interacción: los flujos se simulan
con datos ficticios y no incluye backend, autenticación real ni procesamiento
de pagos.

## Documentación

- `PLAN_CODENOVA.md` — planificación y estado del proyecto.
- `archivos importantes/` — documentos académicos de referencia (casos de uso,
  escenarios, clases y guía de la práctica).

## Estructura del repositorio

- `app/` — prototipo frontend (React + Vite + TypeScript).
- `PLAN_CODENOVA.md` — plan funcional y estado.
- `archivos importantes/` — documentos académicos.

## Casos de uso en el prototipo

| Caso de uso | Pantalla |
|---|---|
| CU-01 Consultar información de vuelo | `/` (landing, sección de rutas) |
| CU-02 Registrar cliente | `/ingresar?mode=register` |
| CU-03 Buscar vuelos (destino y hora de partida) | `/buscar` |
| CU-04 Reservar vuelo (número de vuelo y asiento) | `/reservar` |
| CU-05 Enviar confirmación por correo (simulado) | `/confirmacion` |
| CU-06 Cancelar reservación | `/panel/reservas` |
| CU-07 Actualizar información de vuelo (agente) | `/agente` |

Cuentas de demostración (ingreso sin contraseña): `minorista@codenova.demo`,
`corporativo@codenova.demo` y `correo-fallido@codenova.demo`.

## Ejecutar en local

```bash
cd app
npm install
npm run dev     # servidor de desarrollo
npm test        # pruebas
npm run build   # compilación de producción
```
