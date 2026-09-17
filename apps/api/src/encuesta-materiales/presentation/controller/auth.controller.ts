import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';

import { Public } from '../../../common/decorators/public.decorator';
import { SESSION_COOKIE_NAME } from '../../../common/utils/cookie.util';
import { LoginRequestDto, LoginResponseDto } from '../../application/dto/login.dto';
import { LoginUseCase } from '../../application/use-case/login.use-case';

/** Igual al TTL que firma `SessionTokenService` -- si uno cambia, el otro debe seguirlo. */
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function buildCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    // 'none' es obligatorio para que el navegador envíe la cookie en
    // llamadas cross-site (Angular en un origen distinto a esta API) sobre
    // HTTPS; en desarrollo local ('http://localhost') 'lax' basta y evita
    // tener que servir todo por HTTPS solo para probar el login.
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  };
}

@Controller('api/v1/validacion-materiales/auth')
export class AuthController {
  public constructor(private readonly loginUseCase: LoginUseCase) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  public async login(
    @Body() body: LoginRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.loginUseCase.execute(body.cedula);
    response.cookie(SESSION_COOKIE_NAME, result.sessionToken, buildCookieOptions());
    return {
      empleadoId: result.empleadoId,
      cedula: result.cedula,
      nombreCompleto: result.nombreCompleto,
    };
  }

  @Post('logout')
  @Public()
  @HttpCode(200)
  public logout(@Res({ passthrough: true }) response: Response): { ok: true } {
    response.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return { ok: true };
  }
}
