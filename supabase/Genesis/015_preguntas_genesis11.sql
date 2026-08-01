-- ============================================================
-- Migración 015: Preguntas del sistema — Génesis 11 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 11 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 11;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué querían construir los hombres cuya cúspide llegara al cielo?', 'multiple',
    '["A) Un templo","B) Una ciudad y una torre","C) Un palacio","D) Un puente"]'::jsonb,
    '1', 'Respuesta: B) Una ciudad y una torre. Edifiquémonos una ciudad y una torre, cuya cúspide llegue al cielo (Génesis 11:4).', 1, true),

  (v_cap, '¿Qué hizo Jehová para detener la construcción?', 'multiple',
    '["A) Envió fuego","B) Confundió su lengua","C) Envió una inundación","D) Los convirtió en piedra"]'::jsonb,
    '1', 'Respuesta: B) Confundió su lengua. Descendamos, y confundamos allí su lengua (Génesis 11:7).', 2, true),

  (v_cap, '¿Por qué se llamó Babel a la ciudad?', 'multiple',
    '["A) Porque allí Dios confundió el lenguaje de toda la tierra","B) Por el nombre de un rey","C) Por un río cercano","D) Por casualidad"]'::jsonb,
    '0', 'Respuesta: A) Porque allí Dios confundió el lenguaje de toda la tierra. Fue llamado el nombre de ella Babel, porque allí confundió Jehová el lenguaje de toda la tierra (Génesis 11:9).', 3, true),

  (v_cap, '¿Quién fue el padre de Abram?', 'multiple',
    '["A) Nacor","B) Taré","C) Harán","D) Set"]'::jsonb,
    '1', 'Respuesta: B) Taré. Taré engendró a Abram, a Nacor y a Harán (Génesis 11:26-27).', 4, true),

  (v_cap, '¿De dónde salió Taré con Abram y Lot?', 'multiple',
    '["A) De Egipto","B) De Ur de los caldeos","C) De Canaán","D) Solo de Harán"]'::jsonb,
    '1', 'Respuesta: B) De Ur de los caldeos. Salió con ellos de Ur de los caldeos, para ir a la tierra de Canaán (Génesis 11:31).', 5, true),

  (v_cap, '¿Quién era estéril y no tenía hijo?', 'multiple',
    '["A) Rebeca","B) Sarai","C) Raquel","D) Lea"]'::jsonb,
    '1', 'Respuesta: B) Sarai. Mas Sarai era estéril, y no tenía hijo (Génesis 11:30).', 6, true),

  (v_cap, '¿Cómo se llamaba el hijo de Harán, sobrino de Abram?', 'multiple',
    '["A) Nacor","B) Lot","C) Isaac","D) Set"]'::jsonb,
    '1', 'Respuesta: B) Lot. Harán engendró a Lot (Génesis 11:27).', 7, true),

  (v_cap, '¿Dónde murió Taré?', 'multiple',
    '["A) En Ur","B) En Harán","C) En Canaán","D) En Egipto"]'::jsonb,
    '1', 'Respuesta: B) En Harán. Murió Taré en Harán (Génesis 11:32).', 8, true),

  (v_cap, '¿Cómo se llamaba la mujer de Abram?', 'multiple',
    '["A) Rebeca","B) Sarai","C) Raquel","D) Lea"]'::jsonb,
    '1', 'Respuesta: B) Sarai. El nombre de la mujer de Abram era Sarai (Génesis 11:29).', 9, true),

  (v_cap, '¿Qué tenían en común todos los hombres de la tierra antes de Babel?', 'multiple',
    '["A) La misma religión","B) Una sola lengua y unas mismas palabras","C) El mismo rey","D) La misma ciudad"]'::jsonb,
    '1', 'Respuesta: B) Una sola lengua y unas mismas palabras. Tenía entonces toda la tierra una sola lengua y unas mismas palabras (Génesis 11:1).', 10, true);
END $$;