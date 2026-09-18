-- Migración: precarga de inventario por cédula + calendario de acceso.
-- Esquema: validacion_materiales_tecnicos (proyecto Supabase COMPARTIDO --
-- no toca ningún otro esquema).
--
-- Pendiente de aplicar: el MCP de Supabase no está autenticado en el
-- entorno de desarrollo. Corre este archivo completo en el SQL Editor de
-- Supabase (o pide que se aplique en cuanto el MCP se reconecte).
--
-- Después de aplicarlo, confirma en "Database > Replication/Exposed
-- schemas" que el esquema sigue expuesto (ya debería estarlo) -- las
-- tablas NUEVAS dentro de un esquema ya expuesto no requieren un paso
-- adicional en ese dashboard, pero si PostgREST devuelve 404/42501 para
-- las tablas nuevas, revisa los GRANTs de más abajo.

-- 0) Renombra las tablas existentes ("encuesta" -> "inventario", parte del
-- mismo cambio de nomenclatura que en el código). `RENAME TO` en Postgres
-- conserva datos, FKs, índices y RLS tal cual -- solo cambia el nombre.
-- `IF EXISTS` lo hace seguro de re-ejecutar si ya se corrió antes.
alter table if exists validacion_materiales_tecnicos.encuesta_respuestas
  rename to inventario_respuestas;
alter table if exists validacion_materiales_tecnicos.encuesta_adjuntos
  rename to inventario_adjuntos;
alter table if exists validacion_materiales_tecnicos.empleados_encuesta
  rename to empleados_inventario;

-- 1) Calendario cédula -> fecha asignada de toma de inventario.
create table if not exists validacion_materiales_tecnicos.calendario_inventario (
  id bigserial primary key,
  cedula text not null,
  fecha_asignada date not null,
  activo boolean not null default true,
  created_at timestamp not null default (now() at time zone 'utc'),
  unique (cedula, fecha_asignada)
);

create index if not exists calendario_inventario_cedula_idx
  on validacion_materiales_tecnicos.calendario_inventario (cedula);

alter table validacion_materiales_tecnicos.calendario_inventario enable row level security;

-- 2) Staging para el cron externo (Node.js, corre aparte a las 5 AM) --
-- mismas columnas que equipos_asignados_encuesta.xlsx + metadata de
-- procesamiento. El cron externo solo hace INSERT aquí; nuestro backend
-- lee las filas con procesado = false y las convierte en filas de
-- inventario_respuestas (origen = 'precargado') cuando el empleado
-- correspondiente inicia sesión.
create table if not exists validacion_materiales_tecnicos.materiales_precargados_raw (
  id bigserial primary key,
  cedula text not null,
  serial text,
  codigo_material text not null,
  material text,
  descripcion_ampliada text,
  bodega text,
  direccion_bodega text,
  estado text,
  referencia text,
  costo numeric,
  cantidad numeric,
  lote text,
  area text,
  fecha_carga timestamp not null default (now() at time zone 'utc'),
  procesado boolean not null default false,
  procesado_en timestamp
);

create index if not exists materiales_precargados_raw_cedula_procesado_idx
  on validacion_materiales_tecnicos.materiales_precargados_raw (cedula, procesado);

alter table validacion_materiales_tecnicos.materiales_precargados_raw enable row level security;

-- 3) inventario_respuestas: pasa de "una fila por material" a "una fila por
-- material + serial" (un técnico puede tener varias unidades serializadas
-- del mismo material), y se agregan las columnas de precarga.
--
-- El bloque DO busca el nombre real de la restricción UNIQUE existente
-- (no se asume un nombre fijo, ya que no hay acceso a la BD real desde
-- este entorno de desarrollo para confirmarlo) y la elimina antes de
-- crear el nuevo índice único.
do $$
declare
  v_conname text;
begin
  select con.conname into v_conname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'validacion_materiales_tecnicos'
    and rel.relname = 'inventario_respuestas'
    and con.contype = 'u';
  if v_conname is not null then
    execute format('alter table validacion_materiales_tecnicos.inventario_respuestas drop constraint %I', v_conname);
  end if;
end $$;

alter table validacion_materiales_tecnicos.inventario_respuestas
  add column if not exists origen text not null default 'manual',
  add column if not exists estado_precarga text,
  add column if not exists cantidad_precargada numeric,
  add column if not exists serial_precargado_id bigint,
  add column if not exists fuera_de_fecha boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inventario_respuestas_origen_check'
  ) then
    alter table validacion_materiales_tecnicos.inventario_respuestas
      add constraint inventario_respuestas_origen_check check (origen in ('manual', 'precargado'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'inventario_respuestas_estado_precarga_check'
  ) then
    alter table validacion_materiales_tecnicos.inventario_respuestas
      add constraint inventario_respuestas_estado_precarga_check
        check (estado_precarga is null or estado_precarga in ('confirmado', 'ya_no_lo_tiene'));
  end if;
end $$;

-- NULLs no colisionan por sí solos en un índice único normal de Postgres,
-- así que el `coalesce` es necesario para que dos filas SIN serial (ítems
-- a granel) del mismo material sigan bloqueadas como duplicado, igual que
-- antes.
create unique index if not exists inventario_respuestas_empleado_material_serial_key
  on validacion_materiales_tecnicos.inventario_respuestas (empleado_id, material_id, coalesce(serial, ''));

comment on column validacion_materiales_tecnicos.inventario_respuestas.origen is
  'manual (agregado por el técnico/supervisor desde el catálogo) | precargado (vino del cron de las 5 AM)';
comment on column validacion_materiales_tecnicos.inventario_respuestas.estado_precarga is
  'Solo aplica a origen=precargado: confirmado (el técnico dice que sí lo tiene) | ya_no_lo_tiene (ya no cuenta con el ítem)';
comment on column validacion_materiales_tecnicos.inventario_respuestas.cantidad_precargada is
  'Cantidad que trajo el cron para este ítem (auditoría/comparación en /admin) -- nunca se muestra al técnico.';
comment on column validacion_materiales_tecnicos.inventario_respuestas.serial_precargado_id is
  'id de materiales_precargados_raw que originó esta fila (trazabilidad), null si origen=manual.';
comment on column validacion_materiales_tecnicos.inventario_respuestas.fuera_de_fecha is
  'true si esta fila se creó/confirmó un día distinto al asignado en calendario_inventario para esa cédula.';

-- 4) GRANTs -- red de seguridad si ALTER DEFAULT PRIVILEGES de una
-- migración anterior no cubre estas tablas nuevas (ya pasó antes en este
-- proyecto: PGRST106/42501 hasta aplicar estos GRANTs explícitos).
grant usage on schema validacion_materiales_tecnicos to service_role;
grant all on all tables in schema validacion_materiales_tecnicos to service_role;
grant all on all sequences in schema validacion_materiales_tecnicos to service_role;
alter default privileges in schema validacion_materiales_tecnicos grant all on tables to service_role;
alter default privileges in schema validacion_materiales_tecnicos grant all on sequences to service_role;

-- 5) Verificación rápida a correr manualmente después de aplicar esto:
-- comprueba que los codigo_material del archivo real
-- (equipos_asignados_encuesta.xlsx) efectivamente existen en el catálogo.
-- Pégala aparte, no es parte de la migración -- solo diagnóstico:
--
-- select distinct m.codigo_material
-- from validacion_materiales_tecnicos.materiales_precargados_raw m
-- left join validacion_materiales_tecnicos.materiales cat on cat.codigo = m.codigo_material
-- where cat.id is null;
