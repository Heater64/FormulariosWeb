# Plan: Modo Estudio (proof-of-concept, 2 capítulos, 1 clase)

## Objetivo
Implementar el núcleo de "Modo Estudio" según la visión simplificada: por cada capítulo,
pantalla de lectura ("Lee el capítulo X" + botón "Ya lo he leído") → pantalla de preguntas
de verificación → fin. Solo los **primeros 2 capítulos** (Génesis 1 y 2), una sola clase,
persistido en Supabase. Sin texto bíblico completo (solo la instrucción "lee el capítulo X").

## Integración confirmada (verificada en el código)
- `window.supabaseClient` (js/core/app.js:29) y `window.getCurrentUser()` (js/auth/users.js:179) existen.
- `window.updateUser(id, updates)` (users.js:265) persiste en Supabase y sincroniza la sesión
  (users.js:300-303), pero NO maneja `progress`.
- `renderEstudio` (estudio.js) reconstruye `#estudioContent` con innerHTML, por lo que la UI
  del flujo se controla desde JS sin tocar el HTML estático.

## Cambios

### 1. supabase/schema.sql (tabla users, ~línea 46)
Añadir columna:
```sql
progress JSONB DEFAULT '{"studiedChapters":[]}'::jsonb,
```
⚠️ Debe aplicarse en el SQL Editor de Supabase (ALTER TABLE users ADD COLUMN ...).
Para que el concepto funcione AUNQUE no se aplique el schema, estudio.js degrada con elegancia
(guarda en memoria durante la sesión si el update falla).

### 2. js/auth/users.js (updateUser, ~líneas 289-291)
Añadir manejo de progress:
```js
if (updates.progress !== undefined) payload.progress = updates.progress;
```
Así `window.updateUser(user.id, { progress })` persiste y sincroniza la sesión.

### 3. js/usuario/estudio.js (reescritura de renderEstudio + helpers)
- Datos embebidos de 2 capítulos:
  - cap1 -> "Lee el capítulo 1 de Génesis (La Creación)" + 3 preguntas (texto / opción única / V-F).
  - cap2 -> "Lee el capítulo 2 de Génesis (El jardín del Edén)" + 3 preguntas.
- Carga progreso: `user.progress?.studiedChapters || []` (o sesión).
- Progreso real: porcentaje = estudiados/2; tarjetas reflejan el conteo.
- `window.continuarEstudio()` (estudio.html:75 lo llama) LANZA el flujo:
  1. Pantalla de lectura del primer capítulo pendiente: instrucción + botón "📖 Ya lo he leído".
  2. Pantalla de preguntas: render inline de las 3 preguntas (texto/radio/V-F, sin deps externas) + "Enviar".
  3. Al enviar -> marca el capítulo en studiedChapters, guarda vía updateUser, muestra
     "✅ Capítulo completado" + botón "Siguiente capítulo".
  4. Tras cap2 -> "🎉 Has completado el estudio de prueba".
- `window.abrirLibro` queda como no-op (mapa de libros fuera de alcance por ahora).

### 4. pages/estudio.html -> sin cambios estructurales
El JS reescribe #estudioContent; los IDs de progreso se siguen usando.

### 5. css/estudio.css -> reutiliza clases existentes
`.btn-primary`, `.btn-lg`, `.btn-full`, `.estudio-stat`, `.progreso-bar`.
Añadir solo 2-3 clases pequeñas para tarjetas de pregunta si hace falta.

## Fuera de alcance
Texto bíblico completo, memorización, exámenes por capítulo/tema/global, multi-clase,
paneles Owner/Admin de clases, mapa visual detallado.

## Orden de implementación
1. schema.sql (columna progress) + users.js (updateUser maneja progress).
2. estudio.js (datos + flujo + persistencia).
3. Verificación con `node --check` en los JS modificados.
