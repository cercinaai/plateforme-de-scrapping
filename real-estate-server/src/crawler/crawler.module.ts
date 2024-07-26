import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { BoncoinCrawler } from './boncoin/boncoin.crawler';
import { DataProcessingModule } from 'src/data-processing/data-processing.module';
import { SelogerCrawler } from './seloger/seloger.crawler';
import { ProxyService } from './proxy.service';


@Module({
    imports: [
        BullModule.registerQueue({
            name: 'crawler'
        }),
        BullBoardModule.forFeature({
            name: 'crawler',
            adapter: BullAdapter,
        }),
        DataProcessingModule
    ],
    controllers: [],
    providers: [CrawlerService, ProxyService, BoncoinCrawler, SelogerCrawler],
    exports: [CrawlerService]
})
export class CrawlerModule { }
