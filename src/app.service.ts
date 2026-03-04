import { Injectable } from '@nestjs/common';
import { SuccessResponse } from '../utils/interfaces/api-responses.interface';

@Injectable()
export class AppService {
  getHello(): SuccessResponse {
    return {
      status: true,
      message: 'Welcome to Task manager API',
    };
  }
  }
