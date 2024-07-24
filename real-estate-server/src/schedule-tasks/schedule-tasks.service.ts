import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrawlerService } from 'src/crawler/crawler.service';

@Injectable()
export class ScheduleTasksService {
    private readonly logger = new Logger(ScheduleTasksService.name);
    constructor(private crawlerService: CrawlerService) {
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async start() {
        await this.crawlerService.startPeriodicCrawlers();
    }


    @Cron(CronExpression.EVERY_10_MINUTES)
    async heath_check() {
        let stat = await this.crawlerService.heathCheck();
        this.logger.log(stat);
    }
}
