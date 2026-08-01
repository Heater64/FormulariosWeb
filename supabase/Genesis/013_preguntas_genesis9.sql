-- ============================================================
-- Migración 013: Preguntas del sistema — Génesis 9 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 9 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 9;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué señal del pacto puso Dios en las nubes?', 'multiple',
    '["A) Una estrella","B) El arco iris","C) Un relámpago","D) Una paloma"]'::jsonb,
    '1', 'Respuesta: B) El arco iris. Mi arco he puesto en las nubes, el cual será por señal del pacto (Génesis 9:13).', 1, true),

  (v_cap, '¿Qué prometió Dios que no volvería a hacer?', 'multiple',
    '["A) Bendecir a los hombres","B) Destruir la tierra con un diluvio","C) Crear animales","D) Hablar con los hombres"]'::jsonb,
    '1', 'Respuesta: B) Destruir la tierra con un diluvio. No exterminaré ya más toda carne con aguas de diluvio (Génesis 9:11).', 2, true),

  (v_cap, '¿Qué no debían comer los hombres según este pacto?', 'multiple',
    '["A) Carne en general","B) Carne con su sangre","C) Toda fruta","D) Peces"]'::jsonb,
    '1', 'Respuesta: B) Carne con su sangre. Pero carne con su vida, que es su sangre, no comeréis (Génesis 9:4).', 3, true),

  (v_cap, '¿Qué principio estableció Dios sobre quien derrame sangre de hombre?', 'multiple',
    '["A) Será perdonado","B) Su sangre será derramada","C) Será exiliado","D) Nada en particular"]'::jsonb,
    '1', 'Respuesta: B) Su sangre será derramada. El que derramare sangre de hombre, por el hombre su sangre será derramada (Génesis 9:6).', 4, true),

  (v_cap, '¿Qué plantó Noé después del diluvio?', 'multiple',
    '["A) Un huerto de frutas","B) Una viña","C) Trigo","D) Olivos"]'::jsonb,
    '1', 'Respuesta: B) Una viña. Comenzó Noé a labrar la tierra, y plantó una viña (Génesis 9:20).', 5, true),

  (v_cap, '¿Qué hizo Noé que causó su desnudez?', 'multiple',
    '["A) Se bañó en el río","B) Se embriagó con vino","C) Se durmió al sol","D) Se cayó al agua"]'::jsonb,
    '1', 'Respuesta: B) Se embriagó con vino. Bebió del vino, y se embriagó, y estaba descubierto en medio de su tienda (Génesis 9:21).', 6, true),

  (v_cap, '¿Quién vio la desnudez de su padre y se lo contó a sus hermanos?', 'multiple',
    '["A) Sem","B) Cam","C) Jafet","D) Set"]'::jsonb,
    '1', 'Respuesta: B) Cam. Cam, padre de Canaán, vio la desnudez de su padre, y lo dijo a sus dos hermanos (Génesis 9:22).', 7, true),

  (v_cap, '¿Qué hicieron Sem y Jafet al enterarse?', 'multiple',
    '["A) Se burlaron también","B) Cubrieron la desnudez de su padre sin mirarlo","C) Lo abandonaron","D) Lo despertaron de inmediato"]'::jsonb,
    '1', 'Respuesta: B) Cubrieron la desnudez de su padre sin mirarlo. Cubrieron la desnudez de su padre, teniendo vueltos sus rostros, y así no vieron su desnudez (Génesis 9:23).', 8, true),

  (v_cap, '¿A quién maldijo Noé al despertar de su embriaguez?', 'multiple',
    '["A) A Sem","B) A Canaán","C) A Jafet","D) A Cam directamente"]'::jsonb,
    '1', 'Respuesta: B) A Canaán. Maldito sea Canaán; siervo de siervos será a sus hermanos (Génesis 9:25).', 9, true),

  (v_cap, '¿Cuántos años vivió Noé después del diluvio?', 'multiple',
    '["A) 100 años","B) 200 años","C) 350 años","D) 500 años"]'::jsonb,
    '2', 'Respuesta: C) 350 años. Vivió Noé después del diluvio trescientos cincuenta años (Génesis 9:28).', 10, true);
END $$;