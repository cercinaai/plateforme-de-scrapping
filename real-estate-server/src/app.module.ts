import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduleTasksService } from './schedule-tasks/schedule-tasks.service';
import { CrawlerModule } from './crawler/crawler.module';
import { ConfigModule } from '@nestjs/config';
import { APP_CONFIG } from './config/app.config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

const PATH = APP_CONFIG.PRODUCTION ? 'prod.env' : 'dev.env';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ envFilePath: `env/${PATH}`, isGlobal: true, cache: true }),
    EventEmitterModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379
      }
    }),
    PrometheusModule.register(),
    CrawlerModule,
  ],
  controllers: [AppController],
  providers: [AppService, ScheduleTasksService],
})
export class AppModule { }
