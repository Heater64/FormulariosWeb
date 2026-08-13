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

## Versionado (sigue activo)

La versión vive en `package.json` (SemVer). Para subirla **de vez en cuando** (no en cada push):

```bash
npm run version:patch   # 1.0.12 → 1.0.13
npm run version:minor   # 1.0.12 → 1.1.0
npm run version:major   # 1.0.12 → 2.0.0
```

Al subir la versión, actualiza también `CACHE_VERSION` en `sw.js` para que los clientes limpien la caché antigua del service worker.

## Stack

- **Frontend**: HTML + CSS + JavaScript nativo (sin frameworks), PWA (`manifest.json` + `sw.js`)
- **Backend**: Supabase (Postgres, Auth, RLS, Storage, Realtime)
- **Arquitectura CSS**: ITCSS + BEM + Custom Properties
- **Arquitectura JS**: Router SPA + Store central + EventBus + Repositorios

## Inicio Rápido

1. Clona el repositorio
2. Abre `index.html` en un servidor local (Live Server, http-server, `npm run dev`, etc.)
3. O usa la página de login directa: `paginas/login.html`
4. Para probar la instalación PWA: despliega en https (p. ej. Vercel con `npm run build:public`) y usa "Instalar aplicación" del navegador.

### Usuarios de Prueba

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `owner` | `owner123` | Owner |
| `admin1` | `admin123` | Admin |
| `editor1` | `editor123` | Editor |
| `alumno` | `alumno123` | Usuario |

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
