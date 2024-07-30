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


@Module({
    imports: [
        BullModule.registerQueue({
            name: 'crawler',
            settings: {
                lockDuration: 300000,
                maxStalledCount: 10
            }
        }),
        BullBoardModule.forFeature({
            name: 'crawler',
            adapter: BullAdapter,
        }),
        DataProcessingModule,
    ],
    controllers: [],
    providers: [CrawlerService, ProxyService, BoncoinCrawler, SelogerCrawler, BieniciCrawler, LogicImmoCrawler],
    exports: [CrawlerService]
})
export class CrawlerModule { }
