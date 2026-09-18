import { IsString, Length, Matches } from 'class-validator';

export class LoginRequestDto {
  @IsString()
  @Length(1, 20)
  @Matches(/^\d+$/, { message: 'cedula debe contener solo dígitos' })
  public cedula!: string;
}

export class LoginResponseDto {
  public empleadoId!: number;
  public cedula!: string;
  public nombreCompleto!: string;
  public nombres!: string | null;
  public apellidos!: string | null;
  public cargo!: string | null;
  public departamento!: string | null;
  public area!: string | null;
  public proyecto!: string | null;
  public celular!: string | null;
  public email!: string | null;
}
