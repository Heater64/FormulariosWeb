-- ============================================================
-- Migración 037: Preguntas del sistema — Génesis 33 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 33 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 33;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Cómo reaccionó Esaú al ver a Jacob?', 'multiple',
    '["A) Con ira","B) Corrió a abrazarlo, lo besó y lloraron","C) Lo ignoró","D) Peleó con él"]'::jsonb,
    '1', 'Respuesta: B) Corrió a abrazarlo, lo besó y lloraron. Esaú corrió a su encuentro y le abrazó, y se echó sobre su cuello, y le besó; y lloraron (Génesis 33:4).', 1, true),

  (v_cap, '¿Cómo organizó Jacob a su familia al acercarse a Esaú?', 'multiple',
    '["A) Al azar","B) Las siervas y sus niños primero, luego Lea, y al final Raquel y José","C) Todos juntos","D) Escondió a todos"]'::jsonb,
    '1', 'Respuesta: B) Las siervas y sus niños primero, luego Lea, y al final Raquel y José. Puso las siervas y sus niños delante, luego a Lea... y a Raquel y a José los últimos (Génesis 33:2).', 2, true),

  (v_cap, '¿Cuántas veces se inclinó Jacob ante Esaú?', 'multiple',
    '["A) Una","B) Tres","C) Siete","D) Doce"]'::jsonb,
    '2', 'Respuesta: C) Siete. Se inclinó a tierra siete veces (Génesis 33:3).', 3, true),

  (v_cap, '¿Aceptó Esaú el presente de Jacob?', 'multiple',
    '["A) No, lo rechazó","B) Sí, después de que Jacob insistiera","C) Se enojó por ello","D) No se menciona"]'::jsonb,
    '1', 'Respuesta: B) Sí, después de que Jacob insistiera. E insistió con él, y Esaú lo tomó (Génesis 33:11).', 4, true),

  (v_cap, '¿A dónde se fue Esaú después del encuentro?', 'multiple',
    '["A) Con Jacob","B) De vuelta a Seir","C) A Egipto","D) Se quedó con Jacob"]'::jsonb,
    '1', 'Respuesta: B) De vuelta a Seir. Volvió Esaú aquel día por su camino a Seir (Génesis 33:16).', 5, true),

  (v_cap, '¿Dónde se estableció Jacob después, edificando una casa?', 'multiple',
    '["A) En Seir","B) En Sucot","C) En Egipto","D) En Harán"]'::jsonb,
    '1', 'Respuesta: B) En Sucot. Jacob fue a Sucot, y edificó allí casa para sí (Génesis 33:17).', 6, true),

  (v_cap, '¿A qué ciudad llegó Jacob sano y salvo?', 'multiple',
    '["A) Harán","B) Siquem","C) Beerseba","D) Hebrón"]'::jsonb,
    '1', 'Respuesta: B) Siquem. Jacob llegó sano y salvo a la ciudad de Siquem (Génesis 33:18).', 7, true),

  (v_cap, '¿Qué compró Jacob en Siquem?', 'multiple',
    '["A) Una casa","B) Una parte del campo, por cien monedas","C) Un pozo","D) Ganado"]'::jsonb,
    '1', 'Respuesta: B) Una parte del campo, por cien monedas. Compró una parte del campo... por cien monedas (Génesis 33:19).', 8, true),

  (v_cap, '¿Cómo llamó Jacob al altar que erigió en Siquem?', 'multiple',
    '["A) Betel","B) El-Elohe-Israel","C) Jehová-jireh","D) Peniel"]'::jsonb,
    '1', 'Respuesta: B) El-Elohe-Israel. Erigió allí un altar, y lo llamó El-Elohe-Israel (Génesis 33:20).', 9, true),

  (v_cap, '¿Qué excusa dio Jacob para no viajar al mismo ritmo que Esaú?', 'multiple',
    '["A) Estaba cansado","B) Los niños eran tiernos y el ganado se fatigaría","C) No quería ir con él","D) Se perdió el camino"]'::jsonb,
    '1', 'Respuesta: B) Los niños eran tiernos y el ganado se fatigaría. Mi señor sabe que los niños son tiernos... si las fatigan, en un día morirán todas las ovejas (Génesis 33:13).', 10, true);
END $$;