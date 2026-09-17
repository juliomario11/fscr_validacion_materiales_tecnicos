import { Injectable, Logger } from '@nestjs/common';

import { SupabaseConfigError, SupabaseRequestError } from './supabase.errors';

export interface PostgrestRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  schema?: string;
  body?: unknown;
  prefer?: string;
}

const PLACEHOLDER_PATTERN = /^REEMPLAZAR/i;

function isMissing(value: string | undefined): boolean {
  return !value || PLACEHOLDER_PATTERN.test(value);
}

/**
 * Cliente PostgREST mínimo, sin estado, basado en `fetch` nativo (Node 22) --
 * mismo estilo que el proyecto hermano `fscr_proveedores_factura`, en vez de
 * `@supabase/supabase-js` (evita una dependencia completa solo para hacer
 * requests HTTP simples con la `service_role` key). SIEMPRE usa
 * `SUPABASE_SERVICE_ROLE_KEY` -- las 4 tablas del schema tienen RLS
 * habilitado SIN policies (deny-all salvo `service_role`), así que la
 * `anon key` nunca serviría para nada aquí y no se contempla como opción.
 */
@Injectable()
export class SupabasePostgrestClient {
  private readonly logger = new Logger(SupabasePostgrestClient.name);

  public async request<TResponse>(path: string, options: PostgrestRequestOptions = {}): Promise<TResponse> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const missing: string[] = [];
    if (isMissing(supabaseUrl)) missing.push('SUPABASE_URL');
    if (isMissing(serviceRole)) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (missing.length > 0 || supabaseUrl === undefined || serviceRole === undefined) {
      const message = `Configuración Supabase incompleta: faltan o tienen placeholder ${missing.join(', ')}`;
      this.logger.error(message);
      throw new SupabaseConfigError(missing);
    }

    const method = options.method ?? 'GET';
    const headers: Record<string, string> = {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      'Content-Type': 'application/json',
    };
    if (options.prefer) headers.Prefer = options.prefer;
    if (options.schema) {
      headers['Accept-Profile'] = options.schema;
      if (method !== 'GET') headers['Content-Profile'] = options.schema;
    }

    const requestUrl = `${supabaseUrl}/rest/v1/${path.replace(/^\//, '')}`;
    const response = await fetch(requestUrl, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();

    if (!response.ok) {
      this.logger.error(
        `Supabase respondió ${response.status} para ${method} ${path}: ${text.slice(0, 500)}`,
      );
      throw new SupabaseRequestError(response.status, path, text);
    }

    const data: unknown = text ? JSON.parse(text) : null;
    return data as TResponse;
  }
}
