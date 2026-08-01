-- ============================================================
-- Migración 046: Preguntas del sistema — Génesis 42 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 42 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 42;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Por qué bajaron los hermanos de José a Egipto?', 'multiple',
    '["A) A comerciar oro","B) A comprar alimentos, por el hambre","C) A visitar a José","D) Por curiosidad"]'::jsonb,
    '1', 'Respuesta: B) A comprar alimentos, por el hambre. Descended allá, y comprad de allí para nosotros (Génesis 42:2).', 1, true),

  (v_cap, '¿A quién no envió Jacob con sus hermanos?', 'multiple',
    '["A) A Rubén","B) A Benjamín","C) A Judá","D) A Simeón"]'::jsonb,
    '1', 'Respuesta: B) A Benjamín. Jacob no envió a Benjamín, hermano de José, con sus hermanos (Génesis 42:4).', 2, true),

  (v_cap, '¿Reconocieron los hermanos a José?', 'multiple',
    '["A) Sí, inmediatamente","B) No, aunque José sí los reconoció a ellos","C) Solo Rubén lo reconoció","D) Ninguno lo reconoció ni él a ellos"]'::jsonb,
    '1', 'Respuesta: B) No, aunque José sí los reconoció a ellos. José, cuando vio a sus hermanos, los conoció; mas hizo como que no los conocía (Génesis 42:7).', 3, true),

  (v_cap, '¿De qué acusó José a sus hermanos?', 'multiple',
    '["A) De robo","B) De ser espías","C) De mentir sobre su padre","D) De asesinato"]'::jsonb,
    '1', 'Respuesta: B) De ser espías. Espías sois; por ver lo descubierto del país habéis venido (Génesis 42:9).', 4, true),

  (v_cap, '¿A quién retuvo José como prenda mientras los demás volvían?', 'multiple',
    '["A) A Rubén","B) A Simeón","C) A Judá","D) A todos"]'::jsonb,
    '1', 'Respuesta: B) A Simeón. Tomó de entre ellos a Simeón, y lo aprisionó a vista de ellos (Génesis 42:24).', 5, true),

  (v_cap, '¿Qué encontraron los hermanos en sus sacos de regreso?', 'multiple',
    '["A) Oro robado","B) Su propio dinero devuelto","C) Nada","D) Cartas de José"]'::jsonb,
    '1', 'Respuesta: B) Su propio dinero devuelto. Vio su dinero que estaba en la boca de su costal (Génesis 42:27).', 6, true),

  (v_cap, '¿Qué exigió José para liberar a Simeón y probar que no eran espías?', 'multiple',
    '["A) Más dinero","B) Que trajeran a su hermano menor, Benjamín","C) Que se quedaran todos presos","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Que trajeran a su hermano menor, Benjamín. Traeréis a vuestro hermano menor, y serán verificadas vuestras palabras (Génesis 42:20).', 7, true),

  (v_cap, '¿Cómo reaccionó Jacob cuando supo que debía enviar a Benjamín?', 'multiple',
    '["A) Aceptó de inmediato","B) Se negó, temiendo perder también a Benjamín","C) No le importó","D) Envió a otro hijo en su lugar"]'::jsonb,
    '1', 'Respuesta: B) Se negó, temiendo perder también a Benjamín. No descenderá mi hijo con vosotros, pues su hermano ha muerto (Génesis 42:38).', 8, true),

  (v_cap, '¿Qué se recordaban entre sí los hermanos sobre su pasado con José?', 'multiple',
    '["A) Nada en particular","B) Que habían pecado contra él al no escuchar su angustia","C) Que fue un buen trato","D) Que debía perdonarse solo"]'::jsonb,
    '1', 'Respuesta: B) Que habían pecado contra él al no escuchar su angustia. Verdaderamente hemos pecado contra nuestro hermano, pues vimos la angustia de su alma (Génesis 42:21).', 9, true),

  (v_cap, '¿Quién se ofreció como garantía ante Jacob para que Benjamín volviera con vida?', 'multiple',
    '["A) Judá","B) Rubén, ofreciendo la vida de sus propios hijos","C) Simeón","D) Nadie se ofreció"]'::jsonb,
    '1', 'Respuesta: B) Rubén, ofreciendo la vida de sus propios hijos. Rubén habló a su padre, diciendo: Harás morir a mis dos hijos, si no te lo devuelvo (Génesis 42:37).', 10, true);
END $$;