import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CrawlerService } from 'src/crawler/crawler.service';
import { CronJob } from 'cron';
@Injectable()
export class ScheduleTasksService implements OnModuleInit {


    constructor(private crawlerService: CrawlerService, private schedulerRegistry: SchedulerRegistry) { }

    async onModuleInit() {
        // await this.crawlerService.populate_database();
        // const heath_check_job = new CronJob(CronExpression.EVERY_10_MINUTES, async () => {
        //     const session_saved = await this.crawlerService.heathCheck();
        //     if (!session_saved) return;
        //     heath_check_job.stop();
        //     this.schedulerRegistry.deleteCronJob('crawler_heath_check');
        // });
        // this.schedulerRegistry.addCronJob('crawler_heath_check', heath_check_job);
        // heath_check_job.start();
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { disabled: true })
    async startPeriodicCrawlers() {
        await this.crawlerService.populate_database();
        const heath_check_job = new CronJob(CronExpression.EVERY_10_MINUTES, async () => {
            const session_saved = await this.crawlerService.heathCheck();
            if (!session_saved) return;
            heath_check_job.stop();
            this.schedulerRegistry.deleteCronJob('crawler_heath_check');
        });
        this.schedulerRegistry.addCronJob('crawler_heath_check', heath_check_job);
        heath_check_job.start();
    }
}
