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