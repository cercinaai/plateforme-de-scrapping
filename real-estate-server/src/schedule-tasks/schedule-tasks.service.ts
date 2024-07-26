import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrawlerService } from 'src/crawler/crawler.service';

@Injectable()
export class ScheduleTasksService implements OnModuleInit {

    private readonly logger = new Logger(ScheduleTasksService.name);

    constructor(private crawlerService: CrawlerService) { }

    async onModuleInit() {
        await this.start();
    }

    // @Cron(CronExpression.EVERY_12_HOURS)
    async start() {
        await this.crawlerService.startPeriodicCrawlers();
    }


    @Cron(CronExpression.EVERY_10_MINUTES)
    async crawler_heath_check() {
        let stat = await this.crawlerService.heathCheck();
        this.logger.log(stat);
    }
}
