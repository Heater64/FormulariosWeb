# FormsBiblicos — Documento Técnico de Arquitectura

### Base arquitectónica definitiva para una plataforma de estudio bíblico guiado
**Stack:** HTML + CSS + JavaScript nativo (sin frameworks) · Supabase (Auth, Database, Storage, Realtime, RLS)
**Versión:** 1.0 — Documento de referencia a largo plazo

---

## Índice

1. Filosofía del proyecto y principios rectores
2. Arquitectura general del sistema
3. Organización del proyecto: carpetas, módulos y convenciones
4. Arquitectura JavaScript sin framework
5. Gestión de estado
6. Arquitectura CSS a gran escala
7. Sistema de diseño: minimalismo inspirado en Apple
8. Mobile first y diseño accesible al pulgar
9. Accesibilidad (WCAG 2.2)
10. Rendimiento y optimización
11. Seguridad de la aplicación
12. Base de datos: modelo, roles y Row Level Security
13. Roles y aislamiento de datos por grupo
14. El motor pedagógico: lectura, recuerdo activo y repetición espaciada
15. Funcionalidades principales, módulo a módulo
16. Panel administrativo y panel del Owner
17. Orden recomendado de desarrollo (roadmap)
18. Riesgos, decisiones abiertas y recomendaciones finales
19. Anexo: estructura de carpetas ampliada
20. Módulo de exámenes personalizados y corrección
21. Visión unificada: los dos mundos de la plataforma

---

## 1. Filosofía del proyecto y principios rectores

### Qué
FormsBiblicos no es un motor de exámenes con un tema bíblico superpuesto; es una **plataforma de estudio guiado** cuyo flujo obligatorio es: leer el texto de la Reina Valera 1960 → responder preguntas sobre lo leído → repasar lo que falló → memorizar versículos clave → evaluarse periódicamente → continuar con el siguiente capítulo. Cada pantalla de examen debe estar precedida, siempre, por la pantalla de lectura correspondiente; el sistema nunca debe permitir "saltarse" la Biblia para llegar directo a la pregunta.

### Por qué
Este principio no es solo pedagógico, es arquitectónico: determina el modelo de datos (cada intento de examen queda ligado a una sesión de lectura previa, no es un objeto aislado), determina la navegación (no puede haber una ruta directa `/examen/:id` accesible sin haber pasado por `/leer/:capitulo`), y determina el diseño de la interfaz (la Biblia siempre "vive" en el centro de la pantalla, nunca en una pestaña secundaria).

### Ventajas de fijar esto desde el diseño
- Evita que el proyecto derive, con el tiempo, en "otro generador de quizzes" cuando lleguen nuevas peticiones de funcionalidades.
- Facilita medir lo que realmente importa (tiempo de lectura, versículos vistos) en lugar de solo "exámenes aprobados".
- Da un criterio objetivo para aceptar o rechazar futuras funcionalidades: si una función no refuerza el ciclo lectura→pregunta→repaso→memorización→evaluación→continuidad, no entra en el núcleo del producto.

### Alternativas consideradas
Una alternativa habría sido tratar la lectura como un recurso opcional de apoyo (como hacen la mayoría de apps de trivia bíblica). Se descarta explícitamente porque contradice el objetivo declarado del proyecto: que el usuario lea más Biblia, no que memorice respuestas sin haber leído el texto.

### Recomendación final
Modelar este flujo como una **máquina de estados finita** a nivel de dominio (no solo de UI): cada capítulo de estudio tiene los estados `no_iniciado → leyendo → preguntas → repaso → memorización → evaluado → completado`, y las transiciones se validan tanto en el cliente como, de forma más estricta, en las políticas de Supabase (RLS + funciones), de modo que ni siquiera un usuario que manipule las peticiones de red pueda registrar un examen sin una lectura previa asociada.

---

## 2. Arquitectura general del sistema

### Qué
Una arquitectura de **aplicación web de página única modular (SPA ligera)**, servida como archivos estáticos (HTML/CSS/JS), sin bundlers obligatorios, con Supabase como backend completo (base de datos Postgres, autenticación, almacenamiento de archivos y tiempo real), y con **ES Modules nativos del navegador** como mecanismo de organización de código, en lugar de un framework de componentes.

### Por qué
El objetivo declarado es que el proyecto se mantenga durante años. Los frameworks de frontend cambian de versión mayor cada 2-4 años y suelen forzar reescrituras costosas (Angular.js → Angular 2, Vue 2 → Vue 3, las migraciones de React con Hooks, etc.). HTML, CSS y JavaScript son las únicas tres tecnologías del frontend que llevan más de 25 años funcionando sin roturas de compatibilidad hacia atrás. Elegir "no framework" es, paradójicamente, la decisión más conservadora y de menor riesgo a largo plazo, siempre que se compense con una disciplina de arquitectura equivalente a la que un framework impondría por diseño.

### Ventajas
- Cero deuda de dependencias de frontend: no hay que migrar de versión de framework nunca.
- Carga inicial mínima: sin runtime de framework que descargar, parsear y ejecutar antes de que la app sea interactiva — crítico para el público objetivo (móviles antiguos, ancianos, conexiones lentas).
- Curva de aprendizaje más plana para futuros colaboradores: cualquier desarrollador con conocimientos de HTML/CSS/JS puede incorporarse sin aprender un framework específico.
- Control total y transparente sobre cada línea de código que se ejecuta en el navegador del usuario, lo cual es relevante en seguridad (superficie de ataque conocida y auditable).

### Inconvenientes
- Hay que construir "a mano" cosas que un framework ofrece de fábrica: renderizado reactivo, enrutador, gestión de formularios, componentización. Esto exige más disciplina y documentación interna.
- Es más fácil, si no se define una arquitectura clara desde el día uno, terminar con código desordenado ("HTML de espagueti" con JavaScript disperso). Este documento existe precisamente para evitar ese riesgo.
- Hay menos tutoriales y menos "convenciones de la comunidad" ya hechas; hay que documentar las propias.

### Alternativas
Se valoraron: (a) usar un framework ligero tipo Preact o Alpine.js — descartado porque el usuario pidió explícitamente evitar dependencias de frontend; (b) usar Web Components nativos como unidad de componentización — se recomienda como técnica complementaria (ver capítulo 4), no como sustituto de toda la arquitectura, porque Shadow DOM introduce complejidad de estilos que no compensa en un proyecto de esta naturaleza.

### Recomendación final
Arquitectura de **capas separadas explícitamente**:

```
┌─────────────────────────────────────────────┐
│  Presentación (HTML + CSS + templates JS)    │
├─────────────────────────────────────────────┤
│  Componentes de UI (funciones que renderizan)│
├─────────────────────────────────────────────┤
│  Lógica de aplicación / casos de uso         │
├─────────────────────────────────────────────┤
│  Estado (store central observable)           │
├─────────────────────────────────────────────┤
│  Acceso a datos (repositorios Supabase)      │
├─────────────────────────────────────────────┤
│  Supabase (Auth · Postgres+RLS · Storage)    │
└─────────────────────────────────────────────┘
```

Cada capa solo puede hablar con la capa inmediatamente inferior. La UI nunca llama directamente a `supabase.from(...)`; llama a un repositorio (`lecturaRepository.marcarCapituloLeido(...)`), que es el único lugar del proyecto que conoce la forma exacta de las tablas. Esto permite que si algún día cambia el esquema de base de datos, o incluso el backend, solo haya que tocar una capa.

---

## 3. Organización del proyecto: carpetas, módulos y convenciones

### Qué
Una estructura de carpetas por **capa y por dominio**, no por tipo de archivo genérico. Propuesta:

```
formsbiblicos/
├── index.html
├── /paginas/                    → un HTML por vista real (leer, examen, panel, login...)
│   ├── leer.html
│   ├── examen.html
│   ├── progreso.html
│   └── admin/
│       ├── panel-admin.html
│       └── panel-owner.html
├── /css/
│   ├── 00-settings/             → tokens: color, tipografía, espaciado
│   ├── 01-tools/                → mixins-equivalentes (custom properties calculadas)
│   ├── 02-generic/               → reset, box-sizing
│   ├── 03-elements/              → estilos de etiquetas HTML puras
│   ├── 04-objetos/               → patrones estructurales (grid, contenedor, pila)
│   ├── 05-componentes/           → tarjeta, botón, barra-inferior, modal...
│   └── 06-utilidades/            → clases de una sola responsabilidad
├── /js/
│   ├── /core/                    → arranque, router, store, eventBus
│   ├── /dominio/                 → lógica de negocio pura (sin DOM, sin Supabase)
│   │   ├── progresoLectura.js
│   │   ├── repeticionEspaciada.js
│   │   └── calificacionExamen.js
│   ├── /datos/                   → repositorios (única capa que llama a Supabase)
│   │   ├── supabaseClient.js
│   │   ├── lecturaRepository.js
│   │   ├── examenRepository.js
│   │   └── usuarioRepository.js
│   ├── /componentes/             → un archivo por componente reutilizable de UI
│   │   ├── tarjeta-capitulo.js
│   │   ├── barra-navegacion-inferior.js
│   │   └── selector-version-biblica.js
│   ├── /vistas/                   → controladores de cada página (orquestan componentes)
│   │   ├── vista-leer.js
│   │   ├── vista-examen.js
│   │   └── vista-panel-admin.js
│   └── /utilidades/               → helpers puros (fechas, validación, sanitización)
├── /assets/
│   ├── /iconos/                   → SVG en línea o sprite
│   └── /biblia/                   → si el texto se sirve estático (ver cap. 15)
└── /supabase/
    ├── /migraciones/              → SQL versionado
    ├── /politicas-rls/            → SQL de políticas, versionado y comentado
    └── /funciones/                 → Edge Functions si se necesitan
```

### Por qué
Organizar por **dominio y responsabilidad** (lectura, examen, usuario) en lugar de por tipo técnico ("todos los .js juntos") es lo que permite que el proyecto crezca durante años sin que ningún archivo se vuelva gigante. Cuando alguien tiene que tocar "todo lo relacionado con exámenes", sabe que debe mirar `examenRepository.js`, `calificacionExamen.js`, `vista-examen.js` — tres archivos pequeños y específicos — en lugar de buscar dentro de un `app.js` de 4.000 líneas.

### Ventajas
- Nuevos desarrolladores entienden la ubicación de cualquier funcionalidad por convención, no por memoria.
- Los archivos se mantienen pequeños de forma natural (cada uno tiene una sola responsabilidad).
- Facilita pruebas: la carpeta `/dominio/` no toca el DOM ni la red, así que su lógica (por ejemplo, el cálculo de próxima fecha de repaso) se puede probar de forma aislada.
- Facilita la carga diferida real: cada vista puede cargarse solo cuando se navega a ella (ver capítulo 10).

### Inconvenientes
- Más archivos pequeños significa más decisiones de nomenclatura; hace falta una convención estricta desde el primer commit (ver más abajo) o el orden se pierde igual de rápido que con archivos grandes.
- Al no usar un framework con convenciones impuestas, esta estructura debe documentarse y respetarse por disciplina de equipo, no por imposición técnica de una herramienta.

### Convenciones de nombres recomendadas
- Archivos JS de dominio y utilidades: `camelCase.js` (son módulos que se importan por nombre de función).
- Archivos de componentes de UI y vistas: `kebab-case.js`, para que coincidan visualmente con los nombres de las clases CSS y de los custom elements si se usan Web Components.
- Clases CSS: metodología BEM (`bloque__elemento--modificador`), ver capítulo 6.
- Tablas y columnas de Supabase: `snake_case` en minúsculas, en español o inglés pero consistente en todo el proyecto (se recomienda español para que el dominio bíblico y educativo sea legible por cualquier futuro colaborador hispanohablante: `capitulos_leidos`, `intentos_examen`, `usuario_id`).

### Recomendación final
Fijar estas convenciones en un archivo `CONVENCIONES.md` en la raíz del repositorio desde el primer día, y tratarlo como parte del código: cualquier cambio de convención pasa por el mismo proceso de revisión que un cambio de funcionalidad.

---

## 4. Arquitectura JavaScript sin framework

### Qué
Cuatro piezas de infraestructura que, juntas, sustituyen lo que normalmente da un framework: un **router** de cliente basado en la History API, un **store** central observable, un **bus de eventos** para comunicación desacoplada entre componentes, y **componentes como funciones puras que devuelven nodos del DOM** (o, opcionalmente, Web Components nativos para las piezas más reutilizadas, como la tarjeta de capítulo o la barra inferior).

### Por qué
Investigando patrones documentados de aplicaciones vanilla a gran escala, el patrón que se repite con más consistencia es: **módulos ES nativos + patrón observador/pub-sub para el estado + delegación de eventos para el DOM**. Ese trío evita las dos causas más citadas de degradación con el tiempo en proyectos sin framework: (1) variables globales mutables sin control, y (2) un listener de evento por cada elemento del DOM, que en listas largas (por ejemplo, una lista de 66 libros × capítulos) genera cientos de listeners innecesarios y fugas de memoria.

**Delegación de eventos**: en lugar de añadir un `click` a cada tarjeta de capítulo, se añade un único listener al contenedor padre y se identifica el elemento pulsado mediante `event.target.closest(...)`. Esto es más eficiente en memoria y funciona automáticamente con contenido añadido dinámicamente (por ejemplo, cuando se cargan más capítulos con scroll infinito).

**Componentes como fábricas de nodos**: un componente es una función que recibe datos y devuelve un elemento del DOM lo que los hace reutilizables, aislados y fáciles de testear, ya que no dependen de estado global ni producen efectos secundarios ocultos.

### Router
Un router mínimo basado en `history.pushState` y el evento `popstate`, con una tabla de rutas que asocia patrones (`/leer/:libro/:capitulo`) a funciones de "vista" que se encargan de montar/desmontar el contenido de un contenedor `<main id="app-root">`. Cada vista expone dos funciones: `montar(contenedor, parametros)` y `desmontar()`, de forma que se puedan liberar listeners y evitar fugas de memoria al navegar.

### Store central (gestión de estado)
Un objeto único (`store.js`) con:
- Un estado interno privado (no exportado directamente).
- Un método `obtenerEstado()` que devuelve una copia (o, en JavaScript moderno, se puede usar `structuredClone` para clonado profundo seguro), de forma que nadie pueda mutar el estado por fuera del store.
- Un método `actualizarEstado(actualizador)` que aplica el cambio y notifica a los suscriptores.
- Un método `suscribir(callback)` que devuelve una función de "desuscripción", para que los componentes se limpien correctamente al desmontarse (patrón de limpieza explícita, señalado como buena práctica recurrente en la documentación consultada).

Este patrón es, en esencia, una versión simplificada de Redux/Flux implementada en JavaScript puro, sin ninguna librería.

### Ventajas
- El estado tiene una única fuente de verdad; cualquier parte de la interfaz puede reaccionar a sus cambios sin acoplarse directamente a quien los provoca.
- El patrón de suscripción con limpieza explícita evita fugas de memoria al navegar entre vistas — un problema habitual en SPA hechas a mano sin esta disciplina.
- Cada componente es testeable de forma aislada porque no depende de variables globales.

### Inconvenientes
- No hay reactividad automática de "atributo a atributo" como en frameworks reactivos: cada componente debe suscribirse explícitamente a lo que le interesa y volver a renderizar su propio fragmento del DOM. Esto es más verboso, pero también más predecible y depurable.
- Para pantallas con muchísimas actualizaciones simultáneas (no es el caso típico de esta app, orientada a lectura y formularios, no a datos en tiempo real masivos), un store simple puede quedarse corto frente a librerías especializadas; no es un riesgo real aquí.

### Alternativas
Usar directamente el DOM como fuente de verdad (leer valores de inputs cuando se necesiten) es viable para partes muy pequeñas de la interfaz, pero no escala a un dominio con reglas de negocio como repetición espaciada o progreso multi-capítulo. Se descarta como estrategia general y se reserva solo para formularios simples y aislados.

### Recomendación final
Un store central para el estado de "sesión de estudio en curso" (capítulo actual, respuestas dadas, resultado del examen) y stores locales pequeños solo cuando un componente aislado lo requiera (por ejemplo, el estado de apertura de un menú). No forzar un único store gigante para toda la aplicación: eso reproduciría, sin querer, los mismos problemas de acoplamiento que se buscan evitar.

---

## 5. Gestión de estado

### Qué
Diferenciar explícitamente tres tipos de estado, porque cada uno necesita una estrategia distinta:

1. **Estado de sesión de UI** (qué pestaña está activa, si un modal está abierto): vive en memoria, en el store central, se pierde al recargar la página y no necesita persistencia.
2. **Estado de progreso del usuario** (qué capítulos ha leído, qué versículos memoriza, resultados de exámenes): es el estado que importa de verdad; su fuente de verdad **siempre** es Supabase, nunca el navegador. El store local solo actúa como una caché de lectura rápida sincronizada con la base de datos.
3. **Estado derivado/calculado** (por ejemplo, el porcentaje de la Biblia leído, o la próxima fecha de repaso de un versículo según el algoritmo de repetición espaciada): nunca se guarda como tal; se calcula siempre a partir del estado base, para evitar inconsistencias cuando el dato origen cambia.

### Por qué
Es un error frecuente en aplicaciones educativas guardar en el cliente (localStorage) el progreso del usuario "para que cargue más rápido" y que ese progreso se desincronice de lo que hay en el servidor, o peor, que se pierda al cambiar de dispositivo. Dado que la audiencia incluye personas mayores que probablemente usarán un único dispositivo (el móvil), esto es menos crítico que en otros productos, pero sigue siendo la causa más común de "se me borró mi progreso" en soporte técnico de apps educativas.

### Ventajas de esta separación
- El progreso del usuario nunca se pierde por borrar caché del navegador, porque no vive ahí.
- Permite estudiar desde varios dispositivos sin conflictos, ya que Supabase es la única fuente de verdad.
- Los cálculos derivados (porcentaje leído, racha de días, próxima fecha de repaso) siempre son consistentes porque se recalculan, no se cachean de forma duradera.

### Inconvenientes
- Requiere conexión a internet (o una estrategia offline explícita, ver capítulo 10) para registrar avances; en zonas con conectividad muy pobre esto puede frustrar al usuario si no se gestiona con una cola de sincronización.
- Añade una capa de indirección (repositorio → Supabase) en lugar de leer/escribir directamente variables locales.

### Recomendación final
Usar el patrón de **"optimistic UI" con cola de reintento**: cuando el usuario responde una pregunta o marca un capítulo como leído, la interfaz se actualiza de inmediato (sensación de app rápida) y, en paralelo, se envía la escritura a Supabase; si falla por falta de red, la operación se guarda en una cola local (con IndexedDB, no localStorage, por límite de tamaño) y se reintenta cuando vuelva la conexión. Esto es especialmente importante para el público objetivo (personas mayores, zonas rurales, dispositivos y redes antiguas).

---

## 6. Arquitectura CSS a gran escala

### Qué
Adoptar la metodología **ITCSS (Inverted Triangle CSS)** para el orden de las capas de estilos, combinada con **BEM (Block Element Modifier)** para la nomenclatura de clases, y **Custom Properties de CSS (variables nativas)** como sistema de *design tokens*, sin ningún preprocesador obligatorio (aunque el proyecto es compatible con Sass si en el futuro se desea).

### Por qué
ITCSS organiza el CSS de lo más genérico a lo más específico (ajustes → herramientas → genérico/reset → elementos → objetos → componentes → utilidades), lo cual resuelve el problema estructural más citado en CSS a gran escala: las "guerras de especificidad", donde cada desarrollador añade `!important` o selectores cada vez más largos para ganarle a una regla anterior. BEM, por su parte, aplana la especificidad (todas las clases valen "0-1-0") y hace que el nombre de una clase describa exactamente su función y su relación con su bloque padre, sin necesidad de anidar selectores.

### Las siete capas recomendadas (carpetas ya definidas en el capítulo 3)
1. **Settings**: variables CSS (`--color-primario`, `--espaciado-md`, `--radio-tarjeta`). No genera CSS por sí sola.
2. **Tools**: no aplica igual que en preprocesadores (no hay mixins nativos), pero se reserva para clases de ayuda repetidas por `@property` o funciones CSS reutilizadas.
3. **Generic**: reset mínimo, `box-sizing: border-box` global, normalización tipográfica.
4. **Elements**: estilos por etiqueta HTML pura (`h1`, `p`, `button` sin clase), pensados como una base ya agradable incluso sin clases añadidas.
5. **Objects**: patrones estructurales reutilizables sin estética propia (`.o-contenedor`, `.o-pila`, `.o-grid-tarjetas`).
6. **Components**: la mayoría del CSS del proyecto vive aquí, con nomenclatura BEM estricta (`.tarjeta-capitulo`, `.tarjeta-capitulo__titulo`, `.tarjeta-capitulo--completado`).
7. **Utilities**: clases de una sola responsabilidad y máxima especificidad intencional (`.u-oculto`, `.u-solo-lectores-pantalla`), usadas con moderación.

### Ventajas
- Cualquier desarrollador nuevo puede predecir en qué carpeta está una regla concreta sin buscar en todo el proyecto.
- Los tokens centralizados en `Settings` permiten cambiar todo el tema visual (por ejemplo, activar un modo de alto contraste, ver capítulo 9) modificando un único archivo de variables.
- Evita la necesidad de un preprocesador: las Custom Properties nativas ya ofrecen variables, y con `calc()` y `clamp()` se cubre gran parte de lo que antes exigía Sass.

### Inconvenientes
- ITCSS y BEM tienen una curva de aprendizaje inicial y exigen disciplina de nomenclatura constante; si el equipo no la respeta, el beneficio desaparece.
- Nombres BEM pueden volverse largos en componentes muy anidados; se recomienda evitar más de dos niveles de anidación de "elemento" dentro de un bloque.

### Alternativas
CSS-in-JS y utilidades tipo Tailwind se descartan explícitamente por instrucción del proyecto (sin frameworks/librerías de utilidades). Un enfoque "utility-first" hecho a mano (como CUBE CSS) es una alternativa moderna razonable, pero se prioriza ITCSS+BEM por ser más legible para un equipo que irá rotando durante años y por encajar mejor con el estilo "grandes tarjetas, mucho aire" que pide el proyecto, donde los componentes (no las utilidades sueltas) son la unidad natural de diseño.

### Recomendación final
ITCSS como esqueleto de carpetas, BEM como convención de nombres dentro de la capa de componentes, y Custom Properties como único sistema de tokens de diseño (color, tipografía, espaciado, radios, sombras), documentado en un único archivo `settings/_tokens.css` que actúa como la fuente de verdad visual de toda la plataforma.

---

## 7. Sistema de diseño: minimalismo inspirado en Apple

### Qué
Adoptar como principios rectores del diseño visual los tres pilares históricos de las Human Interface Guidelines de Apple — **Claridad, Deferencia y Profundidad** — traducidos a decisiones concretas de HTML/CSS, sin replicar literalmente ningún componente, ícono o textura propia de productos de Apple.

### Por qué (traducción de cada principio a decisiones de diseño)

**Claridad** significa texto legible en cualquier tamaño, iconografía precisa y ausencia de ambigüedad en cada elemento interactivo. Traducido a FormsBiblicos: un único tipo de letra del sistema (`-apple-system, "Segoe UI", Roboto, sans-serif`, es decir, la fuente nativa de cada dispositivo, no una tipografía descargada que penalice el rendimiento), una escala tipográfica limitada (4-5 tamaños, no quince), y textos de botones que describen la acción exacta ("Continuar leyendo Génesis 2", no simplemente "Siguiente").

**Deferencia** significa que la interfaz nunca compite con el contenido — en este caso, el texto bíblico. Traducido: fondos neutros (blanco o gris muy claro), tarjetas con bordes sutiles o sombras mínimas en lugar de colores saturados de fondo, y controles que se retiran visualmente cuando el usuario está leyendo (por ejemplo, la barra de navegación puede atenuarse u ocultarse suavemente durante la lectura activa, un patrón ya usado por lectores de libros y por Safari en iOS).

**Profundidad** significa usar capas y jerarquía, no decoración. Traducido: una jerarquía tipográfica clara (título de libro > título de capítulo > versículo > nota), tarjetas con una sola elevación sutil (no múltiples sombras apiladas), y transiciones breves y funcionales (200-300ms) que ayudan a entender qué pantalla sigue a cuál, nunca animaciones "vistosas" que distraigan.

### Paleta y componentes recomendados
- **Color**: 1 color de acento (azul o verde, coherente con "calma" y con la tradición visual de apps de estudio), una escala de grises para texto/fondos, y colores semánticos mínimos (éxito, error, aviso) reservados solo para retroalimentación de exámenes.
- **Espaciado**: sistema de espaciado en múltiplos de 8px (convención extendida en el diseño de interfaces modernas, no exclusiva de Apple pero compatible con su filosofía), lo que da el "aire" pedido explícitamente en los requisitos.
- **Tarjetas grandes**: cada capítulo, cada logro, cada examen se representa como una tarjeta con suficiente relleno interno (padding generoso), radios de esquina moderados y una sola sombra suave, nunca bordes duros ni esquinas rectas que transmitan dureza visual.
- **Iconografía**: un único set de iconos lineales simples (SVG en línea, un solo grosor de trazo), nunca mezclar estilos de ícono.

### Ventajas
- Un sistema de diseño con pocos tokens y componentes es más rápido de construir, más fácil de mantener y más consistente con el paso de los años que un sistema con decenas de variantes.
- La deferencia visual reduce la carga cognitiva, que es exactamente el objetivo declarado para el público de niños, adultos mayores y personas con poca experiencia tecnológica.
- Evitar animaciones llamativas mejora el rendimiento en dispositivos antiguos (menos repintados y recomposiciones costosas).

### Inconvenientes
- Un diseño tan minimalista exige más disciplina de contenido: cada texto, cada etiqueta debe ser clara por sí misma porque no hay decoración que "disimule" la ambigüedad.
- Puede percibirse como "soso" por usuarios acostumbrados a apps con mucho color y gamificación agresiva; se compensa con micro-interacciones sutiles (una palomita al completar un capítulo, una barra de progreso) que dan sensación de logro sin saturar.

### Recomendación final
Definir un archivo único de tokens de diseño (colores, tipografía, espaciado, radios, sombras, duración de transiciones) antes de escribir el primer componente visual, y auditar cada nuevo componente contra los tres principios (¿es claro? ¿respeta el contenido? ¿usa la jerarquía visual en vez de decoración?) antes de aprobarlo.

---

## 8. Mobile first y diseño accesible al pulgar

### Qué
Diseñar primero para pantallas de 360-430px de ancho, con **navegación inferior fija** para las acciones principales, y con todos los controles de uso frecuente ubicados en el tercio inferior de la pantalla (la llamada "zona verde" de alcance del pulgar), reservando la parte superior solo para contenido de lectura y título de contexto.

### Por qué
La evidencia de investigación en ergonomía móvil (trabajo de referencia de Steven Hoober y estudios posteriores) muestra que la mayoría de usuarios sostiene y opera el teléfono con una sola mano, y que el pulgar alcanza con comodidad el área centro-inferior de la pantalla, mientras que las esquinas superiores exigen cambiar el agarre o usar la otra mano. Dado que el público de FormsBiblicos incluye explícitamente a personas mayores y usuarios con poca destreza tecnológica, minimizar la necesidad de reajustar el agarre no es un capricho estético: es un requisito de accesibilidad práctica.

### Aplicación concreta a FormsBiblicos
- **Barra de navegación inferior fija** con 3-5 accesos máximo (Leer, Progreso, Exámenes, Perfil), replicando un patrón ya familiar para cualquier usuario de apps populares (principio de familiaridad: la gente no tiene que aprender un patrón nuevo).
- El botón de acción principal de cada pantalla (`Continuar`, `Responder`, `Marcar como leído`) siempre se ancla en la parte inferior de la pantalla, nunca arriba.
- Los elementos destructivos o poco frecuentes (cerrar sesión, eliminar cuenta, configuración avanzada) se colocan deliberadamente en zonas de alcance más difícil, como salvaguarda contra toques accidentales.
- El texto bíblico ocupa la franja central de la pantalla con un ancho de línea limitado (45-75 caracteres) para favorecer la lectura, siguiendo convenciones tipográficas clásicas de legibilidad, no solo de diseño de apps.

### Tamaño de elementos táctiles
Todo elemento interactivo (botón, casilla de examen, ítem de menú) debe tener un área táctil mínima de 44×44 píxeles CSS, con separación mínima de 8px entre elementos adyacentes. Este valor —el mismo que recomiendan tanto Apple como el nivel más exigente (AAA) de las pautas de accesibilidad web— se adopta como estándar único del proyecto en lugar del mínimo legal más bajo, precisamente por el público mayor y con poca destreza tecnológica al que se dirige la plataforma (ver capítulo 9 para el detalle normativo).

### Ventajas
- Reduce errores de toque y frustración, que son la primera causa de abandono en apps usadas por personas mayores.
- Mejora medible en tiempo de sesión y tasa de retorno cuando la navegación se ubica en la parte inferior, según la evidencia consultada sobre patrones de UX móvil.
- Compatible de forma natural con el estilo "grandes tarjetas, mucho aire" pedido para el diseño visual.

### Inconvenientes
- Una barra inferior fija reduce ligeramente el espacio vertical disponible para contenido; se compensa ocultándola suavemente durante la lectura activa a pantalla completa.
- Diseñar exclusivamente para agarre con una mano puede penalizar levemente a usuarios zurdos si no se es cuidadoso; se recomienda centrar los elementos más importantes en el eje horizontal (alcanzables por cualquier mano) y reservar los extremos para acciones secundarias.

### Recomendación final
Fijar la navegación inferior como parte "no negociable" del sistema de diseño, con un tamaño mínimo de toque de 44×44px en toda la plataforma (superando el mínimo normativo de 24×24px), y probar cada nueva pantalla sosteniendo mentalmente (o físicamente) el teléfono con una sola mano antes de darla por terminada.

---

## 9. Accesibilidad (WCAG 2.2)

### Qué
Cumplir, como mínimo, el **nivel AA** de las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.2, con varios criterios llevados voluntariamente al nivel AAA por la naturaleza del público objetivo (personas mayores, posible baja visión, poca destreza motriz).

### Criterios concretos a implementar

**Tamaño de objetivo táctil**: WCAG 2.2 introduce el criterio 2.5.8 (nivel AA), que exige un mínimo de 24×24 píxeles CSS para cualquier elemento interactivo, o bien 24px de separación respecto a elementos vecinos si el propio elemento es más pequeño. El criterio 2.5.5 (nivel AAA, opcional) eleva ese mínimo a 44×44 píxeles. Como se explicó en el capítulo anterior, FormsBiblicos adopta 44×44px como estándar de toda la plataforma, no solo como excepción puntual.

**Contraste de color**: texto normal con una relación de contraste mínima de 4.5:1 frente al fondo, y 3:1 para texto grande; se recomienda verificar cada combinación de color del sistema de diseño con una herramienta de contraste antes de aprobarla, y no depender solo de "verlo bien" a simple vista.

**Modo de alto contraste y modo de letra grande**: dado que los tokens de diseño viven en variables CSS centralizadas (capítulo 6), implementar estos modos consiste en cargar un segundo conjunto de valores de esas mismas variables (por ejemplo, `--color-texto` más oscuro, `--tamano-fuente-base` incrementado), activable desde un interruptor accesible en el perfil del usuario y persistido en su preferencia de cuenta.

**Navegación por teclado**: todo elemento interactivo debe ser alcanzable con la tecla Tab en un orden lógico, y debe mostrar un estado de foco visible (nunca `outline: none` sin un reemplazo visual equivalente). Esto beneficia tanto a usuarios de teclado como a quienes usan conmutadores de accesibilidad.

**Lectores de pantalla**: uso correcto de HTML semántico (`<nav>`, `<main>`, `<button>` en vez de `<div onclick>`, encabezados en orden jerárquico real `h1 > h2 > h3`), atributos `aria-label` en botones que solo tienen ícono, y regiones `aria-live` para anunciar resultados de examen o confirmaciones sin necesidad de que el usuario mueva el foco.

**Mensajes de error comprensibles**: cualquier error de formulario debe describir en lenguaje simple qué pasó y cómo corregirlo ("La contraseña debe tener al menos 8 caracteres", no "Error de validación 422"), asociado mediante `aria-describedby` al campo correspondiente.

### Por qué
Más allá de ser una buena práctica genérica, la accesibilidad es, en este proyecto concreto, un requisito funcional explícito del público objetivo: niños, adultos mayores y personas con poca familiaridad tecnológica se benefician exactamente de las mismas medidas que WCAG exige para personas con discapacidad (contraste alto, objetivos táctiles grandes, mensajes claros, navegación predecible). Diseñar accesible aquí no es una capa añadida al final: es, literalmente, diseñar para el usuario real del producto.

### Ventajas
- Cumplimiento accesible reduce el soporte técnico a largo plazo (menos usuarios "perdidos" en la interfaz).
- Mejora el SEO y la compatibilidad con tecnología asistiva sin coste adicional relevante si se aplica desde el diseño, en lugar de parchearlo después.
- Da cobertura legal razonable frente a normativas de accesibilidad digital cada vez más extendidas internacionalmente.

### Inconvenientes
- Requiere pruebas manuales periódicas (navegación solo con teclado, solo con lector de pantalla) que no se detectan con herramientas automáticas al 100%; hay que presupuestar ese tiempo de QA.
- Los modos de alto contraste y letra grande duplican, en cierta medida, el trabajo de diseño visual de cada pantalla nueva; se mitiga si estos modos se resuelven solo cambiando variables CSS, nunca reescribiendo el marcado.

### Recomendación final
Tratar la accesibilidad como un criterio de aceptación más de cada tarjeta de trabajo (historia de usuario), al mismo nivel que "funciona" o "se ve bien", y no como una fase de auditoría posterior al final del proyecto.

---

## 10. Rendimiento y optimización

### Qué
Un conjunto de prácticas de carga diferida, división manual de código, minimización de peticiones a Supabase y optimización para redes y dispositivos lentos, dado que el público objetivo incluye explícitamente móviles antiguos y, previsiblemente, conexiones de datos limitadas en varias regiones.

### Carga diferida (Lazy Loading) y división de código manual
Sin un bundler que divida el código automáticamente por rutas (como haría Webpack/Vite en un proyecto con framework), la división se hace manualmente mediante **import dinámico de ES Modules** (`import('./vistas/vista-examen.js')`), cargado únicamamente cuando el router activa esa vista. Esto evita que un usuario que solo quiere leer el capítulo de hoy descargue también todo el código del panel de administración, del editor de exámenes o de las estadísticas del Owner — código que, para el 95% de los usuarios (rol "Usuario"), nunca se ejecutará.

Las imágenes (iconografía compleja, ilustraciones del mapa bíblico) se cargan con el atributo nativo `loading="lazy"` y, cuando sea posible, se prefieren SVG en línea sobre imágenes rasterizadas, por su peso mínimo y su nitidez en cualquier densidad de pantalla.

### Minimizar consultas a Supabase
- Solicitar solo las columnas necesarias en cada consulta (`select('id, titulo, completado')` en lugar de `select('*')`), lo que reduce el tamaño de la respuesta y el trabajo de deserialización en el cliente.
- Agrupar operaciones relacionadas en una sola función *RPC* de Postgres cuando una pantalla necesita varios datos relacionados (por ejemplo, "progreso del capítulo actual" en una sola llamada en lugar de tres consultas separadas), reduciendo la latencia total percibida, especialmente relevante en redes móviles con alta latencia de ida y vuelta.
- Usar las suscripciones en tiempo real de Supabase con moderación y siempre filtradas (nunca una suscripción sin filtro a una tabla completa), tanto por rendimiento como por seguridad.

### Caché
- Caché en memoria (dentro del store) para datos que no cambian en la sesión activa (texto bíblico del capítulo actual, catálogo de libros).
- Caché persistente ligera con IndexedDB para el texto bíblico ya leído, de forma que capítulos visitados recientemente carguen instantáneamente incluso con conexión inestable, y para permitir lectura básica en modo sin conexión.
- Cabeceras de caché HTTP adecuadas en los activos estáticos (CSS, JS, iconos) mediante *cache busting* por nombre de archivo con hash, para poder cachear agresivamente sin miedo a servir versiones desactualizadas tras un despliegue.

### Renderizado eficiente del DOM
- Delegación de eventos (capítulo 4) en lugar de listeners individuales.
- Actualizaciones "quirúrgicas": cuando cambia el estado de un solo capítulo dentro de una lista larga, se actualiza solo el nodo correspondiente, no se vuelve a renderizar la lista completa.
- Uso de `DocumentFragment` al construir listas para insertar todos los nodos en una sola operación de reflujo, en lugar de uno a uno.

### Ventajas
- Tiempos de carga inicial notablemente menores frente a una SPA basada en framework, al no existir el peso del runtime del framework.
- El público objetivo (móviles antiguos, redes lentas) es precisamente el que más se beneficia de estas decisiones.
- Menor consumo de datos móviles, relevante en contextos de conectividad limitada o de pago por consumo.

### Inconvenientes
- Toda esta optimización es responsabilidad manual del equipo; un framework la habría automatizado parcialmente. Requiere revisión periódica de rendimiento (por ejemplo, con Lighthouse) para no ir perdiendo disciplina con el tiempo.
- El uso de IndexedDB para caché offline añade complejidad de sincronización (qué pasa si el texto cacheado queda desactualizado); se recomienda versionar el contenido bíblico cacheado con un número de versión simple.

### Recomendación final
Establecer un presupuesto de rendimiento explícito desde el inicio (por ejemplo: "la vista de lectura debe ser interactiva en menos de 2 segundos en una conexión 3G simulada y en un dispositivo de gama baja simulado"), y medirlo en cada entrega relevante, no solo al final del proyecto.

---

## 11. Seguridad de la aplicación

### Qué
Una estrategia de seguridad en profundidad ("defensa en capas"), donde **ninguna capa confía ciegamente en la anterior**: ni el cliente confía en que el usuario "hará lo correcto", ni el servidor de aplicación confía en el cliente, ni la aplicación confía en que sus propias consultas nunca tendrán errores — de ahí la importancia de Row Level Security como último y más fiable muro de contención, tratado en detalle en el capítulo 12.

### Autenticación (Supabase Auth) y JWT
Supabase Auth emite un *JSON Web Token* tras el inicio de sesión, que el cliente adjunta automáticamente en cada petición mediante la librería oficial. Puntos clave:
- Usar siempre la **clave anónima (`anon key`)** en el navegador; la **clave de servicio (`service_role key`)**, que ignora por completo todas las políticas de seguridad de filas, jamás debe aparecer en código que se ejecute en el cliente ni en el repositorio público del frontend.
- No confiar en datos de metadatos del usuario que el propio usuario puede modificar (`raw_user_meta_data`) para decisiones de autorización (por ejemplo, el rol de un usuario); estos valores deben vivir en una tabla de base de datos protegida por sus propias políticas, nunca en el JWT editable por el cliente.
- Proteger rutas del lado del cliente (ocultar el enlace al panel de administración si el usuario no es admin) es una mejora de experiencia, **no una medida de seguridad real**: la seguridad real siempre vive en las políticas de la base de datos.

### Protección de páginas y rutas
El router debe comprobar, antes de montar una vista protegida, si existe una sesión activa válida (consultando el estado de autenticación de Supabase), y redirigir a login si no la hay. Aun así, esta comprobación es solo una capa de conveniencia de UI: la protección definitiva de los datos ocurre en RLS.

### Validación y sanitización de datos
- **Toda** entrada de usuario (nombre, notas personales, respuestas de texto libre si las hubiera) se valida en el cliente por experiencia de usuario, y se vuelve a validar de forma independiente en el servidor (mediante restricciones de columna, funciones de validación en Postgres o Edge Functions), porque la validación de cliente siempre puede ser evitada por quien manipule las peticiones directamente.
- **Prevención de XSS (Cross-Site Scripting)**: nunca insertar contenido proveniente de la base de datos o de un usuario directamente con `innerHTML` sin escapar. Preferir `textContent` para texto plano, y si es imprescindible insertar HTML controlado (por ejemplo, texto bíblico con formato de versículo), hacerlo a través de una función de sanitización propia y muy restringida (lista blanca de etiquetas permitidas), nunca insertando HTML arbitrario proveniente de un campo editable por usuarios de rol Editor/Admin sin pasar por esa sanitización.
- **Prevención de CSRF (Cross-Site Request Forgery)**: al usar tokens JWT en cabeceras (no cookies de sesión clásicas) para autenticar las peticiones a Supabase, la superficie de riesgo de CSRF clásico se reduce drásticamente, ya que un sitio malicioso de terceros no puede adjuntar automáticamente el token JWT del usuario a sus propias peticiones. Aun así, se recomienda configurar correctamente las políticas de CORS del proyecto Supabase para restringir los dominios autorizados a hacer peticiones.

### Permisos y superficie de exposición
- Nunca exponer identificadores internos innecesarios en la URL cuando un identificador aleatorio (UUID) puede cumplir la misma función sin filtrar información secuencial (por ejemplo, evitar `/examen/145` que revela cuántos exámenes existen en total; usar UUID).
- Auditar periódicamente qué tablas están expuestas a través de la API automática de Supabase y confirmar que **todas**, sin excepción, tienen RLS activado, incluso las que hoy parecen "de solo lectura pública", porque una tabla sin RLS es accesible en su totalidad por cualquiera que tenga la clave anónima del proyecto — que es pública por diseño, al estar embebida en el propio frontend.

### Ventajas
- El modelo de seguridad en capas asegura que un fallo en una sola capa (por ejemplo, un `if` de UI mal escrito) no compromete los datos, porque la base de datos sigue aplicando sus propias reglas.
- Minimiza la superficie de ataque al no necesitar un servidor de aplicación propio que mantener y parchear: Supabase gestiona la infraestructura, el equipo se responsabiliza del diseño de políticas.

### Inconvenientes
- Exige disciplina constante: es fácil, bajo presión de plazos, tentarse a usar la clave de servicio "solo por ahora" en el cliente, o a posponer una política de RLS "para después". Este documento recomienda que ninguna tabla nueva se despliegue a producción sin sus políticas de RLS ya escritas y probadas.
- La validación duplicada (cliente y servidor) implica mantener las mismas reglas en dos lugares; se recomienda mantener las reglas de validación de negocio en un único módulo de dominio y, cuando sea posible, expresar las restricciones más críticas también como *constraints* de la propia base de datos (por ejemplo, `CHECK` en Postgres), que son la garantía más fuerte de todas.

### Recomendación final
Adoptar como norma de equipo: "ninguna tabla se crea sin su política de RLS en el mismo cambio (commit/PR)", y nunca considerar terminada una funcionalidad hasta haberla probado autenticado como un usuario de cada rol distinto, confirmando explícitamente que cada rol solo ve y modifica lo que le corresponde.

---

## 12. Base de datos: modelo, roles y Row Level Security

### Qué
Un esquema Postgres normalizado (al menos hasta la Tercera Forma Normal en las tablas transaccionales), con **Row Level Security (RLS) activado en el 100% de las tablas** desde el primer momento, e índices en toda columna usada para filtrar en una política de seguridad o en una consulta frecuente.

### Modelo de datos: entidades principales (nivel conceptual, sin código)

- **usuarios** (extiende `auth.users` de Supabase mediante una tabla `perfiles` 1:1, con `id` igual al `auth.users.id`): guarda rol, grupo al que pertenece, nombre visible, preferencias de accesibilidad.
- **grupos** (o "clases"): cada grupo pertenece a un administrador (`admin_id`); todos los usuarios y editores de ese grupo quedan asociados a él mediante una columna `grupo_id`.
- **libros_biblicos** y **capitulos**: catálogo de referencia (66 libros, con sus capítulos), datos que rara vez cambian y que pueden servirse incluso como datos casi estáticos.
- **versiculos**: contenido del texto bíblico (Reina Valera 1960), como catálogo de solo lectura para todos los usuarios autenticados.
- **progreso_lectura**: registro por usuario y capítulo de cuándo se leyó, cuánto tiempo, si se completó — la tabla que sostiene todo el flujo pedagógico.
- **preguntas** y **opciones_pregunta**: banco de preguntas, creadas por Editores/Admins, asociadas a un capítulo o a un tema.
- **examenes** y **intentos_examen**: la definición de un examen (por capítulo, libro, tema o general) y cada intento realizado por un usuario, con su calificación y su relación obligatoria con una `progreso_lectura` previa (para garantizar la regla de negocio del capítulo 1).
- **tarjetas_memorizacion** y **repasos_memorizacion**: versículos marcados para memorizar y el historial de repasos con los parámetros del algoritmo de repetición espaciada (ver capítulo 14).
- **logros** y **logros_usuario**: catálogo de logros y su desbloqueo por usuario.
- **auditoria**: registro de acciones administrativas sensibles (cambios de rol, eliminaciones), visible solo para el Owner.

### Row Level Security: patrón general recomendado

Para cada tabla con datos de usuario, se recomienda el patrón de "función auxiliar reutilizable" en lugar de repetir subconsultas complejas en cada política: crear funciones de Postgres como `es_admin_del_grupo(grupo_id)`, `es_propio_usuario(usuario_id)`, `rol_actual()`, que encapsulan la lógica de una sola vez y se reutilizan en todas las políticas. Esto evita el problema, señalado en la documentación de Supabase, de que políticas con subconsultas y *joins* repetidos en múltiples tablas se vuelven difíciles de mantener y de auditar, y que un cambio en la regla de negocio obligue a tocar decenas de políticas en lugar de una sola función.

Reglas de aislamiento por rol:
- **Usuario**: solo puede leer y escribir sus propias filas de progreso, intentos de examen y tarjetas de memorización (`usuario_id = auth.uid()`), y solo puede leer preguntas/exámenes publicados de su propio grupo.
- **Editor**: puede crear/editar preguntas y exámenes de su grupo, pero las políticas de `SELECT`/`UPDATE` sobre tablas de usuarios y estadísticas privadas se lo impiden explícitamente.
- **Admin**: puede leer y gestionar todas las filas cuyo `grupo_id` coincide con el grupo que administra, nunca las de otros grupos — verificado siempre contra una tabla de perfiles, nunca contra un dato del JWT que el usuario podría alterar.
- **Owner**: política adicional que permite acceso de lectura (y en configuraciones globales, de escritura) sin restricción de `grupo_id`, implementada como una condición explícita `OR es_owner()` añadida a las políticas existentes, en lugar de una tabla o ruta de acceso completamente paralela — esto mantiene una única fuente de verdad de las reglas de acceso.

### Rendimiento de RLS
Las políticas de RLS añaden, en la práctica, una cláusula `WHERE` implícita a cada consulta; su coste es mínimo cuando comparan una columna indexada contra un valor simple (`usuario_id = auth.uid()`), pero puede ser notable cuando incluyen subconsultas o *joins* no indexados. Por eso, toda columna referenciada en una política (`usuario_id`, `grupo_id`, `rol`) debe tener su propio índice, y conviene medir con `EXPLAIN ANALYZE` el coste real de las políticas más consultadas (progreso de lectura, intentos de examen) antes de dar por cerrado el esquema.

### Escalabilidad para miles de usuarios
- Índices compuestos en las combinaciones de columnas más consultadas (`(usuario_id, capitulo_id)` en `progreso_lectura`, `(grupo_id, creado_en)` en `examenes`).
- Particionamithis o archivado histórico de tablas de eventos de alto volumen (por ejemplo, `repasos_memorizacion`, que crece con cada repetición espaciada de cada usuario) puede diferirse hasta que el volumen lo justifique, pero conviene diseñar la tabla desde el inicio con una columna de fecha que permita particionar por rango en el futuro sin rediseñar el esquema.
- Evitar guardar datos derivados/calculados de forma permanente cuando se puedan calcular al vuelo con una consulta indexada (por ejemplo, el porcentaje de la Biblia leída), salvo que el cálculo se vuelva costoso a gran escala, en cuyo caso se recomienda una tabla de resumen actualizada por una función *trigger*, no recalculada en cada carga de pantalla.

### Ventajas
- Con RLS activo en todas las tablas desde el día uno, un error de programación en el frontend no puede filtrar datos de otro grupo o usuario: la base de datos rechaza la consulta aunque el código de la aplicación esté mal escrito.
- Un esquema normalizado con índices adecuados desde el diseño evita reescrituras dolorosas de migración cuando la base de usuarios crece de decenas a miles.

### Inconvenientes
- RLS con políticas mal indexadas puede introducir una degradación de rendimiento notable (la documentación consultada reporta ralentizaciones de hasta un orden de magnitud en consultas con políticas complejas mal optimizadas); de ahí la insistencia en indexar toda columna usada en una política.
- Diseñar bien las funciones auxiliares de autorización exige una fase de diseño explícita antes de escribir la primera tabla; apresurarse a crear tablas sin este diseño previo suele derivar en políticas ad-hoc inconsistentes entre sí.

### Recomendación final
Diseñar primero el "mapa de permisos" completo (qué rol puede hacer qué operación sobre qué tabla) en un documento o tabla de referencia, antes de escribir una sola política SQL; después implementar las funciones auxiliares de autorización; y solo entonces escribir las políticas de cada tabla, probándolas siempre autenticado como cada uno de los cuatro roles.

---

## 13. Roles y aislamiento de datos por grupo

### Qué
Cuatro roles jerárquicos —**Owner, Admin, Editor, Usuario**— implementados como una columna `rol` en la tabla `perfiles` (no en el JWT), combinados con un modelo de **grupos/clases** donde cada Admin gestiona un grupo propio y sus datos nunca se mezclan con los de otro Admin, salvo para el Owner, que ve la plataforma completa.

### Por qué esta jerarquía y no una jerarquía plana de permisos
Un modelo de cuatro niveles con alcance decreciente de gestión (Owner > Admin > Editor > Usuario) refleja fielmente organizaciones reales de estudio bíblico (una iglesia o red de iglesias con un responsable general, líderes de grupo, colaboradores que preparan material, y estudiantes), y es el mismo patrón, documentado como práctica establecida, de "cuentas de equipo con roles" que usan la mayoría de aplicaciones SaaS B2B con múltiples organizaciones (multi-tenant), donde cada tabla de datos de negocio incluye una columna de "inquilino" (aquí, `grupo_id`) que las políticas de RLS usan para filtrar automáticamente.

### Matriz de permisos (resumen)

| Acción | Usuario | Editor | Admin | Owner |
|---|---|---|---|---|
| Leer la Biblia y estudiar | ✅ (su progreso) | ✅ | ✅ | ✅ |
| Ver su propio progreso | ✅ | ✅ | ✅ | ✅ |
| Crear/editar preguntas y exámenes | ❌ | ✅ (su grupo) | ✅ (su grupo) | ✅ (todos) |
| Gestionar alumnos de su grupo | ❌ | ❌ | ✅ | ✅ |
| Ver estadísticas de su grupo | ❌ | ❌ | ✅ | ✅ |
| Crear Editores | ❌ | ❌ | ✅ | ✅ |
| Crear/gestionar Administradores | ❌ | ❌ | ❌ | ✅ |
| Ver estadísticas globales y auditoría | ❌ | ❌ | ❌ | ✅ |
| Cambiar configuración global de la plataforma | ❌ | ❌ | ❌ | ✅ |

### Ventajas de este modelo
- Cada Admin puede operar su grupo con total autonomía sin necesidad de intervención del Owner en el día a día.
- El aislamiento por `grupo_id` a nivel de RLS (no solo a nivel de interfaz) garantiza que ni siquiera un Admin malintencionado o un error de código pueda filtrar datos de otro grupo.
- Es un modelo que escala de forma natural: añadir un nuevo grupo (una nueva congregación, por ejemplo) no requiere cambios de esquema, solo una nueva fila en `grupos` y usuarios asociados a ella.

### Inconvenientes
- Un usuario que necesite pertenecer a más de un grupo (por ejemplo, un Editor que colabora con dos congregaciones) no encaja de forma directa en un modelo de "un usuario, un grupo"; si se prevé este caso, conviene modelar la relación usuario-grupo como una tabla intermedia de muchos a muchos desde el inicio, aunque en la primera versión se use como si fuera de uno a uno, para no tener que migrar el esquema más adelante.
- La existencia del rol Owner con capacidad de ver todo exige políticas de auditoría más estrictas (capítulo 11) para que ese poder no se use sin dejar rastro.

### Recomendación final
Modelar la relación usuario-grupo mediante una tabla `miembros_grupo` (usuario_id, grupo_id, rol_en_grupo) en lugar de una columna única `grupo_id` en `perfiles`, incluso si en la fase inicial cada usuario solo pertenece a un grupo. Este pequeño coste de diseño adicional evita una migración de esquema dolorosa el día que la plataforma necesite soportar pertenencia múltiple.

---

## 14. El motor pedagógico: lectura, recuerdo activo y repetición espaciada

### Qué
Un subsistema de dominio (sin dependencias de UI ni de Supabase, ver capítulo 3) que implementa: (a) el registro de sesiones de lectura, (b) la generación y calificación de preguntas de recuerdo activo inmediatamente después de leer, y (c) un algoritmo de repetición espaciada para la memorización de versículos, basado en el algoritmo **SM-2**, ampliamente documentado y probado durante más de tres décadas.

### Por qué recuerdo activo y no solo relectura
La investigación en ciencia cognitiva del aprendizaje —incluyendo metaanálisis con cientos de estudios— muestra de forma consistente que la práctica de recuperación activa (intentar recordar y responder, en vez de releer pasivamente) y la práctica espaciada en el tiempo están entre las técnicas de estudio más efectivas conocidas, muy por encima de subrayar o releer. Esto justifica, con evidencia y no solo con intuición pedagógica, la estructura completa del flujo pedagógico pedido para el proyecto: leer, luego preguntar (recuerdo activo), luego repasar lo fallado, luego programar la memorización con espaciamiento creciente.

### Por qué SM-2 y no un algoritmo más moderno como FSRS
SM-2, publicado por Piotr Woźniak en 1987 como base del sistema SuperMemo, calcula el próximo intervalo de repaso de un ítem a partir de tres valores por ítem: número de repeticiones consecutivas correctas, un "factor de facilidad" (que sube o baja según la calidad de cada respuesta) y el intervalo anterior en días. Es determinista, fácil de auditar, no requiere grandes volúmenes de datos históricos para funcionar razonablemente bien desde el primer repaso, y es el algoritmo con más documentación pública e implementaciones de referencia disponibles. Alternativas más recientes como FSRS (Free Spaced Repetition Scheduler) ajustan un modelo estadístico a partir del historial de miles de repasos por usuario y logran, según benchmarks recientes con grandes volúmenes de datos de Anki, reducir entre un 20% y un 30% el número de repasos necesarios para el mismo nivel de retención — pero exigen mucho más historial e infraestructura de cálculo para calibrarse bien.

### Recomendación final sobre el algoritmo
Implementar **SM-2** en la primera versión del producto, en un módulo de dominio puro (`repeticionEspaciada.js`) con una función central del tipo `calcularProximoRepaso(tarjeta, calidadRespuesta)` que reciba el estado actual de la tarjeta (repeticiones, factor de facilidad, intervalo) y una puntuación de 0 a 5 sobre qué tan bien se recordó el versículo, y devuelva el nuevo estado y la fecha del próximo repaso. Diseñar esta función de forma aislada (sin acceso directo a la base de datos) permite, si en el futuro se decide migrar a FSRS con más historial acumulado, sustituir únicamente ese módulo sin tocar el resto del sistema.

### Flujo de datos del ciclo completo
1. El usuario abre un capítulo → se crea/actualiza una fila en `progreso_lectura` con marca de inicio.
2. Al terminar de leer (o alcanzar el final de scroll, o pulsar "Ya leí este capítulo"), se marca `completado = true` y se genera el conjunto de preguntas asociado a ese capítulo.
3. El usuario responde; cada respuesta se califica y se guarda un `intento_examen`, ligado obligatoriamente al `progreso_lectura` de ese capítulo (regla de negocio del capítulo 1).
4. Las preguntas falladas generan automáticamente una pantalla de "repaso" antes de continuar.
5. Los versículos clave del capítulo (marcados por el Editor/Admin, o elegidos por el propio usuario) se ofrecen para "añadir a memorización"; al aceptarlos se crea una `tarjeta_memorizacion` con su primer intervalo.
6. El sistema notifica (dentro de la app, sin necesidad de notificaciones push complejas en la primera versión) cuándo toca repasar cada tarjeta, según el cálculo de SM-2.
7. El progreso agregado (capítulos leídos, porcentaje del libro, racha de días) se deriva siempre de estos datos base, nunca se almacena como una verdad paralela que pueda desincronizarse.

### Ventajas
- Basar el diseño en evidencia de ciencia del aprendizaje, no solo en intuición de producto, da al proyecto un argumento sólido y defendible ante quien pregunte "por qué funciona así".
- SM-2 es simple de implementar, de depurar y de explicar a un desarrollador nuevo dentro de un día de trabajo.

### Inconvenientes
- SM-2 usa el mismo modelo de progresión para todos los usuarios; no se adapta de forma fina a la velocidad de olvido individual como sí lo hace FSRS. Para una primera versión, esto es una simplificación aceptable.
- Requiere una interfaz de calificación honesta por parte del usuario (qué tan bien recordó el versículo); con público infantil o de baja alfabetización digital, esta calificación debe simplificarse a 2-3 opciones claras ("No lo recordé", "Con esfuerzo", "Fácil") en lugar de la escala completa de 0 a 5 del SM-2 original, traduciendo internamente esas opciones a los valores numéricos que el algoritmo necesita.

---

## 15. Funcionalidades principales, módulo a módulo

Para cada funcionalidad se resume el enfoque recomendado; el detalle de datos ya se cubrió en los capítulos 12-14.

### Sistema de estudio capítulo por capítulo
Vista de lectura a pantalla completa, con navegación "capítulo anterior / siguiente" siempre visible pero discreta, tipografía ajustable, y un progreso visual (barra o punto) que indica cuánto queda del capítulo actual, no solo del libro completo.

### Mapa visual de toda la Biblia
Una vista tipo cuadrícula (Antiguo y Nuevo Testamento, cada libro como una tarjeta) con estados visuales claros (no iniciado, en progreso, completado), pensada como pantalla de "vista general" y motivación, no como el punto de entrada principal (que debe seguir siendo "continuar donde lo dejaste").

### Exámenes (por capítulo, libro, tema, generales)
Un único modelo de datos de examen con un campo de "alcance" (`capitulo`, `libro`, `tema`, `general`) y una consulta que arma el conjunto de preguntas según ese alcance, en lugar de cuatro sistemas distintos — esto reduce enormemente la superficie de mantenimiento futuro.

### Historial, logros y estadísticas
El historial es, en esencia, una vista de solo lectura sobre `intentos_examen` y `progreso_lectura`; los logros se definen como reglas declarativas simples (por ejemplo, "10 capítulos completados", "7 días seguidos") evaluadas por una función que se ejecuta tras cada evento relevante, evitando lógica de logros dispersa por toda la aplicación.

### Panel administrativo, editor de exámenes, libro de calificaciones, gestión de grupos, observaciones
Estas vistas comparten un mismo patrón de "tabla filtrable por grupo" (siempre acotada por RLS al grupo del Admin/Editor autenticado) y se construyen como vistas separadas dentro de `/paginas/admin/`, cargadas solo para quienes tienen ese rol (ver carga diferida, capítulo 10), de forma que un Usuario normal jamás descargue ese código.

### Panel del Owner
Una vista adicional con alcance global (sin filtro de grupo), que incluye el registro de auditoría (capítulo 11) y la gestión de Administradores; se recomienda tratarla como el módulo más sensible de todo el proyecto y aplicarle revisión de seguridad extra en cada cambio.

---

## 16. Panel administrativo y panel del Owner

### Qué
Interfaces separadas físicamente (rutas y archivos distintos) del resto de la aplicación, cargadas solo bajo demanda para los roles correspondientes, con un diseño visual que mantiene los mismos tokens y principios del capítulo 7, pero con una densidad de información algo mayor (estas pantallas las usan Admins/Editores/Owner, no el público general de niños o ancianos, por lo que pueden permitirse tablas más densas sin violar la filosofía de simplicidad del resto de la app).

### Por qué separarlos físicamente del resto del código
Además del beneficio de rendimiento (capítulo 10), esta separación reduce drásticamente la superficie de un posible error de seguridad: si el código del panel de Owner nunca llega al navegador de un Usuario normal, un fallo de configuración de UI no puede, por sí solo, exponer accidentalmente ese panel; seguirá dependiendo, en último término, de RLS, pero añade una capa extra de seguridad por reducción de superficie.

### Recomendación final
Mantener el panel administrativo y el panel del Owner en módulos independientes que se cargan de forma perezosa (import dinámico) solo tras confirmar, contra Supabase, que el usuario autenticado tiene el rol correspondiente — nunca basado en una variable local que se pudiera manipular en el navegador.

---

## 17. Orden recomendado de desarrollo (roadmap)

### Qué
Un orden de construcción en fases, diseñado para no tener que rehacer trabajo y para que cada fase sea, por sí sola, algo demostrable y valioso.

**Fase 0 — Cimientos (antes de escribir una sola pantalla)**
Definir tokens de diseño (capítulo 7), estructura de carpetas (capítulo 3), esquema inicial de base de datos y su mapa de permisos (capítulos 12-13), y las convenciones del proyecto documentadas en `CONVENCIONES.md`.

**Fase 1 — Autenticación y esqueleto de la aplicación**
Registro/login con Supabase Auth, tabla `perfiles` con rol por defecto "Usuario", router mínimo, layout general con navegación inferior, modo alto contraste y letra grande ya disponibles desde el principio (es mucho más barato incluirlos ahora que añadirlos después sobre docenas de pantallas ya construidas).

**Fase 2 — El núcleo pedagógico: leer, preguntar, repasar**
La vista de lectura, el banco mínimo de preguntas (aunque sea cargado manualmente al inicio), la calificación de exámenes por capítulo, y el registro de `progreso_lectura`. Esta fase, por sí sola, ya cumple la promesa central del producto y puede probarse con usuarios reales.

**Fase 3 — Memorización y repetición espaciada**
El módulo SM-2 (capítulo 14), la interfaz de "tarjetas para memorizar" y las notificaciones internas de repaso pendiente.

**Fase 4 — Progreso, logros y mapa bíblico**
Estadísticas personales, logros, y la vista de mapa visual de la Biblia — funcionalidades de motivación que se apoyan en datos ya generados por las fases 2 y 3.

**Fase 5 — Roles de gestión: Editor y Admin**
Editor de exámenes, gestión de grupos y alumnos, estadísticas de grupo — siempre con sus políticas de RLS escritas y probadas en el mismo ciclo de desarrollo, nunca después.

**Fase 6 — Panel del Owner y auditoría**
Gestión de administradores, estadísticas globales, panel de auditoría — deliberadamente al final, porque depende de que ya existan varios grupos y administradores reales sobre los que reportar.

**Fase 7 — Pulido de rendimiento, accesibilidad y modo offline**
Auditoría completa de accesibilidad con pruebas reales de teclado y lector de pantalla, medición de rendimiento en dispositivos de gama baja, cola de sincronización offline (capítulo 5), y revisión de seguridad integral (repetir el ejercicio de "probar cada funcionalidad autenticado como cada rol").

### Por qué este orden y no otro
Se prioriza deliberadamente el ciclo pedagógico completo (fases 1-3) antes que las herramientas de gestión (fases 5-6), porque un producto de estudio bíblico que aún no tiene panel de administración sigue siendo útil y demostrable a usuarios reales; en cambio, un panel de administración impecable sin el núcleo de lectura y preguntas funcionando no sirve para nada al usuario final. Este orden también evita el error común de sobre-invertir en herramientas internas (paneles, editores) antes de validar que el producto principal funciona bien para quien realmente importa: el estudiante de la Biblia.

### Cómo evitar rehacer código en esta secuencia
Cada fase reutiliza, sin modificarla, la infraestructura de la fase anterior (router, store, repositorios, tokens de diseño); ninguna fase introduce un patrón arquitectónico nuevo. Si en la fase 5 hiciera falta "otro tipo" de tabla filtrable o "otro tipo" de formulario, es señal de que el patrón definido en fases anteriores no era suficientemente genérico, y conviene generalizarlo en ese momento en lugar de crear un patrón paralelo.

---

## 18. Riesgos, decisiones abiertas y recomendaciones finales

### Riesgos identificados
- **Disciplina de equipo como única defensa de la arquitectura.** Sin un framework que imponga convenciones, todo depende de que el equipo respete este documento. Se recomienda una revisión de código (aunque sea informal) centrada explícitamente en "¿respeta la capa correspondiente? ¿tiene su política de RLS? ¿cumple el tamaño mínimo de objetivo táctil?" antes de fusionar cualquier cambio.
- **Deriva de alcance ("scope creep") hacia "otra app de trivia".** El criterio del capítulo 1 (¿refuerza el ciclo lectura→pregunta→repaso→memorización→evaluación→continuidad?) debe usarse activamente para filtrar peticiones futuras de funcionalidades.
- **Rendimiento de RLS a medida que crecen las tablas transaccionales** (intentos de examen, repasos de memorización). Mitigado con índices desde el diseño inicial y revisión periódica con `EXPLAIN ANALYZE`.
- **Pertenencia de un usuario a un único grupo** puede quedarse corta si el proyecto crece; se recomienda, como ya se indicó, modelarlo desde el inicio como relación muchos-a-muchos aunque se use inicialmente como uno-a-uno.

### Decisiones abiertas que conviene resolver antes de la Fase 1
- Si el texto completo de la Reina Valera 1960 se sirve como datos estáticos versionados en el propio repositorio del frontend (más simple, más rápido, pero requiere un despliegue nuevo si hubiera que corregir una errata) o como tablas en Supabase (más flexible, permite anotaciones y enlaces cruzados, pero añade una dependencia de red para cada lectura salvo que se cachee agresivamente, ver capítulo 10). Se recomienda la segunda opción combinada con caché local agresiva, por la flexibilidad futura de anotar y relacionar versículos con preguntas y memorización.
- El límite exacto de miembros de un grupo o de grupos por Admin, si se decide imponer alguno por razones de negocio, es una decisión de producto, no de arquitectura, y no condiciona el esquema de datos aquí propuesto.

### Recomendación final de conjunto
Este documento debe tratarse como un artefacto vivo: cada decisión arquitectónica relevante que se tome durante el desarrollo (una nueva convención, una excepción justificada a una regla aquí descrita) debe añadirse como una actualización a este mismo documento, de forma que dentro de varios años un nuevo colaborador pueda entender no solo "cómo" está construido FormsBiblicos, sino "por qué", que es, en último término, lo que permite mantener un proyecto de forma saludable durante años en lugar de solo durante meses.

---

### Fuentes principales consultadas
Documentación oficial de Supabase (Row Level Security, Auth), Human Interface Guidelines de Apple (developer.apple.com/design), Pautas WCAG 2.2 del W3C (criterios 2.5.5 y 2.5.8), investigación de ergonomía móvil sobre alcance del pulgar (trabajo de referencia de Steven Hoober y estudios posteriores), documentación y benchmarks públicos sobre los algoritmos de repetición espaciada SM-2 y FSRS, y artículos técnicos de referencia sobre arquitectura CSS (ITCSS, BEM) y patrones de estado en JavaScript vanilla.

---

## 19. Anexo: estructura de carpetas ampliada

Versión más detallada y actualizada de la estructura de carpetas del capítulo 3, incorporando los módulos de exámenes personalizados, memorización y roles añadidos en capítulos posteriores.

```
Estructura de carpetas:

formsbiblicos/
│
├── index.html                          # Punto de entrada principal
│
├── paginas/                            # HTML de cada vista
│   ├── login.html
│   ├── leer.html
│   ├── examen.html
│   ├── progreso.html
│   ├── mapa-biblico.html
│   ├── memorizacion.html
│   └── admin/
│       ├── panel-admin.html
│       ├── editor-examenes.html
│       ├── libro-calificaciones.html
│       ├── gestion-grupos.html
│       └── panel-owner.html
│
├── css/
│   ├── 00-settings/
│   │   ├── _tokens.css                 # TODOS los tokens de diseño
│   │   ├── _colores.css
│   │   ├── _tipografia.css
│   │   └── _espaciado.css
│   │
│   ├── 01-tools/
│   │   └── _funciones.css              # Funciones CSS custom (ej. fluid type)
│   │
│   ├── 02-generic/
│   │   ├── _reset.css                  # Reset mínimo
│   │   ├── _box-sizing.css
│   │   └── _normalize.css
│   │
│   ├── 03-elements/
│   │   ├── _body.css
│   │   ├── _heading.css
│   │   ├── _paragraph.css
│   │   ├── _button.css
│   │   ├── _input.css
│   │   └── _link.css
│   │
│   ├── 04-objects/
│   │   ├── _contenedor.css             # .o-contenedor
│   │   ├── _pila.css                   # .o-pila (stack vertical)
│   │   ├── _grid.css                   # .o-grid-tarjetas
│   │   └── _flecha.css                 # .o-flecha (layout horizontal)
│   │
│   ├── 05-componentes/
│   │   ├── _tarjeta-capitulo.css
│   │   ├── _tarjeta-libro.css
│   │   ├── _boton-primario.css
│   │   ├── _boton-secundario.css
│   │   ├── _barra-navegacion-inferior.css
│   │   ├── _barra-progreso.css
│   │   ├── _modal.css
│   │   ├── _pregunta-examen.css
│   │   ├── _tarjeta-memorizacion.css
│   │   ├── _selector-version.css
│   │   ├── _selector-letra.css
│   │   ├── _tabla-admin.css
│   │   └── _formulario-editor.css
│   │
│   └── 06-utilidades/
│       ├── _oculto.css                # .u-oculto
│       ├── _solo-lectores.css         # .u-solo-lectores-pantalla
│       ├── _texto-centrado.css
│       ├── _margen.css                # .u-mt-1, .u-mb-2, etc.
│       ├── _alto-contraste.css        # Modo accesibilidad
│       └── _letra-grande.css          # Modo accesibilidad
│
├── js/
│   ├── core/
│   │   ├── index.js                    # Punto de entrada principal
│   │   ├── router.js                   # Sistema de rutas
│   │   ├── store.js                    # Estado central observable
│   │   ├── eventBus.js                 # Pub/sub para comunicación
│   │   └── app-shell.js                # Layout base (nav inferior, etc.)
│   │
│   ├── dominio/                        # Lógica de negocio PURA (sin DOM, sin Supabase)
│   │   ├── progreso-lectura.js         # Calcular % leído, rachas, etc.
│   │   ├── repeticion-espaciada.js     # Algoritmo SM-2
│   │   ├── calificacion-examen.js      # Puntuación, estadísticas
│   │   ├── logros.js                   # Evaluación de logros
│   │   └── roles.js                    # Validaciones de permisos
│   │
│   ├── datos/                          # Repositorios (ÚNICA capa que llama a Supabase)
│   │   ├── supabase-client.js          # Cliente configurado
│   │   ├── auth-repository.js          # Login, registro, logout
│   │   ├── lectura-repository.js       # Progreso_lectura CRUD
│   │   ├── examen-repository.js        # Exámenes, intentos, preguntas
│   │   ├── memorizacion-repository.js  # Tarjetas y repasos
│   │   ├── usuario-repository.js       # Perfiles, preferencias
│   │   ├── grupo-repository.js         # Grupos, membresías
│   │   ├── biblia-repository.js        # Texto bíblico (caché + Supabase)
│   │   └── auditoria-repository.js     # Registro de acciones sensibles
│   │
│   ├── componentes/                    # UI reutilizable (fábricas de nodos)
│   │   ├── tarjeta-capitulo.js
│   │   ├── tarjeta-libro.js
│   │   ├── barra-navegacion-inferior.js
│   │   ├── barra-progreso.js
│   │   ├── modal.js
│   │   ├── boton.js
│   │   ├── pregunta-examen.js
│   │   ├── tarjeta-memorizacion.js
│   │   ├── selector-version-biblica.js
│   │   ├── selector-letra.js
│   │   ├── tabla-admin.js
│   │   └── formulario-editor.js
│   │
│   ├── vistas/                         # Controladores de página
│   │   ├── vista-login.js
│   │   ├── vista-leer.js
│   │   ├── vista-examen.js
│   │   ├── vista-progreso.js
│   │   ├── vista-mapa-biblico.js
│   │   ├── vista-memorizacion.js
│   │   └── admin/
│   │       ├── vista-panel-admin.js
│   │       ├── vista-editor-examenes.js
│   │       ├── vista-libro-calificaciones.js
│   │       ├── vista-gestion-grupos.js
│   │       └── vista-panel-owner.js
│   │
│   └── utilidades/
│       ├── fechas.js                   # Formateo, cálculo de días
│       ├── validacion.js               # Validación de formularios
│       ├── sanitizacion.js             # Escapar HTML, prevenir XSS
│       ├── dom-helpers.js              # querySelector con delegación
│       ├── storage.js                  # IndexedDB para caché
│       └── ids.js                      # Generación de UUIDs
│
├── assets/
│   ├── iconos/
│   │   ├── libro.svg
│   │   ├── ojo.svg
│   │   ├── check.svg
│   │   ├── flecha-izquierda.svg
│   │   ├── flecha-derecha.svg
│   │   ├── casa.svg
│   │   ├── progreso.svg
│   │   ├── examen.svg
│   │   ├── memorizar.svg
│   │   ├── usuario.svg
│   │   ├── ajustes.svg
│   │   └── cerrar-sesion.svg
│   │
│   └── biblia/                         # Opcional: texto estático como respaldo
│       └── rv60.json                   # Texto completo si se sirve estático
│
├── supabase/
│   ├── migraciones/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_progreso_lectura.sql
│   │   ├── 003_examenes.sql
│   │   ├── 004_memorizacion.sql
│   │   ├── 005_logros.sql
│   │   ├── 006_grupos_roles.sql
│   │   └── 007_auditoria.sql
│   │
│   ├── politicas-rls/
│   │   ├── 001_perfiles.sql
│   │   ├── 002_progreso_lectura.sql
│   │   ├── 003_examenes.sql
│   │   ├── 004_memorizacion.sql
│   │   ├── 005_grupos.sql
│   │   └── 006_auditoria.sql
│   │
│   └── funciones/
│       ├── auth_helpers.sql            # es_admin(), es_propio_usuario(), etc.
│       ├── progreso_calculado.sql      # porcentaje_leido(usuario_id)
│       └── sm2_calculo.sql             # proximo_repaso(tarjeta, calidad)
│
├── CONVENCIONES.md                     # Convenciones del proyecto
├── README.md                           # Instrucciones de instalación
└── .env.example                        # Variables de entorno (URL de Supabase, anon key)
```

---

## 20. Módulo de exámenes personalizados y corrección

Este capítulo documenta en detalle el segundo gran módulo funcional de la plataforma: el sistema de exámenes personalizados que el profesor (rol Admin/Editor) crea, asigna, corrige y califica, complementario al ciclo de estudio guiado del capítulo 14.


### Entendiendo tu necesidad

El módulo cubre un sistema donde se puede:

- Crear exámenes estilo Google Forms (preguntas bíblicas).
- Asignar exámenes a los alumnos.
- Corregir las respuestas (de forma automática o manual).
- Poner notas a cada alumno.
- Dejar observaciones personalizadas.
- Llevar un libro de calificaciones por alumno/grupo.


### Flujo Completo del Módulo de Exámenes

```
1. CREAR EXAMEN
   ↓
2. ASIGNAR A GRUPO/ALUMNOS
   ↓
3. ALUMNO RESPONDE (con restricción: debe haber leído)
   ↓
4. CORRECCIÓN (automática o manual por el profesor)
   ↓
5. NOTA + OBSERVACIONES
   ↓
6. ALUMNO VE SU RESULTADO
   ↓
7. PROFESOR VE LIBRO DE CALIFICACIONES
```

### Modelo de Datos para Exámenes

```sql
-- ============================================
-- EXÁMENES Y EVALUACIONES
-- ============================================

-- 1. Definición del examen
CREATE TABLE examenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID NOT NULL REFERENCES grupos(id),
    creado_por UUID NOT NULL REFERENCES perfiles(id),
    
    -- Datos básicos
    titulo TEXT NOT NULL,
    descripcion TEXT,
    
    -- Alcance (qué cubre)
    tipo_alcance TEXT NOT NULL CHECK (tipo_alcance IN ('capitulo', 'libro', 'tema', 'general', 'personalizado')),
    alcance_datos JSONB, -- { libro_id: 1, capitulo_inicio: 3, capitulo_fin: 5 }
    
    -- Configuración
    preguntas_por_examen INTEGER DEFAULT 10,
    tiempo_limite_minutos INTEGER, -- NULL = sin límite
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    intentos_permitidos INTEGER DEFAULT 1,
    
    -- Corrección
    correccion_automatica BOOLEAN DEFAULT TRUE,
    mostrar_resultados BOOLEAN DEFAULT TRUE,
    
    -- Estado
    estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'publicado', 'cerrado', 'archivado')),
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Preguntas del examen
CREATE TABLE preguntas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    examen_id UUID NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
    
    tipo TEXT NOT NULL CHECK (tipo IN ('multiple_opcion', 'verdadero_falso', 'respuesta_corta', 'completar', 'relacionar')),
    texto TEXT NOT NULL,
    
    -- Opciones (para multiple_opcion)
    opciones JSONB, -- [{"texto": "A", "correcta": false}, {"texto": "B", "correcta": true}]
    
    -- Para respuesta corta (palabra clave)
    respuesta_correcta TEXT,
    
    -- Para completar (orden de palabras)
    palabras_orden JSONB,
    
    -- Para relacionar (pares)
    pares JSONB,
    
    -- Metadatos
    referencias_biblicas JSONB, -- [{libro: "Génesis", capitulo: 1, versiculo: 1}]
    puntos INTEGER DEFAULT 1,
    orden INTEGER NOT NULL,
    explicacion TEXT -- Explicación para mostrar al corregir
);

-- 3. Intento de examen (alumno respondiendo)
CREATE TABLE intentos_examen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    examen_id UUID NOT NULL REFERENCES examenes(id),
    usuario_id UUID NOT NULL REFERENCES perfiles(id),
    progreso_lectura_id UUID REFERENCES progreso_lectura(id), -- ¡OBLIGATORIO! (no saltar lectura)
    
    -- Resultados
    respuestas JSONB, -- { pregunta_id: respuesta_elegida }
    puntuacion_obtenida DECIMAL(5,2),
    puntuacion_maxima DECIMAL(5,2),
    porcentaje DECIMAL(5,2),
    
    -- Estado
    estado TEXT DEFAULT 'en_progreso' CHECK (estado IN ('en_progreso', 'completado', 'corregido', 'calificado')),
    tiempo_utilizado INTEGER, -- segundos
    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
    fecha_completado TIMESTAMPTZ,
    fecha_corregido TIMESTAMPTZ,
    
    -- Nota final (lo que ves tú como profesor)
    nota DECIMAL(5,2), -- 0-10 o 0-100 según configuración
    observaciones TEXT,
    corregido_por UUID REFERENCES perfiles(id), -- profesor que corrigió
    
    -- Tracking
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Respuestas detalladas (para análisis)
CREATE TABLE respuestas_detalladas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intento_id UUID NOT NULL REFERENCES intentos_examen(id) ON DELETE CASCADE,
    pregunta_id UUID NOT NULL REFERENCES preguntas(id),
    
    respuesta_usuario TEXT,
    respuesta_correcta TEXT,
    es_correcta BOOLEAN,
    puntos_obtenidos DECIMAL(5,2),
    tiempo_segundos INTEGER,
    
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Comentarios del profesor (por respuesta)
CREATE TABLE comentarios_respuesta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intento_id UUID NOT NULL REFERENCES intentos_examen(id) ON DELETE CASCADE,
    pregunta_id UUID NOT NULL REFERENCES preguntas(id),
    usuario_id UUID NOT NULL REFERENCES perfiles(id), -- profesor que comenta
    comentario TEXT NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Libro de calificaciones (vista agregada)
CREATE TABLE libro_calificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID NOT NULL REFERENCES grupos(id),
    usuario_id UUID NOT NULL REFERENCES perfiles(id),
    examen_id UUID NOT NULL REFERENCES examenes(id),
    intento_id UUID NOT NULL REFERENCES intentos_examen(id),
    
    nota DECIMAL(5,2),
    observaciones TEXT,
    corregido_en TIMESTAMPTZ DEFAULT NOW(),
    
    -- Único por (grupo, usuario, examen)
    UNIQUE(grupo_id, usuario_id, examen_id)
);
```

### Flujo para el Profesor


#### 1. Crear un Examen

```javascript
// vistas/admin/vista-editor-examenes.js

function crearExamen(datos) {
    // datos = {
    //   titulo: "Examen del Génesis",
    //   tipo: 'libro',
    //   libro_id: 1, // Génesis
    //   capitulo_inicio: 1,
    //   capitulo_fin: 5,
    //   preguntas_por_examen: 10,
    //   correccion_automatica: true,
    //   fecha_inicio: '2026-07-20',
    //   fecha_fin: '2026-08-20'
    // }
    
    const examen = await examenRepository.crear(datos);
    
    // Generar preguntas automáticamente o permitir añadir manualmente
    if (datos.generar_automatico) {
        await examenRepository.generarPreguntas(examen.id, datos);
    }
    
    return examen;
}
```

#### 2. Asignar Examen a un Grupo

```javascript
function asignarExamenAAlumnos(examenId, grupoId) {
    // 1. Obtener todos los alumnos del grupo
    const alumnos = await grupoRepository.obtenerMiembros(grupoId);
    
    // 2. Crear intentos de examen para cada alumno
    for (const alumno of alumnos) {
        await examenRepository.crearIntento({
            examen_id: examenId,
            usuario_id: alumno.id,
            estado: 'pendiente'
        });
    }
    
    // 3. Notificar a los alumnos (vía app o email)
    await notificarAlumnos(alumnos, examenId);
}
```

#### 3. Ver Progreso de Alumnos

```javascript
// vista-admin/vista-libro-calificaciones.js

function verProgresoExamen(examenId) {
    // Tabla de alumnos con su estado
    const alumnos = await examenRepository.obtenerProgresoExamen(examenId);
    
    // Renderizar tabla:
    // | Alumno | Estado | Puntuación | Nota | Observaciones | Acciones |
    // | Juan   | ✅ Completado | 8/10 | 8.0 | - | Ver |
    // | María  | 🔴 Pendiente | - | - | - | Recordatorio |
    // | Pedro  | 🟡 En progreso | 5/10 | - | - | - |
    
    renderizarTabla(alumnos);
}
#### 4. Corregir Examen (Manual)
```
```javascript
function corregirExamen(intentoId) {
    const intento = await examenRepository.obtenerIntento(intentoId);
    const respuestas = intento.respuestas;
    
    // Mostrar cada respuesta para corregir
    for (const [preguntaId, respuesta] of Object.entries(respuestas)) {
        // Si es corrección automática, ya está
        if (!intento.correccion_automatica) {
            // El profesor revisa y ajusta
            const correccion = await mostrarPanelCorreccion(preguntaId, respuesta);
            await examenRepository.guardarCorreccion(intentoId, preguntaId, correccion);
        }
    }
    
    // Calcular nota final
    const nota = calcularNota(intento);
    const observaciones = await pedirObservaciones();
    
    // Guardar nota y observaciones
    await examenRepository.calificarIntento(intentoId, {
        nota: nota,
        observaciones: observaciones,
        corregido_por: usuarioActual.id
    });
}
```

#### 5. Panel de Corrección Individual

```javascript
// componentes/pregunta-correccion.js

function renderizarCorreccionPregunta(pregunta, respuestaUsuario) {
    return html`
        <div class="correccion-pregunta">
            <div class="correccion-pregunta__enunciado">
                ${pregunta.texto}
            </div>
            <div class="correccion-pregunta__respuesta-usuario">
                <strong>Respuesta del alumno:</strong>
                ${respuestaUsuario}
            </div>
            <div class="correccion-pregunta__respuesta-correcta">
                <strong>Respuesta correcta:</strong>
                ${pregunta.respuesta_correcta}
            </div>
            <div class="correccion-pregunta__acciones">
                <label>
                    <input type="checkbox" checked> Correcta
                </label>
                <input type="range" min="0" max="${pregunta.puntos}" value="${pregunta.puntos}">
                <input type="text" placeholder="Comentario para el alumno...">
            </div>
        </div>
    `;
}
```

### Flujo para el Alumno


#### 1. Ver Exámenes Asignados

```javascript
// vistas/vista-examen.js

function verMisExamenes() {
    const examenes = await examenRepository.obtenerExamenesAsignados(usuarioActual.id);
    
    // Mostrar lista:
    // 📝 Examen del Génesis 1-5
    //    ⏳ Pendiente (vencimiento: 20/08/2026)
    //    📚 Debes leer Génesis 1-5 antes de responder
    //    [Comenzar Examen]
    // 
    // ✅ Examen de los Evangelios (Completado - Nota: 9.0)
    //    [Ver Resultados]
}
#### 2. Tomar un Examen (con restricción de lectura)
```
```javascript
function comenzarExamen(examenId) {
    const examen = await examenRepository.obtenerExamen(examenId);
    
    // 🔒 VERIFICACIÓN OBLIGATORIA: ¿Ha leído?
    const haLeido = await progresoRepository.haLeidoCapitulo(
        usuarioActual.id,
        examen.libro_id,
        examen.capitulo_inicio,
        examen.capitulo_fin
    );
    
    if (!haLeido) {
        mostrarModal(`
            <h3>📖 Primero debes leer</h3>
            <p>Este examen cubre Génesis 1-5. 
               Lee los capítulos antes de responder.</p>
            <button onclick="irALectura()">Ir a leer ahora</button>
        `);
        return;
    }
    
    // Iniciar el examen
    const intento = await examenRepository.iniciarIntento(examenId, usuarioActual.id);
    
    // Mostrar preguntas una por una
    await mostrarPreguntas(intento.id);
}
```

#### 3. Responder Preguntas

```javascript
function renderizarPregunta(pregunta, numero, total) {
    switch (pregunta.tipo) {
        case 'multiple_opcion':
            return `
                <div class="pregunta">
                    <div class="pregunta__numero">Pregunta ${numero}/${total}</div>
                    <div class="pregunta__texto">${pregunta.texto}</div>
                    <div class="pregunta__opciones">
                        ${pregunta.opciones.map(op => `
                            <label class="opcion">
                                <input type="radio" name="pregunta_${pregunta.id}" 
                                       value="${op.texto}">
                                ${op.texto}
                            </label>
                        `).join('')}
                    </div>
                    <div class="pregunta__referencia">
                        📖 ${pregunta.referencias_biblicas.map(ref => 
                            `${ref.libro} ${ref.capitulo}:${ref.versiculo}`
                        ).join(', ')}
                    </div>
                </div>
            `;
            
        case 'respuesta_corta':
            return `
                <div class="pregunta">
                    <div class="pregunta__numero">Pregunta ${numero}/${total}</div>
                    <div class="pregunta__texto">${pregunta.texto}</div>
                    <input type="text" class="pregunta__input" 
                           placeholder="Escribe tu respuesta...">
                </div>
            `;
        // ... más tipos
    }
}
```

#### 4. Ver Resultados

```javascript
function verResultados(intentoId) {
    const intento = await examenRepository.obtenerIntentoCompleto(intentoId);
    const respuestas = await examenRepository.obtenerRespuestasDetalladas(intentoId);
    
    // Mostrar:
    // ✅ Nota: 8.5/10
    // 📊 Porcentaje: 85%
    // 
    // Pregunta 1: ✅ Correcta
    // Pregunta 2: ❌ Incorrecta
    //    Tu respuesta: "Abraham"
    //    Correcta: "Abrahán"
    //    📝 Comentario del profesor: "Cuidado con la tilde"
    
    renderizarResultados(intento, respuestas);
}
```

### Libro de Calificaciones (Vista Profesor)

Tabla completa por grupo y examen
```javascript
// vistas/admin/vista-libro-calificaciones.js

function renderizarLibroCalificaciones(grupoId) {
    const alumnos = await grupoRepository.obtenerMiembrosConNotas(grupoId);
    const examenes = await examenRepository.obtenerExamenesGrupo(grupoId);
    
    // Matriz: Alumnos × Exámenes
    const matriz = construirMatriz(alumnos, examenes);
    
    return html`
        <table class="libro-calificaciones">
            <thead>
                <tr>
                    <th>Alumno</th>
                    ${examenes.map(e => `<th>${e.titulo}</th>`).join('')}
                    <th>Promedio</th>
                </tr>
            </thead>
            <tbody>
                ${alumnos.map(alumno => `
                    <tr>
                        <td>${alumno.nombre}</td>
                        ${examenes.map(examen => {
                            const nota = matriz[alumno.id]?.[examen.id];
                            return `
                                <td class="${nota >= 7 ? 'aprobado' : 'reprobado'}">
                                    ${nota || '-'}
                                    ${nota ? `<button onclick="verDetalle('${alumno.id}','${examen.id}')">✏️</button>` : ''}
                                </td>
                            `;
                        }).join('')}
                        <td>${calcularPromedio(alumno.id, examenes)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <!-- Estadísticas -->
        <div class="estadisticas">
            <p>📊 Promedio del grupo: ${calcularPromedioGrupo(grupoId)}</p>
            <p>📈 Aprobados: ${calcularAprobados(grupoId)}/${alumnos.length}</p>
        </div>
    `;
}
```

### Funcionalidades Especiales para Tí (Profesor)


#### 1. Corrección semiautomática

```javascript
function correccionSemiautomatica(intentoId) {
    // El sistema sugiere corrección, tú la revisas y apruebas/ajustas
    
    const sugerencias = await examenRepository.sugerirCorreccion(intentoId);
    
    mostrarPanel({
        titulo: "Revisar corrección sugerida",
        elementos: sugerencias.map(s => ({
            pregunta: s.texto,
            respuestaAlumno: s.respuesta,
            sugerida: s.es_correcta ? "✅ Correcta" : "❌ Incorrecta",
            accion: `
                <button onclick="aceptarCorreccion('${s.id}')">✔️ Aceptar</button>
                <button onclick="revisarCorreccion('${s.id}')">✏️ Revisar</button>
            `
        }))
    });
}
```

#### 2. Observaciones personalizadas por alumno

```javascript
function dejarObservacion(intentoId, alumnoId, mensaje) {
    // Guardar en la base de datos
    await examenRepository.guardarObservacion({
        intento_id: intentoId,
        usuario_id: alumnoId,
        mensaje: mensaje,
        profesor_id: usuarioActual.id
    });
    
    // El alumno verá esta observación cuando vea su resultado
}
```

#### 3. Notas con rubrica

```javascript
// Definir rubrica de evaluación
const rubrica = {
    'conocimiento_biblico': { peso: 40, max: 10 },
    'comprension_textual': { peso: 30, max: 10 },
    'aplicacion_personal': { peso: 20, max: 10 },
    'ortografia_y_redaccion': { peso: 10, max: 10 }
};

function calificarConRubrica(intentoId, rubrica) {
    // Calcular nota según rubrica
    let total = 0;
    for (const [categoria, config] of Object.entries(rubrica)) {
        const puntaje = obtenerPuntajeCategoria(intentoId, categoria);
        total += (puntaje / config.max) * config.peso;
    }
    
    return total; // Nota final 0-10
}
```

#### 4. Generar reportes PDF

```javascript
function generarReporteAlumno(alumnoId, grupoId, periodo) {
    const datos = {
        alumno: await usuarioRepository.obtenerPerfil(alumnoId),
        examenes: await examenRepository.obtenerHistorialAlumno(alumnoId, periodo),
        promedio: await examenRepository.obtenerPromedioAlumno(alumnoId, periodo),
        observaciones: await examenRepository.obtenerObservaciones(alumnoId)
    };
    
    // Generar PDF con librería (html2pdf, jsPDF, etc.)
    const pdf = generarPDF(datos);
    return pdf;
}
```

#### 5. Estadísticas de grupo

```javascript
function estadisticasGrupo(grupoId) {
    return {
        total_alumnos: await grupoRepository.contarMiembros(grupoId),
        promedio_general: await examenRepository.promedioGrupo(grupoId),
        distribucion_notas: await examenRepository.distribucionNotas(grupoId),
        examenes_rendidos: await examenRepository.conteoExamenesGrupo(grupoId),
        alumnos_riesgo: await examenRepository.alumnosEnRiesgo(grupoId, 7), // nota < 7
        alumnos_destacados: await examenRepository.alumnosDestacados(grupoId, 9) // nota > 9
    };
}
```

### RLS para Exámenes

```sql
-- Políticas RLS para intentos_examen

-- 1. ALUMNOS: Solo ven sus propios intentos
CREATE POLICY "alumnos_ven_sus_intentos" ON intentos_examen
    FOR SELECT USING (usuario_id = auth.uid());

-- 2. ALUMNOS: Solo pueden crear intentos si han leído
CREATE POLICY "alumnos_crean_intentos_con_lectura" ON intentos_examen
    FOR INSERT WITH CHECK (
        usuario_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM progreso_lectura pl
            WHERE pl.id = progreso_lectura_id
            AND pl.usuario_id = auth.uid()
            AND pl.completado = true
        )
    );

-- 3. ALUMNOS: Solo pueden actualizar SUS intentos en progreso
CREATE POLICY "alumnos_actualizan_sus_intentos" ON intentos_examen
    FOR UPDATE USING (usuario_id = auth.uid())
    WITH CHECK (estado = 'en_progreso');

-- 4. PROFESORES (Admin/Editor): Ven todos los intentos de su grupo
CREATE POLICY "profesores_ven_intentos_grupo" ON intentos_examen
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM examenes e
            JOIN grupos g ON e.grupo_id = g.id
            JOIN miembros_grupo mg ON mg.grupo_id = g.id
            WHERE e.id = examen_id
            AND mg.usuario_id = auth.uid()
            AND mg.rol IN ('admin', 'editor')
        )
    );

-- 5. PROFESORES: Pueden calificar intentos
CREATE POLICY "profesores_califican_intentos" ON intentos_examen
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM examenes e
            JOIN grupos g ON e.grupo_id = g.id
            JOIN miembros_grupo mg ON mg.grupo_id = g.id
            WHERE e.id = examen_id
            AND mg.usuario_id = auth.uid()
            AND mg.rol IN ('admin', 'editor')
        )
    );
```

### Interfaz para el Profesor (resumen)

```
PANEL DEL PROFESOR
├── 📝 Crear Examen
│   ├── Título, descripción
│   ├── Seleccionar capítulos/libros
│   ├── Tipo de preguntas
│   ├── Corrección automática/manual
│   └── Fechas de inicio/fin
│
├── 📋 Mis Exámenes
│   ├── Examen del Génesis (20 alumnos)
│   │   ├── ✅ 15 completados
│   │   ├── 🟡 3 en progreso
│   │   └── 🔴 2 pendientes
│   └── [Ver libro de calificaciones]
│
├── 📊 Libro de Calificaciones
│   ├── Tabla: Alumnos × Exámenes
│   ├── Promedios por alumno
│   ├── Promedio del grupo
│   ├── Alumnos en riesgo (<7)
│   └── [Exportar a Excel/PDF]
│
├── ✏️ Corrección Pendiente
│   ├── Juan Pérez (Examen Génesis)
│   │   ├── 8/10 respuestas automáticas
│   │   └── 2 respuestas para revisar manual
│   └── [Corregir ahora]
│
└── 👨‍🎓 Alumno: Juan Pérez
    ├── Historial de exámenes
    ├── Nota: 8.5 promedio
    ├── Observaciones:
    │   └── "Mejorar en comprensión de Génesis"
    └── [Ver detalle completo]
```

### Resumen: Lo que Necesitas como Profesor


| Funcionalidad | Implementación |
|---|---|
| Crear exámenes | Formulario con preguntas, opciones, respuestas |
| Asignar a grupo | Seleccionar grupo y fecha límite |
| Ver progreso | Tabla con estado de cada alumno |
| Corregir | Panel individual con corrección automática + manual |
| Poner notas | Campo numérico + observaciones |
| Libro de calificaciones | Tabla resumen por grupo y alumno |
| Estadísticas | Promedios, aprobados, riesgos, destacados |
| Exportar | PDF/Excel de calificaciones |
| Observaciones | Comentarios personalizados por alumno |


---

## 21. Visión unificada: los dos mundos de la plataforma

Este capítulo resume cómo conviven, sin mezclarse, el **Mundo 1: Estudio Guiado** (ciclo obligatorio lectura → preguntas → repaso → memorización, ver capítulos 1 y 14) y el **Mundo 2: Exámenes Personalizados** (capítulo 20), incluyendo el modelo de datos ajustado, la interfaz de dos pestañas, el flujo de usuario de cada mundo y la navegación final de la app.


### La Visión: Dos Mundos en una Plataforma

```
FORMSBIBLICOS
│
├── 📚 MUNDO 1: ESTUDIO GUIADO (El "modo automático")
│   │
│   ├── El usuario avanza capítulo por capítulo
│   ├── Lee → Responde preguntas pre-hechas
│   ├── Repasa lo fallado → Memoriza versículos
│   └── Completar toda la Biblia = meta final
│
└── 📝 MUNDO 2: EXÁMENES PERSONALIZADOS (El "modo profesor")
    │
    ├── TÚ creas exámenes a medida (como Google Forms)
    ├── Los asignas a tus alumnos
    ├── Corriges, pones notas y observaciones
    └── Esto NO está ligado al progreso automático
```

### ¿Cómo se relacionan? (¡No se mezclan!)


| Aspecto | MUNDO 1: Estudio Guiado | MUNDO 2: Exámenes Personalizados |
|---|---|---|
| Quién crea contenido | Los Editores/Admin del sistema | TÚ (el profesor) |
| Contenido | Preguntas predefinidas por capítulo | Preguntas que tú creas |
| Flujo | Fijo: leer → preguntar → repasar | Flexible: tú decides qué, cuándo, a quién |
| Progreso | Automático (Biblia completa) | Manual (tú pones notas) |
| Público | Cualquier usuario | Tus alumnos específicos |
| Corrección | Automática | Manual o semiautomática |
| Meta | Completar toda la Biblia | Evaluar a tus alumnos |


### Modelo de Datos Ajustado

```sql
-- ============================================
-- MUNDO 1: ESTUDIO GUIADO (Preguntas del sistema)
-- ============================================

-- Preguntas predefinidas por capítulo (las crean los Editores)
CREATE TABLE preguntas_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capitulo_id UUID NOT NULL REFERENCES capitulos(id),
    creado_por UUID NOT NULL REFERENCES perfiles(id),
    
    texto TEXT NOT NULL,
    tipo TEXT NOT NULL, -- multiple, verdadero_falso, etc.
    opciones JSONB,
    respuesta_correcta TEXT,
    explicacion TEXT,
    orden INTEGER,
    
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Progreso del usuario en el estudio guiado
CREATE TABLE progreso_estudio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES perfiles(id),
    capitulo_id UUID NOT NULL REFERENCES capitulos(id),
    
    leido BOOLEAN DEFAULT false,
    fecha_lectura TIMESTAMPTZ,
    preguntas_respondidas INTEGER DEFAULT 0,
    preguntas_correctas INTEGER DEFAULT 0,
    completado BOOLEAN DEFAULT false, -- leyó + respondió bien
    
    creado_en TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- MUNDO 2: EXÁMENES PERSONALIZADOS (los que TÚ creas)
-- ============================================

-- Exámenes que crea el profesor (tú)
CREATE TABLE examenes_personalizados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID NOT NULL REFERENCES grupos(id),
    creado_por UUID NOT NULL REFERENCES perfiles(id), -- TÚ
    
    titulo TEXT NOT NULL,
    descripcion TEXT,
    
    -- A qué libros/capítulos se refiere (PERO no obliga a leer)
    referencia_biblica JSONB, -- { libros: ["Génesis", "Éxodo"], capitulos: [1,2,3] }
    
    -- Configuración
    preguntas JSONB, -- [ { texto, opciones, respuesta, puntos } ]
    puntos_totales INTEGER,
    fecha_limite TIMESTAMPTZ,
    
    -- Estado
    estado TEXT DEFAULT 'borrador',
    publicado BOOLEAN DEFAULT false,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Intentos de los alumnos en tus exámenes
CREATE TABLE intentos_examen_personalizado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    examen_id UUID NOT NULL REFERENCES examenes_personalizados(id),
    alumno_id UUID NOT NULL REFERENCES perfiles(id),
    
    respuestas JSONB, -- { pregunta_id: respuesta }
    puntuacion DECIMAL(5,2),
    nota DECIMAL(5,2), -- 0-10 o 0-100
    
    -- Corrección (TÚ haces esto)
    corregido BOOLEAN DEFAULT false,
    corregido_por UUID REFERENCES perfiles(id),
    observaciones TEXT,
    fecha_corregido TIMESTAMPTZ,
    
    -- Estado
    estado TEXT DEFAULT 'pendiente', -- pendiente, en_progreso, completado, calificado
    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
    fecha_completado TIMESTAMPTZ,
    
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tus observaciones por alumno
CREATE TABLE observaciones_alumno (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id UUID NOT NULL REFERENCES perfiles(id),
    profesor_id UUID NOT NULL REFERENCES perfiles(id),
    examen_id UUID NOT NULL REFERENCES examenes_personalizados(id),
    observacion TEXT NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);
```

### Interfaz: Dos Pestañas Principales

```html
<!-- Layout principal de la app -->
<nav class="navegacion-principal">
    <button class="pestaña activa" data-tab="estudio">
        📖 Estudio Guiado
    </button>
    <button class="pestaña" data-tab="examenes">
        📝 Mis Exámenes
    </button>
</nav>

<!-- ========================================== -->
<!-- PESTAÑA 1: ESTUDIO GUIADO -->
<!-- ========================================== -->
<section id="tab-estudio" class="tab-content activo">
    
    <!-- Barra de progreso global -->
    <div class="progreso-global">
        <h2>📖 Tu progreso en la Biblia</h2>
        <div class="barra-progreso">
            <div style="width: 23%">23% completado</div>
        </div>
        <p>Génesis 12:3 - "Y serán benditas..."</p>
    </div>
    
    <!-- Mapa de la Biblia -->
    <div class="mapa-biblico">
        <div class="testamento antiguo">
            <h3>Antiguo Testamento</h3>
            <div class="libros-grid">
                <div class="libro completado">Génesis ✅</div>
                <div class="libro en-progreso">Éxodo ⏳</div>
                <div class="libro pendiente">Levítico</div>
                <!-- ... 39 libros -->
            </div>
        </div>
        <div class="testamento nuevo">
            <h3>Nuevo Testamento</h3>
            <!-- ... 27 libros -->
        </div>
    </div>
    
    <!-- Continuar leyendo -->
    <div class="continuar-lectura">
        <h3>📖 Continuar donde lo dejaste</h3>
        <div class="tarjeta-capitulo">
            <span class="referencia">Éxodo 3</span>
            <span class="progreso">Leído 50%</span>
            <button class="btn-primario">Continuar leyendo</button>
        </div>
    </div>
</section>

<!-- ========================================== -->
<!-- PESTAÑA 2: MIS EXÁMENES (el "modo profesor") -->
<!-- ========================================== -->
<section id="tab-examenes" class="tab-content">
    
    <!-- Panel del profesor -->
    <div class="panel-profesor">
        <h2>📝 Mis Exámenes y Alumnos</h2>
        
        <!-- Botón crear nuevo examen -->
        <button class="btn-crear-examen">+ Crear nuevo examen</button>
        
        <!-- Resumen rápido -->
        <div class="resumen-rapido">
            <div class="card">
                <span>📝 Exámenes activos</span>
                <strong>4</strong>
            </div>
            <div class="card">
                <span>👨‍🎓 Alumnos</span>
                <strong>23</strong>
            </div>
            <div class="card">
                <span>📊 Por corregir</span>
                <strong>7</strong>
            </div>
        </div>
        
        <!-- Lista de exámenes creados -->
        <div class="lista-examenes">
            <div class="examen-item">
                <div class="examen-info">
                    <h4>Examen del Génesis 1-5</h4>
                    <p>Creado: 10/07/2026 · 15 alumnos · 8 completados</p>
                    <span class="estado activo">🟢 Activo</span>
                </div>
                <div class="examen-acciones">
                    <button>📊 Ver resultados</button>
                    <button>✏️ Editar</button>
                    <button>📋 Ver alumnos</button>
                </div>
            </div>
            
            <div class="examen-item">
                <div class="examen-info">
                    <h4>Evaluación de los Evangelios</h4>
                    <p>Creado: 05/07/2026 · 12 alumnos · 12 completados</p>
                    <span class="estado cerrado">🔴 Cerrado</span>
                </div>
                <div class="examen-acciones">
                    <button>📊 Ver resultados</button>
                    <button>📋 Ver alumnos</button>
                </div>
            </div>
        </div>
        
        <!-- Alumnos pendientes de corregir -->
        <div class="pendientes-correccion">
            <h3>✏️ Por corregir</h3>
            <div class="alumno-pendiente">
                <span>Juan Pérez</span>
                <span>Examen Génesis 1-5</span>
                <span>8/10 respuestas</span>
                <button class="btn-corregir">Corregir ahora</button>
            </div>
            <div class="alumno-pendiente">
                <span>María González</span>
                <span>Examen Evangelios</span>
                <span>5/10 respuestas</span>
                <button class="btn-corregir">Corregir ahora</button>
            </div>
        </div>
    </div>
</section>
```

### Flujo de Usuario: Los Dos Mundos

Mundo 1: Estudio Guiado (Para todos)
```
1. Usuario entra a la app
   ↓
2. Va a "Estudio Guiado"
   ↓
3. Ve su progreso: "Génesis 12:3 completado, siguiente Éxodo 3"
   ↓
4. Abre Éxodo 3 → Lee el capítulo
   ↓
5. Responde 10 preguntas del sistema sobre el capítulo
   ↓
6. Si falla alguna → Repaso automático
   ↓
7. Versículo clave para memorizar → SM-2
   ↓
8. ¡Capítulo completado! → Siguiente
   ↓
9. Meta: Completar TODA la Biblia
```
Mundo 2: Exámenes Personalizados (Tú + tus alumnos)
```
1. TÚ creas un examen personalizado
   - Título: "Examen Especial Génesis"
   - Preguntas: Las que tú quieras
   - Asignas a: Grupo "Jóvenes Lunes"
   - Fecha límite: 20/08/2026
   ↓
2. Los alumnos ven en "Mis Exámenes":
   "📝 Examen Especial Génesis - Pendiente"
   ↓
3. Alumno responde (NO necesita haber leído antes)
   ↓
4. TÚ ves: "7 alumnos por corregir"
   ↓
5. Corriges cada examen (automático + manual)
   ↓
6. Pones nota y observaciones
   ↓
7. Alumno ve: "Nota: 8.5 - Observación: Mejorar en..."
   ↓
8. TÚ ves en "Libro de Calificaciones":
   | Alumno | Examen Especial | Promedio |
   | Juan   | 8.5            | 8.2      |
   | María  | 9.0            | 8.8      |
```

### Navegación de la App (Estructura Final)

```
FORMSBIBLICOS
│
├── 📱 App Shell (navegación inferior fija)
│   │
│   ├── 🏠 Inicio
│   │   └── Resumen de ambos mundos
│   │
│   ├── 📖 Estudio Guiado ← MUNDO 1
│   │   ├── Mapa de la Biblia
│   │   ├── Capítulo actual (leer)
│   │   ├── Preguntas del capítulo
│   │   ├── Repaso
│   │   ├── Memorización (SM-2)
│   │   └── Progreso personal
│   │
│   ├── 📝 Exámenes ← MUNDO 2 (visible solo para profesores/alumnos)
│   │   ├── [Si eres PROFESOR]
│   │   │   ├── Crear examen
│   │   │   ├── Mis exámenes
│   │   │   ├── Corrección pendiente
│   │   │   ├── Libro de calificaciones
│   │   │   └── Alumnos (gestión)
│   │   │
│   │   └── [Si eres ALUMNO]
│   │       ├── Mis exámenes asignados
│   │       ├── Tomar examen
│   │       └── Ver resultados/notas
│   │
│   ├── 📊 Progreso
│   │   ├── Estadísticas de estudio guiado
│   │   └── Notas de exámenes personalizados
│   │
│   └── 👤 Perfil
│       ├── Configuración
│       ├── Preferencias (letra grande, contraste)
│       └── Cerrar sesión
│
└── 🔐 Admin/Owner (carga diferida)
    ├── Panel Admin (gestión de grupos, usuarios)
    ├── Editor de preguntas del sistema (MUNDO 1)
    └── Panel Owner (estadísticas globales)
```

### Diferencias Clave (Resumen)


| Característica | MUNDO 1: Estudio Guiado | MUNDO 2: Exámenes Personalizados |
|---|---|---|
| Propósito | Leer toda la Biblia | Evaluar a tus alumnos |
| Quién crea | Editores del sistema | TÚ (profesor) |
| Contenido | Fijo por capítulo | Lo que tú decidas |
| Obligación | Leer antes de preguntar | Sin obligación de leer |
| Progreso | Automático (toda la Biblia) | Manual (tú calificas) |
| Corrección | Automática | Manual + automática |
| Visibilidad | Todos los usuarios | Solo tu grupo |
| Meta | Completar 66 libros | Evaluar conocimientos |
| Notas | No hay notas | Notas 0-10 + observaciones |

