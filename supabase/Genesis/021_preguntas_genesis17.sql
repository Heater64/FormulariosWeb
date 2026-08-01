-- ============================================================
-- Migración 021: Preguntas del sistema — Génesis 17 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 17 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 17;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué nuevo nombre le dio Dios a Abram?', 'multiple',
    '["A) Israel","B) Abraham","C) Isaac","D) Emanuel"]'::jsonb,
    '1', 'Respuesta: B) Abraham. No se llamará más tu nombre Abram, sino... Abraham (Génesis 17:5).', 1, true),

  (v_cap, '¿Qué nuevo nombre le dio Dios a Sarai?', 'multiple',
    '["A) Rebeca","B) Sara","C) Raquel","D) Débora"]'::jsonb,
    '1', 'Respuesta: B) Sara. A Sarai tu mujer no la llamarás Sarai, mas Sara será su nombre (Génesis 17:15).', 2, true),

  (v_cap, '¿Qué señal del pacto estableció Dios con Abraham?', 'multiple',
    '["A) El arco iris","B) La circuncisión","C) El sábado","D) El sacrificio de animales"]'::jsonb,
    '1', 'Respuesta: B) La circuncisión. Será circuncidado todo varón de entre vosotros (Génesis 17:10).', 3, true),

  (v_cap, '¿A qué edad debía circuncidarse a los varones?', 'multiple',
    '["A) Al nacer","B) A los ocho días","C) A los treinta días","D) A los doce años"]'::jsonb,
    '1', 'Respuesta: B) A los ocho días. De edad de ocho días será circuncidado todo varón (Génesis 17:12).', 4, true),

  (v_cap, '¿Qué edad tenía Abraham cuando Dios le prometió un hijo con Sara?', 'multiple',
    '["A) 75 años","B) 99 años","C) 110 años","D) 120 años"]'::jsonb,
    '1', 'Respuesta: B) 99 años. Era Abram de edad de noventa y nueve años, cuando le apareció Jehová (Génesis 17:1).', 5, true),

  (v_cap, '¿Qué nombre debía tener el hijo prometido a Sara?', 'multiple',
    '["A) Ismael","B) Isaac","C) Jacob","D) Set"]'::jsonb,
    '1', 'Respuesta: B) Isaac. Llamarás su nombre Isaac (Génesis 17:19).', 6, true),

  (v_cap, '¿Qué hizo Abraham al escuchar la promesa de un hijo con Sara?', 'multiple',
    '["A) Lloró de tristeza","B) Se rió, dudando","C) Se enojó","D) No dijo nada"]'::jsonb,
    '1', 'Respuesta: B) Se rió, dudando. Abraham se postró sobre su rostro, y se rió (Génesis 17:17).', 7, true),

  (v_cap, '¿Qué pidió Abraham a Dios por Ismael?', 'multiple',
    '["A) Que fuera desheredado","B) Que viviera delante de Dios","C) Que muriera pronto","D) Que se fuera lejos"]'::jsonb,
    '1', 'Respuesta: B) Que viviera delante de Dios. Dijo Abraham a Dios: Ojalá Ismael viva delante de ti (Génesis 17:18).', 8, true),

  (v_cap, '¿Qué prometió Dios sobre Ismael, aunque el pacto sería con Isaac?', 'multiple',
    '["A) Nada en especial","B) Que lo bendeciría, haciéndolo padre de doce príncipes y una gran nación","C) Que sería maldito","D) Que sería esclavo"]'::jsonb,
    '1', 'Respuesta: B) Que lo bendeciría, haciéndolo padre de doce príncipes y una gran nación. Le bendeciré, y le haré fructificar y multiplicar... doce príncipes engendrará (Génesis 17:20).', 9, true),

  (v_cap, '¿Quiénes fueron circuncidados el mismo día que Abraham?', 'multiple',
    '["A) Solo Isaac","B) Ismael y todos los varones de su casa","C) Nadie más","D) Solo los siervos comprados"]'::jsonb,
    '1', 'Respuesta: B) Ismael y todos los varones de su casa. En el mismo día fueron circuncidados Abraham e Ismael su hijo (Génesis 17:26).', 10, true);
END $$;