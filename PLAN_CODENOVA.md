# PLAN_CODENOVA.md

**Proyecto:** CodeNova Airlines — Prototipo frontend de reserva de vuelos
**Asignatura:** INF-3290
**Tipo de documento:** Plan de planificación y estado del proyecto (documento único)
**Fecha de creación:** 06/11/2026
**Estado:** Planificación activa. Sin implementación iniciada.

---

## Leyenda de estado

| Código | Significado |
|---|---|
| **[E]** | Decisión establecida y aprobada. No se reabre sin petición explícita. |
| **[PA]** | Pendiente de aprobación. No se asume como decisión cerrada. |
| **[EX]** | Exploración preliminar no aprobada. Referencia, no especificación. |
| **[R]** | Sujeto a revisión. Propuesta condicionada a otras decisiones. |

---

## 1. Contexto del proyecto

CodeNova Airlines es el prototipo de interfaz para una aerolínea, desarrollado como práctica de la asignatura INF-3290. El objetivo académico es diseñar y construir la **capa visual y de interacción** del sistema de reservas, no el sistema completo.

La fuente funcional son los documentos académicos ya elaborados. Este plan **no sustituye** ni reescribe esos documentos: los usa como referencia y centraliza únicamente el estado de la planificación.

### 1.1 Documentos académicos de referencia (originales, no modificables)

| Documento | Ubicación | Aporte |
|---|---|---|
| `8. Practica Final Pasos 2-10.pdf` | `Desktop\Aereolinea\archivos importantes\` | Guía académica, modelos y criterios de prototipo GUI |
| `casos de uso.pdf` | `Desktop\Aereolinea\archivos importantes\` | Actores, 7 casos de uso, 14 alternativas, diagrama |
| `CodeNova_Paso_5_Escenarios_Completos.docx` | `Desktop\Aereolinea\archivos importantes\` | Escenarios completos de los casos de uso |
| `Paso7_CodeNova.docx` | `Desktop\Aereolinea\archivos importantes\` | 7 clases, atributos, métodos y tipos |
| `codenova 8.pdf` | `Desktop\Aereolinea\archivos importantes\` | Diagrama de clases y multiplicidades |

Copia adicional de respaldo en `Desktop\paso 7 y 8\`, que incluye además `Paso_7_Clases_Atributos_CodeNova.docx` y una versión backup.

---

## 2. Alcance

### 2.1 Incluido **[E]**

- Prototipo **exclusivamente frontend**.
- Simulación de todos los flujos mediante datos ficticios e interacciones del navegador.
- Interfaz para los casos de uso ya documentados.
- **Registro de clientes (CU-02)** incluido y simulado en el frontend: el flujo de registro se representa en la interfaz, pero no crea cuentas persistentes ni credenciales reales.
- Confirmación por correo representada visualmente.
- Selector de rol simulado para distinguir cliente y agente.
- Representación de tarifas, millas y devoluciones con datos mock coherentes con el mercado dominicano.
- Diseño responsive y accesibilidad como parte del pulido visual.

### 2.2 Excluido **[E]** — PA-4 aprobado

Lista de exclusiones funcionales aprobada. Estas funcionalidades **no forman parte del prototipo**:

1. Backend, API y servicios en red.
2. Base de datos y persistencia real.
3. Autenticación real, credenciales reales y creación de cuentas persistentes. El registro de clientes (CU-02) **sí está incluido** como simulación de frontend; ver sección 2.1.
4. Pasarela de pago y procesamiento real de pagos.
5. Envío real de correos electrónicos.
6. Integración con GDS, aerolíneas o proveedores externos.
7. Check-in real y emisión de pases de abordaje.
8. Gestión de equipaje como módulo independiente.
9. Programa de fidelización completo (acumulación, niveles, historial de millas).
10. Historial de reservas más allá de lo que exija el caso de uso.
11. Modificación de reserva como caso de uso nuevo.
12. Estado de vuelo en tiempo real.
13. Panel administrativo, reportes y métricas.
14. Multi-idioma y multi-moneda.
15. Notificaciones push o SMS.
16. Diseño de base de datos y diagramas adicionales no solicitados.
17. Cualquier funcionalidad no contemplada en los documentos académicos.

> Criterio de control: si una idea visual o funcional exige algo de esta lista, se detiene y se consulta antes de continuar.

---

## 3. Decisiones establecidas **[E]**

### 3.1 Decisiones funcionales

| ID | Decisión |
|---|---|
| E-01 | El prototipo es solo frontend; sin backend, API ni base de datos. |
| E-02 | Los datos son ficticios y se manejan en el navegador. |
| E-03 | No se elabora un SRS nuevo; los casos de uso, escenarios y clases existentes son la fuente funcional. |
| E-04 | El diseño de base de datos queda fuera del alcance. |
| E-05 | La cancelación es un caso de uso independiente de la reserva: requiere una reserva existente y no ejecuta una reserva nueva. |
| E-06 | El agente de boletos representa a un empleado de la aerolínea que actualiza información de vuelos. |
| E-07 | Se conserva la devolución del **80 %** como regla académica documentada. |
| E-08 | Se conserva la condición de **una semana** como regla académica documentada. |
| E-09 | La confirmación por correo es simulada visualmente, sin integración externa. |
| E-10 | No se inventan reglas de negocio ni fórmulas arbitrarias para millas. |
| E-11 | La autenticación es simulada. El registro de clientes (CU-02) está incluido y se simula en el frontend; lo excluido es la autenticación real, las credenciales reales y las cuentas persistentes. |
| E-12 | Los precios son ficticios, en **pesos dominicanos (DOP / RD$)**, basados en rutas y precios representativos del mercado dominicano. |
| E-13 | Los descuentos por millas se basan en prácticas reales de programas de fidelización; no se inventan fórmulas. |
| E-14 | El alcance adicional no documentado está excluido (ver sección 2.2). |
| E-15 | Las cancelaciones y devoluciones conservan los requisitos académicos; el mercado real solo informa la representación visual. |
| E-16 | El nombre de la aerolínea es **provisional** hasta que se elija el nombre oficial. |
| E-17 | Las rutas del prototipo son representativas del mercado dominicano. |
| E-18 | Las categorías de pasajero son las del mercado real (adulto, niño, infante). |
| E-19 | La moneda de la demo es el peso dominicano (DOP / RD$). |
| E-20 | La arquitectura frontend es **feature-based**. La estructura interna de carpetas sigue abierta. |

### 3.2 Decisiones de metodología visual

| ID | Decisión |
|---|---|
| E-21 | La landing page de **Tesla** es la referencia visual principal. |
| E-22 | El diseño se desarrolla por iteraciones, con aprobación explícita en cada una. |
| E-23 | No se define una identidad visual completa de antemano. |
| E-24 | Colores, tipografías, tamaños, layouts, animaciones y componentes no son definitivos hasta su aprobación. |
| E-25 | En cada iteración se presentan 2–3 propuestas concretas para evaluación. |
| E-26 | Solo se aplican los elementos aprobados; no se acumulan cambios no aprobados. |
| E-27 | Las páginas de aerolíneas son referencias complementarias, nunca sustitutas de Tesla. |
| E-28 | No se copian assets, textos, logotipos ni layouts propietarios de Tesla. |

### 3.3 Stack base

| Elemento | Estado |
|---|---|
| React | **[E]** base tecnológica aprobada |
| Vite | **[E]** base tecnológica aprobada |
| TypeScript | **[E]** base tecnológica aprobada |
| Tailwind CSS | **[R]** |
| shadcn/ui | **[R]** |
| React Router | **[R]** |
| Zustand | **[R]** |
| React Hook Form + Zod | **[R]** |
| Framer Motion | **[R]** |
| date-fns | **[R]** |
| Lucide React | **[R]** |
| Sonner | **[R]** |
| Vitest / Testing Library / Playwright | **[R]** |
| `localStorage` | **[R]** |

React, Vite y TypeScript son la **base tecnológica aprobada** del proyecto. Esa aprobación es una decisión de arquitectura y **no constituye autorización para instalarlos, inicializar el proyecto ni crear su estructura**. Las demás dependencias siguen **[R]** y no se instala ninguna en esta fase.

---

## 4. Decisiones pendientes **[PA]**

Estos puntos **no están cerrados**. Se documentan con su estado real para evitar que se implementen por inercia.

| ID | Punto pendiente | Situación actual | Qué falta decidir |
|---|---|---|---|
| PA-1 | UX del selector de rol simulado | La autenticación simulada está aprobada; la forma de presentación no. | Cómo se presenta el selector y qué roles aparecen. |
| PA-2 | Tarifas mock y representación del 80 % | La moneda y el origen de los precios están aprobados; la tabla concreta no. | Montos por ruta y forma de mostrar la devolución. |
| PA-3 | Referencia concreta del programa de millas | Se prohíbe inventar fórmulas; falta la referencia. | Qué programa real se toma como modelo y cómo se precalcula el descuento. |
| PA-5 | Base de cálculo de "una semana" | La regla existe; su interpretación no. | Desde qué fecha se cuenta y cómo se evalúa. |

### 4.1 Ambigüedades adicionales abiertas

No son gates principales, pero tampoco están resueltas:

- Si el nombre de la compañía es obligatorio para clientes minoristas.
- Zona horaria de la demo (la moneda ya está definida).
- Si una reserva equivale siempre a un pasajero.
- Si la devolución queda "calculada" o "procesada".
- Si "historial", "modificación de reserva" o "estado de vuelo" deben quedar fuera (la exclusión general está aprobada; el detalle de interfaz no).

---

## 5. Arquitectura frontend feature-based **[E]**

### 5.1 Principio

La organización del código se hará por **dominio funcional**, no por tipo técnico. Cada feature agrupa sus componentes, hooks, datos mock y tipos.

### 5.2 Features identificadas (propuesta **[R]**)

| Feature | Casos de uso relacionados |
|---|---|
| `auth` | Selección de rol simulada y registro de cliente simulado (CU-02) |
| `search` | Búsqueda de vuelos |
| `flights` | Consulta y detalle de vuelos |
| `booking` | Reserva y selección de asiento |
| `confirmation` | Confirmación y correo simulado |
| `reservations` | Consulta de reservas del cliente |
| `cancellation` | Cancelación y devolución simulada |
| `agent` | Área del agente de boletos |
| `shared` | Componentes, utilidades y tipos transversales |

### 5.3 Reglas de organización

- Las features se relacionan mediante **dependencias controladas**: interfaces claras, bajo acoplamiento y dirección de dependencia explícita.
- La política concreta de importaciones entre features queda **pendiente del diseño de arquitectura [R]**. Este documento no fija una prohibición absoluta ni un grafo de dependencias definitivo.
- Los datos mock viven junto a la feature que los consume.
- La estructura interna de carpetas (nombres, niveles, barrel files) **no está aprobada [R]**.
- No se crea ninguna carpeta ni archivo de proyecto en esta fase.

---

## 6. Referencias de mercado

Las referencias sirven para que los datos ficticios sean plausibles. **No sustituyen las reglas académicas.**

### 6.1 Rutas

Fuentes oficiales consultadas:

- **Arajet** — `https://www.arajet.com/es-do/donde-volamos`
- **Sky High Dominicana** — `https://skyhighdo.com/itinerarios/`
- **Air Century** — `https://aircentury.com/` (destinos del Caribe)

Rutas documentadas en el itinerario oficial de Sky High: SDQ–FDF, SDQ–HAV, PUJ–HAV, SDQ–BON, SDQ–AXA, SDQ–SKB, SDQ–ANU, SDQ–GEO, SDQ–PMB, SDQ–PTP, SDQ–STT.

Air Century lista destinos del Caribe incluyendo Bonaire, Cuba, Curazao, Sint Maarten, Aruba y República Dominicana.

**Uso en el prototipo:** rutas representativas desde Santo Domingo (SDQ) y Punta Cana (PUJ) hacia el Caribe y Norteamérica, con nombres y horarios ficticios.

**Origen de vuelo en la presentación [E]:** se podrán utilizar orígenes ficticios de presentación basados en rutas del mercado dominicano (por ejemplo, SDQ y PUJ). Se trata de un dato de interfaz: **no modifica la clase académica `Vuelo` ni introduce reglas funcionales nuevas.**

### 6.2 Categorías de pasajero

Referencia: `https://www.arajet.com/es-do/viajando-con-ninos`

- Infantes desde 8 días de nacidos.
- Niños de 2 años o más pagan tarifa completa.
- Infantes en regazo pagan 10 % de la tarifa más impuestos.
- Máximo dos infantes por adulto.
- Menores de 16 años deben viajar acompañados de un adulto.

**Uso en el prototipo:** las tres categorías se muestran en la búsqueda; los porcentajes son referencia, no regla implementada.

### 6.3 Cancelación y devolución

| Fuente | Política observada |
|---|---|
| Arajet Refund Flex (`arajet.com/es-do/refund-flex`) | Servicio opcional; cancelación con más de 24 h; reembolso por voucher en 48 h o al medio original en 30 días. |
| Air Century (`aircentury.com/cambios-y-cancelaciones/`) | Cancelaciones solicitadas con más de 48 h de antelación. |
| Air Century (`aircentury.com/politica-de-devoluciones/`) | Devolución general solo dentro de 24 h de compra y con más de 7 días de antelación; hasta 30 días de procesamiento. |

**Regla del prototipo:** se mantiene **80 % de devolución** y la **condición de una semana** del documento académico. El mercado solo inspira cómo se comunica y se representa el estado de la devolución.

### 6.4 Millas y fidelización

- Arajet declara **no tener un programa de fidelización tradicional** (`support.arajet.com/hc/es-do/articles/29419114829972`).
- Sky High y Air Century no publican un programa de millas propio en sus sitios revisados.

**Consecuencia:** la decisión E-13 es correcta en intención, pero su referencia concreta sigue en **PA-3**. No se puede afirmar que el modelo sea "dominicano" porque ninguna de las tres aerolíneas revisadas lo ofrece.

### 6.5 Moneda

- Arajet muestra precios en **DOP** en su sitio `es-do`.
- Sky High muestra tarifas en **USD**.

**Consecuencia:** las tarifas mock en DOP requieren una base de conversión explícita y documentada, o bien tomar los valores de Arajet como ancla. Queda como parte de **PA-2**.

---

## 7. Metodología de diseño iterativo

### 7.1 Jerarquía de referencias

1. **Principal:** landing page de Tesla — composición y lenguaje visual.
2. **Complementarias:** sitios de aerolíneas — patrones de búsqueda, reserva, confianza y claridad.
3. **Funcional:** casos de uso, escenarios y clases.
4. **Contenido:** datos ficticios y reglas documentadas.

### 7.2 Protocolo por iteración

| Paso | Actividad | Resultado |
|---|---|---|
| 1 | Definir el objetivo de la iteración | Alcance visual acotado |
| 2 | Analizar Tesla y referencias complementarias | Criterios de composición y jerarquía |
| 3 | Presentar 2–3 propuestas concretas | Opciones comparables |
| 4 | El usuario evalúa y elige | Decisión explícita |
| 5 | Aplicar solo lo aprobado | Elemento validado |
| 6 | Registrar decisiones y pendientes | Base para la siguiente iteración |

### 7.3 Reglas del proceso

- Ninguna propuesta visual es definitiva sin aprobación.
- No se avanza automáticamente a la siguiente iteración.
- No se genera la landing definitiva sin dirección visual aprobada.
- Si una idea visual implica funcionalidad nueva, se detiene y se consulta.
- No se usan marcas, textos, imágenes ni recursos propietarios de Tesla.

### 7.4 Secuencia tentativa **[R]**

1. Fundamentos visuales y composición del hero/navegación.
2. Búsqueda, resultados y detalle de vuelo.
3. Flujo de reserva y selección de asiento.
4. Confirmación, correo simulado y "Mis reservas".
5. Cancelación y devolución simulada.
6. Área del agente.
7. Responsive, accesibilidad y pulido visual.

Cada iteración requiere aprobación antes de continuar.

---

## 8. Exploración preliminar **[EX]** — no aprobada

La antigua sección 9 del plan conversacional se conserva aquí como **exploración**, no como especificación.

Quedan como propuestas, no como decisiones:

- El concepto "Premium quiet aviation".
- La paleta de colores.
- Las tipografías Manrope e Inter.
- La escala tipográfica.
- Los radios, sombras y bordes.
- La composición del hero.
- El uso de imágenes full-bleed.
- El grid de 12 columnas.
- La navegación transparente sobre el hero.
- Las animaciones y duraciones.
- Los breakpoints responsive.
- El wordmark, monograma y slogan de CodeNova Airlines.

**Ninguno de estos elementos se aplicará sin aprobación.**

---

## 9. Próximos pasos

### 9.1 Condiciones para cerrar la planificación

1. Resolver **PA-1, PA-2, PA-3 y PA-5**.
2. Cerrar las ambigüedades adicionales que afecten la interfaz.
3. Aprobar el alcance de la primera iteración visual.

### 9.2 Después de la aprobación

1. Actualizar este documento sin implementar.
2. Iniciar la Iteración 1 solo con el alcance aprobado.
3. Presentar propuestas y esperar elección.
4. Aplicar únicamente lo aprobado.
5. Repetir el ciclo para las demás pantallas.
6. Revisar dependencias adicionales tras estabilizar la dirección visual.
7. Elaborar el plan de implementación solo con alcance funcional y visual cerrado.
8. Iniciar código únicamente con aprobación explícita y separada.

### 9.3 Regla de detención

No se avanza a implementación ni a la siguiente iteración sin aprobación explícita. Cada etapa termina con una decisión registrada.

---

## 10. Registro de cambios del documento

| Fecha | Cambio | Autorización |
|---|---|---|
| 06/11/2026 | Creación del documento único de planificación | Opción A aprobada |
| 06/11/2026 | PA-4 (exclusiones funcionales) reclasificado de pendiente a establecido | Aprobación explícita |
| 06/11/2026 | Incorporadas decisiones de autenticación simulada, DOP, millas, alcance y cancelaciones | Aprobación explícita |
| 06/11/2026 | Revisión correctiva: CU-02 (registro) aclarado como incluido; dependencias entre features reemplazadas por dependencias controladas; stack base aprobado sin autorización de instalación; orígenes ficticios de presentación aclarados | Aprobación explícita |

---

**Fin del documento.** Este plan no contiene código, estructura de proyecto ni decisiones visuales cerradas.
