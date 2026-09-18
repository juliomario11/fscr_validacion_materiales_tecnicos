import { Controller, Get, Param, ParseIntPipe, StreamableFile, UseGuards } from '@nestjs/common';

import { Public } from '../../../common/decorators/public.decorator';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';
import { EmpleadoAdminResponseDto, RespuestaAdminResponseDto } from '../../application/dto/admin.dto';
import { DescargarAdjuntoUseCase } from '../../application/use-case/descargar-adjunto.use-case';
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
    private readonly descargarAdjunto: DescargarAdjuntoUseCase,
  ) {}

  @Get('empleados')
  public async empleados(): Promise<EmpleadoAdminResponseDto[]> {
    return this.listarEmpleadosAdmin.execute();
  }

  @Get('respuestas')
  public async respuestas(): Promise<RespuestaAdminResponseDto[]> {
    return this.listarRespuestasAdmin.execute();
  }

  /**
   * Igual patrón que `GET /mis-respuestas/adjuntos/:adjuntoId/file` del
   * técnico, pero sin chequeo de dueño -- el admin puede ver/descargar el
   * adjunto de CUALQUIER empleado. `inline` para que el navegador lo pueda
   * mostrar directo en <img>/<iframe> si el panel lo pide así.
   */
  @Get('adjuntos/:adjuntoId/file')
  public async adjuntoFile(@Param('adjuntoId', ParseIntPipe) adjuntoId: number): Promise<StreamableFile> {
    const archivo = await this.descargarAdjunto.executeAdmin(adjuntoId);
    return new StreamableFile(archivo.stream, {
      type: archivo.mime,
      disposition: `inline; filename="${encodeURIComponent(archivo.nombreArchivo)}"`,
      length: archivo.tamanoBytes,
    });
  }
}
