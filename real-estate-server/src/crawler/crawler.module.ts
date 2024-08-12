import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { BoncoinCrawler } from './boncoin/boncoin.crawler';
import { DataProcessingModule } from 'src/data-processing/data-processing.module';
import { SelogerCrawler } from './seloger/seloger.crawler';
import { ProxyService } from './proxy.service';
import { BieniciCrawler } from './bienici/bienici.crawler';
import { LogicImmoCrawler } from './logic-immo/logicimmo.crawler';
import { MongooseModule } from '@nestjs/mongoose';
import { Ad, AdSchema } from 'src/models/ad.schema';
import { CrawlerSession, CrawlerSessionSchema } from 'src/models/crawlerSession.schema';
import { SchedulerRegistry } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';


@Module({
    imports: [
        BullModule.registerQueue({
            name: 'crawler',
        }),
        BullBoardModule.forFeature({
            name: 'crawler',
            adapter: BullAdapter,
        }),
        MongooseModule.forFeature([{ name: Ad.name, schema: AdSchema }, { name: CrawlerSession.name, schema: CrawlerSessionSchema }]),
        HttpModule.register({
            timeout: 60000
        }),
        DataProcessingModule,
    ],
    controllers: [],
    providers: [CrawlerService, ProxyService, BoncoinCrawler, SelogerCrawler, BieniciCrawler, LogicImmoCrawler, SchedulerRegistry],
    exports: [CrawlerService]
})
export class CrawlerModule { }
