import { Inject, Injectable } from '@nestjs/common';

import { RespuestaConDetalle } from '../../domain/entity/respuesta-detalle.entity';
import {
  CALENDARIO_INVENTARIO_REPOSITORY,
  type CalendarioInventarioRepository,
} from '../../domain/repository/calendario-inventario.repository';
import {
  MATERIALES_REPOSITORY,
  type MaterialesRepository,
} from '../../domain/repository/materiales.repository';
import {
  RESPUESTAS_INVENTARIO_REPOSITORY,
  type RespuestasInventarioRepository,
} from '../../domain/repository/respuestas-inventario.repository';
import { todayBogotaDateString } from '../../domain/fecha-bogota.util';
import {
  MaterialNoEncontradoException,
  RespuestaConfirmadaException,
} from '../exception/inventario-materiales.exceptions';

export interface UpsertRespuestaInput {
  empleadoId: number;
  cedula: string;
  materialId: number;
  cantidad: number;
  observaciones: string | null;
  serial: string | null;
}

@Injectable()
export class UpsertRespuestaUseCase {
  public constructor(
    @Inject(MATERIALES_REPOSITORY)
    private readonly materialesRepository: MaterialesRepository,
    @Inject(RESPUESTAS_INVENTARIO_REPOSITORY)
    private readonly respuestasRepository: RespuestasInventarioRepository,
    @Inject(CALENDARIO_INVENTARIO_REPOSITORY)
    private readonly calendarioRepository: CalendarioInventarioRepository,
  ) {}

  public async execute(input: UpsertRespuestaInput): Promise<RespuestaConDetalle> {
    const material = await this.materialesRepository.findActivoById(input.materialId);
    if (!material) {
      throw new MaterialNoEncontradoException();
    }

    // Mismo criterio que en el login: "fuera de fecha" no bloquea, solo se
    // marca en la fila (visible en /admin) -- un ítem agregado manualmente
    // un día distinto al asignado también debe quedar señalado.
    const fueraDeFecha = !(await this.calendarioRepository.tieneFechaAsignadaHoy(
      input.cedula,
      todayBogotaDateString(),
    ));

    const existente = await this.respuestasRepository.findByEmpleadoYMaterial(
      input.empleadoId,
      input.materialId,
    );

    if (existente) {
      if (existente.estado === 'confirmado') {
        // TODO: reabrir un inventario confirmado (¿quién autoriza?, ¿se
        // audita el cambio?) queda pendiente de definir a futuro -- por
        // ahora la confirmación es definitiva, tal como pide el spec de
        // este primer scaffold.
        throw new RespuestaConfirmadaException();
      }
      await this.respuestasRepository.update(existente.id, {
        cantidad: input.cantidad,
        observaciones: input.observaciones,
        serial: input.serial,
        fueraDeFecha,
      });
      return this.releerConDetalle(existente.id);
    }

    const creada = await this.respuestasRepository.insert({
      empleadoId: input.empleadoId,
      materialId: input.materialId,
      cantidad: input.cantidad,
      observaciones: input.observaciones,
      serial: input.serial,
      fueraDeFecha,
    });
    return this.releerConDetalle(creada.id);
  }

  private async releerConDetalle(id: number): Promise<RespuestaConDetalle> {
    const detalle = await this.respuestasRepository.findByIdConDetalle(id);
    if (!detalle) {
      throw new Error(`No se pudo releer la respuesta ${id} recién escrita con su detalle.`);
    }
    return detalle;
  }
}
