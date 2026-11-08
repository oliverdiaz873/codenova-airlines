# PLAN_CODENOVA.md

**Proyecto:** CodeNova Airlines — Prototipo frontend de reserva de vuelos
**Asignatura:** INF-3290
**Tipo de documento:** Plan funcional y estado del proyecto (documento único)
**Versión:** 2.4 — Estado actualizado de la implementación
**Fecha de cierre:** 2026-11-06
**Última actualización:** 2026-11-08
**Estado:** Planificación funcional **CERRADA**. C-1, C-2 y C-3 resueltas. Existe una implementación frontend prototipo con landing pública y flujo simulado de ingreso/registro. La revisión visual continúa; reserva y paneles de Cliente y Agente no están implementados. Pendientes operativos identificados (4.8, 9.4).

---

## Leyenda de estado

| Código | Significado |
|---|---|
| **[E]** | Decisión establecida y aprobada. |
| **[C]** | Decisión cerrada en este documento (cierre 2026-11-06). |
| **[R]** | Sujeto a revisión o pendiente de un detalle técnico. |
| **[EX]** | Exploración preliminar no aprobada. |

---

## 0. Resumen del cierre

| Bloque | Estado |
|---|---|
| PA-1 — Roles y experiencia | **[C]** Definida |
| PA-1.10 — Datos de demostración | **[C]** Definida |
| PA-2 — Vuelos, horarios y tarifas | **[C]** Definida |
| PA-3 — Millas | **[C]** Definida |
| PA-4 — Exclusiones funcionales | **[C]** Aprobada previamente, vigente |
| PA-5 — Cancelación y reembolso | **[C]** Definida |
| Frontera CU-01 / CU-03 | **[C]** Definida (3.7) |
| C-1 — Acceso de clientes demo | **[C]** Resuelta (3.8) |
| C-2 — Conversión de millas a descuento | **[C]** Resuelta y aprobada (5.2) |
| C-3 — Representación del viaje | **[C]** Resuelta y aprobada (4.8) |
| Arquitectura feature-based | **[E]** Vigente; estructura interna **[R]** |
| Stack React + Vite + TypeScript | **[E]** Aprobado; no autoriza inicialización |
| Diseño visual | Landing implementada como prototipo; su revisión visual continúa |
| Implementación | Frontend inicial implementado: landing pública y flujo simulado `/ingresar` |
| Funcionalidad pendiente | Reserva, paneles de Cliente y Agente, y otros alcances excluidos |
| Pendientes operativos | Documentados en 4.8 y 9.4; no bloquean la landing |

**Próxima etapa:** revisión visual de la implementación existente y definición explícita de cualquier cambio adicional.

---

## 1. Contexto

CodeNova Airlines es el prototipo de interfaz para una aerolínea, desarrollado como práctica de la asignatura INF-3290. El objetivo académico es diseñar y construir la **capa visual y de interacción** del sistema de reservas, no el sistema completo.

La fuente funcional son los documentos académicos ya elaborados. Este plan no los sustituye ni los reescribe: centraliza las decisiones aprobadas y deja constancia de qué proviene de los documentos y qué es una simplificación de diseño.

### 1.1 Documentos académicos de referencia (originales, no modificables)

| Documento | Ubicación | Aporte |
|---|---|---|
| `8. Practica Final Pasos 2-10.pdf` | `Desktop\Aereolinea\archivos importantes\` | Guía académica, modelos, pantallas sugeridas y criterios de prototipo GUI |
| `casos de uso.pdf` | `Desktop\Aereolinea\archivos importantes\` | Actores, 7 casos de uso, 14 alternativas, diagrama |
| `CodeNova_Paso_5_Escenarios_Completos.docx` | `Desktop\Aereolinea\archivos importantes\` | Escenarios completos de los casos de uso |
| `Paso7_CodeNova.docx` | `Desktop\Aereolinea\archivos importantes\` | 7 clases, atributos, métodos y tipos |
| `codenova 8.pdf` | `Desktop\Aereolinea\archivos importantes\` | Diagrama de clases y multiplicidades |

Copia de respaldo en `Desktop\paso 7 y 8\`, fuera del repositorio.

### 1.2 Repositorio, propiedad y acceso

- Repositorio público: `https://github.com/oliverdiaz873/codenova-airlines` (rama `main`).
- **Solo el titular del repositorio modifica la implementación.**
- Los compañeros de equipo tienen **acceso de consulta** a través del repositorio público. No se les ha otorgado permiso de escritura y no se invitaron colaboradores.
- El repositorio contiene planificación, documentos académicos y una aplicación frontend prototipo en `app/`.

### 1.3 Jerarquía de fuentes

1. **Casos de uso, escenarios y clases** — fuente funcional obligatoria.
2. **Guía académica** — criterios de alcance y pantallas sugeridas.
3. **Este plan** — decisiones aprobadas y simplificaciones de diseño.
4. **Referencias de mercado** — solo contexto para datos ficticios.

---

## 2. Alcance

### 2.1 Incluido **[E]**

- Prototipo **exclusivamente frontend**.
- Datos ficticios y estado en memoria.
- Interfaz para los casos de uso documentados.
- **Registro de clientes (CU-02)** simulado en el frontend.
- Autenticación simulada, sin credenciales reales.
- **Ingreso simulado del Cliente** por correo electrónico, sin contraseña (C-1).
- Confirmación por correo representada visualmente.
- Catálogo público de vuelos y búsqueda para clientes.
- Reserva, selección de asiento y aplicación de millas (solo clientes corporativos).
- Consulta de reservas y cancelación con reembolso simulado.
- Panel independiente del agente de boletos.
- Diseño responsive y accesibilidad como parte del pulido visual.

### 2.2 Excluido **[E]** — PA-4 vigente

1. Backend, API y servicios en red.
2. Base de datos y persistencia real.
3. Autenticación real, credenciales reales y cuentas persistentes. El registro CU-02 y el inicio de sesión simulado **sí** están incluidos como representación de interfaz.
4. Pasarela de pago y procesamiento real de pagos.
5. Envío real de correos electrónicos.
6. Integración con GDS, aerolíneas o proveedores externos.
7. Check-in real y emisión de pases de abordaje.
8. Gestión de equipaje como módulo independiente.
9. Programa de fidelización completo: categorías élite, vencimientos, historial de movimientos y canjes.
10. Historial de reservas como módulo independiente, más allá de la lista necesaria para consultar y cancelar.
11. Modificación de reserva como caso de uso nuevo.
12. Estado de vuelo en tiempo real.
13. Panel administrativo, reportes y métricas.
14. Multi-idioma y multi-moneda.
15. Notificaciones push o SMS.
16. Diseño de base de datos y diagramas adicionales no solicitados.
17. Cualquier funcionalidad no contemplada en los documentos académicos.

> Criterio de control: si una idea visual o funcional exige algo de esta lista, se detiene y se consulta.

### 2.3 Límites y riesgos asumidos del prototipo

- `/agente` es accesible sin contraseña. Es una consecuencia de la autenticación simulada y **no debe reutilizarse en un sistema real**.
- No existe control de acceso efectivo: cualquiera que abra la URL puede ver el panel del agente.
- El estado se pierde al recargar; no hay recuperación entre sesiones. Se pierden la sesión, los clientes registrados, las reservaciones y los cambios de millas; los clientes de demostración se recrean con sus datos iniciales (3.8).
- El ingreso del Cliente es una identificación simulada por correo, sin contraseña. No autentica realmente y no debe reutilizarse en un sistema real.
- Los datos personales son ficticios y no corresponden a personas reales.

---

## 3. Roles y experiencia (PA-1) **[C]**

### 3.1 Actores y su relación con la interfaz

| Actor | Interactúa con la UI | Participación |
|---|---|---|
| **Visitante** | Sí | Consulta información pública de vuelos y puede registrarse. |
| **Cliente** | Sí | Busca, reserva, aplica millas y solicita cancelaciones. |
| **Agente de boletos** | Sí | Consulta y actualiza información de vuelos. Empleado humano, no pasajero. |
| **Servicio de correo electrónico** | **No** | Sistema externo. Recibe la solicitud de confirmación; no es un rol de interfaz. |

Corporativo y minorista **no son actores**: son valores de clasificación del Cliente.

### 3.2 Permisos por caso de uso

| Caso de uso | Visitante | Cliente | Agente |
|---|---|---|---|
| CU-01 Consultar información de vuelo | Sí | Sí | Sí |
| CU-02 Registrar cliente | Sí | No aplica | No |
| CU-03 Buscar vuelos | No | Sí | No |
| CU-04 Reservar vuelo | No | Sí | No |
| CU-05 Enviar confirmación por correo | Efecto del sistema | Efecto del sistema | Efecto del sistema |
| CU-06 Cancelar reservación | No | Sí | No |
| CU-07 Actualizar información de vuelo | No | No | Sí |

CU-01 es la única función de la landing pública. CU-03 y CU-04 se ejecutan en el panel del Cliente (3.7).

### 3.3 Modelo de navegación

| Elemento | Decisión |
|---|---|
| Estado inicial | **Visitante** |
| Landing pública | `/` |
| Catálogo público | El Visitante consulta información de vuelos sin registrarse (CU-01). |
| Registro | El Visitante se registra mediante **CU-02** y pasa a Cliente. |
| Ingreso del Cliente | **`/ingresar`**, con un único campo de correo electrónico y sin contraseña. Es identificación simulada, no autenticación real (3.8). |
| Identificación | El correo identifica a un Cliente existente. Debe ser único. |
| Acceso demo de cliente | **No existe** acceso directo de demostración. Los clientes demo se alcanzan por el ingreso normal con sus correos (3.8). |
| Selector global de roles | **No existe.** |
| Panel del agente | **`/agente`**, acceso independiente. |
| Acceso del agente | Sin contraseña, porque la autenticación es simulada. |
| Salida del agente | Vuelve a `/` como Visitante. |
| Cierre de sesión del cliente | El Cliente puede cerrar su sesión simulada y volver a `/`. |
| Búsqueda y reserva | CU-03 y CU-04 requieren ser Cliente con sesión activa. |
| Intento sin sesión | El panel y CU-03 dirigen a `/ingresar`, donde se muestra el aviso de registro y el enlace a CU-02. En CU-04 se muestra «Para reservar necesitas una cuenta», con «Crear cuenta» como acción principal y «Ya soy cliente» como secundaria (3.8). |

### 3.4 Clasificación del cliente

- Valores posibles: **Minorista** o **Corporativo**.
- Ambos comparten **el mismo panel y las mismas funcionalidades**.
- La clasificación se declara en el registro (CU-02).
- El **nombre de la compañía** se solicita para clientes corporativos.
- No se crean flujos, permisos ni pantallas distintos por clasificación.

### 3.5 Confirmación y correo simulado

- Tras reservar se muestra una **pantalla de confirmación**.
- Se incluye una **representación visual del correo recibido**.
- No se integra un servicio real de correo.
- El Servicio de correo sigue siendo un sistema externo, no un rol de pantalla.

### 3.6 Datos de demostración (PA-1.10) **[C]**

| Dato | Contenido | Propósito |
|---|---|---|
| Cliente minorista ficticio | Sin millas | Recorrido minorista |
| Cliente corporativo ficticio | 10,000 millas | Recorrido corporativo y uso de millas |
| Descuento preconfigurado | RD$1,000 con 10,000 millas | Caso reproducible con la regla 10:1 (5.2) |
| Agente ficticio | Identidad de demostración | Panel `/agente` |
| Reserva confirmada | Ida y vuelta con dos componentes (4.8) | Estado confirmado |
| Reserva cancelable | Con reembolso aplicable | CU-06 con devolución del 80 % |
| Reserva fuera de plazo | Sin reembolso | CU-06 sin devolución |
| Confirmación de correo | Representación visual | CU-05 simulado |

- Datos personales **completamente ficticios**.
- Información **temporal y en memoria**.
- Sin base de datos ni almacenamiento permanente.
- Al recargar, se restablecen los datos iniciales.
- El acceso a estos clientes se define en 3.8.

### 3.7 Frontera CU-01 / CU-03 en la landing **[C]**

**Separación de casos de uso:**

| Caso | Actor | Función | Ubicación |
|---|---|---|---|
| **CU-01** Consultar información de vuelo | Visitante, Cliente y Agente | Consulta pública de información de vuelos | Landing `/` |
| **CU-03** Buscar vuelos | Cliente | Búsqueda por destino y hora de partida | Panel del Cliente |
| **CU-04** Reservar vuelo | Cliente registrado | Reserva con número de vuelo y asiento | Panel del Cliente |

La landing ejecuta **únicamente CU-01**. No busca, no filtra por criterios y no reserva.

**Decisiones aprobadas:**

1. **La landing ejecuta únicamente CU-01.** No incorpora la búsqueda de CU-03.
2. **Se elimina el filtro por destino de la landing.** Un filtro es un criterio de búsqueda y pertenece a CU-03.
3. **Se conservan las tarifas y los días de operación aprobados en PA-2** como información del catálogo.
4. **El origen se muestra como información, no como criterio de búsqueda.** No existe en el modelo académico de `Vuelo`; es una extensión del proyecto.
5. **No se muestra disponibilidad numérica.** La capacidad y las plazas pertenecen a la reserva, no a la consulta pública.
6. **Si un Visitante intenta acceder a CU-03, recibe un aviso de registro.** No se ejecuta la búsqueda.
7. **Se muestran los horarios publicados cuando están definidos y verificados.** Mientras no lo estén, se indica «Horario por confirmar»; no se inventan valores (4.7).
8. **Se sustituye «Consultar» por «Ver vuelos»** en la navegación y en las llamadas a la acción de la landing.

**Consecuencia de diseño:** el catálogo público muestra conexiones, tarifas, días de operación y horarios verificados. No ofrece campos de origen, destino o fecha que generen resultados.

### 3.8 Acceso del Cliente y clientes de demostración (C-1) **[C]**

C-1 queda resuelta. El mecanismo es un **ingreso simulado por correo electrónico**, sin contraseña, que desarrolla el inicio de sesión contemplado en PA-4. **No es un octavo caso de uso ni añade una función de negocio:** es un mecanismo de identificación de interfaz.

#### C-1.1 — Mecanismo de ingreso

- Ruta: **`/ingresar`**.
- Un único campo: **correo electrónico**.
- Sin contraseña.
- El correo identifica a un Cliente existente.
- No crea clientes ni modifica datos.

#### C-1.2 — Identidades de demostración

| Cliente | Correo | Millas | Descuento |
|---|---|---:|---|
| Minorista | `minorista@codenova.demo` | 0 | No aplica |
| Corporativo | `corporativo@codenova.demo` | 10,000 | RD$1,000 con la regla 10:1 (5.2) |

- Son dos identidades **independientes**, no plantillas.
- Los correos quedan **reservados** y no pueden usarse en CU-02.
- El descuento de RD$1,000 corresponde a 10,000 millas según la regla 10:1 aprobada en 5.2.

#### C-1.3 — Unicidad del correo

- El correo es **único** entre los clientes.
- CU-02 rechaza un correo ya registrado, incluidos los dos correos de demostración.
- El rechazo no crea el cliente ni inicia sesión.

#### C-1.4 — Sesión después del registro

- Al completar CU-02 correctamente, el Visitante pasa a Cliente y **la sesión simulada se inicia automáticamente**.
- No se exige un segundo paso de ingreso.

#### C-1.5 — Acceso a rutas de Cliente

- El panel del Cliente, CU-03 y CU-04 requieren **sesión activa**.
- Para el panel y CU-03, un Visitante sin sesión es dirigido a `/ingresar`, donde se muestra el aviso de registro y el enlace a CU-02.
- **Excepción de CU-04:** si un Visitante intenta reservar sin sesión, se muestra «Para reservar necesitas una cuenta», con:
  - acción principal **«Crear cuenta»**, que inicia CU-02;
  - acción secundaria **«Ya soy cliente»**, que dirige a `/ingresar`.
- La reserva **no se registra** hasta que exista una sesión válida y se complete el flujo.

#### C-1.6 — Millas de clientes nuevos

- Todo cliente nuevo comienza con **0 millas**, sea minorista o corporativo.
- El registro **nunca** asigna las 10,000 millas del cliente corporativo de demostración.
- Las 10,000 millas son exclusivas de `corporativo@codenova.demo`.
- El descuento de RD$1,000 no se asigna automáticamente: se obtiene canjeando 10,000 millas según la regla 10:1 de 5.2.
- Un cliente corporativo nuevo comienza con 0 millas y no tiene saldo canjeable hasta acumular al menos 1,000.

#### C-1.7 — Bloque informativo de cuentas demo

- `/ingresar` incluye un bloque plegable **«Cuentas de demostración»** que informa los dos correos.
- Es **exclusivamente informativo**:
  - no contiene botones de acceso;
  - no selecciona identidades;
  - no autocompleta el campo;
  - no inicia sesiones;
  - no incluye el acceso del Agente.

#### C-1.8 — Comportamiento al recargar

Los datos se mantienen **en memoria** y se reinician al recargar:

- se pierde la sesión activa y el usuario vuelve a **Visitante**;
- los clientes de demostración se recrean con sus datos iniciales;
- los clientes nuevos registrados desaparecen;
- las reservaciones y sus modificaciones se pierden;
- los cambios de millas se pierden.

La interfaz muestra un aviso discreto: **«Esta es una demostración. Los datos se reinician al recargar la página.»**

#### C-1.9 — Naturaleza del ingreso

- `/ingresar` es un **mecanismo de identificación de interfaz**.
- **No** se crea un octavo caso de uso.
- **No** se modifican los siete casos de uso.
- **No** se incorpora autenticación real ni credenciales reales.

---

## 4. Vuelos, horarios y tarifas (PA-2) **[C]**

### 4.1 Conexiones y tarifas

| Conexión | Tarifa por pasajero |
|---|---:|
| Santo Domingo (SDQ) – San Juan (SJU) | RD$7,900 |
| Santo Domingo (SDQ) – Aruba (AUA) | RD$9,600 |
| Santo Domingo (SDQ) – Miami (MIA) | RD$9,900 |
| Santo Domingo (SDQ) – Bogotá (BOG) | RD$10,200 |
| Santo Domingo (JBQ) – La Habana (HAV) | RD$19,500 |

No se incluye Santo Domingo – Punta Cana.

### 4.2 Reglas de tarifa

- Categorías de pasajero: **adulto, niño e infante**, registradas en la reserva.
- Tarifas **fijas por conexión**.
- **Mismo precio en ambas direcciones**.
- **Mismo precio para adultos, niños e infantes.**
- Precios **finales**, con impuestos y cargos incluidos.
- Sin cargos sorpresa.
- La ida y vuelta **suma los dos trayectos**, sin descuento adicional; cada trayecto se registra como una componente (4.8).
- Tarifas **ficticias**, calibradas con el mercado dominicano como referencia. No se afirma que reproduzcan exactamente tarifas comerciales.

### 4.3 Programación

| Elemento | Decisión |
|---|---|
| Conexiones | 5 |
| Direcciones por conexión | 2 |
| Servicios programados | 5 × 2 × 2 horarios = **20** |
| Días de operación | Lunes, miércoles y viernes |
| Horarios por dirección | Uno matutino y otro vespertino |
| Salidas semanales | 20 × 3 = **60** |
| Reutilización | Cada servicio recurrente conserva su número de vuelo en distintas fechas |
| Horizonte de búsqueda (CU-03) | Próximos **30 días** |
| Generación automática | **No.** El conjunto se prepara previamente; la aplicación no genera vuelos en tiempo de ejecución |
| Tipo de vuelo | Directo |
| Sin vuelos en la fecha (CU-03) | Se informa y se sugieren fechas próximas con disponibilidad |

### 4.4 Capacidad y disponibilidad

- Capacidad máxima: **30 pasajeros por ocurrencia de vuelo**.
- **Cada pasajero ocupa una plaza, incluidos los infantes.**
- Una reserva reduce la disponibilidad.
- Una cancelación libera la plaza.
- No se supera la capacidad máxima.
- La composición de una compra de ida y vuelta se define en 4.8.

### 4.5 Presentación de vuelos

Se muestra:

- Ciudad, aeropuerto e identificador IATA.
- Hora local de salida y de llegada.
- Duración.
- Cambio de fecha cuando corresponda.

### 4.6 Números de vuelo

- Prefijo **CN** y **tres o cuatro dígitos**.
- Únicos por servicio programado y dirección.
- Se reutilizan en las distintas fechas del servicio.

### 4.7 Datos que se completarán al preparar el conjunto de demostración **[R]**

No se inventan en este documento:

- Horas exactas de salida y llegada.
- Duraciones de cada trayecto.
- Asignación concreta de números de vuelo.
- Zonas horarias y cálculo de cambio de fecha.
- Distancias de cada conexión y unidad utilizada (millas o kilómetros), necesarias para la acumulación.

Estos datos deben provenir de fuentes verificables y quedar registrados junto al conjunto de demostración.

La landing muestra únicamente los horarios publicados y verificados (3.7, decisión 7). Mientras un horario no esté definido, se indica «Horario por confirmar»; no se completa con valores inventados.

### 4.8 Representación de reservas de ida y vuelta (C-3) **[C]**

**C-3 queda resuelta.** Se adopta la alternativa **C′**: una **reserva principal académica** con **reservaciones componentes** y una **agrupación interna** que representa la compra completa. Es una **adaptación interna del prototipo**, no una modificación del modelo académico. La aprobación funcional es expresa.

#### 4.8.1 Principios aprobados

1. **Modelo académico intacto.** `Reservacion` conserva `vuelo: Vuelo`, `asiento: Asiento`, sus atributos, métodos y multiplicidades. No se añaden clases, atributos, métodos ni relaciones al modelo académico.
2. **Una reservación por pasajero y por trayecto.** Cada componente es una `Reservacion` académica con un vuelo y un asiento.
3. **Reserva principal.** La primera componente —ida, pasajero 1— es la reserva principal. Su `codigoReservacion` es el identificador visible de la compra; los códigos de las demás componentes son internos.
4. **Agrupación interna.** Una estructura interna del prototipo asocia el código principal con las componentes y guarda la etiqueta y categoría de cada pasajero. No es una clase académica.
5. **Confirmación todo o nada.** Se verifican todos los vuelos y asientos antes de crear cualquier componente. Si alguno no está disponible, no se crea ninguno, no se retienen asientos y no se descuentan millas.
6. **Millas en la principal.** `millasUtilizadas` y `descuentoAplicado` se registran exclusivamente en la reserva principal y se aplican al importe total de la compra.
7. **Una confirmación por compra.** La confirmación de CU-05 se asocia a la reserva principal y representa la compra completa.
8. **Cancelación completa.** Se cancela la compra entera, sin cancelaciones parciales en el prototipo. PA-5 se aplica tomando como referencia el primer vuelo.
9. **Reembolso neto.** Se devuelve el **80 % del importe neto pagado** después del descuento por millas. Las millas no se reponen.
10. **Pendientes.** No se resuelven aquí la cancelación parcial, el reembolso por componente, la numeración/mapa/asignación de asientos, los datos operativos de vuelos/horarios/duraciones/distancias ni la combinación de conexiones diferentes entre ida y vuelta.

#### 4.8.2 Composición y precio

| Operación | Componentes | Cálculo | Ejemplo SDQ–SJU |
|---|---:|---|---:|
| Ida, 1 pasajero | 1 | 1 × RD$7,900 | **RD$7,900** |
| Ida y vuelta, 1 pasajero | 2 | 2 × RD$7,900 | **RD$15,800** |
| Ida y vuelta, 2 pasajeros | 4 | 4 × RD$7,900 | **RD$31,600** |
| Ida y vuelta, 3 pasajeros | 6 | 6 × RD$7,900 | **RD$47,400** |

- Cada componente conserva la tarifa del trayecto.
- La ida y vuelta **no** añade descuento: suma los trayectos (4.2).
- El total de la compra es la suma de componentes, sin atributos nuevos en `Reservacion`.
- Las categorías de pasajero se registran en la capa interna; no cambian la tarifa (4.2).

#### 4.8.3 Disponibilidad

- La capacidad de 30 se controla **por vuelo**, no por compra (4.4).
- Cada componente ocupa un asiento.
- Antes de confirmar se verifican todas las componentes.
- Si una componente falla: no se crea ninguna, no se retiene ningún asiento, no se descuenta ninguna milla y no se cobra.
- No se confirma parcialmente una compra. Si el cliente quiere solo la ida, debe iniciar una compra de ida.

#### 4.8.4 Millas

- `millasUtilizadas` y `descuentoAplicado` se registran en la reserva principal, no en las demás componentes.
- El descuento se aplica al **importe total de la compra**.
- Se mantienen 10:1, mínimo de 1,000, incrementos de 1,000, tope en el importe y total ≥ RD$0 (5.2).
- Las millas se descuentan **solo al confirmar** la compra.
- Si la compra falla, no se descuentan.
- Si se cancela, **no se reponen**.
- No se reparte el descuento entre componentes.

#### 4.8.5 Confirmación

- Una sola confirmación por compra, asociada a la reserva principal.
- Debe mostrar: código principal, trayectos, pasajeros, asientos, millas usadas, descuento y total.
- Si el envío falla, la compra permanece registrada (CU-05).

#### 4.8.6 Cancelación y reembolso

- Se cancela la compra completa: todas las componentes y todos los asientos.
- PA-5 se aplica con el **primer vuelo de la compra**.
- Con siete días completos o más: **80 % del importe neto pagado**.
- Con menos de siete días: no corresponde reembolso académico.
- Las millas no se reponen.
- No se ofrece cancelación parcial en el prototipo.

**Ejemplo:** compra de ida y vuelta, 1 pasajero, SDQ–SJU, 10,000 millas canjeadas.

| Concepto | Importe |
|---|---:|
| Bruto (2 × RD$7,900) | RD$15,800 |
| Descuento por millas | −RD$1,000 |
| Neto pagado | **RD$14,800** |
| Reembolso 80 % (con plazo) | **RD$11,840** |
| 20 % no reembolsado | RD$2,960 |

Si el primer vuelo cumple el plazo y el segundo no, la cancelación total del grupo aplica el 80 % al neto; la fecha del segundo vuelo no cambia la regla del primer vuelo. La alternativa de reembolsar por componente —ida 80 %, vuelta 0 %— no está aprobada y queda pendiente.

#### 4.8.7 Ejemplos de los siete casos

| # | Caso | Componentes | Bruto | Millas | Descuento | Neto | Reembolso 80 % |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | Ida, 1 pasajero | 1 | 7,900 | 2,000 | 200 | **7,700** | — |
| 2 | Ida y vuelta, 1 pasajero | 2 | 15,800 | 10,000 | 1,000 | **14,800** | 11,840 |
| 3 | Ida y vuelta, 2 pasajeros | 4 | 31,600 | 10,000 | 1,000 | **30,600** | 24,480 |
| 4 | Vuelta sin disponibilidad | 0 creadas | — | 0 | 0 | **0** | — |
| 5 | Cancelar ida y vuelta | 2 | 15,800 | 10,000 | 1,000 | **14,800** | 11,840 |
| 6 | Millas en ida y vuelta | 2 | 15,800 | 8,000 | 800 | **15,000** | 12,000 |
| 7 | Primer vuelo con plazo, segundo sin plazo | 2 | 15,800 | 10,000 | 1,000 | **14,800** | 11,840 |

Notas:

- Caso 4: no se crea ninguna componente, no se retienen asientos y no se descuentan millas.
- Caso 5: las millas no se reponen; el 20 % restante no se devuelve.
- Caso 6: 8,000 millas es múltiplo de 1,000; si el saldo fuera 500, no habría canje.
- Caso 7: se aplica la regla del primer vuelo a la compra completa. La regla por componente daría RD$6,320 y no está aprobada.
- En la columna de reembolso, «—» indica que el caso no plantea una cancelación.

#### 4.8.8 Implicaciones por elemento

| Elemento | Implicación |
|---|---|
| CU-04 | Una compra genera N reservaciones académicas; se verifica todo antes de crear; el cliente ve un solo código. |
| CU-05 | Una confirmación por compra, asociada a la reserva principal. |
| CU-06 | Cancelación completa; PA-5 con el primer vuelo; sin cancelación parcial. |
| PA-2 | Precio por suma de componentes; capacidad de 30 por vuelo; un asiento por pasajero y trayecto. |
| PA-3 / C-2 | Millas en la reserva principal; descuento sobre el total; sin reparto entre componentes. |
| PA-5 | 80 % del neto pagado; primer vuelo como referencia; millas no repuestas. |
| Modelo académico | Sin cambios en clases, atributos, métodos ni multiplicidades. |
| Capa interna | Agrupación, reserva principal, etiqueta/categoría de pasajero y control de componentes. |

#### 4.8.9 Pendientes que no resuelve C-3

1. Política de cancelación parcial y reembolso por componente.
2. Numeración, mapa y asignación de asientos.
3. Datos operativos de vuelos, horarios, duraciones y distancias (4.7).
4. Posibilidad de combinar conexiones diferentes entre ida y vuelta.

Estos pendientes no bloquean la landing ni el cierre funcional de C-3; deben resolverse antes de las pantallas o del conjunto de demostración que los requiera.

---

## 5. Millas (PA-3) **[C]**

### 5.1 Referencia de mercado

- **ConnectMiles**, el programa de Copa Airlines, es la referencia aprobada.
- **No se copia el programa completo.**
- La simplificación de CodeNova **no se presenta como regla oficial de ConnectMiles**.

### 5.2 Reglas del prototipo

| Regla | Decisión |
|---|---|
| Quién acumula y canjea | Solo clientes **corporativos** |
| Quiénes no | Los clientes **minoristas** no acumulan ni canjean |
| Base de acumulación | Distancia del vuelo |
| Tasa de acumulación | **100 % de la distancia** (simplificación de diseño) |
| Uso | Descuento **parcial** durante la compra |
| Equivalencia | **10 millas = RD$1** (1 milla = RD$0.10) |
| Fórmula | `descuento = millas utilizadas / 10` |
| Origen de la equivalencia | Derivada de 10,000 millas → RD$1,000; **convención del prototipo**, no regla de una aerolínea |
| Mínimo de canje | **1,000 millas** |
| Incremento | Pasos de **1,000 millas** |
| Tope | El descuento no supera el **importe pendiente de pago de la compra** (4.8) |
| Total | Puede ser **RD$0**, nunca negativo |
| Registro | `Reservacion.millasUtilizadas` y `Reservacion.descuentoAplicado` (RD$) en la reserva principal (4.8) |
| Deducción | Las millas usadas se descuentan **solo al confirmar** la compra (4.8) |
| Cancelación | **No se reponen** las millas |
| Saldo inicial | Corporativos nuevos: 0 millas; corporativo demo: 10,000 millas |
| Base del cálculo | El **importe total de la compra** (4.8) |

**Decisiones aprobadas de C-2 (06/11/2026):**

1. **Conversión.** 10 millas = RD$1; 1 milla = RD$0.10; `descuento = millas utilizadas / 10`. Es una regla propia del prototipo derivada del ejemplo aprobado de 10,000 millas = RD$1,000, **no una regla oficial de Copa/ConnectMiles ni de otra aerolínea**.
2. **Mínimo e incremento.** Canje mínimo de **1,000 millas**, en incrementos de **1,000**.
3. **Tope.** El descuento no puede superar el **importe pendiente de pago de la compra** (4.8). El total puede ser **RD$0**, pero **nunca negativo**.
4. **Elegibilidad.** Solo los clientes **corporativos** acumulan y canjean millas. Los minoristas no. Los clientes corporativos nuevos comienzan con **0 millas**; el cliente corporativo de demostración conserva sus **10,000**.
5. **Deducción.** Las millas se descuentan **únicamente al confirmar** la compra (4.8). **No se reponen** al cancelar.
6. **Registro.** Se utilizan `Reservacion.millasUtilizadas` y `Reservacion.descuentoAplicado` en la **reserva principal** (4.8), este último expresado en **RD$**. **No se crean atributos ni clases nuevas.**
7. **Interfaz futura.** Mostrar saldo, selector de canje, descuento y total actualizado de la compra; validar saldo, mínimo, incrementos y tope; ocultar el módulo a los clientes minoristas; advertir cuando el saldo sea menor que **1,000 millas**.
8. **Base del cálculo.** La conversión se aplica al **importe total de la compra**, definido en 4.8 (reserva principal + componentes).

### 5.3 Límites

No se construye:

- Programa completo de fidelización.
- Categorías élite.
- Vencimientos.
- Movimientos históricos.
- Canjes distintos al descuento parcial.

### 5.4 Requisito académico frente a simplificación

- **Académico:** el Cliente utiliza millas cuando cumple las condiciones; el escenario contempla aplicar un descuento. Los documentos **no definen fórmula, tasa ni equivalencia**.
- **Diseño:** acumulación solo corporativa, 100 % de la distancia y descuento parcial.
- **Regla aprobada:** 10 millas = RD$1, derivada del ejemplo 10,000 millas → RD$1,000. Es una **convención del prototipo**, no una regla de aerolínea (5.2).
- **Dato de demostración:** 10,000 millas → RD$1,000. Coincide exactamente con la regla aprobada y se conserva como caso verificable.

---

## 6. Cancelación y reembolso (PA-5) **[C]**

### 6.1 Requisito académico

- La cancelación es un caso de uso independiente (CU-06).
- Requiere una reservación existente.
- La regla académica establece **una semana** y una **devolución del 80 %**.

### 6.2 Interpretación operativa aprobada

| Elemento | Definición |
|---|---|
| Anticipación mínima | **Siete días completos** antes del primer vuelo de la compra (4.8) |
| Comparación | Fecha y hora de la solicitud contra fecha y hora programada de salida |
| Zona horaria | Hora local del aeropuerto de origen |
| Con siete días o más | Reembolso del **80 % del importe neto pagado** después del descuento por millas (4.8) |
| Con menos de siete días | Se permite cancelar, pero **no corresponde el reembolso académico** |
| 20 % restante | No se devuelve cuando aplica el reembolso |
| Unidad de cancelación | **Compra completa**; sin cancelaciones parciales en el prototipo (4.8) |
| Base del reembolso | **Importe neto pagado** después del descuento por millas (4.8) |
| Millas | **No se reponen** (5.2) |
| Transacciones bancarias | No se realizan |
| Interfaz | Representa el cálculo y el resultado |

Los **siete días completos** son una interpretación operativa para hacer verificable la regla académica. **No son una política universal de las aerolíneas.** La unidad de cancelación y la base del reembolso se precisan en 4.8.

### 6.3 Resultados representados

1. Cancelación con reembolso del 80 % del importe neto pagado.
2. Cancelación sin reembolso por no cumplir el plazo.
3. Reservación no encontrada.
4. Compra de ida y vuelta cancelada completa; sin cancelación parcial.

---

## 7. Trazabilidad y referencias

### 7.1 Fuentes de mercado consultadas

Se usaron solo para calibrar datos ficticios y patrones de interfaz. No se copian reglas ni textos, y sus políticas no sustituyen los requisitos académicos.

| Fuente | Uso | Alcance |
|---|---|---|
| Arajet — `arajet.com/es-do/donde-volamos` | Rutas y moneda DOP | Contexto; sus reglas de infantes no se aplican por la tarifa plana |
| Sky High Dominicana — `skyhighdo.com/itinerarios/` | Rutas del Caribe | Contexto |
| Air Century — `aircentury.com/cambios-y-cancelaciones/` y `/politica-de-devoluciones/` | Prácticas de cancelación | Contexto; no sustituyen el 80 % académico |
| ConnectMiles (Copa Airlines) | Referencia de fidelización aprobada | Referencia; no se copia el programa ni se adopta su tabla de canje |

Las tarifas del prototipo no reproducen exactamente las tarifas comerciales consultadas. La equivalencia 10:1 de 5.2 es una convención del prototipo; **no proviene de ConnectMiles ni de las demás fuentes de mercado**.

### 7.2 Tabla de trazabilidad

| Tema | Origen | Tipo |
|---|---|---|
| Actores y 7 casos de uso | `casos de uso.pdf` | Académico |
| Registro obligatorio para reservar | CU-02, CU-04 | Académico |
| Corporativo/minorista como variantes | Paso 3.1 y Paso 8 | Académico |
| Cancelación independiente y 80 % | CU-06 | Académico |
| Condición de una semana | CU-06 | Académico |
| Siete días completos y hora local | Interpretación del equipo | Operativo |
| Correo simulado | Guía, pantalla sugerida | Diseño |
| Uso de millas | CU-04 | Académico (sin fórmula) |
| Acumulación solo corporativa | Decisión del equipo | Simplificación |
| 100 % de la distancia | Decisión del equipo | Simplificación |
| Equivalencia 10 millas = RD$1 | Derivada de 10,000 → RD$1,000 | Decisión del equipo (C-2) |
| Mínimo y pasos de 1,000 millas | Decisión del equipo | Decisión del equipo (C-2) |
| Tope en el importe de la compra | Decisión del equipo | Decisión del equipo (C-2) |
| 10,000 millas → RD$1,000 | Dato de demostración | Caso de la regla 10:1 |
| Tarifa plana por conexión | Decisión del equipo | Simplificación |
| Mismo precio para todas las edades | Decisión del equipo | Simplificación |
| Infantes ocupan plaza | Decisión del equipo | Simplificación |
| 5 conexiones y precios | Decisión del equipo, mercado como referencia | Diseño |
| 20 servicios y 60 salidas | Decisión del equipo | Diseño |
| Capacidad de 30 | Decisión del equipo | Diseño |
| Reserva principal + componentes | Decisión del equipo (C-3) | Adaptación interna |
| Una reservación por pasajero y trayecto | Decisión del equipo (C-3) | Adaptación interna |
| Confirmación todo o nada | Decisión del equipo (C-3) | Decisión del equipo |
| Millas en la reserva principal | Decisión del equipo (C-3, C-2) | Decisión del equipo |
| Una confirmación por compra | Decisión del equipo (C-3) | Decisión del equipo |
| Cancelación completa; 80 % neto | Decisión del equipo (C-3, PA-5) | Decisión del equipo |
| Agente sin contraseña | Autenticación simulada | Prototipo |
| Ingreso del Cliente por correo | Decisión del equipo (C-1) | Prototipo |
| Correos de demostración reservados | Decisión del equipo (C-1) | Dato de demostración |
| Landing limitada a CU-01 | CU-01, CU-03 y guía p. 92 | Académico + diseño |
| Categorías de pasajero | Referencia de mercado | Diseño |

---

## 8. Arquitectura y stack

### 8.1 Arquitectura feature-based **[E]**

La organización será por **dominio funcional**, no por tipo técnico.

| Feature | Responsabilidad |
|---|---|
| `auth` | Registro simulado, ingreso por correo, sesión y cierre de sesión |
| `search` | Búsqueda de vuelos |
| `flights` | Catálogo y detalle de vuelos |
| `booking` | Reserva y selección de asiento |
| `confirmation` | Confirmación y correo simulado |
| `reservations` | Consulta de reservas del cliente |
| `cancellation` | Cancelación y reembolso |
| `agent` | Panel del agente |
| `shared` | Componentes, utilidades y tipos transversales |

Reglas:

- Dependencias controladas entre features: interfaces claras, bajo acoplamiento y dirección explícita.
- La política concreta de importaciones queda **pendiente del diseño de arquitectura [R]**.
- La estructura interna de carpetas no está aprobada **[R]**.
- No se crea ninguna carpeta en esta etapa.

### 8.2 Stack

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

React, Vite y TypeScript son la base aprobada. Esa aprobación **no autoriza instalarlos, inicializar el proyecto ni crear su estructura**. Las demás dependencias siguen **[R]** y no se instala ninguna en esta fase.

---

## 9. Auditoría de consistencia

### 9.1 Comprobaciones

| # | Comprobación | Resultado |
|---|---|---|
| 1 | Sin contradicción con aprobaciones anteriores | Conforme; C-2 y C-3 resueltas en 5.2 y 4.8 |
| 2 | Exclusiones funcionales vigentes | Conforme (sección 2.2) |
| 3 | Prototipo frontend sin backend, API, BD ni autenticación real | Conforme |
| 4 | Stack React + Vite + TypeScript, sin autorización de inicialización | Conforme |
| 5 | Arquitectura feature-based vigente | Conforme |
| 6 | Solo el titular modifica la implementación; compañeros con consulta | Conforme (sección 1.2) |
| 7 | Coherencia de conexiones, tarifas, recurrencias y capacidades | Conforme (4.1–4.4, 4.8) |
| 8 | Millas sin fórmula que contradiga los documentos | Conforme; equivalencia 10:1 aprobada en 5.2 |
| 9 | Cancelación diferenciada entre requisito y operación | Conforme (sección 6, 4.8) |
| 10 | Sin funcionalidades excluidas añadidas | Conforme |
| 11 | Landing limitada a CU-01; sin filtros ni búsqueda pública | Conforme (3.7) |
| 12 | C-1 resuelta sin selector de roles ni acceso directo | Conforme (3.8) |
| 13 | Clientes nuevos sin millas; datos demo independientes | Conforme (3.8, C-1.6) |
| 14 | Conversión de millas aprobada, con mínimo, tope y elegibilidad | Conforme (5.2, C-2) |
| 15 | C-3 resuelta sin modificar el modelo académico | Conforme (4.8) |
| 16 | Pendientes operativos identificados y no presentados como resueltos | Conforme (4.8.9, 9.4) |

### 9.2 Resoluciones documentadas

C-1, C-2 y C-3 quedaron resueltas y aprobadas. No quedan tensiones funcionales abiertas; los pendientes operativos se enumeran en 4.8.9 y 9.4.

**C-1 — Acceso a los clientes de demostración.** **Resuelta en 3.8.** El ingreso simulado por correo, la unicidad del correo, la sesión tras CU-02 y las rutas protegidas quedan definidos allí. No se reproduce aquí para evitar duplicación.

**C-2 — Conversión de millas a descuento para saldos arbitrarios.** **RESUELTO - APROBADO POR OLIVER.** La regla queda definida en 5.2: 10 millas = RD$1 (1 milla = RD$0.10); `descuento = millas utilizadas / 10`; mínimo e incrementos de 1,000 millas; tope en el importe pendiente; solo clientes corporativos; deducción al confirmar y sin reposición al cancelar. La equivalencia es una **convención del prototipo** derivada del ejemplo 10,000 → RD$1,000, no una regla de aerolínea. El registro usa `millasUtilizadas` y `descuentoAplicado` en RD$. La base del cálculo es el importe total de la compra, definido en 4.8.

**C-3 — Representación del viaje: ida y vuelta y cantidad de pasajeros.** **RESUELTO - APROBADO POR OLIVER.** Se adopta C′: reserva principal académica + reservaciones componentes + agrupación interna. Se crea una reservación académica por pasajero y por trayecto; el `codigoReservacion` de la principal es el identificador visible y los códigos componentes son internos; la etiqueta y categoría de cada pasajero se guardan en la capa interna; la confirmación es todo o nada; `millasUtilizadas` y `descuentoAplicado` se registran solo en la principal y se aplican al total de la compra; se envía una sola confirmación por compra; la cancelación es completa, sin parciales, con PA-5 referida al primer vuelo; se reembolsa el 80 % del neto pagado y las millas no se reponen. El modelo académico no se modifica. El detalle y los ejemplos están en 4.8. Quedan pendientes la cancelación parcial, la numeración/mapa/asignación de asientos, los datos operativos y la combinación de conexiones (9.4).

### 9.3 Aclaraciones que no son contradicciones

- **Tarifa plana:** el mercado cobra distinto a infantes; el prototipo aplica el mismo precio por decisión aprobada. La referencia de mercado se conserva solo como contexto.
- **Infantes con plaza:** el mercado permite infantes en regazo; el prototipo les asigna plaza para simplificar la disponibilidad.
- **Millas no repuestas al cancelar:** los documentos académicos no definen esa devolución; se documenta como vacío deliberado, no como regla.
- **Equivalencia 10:1:** convierte el ejemplo de PA-1.10 en regla del prototipo; **no es una regla oficial de ConnectMiles ni de otra aerolínea** y no se presenta como tal.
- **“No generar vuelos automáticamente”:** significa que el conjunto de 30 días se prepara fuera de la aplicación; no implica que el sistema los cree en ejecución.
- **“Historial” excluido:** la lista de reservas necesaria para consultar y cancelar **sí** se incluye; lo excluido es un módulo de historial más amplio.
- **Ingreso por correo:** no es autenticación real ni control de acceso; es una identificación simulada para seleccionar al Cliente (C-1). Comparte el límite declarado de `/agente`.
- **C-3 y modelo académico:** la reserva principal y las reservaciones componentes son una agrupación interna del prototipo; no se añaden clases, atributos, métodos ni multiplicidades al modelo académico.

### 9.4 Pendientes operativos que no resuelve C-3

1. Política de cancelación parcial y reembolso por componente.
2. Numeración, mapa y asignación de asientos.
3. Datos operativos de vuelos, horarios, duraciones y distancias (4.7).
4. Posibilidad de combinar conexiones diferentes entre ida y vuelta.

Estos pendientes no reabren C-3 ni bloquean la landing; deben resolverse antes de las pantallas o del conjunto de demostración que los requiera. No se inventan reglas para ellos.

---

## 10. Metodología de diseño visual iterativo

### 10.1 Jerarquía de referencias

1. **Principal:** landing page de Tesla — composición y lenguaje visual.
2. **Complementarias:** sitios de aerolíneas — patrones de búsqueda, reserva y confianza.
3. **Funcional:** casos de uso, escenarios y clases.
4. **Contenido:** datos ficticios y reglas de este plan.

Tesla se usa como referencia, no como plantilla. No se copian assets, textos, logotipos ni layouts.

### 10.2 Protocolo por iteración

| Paso | Actividad | Resultado |
|---|---|---|
| 1 | Definir el objetivo de la iteración | Alcance visual acotado |
| 2 | Analizar Tesla y referencias complementarias | Criterios de composición |
| 3 | Presentar 2–3 propuestas concretas | Opciones comparables |
| 4 | El usuario evalúa y elige | Decisión explícita |
| 5 | Aplicar solo lo aprobado | Elemento validado |
| 6 | Registrar decisiones y pendientes | Base para la siguiente iteración |

### 10.3 Reglas

- Ninguna propuesta visual es definitiva sin aprobación.
- No se avanza automáticamente a la siguiente iteración.
- Si una idea visual implica funcionalidad nueva, se detiene y se consulta.
- La landing existente es un prototipo sujeto a revisión; su presencia no implica que la dirección visual final esté aprobada.

### 10.4 Primera iteración

**Alcance:** landing pública (`/`), navegación y presentación del catálogo público **como CU-01**.

- La landing no incorpora búsqueda por criterios, filtros ni disponibilidad numérica (3.7).
- El catálogo muestra conexiones, tarifas, días de operación y horarios verificados.
- La llamada a la acción es **«Ver vuelos»**, no «Consultar».
- El Visitante puede iniciar CU-02; el Cliente puede ingresar por `/ingresar` (3.8).
- El enlace «Ingresar» apunta a `/ingresar`; esa pantalla debe existir antes de publicar el enlace, para no dejar una ruta muerta.

No incluye aún reserva, panel del cliente ni panel del agente. La aplicación de millas (5.2) y la composición de la compra (4.8) pertenecen a la pantalla de reserva; no amplían el alcance de la landing.

### 10.5 Exploración visual pendiente de aprobación formal **[EX]**

El plan no registra aprobación formal para el concepto “Premium quiet aviation”, paleta, tipografías Manrope/Inter, escala tipográfica, radios y sombras, composición del hero, imágenes full-bleed, grid de 12 columnas, navegación transparente, animaciones, breakpoints, wordmark, monograma y slogan. Algunos de estos elementos ya aparecen en la aplicación prototipo y quedan sujetos a la revisión visual del usuario; no se consideran por ello aprobados ni deben alterarse sin autorización.

Las decisiones funcionales de 3.7, 3.8, 4.8 y 5.2 están cerradas y no forman parte de esta exploración.

---

## 11. Próximos pasos

1. Revisar visualmente la implementación existente de la landing y registrar solo los cambios aprobados.
2. Completar los pendientes operativos: horarios, duraciones, distancias, numeración/mapa de asientos y posible combinación de conexiones (4.7, 9.4), antes de las pantallas que los requieran.
3. Elaborar un plan de alcance para cualquier funcionalidad futura, respetando las decisiones funcionales cerradas y las exclusiones aprobadas.

**Regla de detención:** no se altera el diseño visual aprobado ni se amplía la funcionalidad sin aprobación explícita.

---

## 12. Registro de cambios

| Fecha | Cambio | Autorización |
|---|---|---|
| 06/11/2026 | Creación del documento único de planificación | Opción A aprobada |
| 06/11/2026 | PA-4 reclasificado de pendiente a establecido | Aprobación explícita |
| 06/11/2026 | Incorporadas autenticación simulada, DOP, millas, alcance y cancelaciones | Aprobación explícita |
| 06/11/2026 | Revisión correctiva: CU-02 incluido; dependencias entre features; stack base; orígenes de presentación | Aprobación explícita |
| 06/11/2026 | **Versión 2.0 — Cierre funcional:** PA-1, PA-1.10, PA-2, PA-3 y PA-5 definidas; auditoría de consistencia; tensiones C-1 a C-3 documentadas | Aprobación explícita |
| 06/11/2026 | **Versión 2.1 —** Frontera CU-01/CU-03 definida (3.7); C-1 resuelta con ingreso simulado por correo (3.8); C-2 y C-3 permanecen abiertas | Aprobación explícita |
| 06/11/2026 | **Versión 2.2 —** C-2 resuelta: conversión 10 millas = RD$1, mínimo e incrementos de 1,000, tope en el importe pendiente, elegibilidad corporativa, deducción al confirmar y registro en `millasUtilizadas`/`descuentoAplicado` (5.2); C-3 permanece abierta | Aprobación explícita de Oliver |
| 06/11/2026 | **Versión 2.3 —** C-3 resuelta: reserva principal + componentes, una reservación por pasajero y trayecto, confirmación todo o nada, millas en la principal, una confirmación por compra y cancelación completa con 80 % del neto (4.8); pendientes operativos identificados (9.4) | Aprobación explícita de Oliver |
| 08/11/2026 | **Versión 2.4 —** Estado actualizado: existe una implementación frontend prototipo; se precisan el alcance implementado, las funcionalidades pendientes y la revisión visual | Implementación y estado del repositorio |

---

**Fin del documento.** Planificación funcional cerrada. C-1, C-2 y C-3 resueltas; pendientes operativos identificados (4.8, 9.4). Existe una aplicación frontend prototipo con landing pública y flujo simulado de ingreso/registro. La revisión visual continúa; reserva y paneles de Cliente y Agente siguen pendientes.
