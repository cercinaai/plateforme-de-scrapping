import { Module } from '@nestjs/common';
import { DataProviderController } from './data-provider.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Ad, AdSchema } from 'src/models/ad.schema';
import { CrawlerSession, CrawlerSessionSchema } from 'src/models/crawlerSession.schema';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Ad.name, schema: AdSchema }, { name: CrawlerSession.name, schema: CrawlerSessionSchema }]),
        AuthModule
    ],
    controllers: [DataProviderController],
})
export class DataProviderModule { }
