-- ============================================================
-- Migración 019: Preguntas del sistema — Génesis 15 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 15 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 15;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿A quién dijo Dios que sería el heredero de Abram, en lugar de un siervo?', 'multiple',
    '["A) A un siervo nacido en su casa","B) A un hijo propio de Abram","C) A un extraño","D) A su sobrino Lot"]'::jsonb,
    '1', 'Respuesta: B) A un hijo propio de Abram. No te heredará éste, sino un hijo tuyo será el que te heredará (Génesis 15:4).', 1, true),

  (v_cap, '¿Con qué comparó Dios la descendencia de Abram?', 'multiple',
    '["A) Con la arena del mar únicamente","B) Con las estrellas del cielo","C) Con las gotas de lluvia","D) Con los peces del mar"]'::jsonb,
    '1', 'Respuesta: B) Con las estrellas del cielo. Cuenta las estrellas, si las puedes contar... así será tu descendencia (Génesis 15:5).', 2, true),

  (v_cap, '¿Qué se le contó a Abram por su fe?', 'multiple',
    '["A) Riqueza","B) Justicia","C) Sabiduría","D) Poder"]'::jsonb,
    '1', 'Respuesta: B) Justicia. Creyó a Jehová, y le fue contado por justicia (Génesis 15:6).', 3, true),

  (v_cap, '¿Cuántos años profetizó Dios que la descendencia de Abram sería esclava y oprimida?', 'multiple',
    '["A) 100 años","B) 200 años","C) 400 años","D) 500 años"]'::jsonb,
    '2', 'Respuesta: C) 400 años. Será oprimida cuatrocientos años (Génesis 15:13).', 4, true),

  (v_cap, '¿Qué animales pidió Dios que Abram trajera para el pacto?', 'multiple',
    '["A) Solo aves","B) Una becerra, una cabra, un carnero, una tórtola y un palomino","C) Solo ovejas","D) Ningún animal"]'::jsonb,
    '1', 'Respuesta: B) Una becerra, una cabra, un carnero, una tórtola y un palomino. Tráeme una becerra... una cabra... un carnero... una tórtola también, y un palomino (Génesis 15:9).', 5, true),

  (v_cap, '¿Qué hizo Abram con las aves de rapiña que descendían sobre los animales partidos?', 'multiple',
    '["A) Las dejó comer","B) Las ahuyentaba","C) No pasó nada, se fueron solas","D) Se convirtieron en fuego"]'::jsonb,
    '1', 'Respuesta: B) Las ahuyentaba. Descendían aves de rapiña sobre los cuerpos muertos, y Abram las ahuyentaba (Génesis 15:11).', 6, true),

  (v_cap, '¿Qué vio Abram pasar entre los animales divididos al anochecer?', 'multiple',
    '["A) Un ángel","B) Un horno humeando y una antorcha de fuego","C) Una nube","D) Un río de sangre"]'::jsonb,
    '1', 'Respuesta: B) Un horno humeando y una antorcha de fuego. Se veía un horno humeando, y una antorcha de fuego que pasaba por entre los animales divididos (Génesis 15:17).', 7, true),

  (v_cap, '¿Hasta qué río prometió Dios dar la tierra a la descendencia de Abram?', 'multiple',
    '["A) El Jordán","B) Desde el río de Egipto hasta el río Éufrates","C) El Nilo","D) El mar Rojo"]'::jsonb,
    '1', 'Respuesta: B) Desde el río de Egipto hasta el río Éufrates. A tu descendencia daré esta tierra, desde el río de Egipto hasta el río grande, el río Éufrates (Génesis 15:18).', 8, true),

  (v_cap, '¿Qué le prometió Dios a Abram al inicio del capítulo?', 'multiple',
    '["A) Un ejército","B) No temas, yo soy tu escudo y tu galardón será grande","C) Una ciudad","D) Una esposa"]'::jsonb,
    '1', 'Respuesta: B) No temas, yo soy tu escudo y tu galardón será grande. No temas, Abram; yo soy tu escudo, y tu galardón será sobremanera grande (Génesis 15:1).', 9, true),

  (v_cap, '¿A quién describió Abram como su posible heredero antes de la promesa de un hijo propio?', 'multiple',
    '["A) A su hijo Isaac","B) Al mayordomo de su casa, Eliezer","C) A su sobrino Lot","D) A su hermano"]'::jsonb,
    '1', 'Respuesta: B) Al mayordomo de su casa, Eliezer. El mayordomo de mi casa es ese damasceno Eliezer (Génesis 15:2).', 10, true);
END $$;