import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  AdjuntoInvalidoException,
  AdjuntoNoEncontradoException,
  CantidadPrecargaInvalidaException,
  CredencialAdminInvalidaException,
  CredencialInvalidaException,
  LimiteAdjuntosExcedidoException,
  MaterialNoEncontradoException,
  ObservacionesPrecargaRequeridasException,
  PrecargaSinValidarException,
  RespuestaConfirmadaException,
  RespuestaNoEncontradaException,
  SinRespuestasParaConfirmarException,
} from '../../inventario-materiales/application/exception/inventario-materiales.exceptions';
import {
  SupabaseConfigError,
  SupabaseRequestError,
} from '../../inventario-materiales/infrastructure/supabase/supabase.errors';

export interface UniformErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

interface NormalizedError {
  statusCode: number;
  message: string | string[];
  error: string;
}

/**
 * Filtro global (`APP_FILTER` en `AppModule`) — único punto que traduce
 * excepciones de dominio/infraestructura a códigos HTTP. Los use-cases y
 * repositorios lanzan las excepciones de
 * `inventario-materiales/application/exception` (nunca `HttpException` de
 * Nest directamente) para no acoplar la capa de aplicación a HTTP.
 */
@Catch()
export class DomainExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionsFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalized = this.normalize(exception);

    if (normalized.statusCode >= 500) {
      const detail =
        exception instanceof Error ? exception.stack ?? `${exception.name}: ${exception.message}` : String(exception);
      this.logger.error(
        `${request.method} ${request.originalUrl ?? request.url} -> ${normalized.statusCode}: ${detail}`,
      );
    }

    const body: UniformErrorBody = {
      statusCode: normalized.statusCode,
      message: normalized.message,
      error: normalized.error,
      path: request.originalUrl ?? request.url ?? '',
      timestamp: new Date().toISOString(),
    };
    response.status(normalized.statusCode).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (
      exception instanceof CredencialInvalidaException ||
      exception instanceof CredencialAdminInvalidaException
    ) {
      return { statusCode: HttpStatus.UNAUTHORIZED, message: exception.message, error: 'Unauthorized' };
    }

    if (
      exception instanceof MaterialNoEncontradoException ||
      exception instanceof RespuestaNoEncontradaException ||
      exception instanceof AdjuntoNoEncontradoException
    ) {
      return { statusCode: HttpStatus.NOT_FOUND, message: exception.message, error: 'Not Found' };
    }

    if (exception instanceof RespuestaConfirmadaException) {
      return { statusCode: HttpStatus.CONFLICT, message: exception.message, error: 'Conflict' };
    }

    if (
      exception instanceof SinRespuestasParaConfirmarException ||
      exception instanceof PrecargaSinValidarException
    ) {
      return { statusCode: HttpStatus.BAD_REQUEST, message: exception.message, error: 'Bad Request' };
    }

    if (
      exception instanceof AdjuntoInvalidoException ||
      exception instanceof LimiteAdjuntosExcedidoException ||
      exception instanceof CantidadPrecargaInvalidaException ||
      exception instanceof ObservacionesPrecargaRequeridasException
    ) {
      return { statusCode: HttpStatus.BAD_REQUEST, message: exception.message, error: 'Bad Request' };
    }

    if (exception instanceof SupabaseConfigError) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Configuración de Supabase incompleta en el servidor. Revisar variables de entorno.',
        error: 'Service Unavailable',
      };
    }

    if (exception instanceof SupabaseRequestError) {
      // PG 23503 = violación de FK (p. ej. borrar algo referenciado en otra tabla).
      if (exception.code === '23503') {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'No se puede completar la operación: existen referencias en otras tablas.',
          error: 'Conflict',
        };
      }
      return {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: 'El backend de datos (Supabase) respondió con error. Revisar credenciales y permisos.',
        error: 'Bad Gateway',
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      if (typeof raw === 'string') {
        return { statusCode: status, message: raw, error: exception.name };
      }
      const obj = raw as { message?: string | string[]; error?: string };
      return {
        statusCode: status,
        message: obj.message ?? exception.message,
        error: obj.error ?? exception.name,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor.',
      error: 'Internal Server Error',
    };
  }
}
