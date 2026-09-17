import { Injectable, Logger } from '@nestjs/common';

import {
  AdjuntosStoragePort,
  ArchivoASubir,
  ArchivoSubido,
} from '../../domain/repository/adjuntos-storage.port';
import { slugificarNombreArchivo } from './nombre-archivo.util';

const PLACEHOLDER_PATTERN = /^REEMPLAZAR/i;
/** Bucket privado creado de antemano en el proyecto Supabase (fuera del alcance de este scaffold: no hay migraciones acá). */
const BUCKET = 'validacion-materiales-adjuntos';

function isMissing(value: string | undefined): boolean {
  return !value || PLACEHOLDER_PATTERN.test(value);
}

/**
 * Sube adjuntos vía la API REST de Supabase Storage (`/storage/v1/object/...`)
 * usando `fetch` nativo con la `service_role` key -- mismo criterio que
 * `SupabasePostgrestClient` para PostgREST: sin `@supabase/supabase-js`, el
 * bucket es privado y solo el backend debe poder escribirlo.
 */
@Injectable()
export class SupabaseStorageAdapter implements AdjuntosStoragePort {
  private readonly logger = new Logger(SupabaseStorageAdapter.name);

  public async subir(
    empleadoId: number,
    respuestaId: number,
    archivo: ArchivoASubir,
  ): Promise<ArchivoSubido> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (isMissing(supabaseUrl) || isMissing(serviceRole)) {
      throw new Error(
        'Configuración Supabase incompleta: faltan SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY para subir adjuntos.',
      );
    }

    const timestamp = Date.now();
    const nombreSlug = slugificarNombreArchivo(archivo.nombreOriginal);
    const storagePath = `${empleadoId}/${respuestaId}/${timestamp}-${nombreSlug}`;

    const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: serviceRole as string,
        Authorization: `Bearer ${serviceRole}`,
        'Content-Type': archivo.mimeType || 'application/octet-stream',
        'x-upsert': 'false',
      },
      body: archivo.buffer,
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(
        `Supabase Storage respondió ${response.status} al subir ${storagePath}: ${text.slice(0, 500)}`,
      );
      throw new Error(`No se pudo subir el adjunto al storage (HTTP ${response.status}).`);
    }

    return { storagePath, tamanoBytes: archivo.buffer.length };
  }
}
