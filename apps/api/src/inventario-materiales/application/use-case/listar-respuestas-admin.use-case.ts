import { Inject, Injectable } from '@nestjs/common';

import {
  EMPLEADOS_INVENTARIO_REPOSITORY,
  type EmpleadosInventarioRepository,
} from '../../domain/repository/empleados-inventario.repository';
import {
  RESPUESTAS_INVENTARIO_REPOSITORY,
  type RespuestasInventarioRepository,
} from '../../domain/repository/respuestas-inventario.repository';
import { RespuestaAdminResponseDto } from '../dto/admin.dto';

/** Detalle completo de TODAS las respuestas de TODOS los empleados -- para el panel de administración. */
@Injectable()
export class ListarRespuestasAdminUseCase {
  public constructor(
    @Inject(RESPUESTAS_INVENTARIO_REPOSITORY)
    private readonly respuestasRepository: RespuestasInventarioRepository,
    @Inject(EMPLEADOS_INVENTARIO_REPOSITORY)
    private readonly empleadosRepository: EmpleadosInventarioRepository,
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
        id: respuesta.id,
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
        serialSistema: respuesta.serialSistema,
        estado: respuesta.estado,
        origen: respuesta.origen,
        estadoPrecarga: respuesta.estadoPrecarga,
        cantidadPrecargada: respuesta.cantidadPrecargada,
        fueraDeFecha: respuesta.fueraDeFecha,
        fechaInicio: respuesta.fechaInicio,
        fechaConfirmacion: respuesta.fechaConfirmacion,
        cantidadAdjuntos: respuesta.adjuntos.length,
        adjuntos: respuesta.adjuntos.map((a) => ({
          id: a.id,
          nombreArchivo: a.nombreArchivo,
          subidoEn: a.subidoEn,
        })),
      };
    });
  }
}
