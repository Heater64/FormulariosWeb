# Preview de FormsBiblicos

## Reproducir artefactos

- El proyecto no contiene `.env` ni `.env.local`; no hay valores locales que copiar desde el checkout principal.
- Usar Node.js y el package manager npm.
- Si `node_modules/` no existe en un checkout nuevo, ejecutar `npm install` desde la raíz (este checkout ya tiene las dependencias instaladas).
- No ejecutar scripts de Android ni generar artefactos de APK: la APK está pausada.

## Ejecutar el servidor

- Desde `C:\Users\darwi\Documents\Proyectos\FormulariosWeb`, ejecutar `npm run dev`.
- `vite.config.js` fija el puerto por defecto del proyecto en `3000`; se usa `3000` porque está libre.
- El servidor se inicia detached desde PowerShell con `npm.cmd`, redirigiendo stdout y stderr a los logs de `.freebuff/`.
- URL del preview: `http://localhost:3000/`.
