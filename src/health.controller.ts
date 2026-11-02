import { Controller, Get } from '@nestjs/common';
import { PublicRoute } from './auth/decorator/public-route.decorator';

@PublicRoute()
@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return { status: 'ok' };
  }
}
