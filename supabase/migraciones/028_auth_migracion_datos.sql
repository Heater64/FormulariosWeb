-- ============================================================================
-- MIGRACIÓN 028-B: Supabase Auth — Migración de cuentas existentes
-- ============================================================================
-- Objetivo: crear en auth.users una cuenta por cada perfiles actual, usando
-- EL MISMO id (Opción B). Así NO se toca ni una sola FK ni el código de la
-- app: perfiles.id sigue siendo la clave de todo.
--
-- QUÉ HACE:
--   1. Copia de seguridad de perfiles (respaldo_perfiles_pre_auth)
--   2. Por cada perfil: INSERT en auth.users con id = perfiles.id, email
--      sintético (username@formsbiblicos.local, confirmado), contraseña
--      aleatoria de relleno y metadata (username/nombre/rol).
--   3. INSERT en auth.identities (provider='email') — REQUERIDO por GoTrue
--      para que signInWithPassword funcione.
--
-- LA CONTRASEÑA REAL NO SE TOCA: sigue en perfiles.password. El primer login
-- de cada usuario pasa por auth_login() que la valida contra el hash legacy y
-- la convierte a bcrypt en auth.users al vuelo (migración perezosa).
-- Cuando todos los usuarios hayan entrado al menos una vez (semanas después),
-- una migración de limpieza eliminará perfiles.password.
--
-- IMPORTANTE:
--   * Ejecutar SOLO UNA VEZ, tras 028_auth_esquema.sql y ANTES del cutover.
--   * La app sigue funcionando con auth custom mientras tanto (inocuo).
--   * Probar SIEMPRE primero en un proyecto staging (inserta directamente en
--     auth.users / auth.identities, esquemas internos de Supabase).
--   * ROLLBACK: eliminar los auth.users creados (con sus identities) basta;
--     perfiles y todos los datos quedan intactos.
-- ============================================================================

-- 1) Copia de seguridad (idempotente: si ya existe, no la sobreescribe)
CREATE TABLE IF NOT EXISTS respaldo_perfiles_pre_auth AS SELECT * FROM public.perfiles;

-- 1b) Garantizar pgcrypto en extensions (Supabase reciente ya no lo expone en public)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2) Guarda contra doble ejecución
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email LIKE '%@formsbiblicos.local') THEN
    RAISE EXCEPTION
      'Ya existen cuentas con dominio @formsbiblicos.local en auth.users. Esta migración solo se ejecuta UNA vez.';
  END IF;
END $$;

-- 3) Crear las cuentas de auth
DO $$
DECLARE
  r RECORD;
  v_email TEXT;
  v_count INTEGER := 0;
  v_skip INTEGER := 0;
BEGIN
  FOR r IN SELECT * FROM public.perfiles ORDER BY creado_en LOOP
    -- IMPORTANTE: pasar el username CANÓNICO (sin normalizar) para que el
    -- email sintético coincida exactamente con el que calculará auth_login().
    v_email := public.email_sintetico(r.username);

    -- auth.users con el MISMO id que perfiles. La contraseña de relleno es un
    -- hash bcrypt aleatorio e inverificable (nadie la conoce); el login real
    -- pasa por auth_login() y la migración perezosa. Se usa pgcrypto
    -- (crypt/gen_salt de public), no auth.crypt/auth.gen_salt (eliminadas en
    -- Supabase reciente).
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      r.id, NULL, 'authenticated', 'authenticated', v_email,
      extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', r.username, 'nombre_completo', r.nombre_completo, 'rol', r.rol),
      coalesce(r.creado_en, now()), now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- auth.identities: GoTrue exige una identidad provider='email' para el login
    IF EXISTS (SELECT 1 FROM auth.identities WHERE user_id = r.id AND provider = 'email') THEN
      v_skip := v_skip + 1;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'auth' AND table_name = 'identities'
                    AND column_name = 'provider_id') THEN
      EXECUTE 'INSERT INTO auth.identities
                 (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
               VALUES ($1, $1, $1::text, $2, ''email'', now(), now(), now())'
        USING r.id, jsonb_build_object('sub', r.id::text, 'email', v_email);
      v_count := v_count + 1;
    ELSE
      INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      VALUES (r.id, r.id, jsonb_build_object('sub', r.id::text, 'email', v_email), 'email', now(), now(), now());
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Migración de auth: % cuentas creadas, % ya existían.', v_count, v_skip;
END $$;

-- 4) Verificación
SELECT '✅ 028-B aplicada: ' || count(*)::text || ' cuentas en auth.users con email sintético' AS mensaje
  FROM auth.users WHERE email LIKE '%@formsbiblicos.local';

-- RECORDATORIO (no bloqueante):
--   * perfiles.password se conserva para la migración perezosa de cada login.
--   * Cuando todos hayan entrado al menos una vez, aplicar una migración de
--     limpieza: ALTER TABLE perfiles DROP COLUMN IF EXISTS password;
--   * Vaciar la cola offline (sync-queue) ANTES del cutover por precaución.
