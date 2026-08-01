-- ============================================================
-- Migración 020: Preguntas del sistema — Génesis 16 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 16 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 16;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Quién era Agar?', 'multiple',
    '["A) La hermana de Sarai","B) Una sierva egipcia de Sarai","C) La hija de Abram","D) Una reina"]'::jsonb,
    '1', 'Respuesta: B) Una sierva egipcia de Sarai. Sarai... tenía una sierva egipcia, que se llamaba Agar (Génesis 16:1).', 1, true),

  (v_cap, '¿Por qué Sarai le dio Agar a Abram por mujer?', 'multiple',
    '["A) Para que Agar tuviera libertad","B) Porque Sarai era estéril y quería tener hijos por medio de ella","C) Por orden de Dios","D) Por accidente"]'::jsonb,
    '1', 'Respuesta: B) Porque Sarai era estéril y quería tener hijos por medio de ella. Jehová me ha hecho estéril; te ruego, pues, que te llegues a mi sierva (Génesis 16:2).', 2, true),

  (v_cap, '¿Qué hizo Agar cuando concibió?', 'multiple',
    '["A) Se sometió aún más a Sarai","B) Miraba con desprecio a su señora","C) Huyó de inmediato sin razón","D) Se casó con otro hombre"]'::jsonb,
    '1', 'Respuesta: B) Miraba con desprecio a su señora. Cuando vio que había concebido, miraba con desprecio a su señora (Génesis 16:4).', 3, true),

  (v_cap, '¿Quién encontró a Agar en el desierto?', 'multiple',
    '["A) Abram","B) El ángel de Jehová","C) Sarai","D) Un extraño"]'::jsonb,
    '1', 'Respuesta: B) El ángel de Jehová. La halló el ángel de Jehová junto a una fuente de agua en el desierto (Génesis 16:7).', 4, true),

  (v_cap, '¿Qué nombre le dijo el ángel a Agar que debía poner a su hijo?', 'multiple',
    '["A) Isaac","B) Ismael","C) Esaú","D) Jacob"]'::jsonb,
    '1', 'Respuesta: B) Ismael. Llamarás su nombre Ismael, porque Jehová ha oído tu aflicción (Génesis 16:11).', 5, true),

  (v_cap, '¿Qué significa el nombre Ismael según el propio texto?', 'multiple',
    '["A) Dios ríe","B) Porque Jehová ha oído tu aflicción","C) Hijo de la promesa","D) El elegido"]'::jsonb,
    '1', 'Respuesta: B) Porque Jehová ha oído tu aflicción. Llamarás su nombre Ismael, porque Jehová ha oído tu aflicción (Génesis 16:11).', 6, true),

  (v_cap, '¿Cómo describió el ángel que sería Ismael?', 'multiple',
    '["A) Manso y pacífico","B) Hombre fiero, su mano contra todos","C) Sabio y rico","D) Sacerdote"]'::jsonb,
    '1', 'Respuesta: B) Hombre fiero, su mano contra todos. Él será hombre fiero; su mano será contra todos, y la mano de todos contra él (Génesis 16:12).', 7, true),

  (v_cap, '¿Qué edad tenía Abram cuando nació Ismael?', 'multiple',
    '["A) 75 años","B) 86 años","C) 99 años","D) 100 años"]'::jsonb,
    '1', 'Respuesta: B) 86 años. Era Abram de edad de ochenta y seis años, cuando Agar dio a luz a Ismael (Génesis 16:16).', 8, true),

  (v_cap, '¿Qué le mandó el ángel a Agar que hiciera?', 'multiple',
    '["A) Que huyera lejos","B) Que volviera a su señora y se sometiera","C) Que se quedara en el desierto","D) Que fuera a Egipto"]'::jsonb,
    '1', 'Respuesta: B) Que volviera a su señora y se sometiera. Vuélvete a tu señora, y ponte sumisa bajo su mano (Génesis 16:9).', 9, true),

  (v_cap, '¿Cómo llamó Agar a Dios después de este encuentro?', 'multiple',
    '["A) El Dios que provee","B) El Dios que ve","C) El Dios altísimo","D) El Dios eterno"]'::jsonb,
    '1', 'Respuesta: B) El Dios que ve. Llamó el nombre de Jehová que con ella hablaba: Tú eres Dios que ve (Génesis 16:13).', 10, true);
END $$;