-- ============================================================
-- Migración 008: Preguntas del sistema — Génesis 4 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 4 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 4;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Cuál fue el primer hijo de Adán y Eva?', 'multiple',
    '["A) Abel","B) Caín","C) Set","D) Enós"]'::jsonb,
    '1', 'Respuesta: B) Caín. Concibió y dio a luz a Caín (Génesis 4:1).', 1, true),

  (v_cap, '¿A qué se dedicaba Abel?', 'multiple',
    '["A) Labrador","B) Pastor de ovejas","C) Cazador","D) Pescador"]'::jsonb,
    '1', 'Respuesta: B) Pastor de ovejas. Abel fue pastor de ovejas, y Caín fue labrador de la tierra (Génesis 4:2).', 2, true),

  (v_cap, '¿La ofrenda de quién miró Jehová con agrado?', 'multiple',
    '["A) La de Caín","B) La de Abel","C) Las de ambos","D) Ninguna"]'::jsonb,
    '1', 'Respuesta: B) La de Abel. Miró Jehová con agrado a Abel y a su ofrenda (Génesis 4:4).', 3, true),

  (v_cap, '¿Qué hizo Caín contra Abel?', 'multiple',
    '["A) Lo desterró","B) Lo mató","C) Lo insultó","D) Lo perdonó"]'::jsonb,
    '1', 'Respuesta: B) Lo mató. Caín se levantó contra su hermano Abel, y lo mató (Génesis 4:8).', 4, true),

  (v_cap, '¿Qué respondió Caín cuando Jehová le preguntó por Abel?', 'multiple',
    '["A) Está en el campo","B) ¿Soy yo acaso guarda de mi hermano?","C) No lo sé, se fue lejos","D) Está durmiendo"]'::jsonb,
    '1', 'Respuesta: B) ¿Soy yo acaso guarda de mi hermano?. Respondió: No sé. ¿Soy yo acaso guarda de mi hermano? (Génesis 4:9).', 5, true),

  (v_cap, '¿Para qué puso Jehová una señal en Caín?', 'multiple',
    '["A) Para que lo mataran","B) Para que nadie lo matase","C) Para hacerlo rey","D) Para hacerlo invisible"]'::jsonb,
    '1', 'Respuesta: B) Para que nadie lo matase. Jehová puso señal en Caín, para que no lo matase cualquiera que le hallara (Génesis 4:15).', 6, true),

  (v_cap, '¿Qué ciudad edificó Caín?', 'multiple',
    '["A) Babel","B) Una ciudad llamada Enoc","C) Nínive","D) Ur"]'::jsonb,
    '1', 'Respuesta: B) Una ciudad llamada Enoc. Edificó una ciudad, y llamó el nombre de la ciudad del nombre de su hijo, Enoc (Génesis 4:17).', 7, true),

  (v_cap, '¿Quién fue descrito como padre de los que habitan en tiendas y crían ganados?', 'multiple',
    '["A) Jabal","B) Jubal","C) Tubal-caín","D) Lamec"]'::jsonb,
    '0', 'Respuesta: A) Jabal. Jabal fue padre de los que habitan en tiendas y crían ganados (Génesis 4:20).', 8, true),

  (v_cap, '¿Quién fue el padre de todos los que tocan arpa y flauta?', 'multiple',
    '["A) Jabal","B) Jubal","C) Set","D) Enós"]'::jsonb,
    '1', 'Respuesta: B) Jubal. Jubal fue padre de todos los que tocan arpa y flauta (Génesis 4:21).', 9, true),

  (v_cap, '¿Qué hijo tuvo Adán en sustitución de Abel?', 'multiple',
    '["A) Enós","B) Set","C) Caín","D) Matusalén"]'::jsonb,
    '1', 'Respuesta: B) Set. Llamó su nombre Set, pues Dios me ha sustituido otro hijo en lugar de Abel (Génesis 4:25).', 10, true);
END $$;