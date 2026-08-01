-- ============================================================
-- Migración 035: Preguntas del sistema — Génesis 31 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 31 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 31;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué decían los hijos de Labán sobre Jacob?', 'multiple',
    '["A) Que era pobre","B) Que había tomado toda la riqueza de su padre","C) Que era un buen hombre","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Que había tomado toda la riqueza de su padre. Jacob ha tomado todo lo que era de nuestro padre (Génesis 31:1).', 1, true),

  (v_cap, '¿Qué le mandó Dios a Jacob que hiciera?', 'multiple',
    '["A) Que se quedara con Labán","B) Que volviera a la tierra de sus padres","C) Que se fuera a Egipto","D) Que matara a Labán"]'::jsonb,
    '1', 'Respuesta: B) Que volviera a la tierra de sus padres. Vuélvete a la tierra de tus padres, y a tu parentela, y yo estaré contigo (Génesis 31:3).', 2, true),

  (v_cap, '¿Qué robó Raquel de su padre antes de partir?', 'multiple',
    '["A) Dinero","B) Los ídolos de su padre","C) Ganado","D) Ropa"]'::jsonb,
    '1', 'Respuesta: B) Los ídolos de su padre. Raquel hurtó los ídolos de su padre (Génesis 31:19).', 3, true),

  (v_cap, '¿Cómo escondió Raquel los ídolos cuando Labán los buscó?', 'multiple',
    '["A) Los enterró","B) Los puso en una albarda de camello y se sentó sobre ellos","C) Los tiró al río","D) Los quemó"]'::jsonb,
    '1', 'Respuesta: B) Los puso en una albarda de camello y se sentó sobre ellos. Tomó Raquel los ídolos y los puso en una albarda de un camello, y se sentó sobre ellos (Génesis 31:34).', 4, true),

  (v_cap, '¿Cuántos días de camino tardó Labán en alcanzar a Jacob?', 'multiple',
    '["A) Un día","B) Tres días","C) Siete días","D) Veinte días"]'::jsonb,
    '2', 'Respuesta: C) Siete días. Fue tras Jacob camino de siete días (Génesis 31:23).', 5, true),

  (v_cap, '¿Qué le advirtió Dios a Labán en sueños?', 'multiple',
    '["A) Que matara a Jacob","B) Que no hablara descomedidamente a Jacob","C) Que lo persiguiera más rápido","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Que no hablara descomedidamente a Jacob. Guárdate que no hables a Jacob descomedidamente (Génesis 31:24).', 6, true),

  (v_cap, '¿Cuántos años en total sirvió Jacob a Labán?', 'multiple',
    '["A) Diez","B) Catorce","C) Veinte","D) Treinta"]'::jsonb,
    '2', 'Respuesta: C) Veinte. Estos veinte años he estado contigo (Génesis 31:38).', 7, true),

  (v_cap, '¿Qué hicieron Jacob y Labán al reconciliarse?', 'multiple',
    '["A) Se pelearon de nuevo","B) Hicieron un pacto y levantaron un majano de piedras como testigo","C) Se ignoraron","D) Se fueron sin hablar"]'::jsonb,
    '1', 'Respuesta: B) Hicieron un pacto y levantaron un majano de piedras como testigo. Tomaron piedras e hicieron un majano... este majano es testigo hoy entre nosotros dos (Génesis 31:46,48).', 8, true),

  (v_cap, '¿Cómo llamó Jacob al majano de piedras?', 'multiple',
    '["A) Jegar Sahaduta","B) Galaad","C) Mizpa","D) Betel"]'::jsonb,
    '1', 'Respuesta: B) Galaad. Lo llamó Jacob, Galaad (Génesis 31:47).', 9, true),

  (v_cap, '¿Qué significa el nombre Mizpa que dieron al lugar?', 'multiple',
    '["A) Dios es grande","B) Atalaye Jehová entre tú y yo, cuando nos apartemos","C) Lugar de paz","D) Tierra prometida"]'::jsonb,
    '1', 'Respuesta: B) Atalaye Jehová entre tú y yo, cuando nos apartemos. Atalaye Jehová entre tú y yo, cuando nos apartemos el uno del otro (Génesis 31:49).', 10, true);
END $$;