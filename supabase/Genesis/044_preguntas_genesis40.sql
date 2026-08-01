-- ============================================================
-- Migración 044: Preguntas del sistema — Génesis 40 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 40 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 40;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Quiénes estaban presos junto a José en la cárcel?', 'multiple',
    '["A) Dos ladrones","B) El copero y el panadero de Faraón","C) Dos soldados","D) Un sacerdote"]'::jsonb,
    '1', 'Respuesta: B) El copero y el panadero de Faraón. Los puso en prisión... contra el jefe de los coperos y contra el jefe de los panaderos (Génesis 40:2-3).', 1, true),

  (v_cap, '¿Qué interpretó José sobre el sueño del copero?', 'multiple',
    '["A) Que moriría","B) Que en tres días sería restituido a su puesto","C) Que sería esclavo para siempre","D) Nada, no lo interpretó"]'::jsonb,
    '1', 'Respuesta: B) Que en tres días sería restituido a su puesto. Al cabo de tres días levantará Faraón tu cabeza, y te restituirá a tu puesto (Génesis 40:13).', 2, true),

  (v_cap, '¿Qué interpretó José sobre el sueño del panadero?', 'multiple',
    '["A) Que sería libre","B) Que en tres días sería ahorcado","C) Que sería rico","D) Que se casaría"]'::jsonb,
    '1', 'Respuesta: B) Que en tres días sería ahorcado. Al cabo de tres días quitará Faraón tu cabeza... y te hará colgar en la horca (Génesis 40:19).', 3, true),

  (v_cap, '¿Qué le pidió José al copero que hiciera por él?', 'multiple',
    '["A) Nada","B) Que se acordara de él ante Faraón","C) Que lo matara","D) Que huyera con él"]'::jsonb,
    '1', 'Respuesta: B) Que se acordara de él ante Faraón. Acuérdate, pues, de mí cuando tengas ese bien (Génesis 40:14).', 4, true),

  (v_cap, '¿Se cumplieron las interpretaciones de José?', 'multiple',
    '["A) No, fueron erróneas","B) Sí, exactamente como las dijo","C) Solo parcialmente","D) No se sabe"]'::jsonb,
    '1', 'Respuesta: B) Sí, exactamente como las dijo. Hizo volver a su oficio al jefe de los coperos... mas hizo ahorcar al jefe de los panaderos, como lo había interpretado José (Génesis 40:21-22).', 5, true),

  (v_cap, '¿Qué vio el copero en su sueño?', 'multiple',
    '["A) Una vid con tres sarmientos que daban uvas","B) Un río de vino","C) Una serpiente","D) Un ángel"]'::jsonb,
    '0', 'Respuesta: A) Una vid con tres sarmientos que daban uvas. Veía una vid delante de mí, y en la vid tres sarmientos (Génesis 40:9-10).', 6, true),

  (v_cap, '¿Qué vio el panadero en su sueño?', 'multiple',
    '["A) Tres canastillos de pan que las aves comían","B) Un árbol de frutas","C) Fuego","D) Un pozo"]'::jsonb,
    '0', 'Respuesta: A) Tres canastillos de pan que las aves comían. Veía tres canastillos blancos sobre mi cabeza... las aves las comían (Génesis 40:16-17).', 7, true),

  (v_cap, '¿Se acordó el copero de José después de ser liberado?', 'multiple',
    '["A) Sí, inmediatamente","B) No, lo olvidó","C) A medias","D) Nunca se supo"]'::jsonb,
    '1', 'Respuesta: B) No, lo olvidó. El jefe de los coperos no se acordó de José, sino que le olvidó (Génesis 40:23).', 8, true),

  (v_cap, '¿Por qué estaba José en la cárcel según él mismo explicó al copero?', 'multiple',
    '["A) Por robar","B) Porque fue hurtado de la tierra de los hebreos y no había hecho nada","C) Por matar a alguien","D) Por deudas"]'::jsonb,
    '1', 'Respuesta: B) Porque fue hurtado de la tierra de los hebreos y no había hecho nada. Fui hurtado de la tierra de los hebreos; y tampoco he hecho aquí por qué me pusiesen en la cárcel (Génesis 40:15).', 9, true),

  (v_cap, '¿En qué ocasión especial liberó Faraón al copero?', 'multiple',
    '["A) Un día cualquiera","B) El día de su cumpleaños","C) Una fiesta religiosa","D) Sin motivo especial"]'::jsonb,
    '1', 'Respuesta: B) El día de su cumpleaños. Al tercer día, que era el día del cumpleaños de Faraón, el rey hizo banquete (Génesis 40:20).', 10, true);
END $$;