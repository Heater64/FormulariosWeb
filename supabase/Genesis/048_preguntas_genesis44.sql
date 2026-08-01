-- ============================================================
-- Migración 048: Preguntas del sistema — Génesis 44 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 44 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 44;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué escondió José en el saco de Benjamín?', 'multiple',
    '["A) Oro","B) Su copa de plata","C) Una carta","D) Comida extra"]'::jsonb,
    '1', 'Respuesta: B) Su copa de plata. Pondrás mi copa, la copa de plata, en la boca del costal del menor (Génesis 44:2).', 1, true),

  (v_cap, '¿De qué acusó el mayordomo de José a los hermanos?', 'multiple',
    '["A) De espionaje","B) De robar la copa de plata","C) De mentir sobre su padre","D) De huir sin pagar"]'::jsonb,
    '1', 'Respuesta: B) De robar la copa de plata. ¿Por qué habéis robado mi copa de plata? (Génesis 44:4-5).', 2, true),

  (v_cap, '¿En el saco de quién se halló la copa?', 'multiple',
    '["A) De Rubén","B) De Benjamín","C) De Judá","D) De Simeón"]'::jsonb,
    '1', 'Respuesta: B) De Benjamín. La copa fue hallada en el costal de Benjamín (Génesis 44:12).', 3, true),

  (v_cap, '¿Qué se ofreció Judá a hacer en lugar de Benjamín?', 'multiple',
    '["A) Nada, dejó que se lo llevaran","B) Ser siervo de José en su lugar","C) Pagar una multa","D) Pelear por él"]'::jsonb,
    '1', 'Respuesta: B) Ser siervo de José en su lugar. Te ruego, por tanto, que quede ahora tu siervo en lugar del joven por siervo de mi señor (Génesis 44:33).', 4, true),

  (v_cap, '¿Por qué le preocupaba tanto a Judá que Benjamín no regresara?', 'multiple',
    '["A) Por dinero","B) Porque la vida de su padre Jacob estaba ligada a la vida del joven","C) Por vergüenza","D) Por una promesa sin importancia"]'::jsonb,
    '1', 'Respuesta: B) Porque la vida de su padre Jacob estaba ligada a la vida del joven. Como su vida está ligada a la vida de él... morirá (Génesis 44:30-31).', 5, true),

  (v_cap, '¿Qué había prometido Judá a su padre sobre Benjamín?', 'multiple',
    '["A) Nada en especial","B) Ser fiador de él, aceptando la culpa para siempre si no lo devolvía","C) Que se casaría con él","D) Que lo abandonaría"]'::jsonb,
    '1', 'Respuesta: B) Ser fiador de él, aceptando la culpa para siempre si no lo devolvía. Si no te lo vuelvo a traer, entonces yo seré culpable ante mi padre para siempre (Génesis 44:32).', 6, true),

  (v_cap, '¿Cómo reaccionaron los hermanos cuando encontraron la copa?', 'multiple',
    '["A) Con indiferencia","B) Rasgaron sus vestidos","C) Se alegraron","D) Huyeron de inmediato"]'::jsonb,
    '1', 'Respuesta: B) Rasgaron sus vestidos. Ellos rasgaron sus vestidos (Génesis 44:13).', 7, true),

  (v_cap, '¿Qué dijo José que hacía con la copa hallada?', 'multiple',
    '["A) Nada especial","B) Que solía adivinar con ella","C) La usaba para comer","D) La guardaba como recuerdo"]'::jsonb,
    '1', 'Respuesta: B) Que solía adivinar con ella. ¿No es ésta en la que bebe mi señor, y por la que suele adivinar? (Génesis 44:5).', 8, true),

  (v_cap, '¿Qué propusieron los hermanos como castigo justo al principio?', 'multiple',
    '["A) Pagar el doble","B) Que muriera aquel en quien se hallara la copa, y los demás serían siervos","C) Nada, negaron todo","D) Huir"]'::jsonb,
    '1', 'Respuesta: B) Que muriera aquel en quien se hallara la copa, y los demás serían siervos. Aquel de tus siervos en quien fuere hallada la copa, que muera (Génesis 44:9).', 9, true),

  (v_cap, '¿Qué le mencionó Judá a José sobre otro hermano que no parece?', 'multiple',
    '["A) Que estaba vivo en otro lugar","B) Que pensaban que había sido despedazado","C) Que se había ido lejos","D) Que era el favorito"]'::jsonb,
    '1', 'Respuesta: B) Que pensaban que había sido despedazado. El uno salió de mi presencia, y pienso de cierto que fue despedazado (Génesis 44:28).', 10, true);
END $$;