import { EstadoRespuesta } from './respuesta-material';

export interface AdminEmpleadoResumen {
  readonly id: number;
  readonly cedula: string;
  readonly nombreCompleto: string;
}

export interface AdminMaterialResumen {
  readonly codigo: string;
  readonly descripcion: string;
  readonly unidadMedida: string;
  readonly categoria: string;
}

/** Fila de la tabla de respuestas del panel admin (`GET /admin/respuestas`). */
export interface AdminRespuesta {
  readonly empleado: AdminEmpleadoResumen;
  readonly material: AdminMaterialResumen;
  readonly cantidad: number;
  readonly observaciones: string | null;
  readonly estado: EstadoRespuesta;
  readonly fechaInicio: string;
  readonly fechaConfirmacion: string | null;
  readonly cantidadAdjuntos: number;
}
