-- ============================================================
-- Migración 053: Preguntas del sistema — Génesis 49 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 49 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 49;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué le dijo Jacob a Rubén sobre por qué no sería el principal?', 'multiple',
    '["A) Por ser el más joven","B) Por haber subido al lecho de su padre","C) Por ser débil","D) Por desobediencia general"]'::jsonb,
    '1', 'Respuesta: B) Por haber subido al lecho de su padre. Por cuanto subiste al lecho de tu padre; entonces te envileciste (Génesis 49:4).', 1, true),

  (v_cap, '¿Qué dijo Jacob sobre Simeón y Leví?', 'multiple',
    '["A) Que serían los líderes","B) Que eran hermanos de armas de iniquidad, por su furor y violencia","C) Que serían sacerdotes","D) Que serían ricos"]'::jsonb,
    '1', 'Respuesta: B) Que eran hermanos de armas de iniquidad, por su furor y violencia. Simeón y Leví son hermanos; armas de iniquidad sus armas (Génesis 49:5).', 2, true),

  (v_cap, '¿A qué tribu se le prometió que el cetro no le sería quitado?', 'multiple',
    '["A) Rubén","B) Judá","C) Leví","D) Benjamín"]'::jsonb,
    '1', 'Respuesta: B) Judá. No será quitado el cetro de Judá (Génesis 49:10).', 3, true),

  (v_cap, '¿Con qué animal comparó Jacob a Judá?', 'multiple',
    '["A) Un cordero","B) Un cachorro de león","C) Una serpiente","D) Un águila"]'::jsonb,
    '1', 'Respuesta: B) Un cachorro de león. Cachorro de león, Judá (Génesis 49:9).', 4, true),

  (v_cap, '¿Qué tribu fue descrita como serpiente junto al camino?', 'multiple',
    '["A) Dan","B) Gad","C) Aser","D) Neftalí"]'::jsonb,
    '0', 'Respuesta: A) Dan. Será Dan serpiente junto al camino (Génesis 49:17).', 5, true),

  (v_cap, '¿A quién se comparó con una rama fructífera junto a una fuente?', 'multiple',
    '["A) Judá","B) José","C) Benjamín","D) Isacar"]'::jsonb,
    '1', 'Respuesta: B) José. Rama fructífera es José, rama fructífera junto a una fuente (Génesis 49:22).', 6, true),

  (v_cap, '¿Cómo describió Jacob a Benjamín?', 'multiple',
    '["A) Un cordero manso","B) Lobo arrebatador","C) Un pastor","D) Un rey"]'::jsonb,
    '1', 'Respuesta: B) Lobo arrebatador. Benjamín es lobo arrebatador (Génesis 49:27).', 7, true),

  (v_cap, '¿Dónde pidió Jacob ser sepultado?', 'multiple',
    '["A) En Egipto","B) En la cueva de Macpela, con sus padres","C) En el mar","D) No dijo nada"]'::jsonb,
    '1', 'Respuesta: B) En la cueva de Macpela, con sus padres. Sepultadme con mis padres en la cueva que está en el campo de Efrón el heteo (Génesis 49:29).', 8, true),

  (v_cap, '¿Quiénes ya estaban sepultados en esa cueva según mencionó Jacob?', 'multiple',
    '["A) Solo Abraham","B) Abraham, Sara, Isaac, Rebeca y Lea","C) Solo Isaac","D) Nadie aún"]'::jsonb,
    '1', 'Respuesta: B) Abraham, Sara, Isaac, Rebeca y Lea. Allí sepultaron a Abraham y a Sara su mujer; allí sepultaron a Isaac y a Rebeca su mujer; allí también sepulté yo a Lea (Génesis 49:31).', 9, true),

  (v_cap, '¿Qué hizo Jacob después de bendecir a sus doce hijos?', 'multiple',
    '["A) Se levantó a viajar","B) Encogió sus pies en la cama y expiró","C) Siguió hablando por días","D) Se enfermó pero vivió"]'::jsonb,
    '1', 'Respuesta: B) Encogió sus pies en la cama y expiró. Encogió sus pies en la cama, y expiró, y fue reunido con sus padres (Génesis 49:33).', 10, true);
END $$;