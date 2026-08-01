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