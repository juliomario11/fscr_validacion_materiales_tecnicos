/**
 * Schema de Postgres (perfil PostgREST) del módulo de Validación de
 * Materiales Técnicos. Configurable con `FSCR_DB_SCHEMA` -- debe estar
 * incluido en los "Exposed schemas" del proyecto Supabase para que
 * PostgREST lo resuelva (si falta, responde 406).
 */
export const SUPABASE_SCHEMA = (process.env.FSCR_DB_SCHEMA ?? '').trim() || 'validacion_materiales_tecnicos';
