import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'Real Estate Agent SaaS API',
      timestamp: new Date().toISOString(),
    };
  }
}
