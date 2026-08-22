# Sistema de Clases — Refactor Incremental

**Fecha:** 2026-08-22
**Enfoque:** A (Refactor incremental)
**Estado:** Draft

---

## Problema actual

El sistema de grupos tiene 3 problemas estructurales:

1. **Dualidad de membresía**: `perfiles.grupo_id` (asignado por admin) + `miembros_grupo` (auto-unión) coexisten. La función `obtenerMiembrosDe()` fusiona ambas fuentes y deduplica. Las migraciones 032 y 035 parchean agujeros de RLS causados por esta dualidad.

2. **Puerta abierta**: Cualquier usuario se une a cualquier grupo con un clic. Sin código, sin aprobación, sin flujo de invitación. No es viable para un contexto de clase.

3. **Sin actividades**: La única interacción grupal son desafíos. No hay anuncios, no hay exámenes asignados visibles, no hay dashboard de progreso por clase.

---

## Objetivo

Transformar "grupos" en un sistema de **clases** estilo Google Classroom:
- Profesor crea clase → obtiene código + link
- Alumno se unión con código o link
- Clase tiene: tablón de anuncios, exámenes asignados, desafíos, dashboard de progreso
- Instituciones decorativas (solo agrupan clases, sin settings propios)

---

## Modelo de datos

### Tabla `grupos` (existente, se modifica)

| Columna | Tipo | Cambio |
|---------|------|--------|
| `id` | UUID | Se mantiene |
| `nombre` | TEXT | Se mantiene |
| `descripcion` | TEXT | Se mantiene |
| `admin_id` | UUID FK | Se mantiene (profesor creador) |
| `imagen` | TEXT | Se mantiene |
| `creado_en` | TIMESTAMPTZ | Se mantiene |
| `codigo` | TEXT | **NUEVO**: código alfanumérico único (6 chars, ej: `ABC123`) |
| `color` | TEXT | **NUEVO**: color hex de la clase (ej: `#2563EB`) |
| `institucion` | TEXT | **NUEVO**: nombre de la institución (decorativo, ej: "Iglesia Central") |

### Tabla `miembros_grupo` (existente, se limpia)

| Columna | Tipo | Cambio |
|---------|------|--------|
| `grupo_id` | UUID FK | Se mantiene |
| `usuario_id` | UUID FK | Se mantiene |
| `rol_en_grupo` | TEXT | Cambia valores: `'profesor'` \| `'alumno'` (antes: `'admin'` \| `'editor'` \| `'miembro'`) |
| `creado_en` | TIMESTAMPTZ | Se mantiene |

**Constraints:**
- UNIQUE(grupo_id, usuario_id) — se mantiene
- `admin_id` de `grupos` sigue siendo válido como ruta de pertenencia (RLS)

### Tabla `anuncios_grupo` (nueva)

| Columna | Tipo | Constraints |
|---------|------|-------------|
| `id` | UUID | PK, gen_random_uuid() |
| `grupo_id` | UUID FK → grupos(id) | ON DELETE CASCADE, NOT NULL |
| `autor_id` | UUID FK → perfiles(id) | ON DELETE SET NULL |
| `titulo` | TEXT | NOT NULL |
| `contenido` | TEXT | DEFAULT '' |
| `creado_en` | TIMESTAMPTZ | DEFAULT NOW() |

### Eliminado

- `perfiles.grupo_id` — se elimina en migración.Todos los usuarios pasan a `miembros_grupo`.

---

## Flujos de usuario

### 1. Crear clase (profesor)

```
Profesor → "+" en vista de clases
  → Formulario: nombre, color (paleta predefinida), institución (opcional)
  → Guarda en `grupos` con admin_id = usuario actual
  → Genera código único (6 chars alfanumérico, mayúsculas)
  → Muestra código + link copiable
```

### 2. Unirse a clase (alumno)

```
Opción A — Código:
  Alumno → "Unirse" → ingresa código → busca grupo por código → se inserta en miembros_grupo

Opción B — Link:
  Alumno → click link (#!/clases/unirse?codigo=ABC123)
  → busca grupo por código → se inserta en miembros_grupo
```

### 3. Ver mis clases

```
Grid de cards (color de la clase, nombre, #miembros, rol)
  → Click card → detalle de la clase
```

### 4. Detalle de clase

```
Tabs: Anuncios | Exámenes | Desafíos | Progreso | Miembros

Anuncios (por defecto):
  - Lista cronológica de anuncios
  - Profesor: botón "Nuevo anuncio" → formulario título + contenido
  - Alumno: solo lectura

Exámenes:
  - Lista de exámenes asignados a esta clase
  - Profesor: puede asignar examen existente o crear nuevo
  - Alumno: ve exámenes con fecha límite, puede tomarlos

Desafíos:
  - Sistema actual de desafíos entre miembros (se mantiene)

Progreso:
  - Profesor: dashboard con stats de la clase (quién leyó, promedio memorización, ranking)
  - Alumno: ve su propio progreso vs. promedio de la clase

Miembros:
  - Lista de miembros con avatar, nombre, rol
  - Profesor: puede cambiar roles, eliminar miembros
  - Alumno: solo ve la lista
```

### 5. Anuncios

```
Profesor crea anuncio:
  → Título + contenido (texto plano o markdown básico)
  → Se guarda en anuncios_grupo
  → (Opcional futuro: notificación push a miembros)

Alumno ve anuncios:
  → Lista cronológica más reciente primero
  → Cada anuncio: título, contenido, autor, fecha
```

---

## Migración SQL

### Paso 1: Agregar columnas a `grupos`

```sql
ALTER TABLE grupos ADD COLUMN codigo TEXT UNIQUE;
ALTER TABLE grupos ADD COLUMN color TEXT DEFAULT '#2563EB';
ALTER TABLE grupos ADD COLUMN institucion TEXT DEFAULT '';
```

### Paso 2: Generar códigos para grupos existentes

```sql
-- Función para generar código único
CREATE OR REPLACE FUNCTION generar_codigo_grupo()
RETURNS TEXT AS $$
DECLARE
  codigo TEXT;
  existe BOOLEAN;
BEGIN
  LOOP
    codigo := upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM grupos WHERE grupos.codigo = codigo) INTO existe;
    EXIT WHEN NOT existe;
  END LOOP;
  RETURN codigo;
END;
$$ LANGUAGE plpgsql;

-- Asignar códigos a todos los grupos existentes
UPDATE grupos SET codigo = generar_codigo_grupo() WHERE codigo IS NULL;
```

### Paso 3: Crear tabla `anuncios_grupo`

```sql
CREATE TABLE anuncios_grupo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  contenido TEXT DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anuncios_grupo_grupo ON anuncios_grupo(grupo_id, creado_en DESC);
```

### Paso 4: RLS para anuncios

```sql
-- Profesores de la clase pueden crear/editar/eliminar
CREATE POLICY anuncios_profesor ON anuncios_grupo
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM miembros_grupo mg
      WHERE mg.grupo_id = anuncios_grupo.grupo_id
        AND mg.usuario_id = auth.uid()
        AND mg.rol_en_grupo = 'profesor'
    )
  );

-- Miembros de la clase pueden leer
CREATE POLICY anuncios_miembro ON anuncios_grupo
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM miembros_grupo mg
      WHERE mg.grupo_id = anuncios_grupo.grupo_id
        AND mg.usuario_id = auth.uid()
    )
  );
```

### Paso 5: Migrar roles existentes

```sql
-- Mapear roles antiguos a nuevos
UPDATE miembros_grupo SET rol_en_grupo = 'profesor'
  WHERE rol_en_grupo IN ('admin', 'editor');

UPDATE miembros_grupo SET rol_en_grupo = 'alumno'
  WHERE rol_en_grupo = 'miembro';
```

### Paso 6: Limpiar `perfiles.grupo_id` (futuro)

**NO eliminar todavía.** Primero:
1. Actualizar JS para que no dependa de `perfiles.grupo_id`
2. Verificar que todo funciona con solo `miembros_grupo`
3. Entonces sí: `ALTER TABLE perfiles DROP COLUMN grupo_id;`

---

## Cambios en JS

### `grupos-repository.js`

**Eliminar:**
- `obtenerMiClase()` — ya no existe "mi clase" principal
- Referencias a `perfiles.grupo_id`

**Agregar:**
- `crearGrupo({ nombre, color, institucion, adminId })` — genera código automáticamente
- `unirsePorCodigo(codigo, usuarioId)` — busca grupo por código, inserta en miembros_grupo
- `obtenerGrupoPorCodigo(codigo)` — lookup por código
- `obtenerAnuncios(grupoId)` — lista anuncios de una clase
- `crearAnuncio(grupoId, autorId, titulo, contenido)` — inserta anuncio
- `eliminarAnuncio(anuncioId)` — borra anuncio

**Modificar:**
- `obtenerMiembrosDe(grupoId)` — solo usa `miembros_grupo` (sin fusionar con perfiles)
- `esMiembroDe(grupoId, usuarioId)` — solo verifica `miembros_grupo` + `grupos.admin_id`
- `misMembresias(usuarioId)` — solo `miembros_grupo`

### `vista-grupos.js`

**Reemplazar por:** `vista-clases.js` (nuevo archivo)

**Vista de clases (home):**
- Grid de cards con color, nombre, #miembros, rol
- Botón "Crear clase" (profesor) + "Unirse" (alumno)
- Modal "Unirse": input de código + botón copiar link

**Vista de detalle de clase:**
- Header con color, nombre, código, institución
- Tabs: Anuncios | Exámenes | Desafíos | Progreso | Miembros
- Cada tab carga su contenido

**Vista de anuncios:**
- Lista cronológica
- Profesor: botón "+", formulario inline
- Alumno: solo lectura

### `admin-repository.js`

**Eliminar:**
- `batchCambiarGrupo()` — ya no se usa (la dualidad desaparece)

**Modificar:**
- `crearGrupo()` — agrega parámetros color, institucion
- `listarGrupos()` — incluye código, color, institucion

---

## Cambios en CSS

### Nuevo: `_clases.css`

Basado en `_grupos.css` existente, con estos cambios:
- Cards de clase muestran color de borde superior
- Modal de código con botón "Copiar"
- Tabs de detalle de clase
- Lista de anuncios (estilo feed)

### Eliminar dead CSS de `_grupos.css`

Clases no usadas que se identificaron en el audit anterior.

---

## Orden de implementación

1. **Migración SQL** — columnas, tabla anuncios, RLS, mapeo de roles
2. **Repository** — actualizar `grupos-repository.js` con nuevos métodos
3. **Vista clases home** — grid de cards + crear/unirse
4. **Vista detalle** — tabs + anuncios
5. **Vista anuncios** — CRUD de anuncios
6. **Conectar exámenes** — vista de exámenes dentro de la clase
7. **Dashboard de progreso** — stats de la clase
8. **Cleanup** — eliminar `perfiles.grupo_id` (fase 2)
9. **Admin panel** — actualizar gestión de grupos

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Migración `perfiles.grupo_id` rompe datos | No eliminar en esta fase. Solo agregar columnas nuevas. |
| Códigos duplicados | Función SQL con LOOP hasta encontrar uno único. UNIQUE constraint. |
| RLS de anuncios | Policies simples: profesor=ALL, miembro=SELECT |
| Usuarios existentes sin `miembros_grupo` | Migración: insertar fila para cada usuario que tenga `perfiles.grupo_id` |
