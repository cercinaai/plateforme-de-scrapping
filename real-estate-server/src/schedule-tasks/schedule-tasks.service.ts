import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CrawlerService } from 'src/crawler/crawler.service';

@Injectable()
export class ScheduleTasksService {
    private readonly logger = new Logger(ScheduleTasksService.name);

    constructor(private crawlerService: CrawlerService) { }

    @Cron('20 * * * * *')
    async start() {
        await this.crawlerService.startPeriodicCrawlers();
    }

    @Cron('0 0 1 * *')
    async startAdsPinging() {
        this.logger.log('Starting ads pinging');
    }

    @Cron('45 * * * * *')
    async crawler_healthCheck() {
        const health_check_info = this.crawlerService.crawler_healthCheck();
        if (health_check_info.length == 0) return;
        this.logger.log(health_check_info);
    }


}
