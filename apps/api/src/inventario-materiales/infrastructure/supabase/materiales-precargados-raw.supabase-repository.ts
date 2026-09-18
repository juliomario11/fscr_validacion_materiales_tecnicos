import { Injectable } from '@nestjs/common';

import { MaterialPrecargadoRaw } from '../../domain/entity/material-precargado-raw.entity';
import { MaterialesPrecargadosRawRepository } from '../../domain/repository/materiales-precargados-raw.repository';
import { SupabasePostgrestClient } from './supabase-postgrest.client';
import { SUPABASE_SCHEMA } from './supabase.schema';

interface MaterialPrecargadoRawRow {
  id: number;
  cedula: string;
  serial: string | null;
  codigo_material: string;
  material: string | null;
  descripcion_ampliada: string | null;
  bodega: string | null;
  direccion_bodega: string | null;
  estado: string | null;
  referencia: string | null;
  costo: number | string | null;
  cantidad: number | string | null;
  lote: string | null;
  area: string | null;
  fecha_carga: string;
  procesado: boolean;
}

const COLUMNS =
  'id,cedula,serial,codigo_material,material,descripcion_ampliada,bodega,direccion_bodega,estado,referencia,costo,cantidad,lote,area,fecha_carga,procesado';

function toEntity(row: MaterialPrecargadoRawRow): MaterialPrecargadoRaw {
  return {
    id: row.id,
    cedula: row.cedula,
    serial: row.serial,
    codigoMaterial: row.codigo_material,
    material: row.material,
    descripcionAmpliada: row.descripcion_ampliada,
    bodega: row.bodega,
    direccionBodega: row.direccion_bodega,
    estado: row.estado,
    referencia: row.referencia,
    costo: row.costo === null ? null : Number(row.costo),
    cantidad: row.cantidad === null ? null : Number(row.cantidad),
    lote: row.lote,
    area: row.area,
    fechaCarga: row.fecha_carga,
    procesado: row.procesado,
  };
}

/** Solo LECTURA (findPendientesPorCedula) + un flag de escritura (marcarProcesadas) -- las filas las inserta un cron EXTERNO a este backend. */
@Injectable()
export class MaterialesPrecargadosRawSupabaseRepository implements MaterialesPrecargadosRawRepository {
  private readonly table = 'materiales_precargados_raw';

  public constructor(private readonly client: SupabasePostgrestClient) {}

  public async findPendientesPorCedula(cedula: string): Promise<MaterialPrecargadoRaw[]> {
    const qs = new URLSearchParams();
    qs.set('cedula', `eq.${cedula}`);
    qs.set('procesado', 'eq.false');
    qs.set('select', COLUMNS);
    qs.set('order', 'id.asc');
    const rows = await this.client.request<MaterialPrecargadoRawRow[]>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows.map(toEntity);
  }

  public async marcarProcesadas(ids: ReadonlyArray<number>): Promise<void> {
    if (ids.length === 0) return;
    const qs = new URLSearchParams();
    qs.set('id', `in.(${ids.join(',')})`);
    await this.client.request<unknown>(`${this.table}?${qs.toString()}`, {
      method: 'PATCH',
      schema: SUPABASE_SCHEMA,
      prefer: 'return=minimal',
      body: { procesado: true, procesado_en: new Date().toISOString() },
    });
  }
}
