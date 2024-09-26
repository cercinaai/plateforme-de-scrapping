// import { Job } from "bull";
// import { FinalStatistics, PlaywrightCrawlingContext } from "crawlee";
// import { CrawlerSessionDocument } from "src/models/crawlerSession.schema";

import { Job } from "bullmq";
import type { FinalStatistics, PlaywrightCrawlingContext } from "crawlee";
import { initLogger } from "../config/logger.config";

// export const handleCrawlerState = async (job: Job, stat: FinalStatistics): Promise<CrawlerSessionDocument> => {
//     if (job.data.error || stat.requestsTotal === 0) {
//         return handleFailure(job, stat) as Promise<CrawlerSessionDocument>;
//     }
//     return handleSuccess(job, stat) as Promise<CrawlerSessionDocument>;
// }

// export const handleCrawlerError = async (error: Error, job: Job, ctx: PlaywrightCrawlingContext) => {
//     const { request, proxyInfo } = ctx;
//     await job.update({
//         ...job.data,
//         status: 'failed',
//         error: {
//             failed_date: new Date(),
//             failedReason: request.errorMessages[-1] || error.message || 'Unknown error',
//             failed_request_url: request.url || 'N/A',
//             proxy_used: proxyInfo ? proxyInfo.url : 'N/A',
//         }
//     })
// }



// const handleFailure = async (job: Job, stat: FinalStatistics): Promise<Partial<CrawlerSessionDocument>> => {
//     if (stat.requestsTotal === 0 && !job.data.error) {
//         return {
//             status: 'failed',
//             total_data_grabbed: job.data.total_data_grabbed,
//             total_request: stat.requestsTotal,
//             success_requests: stat.requestsFinished,
//             failed_requests: stat.requestsFailed,
//             error: {
//                 failed_date: new Date(),
//                 failedReason: 'Crawler did not start as expected',
//                 failed_request_url: 'N/A',
//                 proxy_used: 'N/A'
//             }
//         }
//     }
//     return {
//         status: 'failed',
//         total_data_grabbed: job.data.total_data_grabbed,
//         total_request: stat.requestsTotal,
//         success_requests: stat.requestsFinished,
//         failed_requests: stat.requestsFailed,
//         error: job.data.error
//     }
// }

// const handleSuccess = async (job: Job, stat: FinalStatistics): Promise<Partial<CrawlerSessionDocument>> => {
//     return {
//         status: 'success',
//         total_data_grabbed: job.data.total_data_grabbed,
//         total_request: stat.requestsTotal,
//         success_requests: stat.requestsFinished,
//         failed_requests: stat.requestsFailed,
//     }
// }

export const handleFailedCrawler = async (job: Job, ctx: PlaywrightCrawlingContext, error: Error) => {
    const { request, proxyInfo, page } = ctx;
    const failed_date = new Date();
    const screenshot_path = `./screenshots/${job.name}-${job.id}-${failed_date.toString()}.jpg`;
    await page.screenshot({ fullPage: true, path: screenshot_path });
    await job.updateData({
        total_data_grabbed: job.data.total_data_grabbed,
        status: 'failed',
        error: {
            screenshot: screenshot_path,
            failed_date: failed_date,
            failedReason: error.message || 'Unknown error',
            failed_request_url: request.url || 'N/A',
            proxy_used: proxyInfo?.url || 'N/A',
        }
    });
}

export const handleCompletedCrawler = async (job: Job) => {
    const crawlers_statistics = job.returnvalue as FinalStatistics;
    await job.updateData({
        ...job.data,
        total_request: crawlers_statistics.requestsTotal,
        success_requests: crawlers_statistics.requestsFinished,
        failed_requests: crawlers_statistics.requestsFailed
    });
}

export const handleCrawlerUnexpectedError = async (error: Error) => {
    const logger = initLogger('GLOBAL-ERRORS');
    logger.error('Crawler encountered an unexpected error: ', error);
}

export const handleQueueUnexpectedError = async (error: Error) => {
    const logger = initLogger('GLOBAL-ERRORS');
    logger.error('Queue encountered an unexpected error: ', error);
    process.kill(process.pid, 'SIGTERM');
}