# Cyber Neo — Informe de Seguridad: FormulariosWeb (FormsBiblicos)

**Fecha:** 2026-08-09 · **Herramienta:** Cyber Neo v0.1 · **Análisis:** 100% Claude-native (sin semgrep/trivy/gitleaks instalados)

---

## Resumen Ejecutivo

**Riesgo: 21/100 (Medio-Bajo)**

| Severidad | Conteo |
|-----------|--------|
| Crítico | 0 |
| Alto | 0 |
| Medio | 3 |
| Bajo | 4 |
| Info | 3 |

**Top 3 acciones prioritarias:**
1. **Corregir el bug de autorización RLS** (migración 035 pendiente de aplicar): los editores con grupo asignado por perfil NO pueden crear evaluaciones/exámenes → funcionalidad rota, no es un agujero de seguridad sino de disponibilidad (CN-001).
2. **Actualizar dependencias con CVEs moderadas** (`@capacitor/cli` → `xcode` → `uuid`): vulnerabilidad de bounds check en `uuid` v3/v5/v6 (CN-002).
3. **Añadir cabeceras de seguridad a la web** (CSP, X-Frame-Options, Referrer-Policy) en `vercel.json` — hoy solo se sirven para `/version.json` (CN-004).

---

## Hallazgos Críticos y Altos

No se detectaron vulnerabilidades críticas ni altas.

---

## Hallazgos Medios

### [CN-001] Autorización RLS rota: editores con grupo por perfil no pueden gestionar su grupo
- **Severidad:** Media (disponibilidad + autorización inconsistente)
- **CWE:** CWE-862 (Missing Authorization)
- **OWASP:** A01:2025 (Broken Access Control)
- **Archivo:** `supabase/migraciones/032_grupos_admin_id_rls.sql:57` (función `es_editor_del_grupo`)
- **Descripción:** El panel admin asigna la clase principal con `perfiles.grupo_id` sin crear fila en `miembros_grupo`. La función `es_editor_del_grupo()` solo consulta `miembros_grupo` y `grupos.admin_id`, pero NO el rol del perfil (`perfiles.rol IN ('admin','editor')` + `perfiles.grupo_id`). Resultado verificado en producción: un editor de perfil (p.ej. `rebeca`) recibe `42501 new row violates row-level security policy` al crear evaluaciones en SU propio grupo.
- **Evidencia:** `es_editor_del_grupo` de 032 no incluye la rama `perfiles.rol`; `es_miembro_del_grupo` SÍ la incluye → lectura OK, escritura denegada (comportamiento asimétrico).
- **Remediación:** Ya escrita en `supabase/migraciones/035_editor_grupo_por_perfil.sql` — amplía `es_editor_del_grupo`/`es_admin_del_grupo` con la rama de perfil y reafirma las políticas de evaluaciones/exámenes/intentos. **Pendiente de aplicar en Supabase.**

### [CN-002] Vulnerabilidades moderadas en dependencias
- **Severidad:** Media
- **CWE:** CWE-937 (Using Components with Known Vulnerabilities) / CWE-1035
- **OWASP:** A06:2021 (Vulnerable and Outdated Components)
- **Archivo:** `package.json` (devDependencies)
- **Descripción:** `npm audit` reporta 3 vulnerabilidades moderadas, todas en la cadena de devDependencies:
  - `@capacitor/cli` (vía `xcode`): 1 moderada
  - `uuid` (vía `xcode`): **Missing buffer bounds check in v3/v5/v6 when buf is provided** — el paquete `uuid` está marcado deprecated.
- **Evidencia:** `npm audit --json` → `{ moderate: 3, total: 3 }`
- **Remediación:** `npm audit fix` (hay fix disponible). No afecta al runtime de la APK (solo tooling de build), pero conviene actualizar para builds reproducibles y limpias.

### [CN-003] Cabeceras de seguridad web incompletas
- **Severidad:** Media
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **OWASP:** A05:2021 (Security Misconfiguration)
- **Archivo:** `vercel.json`
- **Descripción:** Solo `/version.json` tiene cabeceras (`X-Content-Type-Options`, `Cache-Control`, CORS). La app web completa (landing + `/app`) se sirve sin CSP, ni `X-Frame-Options`, ni `Referrer-Policy`, ni HSTS. Sin CSP, un XSS residual (aunque no se han encontrado) tendría vía libre; sin `X-Frame-Options`/`frame-ancestors`, la app es clicjeable dentro de un iframe (clickjacking).
- **Evidencia:** `vercel.json` define `headers` solo para `/version.json`.
- **Remediación:**
  ```json
  {
    "headers": [
      {
        "source": "/(.*)",
        "headers": [
          { "key": "X-Frame-Options", "value": "DENY" },
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
          { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://josxcvncescqqlajahkh.supabase.co https://formularios-web-flax.vercel.app; frame-ancestors 'none'" }
        ]
      }
    ]
  }
  ```

---

## Hallazgos Bajos e Informativos

### [CN-004] Traza de stack en consola del cliente
- **Severidad:** Baja · **CWE:** CWE-209 · **OWASP:** A05:2021
- **Archivo:** `js/vistas/vista-examen-tomar.js:90` — `if (e.stack) console.error(e.stack);`
- **Descripción:** En desarrollo es útil; en producción no expone nada al usuario (solo consola), pero conviene gatearlo por entorno.
- **Remediación:** `if (window.entorno && window.entorno.modoDemo) console.error(e.stack);` o envolver en helper `window.errores.registrar(e)`.

### [CN-005] `Math.random()` para IDs de historial de versión
- **Severidad:** Baja · **CWE:** CWE-330 · **OWASP:** A02:2021
- **Archivo:** `js/componentes/version-history.js:45` — `Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)`
- **Descripción:** No es criptográfico (es un ID de historial local, no un token), riesgo real bajo. Recomendado `crypto.randomUUID()`.
- **Remediación:** `return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);`

### [CN-006] Sesión de usuario en `localStorage` (caché de perfil)
- **Severidad:** Baja · **CWE:** CWE-922 · **OWASP:** A02:2021
- **Archivo:** `js/core/index.js:248` — `localStorage.setItem('fb_usuario', JSON.stringify(usuario))`
- **Descripción:** El perfil en caché (no el JWT — ese lo gestiona el SDK de Supabase en su propia clave) es legible por cualquier script en el origen. El JWT real vive en la clave `sb-*` del SDK con `persistSession`. El acceso está mitigado porque el RLS exige `auth.uid()`. Riesgo bajo.
- **Remediación:** No guardar `rol`/`grupo_id` en la caché si no es imprescindible; o marcar la clave como no-envuelta. Opcional: usar `sessionStorage` (ya se hace para "no recordar").

### [CN-007] Clave privada de test en submódulo playwright-mcp
- **Severidad:** Baja (test-only) · **CWE:** CWE-798
- **Archivo:** `playwright-mcp/tests/testserver/key.pem` (submódulo, no se despliega)
- **Descripción:** Clave PKCS#8 de servidor de pruebas TLS. No se usa en producción ni en la APK.
- **Remediación:** Ninguna acción requerida (submódulo de herramientas); si se publicara el repo sin el submódulo, el archivo no viaja.

---

## Vulnerabilidades de Dependencias (SCA)

| Paquete | Severidad | CVE/Tipo | Fix |
|---------|-----------|----------|-----|
| `@capacitor/cli` (via `xcode`) | moderada | — | `npm audit fix` |
| `uuid` (via `xcode`) | moderada | Missing buffer bounds check (v3/v5/v6) | `npm audit fix` |
| `xcode` | moderada | vía `uuid` | `npm audit fix` |

**Nota:** `npm audit` se ejecutó correctamente; Trivy/pip-audit no aplican (stack JS). Runtime de la APK no afectado (deps de build).

---

## Supply Chain Assessment

- **Lock file:** `package-lock.json` presente y commiteado ✓
- **Pinning:** Versiones con semver (`^`) + lock file → builds reproducibles ✓
- **`yarn.lock` en `.gitignore`:** hallazgo de `check_lockfiles.py` → **falso positivo**, el proyecto usa npm, no yarn (el `.gitignore` hereda la entrada de un proyecto previo).
- **GitHub Actions:**
  - `ci.yml`: `permissions: contents: read` ✓ (principio de mínimo privilegio)
  - `release-android.yml`: `permissions: contents: write` (necesario para crear releases) ✓
  - Actions de terceros pinneadas por tag (`@v4`) — **mejora recomendada**: pinneado a SHA completo.
  - Secrets pasados vía `env`/`GITHUB_ENV`, nunca por `echo` en log ✓
  - Sin `pull_request_target`, sin script injection (`${{ github.event.* }}` no se usa en `run:`) ✓

---

## Metadata del Escaneo

- **Archivos totales:** 2.710 (tier Medio → escaneo dirigido)
- **Archivos analizados:** 751 (scripts de secretos) + fuentes `js/` completas
- **Herramientas:** Cyber Neo nativo (Grep/Read), `npm audit`, `scan_secrets.py`, `check_lockfiles.py` · sin semgrep/trivy/gitleaks
- **Hallazgos:** 10 (0 críticos, 0 altos, 3 medios, 4 bajos, 3 info)

---

## Recomendación Final

La aplicación está en buen estado de seguridad de fondo: auth por Supabase con RLS cerrado, escape HTML consistente en vistas (helper `E()` en todos los puntos con datos de usuario), sin eval/SQL dinámico, sesión JWT gestionada por el SDK. Las acciones pendientes son: **aplicar la migración 035** (bug funcional de autorización de editores), **`npm audit fix`**, y **añadir cabeceras CSP/X-Frame en Vercel**. Tras aplicar, re-ejecutar `/cyber-neo` para confirmar.
