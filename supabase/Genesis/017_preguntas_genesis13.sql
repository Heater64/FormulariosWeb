-- ============================================================
-- Migración 017: Preguntas del sistema — Génesis 13 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 13 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 13;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Por qué se separaron Abram y Lot?', 'multiple',
    '["A) Por una pelea personal","B) Porque la tierra no era suficiente para que habitasen juntos","C) Porque Dios se lo ordenó","D) Por una guerra"]'::jsonb,
    '1', 'Respuesta: B) Porque la tierra no era suficiente para que habitasen juntos. La tierra no era suficiente para que habitasen juntos, pues sus posesiones eran muchas (Génesis 13:6).', 1, true),

  (v_cap, '¿Qué región eligió Lot?', 'multiple',
    '["A) El desierto","B) La llanura del Jordán","C) Las montañas","D) Egipto"]'::jsonb,
    '1', 'Respuesta: B) La llanura del Jordán. Lot escogió para sí toda la llanura del Jordán (Génesis 13:10-11).', 2, true),

  (v_cap, '¿Dónde acampó Abram tras la separación?', 'multiple',
    '["A) En Sodoma","B) En la tierra de Canaán","C) En Egipto","D) En Harán"]'::jsonb,
    '1', 'Respuesta: B) En la tierra de Canaán. Abram acampó en la tierra de Canaán (Génesis 13:12).', 3, true),

  (v_cap, '¿Cómo eran descritos los hombres de Sodoma?', 'multiple',
    '["A) Justos","B) Malos y pecadores contra Jehová en gran manera","C) Ricos","D) Pacíficos"]'::jsonb,
    '1', 'Respuesta: B) Malos y pecadores contra Jehová en gran manera. Los hombres de Sodoma eran malos y pecadores contra Jehová en gran manera (Génesis 13:13).', 4, true),

  (v_cap, '¿Qué promesa repitió Dios a Abram después de que Lot se apartara?', 'multiple',
    '["A) Que tendría un hijo pronto","B) Que le daría toda la tierra y multiplicaría su descendencia como el polvo","C) Que Lot regresaría","D) Que sería rey"]'::jsonb,
    '1', 'Respuesta: B) Que le daría toda la tierra y multiplicaría su descendencia como el polvo. Toda la tierra que ves, la daré a ti y a tu descendencia... como el polvo de la tierra (Génesis 13:14-16).', 5, true),

  (v_cap, '¿Dónde se estableció finalmente Abram?', 'multiple',
    '["A) En Egipto","B) En el encinar de Mamre, en Hebrón","C) En Sodoma","D) En Ur"]'::jsonb,
    '1', 'Respuesta: B) En el encinar de Mamre, en Hebrón. Vino y moró en el encinar de Mamre, que está en Hebrón (Génesis 13:18).', 6, true),

  (v_cap, '¿Qué poseía Lot cuando se separó de Abram?', 'multiple',
    '["A) Solo su familia","B) Ovejas, vacas y tiendas","C) Nada","D) Solo esclavos"]'::jsonb,
    '1', 'Respuesta: B) Ovejas, vacas y tiendas. Lot, que andaba con Abram, tenía ovejas, vacas y tiendas (Génesis 13:5).', 7, true),

  (v_cap, '¿Hacia dónde fue poniendo Lot sus tiendas progresivamente?', 'multiple',
    '["A) Hacia Egipto","B) Hacia Sodoma","C) Hacia Harán","D) Hacia el desierto"]'::jsonb,
    '1', 'Respuesta: B) Hacia Sodoma. Fue poniendo sus tiendas hasta Sodoma (Génesis 13:12).', 8, true),

  (v_cap, '¿Con qué comparó Lot la llanura del Jordán?', 'multiple',
    '["A) Con el desierto","B) Con el huerto de Jehová y la tierra de Egipto","C) Con una tierra baldía","D) Con el mar"]'::jsonb,
    '1', 'Respuesta: B) Con el huerto de Jehová y la tierra de Egipto. Vio toda la llanura del Jordán... como el huerto de Jehová, como la tierra de Egipto (Génesis 13:10).', 9, true),

  (v_cap, '¿Qué construyó Abram en el encinar de Mamre?', 'multiple',
    '["A) Una casa","B) Un altar a Jehová","C) Un pozo","D) Una ciudad"]'::jsonb,
    '1', 'Respuesta: B) Un altar a Jehová. Edificó allí altar a Jehová (Génesis 13:18).', 10, true);
END $$;