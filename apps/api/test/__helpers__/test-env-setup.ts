/**
 * Jest `setupFiles` -- corre ANTES de cualquier import del código bajo test.
 * Garantiza secretos mínimos en `process.env` para que:
 *  - `SessionTokenService` pueda firmar/verificar JWTs (`SESSION_SECRET`).
 *  - Los providers que leen `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` en su
 *    constructor (ninguno lo hace hoy, pero sí en cada request) no revienten
 *    por variables completamente ausentes al compilar el módulo de Nest.
 *
 * Ningún test de este scaffold hace requests reales a Supabase: los e2e
 * solo ejercitan rutas públicas o el rechazo del guard ANTES de llegar a un
 * repositorio.
 */
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret-not-for-production';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
process.env.FSCR_DB_SCHEMA = process.env.FSCR_DB_SCHEMA || 'validacion_materiales_tecnicos';
