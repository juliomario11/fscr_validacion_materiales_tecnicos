import { Injectable } from '@nestjs/common';

import { EmpleadoEncuesta } from '../../domain/entity/empleado-encuesta.entity';
import { EmpleadosEncuestaRepository } from '../../domain/repository/empleados-encuesta.repository';
import { SupabasePostgrestClient } from './supabase-postgrest.client';
import { SUPABASE_SCHEMA } from './supabase.schema';

interface EmpleadoEncuestaRow {
  id: number;
  cedula: string;
  nombre_completo: string;
  activo: boolean;
  created_at: string;
  nombres: string | null;
  apellidos: string | null;
  cargo: string | null;
  departamento: string | null;
  area: string | null;
  proyecto: string | null;
  celular: string | null;
  email: string | null;
}

function toEmpleado(row: EmpleadoEncuestaRow): EmpleadoEncuesta {
  return {
    id: row.id,
    cedula: row.cedula,
    nombreCompleto: row.nombre_completo,
    activo: row.activo,
    createdAt: row.created_at,
    nombres: row.nombres,
    apellidos: row.apellidos,
    cargo: row.cargo,
    departamento: row.departamento,
    area: row.area,
    proyecto: row.proyecto,
    celular: row.celular,
    email: row.email,
  };
}

@Injectable()
export class EmpleadosEncuestaSupabaseRepository implements EmpleadosEncuestaRepository {
  private readonly table = 'empleados_encuesta';

  public constructor(private readonly client: SupabasePostgrestClient) {}

  public async findActivoByCedula(cedula: string): Promise<EmpleadoEncuesta | null> {
    const qs = new URLSearchParams();
    qs.set('cedula', `eq.${cedula}`);
    qs.set('activo', 'eq.true');
    qs.set(
      'select',
      'id,cedula,nombre_completo,activo,created_at,nombres,apellidos,cargo,departamento,area,proyecto,celular,email',
    );
    const rows = await this.client.request<EmpleadoEncuestaRow[]>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows[0] ? toEmpleado(rows[0]) : null;
  }

  public async findAllActivos(): Promise<EmpleadoEncuesta[]> {
    const qs = new URLSearchParams();
    qs.set('activo', 'eq.true');
    qs.set(
      'select',
      'id,cedula,nombre_completo,activo,created_at,nombres,apellidos,cargo,departamento,area,proyecto,celular,email',
    );
    qs.set('order', 'nombre_completo.asc');
    const rows = await this.client.request<EmpleadoEncuestaRow[]>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows.map(toEmpleado);
  }
}
