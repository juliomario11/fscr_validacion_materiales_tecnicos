import { Controller, Get, UseGuards } from '@nestjs/common';

import { Public } from '../../../common/decorators/public.decorator';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';
import { EmpleadoAdminResponseDto, RespuestaAdminResponseDto } from '../../application/dto/admin.dto';
import { ListarEmpleadosAdminUseCase } from '../../application/use-case/listar-empleados-admin.use-case';
import { ListarRespuestasAdminUseCase } from '../../application/use-case/listar-respuestas-admin.use-case';

/**
 * `@Public()` a nivel de clase para que el `SessionAuthGuard` GLOBAL (cookie
 * de empleado) no bloquee estas rutas, y `@UseGuards(AdminAuthGuard)` para
 * exigir en su lugar el Bearer token de administrador -- son dos sistemas
 * de auth completamente separados, ver `AdminAuthGuard` y `AuthController`.
 */
@Controller('api/v1/validacion-materiales/admin')
@Public()
@UseGuards(AdminAuthGuard)
export class AdminController {
  public constructor(
    private readonly listarEmpleadosAdmin: ListarEmpleadosAdminUseCase,
    private readonly listarRespuestasAdmin: ListarRespuestasAdminUseCase,
  ) {}

  @Get('empleados')
  public async empleados(): Promise<EmpleadoAdminResponseDto[]> {
    return this.listarEmpleadosAdmin.execute();
  }

  @Get('respuestas')
  public async respuestas(): Promise<RespuestaAdminResponseDto[]> {
    return this.listarRespuestasAdmin.execute();
  }
}
