-- ============================================================
-- Migración 051: Preguntas del sistema — Génesis 47 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 47 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 47;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué le pidió José a Faraón para su familia?', 'multiple',
    '["A) Riquezas inmediatas","B) Que habitaran en la tierra de Gosén","C) Un ejército","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Que habitaran en la tierra de Gosén. Permitas que habiten tus siervos en la tierra de Gosén (Génesis 47:4).', 1, true),

  (v_cap, '¿Qué le preguntó Faraón a Jacob?', 'multiple',
    '["A) Su oficio","B) Cuántos eran los años de su vida","C) Su religión","D) Su riqueza"]'::jsonb,
    '1', 'Respuesta: B) Cuántos eran los años de su vida. ¿Cuántos son los días de los años de tu vida? (Génesis 47:8).', 2, true),

  (v_cap, '¿Cuántos años dijo Jacob que habían sido los de su peregrinación?', 'multiple',
    '["A) Cien años","B) Ciento treinta años","C) Ciento cincuenta años","D) Doscientos años"]'::jsonb,
    '1', 'Respuesta: B) Ciento treinta años. Los días de los años de mi peregrinación son ciento treinta años (Génesis 47:9).', 3, true),

  (v_cap, '¿Qué hizo José con el dinero de los egipcios durante el hambre?', 'multiple',
    '["A) Lo repartió","B) Lo recogió y lo metió en casa de Faraón","C) Lo quemó","D) Lo escondió para sí mismo"]'::jsonb,
    '1', 'Respuesta: B) Lo recogió y lo metió en casa de Faraón. Metió José el dinero en casa de Faraón (Génesis 47:14).', 4, true),

  (v_cap, '¿Qué dieron los egipcios a José cuando se les acabó el dinero?', 'multiple',
    '["A) Sus casas","B) Su ganado","C) Sus hijos","D) Nada más"]'::jsonb,
    '1', 'Respuesta: B) Su ganado. Dad vuestros ganados y yo os daré por vuestros ganados (Génesis 47:16).', 5, true),

  (v_cap, '¿Qué terminaron vendiendo los egipcios a Faraón por alimento, al final?', 'multiple',
    '["A) Solo el ganado","B) Sus tierras y a sí mismos como siervos","C) Sus joyas","D) Nada más"]'::jsonb,
    '1', 'Respuesta: B) Sus tierras y a sí mismos como siervos. Compró José toda la tierra de Egipto para Faraón... seremos nosotros y nuestra tierra siervos de Faraón (Génesis 47:19-20).', 6, true),

  (v_cap, '¿Qué tierra no compró José?', 'multiple',
    '["A) La de los pobres","B) La de los sacerdotes, porque tenían ración de Faraón","C) La de Gosén","D) Ninguna excepción"]'::jsonb,
    '1', 'Respuesta: B) La de los sacerdotes, porque tenían ración de Faraón. Solamente la tierra de los sacerdotes no compró (Génesis 47:22).', 7, true),

  (v_cap, '¿Qué porcentaje de la cosecha estableció José como ley para Faraón?', 'multiple',
    '["A) Un diezmo (10%)","B) Un quinto (20%)","C) La mitad","D) Todo"]'::jsonb,
    '1', 'Respuesta: B) Un quinto (20%). De los frutos daréis el quinto a Faraón (Génesis 47:24).', 8, true),

  (v_cap, '¿Cuántos años vivió Jacob en Egipto?', 'multiple',
    '["A) Diez años","B) Diecisiete años","C) Veinte años","D) Cincuenta años"]'::jsonb,
    '1', 'Respuesta: B) Diecisiete años. Vivió Jacob en la tierra de Egipto diecisiete años (Génesis 47:28).', 9, true),

  (v_cap, '¿Qué le pidió Jacob a José antes de morir?', 'multiple',
    '["A) Que se quedara en Egipto","B) Que no lo enterrara en Egipto sino con sus padres","C) Que repartiera su herencia","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Que no lo enterrara en Egipto sino con sus padres. Te ruego que no me entierres en Egipto (Génesis 47:29).', 10, true);
END $$;