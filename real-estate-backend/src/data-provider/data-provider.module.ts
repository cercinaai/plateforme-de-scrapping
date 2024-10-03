import { Module } from '@nestjs/common';
import { DataProviderController } from './data-provider.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { realEstateAd, realEstateAdSchema } from '../models/ad.schema';
import { CrawlerSession, CrawlerSessionSchema } from '../models/crawlerSession.schema';
import { AuthModule } from '../auth/auth.module';
import { DataProviderService } from './data-provider.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: realEstateAd.name, schema: realEstateAdSchema }, { name: CrawlerSession.name, schema: CrawlerSessionSchema }]),
        AuthModule
    ],
    controllers: [DataProviderController],
    providers: [DataProviderService],
})
export class DataProviderModule { }
