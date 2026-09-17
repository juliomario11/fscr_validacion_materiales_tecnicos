import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

import { CommonModule } from './common/common.module';
import { DomainExceptionsFilter } from './common/filters/domain-exceptions.filter';
import { SessionAuthGuard } from './common/guards/session-auth.guard';
import { EncuestaMaterialesModule } from './encuesta-materiales/encuesta-materiales.module';

@Module({
  imports: [CommonModule, EncuestaMaterialesModule],
  providers: [
    // Guard global: "seguro por defecto" -- cualquier endpoint nuevo queda
    // protegido salvo que se marque explícitamente `@Public()` (ver
    // `common/decorators/public.decorator.ts`).
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    // Filtro global: único punto que traduce excepciones de dominio e
    // infraestructura a códigos HTTP uniformes.
    { provide: APP_FILTER, useClass: DomainExceptionsFilter },
  ],
})
export class AppModule {}
