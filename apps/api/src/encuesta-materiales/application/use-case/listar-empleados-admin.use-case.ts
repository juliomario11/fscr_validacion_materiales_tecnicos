import { Inject, Injectable } from '@nestjs/common';

import { RespuestaConDetalle } from '../../domain/entity/respuesta-detalle.entity';
import {
  EMPLEADOS_ENCUESTA_REPOSITORY,
  type EmpleadosEncuestaRepository,
} from '../../domain/repository/empleados-encuesta.repository';
import {
  RESPUESTAS_ENCUESTA_REPOSITORY,
  type RespuestasEncuestaRepository,
} from '../../domain/repository/respuestas-encuesta.repository';
import { EmpleadoAdminResponseDto, EstadoEmpleadoAdmin } from '../dto/admin.dto';

function calcularEstado(respuestas: RespuestaConDetalle[]): EstadoEmpleadoAdmin {
  if (respuestas.length === 0) return 'sin_iniciar';
  const tieneBorrador = respuestas.some((r) => r.estado === 'borrador');
  return tieneBorrador ? 'en_progreso' : 'confirmado';
}

function fechaConfirmacionMasReciente(respuestas: RespuestaConDetalle[]): string | null {
  const fechas = respuestas
    .map((r) => r.fechaConfirmacion)
    .filter((f): f is string => f !== null)
    .sort();
  return fechas.length > 0 ? fechas[fechas.length - 1] : null;
}

/** Lista los 113 empleados con su estado de avance en la encuesta -- para el panel de administración. */
@Injectable()
export class ListarEmpleadosAdminUseCase {
  public constructor(
    @Inject(EMPLEADOS_ENCUESTA_REPOSITORY)
    private readonly empleadosRepository: EmpleadosEncuestaRepository,
    @Inject(RESPUESTAS_ENCUESTA_REPOSITORY)
    private readonly respuestasRepository: RespuestasEncuestaRepository,
  ) {}

  public async execute(): Promise<EmpleadoAdminResponseDto[]> {
    const [empleados, respuestas] = await Promise.all([
      this.empleadosRepository.findAllActivos(),
      this.respuestasRepository.findAllConDetalle(),
    ]);

    const respuestasPorEmpleado = new Map<number, RespuestaConDetalle[]>();
    for (const respuesta of respuestas) {
      const lista = respuestasPorEmpleado.get(respuesta.empleadoId) ?? [];
      lista.push(respuesta);
      respuestasPorEmpleado.set(respuesta.empleadoId, lista);
    }

    return empleados.map((empleado) => {
      const susRespuestas = respuestasPorEmpleado.get(empleado.id) ?? [];
      return {
        id: empleado.id,
        cedula: empleado.cedula,
        nombreCompleto: empleado.nombreCompleto,
        cargo: empleado.cargo,
        departamento: empleado.departamento,
        area: empleado.area,
        proyecto: empleado.proyecto,
        estado: calcularEstado(susRespuestas),
        cantidadItems: susRespuestas.length,
        fechaConfirmacion: fechaConfirmacionMasReciente(susRespuestas),
      };
    });
  }
}
