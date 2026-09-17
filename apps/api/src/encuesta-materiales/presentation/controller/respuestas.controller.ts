import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { CurrentEmpleado } from '../../../common/decorators/current-empleado.decorator';
import type { SessionEmpleado } from '../../../common/services/session-token.service';
import { AdjuntoResponseDto, RespuestaResponseDto } from '../../application/dto/respuesta.dto';
import { ConfirmarRespuestasResponseDto } from '../../application/dto/confirmar.dto';
import { UpsertRespuestaRequestDto } from '../../application/dto/upsert-respuesta.dto';
import { ConfirmarRespuestasUseCase } from '../../application/use-case/confirmar-respuestas.use-case';
import { EliminarRespuestaUseCase } from '../../application/use-case/eliminar-respuesta.use-case';
import { ListarMisRespuestasUseCase } from '../../application/use-case/listar-mis-respuestas.use-case';
import { SubirAdjuntoUseCase } from '../../application/use-case/subir-adjunto.use-case';
import { UpsertRespuestaUseCase } from '../../application/use-case/upsert-respuesta.use-case';
import { RespuestaConDetalle } from '../../domain/entity/respuesta-detalle.entity';

/** 10MB -- límite razonable para evidencia fotográfica de campo. */
const MAX_ADJUNTO_BYTES = 10 * 1024 * 1024;

/**
 * Forma mínima que necesitamos de `Express.Multer.File`, declarada a mano en
 * vez de depender del namespace global `Express.Multer` -- mismo criterio
 * que `DocumentosController` en el proyecto hermano: evita que el tipado del
 * archivo dependa de cómo el `tsconfig` resuelva (o no) las declaraciones
 * ambientales de `@types/multer`.
 */
interface MulterLikeFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

function toRespuestaDto(respuesta: RespuestaConDetalle): RespuestaResponseDto {
  return {
    id: respuesta.id,
    materialId: respuesta.materialId,
    material: {
      id: respuesta.material.id,
      codigo: respuesta.material.codigo,
      descripcion: respuesta.material.descripcion,
      unidadMedida: respuesta.material.unidadMedida,
      categoria: respuesta.material.categoria,
    },
    cantidad: respuesta.cantidad,
    observaciones: respuesta.observaciones,
    estado: respuesta.estado,
    fechaInicio: respuesta.fechaInicio,
    fechaConfirmacion: respuesta.fechaConfirmacion,
    adjuntos: respuesta.adjuntos.map((a) => ({
      id: a.id,
      nombreArchivo: a.nombreArchivo,
      subidoEn: a.subidoEn,
    })),
  };
}

@Controller('api/v1/validacion-materiales/mis-respuestas')
export class RespuestasController {
  public constructor(
    private readonly listarMisRespuestas: ListarMisRespuestasUseCase,
    private readonly upsertRespuesta: UpsertRespuestaUseCase,
    private readonly eliminarRespuesta: EliminarRespuestaUseCase,
    private readonly subirAdjunto: SubirAdjuntoUseCase,
    private readonly confirmarRespuestas: ConfirmarRespuestasUseCase,
  ) {}

  @Get()
  public async listar(@CurrentEmpleado() empleado: SessionEmpleado): Promise<RespuestaResponseDto[]> {
    const respuestas = await this.listarMisRespuestas.execute(empleado.empleadoId);
    return respuestas.map(toRespuestaDto);
  }

  // Declarada ANTES de ':materialId/adjuntos' -- aunque no colisionan en
  // número de segmentos (1 vs. 2), se mantiene el mismo orden defensivo
  // (rutas literales antes que rutas con parámetro) que usa el proyecto
  // hermano en sus controllers.
  @Post('confirmar')
  @HttpCode(200)
  public async confirmar(
    @CurrentEmpleado() empleado: SessionEmpleado,
  ): Promise<ConfirmarRespuestasResponseDto> {
    const confirmadas = await this.confirmarRespuestas.execute(empleado.empleadoId);
    const dtos = confirmadas.map(toRespuestaDto);
    return { confirmadas: dtos, total: dtos.length };
  }

  @Put(':materialId')
  public async upsert(
    @CurrentEmpleado() empleado: SessionEmpleado,
    @Param('materialId', ParseIntPipe) materialId: number,
    @Body() body: UpsertRespuestaRequestDto,
  ): Promise<RespuestaResponseDto> {
    const respuesta = await this.upsertRespuesta.execute({
      empleadoId: empleado.empleadoId,
      materialId,
      cantidad: body.cantidad,
      observaciones: body.observaciones ?? null,
    });
    return toRespuestaDto(respuesta);
  }

  @Delete(':materialId')
  @HttpCode(204)
  public async eliminar(
    @CurrentEmpleado() empleado: SessionEmpleado,
    @Param('materialId', ParseIntPipe) materialId: number,
  ): Promise<void> {
    await this.eliminarRespuesta.execute(empleado.empleadoId, materialId);
  }

  @Post(':materialId/adjuntos')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: MAX_ADJUNTO_BYTES, files: 1 } }))
  public async subirAdjuntoEndpoint(
    @CurrentEmpleado() empleado: SessionEmpleado,
    @Param('materialId', ParseIntPipe) materialId: number,
    @UploadedFile() file?: MulterLikeFile,
  ): Promise<AdjuntoResponseDto> {
    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo en el campo "archivo".');
    }
    const adjunto = await this.subirAdjunto.execute({
      empleadoId: empleado.empleadoId,
      materialId,
      buffer: file.buffer,
      nombreOriginal: file.originalname,
      mimeType: file.mimetype,
    });
    return { id: adjunto.id, nombreArchivo: adjunto.nombreArchivo, subidoEn: adjunto.subidoEn };
  }
}
