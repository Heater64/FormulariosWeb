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
