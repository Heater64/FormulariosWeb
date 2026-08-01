-- ============================================================
-- Migración 016: Preguntas del sistema — Génesis 12 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 12 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 12;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué le mandó Jehová a Abram que hiciera?', 'multiple',
    '["A) Que se quedara en su tierra","B) Que se fuera de su tierra a la tierra que le mostraría","C) Que construyera un templo","D) Que se casara de nuevo"]'::jsonb,
    '1', 'Respuesta: B) Que se fuera de su tierra a la tierra que le mostraría. Vete de tu tierra... a la tierra que te mostraré (Génesis 12:1).', 1, true),

  (v_cap, '¿Qué promesa le hizo Dios a Abram?', 'multiple',
    '["A) Riquezas inmediatas","B) Hacer de él una nación grande y bendecirlo","C) Un hijo inmediato","D) Un reino en Egipto"]'::jsonb,
    '1', 'Respuesta: B) Hacer de él una nación grande y bendecirlo. Haré de ti una nación grande, y te bendeciré (Génesis 12:2).', 2, true),

  (v_cap, '¿Qué edad tenía Abram cuando salió de Harán?', 'multiple',
    '["A) 50 años","B) 75 años","C) 90 años","D) 100 años"]'::jsonb,
    '1', 'Respuesta: B) 75 años. Era Abram de edad de setenta y cinco años cuando salió de Harán (Génesis 12:4).', 3, true),

  (v_cap, '¿Por qué descendió Abram a Egipto?', 'multiple',
    '["A) Por curiosidad","B) Porque había hambre en la tierra","C) Por orden directa de Dios","D) Para comerciar"]'::jsonb,
    '1', 'Respuesta: B) Porque había hambre en la tierra. Hubo entonces hambre en la tierra, y descendió Abram a Egipto (Génesis 12:10).', 4, true),

  (v_cap, '¿Qué le pidió Abram a Sarai que dijera en Egipto?', 'multiple',
    '["A) Que era su prima","B) Que era su hermana","C) Que era su sierva","D) Que no dijera nada"]'::jsonb,
    '1', 'Respuesta: B) Que era su hermana. Di que eres mi hermana, para que me vaya bien por causa tuya (Génesis 12:13).', 5, true),

  (v_cap, '¿Qué le pasó a Faraón y su casa por causa de Sarai?', 'multiple',
    '["A) Nada en particular","B) Jehová los hirió con grandes plagas","C) Se enriquecieron","D) Se hicieron amigos de Abram"]'::jsonb,
    '1', 'Respuesta: B) Jehová los hirió con grandes plagas. Jehová hirió a Faraón y a su casa con grandes plagas (Génesis 12:17).', 6, true),

  (v_cap, '¿Quién acompañó a Abram cuando salió de Harán?', 'multiple',
    '["A) Solo Sarai","B) Sarai y Lot","C) Solo sus siervos","D) Nadie"]'::jsonb,
    '1', 'Respuesta: B) Sarai y Lot. Se fue Abram, como Jehová le dijo; y Lot fue con él (Génesis 12:4).', 7, true),

  (v_cap, '¿Dónde edificó Abram un altar después de que Jehová se le apareciera?', 'multiple',
    '["A) En Egipto","B) En Siquem, junto al encino de More","C) En Ur","D) En Harán"]'::jsonb,
    '1', 'Respuesta: B) En Siquem, junto al encino de More. Apareció Jehová a Abram... y edificó allí un altar a Jehová (Génesis 12:6-7).', 8, true),

  (v_cap, '¿Qué le dijo Jehová a Abram sobre la tierra de Canaán?', 'multiple',
    '["A) Que nunca sería suya","B) A tu descendencia daré esta tierra","C) Que debía comprarla","D) Que la compartiría con Lot"]'::jsonb,
    '1', 'Respuesta: B) A tu descendencia daré esta tierra. A tu descendencia daré esta tierra (Génesis 12:7).', 9, true),

  (v_cap, '¿Qué hizo Faraón cuando descubrió que Sarai era mujer de Abram?', 'multiple',
    '["A) Los mató","B) Le devolvió a Sarai y lo despidió con todo lo que tenía","C) Los encarceló","D) Nada en absoluto"]'::jsonb,
    '1', 'Respuesta: B) Le devolvió a Sarai y lo despidió con todo lo que tenía. Faraón dio orden a su gente acerca de Abram; y le acompañaron, y a su mujer (Génesis 12:19-20).', 10, true);
END $$;