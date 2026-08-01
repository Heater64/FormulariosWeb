-- ============================================================
-- Migración 050: Preguntas del sistema — Génesis 46 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 46 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 46;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Dónde ofreció Jacob sacrificios antes de partir a Egipto?', 'multiple',
    '["A) En Bet-el","B) En Beerseba","C) En Hebrón","D) En Siquem"]'::jsonb,
    '1', 'Respuesta: B) En Beerseba. Vino a Beerseba, y ofreció sacrificios al Dios de su padre Isaac (Génesis 46:1).', 1, true),

  (v_cap, '¿Qué le prometió Dios a Jacob en una visión antes de bajar a Egipto?', 'multiple',
    '["A) Que nunca volvería","B) Que haría de él una gran nación allí y lo haría volver","C) Que moriría en el camino","D) Que perdería a sus hijos"]'::jsonb,
    '1', 'Respuesta: B) Que haría de él una gran nación allí y lo haría volver. No temas de descender a Egipto, porque allí yo haré de ti una gran nación (Génesis 46:3).', 2, true),

  (v_cap, '¿Cuántas personas de la casa de Jacob entraron en total a Egipto?', 'multiple',
    '["A) Cincuenta","B) Sesenta y seis","C) Setenta","D) Cien"]'::jsonb,
    '2', 'Respuesta: C) Setenta. Todas las personas de la casa de Jacob, que entraron en Egipto, fueron setenta (Génesis 46:27).', 3, true),

  (v_cap, '¿A quién envió Jacob delante de sí para encontrarse con José?', 'multiple',
    '["A) A Rubén","B) A Judá","C) A Benjamín","D) A Simeón"]'::jsonb,
    '1', 'Respuesta: B) A Judá. Envió Jacob a Judá delante de sí a José (Génesis 46:28).', 4, true),

  (v_cap, '¿Cómo reaccionó José al ver a su padre?', 'multiple',
    '["A) Con frialdad","B) Se echó sobre su cuello y lloró largamente","C) No lo reconoció","D) Se enojó"]'::jsonb,
    '1', 'Respuesta: B) Se echó sobre su cuello y lloró largamente. Se echó sobre su cuello, y lloró sobre su cuello largamente (Génesis 46:29).', 5, true),

  (v_cap, '¿Qué dijo Israel (Jacob) al ver a José?', 'multiple',
    '["A) Nada","B) Muera yo ahora, ya que he visto tu rostro, y sé que aún vives","C) Lo regañó","D) Le pidió perdón"]'::jsonb,
    '1', 'Respuesta: B) Muera yo ahora, ya que he visto tu rostro, y sé que aún vives. Muera yo ahora, ya que he visto tu rostro, y sé que aún vives (Génesis 46:30).', 6, true),

  (v_cap, '¿En qué región se estableció la familia de Jacob?', 'multiple',
    '["A) En el centro de Egipto","B) En Gosén","C) En el desierto","D) En Canaán, no en Egipto"]'::jsonb,
    '1', 'Respuesta: B) En Gosén. Habitarás en la tierra de Gosén (Génesis 46:28-29, cf. 45:10).', 7, true),

  (v_cap, '¿Cuál era el oficio de la familia de Jacob según José indicó que dijeran a Faraón?', 'multiple',
    '["A) Comerciantes","B) Pastores de ovejas, ganaderos","C) Agricultores","D) Guerreros"]'::jsonb,
    '1', 'Respuesta: B) Pastores de ovejas, ganaderos. Los hombres son pastores de ovejas, porque son hombres ganaderos (Génesis 46:32).', 8, true),

  (v_cap, '¿Por qué era importante que dijeran que eran pastores?', 'multiple',
    '["A) Para impresionar a Faraón","B) Para habitar en Gosén, ya que para los egipcios el pastoreo era abominación","C) Para ser esclavos","D) Sin razón particular"]'::jsonb,
    '1', 'Respuesta: B) Para habitar en Gosén, ya que para los egipcios el pastoreo era abominación. Para los egipcios es abominación todo pastor de ovejas (Génesis 46:34).', 9, true),

  (v_cap, '¿Cuántos hijos tuvo José en Egipto antes de que llegara su familia?', 'multiple',
    '["A) Uno","B) Dos: Manasés y Efraín","C) Tres","D) Ninguno"]'::jsonb,
    '1', 'Respuesta: B) Dos: Manasés y Efraín. Nacieron a José en la tierra de Egipto Manasés y Efraín (Génesis 46:20).', 10, true);
END $$;