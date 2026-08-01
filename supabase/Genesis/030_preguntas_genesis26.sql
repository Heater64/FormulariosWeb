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