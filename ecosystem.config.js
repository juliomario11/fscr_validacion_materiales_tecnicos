// =============================================================================
// pm2 ecosystem — fscr_validacion_materiales_tecnicos (servidor Ubuntu propio)
// -----------------------------------------------------------------------------
//   Uso:  pm2 startOrRestart ecosystem.config.js
//
//   Mismo patrón que fscr_proveedores_factura/ecosystem.config.js en el mismo
//   servidor (factproveedores, vía Tailscale) -- ese proceso usa el puerto
//   9100; este usa el 8082 (definido en apps/api/.env, no aquí).
//
//   - A diferencia del hermano, apps/api es un paquete npm independiente con
//     su propio dist/ -- por eso cwd apunta a apps/api y script es relativo
//     a esa carpeta (dist/main.js), no dist/api/main.js desde la raíz.
//   - Carga las variables de `apps/api/.env` vía `env_file`. IMPORTANTE: sin
//     ese archivo (o sin export en el shell) el proceso arranca sin
//     SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/SESSION_SECRET reales.
//
//   Requiere pm2 >= 5.3 (soporte de `env_file`).
// =============================================================================
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'fscr-validacion-materiales-api',
      script: 'dist/main.js',
      cwd: path.join(__dirname, 'apps/api'),
      env_file: path.join(__dirname, 'apps/api/.env'),
      max_memory_restart: '400M',
    },
  ],
};
