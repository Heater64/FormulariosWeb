# Tareas: actualizaciones FormsBiblicos

> ⚠️ **PAUSADO.** La APK de Android está en pausa (ver `README.md`). Estas tareas quedan pendientes para retomarla en el futuro.

- [ ] Definir `package.json.version` y el archivo Android independiente como fuentes de versión; añadir bump scripts.
  - Aceptación: patch/minor/major actualizan SemVer y aumentan siempre el `versionCode` de Android sin añadir campos no estándar a package.json.
  - Verificar: tests del script y revisión de `package.json`.

- [ ] Definir y validar el contrato público `version.json`.
  - Aceptación: tipos, SemVer, enteros, fechas, URLs HTTPS y campos opcionales seguros.
  - Verificar: tests de validación y build con `dist/version.json`.

- [ ] Implementar servicio independiente de actualización.
  - Aceptación: timeout, errores no bloqueantes, comparación `1.10.0 > 1.9.0`, mandatory y allowlist GitHub.
  - Verificar: tests de casos 1–6 y URL maliciosa.

- [ ] Implementar UX `UpdateDialog`.
  - Aceptación: estados comprobando/disponible/descargando/completada/error/mandatory; foco accesible; opcional se puede posponer.
  - Verificar: build y prueba manual web.

- [ ] Añadir puente Capacitor para descarga/instalación.
  - Aceptación: la web no se rompe sin plugin; Android recibe progreso/cancelación/errores.
  - Verificar: build web y revisión del contrato nativo.

- [ ] Añadir proyecto Android Capacitor y plugin `UpdateInstaller`.
  - Aceptación: streaming a cache, checksum, FileProvider, URI `content://`, permiso unknown sources y Activity oficial.
  - Verificar: `npx cap sync android` y build Gradle cuando el entorno Android esté disponible.

- [ ] Configurar Vercel y workflow sin secretos falsos.
  - Aceptación: `/version.json` público, `200`, JSON y caché corta; CI ejecuta test/build.
  - Verificar: `npm run build` y documentación de configuración.

- [ ] Documentar releases, rollback y troubleshooting.
  - Aceptación: `docs/app-updates.md` y `docs/release-checklist.md` cubren primera/siguientes releases, SHA-256 y unknown sources.
  - Verificar: checklist revisada contra el flujo real.

- [ ] Ejecutar verificación final.
  - Aceptación: tests y build pasan; diff solo contiene cambios propios; limitaciones Android quedan explicitadas.
  - Verificar: `npm test`, `npm run build`, logs/runtime disponibles.
