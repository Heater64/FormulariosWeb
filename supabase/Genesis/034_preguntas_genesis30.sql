-- ============================================================
-- Migración 034: Preguntas del sistema — Génesis 30 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 30 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 30;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué sierva dio Raquel a Jacob para tener hijos?', 'multiple',
    '["A) Zilpa","B) Bilha","C) Débora","D) Dina"]'::jsonb,
    '1', 'Respuesta: B) Bilha. Le dio a Bilha su sierva por mujer (Génesis 30:4).', 1, true),

  (v_cap, '¿Qué sierva dio Lea a Jacob?', 'multiple',
    '["A) Bilha","B) Zilpa","C) Raquel","D) Ninguna"]'::jsonb,
    '1', 'Respuesta: B) Zilpa. Tomó a Zilpa su sierva, y la dio a Jacob por mujer (Génesis 30:9).', 2, true),

  (v_cap, '¿Qué intercambiaron Raquel y Lea por las mandrágoras?', 'multiple',
    '["A) Oro","B) Una noche con Jacob","C) Ganado","D) Ropa"]'::jsonb,
    '1', 'Respuesta: B) Una noche con Jacob. Pues dormirá contigo esta noche por las mandrágoras de tu hijo (Génesis 30:15).', 3, true),

  (v_cap, '¿Cuál fue el último hijo de Raquel mencionado en este capítulo?', 'multiple',
    '["A) Benjamín","B) José","C) Dan","D) Neftalí"]'::jsonb,
    '1', 'Respuesta: B) José. Llamó su nombre José, diciendo: Añádame Jehová otro hijo (Génesis 30:24).', 4, true),

  (v_cap, '¿Cómo se enriqueció Jacob con el ganado de Labán?', 'multiple',
    '["A) Robándolo directamente","B) Usando varas para que nacieran animales listados y manchados que serían suyos","C) Comprándolo","D) Por herencia"]'::jsonb,
    '1', 'Respuesta: B) Usando varas para que nacieran animales listados y manchados que serían suyos. Puso las varas... y parían borregos listados, pintados y salpicados (Génesis 30:37-39).', 5, true),

  (v_cap, '¿Qué pidió Jacob como salario a Labán?', 'multiple',
    '["A) Dinero","B) Las ovejas manchadas, salpicadas y de color oscuro","C) Tierras","D) Siervos"]'::jsonb,
    '1', 'Respuesta: B) Las ovejas manchadas, salpicadas y de color oscuro. Poniendo aparte todas las ovejas manchadas y salpicadas de color... esto será mi salario (Génesis 30:32).', 6, true),

  (v_cap, '¿Quién dio a luz a Dan y Neftalí?', 'multiple',
    '["A) Lea","B) Bilha, sierva de Raquel","C) Zilpa","D) Raquel misma"]'::jsonb,
    '1', 'Respuesta: B) Bilha, sierva de Raquel. Concibió Bilha, y dio a luz un hijo a Jacob (Génesis 30:5).', 7, true),

  (v_cap, '¿Quién dio a luz a Gad y Aser?', 'multiple',
    '["A) Bilha","B) Zilpa, sierva de Lea","C) Raquel","D) Lea misma"]'::jsonb,
    '1', 'Respuesta: B) Zilpa, sierva de Lea. Zilpa sierva de Lea dio a luz un hijo a Jacob (Génesis 30:10).', 8, true),

  (v_cap, '¿Qué hija tuvo Lea, mencionada por nombre en este capítulo?', 'multiple',
    '["A) Débora","B) Dina","C) Tamar","D) Rebeca"]'::jsonb,
    '1', 'Respuesta: B) Dina. Después dio a luz una hija, y llamó su nombre Dina (Génesis 30:21).', 9, true),

  (v_cap, '¿Qué significado dio Raquel al nombre de José?', 'multiple',
    '["A) Dios ha quitado mi afrenta, y añádame Jehová otro hijo","B) Dios me odia","C) El primero","D) El fuerte"]'::jsonb,
    '0', 'Respuesta: A) Dios ha quitado mi afrenta, y añádame Jehová otro hijo. Dios ha quitado mi afrenta... Añádame Jehová otro hijo (Génesis 30:23-24).', 10, true);
END $$;