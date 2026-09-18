import { Injectable } from '@nestjs/common';

import { CalendarioInventarioRepository } from '../../domain/repository/calendario-inventario.repository';
import { SupabasePostgrestClient } from './supabase-postgrest.client';
import { SUPABASE_SCHEMA } from './supabase.schema';

interface CalendarioRow {
  id: number;
}

@Injectable()
export class CalendarioInventarioSupabaseRepository implements CalendarioInventarioRepository {
  private readonly table = 'calendario_inventario';

  public constructor(private readonly client: SupabasePostgrestClient) {}

  public async tieneFechaAsignadaHoy(cedula: string, fecha: string): Promise<boolean> {
    const qs = new URLSearchParams();
    qs.set('cedula', `eq.${cedula}`);
    qs.set('fecha_asignada', `eq.${fecha}`);
    qs.set('activo', 'eq.true');
    qs.set('select', 'id');
    qs.set('limit', '1');
    const rows = await this.client.request<CalendarioRow[]>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows.length > 0;
  }
}
