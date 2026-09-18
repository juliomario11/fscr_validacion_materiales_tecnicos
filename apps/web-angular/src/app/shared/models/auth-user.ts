/**
 * Empleado autenticado, devuelto por `POST /auth/login`.
 *
 * Ojo: el campo del nombre completo es `nombreCompleto` (no `nombre`) --
 * coincide tal cual con `LoginResponseDto` del backend (ver
 * apps/api/.../application/dto/login.dto.ts). Todos los campos nuevos
 * pueden venir `null` (ej. un empleado sin cargo/departamento asignado en el
 * maestro de RRHH).
 */
export interface AuthUser {
  readonly empleadoId: number;
  readonly cedula: string;
  readonly nombreCompleto: string;
  readonly nombres: string | null;
  readonly apellidos: string | null;
  readonly cargo: string | null;
  readonly departamento: string | null;
  readonly area: string | null;
  readonly proyecto: string | null;
  readonly celular: string | null;
  readonly email: string | null;
}
