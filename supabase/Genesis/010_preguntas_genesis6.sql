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