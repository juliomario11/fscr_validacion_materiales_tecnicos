import { Injectable } from '@nestjs/common';

import { AdjuntoResumen, RespuestaConDetalle } from '../../domain/entity/respuesta-detalle.entity';
import { EstadoPrecarga, RespuestaInventario } from '../../domain/entity/respuesta-inventario.entity';
import {
  InsertPrecargadoPayload,
  RespuestasInventarioRepository,
  UpsertRespuestaPayload,
} from '../../domain/repository/respuestas-inventario.repository';
import { MATERIAL_SELECT_COLUMNS, MaterialRow, toMaterial } from './materiales.supabase-repository';
import { SupabasePostgrestClient } from './supabase-postgrest.client';
import { SUPABASE_SCHEMA } from './supabase.schema';

interface RespuestaRow {
  id: number;
  empleado_id: number;
  material_id: number;
  cantidad: number | string;
  observaciones: string | null;
  serial: string | null;
  serial_sistema: string | null;
  estado: 'borrador' | 'confirmado';
  origen: 'manual' | 'precargado';
  estado_precarga: EstadoPrecarga | null;
  cantidad_precargada: number | string | null;
  fuera_de_fecha: boolean;
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

/** Fila con los embeds PostgREST resueltos vía FK: `materiales` (to-one, por `material_id`) y `inventario_adjuntos` (to-many, por `respuesta_id`). */
interface RespuestaConDetalleRow extends RespuestaRow {
  materiales: MaterialRow | null;
  inventario_adjuntos: AdjuntoEmbebidoRow[] | null;
}

const RESPUESTA_COLUMNS =
  'id,empleado_id,material_id,cantidad,observaciones,serial,serial_sistema,estado,origen,estado_precarga,cantidad_precargada,fuera_de_fecha,fecha_inicio,fecha_confirmacion,created_at,updated_at';

const RESPUESTA_CON_DETALLE_SELECT =
  `${RESPUESTA_COLUMNS},materiales(${MATERIAL_SELECT_COLUMNS}),inventario_adjuntos(id,nombre_archivo,subido_en)`;

function toRespuesta(row: RespuestaRow): RespuestaInventario {
  return {
    id: row.id,
    empleadoId: row.empleado_id,
    materialId: row.material_id,
    cantidad: Number(row.cantidad),
    observaciones: row.observaciones,
    serial: row.serial,
    serialSistema: row.serial_sistema,
    estado: row.estado,
    origen: row.origen,
    estadoPrecarga: row.estado_precarga,
    cantidadPrecargada: row.cantidad_precargada === null ? null : Number(row.cantidad_precargada),
    fueraDeFecha: row.fuera_de_fecha,
    fechaInicio: row.fecha_inicio,
    fechaConfirmacion: row.fecha_confirmacion,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRespuestaConDetalle(row: RespuestaConDetalleRow): RespuestaConDetalle {
  const adjuntos: AdjuntoResumen[] = (row.inventario_adjuntos ?? []).map((a) => ({
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
export class RespuestasInventarioSupabaseRepository implements RespuestasInventarioRepository {
  private readonly table = 'inventario_respuestas';

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

  public async findAllConDetalle(): Promise<RespuestaConDetalle[]> {
    const qs = new URLSearchParams();
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
  ): Promise<RespuestaInventario | null> {
    const qs = new URLSearchParams();
    qs.set('empleado_id', `eq.${empleadoId}`);
    qs.set('material_id', `eq.${materialId}`);
    qs.set('origen', 'eq.manual');
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

  public async insert(payload: UpsertRespuestaPayload): Promise<RespuestaInventario> {
    const rows = await this.client.request<RespuestaRow[]>(this.table, {
      method: 'POST',
      schema: SUPABASE_SCHEMA,
      prefer: 'return=representation',
      body: {
        empleado_id: payload.empleadoId,
        material_id: payload.materialId,
        cantidad: payload.cantidad,
        observaciones: payload.observaciones,
        serial: payload.serial,
        fuera_de_fecha: payload.fueraDeFecha,
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
    payload: Pick<UpsertRespuestaPayload, 'cantidad' | 'observaciones' | 'serial' | 'fueraDeFecha'>,
  ): Promise<RespuestaInventario> {
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
        serial: payload.serial,
        fuera_de_fecha: payload.fueraDeFecha,
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

  public async findBorradoresByEmpleado(empleadoId: number): Promise<RespuestaInventario[]> {
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

  public async insertPrecargados(payloads: ReadonlyArray<InsertPrecargadoPayload>): Promise<void> {
    if (payloads.length === 0) return;
    const body = payloads.map((p) => ({
      empleado_id: p.empleadoId,
      material_id: p.materialId,
      serial: p.serial,
      // Congelado para siempre en el insert -- aunque el técnico corrija
      // "serial" al confirmar, este campo sigue mostrando lo que trajo el
      // cron originalmente.
      serial_sistema: p.serial,
      // Un renglón por serial precargado = 1 unidad a validar. Si el
      // técnico dice "ya no lo tengo" pasa a 0 (ver actualizarEstadoPrecarga).
      cantidad: 1,
      observaciones: null,
      origen: 'precargado',
      estado_precarga: null,
      cantidad_precargada: p.cantidadPrecargada,
      serial_precargado_id: p.serialPrecargadoId,
      fuera_de_fecha: p.fueraDeFecha,
    }));
    // Inserción simple -- la idempotencia (no reinsertar lo que ya se
    // materializó en un login anterior del mismo día) la garantiza el
    // caller (`MaterializarPrecargaUseCase`) filtrando contra
    // `findPrecargadosByEmpleado` ANTES de llamar aquí. No se usa
    // `Prefer: resolution=ignore-duplicates` porque el índice único real es
    // sobre `coalesce(serial, '')` (una expresión), y PostgREST solo puede
    // dirigir `on_conflict` a columnas literales -- más simple resolverlo en
    // la capa de aplicación que pelear con ese desajuste.
    await this.client.request<unknown>(this.table, {
      method: 'POST',
      schema: SUPABASE_SCHEMA,
      prefer: 'return=minimal',
      body,
    });
  }

  public async findPrecargadosByEmpleado(empleadoId: number): Promise<RespuestaInventario[]> {
    const qs = new URLSearchParams();
    qs.set('empleado_id', `eq.${empleadoId}`);
    qs.set('origen', 'eq.precargado');
    qs.set('select', RESPUESTA_COLUMNS);
    const rows = await this.client.request<RespuestaRow[]>(`${this.table}?${qs.toString()}`, {
      schema: SUPABASE_SCHEMA,
    });
    return rows.map(toRespuesta);
  }

  public async actualizarEstadoPrecarga(
    id: number,
    estadoPrecarga: EstadoPrecarga,
    cantidad: number,
    serial?: string | null,
    observaciones?: string | null,
  ): Promise<RespuestaInventario> {
    const qs = new URLSearchParams();
    qs.set('id', `eq.${id}`);
    qs.set('select', RESPUESTA_COLUMNS);
    const body: Record<string, unknown> = {
      estado_precarga: estadoPrecarga,
      cantidad,
    };
    // `undefined` (no lo mandó el frontend) no se incluye -- deja el valor
    // actual intacto. `null`/string sí se aplican explícitamente.
    if (serial !== undefined) body.serial = serial;
    if (observaciones !== undefined) body.observaciones = observaciones;

    const rows = await this.client.request<RespuestaRow[]>(`${this.table}?${qs.toString()}`, {
      method: 'PATCH',
      schema: SUPABASE_SCHEMA,
      prefer: 'return=representation',
      body,
    });
    const updated = rows[0];
    if (!updated) {
      throw new Error('Supabase no devolvió el ítem precargado actualizado.');
    }
    return toRespuesta(updated);
  }
}
