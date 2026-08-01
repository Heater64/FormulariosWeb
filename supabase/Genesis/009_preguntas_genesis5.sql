-- ============================================================
-- Migración 009: Preguntas del sistema — Génesis 5 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 5 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 5;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Cuántos años vivió Adán en total?', 'multiple',
    '["A) 800 años","B) 930 años","C) 969 años","D) 777 años"]'::jsonb,
    '1', 'Respuesta: B) 930 años. Fueron todos los días que vivió Adán novecientos treinta años (Génesis 5:5).', 1, true),

  (v_cap, '¿Quién caminó con Dios y desapareció porque Dios se lo llevó?', 'multiple',
    '["A) Matusalén","B) Enoc","C) Set","D) Lamec"]'::jsonb,
    '1', 'Respuesta: B) Enoc. Caminó Enoc con Dios, y desapareció, porque le llevó Dios (Génesis 5:24).', 2, true),

  (v_cap, '¿Quién vivió más años según las genealogías de este capítulo?', 'multiple',
    '["A) Adán","B) Matusalén","C) Noé","D) Enoc"]'::jsonb,
    '1', 'Respuesta: B) Matusalén. Fueron todos los días de Matusalén novecientos sesenta y nueve años (Génesis 5:27).', 3, true),

  (v_cap, '¿Quién fue el padre de Noé?', 'multiple',
    '["A) Matusalén","B) Lamec","C) Enoc","D) Set"]'::jsonb,
    '1', 'Respuesta: B) Lamec. Vivió Lamec ciento ochenta y dos años, y engendró un hijo... llamó su nombre Noé (Génesis 5:28-29).', 4, true),

  (v_cap, '¿Qué significado le dio Lamec al nombre de Noé?', 'multiple',
    '["A) Que traería guerra","B) Que los aliviaría del trabajo por la tierra maldita","C) Que sería el más fuerte","D) Ningún significado especial"]'::jsonb,
    '1', 'Respuesta: B) Que los aliviaría del trabajo por la tierra maldita. Este nos aliviará de nuestras obras y del trabajo de nuestras manos, a causa de la tierra que Jehová maldijo (Génesis 5:29).', 5, true),

  (v_cap, '¿A quién engendró Set?', 'multiple',
    '["A) A Caín","B) A Enós","C) A Jared","D) A Lamec"]'::jsonb,
    '1', 'Respuesta: B) A Enós. Vivió Set ciento cinco años, y engendró a Enós (Génesis 5:6).', 6, true),

  (v_cap, '¿Cuántos hijos engendró Noé y cómo se llamaban?', 'multiple',
    '["A) Dos: Sem y Cam","B) Tres: Sem, Cam y Jafet","C) Cuatro hijos","D) Uno solo"]'::jsonb,
    '1', 'Respuesta: B) Tres: Sem, Cam y Jafet. Siendo Noé de quinientos años, engendró a Sem, a Cam y a Jafet (Génesis 5:32).', 7, true),

  (v_cap, '¿A semejanza de quién fue hecho Adán según el inicio del capítulo?', 'multiple',
    '["A) De los ángeles","B) A semejanza de Dios","C) De los animales","D) No se dice"]'::jsonb,
    '1', 'Respuesta: B) A semejanza de Dios. El día en que creó Dios al hombre, a semejanza de Dios lo hizo (Génesis 5:1).', 8, true),

  (v_cap, '¿Quién fue el padre de Matusalén?', 'multiple',
    '["A) Jared","B) Enoc","C) Lamec","D) Cainán"]'::jsonb,
    '1', 'Respuesta: B) Enoc. Vivió Enoc sesenta y cinco años, y engendró a Matusalén (Génesis 5:21).', 9, true),

  (v_cap, '¿De qué edad era Noé cuando engendró a sus hijos?', 'multiple',
    '["A) 400 años","B) 500 años","C) 600 años","D) 950 años"]'::jsonb,
    '1', 'Respuesta: B) 500 años. Siendo Noé de quinientos años, engendró a Sem, a Cam y a Jafet (Génesis 5:32).', 10, true);
END $$;