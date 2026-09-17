/** Whitelist cerrada de técnicos habilitados para responder la encuesta (`empleados_encuesta`, 113 filas). */
export interface EmpleadoEncuesta {
  id: number;
  cedula: string;
  nombreCompleto: string;
  activo: boolean;
  createdAt: string;
}
