import { Module } from '@nestjs/common';

import { SessionTokenService } from './services/session-token.service';

/**
 * Servicios transversales compartidos por `AppModule` (donde `SessionAuthGuard`
 * se registra como `APP_GUARD` global) y por `EncuestaMaterialesModule` (donde
 * `LoginUseCase` emite la sesión) -- ambos necesitan la MISMA instancia de
 * contrato (`SessionTokenService`), de ahí el módulo compartido en vez de
 * declarar el provider por duplicado en cada uno.
 */
@Module({
  providers: [SessionTokenService],
  exports: [SessionTokenService],
})
export class CommonModule {}
