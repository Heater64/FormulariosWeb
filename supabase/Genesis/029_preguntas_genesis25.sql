-- ============================================================
-- Migración 029: Preguntas del sistema — Génesis 25 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 25 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 25;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Cuántos años vivió Abraham?', 'multiple',
    '["A) Ciento cincuenta años","B) Ciento setenta y cinco años","C) Doscientos años","D) Noventa y nueve años"]'::jsonb,
    '1', 'Respuesta: B) Ciento setenta y cinco años. Estos fueron los días que vivió Abraham: ciento setenta y cinco años (Génesis 25:7).', 1, true),

  (v_cap, '¿Quiénes sepultaron a Abraham?', 'multiple',
    '["A) Solo Isaac","B) Isaac e Ismael","C) Solo sus siervos","D) Nadie, fue solo"]'::jsonb,
    '1', 'Respuesta: B) Isaac e Ismael. Lo sepultaron Isaac e Ismael sus hijos en la cueva de Macpela (Génesis 25:9).', 2, true),

  (v_cap, '¿Quiénes lucharon dentro del vientre de Rebeca?', 'multiple',
    '["A) Isaac y otro","B) Jacob y Esaú","C) Dos hijas","D) No hubo lucha"]'::jsonb,
    '1', 'Respuesta: B) Jacob y Esaú. Los hijos luchaban dentro de ella (Génesis 25:22).', 3, true),

  (v_cap, '¿Quién nació primero, Jacob o Esaú?', 'multiple',
    '["A) Jacob","B) Esaú","C) Nacieron al mismo tiempo","D) No se especifica"]'::jsonb,
    '1', 'Respuesta: B) Esaú. Salió el primero rubio... y llamaron su nombre Esaú (Génesis 25:25).', 4, true),

  (v_cap, '¿Cómo era descrito Esaú al nacer?', 'multiple',
    '["A) Pálido y liso","B) Rubio y velludo como una pelliza","C) Moreno y delgado","D) Ciego"]'::jsonb,
    '1', 'Respuesta: B) Rubio y velludo como una pelliza. Salió el primero rubio, y era todo velludo como una pelliza (Génesis 25:25).', 5, true),

  (v_cap, '¿Qué agarraba Jacob al nacer?', 'multiple',
    '["A) Nada","B) El calcañar de Esaú","C) Una piedra","D) Un cordón"]'::jsonb,
    '1', 'Respuesta: B) El calcañar de Esaú. Salió su hermano, trabada su mano al calcañar de Esaú (Génesis 25:26).', 6, true),

  (v_cap, '¿Qué le vendió Esaú a Jacob por un guiso de lentejas?', 'multiple',
    '["A) Su casa","B) Su primogenitura","C) Su esposa","D) Su ganado"]'::jsonb,
    '1', 'Respuesta: B) Su primogenitura. Vendió a Jacob su primogenitura (Génesis 25:33).', 7, true),

  (v_cap, '¿A quién amaba más Isaac y por qué?', 'multiple',
    '["A) A Jacob, porque era tranquilo","B) A Esaú, porque comía de su caza","C) A ninguno","D) A ambos por igual"]'::jsonb,
    '1', 'Respuesta: B) A Esaú, porque comía de su caza. Amó Isaac a Esaú, porque comía de su caza (Génesis 25:28).', 8, true),

  (v_cap, '¿A quién amaba más Rebeca?', 'multiple',
    '["A) A Esaú","B) A Jacob","C) A ninguno","D) A ambos por igual"]'::jsonb,
    '1', 'Respuesta: B) A Jacob. Rebeca amaba a Jacob (Génesis 25:28).', 9, true),

  (v_cap, '¿Qué tipo de hombre era Jacob según el texto?', 'multiple',
    '["A) Diestro en la caza","B) Varón quieto que habitaba en tiendas","C) Guerrero","D) Pescador"]'::jsonb,
    '1', 'Respuesta: B) Varón quieto que habitaba en tiendas. Jacob era varón quieto, que habitaba en tiendas (Génesis 25:27).', 10, true);
END $$;