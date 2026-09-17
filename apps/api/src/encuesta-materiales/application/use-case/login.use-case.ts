import { Inject, Injectable } from '@nestjs/common';

import { SessionTokenService } from '../../../common/services/session-token.service';
import {
  EMPLEADOS_ENCUESTA_REPOSITORY,
  type EmpleadosEncuestaRepository,
} from '../../domain/repository/empleados-encuesta.repository';
import { CredencialInvalidaException } from '../exception/encuesta-materiales.exceptions';

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
    @Inject(EMPLEADOS_ENCUESTA_REPOSITORY)
    private readonly empleadosRepository: EmpleadosEncuestaRepository,
    private readonly sessionTokenService: SessionTokenService,
  ) {}

  public async execute(cedula: string): Promise<LoginResult> {
    const empleado = await this.empleadosRepository.findActivoByCedula(cedula.trim());
    if (!empleado) {
      throw new CredencialInvalidaException();
    }

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
