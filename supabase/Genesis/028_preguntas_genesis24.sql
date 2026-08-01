-- ============================================================
-- Migración 028: Preguntas del sistema — Génesis 24 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 24 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 24;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿A quién envió Abraham a buscar esposa para Isaac?', 'multiple',
    '["A) A su hijo mayor","B) A su criado más viejo","C) A Lot","D) A un desconocido"]'::jsonb,
    '1', 'Respuesta: B) A su criado más viejo. Dijo Abraham a un criado suyo, el más viejo de su casa (Génesis 24:2).', 1, true),

  (v_cap, '¿Qué juramento le pidió Abraham a su criado?', 'multiple',
    '["A) Que no tomara mujer cananea para Isaac","B) Que se casara él mismo con Rebeca","C) Que se quedara en Harán","D) Que trajera oro"]'::jsonb,
    '0', 'Respuesta: A) Que no tomara mujer cananea para Isaac. No tomarás para mi hijo mujer de las hijas de los cananeos (Génesis 24:3).', 2, true),

  (v_cap, '¿Cómo supo el criado que Rebeca era la elegida?', 'multiple',
    '["A) Por su belleza únicamente","B) Porque ella ofreció dar de beber a él y a sus camellos, como había pedido en oración","C) Porque Labán se lo dijo","D) Por un sueño"]'::jsonb,
    '1', 'Respuesta: B) Porque ella ofreció dar de beber a él y a sus camellos, como había pedido en oración. Sea, pues, que la doncella a quien yo dijere... y ella respondiere: Bebe (Génesis 24:14,45-46).', 3, true),

  (v_cap, '¿De quién era hija Rebeca?', 'multiple',
    '["A) De Labán","B) De Betuel, hijo de Nacor y Milca","C) De Lot","D) De Nacor directamente"]'::jsonb,
    '1', 'Respuesta: B) De Betuel, hijo de Nacor y Milca. Rebeca, que había nacido a Betuel, hijo de Milca mujer de Nacor (Génesis 24:15).', 4, true),

  (v_cap, '¿Qué regalos dio el criado a Rebeca?', 'multiple',
    '["A) Nada","B) Un pendiente de oro y dos brazaletes","C) Un vestido","D) Una casa"]'::jsonb,
    '1', 'Respuesta: B) Un pendiente de oro y dos brazaletes. Le dio el hombre un pendiente de oro... y dos brazaletes (Génesis 24:22).', 5, true),

  (v_cap, '¿Quién era el hermano de Rebeca?', 'multiple',
    '["A) Betuel","B) Labán","C) Nacor","D) Harán"]'::jsonb,
    '1', 'Respuesta: B) Labán. Rebeca tenía un hermano que se llamaba Labán (Génesis 24:29).', 6, true),

  (v_cap, '¿Aceptó Rebeca ir con el criado de inmediato?', 'multiple',
    '["A) No, se negó","B) Sí, cuando le preguntaron respondió: Sí, iré","C) Se fue sin que nadie preguntara","D) Su padre la obligó"]'::jsonb,
    '1', 'Respuesta: B) Sí, cuando le preguntaron respondió: Sí, iré. Llamaron a Rebeca, y le dijeron: ¿Irás tú con este varón? Y ella respondió: Sí, iré (Génesis 24:58).', 7, true),

  (v_cap, '¿A quién amó Isaac cuando la vio por primera vez?', 'multiple',
    '["A) A Rebeca, tomándola por mujer","B) A otra mujer","C) A nadie","D) A la nodriza"]'::jsonb,
    '0', 'Respuesta: A) A Rebeca, tomándola por mujer. Tomó a Rebeca por mujer, y la amó (Génesis 24:67).', 8, true),

  (v_cap, '¿Dónde se encontró el criado con Rebeca?', 'multiple',
    '["A) En una ciudad","B) Junto a un pozo de agua","C) En el templo","D) En el campo"]'::jsonb,
    '1', 'Respuesta: B) Junto a un pozo de agua. He aquí yo estoy junto a la fuente de agua (Génesis 24:13).', 9, true),

  (v_cap, '¿Cómo se consoló Isaac tras la muerte de su madre?', 'multiple',
    '["A) Con riquezas","B) Con el amor de Rebeca","C) No se consoló nunca","D) Viajando"]'::jsonb,
    '1', 'Respuesta: B) Con el amor de Rebeca. Se consoló Isaac después de la muerte de su madre (Génesis 24:67).', 10, true);
END $$;