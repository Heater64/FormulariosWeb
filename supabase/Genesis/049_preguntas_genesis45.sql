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