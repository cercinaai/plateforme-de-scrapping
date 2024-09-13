import { Injectable, Logger } from "@nestjs/common";
import { Job, Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { CrawlerSession } from "../models/crawlerSession.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

@Injectable()
export class CrawlerService {

    private readonly logger = new Logger(CrawlerService.name);
    constructor(@InjectQueue('crawler') private crawlerQueue: Queue, @InjectModel(CrawlerSession.name) private crawlerSession: Model<CrawlerSession>) { }

    async populate_database() {
        this.logger.log('Populating Crawler Queues...');
        await this.addJobAndWaitForCompletion('boncoin-crawler');
        await this.addJobAndWaitForCompletion('seloger-crawler');
        await this.addJobAndWaitForCompletion('logicimmo-crawler');
        await this.addJobAndWaitForCompletion('bienici-crawler');
        this.logger.log('Crawler Queues Populated');
    }
    private async addJobAndWaitForCompletion(jobName: string): Promise<void> {
        const job = await this.crawlerQueue.add(jobName, {}, { attempts: 1 });
        await this.waitForJobCompletion(job);
    }

    private async waitForJobCompletion(job: Job, interval: number = 5000): Promise<void> {
        while (true) {
            if ((await job.isActive()) === false) return;
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }
    async heathCheck(): Promise<boolean> {
        this.logger.log('Crawler Queues Health Check...');
        if ((await this.crawlerQueue.getActiveCount()) > 0) return false;
        this.logger.log('Crawler Queues is Empty now...');
        const failedJobs = await this.crawlerQueue.getFailed();
        const completedJobs = await this.crawlerQueue.getCompleted();
        const failedJobsSchema = failedJobs.map(job => this.mapJobToSchema(job, 'failed'));
        const completedJobsSchema = completedJobs.map(job => this.mapJobToSchema(job, 'success'));
        await this.saveCrawlerSession([...failedJobsSchema, ...completedJobsSchema]);
        await Promise.all([...failedJobs, ...completedJobs].map(async (job) => await job.remove()));
        this.logger.log('Crawler Session Saved');
        return true;
    }
    private mapJobToSchema(job: Job, status: 'success' | 'failed') {
        const jobData = job.data;
        if (status === 'success') {
            return {
                status: 'success',
                success_date: jobData.success_date,
                crawler_origin: jobData.crawler_origin,
                total_data_grabbed: jobData.total_data_grabbed,
                total_request: jobData.total_request,
                success_requests: jobData.success_requests,
                failed_requests: jobData.failed_requests,
                attempts_count: jobData.attempts_count,
            };
        } else {
            return {
                crawler_origin: jobData.crawler_origin,
                status: 'failed',
                total_data_grabbed: jobData.total_data_grabbed,
                attempts_count: jobData.attempts_count,
                total_request: jobData.total_request,
                success_requests: jobData.success_requests,
                failed_requests: jobData.failed_requests,
                error_date: jobData.error.failed_date,
                failedReason: jobData.error.failedReason,
                failed_request_url: jobData.error.failed_request_url,
                proxy_used: jobData.error.proxy_used,
            };
        }
    }
    private async saveCrawlerSession(jobsData: any[]) {
        const sessionData: Partial<CrawlerSession> = {
            session_date: new Date(),
            boncoin: jobsData.find(job => job.crawler_origin === 'boncoin'),
            bienici: jobsData.find(job => job.crawler_origin === 'bienici'),
            logicimmo: jobsData.find(job => job.crawler_origin === 'logic-immo'),
            seloger: jobsData.find(job => job.crawler_origin === 'seloger'),
        };
        let session = new this.crawlerSession(sessionData);
        await session.save()
    }
}