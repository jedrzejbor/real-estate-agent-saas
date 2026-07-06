import { Injectable } from '@nestjs/common';
import { APP_NAME } from './common/brand';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: `${APP_NAME} API`,
      timestamp: new Date().toISOString(),
    };
  }
}
