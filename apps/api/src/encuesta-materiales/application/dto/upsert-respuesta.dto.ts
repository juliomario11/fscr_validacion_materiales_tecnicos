import { IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class UpsertRespuestaRequestDto {
  @IsNumber({}, { message: 'cantidad debe ser un número válido' })
  @Min(0, { message: 'cantidad no puede ser negativa' })
  public cantidad!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  public observaciones?: string;
}
