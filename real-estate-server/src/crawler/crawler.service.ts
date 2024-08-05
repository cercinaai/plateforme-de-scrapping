import { Injectable, Logger } from "@nestjs/common";
import { Job, Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { CrawlerSession } from "src/models/crawlerSession.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { SchedulerRegistry } from "@nestjs/schedule";

@Injectable()
export class CrawlerService {

    private readonly logger = new Logger(CrawlerService.name);

    constructor(@InjectQueue('crawler') private crawlerQueue: Queue, @InjectModel(CrawlerSession.name) private crawlerSession: Model<CrawlerSession>, private schedulerRegistry: SchedulerRegistry) { }

    async populate_database() {
        // await this.crawlerQueue.add('boncoin-crawler', {}, { attempts: 1 });
        // await this.crawlerQueue.add('seloger-crawler', {}, { attempts: 1, });
        await this.crawlerQueue.add('bienici-crawler', {}, { attempts: 1, });
        await this.crawlerQueue.add('logicimmo-crawler', {}, { attempts: 1, });
    }

    async heathCheck() {
        if ((await this.crawlerQueue.getActiveCount()) > 0) return;
        this.logger.log('Crawler Queues is Empty now...');
        const failedJobs = (await this.crawlerQueue.getFailed()).map(job => this.mapJobToSchema(job, 'failed'));
        const completedJobs = (await this.crawlerQueue.getCompleted()).map(job => this.mapJobToSchema(job, 'success'));
        await this.saveCrawlerSession([...failedJobs, ...completedJobs]);
        this.logger.log('Crawler Session Saved');
        this.schedulerRegistry.deleteCronJob('crawler_heath_check');
    }
    private mapJobToSchema(job: Job, status: 'success' | 'failed') {
        const jobData = job.data;
        if (status === 'success') {
            return {
                success_date: jobData.success_date,
                crawler_origin: jobData.crawler_origin,
                status: 'success',
                total_data_grabbed: jobData.total_data_grabbed,
                total_request: jobData.total_request,
                success_requests: jobData.success_requests,
                failed_requests: jobData.failed_requests,
                attempts_count: jobData.attempts_count,
            };
        } else {
            return {
                error_date: jobData.error_date,
                crawler_origin: jobData.crawler_origin,
                status: 'failed',
                total_data_grabbed: jobData.total_data_grabbed,
                failedReason: jobData.failedReason,
                failed_request_url: jobData.failed_request_url,
                proxy_used: jobData.proxy_used,
                attempts_count: jobData.attempts_count,
            };
        }
    }
    private async saveCrawlerSession(jobsData: any[]) {
        const sessionData: Partial<CrawlerSession> = {
            // boncoin: jobsData.find(job => job.crawler_origin === 'boncoin') || {},
            bienici: jobsData.find(job => job.crawler_origin === 'bienici') || {},
            logicimmo: jobsData.find(job => job.crawler_origin === 'logic-immo') || {},
            // seloger: jobsData.find(job => job.crawler_origin === 'seloger') || {},
        };
        let session = new this.crawlerSession(sessionData);
        await session.save()
    }
}