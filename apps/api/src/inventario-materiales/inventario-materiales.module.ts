import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { ADJUNTOS_INVENTARIO_REPOSITORY } from './domain/repository/adjuntos-inventario.repository';
import { ADJUNTOS_STORAGE } from './domain/repository/adjuntos-storage.port';
import { CALENDARIO_INVENTARIO_REPOSITORY } from './domain/repository/calendario-inventario.repository';
import { EMPLEADOS_INVENTARIO_REPOSITORY } from './domain/repository/empleados-inventario.repository';
import { MATERIALES_PRECARGADOS_RAW_REPOSITORY } from './domain/repository/materiales-precargados-raw.repository';
import { MATERIALES_REPOSITORY } from './domain/repository/materiales.repository';
import { RESPUESTAS_INVENTARIO_REPOSITORY } from './domain/repository/respuestas-inventario.repository';
import { AdjuntosInventarioSupabaseRepository } from './infrastructure/supabase/adjuntos-inventario.supabase-repository';
import { CalendarioInventarioSupabaseRepository } from './infrastructure/supabase/calendario-inventario.supabase-repository';
import { EmpleadosInventarioSupabaseRepository } from './infrastructure/supabase/empleados-inventario.supabase-repository';
import { MaterialesPrecargadosRawSupabaseRepository } from './infrastructure/supabase/materiales-precargados-raw.supabase-repository';
import { MaterialesSupabaseRepository } from './infrastructure/supabase/materiales.supabase-repository';
import { RespuestasInventarioSupabaseRepository } from './infrastructure/supabase/respuestas-inventario.supabase-repository';
import { SupabasePostgrestClient } from './infrastructure/supabase/supabase-postgrest.client';
import { FilesystemAdjuntosStorage } from './infrastructure/storage/filesystem-adjuntos-storage.adapter';
import { AdminAuthController } from './presentation/controller/admin-auth.controller';
import { AdminController } from './presentation/controller/admin.controller';
import { AuthController } from './presentation/controller/auth.controller';
import { HealthController } from './presentation/controller/health.controller';
import { MaterialesController } from './presentation/controller/materiales.controller';
import { RespuestasController } from './presentation/controller/respuestas.controller';
import { ConfirmarPrecargaUseCase } from './application/use-case/confirmar-precarga.use-case';
import { ConfirmarRespuestasUseCase } from './application/use-case/confirmar-respuestas.use-case';
import { DescargarAdjuntoUseCase } from './application/use-case/descargar-adjunto.use-case';
import { EliminarRespuestaUseCase } from './application/use-case/eliminar-respuesta.use-case';
import { ListarEmpleadosAdminUseCase } from './application/use-case/listar-empleados-admin.use-case';
import { ListarMaterialesUseCase } from './application/use-case/listar-materiales.use-case';
import { ListarMisRespuestasUseCase } from './application/use-case/listar-mis-respuestas.use-case';
import { ListarRespuestasAdminUseCase } from './application/use-case/listar-respuestas-admin.use-case';
import { LoginAdminUseCase } from './application/use-case/login-admin.use-case';
import { LoginUseCase } from './application/use-case/login.use-case';
import { MaterializarPrecargaUseCase } from './application/use-case/materializar-precarga.use-case';
import { SubirAdjuntoUseCase } from './application/use-case/subir-adjunto.use-case';
import { UpsertRespuestaUseCase } from './application/use-case/upsert-respuesta.use-case';

/**
 * Único módulo de negocio de este scaffold inicial: el inventario de
 * materiales/herramientas en poder de los ~113 técnicos de campo. Importa
 * `CommonModule` para reutilizar la misma instancia de `SessionTokenService`
 * que consume `SessionAuthGuard` (registrado como `APP_GUARD` global en
 * `AppModule`) -- así `LoginUseCase` emite tokens con el mismo servicio que
 * el guard usa para verificarlos.
 */
@Module({
  imports: [CommonModule],
  controllers: [
    AuthController,
    HealthController,
    MaterialesController,
    RespuestasController,
    AdminAuthController,
    AdminController,
  ],
  providers: [
    SupabasePostgrestClient,
    LoginUseCase,
    ListarMaterialesUseCase,
    ListarMisRespuestasUseCase,
    UpsertRespuestaUseCase,
    EliminarRespuestaUseCase,
    SubirAdjuntoUseCase,
    ConfirmarRespuestasUseCase,
    DescargarAdjuntoUseCase,
    ConfirmarPrecargaUseCase,
    MaterializarPrecargaUseCase,
    LoginAdminUseCase,
    ListarEmpleadosAdminUseCase,
    ListarRespuestasAdminUseCase,
    AdminAuthGuard,
    { provide: MATERIALES_REPOSITORY, useClass: MaterialesSupabaseRepository },
    { provide: EMPLEADOS_INVENTARIO_REPOSITORY, useClass: EmpleadosInventarioSupabaseRepository },
    { provide: RESPUESTAS_INVENTARIO_REPOSITORY, useClass: RespuestasInventarioSupabaseRepository },
    { provide: ADJUNTOS_INVENTARIO_REPOSITORY, useClass: AdjuntosInventarioSupabaseRepository },
    { provide: ADJUNTOS_STORAGE, useClass: FilesystemAdjuntosStorage },
    { provide: CALENDARIO_INVENTARIO_REPOSITORY, useClass: CalendarioInventarioSupabaseRepository },
    { provide: MATERIALES_PRECARGADOS_RAW_REPOSITORY, useClass: MaterialesPrecargadosRawSupabaseRepository },
  ],
})
export class InventarioMaterialesModule {}
