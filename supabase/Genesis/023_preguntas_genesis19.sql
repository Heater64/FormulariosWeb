-- ============================================================
-- Migración 023: Preguntas del sistema — Génesis 19 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 19 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 19;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Quién recibió a los dos ángeles en la puerta de Sodoma?', 'multiple',
    '["A) Abraham","B) Lot","C) Un extraño","D) El rey de Sodoma"]'::jsonb,
    '1', 'Respuesta: B) Lot. Lot estaba sentado a la puerta de Sodoma. Y viéndolos Lot, se levantó a recibirlos (Génesis 19:1).', 1, true),

  (v_cap, '¿Qué querían hacer los hombres de Sodoma con los visitantes de Lot?', 'multiple',
    '["A) Darles la bienvenida","B) Abusar de ellos","C) Matarlos con espadas","D) Ignorarlos"]'::jsonb,
    '1', 'Respuesta: B) Abusar de ellos. Sácalos, para que los conozcamos (Génesis 19:5).', 2, true),

  (v_cap, '¿Qué les pasó a los hombres que intentaron entrar por la fuerza en casa de Lot?', 'multiple',
    '["A) Fueron perdonados","B) Fueron heridos con ceguera","C) Huyeron por su cuenta","D) Se convirtieron en sal"]'::jsonb,
    '1', 'Respuesta: B) Fueron heridos con ceguera. A los hombres que estaban a la puerta de la casa hirieron con ceguera (Génesis 19:11).', 3, true),

  (v_cap, '¿Qué ciudad se salvó a petición de Lot?', 'multiple',
    '["A) Sodoma","B) Gomorra","C) Zoar","D) Adma"]'::jsonb,
    '2', 'Respuesta: C) Zoar. Por eso fue llamado el nombre de la ciudad, Zoar (Génesis 19:22).', 4, true),

  (v_cap, '¿Qué le pasó a la mujer de Lot?', 'multiple',
    '["A) Murió en el fuego","B) Se convirtió en estatua de sal por mirar atrás","C) Escapó sin problemas","D) Se quedó en Sodoma"]'::jsonb,
    '1', 'Respuesta: B) Se convirtió en estatua de sal por mirar atrás. La mujer de Lot miró atrás... y se volvió estatua de sal (Génesis 19:26).', 5, true),

  (v_cap, '¿Con qué destruyó Jehová Sodoma y Gomorra?', 'multiple',
    '["A) Con un terremoto","B) Con azufre y fuego desde los cielos","C) Con una inundación","D) Con una plaga"]'::jsonb,
    '1', 'Respuesta: B) Con azufre y fuego desde los cielos. Jehová hizo llover sobre Sodoma y sobre Gomorra azufre y fuego... desde los cielos (Génesis 19:24).', 6, true),

  (v_cap, '¿Quiénes se quedaron con Lot tras la destrucción?', 'multiple',
    '["A) Su esposa","B) Sus dos hijas","C) Sus yernos","D) Nadie"]'::jsonb,
    '1', 'Respuesta: B) Sus dos hijas. Lot subió de Zoar y moró en el monte, y sus dos hijas con él (Génesis 19:30).', 7, true),

  (v_cap, '¿Qué hicieron las hijas de Lot en la cueva?', 'multiple',
    '["A) Se casaron con extranjeros","B) Dieron de beber vino a su padre y concibieron de él","C) Murieron allí","D) Se fueron a Egipto"]'::jsonb,
    '1', 'Respuesta: B) Dieron de beber vino a su padre y concibieron de él. Dieron a beber vino a su padre... y las dos hijas de Lot concibieron de su padre (Génesis 19:33-36).', 8, true),

  (v_cap, '¿Qué nombre recibió el hijo de la hija mayor de Lot, padre de los moabitas?', 'multiple',
    '["A) Ben-ammi","B) Moab","C) Zoar","D) Edom"]'::jsonb,
    '1', 'Respuesta: B) Moab. Llamó su nombre Moab, el cual es padre de los moabitas hasta hoy (Génesis 19:37).', 9, true),

  (v_cap, '¿Qué nombre recibió el hijo de la hija menor, padre de los amonitas?', 'multiple',
    '["A) Moab","B) Ben-ammi","C) Zoar","D) Edom"]'::jsonb,
    '1', 'Respuesta: B) Ben-ammi. Llamó su nombre Ben-ammi, el cual es padre de los amonitas hasta hoy (Génesis 19:38).', 10, true);
END $$;