-- ============================================================
-- Migración 026: Preguntas del sistema — Génesis 22 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 22 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 22;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué le pidió Dios a Abraham que hiciera con Isaac?', 'multiple',
    '["A) Que lo enviara lejos","B) Que lo ofreciera en holocausto en el monte Moriah","C) Que lo casara","D) Que lo bendijera"]'::jsonb,
    '1', 'Respuesta: B) Que lo ofreciera en holocausto en el monte Moriah. Ofrécelo allí en holocausto sobre uno de los montes que yo te diré (Génesis 22:2).', 1, true),

  (v_cap, '¿Qué llevó Isaac mientras subían al monte?', 'multiple',
    '["A) El cuchillo","B) La leña para el holocausto","C) El fuego","D) Un cordero"]'::jsonb,
    '1', 'Respuesta: B) La leña para el holocausto. Tomó Abraham la leña del holocausto, y la puso sobre Isaac su hijo (Génesis 22:6).', 2, true),

  (v_cap, '¿Qué le preguntó Isaac a su padre en el camino?', 'multiple',
    '["A) ¿A dónde vamos?","B) ¿Dónde está el cordero para el holocausto?","C) ¿Por qué estás triste?","D) ¿Cuánto falta?"]'::jsonb,
    '1', 'Respuesta: B) ¿Dónde está el cordero para el holocausto?. He aquí el fuego y la leña; mas ¿dónde está el cordero para el holocausto? (Génesis 22:7).', 3, true),

  (v_cap, '¿Qué respondió Abraham sobre el cordero?', 'multiple',
    '["A) No hay cordero","B) Dios se proveerá de cordero","C) Isaac será el cordero","D) No respondió"]'::jsonb,
    '1', 'Respuesta: B) Dios se proveerá de cordero. Dios se proveerá de cordero para el holocausto, hijo mío (Génesis 22:8).', 4, true),

  (v_cap, '¿Quién detuvo a Abraham antes de sacrificar a Isaac?', 'multiple',
    '["A) Sara","B) El ángel de Jehová, desde el cielo","C) Isaac mismo","D) Un siervo"]'::jsonb,
    '1', 'Respuesta: B) El ángel de Jehová, desde el cielo. El ángel de Jehová le dio voces desde el cielo (Génesis 22:11).', 5, true),

  (v_cap, '¿Qué encontró Abraham para sacrificar en lugar de Isaac?', 'multiple',
    '["A) Una paloma","B) Un carnero trabado por sus cuernos en un zarzal","C) Un becerro","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Un carnero trabado por sus cuernos en un zarzal. He aquí a sus espaldas un carnero trabado en un zarzal por sus cuernos (Génesis 22:13).', 6, true),

  (v_cap, '¿Cómo llamó Abraham a aquel lugar?', 'multiple',
    '["A) Bet-el","B) Jehová proveerá","C) Beerseba","D) Peniel"]'::jsonb,
    '1', 'Respuesta: B) Jehová proveerá. Llamó Abraham el nombre de aquel lugar, Jehová proveerá (Génesis 22:14).', 7, true),

  (v_cap, '¿Qué promesa repitió Dios a Abraham tras esta prueba?', 'multiple',
    '["A) Un reino terrenal","B) Multiplicar su descendencia como las estrellas y la arena del mar","C) Riquezas inmediatas","D) Un nuevo hijo"]'::jsonb,
    '1', 'Respuesta: B) Multiplicar su descendencia como las estrellas y la arena del mar. Multiplicaré tu descendencia como las estrellas del cielo y como la arena que está a la orilla del mar (Génesis 22:17).', 8, true),

  (v_cap, '¿Por qué bendijo Dios a Abraham de esta manera?', 'multiple',
    '["A) Por su riqueza","B) Porque obedeció y no le rehusó a su único hijo","C) Por su edad","D) Por casualidad"]'::jsonb,
    '1', 'Respuesta: B) Porque obedeció y no le rehusó a su único hijo. Por cuanto has hecho esto, y no me has rehusado tu hijo, tu único hijo (Génesis 22:16).', 9, true),

  (v_cap, '¿De quién se dio noticia a Abraham al final del capítulo?', 'multiple',
    '["A) De la muerte de Sara","B) Del nacimiento de los hijos de Nacor, entre ellos Betuel, padre de Rebeca","C) De la muerte de Lot","D) De un nuevo rey"]'::jsonb,
    '1', 'Respuesta: B) Del nacimiento de los hijos de Nacor, entre ellos Betuel, padre de Rebeca. Betuel fue el padre de Rebeca (Génesis 22:23).', 10, true);
END $$;