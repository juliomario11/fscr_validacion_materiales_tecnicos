import { timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { AdminTokenService } from '../../../common/services/admin-token.service';
import { CredencialAdminInvalidaException } from '../exception/inventario-materiales.exceptions';

/**
 * Compara dos strings en tiempo constante (evita timing attacks) sin
 * exigir que tengan la misma longitud de antemano -- `timingSafeEqual`
 * lanza si los buffers difieren en tamaño, así que si difieren se compara
 * igual contra un buffer del mismo tamaño (falla siempre) para no filtrar
 * por early-return si la longitud no coincide.
 */
function compararTimingSafe(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

@Injectable()
export class LoginAdminUseCase {
  public constructor(private readonly adminTokenService: AdminTokenService) {}

  public async execute(usuario: string, password: string): Promise<string> {
    const usuarioEsperado = process.env.FSCR_ADMIN_USER ?? '';
    const passwordEsperada = process.env.FSCR_ADMIN_PASS ?? '';

    const usuarioOk = usuarioEsperado.length > 0 && compararTimingSafe(usuario, usuarioEsperado);
    const passwordOk = passwordEsperada.length > 0 && compararTimingSafe(password, passwordEsperada);
    if (!usuarioOk || !passwordOk) {
      throw new CredencialAdminInvalidaException();
    }

    return this.adminTokenService.issue(usuario);
  }
}
