import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduleTasksService } from './schedule-tasks/schedule-tasks.service';
import { CrawlerModule } from './crawler/crawler.module';
import { ConfigModule, ConfigModuleOptions, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { ExpressAdapter } from "@bull-board/express";
import { BullBoardModule } from '@bull-board/nestjs';
import { MongooseModule } from '@nestjs/mongoose';
import { DataProcessingModule } from './data-processing/data-processing.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { AuthModule } from './auth/auth.module';
import { DataProviderModule } from './data-provider/data-provider.module';
import { ThrottlerModule } from '@nestjs/throttler';

const configEnv = (): ConfigModuleOptions => {
  if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
    return { envFilePath: 'real-estate.env', isGlobal: true, expandVariables: true }
  }
  return { ignoreEnvFile: true, isGlobal: true }
}

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(configEnv()),
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
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService]
    }),
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
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    CrawlerModule,
    DataProcessingModule,
    AuthModule,
    DataProviderModule,
  ],
  controllers: [AppController],
  providers: [AppService, ScheduleTasksService],
})
export class AppModule { }
