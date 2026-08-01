-- ============================================================
-- Migración 040: Preguntas del sistema — Génesis 36 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 36 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 36;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Con qué otro nombre es conocido Esaú en este capítulo?', 'multiple',
    '["A) Israel","B) Edom","C) Set","D) Jafet"]'::jsonb,
    '1', 'Respuesta: B) Edom. Estas son las generaciones de Esaú, el cual es Edom (Génesis 36:1).', 1, true),

  (v_cap, '¿De qué pueblo tomó Esaú principalmente a sus esposas?', 'multiple',
    '["A) De sus primas hebreas","B) De las hijas de Canaán","C) De Egipto","D) De Moab"]'::jsonb,
    '1', 'Respuesta: B) De las hijas de Canaán. Esaú tomó sus mujeres de las hijas de Canaán (Génesis 36:2).', 2, true),

  (v_cap, '¿Dónde habitó Esaú finalmente?', 'multiple',
    '["A) En Canaán con Jacob","B) En el monte de Seir","C) En Egipto","D) En Harán"]'::jsonb,
    '1', 'Respuesta: B) En el monte de Seir. Esaú habitó en el monte de Seir (Génesis 36:8).', 3, true),

  (v_cap, '¿Quién fue el primogénito de Esaú?', 'multiple',
    '["A) Reuel","B) Elifaz","C) Coré","D) Jeús"]'::jsonb,
    '1', 'Respuesta: B) Elifaz. Elifaz, hijo de Ada mujer de Esaú (Génesis 36:4,15).', 4, true),

  (v_cap, '¿Quién nació de Timna, concubina de Elifaz?', 'multiple',
    '["A) Coré","B) Amalec","C) Reuel","D) Temán"]'::jsonb,
    '1', 'Respuesta: B) Amalec. Timna fue concubina de Elifaz hijo de Esaú, y ella le dio a luz a Amalec (Génesis 36:12).', 5, true),

  (v_cap, '¿Quiénes habitaban originalmente la tierra de Seir?', 'multiple',
    '["A) Los cananeos","B) Los horeos","C) Los amonitas","D) Los filisteos"]'::jsonb,
    '1', 'Respuesta: B) Los horeos. Estos son los hijos de Seir horeo, moradores de aquella tierra (Génesis 36:20).', 6, true),

  (v_cap, '¿Qué tuvieron los descendientes de Esaú antes de que hubiera rey en Israel?', 'multiple',
    '["A) Nada","B) Reyes que reinaron en la tierra de Edom","C) Sacerdotes","D) Un imperio global"]'::jsonb,
    '1', 'Respuesta: B) Reyes que reinaron en la tierra de Edom. Los reyes que reinaron en la tierra de Edom, antes que reinase rey sobre los hijos de Israel (Génesis 36:31).', 7, true),

  (v_cap, '¿Quién descubrió manantiales en el desierto según el texto?', 'multiple',
    '["A) Zibeón","B) Aná","C) Disón","D) Lotán"]'::jsonb,
    '1', 'Respuesta: B) Aná. Este Aná es el que descubrió manantiales en el desierto (Génesis 36:24).', 8, true),

  (v_cap, '¿Cuántas esposas principales se mencionan de Esaú?', 'multiple',
    '["A) Una","B) Tres: Ada, Aholibama y Basemat","C) Cinco","D) Ninguna"]'::jsonb,
    '1', 'Respuesta: B) Tres: Ada, Aholibama y Basemat. Esaú tomó sus mujeres... a Ada... a Aholibama... y a Basemat (Génesis 36:2-3).', 9, true),

  (v_cap, '¿Qué relación se establece entre Edom y Esaú al final del capítulo?', 'multiple',
    '["A) Son personas distintas","B) Edom es el mismo Esaú, padre de los edomitas","C) Edom fue su enemigo","D) No hay relación"]'::jsonb,
    '1', 'Respuesta: B) Edom es el mismo Esaú, padre de los edomitas. Edom es el mismo Esaú, padre de los edomitas (Génesis 36:43).', 10, true);
END $$;