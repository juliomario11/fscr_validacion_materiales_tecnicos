import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  MATERIALES_PRECARGADOS_RAW_REPOSITORY,
  type MaterialesPrecargadosRawRepository,
} from '../../domain/repository/materiales-precargados-raw.repository';
import {
  MATERIALES_REPOSITORY,
  type MaterialesRepository,
} from '../../domain/repository/materiales.repository';
import {
  RESPUESTAS_INVENTARIO_REPOSITORY,
  type InsertPrecargadoPayload,
  type RespuestasInventarioRepository,
} from '../../domain/repository/respuestas-inventario.repository';

/**
 * Convierte en filas de `inventario_respuestas` (`origen = 'precargado'`)
 * las filas de `materiales_precargados_raw` que un cron EXTERNO (Node.js,
 * fuera de este repo) dejó sin procesar para una cédula -- se llama en cada
 * login (`LoginUseCase`), así que debe ser idempotente: si ya no hay filas
 * pendientes (procesadas en un login anterior del mismo día), no hace nada.
 */
@Injectable()
export class MaterializarPrecargaUseCase {
  private readonly logger = new Logger(MaterializarPrecargaUseCase.name);

  public constructor(
    @Inject(MATERIALES_PRECARGADOS_RAW_REPOSITORY)
    private readonly rawRepository: MaterialesPrecargadosRawRepository,
    @Inject(MATERIALES_REPOSITORY)
    private readonly materialesRepository: MaterialesRepository,
    @Inject(RESPUESTAS_INVENTARIO_REPOSITORY)
    private readonly respuestasRepository: RespuestasInventarioRepository,
  ) {}

  public async execute(empleadoId: number, cedula: string, fueraDeFecha: boolean): Promise<void> {
    const pendientes = await this.rawRepository.findPendientesPorCedula(cedula);
    if (pendientes.length === 0) return;

    // Filas `origen='precargado'` ya materializadas en un login anterior
    // (mismo día u otro) -- se usa para no reinsertar ni romper el índice
    // único si esta función se llama más de una vez.
    const yaMaterializados = await this.respuestasRepository.findPrecargadosByEmpleado(empleadoId);
    const clavesExistentes = new Set(yaMaterializados.map((r) => `${r.materialId}::${r.serial ?? ''}`));

    const payloads: InsertPrecargadoPayload[] = [];
    const idsAMarcarProcesados: number[] = [];

    for (const raw of pendientes) {
      idsAMarcarProcesados.push(raw.id);

      const material = await this.materialesRepository.findActivoByCodigo(raw.codigoMaterial);
      if (!material) {
        // No se puede procesar (código inexistente en el catálogo) ni
        // tampoco se va a resolver solo reintentando cada login -- se marca
        // procesada igual para no repetir este warning todos los días.
        this.logger.warn(
          `materiales_precargados_raw id=${raw.id} cedula=${cedula}: codigo_material="${raw.codigoMaterial}" no existe (o no está activo) en el catálogo -- se omite.`,
        );
        continue;
      }

      const clave = `${material.id}::${raw.serial ?? ''}`;
      if (clavesExistentes.has(clave)) {
        continue;
      }
      clavesExistentes.add(clave);

      payloads.push({
        empleadoId,
        materialId: material.id,
        serial: raw.serial,
        // El cron externo no siempre trae "cantidad" poblada (columna en
        // blanco/0 en el archivo de origen, sobre todo para ítems
        // serializados donde cada fila ya representa una unidad) -- que
        // exista la fila significa que el empleado tiene AL MENOS 1, nunca
        // 0, así que ese es el mínimo por defecto en vez de propagar el 0.
        cantidadPrecargada: raw.cantidad && raw.cantidad > 0 ? raw.cantidad : 1,
        serialPrecargadoId: raw.id,
        fueraDeFecha,
      });
    }

    if (payloads.length > 0) {
      await this.respuestasRepository.insertPrecargados(payloads);
    }
    await this.rawRepository.marcarProcesadas(idsAMarcarProcesados);
  }
}
