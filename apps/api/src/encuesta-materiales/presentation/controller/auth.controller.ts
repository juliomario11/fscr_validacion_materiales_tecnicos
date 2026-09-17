import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';

import { Public } from '../../../common/decorators/public.decorator';
import { SESSION_COOKIE_NAME } from '../../../common/utils/cookie.util';
import { LoginRequestDto, LoginResponseDto } from '../../application/dto/login.dto';
import { LoginUseCase } from '../../application/use-case/login.use-case';

/** Igual al TTL que firma `SessionTokenService` -- si uno cambia, el otro debe seguirlo. */
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function buildCookieOptions(): CookieOptions {
  // OJO: esto NO debe depender de NODE_ENV. El servidor real de producción
  // (factproveedores, puerto 8082 vía Apache) sirve todo por HTTP plano, sin
  // TLS -- si aqui se pusiera secure=true por estar en NODE_ENV=production,
  // el navegador descarta la cookie silenciosamente (Secure exige HTTPS
  // real) y cualquier request despues del login responde 401 "sesion no
  // encontrada", aunque el login mismo haya funcionado. Usa FSCR_COOKIE_SECURE
  // explicito, solo cuando de verdad haya HTTPS termination delante (ej. un
  // futuro dominio con certificado real, o DigitalOcean App Platform).
  const cookieSecure = process.env.FSCR_COOKIE_SECURE === 'true';
  return {
    httpOnly: true,
    secure: cookieSecure,
    // 'none' es obligatorio para que el navegador envíe la cookie en
    // llamadas cross-site sobre HTTPS real (y requiere secure=true, si no el
    // navegador la descarta). 'lax' basta cuando frontend y API comparten el
    // mismo origen (como en este servidor, vía el ProxyPass de Apache) o en
    // desarrollo local, y funciona tanto en HTTP como HTTPS.
    sameSite: cookieSecure ? 'none' : 'lax',
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
      nombres: result.nombres,
      apellidos: result.apellidos,
      cargo: result.cargo,
      departamento: result.departamento,
      area: result.area,
      proyecto: result.proyecto,
      celular: result.celular,
      email: result.email,
    };
  }

  @Post('logout')
  @Public()
  @HttpCode(200)
  public logout(@Res({ passthrough: true }) response: Response): { ok: true } {
    // clearCookie debe recibir las MISMAS opciones (sameSite/secure/path) con
    // las que se seteo, si no algunos navegadores no la reconocen como la
    // misma cookie y no la borran.
    response.clearCookie(SESSION_COOKIE_NAME, buildCookieOptions());
    return { ok: true };
  }
}
