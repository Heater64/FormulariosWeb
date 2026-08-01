-- ============================================================
-- Migración 007: Preguntas del sistema — Génesis 3 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 3 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 3;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Quién engañó a la mujer en el huerto?', 'multiple',
    '["A) Un ángel","B) La serpiente","C) Caín","D) Un extraño"]'::jsonb,
    '1', 'Respuesta: B) La serpiente. La serpiente era astuta y engañó a la mujer (Génesis 3:1-5).', 1, true),

  (v_cap, '¿Qué se dieron cuenta Adán y su mujer al comer del fruto prohibido?', 'multiple',
    '["A) Que tenían hambre","B) Que estaban desnudos","C) Que eran inmortales","D) Que podían volar"]'::jsonb,
    '1', 'Respuesta: B) Que estaban desnudos. Fueron abiertos los ojos de ambos, y conocieron que estaban desnudos (Génesis 3:7).', 2, true),

  (v_cap, '¿Con qué se hicieron delantales Adán y Eva?', 'multiple',
    '["A) Con pieles","B) Con hojas de higuera","C) Con lana","D) Con lino"]'::jsonb,
    '1', 'Respuesta: B) Con hojas de higuera. Cosieron hojas de higuera, y se hicieron delantales (Génesis 3:7).', 3, true),

  (v_cap, '¿Qué castigo recibió la serpiente?', 'multiple',
    '["A) Ser bendecida","B) Andar sobre su pecho y comer polvo","C) Volar","D) Ser el rey de los animales"]'::jsonb,
    '1', 'Respuesta: B) Andar sobre su pecho y comer polvo. Sobre tu pecho andarás, y polvo comerás todos los días de tu vida (Génesis 3:14).', 4, true),

  (v_cap, '¿Qué le dijo Dios a la mujer sobre el parto?', 'multiple',
    '["A) Sería sin dolor","B) Multiplicaría los dolores en sus preñeces","C) No tendría hijos","D) Tendría solo gemelos"]'::jsonb,
    '1', 'Respuesta: B) Multiplicaría los dolores en sus preñeces. Multiplicaré en gran manera los dolores en tus preñeces (Génesis 3:16).', 5, true),

  (v_cap, '¿Qué dijo Dios que produciría la tierra maldita para el hombre?', 'multiple',
    '["A) Solo frutas","B) Espinos y cardos","C) Oro","D) Flores"]'::jsonb,
    '1', 'Respuesta: B) Espinos y cardos. Espinos y cardos te producirá (Génesis 3:18).', 6, true),

  (v_cap, '¿Con qué vistió Jehová Dios a Adán y su mujer?', 'multiple',
    '["A) Ropas de lino","B) Túnicas de pieles","C) Hojas","D) Nada, quedaron desnudos"]'::jsonb,
    '1', 'Respuesta: B) Túnicas de pieles. Jehová Dios hizo al hombre y a su mujer túnicas de pieles, y los vistió (Génesis 3:21).', 7, true),

  (v_cap, '¿Por qué fueron expulsados del huerto de Edén?', 'multiple',
    '["A) Para que no tomaran también del árbol de la vida y vivieran para siempre","B) Por robar comida","C) Por pelear entre ellos","D) Porque Dios se mudó de lugar"]'::jsonb,
    '0', 'Respuesta: A) Para que no tomaran también del árbol de la vida y vivieran para siempre. Para que no alargue su mano, y tome también del árbol de la vida... lo sacó Jehová del huerto (Génesis 3:22-23).', 8, true),

  (v_cap, '¿Qué puso Dios para guardar el camino al árbol de la vida?', 'multiple',
    '["A) Un muro","B) Querubines y una espada encendida","C) Un río","D) Un ángel dormido"]'::jsonb,
    '1', 'Respuesta: B) Querubines y una espada encendida. Puso al oriente del huerto de Edén querubines, y una espada encendida (Génesis 3:24).', 9, true),

  (v_cap, '¿Qué le respondió la mujer a Dios cuando le preguntó qué había hecho?', 'multiple',
    '["A) Que fue Adán","B) Que la serpiente la engañó y comió","C) Que no sabía nada","D) Que fue un accidente"]'::jsonb,
    '1', 'Respuesta: B) Que la serpiente la engañó y comió. Dijo la mujer: La serpiente me engañó, y comí (Génesis 3:13).', 10, true);
END $$;