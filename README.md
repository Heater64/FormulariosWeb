# FormsBiblicos

Plataforma de estudio bíblico guiado con dos mundos: **Estudio Guiado** (lectura → preguntas → repaso → memorización → completar la Biblia) y **Exámenes Personalizados** (el profesor crea, asigna, corrige y califica).

## Stack

- **Frontend**: HTML + CSS + JavaScript nativo (sin frameworks)
- **Backend**: Supabase (Postgres, Auth, RLS, Storage, Realtime)
- **Arquitectura CSS**: ITCSS + BEM + Custom Properties
- **Arquitectura JS**: Router SPA + Store central + EventBus + Repositorios

## Inicio Rápido

1. Clona el repositorio
2. Abre `index.html` en un servidor local (Live Server, http-server, etc.)
3. O usa la página de login directa: `paginas/login.html`

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
├── index.html              ← Punto de entrada SPA
├── paginas/                ← HTML directos (login, admin)
├── css/                    ← ITCSS (7 capas)
├── js/
│   ├── core/               ← Router, Store, EventBus
│   ├── dominio/            ← Lógica pura (SM-2, progreso)
│   ├── datos/              ← Repositorios Supabase
│   ├── vistas/             ← Controladores de página
│   └── utilidades/         ← Helpers
├── supabase/
│   ├── migraciones/        ← SQL versionado
│   ├── politicas-rls/      ← RLS policies
│   └── funciones/          ← Postgres functions
└── CONVENCIONES.md         ← Convenciones del proyecto
```
