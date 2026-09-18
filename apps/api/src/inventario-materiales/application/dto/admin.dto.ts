import { IsString, Length } from 'class-validator';

export class AdminLoginRequestDto {
  @IsString()
  @Length(1, 100)
  public usuario!: string;

  @IsString()
  @Length(1, 200)
  public password!: string;
}

export class AdminLoginResponseDto {
  public token!: string;
}

export type EstadoEmpleadoAdmin = 'sin_iniciar' | 'en_progreso' | 'confirmado';

export class EmpleadoAdminResponseDto {
  public id!: number;
  public cedula!: string;
  public nombreCompleto!: string;
  public cargo!: string | null;
  public departamento!: string | null;
  public area!: string | null;
  public proyecto!: string | null;
  public estado!: EstadoEmpleadoAdmin;
  public cantidadItems!: number;
  public fechaConfirmacion!: string | null;
}

export class MaterialAdminResumenDto {
  public codigo!: string;
  public descripcion!: string;
  public unidadMedida!: string;
  public categoria!: string;
}

export class EmpleadoAdminResumenDto {
  public id!: number;
  public cedula!: string;
  public nombreCompleto!: string;
}

export class RespuestaAdminResponseDto {
  public id!: number;
  public empleado!: EmpleadoAdminResumenDto;
  public material!: MaterialAdminResumenDto;
  public cantidad!: number;
  public observaciones!: string | null;
  public serial!: string | null;
  public estado!: 'borrador' | 'confirmado';
  public origen!: 'manual' | 'precargado';
  /** `null` si aún no se valida, o si `origen='manual'` (no aplica). */
  public estadoPrecarga!: 'confirmado' | 'ya_no_lo_tiene' | null;
  /** Lo que trajo el cron de las 5 AM para este ítem -- solo visible aquí (admin), nunca en el portal del técnico. */
  public cantidadPrecargada!: number | null;
  /** `true` si esta fila se creó/confirmó un día distinto al asignado en el calendario de esa cédula. */
  public fueraDeFecha!: boolean;
  public fechaInicio!: string;
  public fechaConfirmacion!: string | null;
  public cantidadAdjuntos!: number;
}
