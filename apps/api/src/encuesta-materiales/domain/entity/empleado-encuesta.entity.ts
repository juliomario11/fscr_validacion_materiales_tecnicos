/** Whitelist cerrada de técnicos habilitados para responder la encuesta (`empleados_encuesta`, 113 filas). */
export interface EmpleadoEncuesta {
  id: number;
  cedula: string;
  nombreCompleto: string;
  activo: boolean;
  createdAt: string;
  /** Enriquecido desde un cruce de RRHH -- puede venir null en cualquiera de estos campos. */
  nombres: string | null;
  apellidos: string | null;
  cargo: string | null;
  departamento: string | null;
  area: string | null;
  proyecto: string | null;
  celular: string | null;
  email: string | null;
}
