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
}
