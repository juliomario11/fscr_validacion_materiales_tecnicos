/**
 * Excepciones de negocio del módulo de Validación de Materiales Técnicos.
 * Los use-cases y repositorios de Supabase las lanzan en vez de
 * `HttpException` de Nest -- mantiene la capa de aplicación/dominio
 * desacoplada de HTTP. `DomainExceptionsFilter` (common/filters) es el
 * ÚNICO punto que las traduce a códigos HTTP.
 */

export class CredencialInvalidaException extends Error {
  public constructor(message = 'Cédula no encontrada o sin acceso a la encuesta.') {
    super(message);
    this.name = 'CredencialInvalidaException';
  }
}

export class MaterialNoEncontradoException extends Error {
  public constructor(message = 'El material solicitado no existe o no está activo.') {
    super(message);
    this.name = 'MaterialNoEncontradoException';
  }
}

export class RespuestaNoEncontradaException extends Error {
  public constructor(message = 'No existe una respuesta registrada para ese material.') {
    super(message);
    this.name = 'RespuestaNoEncontradaException';
  }
}

/**
 * Se lanza al intentar modificar, borrar o adjuntar evidencia sobre una
 * respuesta ya confirmada. Comportamiento DEFINITIVO en este primer
 * scaffold — ver el `// TODO` en `UpsertRespuestaUseCase` sobre reabrir una
 * encuesta confirmada.
 */
export class RespuestaConfirmadaException extends Error {
  public constructor(message = 'Esta respuesta ya fue confirmada y no se puede modificar.') {
    super(message);
    this.name = 'RespuestaConfirmadaException';
  }
}

export class SinRespuestasParaConfirmarException extends Error {
  public constructor(message = 'No hay materiales seleccionados para confirmar.') {
    super(message);
    this.name = 'SinRespuestasParaConfirmarException';
  }
}
