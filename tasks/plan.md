# Plan de implementación: actualizaciones manuales de FormsBiblicos

## Objetivo
Distribuir FormsBiblicos como app Android fuera de Google Play sin servidor propio: Capacitor empaqueta la interfaz en `dist/`, consulta un `version.json` público de Vercel, descarga solo APKs de GitHub Releases, verifica SHA-256 y abre el instalador oficial mediante un plugin nativo local. Vercel sirve una landing pública separada; no existe producto web instalable.

## Auditoría resumida
- Frontend vanilla HTML/CSS/JS; Vite 6.3.5; Vitest 3.1.3; Supabase JS por CDN.
- Existía un `update_manager.js`, pero solo gestionaba actualización web; se elimina durante esta migración.
- No existían Capacitor, `android/`, Gradle, Manifest ni `MainActivity`.
- `package.json` no tenía versión; había versiones hardcodeadas `1.0.1` y un fallback de SW `1.0.2`.
- El checkout contiene cambios ajenos sin commit; no se revertirán ni se hará staging amplio.

## Decisiones
1. **Fuentes de versión separadas:** `package.json.version` es la fuente SemVer; `android/version-code.properties` es la fuente independiente del entero Android creciente. Gradle y la UI leen cada valor desde su fuente correspondiente.
2. **Contrato público:** `version.json` es un documento estático de release, no una API ni una dependencia de Supabase. La landing y la app Android se construyen por separado.
3. **Entornos:** en web, la URL por defecto es `./version.json`; una app nativa exige `VITE_UPDATE_MANIFEST_URL`/`window.ENV.UPDATE_MANIFEST_URL` de producción para no consultar el bundle local ni endpoints de preview.
4. **Capacitor:** usar Capacitor 8, que es la versión indicada por la documentación oficial actual. El proyecto se crea con `@capacitor/core`, `@capacitor/cli` y `@capacitor/android`.
5. **Instalación Android:** plugin local `UpdateInstaller`, registrado en `MainActivity`, descarga por streaming a `cacheDir/updates`, valida HTTPS/hosts de GitHub, tamaño, respuesta, extensión, firma ZIP/APK y SHA-256 opcional, usa `FileProvider` con URI `content://` y abre el instalador oficial. Nunca se usa `file://`, `eval()` ni instalación silenciosa.
6. **Producto web:** la landing pública no incluye manifest, Service Worker ni instalación web. La app Android contiene su interfaz localmente en `dist/`.
7. **UX:** `UpdateDialog` será reutilizable, accesible y no bloqueante para actualizaciones opcionales. La actualización obligatoria no tendrá acción “Más tarde” y persistirá hasta que el usuario actualice o corrija el error.
8. **Release workflow:** se añadirá CI para tests/build y workflow manual/opcional de APK/Release sin secretos falsos. La publicación de `version.json` seguirá requiriendo actualizar la URL y el checksum reales del asset.

## Contrato `version.json`
```json
{
  "schemaVersion": 1,
  "version": "1.2.0",
  "versionCode": 12,
  "minimumVersion": "1.0.0",
  "minimumVersionCode": 10,
  "mandatory": false,
  "apkUrl": "https://github.com/Heater64/FormulariosWeb/releases/download/v1.2.0/formsbiblicos-1.2.0.apk",
  "releaseUrl": "https://github.com/Heater64/FormulariosWeb/releases/tag/v1.2.0",
  "releaseNotes": ["Nueva funcionalidad", "Corrección de errores"],
  "sizeBytes": 12345678,
  "sha256": "...",
  "publishedAt": "2026-08-08T00:00:00Z"
}
```

`apkUrl` y `sha256` pueden ser `null` en el documento inicial mientras no exista una APK publicada; una actualización real con versión superior exige URL válida y checksum cuando se configure.

## Orden de implementación
1. Añadir contrato de versión, bump scripts y tests puros de SemVer/validación.
2. Añadir `updateService` con timeout, abort, estados claros, allowlist y comparación SemVer.
3. Añadir bridge web/nativo, `UpdateDialog` y acceso manual desde Perfil; retirar toda lógica de instalación/actualización web.
4. Añadir Capacitor y generar `android/`; registrar plugin nativo con FileProvider y descarga verificada.
5. Añadir Vercel headers, workflow/documentación y checklist de release.
6. Ejecutar tests/build, auditoría de diff y verificación runtime disponible; documentar qué requiere Android Studio/SDK real.

## Riesgos y límites
- La compilación Android se verificó en este checkout con el JDK incluido en Android Studio y el SDK local; la instalación en un dispositivo físico requiere Android Studio/SDK/ADB configurados en el PC de desarrollo.
- El dominio Vercel de producción no está en el repositorio; debe configurarse como variable para el build Android.
- Un instalador Android externo siempre queda sujeto a la autorización “instalar aplicaciones desconocidas” y a la firma de la APK. La app no puede saltarse esas protecciones.

## Fuentes oficiales consultadas
- Capacitor Android: https://capacitorjs.com/docs/android
- Instalación en proyecto existente: https://capacitorjs.com/docs/getting-started
- Requisitos actuales: https://capacitorjs.com/docs/getting-started/environment-setup
- Código nativo/plugin local: https://capacitorjs.com/docs/android/custom-code
- URI segura con FileProvider: https://developer.android.com/training/secure-file-sharing
- Intent API (la documentación marca `ACTION_INSTALL_PACKAGE` como obsoleta desde API 29): https://developer.android.com/reference/android/content/Intent
