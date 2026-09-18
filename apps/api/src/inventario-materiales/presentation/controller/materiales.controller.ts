import { Controller, Get } from '@nestjs/common';

import { MaterialResponseDto } from '../../application/dto/material.dto';
import { ListarMaterialesUseCase } from '../../application/use-case/listar-materiales.use-case';
import { Material } from '../../domain/entity/material.entity';

function toDto(material: Material): MaterialResponseDto {
  return {
    id: material.id,
    codigo: material.codigo,
    descripcion: material.descripcion,
    unidadMedida: material.unidadMedida,
    categoria: material.categoria,
  };
}

/** Sin `@Public()`: protegido por `SessionAuthGuard` global -- el catálogo solo se expone tras login, aunque no dependa del empleado. */
@Controller('api/v1/validacion-materiales/materiales')
export class MaterialesController {
  public constructor(private readonly listarMateriales: ListarMaterialesUseCase) {}

  @Get()
  public async list(): Promise<MaterialResponseDto[]> {
    const materiales = await this.listarMateriales.execute();
    return materiales.map(toDto);
  }
}
