-- ============================================================
-- Migración 014: Preguntas del sistema — Génesis 10 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 10 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 10;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Cuáles son los tres hijos de Noé de quienes desciende toda la tierra?', 'multiple',
    '["A) Sem, Cam y Jafet","B) Rubén, Simeón y Leví","C) Isaac, Jacob y Esaú","D) Set, Enós y Cainán"]'::jsonb,
    '0', 'Respuesta: A) Sem, Cam y Jafet. Estas son las generaciones de los hijos de Noé: Sem, Cam y Jafet (Génesis 10:1).', 1, true),

  (v_cap, '¿Quién fue descrito como vigoroso cazador delante de Jehová?', 'multiple',
    '["A) Nimrod","B) Sem","C) Canaán","D) Jafet"]'::jsonb,
    '0', 'Respuesta: A) Nimrod. Este fue vigoroso cazador delante de Jehová (Génesis 10:9).', 2, true),

  (v_cap, '¿Qué ciudades fueron el comienzo del reino de Nimrod?', 'multiple',
    '["A) Nínive y Cala","B) Babel, Erec, Acad y Calne","C) Sodoma y Gomorra","D) Ur y Harán"]'::jsonb,
    '1', 'Respuesta: B) Babel, Erec, Acad y Calne. Fue el comienzo de su reino Babel, Erec, Acad y Calne, en la tierra de Sinar (Génesis 10:10).', 3, true),

  (v_cap, '¿Quién fue el primogénito de Canaán?', 'multiple',
    '["A) Het","B) Sidón","C) El jebuseo","D) El amorreo"]'::jsonb,
    '1', 'Respuesta: B) Sidón. Canaán engendró a Sidón su primogénito (Génesis 10:15).', 4, true),

  (v_cap, '¿De quién se dice que fue padre de todos los hijos de Heber?', 'multiple',
    '["A) Sem","B) Cam","C) Jafet","D) Nimrod"]'::jsonb,
    '0', 'Respuesta: A) Sem. Le nacieron hijos a Sem, padre de todos los hijos de Heber (Génesis 10:21).', 5, true),

  (v_cap, '¿Por qué el nombre de Peleg tiene un significado especial?', 'multiple',
    '["A) Porque nació ciego","B) Porque en sus días fue repartida la tierra","C) Porque fue el más fuerte","D) Porque construyó Babel"]'::jsonb,
    '1', 'Respuesta: B) Porque en sus días fue repartida la tierra. El nombre del uno fue Peleg, porque en sus días fue repartida la tierra (Génesis 10:25).', 6, true),

  (v_cap, '¿De qué línea descendieron los filisteos según el texto?', 'multiple',
    '["A) De los hijos de Cam, a través de Casluhim","B) De los hijos de Sem","C) De los hijos de Jafet","D) De Canaán directamente"]'::jsonb,
    '0', 'Respuesta: A) De los hijos de Cam, a través de Casluhim. Casluhim, de donde salieron los filisteos (Génesis 10:14).', 7, true),

  (v_cap, '¿Quiénes se poblaron en las costas, cada uno según su lengua?', 'multiple',
    '["A) Los hijos de Sem","B) Los hijos de Jafet","C) Los hijos de Cam","D) Los descendientes de Nimrod"]'::jsonb,
    '1', 'Respuesta: B) Los hijos de Jafet. De éstos se poblaron las costas, cada cual según su lengua (Génesis 10:5).', 8, true),

  (v_cap, '¿Qué ocurrió con las naciones descendientes de Noé, según el resumen final del capítulo?', 'multiple',
    '["A) Se quedaron todas unidas","B) Se esparcieron las naciones en la tierra después del diluvio","C) Desaparecieron todas","D) Se mudaron a Egipto"]'::jsonb,
    '1', 'Respuesta: B) Se esparcieron las naciones en la tierra después del diluvio. De éstos se esparcieron las naciones en la tierra después del diluvio (Génesis 10:32).', 9, true),

  (v_cap, '¿Quién fue el hermano mayor de Jafet, según el texto?', 'multiple',
    '["A) Cam","B) Sem","C) Canaán","D) Nimrod"]'::jsonb,
    '1', 'Respuesta: B) Sem. Sem... hermano mayor de Jafet (Génesis 10:21).', 10, true);
END $$;