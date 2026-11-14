# Entregables académicos — SkyNova Airlines (INF-3290)

Índice de los entregables documentales generados en el cierre del proyecto (v2.12 de `PLAN_CODENOVA.md`). Los documentos originales permanecen en `archivos importantes/` (archivo histórico, no modificar).

## Estado general

| Paso | Entregable | Estado |
|---|---|---|
| 2 — Requisitos (SRS) | `02-SRS/SRS-SkyNova-Airlines.md` | COMPLETO |
| 3 — Casos de uso | `archivos importantes/casos de uso.pdf` (original) | COMPLETO (preexistente) |
| 4 — Diagrama de casos de uso | Imagen embebida en `archivos importantes/casos de uso.pdf` | COMPLETO (probable; imagen no verificable por el agente generador) |
| 5 — Escenarios | `archivos importantes/CodeNova_Paso_5_Escenarios_Completos.docx` (original) | COMPLETO (preexistente) |
| 6 — Diagramas de secuencia | `06-Diagramas-Secuencia/` | COMPLETO |
| 7 — Clases, atributos y métodos | `archivos importantes/Paso7_CodeNova.docx` (original) | COMPLETO (preexistente) |
| 8 — Diagrama de clases | `archivos importantes/codenova 8.pdf` (original) | COMPLETO (probable; imagen no verificable por el agente generador) |
| 9 — Diagramas de actividad | `09-Diagramas-Actividad/` | COMPLETO |
| 10 — Interfaz gráfica | `10-Interfaz-GUI/` | COMPLETO (con limitaciones de evidencia visual, ver abajo) |

## Contenido por carpeta

### `02-SRS/` — Paso 2
- `SRS-SkyNova-Airlines.md` — Especificación de Requerimientos de Software: portada, propósito, alcance, actores, requisitos funcionales y no funcionales, reglas de negocio (millas, cancelación, correo, CU-07), trazabilidad CU-01…CU-07 y exclusiones del prototipo. Formato: Markdown editable.

### `06-Diagramas-Secuencia/` — Paso 6
Tres diagramas de secuencia UML coherentes con el código real:

| CU | Fuente editable | Exportación | Explicación |
|---|---|---|---|
| CU-04 Reservar vuelo | `sec-01-cu04-reservar-vuelo.mmd` | `sec-01-cu04-reservar-vuelo.svg` | `explicacion-secuencia-01.md` |
| CU-06 Cancelar reservación | `sec-02-cu06-cancelar-reservacion.mmd` | `sec-02-cu06-cancelar-reservacion.svg` | `explicacion-secuencia-02.md` |
| CU-07 Actualizar información de vuelo | `sec-03-cu07-actualizar-vuelo.mmd` | `sec-03-cu07-actualizar-vuelo.svg` | `explicacion-secuencia-03.md` |

Los `.mmd` (Mermaid) son la fuente editable; los `.svg` son la exportación visual generada con `herramientas/render_diagrams.py`. Incluyen fragmentos `alt`/`else` para los caminos de error reales.

### `09-Diagramas-Actividad/` — Paso 9
Siete diagramas de actividad de nivel medio, uno por caso de uso:

| CU | Fuente | Exportación |
|---|---|---|
| CU-01 Consultar vuelo | `act-01-cu01-consultar-vuelo.mmd` | `.svg` homónimo |
| CU-02 Registrar cliente | `act-02-cu02-registrar-cliente.mmd` | `.svg` homónimo |
| CU-03 Buscar vuelos | `act-03-cu03-buscar-vuelos.mmd` | `.svg` homónimo |
| CU-04 Reservar vuelo | `act-04-cu04-reservar-vuelo.mmd` | `.svg` homónimo |
| CU-05 Correo de confirmación | `act-05-cu05-correo-confirmacion.mmd` | `.svg` homónimo |
| CU-06 Cancelar reservación | `act-06-cu06-cancelar-reservacion.mmd` | `.svg` homónimo |
| CU-07 Actualizar vuelo | `act-07-cu07-actualizar-vuelo.mmd` | `.svg` homónimo |

Explicación de los siete: `explicaciones-actividad.md`.

### `10-Interfaz-GUI/` — Paso 10
- `GUI-SkyNova-Airlines.md` — análisis de tareas, mapa de navegación, actores, descripción de las nueve pantallas reales, flujos, relación tareas↔CUs y limitaciones.
- `capturas/` — capturas nuevas (Chrome headless, 1440×900): `landing.png`, `ingresar.png`, `agente.png`, `buscar-sin-sesion.png`, `reservar-sin-sesion.png`.
- Evidencia adicional preexistente: `app/screenshots/` (11 PNG, sin modificar).

### `Evidencias/` — Pruebas
- `pruebas.md` — resumen de ejecución: `npm test` → 22 archivos de prueba / 393 pruebas superadas; `tsc --noEmit`, `oxlint` y `vite build` sin errores (ejecutado el 14/11/2026 sobre el árbol reconciliado del PR #1, cambios sin confirmar en Git).

### `herramientas/`
- `render_diagrams.py` — generador de los `.svg` de los pasos 6 y 9 (Python puro, sin dependencias). ` _preview/` contiene PNG de control del render.

## Notas para el profesor

- Los diagramas de secuencia cubren los tres escenarios principales exigidos por la guía (reserva, cancelación, actualización); los demás CUs quedan cubiertos por sus diagramas de actividad y escenarios del Paso 5.
- Las imágenes embebidas en los PDF originales (Pasos 4 y 8) no pudieron verificarse visualmente por el agente que generó este índice; se recomienda inspección humana. Si presentaran errores, corresponde corregir el entregable original.
- La evidencia visual de los flujos autenticados es limitada por la naturaleza en memoria del prototipo (ver `10-Interfaz-GUI/GUI-SkyNova-Airlines.md`, sección 8).
