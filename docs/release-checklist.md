# Checklist de release FormsBiblicos

## A. Preparación

- [ ] Confirmar que la release no mezcla Preview con Producción.
- [ ] Confirmar el dominio público de `version.json`.
- [ ] Confirmar que `UPDATE_MANIFEST_URL` de GitHub Actions apunta a Producción.
- [ ] Confirmar que el keystore y sus cuatro secretos están disponibles; nunca subir el keystore al repositorio.
- [ ] Revisar cambios funcionales, autenticación, Supabase, navegación Android y landing pública.
- [ ] Confirmar que no hay secretos, `service_role`, contraseñas o tokens en el diff.

## B. Versionado

- [ ] Ejecutar uno de:
  - [ ] `npm run version:patch`
  - [ ] `npm run version:minor`
  - [ ] `npm run version:major`
- [ ] Revisar `package.json.version` en SemVer `MAJOR.MINOR.PATCH`.
- [ ] Revisar que `android/version-code.properties` tenga un `versionCode` mayor que el de la release anterior.
- [ ] Ejecutar `npm run version:sync`.
- [ ] Confirmar que `android/app/build.gradle` lee `package.json.version` y `android/version-code.properties`, sin valores manuales de versión.
- [ ] Escribir las novedades en `release-notes.md` (una por línea empezando por `- ` o `* `; comentarios `#` y prosa ignorados).
- [ ] Revisar `minimumVersion`/`minimumVersionCode`/`mandatory` en `version.json` (el workflow los conserva y publica tal cual).

## C. Verificación antes de APK

- [ ] Ejecutar `npm test`.
- [ ] Ejecutar `npm run build` para la app Android local.
- [ ] Ejecutar `npm run build:public` para la landing de Vercel.
- [ ] Revisar warnings y errores de consola de ambos builds.
- [ ] Ejecutar `npx cap sync android`.
- [ ] Confirmar que el build Android recibe `VITE_UPDATE_MANIFEST_URL` de Producción.
- [ ] Probar login, navegación, Supabase, Android y Perfil.
- [ ] Confirmar que la landing no contiene manifest ni Service Worker.
- [ ] Probar **Perfil → Buscar actualizaciones** con un manifiesto controlado.

## D. APK

- [ ] Generar APK release firmada:
  - [ ] Android Studio, o
  - [ ] workflow manual `Android Release`.
- [ ] Verificar que el package name es `com.formsbiblicos.app`.
- [ ] Verificar `versionName` y `versionCode` dentro de la APK.
- [ ] Verificar que no se está usando una firma debug para producción.
- [ ] Conservar el asset versionado `formsbiblicos-X.Y.Z.apk`.
- [ ] Publicar también la copia estable `formsbiblicos.apk` para el botón de la landing.
- [ ] Calcular SHA-256:
  - [ ] `sha256sum formsbiblicos-X.Y.Z.apk`
  - [ ] o `Get-FileHash .\formsbiblicos-X.Y.Z.apk -Algorithm SHA256`.
- [ ] Registrar el tamaño exacto en bytes.

## E. GitHub Release

- [ ] Ejecutar **Actions → Android Release → Run workflow** desde la rama `main`.
- [ ] Confirmar que el workflow crea la GitHub Release con la APK firmada y las notas de `release-notes.md`.
- [ ] Confirmar que la URL pública devuelve la APK y no una página HTML.
- [ ] Confirmar que el workflow genera `version.json` y lo publica con commit + push.
- [ ] Conservar el resumen del workflow (versión, versionCode, sha256, tamaño).

## F. `version.json` (automatizado)

- [ ] Confirmar que el workflow lo generó con la versión, versionCode, sha256 y tamaño reales de la release.
- [ ] Confirmar que conservó `minimumVersion`/`minimumVersionCode`/`mandatory` del archivo commiteado.
- [ ] Confirmar que el commit "Manifest X.Y.Z" llegó a `main` (Vercel se despliega con ese push).
- [ ] Confirmar que no hay URLs HTTP, hosts desconocidos o campos con tipos incorrectos (el script valida antes de escribir).

## G. Vercel

- [ ] Confirmar el despliegue automático del push "Manifest X.Y.Z" (Producción, no Preview).
- [ ] Abrir `https://TU-DOMINIO/version.json` sin autenticación.
- [ ] Confirmar HTTP 200.
- [ ] Confirmar `Content-Type: application/json`.
- [ ] Confirmar `Cache-Control` sin caché prolongada.
- [ ] Confirmar que la respuesta contiene el nuevo `version`, `versionCode` y `sha256`.
- [ ] Confirmar que `apkUrl` devuelve el asset esperado.

## H. Pruebas de actualización

- [ ] App con versión igual: no muestra actualización.
- [ ] App con versión anterior: muestra diálogo no bloqueante.
- [ ] `1.10.0` frente a `1.9.0`: detecta la actualización.
- [ ] `mandatory: true`: no muestra “Más tarde”.
- [ ] Endpoint caído/offline: la app sigue funcionando.
- [ ] JSON corrupto: no bloquea el arranque.
- [ ] APK incompleta: no abre instalador.
- [ ] SHA-256 incorrecto: elimina archivo y no instala.
- [ ] Permiso unknown sources denegado: muestra instrucciones y no rompe la app.
- [ ] Descarga cancelada: se limpia el `.part`.
- [ ] Red perdida durante descarga: reintenta y muestra error legible.
- [ ] Espacio insuficiente: no deja un archivo instalable incompleto.
- [ ] Instalador oficial muestra package/version correctos.

## I. Cierre

- [ ] Registrar URL de release, SHA-256, versionCode y fecha.
- [ ] Confirmar que el manifiesto desplegado apunta a Producción.
- [ ] Conservar el APK y la release anterior para rollback.
- [ ] No borrar releases ya distribuidas.
- [ ] Si hay un error después de publicar, crear hotfix con `versionCode` mayor; no intentar downgrade.
- [ ] Documentar cualquier incidencia y resolución.
