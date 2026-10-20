# Plan de Migración: Auth custom → Supabase Auth real

**Estado:** plan aprobado (Opción B + emails sintéticos + solo owner crea cuentas). ✅ **Fase 1 entregada**: 3 migraciones SQL listas para revisar (`028_auth_esquema.sql`, `028_auth_migracion_datos.sql`, `028_auth_politicas.sql`). **No se ha ejecutado nada.**
**Objetivo:** eliminar la autenticación custom (tabla `perfiles.password` + login client-side) y sustituirla por Supabase Auth (JWT + `auth.uid()`), cerrando la política RLS abierta a `anon` que hoy permite a cualquiera leer/escribir todas las tablas.

---

## 0. Aclaración rápida (sin tecnicismos)

**Sí se usará email, pero uno falso e invisible.** Supabase Auth solo sabe identificar personas por email (o teléfono); no se puede cambiar. El truco estándar: a cada usuario se le asigna automáticamente un email sintético `username@formsbiblicos.local`, que **nadie ve ni usa**: ni tú, ni los usuarios, ni el formulario de login, ni el panel admin. Nadie tiene que dar su correo real ni verificarlo. Los usuarios siguen entrando con **usuario + contraseña, exactamente igual que hoy**.

**Nadie cambia su contraseña por la migración.** La migración es "perezosa": cada usuario conserva la contraseña que ya conoce; en su primer acceso tras el cambio se valida contra el hash antiguo y se convierte internamente al nuevo formato, sin que el usuario haga nada. Las cuentas nuevas las crea **solo el propietario** (tú), poniendo tú el usuario y la contraseña inicial (igual que hoy en el panel).

**Opción A vs Opción B** — se refiere solo a *cómo se enlazan* dos tablas de usuarios (la de la app, `perfiles`, y la interna de auth de Supabase):

| | Opción B (recomendada) | Opción A (alternativa) |
|---|---|---|
| Idea | **Un solo id**: `perfiles.id` pasa a ser el mismo id que usa Supabase | **Dos ids**: se conserva `perfiles.id` y se añade la columna `auth_id` que enlaza con Supabase |
| Datos existentes | Se ejecuta **un script único** que renumera los ids en todas las tablas (con copia de seguridad y verificación) | **No se toca ningún dato** |
| Complejidad futura | Mínima: el SQL de permisos es el estándar (`id = auth.uid()`) y el ya escrito en `001_global_policies.sql` vale tal cual | Los permisos necesitan un helper extra para traducir entre los dos ids |
| Riesgo | El riesgo está en ese script único (mitigado con backup + staging) | Riesgo cero en la migración, pero más piezas que mantener para siempre |

> **Recomendación: Opción B.** Para una app pequeña con un único responsable, un solo id es lo más simple y lo que recomienda Supabase. La A solo tiene sentido si no se quiere ejecutar el script de renumeración de ids. En ambas opciones el login sigue siendo usuario+contraseña y el email es sintético e invisible.

---

## 1. Estado actual (lo que hay que cambiar)

| Pieza | Estado hoy | Problema |
|---|---|---|
| Login | `authRepository.iniciarSesion(usuario, password)` consulta `perfiles` por `username` y compara SHA-256 **en el cliente** (o texto plano legacy) | Todo el hash es público; cualquier anon puede leer `perfiles` y robar/crackear credenciales |
| Sesión | `fb_usuario` (JSON completo con `rol`) en localStorage | Forjable: editar `rol` y recargar da acceso admin (mitigado parcialmente con revalidación, pero la raíz es el modelo) |
| RLS | `supabase/politicas-rls/002_anon_custom_auth.sql` abre **todas** las tablas a `anon` (`FOR ALL ... USING (true) WITH CHECK (true)`) + `GRANT ALL TO anon` | Toma de control total de cualquier cuenta, auto-calificación de exámenes, lectura de auditoría |
| Identidad | `perfiles.id` = UUID generado con `gen_random_uuid()` (no relacionado con `auth.users`) | Hay que enlazar identidad y datos |
| Creación de usuarios | Solo el admin: `adminRepository.crearUsuario(...)` inserta en `perfiles` con password hasheado en cliente | Debe migrar a Supabase Auth |
| Emails | `perfiles.email` nullable y probablemente vacío en la mayoría | Supabase Auth firma con email/phone; hay que decidir cómo |

**Lo que ya está listo y se reutiliza:**
- `supabase/funciones/auth_helpers.sql` ya define `es_owner()`, `es_admin_del_grupo()`, `es_editor_del_grupo()`, `es_miembro_del_grupo()`, `es_propio_usuario()`, `rol_actual()` basadas en `auth.uid()`.
- `supabase/politicas-rls/001_global_policies.sql` ya contiene las políticas restrictivas correctas (hoy desactivadas/sustituidas por las abiertas).

---

## 2. Decisiones clave (a confirmar antes de implementar)

### 2.1 Modelo de identidad

**Opción B (recomendada): `perfiles.id = auth.users.id`** — el patrón canónico de Supabase.
- Todas las FKs existentes (`miembros_grupo.usuario_id`, `progreso_lectura.usuario_id`, `intentos_examen_personalizado.alumno_id`, `tarjetas_memorizacion.usuario_id`, `grupos.admin_id`, …) siguen apuntando a `perfiles.id` sin cambios.
- Todo el código de la app usa `usuario.id`; no cambia nada.
- Las políticas de `001_global_policies.sql` y los helpers `auth_helpers.sql` quedan **válidos tal cual** (`id = auth.uid()`).
- Coste: crear las filas en `auth.users` con **el mismo id** que ya tiene cada perfil (ver §3). **No se renumera NINGÚN id**: no se tocan FKs ni código de la app. La mejora sobre el borrador inicial es que no hace falta el remap de FKs ni `tmp_auth_map`.

**Opción A (fallback conservador): añadir columna `auth_id UUID REFERENCES auth.users(id)`** sin tocar `perfiles.id`.
- Cero reescritura de datos; migración aditiva y reversible.
- Pero conviven dos ids; todas las políticas/helpers deben resolverse vía helper `mi_id()` (`SELECT id FROM perfiles WHERE auth_id = auth.uid()`), hay riesgo de deriva y el código 001 escrito no sirve tal cual.

> **Recomendación:** Opción B. La base es pequeña (centro educativo), el remap se hace en un script versionado con backup y el resultado es el patrón estándar. Si el equipo no quiere reescribir datos en producción, se usa A (el plan SQL de RPCs es idéntico, solo cambian las cláusulas `id = auth.uid()` por `auth_id = auth.uid()`).

### 2.2 Login: email vs username

Supabase Auth firma con **email** (o teléfono); no hay sign-in nativo por username. Opciones:

1. **Cambiar el login a email** (estándar, pero cambia UX y obliga a que todos los usuarios sepan su email).
2. **Mantener el campo "Usuario" en el formulario** y resolver username → email con una RPC `auth_login(username, password)` `SECURITY DEFINER` que:
   - Resuelve el email y valida la contraseña (bcrypt de `auth.users` vía `crypt()`, o hash legacy).
   - Devuelve `{ ok, email }` y el cliente llama a `supabase.auth.signInWithPassword({ email, password })`.

> **Recomendación:** opción 2 (UX idéntica a la actual). La RPC es además el punto donde se hace la **migración perezosa de contraseñas** (ver §4.4).

### 2.3 Emails — 100% sintéticos e invisibles

**Nadie da su correo y nadie lo ve.** El email de auth es siempre `username@formsbiblicos.local` (calculado automáticamente, con `email_confirmed_at = now()` para no pedir verificación). La columna `perfiles.email` existente **no se usa para auth**: se conserva (nullable) solo como dato de contacto opcional del owner, nunca en el login ni en pantalla. `auth.users.email` queda como el sintético, que además garantiza unicidad porque `username` ya es único.

### 2.4 Dónde vive la lógica privilegiada

La app **no tiene backend propio**. Dos vías para las acciones de administración (crear usuario, resetear contraseña, eliminar usuario, cambiar rol):

- **Vía RPC SQL `SECURITY DEFINER`** (recomendada: encaja con el proyecto, que gestiona todo por migraciones SQL). Las funciones corren como `postgres` (saltan RLS) y **deben validar explícitamente al llamante** antes de actuar.
- Vía Edge Function con `service_role` (más potente: `auth.admin.createUser`, invites). **La `service_role` jamás va al cliente.** Requiere introducir Edge Functions al proyecto.

> **Recomendación:** RPCs `SECURITY DEFINER` para lo mínimo imprescindible (`auth_login`, `admin_crear_usuario`, `admin_cambiar_password`, `admin_eliminar_usuario`). **Creación de usuarios: SOLO el propietario (`es_owner()`)** — los admins/editors no ven el botón de crear y la RPC lo rechaza. Lo mismo para eliminar usuarios y cambiar roles de nivel superior.

### 2.5 Registro público: desactivado

- En el dashboard de Supabase: desactivar **"Allow new users to sign up"**.
- La app **nunca** expone `supabase.auth.signUp` ni un formulario de registro.
- La única vía de creación de cuentas es el propietario vía `admin_crear_usuario` (la RPC no es invocable por anon).

### 2.4 Dónde vive la lógica privilegiada

La app **no tiene backend propio**. Dos vías para las acciones de admin (crear usuario, resetear contraseña, eliminar usuario, cambiar rol):

- **Vía RPC SQL `SECURITY DEFINER`** (recomendada: encaja con el proyecto, que gestiona todo por migraciones SQL). Las funciones corren como `postgres` (saltan RLS) y **deben validar explícitamente al llamante** con `es_owner()/es_admin_del_grupo()` antes de actuar.
- Vía Edge Function con `service_role` (más potente: `auth.admin.createUser`, invites). **La `service_role` jamás va al cliente.** Requiere introducir Edge Functions al proyecto.

> **Recomendación:** RPCs `SECURITY DEFINER` para lo mínimo imprescindible (`auth_login`, `admin_crear_usuario`, `admin_cambiar_password`, `admin_eliminar_usuario`), reservando Edge Functions para un futuro si se necesita invitación por email.

---

## 3. Migración de datos (Opción B) — SIN remap: los ids se conservan

**Precondición:** backup completo (pg_dump + backup de consola). `perfiles.id` son UUIDs `gen_random_uuid()`; la estrategia final es insertar en `auth.users` la fila de cada perfil **usando ese mismo id**. Así:

- No se toca ni una FK ni el código de la app (`usuario.id` sigue valiendo lo mismo).
- No hace falta `tmp_auth_map` ni ventana de mantenimiento larga ni remap.
- La cola offline (IndexedDB) con ids de filas **sigue funcionando** (los ids no cambian).

```
1. BACKUP: CREATE TABLE respaldo_perfiles_pre_auth AS SELECT * FROM perfiles;

2. Por cada perfil (bucle):
   INSERT INTO auth.users (id = perfiles.id, instance_id NULL, aud 'authenticated',
     role 'authenticated', email = email_sintetico(username),  -- username@formsbiblicos.local
     encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf'))  -- provisional
     email_confirmed_at = now(),
     raw_app_meta_data = {"provider":"email","providers":["email"]},
     raw_user_meta_data = {username, nombre_completo, rol})
   ON CONFLICT (id) DO NOTHING;

   INSERT INTO auth.identities (provider='email', user_id = perfiles.id, id = perfiles.id,
     identity_data = {sub: id, email})
   -- REQUERIDO por GoTrue para que signInWithPassword funcione
   -- (el INSERT del trigger handle_new_user no interfiere: ON CONFLICT (id) DO NOTHING)

3. Trigger handle_new_user + RPCs → migración 028_auth_esquema.sql

4. Grants/políticas → migración 028_auth_politicas.sql
```

**Email sintético:** función `email_sintetico(username)` = `username@formsbiblicos.local` saneado (lowercase, caracteres no alfanuméricos → `-`); si dos usernames colisionan tras sanear (p.ej. `Ana` vs `ana`, `Juan Pérez` vs `juanperez`), al segundo se le añade un sufijo hash determinista. La misma función se usa en la migración, en `admin_crear_usuario` y en `auth_login` (siempre con el username **canónico** del perfil).

**Nota offline:** al no cambiar ningún id, la cola offline funciona sin cambios. Por precaución se recomienda vaciarla antes del corte.

---

## 4. RLS y funciones nuevas

### 4.1 Estado final de políticas

- **Desactivar** `002_anon_custom_auth.sql`: borrar `perfiles_anon_all`, `grupos_anon_all`, … y **revocar** `GRANT ALL TO anon`.
- **Activar** `001_global_policies.sql` (ya escrito) y **auditar tabla por tabla** que todas tengan política propia. Inventario mínimo de tablas a cubrir (algunas ya en 001): `perfiles`, `grupos`, `miembros_grupo`, `progreso_lectura`, `preguntas_sistema`, `examenes_personalizados`, `intentos_examen_personalizado`, `tarjetas_memorizacion`, `repasos_memorizacion`, `logros`, `logros_usuario`, `auditoria`, `notificaciones`, `sugerencias`, `evaluaciones`, `mazos_memorizacion`, `progreso_tarjetas_memorizacion`, `categorias_memorizacion`, `categorias_tarjetas`, `notas_capitulo`, `notas_personales`, `desafios`, `desafio_participantes`, `backups`, `configuracion`.

### 4.2 Proteger `perfiles` de auto-escalada

Un usuario no debe poder cambiarse `rol`, `grupo_id`, `activo`, `username` ni `password`:
- Política de UPDATE propia: `USING/WITH CHECK (id = auth.uid())` + **grants por columna**:
  ```sql
  GRANT UPDATE (nombre_completo, foto_perfil, preferencias) ON perfiles TO authenticated;
  REVOKE UPDATE (rol, grupo_id, activo, username, email, password) ON perfiles FROM authenticated;
  ```
- Los cambios de rol/grupo/activo se hacen **solo** vía RPC `SECURITY DEFINER` que verifica `es_admin_del_grupo(...) OR es_owner()`.

### 4.3 Helpers y políticas

`auth_helpers.sql` no cambia (Opción B). Políticas de referencia ya en 001:
```sql
CREATE POLICY "perfiles_lectura_propios_o_admin" ON perfiles FOR SELECT USING (
  id = auth.uid() OR es_admin_del_grupo(grupo_id) OR es_owner());
CREATE POLICY "perfiles_actualizacion_propia" ON perfiles FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
```
(Con los grants por columna del §4.2, la política de UPDATE propia no permite escalar rol.)

### 4.4 RPCs `SECURITY DEFINER` necesarias

```sql
-- 1) Login + migración perezosa. Ejecutable por anon (es el "endpoint" de login).
CREATE OR REPLACE FUNCTION auth_login(p_username TEXT, p_password TEXT)
RETURNS TABLE (ok BOOLEAN, email TEXT, requiere_verificacion BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_email TEXT; v_uid UUID; v_hash_legacy TEXT; v_bcrypt TEXT; v_activo BOOLEAN;
BEGIN
  SELECT p.email, p.password, p.activo INTO v_email, v_hash_legacy, v_activo
  FROM perfiles p WHERE p.username = p_username;
  IF v_email IS NULL THEN RETURN QUERY SELECT false, NULL::TEXT, false; RETURN; END IF;
  IF NOT v_activo THEN RETURN QUERY SELECT false, NULL::TEXT, false; RETURN; END IF;
  -- Comprobar bcrypt actual de auth.users
  SELECT id, encrypted_password INTO v_uid, v_bcrypt
  FROM auth.users WHERE email = v_email;
  IF v_uid IS NOT NULL AND v_bcrypt = crypt(p_password, v_bcrypt) THEN
    RETURN QUERY SELECT true, v_email, false; RETURN;
  END IF;
  -- Fallback legacy (SHA-256 hex o texto plano) → migrar a bcrypt en el acto
  IF v_hash_legacy IS NOT NULL
     AND (v_hash_legacy = encode(digest(p_password, 'sha256'), 'hex')
          OR v_hash_legacy = p_password) THEN
    UPDATE auth.users SET encrypted_password = crypt(p_password, gen_salt('bf')),
                          email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE email = v_email;
    RETURN QUERY SELECT true, v_email, false; RETURN;
  END IF;
  RETURN QUERY SELECT false, NULL::TEXT, false;
END $$;
GRANT EXECUTE ON FUNCTION auth_login TO anon;
```
> ⚠️ Antes de desplegarla: control de fuerza bruta (pequeño `pg_sleep` tras N fallos por username, o un contador en una tabla `intentos_login`), y quitar la rama de texto plano en cuanto no haya cuentas legacy.

```sql
-- 2) Creación de usuario. SOLO el propietario (es_owner). Sin emails: el email
--    de auth es siempre el sintético username@formsbiblicos.local.
CREATE OR REPLACE FUNCTION admin_crear_usuario(p_username TEXT, p_password TEXT,
  p_nombre TEXT, p_rol TEXT, p_grupo_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_uid UUID; v_email TEXT;
BEGIN
  IF NOT es_owner() THEN RAISE EXCEPTION 'Solo el propietario puede crear usuarios'; END IF;
  IF EXISTS (SELECT 1 FROM perfiles WHERE username = p_username) THEN
    RAISE EXCEPTION 'Ese nombre de usuario ya existe'; END IF;
  v_email := lower(p_username) || '@formsbiblicos.local';
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at,
                          raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), v_email, crypt(p_password, gen_salt('bf')), now(),
          jsonb_build_object('username', p_username, 'nombre_completo', p_nombre),
          'authenticated', 'authenticated')
  RETURNING id INTO v_uid;                    -- el trigger crea la fila en perfiles
  UPDATE perfiles SET rol = p_rol, grupo_id = p_grupo_id, activo = true WHERE id = v_uid;
  RETURN v_uid;
END $$;
GRANT EXECUTE ON FUNCTION admin_crear_usuario TO authenticated;
```
(Análogas, también validadas con `es_owner()`: `admin_cambiar_password`, `admin_eliminar_usuario` — borra de `auth.users` y la FK cascada limpia `perfiles` + datos con `ON DELETE CASCADE`; `admin_cambiar_rol`, `admin_toggle_activo`.)

### 4.5 Cambio de contraseña por el propio usuario

`supabase.auth.updateUser({ password })` desde el cliente (no necesita RPC). El bloqueo de cuenta (activo=false) se implementa como hoy: `auth_login` lo rechaza y las políticas `es_*` solo devuelven true con `activo = true`.

---

## 5. Cambios en el cliente (cuando se apruebe pasar a código)

| Archivo | Cambio |
|---|---|
| `js/datos/supabase-client.js` | `createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: localStorage } })` |
| `js/datos/auth-repository.js` | `iniciarSesion` → `rpc('auth_login', { username, password })` + `signInWithPassword({ email })`; `cerrarSesion` → `signOut()`; hook `onAuthStateChange` que cargue `perfiles` por `id = auth.uid()` y publique `auth:login`/`auth:logout` |
| `js/core/index.js` | Reemplazar `_recuperarSesion`/`_revalidarSesion` por `getSession()` + `onAuthStateChange`. **Desaparece la forja de localStorage por completo (sesión JWT)** |
| `js/vistas/vista-login.js` | Mismo formulario de username (resuelto por la RPC); eliminar la comparación local de hash |
| `js/vistas/admin/*` + `js/datos/admin-repository.js` | `crearUsuario`/`cambiarPassword`/`eliminarUsuario`/`cambiarRol`/`toggleActivo` → llamar a las RPCs; **nunca** tocar `perfiles.password` desde el cliente. El botón de crear/eliminar solo se muestra al owner (`rol === 'owner'`) |
| `js/vistas/vista-perfil.js` (seguridad) | Cambiar contraseña con `auth.updateUser` |
| `js/utilidades/dom-helpers.js` | `hashPassword` deja de usarse (se elimina o queda como utilidad muerta) |
| e2e (`e2e-*.cjs`) | Actualizar credenciales/flujo de login al nuevo modelo |

---

## 6. Fases y orden de despliegue

1. **Fase 0 — Preparación (1–2 días):** backup; inventario exacto de columnas FK y de tablas sin política; decisión 2.1/2.2/2.3; entorno staging.
2. **Fase 1 — SQL (✅ entregada, `028_auth_*`):** `028_auth_esquema.sql` (helpers SECURITY DEFINER, trigger `handle_new_user`, `email_sintetico`, RPC `auth_login` con migración perezosa + rate-limit, RPCs de admin solo-owner, `enviar_notificacion`), `028_auth_migracion_datos.sql` (crea `auth.users`+`auth.identities` con los mismos ids, con backup y guarda de doble ejecución), `028_auth_politicas.sql` (cierra RLS: revoke de anon, políticas `auth.uid()` tabla por tabla, grants por columna anti-escalada, habilita RLS en `notas_capitulo`/`notas_personales` que estaban desactivadas). **Verificación pendiente:** probar cada RPC como cada rol en staging.
3. **Fase 2 — Cliente:** cambios del §5, mantener compatibilidad (el login antiguo puede seguir funcionando mientras `perfiles.password` exista, pero NO se usa para el corte).
4. **Fase 3 — Corte (cutover):** eliminar las políticas abiertas `002`; limpiar `GRANT ALL TO anon`; verificar login de un usuario migrado (legacy) y de uno nuevo. **Rollback:** restaurar backup; las políticas abiertas siguen en git para re-aplicar si algo falla.
5. **Fase 4 — Limpieza y endurecimiento (post-corte, tras 1–2 semanas):** `DROP COLUMN perfiles.password`; eliminar rama legacy de `auth_login`; rate-limit de login; monitorizar `auth.audit_log_entries`; revisar tokens (expiración, refresh).

## 7. Checklist de pruebas (cada rol: usuario, editor, admin, owner)

- [ ] Login con contraseña legacy (migración perezosa en primer acceso) y con contraseña ya migrada
- [ ] Sesión persistente tras recarga/cierre de pestaña; logout limpio
- [ ] Cuenta desactivada no puede iniciar sesión ni mantener sesión
- [ ] Un usuario NO puede cambiar su `rol`/`grupo_id`/`activo` (ni por UI ni por API)
- [ ] SOLO el owner crea/edita/desactiva/elimina usuarios; admin/editor no ven los botones y la RPC los rechaza; los datos se limpian en cascada
- [ ] Cambio de contraseña propio funciona y revoca sesiones antiguas (si se activa la opción)
- [ ] Offline: la cola de sync sigue funcionando sin tocar auth
- [ ] e2e completos (`e2e-*.cjs`) en verde con las nuevas credenciales
- [ ] Auditoría: `es_owner()` y `es_admin_del_grupo()` devuelven lo esperado en cada política

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Remap de ids rompe datos | **No aplica**: la implementación final conserva los ids (INSERT en `auth.users` con el mismo `perfiles.id`); backup + staging + guarda de doble ejecución de todos modos |
| Usuarios con email duplicado o nulo | No aplica: el email de auth es siempre el sintético derivado del `username` (único) |
| Correos reales guardados antes en `perfiles.email` | No se usan para auth; se conservan como dato opcional del owner o se borran si se prefiere |
| RPC `auth_login` como oráculo de contraseñas | Rate-limit, `pg_sleep` tras fallos, eliminar rama texto plano, monitorizar |
| `SECURITY DEFINER` mal protegida | Regla de oro: toda función empieza validando `es_owner()/es_admin_del_grupo()`; revisión de cada una |
| Usuarios que no vuelven a entrar nunca (nunca migran su password) | El acceso legacy permanece activo hasta que se decida el cierre; el trigger cubre a los nuevos |
| Cola offline con ids antiguos | No aplica (los ids no cambian); aun así, vaciar la cola antes del corte por precaución |

---

## 9. Apéndice — Fase 1 entregada (3 migraciones SQL, sin ejecutar)

### 9.1 `supabase/migraciones/028_auth_esquema.sql` (aplicar primero — inocuo)

- `perfiles.password` → `DROP NOT NULL`.
- Helpers `es_*()` redefinidos como `SECURITY DEFINER SET search_path` (evita la recursión infinita de RLS al usarse dentro de políticas). **`es_miembro_del_grupo` también considera `perfiles.grupo_id`** (la "clase principal" no crea fila en `miembros_grupo`; sin esto los alumnos no verían sus exámenes).
- `email_sintetico(username)` → email falso determinista con desambiguación por hash si hay colisión.
- Trigger `handle_new_user` (crea el perfil al crearse un `auth.users`, id = auth.users.id).
- RPC `auth_login(username, password)` → devuelve el email sintético si las credenciales valen; migra la contraseña legacy (SHA-256 o texto plano) a bcrypt **al vuelo**; rate-limit (5 fallos/10 min por username) + `pg_sleep`; mensajes genéricos anti-enumeración. Ejecutable por `anon`.
- RPCs de admin (solo `es_owner()`): `admin_crear_usuario`, `admin_actualizar_usuario` (valida colisión de username antes de tocar auth), `admin_cambiar_rol`, `admin_toggle_activo`, `admin_eliminar_usuario` (borra `intentos` del alumno — FK NOT NULL sin cascada —, bloquea auto-eliminación, limpia FKs + `auth.admin_delete_user`), con protección del último owner. Ejecutables solo por `authenticated`.
- RPC `asegurar_grupo()` (cualquier autenticado): replica el `asegurarGrupo` del cliente creando la clase principal + fila en `miembros_grupo`, porque con el RLS cerrado el usuario ya no puede tocarse su `grupo_id`.
- RPC `enviar_notificacion(...)` (las notificaciones ajenas dejarán de poder insertarse por RLS con el cutover).
- Tabla interna `login_intentos` con RLS y sin políticas (solo accesible por la RPC).

### 9.2 `supabase/migraciones/028_auth_migracion_datos.sql` (una sola vez, tras la A)

- Backup `respaldo_perfiles_pre_auth`.
- Bucle por perfil: INSERT en `auth.users` (id = `perfiles.id`, email sintético confirmado, password provisional aleatoria, metadata) + `auth.identities` (provider `email`). Guarda de doble ejecución.
- La contraseña real queda intacta en `perfiles.password` para la migración perezosa.

### 9.3 `supabase/migraciones/028_auth_politicas.sql` (SOLO en el cutover, tras desplegar el cliente nuevo)

- `REVOKE ALL ON ALL TABLES ... FROM anon` + default privileges endurecidos.
- Políticas `auth.uid()` tabla por tabla (28 tablas): propia/profesor/owner según el rol; incluye el **mazo global** (`es_global`), la auto-inscripción a grupos como `miembro`, la salida propia, el creador de desafíos invitando rivales.
- Habilita RLS en **`notas_capitulo` y `notas_personales`** (hoy DESACTIVADA — hueco real) y en `evaluaciones`.
- **Anti-escalada** en `perfiles`: grants de columna (no se puede UPDATE `rol/username/password/activo/grupo_id`, ni SELECT `password` ni `email`; INSERT/DELETE denegados).
- **`categorias_memorizacion` / `categorias_tarjetas`**: se restablecen sus grants (el `REVOKE ALL` global las había dejado sin acceso pese a sus políticas de 012).
- **Residuo documentado**: la nota de exámenes objetivos y la puntuación de desafíos se calculan en el cliente (diseño actual); el RLS limita a las propias filas pero no impide subirse la propia nota. Cerrarlo del todo = RPCs de entrega/corrección con cálculo en servidor (Fase 3).
- `storage.objects` (avatars): INSERT restringido a la propia carpeta.
- Corrige la política rota de `preguntas_sistema` (usaba `perfiles p ON p.grupo_id IS NOT NULL LIMIT 1`).

### 9.4 Orden de cutover (4 pasos, con rollback en cada uno)

```
1. Aplicar 028_auth_esquema.sql        → rollback: nada que revertir (no cambia comportamiento)
2. Aplicar 028_auth_migracion_datos.sql → rollback: borrar auth.users/identities creados
3. Desplegar el cliente de la Fase 2    → rollback: restaurar la versión anterior del cliente Android
4. Aplicar 028_auth_politicas.sql       → rollback: reaplicar 002_anon_custom_auth.sql
5. (Semanas después) Limpieza: DROP COLUMN perfiles.password; quitar rama legacy de auth_login
```

### 9.5 Cambios de cliente pendientes (Fase 2, a implementar cuando se apruebe)

- `auth-repository.iniciarSesion` → `rpc('auth_login')` + `signInWithPassword`; `cerrarSesion` → `signOut()`; `onAuthStateChange`.
- `supabase-client.js`: persistSession con JWT (desaparece la forja de rol).
- `admin-repository`: las acciones de usuario pasan a las RPCs (nunca tocar `perfiles.password`); ocultar crear/eliminar a no-owners.
- `auth-repository.asegurarGrupo` → `rpc('asegurar_grupo')` (ya no puede hacer UPDATE de `grupo_id` por la API).
- `vista-perfil`: cambiar contraseña propia con `auth.updateUser`.
- `desafios/notificaciones`: insertar notificaciones ajenas vía `enviar_notificacion`.
- e2e: actualizar credenciales y flujo de login.
