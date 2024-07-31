import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduleTasksService } from './schedule-tasks/schedule-tasks.service';
import { CrawlerModule } from './crawler/crawler.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_CONFIG } from './config/app.config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { ExpressAdapter } from "@bull-board/express";
import { BullBoardModule } from '@bull-board/nestjs';
import { MongooseModule } from '@nestjs/mongoose';
import { DataProcessingModule } from './data-processing/data-processing.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

const PATH = APP_CONFIG.PRODUCTION ? 'prod.env' : 'dev.env';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ envFilePath: `real-estate-env/${PATH}`, isGlobal: true, cache: true }),
    EventEmitterModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        settings: {
          lockDuration: 300000,
          maxStalledCount: 10
        },
        redis: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT')
        }
      }),
      inject: [ConfigService]
    }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI')
      }),
      inject: [ConfigService]
    }),
    PrometheusModule.register(),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT')
          }
        })
      }),
      inject: [ConfigService]
    }),
    CrawlerModule,
    DataProcessingModule,
  ],
  controllers: [AppController],
  providers: [AppService, ScheduleTasksService],
})
export class AppModule { }
