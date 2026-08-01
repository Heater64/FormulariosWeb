-- ============================================================
-- Migración 054: Preguntas del sistema — Génesis 50 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 50 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 50;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué mandó hacer José con el cuerpo de su padre?', 'multiple',
    '["A) Enterrarlo de inmediato","B) Que lo embalsamaran los médicos","C) Quemarlo","D) Nada especial"]'::jsonb,
    '1', 'Respuesta: B) Que lo embalsamaran los médicos. Mandó José a sus siervos los médicos que embalsamasen a su padre (Génesis 50:2).', 1, true),

  (v_cap, '¿Cuántos días lloraron los egipcios a Jacob?', 'multiple',
    '["A) Cuarenta días","B) Setenta días","C) Cien días","D) Siete días"]'::jsonb,
    '1', 'Respuesta: B) Setenta días. Lo lloraron los egipcios setenta días (Génesis 50:3).', 2, true),

  (v_cap, '¿Dónde sepultaron a Jacob?', 'multiple',
    '["A) En Egipto","B) En la cueva de Macpela, en Canaán","C) En el desierto","D) En el Nilo"]'::jsonb,
    '1', 'Respuesta: B) En la cueva de Macpela, en Canaán. Lo sepultaron en la cueva del campo de Macpela (Génesis 50:13).', 3, true),

  (v_cap, '¿Qué temieron los hermanos de José después de la muerte de su padre?', 'multiple',
    '["A) Que José los perdonara","B) Que José se vengara del mal que le hicieron","C) Que los mataran los egipcios","D) Perder sus tierras"]'::jsonb,
    '1', 'Respuesta: B) Que José se vengara del mal que le hicieron. Quizá nos aborrecerá José, y nos dará el pago de todo el mal que le hicimos (Génesis 50:15).', 4, true),

  (v_cap, '¿Cómo respondió José al temor de sus hermanos?', 'multiple',
    '["A) Los castigó","B) Les dijo que no temieran, que Dios encaminó el mal para bien","C) Los ignoró","D) Los expulsó de Egipto"]'::jsonb,
    '1', 'Respuesta: B) Les dijo que no temieran, que Dios encaminó el mal para bien. No tengáis miedo... Dios lo encaminó a bien (Génesis 50:19-21).', 5, true),

  (v_cap, '¿Qué edad tenía José cuando murió?', 'multiple',
    '["A) Noventa años","B) Ciento diez años","C) Ciento veinte años","D) Ciento cincuenta años"]'::jsonb,
    '1', 'Respuesta: B) Ciento diez años. Murió José a la edad de ciento diez años (Génesis 50:26).', 6, true),

  (v_cap, '¿Qué juramento pidió José a los hijos de Israel antes de morir?', 'multiple',
    '["A) Que lo dejaran en Egipto","B) Que llevaran sus huesos de Egipto cuando Dios los visitara","C) Que lo olvidaran","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Que llevaran sus huesos de Egipto cuando Dios los visitara. Dios ciertamente os visitará, y haréis llevar de aquí mis huesos (Génesis 50:25).', 7, true),

  (v_cap, '¿Qué le prometió José a sus hermanos sobre el futuro?', 'multiple',
    '["A) Nada","B) Que Dios los visitaría y los llevaría a la tierra prometida","C) Que se quedarían en Egipto para siempre","D) Que serían esclavos"]'::jsonb,
    '1', 'Respuesta: B) Que Dios los visitaría y los llevaría a la tierra prometida. Dios ciertamente os visitará, y os hará subir de esta tierra a la tierra que juró a Abraham, a Isaac y a Jacob (Génesis 50:24).', 8, true),

  (v_cap, '¿Qué hicieron los hermanos al final para pedir perdón a José?', 'multiple',
    '["A) Nada","B) Se postraron y dijeron: Henos aquí por siervos tuyos","C) Huyeron","D) Lo desafiaron"]'::jsonb,
    '1', 'Respuesta: B) Se postraron y dijeron: Henos aquí por siervos tuyos. Vinieron también sus hermanos y se postraron delante de él, y dijeron: Henos aquí por siervos tuyos (Génesis 50:18).', 9, true),

  (v_cap, '¿Hasta qué generación de descendientes de Efraín llegó a ver José?', 'multiple',
    '["A) Ninguna","B) Hasta la tercera generación","C) Solo la primera","D) No se menciona"]'::jsonb,
    '1', 'Respuesta: B) Hasta la tercera generación. Vio José los hijos de Efraín hasta la tercera generación (Génesis 50:23).', 10, true);
END $$;