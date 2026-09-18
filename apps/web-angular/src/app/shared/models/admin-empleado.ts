export type EstadoEmpleadoAdmin = 'sin_iniciar' | 'en_progreso' | 'confirmado';

/** Fila de la tabla de empleados del panel admin (`GET /admin/empleados`). */
export interface AdminEmpleado {
  readonly id: number;
  readonly cedula: string;
  readonly nombreCompleto: string;
  readonly cargo: string | null;
  readonly departamento: string | null;
  readonly area: string | null;
  readonly proyecto: string | null;
  readonly estado: EstadoEmpleadoAdmin;
  readonly cantidadItems: number;
  readonly fechaConfirmacion: string | null;
}
