# Runbook de backup y restauración

## Secretos de GitHub

Configurar en el repositorio:

- `SUPABASE_DB_URL`: cadena de conexión directa de Supabase, solo en GitHub Actions.
- `BACKUP_ENCRYPTION_KEY`: secreto largo generado aleatoriamente, solo en GitHub Actions.

No usar `service_role` en el navegador ni guardar dumps planos en Git.

## Backup diario

`.github/workflows/backup.yml` se ejecuta diariamente a las 00:00 UTC y manualmente desde Actions. Genera roles, esquema y datos, calcula hashes, cifra los SQL y conserva un artefacto cifrado durante 35 días.

El workflow no hace commit a `main`: un repositorio Git no es un almacén adecuado para datos personales. Para una retención mayor, copiar el artefacto cifrado a almacenamiento privado con acceso restringido y retención definida.

## Restauración de prueba

1. Descargar un artefacto cifrado desde Actions.
2. Restaurar únicamente en un proyecto Supabase de staging aislado.
3. Descifrar usando la misma `BACKUP_ENCRYPTION_KEY` fuera del repositorio.
4. Aplicar esquema y datos con un cliente PostgreSQL autorizado.
5. Aplicar/verificar las migraciones versionadas.
6. Ejecutar `npm run test:staging:isolation` con dos instituciones.
7. Probar Auth, grupos, notas, exámenes, desafíos, notificaciones y Storage.
8. Registrar fecha, duración, RPO observado, RTO observado, versión y responsable.

## Evidencia

Usar `docs/backup-restore-evidence.example.json` como estructura. Guardar la evidencia real fuera de Git si contiene IDs, nombres, correos o datos de usuarios.

El backup no se considera operativo hasta haber restaurado una copia en staging y pasado los smoke tests.
