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