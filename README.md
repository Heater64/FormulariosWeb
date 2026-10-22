# FormsBiblicos

Plataforma de estudio bíblico guiado con dos mundos: **Estudio Guiado** (lectura → preguntas → repaso → memorización → completar la Biblia) y **Exámenes Personalizados** (el profesor crea, asigna, corrige y califica).

## ⚠️ Estado actual: PWA activa · APK en PAUSA

La aplicación se distribuye como **PWA** (aplicación web instalable). La antigua **app Android (APK)** y todo su sistema de actualizaciones están **pausados**: quedaron rotos y se retoman más adelante.

### Qué está activo (PWA)

- `manifest.json` + `sw.js` + `offline.html` → la web se puede **instalar** como app (pantalla completa, icono propio, sin tiendas).
- El service worker se registra solo en producción (https). En desarrollo local (http) no se registra para no interferir con el HMR de Vite.
- La **versión** se muestra en el perfil y en el login, y se sube de vez en cuando (ver más abajo).

### Qué está pausado (APK) — no borrado, solo dormido

Estos archivos **siguen en el repo pero ya no se cargan ni se usan**:

- `android/` — proyecto Capacitor + plugin nativo `UpdateInstallerPlugin`.
- `js/services/update-service.js`, `js/componentes/update-installer.js`, `js/componentes/update-dialog.js` — **quitados de `index.html`** (los `<script>` ya no están).
- `.github/workflows/release-android.yml` — workflow manual de release APK. **No ejecutarlo** hasta reanudar.
- `scripts/generate-version-manifest.mjs`, `scripts/sync-android-version.mjs`.
- `docs/app-updates.md`, `tasks/plan.md`, `tasks/todo.md`, `release-notes.md` — documentación de la APK, marcada como pausada.
- `version.json` ya **no** contiene campos de APK (`apkUrl`, `sha256`, `sizeBytes`, `minimumVersion`, …). Solo versión y notas para la web.

### Cómo reanudar la APK (cuando toque)

1. Volver a añadir a `index.html` los tres `<script>` de `update-service.js`, `update-installer.js` y `update-dialog.js`.
2. Restaurar en `version.json` los campos de APK (`versionCode`, `minimumVersion`, `minimumVersionCode`, `mandatory`, `apkUrl`, `releaseUrl`, `sizeBytes`, `sha256`).
3. Reintroducir el botón "Buscar actualizaciones" en `js/vistas/vista-perfil.js`.
4. Volver a poner la sección de descarga de APK en `public-site/index.html`.
5. Ejecutar `.github/workflows/release-android.yml` cuando esté listo.

## Sistema de Clases (estilo Classroom)

- **Instituciones** (`instituciones`): cada organización (iglesia, colegio, seminario) tiene su propio `admin_id`. Solo el owner puede crearlas y administrarlas desde `Grupos → Nueva institución`; los admins solo ven la institución de su clase.
- **Clases** (`grupos`): pertenecen a una institución (`institucion_id`) y tienen un **código de clase único** (`codigo`, 6 caracteres sin ambiguos). El profesor lo ve en el banner del detalle (botón copiar).
- **Unirse**: se acabó el directorio abierto — se entra con el **código** (RPC `unirse_con_codigo`, SECURITY DEFINER, el código no se expone por RLS).
- **Home "Mis clases"**: tarjetas estilo Classroom agrupadas por institución; `Grupos → Unirme con código` para unirse.
- **Requisito**: migración `040_clases_instituciones.sql` (incluida en `pendientes_produccion.sql`). Sin aplicarla, el home funciona en modo degradado (clases sin institución ni código) y las acciones muestran un aviso claro.

## Administración por alcance

- El usuario `owner` es el único propietario global y puede gestionar usuarios, clases, exámenes, memorización, auditoría, marca, notificaciones, backups y configuración.
- Un `admin` siempre debe tener una clase en `perfiles.grupo_id`. Su panel solo muestra esa clase, sus alumnos/profesores y sus exámenes.
- El panel de admin no incluye memorización, auditoría, backups, configuración de backend ni métricas globales. Las RPC `admin_*_clase` y las migraciones `041_alcance_panel_admin.sql` y `042_fix_creacion_usuarios_auth.sql` refuerzan el alcance y la creación de cuentas también en Supabase, no solo en la interfaz.
- Los admins pueden crear y editar alumnos/profesores de su clase, suspenderlos o eliminarlos. No pueden crear admins, mover usuarios a otra clase, crear clases ni ver usuarios de otras clases.
- Las cuentas creadas por el panel usan emails internos en `accounts.formsbiblicos.com` (no se muestran al usuario); la migración `043_auth_email_valido.sql` evita el dominio reservado `.local` que GoTrue no acepta de forma fiable.
- Tras el reinicio de producción de agosto de 2026 se conservó únicamente `owner`; las notificaciones, exámenes, intentos y cuentas antiguas fueron limpiados. Las cuatro clases existentes se conservaron para que el owner pueda reasignarlas.

## Versionado (sigue activo)

Hay dos cosas distintas, y las dos se gestionan solas:

**1. Versión de release** (SemVer en `package.json`): la numeran las personas, cuando hay novedades que contar:

```bash
npm run version:patch   # 1.0.12 → 1.0.13
npm run version:minor   # 1.0.12 → 1.1.0
npm run version:major   # 1.0.12 → 2.0.0
```

`npm run version:*` actualiza también `android/version-code.properties`, el `CACHE_VERSION` de `sw.js` y `version.json`.

**2. Identidad de build** (automática): cada build calcula un `buildId` único (`<commit>-<AAAAMMDD>-<HHMMSS>-<aleatorio>`) y lo estampa en:

- `CACHE_VERSION` del service worker → cada despliegue usa un nombre de caché distinto, así que al activarse el SW borra la caché anterior y el cliente deja de servir el bundle viejo.
- `js/core/version.js` → la versión que se ve en el perfil y en el panel de admin (`1.0.12 · 2224c13-1027`).
- `version.json` publicado → `buildId` y `builtAt`, para saber qué build está en producción.

**No hay que editar `sw.js` a mano**: el build sobrescribe la constante. El valor del repo es solo el valor por defecto y debe coincidir con `package.json` (lo comprueba `npm run test:release`).

Para desplegar:

```bash
npm run build         # app web (dist/)
npm run build:public  # sitio público de Vercel (dist-public/)
npm run build:sites   # paquete para Freebuff Sites (freebuff-sites-build/)
```

Los tres llevan la MISMA identidad de build, y los recursos sin hash (JS, CSS, HTML, `sw.js`, `version.json`) se sirven con `must-revalidate`: nada se queda cacheado entre despliegues.

## Añadir una sección nueva

Toda sección se publica por etapas con una función de Supabase (`oculta` → `beta` → `activa`). Nunca se deja una ruta visible a medio terminar: el enlace, la ruta y los accesos indirectos se activan a la vez.

El procedimiento completo —bandera, repositorio, vista, guardia del router, CSS por sección, pruebas y despliegue— está en [AGENTS.md](AGENTS.md). Antes de empezar, lee también [CONVENCIONES.md](CONVENCIONES.md).

La infraestructura de banderas vive en [076_funciones.sql](supabase/migraciones/076_funciones.sql). El runtime del cliente (`js/core/features.js`) es la siguiente pieza pendiente.

## Stack

- **Frontend**: HTML + CSS + JavaScript nativo (sin frameworks), PWA (`manifest.json` + `sw.js`)
- **Backend**: Supabase (Postgres, Auth, RLS, Storage, Realtime)
- **Arquitectura CSS**: ITCSS + BEM + Custom Properties
- **Arquitectura JS**: Router SPA + Store central + EventBus + Repositorios

## Inicio Rápido

1. Clona el repositorio
2. Abre `index.html` en un servidor local (Live Server, http-server, `npm run dev`, etc.)
3. O usa la página de login directa: `login.html`
4. Para probar la instalación PWA: despliega en https (p. ej. Vercel con `npm run build:public`) y usa "Instalar aplicación" del navegador.

### Cuenta de producción

Las credenciales de producción no se guardan en el repositorio. El propietario debe usar un gestor de secretos y crear responsables desde el panel global; las cuentas de prueba antiguas no son fixtures válidos para E2E.

## Configuración de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ejecuta las migraciones en orden desde `supabase/migraciones/`
3. Ejecuta las políticas RLS desde `supabase/politicas-rls/`
4. Ejecuta las funciones desde `supabase/funciones/`
5. Actualiza la URL y anon key en `js/datos/supabase-client.js`

## Estructura del Proyecto

```
├── index.html              ← Punto de entrada SPA (PWA)
├── public/                 ← Recursos PWA servidos sin hash por Vite
│   ├── manifest.json       ← Manifiesto PWA
│   ├── sw.js               ← Service Worker
│   └── offline.html        ← Fallback sin conexión
├── paginas/                ← HTML directos (login, admin)
├── public-site/            ← Landing de Vercel (enlaza a /app)
├── css/                    ← ITCSS (7 capas)
├── js/
│   ├── core/               ← Router, Store, EventBus
│   ├── dominio/            ← Lógica pura (SM-2, progreso)
│   ├── datos/              ← Repositorios Supabase
│   ├── vistas/             ← Controladores de página
│   └── utilidades/         ← Helpers
├── android/                ← Capacitor (APK EN PAUSA, no usar por ahora)
├── supabase/
│   ├── migraciones/        ← SQL versionado
│   ├── politicas-rls/      ← RLS policies
│   └── funciones/          ← Postgres functions
└── CONVENCIONES.md         ← Convenciones del proyecto
```
