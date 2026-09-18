import { Injectable } from '@nestjs/common';

import { EmpleadoInventario } from '../../domain/entity/empleado-inventario.entity';
import { EmpleadosInventarioRepository } from '../../domain/repository/empleados-inventario.repository';
import { SupabasePostgrestClient } from './supabase-postgrest.client';
import { SUPABASE_SCHEMA } from './supabase.schema';

interface EmpleadoInventarioRow {
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

/** Algunas filas de RRHH (Personal_Completo.xlsx) traen el texto literal "NULL" en vez de una celda vacía -- a veces repetido, ej. "NULL NULL". Se trata igual que un dato faltante. */
const TEXTO_NULO_LITERAL = /^(null\s*)+$/i;

function limpiarTextoNulo(valor: string | null): string | null {
  if (valor === null) return null;
  const recortado = valor.trim();
  if (recortado === '' || TEXTO_NULO_LITERAL.test(recortado)) return null;
  return recortado;
}

function toEmpleado(row: EmpleadoInventarioRow): EmpleadoInventario {
  return {
    id: row.id,
    cedula: row.cedula,
    nombreCompleto: row.nombre_completo,
    activo: row.activo,
    createdAt: row.created_at,
    nombres: limpiarTextoNulo(row.nombres),
    apellidos: limpiarTextoNulo(row.apellidos),
    cargo: limpiarTextoNulo(row.cargo),
    departamento: limpiarTextoNulo(row.departamento),
    area: limpiarTextoNulo(row.area),
    proyecto: limpiarTextoNulo(row.proyecto),
    celular: limpiarTextoNulo(row.celular),
    email: limpiarTextoNulo(row.email),
  };
}

@Injectable()
export class EmpleadosInventarioSupabaseRepository implements EmpleadosInventarioRepository {
  private readonly table = 'empleados_inventario';

  public constructor(private readonly client: SupabasePostgrestClient) {}

  public async findActivoByCedula(cedula: string): Promise<EmpleadoInventario | null> {
    const qs = new URLSearchParams();
    qs.set('cedula', `eq.${cedula}`);
    qs.set('activo', 'eq.true');
    qs.set(
      'select',
      'id,cedula,nombre_completo,activo,created_at,nombres,apellidos,cargo,departamento,area,proyecto,celular,email',
    );
    const rows = await this.client.request<EmpleadoInventarioRow[]>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows[0] ? toEmpleado(rows[0]) : null;
  }

  public async findAllActivos(): Promise<EmpleadoInventario[]> {
    const qs = new URLSearchParams();
    qs.set('activo', 'eq.true');
    qs.set(
      'select',
      'id,cedula,nombre_completo,activo,created_at,nombres,apellidos,cargo,departamento,area,proyecto,celular,email',
    );
    qs.set('order', 'nombre_completo.asc');
    const rows = await this.client.request<EmpleadoInventarioRow[]>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows.map(toEmpleado);
  }
}
