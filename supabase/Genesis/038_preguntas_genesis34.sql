-- ============================================================
-- Migración 038: Preguntas del sistema — Génesis 34 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 34 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 34;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Quién era Dina?', 'multiple',
    '["A) La esposa de Jacob","B) La hija de Lea y Jacob","C) La hija de Esaú","D) Una sierva"]'::jsonb,
    '1', 'Respuesta: B) La hija de Lea y Jacob. Salió Dina la hija de Lea, la cual ésta había dado a luz a Jacob (Génesis 34:1).', 1, true),

  (v_cap, '¿Qué le hizo Siquem a Dina?', 'multiple',
    '["A) La cortejó respetuosamente primero","B) La tomó y la deshonró","C) La ignoró","D) La casó de inmediato con permiso"]'::jsonb,
    '1', 'Respuesta: B) La tomó y la deshonró. La vio Siquem... y la tomó, y se acostó con ella, y la deshonró (Génesis 34:2).', 2, true),

  (v_cap, '¿Qué condición pusieron los hijos de Jacob para permitir el matrimonio?', 'multiple',
    '["A) Una gran dote solamente","B) Que todos los varones de la ciudad se circuncidaran","C) Que Siquem se mudara","D) Nada, se negaron rotundamente"]'::jsonb,
    '1', 'Respuesta: B) Que todos los varones de la ciudad se circuncidaran. Si habéis de ser como nosotros, que se circuncide entre vosotros todo varón (Génesis 34:15).', 3, true),

  (v_cap, '¿Quiénes vengaron a Dina atacando la ciudad?', 'multiple',
    '["A) Jacob mismo","B) Simeón y Leví","C) Rubén y Judá","D) Todos los hermanos por igual"]'::jsonb,
    '1', 'Respuesta: B) Simeón y Leví. Dos de los hijos de Jacob, Simeón y Leví, hermanos de Dina... vinieron contra la ciudad (Génesis 34:25).', 4, true),

  (v_cap, '¿Qué hicieron Simeón y Leví el tercer día?', 'multiple',
    '["A) Perdonaron a la ciudad","B) Mataron a todo varón de la ciudad, incluidos Hamor y Siquem","C) Se fueron sin hacer nada","D) Negociaron más"]'::jsonb,
    '1', 'Respuesta: B) Mataron a todo varón de la ciudad, incluidos Hamor y Siquem. Mataron a todo varón. Y a Hamor y a Siquem su hijo los mataron a filo de espada (Génesis 34:25-26).', 5, true),

  (v_cap, '¿Qué tomaron los hijos de Jacob de la ciudad?', 'multiple',
    '["A) Nada","B) Ovejas, vacas, asnos, niños y mujeres","C) Solo oro","D) Solo comida"]'::jsonb,
    '1', 'Respuesta: B) Ovejas, vacas, asnos, niños y mujeres. Llevaron cautivos a todos sus niños y sus mujeres, y robaron todo lo que había en casa (Génesis 34:29).', 6, true),

  (v_cap, '¿Cómo reaccionó Jacob ante la matanza?', 'multiple',
    '["A) Se alegró","B) Los reprendió, temiendo represalias de los cananeos","C) No dijo nada","D) Los premió"]'::jsonb,
    '1', 'Respuesta: B) Los reprendió, temiendo represalias de los cananeos. Me habéis turbado con hacerme abominable a los moradores de esta tierra (Génesis 34:30).', 7, true),

  (v_cap, '¿Qué respondieron Simeón y Leví a Jacob?', 'multiple',
    '["A) Pidieron perdón","B) ¿Había él de tratar a nuestra hermana como a una ramera?","C) Se rieron","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) ¿Había él de tratar a nuestra hermana como a una ramera?. ¿Había él de tratar a nuestra hermana como a una ramera? (Génesis 34:31).', 8, true),

  (v_cap, '¿Quién era Hamor?', 'multiple',
    '["A) Un rey enemigo lejano","B) El padre de Siquem, príncipe de la tierra","C) Un siervo de Jacob","D) El hermano de Dina"]'::jsonb,
    '1', 'Respuesta: B) El padre de Siquem, príncipe de la tierra. La vio Siquem hijo de Hamor heveo, príncipe de aquella tierra (Génesis 34:2).', 9, true),

  (v_cap, '¿Qué pidieron Hamor y Siquem a cambio de la unión entre los pueblos?', 'multiple',
    '["A) Oro únicamente","B) Emparentar, intercambiando hijas en matrimonio","C) Guerra","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Emparentar, intercambiando hijas en matrimonio. Emparentad con nosotros; dadnos vuestras hijas, y tomad vosotros las nuestras (Génesis 34:9).', 10, true);
END $$;