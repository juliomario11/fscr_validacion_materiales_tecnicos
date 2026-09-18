import { Injectable } from '@nestjs/common';

import { AdjuntoInventario } from '../../domain/entity/adjunto-inventario.entity';
import {
  AdjuntosInventarioRepository,
  CrearAdjuntoPayload,
} from '../../domain/repository/adjuntos-inventario.repository';
import { SupabasePostgrestClient } from './supabase-postgrest.client';
import { SUPABASE_SCHEMA } from './supabase.schema';

interface AdjuntoRow {
  id: number;
  respuesta_id: number;
  storage_path: string;
  nombre_archivo: string;
  tipo_mime: string | null;
  tamano_bytes: number | string | null;
  subido_en: string;
}

const ADJUNTO_COLUMNS = 'id,respuesta_id,storage_path,nombre_archivo,tipo_mime,tamano_bytes,subido_en';

function toAdjunto(row: AdjuntoRow): AdjuntoInventario {
  return {
    id: row.id,
    respuestaId: row.respuesta_id,
    storagePath: row.storage_path,
    nombreArchivo: row.nombre_archivo,
    tipoMime: row.tipo_mime,
    tamanoBytes: row.tamano_bytes !== null ? Number(row.tamano_bytes) : null,
    subidoEn: row.subido_en,
  };
}

@Injectable()
export class AdjuntosInventarioSupabaseRepository implements AdjuntosInventarioRepository {
  private readonly table = 'inventario_adjuntos';

  public constructor(private readonly client: SupabasePostgrestClient) {}

  public async create(payload: CrearAdjuntoPayload): Promise<AdjuntoInventario> {
    const rows = await this.client.request<AdjuntoRow[]>(this.table, {
      method: 'POST',
      schema: SUPABASE_SCHEMA,
      prefer: 'return=representation',
      body: {
        respuesta_id: payload.respuestaId,
        storage_path: payload.storagePath,
        nombre_archivo: payload.nombreArchivo,
        tipo_mime: payload.tipoMime,
        tamano_bytes: payload.tamanoBytes,
      },
    });
    const created = rows[0];
    if (!created) {
      throw new Error('Supabase no devolvió el adjunto recién creado.');
    }
    return toAdjunto(created);
  }

  public async findById(id: number): Promise<AdjuntoInventario | null> {
    const qs = new URLSearchParams();
    qs.set('id', `eq.${id}`);
    qs.set('select', ADJUNTO_COLUMNS);
    const rows = await this.client.request<AdjuntoRow[]>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows[0] ? toAdjunto(rows[0]) : null;
  }

  public async countByRespuestaId(respuestaId: number): Promise<number> {
    const qs = new URLSearchParams();
    qs.set('respuesta_id', `eq.${respuestaId}`);
    qs.set('select', 'id');
    const rows = await this.client.request<Array<{ id: number }>>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows.length;
  }
}
