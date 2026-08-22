# Sistema de Grupos Profesional — Plan de Implementación

> **Para workers agénticos:** REQUIRED SUB-SKILL: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan checkboxes (`- [ ]`).

**Goal:** Convertir el sistema de clases en una experiencia profesional tipo Google Classroom: membresía unificada (una sola fuente de verdad), solicitudes de admisión con aprobación, avisos de clase, estadísticas de clase y una vista de clase con pestañas — integrado con notificaciones, desafíos y exámenes.

**Architecture:** El plan ataca las debilidades detectadas en la implementación actual: (1) doble contabilidad de membresía (`perfiles.grupo_id` vs `miembros_grupo`) que produce conteos y roles inconsistentes; (2) entrada directa sin control del profesor; (3) sin muro de avisos; (4) sin estadísticas ni historial de clase; (5) detalle de clase plano sin pestañas. Se arregla en tres capas: **migración 044** (modelo + RLS + RPCs), **repositorio** (métodos nuevos y unificación), **UI** (pestañas Personas/Avisos/Estadísticas + directorio con stats) e **integración** (notificaciones, desafío a toda la clase, exámenes de la clase). El flujo y los permisos existentes (owner global / admin de clase, migración 041) se preservan.

**Tech Stack:** Vite + vanilla JS (SPA con hash `#!`), Supabase (Postgres + RLS + RPCs `SECURITY DEFINER`), vitest. Sin dependencias nuevas.

## Global Constraints

- **Sin dependencias nuevas.** Todo se hace con el stack actual (supabase-js, vitest, JS clásico con IIFE).
- **SQL idempotente**: usar `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `CREATE OR REPLACE FUNCTION`, y el patrón DO-bloque para recrear CHECKs (igual que 024/028/040).
- **Tests**: vitest con el patrón de `tests/grupos.test.js` (cargar el script clásico con `new Function(codigo)()`, mock encadenable de `supabaseClient`).
- **UI en español**, usando los tokens CSS existentes y el archivo `css/05-componentes/_grupos.css`.
- **No subir nada a GitHub/Vercel** sin permiso explícito del usuario. La migración 044 **sí** se aplica en Supabase producción (autorizado por el usuario; se usa la Management API de Supabase, patrón de las migraciones 040-043).
- **Preservar permisos 041** (owner global, admin/editor de clase con alcance a su clase).
- Los pasos con `montar`/`node --check` que no tienen test unitario se verifican con `node --check` + preview manual (los tests de esta base no cubren vistas; no se inventa infraestructura nueva para probarlas).

---

### Task 1: Migración 044 — modelo de datos profesional (membresía unificada + solicitudes + avisos + actividad + roles)

**Files:**
- Create: `supabase/migraciones/044_grupos_profesionales.sql`
- Test: `tests/grupos-modelo.test.js` (nuevo)

**Interfaces:**
- Consumes: esquema existente de `miembros_grupo` (001), `notificaciones` (024/027), `examenes_personalizados`, `progreso_lectura`, helpers `es_miembro_del_grupo`/`es_admin_del_grupo`/`es_owner` (028).
- Produces: columnas/tablas `miembros_grupo.es_principal`, `solicitudes_grupo`, `avisos_grupo`, `actividad_grupo`, rol `'ayudante'`, tipo de notificación `'solicitud_clase'`, y RPCs `solicitar_ingreso(UUID) → UUID`, `resolver_solicitud(UUID, BOOLEAN) → BOOLEAN`, `crear_aviso(UUID, TEXT) → UUID`, `eliminar_aviso(UUID) → BOOLEAN`, `estadisticas_clase(UUID) → JSONB`, `progreso_miembros(UUID) → TABLE`. `unirse_con_codigo` se recrea para registrar actividad.

- [ ] **Step 1: Escribir el test que falla**

`tests/grupos-modelo.test.js` (mismo estilo que `tests/admin-scope.test.js`):

```js
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('migración 044 — grupos profesionales', () => {
  const sql = readFileSync(join(root, 'supabase/migraciones/044_grupos_profesionales.sql'), 'utf8');

  test('unifica la membresía con es_principal y backfill desde perfiles.grupo_id', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS es_principal BOOLEAN NOT NULL DEFAULT false');
    expect(sql).toContain('ON CONFLICT (grupo_id, usuario_id) DO UPDATE SET es_principal = true');
    expect(sql).toContain("rol_en_grupo IN ('admin','editor','ayudante','miembro')");
  });

  test('define solicitudes_grupo, avisos_grupo y actividad_grupo', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.solicitudes_grupo');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.avisos_grupo');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.actividad_grupo');
    expect(sql).toContain('UNIQUE (grupo_id, usuario_id)');
  });

  test('define las RPCs de admisión, avisos y estadísticas', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.solicitar_ingreso');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.resolver_solicitud');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.crear_aviso');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.eliminar_aviso');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.estadisticas_clase');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.progreso_miembros');
  });

  test('unirse por código exige aprobación salvo el owner (que entra directo)', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.unirse_con_codigo');
    expect(sql).toContain("jsonb_build_object('resultado', 'unido', 'grupo_id', v_grupo_id)");
    expect(sql).toContain("jsonb_build_object('resultado', 'solicitud', 'grupo_id', v_grupo_id)");
    expect(sql).toContain('IF public.es_owner() THEN');
    expect(sql).toContain("'solicitud_clase'");
    expect(sql).toContain('actividad_grupo');
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npx vitest run tests/grupos-modelo.test.js`
Expected: FAIL con `ENOENT: no such file ... 044_grupos_profesionales.sql` (el archivo aún no existe).

- [ ] **Step 3: Escribir la migración**

Crear `supabase/migraciones/044_grupos_profesionales.sql` con este contenido (idempotente):

```sql
-- ============================================================
-- FormsBiblicos — Migración 044
-- Grupos profesionales: membresía unificada + admisión + avisos
-- + actividad + estadísticas de clase.
-- ------------------------------------------------------------
-- Qué cambia:
--   1. miembros_grupo.es_principal: la membresía vive SOLO en
--      miembros_grupo (perfiles.grupo_id se sincroniza desde aquí).
--   2. Rol 'ayudante' (co-profesor).
--   3. solicitudes_grupo: unirse con código pasa a ser una
--      SOLICITUD que el admin/editor/ayudante aprueba o rechaza.
--   4. avisos_grupo: muro de anuncios de la clase (estilo Classroom).
--   5. actividad_grupo: historial (ingresos, solicitudes, avisos...).
--   6. Notificación tipo 'solicitud_clase' para admins.
-- ============================================================

-- ------------------------------------------------------------
-- 1. MEMBRESÍA UNIFICADA
-- ------------------------------------------------------------
ALTER TABLE public.miembros_grupo ADD COLUMN IF NOT EXISTS es_principal BOOLEAN NOT NULL DEFAULT false;

-- Backfill: cada perfil con clase principal (perfiles.grupo_id) pasa a
-- tener fila en miembros_grupo con es_principal = true. Tras esto, la
-- fuente de verdad ÚNICA es miembros_grupo.
INSERT INTO public.miembros_grupo (grupo_id, usuario_id, rol_en_grupo, es_principal)
SELECT p.grupo_id, p.id,
       CASE WHEN p.rol IN ('owner', 'admin') THEN 'admin'
            WHEN p.rol = 'editor' THEN 'editor'
            ELSE 'miembro' END,
       true
FROM public.perfiles p
WHERE p.grupo_id IS NOT NULL
ON CONFLICT (grupo_id, usuario_id) DO UPDATE SET es_principal = true;

-- Rol 'ayudante' (co-profesor): recrear el CHECK de rol_en_grupo.
DO $$
DECLARE
  c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.miembros_grupo'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%rol_en_grupo%'
  LOOP
    EXECUTE format('ALTER TABLE public.miembros_grupo DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE public.miembros_grupo ADD CONSTRAINT miembros_grupo_rol_check
  CHECK (rol_en_grupo IN ('admin', 'editor', 'ayudante', 'miembro'));

-- ------------------------------------------------------------
-- 2. SOLICITUDES DE ADMISIÓN
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.solicitudes_grupo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'rechazada')),
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  resuelto_en TIMESTAMPTZ,
  resuelto_por UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  UNIQUE (grupo_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_solicitudes_pendientes ON public.solicitudes_grupo(grupo_id) WHERE estado = 'pendiente';

-- ------------------------------------------------------------
-- 3. AVISOS DE CLASE (muro)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.avisos_grupo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  editado_en TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_avisos_grupo ON public.avisos_grupo(grupo_id, creado_en DESC);

-- ------------------------------------------------------------
-- 4. ACTIVIDAD DE CLASE (historial)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.actividad_grupo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  detalle TEXT DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_actividad_grupo ON public.actividad_grupo(grupo_id, creado_en DESC);

-- ------------------------------------------------------------
-- 5. RLS
-- ------------------------------------------------------------
ALTER TABLE public.solicitudes_grupo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "solicitudes_select" ON public.solicitudes_grupo;
CREATE POLICY "solicitudes_select" ON public.solicitudes_grupo FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.es_admin_del_grupo(grupo_id) OR public.es_owner());
DROP POLICY IF EXISTS "solicitudes_insert" ON public.solicitudes_grupo;
CREATE POLICY "solicitudes_insert" ON public.solicitudes_grupo FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());
DROP POLICY IF EXISTS "solicitudes_update" ON public.solicitudes_grupo;
CREATE POLICY "solicitudes_update" ON public.solicitudes_grupo FOR UPDATE TO authenticated
  USING (public.es_admin_del_grupo(grupo_id) OR public.es_owner())
  WITH CHECK (public.es_admin_del_grupo(grupo_id) OR public.es_owner());
DROP POLICY IF EXISTS "solicitudes_delete" ON public.solicitudes_grupo;
CREATE POLICY "solicitudes_delete" ON public.solicitudes_grupo FOR DELETE TO authenticated
  USING (public.es_admin_del_grupo(grupo_id) OR public.es_owner());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitudes_grupo TO authenticated;

ALTER TABLE public.avisos_grupo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "avisos_select" ON public.avisos_grupo;
CREATE POLICY "avisos_select" ON public.avisos_grupo FOR SELECT TO authenticated
  USING (public.es_miembro_del_grupo(grupo_id) OR public.es_owner());
DROP POLICY IF EXISTS "avisos_insert" ON public.avisos_grupo;
CREATE POLICY "avisos_insert" ON public.avisos_grupo FOR INSERT TO authenticated
  WITH CHECK (public.es_miembro_del_grupo(grupo_id));
DROP POLICY IF EXISTS "avisos_delete" ON public.avisos_grupo;
CREATE POLICY "avisos_delete" ON public.avisos_grupo FOR DELETE TO authenticated
  USING (autor_id = auth.uid() OR public.es_admin_del_grupo(grupo_id) OR public.es_owner());
GRANT SELECT, INSERT, DELETE ON public.avisos_grupo TO authenticated;

-- actividad_grupo: SOLO lectura desde el cliente; las escrituras ocurren
-- dentro de las RPCs SECURITY DEFINER (bypass de RLS), nunca desde la app.
ALTER TABLE public.actividad_grupo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "actividad_select" ON public.actividad_grupo;
CREATE POLICY "actividad_select" ON public.actividad_grupo FOR SELECT TO authenticated
  USING (public.es_miembro_del_grupo(grupo_id) OR public.es_owner());
REVOKE ALL ON public.actividad_grupo FROM authenticated;
GRANT SELECT ON public.actividad_grupo TO authenticated;

-- ------------------------------------------------------------
-- 6. RPC: solicitar ingreso (owner entra directo; el resto solicita)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.solicitar_ingreso(p_grupo_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_solicitud_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  -- El owner entra directo, sin aprobación
  IF public.es_owner() THEN
    INSERT INTO public.miembros_grupo (grupo_id, usuario_id, rol_en_grupo, es_principal)
    VALUES (p_grupo_id, auth.uid(), 'admin', true)
    ON CONFLICT (grupo_id, usuario_id) DO NOTHING;
    INSERT INTO public.actividad_grupo (grupo_id, actor_id, tipo, detalle)
    VALUES (p_grupo_id, auth.uid(), 'ingreso_codigo', auth.uid()::text);
    RETURN jsonb_build_object('resultado', 'unido', 'grupo_id', p_grupo_id);
  END IF;
  IF EXISTS (SELECT 1 FROM public.miembros_grupo WHERE grupo_id = p_grupo_id AND usuario_id = auth.uid())
     OR EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND grupo_id = p_grupo_id) THEN
    RAISE EXCEPTION 'Ya eres miembro de esta clase';
  END IF;
  INSERT INTO public.solicitudes_grupo (grupo_id, usuario_id)
  VALUES (p_grupo_id, auth.uid())
  ON CONFLICT (grupo_id, usuario_id)
    DO UPDATE SET estado = 'pendiente', resuelto_en = NULL, resuelto_por = NULL
  RETURNING id INTO v_solicitud_id;

  -- Avisar SOLO al admin de la clase (aprobación del admin)
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, cuerpo, datos)
  SELECT m.usuario_id, 'solicitud_clase', 'Nueva solicitud de ingreso',
         (SELECT p.nombre_completo FROM public.perfiles p WHERE p.id = auth.uid()) || ' quiere unirse a tu clase',
         jsonb_build_object('grupo_id', p_grupo_id, 'url', '/grupos/' || p_grupo_id)
  FROM public.miembros_grupo m
  WHERE m.grupo_id = p_grupo_id AND m.rol_en_grupo = 'admin';

  INSERT INTO public.actividad_grupo (grupo_id, actor_id, tipo, detalle)
  VALUES (p_grupo_id, auth.uid(), 'solicitud_ingreso', auth.uid()::text);
  RETURN jsonb_build_object('resultado', 'solicitud', 'grupo_id', p_grupo_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------
-- 7. RPC: resolver solicitud (aprobar / rechazar)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolver_solicitud(p_solicitud_id UUID, p_aceptar BOOLEAN)
RETURNS BOOLEAN AS $$
DECLARE
  v_sol public.solicitudes_grupo%ROWTYPE;
  v_nombre TEXT;
BEGIN
  SELECT * INTO v_sol FROM public.solicitudes_grupo WHERE id = p_solicitud_id;
  IF v_sol.id IS NULL THEN RAISE EXCEPTION 'Solicitud no válida'; END IF;
  IF NOT (public.es_admin_del_grupo(v_sol.grupo_id) OR public.es_owner()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF v_sol.estado <> 'pendiente' THEN RAISE EXCEPTION 'La solicitud ya fue resuelta'; END IF;

  SELECT nombre_completo INTO v_nombre FROM public.perfiles WHERE id = v_sol.usuario_id;
  v_nombre := COALESCE(v_nombre, 'Un alumno');

  IF p_aceptar THEN
    INSERT INTO public.miembros_grupo (grupo_id, usuario_id, rol_en_grupo, es_principal)
    VALUES (v_sol.grupo_id, v_sol.usuario_id, 'miembro', false)
    ON CONFLICT (grupo_id, usuario_id) DO NOTHING;
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, cuerpo, datos)
    VALUES (v_sol.usuario_id, 'grupo', 'Solicitud aceptada', 'Te has unido a la clase. ¡Bienvenido!',
            jsonb_build_object('grupo_id', v_sol.grupo_id, 'url', '/grupos/' || v_sol.grupo_id));
  ELSE
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, cuerpo, datos)
    VALUES (v_sol.usuario_id, 'grupo', 'Solicitud rechazada', 'Tu solicitud para unirte a la clase no fue aprobada.',
            jsonb_build_object('grupo_id', v_sol.grupo_id));
  END IF;

  UPDATE public.solicitudes_grupo
  SET estado = CASE WHEN p_aceptar THEN 'aceptada' ELSE 'rechazada' END,
      resuelto_en = NOW(), resuelto_por = auth.uid()
  WHERE id = p_solicitud_id;

  INSERT INTO public.actividad_grupo (grupo_id, actor_id, tipo, detalle)
  VALUES (v_sol.grupo_id, auth.uid(), CASE WHEN p_aceptar THEN 'solicitud_aceptada' ELSE 'solicitud_rechazada' END, v_sol.usuario_id::text);
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------
-- 8. RPC: avisos (crear / eliminar)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_aviso(p_grupo_id UUID, p_contenido TEXT)
RETURNS UUID AS $$
DECLARE
  v_aviso_id UUID;
BEGIN
  -- Solo los responsables (admin/editor/ayudante) u owner pueden publicar
  IF NOT (public.es_editor_del_grupo(p_grupo_id) OR public.es_owner()
          OR EXISTS (SELECT 1 FROM public.miembros_grupo
                     WHERE grupo_id = p_grupo_id AND usuario_id = auth.uid() AND rol_en_grupo = 'ayudante')) THEN
    RAISE EXCEPTION 'Solo los responsables de la clase pueden publicar avisos';
  END IF;
  IF length(btrim(p_contenido)) = 0 OR length(p_contenido) > 2000 THEN
    RAISE EXCEPTION 'Aviso inválido';
  END IF;
  INSERT INTO public.avisos_grupo (grupo_id, autor_id, contenido)
  VALUES (p_grupo_id, auth.uid(), btrim(p_contenido))
  RETURNING id INTO v_aviso_id;
  INSERT INTO public.actividad_grupo (grupo_id, actor_id, tipo, detalle)
  VALUES (p_grupo_id, auth.uid(), 'aviso_creado', v_aviso_id::text);
  RETURN v_aviso_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.eliminar_aviso(p_aviso_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.avisos_grupo
  WHERE id = p_aviso_id
    AND (autor_id = auth.uid() OR public.es_admin_del_grupo(grupo_id) OR public.es_owner());
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------
-- 9. RPC: estadísticas y progreso de clase
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.estadisticas_clase(p_grupo_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total INT; v_profes INT; v_examenes INT; v_avisos INT; v_solicitudes INT; v_activos INT;
BEGIN
  IF NOT public.es_miembro_del_grupo(p_grupo_id) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT count(*) INTO v_total FROM public.miembros_grupo WHERE grupo_id = p_grupo_id;
  SELECT count(*) INTO v_profes FROM public.miembros_grupo
    WHERE grupo_id = p_grupo_id AND rol_en_grupo IN ('admin', 'editor', 'ayudante');
  SELECT count(*) INTO v_examenes FROM public.examenes_personalizados WHERE grupo_id = p_grupo_id;
  SELECT count(*) INTO v_avisos FROM public.avisos_grupo WHERE grupo_id = p_grupo_id;
  SELECT count(*) INTO v_solicitudes FROM public.solicitudes_grupo
    WHERE grupo_id = p_grupo_id AND estado = 'pendiente';
  SELECT count(*) INTO v_activos FROM public.perfiles p
    JOIN public.miembros_grupo m ON m.usuario_id = p.id AND m.grupo_id = p_grupo_id
    WHERE p.ultimo_acceso > NOW() - interval '7 days';
  RETURN jsonb_build_object(
    'miembros', v_total,
    'profesores', v_profes,
    'alumnos', v_total - v_profes,
    'examenes', v_examenes,
    'avisos', v_avisos,
    'solicitudes_pendientes', v_solicitudes,
    'activos_7d', v_activos
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.progreso_miembros(p_grupo_id UUID)
RETURNS TABLE(usuario_id UUID, nombre_completo TEXT, username TEXT, capitulos_estudiados BIGINT) AS $$
BEGIN
  IF NOT public.es_miembro_del_grupo(p_grupo_id) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN QUERY
    SELECT p.id, p.nombre_completo, p.username, count(pl.id)::BIGINT
    FROM public.miembros_grupo m
    JOIN public.perfiles p ON p.id = m.usuario_id
    LEFT JOIN public.progreso_lectura pl ON pl.usuario_id = p.id AND pl.completado = true
    WHERE m.grupo_id = p_grupo_id
    GROUP BY p.id
    ORDER BY p.nombre_completo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------
-- 10. unirse_con_codigo: entrada POR CÓDIGO con aprobación del admin.
--     El owner entra directo (sin solicitud); el resto crea una
--     solicitud que el admin de la clase aprueba o rechaza.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unirse_con_codigo(p_codigo TEXT)
RETURNS JSONB AS $$
DECLARE
  v_grupo_id UUID;
  v_nombre TEXT;
BEGIN
  SELECT g.id INTO v_grupo_id
  FROM public.grupos g
  WHERE g.codigo = upper(btrim(p_codigo));
  IF v_grupo_id IS NULL THEN
    RAISE EXCEPTION 'Código de clase no válido';
  END IF;

  -- Owner: entra directo como admin de la clase
  IF public.es_owner() THEN
    INSERT INTO public.miembros_grupo (grupo_id, usuario_id, rol_en_grupo, es_principal)
    VALUES (v_grupo_id, auth.uid(), 'admin', true)
    ON CONFLICT (grupo_id, usuario_id) DO NOTHING;
    INSERT INTO public.actividad_grupo (grupo_id, actor_id, tipo, detalle)
    VALUES (v_grupo_id, auth.uid(), 'ingreso_codigo', auth.uid()::text);
    RETURN jsonb_build_object('resultado', 'unido', 'grupo_id', v_grupo_id);
  END IF;

  -- Ya miembro: entrar directo (idempotente)
  IF EXISTS (SELECT 1 FROM public.miembros_grupo WHERE grupo_id = v_grupo_id AND usuario_id = auth.uid())
     OR EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND grupo_id = v_grupo_id) THEN
    RETURN jsonb_build_object('resultado', 'unido', 'grupo_id', v_grupo_id);
  END IF;

  -- El resto: solicitud pendiente de aprobación del admin de la clase
  INSERT INTO public.solicitudes_grupo (grupo_id, usuario_id)
  VALUES (v_grupo_id, auth.uid())
  ON CONFLICT (grupo_id, usuario_id)
    DO UPDATE SET estado = 'pendiente', resuelto_en = NULL, resuelto_por = NULL;

  SELECT nombre_completo INTO v_nombre FROM public.perfiles WHERE id = auth.uid();
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, cuerpo, datos)
  SELECT m.usuario_id, 'solicitud_clase', 'Nueva solicitud de ingreso',
         COALESCE(v_nombre, 'Un alumno') || ' quiere unirse a tu clase',
         jsonb_build_object('grupo_id', v_grupo_id, 'url', '/grupos/' || v_grupo_id)
  FROM public.miembros_grupo m
  WHERE m.grupo_id = v_grupo_id AND m.rol_en_grupo = 'admin';

  INSERT INTO public.actividad_grupo (grupo_id, actor_id, tipo, detalle)
  VALUES (v_grupo_id, auth.uid(), 'solicitud_ingreso', auth.uid()::text);
  RETURN jsonb_build_object('resultado', 'solicitud', 'grupo_id', v_grupo_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------
-- 11. Tipo de notificación 'solicitud_clase' (recrear CHECK, patrón 024)
-- ------------------------------------------------------------
DO $$
DECLARE
  c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.notificaciones'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%tipo%'
  LOOP
    EXECUTE format('ALTER TABLE public.notificaciones DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE public.notificaciones ADD CONSTRAINT notificaciones_tipo_check
  CHECK (tipo IN ('desafio', 'grupo', 'info', 'examen_publicado', 'examen_entregado', 'mazo_nuevo', 'anuncio', 'solicitud_clase'));

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.solicitar_ingreso(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolver_solicitud(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crear_aviso(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_aviso(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estadisticas_clase(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.progreso_miembros(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unirse_con_codigo(TEXT) TO authenticated, anon;

SELECT '✅ Migración 044 aplicada: grupos profesionales' AS mensaje;
```

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

Run: `npx vitest run tests/grupos-modelo.test.js`
Expected: 4 PASS. Y `node --check` no aplica a SQL; validar que no hay `$` sin cerrar revisando a ojo el bloque `$$`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migraciones/044_grupos_profesionales.sql tests/grupos-modelo.test.js
git commit -m "feat(grupos): modelo profesional — membresía unificada, solicitudes, avisos, actividad y estadísticas"
```

---

### Task 2: Repositorio — métodos de solicitudes, avisos, estadísticas y membresía unificada

**Files:**
- Modify: `js/datos/grupos-repository.js` (añadir métodos al objeto `window.gruposRepository`; reemplazar `obtenerMiembrosDe`)
- Test: `tests/grupos-profesionales.test.js` (nuevo)

**Interfaces:**
- Consumes: RPCs de la Task 1; `window.supabaseClient`.
- Produces (métodos nuevos en `window.gruposRepository`):
  - `solicitarIngreso(grupoId) → Promise<UUID>`
  - `misSolicitudes(usuarioId) → Promise<Array>`
  - `solicitudesDeClase(grupoId) → Promise<Array>` (solo pendientes, con perfil del solicitante)
  - `resolverSolicitud(solicitudId, aceptar) → Promise<boolean>`
  - `listarAvisos(grupoId, limite=50) → Promise<Array>` (con autor)
  - `crearAviso(grupoId, contenido) → Promise<UUID>`
  - `eliminarAviso(avisoId) → Promise<boolean>`
  - `estadisticasClase(grupoId) → Promise<Object|null>`
  - `progresoMiembros(grupoId) → Promise<Array>`
  - `actividadClase(grupoId, limite=20) → Promise<Array>` (con actor)
  - `obtenerMiembrosDe(grupoId)` **reemplazado**: lee SOLO `miembros_grupo` (con perfil embebido), devuelve `[{ ...perfil, rol_en_grupo, es_principal, miembro_desde }]`.

- [ ] **Step 1: Escribir el test que falla**

`tests/grupos-profesionales.test.js` (copiar el patrón de mock de `tests/grupos.test.js` y ampliarlo con `q.rpc` ya existente; añadir `q.asc`/`q.desc` si hace falta en el mock):

```js
import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..');

function cargarRepositorio() {
  const codigo = readFileSync(join(srcDir, 'js/datos/grupos-repository.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(codigo)();
}

function crearSupabase(respuestas) {
  const llamadas = [];
  const client = {
    llamadas,
    from(tabla) {
      let op = 'select';
      const q = {};
      q.select = (cols) => { q._columnas = cols || '*'; return q; };
      q.insert = (val) => { op = 'insert'; q._valor = val; return q; };
      q.single = () => { llamadas.push({ tabla, op, valor: q._valor }); return Promise.resolve(respuestas[tabla] || { data: null, error: null }); };
      q.then = (res, rej) => { llamadas.push({ tabla, op, valor: q._valor }); return Promise.resolve(respuestas[tabla] || { data: null, error: null }).then(res, rej); };
      q.eq = () => q; q.in = () => q; q.order = () => q; q.limit = () => q;
      q.update = (val) => { op = 'update'; q._valor = val; return q; };
      q.delete = () => { op = 'delete'; return q; };
      q.upsert = (val) => { op = 'upsert'; q._valor = val; return q; };
      q.rpc = (nombre, args) => { op = 'rpc'; q._rpc = nombre; q._args = args; return q; };
      return q;
    }
  };
  return client;
}

describe('gruposRepository profesional', () => {
  beforeEach(() => {
    global.window = global;
    global.window.supabaseClient = null;
    global.window.gruposRepository = null;
    cargarRepositorio();
  });

  test('solicitarIngreso llama a la RPC solicitar_ingreso', async () => {
    const sb = crearSupabase({});
    global.window.supabaseClient = sb;
    const id = await global.window.gruposRepository.solicitarIngreso('g1');
    const rpc = sb.llamadas.find(l => l.op === 'rpc');
    expect(rpc).toBeTruthy();
    expect(rpc._rpc).toBe('solicitar_ingreso');
    expect(rpc._args).toEqual({ p_grupo_id: 'g1' });
  });

  test('solicitudesDeClase filtra solo pendientes y embebe el perfil', async () => {
    const pendiente = { id: 's1', grupo_id: 'g1', estado: 'pendiente', perfiles: { id: 'u1', nombre_completo: 'Ana' } };
    const sb = crearSupabase({ solicitudes_grupo: { data: [pendiente], error: null } });
    global.window.supabaseClient = sb;
    const filas = await global.window.gruposRepository.solicitudesDeClase('g1');
    expect(filas).toHaveLength(1);
    expect(filas[0].perfiles.nombre_completo).toBe('Ana');
    expect(sb.llamadas.some(l => l.tabla === 'solicitudes_grupo' && l.op === 'select')).toBe(true);
  });

  test('resolverSolicitud llama a la RPC con aceptar booleano', async () => {
    const sb = crearSupabase({});
    global.window.supabaseClient = sb;
    await global.window.gruposRepository.resolverSolicitud('s1', true);
    const rpc = sb.llamadas.find(l => l.op === 'rpc');
    expect(rpc._rpc).toBe('resolver_solicitud');
    expect(rpc._args).toEqual({ p_solicitud_id: 's1', p_aceptar: true });
  });

  test('crearAviso llama a la RPC crear_aviso con el contenido', async () => {
    const sb = crearSupabase({});
    global.window.supabaseClient = sb;
    await global.window.gruposRepository.crearAviso('g1', 'Bienvenidos al nuevo trimestre');
    const rpc = sb.llamadas.find(l => l.op === 'rpc');
    expect(rpc._rpc).toBe('crear_aviso');
    expect(rpc._args).toEqual({ p_grupo_id: 'g1', p_contenido: 'Bienvenidos al nuevo trimestre' });
  });

  test('estadisticasClase devuelve el JSONB de la RPC', async () => {
    const stats = { miembros: 5, profesores: 1, alumnos: 4, examenes: 2, avisos: 3, solicitudes_pendientes: 1, activos_7d: 4 };
    const sb = crearSupabase({});
    sb.from = () => { throw new Error('no'); };
    global.window.supabaseClient = sb;
    const original = sb.rpc;
    sb.rpc = (nombre, args) => ({ then: (res) => Promise.resolve({ data: stats, error: null }).then(res) });
    const out = await global.window.gruposRepository.estadisticasClase('g1');
    expect(out).toEqual(stats);
  });

  test('obtenerMiembrosDe lee SOLO miembros_grupo y devuelve perfil + rol + es_principal', async () => {
    const fila = {
      usuario_id: 'u1', rol_en_grupo: 'editor', es_principal: true, creado_en: '2026-01-01',
      perfiles: { id: 'u1', nombre_completo: 'Ana', username: 'ana', rol: 'editor' }
    };
    const sb = crearSupabase({ miembros_grupo: { data: [fila], error: null } });
    global.window.supabaseClient = sb;
    const miembros = await global.window.gruposRepository.obtenerMiembrosDe('g1');
    expect(miembros).toHaveLength(1);
    expect(miembros[0].rol_en_grupo).toBe('editor');
    expect(miembros[0].es_principal).toBe(true);
    expect(sb.llamadas.some(l => l.tabla === 'perfiles')).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npx vitest run tests/grupos-profesionales.test.js`
Expected: FAIL (los métodos no existen / `obtenerMiembrosDe` no embebe `es_principal`).

- [ ] **Step 3: Implementar los métodos en `js/datos/grupos-repository.js`**

Añadir dentro de `window.gruposRepository = { ... }` (tras `obtenerMiembrosDe`, reemplazándolo):

```js
// Miembros de una clase con la membresía UNIFICADA: solo miembros_grupo
// (la migración 044 backfillea perfiles.grupo_id → miembros_grupo).
// Devuelve [{ ...perfil, rol_en_grupo, es_principal, miembro_desde }].
async obtenerMiembrosDe(grupoId) {
  if (!sb() || !grupoId) return [];
  try {
    const { data } = await sb().from('miembros_grupo')
      .select('usuario_id, rol_en_grupo, es_principal, creado_en, perfiles!usuario_id(id, nombre_completo, username, rol, foto_perfil, ultimo_acceso, grupo_id)')
      .eq('grupo_id', grupoId);
    return (data || []).map(m => ({
      ...(m.perfiles || {}),
      rol_en_grupo: m.rol_en_grupo,
      es_principal: !!m.es_principal,
      miembro_desde: m.creado_en
    })).sort((a, b) => (a.nombre_completo || '').localeCompare(b.nombre_completo || ''));
  } catch (e) {
    console.warn('[Grupos] No se pudieron obtener miembros:', e.message);
    return [];
  }
},

// ── Solicitudes de admisión ────────────────────────────────
async solicitarIngreso(grupoId) {
  if (!sb() || !grupoId) throw new Error('Faltan datos');
  const { data, error } = await sb().rpc('solicitar_ingreso', { p_grupo_id: grupoId });
  if (error) throw error;
  return data;
},

async misSolicitudes(usuarioId) {
  if (!sb() || !usuarioId) return [];
  try {
    const { data } = await sb().from('solicitudes_grupo')
      .select('*, grupos!grupo_id(nombre)')
      .eq('usuario_id', usuarioId)
      .order('creado_en', { ascending: false });
    return data || [];
  } catch (e) {
    console.warn('[Grupos] No se pudieron listar tus solicitudes:', e.message);
    return [];
  }
},

async solicitudesDeClase(grupoId) {
  if (!sb() || !grupoId) return [];
  try {
    const { data } = await sb().from('solicitudes_grupo')
      .select('*, perfiles!usuario_id(id, nombre_completo, username, foto_perfil, creado_en)')
      .eq('grupo_id', grupoId)
      .eq('estado', 'pendiente')
      .order('creado_en');
    return data || [];
  } catch (e) {
    console.warn('[Grupos] No se pudieron listar solicitudes:', e.message);
    return [];
  }
},

async resolverSolicitud(solicitudId, aceptar) {
  if (!sb() || !solicitudId) throw new Error('Faltan datos');
  const { data, error } = await sb().rpc('resolver_solicitud', {
    p_solicitud_id: solicitudId,
    p_aceptar: !!aceptar
  });
  if (error) throw error;
  return !!data;
},

// ── Avisos de clase ────────────────────────────────────────
async listarAvisos(grupoId, limite = 50) {
  if (!sb() || !grupoId) return [];
  try {
    const { data } = await sb().from('avisos_grupo')
      .select('*, perfiles!autor_id(id, nombre_completo, username, foto_perfil)')
      .eq('grupo_id', grupoId)
      .order('creado_en', { ascending: false })
      .limit(limite);
    return data || [];
  } catch (e) {
    console.warn('[Grupos] No se pudieron listar avisos:', e.message);
    return [];
  }
},

async crearAviso(grupoId, contenido) {
  if (!sb() || !grupoId) throw new Error('Faltan datos');
  const { data, error } = await sb().rpc('crear_aviso', {
    p_grupo_id: grupoId,
    p_contenido: String(contenido || '').trim()
  });
  if (error) throw error;
  return data;
},

async eliminarAviso(avisoId) {
  if (!sb() || !avisoId) return false;
  const { data, error } = await sb().rpc('eliminar_aviso', { p_aviso_id: avisoId });
  if (error) throw error;
  return !!data;
},

// ── Estadísticas y actividad ───────────────────────────────
async estadisticasClase(grupoId) {
  if (!sb() || !grupoId) return null;
  try {
    const { data, error } = await sb().rpc('estadisticas_clase', { p_grupo_id: grupoId });
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[Grupos] No se pudieron obtener estadísticas:', e.message);
    return null;
  }
},

async progresoMiembros(grupoId) {
  if (!sb() || !grupoId) return [];
  try {
    const { data, error } = await sb().rpc('progreso_miembros', { p_grupo_id: grupoId });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('[Grupos] No se pudo obtener el progreso:', e.message);
    return [];
  }
},

async actividadClase(grupoId, limite = 20) {
  if (!sb() || !grupoId) return [];
  try {
    const { data } = await sb().from('actividad_grupo')
      .select('*, perfiles!actor_id(id, nombre_completo, username)')
      .eq('grupo_id', grupoId)
      .order('creado_en', { ascending: false })
      .limit(limite);
    return data || [];
  } catch (e) {
    console.warn('[Grupos] No se pudo listar la actividad:', e.message);
    return [];
  }
},
```

> Notas:
> - `solicitarIngreso` y `unirseConCodigo` ahora devuelven `JSONB { resultado: 'unido'|'solicitud', grupo_id }` (el owner recibe `'unido'`; el resto `'solicitud'`). El test anterior de `unirseConCodigo` en `tests/grupos.test.js` que esperaba un UUID hay que ajustarlo al nuevo contrato JSONB.
> - `obtenerMiembrosDe` ahora depende de la migración 044 (backfill). El test existente de `obtenerMiembrosDe` en `tests/grupos.test.js` puede requerir ajuste del mock (ahora embebe `perfiles!usuario_id`); si falla, actualizar ese test al nuevo contrato (perfil + rol_en_grupo + es_principal).

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `node --check js/datos/grupos-repository.js && npx vitest run tests/grupos-profesionales.test.js tests/grupos.test.js`
Expected: PASS en ambos archivos (ajustar el test viejo de `obtenerMiembrosDe` si el mock no embebe).

- [ ] **Step 5: Commit**

```bash
git add js/datos/grupos-repository.js tests/grupos-profesionales.test.js tests/grupos.test.js
git commit -m "feat(grupos): repositorio unificado con solicitudes, avisos, estadísticas y actividad"
```

---

### Task 3: Detalle de clase con pestañas (Personas · Avisos · Estadísticas)

**Files:**
- Modify: `js/vistas/vista-grupos.js` (`_montarGrupo` + nuevos métodos `_tabPersonas`, `_tabAvisos`, `_tabEstadisticas`)
- Modify: `css/05-componentes/_grupos.css` (pestañas, tarjetas de solicitud, aviso y estadística)

**Interfaces:**
- Consumes: métodos de la Task 2 (`solicitudesDeClase`, `resolverSolicitud`, `listarAvisos`, `crearAviso`, `eliminarAviso`, `estadisticasClase`, `progresoMiembros`, `actividadClase`, `obtenerMiembrosDe`); `window.helpers.mostrarAlerta`; `window.Iconos.render`.
- Produces: estructura interna de `_montarGrupo` con `<nav class="grupos-tabs">` (botones `[data-tab]`) y contenedor `<div id="gruposTabContenido">`; handlers reutilizables `_renderTab(raiz, grupo, usuario, nombre)`.

- [ ] **Step 1: Refactorizar `_montarGrupo` al esqueleto con pestañas**

Reemplazar el bloque de render del detalle (desde `raiz.innerHTML = \`...\`` hasta el cierre del HTML) por:

```js
const esResponsable = soyProfesor || ['admin', 'owner'].includes(usuario.rol);

raiz.innerHTML = `
  <div class="o-contenedor o-pila o-pila--lg grupos" style="padding-top:var(--espaciado-md);padding-bottom:calc(110px + env(safe-area-inset-bottom))">
    <div class="grupos-cabecera">
      <button class="btn-icono grupos-cabecera__volver" id="btnVolverDirectorio" aria-label="Volver a mis clases">${I('arrow-left')}</button>
      <div class="grupos-cabecera__texto">
        <h1 class="grupos-cabecera__titulo">${E(grupo.nombre)}</h1>
        <p class="grupos-cabecera__sub">${E(instNombre)} · ${miembros.length} miembro${miembros.length !== 1 ? 's' : ''}</p>
      </div>
    </div>

    <div class="grupos-clase-banner" style="background:${gradiente}">
      <div class="grupos-clase-banner__icono">${I('book-open')}</div>
      <div class="grupos-clase-banner__info">
        <h2 class="grupos-clase-banner__nombre">${E(grupo.nombre)}</h2>
        <p class="grupos-clase-banner__inst">${E(instNombre)}${grupo.descripcion ? ` · ${E(grupo.descripcion.slice(0, 70))}` : ''}</p>
      </div>
      ${esResponsable && grupo.codigo ? `
      <button class="grupos-clase-banner__codigo" id="btnCopiarCodigo" aria-label="Copiar código de la clase" title="Copiar código">
        <span>Código</span><strong>${E(grupo.codigo)}</strong>${I('copy')}
      </button>` : ''}
      ${soyMiembro ? `
      <button class="grupos-clase-banner__compartir" id="btnCompartirClase" aria-label="Compartir esta clase" title="Compartir enlace de la clase">
        ${I('share-2')}<span>Compartir</span>
      </button>` : ''}
    </div>

    ${!soyMiembro ? `
    <div class="grupos-entrar">
      <p>${I('key')} Aún no formas parte de esta clase.</p>
      <button class="btn-primario" id="btnIrCodigo" style="justify-content:center">${I('key')} Unirme con código</button>
      <button class="btn-secundario" id="btnSolicitarIngreso" style="justify-content:center">${I('user-plus')} Solicitar ingreso</button>
    </div>` : ''}

    ${soyMiembro ? `
    <nav class="grupos-tabs" role="tablist" aria-label="Secciones de la clase">
      <button class="grupos-tabs__tab is-activo" role="tab" aria-selected="true" data-tab="personas">${I('users')} Personas</button>
      <button class="grupos-tabs__tab" role="tab" aria-selected="false" data-tab="avisos">${I('megaphone')} Avisos</button>
      <button class="grupos-tabs__tab" role="tab" aria-selected="false" data-tab="stats">${I('bar-chart-3')} Estadísticas</button>
    </nav>
    <div id="gruposTabContenido"></div>` : ''}
  </div>`;
```

Añadir en `_montarGrupo`, tras los handlers existentes del banner:

```js
const btnSolicitar = raiz.querySelector('#btnSolicitarIngreso');
if (btnSolicitar) btnSolicitar.onclick = async () => {
  btnSolicitar.disabled = true;
  try {
    await window.gruposRepository.solicitarIngreso(grupo.id);
    window.helpers.mostrarAlerta('Solicitud enviada. Espera a que un responsable la apruebe.', 'exito');
    btnSolicitar.textContent = 'Solicitud enviada';
  } catch (e) {
    btnSolicitar.disabled = false;
    const msg = (e && e.message) || '';
    window.helpers.mostrarAlerta(/ya eres miembro/i.test(msg) ? 'Ya formas parte de esta clase.' : 'Error: ' + msg, 'error');
    if (/ya eres miembro/i.test(msg)) this._montarGrupo(raiz, grupo.id);
  }
};

raiz.querySelectorAll('.grupos-tabs__tab').forEach(btn => {
  btn.onclick = () => {
    raiz.querySelectorAll('.grupos-tabs__tab').forEach(b => {
      b.classList.toggle('is-activo', b === btn);
      b.setAttribute('aria-selected', String(b === btn));
    });
    this._renderTab(raiz, grupo, usuario, btn.dataset.tab);
  };
});
if (soyMiembro) this._renderTab(raiz, grupo, usuario, 'personas');
```

- [ ] **Step 2: Implementar `_renderTab` y el tab Personas (con solicitudes pendientes)**

Añadir al objeto `window.vistaGrupos`:

```js
_renderTab(raiz, grupo, usuario, nombre) {
  const cont = raiz.querySelector('#gruposTabContenido');
  if (!cont) return;
  cont.innerHTML = '<div class="skeleton-stack" aria-hidden="true"><div class="skel" style="height:90px;border-radius:var(--card-radius)"></div></div>';
  if (nombre === 'personas') this._tabPersonas(cont, grupo, usuario);
  else if (nombre === 'avisos') this._tabAvisos(cont, grupo, usuario);
  else if (nombre === 'stats') this._tabEstadisticas(cont, grupo, usuario);
},

async _tabPersonas(cont, grupo, usuario) {
  // Las solicitudes SOLO las aprueba el admin de la clase (o el owner)
  const esAdmin = usuario.rol === 'owner'
    || (this._miembros || []).some(m => m.id === usuario.id && m.rol_en_grupo === 'admin');
  const [miembros, solicitudes] = await Promise.all([
    window.gruposRepository.obtenerMiembrosDe(grupo.id),
    esAdmin ? window.gruposRepository.solicitudesDeClase(grupo.id) : []
  ]);
  const profesores = miembros.filter(m => ['admin', 'editor', 'ayudante'].includes(m.rol_en_grupo));
  const alumnos = miembros.filter(m => !['admin', 'editor', 'ayudante'].includes(m.rol_en_grupo));
  const grupoRol = (titulo, lista, icono) => lista.length ? `
    <div class="grupos-rolgrupo">
      <h4 class="grupos-rolgrupo__titulo">${I(icono)} ${titulo} <span>${lista.length}</span></h4>
      <div class="grupos-miembros">${lista.map(m => this._fichaMiembro(m, usuario, this._esOwner)).join('')}</div>
    </div>` : '';

  const solicitudesHtml = solicitudes.length ? `
    <section class="grupos-seccion">
      <div class="grupos-seccion__cabecera">
        <div class="grupos-seccion__icono">${I('user-plus')}</div>
        <div><h3 class="grupos-seccion__titulo">Solicitudes de ingreso</h3>
        <p class="grupos-seccion__desc">${solicitudes.length} espera${solicitudes.length !== 1 ? 'n' : ''} tu aprobación</p></div>
      </div>
      <div class="o-pila" style="gap:var(--espaciado-xs)">
        ${solicitudes.map(s => `
          <div class="grupos-solicitud" data-solicitud="${s.id}">
            <div class="grupos-miembro__avatar">${avatarHtml(s.perfiles)}</div>
            <div class="grupos-solicitud__info">
              <p class="grupos-solicitud__nombre">${E(s.perfiles.nombre_completo || s.perfiles.username)}</p>
              <p class="grupos-solicitud__username">@${E(s.perfiles.username)} · quiere unirse</p>
            </div>
            <div class="grupos-solicitud__acciones">
              <button class="btn-primario u-fs-xs" data-solicitud-accion="aceptar">${I('check')} Aprobar</button>
              <button class="btn-secundario u-fs-xs" data-solicitud-accion="rechazar">${I('x')} Rechazar</button>
            </div>
          </div>`).join('')}
      </div>
    </section>` : '';

  cont.innerHTML = `
    ${solicitudesHtml}
    ${grupoRol('Profesores', profesores, 'graduation-cap')}
    ${grupoRol('Alumnos', alumnos, 'users')}
    ${miembros.length === 0 ? '<p class="u-color-texto-terciario u-fs-sm">Todavía no hay miembros. Comparte el código de la clase para que se unan.</p>' : ''}`;
  if (window.Iconos) window.Iconos.actualizar();

  cont.querySelectorAll('[data-solicitud-accion]').forEach(btn => {
    btn.onclick = async () => {
      const card = btn.closest('[data-solicitud]');
      const s = solicitudes.find(x => x.id === card.dataset.solicitud);
      if (!s) return;
      btn.disabled = true;
      try {
        await window.gruposRepository.resolverSolicitud(s.id, btn.dataset.solicitudAccion === 'aceptar');
        window.helpers.mostrarAlerta(btn.dataset.solicitudAccion === 'aceptar'
          ? `${s.perfiles.nombre_completo || s.perfiles.username} ahora es miembro.` : 'Solicitud rechazada.', 'exito');
        this._tabPersonas(cont, grupo, usuario);
      } catch (e) { btn.disabled = false; window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
    };
  });

  // Perfil rápido y edición de alumno (reutiliza los handlers existentes)
  cont.querySelectorAll('[data-miembro]').forEach(el => {
    el.onclick = (e) => {
      if (e.target.closest('.grupos-miembro__check')) return;
      if (e.target.closest('.grupos-miembro__editar')) return;
      const m = miembros.find(x => x.id === el.dataset.miembro);
      if (m) this._perfilRapido(m);
    };
  });
  cont.querySelectorAll('[data-editar-miembro]').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const m = miembros.find(x => x.id === btn.dataset.editarMiembro);
      if (m) this._gestionarAlumno(m, grupo, document.getElementById('app-root'));
    };
  });
},
```

> Notas:
> - Las solicitudes se muestran SOLO al admin de la clase (`rol_en_grupo === 'admin'`) o al owner, que son quienes aprueban (`es_admin_del_grupo`). Ni editores ni ayudantes las ven.
> - `_gestionarAlumno` re-monta `_montarGrupo` al terminar; si ya no está en la ruta (el usuario cambió de pestaña), la comprobación `raiz.isConnected` ya evita pisar la vista actual.

- [ ] **Step 3: Implementar el tab Avisos (formulario + lista)**

```js
async _tabAvisos(cont, grupo, usuario) {
  const esResponsable = ['admin', 'editor', 'owner'].includes(usuario.rol)
    || (this._miembros || []).some(m => m.id === usuario.id && ['admin', 'editor', 'ayudante'].includes(m.rol_en_grupo));
  const avisos = await window.gruposRepository.listarAvisos(grupo.id);
  cont.innerHTML = `
    ${esResponsable ? `
    <form class="grupos-aviso-form" id="avisoForm">
      <div class="grupos-aviso-form__avatar">${avatarHtml(usuario)}</div>
      <div class="grupos-aviso-form__caja">
        <textarea id="avisoTexto" rows="2" maxlength="2000" placeholder="Anuncia algo a la clase…" aria-label="Contenido del aviso"></textarea>
        <div class="grupos-aviso-form__pie">
          <span class="u-fs-xxs u-color-texto-terciario" id="avisoContador">0/2000</span>
          <button class="btn-primario u-fs-xs" type="submit" id="avisoEnviar">${I('send')} Publicar</button>
        </div>
      </div>
    </form>` : ''}
    <div class="o-pila" style="gap:var(--espaciado-sm)" id="avisosLista">
      ${avisos.length ? avisos.map(a => this._tarjetaAviso(a, usuario, esResponsable)).join('') : '<p class="u-color-texto-terciario u-fs-sm">Aún no hay avisos en esta clase.</p>'}
    </div>`;
  if (window.Iconos) window.Iconos.actualizar();

  const form = cont.querySelector('#avisoForm');
  if (form) {
    const texto = cont.querySelector('#avisoTexto');
    const contador = cont.querySelector('#avisoContador');
    texto.addEventListener('input', () => { if (contador) contador.textContent = `${texto.value.length}/2000`; });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const contenido = texto.value.trim();
      if (!contenido) { window.helpers.mostrarAlerta('Escribe el contenido del aviso.', 'advertencia'); return; }
      const btn = cont.querySelector('#avisoEnviar');
      btn.disabled = true;
      try {
        await window.gruposRepository.crearAviso(grupo.id, contenido);
        window.helpers.mostrarAlerta('Aviso publicado.', 'exito');
        this._tabAvisos(cont, grupo, usuario);
      } catch (err) { btn.disabled = false; window.helpers.mostrarAlerta('Error: ' + err.message, 'error'); }
    });
  }

  cont.querySelectorAll('[data-eliminar-aviso]').forEach(btn => {
    btn.onclick = async () => {
      const ok = await window.helpers.confirmar('¿Eliminar este aviso?', { titulo: 'Eliminar aviso', textoConfirmar: 'Eliminar' });
      if (!ok) return;
      try {
        await window.gruposRepository.eliminarAviso(btn.dataset.eliminarAviso);
        this._tabAvisos(cont, grupo, usuario);
      } catch (err) { window.helpers.mostrarAlerta('Error: ' + err.message, 'error'); }
    };
  });
},

_tarjetaAviso(a, usuario, esResponsable) {
  const autor = (a.perfiles && a.perfiles[0]) || a.perfiles || {};
  const puedeBorrar = esResponsable || autor.id === usuario.id;
  return `
    <article class="grupos-aviso">
      <div class="grupos-miembro__avatar">${avatarHtml(autor)}</div>
      <div class="grupos-aviso__cuerpo">
        <div class="grupos-aviso__meta">
          <strong>${E(autor.nombre_completo || autor.username)}</strong>
          <span>${E(window.helpers.formatearFecha(a.creado_en))}</span>
          ${puedeBorrar ? `<button class="grupos-aviso__borrar" data-eliminar-aviso="${a.id}" aria-label="Eliminar aviso">${I('trash-2')}</button>` : ''}
        </div>
        <p class="grupos-aviso__contenido">${E(a.contenido)}</p>
      </div>
    </article>`;
},
```

- [ ] **Step 4: Implementar el tab Estadísticas**

```js
async _tabEstadisticas(cont, grupo, usuario) {
  const [stats, progreso, actividad] = await Promise.all([
    window.gruposRepository.estadisticasClase(grupo.id),
    window.gruposRepository.progresoMiembros(grupo.id),
    window.gruposRepository.actividadClase(grupo.id, 15)
  ]);
  const s = stats || {};
  const tarjeta = (icono, etiqueta, valor) => `
    <div class="grupos-stats-card">
      <span class="grupos-stats-card__icono">${I(icono)}</span>
      <p class="grupos-stats-card__valor">${valor}</p>
      <p class="grupos-stats-card__etiqueta">${etiqueta}</p>
    </div>`;
  const progresoHtml = progreso.length ? `
    <div class="grupos-stats-seccion">
      <h4 class="grupos-rolgrupo__titulo">${I('book-open')} Progreso de estudio</h4>
      <div class="grupos-progreso-lista">
        ${progreso.map(p => `
          <div class="grupos-progreso-item">
            <span class="grupos-miembro__avatar">${avatarHtml(p)}</span>
            <div class="grupos-progreso-item__info">
              <p class="grupos-progreso-item__nombre">${E(p.nombre_completo || p.username)}</p>
              <div class="grupos-progreso-item__barra"><span style="width:${Math.min(100, Math.round((p.capitulos_estudiados || 0) / 50 * 100))}%"></span></div>
            </div>
            <strong class="grupos-progreso-item__num">${p.capitulos_estudiados || 0}</strong>
          </div>`).join('')}
      </div>
    </div>` : '';
  const actividadHtml = actividad.length ? `
    <div class="grupos-stats-seccion">
      <h4 class="grupos-rolgrupo__titulo">${I('activity')} Actividad reciente</h4>
      <div class="o-pila" style="gap:var(--espaciado-xs)">
        ${actividad.map(a => `
          <div class="grupos-actividad">
            <span class="grupos-actividad__icono">${I(this._iconoActividad(a.tipo))}</span>
            <p class="grupos-actividad__texto">${E(this._textoActividad(a))}</p>
            <span class="grupos-actividad__fecha">${E(window.helpers.formatearFecha(a.creado_en))}</span>
          </div>`).join('')}
      </div>
    </div>` : '';
  cont.innerHTML = `
    <div class="grupos-stats-grid">
      ${tarjeta('users', 'Miembros', s.miembros ?? '—')}
      ${tarjeta('graduation-cap', 'Profesores', s.profesores ?? '—')}
      ${tarjeta('clipboard-check', 'Exámenes', s.examenes ?? '—')}
      ${tarjeta('megaphone', 'Avisos', s.avisos ?? '—')}
      ${tarjeta('user-plus', 'Solicitudes pendientes', s.solicitudes_pendientes ?? '—')}
      ${tarjeta('zap', 'Activos (7 días)', s.activos_7d ?? '—')}
    </div>
    ${progresoHtml}
    ${actividadHtml}`;
  if (window.Iconos) window.Iconos.actualizar();
},

_iconoActividad(tipo) {
  if (tipo === 'solicitud_ingreso') return 'user-plus';
  if (tipo === 'solicitud_aceptada') return 'user-check';
  if (tipo === 'solicitud_rechazada') return 'user-x';
  if (tipo === 'aviso_creado') return 'megaphone';
  if (tipo === 'ingreso_codigo') return 'log-in';
  return 'activity';
},

_textoActividad(a) {
  const actor = (a.perfiles && a.perfiles[0] && (a.perfiles[0].nombre_completo || a.perfiles[0].username)) || 'Alguien';
  if (a.tipo === 'solicitud_ingreso') return `${actor} solicitó unirse a la clase`;
  if (a.tipo === 'solicitud_aceptada') return `Solicitud de ${actor} aprobada`;
  if (a.tipo === 'solicitud_rechazada') return `Solicitud de ${actor} rechazada`;
  if (a.tipo === 'aviso_creado') return `${actor} publicó un aviso`;
  if (a.tipo === 'ingreso_codigo') return `${actor} se unió con el código`;
  return `${actor} · ${a.tipo}`;
},
```

- [ ] **Step 5: Añadir el CSS de pestañas, solicitudes, avisos y estadísticas**

En `css/05-componentes/_grupos.css`:

```css
/* Pestañas de la clase */
.grupos-tabs {
  display: flex; gap: var(--espaciado-xxs);
  border-bottom: 1px solid var(--color-borde);
  overflow-x: auto; -webkit-overflow-scrolling: touch;
}
.grupos-tabs__tab {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 12px 14px; background: none; border: none; cursor: pointer;
  font: inherit; font-size: var(--fuente-sm); font-weight: 600;
  color: var(--color-texto-secundario); white-space: nowrap;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.grupos-tabs__tab.is-activo { color: var(--color-acento); border-bottom-color: var(--color-acento); }
.grupos-tabs__tab:focus-visible { outline: 2px solid var(--color-acento); outline-offset: 2px; }

/* Solicitudes */
.grupos-solicitud { display: flex; align-items: center; gap: var(--espaciado-sm);
  background: var(--color-superficie); border: 1px solid var(--color-borde);
  border-radius: var(--radio-md); padding: var(--espaciado-sm); }
.grupos-solicitud__info { flex: 1; min-width: 0; }
.grupos-solicitud__nombre { font-weight: 600; margin: 0; }
.grupos-solicitud__username { font-size: var(--fuente-xs); color: var(--color-texto-terciario); margin: 0; }
.grupos-solicitud__acciones { display: flex; gap: 6px; }

/* Avisos */
.grupos-aviso-form { display: flex; gap: var(--espaciado-sm); align-items: flex-start;
  background: var(--color-superficie); border: 1px solid var(--color-borde);
  border-radius: var(--radio-md); padding: var(--espaciado-sm); }
.grupos-aviso-form__caja { flex: 1; }
.grupos-aviso-form__caja textarea { width: 100%; resize: vertical; min-height: 56px; }
.grupos-aviso-form__pie { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
.grupos-aviso { display: flex; gap: var(--espaciado-sm); padding: var(--espaciado-sm) 0;
  border-bottom: 1px solid var(--color-borde); }
.grupos-aviso__cuerpo { flex: 1; min-width: 0; }
.grupos-aviso__meta { display: flex; align-items: center; gap: 8px; }
.grupos-aviso__meta span { font-size: var(--fuente-xs); color: var(--color-texto-terciario); }
.grupos-aviso__borrar { margin-left: auto; }
.grupos-aviso__contenido { margin: 4px 0 0; white-space: pre-wrap; }

/* Estadísticas */
.grupos-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--espaciado-sm); }
@media (min-width: 640px) { .grupos-stats-grid { grid-template-columns: repeat(3, 1fr); } }
.grupos-stats-card { background: var(--color-superficie); border: 1px solid var(--color-borde);
  border-radius: var(--radio-md); padding: var(--espaciado-md); text-align: center; }
.grupos-stats-card__icono { color: var(--color-acento); }
.grupos-stats-card__valor { font-size: 1.6rem; font-weight: 700; margin: 4px 0 0; }
.grupos-stats-card__etiqueta { font-size: var(--fuente-xs); color: var(--color-texto-secundario); margin: 0; }
.grupos-stats-seccion { margin-top: var(--espaciado-lg); }
.grupos-progreso-item { display: flex; align-items: center; gap: var(--espaciado-sm);
  padding: 6px 0; }
.grupos-progreso-item__info { flex: 1; min-width: 0; }
.grupos-progreso-item__nombre { margin: 0; font-size: var(--fuente-sm); }
.grupos-progreso-item__barra { height: 6px; border-radius: 3px; background: var(--color-borde); margin-top: 4px; overflow: hidden; }
.grupos-progreso-item__barra span { display: block; height: 100%; background: var(--color-acento); }
.grupos-progreso-item__num { font-size: var(--fuente-xs); }
.grupos-actividad { display: flex; align-items: center; gap: var(--espaciado-sm);
  padding: 8px 0; border-bottom: 1px solid var(--color-borde); font-size: var(--fuente-sm); }
.grupos-actividad__icono { color: var(--color-texto-secundario); }
.grupos-actividad__texto { flex: 1; margin: 0; }
.grupos-actividad__fecha { font-size: var(--fuente-xs); color: var(--color-texto-terciario); }
```

- [ ] **Step 6: Verificar sintaxis y comportamiento en preview**

Run: `node --check js/vistas/vista-grupos.js`
Run: `npm run dev` y abrir `http://localhost:3000/#!/grupos/:id` con una cuenta con clase. Verificar manualmente: pestañas cambian, solicitudes aparecen para responsables con Aprobar/Rechazar, avisos se crean/borran, estadísticas muestran números y actividad.

- [ ] **Step 7: Commit**

```bash
git add js/vistas/vista-grupos.js css/05-componentes/_grupos.css
git commit -m "feat(grupos): detalle de clase con pestañas Personas, Avisos y Estadísticas"
```

---

### Task 4: Directorio "Mis clases" profesional (stats + solicitudes)

**Files:**
- Modify: `js/vistas/vista-grupos.js` (`_montarDirectorio`, `_tarjetaClase`)
- Modify: `css/05-componentes/_grupos.css`

**Interfaces:**
- Consumes: `listarMisClases`, `misSolicitudes` (Task 2).
- Produces: tarjeta de clase v2 con chips de stats y badge de solicitudes pendientes del usuario.

- [ ] **Step 1: Actualizar `_montarDirectorio` para cargar y mostrar solicitudes propias**

En `_montarDirectorio`, ampliar el `Promise.all` inicial y añadir la sección:

```js
const [clases, invitaciones, instituciones, misSolicitudes] = await Promise.all([
  window.gruposRepository.listarMisClases(usuario.id),
  window.desafiosRepository.misInvitaciones(usuario.id),
  window.gruposRepository.listarInstituciones(usuario.id),
  window.gruposRepository.misSolicitudes(usuario.id)
]);
```

Y antes de `cont.innerHTML = ...`, insertar:

```js
const solicitudesHtml = misSolicitudes.length ? `
  <section class="grupos-seccion">
    <div class="grupos-seccion__cabecera">
      <div class="grupos-seccion__icono">${I('clock')}</div>
      <div>
        <h3 class="grupos-seccion__titulo">Tus solicitudes de ingreso</h3>
        <p class="grupos-seccion__desc">Estás esperando aprobación en ${misSolicitudes.length} clase${misSolicitudes.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
    <div class="o-pila" style="gap:var(--espaciado-xs)">
      ${misSolicitudes.filter(s => s.estado === 'pendiente').map(s => `
        <div class="grupos-solicitud">
          <div class="grupos-solicitud__info">
            <p class="grupos-solicitud__nombre">${E((s.grupos && s.grupos.nombre) || 'Clase')}</p>
            <p class="grupos-solicitud__username">Pendiente de aprobación</p>
          </div>
          <span class="grupos-solicitud__estado">${I('clock')} En espera</span>
        </div>`).join('')}
    </div>
  </section>` : '';
```

Incluir `solicitudesHtml` al inicio del `cont.innerHTML` final.

- [ ] **Step 2: Mejorar `_tarjetaClase` con chips de stats**

Reemplazar el cuerpo de la tarjeta por:

```js
return `
  <article class="grupos-clase-card" data-grupo="${g.id}">
    <div class="grupos-clase-card__portada" style="background:${gradiente}">
      <div class="grupos-clase-card__portada-icono">${I('book-open')}</div>
      <div class="grupos-clase-card__portada-info">
        <h3 class="grupos-clase-card__nombre">${E(g.nombre)}</h3>
        ${g.instituciones && g.instituciones.nombre ? `<p class="grupos-clase-card__inst">${E(g.instituciones.nombre)}</p>` : ''}
      </div>
    </div>
    <div class="grupos-clase-card__cuerpo">
      <div class="grupos-clase-card__meta">
        <span>${I('users')} ${g.num_miembros}</span>
        ${esProfesor ? `<span class="grupos-clase-card__rol">${I('graduation-cap')} Profesor</span>` : ''}
      </div>
      ${admin && g.codigo ? `
      <div class="grupos-clase-card__codigo"><span>Código:</span><strong>${E(g.codigo)}</strong></div>` : ''}
      <button class="btn-primario grupos-clase-card__btn" data-grupo="${g.id}">${I('eye')} Ver clase</button>
    </div>
  </article>`;
```

> Nota: `num_miembros` ya existe en `listarMisClases`; si se quiere también el nº de exámenes en la tarjeta, `listarMisClases` puede añadir `examenes` con un `examenes_personalizados` count (opcional, no bloqueante).

- [ ] **Step 3: Verificar**

Run: `node --check js/vistas/vista-grupos.js && npm test`
Expected: sin errores; tests verdes.

- [ ] **Step 4: Commit**

```bash
git add js/vistas/vista-grupos.js css/05-componentes/_grupos.css
git commit -m "feat(grupos): directorio con solicitudes pendientes y tarjetas mejoradas"
```

---

### Task 5: Integración — notificaciones, desafío a toda la clase y trabajo de la clase

**Files:**
- Modify: `js/core/notification-service.js` (`_registrarEventos` con eventos `grupo.solicitud` / `grupo.aviso`, `_configLegacy`, `_urlDe`, `MAPA_TIPO` en `js/datos/notificaciones-repository.js`)
- Modify: `js/vistas/vista-grupos.js` (botón "Desafiar a toda la clase" + pestaña "Trabajo")

**Interfaces:**
- Consumes: RPCs de la Task 1 (ya insertan notificaciones con tipo `solicitud_clase` y `grupo`); `notificationService.emitir`; `examenesRepository.listarExamenesSueltos(grupoId)`; `desafiosRepository.crearDesafio`.
- Produces: notificaciones legibles para `solicitud_clase` (centro + banner con acción "ver" que navega a la clase); botón de desafío a toda la clase; pestaña Trabajo con exámenes de la clase.

- [ ] **Step 1: Hacer legibles las notificaciones de clase en el servicio**

En `js/core/notification-service.js` `_configLegacy`, añadir ramas (junto a las de `desafio`/`anuncio`):

```js
} else if (f.tipo === 'solicitud_clase') {
  cfg.respetarPrefs = false;
  cfg.prioridad = 'alta';
  cfg.acciones = ['ver'].map(a => ({ id: a, ...(ACCIONES[a] || {}) }));
} else if (f.tipo === 'grupo' && f.datos && f.datos.grupo_id) {
  cfg.acciones = ['ver'].map(a => ({ id: a, ...(ACCIONES[a] || {}) }));
}
```

En `_urlDe`, añadir:

```js
if ((f.tipo === 'solicitud_clase' || f.tipo === 'grupo') && d.grupo_id) return '/grupos/' + d.grupo_id;
```

En `js/datos/notificaciones-repository.js`, añadir a `MAPA_TIPO` (buscar la constante y añadir):

```js
solicitud_clase: { categoria: 'grupos', prioridad: 'alta', icono: 'user-plus' },
```

- [ ] **Step 2: Registrar los eventos de clase para emisiones futuras**

En `_registrarEventos`, dentro de la sección `── Grupos ──`, añadir:

```js
r('grupo.solicitud', {
  categoria: 'grupos', prioridad: 'alta',
  titulo: (p) => `Solicitud de ${p.usuario || 'un alumno'}`,
  cuerpo: (p) => `Quiere unirse a «${p.grupo || 'tu clase'}». Revisa las solicitudes.`,
  url: (p) => `/grupos/${p.grupoId}`,
  icono: 'user-plus',
  nativo: true, toast: true, sonido: true,
  acciones: ['ver'],
  destinatarios: (p) => p.destinatarios || null
});
r('grupo.aviso', {
  categoria: 'grupos', prioridad: 'media',
  titulo: (p) => `Nuevo aviso en ${p.grupo || 'tu clase'}`,
  cuerpo: (p) => (p.autor ? `${p.autor}: ` : '') + (p.contenido || ''),
  url: (p) => `/grupos/${p.grupoId}`,
  icono: 'megaphone',
  nativo: false, toast: true, sonido: false,
  acciones: ['ver'],
  destinatarios: (p) => p.destinatarios || null
});
```

- [ ] **Step 3: Desafío a toda la clase**

En `_montarGrupo`, junto a la barra de desafío, añadir el botón y el handler:

```js
${soyMiembro && miembros.length > 1 ? `
<div class="grupos-desafio-clase">
  <button class="btn-secundario" id="btnDesafiarClase">${I('sword')} Desafiar a toda la clase</button>
</div>` : ''}
```

```js
const btnDesafiarClase = raiz.querySelector('#btnDesafiarClase');
if (btnDesafiarClase) btnDesafiarClase.onclick = async () => {
  const otros = miembros.filter(m => m.id !== usuario.id);
  if (!otros.length) { window.helpers.mostrarAlerta('No hay otros miembros en la clase.', 'info'); return; }
  btnDesafiarClase.disabled = true;
  try { await this._flujoDesafio(otros); }
  catch (e) { window.helpers.mostrarAlerta('Error: ' + e.message, 'error'); }
  finally { btnDesafiarClase.disabled = false; }
};
```

- [ ] **Step 4: Pestaña "Trabajo" con los exámenes de la clase**

En el `<nav class="grupos-tabs">`, añadir antes de Estadísticas:

```js
<button class="grupos-tabs__tab" role="tab" aria-selected="false" data-tab="trabajo">${I('clipboard-check')} Trabajo</button>
```

Y en `_renderTab`, derivar a `_tabTrabajo`; implementar:

```js
async _tabTrabajo(cont, grupo, usuario) {
  const esResponsable = ['admin', 'editor', 'owner'].includes(usuario.rol)
    || (this._miembros || []).some(m => m.id === usuario.id && ['admin', 'editor', 'ayudante'].includes(m.rol_en_grupo));
  const [sueltos, evaluaciones] = await Promise.all([
    window.examenesRepository.listarExamenesSueltos(grupo.id).catch(() => []),
    window.examenesRepository.listarEvaluaciones(grupo.id).catch(() => [])
  ]);
  const exs = [...sueltos, ...evaluaciones.flatMap(ev => (ev.examenes || []))].filter(Boolean);
  cont.innerHTML = exs.length ? `
    <div class="o-pila" style="gap:var(--espaciado-xs)">
      ${exs.map(x => `
        <div class="grupos-trabajo-item">
          <span class="grupos-trabajo-item__icono">${I('clipboard-check')}</span>
          <div class="grupos-trabajo-item__info">
            <p class="grupos-trabajo-item__titulo">${E(x.titulo || 'Examen')}</p>
            <p class="grupos-trabajo-item__sub">${E(x.asignatura || '')}${esResponsable ? ` · ${x.intentos || 0} entrega${x.intentos === 1 ? '' : 's'}` : ''}</p>
          </div>
          <a class="btn-secundario u-fs-xs" href="#!/tomar/${encodeURIComponent(x.id)}">${I('eye')} Ver</a>
        </div>`).join('')}
    </div>` : `<p class="u-color-texto-terciario u-fs-sm">Aún no hay exámenes en esta clase.</p>`;
  if (window.Iconos) window.Iconos.actualizar();
},
```

- [ ] **Step 5: Verificar**

Run: `node --check js/core/notification-service.js && node --check js/datos/notificaciones-repository.js && node --check js/vistas/vista-grupos.js && npm test`
Expected: sin errores, tests verdes. Preview: crear un aviso en una clase → la notificación llega a la campana; "Desafiar a toda la clase" crea un desafío multi-participante; la pestaña Trabajo lista los exámenes del grupo.

- [ ] **Step 6: Commit**

```bash
git add js/core/notification-service.js js/datos/notificaciones-repository.js js/vistas/vista-grupos.js
git commit -m "feat(grupos): integración con notificaciones, desafío a toda la clase y pestaña Trabajo"
```

---

### Task 6: Verificación final

**Files:** ninguno (solo comprobaciones).

- [ ] **Step 1: Tests completos y sintaxis**

Run: `node --check js/datos/grupos-repository.js && node --check js/vistas/vista-grupos.js && node --check js/core/notification-service.js && npm test`
Expected: **todos** los tests pasan (el suite completo, ~300+).

- [ ] **Step 2: Build público**

Run: `npm run build:public`
Expected: build OK, `dist-public/` generado con el login, la app bajo `/app/` y los archivos SEO.

- [ ] **Step 3: Preview manual del flujo completo**

Con `npm run dev` (o el build publicado), verificar con una cuenta con clase:
1. Mis clases → tarjeta con stats.
2. Detalle → pestañas Personas/Avisos/Estadísticas/Trabajo.
3. Como responsable: aprobar/rechazar una solicitud (crear una con una cuenta de alumno de prueba y revertir).
4. Publicar y eliminar un aviso.
5. Desafiar a toda la clase (cancelar el desafío si no se completa).
6. Las notificaciones `solicitud_clase` llegan al centro y navegan a la clase.

- [ ] **Step 4: `git diff --check` y estado**

Run: `git diff --check && git status --short --branch`
Expected: sin errores de whitespace. **NO** commitear, pushear ni desplegar; **NO** aplicar la migración 044 en Supabase sin que el usuario lo pida explícitamente (avisarle de que, para probarlo en producción, hay que ejecutar la migración y decidir si `unirse_con_codigo` sigue siendo entrada directa o pasa a solicitud obligatoria).

---

## Self-Review (hecho por el autor del plan)

**1. Cobertura del spec:** La petición ("grupos profesionales, integración y visual") se cubre así: modelo unificado + admisión (T1), repositorio (T2), visual del detalle con pestañas y directorio (T3-T4), integración con notificaciones/desafíos/exámenes (T5), verificación (T6). Usuarios y desafíos quedan FUERA de este plan a petición explícita (prioridad grupos) — si luego se quiere, se escribe un plan propio.

**2. Escaneo de placeholders:** No hay "TBD"/"implementar luego": cada paso lleva código real, comandos de verificación y commits.

**3. Consistencia de tipos:** `solicitar_ingreso(UUID)→UUID`, `resolver_solicitud(UUID,BOOLEAN)→BOOLEAN`, `crear_aviso(UUID,TEXT)→UUID`, `eliminar_aviso(UUID)→BOOLEAN`, `estadisticas_clase(UUID)→JSONB`, `progreso_miembros(UUID)→TABLE` se declaran en T1 y se consumen con los mismos nombres/argumentos en T2 (`p_grupo_id`, `p_solicitud_id`, `p_aceptar`, `p_contenido`, `p_aviso_id`). Los métodos del repo (`solicitarIngreso`, `resolverSolicitud`, `crearAviso`, etc.) se usan en T3-T5 con los mismos nombres. `obtenerMiembrosDe` cambia de contrato en T2 (perfil + `rol_en_grupo` + `es_principal`) y T3 lo consume con `m.rol_en_grupo` — coherente.
