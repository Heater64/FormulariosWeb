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