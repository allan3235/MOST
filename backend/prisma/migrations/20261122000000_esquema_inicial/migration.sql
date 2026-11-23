-- most.: esquema inicial.
-- Consolida las 16 migraciones de Supabase de Habit Green (legado/supabase/migrations) en una
-- sola, para PostgreSQL sin Supabase. Lo que Supabase daba hecho se crea aquí:
--   - Roles anon, authenticated y service_role. El backend toma el rol authenticated en cada
--     petición para que las políticas RLS decidan qué filas puede leer o escribir cada usuario.
--   - Esquema auth con la tabla de usuarios (auth.usuarios) y auth.uid(), que devuelve el usuario
--     de la petición (el backend lo fija con set_config('app.usuario_id', ...)).

set check_function_bodies = false;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;

create schema if not exists auth;

create table auth.usuarios (
  id uuid primary key default gen_random_uuid(),
  correo text not null unique,
  hash_contrasena text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usuarios_correo_minusculas check (correo = lower(correo))
);

create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('app.usuario_id', true), '')::uuid
$$;

grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

-- ---------------------------------------------------------------------------
-- Esquema public (pg_dump del resultado de las migraciones de Supabase)
-- ---------------------------------------------------------------------------
--
--

--
--

--
--

--
-- Name: archivar_habito(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.archivar_habito(p_habit_id uuid, p_fecha date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_config jsonb := public.config_recompensas();
  v_log_id uuid;
  v_devuelto integer := 0;
  v_archivado boolean;
begin
  if v_user_id is null then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;

  -- La fecha no se valida: un borrado hecho sin conexión hace días no debe perderse. Solo sirve para
  -- buscar el registro de ese día, y devolver monedas nunca beneficia al usuario.
  perform 1 from public.wallets where user_id = v_user_id for update;

  update public.habits
  set archivado_en = now()
  where id = p_habit_id and user_id = v_user_id and archivado_en is null;
  v_archivado := found;

  if not v_archivado then
    if not exists (select 1 from public.habits h where h.id = p_habit_id and h.user_id = v_user_id) then
      raise exception 'habito_no_encontrado' using errcode = 'P0002';
    end if;
    -- Ya estaba archivado (operación reenviada): no se devuelve otra vez.
    return jsonb_build_object('archivado', false, 'devuelto', 0);
  end if;

  select l.id into v_log_id
  from public.habit_logs l
  where l.habit_id = p_habit_id and l.fecha = p_fecha and l.user_id = v_user_id
    and l.eliminado_en is null and l.monedas_otorgadas
  for update;

  if v_log_id is not null then
    v_devuelto := public.devolver_monedas(
      v_user_id, (v_config ->> 'monedas_por_habito')::int, v_log_id
    );
    update public.habit_logs
    set monedas_otorgadas = false, monedas_sin_devolver = true
    where id = v_log_id;
  end if;

  return jsonb_build_object('archivado', true, 'devuelto', v_devuelto);
end;
$$;

--
-- Name: complete_habit(uuid, uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_habit(p_log_id uuid, p_habit_id uuid, p_fecha date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_config jsonb := public.config_recompensas();
  v_category_id uuid;
  v_activo boolean;
  v_log_id uuid;
  v_sin_devolver boolean;
  v_nivel integer;
  v_fases smallint[];
  v_fase_anterior smallint;
  v_fase smallint;
  v_con_recompensa boolean;
  v_xp boolean := false;
  v_monedas boolean := false;
begin
  if v_user_id is null then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;

  select h.category_id, h.activo into v_category_id, v_activo
  from public.habits h
  where h.id = p_habit_id and h.user_id = v_user_id and h.archivado_en is null;
  if v_category_id is null or not v_activo then
    raise exception 'habito_no_encontrado' using errcode = 'P0002';
  end if;

  perform public.validar_fecha_check_in(v_user_id, p_fecha);

  -- Debe tocar ese día: por su horario vigente o por una ocurrencia movida a esa fecha.
  if not (
    exists (
      select 1 from public.habit_schedules s
      where s.habit_id = p_habit_id
        and s.vigente_desde <= p_fecha
        and (s.vigente_hasta is null or s.vigente_hasta >= p_fecha)
        and extract(isodow from p_fecha)::smallint = any (s.dias_semana)
    )
    or exists (
      select 1 from public.habit_occurrences o
      where o.habit_id = p_habit_id and o.estado = 'movida' and o.fecha_nueva = p_fecha
    )
  ) then
    raise exception 'no_programado' using errcode = 'P0001';
  end if;

  perform 1 from public.wallets where user_id = v_user_id for update;

  select nivel, fase into v_nivel, v_fase_anterior
  from public.plant_progress
  where user_id = v_user_id and category_id = v_category_id;
  v_nivel := coalesce(v_nivel, 0);
  v_fase_anterior := coalesce(v_fase_anterior, 1);
  v_fase := v_fase_anterior;

  insert into public.habit_logs (id, habit_id, user_id, category_id, fecha)
  values (p_log_id, p_habit_id, v_user_id, v_category_id, p_fecha)
  on conflict (habit_id, fecha) do update
    set eliminado_en = null,
        completado_en = now(),
        xp_otorgado = false,
        monedas_otorgadas = false
    where public.habit_logs.eliminado_en is not null
  returning id, monedas_sin_devolver into v_log_id, v_sin_devolver;

  -- Ya estaba completado (la cola reenvió la operación): no se otorga nada otra vez.
  if v_log_id is null then
    select l.xp_otorgado, l.monedas_otorgadas into v_xp, v_monedas
    from public.habit_logs l
    where l.habit_id = p_habit_id and l.fecha = p_fecha;
    return jsonb_build_object(
      'nuevo', false, 'xp', v_xp, 'monedas', v_monedas,
      'fase_anterior', v_fase_anterior, 'fase', v_fase
    );
  end if;

  -- Una fecha anterior a otro registro ya recibido se guarda, pero sin recompensas.
  v_con_recompensa := not exists (
    select 1 from public.habit_logs l
    where l.user_id = v_user_id and l.fecha > p_fecha
  );

  -- XP: tope de hábitos por planta al día y nivel máximo.
  if v_con_recompensa and v_nivel < (v_config ->> 'nivel_maximo')::int and (
    select count(*) from public.habit_logs l
    where l.user_id = v_user_id and l.category_id = v_category_id and l.fecha = p_fecha
      and l.eliminado_en is null and l.xp_otorgado
  ) < (v_config ->> 'tope_habitos_con_xp_por_planta_dia')::int then
    v_fases := public.sumar_xp_planta(
      v_user_id, v_category_id, (v_config ->> 'xp_por_habito')::int, v_config
    );
    v_fase_anterior := v_fases[1];
    v_fase := v_fases[2];
    v_xp := true;
  end if;

  -- Monedas: pago único por hábito y día, y tope de hábitos al día.
  if v_con_recompensa and not v_sin_devolver
    and public.pagos_de_monedas_del_dia(v_user_id, p_fecha)
      < (v_config ->> 'tope_habitos_con_monedas_dia')::int then
    perform public.sumar_monedas(
      v_user_id, (v_config ->> 'monedas_por_habito')::int, 'habito', v_log_id
    );
    v_monedas := true;
  end if;

  update public.habit_logs
  set xp_otorgado = v_xp, monedas_otorgadas = v_monedas
  where id = v_log_id;

  return jsonb_build_object(
    'nuevo', true, 'xp', v_xp, 'monedas', v_monedas,
    'fase_anterior', v_fase_anterior, 'fase', v_fase
  );
end;
$$;

--
-- Name: comprar_accesorio(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.comprar_accesorio(p_accessory_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_precio integer;
  v_saldo integer;
begin
  if v_user_id is null then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;

  select a.precio into v_precio from public.accessories a where a.id = p_accessory_id;
  if v_precio is null then
    raise exception 'accesorio_no_encontrado' using errcode = 'P0002';
  end if;

  select saldo into v_saldo from public.wallets where user_id = v_user_id for update;

  if exists (
    select 1 from public.user_accessories ua
    where ua.user_id = v_user_id and ua.accessory_id = p_accessory_id and ua.eliminado_en is null
  ) then
    return jsonb_build_object('comprado', false, 'saldo', v_saldo);
  end if;

  if coalesce(v_saldo, 0) < v_precio then
    raise exception 'saldo_insuficiente' using errcode = 'P0001';
  end if;

  insert into public.user_accessories (user_id, accessory_id)
  values (v_user_id, p_accessory_id)
  on conflict (user_id, accessory_id) do update
    set eliminado_en = null, categorias_equipadas = '{}';

  perform public.sumar_monedas(v_user_id, -v_precio, 'compra', p_accessory_id);

  return jsonb_build_object('comprado', true, 'saldo', v_saldo - v_precio);
end;
$$;

--
-- Name: config_recompensas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.config_recompensas() RETURNS jsonb
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select valor from public.app_config where clave = 'recompensas'
$$;

--
-- Name: devolver_monedas(uuid, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.devolver_monedas(p_user_id uuid, p_monto integer, p_ref_id uuid) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_saldo integer;
  v_devuelto integer;
begin
  select saldo into v_saldo from public.wallets where user_id = p_user_id;
  v_devuelto := least(coalesce(v_saldo, 0), p_monto);
  perform public.sumar_monedas(p_user_id, -v_devuelto, 'deshacer', p_ref_id);
  return v_devuelto;
end;
$$;

--
-- Name: ensure_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_profile() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  insert into public.profiles (id) values (v_user_id) on conflict (id) do nothing;
  insert into public.wallets (user_id) values (v_user_id) on conflict (user_id) do nothing;
  insert into public.plant_progress (user_id, category_id)
  select v_user_id, c.id from public.categories c where c.es_sistema
  on conflict (user_id, category_id) do nothing;
end;
$$;

--
-- Name: fase_de_nivel(integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fase_de_nivel(p_nivel integer, p_config jsonb) RETURNS smallint
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select (case
    when p_nivel >= (p_config ->> 'nivel_inicio_fase_3')::int then 3
    when p_nivel >= (p_config ->> 'nivel_inicio_fase_2')::int then 2
    else 1
  end)::smallint
$$;

--
-- Name: habits_categoria_fija(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.habits_categoria_fija() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if new.category_id is distinct from old.category_id then
    raise exception 'La categoría de un hábito no se puede cambiar';
  end if;
  return new;
end;
$$;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.wallets (user_id) values (new.id);
  insert into public.plant_progress (user_id, category_id)
  select new.id, c.id from public.categories c where c.es_sistema;
  return new;
end;
$$;

--
-- Name: pagos_de_monedas_del_dia(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pagos_de_monedas_del_dia(p_user_id uuid, p_fecha date) RETURNS integer
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select count(*)::integer
  from public.habit_logs l
  where l.user_id = p_user_id and l.fecha = p_fecha
    and (l.monedas_sin_devolver or (l.monedas_otorgadas and l.eliminado_en is null))
$$;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

--
-- Name: sumar_monedas(uuid, integer, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sumar_monedas(p_user_id uuid, p_monto integer, p_motivo text, p_ref_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if p_monto = 0 then
    return;
  end if;
  update public.wallets set saldo = saldo + p_monto where user_id = p_user_id;
  insert into public.coin_transactions (user_id, monto, motivo, ref_id)
  values (p_user_id, p_monto, p_motivo, p_ref_id);
end;
$$;

--
-- Name: sumar_xp_planta(uuid, uuid, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sumar_xp_planta(p_user_id uuid, p_category_id uuid, p_delta integer, p_config jsonb) RETURNS smallint[]
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_xp integer;
  v_fase_anterior smallint;
  v_nivel integer;
begin
  select xp, fase into v_xp, v_fase_anterior
  from public.plant_progress
  where user_id = p_user_id and category_id = p_category_id
  for update;

  if not found then
    insert into public.plant_progress (user_id, category_id) values (p_user_id, p_category_id);
    v_xp := 0;
    v_fase_anterior := 1;
  end if;

  v_xp := greatest(0, v_xp + p_delta);
  v_nivel := least((p_config ->> 'nivel_maximo')::int, v_xp / (p_config ->> 'xp_por_nivel')::int);

  update public.plant_progress
  set xp = v_xp, nivel = v_nivel, fase = public.fase_de_nivel(v_nivel, p_config)
  where user_id = p_user_id and category_id = p_category_id;

  return array[v_fase_anterior, public.fase_de_nivel(v_nivel, p_config)];
end;
$$;

--
-- Name: uncomplete_habit(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.uncomplete_habit(p_habit_id uuid, p_fecha date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_config jsonb := public.config_recompensas();
  v_monedas_por integer := (v_config ->> 'monedas_por_habito')::int;
  v_xp_por integer := (v_config ->> 'xp_por_habito')::int;
  v_log record;
  v_otro uuid;
  v_devuelto integer;
  v_fase_anterior smallint;
  v_fase smallint;
begin
  if v_user_id is null then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;

  if not exists (select 1 from public.habits h where h.id = p_habit_id and h.user_id = v_user_id) then
    raise exception 'habito_no_encontrado' using errcode = 'P0002';
  end if;

  perform public.validar_fecha_check_in(v_user_id, p_fecha);
  perform 1 from public.wallets where user_id = v_user_id for update;

  select l.id, l.category_id, l.xp_otorgado, l.monedas_otorgadas into v_log
  from public.habit_logs l
  where l.habit_id = p_habit_id and l.fecha = p_fecha and l.user_id = v_user_id
    and l.eliminado_en is null
  for update;

  -- Ya estaba deshecho (operación reenviada): no hay nada que revertir.
  if not found then
    return jsonb_build_object('cambio', false);
  end if;

  select fase into v_fase_anterior
  from public.plant_progress
  where user_id = v_user_id and category_id = v_log.category_id;

  update public.habit_logs
  set eliminado_en = now(), xp_otorgado = false, monedas_otorgadas = false
  where id = v_log.id;

  if v_log.xp_otorgado then
    perform public.sumar_xp_planta(v_user_id, v_log.category_id, -v_xp_por, v_config);

    select l.id into v_otro
    from public.habit_logs l
    where l.user_id = v_user_id and l.category_id = v_log.category_id and l.fecha = p_fecha
      and l.eliminado_en is null and not l.xp_otorgado
    order by l.completado_en
    limit 1;
    if v_otro is not null then
      perform public.sumar_xp_planta(v_user_id, v_log.category_id, v_xp_por, v_config);
      update public.habit_logs set xp_otorgado = true where id = v_otro;
    end if;
  end if;

  if v_log.monedas_otorgadas then
    v_devuelto := public.devolver_monedas(v_user_id, v_monedas_por, v_log.id);

    if v_devuelto < v_monedas_por then
      -- No se devolvió completo: no vuelve a pagar hoy y el pago sigue contando para el tope.
      update public.habit_logs set monedas_sin_devolver = true where id = v_log.id;
    else
      -- Se devolvió completo: el lugar queda libre para quien se quedó sin monedas por el tope.
      v_otro := null;
      select l.id into v_otro
      from public.habit_logs l
      where l.user_id = v_user_id and l.fecha = p_fecha
        and l.eliminado_en is null and not l.monedas_otorgadas and not l.monedas_sin_devolver
      order by l.completado_en
      limit 1;
      if v_otro is not null then
        perform public.sumar_monedas(v_user_id, v_monedas_por, 'habito', v_otro);
        update public.habit_logs set monedas_otorgadas = true where id = v_otro;
      end if;
    end if;
  end if;

  select fase into v_fase
  from public.plant_progress
  where user_id = v_user_id and category_id = v_log.category_id;

  return jsonb_build_object(
    'cambio', true, 'xp', v_log.xp_otorgado, 'monedas', v_log.monedas_otorgadas,
    'fase_anterior', coalesce(v_fase_anterior, 1), 'fase', coalesce(v_fase, 1)
  );
end;
$$;

--
-- Name: validar_fecha_check_in(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_fecha_check_in(p_user_id uuid, p_fecha date) RETURNS void
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
declare
  v_hoy date;
begin
  select (now() at time zone p.zona_horaria)::date into v_hoy
  from public.profiles p
  where p.id = p_user_id;

  if v_hoy is null or p_fecha > v_hoy or p_fecha < v_hoy - 7 then
    raise exception 'fecha_fuera_de_rango' using errcode = '22008';
  end if;
end;
$$;

--
-- Name: accessories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accessories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo text NOT NULL,
    nombre text NOT NULL,
    precio integer NOT NULL,
    orden smallint NOT NULL,
    imagen text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT accessories_orden_check CHECK (((orden >= 1) AND (orden <= 5))),
    CONSTRAINT accessories_precio_check CHECK ((precio > 0)),
    CONSTRAINT accessories_tipo_check CHECK ((tipo = ANY (ARRAY['sombrero'::text, 'lentes'::text, 'maceta'::text])))
);

--
-- Name: ai_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    funcion text NOT NULL,
    estado text NOT NULL,
    tokens integer,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_requests_funcion_check CHECK ((funcion = ANY (ARRAY['generate-plan'::text, 'adjust-plan'::text])))
);

--
-- Name: app_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_config (
    clave text NOT NULL,
    valor jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clave text NOT NULL,
    nombre text NOT NULL,
    es_sistema boolean DEFAULT false NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT categories_sistema_sin_usuario CHECK ((es_sistema = (user_id IS NULL)))
);

--
-- Name: coin_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coin_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    monto integer NOT NULL,
    motivo text NOT NULL,
    ref_id uuid,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: habit_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.habit_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objetivo text NOT NULL,
    categoria text NOT NULL,
    nivel smallint NOT NULL,
    variante text DEFAULT 'base'::text NOT NULL,
    titulo text NOT NULL,
    descripcion text,
    duracion_min integer NOT NULL,
    duracion_reducida_min integer NOT NULL,
    dias_semana smallint[] NOT NULL,
    momento_fijo text,
    sin_recursos boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT habit_catalog_dias_semana_check CHECK (((dias_semana <@ ARRAY[(1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint, (7)::smallint]) AND (cardinality(dias_semana) > 0))),
    CONSTRAINT habit_catalog_duracion_min_check CHECK ((duracion_min >= 0)),
    CONSTRAINT habit_catalog_duracion_reducida CHECK ((duracion_reducida_min <= duracion_min)),
    CONSTRAINT habit_catalog_duracion_reducida_min_check CHECK ((duracion_reducida_min >= 0)),
    CONSTRAINT habit_catalog_momento_fijo_check CHECK ((momento_fijo = ANY (ARRAY['manana'::text, 'mediodia'::text, 'tarde'::text, 'noche'::text]))),
    CONSTRAINT habit_catalog_nivel_check CHECK (((nivel >= 1) AND (nivel <= 3))),
    CONSTRAINT habit_catalog_variante_check CHECK ((variante = ANY (ARRAY['base'::text, 'sin_recursos'::text])))
);

--
-- Name: habit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.habit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    habit_id uuid NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid NOT NULL,
    fecha date NOT NULL,
    estado text DEFAULT 'hecho'::text NOT NULL,
    completado_en timestamp with time zone DEFAULT now() NOT NULL,
    xp_otorgado boolean DEFAULT false NOT NULL,
    monedas_otorgadas boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    eliminado_en timestamp with time zone,
    monedas_sin_devolver boolean DEFAULT false NOT NULL,
    CONSTRAINT habit_logs_estado_check CHECK ((estado = 'hecho'::text))
);

--
-- Name: habit_occurrences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.habit_occurrences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    habit_id uuid NOT NULL,
    user_id uuid NOT NULL,
    fecha_original date NOT NULL,
    fecha_nueva date,
    estado text NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT habit_occurrences_estado_check CHECK ((estado = ANY (ARRAY['movida'::text, 'descartada'::text]))),
    CONSTRAINT habit_occurrences_movida_con_fecha CHECK (((estado = 'movida'::text) = (fecha_nueva IS NOT NULL)))
);

--
-- Name: habit_places; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.habit_places (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    habit_id uuid NOT NULL,
    user_id uuid NOT NULL,
    nombre text NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    radio_m integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    eliminado_en timestamp with time zone,
    CONSTRAINT habit_places_lat_check CHECK (((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision))),
    CONSTRAINT habit_places_lng_check CHECK (((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision))),
    CONSTRAINT habit_places_radio_m_check CHECK (((radio_m >= 100) AND (radio_m <= 200)))
);

--
-- Name: habit_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.habit_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    habit_id uuid NOT NULL,
    user_id uuid NOT NULL,
    dias_semana smallint[] NOT NULL,
    hora time without time zone,
    flexible boolean DEFAULT false NOT NULL,
    notificar boolean DEFAULT true NOT NULL,
    vigente_desde date NOT NULL,
    vigente_hasta date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT habit_schedules_dias_semana_check CHECK (((dias_semana <@ ARRAY[(1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint, (7)::smallint]) AND (cardinality(dias_semana) > 0))),
    CONSTRAINT habit_schedules_hora_o_flexible CHECK ((flexible OR (hora IS NOT NULL) OR (NOT notificar))),
    CONSTRAINT habit_schedules_vigencia CHECK (((vigente_hasta IS NULL) OR (vigente_hasta >= vigente_desde)))
);

--
-- Name: habits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.habits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid NOT NULL,
    plan_id uuid,
    objetivo text,
    nivel smallint,
    usa_duracion_reducida boolean DEFAULT false NOT NULL,
    titulo text NOT NULL,
    descripcion text,
    duracion_min integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    archivado_en timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    nivel_desde date,
    CONSTRAINT habits_duracion_min_check CHECK ((duracion_min >= 0)),
    CONSTRAINT habits_nivel_check CHECK (((nivel >= 1) AND (nivel <= 3))),
    CONSTRAINT habits_plan_o_manual CHECK (((objetivo IS NULL) = (nivel IS NULL)))
);

--
-- Name: onboarding_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    respuestas jsonb NOT NULL,
    version_formulario integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    origen text NOT NULL,
    json_plan jsonb NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    area text,
    respuestas jsonb,
    ultima_evaluacion date,
    limite_desbloqueado boolean DEFAULT false NOT NULL,
    CONSTRAINT plans_area_check CHECK ((area = ANY (ARRAY['salud_fisica'::text, 'trabajo'::text, 'salud_mental'::text, 'finanzas'::text, 'social'::text]))),
    CONSTRAINT plans_origen_check CHECK ((origen = ANY (ARRAY['ia'::text, 'catalogo'::text])))
);

--
-- Name: plant_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plant_progress (
    user_id uuid NOT NULL,
    category_id uuid NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    nivel smallint DEFAULT 0 NOT NULL,
    fase smallint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT plant_progress_fase_check CHECK (((fase >= 1) AND (fase <= 3))),
    CONSTRAINT plant_progress_nivel_check CHECK (((nivel >= 0) AND (nivel <= 30))),
    CONSTRAINT plant_progress_xp_check CHECK ((xp >= 0))
);

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    nombre text,
    zona_horaria text DEFAULT 'UTC'::text NOT NULL,
    modo text,
    onboarding_completo boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_modo_check CHECK ((modo = ANY (ARRAY['tradicional'::text, 'guiado'::text])))
);

--
-- Name: user_accessories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_accessories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    accessory_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    eliminado_en timestamp with time zone,
    categorias_equipadas uuid[] DEFAULT '{}'::uuid[] NOT NULL
);

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_settings (
    user_id uuid NOT NULL,
    presupuesto_min integer NOT NULL,
    estilo_notificaciones text NOT NULL,
    estrategias text[] DEFAULT '{}'::text[] NOT NULL,
    horas_por_momento jsonb,
    segundo_aviso boolean DEFAULT false NOT NULL,
    ultima_evaluacion date,
    limite_plan_desbloqueado boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    subidas_plan integer DEFAULT 0 NOT NULL,
    CONSTRAINT user_settings_estilo_notificaciones_check CHECK ((estilo_notificaciones = ANY (ARRAY['resumen_nocturno'::text, 'recordatorio_suave'::text, 'recordatorio_y_animo'::text, 'minimo'::text]))),
    CONSTRAINT user_settings_presupuesto_min_check CHECK ((presupuesto_min > 0))
);

--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    user_id uuid NOT NULL,
    saldo integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallets_saldo_check CHECK ((saldo >= 0))
);

--
-- Name: accessories accessories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accessories
    ADD CONSTRAINT accessories_pkey PRIMARY KEY (id);

--
-- Name: accessories accessories_tipo_orden_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accessories
    ADD CONSTRAINT accessories_tipo_orden_key UNIQUE (tipo, orden);

--
-- Name: ai_requests ai_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_requests
    ADD CONSTRAINT ai_requests_pkey PRIMARY KEY (id);

--
-- Name: app_config app_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_config
    ADD CONSTRAINT app_config_pkey PRIMARY KEY (clave);

--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

--
-- Name: coin_transactions coin_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coin_transactions
    ADD CONSTRAINT coin_transactions_pkey PRIMARY KEY (id);

--
-- Name: habit_catalog habit_catalog_objetivo_nivel_variante_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_catalog
    ADD CONSTRAINT habit_catalog_objetivo_nivel_variante_key UNIQUE (objetivo, nivel, variante);

--
-- Name: habit_catalog habit_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_catalog
    ADD CONSTRAINT habit_catalog_pkey PRIMARY KEY (id);

--
-- Name: habit_logs habit_logs_habit_id_fecha_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_logs
    ADD CONSTRAINT habit_logs_habit_id_fecha_key UNIQUE (habit_id, fecha);

--
-- Name: habit_logs habit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_logs
    ADD CONSTRAINT habit_logs_pkey PRIMARY KEY (id);

--
-- Name: habit_occurrences habit_occurrences_habit_id_fecha_original_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_occurrences
    ADD CONSTRAINT habit_occurrences_habit_id_fecha_original_key UNIQUE (habit_id, fecha_original);

--
-- Name: habit_occurrences habit_occurrences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_occurrences
    ADD CONSTRAINT habit_occurrences_pkey PRIMARY KEY (id);

--
-- Name: habit_places habit_places_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_places
    ADD CONSTRAINT habit_places_pkey PRIMARY KEY (id);

--
-- Name: habit_schedules habit_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_schedules
    ADD CONSTRAINT habit_schedules_pkey PRIMARY KEY (id);

--
-- Name: habits habits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habits
    ADD CONSTRAINT habits_pkey PRIMARY KEY (id);

--
-- Name: onboarding_answers onboarding_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_answers
    ADD CONSTRAINT onboarding_answers_pkey PRIMARY KEY (id);

--
-- Name: onboarding_answers onboarding_answers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_answers
    ADD CONSTRAINT onboarding_answers_user_id_key UNIQUE (user_id);

--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);

--
-- Name: plant_progress plant_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plant_progress
    ADD CONSTRAINT plant_progress_pkey PRIMARY KEY (user_id, category_id);

--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

--
-- Name: user_accessories user_accessories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_accessories
    ADD CONSTRAINT user_accessories_pkey PRIMARY KEY (id);

--
-- Name: user_accessories user_accessories_user_id_accessory_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_accessories
    ADD CONSTRAINT user_accessories_user_id_accessory_id_key UNIQUE (user_id, accessory_id);

--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id);

--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (user_id);

--
-- Name: ai_requests_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_requests_user_idx ON public.ai_requests USING btree (user_id, creado_en);

--
-- Name: categories_clave_sistema_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_clave_sistema_idx ON public.categories USING btree (clave) WHERE (user_id IS NULL);

--
-- Name: categories_clave_usuario_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_clave_usuario_idx ON public.categories USING btree (user_id, clave) WHERE (user_id IS NOT NULL);

--
-- Name: coin_transactions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX coin_transactions_user_idx ON public.coin_transactions USING btree (user_id, creado_en);

--
-- Name: habit_logs_user_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX habit_logs_user_fecha_idx ON public.habit_logs USING btree (user_id, fecha);

--
-- Name: habit_logs_user_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX habit_logs_user_updated_idx ON public.habit_logs USING btree (user_id, updated_at);

--
-- Name: habit_occurrences_user_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX habit_occurrences_user_updated_idx ON public.habit_occurrences USING btree (user_id, updated_at);

--
-- Name: habit_places_habit_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX habit_places_habit_idx ON public.habit_places USING btree (habit_id);

--
-- Name: habit_places_user_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX habit_places_user_updated_idx ON public.habit_places USING btree (user_id, updated_at);

--
-- Name: habit_schedules_habit_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX habit_schedules_habit_idx ON public.habit_schedules USING btree (habit_id);

--
-- Name: habit_schedules_user_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX habit_schedules_user_updated_idx ON public.habit_schedules USING btree (user_id, updated_at);

--
-- Name: habits_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX habits_user_idx ON public.habits USING btree (user_id);

--
-- Name: habits_user_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX habits_user_updated_idx ON public.habits USING btree (user_id, updated_at);

--
-- Name: plans_un_plan_por_area; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX plans_un_plan_por_area ON public.plans USING btree (user_id, area) WHERE (activo AND (area IS NOT NULL));

--
-- Name: plans_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plans_user_idx ON public.plans USING btree (user_id);

--
-- Name: user_accessories_user_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_accessories_user_updated_idx ON public.user_accessories USING btree (user_id, updated_at);

--
-- Name: habits habits_categoria_fija; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER habits_categoria_fija BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.habits_categoria_fija();

--
-- Name: accessories set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.accessories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: app_config set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.app_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: categories set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: habit_catalog set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.habit_catalog FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: habit_logs set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.habit_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: habit_occurrences set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.habit_occurrences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: habit_places set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.habit_places FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: habit_schedules set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.habit_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: habits set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: onboarding_answers set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.onboarding_answers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: plans set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: plant_progress set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.plant_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: profiles set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: user_accessories set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_accessories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: user_settings set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: wallets set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: ai_requests ai_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_requests
    ADD CONSTRAINT ai_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: categories categories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.usuarios(id) ON DELETE CASCADE;

--
-- Name: coin_transactions coin_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coin_transactions
    ADD CONSTRAINT coin_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: habit_logs habit_logs_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_logs
    ADD CONSTRAINT habit_logs_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);

--
-- Name: habit_logs habit_logs_habit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_logs
    ADD CONSTRAINT habit_logs_habit_id_fkey FOREIGN KEY (habit_id) REFERENCES public.habits(id) ON DELETE CASCADE;

--
-- Name: habit_logs habit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_logs
    ADD CONSTRAINT habit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: habit_occurrences habit_occurrences_habit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_occurrences
    ADD CONSTRAINT habit_occurrences_habit_id_fkey FOREIGN KEY (habit_id) REFERENCES public.habits(id) ON DELETE CASCADE;

--
-- Name: habit_occurrences habit_occurrences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_occurrences
    ADD CONSTRAINT habit_occurrences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: habit_places habit_places_habit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_places
    ADD CONSTRAINT habit_places_habit_id_fkey FOREIGN KEY (habit_id) REFERENCES public.habits(id) ON DELETE CASCADE;

--
-- Name: habit_places habit_places_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_places
    ADD CONSTRAINT habit_places_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: habit_schedules habit_schedules_habit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_schedules
    ADD CONSTRAINT habit_schedules_habit_id_fkey FOREIGN KEY (habit_id) REFERENCES public.habits(id) ON DELETE CASCADE;

--
-- Name: habit_schedules habit_schedules_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habit_schedules
    ADD CONSTRAINT habit_schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: habits habits_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habits
    ADD CONSTRAINT habits_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);

--
-- Name: habits habits_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habits
    ADD CONSTRAINT habits_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);

--
-- Name: habits habits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habits
    ADD CONSTRAINT habits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: onboarding_answers onboarding_answers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_answers
    ADD CONSTRAINT onboarding_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: plans plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: plant_progress plant_progress_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plant_progress
    ADD CONSTRAINT plant_progress_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);

--
-- Name: plant_progress plant_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plant_progress
    ADD CONSTRAINT plant_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.usuarios(id) ON DELETE CASCADE;

--
-- Name: user_accessories user_accessories_accessory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_accessories
    ADD CONSTRAINT user_accessories_accessory_id_fkey FOREIGN KEY (accessory_id) REFERENCES public.accessories(id);

--
-- Name: user_accessories user_accessories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_accessories
    ADD CONSTRAINT user_accessories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: user_settings Crear mis ajustes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Crear mis ajustes" ON public.user_settings FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: habit_schedules Crear mis horarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Crear mis horarios" ON public.habit_schedules FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.habits h
  WHERE ((h.id = habit_schedules.habit_id) AND (h.user_id = ( SELECT auth.uid() AS uid)))))));

--
-- Name: habits Crear mis hábitos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Crear mis hábitos" ON public.habits FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.categories c
  WHERE ((c.id = habits.category_id) AND ((c.user_id IS NULL) OR (c.user_id = ( SELECT auth.uid() AS uid)))))) AND ((plan_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.plans p
  WHERE ((p.id = habits.plan_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))))));

--
-- Name: habit_places Crear mis lugares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Crear mis lugares" ON public.habit_places FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.habits h
  WHERE ((h.id = habit_places.habit_id) AND (h.user_id = ( SELECT auth.uid() AS uid)))))));

--
-- Name: habit_occurrences Crear mis ocurrencias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Crear mis ocurrencias" ON public.habit_occurrences FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.habits h
  WHERE ((h.id = habit_occurrences.habit_id) AND (h.user_id = ( SELECT auth.uid() AS uid)))))));

--
-- Name: plans Crear mis planes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Crear mis planes" ON public.plans FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: onboarding_answers Crear mis respuestas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Crear mis respuestas" ON public.onboarding_answers FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: profiles Editar mi perfil; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editar mi perfil" ON public.profiles FOR UPDATE TO authenticated USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

--
-- Name: user_settings Editar mis ajustes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editar mis ajustes" ON public.user_settings FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: habit_schedules Editar mis horarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editar mis horarios" ON public.habit_schedules FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: habits Editar mis hábitos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editar mis hábitos" ON public.habits FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: habit_places Editar mis lugares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editar mis lugares" ON public.habit_places FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: habit_occurrences Editar mis ocurrencias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editar mis ocurrencias" ON public.habit_occurrences FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: plans Editar mis planes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editar mis planes" ON public.plans FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: onboarding_answers Editar mis respuestas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Editar mis respuestas" ON public.onboarding_answers FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: user_accessories Equipar mis accesorios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Equipar mis accesorios" ON public.user_accessories FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: accessories Lectura de accesorios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lectura de accesorios" ON public.accessories FOR SELECT TO authenticated USING (true);

--
-- Name: categories Lectura de categorías del sistema y propias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lectura de categorías del sistema y propias" ON public.categories FOR SELECT TO authenticated USING (((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid))));

--
-- Name: app_config Lectura de configuración; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lectura de configuración" ON public.app_config FOR SELECT TO authenticated USING (true);

--
-- Name: habit_catalog Lectura del catálogo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lectura del catálogo" ON public.habit_catalog FOR SELECT TO authenticated USING (true);

--
-- Name: wallets Leer mi monedero; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leer mi monedero" ON public.wallets FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: profiles Leer mi perfil; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leer mi perfil" ON public.profiles FOR SELECT TO authenticated USING ((id = ( SELECT auth.uid() AS uid)));

--
-- Name: ai_requests Leer mi uso de IA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leer mi uso de IA" ON public.ai_requests FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: user_accessories Leer mis accesorios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leer mis accesorios" ON public.user_accessories FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: user_settings Leer mis ajustes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leer mis ajustes" ON public.user_settings FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: habit_schedules Leer mis horarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leer mis horarios" ON public.habit_schedules FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: habits Leer mis hábitos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leer mis hábitos" ON public.habits FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: habit_places Leer mis lugares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leer mis lugares" ON public.habit_places FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: coin_transactions Leer mis movimientos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leer mis movimientos" ON public.coin_transactions FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: habit_occurrences Leer mis ocurrencias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leer mis ocurrencias" ON public.habit_occurrences FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: plans Leer mis planes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leer mis planes" ON public.plans FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: plant_progress Leer mis plantas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leer mis plantas" ON public.plant_progress FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: habit_logs Leer mis registros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leer mis registros" ON public.habit_logs FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: onboarding_answers Leer mis respuestas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leer mis respuestas" ON public.onboarding_answers FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

--
-- Name: accessories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: app_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: coin_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: habit_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.habit_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: habit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: habit_occurrences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.habit_occurrences ENABLE ROW LEVEL SECURITY;

--
-- Name: habit_places; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.habit_places ENABLE ROW LEVEL SECURITY;

--
-- Name: habit_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.habit_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: habits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

--
-- Name: onboarding_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.onboarding_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

--
-- Name: plant_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plant_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_accessories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_accessories ENABLE ROW LEVEL SECURITY;

--
-- Name: user_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: FUNCTION archivar_habito(p_habit_id uuid, p_fecha date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.archivar_habito(p_habit_id uuid, p_fecha date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.archivar_habito(p_habit_id uuid, p_fecha date) TO authenticated;

--
-- Name: FUNCTION complete_habit(p_log_id uuid, p_habit_id uuid, p_fecha date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.complete_habit(p_log_id uuid, p_habit_id uuid, p_fecha date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.complete_habit(p_log_id uuid, p_habit_id uuid, p_fecha date) TO authenticated;

--
-- Name: FUNCTION comprar_accesorio(p_accessory_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.comprar_accesorio(p_accessory_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.comprar_accesorio(p_accessory_id uuid) TO authenticated;

--
-- Name: FUNCTION config_recompensas(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.config_recompensas() FROM PUBLIC;

--
-- Name: FUNCTION devolver_monedas(p_user_id uuid, p_monto integer, p_ref_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.devolver_monedas(p_user_id uuid, p_monto integer, p_ref_id uuid) FROM PUBLIC;

--
-- Name: FUNCTION ensure_profile(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.ensure_profile() FROM PUBLIC;
GRANT ALL ON FUNCTION public.ensure_profile() TO authenticated;

--
-- Name: FUNCTION fase_de_nivel(p_nivel integer, p_config jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fase_de_nivel(p_nivel integer, p_config jsonb) FROM PUBLIC;

--
-- Name: FUNCTION pagos_de_monedas_del_dia(p_user_id uuid, p_fecha date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.pagos_de_monedas_del_dia(p_user_id uuid, p_fecha date) FROM PUBLIC;

--
-- Name: FUNCTION sumar_monedas(p_user_id uuid, p_monto integer, p_motivo text, p_ref_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sumar_monedas(p_user_id uuid, p_monto integer, p_motivo text, p_ref_id uuid) FROM PUBLIC;

--
-- Name: FUNCTION sumar_xp_planta(p_user_id uuid, p_category_id uuid, p_delta integer, p_config jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sumar_xp_planta(p_user_id uuid, p_category_id uuid, p_delta integer, p_config jsonb) FROM PUBLIC;

--
-- Name: FUNCTION uncomplete_habit(p_habit_id uuid, p_fecha date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.uncomplete_habit(p_habit_id uuid, p_fecha date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.uncomplete_habit(p_habit_id uuid, p_fecha date) TO authenticated;

--
-- Name: FUNCTION validar_fecha_check_in(p_user_id uuid, p_fecha date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.validar_fecha_check_in(p_user_id uuid, p_fecha date) FROM PUBLIC;

--
--


-- ---------------------------------------------------------------------------
-- Lo que hacía Supabase por su cuenta
-- ---------------------------------------------------------------------------

-- Al crear un usuario se crean su perfil, su monedero y sus 5 plantas.
create trigger crear_perfil_de_usuario
after insert on auth.usuarios
for each row execute function public.handle_new_user();

create trigger set_updated_at before update on auth.usuarios
for each row execute function public.set_updated_at();

-- Permisos por tabla del rol authenticated (Supabase los daba por defecto). Las políticas RLS
-- siguen decidiendo fila por fila: por ejemplo, habit_logs, wallets y plant_progress solo se leen
-- y cambian a través de las funciones complete_habit, uncomplete_habit, etc.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
