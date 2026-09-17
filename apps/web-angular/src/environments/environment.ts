import { AppEnvironment } from './app-environment';

// Desarrollo local: el backend NestJS corre aparte (ver apps/api), por lo que
// aquí se usa una URL absoluta. El backend debe habilitar CORS con
// `credentials: true` y el origin exacto de `ng serve` (no `*`), ya que la
// sesión viaja en una cookie httpOnly (ver shared/interceptors/auth.interceptor.ts).
export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: 'http://localhost:9100/api/v1/validacion-materiales',
};
