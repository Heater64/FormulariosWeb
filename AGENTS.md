# Instrucciones para agentes

Antes de tocar código, lee también [CONVENCIONES.md](CONVENCIONES.md). Este archivo manda sobre cómo se añade una sección nueva a la web.

## Regla principal: ninguna sección nueva se publica sin bandera

Toda sección que aún no esté terminada se desarrolla y se despliega **detrás de una función** (`feature flag`) en estado `oculta`. Los usuarios no deben ver el enlace, la ruta ni ningún acceso indirecto hasta que se cambie el estado a `beta` o `activa`.

El estado vive en Supabase, no en el código. No se usan ramas eternas ni despliegues separados para ocultar una sección.

### Estados

| Estado | Quién la ve |
|--------|-------------|
| `oculta` | Solo el owner (para probar en producción) |
| `beta` | Owner + usuarios de `usuarios` + miembros de las clases de `grupos` |
| `activa` | Todos los usuarios autenticados |

La infraestructura SQL está en [supabase/migraciones/076_funciones.sql](supabase/migraciones/076_funciones.sql): tabla `public.funciones` y RPC `public.fb_funciones()`. La RPC devuelve solo `clave` y `activa`; nunca expone los testers.

**Estado actual del cliente:** el runtime de banderas aún no existe. Si vas a añadir una sección, créalo antes con este contrato:

```js
// js/core/features.js
window.features = {
  async cargar() { /* RPC fb_funciones(); mapa en memoria */ },
  activa(clave) { /* false si no se cargó o la RPC falló */ }
};
```

- Se carga en `APP.init()` después de restaurar la sesión y **antes** de `_inicializarRutas()`.
- Si la RPC falla o no hay red, todas las funciones valen `false`: nunca se muestra una sección a medias.
- El owner ya recibe `true` desde la RPC; no hace falta comprobar su rol en el cliente.

## Procedimiento para crear una sección

### 1. Bandera

Añade la clave en la semilla de `076_funciones.sql` o en una migración nueva:

```sql
INSERT INTO public.funciones (clave, estado)
VALUES ('mi-seccion', 'oculta')
ON CONFLICT (clave) DO NOTHING;
```

La clave es `kebab-case` y coincide con el primer segmento de la ruta (`/mi-seccion`).

### 2. Datos y permisos

- Las vistas **no** llaman a Supabase. Crea un repositorio en `js/datos/<seccion>-repository.js` y úsalo desde la vista.
- Toda tabla nueva necesita su migración en `supabase/migraciones/` (numerada), RLS activo y `GRANT` explícito. Sin `GRANT`, PostgREST devuelve `permission denied` aunque la política sea correcta.
- Prueba la política como cada rol: owner, admin, editor y alumno.
- Si la sección no debe ser accesible todavía ni por API, aplica la misma bandera en la RLS/RPC. Ocultar la interfaz no es control de acceso.

### 3. Vista

Crea `js/vistas/vista-<seccion>.js` con el contrato del proyecto:

```js
window.vistaMiSeccion = {
  async montar(raiz, contexto) { /* pinta y conecta listeners */ },
  desmontar() { /* limpia timers, listeners globales y suscripciones */ }
};
```

Reglas:

- Escapa siempre el texto dinámico (`window.helpers.escapeHtml` / `esc`).
- Nada de `onclick=` inline: usa `addEventListener` o `elemento.onclick =`.
- No dejes listeners globales, intervalos ni suscripciones sin limpiar en `desmontar()`.
- Usa los helpers existentes (`store`, `Iconos`, `window.helpers`, `skeleton`) antes de crear otro.
- Respeta el mínimo táctil de 44×44 px y los textos de accesibilidad (`aria-label`).

### 4. Ruta y guardia

Registra la ruta en `js/core/index.js` con carga perezosa:

```js
router.registrar('/mi-seccion', this._vistaLazy(
  ['./js/vistas/vista-mi-seccion.js'],
  () => window.vistaMiSeccion
));
```

- Las rutas exactas van antes que las paramétricas (`/editor/nuevo` antes de `/editor/:id`).
- Añade la clave al mapa de funciones y a la guardia del router:

```js
const FUNCION_DE_RUTA = { 'mi-seccion': 'mi-seccion' };

router.registrarGuardia((ruta) => {
  const clave = FUNCION_DE_RUTA[ruta.split('/')[1]];
  if (clave && !window.features.activa(clave)) return '/inicio';
});
```

La guardia debe redirigir, **nunca** dejar que la ruta caiga en «Página no encontrada». Cubre también el acceso por URL directa y los enlaces guardados.

### 5. Entradas visibles

Una ruta oculta no puede tener enlaces visibles. Revisa todos los puntos de entrada:

- `_renderizarBarraNavegacion()` en `js/core/index.js`: añade `funcion: 'mi-seccion'` al ítem y filtra la lista antes de pintar.
- Tarjetas y accesos de `/inicio`.
- Enlaces desde notificaciones, onboarding o páginas legales.
- Cualquier `router.navegar('/mi-seccion')` debe estar detrás de `features.activa('mi-seccion')`.

### 6. CSS

- Crea la hoja en `css/05-componentes/_<seccion>.css` usando solo tokens de `css/00-settings/`.
- Añádela al grupo y a la ruta correspondiente en `js/core/css-secciones.js` (`GRUPOS` y `RUTAS`). El `<head>` de `index.html` solo lleva el CSS crítico; una hoja que no esté en `css-secciones.js` no se cargará al entrar en la sección.
- Si la sección reutiliza estilos de otra, incluye esa hoja en el mismo grupo.

### 7. Pruebas

Como mínimo:

- Estática: la ruta está registrada, la guardia existe y no hay `onclick=` inline.
- Unitaria: lógica de dominio o repositorio.
- Bandera: con `oculta` no se pinta el enlace y la ruta redirige; con `activa` sí aparece.
- Sintaxis: `npx vitest run tests/sintaxis-vistas.test.js`.
- Suite completa: `npm test`.

No des por buena una sección solo porque compila: recorre el flujo real en el navegador con una cuenta de cada rol.

### 8. Despliegue por etapas

1. Aplica la migración y deja la función en `oculta`.
2. Despliega el código. Los usuarios no ven nada; el owner ya puede probar en producción.
3. Verifica el flujo completo como owner.
4. Cambia a `beta` y añade las clases o usuarios de confianza.
5. Cuando esté validada, cambia a `activa`.
6. Si algo falla, vuelve a `oculta` o `beta`: es el interruptor de emergencia, sin desplegar.

```sql
UPDATE public.funciones SET estado = 'beta'
WHERE clave = 'mi-seccion';
```

## Errores típicos

- Ocultar solo el menú y dejar la ruta accesible por URL directa.
- Registrar la ruta pero olvidar la hoja en `css-secciones.js`: la sección se ve sin estilos.
- Poner la ruta paramétrica antes que la exacta y capturar `/nuevo`.
- Enlazar desde Inicio o desde una notificación sin comprobar la bandera.
- Crear la tabla sin `GRANT`: la RPC `SECURITY DEFINER` funciona, pero el cliente recibe `permission denied` al consultarla.
- Cambiar el tipo de retorno de una RPC con `CREATE OR REPLACE`: usa `DROP FUNCTION IF EXISTS` antes.
- Cachear la respuesta de `fb_funciones()` en el service worker; debe consultarse al arrancar para que el cambio de estado surta efecto.
- Dar por terminada una sección sin probar los cuatro roles y el acceso directo.

## Checklist final

- [ ] Función creada en `oculta`.
- [ ] Migración idempotente, RLS y `GRANT` aplicados.
- [ ] Repositorio en `js/datos/`; la vista no llama a Supabase.
- [ ] Vista con `montar`/`desmontar` y sin `onclick` inline.
- [ ] Ruta lazy registrada y guardia por bandera.
- [ ] Navegación y accesos indirectos filtrados.
- [ ] CSS en `css-secciones.js`.
- [ ] Pruebas estáticas, unitarias y de bandera en verde.
- [ ] Probado como owner, admin, editor y alumno.
- [ ] Estado cambiado a `beta` o `activa` solo después de validar.
