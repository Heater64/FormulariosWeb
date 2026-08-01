-- ============================================================
-- Migración 024: Preguntas del sistema — Génesis 20 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 20 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 20;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué dijo Abraham sobre Sara ante Abimelec, rey de Gerar?', 'multiple',
    '["A) Que era su esposa","B) Que era su hermana","C) Que era su sierva","D) No dijo nada"]'::jsonb,
    '1', 'Respuesta: B) Que era su hermana. Dijo Abraham de Sara su mujer: Es mi hermana (Génesis 20:2).', 1, true),

  (v_cap, '¿Cómo advirtió Dios a Abimelec sobre Sara?', 'multiple',
    '["A) Con una plaga inmediata","B) En sueños de noche","C) Con un ángel visible","D) Con un profeta"]'::jsonb,
    '1', 'Respuesta: B) En sueños de noche. Dios vino a Abimelec en sueños de noche (Génesis 20:3).', 2, true),

  (v_cap, '¿Por qué Dios no permitió que Abimelec tocara a Sara?', 'multiple',
    '["A) Por casualidad","B) Porque Dios lo detuvo de pecar contra él","C) Porque Abimelec se negó","D) Porque Sara huyó"]'::jsonb,
    '1', 'Respuesta: B) Porque Dios lo detuvo de pecar contra él. Yo también te detuve de pecar contra mí (Génesis 20:6).', 3, true),

  (v_cap, '¿Qué le pidió Dios a Abimelec que hiciera para vivir?', 'multiple',
    '["A) Que se fuera de la tierra","B) Que devolviera la mujer a su marido","C) Que se casara con Sara","D) Que diera un sacrificio"]'::jsonb,
    '1', 'Respuesta: B) Que devolviera la mujer a su marido. Devuelve la mujer a su marido; porque es profeta, y orará por ti, y vivirás (Génesis 20:7).', 4, true),

  (v_cap, '¿Qué le dio Abimelec a Abraham tras el incidente?', 'multiple',
    '["A) Nada","B) Ovejas, vacas, siervos y siervas","C) Solo dinero","D) Una ciudad"]'::jsonb,
    '1', 'Respuesta: B) Ovejas, vacas, siervos y siervas. Abimelec tomó ovejas y vacas, y siervos y siervas, y se los dio a Abraham (Génesis 20:14).', 5, true),

  (v_cap, '¿Qué era Sara realmente en relación a Abraham, según él mismo explicó?', 'multiple',
    '["A) No tenían relación","B) Su hermana de padre, no de madre","C) Su prima","D) Su cuñada"]'::jsonb,
    '1', 'Respuesta: B) Su hermana de padre, no de madre. También es mi hermana, hija de mi padre, mas no hija de mi madre (Génesis 20:12).', 6, true),

  (v_cap, '¿Qué hizo Abraham por Abimelec y su casa al final?', 'multiple',
    '["A) Los maldijo","B) Oró a Dios y Dios los sanó","C) Los ignoró","D) Se fue sin decir nada"]'::jsonb,
    '1', 'Respuesta: B) Oró a Dios y Dios los sanó. Abraham oró a Dios; y Dios sanó a Abimelec y a su mujer (Génesis 20:17).', 7, true),

  (v_cap, '¿Qué había hecho Jehová a la casa de Abimelec antes de que Abraham orara?', 'multiple',
    '["A) Los había bendecido con hijos","B) Había cerrado toda matriz de la casa de Abimelec","C) Los había hecho ricos","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Había cerrado toda matriz de la casa de Abimelec. Jehová había cerrado completamente toda matriz de la casa de Abimelec (Génesis 20:18).', 8, true),

  (v_cap, '¿Qué le dio Abimelec a Sara como velo para los ojos?', 'multiple',
    '["A) Oro","B) Mil monedas de plata","C) Un vestido","D) Una casa"]'::jsonb,
    '1', 'Respuesta: B) Mil monedas de plata. He aquí he dado mil monedas de plata a tu hermano (Génesis 20:16).', 9, true),

  (v_cap, '¿Dónde habitaba Abraham cuando ocurrió este episodio?', 'multiple',
    '["A) En Egipto","B) Como forastero en Gerar","C) En Sodoma","D) En Ur"]'::jsonb,
    '1', 'Respuesta: B) Como forastero en Gerar. Habitó como forastero en Gerar (Génesis 20:1).', 10, true);
END $$;