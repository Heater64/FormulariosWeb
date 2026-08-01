-- ============================================================
-- Migración 006: Preguntas del sistema — Génesis 2 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 2 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 2;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿De qué formó Jehová Dios al hombre?', 'multiple',
    '["A) Agua","B) Polvo de la tierra","C) Barro cocido","D) Aire"]'::jsonb,
    '1', 'Respuesta: B) Polvo de la tierra. Jehová Dios formó al hombre del polvo de la tierra (Génesis 2:7).', 1, true),

  (v_cap, '¿Qué sopló Jehová Dios en la nariz del hombre?', 'multiple',
    '["A) Fuego","B) Aliento de vida","C) Viento","D) Espíritu de sabiduría"]'::jsonb,
    '1', 'Respuesta: B) Aliento de vida. Sopló en su nariz aliento de vida, y fue el hombre un ser viviente (Génesis 2:7).', 2, true),

  (v_cap, '¿Dónde plantó Dios un huerto?', 'multiple',
    '["A) En Harán","B) En Edén, al oriente","C) En Canaán","D) En Egipto"]'::jsonb,
    '1', 'Respuesta: B) En Edén, al oriente. Jehová Dios plantó un huerto en Edén, al oriente (Génesis 2:8).', 3, true),

  (v_cap, '¿Cuántos ríos salían de Edén para regar el huerto?', 'multiple',
    '["A) Dos","B) Tres","C) Cuatro","D) Cinco"]'::jsonb,
    '2', 'Respuesta: C) Cuatro. De Edén salía un río que se repartía en cuatro brazos (Génesis 2:10).', 4, true),

  (v_cap, '¿Qué árboles había especialmente en medio del huerto?', 'multiple',
    '["A) El árbol de la vida y el árbol de la ciencia del bien y del mal","B) El árbol de higos","C) El árbol de olivo","D) El árbol de granado"]'::jsonb,
    '0', 'Respuesta: A) El árbol de la vida y el árbol de la ciencia del bien y del mal. También el árbol de vida en medio del huerto, y el árbol de la ciencia del bien y del mal (Génesis 2:9).', 5, true),

  (v_cap, '¿Qué advirtió Dios que pasaría si el hombre comía del árbol de la ciencia del bien y del mal?', 'multiple',
    '["A) Se haría sabio","B) Ciertamente moriría","C) Se haría rico","D) Nada en especial"]'::jsonb,
    '1', 'Respuesta: B) Ciertamente moriría. El día que de él comieres, ciertamente morirás (Génesis 2:17).', 6, true),

  (v_cap, '¿Por qué formó Dios a la mujer?', 'multiple',
    '["A) Porque el hombre se lo pidió","B) No es bueno que el hombre esté solo","C) Para que labrara la tierra","D) Por accidente"]'::jsonb,
    '1', 'Respuesta: B) No es bueno que el hombre esté solo. Dijo Jehová Dios: No es bueno que el hombre esté solo; le haré ayuda idónea (Génesis 2:18).', 7, true),

  (v_cap, '¿De qué formó Dios a la mujer?', 'multiple',
    '["A) De polvo","B) De una costilla del hombre","C) De barro","D) De una semilla"]'::jsonb,
    '1', 'Respuesta: B) De una costilla del hombre. De la costilla que Jehová Dios tomó del hombre, hizo una mujer (Génesis 2:21-22).', 8, true),

  (v_cap, '¿Qué nombre le dio Adán a la mujer en este capítulo, señalando que fue tomada del varón?', 'multiple',
    '["A) Eva","B) Varona","C) Sara","D) Débora"]'::jsonb,
    '1', 'Respuesta: B) Varona. Será llamada Varona, porque del varón fue tomada (Génesis 2:23).', 9, true),

  (v_cap, '¿Cómo describe el capítulo el estado de Adán y su mujer al final?', 'multiple',
    '["A) Vestidos con pieles","B) Desnudos y no se avergonzaban","C) Cubiertos de hojas","D) Escondidos"]'::jsonb,
    '1', 'Respuesta: B) Desnudos y no se avergonzaban. Estaban ambos desnudos, Adán y su mujer, y no se avergonzaban (Génesis 2:25).', 10, true);
END $$;