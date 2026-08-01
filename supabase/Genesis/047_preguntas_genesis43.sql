-- ============================================================
-- Migración 047: Preguntas del sistema — Génesis 43 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 43 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 43;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué condición había puesto José para que los hermanos volvieran a comprar alimento?', 'multiple',
    '["A) Traer oro","B) Traer a Benjamín con ellos","C) Traer a su padre","D) Pagar el doble"]'::jsonb,
    '1', 'Respuesta: B) Traer a Benjamín con ellos. No veréis mi rostro si no traéis a vuestro hermano con vosotros (Génesis 43:3).', 1, true),

  (v_cap, '¿Quién convenció a Jacob de dejar ir a Benjamín?', 'multiple',
    '["A) Rubén","B) Judá","C) Simeón","D) Leví"]'::jsonb,
    '1', 'Respuesta: B) Judá. Judá dijo a Israel su padre: Envía al joven conmigo (Génesis 43:8).', 2, true),

  (v_cap, '¿Qué regalo llevaron los hermanos para el gobernador de Egipto?', 'multiple',
    '["A) Oro y plata solamente","B) Bálsamo, miel, aromas, mirra, nueces y almendras","C) Ganado","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Bálsamo, miel, aromas, mirra, nueces y almendras. Un poco de bálsamo, un poco de miel, aromas y mirra, nueces y almendras (Génesis 43:11).', 3, true),

  (v_cap, '¿Qué hizo José al ver a Benjamín?', 'multiple',
    '["A) Lo ignoró","B) Se conmovió y tuvo que salir a llorar en privado","C) Lo acusó de inmediato","D) Lo encarceló"]'::jsonb,
    '1', 'Respuesta: B) Se conmovió y tuvo que salir a llorar en privado. Se conmovieron sus entrañas a causa de su hermano, y buscó dónde llorar (Génesis 43:30).', 4, true),

  (v_cap, '¿Cómo organizó José el orden en la mesa para sus hermanos?', 'multiple',
    '["A) Al azar","B) Conforme a su edad, del mayor al menor","C) Todos juntos sin orden","D) Separados por completo"]'::jsonb,
    '1', 'Respuesta: B) Conforme a su edad, del mayor al menor. El mayor conforme a su primogenitura, y el menor conforme a su menor edad (Génesis 43:33).', 5, true),

  (v_cap, '¿Cuánto más recibió Benjamín de comida que sus hermanos?', 'multiple',
    '["A) Igual que los demás","B) Cinco veces más","C) El doble","D) La mitad"]'::jsonb,
    '1', 'Respuesta: B) Cinco veces más. La porción de Benjamín era cinco veces mayor que cualquiera de las de ellos (Génesis 43:34).', 6, true),

  (v_cap, '¿Por qué comieron los egipcios separados de los hebreos?', 'multiple',
    '["A) Por casualidad","B) Porque era abominación para los egipcios comer con hebreos","C) Por falta de espacio","D) Por orden de Faraón"]'::jsonb,
    '1', 'Respuesta: B) Porque era abominación para los egipcios comer con hebreos. Los egipcios no pueden comer pan con los hebreos, lo cual es abominación a los egipcios (Génesis 43:32).', 7, true),

  (v_cap, '¿Qué le preguntó José a sus hermanos sobre su padre?', 'multiple',
    '["A) Si estaba enojado","B) Si el anciano de quien hablaron aún vivía","C) Si tenía dinero","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Si el anciano de quien hablaron aún vivía. ¿Vuestro padre, el anciano que dijisteis, lo pasa bien? ¿Vive todavía? (Génesis 43:27).', 8, true),

  (v_cap, '¿Qué llevaron los hermanos además del regalo, por si el dinero devuelto había sido un error?', 'multiple',
    '["A) Nada más","B) Doble cantidad de dinero","C) Un rehén","D) Armas"]'::jsonb,
    '1', 'Respuesta: B) Doble cantidad de dinero. Tomad en vuestras manos doble cantidad de dinero (Génesis 43:12).', 9, true),

  (v_cap, '¿Qué sentían los hermanos al ser llevados a la casa de José?', 'multiple',
    '["A) Alegría","B) Temor, pensando que sería una trampa por el dinero devuelto","C) Indiferencia","D) Confianza total"]'::jsonb,
    '1', 'Respuesta: B) Temor, pensando que sería una trampa por el dinero devuelto. Aquellos hombres tuvieron temor, cuando fueron llevados a casa de José (Génesis 43:18).', 10, true);
END $$;