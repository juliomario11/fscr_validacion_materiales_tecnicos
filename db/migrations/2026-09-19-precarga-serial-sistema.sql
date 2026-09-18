-- Migración: conserva el serial original del cron aunque el técnico lo
-- corrija al confirmar un ítem precargado.
-- Esquema: validacion_materiales_tecnicos (proyecto Supabase COMPARTIDO --
-- no toca ningún otro esquema).
--
-- Pendiente de aplicar: correr en el SQL Editor de Supabase.

alter table validacion_materiales_tecnicos.inventario_respuestas
  add column if not exists serial_sistema text;

comment on column validacion_materiales_tecnicos.inventario_respuestas.serial_sistema is
  'Serial tal cual lo trajo el cron al materializar (origen=precargado) -- se congela en el insert y nunca se vuelve a tocar. La columna "serial" sigue siendo la vigente/actual, que el técnico puede corregir al confirmar.';

-- Backfill: para las filas precargadas que ya existan sin serial_sistema
-- (materializadas antes de esta migración), se asume que su "serial"
-- actual es igual al original (todavía no hubo corrección posible).
update validacion_materiales_tecnicos.inventario_respuestas
set serial_sistema = serial
where origen = 'precargado' and serial_sistema is null;
