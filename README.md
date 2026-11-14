# SkyNova Airlines

Prototipo frontend de reserva de vuelos para la asignatura **INF-3290** (Análisis y Diseño de Sistemas), equipo CodeNova. Implementa los siete casos de uso aprobados: consulta de vuelos, registro de clientes, búsqueda, reserva con asientos y millas, confirmación de correo simulada, cancelación con reembolso y actualización de información de vuelos por un agente.

Es una **SPA en React 19 + TypeScript + Vite** con React Router. No incluye backend, base de datos, autenticación real ni procesamiento de pagos: todo el estado es ficticio y vive en memoria, por lo que se restablece al recargar la página.

## Ejecutar la aplicación

```bash
cd app
npm install
npm run dev
```

Luego abrir `http://localhost:5173`. Scripts disponibles: `dev`, `build`, `preview`, `lint` (Oxlint) y `test` (Vitest, 393 pruebas).

## Documentación

- `app/README.md` — guía técnica: rutas, cuentas demo, reglas de negocio y limitaciones.
- `PLAN_CODENOVA.md` — plan funcional y registro de decisiones (v2.12, cierre del proyecto).
- `entregables/` — entregables académicos de los pasos 2, 6, 9 y 10 (SRS, diagramas de secuencia/actividad, análisis GUI y evidencias), más el índice en `entregables/README.md`.
- `archivos importantes/` — documentos académicos originales (casos de uso, escenarios, clases y guía). **Archivo histórico: no modificar.**

## Estructura del repositorio

```text
app/                  Aplicación React + TypeScript (código y pruebas)
entregables/          Entregables documentales del curso
archivos importantes/ Documentos académicos originales
PLAN_CODENOVA.md      Plan funcional del proyecto
```
