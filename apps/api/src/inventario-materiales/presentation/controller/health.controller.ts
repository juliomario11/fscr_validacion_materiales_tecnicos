import { Controller, Get } from '@nestjs/common';

import { Public } from '../../../common/decorators/public.decorator';
import { HealthResponseDto } from '../../application/dto/health.dto';

@Controller('api/v1/validacion-materiales')
export class HealthController {
  @Get('health')
  @Public()
  public health(): HealthResponseDto {
    return { status: 'ok' };
  }
}
