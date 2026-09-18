-- Backfill: "cantidad_precargada" quedó en 0 (o null) para filas
-- precargadas materializadas ANTES de corregir MaterializarPrecargaUseCase
-- -- el cron externo no siempre trae esa columna poblada en el archivo de
-- origen. Que la fila exista significa que el empleado tiene AL MENOS 1
-- unidad de ese ítem, nunca 0, así que se sube al mínimo de 1 (nunca se
-- "inventa" una cantidad mayor, solo se corrige el caso claramente erróneo).
--
-- Esquema: validacion_materiales_tecnicos (proyecto Supabase COMPARTIDO --
-- no toca ningún otro esquema).
--
-- Pendiente de aplicar: correr en el SQL Editor de Supabase.

update validacion_materiales_tecnicos.inventario_respuestas
set cantidad_precargada = 1
where origen = 'precargado'
  and (cantidad_precargada is null or cantidad_precargada <= 0);
