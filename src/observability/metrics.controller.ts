import { Controller, Get, Headers, Res, UnauthorizedException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { metricsRegistry } from './metrics';

@Controller()
export class MetricsController {
  @SkipThrottle()
  @Get('metrics')
  async getMetrics(
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const metricsToken = process.env.METRICS_AUTH_TOKEN;
    if (metricsToken && authorization !== `Bearer ${metricsToken}`) {
      throw new UnauthorizedException('Token invalido para acesso as metricas');
    }

    res.setHeader('Content-Type', metricsRegistry.contentType);
    res.send(await metricsRegistry.metrics());
  }
}
