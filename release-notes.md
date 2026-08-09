# Notas de release

Fuente única de las novedades de cada versión. El workflow `Android Release`
usa este archivo como cuerpo de la GitHub Release **y** como `releaseNotes`
de `version.json`. Solo se publican las líneas con prefijo de lista (`- ` / `* `);
los comentarios (`#`) y la prosa se ignoran.

## 1.0.12

- Corregida la actualización en Android: la descarga ya no falla con error genérico si la suscripción al progreso falla, y el error real ahora se muestra con su código en el diagnóstico
- Más robustez en el plugin nativo: reintento de errores transitorios de red y registro detallado para diagnóstico

## 1.0.11

- La barra de navegación inferior ya no se oculta al hacer scroll
- Nueva campana de notificaciones en la cabecera
- Navegación más fluida entre vistas
- Mejoras de seguridad en la web (cabeceras HTTP)
- Mejor gestión del foco en memorización y desafíos
