import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { BoncoinCrawler } from './boncoin/boncoin.crawler';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'crawler'
        }),
        BullBoardModule.forFeature({
            name: 'crawler',
            adapter: BullAdapter,
        }),
    ],
    controllers: [],
    providers: [CrawlerService, BoncoinCrawler],
    exports: [CrawlerService]
})
export class CrawlerModule { }
