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
  public empleado!: EmpleadoAdminResumenDto;
  public material!: MaterialAdminResumenDto;
  public cantidad!: number;
  public observaciones!: string | null;
  public estado!: 'borrador' | 'confirmado';
  public fechaInicio!: string;
  public fechaConfirmacion!: string | null;
  public cantidadAdjuntos!: number;
}
