-- ============================================================
-- Migración 031: Preguntas del sistema — Génesis 27 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 27 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 27;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué le pidió Isaac a Esaú antes de bendecirlo?', 'multiple',
    '["A) Que orara","B) Que cazara y preparara un guisado","C) Que se casara","D) Que construyera un altar"]'::jsonb,
    '1', 'Respuesta: B) Que cazara y preparara un guisado. Tráeme caza; y hazme un guisado como a mí me gusta (Génesis 27:3-4).', 1, true),

  (v_cap, '¿Quién ideó el plan para que Jacob recibiera la bendición en su lugar?', 'multiple',
    '["A) Jacob mismo","B) Rebeca","C) Isaac","D) Un siervo"]'::jsonb,
    '1', 'Respuesta: B) Rebeca. Rebeca habló a Jacob su hijo... Ahora, pues, hijo mío, obedece a mi voz (Génesis 27:6-8).', 2, true),

  (v_cap, '¿Cómo disfrazó Rebeca a Jacob para parecerse a Esaú?', 'multiple',
    '["A) Con maquillaje","B) Con pieles de cabritos en manos y cuello","C) Con ropa nueva únicamente","D) No lo disfrazó"]'::jsonb,
    '1', 'Respuesta: B) Con pieles de cabritos en manos y cuello. Cubrió sus manos y la parte de su cuello... con las pieles de los cabritos (Génesis 27:16).', 3, true),

  (v_cap, '¿Cómo confirmó Isaac, dudando, la identidad de su hijo?', 'multiple',
    '["A) Por la voz","B) Por el tacto, aunque la voz era de Jacob","C) Por el olfato únicamente","D) No dudó"]'::jsonb,
    '1', 'Respuesta: B) Por el tacto, aunque la voz era de Jacob. La voz es la voz de Jacob, pero las manos, las manos de Esaú (Génesis 27:22).', 4, true),

  (v_cap, '¿Qué bendición recibió Jacob de su padre?', 'multiple',
    '["A) Pobreza","B) Abundancia de trigo y mosto, señorío sobre sus hermanos","C) Una maldición","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Abundancia de trigo y mosto, señorío sobre sus hermanos. Dios, pues, te dé del rocío del cielo... abundancia de trigo y de mosto (Génesis 27:28).', 5, true),

  (v_cap, '¿Cómo reaccionó Esaú al descubrir el engaño?', 'multiple',
    '["A) Con indiferencia","B) Con un clamor grande y amargo","C) Con alegría","D) No se enteró"]'::jsonb,
    '1', 'Respuesta: B) Con un clamor grande y amargo. Clamó con una muy grande y muy amarga exclamación (Génesis 27:34).', 6, true),

  (v_cap, '¿Qué bendición quedó para Esaú?', 'multiple',
    '["A) La misma que Jacob","B) Vivir de su espada y servir a su hermano, hasta liberarse","C) Ninguna","D) Ser el más rico"]'::jsonb,
    '1', 'Respuesta: B) Vivir de su espada y servir a su hermano, hasta liberarse. Por tu espada vivirás, y a tu hermano servirás (Génesis 27:40).', 7, true),

  (v_cap, '¿Qué planeó Esaú hacer contra Jacob?', 'multiple',
    '["A) Perdonarlo","B) Matarlo después de la muerte de su padre","C) Ignorarlo","D) Bendecirlo también"]'::jsonb,
    '1', 'Respuesta: B) Matarlo después de la muerte de su padre. Llegarán los días del luto de mi padre, y yo mataré a mi hermano Jacob (Génesis 27:41).', 8, true),

  (v_cap, '¿Qué hizo Rebeca al enterarse del plan de Esaú?', 'multiple',
    '["A) Nada","B) Envió a Jacob a huir a casa de Labán en Harán","C) Se lo dijo a Isaac para castigar a Esaú","D) Se fue ella misma"]'::jsonb,
    '1', 'Respuesta: B) Envió a Jacob a huir a casa de Labán en Harán. Levántate y huye a casa de Labán mi hermano en Harán (Génesis 27:43).', 9, true),

  (v_cap, '¿Qué excusa dio Rebeca a Isaac para enviar a Jacob lejos?', 'multiple',
    '["A) Que necesitaba comerciar","B) Que no quería que Jacob se casara con una hija de Het como Esaú","C) Que estaba enfermo","D) Ninguna excusa"]'::jsonb,
    '1', 'Respuesta: B) Que no quería que Jacob se casara con una hija de Het como Esaú. Si Jacob toma mujer de las hijas de Het... ¿para qué quiero la vida? (Génesis 27:46).', 10, true);
END $$;