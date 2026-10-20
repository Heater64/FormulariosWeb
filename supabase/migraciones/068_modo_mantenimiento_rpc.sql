-- 068: Lectura del modo mantenimiento para todos los usuarios.
-- configuracion solo es legible por el owner (041), así que el cliente no
-- puede leer 'modo_mantenimiento' al iniciar sesión. Esta RPC devuelve solo
-- un booleano y no expone el resto de la configuración.

CREATE OR REPLACE FUNCTION public.modo_mantenimiento_activo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT valor = '1' FROM public.configuracion WHERE clave = 'modo_mantenimiento'),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.modo_mantenimiento_activo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.modo_mantenimiento_activo() TO anon, authenticated;
