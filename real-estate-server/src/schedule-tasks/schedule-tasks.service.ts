import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrawlerService } from 'src/crawler/crawler.service';

@Injectable()
export class ScheduleTasksService implements OnModuleInit {

    private readonly logger = new Logger(ScheduleTasksService.name);
    public static populated_database_finish: boolean = false;

    constructor(private crawlerService: CrawlerService, @Inject(CACHE_MANAGER) private cacheManager: Cache) {

    }

    async onModuleInit() {
        // CHECK IF DATABASE IS EMPTY OR NOT
        await this.crawlerService.populate_database();
    }


    @Cron(CronExpression.EVERY_12_HOURS, { disabled: ScheduleTasksService.populated_database_finish })
    async startPeriodicCrawlers() {
        await this.crawlerService.startPeriodicCrawlers();
    }

    @Cron(CronExpression.EVERY_10_MINUTES, { disabled: ScheduleTasksService.populated_database_finish })
    async crawler_heath_check() {
        let stat = await this.crawlerService.heathCheck();
        this.logger.log(stat);
    }
}
