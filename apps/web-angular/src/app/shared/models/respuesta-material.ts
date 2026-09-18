import { AdjuntoRespuesta } from './adjunto-respuesta';
import { Material } from './material';

export type EstadoRespuesta = 'borrador' | 'confirmado';

/** `manual`: lo agregó el técnico/supervisor desde el catálogo. `precargado`: lo generó el cron de las 5 AM. */
export type OrigenRespuesta = 'manual' | 'precargado';

/** Solo aplica cuando `origen = 'precargado'`: decisión del técnico/supervisor sobre ese ítem preasignado. */
export type EstadoPrecarga = 'confirmado' | 'ya_no_lo_tiene';

/**
 * Respuesta de un técnico para un material del catálogo (`/mis-respuestas`).
 * El backend siempre puebla `material`. Puede haber VARIAS filas para el
 * mismo `materialId` (ej. varias unidades serializadas precargadas) -- `id`
 * es lo único que identifica una fila de forma única, nunca `materialId`
 * por sí solo.
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
  readonly origen: OrigenRespuesta;
  /** `null` mientras no se valide (solo aplica a `origen = 'precargado'`). Nunca viene la cantidad precargada -- eso no se le muestra al técnico. */
  readonly estadoPrecarga: EstadoPrecarga | null;
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
