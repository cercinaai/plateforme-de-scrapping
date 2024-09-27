import { Job } from "bullmq";
import type { FinalStatistics, PlaywrightCrawlingContext } from "crawlee";
import { initLogger } from "../config/logger.config";
import { existsSync, rmdirSync } from 'fs';

const logger = initLogger('GLOBAL-ERRORS');

export const handleFailedCrawler = async (job: Job, ctx: PlaywrightCrawlingContext, error: Error) => {
    const { request, proxyInfo, page } = ctx;
    const failed_date = new Date();
    const screenshot_path = `./screenshots/${job.name}-${job.id}-${failed_date.toString()}.jpg`;
    await page.screenshot({ fullPage: true, path: screenshot_path });
    await job.updateData({
        total_data_grabbed: job.data.total_data_grabbed,
        status: 'failed',
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

export const handleFailedJob = async (job: Job | undefined, error: Error) => {
    if (!job) return;
    await job.updateData({
        status: 'failed',
        started_at: new Date(job.processedOn as number),
        finished_at: new Date(job.finishedOn as number),
        total_data_grabbed: job.data.total_data_grabbed || 0,
        error: {
            screenshot: 'N/A',
            failedReason: error.message || 'Unknown error',
            failed_request_url: job.data.url || 'N/A',
            proxy_used: 'N/A',
        }
    });
}

export const handleCompletedJob = async (job: Job) => {
    const crawlers_statistics = job.returnvalue as FinalStatistics;
    const { error } = job.data;
    await job.updateData({
        status: job.data.status || 'success',
        started_at: new Date(job.processedOn as number),
        finished_at: new Date(job.finishedOn as number),
        total_data_grabbed: job.data.total_data_grabbed || 0,
        total_requests: crawlers_statistics.requestsTotal,
        success_requests: crawlers_statistics.requestsFinished,
        failed_requests: crawlers_statistics.requestsFailed,
        error: error || null,

    });
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