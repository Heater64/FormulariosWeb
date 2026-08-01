-- ============================================================
-- Migración 043: Preguntas del sistema — Génesis 39 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 39 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 39;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Quién compró a José en Egipto?', 'multiple',
    '["A) Faraón","B) Potifar, oficial de Faraón","C) Un mercader anónimo","D) Los ismaelitas se lo quedaron"]'::jsonb,
    '1', 'Respuesta: B) Potifar, oficial de Faraón. Potifar oficial de Faraón, capitán de la guardia... lo compró (Génesis 39:1).', 1, true),

  (v_cap, '¿Por qué prosperó José en casa de Potifar?', 'multiple',
    '["A) Por suerte","B) Porque Jehová estaba con él","C) Por su astucia","D) Por sobornos"]'::jsonb,
    '1', 'Respuesta: B) Porque Jehová estaba con él. Jehová estaba con José, y fue varón próspero (Génesis 39:2).', 2, true),

  (v_cap, '¿Qué puesto le dio Potifar a José?', 'multiple',
    '["A) Ninguno, era esclavo común","B) Mayordomo de su casa, sobre todo lo que tenía","C) Sacerdote","D) Guardia"]'::jsonb,
    '1', 'Respuesta: B) Mayordomo de su casa, sobre todo lo que tenía. Le hizo mayordomo de su casa y entregó en su poder todo lo que tenía (Génesis 39:4).', 3, true),

  (v_cap, '¿Qué quiso la esposa de Potifar de José?', 'multiple',
    '["A) Que la sirviera mejor","B) Que durmiera con ella","C) Que la llevara a Canaán","D) Que le enseñara hebreo"]'::jsonb,
    '1', 'Respuesta: B) Que durmiera con ella. La mujer de su amo puso sus ojos en José, y dijo: Duerme conmigo (Génesis 39:7).', 4, true),

  (v_cap, '¿Cómo respondió José a la propuesta?', 'multiple',
    '["A) Aceptó","B) Se negó, diciendo que sería un gran mal y pecado contra Dios","C) Lo ignoró sin responder","D) Pidió tiempo para pensar"]'::jsonb,
    '1', 'Respuesta: B) Se negó, diciendo que sería un gran mal y pecado contra Dios. ¿Cómo, pues, haría yo este grande mal, y pecaría contra Dios? (Génesis 39:9).', 5, true),

  (v_cap, '¿Qué pasó cuando ella lo agarró por su ropa?', 'multiple',
    '["A) José se quedó","B) José huyó dejando su ropa en las manos de ella","C) La golpeó","D) Nada, no pasó nada"]'::jsonb,
    '1', 'Respuesta: B) José huyó dejando su ropa en las manos de ella. Él dejó su ropa en las manos de ella, y huyó y salió (Génesis 39:12).', 6, true),

  (v_cap, '¿De qué acusó falsamente la mujer de Potifar a José?', 'multiple',
    '["A) De robo","B) De intentar deshonrarla","C) De mentir","D) De blasfemia"]'::jsonb,
    '1', 'Respuesta: B) De intentar deshonrarla. El siervo hebreo... vino a mí para deshonrarme (Génesis 39:17).', 7, true),

  (v_cap, '¿Qué le hizo Potifar a José tras la acusación?', 'multiple',
    '["A) Lo mató","B) Lo puso en la cárcel","C) Lo despidió sin más","D) Lo perdonó sin castigo"]'::jsonb,
    '1', 'Respuesta: B) Lo puso en la cárcel. Tomó su amo a José, y lo puso en la cárcel (Génesis 39:20).', 8, true),

  (v_cap, '¿Qué pasó con José en la cárcel?', 'multiple',
    '["A) Fue olvidado y maltratado","B) Jehová estuvo con él y halló gracia ante el jefe de la cárcel","C) Escapó","D) Murió allí"]'::jsonb,
    '1', 'Respuesta: B) Jehová estuvo con él y halló gracia ante el jefe de la cárcel. Jehová estaba con José y le extendió su misericordia, y le dio gracia en los ojos del jefe de la cárcel (Génesis 39:21).', 9, true),

  (v_cap, '¿Qué responsabilidad le dio el jefe de la cárcel a José?', 'multiple',
    '["A) Ninguna","B) El cuidado de todos los presos","C) Ser cocinero","D) Ser mensajero"]'::jsonb,
    '1', 'Respuesta: B) El cuidado de todos los presos. El jefe de la cárcel entregó en mano de José el cuidado de todos los presos (Génesis 39:22).', 10, true);
END $$;