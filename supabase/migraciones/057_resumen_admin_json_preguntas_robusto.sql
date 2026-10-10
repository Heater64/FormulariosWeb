-- ============================================================================
-- MIGRACION 057: evitar que un examen legacy rompa el resumen del panel
-- ============================================================================
-- La RPC fb_resumen_admin de la migracion 056 llamaba jsonb_array_length a
-- preguntas sin comprobar su tipo. Si una fila antigua contiene un escalar u
-- objeto JSON, Postgres aborta toda la consulta con SQLSTATE 22023:
-- "cannot get array length of a scalar". El panel queda inutilizable aunque el
-- resto de los examenes sea valido.
--
-- Esta migracion conserva las filas y sus datos; solo cuenta preguntas cuando
-- el valor es realmente un array. Los registros anormales se muestran con 0
-- preguntas en el resumen para que no bloqueen el panel.
-- Es idempotente: reemplaza la misma RPC y conserva los permisos de la 056.
--
-- COMO APLICAR: ejecutar despues de 056 en el SQL Editor de Supabase.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fb_resumen_admin()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_examenes JSONB;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT coalesce(jsonb_agg(x ORDER BY x->>'creado_en' DESC), '[]'::jsonb) INTO v_examenes
  FROM (
    SELECT jsonb_build_object(
      'id', e.id,
      'titulo', e.titulo,
      'descripcion', coalesce(e.descripcion, ''),
      'estado', CASE WHEN e.estado NOT IN ('borrador','publicado','cerrado') THEN 'borrador' ELSE e.estado END,
      'publicado', coalesce(e.publicado, FALSE),
      'creado_en', e.creado_en,
      'actualizado_en', e.actualizado_en,
      'num_preguntas', CASE
        WHEN jsonb_typeof(e.preguntas) = 'array' THEN jsonb_array_length(e.preguntas)
        ELSE 0
      END,
      'puntos_totales', coalesce(e.puntos_totales, 0),
      'num_enlaces', (SELECT count(*) FROM public.examen_enlaces l WHERE l.examen_id = e.id),
      'enlaces_usados', (SELECT count(*) FROM public.examen_enlaces l WHERE l.examen_id = e.id AND l.usado),
      'num_entregas', (SELECT count(*) FROM public.intentos_examen_personalizado i
                       WHERE i.examen_id = e.id AND i.estado IN ('completado', 'calificado')),
      'por_corregir', (SELECT count(*) FROM public.intentos_examen_personalizado i
                       WHERE i.examen_id = e.id AND i.estado = 'completado'),
      'nota_media', (SELECT round(avg(i.nota), 2) FROM public.intentos_examen_personalizado i
                     WHERE i.examen_id = e.id AND i.corregido AND i.nota IS NOT NULL)
    ) AS x
    FROM public.examenes_personalizados e
    WHERE public.es_owner() OR public.es_editor_del_grupo(e.grupo_id)
  ) sub;
  RETURN jsonb_build_object('examenes', v_examenes);
END;
$$;

-- CREATE OR REPLACE conserva ACL al reemplazar una funcion existente; repetimos
-- el GRANT para dejar explicita la interfaz requerida tras la actualizacion.
REVOKE ALL ON FUNCTION public.fb_resumen_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fb_resumen_admin() TO authenticated;

SELECT '057 aplicada: fb_resumen_admin tolera preguntas JSONB que no sean arrays' AS mensaje;
