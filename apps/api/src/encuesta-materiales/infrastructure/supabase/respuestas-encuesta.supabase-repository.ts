import { Injectable } from '@nestjs/common';

import { AdjuntoResumen, RespuestaConDetalle } from '../../domain/entity/respuesta-detalle.entity';
import { RespuestaEncuesta } from '../../domain/entity/respuesta-encuesta.entity';
import {
  RespuestasEncuestaRepository,
  UpsertRespuestaPayload,
} from '../../domain/repository/respuestas-encuesta.repository';
import { MATERIAL_SELECT_COLUMNS, MaterialRow, toMaterial } from './materiales.supabase-repository';
import { SupabasePostgrestClient } from './supabase-postgrest.client';
import { SUPABASE_SCHEMA } from './supabase.schema';

interface RespuestaRow {
  id: number;
  empleado_id: number;
  material_id: number;
  cantidad: number | string;
  observaciones: string | null;
  estado: 'borrador' | 'confirmado';
  fecha_inicio: string;
  fecha_confirmacion: string | null;
  created_at: string;
  updated_at: string;
}

interface AdjuntoEmbebidoRow {
  id: number;
  nombre_archivo: string;
  subido_en: string;
}

/** Fila con los embeds PostgREST resueltos vía FK: `materiales` (to-one, por `material_id`) y `encuesta_adjuntos` (to-many, por `respuesta_id`). */
interface RespuestaConDetalleRow extends RespuestaRow {
  materiales: MaterialRow | null;
  encuesta_adjuntos: AdjuntoEmbebidoRow[] | null;
}

const RESPUESTA_COLUMNS =
  'id,empleado_id,material_id,cantidad,observaciones,estado,fecha_inicio,fecha_confirmacion,created_at,updated_at';

const RESPUESTA_CON_DETALLE_SELECT =
  `${RESPUESTA_COLUMNS},materiales(${MATERIAL_SELECT_COLUMNS}),encuesta_adjuntos(id,nombre_archivo,subido_en)`;

function toRespuesta(row: RespuestaRow): RespuestaEncuesta {
  return {
    id: row.id,
    empleadoId: row.empleado_id,
    materialId: row.material_id,
    cantidad: Number(row.cantidad),
    observaciones: row.observaciones,
    estado: row.estado,
    fechaInicio: row.fecha_inicio,
    fechaConfirmacion: row.fecha_confirmacion,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRespuestaConDetalle(row: RespuestaConDetalleRow): RespuestaConDetalle {
  const adjuntos: AdjuntoResumen[] = (row.encuesta_adjuntos ?? []).map((a) => ({
    id: a.id,
    nombreArchivo: a.nombre_archivo,
    subidoEn: a.subido_en,
  }));

  // `materiales` no debería venir null (FK NOT NULL + catálogo cerrado que
  // nunca se borra), pero si PostgREST no puede resolver el embed se prefiere
  // un material "fantasma" a reventar el listado completo por una sola fila.
  const material = row.materiales
    ? toMaterial(row.materiales)
    : {
        id: row.material_id,
        codigo: '',
        descripcion: '(material no disponible)',
        unidadMedida: '',
        categoria: '',
        activo: false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

  return { ...toRespuesta(row), material, adjuntos };
}

@Injectable()
export class RespuestasEncuestaSupabaseRepository implements RespuestasEncuestaRepository {
  private readonly table = 'encuesta_respuestas';

  public constructor(private readonly client: SupabasePostgrestClient) {}

  public async findAllByEmpleadoConDetalle(empleadoId: number): Promise<RespuestaConDetalle[]> {
    const qs = new URLSearchParams();
    qs.set('empleado_id', `eq.${empleadoId}`);
    qs.set('select', RESPUESTA_CON_DETALLE_SELECT);
    qs.set('order', 'id.asc');
    const rows = await this.client.request<RespuestaConDetalleRow[]>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows.map(toRespuestaConDetalle);
  }

  public async findByEmpleadoYMaterial(
    empleadoId: number,
    materialId: number,
  ): Promise<RespuestaEncuesta | null> {
    const qs = new URLSearchParams();
    qs.set('empleado_id', `eq.${empleadoId}`);
    qs.set('material_id', `eq.${materialId}`);
    qs.set('select', RESPUESTA_COLUMNS);
    const rows = await this.client.request<RespuestaRow[]>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows[0] ? toRespuesta(rows[0]) : null;
  }

  public async findByIdConDetalle(id: number): Promise<RespuestaConDetalle | null> {
    const qs = new URLSearchParams();
    qs.set('id', `eq.${id}`);
    qs.set('select', RESPUESTA_CON_DETALLE_SELECT);
    const rows = await this.client.request<RespuestaConDetalleRow[]>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows[0] ? toRespuestaConDetalle(rows[0]) : null;
  }

  public async insert(payload: UpsertRespuestaPayload): Promise<RespuestaEncuesta> {
    const rows = await this.client.request<RespuestaRow[]>(this.table, {
      method: 'POST',
      schema: SUPABASE_SCHEMA,
      prefer: 'return=representation',
      body: {
        empleado_id: payload.empleadoId,
        material_id: payload.materialId,
        cantidad: payload.cantidad,
        observaciones: payload.observaciones,
      },
    });
    const created = rows[0];
    if (!created) {
      throw new Error('Supabase no devolvió la respuesta recién creada.');
    }
    return toRespuesta(created);
  }

  public async update(
    id: number,
    payload: Pick<UpsertRespuestaPayload, 'cantidad' | 'observaciones'>,
  ): Promise<RespuestaEncuesta> {
    const qs = new URLSearchParams();
    qs.set('id', `eq.${id}`);
    qs.set('select', RESPUESTA_COLUMNS);
    const rows = await this.client.request<RespuestaRow[]>(`${this.table}?${qs.toString()}`, {
      method: 'PATCH',
      schema: SUPABASE_SCHEMA,
      prefer: 'return=representation',
      body: {
        cantidad: payload.cantidad,
        observaciones: payload.observaciones,
      },
    });
    const updated = rows[0];
    if (!updated) {
      throw new Error('Supabase no devolvió la respuesta actualizada.');
    }
    return toRespuesta(updated);
  }

  public async delete(id: number): Promise<void> {
    const qs = new URLSearchParams();
    qs.set('id', `eq.${id}`);
    await this.client.request<unknown>(`${this.table}?${qs.toString()}`, {
      method: 'DELETE',
      schema: SUPABASE_SCHEMA,
    });
  }

  public async findBorradoresByEmpleado(empleadoId: number): Promise<RespuestaEncuesta[]> {
    const qs = new URLSearchParams();
    qs.set('empleado_id', `eq.${empleadoId}`);
    qs.set('estado', 'eq.borrador');
    qs.set('select', RESPUESTA_COLUMNS);
    const rows = await this.client.request<RespuestaRow[]>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows.map(toRespuesta);
  }

  public async confirmarBorradoresDeEmpleado(
    empleadoId: number,
    fechaConfirmacionBogota: string,
  ): Promise<RespuestaConDetalle[]> {
    const qs = new URLSearchParams();
    qs.set('empleado_id', `eq.${empleadoId}`);
    qs.set('estado', 'eq.borrador');
    // PostgREST soporta `select=` (con embeds incluidos) también en
    // escrituras junto con `Prefer: return=representation` -- una sola
    // consulta para actualizar Y traer de vuelta el material embebido, sin
    // un segundo round-trip de re-lectura.
    qs.set('select', RESPUESTA_CON_DETALLE_SELECT);
    const rows = await this.client.request<RespuestaConDetalleRow[]>(`${this.table}?${qs.toString()}`, {
      method: 'PATCH',
      schema: SUPABASE_SCHEMA,
      prefer: 'return=representation',
      body: {
        estado: 'confirmado',
        fecha_confirmacion: fechaConfirmacionBogota,
      },
    });
    return rows.map(toRespuestaConDetalle);
  }
}
