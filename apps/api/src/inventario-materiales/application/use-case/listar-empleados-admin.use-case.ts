import { Inject, Injectable } from '@nestjs/common';

import { RespuestaConDetalle } from '../../domain/entity/respuesta-detalle.entity';
import {
  EMPLEADOS_INVENTARIO_REPOSITORY,
  type EmpleadosInventarioRepository,
} from '../../domain/repository/empleados-inventario.repository';
import {
  RESPUESTAS_INVENTARIO_REPOSITORY,
  type RespuestasInventarioRepository,
} from '../../domain/repository/respuestas-inventario.repository';
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

/** Lista los 113 empleados con su estado de avance en el inventario -- para el panel de administración. */
@Injectable()
export class ListarEmpleadosAdminUseCase {
  public constructor(
    @Inject(EMPLEADOS_INVENTARIO_REPOSITORY)
    private readonly empleadosRepository: EmpleadosInventarioRepository,
    @Inject(RESPUESTAS_INVENTARIO_REPOSITORY)
    private readonly respuestasRepository: RespuestasInventarioRepository,
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
