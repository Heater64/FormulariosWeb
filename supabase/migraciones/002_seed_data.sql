-- ============================================================
-- Migración 002: Datos iniciales — libros bíblicos y usuarios
-- ============================================================

-- Libros del Antiguo Testamento
INSERT INTO libros_biblicos (id, nombre, testamento, num_capitulos, abreviatura) VALUES
(1,  'Génesis',      'antiguo', 50, 'Gén'),
(2,  'Éxodo',        'antiguo', 40, 'Éx'),
(3,  'Levítico',     'antiguo', 27, 'Lv'),
(4,  'Números',      'antiguo', 36, 'Núm'),
(5,  'Deuteronomio', 'antiguo', 34, 'Dt'),
(6,  'Josué',        'antiguo', 24, 'Jos'),
(7,  'Jueces',       'antiguo', 21, 'Jue'),
(8,  'Rut',          'antiguo', 4,  'Rut'),
(9,  '1 Samuel',     'antiguo', 31, '1 S'),
(10, '2 Samuel',     'antiguo', 24, '2 S'),
(11, '1 Reyes',      'antiguo', 22, '1 R'),
(12, '2 Reyes',      'antiguo', 25, '2 R'),
(13, '1 Crónicas',   'antiguo', 29, '1 Cr'),
(14, '2 Crónicas',   'antiguo', 36, '2 Cr'),
(15, 'Esdras',       'antiguo', 10, 'Esd'),
(16, 'Nehemías',     'antiguo', 13, 'Neh'),
(17, 'Ester',        'antiguo', 10, 'Est'),
(18, 'Job',          'antiguo', 42, 'Job'),
(19, 'Salmos',       'antiguo', 150, 'Sal'),
(20, 'Proverbios',   'antiguo', 31, 'Pr'),
(21, 'Eclesiastés',  'antiguo', 12, 'Ec'),
(22, 'Cantares',     'antiguo', 8,  'Cnt'),
(23, 'Isaías',       'antiguo', 66, 'Is'),
(24, 'Jeremías',     'antiguo', 52, 'Jer'),
(25, 'Lamentaciones','antiguo', 5,  'Lam'),
(26, 'Ezequiel',     'antiguo', 48, 'Ez'),
(27, 'Daniel',       'antiguo', 12, 'Dn'),
(28, 'Oseas',        'antiguo', 14, 'Os'),
(29, 'Joel',         'antiguo', 3,  'Jl'),
(30, 'Amós',         'antiguo', 9,  'Am'),
(31, 'Abdías',       'antiguo', 1,  'Abd'),
(32, 'Jonás',        'antiguo', 4,  'Jon'),
(33, 'Miqueas',      'antiguo', 7,  'Miq'),
(34, 'Nahúm',        'antiguo', 3,  'Nah'),
(35, 'Habacuc',      'antiguo', 3,  'Hab'),
(36, 'Sofonías',     'antiguo', 3,  'Sof'),
(37, 'Hageo',        'antiguo', 2,  'Hag'),
(38, 'Zacarías',     'antiguo', 14, 'Zac'),
(39, 'Malaquías',    'antiguo', 4,  'Mal')
ON CONFLICT (id) DO NOTHING;

-- Libros del Nuevo Testamento
INSERT INTO libros_biblicos (id, nombre, testamento, num_capitulos, abreviatura) VALUES
(40, 'Mateo',        'nuevo', 28, 'Mt'),
(41, 'Marcos',       'nuevo', 16, 'Mr'),
(42, 'Lucas',        'nuevo', 24, 'Lc'),
(43, 'Juan',         'nuevo', 21, 'Jn'),
(44, 'Hechos',       'nuevo', 28, 'Hch'),
(45, 'Romanos',      'nuevo', 16, 'Ro'),
(46, '1 Corintios',  'nuevo', 16, '1 Co'),
(47, '2 Corintios',  'nuevo', 13, '2 Co'),
(48, 'Gálatas',      'nuevo', 6,  'Gá'),
(49, 'Efesios',      'nuevo', 6,  'Ef'),
(50, 'Filipenses',   'nuevo', 4,  'Fil'),
(51, 'Colosenses',   'nuevo', 4,  'Col'),
(52, '1 Tesalonicenses','nuevo', 3, '1 Ts'),
(53, '2 Tesalonicenses','nuevo', 3, '2 Ts'),
(54, '1 Timoteo',    'nuevo', 6,  '1 Ti'),
(55, '2 Timoteo',    'nuevo', 4,  '2 Ti'),
(56, 'Tito',         'nuevo', 3,  'Tit'),
(57, 'Filemón',      'nuevo', 1,  'Flm'),
(58, 'Hebreos',      'nuevo', 13, 'Heb'),
(59, 'Santiago',     'nuevo', 5,  'Stg'),
(60, '1 Pedro',      'nuevo', 5,  '1 P'),
(61, '2 Pedro',      'nuevo', 3,  '2 P'),
(62, '1 Juan',       'nuevo', 5,  '1 Jn'),
(63, '2 Juan',       'nuevo', 1,  '2 Jn'),
(64, '3 Juan',       'nuevo', 1,  '3 Jn'),
(65, 'Judas',        'nuevo', 1,  'Jud'),
(66, 'Apocalipsis',  'nuevo', 22, 'Ap')
ON CONFLICT (id) DO NOTHING;

-- Generar capítulos automáticamente
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id, num_capitulos FROM libros_biblicos LOOP
    FOR i IN 1..rec.num_capitulos LOOP
      INSERT INTO capitulos (libro_id, numero)
      VALUES (rec.id, i)
      ON CONFLICT (libro_id, numero) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Usuarios por defecto
INSERT INTO perfiles (username, password, nombre_completo, rol) VALUES
('owner',  'owner123',  'Propietario',    'owner'),
('admin1', 'admin123',  'Admin Central',  'admin'),
('editor1','editor123', 'Editor Demo',    'editor'),
('alumno', 'alumno123', 'Alumno Demo',    'usuario')
ON CONFLICT (username) DO NOTHING;

-- Grupo por defecto
INSERT INTO grupos (id, nombre, admin_id)
SELECT gen_random_uuid(), 'Grupo Central', id FROM perfiles WHERE username = 'admin1'
ON CONFLICT DO NOTHING;

-- Asignar alumnos al grupo
DO $$
DECLARE
  v_grupo_id UUID;
  v_editor_id UUID;
  v_admin_id UUID;
  v_alumno_id UUID;
BEGIN
  SELECT id INTO v_grupo_id FROM grupos WHERE nombre = 'Grupo Central' LIMIT 1;
  SELECT id INTO v_admin_id FROM perfiles WHERE username = 'admin1';
  SELECT id INTO v_editor_id FROM perfiles WHERE username = 'editor1';
  SELECT id INTO v_alumno_id FROM perfiles WHERE username = 'alumno';

  IF v_grupo_id IS NOT NULL THEN
    UPDATE perfiles SET grupo_id = v_grupo_id WHERE id IN (v_admin_id, v_editor_id, v_alumno_id);

    INSERT INTO miembros_grupo (grupo_id, usuario_id, rol_en_grupo) VALUES
    (v_grupo_id, v_admin_id,  'admin'),
    (v_grupo_id, v_editor_id, 'editor'),
    (v_grupo_id, v_alumno_id, 'miembro')
    ON CONFLICT (grupo_id, usuario_id) DO NOTHING;
  END IF;
END $$;

SELECT '✅ Migración 002 completada' AS mensaje;
