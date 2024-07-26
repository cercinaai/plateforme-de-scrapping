import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { BoncoinCrawler } from './boncoin/boncoin.crawler';
import { DataProcessingModule } from 'src/data-processing/data-processing.module';


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
    providers: [CrawlerService, BoncoinCrawler],
    exports: [CrawlerService]
})
export class CrawlerModule { }
