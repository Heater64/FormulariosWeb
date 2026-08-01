-- ============================================================
-- Migración 005: Preguntas del sistema — Génesis 1 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 1 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 1;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué creó Dios el primer día?', 'multiple',
    '["A) El sol y la luna","B) La luz","C) Los animales","D) El hombre"]'::jsonb,
    '1', 'Respuesta: B) La luz. Génesis 1:3 — «Y dijo Dios: Sea la luz; y fue la luz.»', 1, true),

  (v_cap, '¿Qué separó Dios el segundo día?', 'multiple',
    '["A) La luz de las tinieblas","B) Las aguas de las aguas","C) La tierra del mar","D) El día de la noche"]'::jsonb,
    '1', 'Respuesta: B) Las aguas de las aguas. Dios hizo la expansión para separar las aguas de las aguas (Génesis 1:6-7).', 2, true),

  (v_cap, '¿Qué apareció cuando Dios reunió las aguas debajo de los cielos?', 'multiple',
    '["A) Los montes","B) La tierra seca","C) Los ríos","D) Los árboles"]'::jsonb,
    '1', 'Respuesta: B) La tierra seca. Lo seco llamó Tierra, y a la reunión de las aguas Mar (Génesis 1:9-10).', 3, true),

  (v_cap, '¿Qué creó Dios para que sirvieran de señales para las estaciones, días y años?', 'multiple',
    '["A) Las estrellas únicamente","B) El arco iris","C) Las lumbreras del cielo","D) Las nubes"]'::jsonb,
    '2', 'Respuesta: C) Las lumbreras del cielo. El sol, la luna y las estrellas para señales y tiempos (Génesis 1:14-16).', 4, true),

  (v_cap, '¿Qué creó Dios el quinto día?', 'multiple',
    '["A) Los peces y las aves","B) Los animales terrestres","C) El hombre","D) Las plantas"]'::jsonb,
    '0', 'Respuesta: A) Los peces y las aves. Dios creó los animales acuáticos y las aves (Génesis 1:20-23).', 5, true),

  (v_cap, '¿Qué animales creó Dios el sexto día antes del hombre?', 'multiple',
    '["A) Solo los reptiles","B) Solo las bestias","C) Los animales de la tierra, bestias y reptiles","D) Solo el ganado"]'::jsonb,
    '2', 'Respuesta: C) Los animales de la tierra, bestias y reptiles (Génesis 1:24-25).', 6, true),

  (v_cap, '¿A imagen de quién creó Dios al hombre?', 'multiple',
    '["A) De los ángeles","B) De sí mismo","C) De Adán","D) Del cielo"]'::jsonb,
    '1', 'Respuesta: B) De sí mismo. «Varón y hembra los creó; a imagen de Dios los creó» (Génesis 1:27).', 7, true),

  (v_cap, '¿Qué dominio dio Dios al ser humano?', 'multiple',
    '["A) Solo sobre los peces","B) Solo sobre las aves","C) Sobre toda la creación en la tierra","D) Sobre los ángeles"]'::jsonb,
    '2', 'Respuesta: C) Sobre toda la creación en la tierra (Génesis 1:26, 28).', 8, true),

  (v_cap, '¿Qué dio Dios como alimento al hombre según Génesis 1?', 'multiple',
    '["A) Solo carne","B) Toda planta que da semilla y todo árbol con fruto","C) Solo frutas","D) Solo peces"]'::jsonb,
    '1', 'Respuesta: B) Toda planta que da semilla y todo árbol con fruto (Génesis 1:29).', 9, true),

  (v_cap, '¿Cómo describió Dios toda su creación al finalizar el sexto día?', 'multiple',
    '["A) Buena","B) Perfecta","C) Bueno en gran manera","D) Terminada"]'::jsonb,
    '2', 'Respuesta: C) Bueno en gran manera. «Vio Dios todo lo que había hecho, y he aquí que era bueno en gran manera» (Génesis 1:31).', 10, true);
END $$;
