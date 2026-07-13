-- ============================================================
-- Migración 004: Logros del sistema
-- ============================================================
INSERT INTO logros (clave, nombre, descripcion, icono) VALUES
('primer_capitulo', 'Primer Paso', 'Leíste tu primer capítulo', '📖'),
('lector_10', 'Aprendiz', 'Leíste 10 capítulos', '📚'),
('lector_50', 'Estudioso', 'Leíste 50 capítulos', '📚'),
('lector_100', 'Dedicado', 'Leíste 100 capítulos', '🏅'),
('libro_completo', 'Libro Completo', 'Completaste un libro entero', '🎯'),
('tres_libros', 'Trilogía', 'Completaste 3 libros', '🎯'),
('racha_7', 'Constante', 'Racha de 7 días', '🔥'),
('racha_30', 'Perseverante', 'Racha de 30 días', '🔥'),
('racha_100', 'Inquebrantable', 'Racha de 100 días', '💎'),
('primer_examen', 'Evaluado', 'Completaste tu primer examen', '✍️'),
('examen_perfecto', 'Perfect Score', 'Sacaste 100% en un examen', '⭐'),
('primer_tarjeta', 'Memorizando', 'Agregaste tu primera tarjeta', '🧠'),
('diez_tarjetas', 'Memoria Activa', 'Creas 10 tarjetas de memoria', '🧠'),
('repaso_50', 'Disciplinado', 'Realizas 50 repasos', '🔄'),
('nt_completo', 'Nuevo Pacto', 'Completaste todo el Nuevo Testamento', '🏆'),
('at_completo', 'Antiguo Pacto', 'Completaste todo el Antiguo Testamento', '👑')
ON CONFLICT (clave) DO NOTHING;

SELECT '✅ Logros insertados' AS mensaje;
