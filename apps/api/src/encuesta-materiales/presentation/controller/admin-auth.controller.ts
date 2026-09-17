import { Body, Controller, HttpCode, Post } from '@nestjs/common';

import { Public } from '../../../common/decorators/public.decorator';
import { AdminLoginRequestDto, AdminLoginResponseDto } from '../../application/dto/admin.dto';
import { LoginAdminUseCase } from '../../application/use-case/login-admin.use-case';

/**
 * `@Public()` respecto al `SessionAuthGuard` GLOBAL (que exige cookie de
 * sesión de empleado, algo que este endpoint nunca tendrá) -- el login
 * mismo no requiere ninguna autenticación previa, obviamente.
 */
@Controller('api/v1/validacion-materiales/admin/auth')
export class AdminAuthController {
  public constructor(private readonly loginAdminUseCase: LoginAdminUseCase) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  public async login(@Body() body: AdminLoginRequestDto): Promise<AdminLoginResponseDto> {
    const token = await this.loginAdminUseCase.execute(body.usuario, body.password);
    return { token };
  }
}
