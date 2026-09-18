import { Inject, Injectable } from '@nestjs/common';

import { SessionTokenService } from '../../../common/services/session-token.service';
import {
  CALENDARIO_INVENTARIO_REPOSITORY,
  type CalendarioInventarioRepository,
} from '../../domain/repository/calendario-inventario.repository';
import {
  EMPLEADOS_INVENTARIO_REPOSITORY,
  type EmpleadosInventarioRepository,
} from '../../domain/repository/empleados-inventario.repository';
import { todayBogotaDateString } from '../../domain/fecha-bogota.util';
import { CredencialInvalidaException } from '../exception/inventario-materiales.exceptions';
import { MaterializarPrecargaUseCase } from './materializar-precarga.use-case';

export interface LoginResult {
  empleadoId: number;
  cedula: string;
  nombreCompleto: string;
  nombres: string | null;
  apellidos: string | null;
  cargo: string | null;
  departamento: string | null;
  area: string | null;
  proyecto: string | null;
  celular: string | null;
  email: string | null;
  sessionToken: string;
}

@Injectable()
export class LoginUseCase {
  public constructor(
    @Inject(EMPLEADOS_INVENTARIO_REPOSITORY)
    private readonly empleadosRepository: EmpleadosInventarioRepository,
    @Inject(CALENDARIO_INVENTARIO_REPOSITORY)
    private readonly calendarioRepository: CalendarioInventarioRepository,
    private readonly materializarPrecarga: MaterializarPrecargaUseCase,
    private readonly sessionTokenService: SessionTokenService,
  ) {}

  public async execute(cedula: string): Promise<LoginResult> {
    const empleado = await this.empleadosRepository.findActivoByCedula(cedula.trim());
    if (!empleado) {
      throw new CredencialInvalidaException();
    }

    // "Fuera de fecha" NO bloquea el acceso (decisión de negocio) -- solo
    // queda marcado en las filas que se escriban hoy, para que /admin lo
    // note. La precarga del cron de las 5 AM se materializa igual, esté o
    // no dentro de su día asignado.
    const fueraDeFecha = !(await this.calendarioRepository.tieneFechaAsignadaHoy(
      empleado.cedula,
      todayBogotaDateString(),
    ));
    await this.materializarPrecarga.execute(empleado.id, empleado.cedula, fueraDeFecha);

    const sessionToken = await this.sessionTokenService.issue({
      empleadoId: empleado.id,
      cedula: empleado.cedula,
    });

    return {
      empleadoId: empleado.id,
      cedula: empleado.cedula,
      nombreCompleto: empleado.nombreCompleto,
      nombres: empleado.nombres,
      apellidos: empleado.apellidos,
      cargo: empleado.cargo,
      departamento: empleado.departamento,
      area: empleado.area,
      proyecto: empleado.proyecto,
      celular: empleado.celular,
      email: empleado.email,
      sessionToken,
    };
  }
}
