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