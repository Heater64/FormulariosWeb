# FormsBiblicos: mapa tecnico completo

Fecha de referencia: 2026-08-25

Este documento explica como esta construido FormsBiblicos, que hace cada capa, como se conectan frontend y backend, que ocurre al pulsar las acciones principales y que partes estan activas, degradadas, pausadas o pendientes de operacion.

## 1. Resumen ejecutivo

FormsBiblicos es una SPA en JavaScript nativo, distribuida principalmente como PWA. Su objetivo tiene dos recorridos de producto:

- Estudio Guiado: continuar lectura, abrir libros y capitulos, leer fuera de la aplicacion, responder preguntas, repasar errores, memorizar y consultar progreso.
- Examenes Personalizados: profesores o editores crean examenes, los publican para una clase, los alumnos los realizan y el profesor corrige los intentos.

Alrededor de esos recorridos existen:

- Memorizacion con mazos, tarjetas, ejercicios variados y repeticion espaciada.
- Clases e instituciones con codigos de acceso, solicitudes, avisos, trabajo y estadisticas.
- Desafios multijugador basados en sesiones identicas de memorizacion.
- Notas de sesion y bloc de notas personal con papelera y exportacion.
- Notificaciones in-app, realtime, polling y soporte para push nativo pausado.
- Perfil, preferencias, accesibilidad, instalacion PWA y gestion de cuenta.
- Panel de owner y administrador de clase.
- Landing publica, login, registro, onboarding, recuperacion y contacto.

La app no tiene pagos ni suscripciones. El modelo previsto es gratuito; Stripe, webhooks de cobro, reembolsos y conciliacion de pagos son responsabilidades no aplicables mientras no exista una oferta de pago.

## 2. Estructura del repositorio

### Entradas y configuracion

- `index.html`: shell de la SPA autenticada. Incluye el `#app-root`, la barra inferior, el splash, indicadores de conexion y todos los scripts/CSS de la aplicacion.
- `public-site/`: landing publica y paginas de login, registro, onboarding, recuperacion, contacto, privacidad, terminos y licencias.
- `public/`: recursos estaticos de la PWA: `manifest.json`, `sw.js`, `offline.html`, iconos y Open Graph.
- `package.json`: version SemVer, dependencias Capacitor, Vite y Vitest, y scripts de desarrollo/build/test.
- `vite.config.js`: sirve y construye la SPA; copia los recursos sin hash, genera version runtime y expone las paginas legales en desarrollo.
- `vite.public.config.js`: construye la web publica en `dist-public`.
- `vercel.json`: usa `npm run build:public`, publica `dist-public`, configura rewrites y cabeceras de seguridad.
- `capacitor.config.json`: conserva la configuracion Android, aunque la APK esta pausada.
- `supabase/config.toml`: configuracion local de Supabase CLI.
- `.github/workflows/ci.yml`: instalacion limpia, audit de dependencias de produccion, tests y builds.
- `.github/dependabot.yml`: actualizaciones automaticas de dependencias npm y GitHub Actions.

### Capas JavaScript

- `js/core/`: ciclo de vida, router, estado, eventos, navegacion, errores, notificaciones y service worker.
- `js/config/`: resolucion de entorno y modo demo/produccion.
- `js/datos/`: cliente Supabase y repositorios de cada recurso.
- `js/dominio/`: reglas puras de progreso, repeticion, puntuacion, logros, estados y ejercicios.
- `js/componentes/`: piezas reutilizables como campana, editores, perfil, instalacion PWA y versionado.
- `js/vistas/`: controladores de pantallas; construyen HTML, conectan listeners y llaman a repositorios/dominio.
- `js/vistas/admin/`: panel de administracion y utilidades comunes.
- `js/utilidades/`: DOM, sanitizacion, storage, preferencias, accesibilidad, animaciones, cache, errores y gestos.
- `js/services/`: push nativo y servicio de actualizaciones legado de APK.
- `js/vendor/`: runtime de Capacitor y Lucide.

La mayoria del codigo usa IIFE y objetos expuestos en `window`, por ejemplo `window.vistaEstudio`, `window.examenesRepository` y `window.router`. Hay modulos ESM concretos, como el editor Tiptap y el entrypoint `js/core/index.js`, que usan `type="module"`.

### Capas CSS

El CSS sigue ITCSS con nombres BEM y tokens custom properties:

1. `css/00-settings/`: tokens, colores, tipografia y espaciado.
2. `css/01-tools/`: funciones/helpers CSS.
3. `css/02-generic/`: reset.
4. `css/03-elements/`: body, headings, parrafos, botones, inputs y enlaces.
5. `css/04-objects/`: contenedores, pilas, grids y flechas/layout.
6. `css/05-componentes/`: componentes de producto: estudio, agenda, memorizacion, examenes, editor, grupos, desafios, perfil, admin, notificaciones, PWA, splash y sincronizacion.
7. `css/06-utilidades/`: utilidades, colores auxiliares, estilos inline controlados y accesibilidad.

Hay 76 hojas CSS. La paleta clara usa fondos calidos y azul de acento; el modo oscuro redefine superficies, bordes, textos, estados y sombras sin cambiar la jerarquia del producto. Tambien existen `prefers-reduced-motion`, `prefers-contrast` y tema de alto contraste.

## 3. Arranque de la aplicacion

### HTML inicial

`index.html` carga primero:

1. Metadatos, viewport con `viewport-fit=cover` e `interactive-widget=resizes-content`.
2. `theme-init.js`, que aplica el tema antes de pintar para evitar flash claro/oscuro.
3. `error-capture.js`, que recoge errores tempranos.
4. Las 76 hojas CSS.
5. Supabase JS desde CDN y Lucide.
6. Utilidades, core, configuracion, componentes, repositorios, dominio y vistas.
7. `js/core/index.js` como modulo de arranque.
8. `sw-register.js`, que solo registra el service worker en produccion HTTPS.

El body contiene:

- `#splashScreen`: pantalla inicial de carga.
- `#connectionIndicator`: aviso online/offline.
- `#app-root`: raiz donde se monta cada vista.
- `#barra-navegacion`: barra inferior movil/responsive.

Todos los scripts principales son `defer`, por lo que el navegador puede renderizar el HTML mientras descarga JavaScript. Las vistas pesadas se cargan bajo demanda mediante el router.

### Inicializacion (`js/core/index.js`)

El objeto `APP` coordina el arranque:

1. Aplica preferencias locales.
2. Inicia el splash con una duracion minima de 2 segundos y salida de 900 ms.
3. Recupera la sesion guardada y valida que exista un JWT Supabase para el mismo usuario.
4. Inicia push nativo en segundo plano si el runtime lo permite.
5. Aplica la marca del centro configurada por el owner.
6. Registra rutas y vistas.
7. Renderiza la navegacion inferior.
8. Reaplica tema, contraste y letra grande.
9. Monta la primera ruta o redirige al login.
10. Inicia la cola de sincronizacion en segundo plano.
11. Revalida la sesion contra el servidor y al volver online.
12. Inicia el servicio de notificaciones.
13. Actualiza `ultimo_acceso` con heartbeat.
14. Precarga vistas probables segun el rol.

El splash no deberia bloquear indefinidamente: tiene timeout de 10 segundos y watchdog de 15 segundos que intenta reparar cache y recargar.

### Splash y sincronizacion

El splash representa la entrada de la app. La sincronizacion es otra capa y no deberia aparecer si termina rapidamente:

- `sync-queue.js` publica `sincronizacion:inicio`.
- `sync-status.js` espera 650 ms antes de mostrar `Sincronizando datos...`.
- Si la sincronizacion inicial sigue activa, el indicador puede ocupar la pantalla completa con entrada y salida suave.
- Si termina, desaparece con fade.
- Si quedan operaciones, muestra `Pendientes: N cambios`.

## 4. Router y navegacion

`js/core/router.js` implementa una SPA con rutas hash del formato `#!ruta`.

Capacidades:

- Rutas estaticas y parametros dinamicos.
- Query string separado de los parametros de ruta.
- Guardias de autenticacion.
- Middlewares.
- Carga lazy y cache de vistas.
- Historial interno de hasta 20 rutas.
- Direccion adelante/atras para transiciones.
- Restauracion de scroll al volver.
- Proteccion frente a carreras de montajes async.
- Pantalla de error con reintentar o limpiar cache.
- Actualizacion del titulo del documento.
- Evento global `route:change`.

### Rutas registradas

- `/` y `/login`: redirigen al login normal si no hay sesion; con sesion llevan a Estudio.
- `/estudio`: portada de Estudio Guiado.
- `/agenda`: agenda de estudio, cargada lazy.
- `/estudio/libro/:libro`: lista de capitulos de un libro.
- `/estudio/sesion/:libro/:capitulo`: sesion de estudio de un capitulo.
- `/leer/:libro/:capitulo`: alias de lectura/sesion.
- `/examenes`: listado de examenes segun rol.
- `/memorizacion`: mazos, pendientes y juego.
- `/explorar`: contenido adicional y categorias.
- `/perfil`: perfil y configuracion principal.
- `/perfil/config/:seccion`: subapartados de preferencias.
- `/perfil/acerca/:seccion`: ayuda/informacion.
- `/notificaciones`: centro de notificaciones.
- `/mapa`: mapa biblico, lazy.
- `/tomar/:id`: realizar examen, lazy.
- `/editor/nuevo`: crear examen, lazy.
- `/editor/:id`: editar examen, lazy.
- `/corregir/:id`: corregir intentos, lazy.
- `/calificaciones`: evaluaciones y calificaciones, lazy.
- `/progreso`: progreso, estadisticas y logros, lazy.
- `/grupos`: Mis clases, lazy.
- `/grupos/:id`: detalle de clase, lazy.
- `/desafio/:id`: espera, juego y resultados del desafio, lazy.
- `/admin`: panel de administracion, lazy.

### Navegacion transversal

- Barra inferior: enlaces principales adaptados al rol y a la pantalla.
- Campana: componente comun de notificaciones en cabeceras.
- Back navigation: cierra primero modal/sheet y despues navega atras.
- Swipe back: gesto de deslizamiento hacia la derecha.
- Safe areas: padding con `env(safe-area-inset-*)` para PWA movil.
- Teclado: la barra inferior se oculta cuando puede tapar inputs.
- Haptica: feedback opcional en acciones compatibles.

## 5. Pantallas y botones

Esta seccion describe las acciones visibles principales. Cada vista es un controlador que pinta HTML en `#app-root`, conecta listeners y delega la persistencia al repositorio correspondiente.

### Estudio Guiado (`vista-estudio.js`)

Objetivo: ser la portada de continuidad.

Controles:

- `Continuar leyendo`: abre el siguiente libro/capitulo pendiente.
- `Agenda`: navega a `/agenda`.
- `Progreso`: navega a `/progreso`.
- `Repasos`: abre `/memorizacion` y muestra pendientes reales.
- `Examenes`: abre `/examenes` y muestra pendientes si los hay.
- Tarjetas de libro: abren `/estudio/libro/:libro`.
- Toggle Antiguo/Nuevo Testamento: colapsa o expande listas y guarda la preferencia.
- Campana: abre el centro de notificaciones.
- Boton de informacion: muestra la guia de la seccion.

Carga capitulos, progreso, tarjetas/repasos, examenes pendientes y datos del usuario. Usa skeleton mientras espera las consultas.

### Agenda (`vista-agenda.js`)

Muestra continuidad y tareas accionables:

- Proximo capitulo: abre la sesion correspondiente.
- Repasos pendientes: abre Memorizacion.
- Examenes disponibles: abre Examenes.
- Capitulo reciente: vuelve a la sesion completada.
- Volver: regresa a Estudio.

La agenda se calcula a partir de progreso y datos actuales; no introduce una tabla de objetivos persistentes.

### Capitulos (`vista-capitulos.js`)

Muestra todos los capitulos del libro y su estado.

- `Empezar` o `Continuar`: abre el primer capitulo pendiente.
- Tarjeta de capitulo: abre su sesion.
- Volver: regresa a Estudio.
- Estados vacios/error: diferencian libro sin contenido, capitulos sin preguntas y fallo de red.

### Sesion de estudio (`vista-sesion-estudio.js`)

Es una maquina de estados:

`no_iniciado -> leyendo -> preguntas -> evaluado -> repaso/completado`.

Controles y etapas:

- `Empezar`: cambia a lectura.
- `Ya lo he leido`: marca lectura y pasa a preguntas.
- Respuestas: se guardan en memoria de la sesion.
- `Comprobar`: evalua preguntas.
- `Continuar`: avanza entre preguntas.
- `Repasar`: entra en repaso de errores.
- `Repetir`: vuelve a preguntas.
- `Finalizar`: marca estudio completo y actualiza progreso.
- `Siguiente`: abre el siguiente capitulo.
- `Ver libro`: vuelve al indice del libro.
- Boton de notas/menu: abre o guarda nota de sesion.

Las notas se autosalvan mediante `notas_capitulo`; si no hay red se guardan localmente y entran en la cola.

### Mapa (`vista-mapa.js`)

Presenta libros/capitulos como un mapa visual. Pulsar un elemento abre la sesion del primer capitulo o del capitulo seleccionado. Es una vista de navegacion rapida, no otra fuente de progreso.

### Memorizacion (`vista-memorizacion.js`)

Es la superficie mas ludica de la app.

En el modo de practica:

- Selector de mazo.
- Contador de pendientes.
- `Comenzar`: construye una sesion de ejercicios.
- `Pista`: muestra una ayuda si existe.
- Respuesta escrita, elegir, ordenar, relacionar, verdadero/falso y completar huecos.
- `Comprobar`: valida y registra resultado.
- Resultado correcto/incorrecto: actualiza progreso SM-2 y repaso.
- `Repetir`: vuelve a practicar.
- `Salir`: vuelve a la lista.

En gestion de mazos:

- `Gestionar`: abre tarjetas del mazo.
- `Editar`: cambia nombre, descripcion, icono, color, orden o estado.
- `Duplicar`: crea una copia.
- `Exportar JSON`: descarga el mazo y sus tarjetas sin progreso privado.
- `Eliminar`: elimina/desactiva el mazo tras confirmacion.
- `Nueva tarjeta`: crea contenido.
- `Duplicar tarjeta`: copia una tarjeta.
- `Editar tarjeta`: modifica pregunta, respuesta, referencia, explicacion, opciones y tipo.
- `Eliminar tarjeta`: desactiva la tarjeta.

Los mazos globales se muestran a todos los usuarios. El owner puede sembrar contenido desde los JSON de `data/`.

### Explorar (`vista-explorar.js`)

Agrupa contenido editorial adicional: categorias, curiosidades, personajes, lugares, profecias y otras fuentes JSON.

- Tabs de categorias: cambian de contenido sin salir de la vista.
- Tarjetas: abren detalle o enlaces internos.
- Toggle/expandir: muestra contenido adicional.
- Enlaces biblicos: llevan a capitulos/sesiones.

La vista depende de archivos de datos locales y debe tolerar JSON vacio o corrupto mostrando estados vacios.

### Examenes (`vista-examenes.js`)

El contenido cambia segun rol.

Alumno:

- `Comenzar`: inicia un intento mediante `iniciar_intento_examen`.
- `Continuar`: vuelve al intento activo.
- `Ver resultados`: abre el intento/resultado permitido.
- Tarjeta/menu: consulta estado y fecha.

Profesor/editor/owner:

- `Nuevo examen`: abre `/editor/nuevo`.
- `Calificaciones`: abre `/calificaciones`.
- `Editar`: abre `/editor/:id`.
- `Duplicar`: crea copia del examen.
- `Publicar`: valida/publica y notifica a alumnos.
- `Asignar alumnos/estado`: muestra quienes tienen intento o entrega.
- `Compartir`: usa enlace o APIs de compartir.
- `Eliminar`: confirma y elimina el examen segun permisos.
- `Corregir`: abre `/corregir/:id`.

### Tomar examen (`vista-examen-tomar.js`)

Flujo:

1. Carga examen sin claves de correccion.
2. Inicia o recupera intento server-side.
3. Guarda borradores mediante RPC filtrada.
4. Permite navegar entre preguntas.
5. Permite marcar preguntas.
6. Comprueba temporizador basado en snapshot/configuracion.
7. `Entregar`: usa `entregar_intento_examen`, que filtra respuestas, comprueba obligatorias, tiempo y calcula puntuacion en servidor.
8. Muestra estado completado; nota final puede quedar pendiente de correccion manual.

La entrega es idempotente por estado: un intento completado no se puede volver a entregar.

### Editor de examenes (`vista-examen-editor.js`)

Tiene cuatro tabs:

- Informacion: titulo, materia, descripcion, referencia, portada y metadatos.
- Preguntas: secciones, orden, tipos y contenido.
- Configuracion: intentos, fechas, temporizador, resultados y opciones.
- Vista previa: simulacion de la experiencia del alumno.

Botones de preguntas:

- Subir/bajar: reordena.
- Duplicar: copia la pregunta.
- Eliminar: la quita.
- Anadir opcion: agrega distractores.
- Quitar opcion: elimina un distractor.
- Anadir par: agrega pareja para relacionar.
- Quitar par: elimina pareja.
- Anadir elemento: agrega ordenamiento.
- Imagen/audio/video/enlace: adjunta contenido con validacion de tipo/tamano.
- Guardar: persiste borrador.
- Publicar: valida y cambia a publicado.
- Vista previa: prueba la representacion sin entregar.

Los tipos soportados incluyen opcion unica, varias opciones, verdadero/falso, respuesta corta/larga, completar, ordenar y relacionar.

### Corregir (`vista-examen-corregir.js`)

- Lista intentos entregados.
- Abre cada pregunta y respuesta.
- Permite desplegar secciones.
- Permite marcar correccion manual por pregunta.
- Introduce observaciones.
- `Calificar`: llama a `calificar_intento_examen`; el servidor recalcula con la correccion y guarda nota, porcentaje, correccion y auditoria/fecha.
- `Volver`: regresa a examenes.

### Calificaciones (`vista-calificaciones.js`)

Gestiona evaluaciones que agrupan examenes.

- Crear evaluacion.
- Importar evaluaciones CSV.
- Exportar calificaciones CSV.
- Exportar PDF.
- Abrir evaluacion.
- Anadir examen a evaluacion.
- Editar examen.
- Corregir intento.
- Subir/bajar evaluacion.
- Configurar pesos/ponderaciones.

Los calculos visibles del cliente sirven para presentar datos, pero la entrega y correccion de intentos se validan mediante RPCs.

### Grupos e instituciones (`vista-grupos.js`)

#### Home Mis clases

- `Unirme con codigo`: abre modal, normaliza a mayusculas y llama a `unirse_con_codigo`.
- `Nueva clase`: crea grupo, codigo e institucion opcional.
- `Nueva institucion`: crea una institucion para el actor permitido.
- Tarjeta de clase: abre `/grupos/:id`.
- Invitacion de desafio `Aceptar`: acepta y espera o entra al desafio cuando todos estan listos.
- Invitacion `Rechazar`: rechaza y cancela segun la RPC.
- Solicitud pendiente: muestra estado en espera.

Las clases se agrupan por institucion y se muestran con banda de color estable.

#### Detalle de clase

Cabecera:

- Volver a Mis clases.
- Campana.
- Copiar codigo: copia el codigo de acceso.
- Compartir: usa Web Share, copia el enlace y ofrece WhatsApp.

Si el visitante no pertenece:

- `Unirme con codigo`.
- `Solicitar ingreso`.

Si pertenece, tabs:

- Personas: profesores, alumnos, perfiles rapidos, solicitudes de ingreso y gestion de alumnos para owner.
- Avisos: publicar, listar y eliminar avisos autorizados.
- Trabajo: examenes y evaluaciones de la clase.
- Estadisticas: miembros, profesores, examenes, avisos, solicitudes, actividad y progreso.

Tambien existe `Desafiar a toda la clase`, que abre el flujo de desafio con todos los miembros elegibles.

### Desafios (`vista-desafio.js`)

Estados de pantalla:

- Invitacion/espera: participantes, aceptaciones y cuenta atras.
- En curso: ejercicios identicos, progreso, reloj y guardado.
- Resultado: puntuacion, tiempos, revancha y salida.
- Cancelado/expirado/abandonado: mensaje y retorno a Grupos.

Controles:

- `Aceptar/Rechazar` invitacion.
- `Salir`: abandona via RPC y notifica a rivales.
- `Pista`: muestra pista local cuando esta disponible.
- Resolver ejercicio: completar, ordenar, elegir, verdadero/falso, relacionar o escrita.
- `Comprobar`: envia la respuesta a `desafio_comprobar_respuesta`; el servidor devuelve solo correcto/incorrecto.
- `Siguiente`: avanza.
- `Reintentar`: recupera el flujo si falla una carga.
- `Volver a jugar`: crea revancha.
- `Revancha`: crea otra partida con participantes/mazo.
- `Otro mazo`: vuelve a Grupos.
- `Ir a Grupos`: salida normal.

El cliente hace polling y render, pero las claves, transiciones, puntuacion y cierre estan protegidos por RPCs server-side de la migracion 049.

### Perfil (`vista-perfil.js`)

- Editar perfil: nombre, biografia, avatar y preferencias permitidas.
- Mas informacion: abre ayuda sobre la aplicacion.
- Instalar PWA: muestra el prompt de instalacion cuando el navegador lo permite.
- Panel admin: abre `/admin` si el rol lo permite.
- Cerrar sesion: desactiva tokens push, cierra Supabase Auth y limpia almacenamiento local.
- Tema claro/oscuro/automatico.
- Alto contraste.
- Letra grande.
- Feedback y sugerencias.
- Limpiar cache: elimina caches de service worker, IndexedDB de lectura y claves temporales, conservando sesion/preferencias.
- Cambiar contrasena: verifica la anterior y delega el cambio a Supabase Auth.
- Eliminar datos: borra recursos personales permitidos y pide confirmacion.
- Enlaces legales: privacidad, terminos y licencias.

La foto de perfil no forma parte del header de Estudio; solo aparece en las superficies de perfil o miembros donde aporta contexto.

### Notas (`vista-notas.js`)

Hay dos modelos:

1. `notas_capitulo`: notas vinculadas a una sesion/capitulo.
2. `notas_personales`: bloc de notas independiente.

Bloc personal:

- `Nueva`: crea nota.
- Abrir tarjeta: entra al editor.
- Fijar/desfijar.
- Duplicar.
- Compartir mediante API del sistema.
- Exportar PDF.
- Exportar TXT.
- Mover a papelera.
- Restaurar.
- Eliminar definitivamente.
- Color de nota.
- Undo/redo del editor.

La cache local se actualiza antes de la red y las modificaciones pueden entrar en cola offline.

### Notificaciones (`vista-notificaciones.js`)

- Filtrar por categoria.
- Marcar una como vista/completada.
- Marcar todas como vistas.
- Ejecutar acciones contextuales: aceptar, rechazar, ver, resolver, corregir, ver nota o estudiar.
- Abrir deep link.
- Refrescar manualmente.
- Eliminar una notificacion cuando la accion lo permite.

La campana se integra en las cabeceras principales y muestra el badge de no leidas.

### Panel de administracion (`vista-panel-admin.js`)

El panel distingue estrictamente owner y admin de clase.

Admin de clase:

- Mi clase/Centro.
- Usuarios de su clase.
- Examenes de su clase.

Owner:

- Centro.
- Usuarios.
- Grupos.
- Examenes.
- Memorizacion.
- Sugerencias.
- Contacto.
- Auditoria.
- Administradores.
- Marca.
- Notificaciones.
- Sistema.

Centro:

- Usuarios activos, online y bloqueados.
- Grupos/clases.
- Examenes publicados y borradores.
- Alumnos, profesores, nota media y pendientes de correccion.
- Tareas pendientes con boton Resolver.
- Accesos rapidos para crear/importar usuarios, grupos, examenes y mazos.

Usuarios:

- Buscar.
- Filtrar por rol, grupo y estado.
- Ordenar por actividad, nombre o fecha.
- Paginar.
- Seleccionar en lote.
- Cambiar rol en lote.
- Crear usuario.
- Importar CSV.
- Exportar CSV.
- Editar, ver detalle, cambiar grupo, suspender/reactivar y eliminar segun jerarquia.

Grupos:

- Crear grupo.
- Ver miembros.
- Ver examenes.
- Gestionar miembros.
- Eliminar grupo mediante `admin_eliminar_grupo`.

Examenes:

- Buscar/filtrar por estado y grupo.
- Crear, ver respuestas, editar, duplicar, publicar y eliminar.
- Metrica de preguntas, media y pendientes.

Memorizacion:

- Sembrar contenido.
- Importar/exportar JSON.
- Crear/editar/eliminar mazos.
- Ver, crear, editar, duplicar y eliminar tarjetas.

Sugerencias:

- Filtrar por estado.
- Revisar, aceptar, rechazar o marcar implementada.

Contacto:

- Leer mensajes persistidos.
- Cambiar estado: nuevo, en proceso, resuelto o spam.

Auditoria:

- Filtrar por hoy, semana, mes o todo.
- Buscar eventos.
- Consultar historial append-only.
- No existe boton de vaciar: el historial es inmutable.

Administradores:

- Ver responsables.
- Crear/editar actores dentro del alcance permitido.
- Cambiar rol solo si la jerarquia del actor lo permite.

Marca:

- Configurar nombre/logo del centro y aplicar el nombre a titulos/documentos.

Notificaciones:

- Crear anuncios.
- Elegir destinatarios y prioridad.
- Consultar entrega segun el centro.

Sistema:

- Configuracion global.
- Backups/snapshots disponibles en el esquema actual.
- Limpieza de cache y controles operativos existentes.

Importante: los backups presentes en el panel son snapshots de datos, no equivalen automaticamente a un sistema de backup programado y restauracion completa.

## 6. Estado central y eventos

### Store (`js/core/store.js`)

El store mantiene estado de sesion y UI, incluyendo:

- usuario actual.
- sesion autenticada.
- ruta actual.
- online/offline.
- sincronizando.
- ultima sincronizacion.
- datos temporales de vistas.

Las vistas pueden leer `store.obtener(...)` y los cambios se propagan a traves de eventos.

### EventBus (`js/core/eventBus.js`)

Coordina eventos desacoplados:

- `auth:login` y `auth:logout`.
- `route:change`.
- `sincronizacion:inicio`.
- `sincronizacion:progreso`.
- `sincronizacion:item-completado`.
- `sincronizacion:fin`.
- `sincronizacion:estado`.
- `sincronizacion:fallo-permanente`.

### Utilidades transversales

- `dom-helpers.js`: escape HTML, alertas, confirmaciones, formularios y guias.
- `sanitizacion.js`: filtrado de HTML/entrada peligrosa.
- `storage.js`: acceso seguro a localStorage/sessionStorage.
- `preferencias.js`: tema, contraste, tamano y preferencias de notificaciones.
- `iconos.js`: render y refresco de Lucide.
- `accesibilidad.js`: focus, atributos y ayudas.
- `animaciones.js`: transiciones y feedback visual.
- `skeleton.js`: placeholders de carga.
- `error-recovery.js`: captura, diagnostico, limpieza de cache y recarga controlada.
- `memoria.js`: liberacion de referencias/listeners de vistas.
- `gestos-navegacion.js`, `pull-to-refresh.js`, `haptica.js`: interaccion movil.

## 7. Repositorios y datos

### Cliente Supabase

`js/datos/supabase-client.js` inicializa el SDK con URL y anon key de cliente. La anon key no es un secreto; la seguridad real depende de Auth, RLS y funciones. Nunca debe enviarse `service_role` al navegador.

### Auth (`auth-repository.js`)

- Login por email o username.
- Username resuelto a email sintetico mediante `auth_login`.
- Supabase Auth emite y conserva el JWT.
- Perfil cargado desde columnas permitidas.
- Logout invalida sesion y tokens push.
- Registro de responsable con email real.
- Recuperacion mediante email.
- Cambio de contrasena mediante `updateUser`.
- Validacion minima: 8 caracteres, letras y numeros.
- Onboarding: RPC `crear_institucion_y_clase`.
- Eliminacion de datos personales por tablas autorizadas.

La columna legacy `perfiles.password` fue eliminada por la migracion 052.

### Progreso (`progreso-repository.js`)

- `marcarLeido`: upsert de lectura completada.
- `marcarEstudioCompletado`: guarda que el ciclo completo del capitulo termino.
- `obtenerProgresoPorLibro`: combina progreso y catalogo de capitulos.
- `obtenerPreguntasSistema`: carga preguntas activas y las cachea.

Offline: lectura y estudio se encolan en IndexedDB.

### Examenes (`examenes-repository.js`)

- Lista examenes para alumno mediante RPC sanitizada.
- Lista examenes para editor por grupo.
- CRUD de evaluaciones y examenes segun RLS.
- Orden manual de evaluaciones.
- Miembros y estadisticas de grupo.
- Inicio de intento por RPC.
- Guardado de borrador por RPC.
- Entrega por RPC.
- Resultado por RPC.
- Correccion por RPC.

Los metodos antiguos de preasignacion devuelven cero porque el servidor crea el intento al comenzar.

### Memorizacion (`memorizacion-repository.js`)

Gestiona:

- Mazos globales y personales.
- Tarjetas activas.
- Progreso individual por tarjeta.
- Repasos.
- Crear, editar, duplicar, exportar e importar.
- Fallback a columnas legacy si una migracion antigua no existe.
- Cache de listas y preguntas.

Los fallbacks permiten que instalaciones antiguas no fallen de forma abrupta, pero tambien significan que una instalacion no actualizada puede ofrecer menos funciones.

### Clases (`grupos-repository.js`)

Gestiona:

- Instituciones.
- Mis clases y membresias.
- Creacion de clase/codigo.
- Unirse por codigo.
- Solicitudes de ingreso.
- Miembros y roles internos.
- Avisos.
- Actividad.
- Estadisticas y progreso por miembros.
- Operaciones de administracion de alumnos.

El acceso debe ocurrir por pertenencia, rol o owner; la migracion 040 aporta instituciones y codigos.

### Desafios (`desafios-repository.js`)

Gestiona la UI contra RPCs:

- Crear desafio seguro.
- Leer invitaciones.
- Aceptar/rechazar.
- Marcar en juego.
- Guardar progreso.
- Comprobar respuesta.
- Terminar jugador.
- Abandonar.
- Revancha.
- Eliminar invitado.
- Barrer vencidos.

No existe fallback cliente para puntuar un desafio si las RPCs server-side no estan desplegadas: falla visible, que es preferible a aceptar una puntuacion manipulable.

### Notas (`notas-repository.js`)

Usa cache local siempre que puede:

- Lista y papelera de notas personales.
- Crear/actualizar/fijar.
- Mover/restaurar/eliminar definitivamente.
- Duplicar.
- Notas de sesion vinculadas a capitulo.
- Fallback local si la tabla no existe o no hay red.

### Notificaciones (`notificaciones-repository.js`)

Normaliza dos esquemas:

- Legacy: `tipo`, `titulo`, `cuerpo`, `datos`, `leida`.
- V2: categoria, prioridad, estado, agrupacion, contador, acciones y emisor.

Lee, cuenta no leidas, agrupa, inserta lote, actualiza estados, elimina y suscribe Realtime. Las notificaciones para otros usuarios pasan por RPC y no por insert directo.

### Cache (`cache-datos.js`)

IndexedDB `formsbiblicos`, store `cache_datos`:

- TTL por entrada.
- Lectura online-first.
- Fallback cache si la red falla.
- No sustituye datos locales no vacios por una respuesta remota vacia.
- Limpieza de caches de service worker, IndexedDB y claves temporales.

### Cola offline (`sync-queue.js`)

IndexedDB `formsbiblicos-sync`, store `cola-sync`:

- Operaciones `insert`, `update`, `upsert`, `delete`.
- Lotes de 10.
- Reintentos hasta 10.
- Backoff exponencial entre 1 y 60 segundos.
- Respeta `siguienteIntento`.
- Sincroniza al volver online y cada 30 segundos.
- Publica progreso y fallos permanentes.

La cola es apropiada para cambios simples, pero cada operacion requiere que el contrato de tabla/RLS siga permitiendo esa escritura cuando llegue el momento.

## 8. Logica de dominio

### Progreso de lectura

`progreso-lectura.js` calcula porcentaje por capitulos completados y rachas por dias locales consecutivos. La racha cuenta desde hoy hacia atras y evita duplicar dias.

### Repeticion espaciada

`repeticion-espaciada.js` implementa una variante de SM-2:

- Factor inicial 2.5.
- Factor minimo 1.3.
- Calidad acotada entre 0 y 5.
- Fallo si calidad menor que 3.
- Intervalos iniciales 1 dia, despues 6 dias y luego factor ajustado.
- Maximo 365 dias.
- Racha actual, mejor racha, olvidos y proximo repaso.
- Niveles de juego: nueva, aprendiendo, dominada, perfecta.

En la UI normal el ejercicio se registra como correcto/incorrecto; el repositorio lo transforma a calidad 4 o 0.

### Motor de ejercicios

`ejercicios-memorizacion.js` genera:

- Completar palabras.
- Ordenar palabras.
- Elegir versiculo.
- Verdadero/falso.
- Relacionar pares.
- Respuesta escrita.

Baraja tarjetas y distractores, mezcla tipos, limita sesiones normalmente a 12 ejercicios y puede reutilizar tarjetas de mazos pequeños con otro tipo. Las funciones `verificar` no se serializan; los desafios guardan datos y vuelven a hidratar verificadores al cargar.

### Puntuacion

`puntuacion-examen.js` sigue siendo util para presentacion local y pruebas. La puntuacion de seguridad de entrega/correccion esta duplicada en PostgreSQL mediante `fb_calcular_puntuacion`, que valida tipos, huecos, variantes, arrays, relaciones, puntos, overrides y nota de 0 a 10.

### Logros

`logros.js` define logros por capitulos, libros completos, rachas, examenes, tarjetas y repasos. Consulta logros actuales, otorga nuevos y emite notificacion de desbloqueo.

### Maquina de estudio

`maquina-estudio.js` evita saltos invalidos del flujo leer -> preguntas -> evaluar -> repaso/completado. Es una proteccion de dominio/UI; la autorizacion de datos sigue siendo responsabilidad de Supabase.

## 9. Backend Supabase

Supabase aporta:

- PostgreSQL.
- Supabase Auth.
- RLS.
- RPCs `SECURITY DEFINER`.
- Realtime.
- Storage para avatares.
- Edge Function de push preparada.

### Tablas principales

- Identidad: `perfiles`, `login_intentos`.
- Estructura: `instituciones`, `grupos`, `miembros_grupo`, solicitudes y actividad.
- Biblia: `libros_biblicos`, `capitulos`, `versiculos`, `preguntas_sistema`.
- Progreso: `progreso_lectura`, `logros`, `logros_usuario`.
- Examenes: `evaluaciones`, `examenes_personalizados`, `intentos_examen_personalizado`.
- Memorizacion: `mazos_memorizacion`, `tarjetas_memorizacion`, `progreso_tarjetas_memorizacion`, `repasos_memorizacion`.
- Notas: `notas_capitulo`, `notas_personales`.
- Comunicacion: `notificaciones`, `dispositivos_notificacion`, `sugerencias`, `contacto_mensajes`.
- Desafios: `desafios`, `desafio_participantes`, `desafio_claves`, `desafio_respuestas`.
- Operacion: `auditoria`, `backups`, `configuracion`.
- Legacy cerradas si existen: `audit_logs`, `editor_requests`.

### Auth y roles

- `owner`: propietario global unico previsto; acceso a todo el panel y operaciones globales.
- `admin`: administrador/responsable de clase o institucion dentro de su alcance.
- `editor`: profesor que crea/edita contenido y corrige dentro de su grupo.
- `usuario`: alumno/miembro.

Las funciones `es_owner`, `es_admin_del_grupo`, `es_editor_del_grupo`, `es_miembro_del_grupo`, `es_propio_usuario` y `rol_actual` centralizan comprobaciones.

### RLS

El cierre 028 y migraciones posteriores:

- Revocan acceso de tablas a `anon`.
- Exigen JWT Supabase para contenido de la app.
- Limitan perfiles y columnas editables.
- Limitan progreso y notas al usuario.
- Permiten lectura de catalogo biblico a autenticados.
- Limitan grupos/membresias a integrantes, administradores y owner.
- Limitan examenes a miembros y editores.
- Limitan mazos globales/tarjetas segun propiedad/owner.
- Limitan desafios a creador/participantes/owner.
- Limitan auditoria a lectura owner y escritura mediante RPC.
- Protegen Storage de avatares por carpeta del usuario.

En el estado verificado durante la auditoria anterior: 0 politicas para `anon`, 0 tablas publicas sin RLS, columna `perfiles.password` ausente y auditoria sin escrituras directas.

### Onboarding

`045_onboarding_institucion.sql` proporciona `crear_institucion_y_clase`:

1. Exige sesion.
2. Valida nombre de institucion, clase y descripcion.
3. Comprueba perfil activo y que no tenga clase principal.
4. Crea institucion.
5. Genera codigo unico.
6. Crea clase.
7. Convierte al responsable en admin salvo que ya sea owner.
8. Crea membresia admin principal.
9. Registra actividad.
10. Devuelve IDs y codigo.

### Contacto

`046_contacto_soporte.sql` crea `contacto_mensajes` y RPC `enviar_contacto`:

- Valida nombre, email y longitud del mensaje.
- Limita un envio reciente por email cada 10 minutos.
- Permite invocar desde landing sin abrir tablas a anon.
- El owner consulta y cambia estado mediante RPCs de 047.

Persistir mensajes no equivale a tener un buzón atendido: el correo de soporte, responsable y proceso operativo siguen siendo externos.

### Entrega y correccion de examenes

`047_seguridad_examenes_y_soporte.sql` y `048_versionado_examenes.sql` añaden:

- Version de examen.
- Snapshot de preguntas/configuracion por intento.
- Inicio transaccional con bloqueo advisory.
- Limite de intentos en servidor.
- Fechas de disponibilidad.
- Temporizador de servidor.
- Respuestas filtradas contra el snapshot.
- Preguntas obligatorias.
- Calculo server-side.
- Intento inmutable despues de completar.
- Resultado sanitizado para alumno.
- Correccion de profesor con recalcule y override por pregunta.

### Desafios server-side

`049_desafios_integridad_servidor.sql` separa:

- Snapshot publico sin respuestas.
- `desafio_claves` privada con la sesion completa.
- `desafio_respuestas` privada.
- RPC de creacion atomica.
- RPC de aceptacion/rechazo.
- Cierre por vencimiento.
- Inicio real controlado por servidor.
- Guardado de progreso limitado al maximo valido.
- Comprobacion de respuesta sin devolver claves.
- Finalizacion y puntuacion.

### Auditoria

`050_auditoria_inmutable.sql`:

- Habilita RLS.
- Revoca INSERT/UPDATE/DELETE directos.
- Expone `registrar_auditoria` con actor forzado a `auth.uid()`.
- Valida accion, detalle y grupo.

`051_admin_grupos_y_auditoria.sql`:

- Cambia referencia historica de grupo a `ON DELETE SET NULL`.
- Crea `admin_eliminar_grupo` para borrar el grupo con una transaccion controlada.
- Conserva el evento de eliminacion en auditoria.

`052_auth_sin_password_legacy.sql`:

- Cambia trigger de alta.
- Actualiza RPC admin para usar Auth.
- Valida que no queden hashes legacy.
- Elimina `perfiles.password`.

`053_cerrar_tablas_legacy.sql` activa RLS y revoca acceso en residuos legacy no usados.

## 10. Catalogo de migraciones

La carpeta contiene 55 SQL versionados. Resumen por bloque:

- `001_initial_schema.sql`: tablas base de perfiles, grupos, Biblia, progreso, examenes, memorizacion, logros y auditoria.
- `002_seed_data.sql`: semillas iniciales; las credenciales demo conocidas fueron neutralizadas.
- `006_estudio_completado.sql`: estado de estudio completado.
- `007_memorizacion_manual.sql`, `014_agregar_pista_tarjetas.sql`, `016_campos_memorizacion.sql`: tarjetas y campos de memorizacion.
- `008_correccion_examenes.sql`, `009_evaluaciones.sql`, `017_campos_examen_personalizado.sql`, `025_orden_evaluaciones.sql`, `048_versionado_examenes.sql`: examenes, evaluaciones, orden, correccion y versionado.
- `010_permisos_admin.sql`, `022_panel_administracion.sql`, `041_alcance_panel_admin.sql`, `042_fix_creacion_usuarios_auth.sql`: panel y permisos administrativos.
- `011_foto_perfil.sql`, `025_avatars_storage.sql`: avatar y Storage.
- `012_categorias_memorizacion.sql`, `013_fix_categorias_rls.sql`, `021_mazos_memorizacion.sql`, `023_memorizacion_juego.sql`, `026_mazo_prueba.sql`: mazos, categorias, juego y progreso SM-2.
- `015_notas_capitulo.sql`, `019_mejoras_notas.sql`, `024_notas_personales.sql`: notas de sesion, fijado, papelera y bloc personal.
- `018_sugerencias.sql`: feedback de usuarios.
- `020_configuracion.sql`: configuracion global y marca.
- `024_grupos_desafios.sql`, `030_desafios_rls_notificaciones.sql`, `031_desafio_iniciar.sql`, `032_grupos_admin_id_rls.sql`, `033_desafios_recursion_mazos_admin.sql`, `034_desafio_participantes_lectura.sql`, `036_desafio_finaliza_primer_terminado.sql`, `037_desafio_estado_eliminado.sql`, `038_desafio_cierre_automatico.sql`, `049_desafios_integridad_servidor.sql`: desafios y cierre server-side.
- `027_notificaciones_v2.sql`, `029_notificaciones_push.sql`, `039_ocultar_recordatorios_repaso.sql`: categorias, estado, agrupacion, dispositivos y retirada de recordatorios no deseados.
- `028_auth_esquema.sql`, `028_auth_migracion_datos.sql`, `028_auth_politicas.sql`, `043_auth_email_valido.sql`: cutover a Supabase Auth y RLS.
- `035_editor_grupo_por_perfil.sql`, `044_grupos_profesionales.sql`: alcance de profesor/editor y roles internos.
- `040_clases_instituciones.sql`, `045_onboarding_institucion.sql`: multiinstitucion, codigos y alta inicial.
- `046_contacto_soporte.sql`, `047_seguridad_examenes_y_soporte.sql`: contacto, seguridad de examenes y soporte.
- `050_auditoria_inmutable.sql`, `051_admin_grupos_y_auditoria.sql`, `052_auth_sin_password_legacy.sql`, `053_cerrar_tablas_legacy.sql`: endurecimiento final.
- `pendientes_produccion.sql`: consolidado historico que no debe ejecutarse como bloque porque contiene politicas legacy abiertas; usar el runbook de staging y las migraciones especificas.

## 11. PWA, offline y Android

### PWA

`public/manifest.json` define:

- Nombre, iconos y color.
- `display: standalone`.
- Scope y start URL.
- Orientacion vertical.
- Shortcuts para Estudio, Examenes y Memorizacion.

`public/sw.js`:

- Precachea shell e iconos.
- Red primero para navegaciones.
- Fallback a `index.html` u `offline.html`.
- Stale-while-revalidate para estaticos del mismo origen.
- No intercepta Supabase ni CDN externos.
- Limpia caches antiguas por version.

### Instalacion

`pwa-install.js` captura `beforeinstallprompt` y muestra instalacion cuando el navegador la ofrece. Safari iOS depende del flujo propio de anadir a pantalla de inicio.

### Android

Capacitor y `android/` permanecen en el repositorio, pero la APK esta pausada:

- No forma parte del flujo PWA activo.
- El workflow Android es manual y no debe ejecutarse por accidente.
- Push nativo y actualizaciones APK estan preparados, no deben considerarse canal operativo actual.
- `capacitor.config.json` conserva `com.formsbiblicos.app` y `dist` como webDir.

## 12. Notificaciones y push

`notification-service.js` es la fachada unica de comunicacion. Los modulos emiten eventos como:

- `desafio.creado`, `desafio.aceptado`, `desafio.iniciado`, `desafio.finalizado`.
- `examen.publicado`, `examen.entregado`, `examen.corregido`.
- `estudio.completado`, `mazo.nuevo`, `logro.desbloqueado`.
- `grupo.solicitud`, `grupo.unido`, `grupo.aviso`.
- `anuncio.creado`.

El servicio decide:

1. Categoria y prioridad.
2. Preferencias del usuario.
3. Destinatarios.
4. Persistencia en Supabase.
5. Agrupacion de eventos repetidos.
6. Toast/banner.
7. Sonido/vibracion.
8. Push nativo para destinatarios ajenos si existe runtime.
9. Refresco del badge y centro.

Entrega:

- Realtime de Supabase como canal inmediato.
- Polling de respaldo cada aproximadamente 6 segundos.
- Deduplicacion en memoria y localStorage de filas presentadas.
- Recordatorios y limpieza segun configuracion del servicio.

El push Android requiere configuracion de Firebase/Edge Function y no debe marcarse como terminado solo porque exista el codigo cliente.

## 13. Seguridad y limites reales

### Protecciones activas en codigo/BD

- Supabase Auth para identidad y JWT.
- RLS en tablas publicas.
- Revocacion de anon.
- Grants de columnas en perfiles.
- RPCs `SECURITY DEFINER` con `search_path` controlado.
- Sanitizacion HTML y escape de valores al construir tarjetas.
- Validacion de UUID en rutas de examen.
- Bloqueos advisory para inicios concurrentes.
- Snapshots inmutables de examenes.
- Respuestas correctas fuera del payload publico de desafios/examenes.
- Auditoria append-only.
- Restricciones de longitud y formato en RPCs.
- Content Security Policy en Vercel.
- `X-Frame-Options`, HSTS, `nosniff`, Referrer Policy y Permissions Policy.
- Validacion de tipos/tamanos de imagen en las superficies correspondientes.

### Riesgos o limites que no deben ocultarse

- El aislamiento completo entre dos instituciones necesita ejecutarse en staging con dos juegos de JWT y peticiones manuales.
- El proveedor de correo SMTP y la operacion de soporte necesitan configuracion real.
- Los backups del panel no son por si solos backup automatico ni restauracion probada.
- DNS, dominio, SPF, DKIM, DMARC y WAF dependen de infraestructura externa.
- La politica legal, menores, traducciones y licencias necesitan revision humana/juridica.
- `npm audit --omit=dev` estaba limpio en la auditoria; el audit completo mantenia vulnerabilidades moderadas transitivas en herramientas Android, fuera del runtime web.
- El service worker cachea el shell; una mala version de cache puede dejar clientes antiguos hasta activar la siguiente version.
- Los fallbacks legacy ayudan a instalaciones parcialmente migradas, pero tambien pueden ocultar que una migracion no se aplico.
- El cliente conserva logica de puntuacion para presentacion, aunque la entrega/correccion segura pasa por servidor; no se debe volver a exponer un camino de escritura directa.
- La Edge Function de push y la revision de correo no equivalen a un servicio monitorizado hasta tener alertas y pruebas.

## 14. Rendimiento, observabilidad y automatización

- Las barras de progreso usan `transform: scaleX(...)` y transiciones GPU-composited; las operaciones `top/left` que quedan en menús son posicionamiento geométrico, no animaciones.
- Las imágenes dinámicas de avatares, logos, miniaturas y preguntas reservan dimensiones HTML y usan `decoding="async"`; las pantallas asíncronas principales muestran `window.skeleton` antes de consultar datos.
- No hay reglas `@font-face` locales en el proyecto. Las fuentes externas se cargan desde Google Fonts con `display=swap`, por lo que no se añadió CSS duplicado.
- `scripts/generate-study-content.mjs` convierte los JSON curados de `data/` en tarjetas compatibles con el motor y valida campos sin tocar la base de datos.
- `api/health.js` expone `/api/health`; `js/core/error-capture.js` y `js/services/sentry-loader.js` activan Sentry solo mediante DSN/URL de configuración, sin PII por defecto.
- `.github/workflows/backup.yml` genera dumps diarios cifrados como artefactos; no guarda SQL plano en Git. `docs/backup-restore-runbook.md` describe la restauración en staging.
- `.github/workflows/release-android-tag.yml` construye APK firmada en tags `v*.*.*`, siempre que existan los secretos de firma.
- `js/services/fcm-messaging-adapter.js` ofrece el punto de integración para Firebase Messaging. La APK actual conserva el receptor Capacitor propio de desafíos hasta probar una migración sin notificaciones duplicadas.

## 15. Despliegue y entornos

### Desarrollo

- `npm run dev`: Vite para la app.
- `npm run preview`: sirve el build.
- El service worker no se registra normalmente en HTTP local.
- Las paginas legales se sirven desde `public-site` mediante middleware de Vite.

### Build de app

`npm run build`:

- Construye la SPA.
- Copia JS/CSS/data/assets/version.json a `dist`.
- Copia runtime Capacitor.
- Genera `js/core/version.js`.
- Minifica JS copiado.
- Mantiene manifest y service worker estables.

### Build publico

`npm run build:public`:

- Construye `public-site` en `dist-public`.
- Copia manifest, offline, version, legales, SEO y Open Graph.
- Copia JS de soporte de login/registro/contacto.
- Vercel publica ese directorio.

### CIEl workflow actual ejecuta:

1. `npm install --ignore-scripts` (no hay lockfile versionado en el checkout actual).
2. `npm audit --omit=dev --audit-level=high`.
3. `npm test`.
4. `npm run build`.
5. `npm run build:public`.
6. `npm run test:web-quality`.
7. `npm run test:release`.
8. `git diff --check`.
9. `npm run test:staging:isolation` cuando se han configurado los secretos de staging; si faltan, lo declara omitido.

El endpoint `/api/health` permite que un monitor externo compruebe la aplicación y el acceso al health endpoint de Supabase. `npm run test:ops -- --strict` convierte SMTP, backup/restauracion, DNS, soporte y aprobacion legal en bloqueos cuando existen evidencias reales.
. `npm run build:public`.
6. `git diff --check`.

No ejecuta todavia un E2E completo contra staging Supabase, pruebas de carga ni auditoria WCAG automatizada.

## 15. Tests y herramientas de auditoria

El proyecto tiene tests unitarios Vitest para:

- Dominio de estudio.
- Repeticion espaciada.
- Puntuacion.
- Router/navegacion.
- RLS/alcance administrativo como contratos estaticos.
- Examenes server-side.
- Desafios y memorizacion.
- Arquitectura publica.

Tambien conserva scripts E2E/auditoria con Playwright/CommonJS para:

- Desafios.
- Examenes.
- Memorizacion.
- Explorar.
- Notas.
- Perfil/admin.
- Responsive y solapamientos.
- Limpieza/verificacion.

Las credenciales de E2E ya no deben estar hardcodeadas: usan variables como `FB_E2E_USER` y `FB_E2E_PASSWORD`. Un E2E sin variables configuradas debe fallar de forma explicita, no probar contra una cuenta real.

Validaciones que ya se han ejecutado en la auditoria previa:

- Tests unitarios: 302 pasados en la ultima referencia.
- `npm run build`: correcto.
- `npm run build:public`: correcto.
- Sintaxis JavaScript: correcta.
- `git diff --check`: correcto.
- Audit de produccion: sin vulnerabilidades altas/criticas.

Validaciones aun necesarias para una declaracion de lanzamiento publico:

- E2E real con dos instituciones aisladas.
- Login, recuperacion y confirmacion con proveedor SMTP real.
- Pruebas de doble pestaña/dispositivo.
- Offline y reconexion en movil real.
- Lighthouse y rendimiento.
- WCAG manual y automatizado.
- Safari iOS, Chrome Android y distintos teclados/orientaciones.
- Prueba de carga.
- Smoke tests contra staging Supabase.
- Restauracion real desde backup.

## 16. Matriz de estado

### Implementado y verificado tecnicamente

- SPA con router, guardias, lazy loading y transiciones.
- Estudio Guiado y progreso basico.
- Memorizacion y motor de ejercicios.
- Examenes con editor, toma, correccion y snapshots.
- Clases, membresias, codigos y desafios.
- Perfil, preferencias y notas.
- Centro de notificaciones.
- Supabase Auth y RLS endurecido.
- Auditoria inmutable.
- Eliminacion segura de grupos.
- Eliminacion de password legacy.
- PWA instalable/offline shell.
- Builds web y publico.
- CI basico y Dependabot.
- Gate estatico de release (`npm run test:release`) para PWA, CSP, headers y secretos.
- Gate del artefacto público (`npm run test:web-quality`) para metadatos, accesibilidad estructural y tamaño.
- Prueba reproducible de aislamiento de staging (`npm run test:staging:isolation`) para dos instituciones.
- Health check Vercel en `/api/health` y gate operativo informativo/estricto (`npm run test:ops`).
- Runbook operativo en `docs/production-operations.md` y plantillas de evidencia/fixtures.

### Preparado pero dependiente de proveedor/configuracion

- Recuperacion de email: requiere SMTP y redirect correctamente configurado.
- Contacto: persiste en BD, requiere buzón y responsable.
- Realtime: requiere canal habilitado/estable en Supabase.
- Push Android: requiere Firebase, Edge Function, permisos y APK reanudada.
- Dominio y seguridad perimetral: requiere Vercel/DNS/WAF.
- Backups: requiere politica de proveedor, retencion y restauracion.
- Analitica: no hay plataforma comercial configurada.

### Pendiente antes de publico general

- Staging aislado.
- Prueba formal multiinstitucion.
- Revision legal y privacidad.
- Politica de menores.
- Licencias de traducciones/contenido.
- Monitorizacion, alertas y soporte con SLA.
- Pruebas de carga y dispositivos reales.
- Restauracion completa probada.
- Decidir y documentar el modelo de invitaciones/email para instituciones.

## 17. Flujo completo de un usuario alumno

1. Visita landing/login.
2. Inicia sesion con email o username.
3. Supabase Auth devuelve JWT.
4. Se carga `perfiles` con columnas permitidas.
5. Se restaura tema/preferencias.
6. Se monta Estudio.
7. Elige libro/capitulo.
8. Lee fuera o dentro del flujo indicado.
9. Marca lectura.
10. Responde preguntas.
11. Repasa fallos.
12. Marca estudio completo.
13. Progreso se guarda online o en cola.
14. Memorizacion ofrece repasos pendientes.
15. Puede unirse a clase con codigo.
16. Puede recibir examenes y desafios.
17. Puede consultar notas, logros, progreso y notificaciones.
18. Puede cerrar sesion o recuperar cuenta.

## 18. Flujo completo de profesor/admin

1. Entra con cuenta Auth.
2. Router y panel verifican rol.
3. Solo ve su clase si es admin; owner ve alcance global.
4. Crea o gestiona usuarios mediante RPCs protegidas.
5. Crea clase/institucion o trabaja en la asignada.
6. Crea examen/evaluacion.
7. Edita preguntas y configuracion.
8. Publica para el grupo.
9. Notification Service genera avisos a alumnos.
10. Consulta entregas.
11. Corrige mediante RPC.
12. Consulta estadisticas y actividad.
13. Owner puede gestionar marca, contenido, sugerencias, contacto, auditoria, notificaciones y sistema.

## 19. Recomendacion de mantenimiento

Orden recomendado para seguir manteniendo el proyecto:

1. Tratar `docs/release-staging.md` y `docs/legal-release-gate.md` como requisitos de salida, no como documentacion decorativa.
2. No ejecutar `pendientes_produccion.sql` entero.
3. Aplicar migraciones nuevas solo despues de dry-run en staging.
4. Mantener sincronizados `package.json.version` y `public/sw.js`.
5. Ejecutar tests y ambos builds antes de publicar.
6. No introducir handlers inline porque la CSP los bloquea.
7. No hacer escrituras directas nuevas sobre auditoria, intentos o desafios.
8. No añadir campos de contrasena a `perfiles`.
9. Al modificar un repositorio, revisar tambien cache, cola offline y RLS del recurso.
10. Al crear una notificacion, registrarla en `notification-service.js` y comprobar destinatarios, preferencias, agrupacion y deep link.
11. Al crear una vista, conectarla al router, back-navigation, campana, estados de carga/error/vacio y responsive.
12. Antes de lanzar, repetir la prueba manual con dos instituciones y cuentas completamente separadas.
