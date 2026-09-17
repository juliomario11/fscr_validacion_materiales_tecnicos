import { Injectable } from '@nestjs/common';

import { AdjuntoEncuesta } from '../../domain/entity/adjunto-encuesta.entity';
import {
  AdjuntosEncuestaRepository,
  CrearAdjuntoPayload,
} from '../../domain/repository/adjuntos-encuesta.repository';
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

function toAdjunto(row: AdjuntoRow): AdjuntoEncuesta {
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
export class AdjuntosEncuestaSupabaseRepository implements AdjuntosEncuestaRepository {
  private readonly table = 'encuesta_adjuntos';

  public constructor(private readonly client: SupabasePostgrestClient) {}

  public async create(payload: CrearAdjuntoPayload): Promise<AdjuntoEncuesta> {
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
}
