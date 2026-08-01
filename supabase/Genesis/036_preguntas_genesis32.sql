-- ============================================================
-- Migración 036: Preguntas del sistema — Génesis 32 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 32 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 32;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Quién le salió al encuentro a Jacob en su camino de regreso?', 'multiple',
    '["A) Esaú","B) Ángeles de Dios","C) Labán","D) Un ejército enemigo"]'::jsonb,
    '1', 'Respuesta: B) Ángeles de Dios. Le salieron al encuentro ángeles de Dios (Génesis 32:1).', 1, true),

  (v_cap, '¿Cuántos hombres traía Esaú al encuentro con Jacob, según los mensajeros?', 'multiple',
    '["A) 100","B) 200","C) 400","D) 600"]'::jsonb,
    '2', 'Respuesta: C) 400. Él también viene a recibirte, y cuatrocientos hombres con él (Génesis 32:6).', 2, true),

  (v_cap, '¿Qué hizo Jacob por temor a Esaú?', 'multiple',
    '["A) Huyó","B) Dividió su gente y ganado en dos campamentos, y envió un presente","C) Se escondió","D) Atacó primero"]'::jsonb,
    '1', 'Respuesta: B) Dividió su gente y ganado en dos campamentos, y envió un presente. Distribuyó el pueblo que tenía consigo... en dos campamentos (Génesis 32:7).', 3, true),

  (v_cap, '¿Con quién luchó Jacob toda la noche en el vado de Jaboc?', 'multiple',
    '["A) Con Esaú","B) Con un varón (el ángel de Dios)","C) Con Labán","D) Con un león"]'::jsonb,
    '1', 'Respuesta: B) Con un varón (el ángel de Dios). Se quedó Jacob solo; y luchó con él un varón hasta que rayaba el alba (Génesis 32:24).', 4, true),

  (v_cap, '¿Qué le pasó al muslo de Jacob durante la lucha?', 'multiple',
    '["A) Nada","B) Se descoyuntó","C) Se rompió","D) Sanó milagrosamente"]'::jsonb,
    '1', 'Respuesta: B) Se descoyuntó. Se descoyuntó el muslo de Jacob mientras con él luchaba (Génesis 32:25).', 5, true),

  (v_cap, '¿Qué nuevo nombre recibió Jacob tras la lucha?', 'multiple',
    '["A) Abraham","B) Israel","C) Isaac","D) Judá"]'::jsonb,
    '1', 'Respuesta: B) Israel. No se dirá más tu nombre Jacob, sino Israel (Génesis 32:28).', 6, true),

  (v_cap, '¿Qué significa el nuevo nombre según el ángel?', 'multiple',
    '["A) Príncipe de Dios: has luchado con Dios y con los hombres, y has vencido","B) El que huye","C) El engañador","D) El bendecido por Esaú"]'::jsonb,
    '0', 'Respuesta: A) Príncipe de Dios: has luchado con Dios y con los hombres, y has vencido. Porque has luchado con Dios y con los hombres, y has vencido (Génesis 32:28).', 7, true),

  (v_cap, '¿Cómo llamó Jacob al lugar de la lucha?', 'multiple',
    '["A) Betel","B) Peniel","C) Galaad","D) Mahanaim"]'::jsonb,
    '1', 'Respuesta: B) Peniel. Llamó Jacob el nombre de aquel lugar, Peniel (Génesis 32:30).', 8, true),

  (v_cap, '¿Qué costumbre alimenticia se originó según el final del capítulo?', 'multiple',
    '["A) No comer cerdo","B) No comer el tendón que se contrajo en el muslo","C) No comer pescado","D) Ayunar los viernes"]'::jsonb,
    '1', 'Respuesta: B) No comer el tendón que se contrajo en el muslo. No comen los hijos de Israel... del tendón que se contrajo (Génesis 32:32).', 9, true),

  (v_cap, '¿Qué envió Jacob por delante para apaciguar a Esaú?', 'multiple',
    '["A) Un mensaje de guerra","B) Un gran presente de ganado","C) Nada","D) Solo a sus hijos"]'::jsonb,
    '1', 'Respuesta: B) Un gran presente de ganado. Tomó de lo que le vino a la mano un presente para su hermano Esaú (Génesis 32:13).', 10, true);
END $$;