-- ============================================================
-- Migración 042: Preguntas del sistema — Génesis 38 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 38 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 38;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Quién era Tamar?', 'multiple',
    '["A) La hija de Judá","B) La nuera de Judá, esposa de Er","C) La esposa de José","D) La hermana de Judá"]'::jsonb,
    '1', 'Respuesta: B) La nuera de Judá, esposa de Er. Judá tomó mujer para su primogénito Er, la cual se llamaba Tamar (Génesis 38:6).', 1, true),

  (v_cap, '¿Qué le pasó a Er, primogénito de Judá?', 'multiple',
    '["A) Se casó feliz","B) Fue malo ante Jehová y le quitó la vida","C) Se fue lejos","D) Se hizo rico"]'::jsonb,
    '1', 'Respuesta: B) Fue malo ante Jehová y le quitó la vida. Er... fue malo ante los ojos de Jehová, y le quitó Jehová la vida (Génesis 38:7).', 2, true),

  (v_cap, '¿Qué hizo Onán que desagradó a Jehová?', 'multiple',
    '["A) Robó","B) Vertía en tierra para no dar descendencia a su hermano","C) Mintió","D) Mató a alguien"]'::jsonb,
    '1', 'Respuesta: B) Vertía en tierra para no dar descendencia a su hermano. Vertía en tierra, por no dar descendencia a su hermano (Génesis 38:9).', 3, true),

  (v_cap, '¿Cómo se disfrazó Tamar para engañar a Judá?', 'multiple',
    '["A) De sierva","B) De ramera, cubriendo su rostro con un velo","C) De hombre","D) De sacerdotisa"]'::jsonb,
    '1', 'Respuesta: B) De ramera, cubriendo su rostro con un velo. Se cubrió con un velo... la vio Judá, y la tuvo por ramera (Génesis 38:14-15).', 4, true),

  (v_cap, '¿Qué prenda dejó Judá como garantía?', 'multiple',
    '["A) Dinero","B) Su sello, cordón y báculo","C) Su ropa","D) Un anillo de oro"]'::jsonb,
    '1', 'Respuesta: B) Su sello, cordón y báculo. Tu sello, tu cordón, y tu báculo que tienes en tu mano (Génesis 38:18).', 5, true),

  (v_cap, '¿Qué reconoció Judá al final sobre Tamar?', 'multiple',
    '["A) Que ella mintió","B) Que ella era más justa que él","C) Que debía morir","D) Que era inocente sin más explicación"]'::jsonb,
    '1', 'Respuesta: B) Que ella era más justa que él. Más justa es ella que yo (Génesis 38:26).', 6, true),

  (v_cap, '¿Cuántos gemelos tuvo Tamar?', 'multiple',
    '["A) Uno","B) Dos: Fares y Zara","C) Tres","D) Ninguno"]'::jsonb,
    '1', 'Respuesta: B) Dos: Fares y Zara. Había gemelos en su seno (Génesis 38:27).', 7, true),

  (v_cap, '¿Quién nació primero entre los gemelos, aunque el otro sacó la mano primero?', 'multiple',
    '["A) Zara","B) Fares","C) Ambos a la vez","D) No se especifica"]'::jsonb,
    '1', 'Respuesta: B) Fares. ¡Qué brecha te has abierto! Y llamó su nombre Fares (Génesis 38:29).', 8, true),

  (v_cap, '¿Qué iba a pasarle a Tamar cuando se supo que estaba embarazada, antes de revelar la verdad?', 'multiple',
    '["A) Nada","B) Judá ordenó que fuera quemada","C) La expulsaron","D) La perdonaron de inmediato"]'::jsonb,
    '1', 'Respuesta: B) Judá ordenó que fuera quemada. Judá dijo: Sacadla, y sea quemada (Génesis 38:24).', 9, true),

  (v_cap, '¿Por qué Judá no entregó a Sela, su tercer hijo, a Tamar?', 'multiple',
    '["A) Porque se había ido lejos","B) Por miedo de que muriera como sus hermanos","C) Porque Sela no quiso","D) Por decisión de Tamar"]'::jsonb,
    '1', 'Respuesta: B) Por miedo de que muriera como sus hermanos. No sea que muera él también como sus hermanos (Génesis 38:11).', 10, true);
END $$;