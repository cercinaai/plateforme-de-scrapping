import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { BullModule } from '@nestjs/bull';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'crawler'
        }),
    ],
    controllers: [],
    providers: [CrawlerService],
    exports: [CrawlerService]
})
export class CrawlerModule { }
