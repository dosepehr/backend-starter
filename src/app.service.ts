import { Injectable } from '@nestjs/common';
import { SuccessResponse } from '../utils/interfaces/api-responses.interface';

@Injectable()
export class AppService {
  getHello() {
    return null;
  }
}
