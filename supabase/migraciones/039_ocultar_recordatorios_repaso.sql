-- ============================================================
-- FormsBiblicos — Migración 039
-- Retira el recordatorio diario "tienes X versículos pendientes".
--
-- El aviso `recordatorio.repasos` dejó de generarse (solo se
-- notifican eventos reales: exámenes, desafíos, grupos, logros).
-- Esta migración archiva las filas ya existentes de ese tipo para
-- que no sigan apareciendo en el centro ni contando como no leídas.
-- (La capa de repositorio también las filtra por seguridad.)
-- ============================================================

UPDATE public.notificaciones
SET estado = 'archivada',
    leida = true
WHERE tipo = 'recordatorio.repasos';
