import { AppEnvironment } from './app-environment';

// Producción: el mismo backend Node sirve el build de Angular como estáticos,
// por lo que la ruta es relativa (mismo origen -> sin problemas de CORS/cookies).
export const environment: AppEnvironment = {
  production: true,
  apiBaseUrl: '/api/v1/validacion-materiales',
};
