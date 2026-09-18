import { Module } from '@nestjs/common';

import { AdminTokenService } from './services/admin-token.service';
import { SessionTokenService } from './services/session-token.service';

/**
 * Servicios transversales compartidos por `AppModule` (donde `SessionAuthGuard`
 * se registra como `APP_GUARD` global) y por `InventarioMaterialesModule` (donde
 * `LoginUseCase` emite la sesión) -- ambos necesitan la MISMA instancia de
 * contrato (`SessionTokenService`), de ahí el módulo compartido en vez de
 * declarar el provider por duplicado en cada uno. `AdminTokenService` sigue
 * el mismo criterio para el panel de administración (Bearer token, sistema
 * de auth completamente aparte del de empleado).
 */
@Module({
  providers: [SessionTokenService, AdminTokenService],
  exports: [SessionTokenService, AdminTokenService],
})
export class CommonModule {}
