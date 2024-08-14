import { Module } from '@nestjs/common';
import { DataProviderController } from './data-provider.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Ad, AdSchema } from 'src/models/ad.schema';
import { CrawlerSession, CrawlerSessionSchema } from 'src/models/crawlerSession.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: Ad.name, schema: AdSchema }, { name: CrawlerSession.name, schema: CrawlerSessionSchema }]),],
    controllers: [DataProviderController],
})
export class DataProviderModule { }
