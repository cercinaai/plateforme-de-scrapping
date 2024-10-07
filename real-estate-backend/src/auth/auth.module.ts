import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema } from '../models/admin.schema';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategys/jwt.strategy';
import { ApiKeyStrategy } from './strategys/apiKey.strategy';
import { RealEstateAuthGuard } from './guard/RealEstate.guard';
import { CrawlerConfig, CrawlerConfigSchema } from 'src/models/CrawlerConfig.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }, { name: CrawlerConfig.name, schema: CrawlerConfigSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60m' },
      })
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ApiKeyStrategy, RealEstateAuthGuard],
  exports: [RealEstateAuthGuard, AuthService, JwtStrategy, ApiKeyStrategy],
})
export class AuthModule { }
