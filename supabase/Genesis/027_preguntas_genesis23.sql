-- ============================================================
-- Migración 027: Preguntas del sistema — Génesis 23 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 23 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 23;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Cuántos años vivió Sara?', 'multiple',
    '["A) Cien años","B) Ciento veintisiete años","C) Ciento cincuenta años","D) Doscientos años"]'::jsonb,
    '1', 'Respuesta: B) Ciento veintisiete años. Fue la vida de Sara ciento veintisiete años (Génesis 23:1).', 1, true),

  (v_cap, '¿Dónde murió Sara?', 'multiple',
    '["A) En Egipto","B) En Quiriat-arba, que es Hebrón","C) En Harán","D) En Beerseba"]'::jsonb,
    '1', 'Respuesta: B) En Quiriat-arba, que es Hebrón. Murió Sara en Quiriat-arba, que es Hebrón (Génesis 23:2).', 2, true),

  (v_cap, '¿A quién le compró Abraham la cueva de Macpela?', 'multiple',
    '["A) A Melquisedec","B) A Efrón heteo","C) A Abimelec","D) A Labán"]'::jsonb,
    '1', 'Respuesta: B) A Efrón heteo. Para que me dé la cueva de Macpela... respondió Efrón heteo a Abraham (Génesis 23:9-10).', 3, true),

  (v_cap, '¿Cuánto pagó Abraham por el campo y la cueva?', 'multiple',
    '["A) Cien siclos de plata","B) Cuatrocientos siclos de plata","C) Mil monedas de plata","D) Se la regalaron"]'::jsonb,
    '1', 'Respuesta: B) Cuatrocientos siclos de plata. Pesó Abraham a Efrón el dinero... cuatrocientos siclos de plata (Génesis 23:16).', 4, true),

  (v_cap, '¿Para qué quería Abraham la cueva de Macpela?', 'multiple',
    '["A) Para vivir en ella","B) Como posesión de sepultura para su muerta","C) Para guardar tesoros","D) Para un altar"]'::jsonb,
    '1', 'Respuesta: B) Como posesión de sepultura para su muerta. Dadme propiedad para sepultura entre vosotros (Génesis 23:4).', 5, true),

  (v_cap, '¿Cómo se presentó Abraham ante los hijos de Het?', 'multiple',
    '["A) Como su rey","B) Como extranjero y forastero entre ellos","C) Como su enemigo","D) Como su sacerdote"]'::jsonb,
    '1', 'Respuesta: B) Como extranjero y forastero entre ellos. Extranjero y forastero soy entre vosotros (Génesis 23:4).', 6, true),

  (v_cap, '¿Qué le ofrecieron primero los hijos de Het a Abraham?', 'multiple',
    '["A) Nada","B) Que sepultara a su muerta en lo mejor de sus sepulcros, gratis","C) Un precio muy alto","D) Rechazaron ayudarlo"]'::jsonb,
    '1', 'Respuesta: B) Que sepultara a su muerta en lo mejor de sus sepulcros, gratis. En lo mejor de nuestros sepulcros sepulta a tu muerta (Génesis 23:6).', 7, true),

  (v_cap, '¿Dónde estaba ubicada la heredad de Efrón?', 'multiple',
    '["A) En Macpela, al oriente de Mamre","B) En Egipto","C) En Harán","D) En Sodoma"]'::jsonb,
    '0', 'Respuesta: A) En Macpela, al oriente de Mamre. La heredad de Efrón que estaba en Macpela al oriente de Mamre (Génesis 23:17).', 8, true),

  (v_cap, '¿Quién era Efrón?', 'multiple',
    '["A) Un rey","B) Un heteo, hijo de Zohar","C) Un siervo de Abraham","D) El hermano de Sara"]'::jsonb,
    '1', 'Respuesta: B) Un heteo, hijo de Zohar. Efrón heteo... Efrón hijo de Zohar (Génesis 23:8,10).', 9, true),

  (v_cap, '¿Qué compró Abraham junto con la cueva?', 'multiple',
    '["A) Solo la cueva","B) El campo y todos los árboles en él","C) Una ciudad","D) Ganado"]'::jsonb,
    '1', 'Respuesta: B) El campo y todos los árboles en él. La heredad con la cueva... y todos los árboles que había en la heredad (Génesis 23:17).', 10, true);
END $$;