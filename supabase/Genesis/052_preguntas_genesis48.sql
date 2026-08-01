-- ============================================================
-- Migración 052: Preguntas del sistema — Génesis 48 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 48 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 48;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿A quiénes adoptó Jacob como si fueran hijos suyos, igual que Rubén y Simeón?', 'multiple',
    '["A) A los hijos de Judá","B) A Efraín y Manasés, hijos de José","C) A los hijos de Benjamín","D) A ningún nieto"]'::jsonb,
    '1', 'Respuesta: B) A Efraín y Manasés, hijos de José. Tus dos hijos Efraín y Manasés... míos son; como Rubén y Simeón, serán míos (Génesis 48:5).', 1, true),

  (v_cap, '¿Sobre quién puso Jacob su mano derecha, aunque no era el primogénito?', 'multiple',
    '["A) Manasés","B) Efraín","C) José","D) Rubén"]'::jsonb,
    '1', 'Respuesta: B) Efraín. Puso su mano derecha sobre la cabeza de Efraín, que era el menor (Génesis 48:14).', 2, true),

  (v_cap, '¿Por qué se disgustó José con la bendición de su padre?', 'multiple',
    '["A) Porque no quería que bendijera a sus hijos","B) Porque puso la mano derecha sobre Efraín, el menor, y no sobre Manasés","C) Porque no los bendijo","D) Porque los maldijo"]'::jsonb,
    '1', 'Respuesta: B) Porque puso la mano derecha sobre Efraín, el menor, y no sobre Manasés. Viendo José que su padre ponía la mano derecha sobre la cabeza de Efraín, le causó esto disgusto (Génesis 48:17).', 3, true),

  (v_cap, '¿Qué respondió Jacob cuando José intentó corregirlo?', 'multiple',
    '["A) Aceptó el error","B) Dijo que lo sabía, pero el menor sería más grande que el mayor","C) Se disculpó","D) Cambió de opinión sin explicar"]'::jsonb,
    '1', 'Respuesta: B) Dijo que lo sabía, pero el menor sería más grande que el mayor. Lo sé, hijo mío, lo sé... pero su hermano menor será más grande que él (Génesis 48:19).', 4, true),

  (v_cap, '¿Qué recordó Jacob sobre la muerte de Raquel en este capítulo?', 'multiple',
    '["A) Que murió en Egipto","B) Que murió en el camino a Efrata (Belén)","C) Que murió de vieja","D) No la menciona"]'::jsonb,
    '1', 'Respuesta: B) Que murió en el camino a Efrata (Belén). Se me murió Raquel en la tierra de Canaán, en el camino... a Efrata, que es Belén (Génesis 48:7).', 5, true),

  (v_cap, '¿Qué le dijo Jacob a José sobre ver a su descendencia?', 'multiple',
    '["A) Que no esperaba verla","B) Que Dios le había hecho ver también a su descendencia","C) Que no le importaba","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Que Dios le había hecho ver también a su descendencia. No pensaba yo ver tu rostro, y he aquí Dios me ha hecho ver también a tu descendencia (Génesis 48:11).', 6, true),

  (v_cap, '¿Cómo bendijo Jacob a Efraín y Manasés en su fórmula de bendición?', 'multiple',
    '["A) Hágate Dios como a Efraín y como a Manasés","B) Sean malditos","C) No los bendijo","D) Solo mencionó a Efraín"]'::jsonb,
    '0', 'Respuesta: A) Hágate Dios como a Efraín y como a Manasés. En ti bendecirá Israel, diciendo: Hágate Dios como a Efraín y como a Manasés (Génesis 48:20).', 7, true),

  (v_cap, '¿Qué le prometió Jacob a José sobre volver a la tierra de sus padres?', 'multiple',
    '["A) Nada","B) Que Dios estaría con ellos y los haría volver","C) Que nunca volverían","D) Que se quedarían en Egipto para siempre"]'::jsonb,
    '1', 'Respuesta: B) Que Dios estaría con ellos y los haría volver. Dios estará con vosotros, y os hará volver a la tierra de vuestros padres (Génesis 48:21).', 8, true),

  (v_cap, '¿Qué le dio Jacob a José además de la bendición?', 'multiple',
    '["A) Nada extra","B) Una parte de tierra que tomó del amorreo con su espada y su arco","C) Todo su ganado","D) Su primogenitura"]'::jsonb,
    '1', 'Respuesta: B) Una parte de tierra que tomó del amorreo con su espada y su arco. Yo te he dado a ti una parte más que a tus hermanos, la cual tomé yo de mano del amorreo (Génesis 48:22).', 9, true),

  (v_cap, '¿Quién estaba enfermo al inicio de este capítulo?', 'multiple',
    '["A) José","B) Jacob (Israel)","C) Benjamín","D) Rubén"]'::jsonb,
    '1', 'Respuesta: B) Jacob (Israel). Dijeron a José: He aquí tu padre está enfermo (Génesis 48:1).', 10, true);
END $$;