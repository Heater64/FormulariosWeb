-- ============================================================
-- Migración 022: Preguntas del sistema — Génesis 18 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 18 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 18;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Cuántos varones se le aparecieron a Abraham en el encinar de Mamre?', 'multiple',
    '["A) Uno","B) Dos","C) Tres","D) Cuatro"]'::jsonb,
    '2', 'Respuesta: C) Tres. He aquí tres varones que estaban junto a él (Génesis 18:2).', 1, true),

  (v_cap, '¿Qué preparó Abraham para sus visitantes?', 'multiple',
    '["A) Solo agua","B) Pan, un becerro, mantequilla y leche","C) Nada, los ignoró","D) Solo vino"]'::jsonb,
    '1', 'Respuesta: B) Pan, un becerro, mantequilla y leche. Tomó también mantequilla y leche, y el becerro que había preparado (Génesis 18:8).', 2, true),

  (v_cap, '¿Qué le prometieron a Abraham sobre Sara?', 'multiple',
    '["A) Que moriría pronto","B) Que tendría un hijo según el tiempo de la vida","C) Que sería estéril para siempre","D) Que se iría de la tierra"]'::jsonb,
    '1', 'Respuesta: B) Que tendría un hijo según el tiempo de la vida. Según el tiempo de la vida, he aquí que Sara tu mujer tendrá un hijo (Génesis 18:10).', 3, true),

  (v_cap, '¿Qué hizo Sara al escuchar la promesa de un hijo?', 'multiple',
    '["A) Lloró","B) Se rió","C) Se enojó","D) No dijo nada"]'::jsonb,
    '1', 'Respuesta: B) Se rió. Se rió, pues, Sara entre sí (Génesis 18:12).', 4, true),

  (v_cap, '¿Qué pregunta retórica hizo Jehová sobre la duda de Sara?', 'multiple',
    '["A) ¿Por qué te ríes?","B) ¿Hay para Dios alguna cosa difícil?","C) ¿Quién eres tú?","D) ¿Dónde está tu esposo?"]'::jsonb,
    '1', 'Respuesta: B) ¿Hay para Dios alguna cosa difícil?. ¿Hay para Dios alguna cosa difícil? (Génesis 18:14).', 5, true),

  (v_cap, '¿Por qué quiso Dios revelarle a Abraham lo que iba a hacer con Sodoma?', 'multiple',
    '["A) Porque Lot vivía allí solamente","B) Porque Abraham sería una nación grande y bendeciría a todas las naciones","C) Por casualidad","D) Porque Abraham lo exigió"]'::jsonb,
    '1', 'Respuesta: B) Porque Abraham sería una nación grande y bendeciría a todas las naciones. Habiendo de ser Abraham una nación grande y fuerte, y habiendo de ser benditas en él todas las naciones (Génesis 18:18).', 6, true),

  (v_cap, '¿Con cuántos justos comenzó Abraham a negociar por Sodoma?', 'multiple',
    '["A) Diez","B) Veinte","C) Cincuenta","D) Cien"]'::jsonb,
    '2', 'Respuesta: C) Cincuenta. Quizá haya cincuenta justos dentro de la ciudad (Génesis 18:24).', 7, true),

  (v_cap, '¿En cuántos justos terminó la negociación de Abraham con Dios?', 'multiple',
    '["A) Cinco","B) Diez","C) Veinte","D) Treinta"]'::jsonb,
    '1', 'Respuesta: B) Diez. No la destruiré, respondió, por amor a los diez (Génesis 18:32).', 8, true),

  (v_cap, '¿Qué actitud mostró Abraham al negociar con Dios?', 'multiple',
    '["A) Exigencia","B) Humildad, reconociéndose polvo y ceniza","C) Indiferencia","D) Ira"]'::jsonb,
    '1', 'Respuesta: B) Humildad, reconociéndose polvo y ceniza. He comenzado a hablar a mi Señor, aunque soy polvo y ceniza (Génesis 18:27).', 9, true),

  (v_cap, '¿Qué había aumentado en Sodoma y Gomorra según Jehová?', 'multiple',
    '["A) La pobreza","B) El clamor y el pecado se había agravado en extremo","C) Solo la idolatría","D) La guerra"]'::jsonb,
    '1', 'Respuesta: B) El clamor y el pecado se había agravado en extremo. El clamor contra Sodoma y Gomorra se aumenta más y más, y el pecado de ellos se ha agravado en extremo (Génesis 18:20).', 10, true);
END $$;