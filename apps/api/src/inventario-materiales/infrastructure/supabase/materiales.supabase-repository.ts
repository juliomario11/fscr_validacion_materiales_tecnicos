import { Injectable } from '@nestjs/common';

import { Material } from '../../domain/entity/material.entity';
import { MaterialesRepository } from '../../domain/repository/materiales.repository';
import { SupabasePostgrestClient } from './supabase-postgrest.client';
import { SUPABASE_SCHEMA } from './supabase.schema';

/** Exportado (no solo usado acá) para que `RespuestasInventarioSupabaseRepository` reutilice el mismo mapeo al leer el embed `materiales(...)`. */
export interface MaterialRow {
  id: number;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  categoria: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export function toMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    codigo: row.codigo,
    descripcion: row.descripcion,
    unidadMedida: row.unidad_medida,
    categoria: row.categoria,
    activo: row.activo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const MATERIAL_SELECT_COLUMNS =
  'id,codigo,descripcion,unidad_medida,categoria,activo,created_at,updated_at';

@Injectable()
export class MaterialesSupabaseRepository implements MaterialesRepository {
  private readonly table = 'materiales';

  public constructor(private readonly client: SupabasePostgrestClient) {}

  public async findAllActivos(): Promise<Material[]> {
    const qs = new URLSearchParams();
    qs.set('select', MATERIAL_SELECT_COLUMNS);
    qs.set('activo', 'eq.true');
    // Pedido explícito del negocio: agrupado por categoría y, dentro de
    // cada categoría, alfabético por descripción. El catálogo es cerrado
    // (358 filas) -- muy por debajo del límite por página de PostgREST, no
    // hace falta paginar internamente como en otros listados más grandes.
    qs.set('order', 'categoria.asc,descripcion.asc');
    const rows = await this.client.request<MaterialRow[]>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows.map(toMaterial);
  }

  public async findActivoById(id: number): Promise<Material | null> {
    const qs = new URLSearchParams();
    qs.set('id', `eq.${id}`);
    qs.set('activo', 'eq.true');
    qs.set('select', MATERIAL_SELECT_COLUMNS);
    const rows = await this.client.request<MaterialRow[]>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows[0] ? toMaterial(rows[0]) : null;
  }

  public async findActivoByCodigo(codigo: string): Promise<Material | null> {
    const qs = new URLSearchParams();
    qs.set('codigo', `eq.${codigo}`);
    qs.set('activo', 'eq.true');
    qs.set('select', MATERIAL_SELECT_COLUMNS);
    const rows = await this.client.request<MaterialRow[]>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows[0] ? toMaterial(rows[0]) : null;
  }
}
