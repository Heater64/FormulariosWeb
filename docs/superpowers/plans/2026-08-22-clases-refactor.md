# Sistema de Clases — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform groups into Classroom-like classes with join codes, announcements, and better exam integration.

**Architecture:** Incremental refactor — reuse `grupos` table, add columns, create `anuncios_grupo`, clean dual membership, new `vista-clases.js`.

**Tech Stack:** Vanilla JS, Supabase (PostgreSQL + RLS), Vite, CSS (ITCSS + BEM)

## Global Constraints

- Do NOT drop `perfiles.grupo_id` in this phase
- Roles: `'profesor'` | `'alumno'` only
- Class code: 6-char alphanumeric, unique, auto-generated
- RLS: professor = ALL, member = SELECT on anuncios
- All CSS uses design tokens from `_tokens.css`
- No console.log in production code

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/037_clases_refactor.sql` | Create | SQL migration |
| `js/datos/grupos-repository.js` | Modify | Code lookup, announcements CRUD, clean membership |
| `js/vistas/vista-clases.js` | Create | Home view (grid + create/join) |
| `js/vistas/vista-clases-detalle.js` | Create | Detail view (tabs: anuncios, examenes, desafios, progreso, miembros) |
| `css/05-componentes/_clases.css` | Create | All classes UI styles |
| `js/core/index.js` | Modify | Route registration, nav label |
| `js/datos/admin-repository.js` | Modify | Group CRUD for new fields |

---

### Task 1: SQL Migration

**Files:** Create `supabase/migrations/037_clases_refactor.sql`

- [ ] **Step 1:** Create migration with: add `codigo`, `color`, `institucion` columns to `grupos`; create `anuncios_grupo` table with RLS; map roles `admin/editor` → `profesor`, `miembro` → `alumno`; generate codes for existing groups
- [ ] **Step 2:** Verify in Supabase dashboard
- [ ] **Step 3:** Commit `feat(clases): migration for classes refactor`

---

### Task 2: Update grupos-repository.js

**Files:** Modify `js/datos/grupos-repository.js`

- [ ] **Step 1:** Add `crearGrupo(nombre, adminId, {color, institucion})` with code generation
- [ ] **Step 2:** Add `obtenerGrupoPorCodigo(codigo)` and `unirsePorCodigo(codigo, usuarioId)`
- [ ] **Step 3:** Add `obtenerAnuncios(grupoId)`, `crearAnuncio(...)`, `eliminarAnuncio(id)`
- [ ] **Step 4:** Simplify `obtenerMiembrosDe` to use only `miembros_grupo` (no dual fusion)
- [ ] **Step 5:** Simplify `esMiembroDe` and `misMembresias`
- [ ] **Step 6:** Remove `obtenerMiClase` (depends on `perfiles.grupo_id`)
- [ ] **Step 7:** Commit `feat(clases): repository with code lookup, announcements, clean membership`

---

### Task 3: Create vista-clases.js (Home)

**Files:** Create `js/vistas/vista-clases.js`, Modify `js/core/index.js`

- [ ] **Step 1:** Create home view: grid of class cards with color, name, code, role badge
- [ ] **Step 2:** Add "Crear clase" button (profesor only) and "Unirse" button
- [ ] **Step 3:** Register lazy route `/clases` and `/clases/:id` in `index.js`
- [ ] **Step 4:** Commit `feat(clases): home view with class grid`

---

### Task 4: Modals (Join by Code + Create Class)

**Files:** Modify `js/vistas/vista-clases.js`

- [ ] **Step 1:** Implement `_modalUnirse()`: 6-char input, auto-uppercase, validates code, navigates to class
- [ ] **Step 2:** Implement `_modalCrear()`: name, color picker (8 colors), institution field
- [ ] **Step 3:** Implement `_modalCodigoClase()`: shows generated code with copy button after creation
- [ ] **Step 4:** Commit `feat(clases): join and create class modals`

---

### Task 5: CSS for Classes

**Files:** Create `css/05-componentes/_clases.css`

- [ ] **Step 1:** Create card styles: `.clases-card` with color top border, grid layout
- [ ] **Step 2:** Create modal styles: `.clases-modal`, color picker, code display
- [ ] **Step 3:** Create empty state, header, responsive grid
- [ ] **Step 4:** Commit `feat(clases): classes UI styles`

---

### Task 6: Detail View with Tabs

**Files:** Create `js/vistas/vista-clases-detalle.js`

- [ ] **Step 1:** Create detail shell: header with class info, 5 tabs (Anuncios, Examenes, Desafios, Progreso, Miembros)
- [ ] **Step 2:** Implement Anuncios tab: list announcements, create form (profesor only)
- [ ] **Step 3:** Implement Miembros tab: member list with role badges, role management (profesor)
- [ ] **Step 4:** Wire Examenes tab to existing exam list filtered by grupo_id
- [ ] **Step 5:** Wire Desafios tab to existing challenge system
- [ ] **Step 6:** Add basic Progreso tab (member stats)
- [ ] **Step 7:** Commit `feat(clases): detail view with tabs and announcements`

---

### Task 7: Admin Panel Update

**Files:** Modify `js/datos/admin-repository.js`, `js/vistas/admin/vista-panel-admin.js`

- [ ] **Step 1:** Update `crearGrupo` to accept `color` and `institucion`
- [ ] **Step 2:** Update admin groups list to show code, color
- [ ] **Step 3:** Commit `feat(clases): admin panel support for new class fields`

---

### Task 8: Cleanup & Verify

- [ ] **Step 1:** Verify all routes work (`/clases`, `/clases/:id`)
- [ ] **Step 2:** Verify join flow: create class → get code → join with code
- [ ] **Step 3:** Verify announcements: professor creates, student reads
- [ ] **Step 4:** Run `npx vite build` — no errors
- [ ] **Step 5:** Remove old `vista-grupos.js` and `_grupos.css` if fully replaced
- [ ] **Step 6:** Commit `chore(clases): cleanup old groups files`
