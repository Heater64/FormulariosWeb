# Auditoría y plan: de FormsBiblicos a plataforma de exámenes

Estado: **etapas 1-4 implementadas y verificadas en local.** La migración 056 ya fue
aplicada por el propietario. El panel real reveló que hay al menos una fila de examen con
`preguntas` JSONB escalar; `fb_resumen_admin` de la 056 aborta con SQLSTATE 22023. La
migración 057 corrige el resumen sin borrar ni reescribir datos y queda pendiente de aplicar.

Etapa 5 (tipos completos de pregunta): el editor pasó de dos tipos a **ocho** con selector
visual, la corrección automática se pre-rellena en el servidor con la misma regla que
`fb_evaluar_pregunta`, y la migración **058** (pendiente de aplicar) amplía
`fb_tipo_objetivo` para que `pendientes_correccion` solo cuente las escritas.

---

## 1. Auditoría del repositorio (lo que hay de verdad)

No se ha inventado nada: todo lo que sigue está leído del repo.

### Stack real

| Capa | Tecnología | Nota |
|---|---|---|
| Frontend | HTML + CSS + JS nativo, sin framework | SPA con router por hash (`#!ruta`) |
| Build | Vite 6 (`vite.config.js`) | Copia `js/`, `css/`, `data/`, `assets/` a `dist/` y minifica |
| Despliegue | Vercel (`vercel.json`) | `npm run build:public` → `dist-public/` (landing + app en `/app/`) |
| Backend | Supabase (Postgres + Auth + RLS + Realtime) | Cliente en `js/datos/supabase-client.js` |
| Pruebas | Vitest (23 archivos, 318 pruebas) | `npm test` |
| PWA | `public/manifest.json` + `public/sw.js` | Service worker solo en https |

### Arquitectura de la aplicación

- `index.html` es el shell: splash, `#app-root`, barra de navegación y ~40 scripts clásicos.
- `js/core/index.js` registra rutas, dibuja la navegación y arranca sesión/marca.
- `js/core/router.js` resuelve `#!ruta` con vistas lazy por `import()`.
- `js/rutas → js/vistas/*.js` (vistas), `js/datos/*-repository.js` (única capa que llama a Supabase),
  `js/dominio/*.js` (lógica pura), `css/` en ITCSS con tokens.

### Lo que ya existía y se ha reutilizado

- **Exámenes con corrección en servidor** (migraciones `008`, `009`, `017`, `047`, `048`):
  tablas `examenes_personalizados` e `intentos_examen_personalizado`, RPCs
  `iniciar_intento_examen`, `guardar_borrador_examen`, `entregar_intento_examen`,
  `calificar_intento_examen`, y los helpers `fb_sanitizar_preguntas`,
  `fb_filtrar_respuestas`, `fb_calcular_puntuacion` (nota sobre 10 calculada en Postgres).
- **Formato de pregunta** `{ id, texto, tipo, opciones[], respuesta_correcta, puntos, obligatoria }`
  dentro de `examenes_personalizados.preguntas` (JSONB). Es el contrato que respetan
  tanto el editor nuevo como las RPCs.
- **Supabase Auth + PostgreSQL**, RLS por rol, Vite y Vercel: intactos.
- **Sistema de diseño** (`css/00-settings` tokens, ITCSS, BEM) y utilidades
  (`helpers.escapeHtml/confirmar/mostrarAlerta`), PWA, splash y barra inferior.

### Lo que se ha retirado **de la interfaz**

El código sigue en el repo, pero **ya no se carga ni se enruta** (mismo criterio que la
APK en pausa documentada en `README.md`): Estudio guiado, Capítulos, Sesión de lectura,
Memorización, Explorar, Mapa bíblico, Desafíos, Grupos/instituciones, Notificaciones,
Perfil con logros y el panel global `/admin`.

Concretamente, `index.html` ya no incluye los scripts de `vista-estudio`, `vista-capitulos`,
`vista-sesion-estudio`, `vista-memorizacion`, `vista-explorar`, `vista-notificaciones`,
`vista-perfil`, `vista-mapa`, `vista-desafio`, `vista-grupos`, `vista-calificaciones`,
`vista-examen-tomar`, `vista-examen-corregir` ni los repositorios de memorización, notas,
sugerencias, grupos, desafíos y notificaciones. La nav pasó de
`Exámenes / Memoria / Estudio / Explorar / Perfil` a **`Inicio / Exámenes / Entregas / Cuenta`**.

El CSS empaquetado bajó de **368 KB a 70 KB** y los scripts de **67 a 41**.

---

## 2. El cambio nuevo: enlaces individuales de un solo uso

Esto **no existía**. Antes el alumno necesitaba cuenta (`perfiles`) y pertenencia a un
grupo; `intentos_examen_personalizado.alumno_id` era `NOT NULL` y todas las RPCs
comprobaban `alumno_id = auth.uid()`.

### Migración `supabase/migraciones/056_enlaces_examen_alumnos.sql`

Aditiva e idempotente: solo `CREATE TABLE IF NOT EXISTS`, `ALTER ... ADD COLUMN IF NOT EXISTS`
y un `DROP NOT NULL`. **No borra ni renombra datos.**

- Tabla nueva `examen_enlaces`: `token` único (40 hex), `nombre_alumno`, `grupo_alumno`,
  `usado`, `intento_id`.
- `intentos_examen_personalizado`: `alumno_id` pasa a nullable y se añaden
  `enlace_id`, `alumno_nombre`, `alumno_grupo`, `requiere_correccion`, `pendientes_correccion`.
- Índice único `idx_intento_enlace_unico (enlace_id)`: **un enlace ⇒ un intento**, en la BD.
  Cambiar el nombre no permite entregar dos veces.

### RPCs

Públicas (solo por token, concedidas a `anon`):

| RPC | Qué hace |
|---|---|
| `fb_estado_enlace(token)` | Título, profesor, estado, nombre del enlace. **Sin preguntas.** |
| `fb_iniciar_por_token(token)` | Crea o **retoma** el único intento; devuelve las preguntas sin `respuesta_correcta`. |
| `fb_guardar_borrador_token(token, respuestas)` | Autoguardado filtrado contra el snapshot. |
| `fb_entregar_por_token(token, respuestas)` | Valida obligatorias y temporizador, califica **solo los test**, marca el enlace como usado y deja `nota = NULL`. |
| `fb_consultar_entrega(token)` | Estado. **La nota solo aparece si `corregido = true`.** |

Del administrador (requieren sesión): `fb_crear_enlaces`, `fb_listar_enlaces`,
`fb_eliminar_enlace`, `fb_resumen_admin`, `fb_listar_entregas`, `fb_obtener_entrega`,
`fb_corregir_entrega`, `fb_cambiar_estado_examen`.

### Seguridad

- `anon` no recibe permisos sobre ninguna tabla (la 047 ya cerró ese acceso): el alumno
  solo puede entrar por las cinco RPCs de token, que son `SECURITY DEFINER` y validan el
  token ellas mismas.
- Los helpers (`fb_contexto_enlace`, `fb_preguntas_pendientes`, `fb_nuevo_token`,
  `fb_tipo_objetivo`) se revocan de `PUBLIC`/`anon`/`authenticated`.
- `fb_corregir_entrega` **rechaza** cerrar la corrección mientras quede una respuesta
  escrita sin decidir, y recalcula la nota en el servidor ignorando cualquier nota enviada
  desde el navegador.
- La página del alumno no contiene la palabra `respuesta_correcta` (cubierto por test).

---

## 3. Frontend nuevo

### Página pública del alumno

- `public-site/examen.html` + `public-site/examen.js`, servida en **`/e/<token>`**
  (rewrite nuevo en `vercel.json`). **Sin iniciar sesión.**
- Rutas **absolutas** a propósito: con un rewrite la URL sigue siendo `/e/<token>`, así que
  `./examen.js` resolvería a `/e/examen.js` (404). Este fallo se detectó en el navegador
  durante la verificación.
- Estados: cargando · enlace no válido · examen cerrado · identificación (nombre + grupo
  opcional, precargados desde el enlace) · examen · entregado (sin nota si falta corregir)
  · calificado (nota sobre 10 + comentario).
- Accesibilidad: `fieldset`/`legend` con nombre accesible, `aria-live`, foco gestionado,
  diálogo de confirmación con `<dialog>`, objetivos táctiles de 48 px, `prefers-reduced-motion`.
- Los errores técnicos nunca llegan al alumno: se registran en consola y se muestra un
  mensaje comprensible.

### Panel del administrador (SPA)

| Ruta | Vista | Contenido |
|---|---|---|
| `/inicio` | `vista-panel.js` | Saludo, 4 métricas, pendientes de corrección, últimos exámenes |
| `/examenes` | `vista-examenes.js` | Filtros por estado, buscador, publicar/cerrar, duplicar, eliminar y **modal de enlaces** (pegar nombres, generar, copiar, WhatsApp) |
| `/editor/nuevo`, `/editor/:id` | `vista-examen-editor.js` | Título, descripción, preguntas con orden, puntos y obligatoriedad. **Ocho tipos** (opción múltiple, V/F, completar, respuesta corta, desarrollo, varias respuestas, relacionar, ordenar) elegibles en un selector visual con descripción, ejemplo y tipo de corrección |
| `/entregas` | `vista-entregas.js` | Exámenes con entregas y cuántas faltan |
| `/corregir/:id` | `vista-entregas.js` | Entregas del examen y corrección: los automáticos (test, completar, relacionar, ordenar) llegan **pre-rellenados con la regla del servidor** y las escritas se deciden con Correcta/Incorrecta + puntos, comentario final |
| `/cuenta` | `vista-cuenta.js` | Identidad, cambio de contraseña, cerrar sesión |

Se añaden `css/05-componentes/_plataforma.css` (bloque `adm-`), `js/componentes/panel-ui.js`
(modal accesible, formato) y `js/datos/plataforma-repository.js` (capa de datos).

Flujo de nota: al entregar, `puntuacion` = % de los test y `nota = NULL`. La **nota final
sobre 10** la sella `fb_corregir_entrega` cuando ya no queda nada escrito pendiente.

---

## 4. Verificación ejecutada

| Comprobación | Resultado |
|---|---|
| `npm test` | **365/365** (incluye 27 nuevas de editor/entregas/puntuación de los ocho tipos) |
| `npm run build:public` | OK · `examen.html` y `examen.js` en `dist-public/` |
| `npm run test:web-quality` | **92/92** |
| `npm run test:release` | **50/50** (incluye «sin scripts inline» y CSP de todas las páginas) |
| `npm run test:ops` | 1 PASS / 7 WARN, exit 0. Los WARN son configuración operativa (SMTP, backups, revisión legal, DNS): **preexistentes y ajenos a este cambio** |
| `node --check` sobre los 11 archivos JS nuevos/modificados | OK (el build de Vite no parsea los scripts clásicos) |
| Flujo del alumno en navegador real (Chromium) con doble del servidor | intro → examen → confirmación → entrega → pantalla "pendiente de corrección"; 3 autoguardados; payload `{q1:'1', q3:'1', q2:'texto'}`; sin errores de consola ni 404 locales |

---

## 5. Pendiente y limitaciones (honesto)

1. **La migración 056 sí está aplicada.** La llamada real a `fb_resumen_admin` devuelve
   `22023: cannot get array length of a scalar`: hay al menos un examen con `preguntas`
   JSONB que no es un array. La migración aditiva 057 corrige el resumen (ese registro
   aparece como 0 preguntas; no se altera ni elimina ningún dato). Aplicar la 057 en el SQL
   Editor de Supabase y recargar la app.
2. La UI del panel autenticado se ha observado en navegador; después de aplicar la 057,
   completar el recorrido real (crear, publicar, generar enlace, entregar y corregir) sigue
   pendiente de validación.
3. **Código bíblico dormido**: las vistas, repositorios y CSS retirados siguen en el repo
   (no cargados). Borrarlos es una decisión aparte; hacerlo rompería
   `tests/examenes-security.test.js` y `tests/public-architecture.test.js`, que leen esos
   archivos a propósito.
4. **La landing y el login públicos** (`public-site/index.html`, `login`, `registro`,
   `onboarding`, páginas legales) siguen con textos de estudio bíblico, clases e
   instituciones. No se han tocado para no romper las pruebas de arquitectura pública, que
   verifican enlaces y textos concretos de esas páginas.
5. **El nombre del producto sigue siendo "FormsBiblicos"** (manifest, títulos, cabeceras).
   Renombrarlo afecta a la marca, al login, al manifiesto y a una aserción de test; es una
   decisión de producto, no técnica.
6. **Desactivados de facto**: notificaciones y push (ya no se arrancan en el shell),
   `/admin` global, grupos/instituciones, calificaciones globales y perfil con logros.
7. **Sin temporizador visible** en la página del alumno: el servidor sí lo valida si el
   examen lo define en `config`, pero no se pinta la cuenta atrás.

---

## 6. Cómo probarlo

```bash
# 1. 056 ya está aplicada; ejecutar en Supabase: 057_resumen_admin_json_preguntas_robusto.sql y 058_tipos_objetivos_completos.sql
# 2. Local
npm run dev                  # app en http://localhost:3000
npm test                     # pruebas de contrato y regresión
npm run build:public         # artefacto de Vercel
npm run test:web-quality     # 92 comprobaciones del artefacto
```

Para probar al alumno con el backend real: publicar un examen, generar un enlace y abrirlo
en una ventana privada (o en el móvil).
