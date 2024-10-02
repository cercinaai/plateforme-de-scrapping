import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigModuleOptions, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
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
    ConfigModule.forRoot(configEnv()),
    EventEmitterModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService]
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    AuthModule,
    DataProviderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
