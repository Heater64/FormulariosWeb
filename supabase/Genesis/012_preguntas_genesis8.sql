-- ============================================================
-- Migración 012: Preguntas del sistema — Génesis 8 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 8 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 8;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué ave envió Noé primero para ver si las aguas habían bajado?', 'multiple',
    '["A) Una paloma","B) Un cuervo","C) Un águila","D) Una gaviota"]'::jsonb,
    '1', 'Respuesta: B) Un cuervo. Envió un cuervo, el cual salió, y estuvo yendo y volviendo (Génesis 8:7).', 1, true),

  (v_cap, '¿Qué trajo la paloma que indicó que las aguas habían bajado?', 'multiple',
    '["A) Una rama de vid","B) Una hoja de olivo","C) Un pez","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Una hoja de olivo. Traía una hoja de olivo en el pico (Génesis 8:11).', 2, true),

  (v_cap, '¿Sobre qué montes reposó el arca?', 'multiple',
    '["A) Sinaí","B) Ararat","C) Moriah","D) Carmelo"]'::jsonb,
    '1', 'Respuesta: B) Ararat. Reposó el arca... sobre los montes de Ararat (Génesis 8:4).', 3, true),

  (v_cap, '¿Qué hizo Noé al salir del arca?', 'multiple',
    '["A) Plantó una viña de inmediato","B) Edificó un altar y ofreció holocausto","C) Construyó una ciudad","D) Se fue a dormir"]'::jsonb,
    '1', 'Respuesta: B) Edificó un altar y ofreció holocausto. Edificó Noé un altar a Jehová... y ofreció holocausto (Génesis 8:20).', 4, true),

  (v_cap, '¿Qué prometió Jehová no volver a hacer?', 'multiple',
    '["A) Bendecir a Noé","B) Maldecir la tierra ni destruir todo ser viviente como lo había hecho","C) Hablar con los hombres","D) Crear más animales"]'::jsonb,
    '1', 'Respuesta: B) Maldecir la tierra ni destruir todo ser viviente como lo había hecho. No volveré más a maldecir la tierra... ni volveré más a destruir todo ser viviente (Génesis 8:21).', 5, true),

  (v_cap, '¿Qué ciclos prometió Dios que no cesarían mientras la tierra permanezca?', 'multiple',
    '["A) Solo el día","B) Sementera y siega, frío y calor, verano e invierno, día y noche","C) Solo las estaciones del año","D) Nada en particular"]'::jsonb,
    '1', 'Respuesta: B) Sementera y siega, frío y calor, verano e invierno, día y noche. No cesarán la sementera y la siega, el frío y el calor, el verano y el invierno, y el día y la noche (Génesis 8:22).', 6, true),

  (v_cap, '¿A los cuántos días abrió Noé la ventana del arca?', 'multiple',
    '["A) Veinte días","B) Cuarenta días","C) Sesenta días","D) Cien días"]'::jsonb,
    '1', 'Respuesta: B) Cuarenta días. Al cabo de cuarenta días abrió Noé la ventana del arca (Génesis 8:6).', 7, true),

  (v_cap, '¿Qué hizo Dios para que las aguas disminuyeran?', 'multiple',
    '["A) Nada, bajaron solas","B) Hizo pasar un viento sobre la tierra","C) Provocó un terremoto","D) El sol las secó al instante"]'::jsonb,
    '1', 'Respuesta: B) Hizo pasar un viento sobre la tierra. Hizo pasar Dios un viento sobre la tierra, y disminuyeron las aguas (Génesis 8:1).', 8, true),

  (v_cap, '¿Qué edad tenía Noé cuando la tierra se secó por completo?', 'multiple',
    '["A) 600 años","B) 601 años","C) 500 años","D) 700 años"]'::jsonb,
    '1', 'Respuesta: B) 601 años. En el año seiscientos uno de Noé... la faz de la tierra estaba seca (Génesis 8:13).', 9, true),

  (v_cap, '¿Qué mandó Dios a Noé y su familia al salir del arca?', 'multiple',
    '["A) Que se quedaran quietos","B) Que fructificaran y se multiplicaran sobre la tierra","C) Que construyeran una torre","D) Que volvieran al arca"]'::jsonb,
    '1', 'Respuesta: B) Que fructificaran y se multiplicaran sobre la tierra. Vayan por la tierra, y fructifiquen y multiplíquense sobre la tierra (Génesis 8:17).', 10, true);
END $$;