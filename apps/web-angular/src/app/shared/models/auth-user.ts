/** Empleado autenticado, devuelto por `POST /auth/login`. */
export interface AuthUser {
  readonly cedula: string;
  readonly nombre: string;
}
