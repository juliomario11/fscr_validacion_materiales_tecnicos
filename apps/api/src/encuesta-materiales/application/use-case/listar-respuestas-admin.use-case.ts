import { Inject, Injectable } from '@nestjs/common';

import {
  EMPLEADOS_ENCUESTA_REPOSITORY,
  type EmpleadosEncuestaRepository,
} from '../../domain/repository/empleados-encuesta.repository';
import {
  RESPUESTAS_ENCUESTA_REPOSITORY,
  type RespuestasEncuestaRepository,
} from '../../domain/repository/respuestas-encuesta.repository';
import { RespuestaAdminResponseDto } from '../dto/admin.dto';

/** Detalle completo de TODAS las respuestas de TODOS los empleados -- para el panel de administración. */
@Injectable()
export class ListarRespuestasAdminUseCase {
  public constructor(
    @Inject(RESPUESTAS_ENCUESTA_REPOSITORY)
    private readonly respuestasRepository: RespuestasEncuestaRepository,
    @Inject(EMPLEADOS_ENCUESTA_REPOSITORY)
    private readonly empleadosRepository: EmpleadosEncuestaRepository,
  ) {}

  public async execute(): Promise<RespuestaAdminResponseDto[]> {
    const [respuestas, empleados] = await Promise.all([
      this.respuestasRepository.findAllConDetalle(),
      this.empleadosRepository.findAllActivos(),
    ]);
    const empleadoPorId = new Map(empleados.map((e) => [e.id, e]));

    return respuestas.map((respuesta) => {
      const empleado = empleadoPorId.get(respuesta.empleadoId);
      return {
        empleado: {
          id: respuesta.empleadoId,
          cedula: empleado?.cedula ?? '',
          nombreCompleto: empleado?.nombreCompleto ?? '(empleado no disponible)',
        },
        material: {
          codigo: respuesta.material.codigo,
          descripcion: respuesta.material.descripcion,
          unidadMedida: respuesta.material.unidadMedida,
          categoria: respuesta.material.categoria,
        },
        cantidad: respuesta.cantidad,
        observaciones: respuesta.observaciones,
        serial: respuesta.serial,
        estado: respuesta.estado,
        fechaInicio: respuesta.fechaInicio,
        fechaConfirmacion: respuesta.fechaConfirmacion,
        cantidadAdjuntos: respuesta.adjuntos.length,
      };
    });
  }
}
