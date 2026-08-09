# Actualizaciones de FormsBiblicos

## 1. Arquitectura

FormsBiblicos tiene una web pública y una aplicación Android independiente:

1. **Web pública:** Vercel sirve una landing en `https://formsbiblicos.com` con información y el enlace a la última APK estable.
2. **Android:** la app Capacitor empaqueta la interfaz completa en `dist/`, consulta un `version.json` público de Vercel, descarga una APK de GitHub Releases, comprueba su integridad y abre el instalador oficial de Android.

La app Android no carga su interfaz desde Vercel. Vercel solo participa en la landing y en el documento público de actualización. No se usa Google Play Store, no hay servidor físico ni API adicional. Supabase sigue siendo el backend de autenticación y datos.

```text
GitHub (código + Releases/APK)
             │
             ├── APK firmada
             │
Vercel ──────┬── landing pública: formsbiblicos.com
             └── /version.json (archivo estático público)

Android Capacitor ── interfaz local empaquetada en dist/
                  └─ consulta version.json
                  └─ descarga/verifica APK ── instalador oficial Android
Supabase ─────────── autenticación y datos; no interviene en updates
```

## 2. Fuente única de versión

Las fuentes están separadas por responsabilidad:

`package.json` contiene únicamente el SemVer de la aplicación:

```json
{
  "version": "1.0.1"
}
```

El entero Android se conserva en `android/version-code.properties`:

```properties
versionCode=1
```

- `package.json.version` usa `MAJOR.MINOR.PATCH`.
- `android/version-code.properties` es la fuente de `versionCode` y debe crecer en cada release Android.
- `android/app/build.gradle` lee `versionName` desde `package.json` y `versionCode` desde el archivo de propiedades.
- La interfaz Android y `version.json` reciben ambos valores durante el build de la app.
- La landing pública se construye por separado y no incluye la interfaz privada de la aplicación.
- No añadas `versionCode` a `package.json` ni edites `versionName`/`versionCode` manualmente en Gradle.

Comandos:

```bash
npm run version:patch   # cambia SemVer y aumenta el versionCode Android
npm run version:minor   # cambia SemVer y aumenta el versionCode Android
npm run version:major   # cambia SemVer y aumenta el versionCode Android
npm run version:sync    # valida ambas fuentes y su integración Android
```

El script actualiza coordinadamente el SemVer y el archivo Android, pero ambos valores siguen teniendo fuentes independientes. No reutilices ni reduzcas un `versionCode`: Android rechazará una APK con el mismo o menor código que la instalada.

## 3. Contrato `version.json`

Vercel publica el archivo en `/version.json` con caché desactivada o corta:

```json
{
  "schemaVersion": 1,
  "version": "1.2.0",
  "versionCode": 12,
  "minimumVersion": "1.0.0",
  "minimumVersionCode": 10,
  "mandatory": false,
  "apkUrl": "https://github.com/Heater64/FormulariosWeb/releases/download/v1.2.0/formsbiblicos.apk",
  "releaseUrl": "https://github.com/Heater64/FormulariosWeb/releases/tag/v1.2.0",
  "releaseNotes": ["Nueva funcionalidad", "Corrección de errores"],
  "sizeBytes": 12345678,
  "sha256": "64-caracteres-hexadecimales",
  "publishedAt": "2026-08-08T00:00:00Z"
}
```

`apkUrl` y `sha256` son `null` en el archivo inicial mientras no exista una APK publicada. Una actualización real con versión superior necesita una URL HTTPS válida de GitHub Releases; la app rechaza JSON corrupto, versiones no SemVer, tipos incorrectos, URLs no permitidas y checksums inválidos.

La comparación es numérica: `1.10.0` es superior a `1.9.0`. También se comprueba `versionCode` cuando la SemVer coincide. `mandatory: true`, o una versión instalada inferior a `minimumVersion`/`minimumVersionCode`, elimina la opción “Más tarde”.

**Versión instalada real:** en la APK, `updateService` consulta al sistema (PackageManager vía el plugin `UpdateInstaller.getInstalledVersion`) el `versionName`/`versionCode` reales en lugar de confiar solo en el valor inyectado en el build. Si un build quedó obsoleto (assets viejos con otro `__FB_APP_VERSION__`), la app no ofrece una actualización fantasma ni entra en bucle de “siempre hay actualización”. En web se usa el valor del build.

## 4. Builds y entornos

Hay dos builds separados:

```bash
npm run build          # aplicación Android local en dist/
npm run build:public   # landing pública en dist-public/
```

Vercel usa exclusivamente `npm run build:public` y publica `dist-public/`. Esa landing no tiene manifest de instalación, Service Worker ni lógica de instalación web.

Capacitor usa exclusivamente `dist/` mediante `webDir: "dist"`. No existe `server.url` en producción y la APK puede arrancar sin conexión a Vercel. Para que la app consulte el endpoint de producción, el build Android/CI recibe:

```bash
VITE_UPDATE_MANIFEST_URL=https://formularios-web-flax.vercel.app/version.json npm run build
npx cap sync android
```

**Guard de build:** `npm run build` (el build de la APK) falla si `VITE_UPDATE_MANIFEST_URL` no es una URL HTTPS absoluta. Una URL relativa (p.ej. `/version.json`) se resolvería contra `https://localhost` dentro de la WebView y la app nunca podría comprobar actualizaciones; un build sin la variable empaquetaría una APK rota. Es un fallo deliberado en build, no un error en runtime. El servidor de desarrollo (`npm run dev`) no aplica el guard. La variable es pública por diseño; no contiene secretos. El workflow de GitHub Actions usa la variable pública `UPDATE_MANIFEST_URL`, y `ci.yml` la fija explícitamente para que el guard pase. No uses un dominio de Preview en una APK de producción.

## 5. Primera configuración Android

Requisitos oficiales actuales de Capacitor 8:

- Node.js 22 o superior.
- Android Studio 2025.2.1 o superior.
- Android SDK API 24 o superior.
- Un JDK moderno; Android Studio incluye un JDK compatible.

El proyecto usa:

- `applicationId`: `com.formsbiblicos.app`.
- `minSdkVersion`: 24.
- `compileSdkVersion`/`targetSdkVersion`: 36.
- `versionName`: desde `package.json.version`.
- `versionCode`: desde `android/version-code.properties`.
- `server.url`: no configurado; la interfaz se carga desde `dist/` local.

Comandos de desarrollo:

```bash
npm install
npm run build
npx cap sync android
npx cap open android
# o
npx cap run android
```

El plugin local `UpdateInstaller` está en `android/app/src/main/java/com/formsbiblicos/app/UpdateInstallerPlugin.java` y se registra en `MainActivity`.

## 6. Flujo de descarga e instalación

1. `updateService` lee la versión instalada real del sistema (APK) o del build (web).
2. Obtiene `version.json` con timeout y `cache: no-store`.
3. Valida la respuesta y compara la versión instalada con la remota.
4. `UpdateDialog` muestra versión actual, nueva, notas, tamaño y estado.
5. Android valida que la URL inicial sea HTTPS y un asset `.apk` de GitHub Releases.
6. Sigue solo redirecciones HTTPS a hosts de GitHub permitidos.
7. Descarga por streaming a `cache/updates/formsbiblicos-update.apk.part`; nunca carga la APK completa en memoria.
8. Reintenta hasta tres veces en errores de red, informa progreso y comprueba espacio disponible.
9. Comprueba tamaño, firma ZIP/APK, package name, `versionName`, `versionCode` y SHA-256 si está configurado.
10. Si falla una comprobación, elimina la APK y no inicia instalación.
11. Renombra el temporal y genera una URI `content://` mediante `FileProvider`.
12. Abre el instalador oficial con `Intent.ACTION_VIEW` y MIME `application/vnd.android.package-archive`.

El archivo se conserva hasta el siguiente intento para que el instalador pueda leerlo; los `.part` y archivos fallidos se eliminan. El directorio es privado de la app y el `FileProvider` solo expone `cache/updates`.

## 7. “Instalar aplicaciones desconocidas”

Android 8 o posterior puede bloquear la instalación hasta que el usuario autorice a FormsBiblicos como fuente permitida. La app no intenta saltarse esa protección:

1. El diálogo explica el motivo.
2. Android abre Ajustes de la aplicación.
3. Activa **Permitir instalar aplicaciones desconocidas**.
4. Vuelve a FormsBiblicos y pulsa **Reintentar**.
5. Aparece el instalador oficial del sistema.

Si el permiso se deniega, la app sigue funcionando con la versión actual. En una actualización `mandatory`, volverá a solicitarla en las siguientes comprobaciones, pero un fallo de red o permiso nunca provoca una instalación silenciosa ni ejecuta una APK arbitraria.

## 8. Publicar una primera release manualmente

1. Verifica que el dominio de producción de Vercel esté decidido.
2. Configura `VITE_UPDATE_MANIFEST_URL` para el build Android.
3. Incrementa versión:

   ```bash
   npm run version:patch
   ```

4. Ejecuta tests y build:

   ```bash
   npm test
   npm run build
   npx cap sync android
   ```

5. En Android Studio configura el keystore de firma o usa el workflow de release con los secretos documentados.
6. Genera `android/app/build/outputs/apk/release/app-release.apk`.
7. Escribe las novedades de la release en `release-notes.md` (una por línea, empezando por `- ` o `* `; los comentarios `#` y la prosa se ignoran). El workflow las usa como cuerpo de la GitHub Release y como `releaseNotes` de `version.json`.
8. Revisa `minimumVersion`/`minimumVersionCode`/`mandatory` en el `version.json` commiteado: el workflow conserva esos campos tal cual y los publica sin tocarlos.
9. Ejecuta el workflow **Actions → Android Release → Run workflow** (rama `main`). Compila la APK firmada, crea la GitHub Release y genera y publica `version.json` automáticamente (commit + push a main; Vercel despliega el manifiesto con ese push).
10. Comprueba desde un navegador:

    ```bash
    curl -i https://TU-DOMINIO/version.json
    ```

    Debe responder HTTP 200, JSON, caché no prolongada y la nueva versión/checksum.
11. Instala la versión anterior en un dispositivo Android, abre la app y usa **Perfil → Buscar actualizaciones**.

## 9. Workflow de GitHub Actions

`.github/workflows/ci.yml` ejecuta tests y build en push/PR.

`.github/workflows/release-android.yml` se ejecuta manualmente desde **Actions → Android Release → Run workflow** y solo acepta la rama `main`. No contiene secretos falsos; necesita estos secretos del repositorio:

- `ANDROID_KEYSTORE_BASE64`: keystore de firma codificado en Base64.
- `ANDROID_KEYSTORE_PASSWORD`: contraseña del keystore.
- `ANDROID_KEY_ALIAS`: alias de firma.
- `ANDROID_KEY_PASSWORD`: contraseña de la clave.

Y esta variable pública del repositorio:

- `UPDATE_MANIFEST_URL`: URL HTTPS de producción a `/version.json`.

El workflow compila y firma la APK, calcula SHA-256 y tamaño, crea la GitHub Release y **genera y publica `version.json` automáticamente**: `scripts/generate-version-manifest.mjs` construye el manifiesto (versión/versionCode desde las fuentes, sha256/tamaño reales del asset, notas de `release-notes.md`) y valida el resultado contra el contrato de la app. Después hace commit + push a main; Vercel despliega el manifiesto con ese push. El orden garantiza que la APK ya existe cuando el manifiesto la anuncia: primero se crea la release y después se publica el manifiesto.

Para cambiar el mínimo soportado o el carácter obligatorio de una release, edita `minimumVersion`/`minimumVersionCode`/`mandatory` en el `version.json` commiteado y súbelos ANTES de ejecutar el workflow: esos tres campos se conservan tal cual.

## 10. Hacer una actualización obligatoria

Edita el manifiesto desplegado:

```json
{
  "mandatory": true,
  "minimumVersion": "1.1.0",
  "minimumVersionCode": 11
}
```

Publica primero la APK y verifica URL/checksum. Después despliega el manifiesto. No marques `mandatory` antes de que la APK sea descargable.

## 11. Rollback

### Rollback del documento web

Revierte el deployment de Vercel o despliega una versión anterior válida de `version.json`. Esto no degrada automáticamente una APK instalada.

### Rollback de una APK

Android no permite instalar una APK con `versionCode` menor sobre una mayor. Para corregir una release defectuosa, genera una nueva versión con `versionCode` superior, aunque el código funcional vuelva a ser anterior:

```text
versión defectuosa: 1.2.0 / 12
hotfix:             1.2.1 / 13
```

Publica el hotfix y actualiza el manifiesto. No borres una release que ya esté instalada por usuarios.

## 12. Qué hacer si falla

- **No aparece actualización:** confirma que la URL de producción está inyectada en el build Android (si el build falla, es el guard de `VITE_UPDATE_MANIFEST_URL`), que `version.json` tiene versión superior y que Vercel no lo está cacheando.
- **“La actualización solo está disponible para Android” dentro de la APK:** es síntoma de assets obsoletos: el `update-installer.js` viejo capturaba `root.Capacitor` al cargar antes que el runtime y `disponible()` quedaba en `false`. Reconstruye con `VITE_UPDATE_MANIFEST_URL=... npm run build && npx cap sync android` y genera la APK de nuevo. El guard de build y la resolución perezosa del bridge evitan que vuelva a ocurrir.
- **JSON inválido:** valida comillas, tipos, SemVer, `publishedAt`, URL y checksum.
- **HTTP 404 de APK:** comprueba que el nombre del asset coincida exactamente con la URL de `version.json`.
- **Checksum incorrecto:** vuelve a calcularlo sobre el archivo subido; no desactives la comprobación.
- **APK incompleta/HTML:** revisa redirecciones de GitHub y que el asset sea realmente `.apk`.
- **Sin espacio:** libera almacenamiento y reintenta.
- **Permiso desconocido:** habilítalo en Ajustes y reintenta; nunca habilites instalación silenciosa.
- **APK rechazada por downgrade:** usa una nueva versión con `versionCode` mayor.
- **La aplicación Android no arranca:** verifica que `dist/` se haya generado y sincronizado con `npx cap sync android`; la app no debe depender de Vercel para cargar su interfaz.
- **La landing pública no aparece:** confirma que Vercel use `npm run build:public` y `dist-public/`.

## Fuentes oficiales

- Capacitor Android: https://capacitorjs.com/docs/android
- Instalación en proyecto existente: https://capacitorjs.com/docs/getting-started
- Requisitos Android: https://capacitorjs.com/docs/getting-started/environment-setup
- Plugin nativo local: https://capacitorjs.com/docs/android/custom-code
- Compartir archivos con `FileProvider`: https://developer.android.com/training/secure-file-sharing
- Intents Android: https://developer.android.com/guide/components/intents-filters
