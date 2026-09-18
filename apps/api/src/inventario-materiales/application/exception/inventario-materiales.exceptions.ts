/**
 * Excepciones de negocio del módulo de Validación de Materiales Técnicos.
 * Los use-cases y repositorios de Supabase las lanzan en vez de
 * `HttpException` de Nest -- mantiene la capa de aplicación/dominio
 * desacoplada de HTTP. `DomainExceptionsFilter` (common/filters) es el
 * ÚNICO punto que las traduce a códigos HTTP.
 */

export class CredencialInvalidaException extends Error {
  public constructor(message = 'Cédula no encontrada o sin acceso al inventario.') {
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
 * scaffold — ver el `// TODO` en `UpsertRespuestaUseCase` sobre reabrir un
 * inventario confirmado.
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

/** Se lanza al intentar confirmar todo el inventario mientras queden ítems precargados sin validar ("sí lo tengo" / "ya no lo tengo"). */
export class PrecargaSinValidarException extends Error {
  public constructor(
    message = 'Debes validar todos los ítems precargados (sí los tienes o ya no) antes de confirmar.',
  ) {
    super(message);
    this.name = 'PrecargaSinValidarException';
  }
}

/** Se lanza al confirmar un ítem precargado ("sí lo tengo") sin indicar cuántas unidades cuenta. */
export class CantidadPrecargaInvalidaException extends Error {
  public constructor(
    message = 'Debes indicar la cantidad que tienes (mínimo 1) para confirmar este ítem.',
  ) {
    super(message);
    this.name = 'CantidadPrecargaInvalidaException';
  }
}

/** Se lanza al marcar un ítem precargado como "ya no lo tengo" sin explicar por qué (observaciones obligatorias en ese caso). */
export class ObservacionesPrecargaRequeridasException extends Error {
  public constructor(
    message = 'Debes indicar una observación explicando por qué ya no cuentas con este ítem.',
  ) {
    super(message);
    this.name = 'ObservacionesPrecargaRequeridasException';
  }
}

/** Nombre de archivo inseguro, extensión no permitida, o contenido que no coincide con la extensión declarada (magic bytes vía `file-type`). */
export class AdjuntoInvalidoException extends Error {
  public constructor(message = 'El archivo adjunto no es válido.') {
    super(message);
    this.name = 'AdjuntoInvalidoException';
  }
}

/** El adjunto no existe, o existe pero pertenece a la respuesta de OTRO empleado -- mismo mensaje/código en ambos casos para no revelar cuál es. */
export class AdjuntoNoEncontradoException extends Error {
  public constructor(message = 'El adjunto solicitado no existe.') {
    super(message);
    this.name = 'AdjuntoNoEncontradoException';
  }
}

/** Ya hay 5 adjuntos (MAX_ADJUNTOS_POR_RESPUESTA) para esa respuesta. */
export class LimiteAdjuntosExcedidoException extends Error {
  public constructor(message = 'Ya alcanzaste el máximo de adjuntos permitidos para este material.') {
    super(message);
    this.name = 'LimiteAdjuntosExcedidoException';
  }
}

/** Usuario/password del panel de administración incorrectos. */
export class CredencialAdminInvalidaException extends Error {
  public constructor(message = 'Usuario o contraseña de administrador incorrectos.') {
    super(message);
    this.name = 'CredencialAdminInvalidaException';
  }
}
