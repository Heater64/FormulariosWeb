-- ============================================================
-- Migración 025: Preguntas del sistema — Génesis 21 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 21 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 21;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué edad tenía Abraham cuando nació Isaac?', 'multiple',
    '["A) Noventa años","B) Cien años","C) Ciento diez años","D) Ciento veinte años"]'::jsonb,
    '1', 'Respuesta: B) Cien años. Era Abraham de cien años cuando nació Isaac su hijo (Génesis 21:5).', 1, true),

  (v_cap, '¿Por qué Sara pidió que Agar e Ismael fueran expulsados?', 'multiple',
    '["A) Porque no le agradaban","B) Porque vio al hijo de Agar burlándose de Isaac","C) Por orden directa de Dios","D) Porque Ismael la insultó"]'::jsonb,
    '1', 'Respuesta: B) Porque vio al hijo de Agar burlándose de Isaac. Vio Sara que el hijo de Agar... se burlaba de su hijo Isaac (Génesis 21:9).', 2, true),

  (v_cap, '¿Qué le dijo Dios a Abraham sobre expulsar a Agar e Ismael?', 'multiple',
    '["A) Que no lo hiciera","B) Que oyera la voz de Sara, pues en Isaac sería llamada su descendencia","C) Que era un pecado","D) Nada en particular"]'::jsonb,
    '1', 'Respuesta: B) Que oyera la voz de Sara, pues en Isaac sería llamada su descendencia. En todo lo que te dijere Sara, oye su voz, porque en Isaac te será llamada descendencia (Génesis 21:12).', 3, true),

  (v_cap, '¿Qué le pasó a Agar e Ismael en el desierto?', 'multiple',
    '["A) Murieron de sed","B) Se les acabó el agua, pero Dios abrió los ojos de Agar y vio una fuente","C) Fueron capturados","D) Regresaron con Abraham"]'::jsonb,
    '1', 'Respuesta: B) Se les acabó el agua, pero Dios abrió los ojos de Agar y vio una fuente. Dios le abrió los ojos, y vio una fuente de agua (Génesis 21:19).', 4, true),

  (v_cap, '¿En qué se convirtió Ismael de adulto?', 'multiple',
    '["A) Sacerdote","B) Tirador de arco, habitante del desierto","C) Rey","D) Comerciante"]'::jsonb,
    '1', 'Respuesta: B) Tirador de arco, habitante del desierto. Creció, y habitó en el desierto, y fue tirador de arco (Génesis 21:20).', 5, true),

  (v_cap, '¿Qué pacto hizo Abraham con Abimelec sobre un pozo de agua?', 'multiple',
    '["A) Ninguno","B) Abraham dio siete corderas como testimonio de que él cavó el pozo","C) Pelearon por el pozo","D) Abimelec se quedó con el pozo"]'::jsonb,
    '1', 'Respuesta: B) Abraham dio siete corderas como testimonio de que él cavó el pozo. Estas siete corderas tomarás de mi mano, para que me sirvan de testimonio de que yo cavé este pozo (Génesis 21:30).', 6, true),

  (v_cap, '¿Cómo se llamó el lugar donde Abraham y Abimelec hicieron el pacto?', 'multiple',
    '["A) Bet-el","B) Beerseba","C) Sodoma","D) Harán"]'::jsonb,
    '1', 'Respuesta: B) Beerseba. Por esto llamó a aquel lugar Beerseba; porque allí juraron ambos (Génesis 21:31).', 7, true),

  (v_cap, '¿A qué edad circuncidó Abraham a Isaac?', 'multiple',
    '["A) A los treinta días","B) A los ocho días, como Dios había mandado","C) Al nacer","D) Nunca"]'::jsonb,
    '1', 'Respuesta: B) A los ocho días, como Dios había mandado. Circuncidó Abraham a su hijo Isaac de ocho días (Génesis 21:4).', 8, true),

  (v_cap, '¿Qué plantó Abraham en Beerseba?', 'multiple',
    '["A) Una viña","B) Un árbol tamarisco","C) Un huerto","D) Trigo"]'::jsonb,
    '1', 'Respuesta: B) Un árbol tamarisco. Plantó Abraham un árbol tamarisco en Beerseba (Génesis 21:33).', 9, true),

  (v_cap, '¿Qué dijo Sara que Dios le había hecho?', 'multiple',
    '["A) Llorar","B) Reír, y quien lo oyere se reirá con ella","C) Enfermar","D) Envejecer"]'::jsonb,
    '1', 'Respuesta: B) Reír, y quien lo oyere se reirá con ella. Dios me ha hecho reír, y cualquiera que lo oyere, se reirá conmigo (Génesis 21:6).', 10, true);
END $$;