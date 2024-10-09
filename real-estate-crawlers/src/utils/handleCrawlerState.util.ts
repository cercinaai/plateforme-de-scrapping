import { Job } from "bullmq";
import type { FinalStatistics, PlaywrightCrawlingContext } from "crawlee";
import { initLogger } from "../config/logger.config";
import { existsSync, rmdirSync } from 'fs';
import { uploadBufferIntoBucket } from "../data-ingestion/file.ingestion";
import { CRAWLER_ORIGIN, CRAWLER_STATUS } from "./enum";
import { CrawlerSessionModel, CrawlerStats } from "../models/mongodb/crawler-session.mongodb";

const logger = initLogger('GLOBAL-ERRORS');

export const handleFailedCrawler = async (job: Job, ctx: PlaywrightCrawlingContext, error: Error) => {
    const { request, proxyInfo, page } = ctx;
    const job_logger = initLogger(job.name);
    const failed_date = new Date();
    const screenshot_buffer = await page.screenshot({ fullPage: true });
    const screenshot_path = await uploadBufferIntoBucket(screenshot_buffer, `${job.name}-${failed_date.getTime()}`, 'crawlers-error-screenshots');
    job_logger.error(error);
    await job.updateData({
        status: CRAWLER_STATUS.FAILED,
        total_data_grabbed: job.data.total_data_grabbed,
        started_at: new Date(job.processedOn as number),
        finished_at: new Date(job.finishedOn as number),
        error: {
            screenshot: screenshot_path,
            failedReason: error.message || 'Unknown error',
            failed_request_url: request.url || 'N/A',
            proxy_used: proxyInfo?.url || 'N/A',
        }
    });
}

export const handleFailedJob = async (job: Job | undefined, error: Error, session_id?: string, keepAfterSave?: boolean) => {
    if (!job) return;
    const crawlerStat: CrawlerStats = {
        origin: job.name as CRAWLER_ORIGIN,
        status: CRAWLER_STATUS.FAILED,
        started_at: new Date(job.processedOn as number),
        finished_at: new Date(job.finishedOn as number),
        total_data_grabbed: job.data.total_data_grabbed || 0,
        error: {
            screenshot: 'N/A',
            failedReason: error.message || 'Unknown error',
            failed_request_url: 'N/A',
            proxy_used: 'N/A',
        },
    }
    // REMOVE JOB FROM QUEUE
    if (!keepAfterSave) await job.remove();
    if (!session_id) return crawlerStat;
    // SAVE STATS IN DB
    const { acknowledged } = await CrawlerSessionModel.updateOne({ _id: session_id }, { $push: { crawlers_stats: crawlerStat } });
    if (!acknowledged) {
        logger.error('Failed to save crawler stats in DB');
        return;
    };
}

export const handleCompletedJob = async (job: Job, session_id?: string) => {
    const crawlers_statistics = job.returnvalue as FinalStatistics;
    const { error } = job.data;
    const crawlerStat: CrawlerStats = {
        origin: job.name as CRAWLER_ORIGIN,
        status: error ? CRAWLER_STATUS.FAILED : CRAWLER_STATUS.SUCCESS,
        started_at: new Date(job.processedOn as number),
        finished_at: new Date(job.finishedOn as number),
        total_data_grabbed: job.data.total_data_grabbed || 0,
        total_requests: crawlers_statistics ? crawlers_statistics.requestsTotal : 0,
        success_requests: crawlers_statistics ? crawlers_statistics.requestsFinished : 0,
        failed_requests: crawlers_statistics ? crawlers_statistics.requestsFailed : 0,
    }
    if (error) crawlerStat.error = error;
    // REMOVE JOB FROM QUEUE
    await job.remove();
    if (!session_id) return crawlerStat;
    // SAVE STATS IN DB
    const { acknowledged } = await CrawlerSessionModel.updateOne({ _id: session_id }, { $push: { crawlers_stats: crawlerStat } });
    if (!acknowledged) {
        logger.error('Failed to save crawler stats in DB');
        return;
    };
}

export const handleQueueUnexpectedError = async (expection: string, error?: Error | unknown) => {
    logger.error(`EXCEPTION RAISED => ${expection}`);
    const requestQueuePath = './storage/request_queues';
    if (existsSync(requestQueuePath)) {
        rmdirSync(requestQueuePath, { recursive: true });
        logger.info('Cleaned up After Process Interruption...');
    }
    if (error) logger.error(error);
    process.exit(1);
}