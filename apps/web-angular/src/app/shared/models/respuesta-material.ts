import { AdjuntoRespuesta } from './adjunto-respuesta';
import { Material } from './material';

export type EstadoRespuesta = 'borrador' | 'confirmado';

/**
 * Respuesta de un técnico para un material del catálogo (`/mis-respuestas`).
 * El backend siempre puebla `material`.
 */
export interface RespuestaMaterial {
  readonly id: number;
  readonly materialId: number;
  readonly material: Material;
  readonly cantidad: number;
  readonly observaciones: string | null;
  /** Número de serie del ítem, cuando aplica (ej. computadores) -- `null` si el material no lo requiere. */
  readonly serial: string | null;
  readonly estado: EstadoRespuesta;
  readonly fechaInicio: string;
  readonly fechaConfirmacion: string | null;
  readonly adjuntos?: ReadonlyArray<AdjuntoRespuesta>;
}

export interface GuardarRespuestaPayload {
  readonly cantidad: number;
  readonly observaciones: string | null;
  readonly serial: string | null;
}

/** Respuesta de `POST /mis-respuestas/confirmar`. */
export interface ConfirmarEnvioResponse {
  readonly confirmadas: ReadonlyArray<RespuestaMaterial>;
  readonly total: number;
}
