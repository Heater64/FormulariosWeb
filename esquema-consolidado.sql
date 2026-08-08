-- ===== supabase\Genesis\005_preguntas_genesis1.sql =====
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


-- ===== supabase\Genesis\006_preguntas_genesis2.sql =====
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

-- ===== supabase\Genesis\007_preguntas_genesis3.sql =====
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

-- ===== supabase\Genesis\008_preguntas_genesis4.sql =====
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

-- ===== supabase\Genesis\009_preguntas_genesis5.sql =====
-- ============================================================
-- Migración 009: Preguntas del sistema — Génesis 5 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 5 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 5;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Cuántos años vivió Adán en total?', 'multiple',
    '["A) 800 años","B) 930 años","C) 969 años","D) 777 años"]'::jsonb,
    '1', 'Respuesta: B) 930 años. Fueron todos los días que vivió Adán novecientos treinta años (Génesis 5:5).', 1, true),

  (v_cap, '¿Quién caminó con Dios y desapareció porque Dios se lo llevó?', 'multiple',
    '["A) Matusalén","B) Enoc","C) Set","D) Lamec"]'::jsonb,
    '1', 'Respuesta: B) Enoc. Caminó Enoc con Dios, y desapareció, porque le llevó Dios (Génesis 5:24).', 2, true),

  (v_cap, '¿Quién vivió más años según las genealogías de este capítulo?', 'multiple',
    '["A) Adán","B) Matusalén","C) Noé","D) Enoc"]'::jsonb,
    '1', 'Respuesta: B) Matusalén. Fueron todos los días de Matusalén novecientos sesenta y nueve años (Génesis 5:27).', 3, true),

  (v_cap, '¿Quién fue el padre de Noé?', 'multiple',
    '["A) Matusalén","B) Lamec","C) Enoc","D) Set"]'::jsonb,
    '1', 'Respuesta: B) Lamec. Vivió Lamec ciento ochenta y dos años, y engendró un hijo... llamó su nombre Noé (Génesis 5:28-29).', 4, true),

  (v_cap, '¿Qué significado le dio Lamec al nombre de Noé?', 'multiple',
    '["A) Que traería guerra","B) Que los aliviaría del trabajo por la tierra maldita","C) Que sería el más fuerte","D) Ningún significado especial"]'::jsonb,
    '1', 'Respuesta: B) Que los aliviaría del trabajo por la tierra maldita. Este nos aliviará de nuestras obras y del trabajo de nuestras manos, a causa de la tierra que Jehová maldijo (Génesis 5:29).', 5, true),

  (v_cap, '¿A quién engendró Set?', 'multiple',
    '["A) A Caín","B) A Enós","C) A Jared","D) A Lamec"]'::jsonb,
    '1', 'Respuesta: B) A Enós. Vivió Set ciento cinco años, y engendró a Enós (Génesis 5:6).', 6, true),

  (v_cap, '¿Cuántos hijos engendró Noé y cómo se llamaban?', 'multiple',
    '["A) Dos: Sem y Cam","B) Tres: Sem, Cam y Jafet","C) Cuatro hijos","D) Uno solo"]'::jsonb,
    '1', 'Respuesta: B) Tres: Sem, Cam y Jafet. Siendo Noé de quinientos años, engendró a Sem, a Cam y a Jafet (Génesis 5:32).', 7, true),

  (v_cap, '¿A semejanza de quién fue hecho Adán según el inicio del capítulo?', 'multiple',
    '["A) De los ángeles","B) A semejanza de Dios","C) De los animales","D) No se dice"]'::jsonb,
    '1', 'Respuesta: B) A semejanza de Dios. El día en que creó Dios al hombre, a semejanza de Dios lo hizo (Génesis 5:1).', 8, true),

  (v_cap, '¿Quién fue el padre de Matusalén?', 'multiple',
    '["A) Jared","B) Enoc","C) Lamec","D) Cainán"]'::jsonb,
    '1', 'Respuesta: B) Enoc. Vivió Enoc sesenta y cinco años, y engendró a Matusalén (Génesis 5:21).', 9, true),

  (v_cap, '¿De qué edad era Noé cuando engendró a sus hijos?', 'multiple',
    '["A) 400 años","B) 500 años","C) 600 años","D) 950 años"]'::jsonb,
    '1', 'Respuesta: B) 500 años. Siendo Noé de quinientos años, engendró a Sem, a Cam y a Jafet (Génesis 5:32).', 10, true);
END $$;

-- ===== supabase\Genesis\010_preguntas_genesis6.sql =====
-- ============================================================
-- Migración 010: Preguntas del sistema — Génesis 6 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 6 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 6;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Cuántos años dijo Jehová que serían los días del hombre?', 'multiple',
    '["A) 100 años","B) 120 años","C) 150 años","D) 200 años"]'::jsonb,
    '1', 'Respuesta: B) 120 años. Serán sus días ciento veinte años (Génesis 6:3).', 1, true),

  (v_cap, '¿Cómo se llamaba a los seres poderosos que había en la tierra en aquellos días?', 'multiple',
    '["A) Gigantes","B) Ángeles","C) Reyes","D) Profetas"]'::jsonb,
    '0', 'Respuesta: A) Gigantes. Había gigantes en la tierra en aquellos días (Génesis 6:4).', 2, true),

  (v_cap, '¿Qué vio Jehová en la tierra que le llevó a arrepentirse de haber creado al hombre?', 'multiple',
    '["A) Falta de fe","B) Que la maldad era mucha y todo pensamiento era continuamente malo","C) Pobreza extrema","D) Guerra entre animales"]'::jsonb,
    '1', 'Respuesta: B) Que la maldad era mucha y todo pensamiento era continuamente malo. Vio Jehová que la maldad de los hombres era mucha... de continuo solamente el mal (Génesis 6:5).', 3, true),

  (v_cap, '¿Quién halló gracia ante los ojos de Jehová?', 'multiple',
    '["A) Matusalén","B) Noé","C) Set","D) Enós"]'::jsonb,
    '1', 'Respuesta: B) Noé. Pero Noé halló gracia ante los ojos de Jehová (Génesis 6:8).', 4, true),

  (v_cap, '¿Cómo se describe a Noé?', 'multiple',
    '["A) Rico y poderoso","B) Varón justo, perfecto en sus generaciones","C) El más joven de su familia","D) Un extranjero"]'::jsonb,
    '1', 'Respuesta: B) Varón justo, perfecto en sus generaciones. Noé, varón justo, era perfecto en sus generaciones; con Dios caminó Noé (Génesis 6:9).', 5, true),

  (v_cap, '¿De qué madera mandó Dios construir el arca?', 'multiple',
    '["A) De cedro","B) De gofer","C) De olivo","D) De roble"]'::jsonb,
    '1', 'Respuesta: B) De gofer. Hazte un arca de madera de gofer (Génesis 6:14).', 6, true),

  (v_cap, '¿Cuántos codos de longitud debía tener el arca?', 'multiple',
    '["A) 100 codos","B) 200 codos","C) 300 codos","D) 500 codos"]'::jsonb,
    '2', 'Respuesta: C) 300 codos. De trescientos codos la longitud del arca (Génesis 6:15).', 7, true),

  (v_cap, '¿Cuántos pisos debía tener el arca?', 'multiple',
    '["A) Uno","B) Dos","C) Tres: bajo, segundo y tercero","D) Cuatro"]'::jsonb,
    '2', 'Respuesta: C) Tres: bajo, segundo y tercero. Le harás piso bajo, segundo y tercero (Génesis 6:16).', 8, true),

  (v_cap, '¿Cuántos de cada especie de animales debían entrar en el arca según el mandato inicial?', 'multiple',
    '["A) Uno de cada especie","B) Dos, macho y hembra","C) Siete parejas","D) Diez parejas"]'::jsonb,
    '1', 'Respuesta: B) Dos, macho y hembra. De todo lo que vive, de toda carne, dos de cada especie meterás en el arca (Génesis 6:19).', 9, true),

  (v_cap, '¿Qué más debía almacenar Noé además de meter a los animales?', 'multiple',
    '["A) Oro","B) Alimento para sustento","C) Armas","D) Solo agua"]'::jsonb,
    '1', 'Respuesta: B) Alimento para sustento. Toma contigo de todo alimento que se come, y almacénalo (Génesis 6:21).', 10, true);
END $$;

-- ===== supabase\Genesis\011_preguntas_genesis7.sql =====
-- ============================================================
-- Migración 011: Preguntas del sistema — Génesis 7 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 7 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 7;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Cuántas parejas de animales limpios debía tomar Noé?', 'multiple',
    '["A) Una pareja","B) Siete parejas","C) Diez parejas","D) Doce parejas"]'::jsonb,
    '1', 'Respuesta: B) Siete parejas. De todo animal limpio tomarás siete parejas (Génesis 7:2).', 1, true),

  (v_cap, '¿Cuántos días y noches llovió durante el diluvio?', 'multiple',
    '["A) Veinte","B) Cuarenta","C) Cien","D) Ciento cincuenta"]'::jsonb,
    '1', 'Respuesta: B) Cuarenta. Haré llover sobre la tierra cuarenta días y cuarenta noches (Génesis 7:4,12).', 2, true),

  (v_cap, '¿Qué edad tenía Noé cuando llegó el diluvio?', 'multiple',
    '["A) 500 años","B) 600 años","C) 700 años","D) 950 años"]'::jsonb,
    '1', 'Respuesta: B) 600 años. Era Noé de seiscientos años cuando el diluvio de las aguas vino sobre la tierra (Génesis 7:6).', 3, true),

  (v_cap, '¿Quién cerró la puerta del arca?', 'multiple',
    '["A) Noé","B) Jehová","C) Sem","D) Un ángel"]'::jsonb,
    '1', 'Respuesta: B) Jehová. Como le había mandado Dios; y Jehová le cerró la puerta (Génesis 7:16).', 4, true),

  (v_cap, '¿Cuánto subieron las aguas por encima de los montes cubiertos?', 'multiple',
    '["A) Diez codos","B) Quince codos","C) Veinte codos","D) Treinta codos"]'::jsonb,
    '1', 'Respuesta: B) Quince codos. Quince codos más alto subieron las aguas (Génesis 7:20).', 5, true),

  (v_cap, '¿Quiénes quedaron con vida tras el diluvio?', 'multiple',
    '["A) Todos los hombres de la tierra","B) Solo Noé y los que estaban con él en el arca","C) Solo los gigantes","D) Nadie sobrevivió"]'::jsonb,
    '1', 'Respuesta: B) Solo Noé y los que estaban con él en el arca. Quedó solamente Noé, y los que con él estaban en el arca (Génesis 7:23).', 6, true),

  (v_cap, '¿Cuántos días prevalecieron las aguas sobre la tierra?', 'multiple',
    '["A) Cuarenta días","B) Cien días","C) Ciento cincuenta días","D) Doscientos días"]'::jsonb,
    '2', 'Respuesta: C) Ciento cincuenta días. Prevalecieron las aguas sobre la tierra ciento cincuenta días (Génesis 7:24).', 7, true),

  (v_cap, '¿En qué mes del año 600 de Noé comenzó el diluvio?', 'multiple',
    '["A) Mes primero","B) Mes segundo, a los diecisiete días","C) Mes tercero","D) Mes séptimo"]'::jsonb,
    '1', 'Respuesta: B) Mes segundo, a los diecisiete días. El año seiscientos... en el mes segundo, a los diecisiete días del mes (Génesis 7:11).', 8, true),

  (v_cap, '¿Quiénes entraron en el arca junto a Noé?', 'multiple',
    '["A) Solo animales","B) Su mujer, sus hijos y las mujeres de sus hijos","C) Solo sus hijos","D) Nadie más"]'::jsonb,
    '1', 'Respuesta: B) Su mujer, sus hijos y las mujeres de sus hijos. Entró Noé al arca, y con él sus hijos, su mujer, y las mujeres de sus hijos (Génesis 7:7,13).', 9, true),

  (v_cap, '¿Qué pasó con todos los montes altos?', 'multiple',
    '["A) Quedaron secos","B) Fueron cubiertos por las aguas","C) Se derrumbaron","D) Se incendiaron"]'::jsonb,
    '1', 'Respuesta: B) Fueron cubiertos por las aguas. Todos los montes altos que había debajo de todos los cielos, fueron cubiertos (Génesis 7:19).', 10, true);
END $$;

-- ===== supabase\Genesis\012_preguntas_genesis8.sql =====
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

-- ===== supabase\Genesis\013_preguntas_genesis9.sql =====
-- ============================================================
-- Migración 013: Preguntas del sistema — Génesis 9 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 9 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 9;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué señal del pacto puso Dios en las nubes?', 'multiple',
    '["A) Una estrella","B) El arco iris","C) Un relámpago","D) Una paloma"]'::jsonb,
    '1', 'Respuesta: B) El arco iris. Mi arco he puesto en las nubes, el cual será por señal del pacto (Génesis 9:13).', 1, true),

  (v_cap, '¿Qué prometió Dios que no volvería a hacer?', 'multiple',
    '["A) Bendecir a los hombres","B) Destruir la tierra con un diluvio","C) Crear animales","D) Hablar con los hombres"]'::jsonb,
    '1', 'Respuesta: B) Destruir la tierra con un diluvio. No exterminaré ya más toda carne con aguas de diluvio (Génesis 9:11).', 2, true),

  (v_cap, '¿Qué no debían comer los hombres según este pacto?', 'multiple',
    '["A) Carne en general","B) Carne con su sangre","C) Toda fruta","D) Peces"]'::jsonb,
    '1', 'Respuesta: B) Carne con su sangre. Pero carne con su vida, que es su sangre, no comeréis (Génesis 9:4).', 3, true),

  (v_cap, '¿Qué principio estableció Dios sobre quien derrame sangre de hombre?', 'multiple',
    '["A) Será perdonado","B) Su sangre será derramada","C) Será exiliado","D) Nada en particular"]'::jsonb,
    '1', 'Respuesta: B) Su sangre será derramada. El que derramare sangre de hombre, por el hombre su sangre será derramada (Génesis 9:6).', 4, true),

  (v_cap, '¿Qué plantó Noé después del diluvio?', 'multiple',
    '["A) Un huerto de frutas","B) Una viña","C) Trigo","D) Olivos"]'::jsonb,
    '1', 'Respuesta: B) Una viña. Comenzó Noé a labrar la tierra, y plantó una viña (Génesis 9:20).', 5, true),

  (v_cap, '¿Qué hizo Noé que causó su desnudez?', 'multiple',
    '["A) Se bañó en el río","B) Se embriagó con vino","C) Se durmió al sol","D) Se cayó al agua"]'::jsonb,
    '1', 'Respuesta: B) Se embriagó con vino. Bebió del vino, y se embriagó, y estaba descubierto en medio de su tienda (Génesis 9:21).', 6, true),

  (v_cap, '¿Quién vio la desnudez de su padre y se lo contó a sus hermanos?', 'multiple',
    '["A) Sem","B) Cam","C) Jafet","D) Set"]'::jsonb,
    '1', 'Respuesta: B) Cam. Cam, padre de Canaán, vio la desnudez de su padre, y lo dijo a sus dos hermanos (Génesis 9:22).', 7, true),

  (v_cap, '¿Qué hicieron Sem y Jafet al enterarse?', 'multiple',
    '["A) Se burlaron también","B) Cubrieron la desnudez de su padre sin mirarlo","C) Lo abandonaron","D) Lo despertaron de inmediato"]'::jsonb,
    '1', 'Respuesta: B) Cubrieron la desnudez de su padre sin mirarlo. Cubrieron la desnudez de su padre, teniendo vueltos sus rostros, y así no vieron su desnudez (Génesis 9:23).', 8, true),

  (v_cap, '¿A quién maldijo Noé al despertar de su embriaguez?', 'multiple',
    '["A) A Sem","B) A Canaán","C) A Jafet","D) A Cam directamente"]'::jsonb,
    '1', 'Respuesta: B) A Canaán. Maldito sea Canaán; siervo de siervos será a sus hermanos (Génesis 9:25).', 9, true),

  (v_cap, '¿Cuántos años vivió Noé después del diluvio?', 'multiple',
    '["A) 100 años","B) 200 años","C) 350 años","D) 500 años"]'::jsonb,
    '2', 'Respuesta: C) 350 años. Vivió Noé después del diluvio trescientos cincuenta años (Génesis 9:28).', 10, true);
END $$;

-- ===== supabase\Genesis\014_preguntas_genesis10.sql =====
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

-- ===== supabase\Genesis\015_preguntas_genesis11.sql =====
-- ============================================================
-- Migración 015: Preguntas del sistema — Génesis 11 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 11 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 11;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué querían construir los hombres cuya cúspide llegara al cielo?', 'multiple',
    '["A) Un templo","B) Una ciudad y una torre","C) Un palacio","D) Un puente"]'::jsonb,
    '1', 'Respuesta: B) Una ciudad y una torre. Edifiquémonos una ciudad y una torre, cuya cúspide llegue al cielo (Génesis 11:4).', 1, true),

  (v_cap, '¿Qué hizo Jehová para detener la construcción?', 'multiple',
    '["A) Envió fuego","B) Confundió su lengua","C) Envió una inundación","D) Los convirtió en piedra"]'::jsonb,
    '1', 'Respuesta: B) Confundió su lengua. Descendamos, y confundamos allí su lengua (Génesis 11:7).', 2, true),

  (v_cap, '¿Por qué se llamó Babel a la ciudad?', 'multiple',
    '["A) Porque allí Dios confundió el lenguaje de toda la tierra","B) Por el nombre de un rey","C) Por un río cercano","D) Por casualidad"]'::jsonb,
    '0', 'Respuesta: A) Porque allí Dios confundió el lenguaje de toda la tierra. Fue llamado el nombre de ella Babel, porque allí confundió Jehová el lenguaje de toda la tierra (Génesis 11:9).', 3, true),

  (v_cap, '¿Quién fue el padre de Abram?', 'multiple',
    '["A) Nacor","B) Taré","C) Harán","D) Set"]'::jsonb,
    '1', 'Respuesta: B) Taré. Taré engendró a Abram, a Nacor y a Harán (Génesis 11:26-27).', 4, true),

  (v_cap, '¿De dónde salió Taré con Abram y Lot?', 'multiple',
    '["A) De Egipto","B) De Ur de los caldeos","C) De Canaán","D) Solo de Harán"]'::jsonb,
    '1', 'Respuesta: B) De Ur de los caldeos. Salió con ellos de Ur de los caldeos, para ir a la tierra de Canaán (Génesis 11:31).', 5, true),

  (v_cap, '¿Quién era estéril y no tenía hijo?', 'multiple',
    '["A) Rebeca","B) Sarai","C) Raquel","D) Lea"]'::jsonb,
    '1', 'Respuesta: B) Sarai. Mas Sarai era estéril, y no tenía hijo (Génesis 11:30).', 6, true),

  (v_cap, '¿Cómo se llamaba el hijo de Harán, sobrino de Abram?', 'multiple',
    '["A) Nacor","B) Lot","C) Isaac","D) Set"]'::jsonb,
    '1', 'Respuesta: B) Lot. Harán engendró a Lot (Génesis 11:27).', 7, true),

  (v_cap, '¿Dónde murió Taré?', 'multiple',
    '["A) En Ur","B) En Harán","C) En Canaán","D) En Egipto"]'::jsonb,
    '1', 'Respuesta: B) En Harán. Murió Taré en Harán (Génesis 11:32).', 8, true),

  (v_cap, '¿Cómo se llamaba la mujer de Abram?', 'multiple',
    '["A) Rebeca","B) Sarai","C) Raquel","D) Lea"]'::jsonb,
    '1', 'Respuesta: B) Sarai. El nombre de la mujer de Abram era Sarai (Génesis 11:29).', 9, true),

  (v_cap, '¿Qué tenían en común todos los hombres de la tierra antes de Babel?', 'multiple',
    '["A) La misma religión","B) Una sola lengua y unas mismas palabras","C) El mismo rey","D) La misma ciudad"]'::jsonb,
    '1', 'Respuesta: B) Una sola lengua y unas mismas palabras. Tenía entonces toda la tierra una sola lengua y unas mismas palabras (Génesis 11:1).', 10, true);
END $$;

-- ===== supabase\Genesis\016_preguntas_genesis12.sql =====
-- ============================================================
-- Migración 016: Preguntas del sistema — Génesis 12 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 12 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 12;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué le mandó Jehová a Abram que hiciera?', 'multiple',
    '["A) Que se quedara en su tierra","B) Que se fuera de su tierra a la tierra que le mostraría","C) Que construyera un templo","D) Que se casara de nuevo"]'::jsonb,
    '1', 'Respuesta: B) Que se fuera de su tierra a la tierra que le mostraría. Vete de tu tierra... a la tierra que te mostraré (Génesis 12:1).', 1, true),

  (v_cap, '¿Qué promesa le hizo Dios a Abram?', 'multiple',
    '["A) Riquezas inmediatas","B) Hacer de él una nación grande y bendecirlo","C) Un hijo inmediato","D) Un reino en Egipto"]'::jsonb,
    '1', 'Respuesta: B) Hacer de él una nación grande y bendecirlo. Haré de ti una nación grande, y te bendeciré (Génesis 12:2).', 2, true),

  (v_cap, '¿Qué edad tenía Abram cuando salió de Harán?', 'multiple',
    '["A) 50 años","B) 75 años","C) 90 años","D) 100 años"]'::jsonb,
    '1', 'Respuesta: B) 75 años. Era Abram de edad de setenta y cinco años cuando salió de Harán (Génesis 12:4).', 3, true),

  (v_cap, '¿Por qué descendió Abram a Egipto?', 'multiple',
    '["A) Por curiosidad","B) Porque había hambre en la tierra","C) Por orden directa de Dios","D) Para comerciar"]'::jsonb,
    '1', 'Respuesta: B) Porque había hambre en la tierra. Hubo entonces hambre en la tierra, y descendió Abram a Egipto (Génesis 12:10).', 4, true),

  (v_cap, '¿Qué le pidió Abram a Sarai que dijera en Egipto?', 'multiple',
    '["A) Que era su prima","B) Que era su hermana","C) Que era su sierva","D) Que no dijera nada"]'::jsonb,
    '1', 'Respuesta: B) Que era su hermana. Di que eres mi hermana, para que me vaya bien por causa tuya (Génesis 12:13).', 5, true),

  (v_cap, '¿Qué le pasó a Faraón y su casa por causa de Sarai?', 'multiple',
    '["A) Nada en particular","B) Jehová los hirió con grandes plagas","C) Se enriquecieron","D) Se hicieron amigos de Abram"]'::jsonb,
    '1', 'Respuesta: B) Jehová los hirió con grandes plagas. Jehová hirió a Faraón y a su casa con grandes plagas (Génesis 12:17).', 6, true),

  (v_cap, '¿Quién acompañó a Abram cuando salió de Harán?', 'multiple',
    '["A) Solo Sarai","B) Sarai y Lot","C) Solo sus siervos","D) Nadie"]'::jsonb,
    '1', 'Respuesta: B) Sarai y Lot. Se fue Abram, como Jehová le dijo; y Lot fue con él (Génesis 12:4).', 7, true),

  (v_cap, '¿Dónde edificó Abram un altar después de que Jehová se le apareciera?', 'multiple',
    '["A) En Egipto","B) En Siquem, junto al encino de More","C) En Ur","D) En Harán"]'::jsonb,
    '1', 'Respuesta: B) En Siquem, junto al encino de More. Apareció Jehová a Abram... y edificó allí un altar a Jehová (Génesis 12:6-7).', 8, true),

  (v_cap, '¿Qué le dijo Jehová a Abram sobre la tierra de Canaán?', 'multiple',
    '["A) Que nunca sería suya","B) A tu descendencia daré esta tierra","C) Que debía comprarla","D) Que la compartiría con Lot"]'::jsonb,
    '1', 'Respuesta: B) A tu descendencia daré esta tierra. A tu descendencia daré esta tierra (Génesis 12:7).', 9, true),

  (v_cap, '¿Qué hizo Faraón cuando descubrió que Sarai era mujer de Abram?', 'multiple',
    '["A) Los mató","B) Le devolvió a Sarai y lo despidió con todo lo que tenía","C) Los encarceló","D) Nada en absoluto"]'::jsonb,
    '1', 'Respuesta: B) Le devolvió a Sarai y lo despidió con todo lo que tenía. Faraón dio orden a su gente acerca de Abram; y le acompañaron, y a su mujer (Génesis 12:19-20).', 10, true);
END $$;

-- ===== supabase\Genesis\017_preguntas_genesis13.sql =====
-- ============================================================
-- Migración 017: Preguntas del sistema — Génesis 13 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 13 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 13;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Por qué se separaron Abram y Lot?', 'multiple',
    '["A) Por una pelea personal","B) Porque la tierra no era suficiente para que habitasen juntos","C) Porque Dios se lo ordenó","D) Por una guerra"]'::jsonb,
    '1', 'Respuesta: B) Porque la tierra no era suficiente para que habitasen juntos. La tierra no era suficiente para que habitasen juntos, pues sus posesiones eran muchas (Génesis 13:6).', 1, true),

  (v_cap, '¿Qué región eligió Lot?', 'multiple',
    '["A) El desierto","B) La llanura del Jordán","C) Las montañas","D) Egipto"]'::jsonb,
    '1', 'Respuesta: B) La llanura del Jordán. Lot escogió para sí toda la llanura del Jordán (Génesis 13:10-11).', 2, true),

  (v_cap, '¿Dónde acampó Abram tras la separación?', 'multiple',
    '["A) En Sodoma","B) En la tierra de Canaán","C) En Egipto","D) En Harán"]'::jsonb,
    '1', 'Respuesta: B) En la tierra de Canaán. Abram acampó en la tierra de Canaán (Génesis 13:12).', 3, true),

  (v_cap, '¿Cómo eran descritos los hombres de Sodoma?', 'multiple',
    '["A) Justos","B) Malos y pecadores contra Jehová en gran manera","C) Ricos","D) Pacíficos"]'::jsonb,
    '1', 'Respuesta: B) Malos y pecadores contra Jehová en gran manera. Los hombres de Sodoma eran malos y pecadores contra Jehová en gran manera (Génesis 13:13).', 4, true),

  (v_cap, '¿Qué promesa repitió Dios a Abram después de que Lot se apartara?', 'multiple',
    '["A) Que tendría un hijo pronto","B) Que le daría toda la tierra y multiplicaría su descendencia como el polvo","C) Que Lot regresaría","D) Que sería rey"]'::jsonb,
    '1', 'Respuesta: B) Que le daría toda la tierra y multiplicaría su descendencia como el polvo. Toda la tierra que ves, la daré a ti y a tu descendencia... como el polvo de la tierra (Génesis 13:14-16).', 5, true),

  (v_cap, '¿Dónde se estableció finalmente Abram?', 'multiple',
    '["A) En Egipto","B) En el encinar de Mamre, en Hebrón","C) En Sodoma","D) En Ur"]'::jsonb,
    '1', 'Respuesta: B) En el encinar de Mamre, en Hebrón. Vino y moró en el encinar de Mamre, que está en Hebrón (Génesis 13:18).', 6, true),

  (v_cap, '¿Qué poseía Lot cuando se separó de Abram?', 'multiple',
    '["A) Solo su familia","B) Ovejas, vacas y tiendas","C) Nada","D) Solo esclavos"]'::jsonb,
    '1', 'Respuesta: B) Ovejas, vacas y tiendas. Lot, que andaba con Abram, tenía ovejas, vacas y tiendas (Génesis 13:5).', 7, true),

  (v_cap, '¿Hacia dónde fue poniendo Lot sus tiendas progresivamente?', 'multiple',
    '["A) Hacia Egipto","B) Hacia Sodoma","C) Hacia Harán","D) Hacia el desierto"]'::jsonb,
    '1', 'Respuesta: B) Hacia Sodoma. Fue poniendo sus tiendas hasta Sodoma (Génesis 13:12).', 8, true),

  (v_cap, '¿Con qué comparó Lot la llanura del Jordán?', 'multiple',
    '["A) Con el desierto","B) Con el huerto de Jehová y la tierra de Egipto","C) Con una tierra baldía","D) Con el mar"]'::jsonb,
    '1', 'Respuesta: B) Con el huerto de Jehová y la tierra de Egipto. Vio toda la llanura del Jordán... como el huerto de Jehová, como la tierra de Egipto (Génesis 13:10).', 9, true),

  (v_cap, '¿Qué construyó Abram en el encinar de Mamre?', 'multiple',
    '["A) Una casa","B) Un altar a Jehová","C) Un pozo","D) Una ciudad"]'::jsonb,
    '1', 'Respuesta: B) Un altar a Jehová. Edificó allí altar a Jehová (Génesis 13:18).', 10, true);
END $$;

-- ===== supabase\Genesis\018_preguntas_genesis14.sql =====
-- ============================================================
-- Migración 018: Preguntas del sistema — Génesis 14 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 14 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 14;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Cuántos reyes lucharon en el bando de Quedorlaomer contra Sodoma y Gomorra?', 'multiple',
    '["A) Dos","B) Tres","C) Cuatro","D) Cinco"]'::jsonb,
    '2', 'Respuesta: C) Cuatro. Cuatro reyes contra cinco (Génesis 14:9).', 1, true),

  (v_cap, '¿A quién capturaron junto con sus bienes durante esta guerra?', 'multiple',
    '["A) A Abram","B) A Lot","C) A Isaac","D) A Sarai"]'::jsonb,
    '1', 'Respuesta: B) A Lot. Tomaron también a Lot, hijo del hermano de Abram (Génesis 14:12).', 2, true),

  (v_cap, '¿Cuántos hombres armó Abram para rescatar a Lot?', 'multiple',
    '["A) 100","B) 200","C) 318","D) 500"]'::jsonb,
    '2', 'Respuesta: C) 318. Armó a sus criados, los nacidos en su casa, trescientos dieciocho (Génesis 14:14).', 3, true),

  (v_cap, '¿Quién era Melquisedec?', 'multiple',
    '["A) Un enemigo de Abram","B) Rey de Salem y sacerdote del Dios Altísimo","C) El rey de Sodoma","D) Un siervo de Abram"]'::jsonb,
    '1', 'Respuesta: B) Rey de Salem y sacerdote del Dios Altísimo. Melquisedec, rey de Salem y sacerdote del Dios Altísimo (Génesis 14:18).', 4, true),

  (v_cap, '¿Qué le dio Abram a Melquisedec?', 'multiple',
    '["A) Todo el botín","B) Los diezmos de todo","C) Nada","D) Su hijo"]'::jsonb,
    '1', 'Respuesta: B) Los diezmos de todo. Le dio Abram los diezmos de todo (Génesis 14:20).', 5, true),

  (v_cap, '¿Qué rehusó aceptar Abram del rey de Sodoma?', 'multiple',
    '["A) Los bienes recuperados, para que nadie dijera que lo enriqueció","B) La amistad","C) La paz","D) Nada, aceptó todo"]'::jsonb,
    '0', 'Respuesta: A) Los bienes recuperados, para que nadie dijera que lo enriqueció. No tomaré, para que no digas: Yo enriquecí a Abram (Génesis 14:23).', 6, true),

  (v_cap, '¿Qué le dio Melquisedec a Abram?', 'multiple',
    '["A) Oro y plata","B) Pan y vino","C) Un ejército","D) Un pacto de sangre"]'::jsonb,
    '1', 'Respuesta: B) Pan y vino. Melquisedec... sacó pan y vino (Génesis 14:18).', 7, true),

  (v_cap, '¿Hasta dónde persiguió Abram a los reyes que se llevaron a Lot?', 'multiple',
    '["A) Hasta Egipto","B) Hasta Hoba, al norte de Damasco","C) Hasta Babel","D) Hasta el mar"]'::jsonb,
    '1', 'Respuesta: B) Hasta Hoba, al norte de Damasco. Les fue siguiendo hasta Hoba al norte de Damasco (Génesis 14:15).', 8, true),

  (v_cap, '¿Qué recuperó Abram además de a Lot?', 'multiple',
    '["A) Solo las armas","B) Todos los bienes, mujeres y demás gente","C) Nada más","D) Solo el ganado"]'::jsonb,
    '1', 'Respuesta: B) Todos los bienes, mujeres y demás gente. Recobró todos los bienes, y también a Lot su pariente y sus bienes, y a las mujeres y demás gente (Génesis 14:16).', 9, true),

  (v_cap, '¿Cómo llamó Melquisedec a Dios al bendecir a Abram?', 'multiple',
    '["A) Jehová de los ejércitos","B) El Dios Altísimo, creador de los cielos y de la tierra","C) El Dios de Israel","D) El Rey eterno"]'::jsonb,
    '1', 'Respuesta: B) El Dios Altísimo, creador de los cielos y de la tierra. Bendito sea Abram del Dios Altísimo, creador de los cielos y de la tierra (Génesis 14:19).', 10, true);
END $$;

-- ===== supabase\Genesis\019_preguntas_genesis15.sql =====
-- ============================================================
-- Migración 019: Preguntas del sistema — Génesis 15 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 15 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 15;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿A quién dijo Dios que sería el heredero de Abram, en lugar de un siervo?', 'multiple',
    '["A) A un siervo nacido en su casa","B) A un hijo propio de Abram","C) A un extraño","D) A su sobrino Lot"]'::jsonb,
    '1', 'Respuesta: B) A un hijo propio de Abram. No te heredará éste, sino un hijo tuyo será el que te heredará (Génesis 15:4).', 1, true),

  (v_cap, '¿Con qué comparó Dios la descendencia de Abram?', 'multiple',
    '["A) Con la arena del mar únicamente","B) Con las estrellas del cielo","C) Con las gotas de lluvia","D) Con los peces del mar"]'::jsonb,
    '1', 'Respuesta: B) Con las estrellas del cielo. Cuenta las estrellas, si las puedes contar... así será tu descendencia (Génesis 15:5).', 2, true),

  (v_cap, '¿Qué se le contó a Abram por su fe?', 'multiple',
    '["A) Riqueza","B) Justicia","C) Sabiduría","D) Poder"]'::jsonb,
    '1', 'Respuesta: B) Justicia. Creyó a Jehová, y le fue contado por justicia (Génesis 15:6).', 3, true),

  (v_cap, '¿Cuántos años profetizó Dios que la descendencia de Abram sería esclava y oprimida?', 'multiple',
    '["A) 100 años","B) 200 años","C) 400 años","D) 500 años"]'::jsonb,
    '2', 'Respuesta: C) 400 años. Será oprimida cuatrocientos años (Génesis 15:13).', 4, true),

  (v_cap, '¿Qué animales pidió Dios que Abram trajera para el pacto?', 'multiple',
    '["A) Solo aves","B) Una becerra, una cabra, un carnero, una tórtola y un palomino","C) Solo ovejas","D) Ningún animal"]'::jsonb,
    '1', 'Respuesta: B) Una becerra, una cabra, un carnero, una tórtola y un palomino. Tráeme una becerra... una cabra... un carnero... una tórtola también, y un palomino (Génesis 15:9).', 5, true),

  (v_cap, '¿Qué hizo Abram con las aves de rapiña que descendían sobre los animales partidos?', 'multiple',
    '["A) Las dejó comer","B) Las ahuyentaba","C) No pasó nada, se fueron solas","D) Se convirtieron en fuego"]'::jsonb,
    '1', 'Respuesta: B) Las ahuyentaba. Descendían aves de rapiña sobre los cuerpos muertos, y Abram las ahuyentaba (Génesis 15:11).', 6, true),

  (v_cap, '¿Qué vio Abram pasar entre los animales divididos al anochecer?', 'multiple',
    '["A) Un ángel","B) Un horno humeando y una antorcha de fuego","C) Una nube","D) Un río de sangre"]'::jsonb,
    '1', 'Respuesta: B) Un horno humeando y una antorcha de fuego. Se veía un horno humeando, y una antorcha de fuego que pasaba por entre los animales divididos (Génesis 15:17).', 7, true),

  (v_cap, '¿Hasta qué río prometió Dios dar la tierra a la descendencia de Abram?', 'multiple',
    '["A) El Jordán","B) Desde el río de Egipto hasta el río Éufrates","C) El Nilo","D) El mar Rojo"]'::jsonb,
    '1', 'Respuesta: B) Desde el río de Egipto hasta el río Éufrates. A tu descendencia daré esta tierra, desde el río de Egipto hasta el río grande, el río Éufrates (Génesis 15:18).', 8, true),

  (v_cap, '¿Qué le prometió Dios a Abram al inicio del capítulo?', 'multiple',
    '["A) Un ejército","B) No temas, yo soy tu escudo y tu galardón será grande","C) Una ciudad","D) Una esposa"]'::jsonb,
    '1', 'Respuesta: B) No temas, yo soy tu escudo y tu galardón será grande. No temas, Abram; yo soy tu escudo, y tu galardón será sobremanera grande (Génesis 15:1).', 9, true),

  (v_cap, '¿A quién describió Abram como su posible heredero antes de la promesa de un hijo propio?', 'multiple',
    '["A) A su hijo Isaac","B) Al mayordomo de su casa, Eliezer","C) A su sobrino Lot","D) A su hermano"]'::jsonb,
    '1', 'Respuesta: B) Al mayordomo de su casa, Eliezer. El mayordomo de mi casa es ese damasceno Eliezer (Génesis 15:2).', 10, true);
END $$;

-- ===== supabase\Genesis\020_preguntas_genesis16.sql =====
-- ============================================================
-- Migración 020: Preguntas del sistema — Génesis 16 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 16 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 16;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Quién era Agar?', 'multiple',
    '["A) La hermana de Sarai","B) Una sierva egipcia de Sarai","C) La hija de Abram","D) Una reina"]'::jsonb,
    '1', 'Respuesta: B) Una sierva egipcia de Sarai. Sarai... tenía una sierva egipcia, que se llamaba Agar (Génesis 16:1).', 1, true),

  (v_cap, '¿Por qué Sarai le dio Agar a Abram por mujer?', 'multiple',
    '["A) Para que Agar tuviera libertad","B) Porque Sarai era estéril y quería tener hijos por medio de ella","C) Por orden de Dios","D) Por accidente"]'::jsonb,
    '1', 'Respuesta: B) Porque Sarai era estéril y quería tener hijos por medio de ella. Jehová me ha hecho estéril; te ruego, pues, que te llegues a mi sierva (Génesis 16:2).', 2, true),

  (v_cap, '¿Qué hizo Agar cuando concibió?', 'multiple',
    '["A) Se sometió aún más a Sarai","B) Miraba con desprecio a su señora","C) Huyó de inmediato sin razón","D) Se casó con otro hombre"]'::jsonb,
    '1', 'Respuesta: B) Miraba con desprecio a su señora. Cuando vio que había concebido, miraba con desprecio a su señora (Génesis 16:4).', 3, true),

  (v_cap, '¿Quién encontró a Agar en el desierto?', 'multiple',
    '["A) Abram","B) El ángel de Jehová","C) Sarai","D) Un extraño"]'::jsonb,
    '1', 'Respuesta: B) El ángel de Jehová. La halló el ángel de Jehová junto a una fuente de agua en el desierto (Génesis 16:7).', 4, true),

  (v_cap, '¿Qué nombre le dijo el ángel a Agar que debía poner a su hijo?', 'multiple',
    '["A) Isaac","B) Ismael","C) Esaú","D) Jacob"]'::jsonb,
    '1', 'Respuesta: B) Ismael. Llamarás su nombre Ismael, porque Jehová ha oído tu aflicción (Génesis 16:11).', 5, true),

  (v_cap, '¿Qué significa el nombre Ismael según el propio texto?', 'multiple',
    '["A) Dios ríe","B) Porque Jehová ha oído tu aflicción","C) Hijo de la promesa","D) El elegido"]'::jsonb,
    '1', 'Respuesta: B) Porque Jehová ha oído tu aflicción. Llamarás su nombre Ismael, porque Jehová ha oído tu aflicción (Génesis 16:11).', 6, true),

  (v_cap, '¿Cómo describió el ángel que sería Ismael?', 'multiple',
    '["A) Manso y pacífico","B) Hombre fiero, su mano contra todos","C) Sabio y rico","D) Sacerdote"]'::jsonb,
    '1', 'Respuesta: B) Hombre fiero, su mano contra todos. Él será hombre fiero; su mano será contra todos, y la mano de todos contra él (Génesis 16:12).', 7, true),

  (v_cap, '¿Qué edad tenía Abram cuando nació Ismael?', 'multiple',
    '["A) 75 años","B) 86 años","C) 99 años","D) 100 años"]'::jsonb,
    '1', 'Respuesta: B) 86 años. Era Abram de edad de ochenta y seis años, cuando Agar dio a luz a Ismael (Génesis 16:16).', 8, true),

  (v_cap, '¿Qué le mandó el ángel a Agar que hiciera?', 'multiple',
    '["A) Que huyera lejos","B) Que volviera a su señora y se sometiera","C) Que se quedara en el desierto","D) Que fuera a Egipto"]'::jsonb,
    '1', 'Respuesta: B) Que volviera a su señora y se sometiera. Vuélvete a tu señora, y ponte sumisa bajo su mano (Génesis 16:9).', 9, true),

  (v_cap, '¿Cómo llamó Agar a Dios después de este encuentro?', 'multiple',
    '["A) El Dios que provee","B) El Dios que ve","C) El Dios altísimo","D) El Dios eterno"]'::jsonb,
    '1', 'Respuesta: B) El Dios que ve. Llamó el nombre de Jehová que con ella hablaba: Tú eres Dios que ve (Génesis 16:13).', 10, true);
END $$;

-- ===== supabase\Genesis\021_preguntas_genesis17.sql =====
-- ============================================================
-- Migración 021: Preguntas del sistema — Génesis 17 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 17 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 17;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué nuevo nombre le dio Dios a Abram?', 'multiple',
    '["A) Israel","B) Abraham","C) Isaac","D) Emanuel"]'::jsonb,
    '1', 'Respuesta: B) Abraham. No se llamará más tu nombre Abram, sino... Abraham (Génesis 17:5).', 1, true),

  (v_cap, '¿Qué nuevo nombre le dio Dios a Sarai?', 'multiple',
    '["A) Rebeca","B) Sara","C) Raquel","D) Débora"]'::jsonb,
    '1', 'Respuesta: B) Sara. A Sarai tu mujer no la llamarás Sarai, mas Sara será su nombre (Génesis 17:15).', 2, true),

  (v_cap, '¿Qué señal del pacto estableció Dios con Abraham?', 'multiple',
    '["A) El arco iris","B) La circuncisión","C) El sábado","D) El sacrificio de animales"]'::jsonb,
    '1', 'Respuesta: B) La circuncisión. Será circuncidado todo varón de entre vosotros (Génesis 17:10).', 3, true),

  (v_cap, '¿A qué edad debía circuncidarse a los varones?', 'multiple',
    '["A) Al nacer","B) A los ocho días","C) A los treinta días","D) A los doce años"]'::jsonb,
    '1', 'Respuesta: B) A los ocho días. De edad de ocho días será circuncidado todo varón (Génesis 17:12).', 4, true),

  (v_cap, '¿Qué edad tenía Abraham cuando Dios le prometió un hijo con Sara?', 'multiple',
    '["A) 75 años","B) 99 años","C) 110 años","D) 120 años"]'::jsonb,
    '1', 'Respuesta: B) 99 años. Era Abram de edad de noventa y nueve años, cuando le apareció Jehová (Génesis 17:1).', 5, true),

  (v_cap, '¿Qué nombre debía tener el hijo prometido a Sara?', 'multiple',
    '["A) Ismael","B) Isaac","C) Jacob","D) Set"]'::jsonb,
    '1', 'Respuesta: B) Isaac. Llamarás su nombre Isaac (Génesis 17:19).', 6, true),

  (v_cap, '¿Qué hizo Abraham al escuchar la promesa de un hijo con Sara?', 'multiple',
    '["A) Lloró de tristeza","B) Se rió, dudando","C) Se enojó","D) No dijo nada"]'::jsonb,
    '1', 'Respuesta: B) Se rió, dudando. Abraham se postró sobre su rostro, y se rió (Génesis 17:17).', 7, true),

  (v_cap, '¿Qué pidió Abraham a Dios por Ismael?', 'multiple',
    '["A) Que fuera desheredado","B) Que viviera delante de Dios","C) Que muriera pronto","D) Que se fuera lejos"]'::jsonb,
    '1', 'Respuesta: B) Que viviera delante de Dios. Dijo Abraham a Dios: Ojalá Ismael viva delante de ti (Génesis 17:18).', 8, true),

  (v_cap, '¿Qué prometió Dios sobre Ismael, aunque el pacto sería con Isaac?', 'multiple',
    '["A) Nada en especial","B) Que lo bendeciría, haciéndolo padre de doce príncipes y una gran nación","C) Que sería maldito","D) Que sería esclavo"]'::jsonb,
    '1', 'Respuesta: B) Que lo bendeciría, haciéndolo padre de doce príncipes y una gran nación. Le bendeciré, y le haré fructificar y multiplicar... doce príncipes engendrará (Génesis 17:20).', 9, true),

  (v_cap, '¿Quiénes fueron circuncidados el mismo día que Abraham?', 'multiple',
    '["A) Solo Isaac","B) Ismael y todos los varones de su casa","C) Nadie más","D) Solo los siervos comprados"]'::jsonb,
    '1', 'Respuesta: B) Ismael y todos los varones de su casa. En el mismo día fueron circuncidados Abraham e Ismael su hijo (Génesis 17:26).', 10, true);
END $$;

-- ===== supabase\Genesis\022_preguntas_genesis18.sql =====
-- ============================================================
-- Migración 022: Preguntas del sistema — Génesis 18 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 18 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 18;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Cuántos varones se le aparecieron a Abraham en el encinar de Mamre?', 'multiple',
    '["A) Uno","B) Dos","C) Tres","D) Cuatro"]'::jsonb,
    '2', 'Respuesta: C) Tres. He aquí tres varones que estaban junto a él (Génesis 18:2).', 1, true),

  (v_cap, '¿Qué preparó Abraham para sus visitantes?', 'multiple',
    '["A) Solo agua","B) Pan, un becerro, mantequilla y leche","C) Nada, los ignoró","D) Solo vino"]'::jsonb,
    '1', 'Respuesta: B) Pan, un becerro, mantequilla y leche. Tomó también mantequilla y leche, y el becerro que había preparado (Génesis 18:8).', 2, true),

  (v_cap, '¿Qué le prometieron a Abraham sobre Sara?', 'multiple',
    '["A) Que moriría pronto","B) Que tendría un hijo según el tiempo de la vida","C) Que sería estéril para siempre","D) Que se iría de la tierra"]'::jsonb,
    '1', 'Respuesta: B) Que tendría un hijo según el tiempo de la vida. Según el tiempo de la vida, he aquí que Sara tu mujer tendrá un hijo (Génesis 18:10).', 3, true),

  (v_cap, '¿Qué hizo Sara al escuchar la promesa de un hijo?', 'multiple',
    '["A) Lloró","B) Se rió","C) Se enojó","D) No dijo nada"]'::jsonb,
    '1', 'Respuesta: B) Se rió. Se rió, pues, Sara entre sí (Génesis 18:12).', 4, true),

  (v_cap, '¿Qué pregunta retórica hizo Jehová sobre la duda de Sara?', 'multiple',
    '["A) ¿Por qué te ríes?","B) ¿Hay para Dios alguna cosa difícil?","C) ¿Quién eres tú?","D) ¿Dónde está tu esposo?"]'::jsonb,
    '1', 'Respuesta: B) ¿Hay para Dios alguna cosa difícil?. ¿Hay para Dios alguna cosa difícil? (Génesis 18:14).', 5, true),

  (v_cap, '¿Por qué quiso Dios revelarle a Abraham lo que iba a hacer con Sodoma?', 'multiple',
    '["A) Porque Lot vivía allí solamente","B) Porque Abraham sería una nación grande y bendeciría a todas las naciones","C) Por casualidad","D) Porque Abraham lo exigió"]'::jsonb,
    '1', 'Respuesta: B) Porque Abraham sería una nación grande y bendeciría a todas las naciones. Habiendo de ser Abraham una nación grande y fuerte, y habiendo de ser benditas en él todas las naciones (Génesis 18:18).', 6, true),

  (v_cap, '¿Con cuántos justos comenzó Abraham a negociar por Sodoma?', 'multiple',
    '["A) Diez","B) Veinte","C) Cincuenta","D) Cien"]'::jsonb,
    '2', 'Respuesta: C) Cincuenta. Quizá haya cincuenta justos dentro de la ciudad (Génesis 18:24).', 7, true),

  (v_cap, '¿En cuántos justos terminó la negociación de Abraham con Dios?', 'multiple',
    '["A) Cinco","B) Diez","C) Veinte","D) Treinta"]'::jsonb,
    '1', 'Respuesta: B) Diez. No la destruiré, respondió, por amor a los diez (Génesis 18:32).', 8, true),

  (v_cap, '¿Qué actitud mostró Abraham al negociar con Dios?', 'multiple',
    '["A) Exigencia","B) Humildad, reconociéndose polvo y ceniza","C) Indiferencia","D) Ira"]'::jsonb,
    '1', 'Respuesta: B) Humildad, reconociéndose polvo y ceniza. He comenzado a hablar a mi Señor, aunque soy polvo y ceniza (Génesis 18:27).', 9, true),

  (v_cap, '¿Qué había aumentado en Sodoma y Gomorra según Jehová?', 'multiple',
    '["A) La pobreza","B) El clamor y el pecado se había agravado en extremo","C) Solo la idolatría","D) La guerra"]'::jsonb,
    '1', 'Respuesta: B) El clamor y el pecado se había agravado en extremo. El clamor contra Sodoma y Gomorra se aumenta más y más, y el pecado de ellos se ha agravado en extremo (Génesis 18:20).', 10, true);
END $$;

-- ===== supabase\Genesis\023_preguntas_genesis19.sql =====
-- ============================================================
-- Migración 023: Preguntas del sistema — Génesis 19 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 19 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 19;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Quién recibió a los dos ángeles en la puerta de Sodoma?', 'multiple',
    '["A) Abraham","B) Lot","C) Un extraño","D) El rey de Sodoma"]'::jsonb,
    '1', 'Respuesta: B) Lot. Lot estaba sentado a la puerta de Sodoma. Y viéndolos Lot, se levantó a recibirlos (Génesis 19:1).', 1, true),

  (v_cap, '¿Qué querían hacer los hombres de Sodoma con los visitantes de Lot?', 'multiple',
    '["A) Darles la bienvenida","B) Abusar de ellos","C) Matarlos con espadas","D) Ignorarlos"]'::jsonb,
    '1', 'Respuesta: B) Abusar de ellos. Sácalos, para que los conozcamos (Génesis 19:5).', 2, true),

  (v_cap, '¿Qué les pasó a los hombres que intentaron entrar por la fuerza en casa de Lot?', 'multiple',
    '["A) Fueron perdonados","B) Fueron heridos con ceguera","C) Huyeron por su cuenta","D) Se convirtieron en sal"]'::jsonb,
    '1', 'Respuesta: B) Fueron heridos con ceguera. A los hombres que estaban a la puerta de la casa hirieron con ceguera (Génesis 19:11).', 3, true),

  (v_cap, '¿Qué ciudad se salvó a petición de Lot?', 'multiple',
    '["A) Sodoma","B) Gomorra","C) Zoar","D) Adma"]'::jsonb,
    '2', 'Respuesta: C) Zoar. Por eso fue llamado el nombre de la ciudad, Zoar (Génesis 19:22).', 4, true),

  (v_cap, '¿Qué le pasó a la mujer de Lot?', 'multiple',
    '["A) Murió en el fuego","B) Se convirtió en estatua de sal por mirar atrás","C) Escapó sin problemas","D) Se quedó en Sodoma"]'::jsonb,
    '1', 'Respuesta: B) Se convirtió en estatua de sal por mirar atrás. La mujer de Lot miró atrás... y se volvió estatua de sal (Génesis 19:26).', 5, true),

  (v_cap, '¿Con qué destruyó Jehová Sodoma y Gomorra?', 'multiple',
    '["A) Con un terremoto","B) Con azufre y fuego desde los cielos","C) Con una inundación","D) Con una plaga"]'::jsonb,
    '1', 'Respuesta: B) Con azufre y fuego desde los cielos. Jehová hizo llover sobre Sodoma y sobre Gomorra azufre y fuego... desde los cielos (Génesis 19:24).', 6, true),

  (v_cap, '¿Quiénes se quedaron con Lot tras la destrucción?', 'multiple',
    '["A) Su esposa","B) Sus dos hijas","C) Sus yernos","D) Nadie"]'::jsonb,
    '1', 'Respuesta: B) Sus dos hijas. Lot subió de Zoar y moró en el monte, y sus dos hijas con él (Génesis 19:30).', 7, true),

  (v_cap, '¿Qué hicieron las hijas de Lot en la cueva?', 'multiple',
    '["A) Se casaron con extranjeros","B) Dieron de beber vino a su padre y concibieron de él","C) Murieron allí","D) Se fueron a Egipto"]'::jsonb,
    '1', 'Respuesta: B) Dieron de beber vino a su padre y concibieron de él. Dieron a beber vino a su padre... y las dos hijas de Lot concibieron de su padre (Génesis 19:33-36).', 8, true),

  (v_cap, '¿Qué nombre recibió el hijo de la hija mayor de Lot, padre de los moabitas?', 'multiple',
    '["A) Ben-ammi","B) Moab","C) Zoar","D) Edom"]'::jsonb,
    '1', 'Respuesta: B) Moab. Llamó su nombre Moab, el cual es padre de los moabitas hasta hoy (Génesis 19:37).', 9, true),

  (v_cap, '¿Qué nombre recibió el hijo de la hija menor, padre de los amonitas?', 'multiple',
    '["A) Moab","B) Ben-ammi","C) Zoar","D) Edom"]'::jsonb,
    '1', 'Respuesta: B) Ben-ammi. Llamó su nombre Ben-ammi, el cual es padre de los amonitas hasta hoy (Génesis 19:38).', 10, true);
END $$;

-- ===== supabase\Genesis\024_preguntas_genesis20.sql =====
-- ============================================================
-- Migración 024: Preguntas del sistema — Génesis 20 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 20 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 20;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué dijo Abraham sobre Sara ante Abimelec, rey de Gerar?', 'multiple',
    '["A) Que era su esposa","B) Que era su hermana","C) Que era su sierva","D) No dijo nada"]'::jsonb,
    '1', 'Respuesta: B) Que era su hermana. Dijo Abraham de Sara su mujer: Es mi hermana (Génesis 20:2).', 1, true),

  (v_cap, '¿Cómo advirtió Dios a Abimelec sobre Sara?', 'multiple',
    '["A) Con una plaga inmediata","B) En sueños de noche","C) Con un ángel visible","D) Con un profeta"]'::jsonb,
    '1', 'Respuesta: B) En sueños de noche. Dios vino a Abimelec en sueños de noche (Génesis 20:3).', 2, true),

  (v_cap, '¿Por qué Dios no permitió que Abimelec tocara a Sara?', 'multiple',
    '["A) Por casualidad","B) Porque Dios lo detuvo de pecar contra él","C) Porque Abimelec se negó","D) Porque Sara huyó"]'::jsonb,
    '1', 'Respuesta: B) Porque Dios lo detuvo de pecar contra él. Yo también te detuve de pecar contra mí (Génesis 20:6).', 3, true),

  (v_cap, '¿Qué le pidió Dios a Abimelec que hiciera para vivir?', 'multiple',
    '["A) Que se fuera de la tierra","B) Que devolviera la mujer a su marido","C) Que se casara con Sara","D) Que diera un sacrificio"]'::jsonb,
    '1', 'Respuesta: B) Que devolviera la mujer a su marido. Devuelve la mujer a su marido; porque es profeta, y orará por ti, y vivirás (Génesis 20:7).', 4, true),

  (v_cap, '¿Qué le dio Abimelec a Abraham tras el incidente?', 'multiple',
    '["A) Nada","B) Ovejas, vacas, siervos y siervas","C) Solo dinero","D) Una ciudad"]'::jsonb,
    '1', 'Respuesta: B) Ovejas, vacas, siervos y siervas. Abimelec tomó ovejas y vacas, y siervos y siervas, y se los dio a Abraham (Génesis 20:14).', 5, true),

  (v_cap, '¿Qué era Sara realmente en relación a Abraham, según él mismo explicó?', 'multiple',
    '["A) No tenían relación","B) Su hermana de padre, no de madre","C) Su prima","D) Su cuñada"]'::jsonb,
    '1', 'Respuesta: B) Su hermana de padre, no de madre. También es mi hermana, hija de mi padre, mas no hija de mi madre (Génesis 20:12).', 6, true),

  (v_cap, '¿Qué hizo Abraham por Abimelec y su casa al final?', 'multiple',
    '["A) Los maldijo","B) Oró a Dios y Dios los sanó","C) Los ignoró","D) Se fue sin decir nada"]'::jsonb,
    '1', 'Respuesta: B) Oró a Dios y Dios los sanó. Abraham oró a Dios; y Dios sanó a Abimelec y a su mujer (Génesis 20:17).', 7, true),

  (v_cap, '¿Qué había hecho Jehová a la casa de Abimelec antes de que Abraham orara?', 'multiple',
    '["A) Los había bendecido con hijos","B) Había cerrado toda matriz de la casa de Abimelec","C) Los había hecho ricos","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Había cerrado toda matriz de la casa de Abimelec. Jehová había cerrado completamente toda matriz de la casa de Abimelec (Génesis 20:18).', 8, true),

  (v_cap, '¿Qué le dio Abimelec a Sara como velo para los ojos?', 'multiple',
    '["A) Oro","B) Mil monedas de plata","C) Un vestido","D) Una casa"]'::jsonb,
    '1', 'Respuesta: B) Mil monedas de plata. He aquí he dado mil monedas de plata a tu hermano (Génesis 20:16).', 9, true),

  (v_cap, '¿Dónde habitaba Abraham cuando ocurrió este episodio?', 'multiple',
    '["A) En Egipto","B) Como forastero en Gerar","C) En Sodoma","D) En Ur"]'::jsonb,
    '1', 'Respuesta: B) Como forastero en Gerar. Habitó como forastero en Gerar (Génesis 20:1).', 10, true);
END $$;

-- ===== supabase\Genesis\025_preguntas_genesis21.sql =====
-- ============================================================
-- Migración 025: Preguntas del sistema — Génesis 21 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 21 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 21;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué edad tenía Abraham cuando nació Isaac?', 'multiple',
    '["A) Noventa años","B) Cien años","C) Ciento diez años","D) Ciento veinte años"]'::jsonb,
    '1', 'Respuesta: B) Cien años. Era Abraham de cien años cuando nació Isaac su hijo (Génesis 21:5).', 1, true),

  (v_cap, '¿Por qué Sara pidió que Agar e Ismael fueran expulsados?', 'multiple',
    '["A) Porque no le agradaban","B) Porque vio al hijo de Agar burlándose de Isaac","C) Por orden directa de Dios","D) Porque Ismael la insultó"]'::jsonb,
    '1', 'Respuesta: B) Porque vio al hijo de Agar burlándose de Isaac. Vio Sara que el hijo de Agar... se burlaba de su hijo Isaac (Génesis 21:9).', 2, true),

  (v_cap, '¿Qué le dijo Dios a Abraham sobre expulsar a Agar e Ismael?', 'multiple',
    '["A) Que no lo hiciera","B) Que oyera la voz de Sara, pues en Isaac sería llamada su descendencia","C) Que era un pecado","D) Nada en particular"]'::jsonb,
    '1', 'Respuesta: B) Que oyera la voz de Sara, pues en Isaac sería llamada su descendencia. En todo lo que te dijere Sara, oye su voz, porque en Isaac te será llamada descendencia (Génesis 21:12).', 3, true),

  (v_cap, '¿Qué le pasó a Agar e Ismael en el desierto?', 'multiple',
    '["A) Murieron de sed","B) Se les acabó el agua, pero Dios abrió los ojos de Agar y vio una fuente","C) Fueron capturados","D) Regresaron con Abraham"]'::jsonb,
    '1', 'Respuesta: B) Se les acabó el agua, pero Dios abrió los ojos de Agar y vio una fuente. Dios le abrió los ojos, y vio una fuente de agua (Génesis 21:19).', 4, true),

  (v_cap, '¿En qué se convirtió Ismael de adulto?', 'multiple',
    '["A) Sacerdote","B) Tirador de arco, habitante del desierto","C) Rey","D) Comerciante"]'::jsonb,
    '1', 'Respuesta: B) Tirador de arco, habitante del desierto. Creció, y habitó en el desierto, y fue tirador de arco (Génesis 21:20).', 5, true),

  (v_cap, '¿Qué pacto hizo Abraham con Abimelec sobre un pozo de agua?', 'multiple',
    '["A) Ninguno","B) Abraham dio siete corderas como testimonio de que él cavó el pozo","C) Pelearon por el pozo","D) Abimelec se quedó con el pozo"]'::jsonb,
    '1', 'Respuesta: B) Abraham dio siete corderas como testimonio de que él cavó el pozo. Estas siete corderas tomarás de mi mano, para que me sirvan de testimonio de que yo cavé este pozo (Génesis 21:30).', 6, true),

  (v_cap, '¿Cómo se llamó el lugar donde Abraham y Abimelec hicieron el pacto?', 'multiple',
    '["A) Bet-el","B) Beerseba","C) Sodoma","D) Harán"]'::jsonb,
    '1', 'Respuesta: B) Beerseba. Por esto llamó a aquel lugar Beerseba; porque allí juraron ambos (Génesis 21:31).', 7, true),

  (v_cap, '¿A qué edad circuncidó Abraham a Isaac?', 'multiple',
    '["A) A los treinta días","B) A los ocho días, como Dios había mandado","C) Al nacer","D) Nunca"]'::jsonb,
    '1', 'Respuesta: B) A los ocho días, como Dios había mandado. Circuncidó Abraham a su hijo Isaac de ocho días (Génesis 21:4).', 8, true),

  (v_cap, '¿Qué plantó Abraham en Beerseba?', 'multiple',
    '["A) Una viña","B) Un árbol tamarisco","C) Un huerto","D) Trigo"]'::jsonb,
    '1', 'Respuesta: B) Un árbol tamarisco. Plantó Abraham un árbol tamarisco en Beerseba (Génesis 21:33).', 9, true),

  (v_cap, '¿Qué dijo Sara que Dios le había hecho?', 'multiple',
    '["A) Llorar","B) Reír, y quien lo oyere se reirá con ella","C) Enfermar","D) Envejecer"]'::jsonb,
    '1', 'Respuesta: B) Reír, y quien lo oyere se reirá con ella. Dios me ha hecho reír, y cualquiera que lo oyere, se reirá conmigo (Génesis 21:6).', 10, true);
END $$;

-- ===== supabase\Genesis\026_preguntas_genesis22.sql =====
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

-- ===== supabase\Genesis\027_preguntas_genesis23.sql =====
-- ============================================================
-- Migración 027: Preguntas del sistema — Génesis 23 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 23 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 23;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Cuántos años vivió Sara?', 'multiple',
    '["A) Cien años","B) Ciento veintisiete años","C) Ciento cincuenta años","D) Doscientos años"]'::jsonb,
    '1', 'Respuesta: B) Ciento veintisiete años. Fue la vida de Sara ciento veintisiete años (Génesis 23:1).', 1, true),

  (v_cap, '¿Dónde murió Sara?', 'multiple',
    '["A) En Egipto","B) En Quiriat-arba, que es Hebrón","C) En Harán","D) En Beerseba"]'::jsonb,
    '1', 'Respuesta: B) En Quiriat-arba, que es Hebrón. Murió Sara en Quiriat-arba, que es Hebrón (Génesis 23:2).', 2, true),

  (v_cap, '¿A quién le compró Abraham la cueva de Macpela?', 'multiple',
    '["A) A Melquisedec","B) A Efrón heteo","C) A Abimelec","D) A Labán"]'::jsonb,
    '1', 'Respuesta: B) A Efrón heteo. Para que me dé la cueva de Macpela... respondió Efrón heteo a Abraham (Génesis 23:9-10).', 3, true),

  (v_cap, '¿Cuánto pagó Abraham por el campo y la cueva?', 'multiple',
    '["A) Cien siclos de plata","B) Cuatrocientos siclos de plata","C) Mil monedas de plata","D) Se la regalaron"]'::jsonb,
    '1', 'Respuesta: B) Cuatrocientos siclos de plata. Pesó Abraham a Efrón el dinero... cuatrocientos siclos de plata (Génesis 23:16).', 4, true),

  (v_cap, '¿Para qué quería Abraham la cueva de Macpela?', 'multiple',
    '["A) Para vivir en ella","B) Como posesión de sepultura para su muerta","C) Para guardar tesoros","D) Para un altar"]'::jsonb,
    '1', 'Respuesta: B) Como posesión de sepultura para su muerta. Dadme propiedad para sepultura entre vosotros (Génesis 23:4).', 5, true),

  (v_cap, '¿Cómo se presentó Abraham ante los hijos de Het?', 'multiple',
    '["A) Como su rey","B) Como extranjero y forastero entre ellos","C) Como su enemigo","D) Como su sacerdote"]'::jsonb,
    '1', 'Respuesta: B) Como extranjero y forastero entre ellos. Extranjero y forastero soy entre vosotros (Génesis 23:4).', 6, true),

  (v_cap, '¿Qué le ofrecieron primero los hijos de Het a Abraham?', 'multiple',
    '["A) Nada","B) Que sepultara a su muerta en lo mejor de sus sepulcros, gratis","C) Un precio muy alto","D) Rechazaron ayudarlo"]'::jsonb,
    '1', 'Respuesta: B) Que sepultara a su muerta en lo mejor de sus sepulcros, gratis. En lo mejor de nuestros sepulcros sepulta a tu muerta (Génesis 23:6).', 7, true),

  (v_cap, '¿Dónde estaba ubicada la heredad de Efrón?', 'multiple',
    '["A) En Macpela, al oriente de Mamre","B) En Egipto","C) En Harán","D) En Sodoma"]'::jsonb,
    '0', 'Respuesta: A) En Macpela, al oriente de Mamre. La heredad de Efrón que estaba en Macpela al oriente de Mamre (Génesis 23:17).', 8, true),

  (v_cap, '¿Quién era Efrón?', 'multiple',
    '["A) Un rey","B) Un heteo, hijo de Zohar","C) Un siervo de Abraham","D) El hermano de Sara"]'::jsonb,
    '1', 'Respuesta: B) Un heteo, hijo de Zohar. Efrón heteo... Efrón hijo de Zohar (Génesis 23:8,10).', 9, true),

  (v_cap, '¿Qué compró Abraham junto con la cueva?', 'multiple',
    '["A) Solo la cueva","B) El campo y todos los árboles en él","C) Una ciudad","D) Ganado"]'::jsonb,
    '1', 'Respuesta: B) El campo y todos los árboles en él. La heredad con la cueva... y todos los árboles que había en la heredad (Génesis 23:17).', 10, true);
END $$;

-- ===== supabase\Genesis\028_preguntas_genesis24.sql =====
-- ============================================================
-- Migración 028: Preguntas del sistema — Génesis 24 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 24 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 24;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿A quién envió Abraham a buscar esposa para Isaac?', 'multiple',
    '["A) A su hijo mayor","B) A su criado más viejo","C) A Lot","D) A un desconocido"]'::jsonb,
    '1', 'Respuesta: B) A su criado más viejo. Dijo Abraham a un criado suyo, el más viejo de su casa (Génesis 24:2).', 1, true),

  (v_cap, '¿Qué juramento le pidió Abraham a su criado?', 'multiple',
    '["A) Que no tomara mujer cananea para Isaac","B) Que se casara él mismo con Rebeca","C) Que se quedara en Harán","D) Que trajera oro"]'::jsonb,
    '0', 'Respuesta: A) Que no tomara mujer cananea para Isaac. No tomarás para mi hijo mujer de las hijas de los cananeos (Génesis 24:3).', 2, true),

  (v_cap, '¿Cómo supo el criado que Rebeca era la elegida?', 'multiple',
    '["A) Por su belleza únicamente","B) Porque ella ofreció dar de beber a él y a sus camellos, como había pedido en oración","C) Porque Labán se lo dijo","D) Por un sueño"]'::jsonb,
    '1', 'Respuesta: B) Porque ella ofreció dar de beber a él y a sus camellos, como había pedido en oración. Sea, pues, que la doncella a quien yo dijere... y ella respondiere: Bebe (Génesis 24:14,45-46).', 3, true),

  (v_cap, '¿De quién era hija Rebeca?', 'multiple',
    '["A) De Labán","B) De Betuel, hijo de Nacor y Milca","C) De Lot","D) De Nacor directamente"]'::jsonb,
    '1', 'Respuesta: B) De Betuel, hijo de Nacor y Milca. Rebeca, que había nacido a Betuel, hijo de Milca mujer de Nacor (Génesis 24:15).', 4, true),

  (v_cap, '¿Qué regalos dio el criado a Rebeca?', 'multiple',
    '["A) Nada","B) Un pendiente de oro y dos brazaletes","C) Un vestido","D) Una casa"]'::jsonb,
    '1', 'Respuesta: B) Un pendiente de oro y dos brazaletes. Le dio el hombre un pendiente de oro... y dos brazaletes (Génesis 24:22).', 5, true),

  (v_cap, '¿Quién era el hermano de Rebeca?', 'multiple',
    '["A) Betuel","B) Labán","C) Nacor","D) Harán"]'::jsonb,
    '1', 'Respuesta: B) Labán. Rebeca tenía un hermano que se llamaba Labán (Génesis 24:29).', 6, true),

  (v_cap, '¿Aceptó Rebeca ir con el criado de inmediato?', 'multiple',
    '["A) No, se negó","B) Sí, cuando le preguntaron respondió: Sí, iré","C) Se fue sin que nadie preguntara","D) Su padre la obligó"]'::jsonb,
    '1', 'Respuesta: B) Sí, cuando le preguntaron respondió: Sí, iré. Llamaron a Rebeca, y le dijeron: ¿Irás tú con este varón? Y ella respondió: Sí, iré (Génesis 24:58).', 7, true),

  (v_cap, '¿A quién amó Isaac cuando la vio por primera vez?', 'multiple',
    '["A) A Rebeca, tomándola por mujer","B) A otra mujer","C) A nadie","D) A la nodriza"]'::jsonb,
    '0', 'Respuesta: A) A Rebeca, tomándola por mujer. Tomó a Rebeca por mujer, y la amó (Génesis 24:67).', 8, true),

  (v_cap, '¿Dónde se encontró el criado con Rebeca?', 'multiple',
    '["A) En una ciudad","B) Junto a un pozo de agua","C) En el templo","D) En el campo"]'::jsonb,
    '1', 'Respuesta: B) Junto a un pozo de agua. He aquí yo estoy junto a la fuente de agua (Génesis 24:13).', 9, true),

  (v_cap, '¿Cómo se consoló Isaac tras la muerte de su madre?', 'multiple',
    '["A) Con riquezas","B) Con el amor de Rebeca","C) No se consoló nunca","D) Viajando"]'::jsonb,
    '1', 'Respuesta: B) Con el amor de Rebeca. Se consoló Isaac después de la muerte de su madre (Génesis 24:67).', 10, true);
END $$;

-- ===== supabase\Genesis\029_preguntas_genesis25.sql =====
-- ============================================================
-- Migración 029: Preguntas del sistema — Génesis 25 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 25 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 25;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Cuántos años vivió Abraham?', 'multiple',
    '["A) Ciento cincuenta años","B) Ciento setenta y cinco años","C) Doscientos años","D) Noventa y nueve años"]'::jsonb,
    '1', 'Respuesta: B) Ciento setenta y cinco años. Estos fueron los días que vivió Abraham: ciento setenta y cinco años (Génesis 25:7).', 1, true),

  (v_cap, '¿Quiénes sepultaron a Abraham?', 'multiple',
    '["A) Solo Isaac","B) Isaac e Ismael","C) Solo sus siervos","D) Nadie, fue solo"]'::jsonb,
    '1', 'Respuesta: B) Isaac e Ismael. Lo sepultaron Isaac e Ismael sus hijos en la cueva de Macpela (Génesis 25:9).', 2, true),

  (v_cap, '¿Quiénes lucharon dentro del vientre de Rebeca?', 'multiple',
    '["A) Isaac y otro","B) Jacob y Esaú","C) Dos hijas","D) No hubo lucha"]'::jsonb,
    '1', 'Respuesta: B) Jacob y Esaú. Los hijos luchaban dentro de ella (Génesis 25:22).', 3, true),

  (v_cap, '¿Quién nació primero, Jacob o Esaú?', 'multiple',
    '["A) Jacob","B) Esaú","C) Nacieron al mismo tiempo","D) No se especifica"]'::jsonb,
    '1', 'Respuesta: B) Esaú. Salió el primero rubio... y llamaron su nombre Esaú (Génesis 25:25).', 4, true),

  (v_cap, '¿Cómo era descrito Esaú al nacer?', 'multiple',
    '["A) Pálido y liso","B) Rubio y velludo como una pelliza","C) Moreno y delgado","D) Ciego"]'::jsonb,
    '1', 'Respuesta: B) Rubio y velludo como una pelliza. Salió el primero rubio, y era todo velludo como una pelliza (Génesis 25:25).', 5, true),

  (v_cap, '¿Qué agarraba Jacob al nacer?', 'multiple',
    '["A) Nada","B) El calcañar de Esaú","C) Una piedra","D) Un cordón"]'::jsonb,
    '1', 'Respuesta: B) El calcañar de Esaú. Salió su hermano, trabada su mano al calcañar de Esaú (Génesis 25:26).', 6, true),

  (v_cap, '¿Qué le vendió Esaú a Jacob por un guiso de lentejas?', 'multiple',
    '["A) Su casa","B) Su primogenitura","C) Su esposa","D) Su ganado"]'::jsonb,
    '1', 'Respuesta: B) Su primogenitura. Vendió a Jacob su primogenitura (Génesis 25:33).', 7, true),

  (v_cap, '¿A quién amaba más Isaac y por qué?', 'multiple',
    '["A) A Jacob, porque era tranquilo","B) A Esaú, porque comía de su caza","C) A ninguno","D) A ambos por igual"]'::jsonb,
    '1', 'Respuesta: B) A Esaú, porque comía de su caza. Amó Isaac a Esaú, porque comía de su caza (Génesis 25:28).', 8, true),

  (v_cap, '¿A quién amaba más Rebeca?', 'multiple',
    '["A) A Esaú","B) A Jacob","C) A ninguno","D) A ambos por igual"]'::jsonb,
    '1', 'Respuesta: B) A Jacob. Rebeca amaba a Jacob (Génesis 25:28).', 9, true),

  (v_cap, '¿Qué tipo de hombre era Jacob según el texto?', 'multiple',
    '["A) Diestro en la caza","B) Varón quieto que habitaba en tiendas","C) Guerrero","D) Pescador"]'::jsonb,
    '1', 'Respuesta: B) Varón quieto que habitaba en tiendas. Jacob era varón quieto, que habitaba en tiendas (Génesis 25:27).', 10, true);
END $$;

-- ===== supabase\Genesis\030_preguntas_genesis26.sql =====
-- ============================================================
-- Migración 030: Preguntas del sistema — Génesis 26 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 26 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 26;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿A dónde fue Isaac por causa del hambre?', 'multiple',
    '["A) A Egipto","B) A Gerar, donde Abimelec","C) A Harán","D) A Sodoma"]'::jsonb,
    '1', 'Respuesta: B) A Gerar, donde Abimelec. Se fue Isaac a Abimelec rey de los filisteos, en Gerar (Génesis 26:1).', 1, true),

  (v_cap, '¿Qué le mandó Dios a Isaac que no hiciera?', 'multiple',
    '["A) Que no se casara","B) Que no descendiera a Egipto","C) Que no sembrara","D) Que no orara"]'::jsonb,
    '1', 'Respuesta: B) Que no descendiera a Egipto. No desciendas a Egipto; habita en la tierra que yo te diré (Génesis 26:2).', 2, true),

  (v_cap, '¿Qué dijo Isaac sobre Rebeca, igual que hizo su padre con Sara?', 'multiple',
    '["A) Que era su hermana","B) Que era su prima","C) Que era su sierva","D) La verdad, que era su esposa"]'::jsonb,
    '0', 'Respuesta: A) Que era su hermana. Él respondió: Es mi hermana (Génesis 26:7).', 3, true),

  (v_cap, '¿Cómo descubrió Abimelec que Rebeca era esposa de Isaac?', 'multiple',
    '["A) Isaac se lo confesó","B) Lo vio acariciándola por una ventana","C) Rebeca lo confesó","D) Un siervo lo delató"]'::jsonb,
    '1', 'Respuesta: B) Lo vio acariciándola por una ventana. Abimelec... mirando por una ventana, vio a Isaac que acariciaba a Rebeca su mujer (Génesis 26:8).', 4, true),

  (v_cap, '¿Cuánto cosechó Isaac en la tierra de Gerar?', 'multiple',
    '["A) El doble de lo sembrado","B) Ciento por uno","C) La mitad","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Ciento por uno. Cosechó aquel año ciento por uno (Génesis 26:12).', 5, true),

  (v_cap, '¿Por qué los filisteos cegaron los pozos de Isaac?', 'multiple',
    '["A) Por accidente","B) Porque le tenían envidia","C) Por orden del rey","D) Porque no servían"]'::jsonb,
    '1', 'Respuesta: B) Porque le tenían envidia. Los filisteos le tuvieron envidia (Génesis 26:14).', 6, true),

  (v_cap, '¿Qué nombre dio Isaac al pozo donde no hubo disputa?', 'multiple',
    '["A) Esek","B) Rehobot","C) Sitna","D) Beerseba"]'::jsonb,
    '1', 'Respuesta: B) Rehobot. Llamó su nombre Rehobot, y dijo: Porque ahora Jehová nos ha prosperado (Génesis 26:22).', 7, true),

  (v_cap, '¿Qué pacto hicieron Isaac y Abimelec al final?', 'multiple',
    '["A) Ninguno, se separaron enemistados","B) Un juramento de no hacerse mal","C) Una guerra","D) Un matrimonio"]'::jsonb,
    '1', 'Respuesta: B) Un juramento de no hacerse mal. Haya ahora juramento entre nosotros... y haremos pacto contigo (Génesis 26:28).', 8, true),

  (v_cap, '¿Con quiénes se casó Esaú, causando amargura a Isaac y Rebeca?', 'multiple',
    '["A) Mujeres israelitas","B) Mujeres heteas (Judit y Basemat)","C) Egipcias","D) Nadie, no se casó"]'::jsonb,
    '1', 'Respuesta: B) Mujeres heteas (Judit y Basemat). Tomó por mujer a Judit hija de Beeri heteo, y a Basemat hija de Elón heteo (Génesis 26:34).', 9, true),

  (v_cap, '¿Cómo se llamó la ciudad por el pozo hallado al final del capítulo?', 'multiple',
    '["A) Rehobot","B) Beerseba","C) Sitna","D) Gerar"]'::jsonb,
    '1', 'Respuesta: B) Beerseba. El nombre de aquella ciudad es Beerseba hasta este día (Génesis 26:33).', 10, true);
END $$;

-- ===== supabase\Genesis\031_preguntas_genesis27.sql =====
-- ============================================================
-- Migración 031: Preguntas del sistema — Génesis 27 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 27 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 27;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué le pidió Isaac a Esaú antes de bendecirlo?', 'multiple',
    '["A) Que orara","B) Que cazara y preparara un guisado","C) Que se casara","D) Que construyera un altar"]'::jsonb,
    '1', 'Respuesta: B) Que cazara y preparara un guisado. Tráeme caza; y hazme un guisado como a mí me gusta (Génesis 27:3-4).', 1, true),

  (v_cap, '¿Quién ideó el plan para que Jacob recibiera la bendición en su lugar?', 'multiple',
    '["A) Jacob mismo","B) Rebeca","C) Isaac","D) Un siervo"]'::jsonb,
    '1', 'Respuesta: B) Rebeca. Rebeca habló a Jacob su hijo... Ahora, pues, hijo mío, obedece a mi voz (Génesis 27:6-8).', 2, true),

  (v_cap, '¿Cómo disfrazó Rebeca a Jacob para parecerse a Esaú?', 'multiple',
    '["A) Con maquillaje","B) Con pieles de cabritos en manos y cuello","C) Con ropa nueva únicamente","D) No lo disfrazó"]'::jsonb,
    '1', 'Respuesta: B) Con pieles de cabritos en manos y cuello. Cubrió sus manos y la parte de su cuello... con las pieles de los cabritos (Génesis 27:16).', 3, true),

  (v_cap, '¿Cómo confirmó Isaac, dudando, la identidad de su hijo?', 'multiple',
    '["A) Por la voz","B) Por el tacto, aunque la voz era de Jacob","C) Por el olfato únicamente","D) No dudó"]'::jsonb,
    '1', 'Respuesta: B) Por el tacto, aunque la voz era de Jacob. La voz es la voz de Jacob, pero las manos, las manos de Esaú (Génesis 27:22).', 4, true),

  (v_cap, '¿Qué bendición recibió Jacob de su padre?', 'multiple',
    '["A) Pobreza","B) Abundancia de trigo y mosto, señorío sobre sus hermanos","C) Una maldición","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Abundancia de trigo y mosto, señorío sobre sus hermanos. Dios, pues, te dé del rocío del cielo... abundancia de trigo y de mosto (Génesis 27:28).', 5, true),

  (v_cap, '¿Cómo reaccionó Esaú al descubrir el engaño?', 'multiple',
    '["A) Con indiferencia","B) Con un clamor grande y amargo","C) Con alegría","D) No se enteró"]'::jsonb,
    '1', 'Respuesta: B) Con un clamor grande y amargo. Clamó con una muy grande y muy amarga exclamación (Génesis 27:34).', 6, true),

  (v_cap, '¿Qué bendición quedó para Esaú?', 'multiple',
    '["A) La misma que Jacob","B) Vivir de su espada y servir a su hermano, hasta liberarse","C) Ninguna","D) Ser el más rico"]'::jsonb,
    '1', 'Respuesta: B) Vivir de su espada y servir a su hermano, hasta liberarse. Por tu espada vivirás, y a tu hermano servirás (Génesis 27:40).', 7, true),

  (v_cap, '¿Qué planeó Esaú hacer contra Jacob?', 'multiple',
    '["A) Perdonarlo","B) Matarlo después de la muerte de su padre","C) Ignorarlo","D) Bendecirlo también"]'::jsonb,
    '1', 'Respuesta: B) Matarlo después de la muerte de su padre. Llegarán los días del luto de mi padre, y yo mataré a mi hermano Jacob (Génesis 27:41).', 8, true),

  (v_cap, '¿Qué hizo Rebeca al enterarse del plan de Esaú?', 'multiple',
    '["A) Nada","B) Envió a Jacob a huir a casa de Labán en Harán","C) Se lo dijo a Isaac para castigar a Esaú","D) Se fue ella misma"]'::jsonb,
    '1', 'Respuesta: B) Envió a Jacob a huir a casa de Labán en Harán. Levántate y huye a casa de Labán mi hermano en Harán (Génesis 27:43).', 9, true),

  (v_cap, '¿Qué excusa dio Rebeca a Isaac para enviar a Jacob lejos?', 'multiple',
    '["A) Que necesitaba comerciar","B) Que no quería que Jacob se casara con una hija de Het como Esaú","C) Que estaba enfermo","D) Ninguna excusa"]'::jsonb,
    '1', 'Respuesta: B) Que no quería que Jacob se casara con una hija de Het como Esaú. Si Jacob toma mujer de las hijas de Het... ¿para qué quiero la vida? (Génesis 27:46).', 10, true);
END $$;

-- ===== supabase\Genesis\032_preguntas_genesis28.sql =====
-- ============================================================
-- Migración 032: Preguntas del sistema — Génesis 28 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 28 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 28;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿A dónde envió Isaac a Jacob para buscar esposa?', 'multiple',
    '["A) A Egipto","B) A Padan-aram, a casa de Labán","C) A Sodoma","D) A Gerar"]'::jsonb,
    '1', 'Respuesta: B) A Padan-aram, a casa de Labán. Levántate, ve a Padan-aram, a casa de Betuel... a las hijas de Labán (Génesis 28:2).', 1, true),

  (v_cap, '¿Qué vio Jacob en su sueño en Bet-el?', 'multiple',
    '["A) Un río de fuego","B) Una escalera que llegaba al cielo con ángeles subiendo y bajando","C) Un ángel guerrero","D) Nada, no soñó"]'::jsonb,
    '1', 'Respuesta: B) Una escalera que llegaba al cielo con ángeles subiendo y bajando. He aquí una escalera... y he aquí ángeles de Dios que subían y descendían por ella (Génesis 28:12).', 2, true),

  (v_cap, '¿Qué promesa le repitió Dios a Jacob en el sueño?', 'multiple',
    '["A) Que sería rey de Egipto","B) Que le daría la tierra y multiplicaría su descendencia como el polvo de la tierra","C) Que moriría joven","D) Que sería sacerdote"]'::jsonb,
    '1', 'Respuesta: B) Que le daría la tierra y multiplicaría su descendencia como el polvo de la tierra. Será tu descendencia como el polvo de la tierra (Génesis 28:14).', 3, true),

  (v_cap, '¿Qué hizo Jacob con la piedra que usó de almohada?', 'multiple',
    '["A) La dejó allí","B) La alzó como señal y derramó aceite sobre ella","C) La rompió","D) Se la llevó"]'::jsonb,
    '1', 'Respuesta: B) La alzó como señal y derramó aceite sobre ella. Tomó la piedra que había puesto de cabecera, y la alzó por señal, y derramó aceite encima de ella (Génesis 28:18).', 4, true),

  (v_cap, '¿Qué nombre le dio Jacob al lugar?', 'multiple',
    '["A) Beerseba","B) Bet-el","C) Peniel","D) Galaad"]'::jsonb,
    '1', 'Respuesta: B) Bet-el. Llamó el nombre de aquel lugar Bet-el (Génesis 28:19).', 5, true),

  (v_cap, '¿Qué voto hizo Jacob?', 'multiple',
    '["A) Ninguno","B) Que si Dios lo cuidaba, Jehová sería su Dios y daría el diezmo de todo","C) Casarse con Raquel","D) Nunca volver"]'::jsonb,
    '1', 'Respuesta: B) Que si Dios lo cuidaba, Jehová sería su Dios y daría el diezmo de todo. Si volviere en paz a casa de mi padre, Jehová será mi Dios... el diezmo apartaré para ti (Génesis 28:21-22).', 6, true),

  (v_cap, '¿Con quién se casó Esaú al ver que las cananeas disgustaban a su padre?', 'multiple',
    '["A) Con Rebeca","B) Con Mahalat, hija de Ismael","C) Con Raquel","D) Con Lea"]'::jsonb,
    '1', 'Respuesta: B) Con Mahalat, hija de Ismael. Tomó para sí por mujer a Mahalat, hija de Ismael (Génesis 28:9).', 7, true),

  (v_cap, '¿Qué exclamó Jacob al despertar?', 'multiple',
    '["A) Nada","B) Ciertamente Jehová está en este lugar, y yo no lo sabía","C) Tuvo miedo y huyó sin decir nada","D) Se rió"]'::jsonb,
    '1', 'Respuesta: B) Ciertamente Jehová está en este lugar, y yo no lo sabía. Ciertamente Jehová está en este lugar, y yo no lo sabía (Génesis 28:16).', 8, true),

  (v_cap, '¿Cómo llamó Jacob a aquel lugar en relación al cielo?', 'multiple',
    '["A) Puerta del infierno","B) Casa de Dios y puerta del cielo","C) Un lugar maldito","D) Nada especial"]'::jsonb,
    '1', 'Respuesta: B) Casa de Dios y puerta del cielo. No es otra cosa que casa de Dios, y puerta del cielo (Génesis 28:17).', 9, true),

  (v_cap, '¿Qué nombre tenía la ciudad antes de llamarse Bet-el?', 'multiple',
    '["A) Harán","B) Luz","C) Siquem","D) Peniel"]'::jsonb,
    '1', 'Respuesta: B) Luz. Llamó el nombre de aquel lugar Bet-el, aunque Luz era el nombre de la ciudad primero (Génesis 28:19).', 10, true);
END $$;

-- ===== supabase\Genesis\033_preguntas_genesis29.sql =====
-- ============================================================
-- Migración 033: Preguntas del sistema — Génesis 29 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 29 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 29;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿A quién conoció Jacob junto al pozo?', 'multiple',
    '["A) A Lea","B) A Raquel","C) A Débora","D) A Dina"]'::jsonb,
    '1', 'Respuesta: B) A Raquel. Raquel vino con el rebaño de su padre (Génesis 29:9).', 1, true),

  (v_cap, '¿Cuántos años sirvió Jacob por Raquel?', 'multiple',
    '["A) Cinco años","B) Siete años","C) Diez años","D) Catorce años"]'::jsonb,
    '1', 'Respuesta: B) Siete años. Yo te serviré siete años por Raquel tu hija menor (Génesis 29:18).', 2, true),

  (v_cap, '¿A quién le dio Labán a Jacob en la noche de bodas, en lugar de Raquel?', 'multiple',
    '["A) A Raquel de todas formas","B) A Lea","C) A Zilpa","D) A Bilha"]'::jsonb,
    '1', 'Respuesta: B) A Lea. A la noche tomó a Lea su hija, y se la trajo (Génesis 29:23).', 3, true),

  (v_cap, '¿Qué excusa dio Labán por el engaño?', 'multiple',
    '["A) Ninguna, no dio explicación","B) Que no se acostumbra dar la menor antes que la mayor","C) Que Lea lo pidió","D) Que fue un error de la oscuridad"]'::jsonb,
    '1', 'Respuesta: B) Que no se acostumbra dar la menor antes que la mayor. No se hace así en nuestro lugar, que se dé la menor antes de la mayor (Génesis 29:26).', 4, true),

  (v_cap, '¿Cuántos años más sirvió Jacob por Raquel después de casarse con Lea?', 'multiple',
    '["A) Cinco","B) Siete","C) Diez","D) Veinte"]'::jsonb,
    '1', 'Respuesta: B) Siete. Se te dará también la otra, por el servicio que hagas conmigo otros siete años (Génesis 29:27).', 5, true),

  (v_cap, '¿Cuál de las dos hermanas amaba más Jacob?', 'multiple',
    '["A) Lea","B) Raquel","C) A ambas igual","D) A ninguna"]'::jsonb,
    '1', 'Respuesta: B) Raquel. La amó también más que a Lea (Génesis 29:30).', 6, true),

  (v_cap, '¿Qué hijo tuvo Lea primero?', 'multiple',
    '["A) Simeón","B) Rubén","C) Judá","D) Leví"]'::jsonb,
    '1', 'Respuesta: B) Rubén. Dio a luz un hijo, y llamó su nombre Rubén (Génesis 29:32).', 7, true),

  (v_cap, '¿Qué hijo de Lea recibió un nombre relacionado con alabar a Jehová?', 'multiple',
    '["A) Rubén","B) Judá","C) Simeón","D) Leví"]'::jsonb,
    '1', 'Respuesta: B) Judá. Esta vez alabaré a Jehová; por esto llamó su nombre Judá (Génesis 29:35).', 8, true),

  (v_cap, '¿Cómo eran descritos los ojos de Lea?', 'multiple',
    '["A) Hermosos","B) Delicados","C) Grandes","D) No se menciona"]'::jsonb,
    '1', 'Respuesta: B) Delicados. Los ojos de Lea eran delicados (Génesis 29:17).', 9, true),

  (v_cap, '¿Cómo era descrita Raquel?', 'multiple',
    '["A) Fea","B) De lindo semblante y hermoso parecer","C) Anciana","D) Ciega"]'::jsonb,
    '1', 'Respuesta: B) De lindo semblante y hermoso parecer. Raquel era de lindo semblante y de hermoso parecer (Génesis 29:17).', 10, true);
END $$;

-- ===== supabase\Genesis\034_preguntas_genesis30.sql =====
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

-- ===== supabase\Genesis\035_preguntas_genesis31.sql =====
-- ============================================================
-- Migración 035: Preguntas del sistema — Génesis 31 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 31 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 31;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué decían los hijos de Labán sobre Jacob?', 'multiple',
    '["A) Que era pobre","B) Que había tomado toda la riqueza de su padre","C) Que era un buen hombre","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Que había tomado toda la riqueza de su padre. Jacob ha tomado todo lo que era de nuestro padre (Génesis 31:1).', 1, true),

  (v_cap, '¿Qué le mandó Dios a Jacob que hiciera?', 'multiple',
    '["A) Que se quedara con Labán","B) Que volviera a la tierra de sus padres","C) Que se fuera a Egipto","D) Que matara a Labán"]'::jsonb,
    '1', 'Respuesta: B) Que volviera a la tierra de sus padres. Vuélvete a la tierra de tus padres, y a tu parentela, y yo estaré contigo (Génesis 31:3).', 2, true),

  (v_cap, '¿Qué robó Raquel de su padre antes de partir?', 'multiple',
    '["A) Dinero","B) Los ídolos de su padre","C) Ganado","D) Ropa"]'::jsonb,
    '1', 'Respuesta: B) Los ídolos de su padre. Raquel hurtó los ídolos de su padre (Génesis 31:19).', 3, true),

  (v_cap, '¿Cómo escondió Raquel los ídolos cuando Labán los buscó?', 'multiple',
    '["A) Los enterró","B) Los puso en una albarda de camello y se sentó sobre ellos","C) Los tiró al río","D) Los quemó"]'::jsonb,
    '1', 'Respuesta: B) Los puso en una albarda de camello y se sentó sobre ellos. Tomó Raquel los ídolos y los puso en una albarda de un camello, y se sentó sobre ellos (Génesis 31:34).', 4, true),

  (v_cap, '¿Cuántos días de camino tardó Labán en alcanzar a Jacob?', 'multiple',
    '["A) Un día","B) Tres días","C) Siete días","D) Veinte días"]'::jsonb,
    '2', 'Respuesta: C) Siete días. Fue tras Jacob camino de siete días (Génesis 31:23).', 5, true),

  (v_cap, '¿Qué le advirtió Dios a Labán en sueños?', 'multiple',
    '["A) Que matara a Jacob","B) Que no hablara descomedidamente a Jacob","C) Que lo persiguiera más rápido","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Que no hablara descomedidamente a Jacob. Guárdate que no hables a Jacob descomedidamente (Génesis 31:24).', 6, true),

  (v_cap, '¿Cuántos años en total sirvió Jacob a Labán?', 'multiple',
    '["A) Diez","B) Catorce","C) Veinte","D) Treinta"]'::jsonb,
    '2', 'Respuesta: C) Veinte. Estos veinte años he estado contigo (Génesis 31:38).', 7, true),

  (v_cap, '¿Qué hicieron Jacob y Labán al reconciliarse?', 'multiple',
    '["A) Se pelearon de nuevo","B) Hicieron un pacto y levantaron un majano de piedras como testigo","C) Se ignoraron","D) Se fueron sin hablar"]'::jsonb,
    '1', 'Respuesta: B) Hicieron un pacto y levantaron un majano de piedras como testigo. Tomaron piedras e hicieron un majano... este majano es testigo hoy entre nosotros dos (Génesis 31:46,48).', 8, true),

  (v_cap, '¿Cómo llamó Jacob al majano de piedras?', 'multiple',
    '["A) Jegar Sahaduta","B) Galaad","C) Mizpa","D) Betel"]'::jsonb,
    '1', 'Respuesta: B) Galaad. Lo llamó Jacob, Galaad (Génesis 31:47).', 9, true),

  (v_cap, '¿Qué significa el nombre Mizpa que dieron al lugar?', 'multiple',
    '["A) Dios es grande","B) Atalaye Jehová entre tú y yo, cuando nos apartemos","C) Lugar de paz","D) Tierra prometida"]'::jsonb,
    '1', 'Respuesta: B) Atalaye Jehová entre tú y yo, cuando nos apartemos. Atalaye Jehová entre tú y yo, cuando nos apartemos el uno del otro (Génesis 31:49).', 10, true);
END $$;

-- ===== supabase\Genesis\036_preguntas_genesis32.sql =====
-- ============================================================
-- Migración 036: Preguntas del sistema — Génesis 32 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 32 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 32;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Quién le salió al encuentro a Jacob en su camino de regreso?', 'multiple',
    '["A) Esaú","B) Ángeles de Dios","C) Labán","D) Un ejército enemigo"]'::jsonb,
    '1', 'Respuesta: B) Ángeles de Dios. Le salieron al encuentro ángeles de Dios (Génesis 32:1).', 1, true),

  (v_cap, '¿Cuántos hombres traía Esaú al encuentro con Jacob, según los mensajeros?', 'multiple',
    '["A) 100","B) 200","C) 400","D) 600"]'::jsonb,
    '2', 'Respuesta: C) 400. Él también viene a recibirte, y cuatrocientos hombres con él (Génesis 32:6).', 2, true),

  (v_cap, '¿Qué hizo Jacob por temor a Esaú?', 'multiple',
    '["A) Huyó","B) Dividió su gente y ganado en dos campamentos, y envió un presente","C) Se escondió","D) Atacó primero"]'::jsonb,
    '1', 'Respuesta: B) Dividió su gente y ganado en dos campamentos, y envió un presente. Distribuyó el pueblo que tenía consigo... en dos campamentos (Génesis 32:7).', 3, true),

  (v_cap, '¿Con quién luchó Jacob toda la noche en el vado de Jaboc?', 'multiple',
    '["A) Con Esaú","B) Con un varón (el ángel de Dios)","C) Con Labán","D) Con un león"]'::jsonb,
    '1', 'Respuesta: B) Con un varón (el ángel de Dios). Se quedó Jacob solo; y luchó con él un varón hasta que rayaba el alba (Génesis 32:24).', 4, true),

  (v_cap, '¿Qué le pasó al muslo de Jacob durante la lucha?', 'multiple',
    '["A) Nada","B) Se descoyuntó","C) Se rompió","D) Sanó milagrosamente"]'::jsonb,
    '1', 'Respuesta: B) Se descoyuntó. Se descoyuntó el muslo de Jacob mientras con él luchaba (Génesis 32:25).', 5, true),

  (v_cap, '¿Qué nuevo nombre recibió Jacob tras la lucha?', 'multiple',
    '["A) Abraham","B) Israel","C) Isaac","D) Judá"]'::jsonb,
    '1', 'Respuesta: B) Israel. No se dirá más tu nombre Jacob, sino Israel (Génesis 32:28).', 6, true),

  (v_cap, '¿Qué significa el nuevo nombre según el ángel?', 'multiple',
    '["A) Príncipe de Dios: has luchado con Dios y con los hombres, y has vencido","B) El que huye","C) El engañador","D) El bendecido por Esaú"]'::jsonb,
    '0', 'Respuesta: A) Príncipe de Dios: has luchado con Dios y con los hombres, y has vencido. Porque has luchado con Dios y con los hombres, y has vencido (Génesis 32:28).', 7, true),

  (v_cap, '¿Cómo llamó Jacob al lugar de la lucha?', 'multiple',
    '["A) Betel","B) Peniel","C) Galaad","D) Mahanaim"]'::jsonb,
    '1', 'Respuesta: B) Peniel. Llamó Jacob el nombre de aquel lugar, Peniel (Génesis 32:30).', 8, true),

  (v_cap, '¿Qué costumbre alimenticia se originó según el final del capítulo?', 'multiple',
    '["A) No comer cerdo","B) No comer el tendón que se contrajo en el muslo","C) No comer pescado","D) Ayunar los viernes"]'::jsonb,
    '1', 'Respuesta: B) No comer el tendón que se contrajo en el muslo. No comen los hijos de Israel... del tendón que se contrajo (Génesis 32:32).', 9, true),

  (v_cap, '¿Qué envió Jacob por delante para apaciguar a Esaú?', 'multiple',
    '["A) Un mensaje de guerra","B) Un gran presente de ganado","C) Nada","D) Solo a sus hijos"]'::jsonb,
    '1', 'Respuesta: B) Un gran presente de ganado. Tomó de lo que le vino a la mano un presente para su hermano Esaú (Génesis 32:13).', 10, true);
END $$;

-- ===== supabase\Genesis\037_preguntas_genesis33.sql =====
-- ============================================================
-- Migración 037: Preguntas del sistema — Génesis 33 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 33 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 33;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Cómo reaccionó Esaú al ver a Jacob?', 'multiple',
    '["A) Con ira","B) Corrió a abrazarlo, lo besó y lloraron","C) Lo ignoró","D) Peleó con él"]'::jsonb,
    '1', 'Respuesta: B) Corrió a abrazarlo, lo besó y lloraron. Esaú corrió a su encuentro y le abrazó, y se echó sobre su cuello, y le besó; y lloraron (Génesis 33:4).', 1, true),

  (v_cap, '¿Cómo organizó Jacob a su familia al acercarse a Esaú?', 'multiple',
    '["A) Al azar","B) Las siervas y sus niños primero, luego Lea, y al final Raquel y José","C) Todos juntos","D) Escondió a todos"]'::jsonb,
    '1', 'Respuesta: B) Las siervas y sus niños primero, luego Lea, y al final Raquel y José. Puso las siervas y sus niños delante, luego a Lea... y a Raquel y a José los últimos (Génesis 33:2).', 2, true),

  (v_cap, '¿Cuántas veces se inclinó Jacob ante Esaú?', 'multiple',
    '["A) Una","B) Tres","C) Siete","D) Doce"]'::jsonb,
    '2', 'Respuesta: C) Siete. Se inclinó a tierra siete veces (Génesis 33:3).', 3, true),

  (v_cap, '¿Aceptó Esaú el presente de Jacob?', 'multiple',
    '["A) No, lo rechazó","B) Sí, después de que Jacob insistiera","C) Se enojó por ello","D) No se menciona"]'::jsonb,
    '1', 'Respuesta: B) Sí, después de que Jacob insistiera. E insistió con él, y Esaú lo tomó (Génesis 33:11).', 4, true),

  (v_cap, '¿A dónde se fue Esaú después del encuentro?', 'multiple',
    '["A) Con Jacob","B) De vuelta a Seir","C) A Egipto","D) Se quedó con Jacob"]'::jsonb,
    '1', 'Respuesta: B) De vuelta a Seir. Volvió Esaú aquel día por su camino a Seir (Génesis 33:16).', 5, true),

  (v_cap, '¿Dónde se estableció Jacob después, edificando una casa?', 'multiple',
    '["A) En Seir","B) En Sucot","C) En Egipto","D) En Harán"]'::jsonb,
    '1', 'Respuesta: B) En Sucot. Jacob fue a Sucot, y edificó allí casa para sí (Génesis 33:17).', 6, true),

  (v_cap, '¿A qué ciudad llegó Jacob sano y salvo?', 'multiple',
    '["A) Harán","B) Siquem","C) Beerseba","D) Hebrón"]'::jsonb,
    '1', 'Respuesta: B) Siquem. Jacob llegó sano y salvo a la ciudad de Siquem (Génesis 33:18).', 7, true),

  (v_cap, '¿Qué compró Jacob en Siquem?', 'multiple',
    '["A) Una casa","B) Una parte del campo, por cien monedas","C) Un pozo","D) Ganado"]'::jsonb,
    '1', 'Respuesta: B) Una parte del campo, por cien monedas. Compró una parte del campo... por cien monedas (Génesis 33:19).', 8, true),

  (v_cap, '¿Cómo llamó Jacob al altar que erigió en Siquem?', 'multiple',
    '["A) Betel","B) El-Elohe-Israel","C) Jehová-jireh","D) Peniel"]'::jsonb,
    '1', 'Respuesta: B) El-Elohe-Israel. Erigió allí un altar, y lo llamó El-Elohe-Israel (Génesis 33:20).', 9, true),

  (v_cap, '¿Qué excusa dio Jacob para no viajar al mismo ritmo que Esaú?', 'multiple',
    '["A) Estaba cansado","B) Los niños eran tiernos y el ganado se fatigaría","C) No quería ir con él","D) Se perdió el camino"]'::jsonb,
    '1', 'Respuesta: B) Los niños eran tiernos y el ganado se fatigaría. Mi señor sabe que los niños son tiernos... si las fatigan, en un día morirán todas las ovejas (Génesis 33:13).', 10, true);
END $$;

-- ===== supabase\Genesis\038_preguntas_genesis34.sql =====
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

-- ===== supabase\Genesis\039_preguntas_genesis35.sql =====
-- ============================================================
-- Migración 039: Preguntas del sistema — Génesis 35 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 35 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 35;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué mandó Dios a Jacob hacer en este capítulo?', 'multiple',
    '["A) Ir a Egipto","B) Subir a Bet-el y hacer un altar","C) Volver a Harán","D) Ir a Sodoma"]'::jsonb,
    '1', 'Respuesta: B) Subir a Bet-el y hacer un altar. Levántate y sube a Bet-el, y quédate allí (Génesis 35:1).', 1, true),

  (v_cap, '¿Qué mandó Jacob a su familia que hiciera antes de subir a Bet-el?', 'multiple',
    '["A) Nada","B) Quitar los dioses ajenos y purificarse","C) Ayunar","D) Vestirse de luto"]'::jsonb,
    '1', 'Respuesta: B) Quitar los dioses ajenos y purificarse. Quitad los dioses ajenos que hay entre vosotros, y limpiaos (Génesis 35:2).', 2, true),

  (v_cap, '¿Qué nuevo nombre confirmó Dios a Jacob en Bet-el?', 'multiple',
    '["A) Abraham","B) Israel","C) Isaac","D) Judá"]'::jsonb,
    '1', 'Respuesta: B) Israel. No se llamará más tu nombre Jacob, sino Israel será tu nombre (Génesis 35:10).', 3, true),

  (v_cap, '¿Quién murió al dar a luz a Benjamín?', 'multiple',
    '["A) Lea","B) Raquel","C) Dina","D) Débora"]'::jsonb,
    '1', 'Respuesta: B) Raquel. Así murió Raquel (Génesis 35:19).', 4, true),

  (v_cap, '¿Qué nombre le dio Raquel a su hijo antes de morir?', 'multiple',
    '["A) Benjamín","B) Benoni","C) José","D) Simeón"]'::jsonb,
    '1', 'Respuesta: B) Benoni. Llamó su nombre Benoni; mas su padre lo llamó Benjamín (Génesis 35:18).', 5, true),

  (v_cap, '¿Cuántos hijos tuvo Jacob en total, según este capítulo?', 'multiple',
    '["A) Diez","B) Doce","C) Trece","D) Catorce"]'::jsonb,
    '1', 'Respuesta: B) Doce. Ahora bien, los hijos de Israel fueron doce (Génesis 35:22).', 6, true),

  (v_cap, '¿Qué pecado cometió Rubén, mencionado en este capítulo?', 'multiple',
    '["A) Robó ganado","B) Durmió con Bilha, concubina de su padre","C) Mató a alguien","D) Mintió a Jacob"]'::jsonb,
    '1', 'Respuesta: B) Durmió con Bilha, concubina de su padre. Fue Rubén y durmió con Bilha la concubina de su padre (Génesis 35:22).', 7, true),

  (v_cap, '¿Quién murió al final de este capítulo, en Hebrón?', 'multiple',
    '["A) Abraham","B) Isaac","C) Rebeca","D) Sara"]'::jsonb,
    '1', 'Respuesta: B) Isaac. Exhaló Isaac el espíritu, y murió (Génesis 35:29).', 8, true),

  (v_cap, '¿Quiénes sepultaron a Isaac?', 'multiple',
    '["A) Solo Jacob","B) Esaú y Jacob","C) Solo Esaú","D) Sus siervos"]'::jsonb,
    '1', 'Respuesta: B) Esaú y Jacob. Lo sepultaron Esaú y Jacob sus hijos (Génesis 35:29).', 9, true),

  (v_cap, '¿Cuántos años vivió Isaac?', 'multiple',
    '["A) Ciento setenta y cinco","B) Ciento ochenta","C) Ciento cincuenta","D) Doscientos"]'::jsonb,
    '1', 'Respuesta: B) Ciento ochenta. Fueron los días de Isaac ciento ochenta años (Génesis 35:28).', 10, true);
END $$;

-- ===== supabase\Genesis\040_preguntas_genesis36.sql =====
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

-- ===== supabase\Genesis\041_preguntas_genesis37.sql =====
-- ============================================================
-- Migración 041: Preguntas del sistema — Génesis 37 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 37 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 37;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué regalo especial le dio Jacob a José que despertó envidia?', 'multiple',
    '["A) Un báculo","B) Una túnica de diversos colores","C) Un anillo","D) Un caballo"]'::jsonb,
    '1', 'Respuesta: B) Una túnica de diversos colores. Le hizo una túnica de diversos colores (Génesis 37:3).', 1, true),

  (v_cap, '¿Qué soñó José sobre manojos de trigo?', 'multiple',
    '["A) Que se quemaban","B) Que su manojo se levantaba y los de sus hermanos se inclinaban ante él","C) Que desaparecían","D) Que eran robados"]'::jsonb,
    '1', 'Respuesta: B) Que su manojo se levantaba y los de sus hermanos se inclinaban ante él. Mi manojo se levantaba... vuestros manojos... se inclinaban al mío (Génesis 37:7).', 2, true),

  (v_cap, '¿Qué soñó José sobre el sol, la luna y las estrellas?', 'multiple',
    '["A) Que caían del cielo","B) Que se inclinaban ante él","C) Que desaparecían","D) Que lo perseguían"]'::jsonb,
    '1', 'Respuesta: B) Que se inclinaban ante él. El sol y la luna y once estrellas se inclinaban a mí (Génesis 37:9).', 3, true),

  (v_cap, '¿Qué querían hacer inicialmente los hermanos con José?', 'multiple',
    '["A) Ignorarlo","B) Matarlo","C) Ayudarlo","D) Coronarlo"]'::jsonb,
    '1', 'Respuesta: B) Matarlo. Conspiraron contra él para matarle (Génesis 37:18).', 4, true),

  (v_cap, '¿Quién convenció a los hermanos de no matarlo sino echarlo en una cisterna?', 'multiple',
    '["A) Judá","B) Rubén","C) Simeón","D) Leví"]'::jsonb,
    '1', 'Respuesta: B) Rubén. Cuando Rubén oyó esto, lo libró de sus manos (Génesis 37:21).', 5, true),

  (v_cap, '¿A quién vendieron finalmente a José?', 'multiple',
    '["A) A los egipcios directamente","B) A mercaderes ismaelitas/madianitas","C) A Labán","D) A Faraón directamente"]'::jsonb,
    '1', 'Respuesta: B) A mercaderes ismaelitas/madianitas. Le vendieron a los ismaelitas por veinte piezas de plata (Génesis 37:28).', 6, true),

  (v_cap, '¿Por cuánto dinero vendieron a José?', 'multiple',
    '["A) Diez piezas de plata","B) Veinte piezas de plata","C) Cien piezas de plata","D) Nada, lo regalaron"]'::jsonb,
    '1', 'Respuesta: B) Veinte piezas de plata. Le vendieron a los ismaelitas por veinte piezas de plata (Génesis 37:28).', 7, true),

  (v_cap, '¿Qué hicieron los hermanos con la túnica de José para engañar a Jacob?', 'multiple',
    '["A) La quemaron","B) La tiñeron con sangre de un cabrito","C) La escondieron","D) La vendieron también"]'::jsonb,
    '1', 'Respuesta: B) La tiñeron con sangre de un cabrito. Degollaron un cabrito de las cabras, y tiñeron la túnica con la sangre (Génesis 37:31).', 8, true),

  (v_cap, '¿Quién compró a José en Egipto?', 'multiple',
    '["A) Faraón mismo","B) Potifar, oficial de Faraón, capitán de la guardia","C) Un mercader","D) Nadie, fue esclavo libre"]'::jsonb,
    '1', 'Respuesta: B) Potifar, oficial de Faraón, capitán de la guardia. Los madianitas lo vendieron en Egipto a Potifar, oficial de Faraón (Génesis 37:36).', 9, true),

  (v_cap, '¿Cómo reaccionó Jacob al ver la túnica ensangrentada?', 'multiple',
    '["A) Se alegró","B) Rasgó sus vestidos y guardó luto por su hijo","C) No le importó","D) Fue a buscarlo de inmediato"]'::jsonb,
    '1', 'Respuesta: B) Rasgó sus vestidos y guardó luto por su hijo. Jacob rasgó sus vestidos... y guardó luto por su hijo muchos días (Génesis 37:34).', 10, true);
END $$;

-- ===== supabase\Genesis\042_preguntas_genesis38.sql =====
-- ============================================================
-- Migración 042: Preguntas del sistema — Génesis 38 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 38 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 38;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Quién era Tamar?', 'multiple',
    '["A) La hija de Judá","B) La nuera de Judá, esposa de Er","C) La esposa de José","D) La hermana de Judá"]'::jsonb,
    '1', 'Respuesta: B) La nuera de Judá, esposa de Er. Judá tomó mujer para su primogénito Er, la cual se llamaba Tamar (Génesis 38:6).', 1, true),

  (v_cap, '¿Qué le pasó a Er, primogénito de Judá?', 'multiple',
    '["A) Se casó feliz","B) Fue malo ante Jehová y le quitó la vida","C) Se fue lejos","D) Se hizo rico"]'::jsonb,
    '1', 'Respuesta: B) Fue malo ante Jehová y le quitó la vida. Er... fue malo ante los ojos de Jehová, y le quitó Jehová la vida (Génesis 38:7).', 2, true),

  (v_cap, '¿Qué hizo Onán que desagradó a Jehová?', 'multiple',
    '["A) Robó","B) Vertía en tierra para no dar descendencia a su hermano","C) Mintió","D) Mató a alguien"]'::jsonb,
    '1', 'Respuesta: B) Vertía en tierra para no dar descendencia a su hermano. Vertía en tierra, por no dar descendencia a su hermano (Génesis 38:9).', 3, true),

  (v_cap, '¿Cómo se disfrazó Tamar para engañar a Judá?', 'multiple',
    '["A) De sierva","B) De ramera, cubriendo su rostro con un velo","C) De hombre","D) De sacerdotisa"]'::jsonb,
    '1', 'Respuesta: B) De ramera, cubriendo su rostro con un velo. Se cubrió con un velo... la vio Judá, y la tuvo por ramera (Génesis 38:14-15).', 4, true),

  (v_cap, '¿Qué prenda dejó Judá como garantía?', 'multiple',
    '["A) Dinero","B) Su sello, cordón y báculo","C) Su ropa","D) Un anillo de oro"]'::jsonb,
    '1', 'Respuesta: B) Su sello, cordón y báculo. Tu sello, tu cordón, y tu báculo que tienes en tu mano (Génesis 38:18).', 5, true),

  (v_cap, '¿Qué reconoció Judá al final sobre Tamar?', 'multiple',
    '["A) Que ella mintió","B) Que ella era más justa que él","C) Que debía morir","D) Que era inocente sin más explicación"]'::jsonb,
    '1', 'Respuesta: B) Que ella era más justa que él. Más justa es ella que yo (Génesis 38:26).', 6, true),

  (v_cap, '¿Cuántos gemelos tuvo Tamar?', 'multiple',
    '["A) Uno","B) Dos: Fares y Zara","C) Tres","D) Ninguno"]'::jsonb,
    '1', 'Respuesta: B) Dos: Fares y Zara. Había gemelos en su seno (Génesis 38:27).', 7, true),

  (v_cap, '¿Quién nació primero entre los gemelos, aunque el otro sacó la mano primero?', 'multiple',
    '["A) Zara","B) Fares","C) Ambos a la vez","D) No se especifica"]'::jsonb,
    '1', 'Respuesta: B) Fares. ¡Qué brecha te has abierto! Y llamó su nombre Fares (Génesis 38:29).', 8, true),

  (v_cap, '¿Qué iba a pasarle a Tamar cuando se supo que estaba embarazada, antes de revelar la verdad?', 'multiple',
    '["A) Nada","B) Judá ordenó que fuera quemada","C) La expulsaron","D) La perdonaron de inmediato"]'::jsonb,
    '1', 'Respuesta: B) Judá ordenó que fuera quemada. Judá dijo: Sacadla, y sea quemada (Génesis 38:24).', 9, true),

  (v_cap, '¿Por qué Judá no entregó a Sela, su tercer hijo, a Tamar?', 'multiple',
    '["A) Porque se había ido lejos","B) Por miedo de que muriera como sus hermanos","C) Porque Sela no quiso","D) Por decisión de Tamar"]'::jsonb,
    '1', 'Respuesta: B) Por miedo de que muriera como sus hermanos. No sea que muera él también como sus hermanos (Génesis 38:11).', 10, true);
END $$;

-- ===== supabase\Genesis\043_preguntas_genesis39.sql =====
-- ============================================================
-- Migración 043: Preguntas del sistema — Génesis 39 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 39 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 39;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Quién compró a José en Egipto?', 'multiple',
    '["A) Faraón","B) Potifar, oficial de Faraón","C) Un mercader anónimo","D) Los ismaelitas se lo quedaron"]'::jsonb,
    '1', 'Respuesta: B) Potifar, oficial de Faraón. Potifar oficial de Faraón, capitán de la guardia... lo compró (Génesis 39:1).', 1, true),

  (v_cap, '¿Por qué prosperó José en casa de Potifar?', 'multiple',
    '["A) Por suerte","B) Porque Jehová estaba con él","C) Por su astucia","D) Por sobornos"]'::jsonb,
    '1', 'Respuesta: B) Porque Jehová estaba con él. Jehová estaba con José, y fue varón próspero (Génesis 39:2).', 2, true),

  (v_cap, '¿Qué puesto le dio Potifar a José?', 'multiple',
    '["A) Ninguno, era esclavo común","B) Mayordomo de su casa, sobre todo lo que tenía","C) Sacerdote","D) Guardia"]'::jsonb,
    '1', 'Respuesta: B) Mayordomo de su casa, sobre todo lo que tenía. Le hizo mayordomo de su casa y entregó en su poder todo lo que tenía (Génesis 39:4).', 3, true),

  (v_cap, '¿Qué quiso la esposa de Potifar de José?', 'multiple',
    '["A) Que la sirviera mejor","B) Que durmiera con ella","C) Que la llevara a Canaán","D) Que le enseñara hebreo"]'::jsonb,
    '1', 'Respuesta: B) Que durmiera con ella. La mujer de su amo puso sus ojos en José, y dijo: Duerme conmigo (Génesis 39:7).', 4, true),

  (v_cap, '¿Cómo respondió José a la propuesta?', 'multiple',
    '["A) Aceptó","B) Se negó, diciendo que sería un gran mal y pecado contra Dios","C) Lo ignoró sin responder","D) Pidió tiempo para pensar"]'::jsonb,
    '1', 'Respuesta: B) Se negó, diciendo que sería un gran mal y pecado contra Dios. ¿Cómo, pues, haría yo este grande mal, y pecaría contra Dios? (Génesis 39:9).', 5, true),

  (v_cap, '¿Qué pasó cuando ella lo agarró por su ropa?', 'multiple',
    '["A) José se quedó","B) José huyó dejando su ropa en las manos de ella","C) La golpeó","D) Nada, no pasó nada"]'::jsonb,
    '1', 'Respuesta: B) José huyó dejando su ropa en las manos de ella. Él dejó su ropa en las manos de ella, y huyó y salió (Génesis 39:12).', 6, true),

  (v_cap, '¿De qué acusó falsamente la mujer de Potifar a José?', 'multiple',
    '["A) De robo","B) De intentar deshonrarla","C) De mentir","D) De blasfemia"]'::jsonb,
    '1', 'Respuesta: B) De intentar deshonrarla. El siervo hebreo... vino a mí para deshonrarme (Génesis 39:17).', 7, true),

  (v_cap, '¿Qué le hizo Potifar a José tras la acusación?', 'multiple',
    '["A) Lo mató","B) Lo puso en la cárcel","C) Lo despidió sin más","D) Lo perdonó sin castigo"]'::jsonb,
    '1', 'Respuesta: B) Lo puso en la cárcel. Tomó su amo a José, y lo puso en la cárcel (Génesis 39:20).', 8, true),

  (v_cap, '¿Qué pasó con José en la cárcel?', 'multiple',
    '["A) Fue olvidado y maltratado","B) Jehová estuvo con él y halló gracia ante el jefe de la cárcel","C) Escapó","D) Murió allí"]'::jsonb,
    '1', 'Respuesta: B) Jehová estuvo con él y halló gracia ante el jefe de la cárcel. Jehová estaba con José y le extendió su misericordia, y le dio gracia en los ojos del jefe de la cárcel (Génesis 39:21).', 9, true),

  (v_cap, '¿Qué responsabilidad le dio el jefe de la cárcel a José?', 'multiple',
    '["A) Ninguna","B) El cuidado de todos los presos","C) Ser cocinero","D) Ser mensajero"]'::jsonb,
    '1', 'Respuesta: B) El cuidado de todos los presos. El jefe de la cárcel entregó en mano de José el cuidado de todos los presos (Génesis 39:22).', 10, true);
END $$;

-- ===== supabase\Genesis\044_preguntas_genesis40.sql =====
-- ============================================================
-- Migración 044: Preguntas del sistema — Génesis 40 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 40 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 40;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Quiénes estaban presos junto a José en la cárcel?', 'multiple',
    '["A) Dos ladrones","B) El copero y el panadero de Faraón","C) Dos soldados","D) Un sacerdote"]'::jsonb,
    '1', 'Respuesta: B) El copero y el panadero de Faraón. Los puso en prisión... contra el jefe de los coperos y contra el jefe de los panaderos (Génesis 40:2-3).', 1, true),

  (v_cap, '¿Qué interpretó José sobre el sueño del copero?', 'multiple',
    '["A) Que moriría","B) Que en tres días sería restituido a su puesto","C) Que sería esclavo para siempre","D) Nada, no lo interpretó"]'::jsonb,
    '1', 'Respuesta: B) Que en tres días sería restituido a su puesto. Al cabo de tres días levantará Faraón tu cabeza, y te restituirá a tu puesto (Génesis 40:13).', 2, true),

  (v_cap, '¿Qué interpretó José sobre el sueño del panadero?', 'multiple',
    '["A) Que sería libre","B) Que en tres días sería ahorcado","C) Que sería rico","D) Que se casaría"]'::jsonb,
    '1', 'Respuesta: B) Que en tres días sería ahorcado. Al cabo de tres días quitará Faraón tu cabeza... y te hará colgar en la horca (Génesis 40:19).', 3, true),

  (v_cap, '¿Qué le pidió José al copero que hiciera por él?', 'multiple',
    '["A) Nada","B) Que se acordara de él ante Faraón","C) Que lo matara","D) Que huyera con él"]'::jsonb,
    '1', 'Respuesta: B) Que se acordara de él ante Faraón. Acuérdate, pues, de mí cuando tengas ese bien (Génesis 40:14).', 4, true),

  (v_cap, '¿Se cumplieron las interpretaciones de José?', 'multiple',
    '["A) No, fueron erróneas","B) Sí, exactamente como las dijo","C) Solo parcialmente","D) No se sabe"]'::jsonb,
    '1', 'Respuesta: B) Sí, exactamente como las dijo. Hizo volver a su oficio al jefe de los coperos... mas hizo ahorcar al jefe de los panaderos, como lo había interpretado José (Génesis 40:21-22).', 5, true),

  (v_cap, '¿Qué vio el copero en su sueño?', 'multiple',
    '["A) Una vid con tres sarmientos que daban uvas","B) Un río de vino","C) Una serpiente","D) Un ángel"]'::jsonb,
    '0', 'Respuesta: A) Una vid con tres sarmientos que daban uvas. Veía una vid delante de mí, y en la vid tres sarmientos (Génesis 40:9-10).', 6, true),

  (v_cap, '¿Qué vio el panadero en su sueño?', 'multiple',
    '["A) Tres canastillos de pan que las aves comían","B) Un árbol de frutas","C) Fuego","D) Un pozo"]'::jsonb,
    '0', 'Respuesta: A) Tres canastillos de pan que las aves comían. Veía tres canastillos blancos sobre mi cabeza... las aves las comían (Génesis 40:16-17).', 7, true),

  (v_cap, '¿Se acordó el copero de José después de ser liberado?', 'multiple',
    '["A) Sí, inmediatamente","B) No, lo olvidó","C) A medias","D) Nunca se supo"]'::jsonb,
    '1', 'Respuesta: B) No, lo olvidó. El jefe de los coperos no se acordó de José, sino que le olvidó (Génesis 40:23).', 8, true),

  (v_cap, '¿Por qué estaba José en la cárcel según él mismo explicó al copero?', 'multiple',
    '["A) Por robar","B) Porque fue hurtado de la tierra de los hebreos y no había hecho nada","C) Por matar a alguien","D) Por deudas"]'::jsonb,
    '1', 'Respuesta: B) Porque fue hurtado de la tierra de los hebreos y no había hecho nada. Fui hurtado de la tierra de los hebreos; y tampoco he hecho aquí por qué me pusiesen en la cárcel (Génesis 40:15).', 9, true),

  (v_cap, '¿En qué ocasión especial liberó Faraón al copero?', 'multiple',
    '["A) Un día cualquiera","B) El día de su cumpleaños","C) Una fiesta religiosa","D) Sin motivo especial"]'::jsonb,
    '1', 'Respuesta: B) El día de su cumpleaños. Al tercer día, que era el día del cumpleaños de Faraón, el rey hizo banquete (Génesis 40:20).', 10, true);
END $$;

-- ===== supabase\Genesis\045_preguntas_genesis41.sql =====
-- ============================================================
-- Migración 045: Preguntas del sistema — Génesis 41 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 41 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 41;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué soñó Faraón sobre las vacas?', 'multiple',
    '["A) Siete vacas gordas devoradas por siete flacas","B) Vacas voladoras","C) Una sola vaca gigante","D) No soñó con vacas"]'::jsonb,
    '0', 'Respuesta: A) Siete vacas gordas devoradas por siete flacas. Las vacas de feo aspecto y enjutas de carne devoraban a las siete vacas hermosas y muy gordas (Génesis 41:4).', 1, true),

  (v_cap, '¿Qué soñó Faraón sobre las espigas?', 'multiple',
    '["A) Siete espigas buenas devoradas por siete espigas menudas","B) Un campo de flores","C) Espigas de oro","D) Nada"]'::jsonb,
    '0', 'Respuesta: A) Siete espigas buenas devoradas por siete espigas menudas. Las siete espigas menudas devoraban a las siete espigas gruesas y llenas (Génesis 41:7).', 2, true),

  (v_cap, '¿Quién recordó a José ante Faraón?', 'multiple',
    '["A) El panadero","B) El jefe de los coperos","C) Un sacerdote","D) La esposa de Potifar"]'::jsonb,
    '1', 'Respuesta: B) El jefe de los coperos. El jefe de los coperos habló a Faraón, diciendo: Me acuerdo hoy de mis faltas (Génesis 41:9).', 3, true),

  (v_cap, '¿Qué significaban los sueños según José?', 'multiple',
    '["A) Siete años de abundancia seguidos de siete años de hambre","B) Guerra inminente","C) La muerte de Faraón","D) Una plaga"]'::jsonb,
    '0', 'Respuesta: A) Siete años de abundancia seguidos de siete años de hambre. Siete años de gran abundancia... y tras ellos seguirán siete años de hambre (Génesis 41:29-30).', 4, true),

  (v_cap, '¿Qué consejo dio José a Faraón?', 'multiple',
    '["A) Que no hiciera nada","B) Que nombrara un hombre prudente y almacenara grano durante los años buenos","C) Que atacara a otro país","D) Que orara únicamente"]'::jsonb,
    '1', 'Respuesta: B) Que nombrara un hombre prudente y almacenara grano durante los años buenos. Provéase ahora Faraón de un varón prudente y sabio (Génesis 41:33).', 5, true),

  (v_cap, '¿A quién puso Faraón sobre toda la tierra de Egipto?', 'multiple',
    '["A) A un sacerdote","B) A José","C) Al jefe de coperos","D) A su hijo"]'::jsonb,
    '1', 'Respuesta: B) A José. Yo te he puesto sobre toda la tierra de Egipto (Génesis 41:41).', 6, true),

  (v_cap, '¿Qué le dio Faraón a José como símbolos de autoridad?', 'multiple',
    '["A) Nada especial","B) Su anillo, vestiduras de lino fino y un collar de oro","C) Solo dinero","D) Un ejército"]'::jsonb,
    '1', 'Respuesta: B) Su anillo, vestiduras de lino fino y un collar de oro. Faraón quitó su anillo de su mano, y lo puso en la mano de José... un collar de oro (Génesis 41:42).', 7, true),

  (v_cap, '¿Con quién se casó José en Egipto?', 'multiple',
    '["A) Con una hebrea","B) Con Asenat, hija de Potifera sacerdote de On","C) Con la hija de Faraón","D) No se casó"]'::jsonb,
    '1', 'Respuesta: B) Con Asenat, hija de Potifera sacerdote de On. Le dio por mujer a Asenat, hija de Potifera sacerdote de On (Génesis 41:45).', 8, true),

  (v_cap, '¿Qué edad tenía José cuando fue presentado ante Faraón?', 'multiple',
    '["A) Diecisiete años","B) Treinta años","C) Cuarenta años","D) Cincuenta años"]'::jsonb,
    '1', 'Respuesta: B) Treinta años. Era José de edad de treinta años cuando fue presentado delante de Faraón (Génesis 41:46).', 9, true),

  (v_cap, '¿Cómo se llamaron los dos hijos de José nacidos antes del hambre?', 'multiple',
    '["A) Rubén y Simeón","B) Manasés y Efraín","C) Isaac y Jacob","D) Fares y Zara"]'::jsonb,
    '1', 'Respuesta: B) Manasés y Efraín. Llamó el nombre del primogénito, Manasés... el nombre del segundo, Efraín (Génesis 41:51-52).', 10, true);
END $$;

-- ===== supabase\Genesis\046_preguntas_genesis42.sql =====
-- ============================================================
-- Migración 046: Preguntas del sistema — Génesis 42 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 42 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 42;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Por qué bajaron los hermanos de José a Egipto?', 'multiple',
    '["A) A comerciar oro","B) A comprar alimentos, por el hambre","C) A visitar a José","D) Por curiosidad"]'::jsonb,
    '1', 'Respuesta: B) A comprar alimentos, por el hambre. Descended allá, y comprad de allí para nosotros (Génesis 42:2).', 1, true),

  (v_cap, '¿A quién no envió Jacob con sus hermanos?', 'multiple',
    '["A) A Rubén","B) A Benjamín","C) A Judá","D) A Simeón"]'::jsonb,
    '1', 'Respuesta: B) A Benjamín. Jacob no envió a Benjamín, hermano de José, con sus hermanos (Génesis 42:4).', 2, true),

  (v_cap, '¿Reconocieron los hermanos a José?', 'multiple',
    '["A) Sí, inmediatamente","B) No, aunque José sí los reconoció a ellos","C) Solo Rubén lo reconoció","D) Ninguno lo reconoció ni él a ellos"]'::jsonb,
    '1', 'Respuesta: B) No, aunque José sí los reconoció a ellos. José, cuando vio a sus hermanos, los conoció; mas hizo como que no los conocía (Génesis 42:7).', 3, true),

  (v_cap, '¿De qué acusó José a sus hermanos?', 'multiple',
    '["A) De robo","B) De ser espías","C) De mentir sobre su padre","D) De asesinato"]'::jsonb,
    '1', 'Respuesta: B) De ser espías. Espías sois; por ver lo descubierto del país habéis venido (Génesis 42:9).', 4, true),

  (v_cap, '¿A quién retuvo José como prenda mientras los demás volvían?', 'multiple',
    '["A) A Rubén","B) A Simeón","C) A Judá","D) A todos"]'::jsonb,
    '1', 'Respuesta: B) A Simeón. Tomó de entre ellos a Simeón, y lo aprisionó a vista de ellos (Génesis 42:24).', 5, true),

  (v_cap, '¿Qué encontraron los hermanos en sus sacos de regreso?', 'multiple',
    '["A) Oro robado","B) Su propio dinero devuelto","C) Nada","D) Cartas de José"]'::jsonb,
    '1', 'Respuesta: B) Su propio dinero devuelto. Vio su dinero que estaba en la boca de su costal (Génesis 42:27).', 6, true),

  (v_cap, '¿Qué exigió José para liberar a Simeón y probar que no eran espías?', 'multiple',
    '["A) Más dinero","B) Que trajeran a su hermano menor, Benjamín","C) Que se quedaran todos presos","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Que trajeran a su hermano menor, Benjamín. Traeréis a vuestro hermano menor, y serán verificadas vuestras palabras (Génesis 42:20).', 7, true),

  (v_cap, '¿Cómo reaccionó Jacob cuando supo que debía enviar a Benjamín?', 'multiple',
    '["A) Aceptó de inmediato","B) Se negó, temiendo perder también a Benjamín","C) No le importó","D) Envió a otro hijo en su lugar"]'::jsonb,
    '1', 'Respuesta: B) Se negó, temiendo perder también a Benjamín. No descenderá mi hijo con vosotros, pues su hermano ha muerto (Génesis 42:38).', 8, true),

  (v_cap, '¿Qué se recordaban entre sí los hermanos sobre su pasado con José?', 'multiple',
    '["A) Nada en particular","B) Que habían pecado contra él al no escuchar su angustia","C) Que fue un buen trato","D) Que debía perdonarse solo"]'::jsonb,
    '1', 'Respuesta: B) Que habían pecado contra él al no escuchar su angustia. Verdaderamente hemos pecado contra nuestro hermano, pues vimos la angustia de su alma (Génesis 42:21).', 9, true),

  (v_cap, '¿Quién se ofreció como garantía ante Jacob para que Benjamín volviera con vida?', 'multiple',
    '["A) Judá","B) Rubén, ofreciendo la vida de sus propios hijos","C) Simeón","D) Nadie se ofreció"]'::jsonb,
    '1', 'Respuesta: B) Rubén, ofreciendo la vida de sus propios hijos. Rubén habló a su padre, diciendo: Harás morir a mis dos hijos, si no te lo devuelvo (Génesis 42:37).', 10, true);
END $$;

-- ===== supabase\Genesis\047_preguntas_genesis43.sql =====
-- ============================================================
-- Migración 047: Preguntas del sistema — Génesis 43 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 43 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 43;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué condición había puesto José para que los hermanos volvieran a comprar alimento?', 'multiple',
    '["A) Traer oro","B) Traer a Benjamín con ellos","C) Traer a su padre","D) Pagar el doble"]'::jsonb,
    '1', 'Respuesta: B) Traer a Benjamín con ellos. No veréis mi rostro si no traéis a vuestro hermano con vosotros (Génesis 43:3).', 1, true),

  (v_cap, '¿Quién convenció a Jacob de dejar ir a Benjamín?', 'multiple',
    '["A) Rubén","B) Judá","C) Simeón","D) Leví"]'::jsonb,
    '1', 'Respuesta: B) Judá. Judá dijo a Israel su padre: Envía al joven conmigo (Génesis 43:8).', 2, true),

  (v_cap, '¿Qué regalo llevaron los hermanos para el gobernador de Egipto?', 'multiple',
    '["A) Oro y plata solamente","B) Bálsamo, miel, aromas, mirra, nueces y almendras","C) Ganado","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Bálsamo, miel, aromas, mirra, nueces y almendras. Un poco de bálsamo, un poco de miel, aromas y mirra, nueces y almendras (Génesis 43:11).', 3, true),

  (v_cap, '¿Qué hizo José al ver a Benjamín?', 'multiple',
    '["A) Lo ignoró","B) Se conmovió y tuvo que salir a llorar en privado","C) Lo acusó de inmediato","D) Lo encarceló"]'::jsonb,
    '1', 'Respuesta: B) Se conmovió y tuvo que salir a llorar en privado. Se conmovieron sus entrañas a causa de su hermano, y buscó dónde llorar (Génesis 43:30).', 4, true),

  (v_cap, '¿Cómo organizó José el orden en la mesa para sus hermanos?', 'multiple',
    '["A) Al azar","B) Conforme a su edad, del mayor al menor","C) Todos juntos sin orden","D) Separados por completo"]'::jsonb,
    '1', 'Respuesta: B) Conforme a su edad, del mayor al menor. El mayor conforme a su primogenitura, y el menor conforme a su menor edad (Génesis 43:33).', 5, true),

  (v_cap, '¿Cuánto más recibió Benjamín de comida que sus hermanos?', 'multiple',
    '["A) Igual que los demás","B) Cinco veces más","C) El doble","D) La mitad"]'::jsonb,
    '1', 'Respuesta: B) Cinco veces más. La porción de Benjamín era cinco veces mayor que cualquiera de las de ellos (Génesis 43:34).', 6, true),

  (v_cap, '¿Por qué comieron los egipcios separados de los hebreos?', 'multiple',
    '["A) Por casualidad","B) Porque era abominación para los egipcios comer con hebreos","C) Por falta de espacio","D) Por orden de Faraón"]'::jsonb,
    '1', 'Respuesta: B) Porque era abominación para los egipcios comer con hebreos. Los egipcios no pueden comer pan con los hebreos, lo cual es abominación a los egipcios (Génesis 43:32).', 7, true),

  (v_cap, '¿Qué le preguntó José a sus hermanos sobre su padre?', 'multiple',
    '["A) Si estaba enojado","B) Si el anciano de quien hablaron aún vivía","C) Si tenía dinero","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Si el anciano de quien hablaron aún vivía. ¿Vuestro padre, el anciano que dijisteis, lo pasa bien? ¿Vive todavía? (Génesis 43:27).', 8, true),

  (v_cap, '¿Qué llevaron los hermanos además del regalo, por si el dinero devuelto había sido un error?', 'multiple',
    '["A) Nada más","B) Doble cantidad de dinero","C) Un rehén","D) Armas"]'::jsonb,
    '1', 'Respuesta: B) Doble cantidad de dinero. Tomad en vuestras manos doble cantidad de dinero (Génesis 43:12).', 9, true),

  (v_cap, '¿Qué sentían los hermanos al ser llevados a la casa de José?', 'multiple',
    '["A) Alegría","B) Temor, pensando que sería una trampa por el dinero devuelto","C) Indiferencia","D) Confianza total"]'::jsonb,
    '1', 'Respuesta: B) Temor, pensando que sería una trampa por el dinero devuelto. Aquellos hombres tuvieron temor, cuando fueron llevados a casa de José (Génesis 43:18).', 10, true);
END $$;

-- ===== supabase\Genesis\048_preguntas_genesis44.sql =====
-- ============================================================
-- Migración 048: Preguntas del sistema — Génesis 44 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 44 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 44;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué escondió José en el saco de Benjamín?', 'multiple',
    '["A) Oro","B) Su copa de plata","C) Una carta","D) Comida extra"]'::jsonb,
    '1', 'Respuesta: B) Su copa de plata. Pondrás mi copa, la copa de plata, en la boca del costal del menor (Génesis 44:2).', 1, true),

  (v_cap, '¿De qué acusó el mayordomo de José a los hermanos?', 'multiple',
    '["A) De espionaje","B) De robar la copa de plata","C) De mentir sobre su padre","D) De huir sin pagar"]'::jsonb,
    '1', 'Respuesta: B) De robar la copa de plata. ¿Por qué habéis robado mi copa de plata? (Génesis 44:4-5).', 2, true),

  (v_cap, '¿En el saco de quién se halló la copa?', 'multiple',
    '["A) De Rubén","B) De Benjamín","C) De Judá","D) De Simeón"]'::jsonb,
    '1', 'Respuesta: B) De Benjamín. La copa fue hallada en el costal de Benjamín (Génesis 44:12).', 3, true),

  (v_cap, '¿Qué se ofreció Judá a hacer en lugar de Benjamín?', 'multiple',
    '["A) Nada, dejó que se lo llevaran","B) Ser siervo de José en su lugar","C) Pagar una multa","D) Pelear por él"]'::jsonb,
    '1', 'Respuesta: B) Ser siervo de José en su lugar. Te ruego, por tanto, que quede ahora tu siervo en lugar del joven por siervo de mi señor (Génesis 44:33).', 4, true),

  (v_cap, '¿Por qué le preocupaba tanto a Judá que Benjamín no regresara?', 'multiple',
    '["A) Por dinero","B) Porque la vida de su padre Jacob estaba ligada a la vida del joven","C) Por vergüenza","D) Por una promesa sin importancia"]'::jsonb,
    '1', 'Respuesta: B) Porque la vida de su padre Jacob estaba ligada a la vida del joven. Como su vida está ligada a la vida de él... morirá (Génesis 44:30-31).', 5, true),

  (v_cap, '¿Qué había prometido Judá a su padre sobre Benjamín?', 'multiple',
    '["A) Nada en especial","B) Ser fiador de él, aceptando la culpa para siempre si no lo devolvía","C) Que se casaría con él","D) Que lo abandonaría"]'::jsonb,
    '1', 'Respuesta: B) Ser fiador de él, aceptando la culpa para siempre si no lo devolvía. Si no te lo vuelvo a traer, entonces yo seré culpable ante mi padre para siempre (Génesis 44:32).', 6, true),

  (v_cap, '¿Cómo reaccionaron los hermanos cuando encontraron la copa?', 'multiple',
    '["A) Con indiferencia","B) Rasgaron sus vestidos","C) Se alegraron","D) Huyeron de inmediato"]'::jsonb,
    '1', 'Respuesta: B) Rasgaron sus vestidos. Ellos rasgaron sus vestidos (Génesis 44:13).', 7, true),

  (v_cap, '¿Qué dijo José que hacía con la copa hallada?', 'multiple',
    '["A) Nada especial","B) Que solía adivinar con ella","C) La usaba para comer","D) La guardaba como recuerdo"]'::jsonb,
    '1', 'Respuesta: B) Que solía adivinar con ella. ¿No es ésta en la que bebe mi señor, y por la que suele adivinar? (Génesis 44:5).', 8, true),

  (v_cap, '¿Qué propusieron los hermanos como castigo justo al principio?', 'multiple',
    '["A) Pagar el doble","B) Que muriera aquel en quien se hallara la copa, y los demás serían siervos","C) Nada, negaron todo","D) Huir"]'::jsonb,
    '1', 'Respuesta: B) Que muriera aquel en quien se hallara la copa, y los demás serían siervos. Aquel de tus siervos en quien fuere hallada la copa, que muera (Génesis 44:9).', 9, true),

  (v_cap, '¿Qué le mencionó Judá a José sobre otro hermano que no parece?', 'multiple',
    '["A) Que estaba vivo en otro lugar","B) Que pensaban que había sido despedazado","C) Que se había ido lejos","D) Que era el favorito"]'::jsonb,
    '1', 'Respuesta: B) Que pensaban que había sido despedazado. El uno salió de mi presencia, y pienso de cierto que fue despedazado (Génesis 44:28).', 10, true);
END $$;

-- ===== supabase\Genesis\049_preguntas_genesis45.sql =====
-- ============================================================
-- Migración 049: Preguntas del sistema — Génesis 45 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 45 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 45;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué hizo José antes de revelarse a sus hermanos?', 'multiple',
    '["A) Llamó a más gente para presenciarlo","B) Hizo salir a todos los egipcios de su presencia","C) Llamó a Faraón","D) Nada especial"]'::jsonb,
    '1', 'Respuesta: B) Hizo salir a todos los egipcios de su presencia. Haced salir de mi presencia a todos (Génesis 45:1).', 1, true),

  (v_cap, '¿Qué les dijo José a sus hermanos al revelarse?', 'multiple',
    '["A) Los acusó de traición","B) Yo soy José vuestro hermano, el que vendisteis para Egipto","C) Los expulsó de Egipto","D) Nada, se quedó en silencio"]'::jsonb,
    '1', 'Respuesta: B) Yo soy José vuestro hermano, el que vendisteis para Egipto. Yo soy José vuestro hermano, el que vendisteis para Egipto (Génesis 45:4).', 2, true),

  (v_cap, '¿Cómo consoló José a sus hermanos sobre haberlo vendido?', 'multiple',
    '["A) Los culpó fuertemente","B) Dijo que Dios lo había enviado para preservar sus vidas","C) No los perdonó","D) Exigió venganza"]'::jsonb,
    '1', 'Respuesta: B) Dijo que Dios lo había enviado para preservar sus vidas. Para preservación de vida me envió Dios delante de vosotros (Génesis 45:5).', 3, true),

  (v_cap, '¿Cuántos años más de hambre quedaban cuando José se reveló?', 'multiple',
    '["A) Dos","B) Cinco","C) Siete","D) Diez"]'::jsonb,
    '1', 'Respuesta: B) Cinco. Aún quedan cinco años en los cuales ni habrá arada ni siega (Génesis 45:6).', 4, true),

  (v_cap, '¿Dónde ofreció Faraón que se estableciera la familia de Jacob?', 'multiple',
    '["A) En Egipto central","B) En la tierra de Gosén","C) En Canaán","D) En el desierto"]'::jsonb,
    '1', 'Respuesta: B) En la tierra de Gosén. Habitarás en la tierra de Gosén (Génesis 45:10).', 5, true),

  (v_cap, '¿Qué le dio José a Benjamín, más que a los otros hermanos?', 'multiple',
    '["A) Nada especial","B) Trescientas piezas de plata y cinco mudas de vestidos","C) Un anillo","D) Un ejército"]'::jsonb,
    '1', 'Respuesta: B) Trescientas piezas de plata y cinco mudas de vestidos. A Benjamín dio trescientas piezas de plata, y cinco mudas de vestidos (Génesis 45:22).', 6, true),

  (v_cap, '¿Qué envió José a su padre Jacob?', 'multiple',
    '["A) Nada","B) Asnos cargados de lo mejor de Egipto y provisiones","C) Un mensaje solamente","D) Oro únicamente"]'::jsonb,
    '1', 'Respuesta: B) Asnos cargados de lo mejor de Egipto y provisiones. Diez asnos cargados de lo mejor de Egipto, y diez asnas cargadas de trigo (Génesis 45:23).', 7, true),

  (v_cap, '¿Cómo reaccionó Jacob al principio cuando le dijeron que José vivía?', 'multiple',
    '["A) Se alegró de inmediato","B) Su corazón se afligió porque no les creía","C) Se enojó","D) No dijo nada"]'::jsonb,
    '1', 'Respuesta: B) Su corazón se afligió porque no les creía. El corazón de Jacob se afligió, porque no los creía (Génesis 45:26).', 8, true),

  (v_cap, '¿Qué convenció finalmente a Jacob de que José vivía?', 'multiple',
    '["A) Una carta","B) Ver los carros que José había enviado","C) Un sueño","D) El testimonio de un extraño"]'::jsonb,
    '1', 'Respuesta: B) Ver los carros que José había enviado. Viendo Jacob los carros que José enviaba para llevarlo, su espíritu revivió (Génesis 45:27).', 9, true),

  (v_cap, '¿Qué advertencia les dio José a sus hermanos antes de partir?', 'multiple',
    '["A) Que no volvieran nunca","B) Que no riñeran por el camino","C) Que se apresuraran solamente","D) Que trajeran más oro"]'::jsonb,
    '1', 'Respuesta: B) Que no riñeran por el camino. Él les dijo: No riñáis por el camino (Génesis 45:24).', 10, true);
END $$;

-- ===== supabase\Genesis\050_preguntas_genesis46.sql =====
-- ============================================================
-- Migración 050: Preguntas del sistema — Génesis 46 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 46 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 46;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Dónde ofreció Jacob sacrificios antes de partir a Egipto?', 'multiple',
    '["A) En Bet-el","B) En Beerseba","C) En Hebrón","D) En Siquem"]'::jsonb,
    '1', 'Respuesta: B) En Beerseba. Vino a Beerseba, y ofreció sacrificios al Dios de su padre Isaac (Génesis 46:1).', 1, true),

  (v_cap, '¿Qué le prometió Dios a Jacob en una visión antes de bajar a Egipto?', 'multiple',
    '["A) Que nunca volvería","B) Que haría de él una gran nación allí y lo haría volver","C) Que moriría en el camino","D) Que perdería a sus hijos"]'::jsonb,
    '1', 'Respuesta: B) Que haría de él una gran nación allí y lo haría volver. No temas de descender a Egipto, porque allí yo haré de ti una gran nación (Génesis 46:3).', 2, true),

  (v_cap, '¿Cuántas personas de la casa de Jacob entraron en total a Egipto?', 'multiple',
    '["A) Cincuenta","B) Sesenta y seis","C) Setenta","D) Cien"]'::jsonb,
    '2', 'Respuesta: C) Setenta. Todas las personas de la casa de Jacob, que entraron en Egipto, fueron setenta (Génesis 46:27).', 3, true),

  (v_cap, '¿A quién envió Jacob delante de sí para encontrarse con José?', 'multiple',
    '["A) A Rubén","B) A Judá","C) A Benjamín","D) A Simeón"]'::jsonb,
    '1', 'Respuesta: B) A Judá. Envió Jacob a Judá delante de sí a José (Génesis 46:28).', 4, true),

  (v_cap, '¿Cómo reaccionó José al ver a su padre?', 'multiple',
    '["A) Con frialdad","B) Se echó sobre su cuello y lloró largamente","C) No lo reconoció","D) Se enojó"]'::jsonb,
    '1', 'Respuesta: B) Se echó sobre su cuello y lloró largamente. Se echó sobre su cuello, y lloró sobre su cuello largamente (Génesis 46:29).', 5, true),

  (v_cap, '¿Qué dijo Israel (Jacob) al ver a José?', 'multiple',
    '["A) Nada","B) Muera yo ahora, ya que he visto tu rostro, y sé que aún vives","C) Lo regañó","D) Le pidió perdón"]'::jsonb,
    '1', 'Respuesta: B) Muera yo ahora, ya que he visto tu rostro, y sé que aún vives. Muera yo ahora, ya que he visto tu rostro, y sé que aún vives (Génesis 46:30).', 6, true),

  (v_cap, '¿En qué región se estableció la familia de Jacob?', 'multiple',
    '["A) En el centro de Egipto","B) En Gosén","C) En el desierto","D) En Canaán, no en Egipto"]'::jsonb,
    '1', 'Respuesta: B) En Gosén. Habitarás en la tierra de Gosén (Génesis 46:28-29, cf. 45:10).', 7, true),

  (v_cap, '¿Cuál era el oficio de la familia de Jacob según José indicó que dijeran a Faraón?', 'multiple',
    '["A) Comerciantes","B) Pastores de ovejas, ganaderos","C) Agricultores","D) Guerreros"]'::jsonb,
    '1', 'Respuesta: B) Pastores de ovejas, ganaderos. Los hombres son pastores de ovejas, porque son hombres ganaderos (Génesis 46:32).', 8, true),

  (v_cap, '¿Por qué era importante que dijeran que eran pastores?', 'multiple',
    '["A) Para impresionar a Faraón","B) Para habitar en Gosén, ya que para los egipcios el pastoreo era abominación","C) Para ser esclavos","D) Sin razón particular"]'::jsonb,
    '1', 'Respuesta: B) Para habitar en Gosén, ya que para los egipcios el pastoreo era abominación. Para los egipcios es abominación todo pastor de ovejas (Génesis 46:34).', 9, true),

  (v_cap, '¿Cuántos hijos tuvo José en Egipto antes de que llegara su familia?', 'multiple',
    '["A) Uno","B) Dos: Manasés y Efraín","C) Tres","D) Ninguno"]'::jsonb,
    '1', 'Respuesta: B) Dos: Manasés y Efraín. Nacieron a José en la tierra de Egipto Manasés y Efraín (Génesis 46:20).', 10, true);
END $$;

-- ===== supabase\Genesis\051_preguntas_genesis47.sql =====
-- ============================================================
-- Migración 051: Preguntas del sistema — Génesis 47 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 47 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 47;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué le pidió José a Faraón para su familia?', 'multiple',
    '["A) Riquezas inmediatas","B) Que habitaran en la tierra de Gosén","C) Un ejército","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Que habitaran en la tierra de Gosén. Permitas que habiten tus siervos en la tierra de Gosén (Génesis 47:4).', 1, true),

  (v_cap, '¿Qué le preguntó Faraón a Jacob?', 'multiple',
    '["A) Su oficio","B) Cuántos eran los años de su vida","C) Su religión","D) Su riqueza"]'::jsonb,
    '1', 'Respuesta: B) Cuántos eran los años de su vida. ¿Cuántos son los días de los años de tu vida? (Génesis 47:8).', 2, true),

  (v_cap, '¿Cuántos años dijo Jacob que habían sido los de su peregrinación?', 'multiple',
    '["A) Cien años","B) Ciento treinta años","C) Ciento cincuenta años","D) Doscientos años"]'::jsonb,
    '1', 'Respuesta: B) Ciento treinta años. Los días de los años de mi peregrinación son ciento treinta años (Génesis 47:9).', 3, true),

  (v_cap, '¿Qué hizo José con el dinero de los egipcios durante el hambre?', 'multiple',
    '["A) Lo repartió","B) Lo recogió y lo metió en casa de Faraón","C) Lo quemó","D) Lo escondió para sí mismo"]'::jsonb,
    '1', 'Respuesta: B) Lo recogió y lo metió en casa de Faraón. Metió José el dinero en casa de Faraón (Génesis 47:14).', 4, true),

  (v_cap, '¿Qué dieron los egipcios a José cuando se les acabó el dinero?', 'multiple',
    '["A) Sus casas","B) Su ganado","C) Sus hijos","D) Nada más"]'::jsonb,
    '1', 'Respuesta: B) Su ganado. Dad vuestros ganados y yo os daré por vuestros ganados (Génesis 47:16).', 5, true),

  (v_cap, '¿Qué terminaron vendiendo los egipcios a Faraón por alimento, al final?', 'multiple',
    '["A) Solo el ganado","B) Sus tierras y a sí mismos como siervos","C) Sus joyas","D) Nada más"]'::jsonb,
    '1', 'Respuesta: B) Sus tierras y a sí mismos como siervos. Compró José toda la tierra de Egipto para Faraón... seremos nosotros y nuestra tierra siervos de Faraón (Génesis 47:19-20).', 6, true),

  (v_cap, '¿Qué tierra no compró José?', 'multiple',
    '["A) La de los pobres","B) La de los sacerdotes, porque tenían ración de Faraón","C) La de Gosén","D) Ninguna excepción"]'::jsonb,
    '1', 'Respuesta: B) La de los sacerdotes, porque tenían ración de Faraón. Solamente la tierra de los sacerdotes no compró (Génesis 47:22).', 7, true),

  (v_cap, '¿Qué porcentaje de la cosecha estableció José como ley para Faraón?', 'multiple',
    '["A) Un diezmo (10%)","B) Un quinto (20%)","C) La mitad","D) Todo"]'::jsonb,
    '1', 'Respuesta: B) Un quinto (20%). De los frutos daréis el quinto a Faraón (Génesis 47:24).', 8, true),

  (v_cap, '¿Cuántos años vivió Jacob en Egipto?', 'multiple',
    '["A) Diez años","B) Diecisiete años","C) Veinte años","D) Cincuenta años"]'::jsonb,
    '1', 'Respuesta: B) Diecisiete años. Vivió Jacob en la tierra de Egipto diecisiete años (Génesis 47:28).', 9, true),

  (v_cap, '¿Qué le pidió Jacob a José antes de morir?', 'multiple',
    '["A) Que se quedara en Egipto","B) Que no lo enterrara en Egipto sino con sus padres","C) Que repartiera su herencia","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Que no lo enterrara en Egipto sino con sus padres. Te ruego que no me entierres en Egipto (Génesis 47:29).', 10, true);
END $$;

-- ===== supabase\Genesis\052_preguntas_genesis48.sql =====
-- ============================================================
-- Migración 052: Preguntas del sistema — Génesis 48 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 48 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 48;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿A quiénes adoptó Jacob como si fueran hijos suyos, igual que Rubén y Simeón?', 'multiple',
    '["A) A los hijos de Judá","B) A Efraín y Manasés, hijos de José","C) A los hijos de Benjamín","D) A ningún nieto"]'::jsonb,
    '1', 'Respuesta: B) A Efraín y Manasés, hijos de José. Tus dos hijos Efraín y Manasés... míos son; como Rubén y Simeón, serán míos (Génesis 48:5).', 1, true),

  (v_cap, '¿Sobre quién puso Jacob su mano derecha, aunque no era el primogénito?', 'multiple',
    '["A) Manasés","B) Efraín","C) José","D) Rubén"]'::jsonb,
    '1', 'Respuesta: B) Efraín. Puso su mano derecha sobre la cabeza de Efraín, que era el menor (Génesis 48:14).', 2, true),

  (v_cap, '¿Por qué se disgustó José con la bendición de su padre?', 'multiple',
    '["A) Porque no quería que bendijera a sus hijos","B) Porque puso la mano derecha sobre Efraín, el menor, y no sobre Manasés","C) Porque no los bendijo","D) Porque los maldijo"]'::jsonb,
    '1', 'Respuesta: B) Porque puso la mano derecha sobre Efraín, el menor, y no sobre Manasés. Viendo José que su padre ponía la mano derecha sobre la cabeza de Efraín, le causó esto disgusto (Génesis 48:17).', 3, true),

  (v_cap, '¿Qué respondió Jacob cuando José intentó corregirlo?', 'multiple',
    '["A) Aceptó el error","B) Dijo que lo sabía, pero el menor sería más grande que el mayor","C) Se disculpó","D) Cambió de opinión sin explicar"]'::jsonb,
    '1', 'Respuesta: B) Dijo que lo sabía, pero el menor sería más grande que el mayor. Lo sé, hijo mío, lo sé... pero su hermano menor será más grande que él (Génesis 48:19).', 4, true),

  (v_cap, '¿Qué recordó Jacob sobre la muerte de Raquel en este capítulo?', 'multiple',
    '["A) Que murió en Egipto","B) Que murió en el camino a Efrata (Belén)","C) Que murió de vieja","D) No la menciona"]'::jsonb,
    '1', 'Respuesta: B) Que murió en el camino a Efrata (Belén). Se me murió Raquel en la tierra de Canaán, en el camino... a Efrata, que es Belén (Génesis 48:7).', 5, true),

  (v_cap, '¿Qué le dijo Jacob a José sobre ver a su descendencia?', 'multiple',
    '["A) Que no esperaba verla","B) Que Dios le había hecho ver también a su descendencia","C) Que no le importaba","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Que Dios le había hecho ver también a su descendencia. No pensaba yo ver tu rostro, y he aquí Dios me ha hecho ver también a tu descendencia (Génesis 48:11).', 6, true),

  (v_cap, '¿Cómo bendijo Jacob a Efraín y Manasés en su fórmula de bendición?', 'multiple',
    '["A) Hágate Dios como a Efraín y como a Manasés","B) Sean malditos","C) No los bendijo","D) Solo mencionó a Efraín"]'::jsonb,
    '0', 'Respuesta: A) Hágate Dios como a Efraín y como a Manasés. En ti bendecirá Israel, diciendo: Hágate Dios como a Efraín y como a Manasés (Génesis 48:20).', 7, true),

  (v_cap, '¿Qué le prometió Jacob a José sobre volver a la tierra de sus padres?', 'multiple',
    '["A) Nada","B) Que Dios estaría con ellos y los haría volver","C) Que nunca volverían","D) Que se quedarían en Egipto para siempre"]'::jsonb,
    '1', 'Respuesta: B) Que Dios estaría con ellos y los haría volver. Dios estará con vosotros, y os hará volver a la tierra de vuestros padres (Génesis 48:21).', 8, true),

  (v_cap, '¿Qué le dio Jacob a José además de la bendición?', 'multiple',
    '["A) Nada extra","B) Una parte de tierra que tomó del amorreo con su espada y su arco","C) Todo su ganado","D) Su primogenitura"]'::jsonb,
    '1', 'Respuesta: B) Una parte de tierra que tomó del amorreo con su espada y su arco. Yo te he dado a ti una parte más que a tus hermanos, la cual tomé yo de mano del amorreo (Génesis 48:22).', 9, true),

  (v_cap, '¿Quién estaba enfermo al inicio de este capítulo?', 'multiple',
    '["A) José","B) Jacob (Israel)","C) Benjamín","D) Rubén"]'::jsonb,
    '1', 'Respuesta: B) Jacob (Israel). Dijeron a José: He aquí tu padre está enfermo (Génesis 48:1).', 10, true);
END $$;

-- ===== supabase\Genesis\053_preguntas_genesis49.sql =====
-- ============================================================
-- Migración 053: Preguntas del sistema — Génesis 49 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 49 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 49;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué le dijo Jacob a Rubén sobre por qué no sería el principal?', 'multiple',
    '["A) Por ser el más joven","B) Por haber subido al lecho de su padre","C) Por ser débil","D) Por desobediencia general"]'::jsonb,
    '1', 'Respuesta: B) Por haber subido al lecho de su padre. Por cuanto subiste al lecho de tu padre; entonces te envileciste (Génesis 49:4).', 1, true),

  (v_cap, '¿Qué dijo Jacob sobre Simeón y Leví?', 'multiple',
    '["A) Que serían los líderes","B) Que eran hermanos de armas de iniquidad, por su furor y violencia","C) Que serían sacerdotes","D) Que serían ricos"]'::jsonb,
    '1', 'Respuesta: B) Que eran hermanos de armas de iniquidad, por su furor y violencia. Simeón y Leví son hermanos; armas de iniquidad sus armas (Génesis 49:5).', 2, true),

  (v_cap, '¿A qué tribu se le prometió que el cetro no le sería quitado?', 'multiple',
    '["A) Rubén","B) Judá","C) Leví","D) Benjamín"]'::jsonb,
    '1', 'Respuesta: B) Judá. No será quitado el cetro de Judá (Génesis 49:10).', 3, true),

  (v_cap, '¿Con qué animal comparó Jacob a Judá?', 'multiple',
    '["A) Un cordero","B) Un cachorro de león","C) Una serpiente","D) Un águila"]'::jsonb,
    '1', 'Respuesta: B) Un cachorro de león. Cachorro de león, Judá (Génesis 49:9).', 4, true),

  (v_cap, '¿Qué tribu fue descrita como serpiente junto al camino?', 'multiple',
    '["A) Dan","B) Gad","C) Aser","D) Neftalí"]'::jsonb,
    '0', 'Respuesta: A) Dan. Será Dan serpiente junto al camino (Génesis 49:17).', 5, true),

  (v_cap, '¿A quién se comparó con una rama fructífera junto a una fuente?', 'multiple',
    '["A) Judá","B) José","C) Benjamín","D) Isacar"]'::jsonb,
    '1', 'Respuesta: B) José. Rama fructífera es José, rama fructífera junto a una fuente (Génesis 49:22).', 6, true),

  (v_cap, '¿Cómo describió Jacob a Benjamín?', 'multiple',
    '["A) Un cordero manso","B) Lobo arrebatador","C) Un pastor","D) Un rey"]'::jsonb,
    '1', 'Respuesta: B) Lobo arrebatador. Benjamín es lobo arrebatador (Génesis 49:27).', 7, true),

  (v_cap, '¿Dónde pidió Jacob ser sepultado?', 'multiple',
    '["A) En Egipto","B) En la cueva de Macpela, con sus padres","C) En el mar","D) No dijo nada"]'::jsonb,
    '1', 'Respuesta: B) En la cueva de Macpela, con sus padres. Sepultadme con mis padres en la cueva que está en el campo de Efrón el heteo (Génesis 49:29).', 8, true),

  (v_cap, '¿Quiénes ya estaban sepultados en esa cueva según mencionó Jacob?', 'multiple',
    '["A) Solo Abraham","B) Abraham, Sara, Isaac, Rebeca y Lea","C) Solo Isaac","D) Nadie aún"]'::jsonb,
    '1', 'Respuesta: B) Abraham, Sara, Isaac, Rebeca y Lea. Allí sepultaron a Abraham y a Sara su mujer; allí sepultaron a Isaac y a Rebeca su mujer; allí también sepulté yo a Lea (Génesis 49:31).', 9, true),

  (v_cap, '¿Qué hizo Jacob después de bendecir a sus doce hijos?', 'multiple',
    '["A) Se levantó a viajar","B) Encogió sus pies en la cama y expiró","C) Siguió hablando por días","D) Se enfermó pero vivió"]'::jsonb,
    '1', 'Respuesta: B) Encogió sus pies en la cama y expiró. Encogió sus pies en la cama, y expiró, y fue reunido con sus padres (Génesis 49:33).', 10, true);
END $$;

-- ===== supabase\Genesis\054_preguntas_genesis50.sql =====
-- ============================================================
-- Migración 054: Preguntas del sistema — Génesis 50 (Estudio Guiado)
-- ============================================================

DO $$
DECLARE
  v_cap UUID;
BEGIN
  -- Capítulo 50 de Génesis (libro_id = 1)
  SELECT id INTO v_cap FROM capitulos WHERE libro_id = 1 AND numero = 50;

  -- Idempotente: limpia preguntas previas de este capítulo
  DELETE FROM preguntas_sistema WHERE capitulo_id = v_cap;

  INSERT INTO preguntas_sistema (capitulo_id, texto, tipo, opciones, respuesta_correcta, explicacion, orden, activa) VALUES
  (v_cap, '¿Qué mandó hacer José con el cuerpo de su padre?', 'multiple',
    '["A) Enterrarlo de inmediato","B) Que lo embalsamaran los médicos","C) Quemarlo","D) Nada especial"]'::jsonb,
    '1', 'Respuesta: B) Que lo embalsamaran los médicos. Mandó José a sus siervos los médicos que embalsamasen a su padre (Génesis 50:2).', 1, true),

  (v_cap, '¿Cuántos días lloraron los egipcios a Jacob?', 'multiple',
    '["A) Cuarenta días","B) Setenta días","C) Cien días","D) Siete días"]'::jsonb,
    '1', 'Respuesta: B) Setenta días. Lo lloraron los egipcios setenta días (Génesis 50:3).', 2, true),

  (v_cap, '¿Dónde sepultaron a Jacob?', 'multiple',
    '["A) En Egipto","B) En la cueva de Macpela, en Canaán","C) En el desierto","D) En el Nilo"]'::jsonb,
    '1', 'Respuesta: B) En la cueva de Macpela, en Canaán. Lo sepultaron en la cueva del campo de Macpela (Génesis 50:13).', 3, true),

  (v_cap, '¿Qué temieron los hermanos de José después de la muerte de su padre?', 'multiple',
    '["A) Que José los perdonara","B) Que José se vengara del mal que le hicieron","C) Que los mataran los egipcios","D) Perder sus tierras"]'::jsonb,
    '1', 'Respuesta: B) Que José se vengara del mal que le hicieron. Quizá nos aborrecerá José, y nos dará el pago de todo el mal que le hicimos (Génesis 50:15).', 4, true),

  (v_cap, '¿Cómo respondió José al temor de sus hermanos?', 'multiple',
    '["A) Los castigó","B) Les dijo que no temieran, que Dios encaminó el mal para bien","C) Los ignoró","D) Los expulsó de Egipto"]'::jsonb,
    '1', 'Respuesta: B) Les dijo que no temieran, que Dios encaminó el mal para bien. No tengáis miedo... Dios lo encaminó a bien (Génesis 50:19-21).', 5, true),

  (v_cap, '¿Qué edad tenía José cuando murió?', 'multiple',
    '["A) Noventa años","B) Ciento diez años","C) Ciento veinte años","D) Ciento cincuenta años"]'::jsonb,
    '1', 'Respuesta: B) Ciento diez años. Murió José a la edad de ciento diez años (Génesis 50:26).', 6, true),

  (v_cap, '¿Qué juramento pidió José a los hijos de Israel antes de morir?', 'multiple',
    '["A) Que lo dejaran en Egipto","B) Que llevaran sus huesos de Egipto cuando Dios los visitara","C) Que lo olvidaran","D) Nada"]'::jsonb,
    '1', 'Respuesta: B) Que llevaran sus huesos de Egipto cuando Dios los visitara. Dios ciertamente os visitará, y haréis llevar de aquí mis huesos (Génesis 50:25).', 7, true),

  (v_cap, '¿Qué le prometió José a sus hermanos sobre el futuro?', 'multiple',
    '["A) Nada","B) Que Dios los visitaría y los llevaría a la tierra prometida","C) Que se quedarían en Egipto para siempre","D) Que serían esclavos"]'::jsonb,
    '1', 'Respuesta: B) Que Dios los visitaría y los llevaría a la tierra prometida. Dios ciertamente os visitará, y os hará subir de esta tierra a la tierra que juró a Abraham, a Isaac y a Jacob (Génesis 50:24).', 8, true),

  (v_cap, '¿Qué hicieron los hermanos al final para pedir perdón a José?', 'multiple',
    '["A) Nada","B) Se postraron y dijeron: Henos aquí por siervos tuyos","C) Huyeron","D) Lo desafiaron"]'::jsonb,
    '1', 'Respuesta: B) Se postraron y dijeron: Henos aquí por siervos tuyos. Vinieron también sus hermanos y se postraron delante de él, y dijeron: Henos aquí por siervos tuyos (Génesis 50:18).', 9, true),

  (v_cap, '¿Hasta qué generación de descendientes de Efraín llegó a ver José?', 'multiple',
    '["A) Ninguna","B) Hasta la tercera generación","C) Solo la primera","D) No se menciona"]'::jsonb,
    '1', 'Respuesta: B) Hasta la tercera generación. Vio José los hijos de Efraín hasta la tercera generación (Génesis 50:23).', 10, true);
END $$;

-- ===== supabase\migraciones\001_initial_schema.sql =====
-- ============================================================
-- FormsBiblicos — Migración 001: Esquema Inicial
-- ============================================================

-- Extender UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: perfiles (extiende auth.users de Supabase)
-- ============================================================
CREATE TABLE IF NOT EXISTS perfiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('owner', 'admin', 'editor', 'usuario')),
    activo BOOLEAN DEFAULT TRUE,
    grupo_id UUID,
    foto_perfil TEXT,
    preferencias JSONB DEFAULT '{"alto_contraste": false, "letra_grande": false}'::jsonb,
    ultimo_acceso TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: grupos (clases)
-- ============================================================
CREATE TABLE IF NOT EXISTS grupos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    admin_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE perfiles ADD CONSTRAINT fk_perfil_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE SET NULL;

-- ============================================================
-- TABLA: miembros_grupo (relación muchos-a-muchos)
-- ============================================================
CREATE TABLE IF NOT EXISTS miembros_grupo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    rol_en_grupo TEXT NOT NULL DEFAULT 'miembro' CHECK (rol_en_grupo IN ('admin', 'editor', 'miembro')),
    UNIQUE(grupo_id, usuario_id),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: libros_biblicos (catálogo)
-- ============================================================
CREATE TABLE IF NOT EXISTS libros_biblicos (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    testamento TEXT NOT NULL CHECK (testamento IN ('antiguo', 'nuevo')),
    num_capitulos INTEGER NOT NULL,
    abreviatura TEXT
);

-- ============================================================
-- TABLA: capitulos
-- ============================================================
CREATE TABLE IF NOT EXISTS capitulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    libro_id INTEGER NOT NULL REFERENCES libros_biblicos(id),
    numero INTEGER NOT NULL,
    UNIQUE(libro_id, numero)
);

-- ============================================================
-- TABLA: versiculos (texto bíblico)
-- ============================================================
CREATE TABLE IF NOT EXISTS versiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capitulo_id UUID NOT NULL REFERENCES capitulos(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    texto TEXT NOT NULL,
    UNIQUE(capitulo_id, numero)
);

-- ============================================================
-- TABLA: progreso_lectura
-- ============================================================
CREATE TABLE IF NOT EXISTS progreso_lectura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    capitulo_id UUID NOT NULL REFERENCES capitulos(id),
    leido BOOLEAN DEFAULT FALSE,
    fecha_lectura TIMESTAMPTZ,
    tiempo_segundos INTEGER DEFAULT 0,
    completado BOOLEAN DEFAULT FALSE,
    UNIQUE(usuario_id, capitulo_id),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: preguntas_sistema (Mundo 1: Estudio Guiado)
-- ============================================================
CREATE TABLE IF NOT EXISTS preguntas_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capitulo_id UUID NOT NULL REFERENCES capitulos(id),
    creado_por UUID REFERENCES perfiles(id),
    texto TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('multiple', 'verdadero_falso', 'respuesta_corta', 'completar')),
    opciones JSONB,
    respuesta_correcta TEXT NOT NULL,
    explicacion TEXT DEFAULT '',
    orden INTEGER DEFAULT 0,
    activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: examenes_personalizados (Mundo 2: Exámenes del Profesor)
-- ============================================================
CREATE TABLE IF NOT EXISTS examenes_personalizados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    creado_por UUID NOT NULL REFERENCES perfiles(id),
    titulo TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    referencia_biblica JSONB,
    preguntas JSONB NOT NULL,
    puntos_totales INTEGER DEFAULT 0,
    fecha_limite TIMESTAMPTZ,
    estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'publicado', 'cerrado', 'archivado')),
    publicado BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: intentos_examen_personalizado
-- ============================================================
CREATE TABLE IF NOT EXISTS intentos_examen_personalizado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    examen_id UUID NOT NULL REFERENCES examenes_personalizados(id) ON DELETE CASCADE,
    alumno_id UUID NOT NULL REFERENCES perfiles(id),
    respuestas JSONB,
    puntuacion DECIMAL(5,2),
    nota DECIMAL(5,2),
    corregido BOOLEAN DEFAULT FALSE,
    corregido_por UUID REFERENCES perfiles(id),
    observaciones TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completado', 'calificado')),
    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
    fecha_completado TIMESTAMPTZ,
    fecha_corregido TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: tarjetas_memorizacion
-- ============================================================
CREATE TABLE IF NOT EXISTS tarjetas_memorizacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    versiculo_id UUID NOT NULL REFERENCES versiculos(id),
    repeticiones INTEGER DEFAULT 0,
    factor_facilidad DECIMAL(4,2) DEFAULT 2.50,
    intervalo INTEGER DEFAULT 0,
    proximo_repaso TIMESTAMPTZ DEFAULT NOW(),
    activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: repasos_memorizacion (historial)
-- ============================================================
CREATE TABLE IF NOT EXISTS repasos_memorizacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarjeta_id UUID NOT NULL REFERENCES tarjetas_memorizacion(id) ON DELETE CASCADE,
    calidad INTEGER NOT NULL CHECK (calidad >= 0 AND calidad <= 5),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: logros
-- ============================================================
CREATE TABLE IF NOT EXISTS logros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    icono TEXT DEFAULT '🏆'
);

-- ============================================================
-- TABLA: logros_usuario
-- ============================================================
CREATE TABLE IF NOT EXISTS logros_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    logro_id UUID NOT NULL REFERENCES logros(id),
    UNIQUE(usuario_id, logro_id),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: auditoria
-- ============================================================
CREATE TABLE IF NOT EXISTS auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accion TEXT NOT NULL,
    detalle TEXT DEFAULT '',
    actor_id UUID REFERENCES perfiles(id),
    grupo_id UUID REFERENCES grupos(id),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);


-- ===== supabase\migraciones\002_seed_data.sql =====
-- ============================================================
-- Migración 002: Datos iniciales — libros bíblicos y usuarios
-- ============================================================

-- Libros del Antiguo Testamento
INSERT INTO libros_biblicos (id, nombre, testamento, num_capitulos, abreviatura) VALUES
(1,  'Génesis',      'antiguo', 50, 'Gén'),
(2,  'Éxodo',        'antiguo', 40, 'Éx'),
(3,  'Levítico',     'antiguo', 27, 'Lv'),
(4,  'Números',      'antiguo', 36, 'Núm'),
(5,  'Deuteronomio', 'antiguo', 34, 'Dt'),
(6,  'Josué',        'antiguo', 24, 'Jos'),
(7,  'Jueces',       'antiguo', 21, 'Jue'),
(8,  'Rut',          'antiguo', 4,  'Rut'),
(9,  '1 Samuel',     'antiguo', 31, '1 S'),
(10, '2 Samuel',     'antiguo', 24, '2 S'),
(11, '1 Reyes',      'antiguo', 22, '1 R'),
(12, '2 Reyes',      'antiguo', 25, '2 R'),
(13, '1 Crónicas',   'antiguo', 29, '1 Cr'),
(14, '2 Crónicas',   'antiguo', 36, '2 Cr'),
(15, 'Esdras',       'antiguo', 10, 'Esd'),
(16, 'Nehemías',     'antiguo', 13, 'Neh'),
(17, 'Ester',        'antiguo', 10, 'Est'),
(18, 'Job',          'antiguo', 42, 'Job'),
(19, 'Salmos',       'antiguo', 150, 'Sal'),
(20, 'Proverbios',   'antiguo', 31, 'Pr'),
(21, 'Eclesiastés',  'antiguo', 12, 'Ec'),
(22, 'Cantares',     'antiguo', 8,  'Cnt'),
(23, 'Isaías',       'antiguo', 66, 'Is'),
(24, 'Jeremías',     'antiguo', 52, 'Jer'),
(25, 'Lamentaciones','antiguo', 5,  'Lam'),
(26, 'Ezequiel',     'antiguo', 48, 'Ez'),
(27, 'Daniel',       'antiguo', 12, 'Dn'),
(28, 'Oseas',        'antiguo', 14, 'Os'),
(29, 'Joel',         'antiguo', 3,  'Jl'),
(30, 'Amós',         'antiguo', 9,  'Am'),
(31, 'Abdías',       'antiguo', 1,  'Abd'),
(32, 'Jonás',        'antiguo', 4,  'Jon'),
(33, 'Miqueas',      'antiguo', 7,  'Miq'),
(34, 'Nahúm',        'antiguo', 3,  'Nah'),
(35, 'Habacuc',      'antiguo', 3,  'Hab'),
(36, 'Sofonías',     'antiguo', 3,  'Sof'),
(37, 'Hageo',        'antiguo', 2,  'Hag'),
(38, 'Zacarías',     'antiguo', 14, 'Zac'),
(39, 'Malaquías',    'antiguo', 4,  'Mal')
ON CONFLICT (id) DO NOTHING;

-- Libros del Nuevo Testamento
INSERT INTO libros_biblicos (id, nombre, testamento, num_capitulos, abreviatura) VALUES
(40, 'Mateo',        'nuevo', 28, 'Mt'),
(41, 'Marcos',       'nuevo', 16, 'Mr'),
(42, 'Lucas',        'nuevo', 24, 'Lc'),
(43, 'Juan',         'nuevo', 21, 'Jn'),
(44, 'Hechos',       'nuevo', 28, 'Hch'),
(45, 'Romanos',      'nuevo', 16, 'Ro'),
(46, '1 Corintios',  'nuevo', 16, '1 Co'),
(47, '2 Corintios',  'nuevo', 13, '2 Co'),
(48, 'Gálatas',      'nuevo', 6,  'Gá'),
(49, 'Efesios',      'nuevo', 6,  'Ef'),
(50, 'Filipenses',   'nuevo', 4,  'Fil'),
(51, 'Colosenses',   'nuevo', 4,  'Col'),
(52, '1 Tesalonicenses','nuevo', 3, '1 Ts'),
(53, '2 Tesalonicenses','nuevo', 3, '2 Ts'),
(54, '1 Timoteo',    'nuevo', 6,  '1 Ti'),
(55, '2 Timoteo',    'nuevo', 4,  '2 Ti'),
(56, 'Tito',         'nuevo', 3,  'Tit'),
(57, 'Filemón',      'nuevo', 1,  'Flm'),
(58, 'Hebreos',      'nuevo', 13, 'Heb'),
(59, 'Santiago',     'nuevo', 5,  'Stg'),
(60, '1 Pedro',      'nuevo', 5,  '1 P'),
(61, '2 Pedro',      'nuevo', 3,  '2 P'),
(62, '1 Juan',       'nuevo', 5,  '1 Jn'),
(63, '2 Juan',       'nuevo', 1,  '2 Jn'),
(64, '3 Juan',       'nuevo', 1,  '3 Jn'),
(65, 'Judas',        'nuevo', 1,  'Jud'),
(66, 'Apocalipsis',  'nuevo', 22, 'Ap')
ON CONFLICT (id) DO NOTHING;

-- Generar capítulos automáticamente
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id, num_capitulos FROM libros_biblicos LOOP
    FOR i IN 1..rec.num_capitulos LOOP
      INSERT INTO capitulos (libro_id, numero)
      VALUES (rec.id, i)
      ON CONFLICT (libro_id, numero) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Usuarios por defecto
-- Usuarios demo. El password se guarda como hash SHA-256 (hex),
-- igual que hace el panel de administración al crear usuarios.
-- Contraseñas reales: owner/owner123 · admin1/admin123 · editor1/editor123 · alumno/alumno123 · usuario/usuario
INSERT INTO perfiles (username, password, nombre_completo, rol) VALUES
('owner',  '43a0d17178a9d26c9e0fe9a74b0b45e38d32f27aed887a008a54bf6e033bf7b9', 'Propietario',    'owner'),
('admin1', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Admin Central',  'admin'),
('editor1','ef5e5a1fb95055e0e56cccf98a41e784a132c14e7f6e1ba244302f0e72b29baf', 'Editor Demo',    'editor'),
('alumno', 'c1042ecc51482cef39f2e89e1273a35074db7f873f1ac6050efd546a9bceefc0', 'Alumno Demo',    'usuario'),
('usuario','9250e222c4c71f0c58d4c54b50a880a312e9f9fed55d5c3aa0b0e860ded99165', 'Usuario Demo',   'usuario')
ON CONFLICT (username) DO NOTHING;

-- Grupo por defecto
INSERT INTO grupos (id, nombre, admin_id)
SELECT gen_random_uuid(), 'Grupo Central', id FROM perfiles WHERE username = 'admin1'
ON CONFLICT DO NOTHING;

-- Asignar alumnos al grupo
DO $$
DECLARE
  v_grupo_id UUID;
  v_editor_id UUID;
  v_admin_id UUID;
  v_alumno_id UUID;
BEGIN
  SELECT id INTO v_grupo_id FROM grupos WHERE nombre = 'Grupo Central' LIMIT 1;
  SELECT id INTO v_admin_id FROM perfiles WHERE username = 'admin1';
  SELECT id INTO v_editor_id FROM perfiles WHERE username = 'editor1';
  SELECT id INTO v_alumno_id FROM perfiles WHERE username = 'alumno';

  IF v_grupo_id IS NOT NULL THEN
    UPDATE perfiles SET grupo_id = v_grupo_id WHERE id IN (v_admin_id, v_editor_id, v_alumno_id);

    INSERT INTO miembros_grupo (grupo_id, usuario_id, rol_en_grupo) VALUES
    (v_grupo_id, v_admin_id,  'admin'),
    (v_grupo_id, v_editor_id, 'editor'),
    (v_grupo_id, v_alumno_id, 'miembro')
    ON CONFLICT (grupo_id, usuario_id) DO NOTHING;
  END IF;
END $$;

SELECT '✅ Migración 002 completada' AS mensaje;


-- ===== supabase\migraciones\006_estudio_completado.sql =====
-- ============================================================
-- Migración 006: Seguimiento de estudio completado (Modo Estudio)
-- ============================================================
-- Marca cuándo un capítulo ha superado TODO el proceso de estudio
-- (responder todas las preguntas, ver el resumen y corregir los
-- errores en el repaso), no solo haberse leído.

ALTER TABLE progreso_lectura ADD COLUMN IF NOT EXISTS estudio_completado BOOLEAN DEFAULT FALSE;


-- ===== supabase\migraciones\007_memorizacion_manual.sql =====
-- ============================================================
-- FormsBiblicos — Migración 007: Memorización manual de versículos
-- Permite crear tarjetas de memorización sin depender de un
-- versículo del catálogo (el usuario estudia en Biblia física).
-- ============================================================

ALTER TABLE tarjetas_memorizacion ALTER COLUMN versiculo_id DROP NOT NULL;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS referencia TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS texto TEXT DEFAULT '';


-- ===== supabase\migraciones\008_correccion_examenes.sql =====
-- ============================================================
-- FormsBiblicos — Migración 008: Corrección por pregunta
-- Soporte para corrección manual detallada de cada respuesta
-- (preguntas de respuesta libre, puntos parciales y comentarios
-- por pregunta). Se almacena como JSONB en el intento.
-- ============================================================

ALTER TABLE intentos_examen_personalizado
  ADD COLUMN IF NOT EXISTS correccion JSONB DEFAULT '{}'::jsonb;


-- ===== supabase\migraciones\009_evaluaciones.sql =====
-- Migración 009: Evaluaciones (períodos académicos) que agrupan exámenes
-- Una evaluación contiene varios exámenes; la nota media se calcula por alumno
-- a partir de las notas registradas en los exámenes de esa evaluación.

CREATE TABLE IF NOT EXISTS evaluaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID REFERENCES grupos(id) ON DELETE CASCADE,
  creado_por UUID REFERENCES perfiles(id),
  titulo TEXT NOT NULL,
  asignatura TEXT DEFAULT '',
  descripcion TEXT DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE examenes_personalizados
  ADD COLUMN IF NOT EXISTS evaluacion_id UUID REFERENCES evaluaciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_examenes_evaluacion ON examenes_personalizados(evaluacion_id);

-- El proyecto NO usa RLS en las demás tablas: funcionan con los privilegios
-- que Supabase otorga por defecto al rol anon. Para que evaluaciones se comporte
-- igual, nos aseguramos de que RLS esté desactivado y de otorgar acceso al rol anon
-- (necesario si la tabla se creó desde el editor visual de Supabase, que no lo hace).
ALTER TABLE evaluaciones DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acceso_anon_evaluaciones" ON evaluaciones;

GRANT ALL ON TABLE evaluaciones TO anon;
GRANT ALL ON TABLE evaluaciones TO authenticated;


-- ===== supabase\migraciones\010_permisos_admin.sql =====
-- Migración 010: Permisos del rol anon para las funciones de administración
-- El proyecto NO usa RLS; las tablas funcionan con los privilegios que
-- Supabase otorga al rol anon. Para que el "Panel de Administración" pueda
-- crear usuarios, grupos y registrar auditoría (operaciones INSERT/UPDATE/DELETE),
-- el rol anon necesita permisos explícitos sobre estas tablas.
-- También se otorga acceso a authenticated por coherencia.

ALTER TABLE perfiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE grupos DISABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE perfiles TO anon;
GRANT ALL ON TABLE perfiles TO authenticated;

GRANT ALL ON TABLE grupos TO anon;
GRANT ALL ON TABLE grupos TO authenticated;

GRANT ALL ON TABLE auditoria TO anon;
GRANT ALL ON TABLE auditoria TO authenticated;


-- ===== supabase\migraciones\011_foto_perfil.sql =====
-- ============================================================
-- MIGRACIÓN 011: Agregar columna foto_perfil a perfiles
-- ============================================================
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS foto_perfil TEXT;


-- ===== supabase\migraciones\012_categorias_memorizacion.sql =====
CREATE TABLE IF NOT EXISTS categorias_memorizacion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now(),
  UNIQUE(usuario_id, nombre)
);

ALTER TABLE categorias_memorizacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus categorías" ON categorias_memorizacion
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios crean sus categorías" ON categorias_memorizacion
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios actualizan sus categorías" ON categorias_memorizacion
  FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios eliminan sus categorías" ON categorias_memorizacion
  FOR DELETE USING (auth.uid() = usuario_id);

CREATE TABLE IF NOT EXISTS categorias_tarjetas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tarjeta_id UUID NOT NULL REFERENCES tarjetas_memorizacion(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES categorias_memorizacion(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(tarjeta_id, categoria_id)
);

ALTER TABLE categorias_tarjetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus asignaciones" ON categorias_tarjetas
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios crean sus asignaciones" ON categorias_tarjetas
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios eliminan sus asignaciones" ON categorias_tarjetas
  FOR DELETE USING (auth.uid() = usuario_id);


-- ===== supabase\migraciones\013_fix_categorias_rls.sql =====
-- Corrección: el app usa auth custom, no Supabase Auth.
-- auth.uid() es null → RLS bloquea todo. Eliminamos RLS de estas tablas.

ALTER TABLE categorias_memorizacion DISABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_tarjetas DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus categorías" ON categorias_memorizacion;
DROP POLICY IF EXISTS "Usuarios crean sus categorías" ON categorias_memorizacion;
DROP POLICY IF EXISTS "Usuarios actualizan sus categorías" ON categorias_memorizacion;
DROP POLICY IF EXISTS "Usuarios eliminan sus categorías" ON categorias_memorizacion;

DROP POLICY IF EXISTS "Usuarios ven sus asignaciones" ON categorias_tarjetas;
DROP POLICY IF EXISTS "Usuarios crean sus asignaciones" ON categorias_tarjetas;
DROP POLICY IF EXISTS "Usuarios eliminan sus asignaciones" ON categorias_tarjetas;


-- ===== supabase\migraciones\014_agregar_pista_tarjetas.sql =====
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS pista TEXT DEFAULT '';


-- ===== supabase\migraciones\015_notas_capitulo.sql =====
CREATE TABLE IF NOT EXISTS notas_capitulo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL,
  libro_nombre TEXT NOT NULL,
  capitulo_numero INTEGER NOT NULL,
  contenido TEXT NOT NULL DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notas_capitulo DISABLE ROW LEVEL SECURITY;


-- ===== supabase\migraciones\016_campos_memorizacion.sql =====
-- ============================================================
-- FormsBiblicos — Migración 016: Campos de seguimiento memorización
-- Añade campos de progreso y reemplaza cálculo de nivel por
-- derivación automática desde el intervalo.
-- ============================================================

ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS mejor_racha INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS veces_olvidado INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS ultima_calificacion INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS ultimo_repaso TIMESTAMPTZ;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS racha_actual INTEGER DEFAULT 0;


-- ===== supabase\migraciones\017_campos_examen_personalizado.sql =====
-- ============================================================================
-- FormsBiblicos — Migración 017: Campos del Editor de Exámenes
-- ============================================================================
--
-- MOTIVO: el editor de exámenes (`vista-examen-editor.js`) envía al upsert de
-- `examenes_personalizados` los campos `materia`, `tema`, `profesor`, `color`,
-- `icono`, `portada` y `config` (objeto JSON con modo/fechas/intentos, etc).
-- Estos campos pertenecen al editor avanzado estilo Google Forms pero NUNCA
-- fueron añadidos al schema inicial (001), por lo que PostgREST responde con:
--   "Could not find the 'color' column of 'examenes_personalizados' in the schema cache"
--
-- Esta migración añade TODAS las columnas faltantes usando `ADD COLUMN IF NOT
-- EXISTS` (operación idempotente: aplicar varias veces no rompe nada).
--
-- CÓMO APLICAR: pegar el contenido de este archivo en el SQL editor del
-- dashboard de Supabase y ejecutar. La operación es segura porque todas las
-- columnas tienen DEFAULT, así que las filas existentes reciben valores
-- sensatos sin tocar nada.
-- ============================================================================

ALTER TABLE examenes_personalizados
  ADD COLUMN IF NOT EXISTS materia   TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS tema      TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS profesor  TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS color     TEXT    DEFAULT '#673ab7',
  ADD COLUMN IF NOT EXISTS icono     TEXT    DEFAULT '📘',
  ADD COLUMN IF NOT EXISTS portada   TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS config    JSONB   DEFAULT '{}'::jsonb;

-- Documentación inline de cada nuevo campo (visible en psql \d+ y en el
-- dashboard de Supabase como comentario de columna).
COMMENT ON COLUMN examenes_personalizados.materia  IS 'Materia o asignatura del examen (ej: Historia de la Iglesia)';
COMMENT ON COLUMN examenes_personalizados.tema     IS 'Tema específico dentro de la materia (ej: Hechos 1-12)';
COMMENT ON COLUMN examenes_personalizados.profesor IS 'Nombre del profesor que crea el examen (mostrado al alumno)';
COMMENT ON COLUMN examenes_personalizados.color    IS 'Color hex del tema en formato #RRGGBB (editor visual)';
COMMENT ON COLUMN examenes_personalizados.icono    IS 'Emoji representativo del examen (selector en info general)';
COMMENT ON COLUMN examenes_personalizados.portada  IS 'URL opcional de imagen de portada del examen';
COMMENT ON COLUMN examenes_personalizados.config   IS 'Configuración JSON del examen (modo, fechas inicio/fin, intentos, temporizador, navegación, corrección, resultados visibles, seguridad, etc)';

COMMENT ON TABLE examenes_personalizados IS
  'Exámenes personalizados creados por profesores/admin/owner. Incluye metadatos del editor (materia, tema, profesor, color, icono, portada) y configuración JSON. Esquema original 001 + extensión 009 (evaluacion_id) + extensión 017 (editor avanzado).';

-- ============================================================================
-- Notas operativas
-- ============================================================================
-- 1. ¿Por qué no uso una migración con CREATE TABLE nueva y renombrar?
--    Sería invasivo: obligaría a copiar datos existentes y a actualizar todas
--    las referencias (FK, RLS, índices, triggers). Con ALTER ADD COLUMN IF NOT
--    EXISTS preservamos todo y añadimos sin riesgo.
--
-- 2. ¿Por qué config como JSONB y no como columnas separadas?
--    El editor construye el objeto `config` con UNKNOWN shape en cada pestaña
--    (modo, fechas, intentos, temporizador, navegación, corrección, etc).
--    Convertirlo a columnas requeriría una migración por cada nuevo toggle de
--    la app. JSONB es forward-compatible.
--
-- 3. Después de aplicar esta migración, los datos antiguos siguen completamente
--    accesibles: las nuevas columnas tienen defaults que no rompen lecturas
--    existentes (materia='', tema='', color='#673ab7', icono='📘', portada='',
--    config='{}').
-- ============================================================================


-- ===== supabase\migraciones\018_sugerencias.sql =====
-- ============================================================
-- Migración 018: Sugerencias de los usuarios
-- Los usuarios pueden enviar comentarios (errores, ideas de
-- contenido, mejoras) desde su perfil y ver el estado de cada
-- una. Solo el Owner gestiona el estado y puede responder.
-- ============================================================

CREATE TABLE IF NOT EXISTS sugerencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL DEFAULT 'general'
    CHECK (categoria IN ('error', 'idea', 'mejora', 'contenido', 'otro')),
  texto TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'enviada'
    CHECK (estado IN ('enviada', 'en_revision', 'aceptada', 'implementada', 'rechazada')),
  respuesta TEXT DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sugerencias_usuario ON sugerencias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sugerencias_estado ON sugerencias(estado);

-- RLS: el proyecto usa autenticación custom (anon). Las políticas
-- siguen el patrón de 002_anon_custom_auth.sql: abiertas para anon.
ALTER TABLE sugerencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sugerencias_anon_all" ON sugerencias;
CREATE POLICY "sugerencias_anon_all" ON sugerencias FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE sugerencias TO anon;
GRANT ALL ON TABLE sugerencias TO authenticated;


-- ===== supabase\migraciones\019_mejoras_notas.sql =====
-- ============================================================
-- Migración 019: Mejoras de notas
-- 1) Columnas que el repositorio (js/datos/notas-repository.js)
--    ya usa pero no existían: tipo, titulo, pendiente_sync.
--    Sin ellas, el guardado online de notas falla y cae al caché.
-- 2) Nueva columna fijada: notas fijadas/pinned arriba de la lista.
-- ============================================================

ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'personal';
ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS titulo TEXT DEFAULT '';
ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS pendiente_sync BOOLEAN DEFAULT FALSE;
ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS fijada BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_notas_usuario_tipo ON notas_capitulo(usuario_id, tipo);
CREATE INDEX IF NOT EXISTS idx_notas_usuario_fijada ON notas_capitulo(usuario_id, fijada);


-- ===== supabase\migraciones\020_configuracion.sql =====
-- ============================================================
-- Migración 020: Tabla de configuración global (clave-valor)
-- Almacena ajustes del sistema gestionados desde el panel de
-- propietario (configuracion global). Con esta tabla creada,
-- admin-repository puede dejar de usar try/catch defensivos.
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL DEFAULT '',
  actualizado_en TIMESTAMPTZ DEFAULT now(),
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- RLS: el proyecto usa autenticación custom (anon). Las políticas
-- siguen el patrón de 002_anon_custom_auth.sql: abiertas para anon.
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "configuracion_anon_all" ON configuracion;
CREATE POLICY "configuracion_anon_all" ON configuracion FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE configuracion TO anon;
GRANT ALL ON TABLE configuracion TO authenticated;


-- ===== supabase\migraciones\021_mazos_memorizacion.sql =====
-- ============================================================
-- Migración 021: Mazos de memorización (flashcards tipo Anki)
-- Organiza las tarjetas en mazos. Cada tarjeta pertenece a un
-- solo mazo (mazo_id). Soporta versículos bíblicos y tarjetas
-- libres (pregunta/respuesta) mediante el campo tipo.
-- ============================================================

CREATE TABLE IF NOT EXISTS mazos_memorizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  color TEXT DEFAULT '#3B82F6',
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mazos_usuario ON mazos_memorizacion(usuario_id);

-- Cada tarjeta pertenece a un mazo. Si el mazo se borra, la
-- tarjeta pasa a "Sin mazo" (ON DELETE SET NULL) en lugar de
-- perderse.
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS mazo_id UUID REFERENCES mazos_memorizacion(id) ON DELETE SET NULL;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'versiculo' CHECK (tipo IN ('versiculo', 'libre'));
CREATE INDEX IF NOT EXISTS idx_tarjetas_mazo ON tarjetas_memorizacion(mazo_id);

-- RLS: el proyecto usa autenticación custom (anon). Las políticas
-- siguen el patrón de 002_anon_custom_auth.sql: abiertas para anon.
ALTER TABLE mazos_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mazos_anon_all" ON mazos_memorizacion;
CREATE POLICY "mazos_anon_all" ON mazos_memorizacion FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE mazos_memorizacion TO anon;
GRANT ALL ON TABLE mazos_memorizacion TO authenticated;


-- ===== supabase\migraciones\022_panel_administracion.sql =====
-- ============================================================
-- Migración 022: Panel de Administración — Backups y sistema
-- Añade la tabla `backups` (snapshots JSON de la base de datos
-- creados desde el Centro de Administración) y utilidades de
-- soporte para las herramientas del Owner.
-- ============================================================

-- ============================================================
-- TABLA: backups (copias de seguridad del Owner)
-- Cada fila es un snapshot JSONB de perfiles/grupos/exámenes/
-- configuracion. Permite exportar, listar, eliminar y restaurar
-- copias desde la pestaña Sistema del panel de propietario.
-- ============================================================
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  tamano_bytes INTEGER DEFAULT 0,
  snapshot JSONB DEFAULT '{}'::jsonb,
  estado TEXT NOT NULL DEFAULT 'ok' CHECK (estado IN ('ok', 'fallido')),
  notas TEXT DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backups_creado ON backups(creado_en DESC);

-- RLS: el proyecto usa autenticación custom (anon). Las políticas
-- siguen el patrón de 002_anon_custom_auth.sql: abiertas para anon.
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "backups_anon_all" ON backups;
CREATE POLICY "backups_anon_all" ON backups FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE backups TO anon;
GRANT ALL ON TABLE backups TO authenticated;

-- ============================================================
-- NOTA sobre modo mantenimiento:
-- Se guarda como clave-valor en la tabla `configuracion`
-- (clave 'modo_mantenimiento' = '1'/'0'), creada en la
-- migración 020. No requiere columnas nuevas.
-- ============================================================


-- ===== supabase\migraciones\023_memorizacion_juego.sql =====
-- ============================================================
-- Migración 023: Memorización tipo juego (estilo Duolingo)
-- ------------------------------------------------------------
-- Cambios:
--  1. mazos_memorizacion pasa a ser contenido GLOBAL (usuario_id
--     NULL = visible para todos; creado por admin). Se añaden
--     icono, orden, activo y es_global.
--  2. tarjetas_memorizacion pasa a ser contenido global: se quita
--     la obligación de usuario_id (NULL = tarjeta global) y se
--     amplía 'tipo' a los tipos de ejercicio del juego.
--     Se añaden: explicacion, categoria, libro, capitulo,
--     versiculo, opciones (JSONB), orden y creado_por.
--  3. Nueva tabla progreso_tarjetas_memorizacion: el progreso
--     (SM-2 + nivel) es INDIVIDUAL por usuario, separado del
--     contenido compartido.
--  4. repasos_memorizacion: se añade usuario_id para registrar
--     quién hizo cada repaso.
-- ============================================================

-- ------------------------------------------------------------
-- 1. MAZOS: contenido global
-- ------------------------------------------------------------
ALTER TABLE mazos_memorizacion ALTER COLUMN usuario_id DROP NOT NULL;

ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS icono TEXT DEFAULT 'layers';
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS es_global BOOLEAN DEFAULT FALSE;
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 2. TARJETAS: contenido global + tipos de ejercicio
-- ------------------------------------------------------------
-- usuario_id pasa a ser opcional (NULL = tarjeta global)
ALTER TABLE tarjetas_memorizacion ALTER COLUMN usuario_id DROP NOT NULL;

-- Nuevos campos de contenido enriquecido
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS explicacion TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS libro TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS capitulo TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS versiculo TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS opciones JSONB DEFAULT NULL;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL;

-- Ampliar el tipo de tarjeta (reemplazar el CHECK anterior)
ALTER TABLE tarjetas_memorizacion DROP CONSTRAINT IF EXISTS tarjetas_memorizacion_tipo_check;
ALTER TABLE tarjetas_memorizacion ADD CONSTRAINT tarjetas_memorizacion_tipo_check
  CHECK (tipo IN (
    'versiculo',          -- contenido bíblico: se juega como completar/ordenar/elegir
    'libre',              -- tarjeta libre pregunta/respuesta (legacy)
    'completar',          -- completar palabras
    'ordenar',            -- ordenar palabras
    'elegir_versiculo',   -- elegir el versículo correcto dada la referencia
    'verdadero_falso',    -- verdadero o falso
    'relacionar',         -- emparejar pares
    'escrita',            -- respuesta escrita
    'personaje',          -- ¿quién...?
    'lugar',              -- ¿dónde...?
    'libro',              -- ¿en qué libro...?
    'cronologia',         -- ordenar acontecimientos
    'multirrespuesta'     -- seleccionar varias respuestas
  ));

CREATE INDEX IF NOT EXISTS idx_tarjetas_orden ON tarjetas_memorizacion(mazo_id, orden);

-- ------------------------------------------------------------
-- 3. PROGRESO INDIVIDUAL (SM-2 + nivel por usuario)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS progreso_tarjetas_memorizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tarjeta_id UUID NOT NULL REFERENCES tarjetas_memorizacion(id) ON DELETE CASCADE,
  repeticiones INTEGER DEFAULT 0,
  factor_facilidad DECIMAL(4,2) DEFAULT 2.50,
  intervalo INTEGER DEFAULT 0,
  proximo_repaso TIMESTAMPTZ DEFAULT NOW(),
  ultimo_repaso TIMESTAMPTZ,
  racha_actual INTEGER DEFAULT 0,
  mejor_racha INTEGER DEFAULT 0,
  veces_olvidado INTEGER DEFAULT 0,
  ultima_calificacion INTEGER,
  nivel TEXT DEFAULT 'nueva' CHECK (nivel IN ('nueva', 'aprendiendo', 'dominada', 'perfecta')),
  UNIQUE(usuario_id, tarjeta_id),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progreso_tarjeta ON progreso_tarjetas_memorizacion(tarjeta_id);
CREATE INDEX IF NOT EXISTS idx_progreso_usuario ON progreso_tarjetas_memorizacion(usuario_id);

-- ------------------------------------------------------------
-- 4. REPASOS: registrar quién repasa
-- ------------------------------------------------------------
ALTER TABLE repasos_memorizacion ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_repasos_usuario ON repasos_memorizacion(usuario_id);

-- ------------------------------------------------------------
-- RLS: el proyecto usa autenticación custom (anon). Políticas
-- abiertas para anon, siguiendo el patrón de 002_anon_custom_auth.sql
-- ------------------------------------------------------------
ALTER TABLE progreso_tarjetas_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progreso_anon_all" ON progreso_tarjetas_memorizacion;
CREATE POLICY "progreso_anon_all" ON progreso_tarjetas_memorizacion FOR ALL TO anon USING (true) WITH CHECK (true);
GRANT ALL ON TABLE progreso_tarjetas_memorizacion TO anon;
GRANT ALL ON TABLE progreso_tarjetas_memorizacion TO authenticated;

-- Migrar datos existentes: las tarjetas personales de los usuarios
-- pasan a tener mazo_id NULL (Sin mazo) para no mezclarlas con los
-- mazos globales. Su progreso SM-2 se conserva en las propias filas
-- (legacy); el nuevo progreso se creará bajo demanda.


-- ===== supabase\migraciones\024_notas_personales.sql =====
-- ============================================================
-- Migración 024: Notas personales (bloc de notas estilo Xiaomi/Apple Notes)
-- ============================================================
-- Crea una tabla independiente para las notas personales de cada usuario:
-- sin estructura de libro/capítulo, con soporte de papelera, color de
-- fondo, fijación y ordenación por última modificación.
--
-- La tabla legacy `notas_capitulo` se mantiene para las notas de sesión
-- de estudio (tipo='sesion') que usa vista-sesion-estudio.

CREATE TABLE IF NOT EXISTS notas_personales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL,
  titulo TEXT NOT NULL DEFAULT '',
  contenido TEXT NOT NULL DEFAULT '',
  fijada BOOLEAN NOT NULL DEFAULT FALSE,
  en_papelera BOOLEAN NOT NULL DEFAULT FALSE,
  eliminada_en TIMESTAMPTZ,
  color_fondo TEXT NOT NULL DEFAULT 'blanco',
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notas_personales_usuario ON notas_personales(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notas_personales_papelera ON notas_personales(usuario_id, en_papelera);
CREATE INDEX IF NOT EXISTS idx_notas_personales_actualizado ON notas_personales(usuario_id, actualizado_en DESC);

-- La tabla notas_capitulo tiene RLS deshabilitado (migración 015) y la app
-- usa autenticación custom (anon). Mantenemos el mismo criterio para que la
-- capa de datos funcione igual en toda la app.
ALTER TABLE notas_personales DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE notas_personales TO anon;
GRANT ALL ON TABLE notas_personales TO authenticated;


-- ===== supabase\migraciones\024_grupos_desafios.sql =====
-- ============================================================
-- Migración 024: Grupos públicos + Desafíos de memorización
-- ------------------------------------------------------------
-- Cambios:
--  1. grupos: imagen del grupo (opcional) para el directorio público.
--  2. perfiles: biografia (opcional) para el perfil rápido.
--  3. Nueva tabla notificaciones: feed in-app (invitaciones a desafíos).
--  4. Nueva tabla desafios: sesión de desafío (snapshot idéntico para
--     todos los participantes) + estado y sincronización por polling.
--  5. Nueva tabla desafio_participantes: estado por jugador, puntuación
--     y tiempo.
--
-- RLS: el proyecto usa autenticación custom (anon). Políticas abiertas
-- para anon, igual que el resto de tablas (ver 002_anon_custom_auth.sql).
-- ============================================================

-- ------------------------------------------------------------
-- 1. GRUPOS: imagen opcional
-- ------------------------------------------------------------
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS imagen TEXT DEFAULT NULL;

-- ------------------------------------------------------------
-- 2. PERFILES: biografía opcional
-- ------------------------------------------------------------
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS biografia TEXT DEFAULT '';

-- ------------------------------------------------------------
-- 3. NOTIFICACIONES (feed in-app)
-- ------------------------------------------------------------
-- La tabla puede EXISTIR YA en producción con un esquema antiguo
-- (mensaje/created_at en vez de cuerpo/creado_en y sin usuario_id).
-- Por eso no basta con CREATE TABLE IF NOT EXISTS: además se añaden
-- con ALTER TABLE las columnas que falten para que la migración sea
-- idempotente y no falle con 'column usuario_id does not exist'.
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'info'  CHECK (tipo IN ('desafio', 'grupo', 'info', 'examen_publicado', 'examen_entregado', 'mazo_nuevo')),
  titulo TEXT NOT NULL DEFAULT '',
  cuerpo TEXT DEFAULT '',
  datos JSONB DEFAULT NULL,
  leida BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas en tablas preexistentes (idempotente)
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'info';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS titulo TEXT NOT NULL DEFAULT '';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS cuerpo TEXT DEFAULT '';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS datos JSONB DEFAULT NULL;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS leida BOOLEAN DEFAULT FALSE;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ DEFAULT NOW();

-- Asegurar que el CHECK de tipo acepta 'desafio' (una tabla antigua
-- podría tener un CHECK con otro nombre o más restrictivo que
-- bloquearía las inserciones). Eliminamos cualquier CHECK que haga
-- referencia a la columna tipo y creamos el nuestro.
DO $$
DECLARE
  c TEXT;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'notificaciones'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%tipo%'
  LOOP
    EXECUTE format('ALTER TABLE notificaciones DROP CONSTRAINT %I', c);
  END LOOP;
END $$;ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_tipo_check 
  CHECK (tipo IN ('desafio', 'grupo', 'info', 'examen_publicado', 'examen_entregado', 'mazo_nuevo', 'anuncio'));

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_no_leidas ON notificaciones(usuario_id) WHERE leida = FALSE;

-- ------------------------------------------------------------
-- 4. DESAFIOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS desafios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creador_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  mazo_id UUID REFERENCES mazos_memorizacion(id) ON DELETE SET NULL,
  mazo_nombre TEXT DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'invitacion'
    CHECK (estado IN ('invitacion', 'en_curso', 'finalizado', 'expirado', 'cancelado')),
  sesion JSONB DEFAULT NULL,
  tiempo_limite_seg INTEGER DEFAULT 120,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  iniciado_en TIMESTAMPTZ,
  finalizado_en TIMESTAMPTZ,
  expira_en TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_desafios_estado ON desafios(estado, expira_en);

-- ------------------------------------------------------------
-- 5. DESAFIO_PARTICIPANTES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS desafio_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desafio_id UUID NOT NULL REFERENCES desafios(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'invitado'
    CHECK (estado IN ('invitado', 'aceptado', 'rechazado', 'en_juego', 'terminado', 'abandonado')),
  correctas INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  tiempo_ms INTEGER DEFAULT NULL,
  orden INTEGER DEFAULT 0,
  UNIQUE(desafio_id, usuario_id),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dp_desafio ON desafio_participantes(desafio_id);
CREATE INDEX IF NOT EXISTS idx_dp_usuario ON desafio_participantes(usuario_id);

-- ------------------------------------------------------------
-- RLS (auth custom → políticas abiertas para anon)
-- ------------------------------------------------------------
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notificaciones_anon_all" ON notificaciones;
CREATE POLICY "notificaciones_anon_all" ON notificaciones FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE desafios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "desafios_anon_all" ON desafios;
CREATE POLICY "desafios_anon_all" ON desafios FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE desafio_participantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "desafio_participantes_anon_all" ON desafio_participantes;
CREATE POLICY "desafio_participantes_anon_all" ON desafio_participantes FOR ALL TO anon USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- Grants explícitos (las tablas nuevas no heredan GRANT ON ALL TABLES
-- emitido en migraciones anteriores)
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON notificaciones, desafios, desafio_participantes TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

SELECT '✅ Migración 024 aplicada: grupos públicos + desafíos' AS mensaje;


-- ===== supabase\migraciones\025_orden_evaluaciones.sql =====
-- Migración 025: Orden manual de evaluaciones
-- Permite reordenar las evaluaciones (cuál aparece primero) desde la vista Notas.

ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_evaluaciones_orden ON evaluaciones(grupo_id, orden);


-- ===== supabase\migraciones\025_avatars_storage.sql =====
-- MIGRACIÓN 025: Bucket de almacenamiento para fotos de perfil
-- Este bucket es público para que las fotos sean visibles para todos.
-- Ejecutar en el SQL Editor de Supabase Dashboard.

-- Crear bucket público para avatares
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Permitir subida de fotos (app usa auth personalizada, no Supabase Auth; todos son anon)
DROP POLICY IF EXISTS "avatars_insert_autenticado" ON storage.objects;
CREATE POLICY "avatars_insert_autenticado"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

-- Permitir que el propietario pueda actualizar/eliminar su foto
CREATE POLICY "avatars_update_propio"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_delete_propio"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Permitir lectura pública de los avatares
CREATE POLICY "avatars_lectura_publica"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');


-- ===== supabase\migraciones\026_mazo_prueba.sql =====
-- ============================================================
-- MIGRACIÓN 026: Mazo de prueba "Desafío Bíblico" (global)
-- 
-- Crea un mazo global con tarjetas variadas para probar la
-- función de "Retar" (desafíos entre usuarios).
-- Idempotente: no inserta si ya existe un mazo con ese nombre.
-- 
-- REQUISITO: haber ejecutado pendientes_produccion.sql primero
-- (necesita las columnas de la migración 023: es_global, icono,
--  orden, pregunta, respuesta, explicacion, libro, etc.).
-- ============================================================

-- Asegurar columnas necesarias (por si acaso)
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS pregunta TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS respuesta TEXT DEFAULT '';

-- Ampliar el CHECK de tipo para aceptar los tipos de juego
ALTER TABLE tarjetas_memorizacion DROP CONSTRAINT IF EXISTS tarjetas_memorizacion_tipo_check;
ALTER TABLE tarjetas_memorizacion ADD CONSTRAINT tarjetas_memorizacion_tipo_check
  CHECK (tipo IN (
    'versiculo', 'libre', 'completar', 'ordenar', 'elegir_versiculo',
    'verdadero_falso', 'relacionar', 'escrita', 'personaje', 'lugar',
    'libro', 'cronologia', 'multirrespuesta', 'multiple'
  ));

DO $$
DECLARE
  v_mazo_id UUID;
BEGIN
  -- Verificar si ya existe
  SELECT id INTO v_mazo_id FROM mazos_memorizacion
   WHERE es_global = true AND nombre = 'Desafío Bíblico'
   LIMIT 1;

  IF v_mazo_id IS NULL THEN
    -- Crear mazo
    INSERT INTO mazos_memorizacion (usuario_id, es_global, activo, nombre, descripcion, icono, color, orden)
    VALUES (NULL, true, true, 'Desafío Bíblico', 'Pon a prueba tu conocimiento con estas 15 preguntas rápidas sobre la Biblia. ¡Ideal para retar a tus amigos!', 'sword', '#EF4444', 100)
    RETURNING id INTO v_mazo_id;

    -- Tarjetas variadas (15 tarjetas de diferentes tipos)
    INSERT INTO tarjetas_memorizacion (usuario_id, mazo_id, tipo, pregunta, respuesta, texto, referencia, explicacion, pista, libro, capitulo, versiculo, orden, activa)
    VALUES
      -- 1. Versículo
      (NULL, v_mazo_id, 'versiculo', 'Salmos 23:1',
       'Jehová es mi pastor; nada me faltará.',
       'Jehová es mi pastor; nada me faltará.',
       'Salmos 23:1', 'El salmo más conocido de la Biblia, escrito por David.',
       'Empieza con "Jehová es mi..."', 'Salmos', '23', '1', 1, true),

      -- 2. Verdadero/Falso
      (NULL, v_mazo_id, 'verdadero_falso', 'Noé construyó el arca durante 40 días y 40 noches.',
       'false',
       'Noé construyó el arca durante 40 días y 40 noches.',
       'Génesis 6-8', 'En realidad llovió 40 días y 40 noches, pero Noé tardó muchos años en construir el arca.',
       'La lluvia duró 40 días, no la construcción.', NULL, NULL, NULL, 2, true),

      -- 3. Opción múltiple
      (NULL, v_mazo_id, 'multiple', '¿Cuántos libros tiene la Biblia protestante?',
       '66',
       '¿Cuántos libros tiene la Biblia protestante?',
       NULL, '39 en el Antiguo Testamento y 27 en el Nuevo Testamento.',
       'AT: 39, NT: 27. Suma.',
       NULL, NULL, NULL, 3, true),

      -- 4. Escrita
      (NULL, v_mazo_id, 'escrita', '¿Quién fue el primer rey de Israel?',
       'Saúl',
       '¿Quién fue el primer rey de Israel?',
       '1 Samuel 9-10', 'Fue ungido por el profeta Samuel.',
       'Su nombre empieza con S.', NULL, NULL, NULL, 4, true),

      -- 5. Versículo
      (NULL, v_mazo_id, 'versiculo', 'Juan 3:16',
       'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree no se pierda, mas tenga vida eterna.',
       'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree no se pierda, mas tenga vida eterna.',
       'Juan 3:16', 'Considerado el "evangelio en miniatura".',
       'Empieza con "Porque de tal manera..."', 'Juan', '3', '16', 5, true),

      -- 6. Verdadero/Falso
      (NULL, v_mazo_id, 'verdadero_falso', 'Jesús nació en Nazaret.',
       'false',
       'Jesús nació en Nazaret.',
       'Lucas 2:4-7', 'Jesús nació en Belén, aunque creció en Nazaret.',
       'Belén es la ciudad de David.', NULL, NULL, NULL, 6, true),

      -- 7. Escrita
      (NULL, v_mazo_id, 'escrita', '¿Cuál fue el primer milagro de Jesús?',
       'Convertir el agua en vino',
       '¿Cuál fue el primer milagro de Jesús?',
       'Juan 2:1-11', 'Ocurrió en las bodas de Caná de Galilea.',
       'Ocurrió en una boda.', NULL, NULL, NULL, 7, true),

      -- 8. Opción múltiple
      (NULL, v_mazo_id, 'multiple', '¿Cuál es el mandamiento más importante según Jesús?',
       'Amar a Dios con todo tu corazón, alma y mente',
       '¿Cuál es el mandamiento más importante según Jesús?',
       'Mateo 22:37-39', 'El segundo es semejante: amar al prójimo como a uno mismo.',
       'Jesús dijo que de este dependen toda la ley y los profetas.',
       NULL, NULL, NULL, 8, true),

      -- 9. Versículo
      (NULL, v_mazo_id, 'versiculo', 'Filipenses 4:13',
       'Todo lo puedo en Cristo que me fortalece.',
       'Todo lo puedo en Cristo que me fortalece.',
       'Filipenses 4:13', 'Escrito por Pablo desde la prisión.',
       'Empieza con "Todo lo puedo..."', 'Filipenses', '4', '13', 9, true),

      -- 10. Verdadero/Falso
      (NULL, v_mazo_id, 'verdadero_falso', 'David mató a Goliat con una espada.',
       'false',
       'David mató a Goliat con una espada.',
       '1 Samuel 17:49-50', 'David derribó a Goliat con una honda y una piedra. Después usó la espada de Goliat para cortarle la cabeza.',
       'Usó algo más pequeño...', NULL, NULL, NULL, 10, true),

      -- 11. Escrita
      (NULL, v_mazo_id, 'escrita', '¿Cuántos días y noches estuvo Jonás en el vientre del gran pez?',
       '3 días y 3 noches',
       '¿Cuántos días y noches estuvo Jonás en el vientre del gran pez?',
       'Jonás 1:17', 'Jesús usó esta historia como señal de su resurrección.',
       'El mismo número que Jesús estuvo en la tumba.', NULL, NULL, NULL, 11, true),

      -- 12. Versículo
      (NULL, v_mazo_id, 'versiculo', 'Proverbios 3:5',
       'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.',
       'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.',
       'Proverbios 3:5', 'Consejo de sabiduría de Salomón.',
       'Empieza con "Fíate de Jehová..."', 'Proverbios', '3', '5', 12, true),

      -- 13. Opción múltiple
      (NULL, v_mazo_id, 'multiple', '¿Quién escribió la mayoría de los Salmos?',
       'David',
       '¿Quién escribió la mayoría de los Salmos?',
       NULL, 'David escribió al menos 73 de los 150 salmos.',
       'Fue el segundo rey de Israel.',
       NULL, NULL, NULL, 13, true),

      -- 14. Escrita
      (NULL, v_mazo_id, 'escrita', '¿De qué profesión era Mateo antes de seguir a Jesús?',
       'Cobrador de impuestos',
       '¿De qué profesión era Mateo antes de seguir a Jesús?',
       'Mateo 9:9', 'También llamado Leví.',
       'Recaudaba dinero para Roma.', NULL, NULL, NULL, 14, true),

      -- 15. Verdadero/Falso
      (NULL, v_mazo_id, 'verdadero_falso', 'La Biblia fue escrita originalmente en latín.',
       'false',
       'La Biblia fue escrita originalmente en latín.',
       NULL, 'El AT se escribió en hebreo (y algo de arameo) y el NT en griego koiné.',
       'El NT original no está en latín.', NULL, NULL, NULL, 15, true);
  END IF;
END $$;


-- ===== supabase\migraciones\027_notificaciones_v2.sql =====
-- ============================================================
-- Migración 027: Notificaciones v2 — Centro de comunicaciones
-- ------------------------------------------------------------
-- Evoluciona la tabla `notificaciones` (creada en 024) hacia un
-- modelo con:
--   • categoría  (desafios, examenes, estudio, grupos, logros,
--                 sistema, anuncios) para filtros e iconografía
--   • prioridad  (critica, alta, media, baja)
--   • estado     ciclo de vida: nueva → vista → completada → archivada
--   • agrupación (agrupacion_clave + contador) para fusionar
--                 notificaciones similares (p.ej. "4 jugadores aceptaron")
--   • acciones   JSONB con acciones rápidas serializables
--   • emisor_id  quién originó el evento (opcional)
--
-- Todo el ALTER es idempotente (ADD COLUMN IF NOT EXISTS) para
-- poder aplicarse sobre bases que ya existen con el esquema 024.
-- ============================================================

ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'sistema';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS prioridad TEXT NOT NULL DEFAULT 'media';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'nueva';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS agrupacion_clave TEXT DEFAULT NULL;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS contador INTEGER NOT NULL DEFAULT 1;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS acciones JSONB DEFAULT NULL;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS emisor_id UUID REFERENCES perfiles(id) ON DELETE SET NULL;

-- Sincronizar filas legacy: marcar como 'vista' las que ya estaban leídas.
UPDATE notificaciones SET estado = 'vista' WHERE leida = TRUE AND estado = 'nueva';

-- Backfill de categoría y prioridad según el tipo legacy, para que las
-- filas preexistentes (creadas con el esquema 024) se clasifiquen bien
-- y no queden todas como 'sistema'/'media'.
UPDATE notificaciones SET
  categoria = CASE tipo
    WHEN 'desafio'          THEN 'desafios'
    WHEN 'desafio_aceptado' THEN 'desafios'
    WHEN 'grupo'            THEN 'grupos'
    WHEN 'examen_publicado' THEN 'examenes'
    WHEN 'examen_entregado' THEN 'examenes'
    WHEN 'examen_corregido' THEN 'examenes'
    WHEN 'mazo_nuevo'       THEN 'estudio'
    WHEN 'recordatorio'     THEN 'estudio'
    WHEN 'anuncio'          THEN 'anuncios'
    ELSE categoria
  END,
  prioridad = CASE tipo
    WHEN 'desafio'          THEN 'alta'
    WHEN 'desafio_aceptado' THEN 'media'
    WHEN 'grupo'            THEN 'media'
    WHEN 'examen_publicado' THEN 'alta'
    WHEN 'examen_entregado' THEN 'alta'
    WHEN 'examen_corregido' THEN 'alta'
    WHEN 'mazo_nuevo'       THEN 'media'
    WHEN 'recordatorio'     THEN 'media'
    WHEN 'anuncio'          THEN 'critica'
    ELSE prioridad
  END
WHERE tipo IS NOT NULL;

-- Constraints de dominio (idempotentes: se eliminan los CHECK previos
-- que restrinjan estas columnas y se crean los nuevos).
DO $$
DECLARE
  c TEXT;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'notificaciones'::regclass
      AND contype = 'c'
      AND (pg_get_constraintdef(oid) ILIKE '%categoria%'
        OR pg_get_constraintdef(oid) ILIKE '%prioridad%'
        OR pg_get_constraintdef(oid) ILIKE '%estado%')
  LOOP
    EXECUTE format('ALTER TABLE notificaciones DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_categoria_check
  CHECK (categoria IN ('desafios', 'examenes', 'estudio', 'grupos', 'logros', 'sistema', 'anuncios'));
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_prioridad_check
  CHECK (prioridad IN ('critica', 'alta', 'media', 'baja'));
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_estado_check
  CHECK (estado IN ('nueva', 'vista', 'completada', 'archivada'));

-- Índices de lectura del centro de notificaciones
CREATE INDEX IF NOT EXISTS idx_notif_usuario_estado ON notificaciones(usuario_id, estado, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_notif_agrupacion ON notificaciones(agrupacion_clave) WHERE agrupacion_clave IS NOT NULL;
DROP INDEX IF EXISTS idx_notificaciones_no_leidas;
CREATE INDEX IF NOT EXISTS idx_notificaciones_no_leidas ON notificaciones(usuario_id) WHERE leida = FALSE;

-- RLS: mismas políticas abiertas que el resto del proyecto (auth custom anon)
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notificaciones_anon_all" ON notificaciones;
CREATE POLICY "notificaciones_anon_all" ON notificaciones FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON notificaciones TO anon;

SELECT '✅ Migración 027 aplicada: notificaciones v2 (categorías, prioridades, estado, agrupación)' AS mensaje;


-- ===== supabase\migraciones\028_auth_politicas.sql =====
-- ============================================================================
-- MIGRACIÓN 028-C: Supabase Auth — Cierre de RLS (políticas restrictivas)
-- ============================================================================
-- Objetivo: REEMPLAZAR las políticas abiertas a anon (002_anon_custom_auth.sql
-- y las abiertas en migraciones posteriores) por políticas basadas en
-- auth.uid(). Es el momento en que el agujero de seguridad se cierra de verdad:
-- ya nadie podrá leer hashes de contraseñas, notas de otros, backups, ni
-- auto-calificarse.
--
-- ⚠️ CUÁNDO APLICAR: SOLO en el cutover, es decir, cuando el cliente ya esté
--    actualizado para loguear con auth_login → signInWithPassword (JWT).
--    Si se aplica antes, la app (auth custom con anon) deja de funcionar.
--
-- ✅ ESTADO: APLICADA (este archivo ya se ejecutó). La "Fase 2 del cliente"
--    (login Auth, RPCs del panel admin, asegurar_grupo, enviar_notificacion,
--    recuperación de sesión) quedó implementada el 2026-08-06 en:
--    js/datos/auth-repository.js, js/core/index.js, js/vistas/vista-perfil.js,
--    js/datos/admin-repository.js, js/datos/notificaciones-repository.js.
--    Pendiente conocido: restaurar perfiles desde backup requiere una RPC nueva
--    (anotado en admin-repository.restaurarBackup).
--
-- ORDEN DE CUTOVER:
--   1. 028_auth_esquema.sql
--   2. 028_auth_migracion_datos.sql
--   3. DESPLEGAR el cliente nuevo (login por Supabase Auth)
--   4. 028_auth_politicas.sql   ← este archivo, lo último
--
-- ROLLBACK: reaplicar 002_anon_custom_auth.sql restaura las políticas abiertas.
-- Los datos no se tocan en ningún caso.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) CERRAR EL GRIFO A ANON: revocar el acceso masivo que concedió 002
-- ----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Endurecer el futuro: las tablas nuevas ya no se abrirán a anon/authenticated
-- por defecto (cada migración futura concederá explícitamente lo que necesite).
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;

-- Grants base: cada tabla recibe solo lo que necesita (más abajo).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- ============================================================================
-- 1) PERFILES
-- ============================================================================
-- RLS: cualquier usuario autenticado ve los datos básicos de los demás
-- (comunidad cerrada: solo el owner crea cuentas). El password queda oculto
-- por grants de columna y ya no es necesario (lo gestiona Supabase Auth).
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfiles_anon_all" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_anon_login" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_lectura_propios_o_admin" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_actualizacion_propia" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_admin_actualiza" ON public.perfiles;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "perfiles_lectura_autenticados" ON public.perfiles;
CREATE POLICY "perfiles_lectura_autenticados"
  ON public.perfiles FOR SELECT TO authenticated USING (true);

-- El usuario actualiza SOLO su propia fila (la columna se limita por grants)
CREATE POLICY "perfiles_actualizacion_propia"
  ON public.perfiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Sin política de INSERT/DELETE → nadie crea ni borra perfiles por la API
-- (solo el trigger handle_new_user y las RPCs de admin, que son SECURITY DEFINER)

-- Grants con restricción de COLUMNAS (anti-escalada):
--   * no se puede UPDATE rol / username / password / activo / grupo_id por la API
--     (el grupo se asigna vía RPC asegurar_grupo / admin_actualizar_usuario)
--   * no se puede leer el password ni el email real (solo owner vía RPC/SQL)
--   * INSERT/DELETE denegados
GRANT SELECT (id, username, nombre_completo, rol, activo, grupo_id,
              foto_perfil, preferencias, ultimo_acceso, creado_en)
  ON public.perfiles TO authenticated;
GRANT UPDATE (nombre_completo, foto_perfil, preferencias, ultimo_acceso)
  ON public.perfiles TO authenticated;

-- ============================================================================
-- 2) GRUPOS
-- ============================================================================
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grupos_anon_all" ON public.grupos;
DROP POLICY IF EXISTS "grupos_lectura_miembros" ON public.grupos;
DROP POLICY IF EXISTS "grupos_admin_gestiona" ON public.grupos;
DROP POLICY IF EXISTS "grupos_insert_propio" ON public.grupos;

CREATE POLICY "grupos_lectura_miembros"
  ON public.grupos FOR SELECT TO authenticated
  USING (public.es_miembro_del_grupo(id) OR public.es_owner());

-- Insertar el propio grupo (asegurarGrupo: un profesor crea su clase)
CREATE POLICY "grupos_insert_propio"
  ON public.grupos FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid() OR public.es_owner());

CREATE POLICY "grupos_admin_gestiona"
  ON public.grupos FOR UPDATE TO authenticated
  USING (public.es_admin_del_grupo(id) OR public.es_owner())
  WITH CHECK (public.es_admin_del_grupo(id) OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "grupos_admin_borra" ON public.grupos;
CREATE POLICY "grupos_admin_borra"
  ON public.grupos FOR DELETE TO authenticated
  USING (public.es_admin_del_grupo(id) OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos TO authenticated;

-- ============================================================================
-- 3) MIEMBROS_GRUPO
-- ============================================================================
ALTER TABLE public.miembros_grupo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "miembros_anon_all" ON public.miembros_grupo;
DROP POLICY IF EXISTS "miembros_lectura_miembros" ON public.miembros_grupo;
DROP POLICY IF EXISTS "miembros_admin_gestiona" ON public.miembros_grupo;
DROP POLICY IF EXISTS "miembros_salida_propia" ON public.miembros_grupo;
DROP POLICY IF EXISTS "miembros_inscripcion_propia" ON public.miembros_grupo;
DROP POLICY IF EXISTS "miembros_autoactualiza" ON public.miembros_grupo;

CREATE POLICY "miembros_lectura_miembros"
  ON public.miembros_grupo FOR SELECT TO authenticated
  USING (public.es_miembro_del_grupo(grupo_id) OR public.es_owner());

-- Unirse a un grupo SOLO como 'miembro' (unirseAGrupo usa upsert)
CREATE POLICY "miembros_inscripcion_propia"
  ON public.miembros_grupo FOR INSERT TO authenticated
  WITH CHECK (public.es_owner()
              OR (usuario_id = auth.uid() AND rol_en_grupo = 'miembro')
              OR public.es_admin_del_grupo(grupo_id));

-- Actualizar el propio estado como miembro (upsert) o gestionar como admin
CREATE POLICY "miembros_autoactualiza"
  ON public.miembros_grupo FOR UPDATE TO authenticated
  USING (public.es_owner()
         OR (usuario_id = auth.uid() AND rol_en_grupo = 'miembro')
         OR public.es_admin_del_grupo(grupo_id))
  WITH CHECK (public.es_owner()
              OR (usuario_id = auth.uid() AND rol_en_grupo = 'miembro')
              OR public.es_admin_del_grupo(grupo_id));

-- Salir del grupo (DELETE propio) o gestionar como admin
CREATE POLICY "miembros_salida_propia"
  ON public.miembros_grupo FOR DELETE TO authenticated
  USING (public.es_owner() OR usuario_id = auth.uid()
         OR public.es_admin_del_grupo(grupo_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.miembros_grupo TO authenticated;

-- ============================================================================
-- 3b) CATEGORIAS_MEMORIZACION / CATEGORIAS_TARJETAS
-- ============================================================================
-- Sus políticas propias (auth.uid() = usuario_id) ya existen desde la migración
-- 012; aquí solo se restablecen los grants que el REVOKE ALL de arriba retiró.
ALTER TABLE public.categorias_memorizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_tarjetas ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_memorizacion TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_tarjetas TO authenticated;

-- ============================================================================
-- 4) CATÁLOGO BÍBLICO (contenido público de la app, requiere login)
-- ============================================================================
ALTER TABLE public.libros_biblicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "libros_anon_publico" ON public.libros_biblicos;
DROP POLICY IF EXISTS "libros_publico" ON public.libros_biblicos;
CREATE POLICY "libros_publico" ON public.libros_biblicos FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.libros_biblicos TO authenticated;

ALTER TABLE public.capitulos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "capitulos_anon_publico" ON public.capitulos;
DROP POLICY IF EXISTS "capitulos_publico" ON public.capitulos;
CREATE POLICY "capitulos_publico" ON public.capitulos FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.capitulos TO authenticated;

ALTER TABLE public.versiculos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "versiculos_anon_publico" ON public.versiculos;
DROP POLICY IF EXISTS "versiculos_publico" ON public.versiculos;
CREATE POLICY "versiculos_publico" ON public.versiculos FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.versiculos TO authenticated;

-- ============================================================================
-- 5) PROGRESO_LECTURA (cada usuario su propio progreso)
-- ============================================================================
ALTER TABLE public.progreso_lectura ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progreso_lectura_anon_all" ON public.progreso_lectura;
DROP POLICY IF EXISTS "progreso_lectura_propio" ON public.progreso_lectura;
DROP POLICY IF EXISTS "progreso_lectura_profesor_ve" ON public.progreso_lectura;

CREATE POLICY "progreso_lectura_propio"
  ON public.progreso_lectura FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

CREATE POLICY "progreso_lectura_profesor_ve"
  ON public.progreso_lectura FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.perfiles p
    JOIN public.miembros_grupo mg ON mg.grupo_id = p.grupo_id
    WHERE p.id = progreso_lectura.usuario_id
      AND mg.usuario_id = auth.uid()
      AND mg.rol_en_grupo IN ('admin', 'editor')
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.progreso_lectura TO authenticated;

-- ============================================================================
-- 6) PREGUNTAS_SISTEMA (contenido de estudio: lectura para todos, edición
--    solo para editores/owner). Se CORRIGE la política original, que usaba
--    una subconsulta rota (perfiles p ON p.grupo_id IS NOT NULL LIMIT 1).
-- ============================================================================
ALTER TABLE public.preguntas_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preguntas_sistema_anon_all" ON public.preguntas_sistema;
DROP POLICY IF EXISTS "preguntas_sistema_lectura_grupo" ON public.preguntas_sistema;
DROP POLICY IF EXISTS "preguntas_sistema_edicion_editor" ON public.preguntas_sistema;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "preguntas_sistema_lectura" ON public.preguntas_sistema;
CREATE POLICY "preguntas_sistema_lectura"
  ON public.preguntas_sistema FOR SELECT TO authenticated USING (true);

CREATE POLICY "preguntas_sistema_edicion_editor"
  ON public.preguntas_sistema FOR INSERT TO authenticated
  WITH CHECK (public.es_owner()
              OR (creado_por = auth.uid()
                  AND public.es_editor_del_grupo(
                    (SELECT grupo_id FROM public.perfiles WHERE id = auth.uid()))));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "preguntas_sistema_edicion_editor_upd" ON public.preguntas_sistema;
CREATE POLICY "preguntas_sistema_edicion_editor_upd"
  ON public.preguntas_sistema FOR UPDATE TO authenticated
  USING (public.es_owner()
         OR (creado_por = auth.uid()
             AND public.es_editor_del_grupo(
               (SELECT grupo_id FROM public.perfiles WHERE id = creado_por))));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "preguntas_sistema_edicion_editor_del" ON public.preguntas_sistema;
CREATE POLICY "preguntas_sistema_edicion_editor_del"
  ON public.preguntas_sistema FOR DELETE TO authenticated
  USING (public.es_owner()
         OR (creado_por = auth.uid()
             AND public.es_editor_del_grupo(
               (SELECT grupo_id FROM public.perfiles WHERE id = creado_por))));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preguntas_sistema TO authenticated;

-- ============================================================================
-- 7) EXAMENES_PERSONALIZADOS
-- ============================================================================
ALTER TABLE public.examenes_personalizados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "examenes_anon_all" ON public.examenes_personalizados;
DROP POLICY IF EXISTS "examenes_lectura_grupo" ON public.examenes_personalizados;
DROP POLICY IF EXISTS "examenes_edicion_profesor" ON public.examenes_personalizados;

CREATE POLICY "examenes_lectura_grupo"
  ON public.examenes_personalizados FOR SELECT TO authenticated
  USING (public.es_miembro_del_grupo(grupo_id) OR public.es_owner());

CREATE POLICY "examenes_edicion_profesor"
  ON public.examenes_personalizados FOR INSERT TO authenticated
  WITH CHECK (public.es_owner()
              OR (creado_por = auth.uid() AND public.es_editor_del_grupo(grupo_id)));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "examenes_edicion_profesor_upd" ON public.examenes_personalizados;
CREATE POLICY "examenes_edicion_profesor_upd"
  ON public.examenes_personalizados FOR UPDATE TO authenticated
  USING (public.es_editor_del_grupo(grupo_id) OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "examenes_edicion_profesor_del" ON public.examenes_personalizados;
CREATE POLICY "examenes_edicion_profesor_del"
  ON public.examenes_personalizados FOR DELETE TO authenticated
  USING (public.es_editor_del_grupo(grupo_id) OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.examenes_personalizados TO authenticated;

-- ============================================================================
-- 8) INTENTOS_EXAMEN_PERSONALIZADO (alumno: sus intentos; profesor: califica)
-- ============================================================================
ALTER TABLE public.intentos_examen_personalizado ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intentos_anon_all" ON public.intentos_examen_personalizado;
DROP POLICY IF EXISTS "intentos_alumno_propio" ON public.intentos_examen_personalizado;
DROP POLICY IF EXISTS "intentos_profesor_ve" ON public.intentos_examen_personalizado;
DROP POLICY IF EXISTS "intentos_profesor_califica" ON public.intentos_examen_personalizado;

CREATE POLICY "intentos_alumno_propio"
  ON public.intentos_examen_personalizado FOR ALL TO authenticated
  USING (alumno_id = auth.uid() OR public.es_owner())
  WITH CHECK (alumno_id = auth.uid() OR public.es_owner());

CREATE POLICY "intentos_profesor_ve"
  ON public.intentos_examen_personalizado FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.examenes_personalizados e
    WHERE e.id = examen_id AND public.es_editor_del_grupo(e.grupo_id)
  ));

CREATE POLICY "intentos_profesor_califica"
  ON public.intentos_examen_personalizado FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.examenes_personalizados e
    WHERE e.id = examen_id AND public.es_editor_del_grupo(e.grupo_id)
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intentos_examen_personalizado TO authenticated;

-- ============================================================================
-- 9) TARJETAS_MEMORIZACION (propias + las del mazo global + owner)
-- ============================================================================
ALTER TABLE public.tarjetas_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tarjetas_anon_all" ON public.tarjetas_memorizacion;
DROP POLICY IF EXISTS "tarjetas_propias" ON public.tarjetas_memorizacion;
DROP POLICY IF EXISTS "tarjetas_lectura_globales" ON public.tarjetas_memorizacion;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "tarjetas_lectura" ON public.tarjetas_memorizacion;
CREATE POLICY "tarjetas_lectura"
  ON public.tarjetas_memorizacion FOR SELECT TO authenticated
  USING (usuario_id = auth.uid()
         OR public.es_owner()
         OR (mazo_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM public.mazos_memorizacion m
               WHERE m.id = mazo_id AND m.es_global = true
             )));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "tarjetas_insert_propias" ON public.tarjetas_memorizacion;
CREATE POLICY "tarjetas_insert_propias"
  ON public.tarjetas_memorizacion FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "tarjetas_edicion_propias" ON public.tarjetas_memorizacion;
CREATE POLICY "tarjetas_edicion_propias"
  ON public.tarjetas_memorizacion FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "tarjetas_borrado_propias" ON public.tarjetas_memorizacion;
CREATE POLICY "tarjetas_borrado_propias"
  ON public.tarjetas_memorizacion FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarjetas_memorizacion TO authenticated;

-- ============================================================================
-- 10) REPASOS_MEMORIZACION (vía tarjeta propia)
-- ============================================================================
ALTER TABLE public.repasos_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "repasos_anon_all" ON public.repasos_memorizacion;
DROP POLICY IF EXISTS "repasos_propios" ON public.repasos_memorizacion;

CREATE POLICY "repasos_propios"
  ON public.repasos_memorizacion FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tarjetas_memorizacion t
    WHERE t.id = tarjeta_id AND (t.usuario_id = auth.uid() OR public.es_owner())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tarjetas_memorizacion t
    WHERE t.id = tarjeta_id AND (t.usuario_id = auth.uid() OR public.es_owner())
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.repasos_memorizacion TO authenticated;

-- ============================================================================
-- 11) LOGROS Y LOGROS_USUARIO
-- ============================================================================
ALTER TABLE public.logros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logros_anon_all" ON public.logros;
DROP POLICY IF EXISTS "logros_todos_ven" ON public.logros;
CREATE POLICY "logros_todos_ven" ON public.logros FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.logros TO authenticated;

ALTER TABLE public.logros_usuario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logros_usuario_anon_all" ON public.logros_usuario;
DROP POLICY IF EXISTS "logros_usuario_propios" ON public.logros_usuario;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "logros_usuario_lectura" ON public.logros_usuario;
CREATE POLICY "logros_usuario_lectura"
  ON public.logros_usuario FOR SELECT TO authenticated
  USING (usuario_id = auth.uid()
         OR public.es_admin_del_grupo(
           (SELECT grupo_id FROM public.perfiles WHERE id = usuario_id))
         OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "logros_usuario_gestion" ON public.logros_usuario;
CREATE POLICY "logros_usuario_gestion"
  ON public.logros_usuario FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.logros_usuario TO authenticated;

-- ============================================================================
-- 12) AUDITORIA (lectura solo owner; escritura por RPCs/RLS de sistema)
-- ============================================================================
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auditoria_anon_all" ON public.auditoria;
DROP POLICY IF EXISTS "auditoria_solo_owner" ON public.auditoria;
DROP POLICY IF EXISTS "auditoria_insert_sistema" ON public.auditoria;

CREATE POLICY "auditoria_solo_owner"
  ON public.auditoria FOR SELECT TO authenticated USING (public.es_owner());

-- INSERT permitido a cualquier autenticado para no romper el registro actual
-- de auditoría desde el cliente; las RPCs de admin ya registran por su cuenta.
CREATE POLICY "auditoria_insert_sistema"
  ON public.auditoria FOR INSERT TO authenticated WITH CHECK (true);

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "auditoria_update_owner" ON public.auditoria;
CREATE POLICY "auditoria_update_owner"
  ON public.auditoria FOR UPDATE TO authenticated
  USING (public.es_owner()) WITH CHECK (public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "auditoria_borrado_owner" ON public.auditoria;
CREATE POLICY "auditoria_borrado_owner"
  ON public.auditoria FOR DELETE TO authenticated USING (public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auditoria TO authenticated;

-- ============================================================================
-- 13) SUGERENCIAS (cada usuario sus sugerencias; owner las gestiona)
-- ============================================================================
ALTER TABLE public.sugerencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sugerencias_anon_all" ON public.sugerencias;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "sugerencias_lectura_propias" ON public.sugerencias;
CREATE POLICY "sugerencias_lectura_propias"
  ON public.sugerencias FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "sugerencias_insert_propias" ON public.sugerencias;
CREATE POLICY "sugerencias_insert_propias"
  ON public.sugerencias FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "sugerencias_gestion_owner" ON public.sugerencias;
CREATE POLICY "sugerencias_gestion_owner"
  ON public.sugerencias FOR UPDATE TO authenticated
  USING (public.es_owner()) WITH CHECK (public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "sugerencias_borrado_owner" ON public.sugerencias;
CREATE POLICY "sugerencias_borrado_owner"
  ON public.sugerencias FOR DELETE TO authenticated USING (public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sugerencias TO authenticated;

-- ============================================================================
-- 14) MAZOS_MEMORIZACION (propios + mazo global + owner)
-- ============================================================================
ALTER TABLE public.mazos_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mazos_anon_all" ON public.mazos_memorizacion;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "mazos_lectura" ON public.mazos_memorizacion;
CREATE POLICY "mazos_lectura"
  ON public.mazos_memorizacion FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR es_global = true OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "mazos_insert_propios" ON public.mazos_memorizacion;
CREATE POLICY "mazos_insert_propios"
  ON public.mazos_memorizacion FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "mazos_edicion_propios" ON public.mazos_memorizacion;
CREATE POLICY "mazos_edicion_propios"
  ON public.mazos_memorizacion FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "mazos_borrado_propios" ON public.mazos_memorizacion;
CREATE POLICY "mazos_borrado_propios"
  ON public.mazos_memorizacion FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mazos_memorizacion TO authenticated;

-- ============================================================================
-- 15) PROGRESO_TARJETAS_MEMORIZACION (propias)
-- ============================================================================
ALTER TABLE public.progreso_tarjetas_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progreso_anon_all" ON public.progreso_tarjetas_memorizacion;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "progreso_tarjetas_propio" ON public.progreso_tarjetas_memorizacion;
CREATE POLICY "progreso_tarjetas_propio"
  ON public.progreso_tarjetas_memorizacion FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.progreso_tarjetas_memorizacion TO authenticated;

-- ============================================================================
-- 16) NOTIFICACIONES (propias; las ajenas se crean vía RPC enviar_notificacion)
-- ============================================================================
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notificaciones_anon_all" ON public.notificaciones;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "notificaciones_lectura_propias" ON public.notificaciones;
CREATE POLICY "notificaciones_lectura_propias"
  ON public.notificaciones FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "notificaciones_insert_propias" ON public.notificaciones;
CREATE POLICY "notificaciones_insert_propias"
  ON public.notificaciones FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "notificaciones_actualiza_propias" ON public.notificaciones;
CREATE POLICY "notificaciones_actualiza_propias"
  ON public.notificaciones FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "notificaciones_borrado_propias" ON public.notificaciones;
CREATE POLICY "notificaciones_borrado_propias"
  ON public.notificaciones FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificaciones TO authenticated;

-- ============================================================================
-- 17) DESAFIOS
-- ============================================================================
ALTER TABLE public.desafios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "desafios_anon_all" ON public.desafios;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafios_lectura" ON public.desafios;
CREATE POLICY "desafios_lectura"
  ON public.desafios FOR SELECT TO authenticated
  USING (creador_id = auth.uid()
         OR public.es_owner()
         OR EXISTS (SELECT 1 FROM public.desafio_participantes dp
                    WHERE dp.desafio_id = desafios.id AND dp.usuario_id = auth.uid()));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafios_insert_propios" ON public.desafios;
CREATE POLICY "desafios_insert_propios"
  ON public.desafios FOR INSERT TO authenticated
  WITH CHECK (creador_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafios_edicion_creador" ON public.desafios;
CREATE POLICY "desafios_edicion_creador"
  ON public.desafios FOR UPDATE TO authenticated
  USING (creador_id = auth.uid() OR public.es_owner())
  WITH CHECK (creador_id = auth.uid() OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafios_borrado_creador" ON public.desafios;
CREATE POLICY "desafios_borrado_creador"
  ON public.desafios FOR DELETE TO authenticated
  USING (creador_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.desafios TO authenticated;

-- ============================================================================
-- 18) DESAFIO_PARTICIPANTES
-- ============================================================================
ALTER TABLE public.desafio_participantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "desafio_participantes_anon_all" ON public.desafio_participantes;

-- Participante, creador del desafío u owner
-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafio_participantes_lectura" ON public.desafio_participantes;
CREATE POLICY "desafio_participantes_lectura"
  ON public.desafio_participantes FOR SELECT TO authenticated
  USING (usuario_id = auth.uid()
         OR public.es_owner()
         OR EXISTS (SELECT 1 FROM public.desafios d
                    WHERE d.id = desafio_id AND d.creador_id = auth.uid()));

-- El creador invita (inserta a los rivales) y cada usuario puede unirse solo
-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafio_participantes_insert" ON public.desafio_participantes;
CREATE POLICY "desafio_participantes_insert"
  ON public.desafio_participantes FOR INSERT TO authenticated
  WITH CHECK (public.es_owner()
              OR usuario_id = auth.uid()
              OR EXISTS (SELECT 1 FROM public.desafios d
                         WHERE d.id = desafio_id AND d.creador_id = auth.uid()));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafio_participantes_update" ON public.desafio_participantes;
CREATE POLICY "desafio_participantes_update"
  ON public.desafio_participantes FOR UPDATE TO authenticated
  USING (public.es_owner()
         OR usuario_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.desafios d
                    WHERE d.id = desafio_id AND d.creador_id = auth.uid()))
  WITH CHECK (public.es_owner()
              OR usuario_id = auth.uid()
              OR EXISTS (SELECT 1 FROM public.desafios d
                         WHERE d.id = desafio_id AND d.creador_id = auth.uid()));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "desafio_participantes_delete" ON public.desafio_participantes;
CREATE POLICY "desafio_participantes_delete"
  ON public.desafio_participantes FOR DELETE TO authenticated
  USING (public.es_owner()
         OR usuario_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.desafios d
                    WHERE d.id = desafio_id AND d.creador_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.desafio_participantes TO authenticated;

-- ============================================================================
-- 19) EVALUACIONES
-- ============================================================================
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evaluaciones_anon_all" ON public.evaluaciones;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "evaluaciones_lectura" ON public.evaluaciones;
CREATE POLICY "evaluaciones_lectura"
  ON public.evaluaciones FOR SELECT TO authenticated
  USING (grupo_id IS NULL
         OR public.es_miembro_del_grupo(grupo_id)
         OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "evaluaciones_insert" ON public.evaluaciones;
CREATE POLICY "evaluaciones_insert"
  ON public.evaluaciones FOR INSERT TO authenticated
  WITH CHECK (public.es_owner()
              OR (creado_por = auth.uid() AND public.es_editor_del_grupo(grupo_id)));

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "evaluaciones_update" ON public.evaluaciones;
CREATE POLICY "evaluaciones_update"
  ON public.evaluaciones FOR UPDATE TO authenticated
  USING (public.es_editor_del_grupo(grupo_id) OR public.es_owner())
  WITH CHECK (public.es_editor_del_grupo(grupo_id) OR public.es_owner());

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "evaluaciones_delete" ON public.evaluaciones;
CREATE POLICY "evaluaciones_delete"
  ON public.evaluaciones FOR DELETE TO authenticated
  USING (public.es_editor_del_grupo(grupo_id) OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluaciones TO authenticated;

-- ============================================================================
-- 20) NOTAS_CAPITULO — HOY CON RLS DESACTIVADA (hueco). Se habilita.
-- ============================================================================
ALTER TABLE public.notas_capitulo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notas_capitulo_anon_all" ON public.notas_capitulo;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "notas_capitulo_propias" ON public.notas_capitulo;
CREATE POLICY "notas_capitulo_propias"
  ON public.notas_capitulo FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_capitulo TO authenticated;

-- ============================================================================
-- 21) NOTAS_PERSONALES — HOY CON RLS DESACTIVADA (hueco). Se habilita.
-- ============================================================================
ALTER TABLE public.notas_personales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notas_personales_anon_all" ON public.notas_personales;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "notas_personales_propias" ON public.notas_personales;
CREATE POLICY "notas_personales_propias"
  ON public.notas_personales FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR public.es_owner())
  WITH CHECK (usuario_id = auth.uid() OR public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_personales TO authenticated;

-- ============================================================================
-- 22) CONFIGURACION (lectura pública para autenticados; escritura solo owner)
-- ============================================================================
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "configuracion_anon_all" ON public.configuracion;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "configuracion_lectura" ON public.configuracion;
CREATE POLICY "configuracion_lectura"
  ON public.configuracion FOR SELECT TO authenticated USING (true);

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "configuracion_gestion_owner" ON public.configuracion;
CREATE POLICY "configuracion_gestion_owner"
  ON public.configuracion FOR ALL TO authenticated
  USING (public.es_owner()) WITH CHECK (public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracion TO authenticated;

-- ============================================================================
-- 23) BACKUPS (solo owner)
-- ============================================================================
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "backups_anon_all" ON public.backups;

-- Idempotencia: permite re-ejecutar esta migracion sin error
DROP POLICY IF EXISTS "backups_solo_owner" ON public.backups;
CREATE POLICY "backups_solo_owner"
  ON public.backups FOR ALL TO authenticated
  USING (public.es_owner()) WITH CHECK (public.es_owner());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backups TO authenticated;

-- ============================================================================
-- 24) STUDY_HISTORY (si existe en producción; propia + owner)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_history')
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'study_history'
                   AND column_name = 'usuario_id') THEN
    EXECUTE 'ALTER TABLE public.study_history ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "study_history_anon_all" ON public.study_history';
    EXECUTE 'DROP POLICY IF EXISTS "study_history_propio" ON public.study_history';
    EXECUTE 'CREATE POLICY "study_history_propio" ON public.study_history FOR ALL TO authenticated
             USING (usuario_id = auth.uid() OR public.es_owner())
             WITH CHECK (usuario_id = auth.uid() OR public.es_owner())';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_history TO authenticated';
  END IF;
END $$;

-- ============================================================================
-- 25) STORAGE (avatars) — endurecer el INSERT para que nadie suba fotos a la
--     carpeta de otro usuario (UPDATE/DELETE/SELECT ya estaban por carpeta)
-- ============================================================================
DROP POLICY IF EXISTS "avatars_insert_autenticado" ON storage.objects;
CREATE POLICY "avatars_insert_autenticado"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars'
              AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- NOTA DE SEGURIDAD RESIDUAL (documentada, no bloqueante):
--   * La nota de exámenes objetivos y la puntuación de desafíos las calcula el
--     cliente al entregar/finalizar (diseño actual de la app). El RLS limita el
--     UPDATE a las propias filas, pero no impide que un alumno se suba la nota de
--     SU propio intento ni que un participante se ponga la puntuación de SU
--     desafío. Cerrarlo requiere RPCs de entrega/corrección con cálculo en el
--     servidor (Fase 3).
--   * Un usuario desactivado con un JWT sin expirar conserva acceso mientras el
--     token viva: las políticas no comprueban `activo`. El cliente ya fuerza el
--     logout al revalidar el perfil; para endurecer, banear también en auth
--     (auth.admin_update_user_by_id) en Fase 3.
-- ============================================================================

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT '✅ 028-C aplicada: RLS cerrado con auth.uid() en ' || count(*)::text ||
       ' tablas; anon sin acceso a datos' AS mensaje
  FROM pg_policies WHERE schemaname = 'public';


-- ===== supabase\migraciones\028_auth_migracion_datos.sql =====
-- ============================================================================
-- MIGRACIÓN 028-B: Supabase Auth — Migración de cuentas existentes
-- ============================================================================
-- Objetivo: crear en auth.users una cuenta por cada perfiles actual, usando
-- EL MISMO id (Opción B). Así NO se toca ni una sola FK ni el código de la
-- app: perfiles.id sigue siendo la clave de todo.
--
-- QUÉ HACE:
--   1. Copia de seguridad de perfiles (respaldo_perfiles_pre_auth)
--   2. Por cada perfil: INSERT en auth.users con id = perfiles.id, email
--      sintético (username@formsbiblicos.local, confirmado), contraseña
--      aleatoria de relleno y metadata (username/nombre/rol).
--   3. INSERT en auth.identities (provider='email') — REQUERIDO por GoTrue
--      para que signInWithPassword funcione.
--
-- LA CONTRASEÑA REAL NO SE TOCA: sigue en perfiles.password. El primer login
-- de cada usuario pasa por auth_login() que la valida contra el hash legacy y
-- la convierte a bcrypt en auth.users al vuelo (migración perezosa).
-- Cuando todos los usuarios hayan entrado al menos una vez (semanas después),
-- una migración de limpieza eliminará perfiles.password.
--
-- IMPORTANTE:
--   * Ejecutar SOLO UNA VEZ, tras 028_auth_esquema.sql y ANTES del cutover.
--   * La app sigue funcionando con auth custom mientras tanto (inocuo).
--   * Probar SIEMPRE primero en un proyecto staging (inserta directamente en
--     auth.users / auth.identities, esquemas internos de Supabase).
--   * ROLLBACK: eliminar los auth.users creados (con sus identities) basta;
--     perfiles y todos los datos quedan intactos.
-- ============================================================================

-- 1) Copia de seguridad (idempotente: si ya existe, no la sobreescribe)
CREATE TABLE IF NOT EXISTS respaldo_perfiles_pre_auth AS SELECT * FROM public.perfiles;

-- 1b) Garantizar pgcrypto en extensions (Supabase reciente ya no lo expone en public)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2) Guarda contra doble ejecución
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email LIKE '%@formsbiblicos.local') THEN
    RAISE EXCEPTION
      'Ya existen cuentas con dominio @formsbiblicos.local en auth.users. Esta migración solo se ejecuta UNA vez.';
  END IF;
END $$;

-- 3) Crear las cuentas de auth
DO $$
DECLARE
  r RECORD;
  v_email TEXT;
  v_count INTEGER := 0;
  v_skip INTEGER := 0;
BEGIN
  FOR r IN SELECT * FROM public.perfiles ORDER BY creado_en LOOP
    -- IMPORTANTE: pasar el username CANÓNICO (sin normalizar) para que el
    -- email sintético coincida exactamente con el que calculará auth_login().
    v_email := public.email_sintetico(r.username);

    -- auth.users con el MISMO id que perfiles. La contraseña de relleno es un
    -- hash bcrypt aleatorio e inverificable (nadie la conoce); el login real
    -- pasa por auth_login() y la migración perezosa. Se usa pgcrypto
    -- (crypt/gen_salt de public), no auth.crypt/auth.gen_salt (eliminadas en
    -- Supabase reciente).
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      r.id, NULL, 'authenticated', 'authenticated', v_email,
      extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', r.username, 'nombre_completo', r.nombre_completo, 'rol', r.rol),
      coalesce(r.creado_en, now()), now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- auth.identities: GoTrue exige una identidad provider='email' para el login
    IF EXISTS (SELECT 1 FROM auth.identities WHERE user_id = r.id AND provider = 'email') THEN
      v_skip := v_skip + 1;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'auth' AND table_name = 'identities'
                    AND column_name = 'provider_id') THEN
      EXECUTE 'INSERT INTO auth.identities
                 (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
               VALUES ($1, $1, $1::text, $2, ''email'', now(), now(), now())'
        USING r.id, jsonb_build_object('sub', r.id::text, 'email', v_email);
      v_count := v_count + 1;
    ELSE
      INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      VALUES (r.id, r.id, jsonb_build_object('sub', r.id::text, 'email', v_email), 'email', now(), now(), now());
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Migración de auth: % cuentas creadas, % ya existían.', v_count, v_skip;
END $$;

-- 4) Verificación
SELECT '✅ 028-B aplicada: ' || count(*)::text || ' cuentas en auth.users con email sintético' AS mensaje
  FROM auth.users WHERE email LIKE '%@formsbiblicos.local';

-- RECORDATORIO (no bloqueante):
--   * perfiles.password se conserva para la migración perezosa de cada login.
--   * Cuando todos hayan entrado al menos una vez, aplicar una migración de
--     limpieza: ALTER TABLE perfiles DROP COLUMN IF EXISTS password;
--   * Vaciar la cola offline (sync-queue) ANTES del cutover por precaución.


-- ===== supabase\migraciones\028_auth_esquema.sql =====
-- ============================================================================
-- MIGRACIÓN 028-A: Supabase Auth — Esquema (funciones, trigger, RPCs)
-- ============================================================================
-- Objetivo: preparar la infraestructura de Supabase Auth sin cambiar el
-- comportamiento actual de la app (que sigue con auth custom hasta el cutover).
--
-- CONTENIDO:
--   1. perfiles.password pasa a nullable (lo gestiona Supabase Auth)
--   2. Helpers de autorización (es_owner, es_admin_del_grupo, ...) → SECURITY
--      DEFINER para que las políticas RLS no entren en recursión infinita
--   3. email_sintetico(): email falso e invisible (username@formsbiblicos.local)
--   4. Trigger handle_new_user: crea el perfil al crearse un auth.users
--   5. RPC auth_login(username, password): valida y MIGRA la contraseña legacy
--      al vuelo (primera vez que entra cada usuario, sin pedirle nada)
--   6. RPCs de administración (solo owner): crear/actualizar/rol/activo/eliminar
--   7. RPC enviar_notificacion (los INSERT de notificaciones ajenas dejarán de
--      poder hacerse por RLS con el cutover)
--
-- ORDEN DE APLICACIÓN (importante):
--   1. 028_auth_esquema.sql        (este archivo — inocuo, no cambia nada aún)
--   2. 028_auth_migracion_datos.sql (crea los auth.users de las cuentas actuales)
--   3. 028_auth_politicas.sql      (CIERRA el RLS abierto — SOLO en el cutover)
--
-- ROLLBACK: ninguna de las tres borra datos. Para revertir, basta restaurar
-- las políticas abiertas de 002_anon_custom_auth.sql y seguir con auth custom.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) perfiles.password pasa a nullable (lo gestiona Supabase Auth)
-- ----------------------------------------------------------------------------
ALTER TABLE public.perfiles ALTER COLUMN password DROP NOT NULL;

-- ----------------------------------------------------------------------------
-- 2) Helpers de autorización → SECURITY DEFINER
-- ----------------------------------------------------------------------------
-- Motivo: las políticas RLS que llaman a estos helpers disparan consultas a
-- miembros_grupo/perfiles; si los helpers fueran SECURITY INVOKER, la consulta
-- interna pasaría por RLS de nuevo → recursión infinita (stack depth exceeded).
-- Como SECURITY DEFINER (owner = postgres) consultan sin RLS y devuelven la
-- respuesta correcta. SET search_path evita la inyección de search_path.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol = 'owner' AND activo = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.es_admin_del_grupo(grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.miembros_grupo
    WHERE usuario_id = auth.uid()
      AND grupo_id = es_admin_del_grupo.grupo_id
      AND rol_en_grupo = 'admin'
  ) OR public.es_owner();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.es_editor_del_grupo(grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.miembros_grupo
    WHERE usuario_id = auth.uid()
      AND grupo_id = es_editor_del_grupo.grupo_id
      AND rol_en_grupo IN ('admin', 'editor')
  ) OR public.es_owner();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.es_miembro_del_grupo(grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.miembros_grupo
    WHERE usuario_id = auth.uid()
      AND grupo_id = es_miembro_del_grupo.grupo_id
  ) OR public.es_owner()
     -- La "clase principal" se asigna con perfiles.grupo_id (asegurar_grupo /
     -- admin_actualizar_usuario) y NO crea fila en miembros_grupo; el helper
     -- también la considera membresía o los alumnos no verían sus exámenes.
     OR EXISTS (
       SELECT 1 FROM public.perfiles
       WHERE id = auth.uid() AND grupo_id = es_miembro_del_grupo.grupo_id
     );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.es_propio_usuario(usuario_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = usuario_id OR public.es_owner();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.rol_actual()
RETURNS TEXT AS $$
DECLARE
  v_rol TEXT;
BEGIN
  SELECT rol INTO v_rol FROM public.perfiles WHERE id = auth.uid();
  RETURN v_rol;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.es_owner() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_admin_del_grupo(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_editor_del_grupo(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_miembro_del_grupo(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_propio_usuario(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rol_actual() TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3) email_sintetico(): email falso y determinista por username
-- ----------------------------------------------------------------------------
-- Supabase Auth solo sabe identificar por email; el email sintético nunca se
-- muestra al usuario y no requiere verificación. Si dos usernames colisionan
-- tras sanitizar (p.ej. "Ana" y "ana"), se desambigua con un hash corto.
CREATE OR REPLACE FUNCTION public.email_sintetico(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  v_base TEXT;
  v_email TEXT;
  v_norm TEXT;
BEGIN
  v_norm := lower(btrim(p_username));
  v_base := lower(regexp_replace(v_norm, '[^a-z0-9._-]', '', 'g'));
  IF v_base = '' THEN v_base := 'usuario'; END IF;
  v_email := v_base || '@formsbiblicos.local';
  -- Si ese email ya pertenece a OTRO usuario (colisión por sanitización o por
  -- usernames que solo difieren en mayúsculas, p.ej. 'Ana' vs 'ana'), añadir un
  -- sufijo determinista derivado del username. La comparación es EXACTA
  -- (case-sensitive) sobre el username canónico para que la decisión sea la
  -- misma aquí, en la migración 028-B y en cada login.
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = v_email
      AND coalesce(raw_user_meta_data->>'username', '') <> btrim(p_username)
  ) THEN
    v_email := v_base || '-' || substr(encode(digest(v_norm, 'sha256'), 'hex'), 1, 6)
               || '@formsbiblicos.local';
  END IF;
  RETURN v_email;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

GRANT EXECUTE ON FUNCTION public.email_sintetico(TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4) Trigger: crear perfil al crear auth.users
-- ----------------------------------------------------------------------------
-- El perfil se crea con id = auth.users.id (Opción B: un solo id por usuario).
-- El trigger recibe username/nombre/rol desde raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (
    id, username, email, password, nombre_completo, rol, activo
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULL,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo',
             NEW.raw_user_meta_data->>'username',
             split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'usuario'),
    COALESCE((NEW.raw_user_meta_data->>'activo')::boolean, true)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 5) RPC auth_login: validar credenciales y MIGRAR la contraseña al vuelo
-- ----------------------------------------------------------------------------
-- FLUJO: la app llama a auth_login(username, password) ANTES de
-- signInWithPassword. auth_login:
--   1. busca el perfil por username y comprueba activo
--   2. si la contraseña ya es la de Supabase Auth (bcrypt) → devuelve el email
--   3. si NO, compara con el hash legacy SHA-256 (o texto plano legacy) y, si
--      coincide, convierte la contraseña a bcrypt en auth.users en el acto
--   4. nunca pide al usuario ni correo ni reset de contraseña
-- Devuelve el email sintético (solo en caso de éxito) para que el cliente
-- llame a signInWithPassword. En caso de fallo lanza excepción genérica
-- (evita enumerar usuarios) y aplica rate-limit + pg_sleep.
--
-- ⚠️ bcrypt: pgcrypto ya NO está en public ni en auth en Supabase reciente;
-- vive en el esquema extensions. Calificamos con extensions. y garantizamos
-- la extensión ahí mismo. gen_salt('bf', 10) produce $2a$ cost 10,
-- compatible con GoTrue.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE TABLE IF NOT EXISTS public.login_intentos (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_intentos_username ON public.login_intentos(username, creado_en);
-- Tabla interna solo accesible por RPC (SECURITY DEFINER): RLS activa y SIN
-- políticas → ni anon ni authenticated pueden leerla/escribirla directamente.
ALTER TABLE public.login_intentos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.auth_login(p_username TEXT, p_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_perfil public.perfiles%ROWTYPE;
  v_email TEXT;
  v_valido BOOLEAN;
  v_intentos INT;
BEGIN
  -- 1) Perfil por username (exacto y, si no, case-insensitive)
  SELECT * INTO v_perfil FROM public.perfiles
   WHERE username = btrim(p_username);
  IF NOT FOUND THEN
    SELECT * INTO v_perfil FROM public.perfiles
     WHERE lower(username) = lower(btrim(p_username)) LIMIT 1;
  END IF;
  IF NOT FOUND THEN
    PERFORM pg_sleep(0.5);
    RAISE EXCEPTION 'Usuario o contraseña incorrectos';
  END IF;

  -- 2) Cuenta desactivada
  IF NOT v_perfil.activo THEN
    RAISE EXCEPTION 'Cuenta desactivada';
  END IF;

  -- 3) El email SIEMPRE es el real de la cuenta (perfiles.email, poblado por el
  --    trigger handle_new_user). Solo se cae al sintético si el perfil no tiene
  --    email (cuentas pre-028 sin migrar).
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_perfil.id) THEN
    RAISE EXCEPTION 'Cuenta no migrada a Supabase Auth. Contacta al administrador.';
  END IF;
  v_email := COALESCE(v_perfil.email, public.email_sintetico(v_perfil.username));

  -- 4) Rate-limit: máx 5 fallos por username en 10 minutos
  DELETE FROM public.login_intentos WHERE creado_en < now() - interval '10 minutes';
  SELECT count(*) INTO v_intentos FROM public.login_intentos WHERE username = v_perfil.username;
  IF v_intentos >= 5 THEN
    RAISE EXCEPTION 'Demasiados intentos fallidos. Espera unos minutos.';
  END IF;

  -- 5) ¿La contraseña ya es la de Supabase Auth? (comparación bcrypt portable)
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_perfil.id
      AND encrypted_password = extensions.crypt(p_password, encrypted_password)
  ) INTO v_valido;

  IF v_valido THEN
    RETURN v_email;
  END IF;

  -- 6) Migración perezosa: ¿coincide con el hash legacy (SHA-256 hex) o texto plano?
  IF v_perfil.password IS NOT NULL
     AND (v_perfil.password = encode(sha256(p_password::bytea), 'hex')
          OR v_perfil.password = p_password) THEN
    UPDATE auth.users SET
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      email_confirmed_at  = COALESCE(email_confirmed_at, now()),
      updated_at          = now()
    WHERE id = v_perfil.id;
    -- Invalida el hash legacy: de ahora en adelante solo vale la contraseña de Auth
    UPDATE public.perfiles SET password = NULL WHERE id = v_perfil.id;
    RETURN v_email;
  END IF;

  -- 7) Fallo: registrar, esperar y responder genérico
  INSERT INTO public.login_intentos (username) VALUES (v_perfil.username);
  PERFORM pg_sleep(0.5);
  RAISE EXCEPTION 'Usuario o contraseña incorrectos';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auth_login(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_login(TEXT, TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6) RPCs de administración — SOLO OWNER (es_owner())
-- ----------------------------------------------------------------------------
-- IMPORTANTE: con el RLS cerrado (cutover), el panel admin deja de poder
-- INSERT/UPDATE/DELETE directo sobre perfiles de otros (y sobre columnas
-- sensibles). Todo lo sensible pasa por estas RPCs, que validan el llamante.

-- 6.1 Crear usuario (solo owner). Crea el auth.users + perfil vía trigger.
CREATE OR REPLACE FUNCTION public.admin_crear_usuario(
  p_nombre_completo TEXT,
  p_username TEXT,
  p_password TEXT,
  p_rol TEXT DEFAULT 'usuario',
  p_grupo_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_email TEXT;
  v_uid UUID;
BEGIN
  IF NOT public.es_owner() THEN
    RAISE EXCEPTION 'No autorizado: solo el owner puede crear usuarios';
  END IF;
  IF btrim(p_username) = '' OR btrim(p_password) = '' THEN
    RAISE EXCEPTION 'El nombre de usuario y la contraseña son obligatorios';
  END IF;
  IF p_rol NOT IN ('owner', 'admin', 'editor', 'usuario') THEN
    RAISE EXCEPTION 'Rol inválido';
  END IF;

  v_email := public.email_sintetico(p_username);

  BEGIN
    -- Nota: verificar la firma exacta de auth.admin_create_user en la versión
    -- instalada de Supabase (la clásica es (email, password, email_confirm,
    -- user_metadata)). En versiones recientes también existe una variante que
    -- recibe un solo jsonb.
    v_uid := auth.admin_create_user(
      email := v_email,
      password := p_password,
      email_confirm := true,
      user_metadata := jsonb_build_object(
        'username', btrim(p_username),
        'nombre_completo', btrim(p_nombre_completo),
        'rol', p_rol
      )
    );
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Ese nombre de usuario ya existe';
  END;

  -- El trigger handle_new_user ya creó perfiles; completamos los campos de negocio
  UPDATE public.perfiles
     SET rol = p_rol,
         grupo_id = p_grupo_id,
         activo = true,
         nombre_completo = btrim(p_nombre_completo)
   WHERE id = v_uid;

  INSERT INTO public.auditoria (accion, detalle, actor_id)
  VALUES ('usuario_creado', 'Usuario ' || btrim(p_username) || ' (rol ' || p_rol || ')', auth.uid());

  RETURN v_uid;
END;
$$;

-- 6.2 Actualizar perfil / cambiar contraseña (solo owner)
CREATE OR REPLACE FUNCTION public.admin_actualizar_usuario(
  p_usuario_id UUID,
  p_nombre_completo TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL,
  p_rol TEXT DEFAULT NULL,
  p_grupo_id UUID DEFAULT NULL,
  p_password TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT public.es_owner() THEN
    RAISE EXCEPTION 'No autorizado: solo el owner puede gestionar usuarios';
  END IF;

  IF p_rol IS NOT NULL AND p_rol NOT IN ('owner', 'admin', 'editor', 'usuario') THEN
    RAISE EXCEPTION 'Rol inválido';
  END IF;

  -- Cambio de username → sincronizar el email sintético en auth
  IF p_username IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.perfiles
               WHERE username = btrim(p_username) AND id <> p_usuario_id) THEN
      RAISE EXCEPTION 'Ese nombre de usuario ya existe';
    END IF;
    BEGIN
      UPDATE auth.users SET email = public.email_sintetico(p_username), updated_at = now()
       WHERE id = p_usuario_id;
      UPDATE auth.identities
         SET identity_data = identity_data || jsonb_build_object('email', public.email_sintetico(p_username))
       WHERE user_id = p_usuario_id AND provider = 'email';
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Ese nombre de usuario ya existe';
    END;
  END IF;

  -- Cambio de contraseña → se aplica en Supabase Auth e invalida el hash legacy
  IF p_password IS NOT NULL AND p_password <> '' THEN
    PERFORM auth.admin_update_user_by_id(p_usuario_id, jsonb_build_object('password', p_password));
    UPDATE public.perfiles SET password = NULL WHERE id = p_usuario_id;
  END IF;

  -- CONTRATO con el cliente (Fase 2): el panel debe enviar SIEMPRE el
  -- grupo_id actual del usuario (o NULL si se le quiere desasignar la clase).
  UPDATE public.perfiles SET
    nombre_completo = COALESCE(p_nombre_completo, nombre_completo),
    username        = COALESCE(p_username, username),
    rol             = COALESCE(p_rol, rol),
    grupo_id        = p_grupo_id
  WHERE id = p_usuario_id;

  INSERT INTO public.auditoria (accion, detalle, actor_id)
  VALUES ('usuario_actualizado', 'Perfil ' || p_usuario_id::text, auth.uid());
END;
$$;

-- 6.3 Cambiar rol (solo owner; protege al último owner)
CREATE OR REPLACE FUNCTION public.admin_cambiar_rol(p_usuario_id UUID, p_rol TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.es_owner() THEN
    RAISE EXCEPTION 'No autorizado: solo el owner puede cambiar roles';
  END IF;
  IF p_rol NOT IN ('owner', 'admin', 'editor', 'usuario') THEN
    RAISE EXCEPTION 'Rol inválido';
  END IF;
  -- Evitar quedarse sin owner
  IF (SELECT rol FROM public.perfiles WHERE id = p_usuario_id) = 'owner'
     AND p_rol <> 'owner'
     AND (SELECT count(*) FROM public.perfiles WHERE rol = 'owner' AND activo) <= 1 THEN
    RAISE EXCEPTION 'No puedes quitar el rol owner al último owner';
  END IF;
  UPDATE public.perfiles SET rol = p_rol WHERE id = p_usuario_id;
  INSERT INTO public.auditoria (accion, detalle, actor_id)
  VALUES ('rol_cambiado', 'Perfil ' || p_usuario_id::text || ' → ' || p_rol, auth.uid());
END;
$$;

-- 6.4 Activar/desactivar (solo owner; protege al owner)
CREATE OR REPLACE FUNCTION public.admin_toggle_activo(p_usuario_id UUID, p_activo BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.es_owner() THEN
    RAISE EXCEPTION 'No autorizado: solo el owner puede activar/desactivar cuentas';
  END IF;
  IF NOT p_activo
     AND (SELECT rol FROM public.perfiles WHERE id = p_usuario_id) = 'owner'
     AND (SELECT count(*) FROM public.perfiles WHERE rol = 'owner' AND activo) <= 1 THEN
    RAISE EXCEPTION 'No puedes desactivar al último owner';
  END IF;
  UPDATE public.perfiles SET activo = p_activo WHERE id = p_usuario_id;
  INSERT INTO public.auditoria (accion, detalle, actor_id)
  VALUES (CASE WHEN p_activo THEN 'usuario_activado' ELSE 'usuario_desactivado' END,
          'Perfil ' || p_usuario_id::text, auth.uid());
END;
$$;

-- 6.5 Eliminar usuario (solo owner). Limpia FKs no-cascada, borra el perfil
-- (con sus cascadas) y elimina el auth.users/identities.
CREATE OR REPLACE FUNCTION public.admin_eliminar_usuario(p_usuario_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.es_owner() THEN
    RAISE EXCEPTION 'No autorizado: solo el owner puede eliminar usuarios';
  END IF;
  IF p_usuario_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminarte a ti mismo';
  END IF;
  IF (SELECT count(*) FROM public.perfiles WHERE rol = 'owner' AND activo) <= 1
     AND EXISTS (SELECT 1 FROM public.perfiles
                 WHERE id = p_usuario_id AND rol = 'owner') THEN
    RAISE EXCEPTION 'No puedes eliminar al último owner';
  END IF;

  -- FKs sin CASCADE: reasignar o anular antes de borrar
  -- Los intentos del alumno se ELIMINAN (alumno_id es NOT NULL sin cascada)
  DELETE FROM public.intentos_examen_personalizado WHERE alumno_id = p_usuario_id;
  UPDATE public.auditoria                      SET actor_id = NULL                WHERE actor_id = p_usuario_id;
  UPDATE public.intentos_examen_personalizado  SET corregido_por = NULL           WHERE corregido_por = p_usuario_id;
  UPDATE public.preguntas_sistema              SET creado_por = NULL              WHERE creado_por = p_usuario_id;
  UPDATE public.evaluaciones                   SET creado_por = NULL              WHERE creado_por = p_usuario_id;
  UPDATE public.examenes_personalizados        SET creado_por = auth.uid()        WHERE creado_por = p_usuario_id;
  UPDATE public.grupos                         SET admin_id = NULL                WHERE admin_id = p_usuario_id;
  UPDATE public.mazos_memorizacion             SET creado_por = NULL              WHERE creado_por = p_usuario_id;
  UPDATE public.tarjetas_memorizacion          SET creado_por = NULL              WHERE creado_por = p_usuario_id;
  UPDATE public.notificaciones                 SET emisor_id = NULL               WHERE emisor_id = p_usuario_id;
  -- (miembros, progreso, tarjetas, repasos, logros, notas, sugerencias, mazos,
  --  notificaciones, desafios, participantes, categorias, backups → CASCADE)

  DELETE FROM public.perfiles WHERE id = p_usuario_id;  -- cascadas
  PERFORM auth.admin_delete_user(p_usuario_id, true);   -- auth.users + identities

  INSERT INTO public.auditoria (accion, detalle, actor_id)
  VALUES ('usuario_eliminado', 'Perfil ' || p_usuario_id::text, auth.uid());
END;
$$;

-- 6.6 RPC asegurar_grupo: replica al cliente asegurarGrupo() (Fase 2). Crea la
-- clase principal del usuario (si no tiene) y la registra en miembros_grupo,
-- porque con el RLS cerrado ya NO se permite al usuario UPDATE su propio grupo_id.
CREATE OR REPLACE FUNCTION public.asegurar_grupo()
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_perfil public.perfiles%ROWTYPE;
  v_grupo_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  SELECT * INTO v_perfil FROM public.perfiles WHERE id = auth.uid();
  IF v_perfil.grupo_id IS NOT NULL THEN
    RETURN v_perfil.grupo_id;
  END IF;
  INSERT INTO public.grupos (nombre, admin_id)
  VALUES ('Grupo de ' || COALESCE(v_perfil.nombre_completo, v_perfil.username), auth.uid())
  RETURNING id INTO v_grupo_id;
  INSERT INTO public.miembros_grupo (grupo_id, usuario_id, rol_en_grupo)
  VALUES (v_grupo_id, auth.uid(), 'admin');
  UPDATE public.perfiles SET grupo_id = v_grupo_id WHERE id = auth.uid();
  RETURN v_grupo_id;
END;
$$;

-- 6.7 RPC de notificación (los INSERT de notificaciones ajenas dejan de poder
-- hacerse por RLS con el cutover; el cliente llamará a esta RPC)
CREATE OR REPLACE FUNCTION public.enviar_notificacion(
  p_usuario_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_cuerpo TEXT DEFAULT '',
  p_datos JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, cuerpo, datos)
  VALUES (p_usuario_id, p_tipo, p_titulo, p_cuerpo, p_datos)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Grants de ejecución de las RPCs
REVOKE EXECUTE ON FUNCTION public.asegurar_grupo() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_crear_usuario(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_actualizar_usuario(UUID, TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_cambiar_rol(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_activo(UUID, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_eliminar_usuario(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enviar_notificacion(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.asegurar_grupo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_crear_usuario(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_usuario(UUID, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cambiar_rol(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_activo(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_eliminar_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enviar_notificacion(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ⚠️ RESIDUO DOCUMENTADO (no se cierra en esta fase): la app calcula la nota de
-- los exámenes objetivos en el cliente y la escribe al entregar, y los desafíos
-- envían la puntuación del participante. El RLS no lo empeora (solo afecta a las
-- propias filas), pero "auto-calificarse" sigue siendo posible por diseño de la
-- app. Cerrarlo del todo requiere una RPC de entrega/corrección que calcule la
-- puntuación en el servidor (Fase 3, pendiente).

SELECT '✅ 028-A aplicada: esquema de Supabase Auth listo (trigger, auth_login, asegurar_grupo, RPCs de admin)' AS mensaje;


-- ===== supabase\politicas-rls\001_global_policies.sql =====
-- ============================================================
-- RLS: perfiles
-- ============================================================
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfiles_lectura_propios_o_admin"
  ON perfiles FOR SELECT USING (
    id = auth.uid() OR
    es_admin_del_grupo(grupo_id) OR
    es_owner()
  );

CREATE POLICY "perfiles_actualizacion_propia"
  ON perfiles FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "perfiles_admin_actualiza"
  ON perfiles FOR UPDATE USING (
    es_admin_del_grupo(grupo_id) OR es_owner()
  );

-- ============================================================
-- RLS: grupos
-- ============================================================
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grupos_lectura_miembros"
  ON grupos FOR SELECT USING (
    es_miembro_del_grupo(id) OR es_owner()
  );

CREATE POLICY "grupos_admin_gestiona"
  ON grupos FOR ALL USING (
    es_admin_del_grupo(id) OR es_owner()
  );

-- ============================================================
-- RLS: miembros_grupo
-- ============================================================
ALTER TABLE miembros_grupo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "miembros_lectura_miembros"
  ON miembros_grupo FOR SELECT USING (
    es_miembro_del_grupo(grupo_id) OR es_owner()
  );

CREATE POLICY "miembros_admin_gestiona"
  ON miembros_grupo FOR ALL USING (
    es_admin_del_grupo(grupo_id) OR es_owner()
  );

-- ============================================================
-- RLS: progreso_lectura (cada usuario ve su propio progreso)
-- ============================================================
ALTER TABLE progreso_lectura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progreso_lectura_propio"
  ON progreso_lectura FOR ALL USING (
    usuario_id = auth.uid() OR es_owner()
  );

CREATE POLICY "progreso_lectura_profesor_ve"
  ON progreso_lectura FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM perfiles p
      JOIN miembros_grupo mg ON mg.grupo_id = p.grupo_id
      WHERE p.id = progreso_lectura.usuario_id
        AND mg.usuario_id = auth.uid()
        AND mg.rol_en_grupo IN ('admin', 'editor')
    )
  );

-- ============================================================
-- RLS: preguntas_sistema (lectura para todos los miembros del grupo)
-- ============================================================
ALTER TABLE preguntas_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preguntas_sistema_lectura_grupo"
  ON preguntas_sistema FOR SELECT USING (
    es_miembro_del_grupo(
      (SELECT p.grupo_id FROM capitulos c
       JOIN libros_biblicos l ON c.libro_id = l.id
       JOIN perfiles p ON p.grupo_id IS NOT NULL
       WHERE c.id = preguntas_sistema.capitulo_id
       LIMIT 1)
    ) OR es_owner()
  );

CREATE POLICY "preguntas_sistema_edicion_editor"
  ON preguntas_sistema FOR INSERT WITH CHECK (
    creado_por = auth.uid() AND
    EXISTS (
      SELECT 1 FROM capitulos c
      JOIN libros_biblicos l ON c.libro_id = l.id
      JOIN miembros_grupo mg ON mg.grupo_id = (SELECT grupo_id FROM perfiles WHERE id = auth.uid())
      WHERE c.id = capitulo_id AND mg.rol_en_grupo IN ('admin', 'editor')
    )
  );

-- ============================================================
-- RLS: examenes_personalizados
-- ============================================================
ALTER TABLE examenes_personalizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "examenes_lectura_grupo"
  ON examenes_personalizados FOR SELECT USING (
    es_miembro_del_grupo(grupo_id) OR es_owner()
  );

CREATE POLICY "examenes_edicion_profesor"
  ON examenes_personalizados FOR ALL USING (
    es_editor_del_grupo(grupo_id)
  );

-- ============================================================
-- RLS: intentos_examen_personalizado
-- ============================================================
ALTER TABLE intentos_examen_personalizado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intentos_alumno_propio"
  ON intentos_examen_personalizado FOR ALL USING (
    alumno_id = auth.uid() OR es_owner()
  );

CREATE POLICY "intentos_profesor_ve"
  ON intentos_examen_personalizado FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM examenes_personalizados e
      WHERE e.id = examen_id AND es_editor_del_grupo(e.grupo_id)
    )
  );

CREATE POLICY "intentos_profesor_califica"
  ON intentos_examen_personalizado FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM examenes_personalizados e
      WHERE e.id = examen_id AND es_editor_del_grupo(e.grupo_id)
    )
  );

-- ============================================================
-- RLS: tarjetas_memorizacion
-- ============================================================
ALTER TABLE tarjetas_memorizacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tarjetas_propias"
  ON tarjetas_memorizacion FOR ALL USING (
    usuario_id = auth.uid() OR es_owner()
  );

-- ============================================================
-- RLS: repasos_memorizacion
-- ============================================================
ALTER TABLE repasos_memorizacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repasos_propios"
  ON repasos_memorizacion FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tarjetas_memorizacion t
      WHERE t.id = tarjeta_id AND t.usuario_id = auth.uid()
    )
  );

-- ============================================================
-- RLS: logros
-- ============================================================
ALTER TABLE logros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logros_todos_ven" ON logros FOR SELECT USING (true);

-- ============================================================
-- RLS: logros_usuario
-- ============================================================
ALTER TABLE logros_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logros_usuario_propios"
  ON logros_usuario FOR SELECT USING (
    usuario_id = auth.uid() OR es_admin_del_grupo(
      (SELECT grupo_id FROM perfiles WHERE id = logros_usuario.usuario_id)
    )
  );

-- ============================================================
-- RLS: auditoria (solo Owner)
-- ============================================================
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auditoria_solo_owner"
  ON auditoria FOR SELECT USING (es_owner());

CREATE POLICY "auditoria_insert_sistema"
  ON auditoria FOR INSERT WITH CHECK (true);


-- ===== supabase\politicas-rls\002_anon_custom_auth.sql =====
-- ============================================================
-- HABILITAR RLS + POLÍTICAS ABIERTAS PARA ANON
-- ⚠️ El sistema usa autenticación custom (tabla perfiles con password),
--    NO Supabase Auth JWT. auth.uid() devuelve null.
--    Las políticas abiertas son necesarias para que el sistema funcione.
--    Cuando se migre a Supabase Auth, reemplazar estas policies
--    con las restrictivas del archivo 001_global_policies.sql
-- ============================================================

-- 1) PERFILES
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfiles_anon_all" ON perfiles;
DROP POLICY IF EXISTS "perfiles_anon_login" ON perfiles;
DROP POLICY IF EXISTS "perfiles_lectura_propios_o_admin" ON perfiles;
CREATE POLICY "perfiles_anon_all" ON perfiles FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2) GRUPOS
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grupos_anon_all" ON grupos;
DROP POLICY IF EXISTS "grupos_lectura_miembros" ON grupos;
DROP POLICY IF EXISTS "grupos_admin_gestiona" ON grupos;
CREATE POLICY "grupos_anon_all" ON grupos FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3) MIEMBROS_GRUPO
ALTER TABLE miembros_grupo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "miembros_anon_all" ON miembros_grupo;
DROP POLICY IF EXISTS "miembros_lectura_miembros" ON miembros_grupo;
DROP POLICY IF EXISTS "miembros_admin_gestiona" ON miembros_grupo;
CREATE POLICY "miembros_anon_all" ON miembros_grupo FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4) LIBROS_BIBLICOS (catálogo público)
ALTER TABLE libros_biblicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "libros_anon_publico" ON libros_biblicos;
CREATE POLICY "libros_anon_publico" ON libros_biblicos FOR SELECT TO anon USING (true);

-- 5) CAPITULOS
ALTER TABLE capitulos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "capitulos_anon_publico" ON capitulos;
CREATE POLICY "capitulos_anon_publico" ON capitulos FOR SELECT TO anon USING (true);

-- 6) VERSICULOS
ALTER TABLE versiculos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "versiculos_anon_publico" ON versiculos;
CREATE POLICY "versiculos_anon_publico" ON versiculos FOR SELECT TO anon USING (true);

-- 7) PROGRESO_LECTURA
ALTER TABLE progreso_lectura ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progreso_lectura_anon_all" ON progreso_lectura;
DROP POLICY IF EXISTS "progreso_lectura_propio" ON progreso_lectura;
DROP POLICY IF EXISTS "progreso_lectura_profesor_ve" ON progreso_lectura;
CREATE POLICY "progreso_lectura_anon_all" ON progreso_lectura FOR ALL TO anon USING (true) WITH CHECK (true);

-- 8) PREGUNTAS_SISTEMA
ALTER TABLE preguntas_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preguntas_sistema_anon_all" ON preguntas_sistema;
DROP POLICY IF EXISTS "preguntas_sistema_lectura_grupo" ON preguntas_sistema;
DROP POLICY IF EXISTS "preguntas_sistema_edicion_editor" ON preguntas_sistema;
CREATE POLICY "preguntas_sistema_anon_all" ON preguntas_sistema FOR ALL TO anon USING (true) WITH CHECK (true);

-- 9) EXAMENES_PERSONALIZADOS
ALTER TABLE examenes_personalizados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "examenes_anon_all" ON examenes_personalizados;
DROP POLICY IF EXISTS "examenes_lectura_grupo" ON examenes_personalizados;
DROP POLICY IF EXISTS "examenes_edicion_profesor" ON examenes_personalizados;
CREATE POLICY "examenes_anon_all" ON examenes_personalizados FOR ALL TO anon USING (true) WITH CHECK (true);

-- 10) INTENTOS_EXAMEN_PERSONALIZADO
ALTER TABLE intentos_examen_personalizado ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intentos_anon_all" ON intentos_examen_personalizado;
DROP POLICY IF EXISTS "intentos_alumno_propio" ON intentos_examen_personalizado;
DROP POLICY IF EXISTS "intentos_profesor_ve" ON intentos_examen_personalizado;
DROP POLICY IF EXISTS "intentos_profesor_califica" ON intentos_examen_personalizado;
CREATE POLICY "intentos_anon_all" ON intentos_examen_personalizado FOR ALL TO anon USING (true) WITH CHECK (true);

-- 11) TARJETAS_MEMORIZACION
ALTER TABLE tarjetas_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tarjetas_anon_all" ON tarjetas_memorizacion;
DROP POLICY IF EXISTS "tarjetas_propias" ON tarjetas_memorizacion;
CREATE POLICY "tarjetas_anon_all" ON tarjetas_memorizacion FOR ALL TO anon USING (true) WITH CHECK (true);

-- 12) REPASOS_MEMORIZACION
ALTER TABLE repasos_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "repasos_anon_all" ON repasos_memorizacion;
DROP POLICY IF EXISTS "repasos_propios" ON repasos_memorizacion;
CREATE POLICY "repasos_anon_all" ON repasos_memorizacion FOR ALL TO anon USING (true) WITH CHECK (true);

-- 13) LOGROS
ALTER TABLE logros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logros_anon_all" ON logros;
DROP POLICY IF EXISTS "logros_todos_ven" ON logros;
CREATE POLICY "logros_anon_all" ON logros FOR ALL TO anon USING (true) WITH CHECK (true);

-- 14) LOGROS_USUARIO
ALTER TABLE logros_usuario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logros_usuario_anon_all" ON logros_usuario;
DROP POLICY IF EXISTS "logros_usuario_propios" ON logros_usuario;
CREATE POLICY "logros_usuario_anon_all" ON logros_usuario FOR ALL TO anon USING (true) WITH CHECK (true);

-- 15) AUDITORIA
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auditoria_anon_all" ON auditoria;
DROP POLICY IF EXISTS "auditoria_solo_owner" ON auditoria;
DROP POLICY IF EXISTS "auditoria_insert_sistema" ON auditoria;
CREATE POLICY "auditoria_anon_all" ON auditoria FOR ALL TO anon USING (true) WITH CHECK (true);

-- 16) GRANTs para el rol anon en TODAS las tablas
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 17) HABILITAR RLS EN study_history si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_history') THEN
    ALTER TABLE study_history ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "study_history_anon_all" ON study_history;
    CREATE POLICY "study_history_anon_all" ON study_history FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

SELECT '✅ RLS configurado para auth custom: todas las tablas abiertas para anon' AS mensaje;


-- ===== supabase\funciones\auth_helpers.sql =====
-- ============================================================
-- Funciones auxiliares de autorización (reutilizables en RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION es_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid() AND rol = 'owner' AND activo = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION es_admin_del_grupo(grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM miembros_grupo
    WHERE usuario_id = auth.uid()
      AND grupo_id = es_admin_del_grupo.grupo_id
      AND rol_en_grupo = 'admin'
  ) OR es_owner();
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION es_editor_del_grupo(grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM miembros_grupo
    WHERE usuario_id = auth.uid()
      AND grupo_id = es_editor_del_grupo.grupo_id
      AND rol_en_grupo IN ('admin', 'editor')
  ) OR es_owner();
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION es_miembro_del_grupo(grupo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM miembros_grupo
    WHERE usuario_id = auth.uid()
      AND grupo_id = es_miembro_del_grupo.grupo_id
  ) OR es_owner();
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION es_propio_usuario(usuario_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = usuario_id OR es_owner();
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION rol_actual()
RETURNS TEXT AS $$
DECLARE
  v_rol TEXT;
BEGIN
  SELECT rol INTO v_rol FROM perfiles WHERE id = auth.uid();
  RETURN v_rol;
END;
$$ LANGUAGE plpgsql STABLE;


-- ===== supabase\migraciones\pendientes_produccion.sql =====
-- ============================================================================
-- FormsBiblicos — MIGRACIONES PENDIENTES DE PRODUCCIÓN (script consolidado)
-- ============================================================================
--
-- CÓMO USAR:
--   1. Abre el SQL Editor del dashboard de Supabase (proyecto josxcvncescqqlajahkh).
--   2. Pega TODO este archivo y ejecuta (Run).
--   3. Opcional: vuelve a ejecutarlo — es 100% idempotente gracias a
--      IF NOT EXISTS / CREATE TABLE IF NOT EXISTS / DROP POLICY IF EXISTS.
--
-- QUÉ INCLUYE (verificado contra la BD de producción el 2026-08-02):
--   • 016  Campos de seguimiento de memorización  → respaldo (ya aplicada, inofensiva)
--   • 018  Tabla `sugerencias` (perfil + panel owner) → aplicada
--   • 019  Columnas `fijada` y `pendiente_sync` en notas_capitulo → aplicada
--   • 020  Tabla `configuracion` (clave-valor, panel owner) → aplicada
--   • 021  Tablas/columnas de mazos de memorización → aplicada
--   • 022  Tabla `backups` (panel Owner, Sistema) → NUEVA
--   • 023  Memorización tipo juego (mazos globales + progreso individual) → NUEVA
--   • 024  Tabla `notas_personales` (bloc de notas) → NUEVA
--
-- NOTA: las columnas `estado`, `proxima_revision` y `efectividad` de
-- tarjetas_memorizacion NO se incluyen porque la app no las usa (la derivación
-- del estado de aprendizaje se hace en cliente con estadoAprendizaje()).
--
-- ============================================================================
-- MIGRACIÓN 016 — Campos de seguimiento de memorización (respaldo idempotente)
-- ============================================================================

ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS mejor_racha INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS veces_olvidado INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS ultima_calificacion INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS ultimo_repaso TIMESTAMPTZ;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS racha_actual INTEGER DEFAULT 0;

-- ============================================================================
-- MIGRACIÓN 018 — Sugerencias de los usuarios
-- Los usuarios envían comentarios (errores, ideas, mejoras) desde su perfil y
-- ven el estado de cada una. Solo el Owner las gestiona en su panel.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sugerencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL DEFAULT 'general'
    CHECK (categoria IN ('error', 'idea', 'mejora', 'contenido', 'otro')),
  texto TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'enviada'
    CHECK (estado IN ('enviada', 'en_revision', 'aceptada', 'implementada', 'rechazada')),
  respuesta TEXT DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sugerencias_usuario ON sugerencias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sugerencias_estado ON sugerencias(estado);

-- RLS: el proyecto usa autenticación custom (anon). Políticas abiertas para anon.
ALTER TABLE sugerencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sugerencias_anon_all" ON sugerencias;
CREATE POLICY "sugerencias_anon_all" ON sugerencias FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE sugerencias TO anon;
GRANT ALL ON TABLE sugerencias TO authenticated;

-- ============================================================================
-- MIGRACIÓN 019 — Mejoras de notas (columnas que faltan en producción)
-- El repositorio (js/datos/notas-repository.js) ya usa `tipo`, `titulo` y
-- `pendiente_sync`; `tipo` y `titulo` ya existen, faltan `fijada` y
-- `pendiente_sync`. Sin ellas: listar() fallaba (42703) y guardar() caía al caché.
-- ============================================================================

ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'personal';
ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS titulo TEXT DEFAULT '';
ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS pendiente_sync BOOLEAN DEFAULT FALSE;
ALTER TABLE notas_capitulo ADD COLUMN IF NOT EXISTS fijada BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_notas_usuario_tipo ON notas_capitulo(usuario_id, tipo);
CREATE INDEX IF NOT EXISTS idx_notas_usuario_fijada ON notas_capitulo(usuario_id, fijada);

-- ============================================================================
-- MIGRACIÓN 020 — Configuración global (clave-valor)
-- Almacena ajustes del sistema gestionados desde el panel de propietario.
-- Con esta tabla, admin-repository deja de usar try/catch defensivos.
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL DEFAULT '',
  actualizado_en TIMESTAMPTZ DEFAULT now(),
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- RLS: abierta para anon (autenticación custom).
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "configuracion_anon_all" ON configuracion;
CREATE POLICY "configuracion_anon_all" ON configuracion FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE configuracion TO anon;
GRANT ALL ON TABLE configuracion TO authenticated;

-- ============================================================================
-- MIGRACIÓN 021 — Mazos de memorización (flashcards tipo Anki)
-- Organiza las tarjetas en mazos. Cada tarjeta pertenece a un solo mazo
-- (mazo_id). Soporta versículos bíblicos y tarjetas libres (tipo).
-- ============================================================================

CREATE TABLE IF NOT EXISTS mazos_memorizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  color TEXT DEFAULT '#3B82F6',
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mazos_usuario ON mazos_memorizacion(usuario_id);

-- Cada tarjeta pertenece a un mazo. Si el mazo se borra, la tarjeta pasa a
-- "Sin mazo" (ON DELETE SET NULL) en lugar de perderse.
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS mazo_id UUID REFERENCES mazos_memorizacion(id) ON DELETE SET NULL;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'versiculo' CHECK (tipo IN ('versiculo', 'libre'));
CREATE INDEX IF NOT EXISTS idx_tarjetas_mazo ON tarjetas_memorizacion(mazo_id);

-- RLS: abierta para anon (autenticación custom).
ALTER TABLE mazos_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mazos_anon_all" ON mazos_memorizacion;
CREATE POLICY "mazos_anon_all" ON mazos_memorizacion FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE mazos_memorizacion TO anon;
GRANT ALL ON TABLE mazos_memorizacion TO authenticated;

-- ============================================================================
-- MIGRACIÓN 022 — Panel de Administración: tabla backups
-- Snapshots JSON de la base creados desde la pestaña Sistema del panel Owner.
-- ============================================================================

CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  tamano_bytes INTEGER DEFAULT 0,
  snapshot JSONB DEFAULT '{}'::jsonb,
  estado TEXT NOT NULL DEFAULT 'ok' CHECK (estado IN ('ok', 'fallido')),
  notas TEXT DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backups_creado ON backups(creado_en DESC);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "backups_anon_all" ON backups;
CREATE POLICY "backups_anon_all" ON backups FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE backups TO anon;
GRANT ALL ON TABLE backups TO authenticated;

-- ============================================================================
-- MIGRACIÓN 023 — Memorización tipo juego (estilo Duolingo)
-- Mazos/tarjetas GLOBALES + progreso individual (SM-2) + tipos de ejercicio.
-- ============================================================================

-- 1. MAZOS: contenido global
ALTER TABLE mazos_memorizacion ALTER COLUMN usuario_id DROP NOT NULL;

ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS icono TEXT DEFAULT 'layers';
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS es_global BOOLEAN DEFAULT FALSE;
ALTER TABLE mazos_memorizacion ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL;

-- 2. TARJETAS: contenido global + tipos de ejercicio
ALTER TABLE tarjetas_memorizacion ALTER COLUMN usuario_id DROP NOT NULL;

ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS pregunta TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS respuesta TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS explicacion TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS libro TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS capitulo TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS versiculo TEXT DEFAULT '';
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS opciones JSONB DEFAULT NULL;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;
ALTER TABLE tarjetas_memorizacion ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL;

ALTER TABLE tarjetas_memorizacion DROP CONSTRAINT IF EXISTS tarjetas_memorizacion_tipo_check;
ALTER TABLE tarjetas_memorizacion ADD CONSTRAINT tarjetas_memorizacion_tipo_check
  CHECK (tipo IN (
    'versiculo', 'libre', 'completar', 'ordenar', 'elegir_versiculo',
    'verdadero_falso', 'relacionar', 'escrita', 'personaje', 'lugar',
    'libro', 'cronologia', 'multirrespuesta'
  ));

CREATE INDEX IF NOT EXISTS idx_tarjetas_orden ON tarjetas_memorizacion(mazo_id, orden);

-- 3. PROGRESO INDIVIDUAL (SM-2 + nivel por usuario)
CREATE TABLE IF NOT EXISTS progreso_tarjetas_memorizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tarjeta_id UUID NOT NULL REFERENCES tarjetas_memorizacion(id) ON DELETE CASCADE,
  repeticiones INTEGER DEFAULT 0,
  factor_facilidad DECIMAL(4,2) DEFAULT 2.50,
  intervalo INTEGER DEFAULT 0,
  proximo_repaso TIMESTAMPTZ DEFAULT NOW(),
  ultimo_repaso TIMESTAMPTZ,
  racha_actual INTEGER DEFAULT 0,
  mejor_racha INTEGER DEFAULT 0,
  veces_olvidado INTEGER DEFAULT 0,
  ultima_calificacion INTEGER,
  nivel TEXT DEFAULT 'nueva' CHECK (nivel IN ('nueva', 'aprendiendo', 'dominada', 'perfecta')),
  UNIQUE(usuario_id, tarjeta_id),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progreso_tarjeta ON progreso_tarjetas_memorizacion(tarjeta_id);
CREATE INDEX IF NOT EXISTS idx_progreso_usuario ON progreso_tarjetas_memorizacion(usuario_id);

-- 4. REPASOS: registrar quién repasa
ALTER TABLE repasos_memorizacion ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_repasos_usuario ON repasos_memorizacion(usuario_id);

ALTER TABLE progreso_tarjetas_memorizacion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "progreso_anon_all" ON progreso_tarjetas_memorizacion;
CREATE POLICY "progreso_anon_all" ON progreso_tarjetas_memorizacion FOR ALL TO anon USING (true) WITH CHECK (true);
GRANT ALL ON TABLE progreso_tarjetas_memorizacion TO anon;
GRANT ALL ON TABLE progreso_tarjetas_memorizacion TO authenticated;

-- ============================================================================
-- MIGRACIÓN 024 — Notas personales (bloc de notas estilo Xiaomi/Apple Notes)
-- Tabla independiente de libro/capítulo con papelera, color de fondo y fijación.
-- La tabla legacy `notas_capitulo` se mantiene para las notas de sesión de estudio.
-- ============================================================================

CREATE TABLE IF NOT EXISTS notas_personales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL,
  titulo TEXT NOT NULL DEFAULT '',
  contenido TEXT NOT NULL DEFAULT '',
  fijada BOOLEAN NOT NULL DEFAULT FALSE,
  en_papelera BOOLEAN NOT NULL DEFAULT FALSE,
  eliminada_en TIMESTAMPTZ,
  color_fondo TEXT NOT NULL DEFAULT 'blanco',
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notas_personales_usuario ON notas_personales(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notas_personales_papelera ON notas_personales(usuario_id, en_papelera);
CREATE INDEX IF NOT EXISTS idx_notas_personales_actualizado ON notas_personales(usuario_id, actualizado_en DESC);

ALTER TABLE notas_personales DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE notas_personales TO anon;
GRANT ALL ON TABLE notas_personales TO authenticated;


-- ============================================================================
-- MIGRACIÓN 025 — Orden manual de evaluaciones (vista Notas)
-- ============================================================================

ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_evaluaciones_orden ON evaluaciones(grupo_id, orden);

-- ============================================================================
-- MIGRACIÓN 026 — Grupos públicos + Desafíos de memorización
-- ============================================================================

ALTER TABLE grupos ADD COLUMN IF NOT EXISTS imagen TEXT DEFAULT NULL;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS biografia TEXT DEFAULT '';

-- La tabla notificaciones puede EXISTIR YA con un esquema antiguo
-- (mensaje/created_at, sin usuario_id). Por eso, además de
-- CREATE TABLE IF NOT EXISTS, se añaden con ALTER TABLE las columnas
-- que falten para que la migración sea idempotente.
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'info'  CHECK (tipo IN ('desafio', 'grupo', 'info', 'examen_publicado', 'examen_entregado', 'mazo_nuevo')),
  titulo TEXT NOT NULL DEFAULT '',
  cuerpo TEXT DEFAULT '',
  datos JSONB DEFAULT NULL,
  leida BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'info';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS titulo TEXT NOT NULL DEFAULT '';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS cuerpo TEXT DEFAULT '';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS datos JSONB DEFAULT NULL;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS leida BOOLEAN DEFAULT FALSE;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ DEFAULT NOW();

DO $$
DECLARE
  c TEXT;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'notificaciones'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%tipo%'
  LOOP
    EXECUTE format('ALTER TABLE notificaciones DROP CONSTRAINT %I', c);
  END LOOP;
END $$;ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_tipo_check 
  CHECK (tipo IN ('desafio', 'grupo', 'info', 'examen_publicado', 'examen_entregado', 'mazo_nuevo', 'anuncio'));

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_no_leidas ON notificaciones(usuario_id) WHERE leida = FALSE;

CREATE TABLE IF NOT EXISTS desafios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creador_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  mazo_id UUID REFERENCES mazos_memorizacion(id) ON DELETE SET NULL,
  mazo_nombre TEXT DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'invitacion'
    CHECK (estado IN ('invitacion', 'en_curso', 'finalizado', 'expirado', 'cancelado')),
  sesion JSONB DEFAULT NULL,
  tiempo_limite_seg INTEGER DEFAULT 120,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  iniciado_en TIMESTAMPTZ,
  finalizado_en TIMESTAMPTZ,
  expira_en TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_desafios_estado ON desafios(estado, expira_en);

CREATE TABLE IF NOT EXISTS desafio_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desafio_id UUID NOT NULL REFERENCES desafios(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'invitado'
    CHECK (estado IN ('invitado', 'aceptado', 'rechazado', 'en_juego', 'terminado', 'abandonado')),
  correctas INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  tiempo_ms INTEGER DEFAULT NULL,
  orden INTEGER DEFAULT 0,
  UNIQUE(desafio_id, usuario_id),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dp_desafio ON desafio_participantes(desafio_id);
CREATE INDEX IF NOT EXISTS idx_dp_usuario ON desafio_participantes(usuario_id);

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notificaciones_anon_all" ON notificaciones;
CREATE POLICY "notificaciones_anon_all" ON notificaciones FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE desafios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "desafios_anon_all" ON desafios;
CREATE POLICY "desafios_anon_all" ON desafios FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE desafio_participantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "desafio_participantes_anon_all" ON desafio_participantes;
CREATE POLICY "desafio_participantes_anon_all" ON desafio_participantes FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON notificaciones, desafios, desafio_participantes TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================================================
-- MIGRACIÓN 027 — Bucket de almacenamiento para fotos de perfil
-- Las fotos se suben a Supabase Storage en lugar de guardarse como base64.
-- Ejecutar en el SQL Editor del dashboard de Supabase.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Cualquier usuario puede subir su foto (app usa auth personalizada, no Supabase Auth)
DROP POLICY IF EXISTS "avatars_insert_autenticado" ON storage.objects;
CREATE POLICY "avatars_insert_autenticado"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

-- El propietario puede actualizar/borrar su propia foto
DROP POLICY IF EXISTS "avatars_update_propio" ON storage.objects;
CREATE POLICY "avatars_update_propio"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatars_delete_propio" ON storage.objects;
CREATE POLICY "avatars_delete_propio"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Lectura pública para que todos puedan ver las fotos
DROP POLICY IF EXISTS "avatars_lectura_publica" ON storage.objects;
CREATE POLICY "avatars_lectura_publica"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- ============================================================================
-- ============================================================================
-- VERIFICACIÓN OPCIONAL (descomenta para comprobar que todo quedó aplicado):
-- ============================================================================
-- SELECT 'sugerencias' AS tabla, count(*) FROM sugerencias
-- UNION ALL SELECT 'configuracion', count(*) FROM configuracion
-- UNION ALL SELECT 'mazos_memorizacion', count(*) FROM mazos_memorizacion
-- UNION ALL SELECT 'backups', count(*) FROM backups
-- UNION ALL SELECT 'progreso_tarjetas_memorizacion', count(*) FROM progreso_tarjetas_memorizacion
-- UNION ALL SELECT 'notas_personales', count(*) FROM notas_personales
-- UNION ALL SELECT 'desafios', count(*) FROM desafios
-- UNION ALL SELECT 'notificaciones', count(*) FROM notificaciones;



