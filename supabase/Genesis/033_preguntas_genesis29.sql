-- ============================================================
-- Migración 033: Preguntas del sistema — Génesis 29 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 29 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 29;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿A quién conoció Jacob junto al pozo?', 'multiple',
    '["A) A Lea","B) A Raquel","C) A Débora","D) A Dina"]'::jsonb,
    '1', 'Respuesta: B) A Raquel. Raquel vino con el rebaño de su padre (Génesis 29:9).', 1, true),

  (v_cap, '¿Cuántos años sirvió Jacob por Raquel?', 'multiple',
    '["A) Cinco años","B) Siete años","C) Diez años","D) Catorce años"]'::jsonb,
    '1', 'Respuesta: B) Siete años. Yo te serviré siete años por Raquel tu hija menor (Génesis 29:18).', 2, true),

  (v_cap, '¿A quién le dio Labán a Jacob en la noche de bodas, en lugar de Raquel?', 'multiple',
    '["A) A Raquel de todas formas","B) A Lea","C) A Zilpa","D) A Bilha"]'::jsonb,
    '1', 'Respuesta: B) A Lea. A la noche tomó a Lea su hija, y se la trajo (Génesis 29:23).', 3, true),

  (v_cap, '¿Qué excusa dio Labán por el engaño?', 'multiple',
    '["A) Ninguna, no dio explicación","B) Que no se acostumbra dar la menor antes que la mayor","C) Que Lea lo pidió","D) Que fue un error de la oscuridad"]'::jsonb,
    '1', 'Respuesta: B) Que no se acostumbra dar la menor antes que la mayor. No se hace así en nuestro lugar, que se dé la menor antes de la mayor (Génesis 29:26).', 4, true),

  (v_cap, '¿Cuántos años más sirvió Jacob por Raquel después de casarse con Lea?', 'multiple',
    '["A) Cinco","B) Siete","C) Diez","D) Veinte"]'::jsonb,
    '1', 'Respuesta: B) Siete. Se te dará también la otra, por el servicio que hagas conmigo otros siete años (Génesis 29:27).', 5, true),

  (v_cap, '¿Cuál de las dos hermanas amaba más Jacob?', 'multiple',
    '["A) Lea","B) Raquel","C) A ambas igual","D) A ninguna"]'::jsonb,
    '1', 'Respuesta: B) Raquel. La amó también más que a Lea (Génesis 29:30).', 6, true),

  (v_cap, '¿Qué hijo tuvo Lea primero?', 'multiple',
    '["A) Simeón","B) Rubén","C) Judá","D) Leví"]'::jsonb,
    '1', 'Respuesta: B) Rubén. Dio a luz un hijo, y llamó su nombre Rubén (Génesis 29:32).', 7, true),

  (v_cap, '¿Qué hijo de Lea recibió un nombre relacionado con alabar a Jehová?', 'multiple',
    '["A) Rubén","B) Judá","C) Simeón","D) Leví"]'::jsonb,
    '1', 'Respuesta: B) Judá. Esta vez alabaré a Jehová; por esto llamó su nombre Judá (Génesis 29:35).', 8, true),

  (v_cap, '¿Cómo eran descritos los ojos de Lea?', 'multiple',
    '["A) Hermosos","B) Delicados","C) Grandes","D) No se menciona"]'::jsonb,
    '1', 'Respuesta: B) Delicados. Los ojos de Lea eran delicados (Génesis 29:17).', 9, true),

  (v_cap, '¿Cómo era descrita Raquel?', 'multiple',
    '["A) Fea","B) De lindo semblante y hermoso parecer","C) Anciana","D) Ciega"]'::jsonb,
    '1', 'Respuesta: B) De lindo semblante y hermoso parecer. Raquel era de lindo semblante y de hermoso parecer (Génesis 29:17).', 10, true);
END $$;