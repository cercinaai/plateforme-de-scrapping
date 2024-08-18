import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
    getHello(): string {
        return 'Hello World!';
    }
}
