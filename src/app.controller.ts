import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import type { SuccessResponse } from 'utils/interfaces/api-responses.interface';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): SuccessResponse {
    return this.appService.getHello();
  }
}
