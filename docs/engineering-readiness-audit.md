# Auditoría de preparación de ingeniería

**Aplicación:** FormsBiblicos · **Fecha:** 25 de agosto de 2026  
**Alcance:** PWA web, Supabase, Vercel, CI y código versionado. La APK de Android está pausada.

## Mejoras de estabilidad y operación incorporadas

- Dimensiones explícitas y `decoding="async"` en las imágenes dinámicas principales.
- Barras de progreso animadas con `transform` en lugar de transición de `width`.
- Skeleton común en la carga inicial de grupos y vistas ya existentes.
- Gate de contenido: `npm run generate:study-content` valida 260 tarjetas generadas desde 7 fuentes JSON.
- Backup diario cifrado como artefacto de GitHub Actions, sin volcar datos en Git.
- Preparación de Sentry opt-in, instrucciones DNS/SMTP y adaptador FCM compatible.
- Workflow de APK por tag con firma exclusivamente mediante secretos.

Estas mejoras no sustituyen la verificación externa de staging, SMTP, DNS, restauración, monitorización, carga, accesibilidad manual ni dispositivos reales.

## Veredicto

FormsBiblicos tiene una base técnica funcional para una **beta controlada** y puede operar como aplicación gratuita. No se debe declarar todavía lista para público general sin cerrar los bloqueadores P0 de la sección final.

La auditoría comprobó en producción:

- Políticas `anon` sobre tablas públicas: `0`.
- Tablas públicas de la aplicación con RLS desactivado: `0`.
- Escritura directa de `anon`/`authenticated` sobre `auditoria`: ningún privilegio.
- Políticas de inserción directa en `auditoria`: `0`.
- RPC de auditoría controlada: disponible.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades.
- `npm test`: debe ejecutarse en cada release; el CI ya ejecuta tests y ambos builds.

## Matriz de responsabilidades

Estados usados: **Hecho**, **Parcial**, **Pendiente operativo**, **No aplicable**.

| Responsabilidad | Estado | Evidencia o trabajo pendiente |
|---|---|---|
| Definir requerimientos funcionales | Hecho | Producto documentado: estudio, memorización, exámenes, grupos, desafíos, perfil y administración. Revisar cambios con cada release. |
| Definir requerimientos no funcionales | Parcial | Hay requisitos de seguridad, responsive, PWA, accesibilidad y offline; falta convertirlos en SLO medibles. |
| Escoger lenguaje de programación | Hecho | JavaScript nativo y SQL/PLpgSQL. |
| Escoger framework | Hecho | Vite/Vitest; frontend sin framework; Supabase y Vercel. |
| Diseñar arquitectura del sistema | Hecho | SPA con router, store, EventBus, repositorios, dominio separado y PWA. |
| Desarrollar frontend | Hecho | Vistas principales y paneles implementados. Mantener auditoría visual por release. |
| Desarrollar backend | Hecho | Supabase Auth, PostgreSQL, RLS, RPCs, Storage, Realtime y Edge Function preparada. |
| Diseñar la API | Parcial | RPCs y PostgREST tienen contratos en migraciones; falta un catálogo versionado de errores, límites y compatibilidad. |
| Modelar la base de datos | Hecho | 50 migraciones versionadas y relaciones principales. Requiere una revisión de consolidación futura. |
| Crear migraciones | Hecho | Migraciones SQL ordenadas e idempotentes en los cambios recientes. |
| Crear índices | Parcial | Existen índices de consultas críticas; falta revisar planes de consultas grandes con datos de producción. |
| Crear relaciones | Hecho | FKs y cascadas en el modelo principal; validar cada nueva tabla antes de usarla. |
| Establecer restricciones de integridad | Hecho | CHECKs, UNIQUE, FKs, snapshots, versiones y RPCs de validación. |
| Implementar autenticación | Hecho | Supabase Auth con JWT y resolución username/email compatible. |
| Implementar autorización | Hecho/Parcial | RLS y RPCs por rol y grupo; falta completar pruebas multiinstitución con dos sesiones reales. |
| Gestionar sesiones | Parcial | Restauración, revalidación, logout y tokens gestionados; falta inventario/cierre visible de sesiones activas. |
| Recuperación de contraseñas | Hecho/Operativo pendiente | Flujo `resetPasswordForEmail` y cambio de contraseña existen; falta probar con un correo real y configurar el proveedor de correo. |
| Almacenamiento seguro de credenciales | Hecho | Supabase Auth gestiona las contraseñas; la columna legacy `perfiles.password` se eliminó con la migración 052 tras confirmar cero valores pendientes. |
| Cifrado de datos sensibles | Parcial | TLS y cifrado gestionado por Supabase; no hay cifrado de campo propio ni se necesita para todos los datos. Definir si notas sensibles requieren cifrado adicional. |
| Validar entradas | Hecho/Parcial | Validación en formularios, RPCs y snapshots; revisar límites homogéneos en todas las RPCs. |
| Proteger contra inyección SQL | Hecho | Cliente usa PostgREST/RPC; SQL dinámico acotado en migraciones con `format` e identificadores controlados. |
| Proteger contra XSS | Parcial | Helpers de escape en vistas principales y CSP; realizar auditoría específica de todo HTML dinámico y atributos URL. |
| Proteger contra CSRF y vulnerabilidades conocidas | Parcial | JWT, CSP, HSTS, X-Frame-Options y form-action configurados; no hay matriz formal de CSRF ni pentest externo. |
| Configurar servidores | Hecho | Vercel para web y Supabase gestionado para backend. |
| Configurar infraestructura cloud | Parcial | Producción desplegada; falta staging aislado y documentación de proyecto/secretos por entorno. |
| Configurar redes | Pendiente operativo | Proveedores gestionan la red; falta revisar restricciones, regiones y acceso administrativo. |
| Gestionar DNS | Pendiente operativo | Depende del dominio definitivo; el despliegue actual usa dominio de Vercel. |
| Gestionar dominios | Pendiente operativo | Falta decidir y configurar dominio de marca definitivo. |
| Configurar certificados SSL | Hecho/Operativo pendiente | Vercel sirve HTTPS y HSTS; validar el dominio final tras conectarlo. |
| Configurar balanceadores de carga | No aplicable | Vercel/Supabase gestionan esta capa para el tamaño y arquitectura actuales. |
| Configurar firewall | Pendiente operativo | No hay WAF/reglas propias verificadas; definir protección antiabuso y límites en proveedores. |
| Gestionar almacenamiento de backups | Parcial | Existe snapshot JSON parcial en `backups`; no sustituye backups automáticos de Supabase ni cubre todos los datos/Storage. |
| Asegurar redundancia | Pendiente operativo | Depende del plan/región de Supabase y Vercel; no está probado desde el checkout. |
| Planificar recuperación ante desastres | Pendiente | Falta RPO/RTO, backup restaurable completo, prueba periódica y runbook aprobado. |
| Escalabilidad horizontal | Parcial | Vercel escala funciones/web; polling y consultas pueden crecer linealmente. Medir con datos reales. |
| Escalabilidad vertical | Pendiente operativo | Depende del plan de Supabase; definir cuándo aumentar recursos. |
| Configurar caché | Hecho/Parcial | Service Worker, Cache-Control y cachés locales; revisar invalidación y datos sensibles offline. |
| Configurar colas de procesamiento | Parcial | Cola IndexedDB para sincronización local; no hay cola backend para trabajos largos. |
| Gestionar tareas en segundo plano | Parcial | Polling, Realtime, sincronización y recordatorios; falta scheduler backend para limpieza y jobs garantizados. |
| Ambiente de desarrollo | Hecho | Vite local y tests reproducibles. |
| Ambiente de staging | Parcial | Existe runbook, fixture y script `test:staging:isolation`; falta ejecutar el proyecto Supabase/Vercel aislado y guardar evidencia. |
| Ambiente de producción | Hecho/Parcial | Proyecto Supabase y despliegue Vercel existentes; `/api/health` queda preparado, pero falta comprobarlo en el dominio definitivo. |
| Variables de entorno | Parcial | Tokens de gestión están fuera del repo; la app usa configuración pública. Falta inventario formal por entorno. |
| Gestionar credenciales | Parcial | CI usa secretos de GitHub/Supabase; rotar cualquier credencial antigua y no usar cuentas de producción en E2E. |
| Proteger secretos | Hecho/Parcial | No hay `service_role` en el código; los scripts E2E ya exigen variables de entorno. Revisar historial git si se sospecha filtración. |
| Integración continua | Hecho | GitHub Actions ejecuta tests, builds y diff check; se añadió auditoría de dependencias. |
| Despliegue continuo | Hecho/Parcial | Push a `main` despliega en Vercel; migraciones y Edge Functions siguen siendo pasos operativos separados. |
| Control de versiones | Hecho | Git, SemVer y workflow de release documentados. |
| Pruebas unitarias | Hecho | Suite Vitest amplia. |
| Pruebas de integración | Parcial | Hay tests de contratos SQL/repositorios; falta entorno Supabase de staging automatizado. |
| Pruebas E2E | Parcial | Scripts Playwright cubren flujos; el aislamiento HTTP de staging queda automatizado condicionalmente en CI, pero falta configurar secretos y completar los flujos mutables multiusuario. |
| Pruebas de carga | Pendiente | No hay escenario ni herramienta de carga sobre Supabase/Vercel. |
| Logging | Parcial | Logs de cliente y plataforma; falta política de niveles, retención y correlación. |
| Monitoreo | Parcial | Existe `/api/health` con check opcional de Supabase y runbook; falta registrar un monitor externo y alertas reales. |
| Definir métricas | Pendiente | Definir login correcto, activación, sesiones, entregas, errores, sincronización, latencia y retención. |
| Configurar alertas | Pendiente | Falta alertar sobre errores de login, Edge Functions, Supabase, despliegues y fallos de sync. |
| Trazabilidad | Parcial | Auditoría de negocio endurecida por la migración 050; falta request/correlation ID entre cliente, RPC y Edge Function. |
| Análisis de errores | Parcial | Hay recuperación de caché y mensajes de usuario; falta agrupación y análisis histórico de errores. |
| Observabilidad | Parcial | Health check, captura local de errores y runbook preparados; falta monitor externo, alertas, retención y correlación operativa. |
| Pasarela de pagos | No aplicable | La decisión de producto es servicio gratuito. No añadir Stripe, PayPal, webhooks de cobro ni facturación. |
| Idempotencia de webhooks | No aplicable | No existen webhooks de pago. Si se añaden integraciones futuras, exigir idempotency keys. |
| Conciliación de pagos | No aplicable | Sin cobros. |
| Reembolsos | No aplicable | Sin cobros. |
| Transacciones fallidas de pago | No aplicable | Sin cobros. |
| Proveedor de correos | Parcial/operativo pendiente | El flujo y el gate de evidencia están preparados; Supabase aún necesita SMTP real y prueba de confirmación, recuperación y reenvío. |
| SPF, DKIM y DMARC | Preparado/pendiente operativo | `test:ops -- --strict` puede comprobar DNS cuando exista dominio, proveedor y selector DKIM; todavía falta publicarlos. |
| Certificados/perfiles/firmas móviles | No aplicable ahora | APK pausada. Si se reanuda, revisar keystore, firma, Play App Signing y secretos. |
| Builds y versiones | Hecho/Parcial | Builds web y versión SemVer; release Android pausada. |
| Políticas de privacidad | Parcial | Existen documentos y consentimiento, pero indican revisión jurídica pendiente y faltan responsable, base legal, conservación y DPA. |
| Revisión Google Play/App Store | No aplicable ahora | No se distribuye APK en tiendas. |
| Rendimiento | Parcial | Lazy loading, caché, preconnect y gates de build preparados; falta ejecutar Lighthouse y carga en staging con objetivos definidos. |
| Compatibilidad entre dispositivos | Parcial | CSS responsive y auditorías Playwright; faltan pruebas reales iOS Safari, Android PWA instalada y orientaciones. |
| Accesibilidad | Parcial | El gate web valida idioma, viewport, `alt` y nombres básicos; falta auditoría axe/Lighthouse completa y revisión manual con lector de pantalla. |
| Analítica | Pendiente de decisión | No hay analítica de terceros, lo cual reduce privacidad; definir métricas anónimas o mantener ausencia de tracking documentada. |
| Protección de datos personales | Parcial | RLS y minimización avanzados; falta proceso verificable de exportación, borrado integral, menores y encargados. |
| Términos y condiciones | Parcial | Documento publicado, pero pendiente de revisión jurídica y términos institucionales completos. |
| Actualizar dependencias | Parcial | `npm audit` limpio en producción; falta política periódica y revisión de cambios mayores. |
| Vigilar vulnerabilidades de terceros | Parcial | Dependabot y auditoría npm están configurados. `npm audit --omit=dev` está limpio; el audit completo detecta 3 moderadas en `uuid` transitivo de `@capacitor/cli`/`xcode`, sin actualización compatible disponible y fuera del runtime web. |
| Gestionar costos | Pendiente operativo | Definir límites, alertas de consumo y presupuesto de Supabase, Vercel, correo y Storage. |
| Mantenimiento continuo | Parcial | Hay tests, migraciones y documentación; falta calendario de revisiones, soporte e incidencias. |

## Correcciones realizadas en esta auditoría

- Creada y aplicada en producción `supabase/migraciones/050_auditoria_inmutable.sql`.
- Aplicada en producción `supabase/migraciones/051_admin_grupos_y_auditoria.sql`: eliminar grupos mediante RPC y conservar su historial de auditoría.
- Aplicada en producción `supabase/migraciones/052_auth_sin_password_legacy.sql`: Supabase Auth es la única fuente de contraseñas y se eliminó la columna legacy.
- Aplicada en producción `supabase/migraciones/053_cerrar_tablas_legacy.sql`: `audit_logs` y `editor_requests` quedaron con RLS activo y sin acceso de los roles de aplicación.
- Eliminada la escritura directa de `auditoria` desde el cliente; ahora se usa `registrar_auditoria()` y el servidor fuerza `actor_id = auth.uid()`.
- Bloqueadas edición y eliminación directa del historial de auditoría.
- Eliminadas las contraseñas de los scripts E2E y auditores visuales; ahora requieren variables `FB_E2E_*`.
- Eliminada una clave pública y la limpieza REST anónima del E2E de notas.
- Añadido `npm audit --omit=dev --audit-level=high` al CI y Dependabot semanal/mensual.
- Retirado del panel el borrado de auditoría; el historial queda append-only y la eliminación de grupos usa una RPC controlada.
- El modelo de producto gratuito queda documentado como decisión: no hay trabajo pendiente de pagos.
- Añadido `api/health.js` y cabeceras no-cache para monitorización externa.
- Añadido `npm run test:release`: gate estático de PWA, CSP, seguridad, artefactos y secretos.
- Añadido `npm run test:web-quality`: gate del artefacto público para metadatos, accesibilidad estructural, PWA y presupuestos de tamaño.
- Añadido `scripts/staging-isolation.mjs` y fixture de recursos para probar dos instituciones con JWT reales, incluyendo Storage si se configura.
- Añadido `npm run test:ops -- --strict` para bloquear releases sin evidencia de SMTP, soporte, DNS, backups/restauración y aprobación legal.
- Añadido `docs/production-operations.md` como runbook operativo de staging y producción.

## Bloqueadores P0 antes de público general

1. Crear y validar un proyecto de **staging** aislado con dos instituciones y cuatro cuentas de prueba; el script y fixture ya están preparados, pero falta ejecutarlos con JWT reales.
2. Ejecutar E2E multiusuario real: aislamiento de IDs, grupos, exámenes, notas, progreso, notificaciones, Storage y desafíos; la comprobación HTTP base ya está automatizada, pero faltan los fixtures y flujos mutables completos.
3. ~~Confirmar cuentas legacy~~ Resuelto: las tres cuentas de producción se verificaron sin valores legacy y la migración 052 retiró la columna y la rama legacy de `auth_login`.
4. Configurar correo real de Supabase y probar registro, confirmación, recuperación y reenvío.
5. Registrar `/api/health` en un monitor externo, configurar alertas y canal de soporte con responsable y tiempos de respuesta.
6. Completar revisión jurídica de privacidad, menores, licencias de traducciones y términos institucionales.
7. Definir backup automático del proveedor, RPO/RTO y una restauración completa probada.
8. Configurar dominio definitivo, DNS, SPF/DKIM/DMARC y firewall/WAF si se abre el registro.

## P1 después de cerrar P0

- Añadir E2E y smoke tests al pipeline contra staging.
- Ejecutar Lighthouse y una prueba de carga controlada.
- Completar auditoría WCAG con teclado, lector de pantalla y Safari iOS.
- Resolver la vulnerabilidad moderada transitiva de `uuid` cuando Capacitor publique una actualización compatible; mantener Dependabot y revisar el lockfile en cada release.
- Añadir presupuesto de rendimiento y alertas de costo.
- Añadir paginación y límites a auditoría, actividad, notificaciones y consultas administrativas.
- Añadir RPC de restauración de perfiles o retirar la promesa de restaurarlos desde snapshot.
- Crear política de retención y limpieza de datos por categoría.

## Decisiones explícitas

- **Pagos:** no aplican porque FormsBiblicos será gratuito.
- **APK/tiendas:** pausadas; no bloquean el lanzamiento PWA.
- **Analítica:** no se incorpora tracking de terceros hasta definir finalidad, consentimiento y minimización.
- **Menores:** no admitirlos como usuarios autónomos hasta terminar la revisión legal y contractual.
