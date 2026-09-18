import { Inject, Injectable } from '@nestjs/common';

import { Material } from '../../domain/entity/material.entity';
import {
  MATERIALES_REPOSITORY,
  type MaterialesRepository,
} from '../../domain/repository/materiales.repository';

@Injectable()
export class ListarMaterialesUseCase {
  public constructor(
    @Inject(MATERIALES_REPOSITORY)
    private readonly materialesRepository: MaterialesRepository,
  ) {}

  public async execute(): Promise<Material[]> {
    return this.materialesRepository.findAllActivos();
  }
}
