import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigModuleOptions, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { DataProviderModule } from './data-provider/data-provider.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { CrawlerConfigModule } from './crawler-config/crawler-config.module';
import { JobOfferModule } from './job-offer/job-offer.module';

const configEnv = (): ConfigModuleOptions => {
  if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
    return { envFilePath: 'environments/local.env', isGlobal: true, expandVariables: true }
  }
  return { envFilePath: 'environments/production.env', isGlobal: true, expandVariables: true }
}

@Module({
  imports: [
    ConfigModule.forRoot(configEnv()),
    EventEmitterModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: `mongodb://${configService.get<string>('MONGO_HOST')}:${configService.get<string>('MONGO_PORT')}/${configService.get<string>('MONGO_DATABASE')}`,
        auth: {
          username: configService.get<string>('MONGO_USER'),
          password: configService.get<string>('MONGO_PASSWORD'),
        }
      }),
      inject: [ConfigService]
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    AuthModule,
    DataProviderModule,
    CrawlerConfigModule,
    JobOfferModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
