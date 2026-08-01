-- ============================================================
-- Migración 032: Preguntas del sistema — Génesis 28 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 28 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 28;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿A dónde envió Isaac a Jacob para buscar esposa?', 'multiple',
    '["A) A Egipto","B) A Padan-aram, a casa de Labán","C) A Sodoma","D) A Gerar"]'::jsonb,
    '1', 'Respuesta: B) A Padan-aram, a casa de Labán. Levántate, ve a Padan-aram, a casa de Betuel... a las hijas de Labán (Génesis 28:2).', 1, true),

  (v_cap, '¿Qué vio Jacob en su sueño en Bet-el?', 'multiple',
    '["A) Un río de fuego","B) Una escalera que llegaba al cielo con ángeles subiendo y bajando","C) Un ángel guerrero","D) Nada, no soñó"]'::jsonb,
    '1', 'Respuesta: B) Una escalera que llegaba al cielo con ángeles subiendo y bajando. He aquí una escalera... y he aquí ángeles de Dios que subían y descendían por ella (Génesis 28:12).', 2, true),

  (v_cap, '¿Qué promesa le repitió Dios a Jacob en el sueño?', 'multiple',
    '["A) Que sería rey de Egipto","B) Que le daría la tierra y multiplicaría su descendencia como el polvo de la tierra","C) Que moriría joven","D) Que sería sacerdote"]'::jsonb,
    '1', 'Respuesta: B) Que le daría la tierra y multiplicaría su descendencia como el polvo de la tierra. Será tu descendencia como el polvo de la tierra (Génesis 28:14).', 3, true),

  (v_cap, '¿Qué hizo Jacob con la piedra que usó de almohada?', 'multiple',
    '["A) La dejó allí","B) La alzó como señal y derramó aceite sobre ella","C) La rompió","D) Se la llevó"]'::jsonb,
    '1', 'Respuesta: B) La alzó como señal y derramó aceite sobre ella. Tomó la piedra que había puesto de cabecera, y la alzó por señal, y derramó aceite encima de ella (Génesis 28:18).', 4, true),

  (v_cap, '¿Qué nombre le dio Jacob al lugar?', 'multiple',
    '["A) Beerseba","B) Bet-el","C) Peniel","D) Galaad"]'::jsonb,
    '1', 'Respuesta: B) Bet-el. Llamó el nombre de aquel lugar Bet-el (Génesis 28:19).', 5, true),

  (v_cap, '¿Qué voto hizo Jacob?', 'multiple',
    '["A) Ninguno","B) Que si Dios lo cuidaba, Jehová sería su Dios y daría el diezmo de todo","C) Casarse con Raquel","D) Nunca volver"]'::jsonb,
    '1', 'Respuesta: B) Que si Dios lo cuidaba, Jehová sería su Dios y daría el diezmo de todo. Si volviere en paz a casa de mi padre, Jehová será mi Dios... el diezmo apartaré para ti (Génesis 28:21-22).', 6, true),

  (v_cap, '¿Con quién se casó Esaú al ver que las cananeas disgustaban a su padre?', 'multiple',
    '["A) Con Rebeca","B) Con Mahalat, hija de Ismael","C) Con Raquel","D) Con Lea"]'::jsonb,
    '1', 'Respuesta: B) Con Mahalat, hija de Ismael. Tomó para sí por mujer a Mahalat, hija de Ismael (Génesis 28:9).', 7, true),

  (v_cap, '¿Qué exclamó Jacob al despertar?', 'multiple',
    '["A) Nada","B) Ciertamente Jehová está en este lugar, y yo no lo sabía","C) Tuvo miedo y huyó sin decir nada","D) Se rió"]'::jsonb,
    '1', 'Respuesta: B) Ciertamente Jehová está en este lugar, y yo no lo sabía. Ciertamente Jehová está en este lugar, y yo no lo sabía (Génesis 28:16).', 8, true),

  (v_cap, '¿Cómo llamó Jacob a aquel lugar en relación al cielo?', 'multiple',
    '["A) Puerta del infierno","B) Casa de Dios y puerta del cielo","C) Un lugar maldito","D) Nada especial"]'::jsonb,
    '1', 'Respuesta: B) Casa de Dios y puerta del cielo. No es otra cosa que casa de Dios, y puerta del cielo (Génesis 28:17).', 9, true),

  (v_cap, '¿Qué nombre tenía la ciudad antes de llamarse Bet-el?', 'multiple',
    '["A) Harán","B) Luz","C) Siquem","D) Peniel"]'::jsonb,
    '1', 'Respuesta: B) Luz. Llamó el nombre de aquel lugar Bet-el, aunque Luz era el nombre de la ciudad primero (Génesis 28:19).', 10, true);
END $$;