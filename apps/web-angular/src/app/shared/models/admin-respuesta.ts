import { AdjuntoRespuesta } from './adjunto-respuesta';
import { EstadoPrecarga, EstadoRespuesta, OrigenRespuesta } from './respuesta-material';

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
  readonly id: number;
  readonly empleado: AdminEmpleadoResumen;
  readonly material: AdminMaterialResumen;
  readonly cantidad: number;
  readonly observaciones: string | null;
  readonly serial: string | null;
  /** Solo `origen='precargado'`: serial original del cron, congelado -- para comparar contra `serial` (el vigente/corregido). */
  readonly serialSistema: string | null;
  readonly estado: EstadoRespuesta;
  readonly origen: OrigenRespuesta;
  readonly estadoPrecarga: EstadoPrecarga | null;
  /** Lo que trajo el cron de las 5 AM -- solo visible aquí (admin), nunca en el portal del técnico. */
  readonly cantidadPrecargada: number | null;
  /** `true` si esta fila se registró un día distinto al asignado en el calendario de esa cédula. */
  readonly fueraDeFecha: boolean;
  readonly fechaInicio: string;
  readonly fechaConfirmacion: string | null;
  readonly cantidadAdjuntos: number;
  /** Detalle completo (no solo el conteo), para poder visualizarlos/descargarlos desde el panel. */
  readonly adjuntos: ReadonlyArray<AdjuntoRespuesta>;
}
